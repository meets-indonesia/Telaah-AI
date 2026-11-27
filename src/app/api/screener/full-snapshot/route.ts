import crypto from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import companiesData from "@/data/idx-companies.json";
import {
  getFlowMetrics,
  getFundamentalMetrics,
  getMarketMetrics,
  type MarketMetricItem,
} from "@/lib/screener/market-metrics";
import { cacheGet, cacheSet } from "@/lib/storage/json-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const UNIVERSE = companiesData as Array<{ symbol: string; name: string }>;
const CACHE_KEY = "screener:full:snapshot:v1";
const FILE_PATH = path.join(process.cwd(), "data", "screener_full.json");

type SnapshotPass = "base" | "fundamentals" | "flow";

interface FullSnapshot {
  generatedAt: string;
  complete: boolean;
  cursor: number;
  total: number;
  items: MarketMetricItem[];
  baseCursor: number;
  baseComplete: boolean;
  fundamentalsCursor: number;
  fundamentalsComplete: boolean;
  fundamentalsUpdatedAt: string | null;
  flowCursor: number;
  flowComplete: boolean;
  flowUpdatedAt: string | null;
}

function emptySnapshot(): FullSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    complete: false,
    cursor: 0,
    total: UNIVERSE.length,
    items: [],
    baseCursor: 0,
    baseComplete: false,
    fundamentalsCursor: 0,
    fundamentalsComplete: false,
    fundamentalsUpdatedAt: null,
    flowCursor: 0,
    flowComplete: false,
    flowUpdatedAt: null,
  };
}

function normalizeSnapshot(value: unknown): FullSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<FullSnapshot>;
  if (!Array.isArray(raw.items)) return null;
  return {
    generatedAt: raw.generatedAt ?? new Date().toISOString(),
    complete: Boolean(raw.complete),
    cursor: raw.cursor ?? 0,
    total: raw.total ?? UNIVERSE.length,
    items: raw.items,
    baseCursor: raw.baseCursor ?? raw.cursor ?? 0,
    baseComplete: raw.baseComplete ?? Boolean(raw.complete),
    fundamentalsCursor: raw.fundamentalsCursor ?? 0,
    fundamentalsComplete: Boolean(raw.fundamentalsComplete),
    fundamentalsUpdatedAt: raw.fundamentalsUpdatedAt ?? null,
    flowCursor: raw.flowCursor ?? 0,
    flowComplete: Boolean(raw.flowComplete),
    flowUpdatedAt: raw.flowUpdatedAt ?? null,
  };
}

