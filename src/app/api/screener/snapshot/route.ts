import crypto from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getMarketMetrics, type MarketMetricItem } from "@/lib/screener/market-metrics";
import { LIQUID_IDX_UNIVERSE } from "@/lib/screener/universe";
import { cacheGet, cacheSet } from "@/lib/storage/json-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 1800;

const CACHE_KEY = "screener:snapshot:v1";
const CACHE_TTL_SECONDS = 24 * 3600;
const FILE_PATH = path.join(process.cwd(), "data", "screener_snapshot.json");

interface Snapshot {
  generatedAt: string;
  items: MarketMetricItem[];
}

function secretMatches(received: string | null, expected: string): boolean {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

async function readSnapshot(): Promise<Snapshot | null> {
  const cached = await cacheGet<Snapshot>(CACHE_KEY);
  if (cached) return cached;
  try {
    return JSON.parse(await readFile(FILE_PATH, "utf8")) as Snapshot;
  } catch {
    return null;
  }
}

export async function GET() {
  const snapshot = await readSnapshot();
  return NextResponse.json({
    success: true,
    items: snapshot?.items ?? [],
    generatedAt: snapshot?.generatedAt ?? null,
    cached: Boolean(snapshot),
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

  const items = await getMarketMetrics(LIQUID_IDX_UNIVERSE, {
    includeFlow: true,
  });
  const snapshot: Snapshot = {
    generatedAt: new Date().toISOString(),
    items,
  };
  await cacheSet(CACHE_KEY, snapshot, CACHE_TTL_SECONDS);
  try {
    await mkdir(path.dirname(FILE_PATH), { recursive: true });
    await writeFile(FILE_PATH, JSON.stringify(snapshot), "utf8");
  } catch {
    // Redis remains the primary cache.
  }
  return NextResponse.json({
    ok: true,
    items: items.length,
    generatedAt: snapshot.generatedAt,
  });
}