function secretMatches(received: string | null, expected: string): boolean {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

async function readSnapshot(): Promise<FullSnapshot | null> {
  const cached = await cacheGet<FullSnapshot>(CACHE_KEY);
  if (cached) return normalizeSnapshot(cached);
  try {
    return normalizeSnapshot(JSON.parse(await readFile(FILE_PATH, "utf8")));
  } catch {
    return null;
  }
}

function passProgress(snapshot: FullSnapshot) {
  const total = Math.max(1, snapshot.total);
  return {
    base: {
      cursor: snapshot.baseCursor,
      complete: snapshot.baseComplete,
      progressPct: Math.min(100, (snapshot.items.length / total) * 100),
    },
    fundamentals: {
      cursor: snapshot.fundamentalsCursor,
      complete: snapshot.fundamentalsComplete,
      progressPct: snapshot.fundamentalsComplete
        ? 100
        : Math.min(100, (snapshot.fundamentalsCursor / total) * 100),
      updatedAt: snapshot.fundamentalsUpdatedAt,
    },
    flow: {
      cursor: snapshot.flowCursor,
      complete: snapshot.flowComplete,
      progressPct: snapshot.flowComplete
        ? 100
        : Math.min(100, (snapshot.flowCursor / total) * 100),
      updatedAt: snapshot.flowUpdatedAt,
    },
  };
}

export async function GET() {
  const snapshot = await readSnapshot();
  return NextResponse.json({
    success: true,
    items: snapshot?.items ?? [],
    generatedAt: snapshot?.generatedAt ?? null,
    complete: snapshot?.baseComplete ?? false,
    cursor: snapshot?.baseCursor ?? 0,
    total: snapshot?.total ?? UNIVERSE.length,
    passes: snapshot ? passProgress(snapshot) : null,
  });
}

export async function POST(req: NextRequest) {
  const expected = process.env.ALERT_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "ALERT_SECRET belum diatur." },
      { status: 503 }
    );
  }
  if (!secretMatches(req.headers.get("x-alert-secret"), expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const pass: SnapshotPass =
    body.pass === "fundamentals" || body.pass === "flow"
      ? body.pass
      : "base";
  const cursor = Math.max(
    0,
    Math.min(Number(body.cursor) || 0, UNIVERSE.length)
  );
  const batchSize = Math.max(1, Math.min(Number(body.batchSize) || 40, 80));
  const batch = UNIVERSE.slice(cursor, cursor + batchSize);
  if (batch.length === 0) {
    return NextResponse.json({
      ok: true,
      pass,
      batch: 0,
      totalItems: 0,
      nextCursor: UNIVERSE.length,
      done: true,
      total: UNIVERSE.length,
    });
  }

  const previous = await readSnapshot();
  if (pass !== "base" && (!previous || previous.items.length === 0)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Jalankan pass base terlebih dahulu.",
      },
      { status: 409 }
    );
  }

  const base = previous ?? emptySnapshot();
  if (pass === "base" && cursor === 0) {
    base.generatedAt = new Date().toISOString();
    base.items = [];
    base.baseCursor = 0;
    base.baseComplete = false;
    base.fundamentalsCursor = 0;
    base.fundamentalsComplete = false;
    base.fundamentalsUpdatedAt = null;
    base.flowCursor = 0;
    base.flowComplete = false;
    base.flowUpdatedAt = null;
  }

  const symbols = batch.map((item) => item.symbol);
  const bySymbol = new Map<string, MarketMetricItem>(
    base.items.map((item) => [item.symbol, item])
  );

  if (pass === "flow") {
    const flows = await getFlowMetrics(symbols);
    for (const flow of flows) {
      const existing = bySymbol.get(flow.symbol);
      if (existing) {
        bySymbol.set(flow.symbol, { ...existing, flow5d: flow.flow5d });
      }
    }
  } else {
    const metrics =
      pass === "fundamentals"
        ? await getFundamentalMetrics(symbols)
        : await getMarketMetrics(symbols, {
            includeFlow: false,
            includeFundamentals: false,
            includeTechnicals: true,
          });
    for (const metric of metrics) {
      if (pass === "base") {
        bySymbol.set(metric.symbol, metric);
      } else {
        const existing = bySymbol.get(metric.symbol);
        if (existing) {
          bySymbol.set(metric.symbol, {
            ...existing,
            name: metric.name || existing.name,
            sector: metric.sector || existing.sector,
            subSector: metric.subSector || existing.subSector,
            marketCap: metric.marketCap || existing.marketCap,
            pe: metric.pe ?? existing.pe,
            pb: metric.pb ?? existing.pb,
          });
        }
      }
    }
  }

  const nextCursor = cursor + batch.length;
  const done = nextCursor >= UNIVERSE.length;
  const updatedAt = new Date().toISOString();
  if (pass === "base") {
    base.baseCursor = done ? 0 : nextCursor;
    base.baseComplete = done;
    base.complete = done;
    base.cursor = base.baseCursor;
    if (done) base.generatedAt = updatedAt;
  } else if (pass === "fundamentals") {
    base.fundamentalsCursor = done ? 0 : nextCursor;
    base.fundamentalsComplete = done;
    base.fundamentalsUpdatedAt = done ? updatedAt : base.fundamentalsUpdatedAt;
  } else {
    base.flowCursor = done ? 0 : nextCursor;
    base.flowComplete = done;
    base.flowUpdatedAt = done ? updatedAt : base.flowUpdatedAt;
  }
  base.items = [...bySymbol.values()];

  await cacheSet(CACHE_KEY, base, 24 * 3600);
  try {
    await mkdir(path.dirname(FILE_PATH), { recursive: true });
    await writeFile(FILE_PATH, JSON.stringify(base), "utf8");
  } catch {
    // Redis remains the primary cache.
  }

  return NextResponse.json({
    ok: true,
    pass,
    batch: batch.length,
    totalItems: base.items.length,
    nextCursor,
    done,
    total: UNIVERSE.length,
    passes: passProgress(base),
  });
}
