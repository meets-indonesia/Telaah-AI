import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getRedisReady } from "@/lib/storage/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CheckStatus = "ok" | "degraded" | "down" | "not_configured";

interface HealthCheck {
  status: CheckStatus;
  detail?: string;
  latencyMs?: number;
}

async function timed(
  fn: () => Promise<HealthCheck>
): Promise<HealthCheck> {
  const started = Date.now();
  try {
    const result = await fn();
    return { ...result, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      status: "down",
      detail: error instanceof Error ? error.message : "check failed",
      latencyMs: Date.now() - started,
    };
  }
}

function decodeJwtExpiry(token: string | undefined): number | null {
  if (!token) return null;
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(part, "base64url").toString("utf8")
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

async function checkStockbit(): Promise<HealthCheck> {
  const file =
    process.env.STOCKBIT_SESSION_FILE ||
    path.join(process.cwd(), "data", "stockbit_session.json");
  try {
    const raw = await readFile(file, "utf8");
    const session = JSON.parse(raw) as { refresh?: string };
    const exp = decodeJwtExpiry(session.refresh);
    if (!exp) return { status: "degraded", detail: "refresh token tidak terbaca" };
    const days = Math.floor((exp * 1000 - Date.now()) / 86_400_000);
    if (days < 0) return { status: "down", detail: "refresh token expired" };
    if (days <= 7) {
      return { status: "degraded", detail: `refresh token tersisa ${days} hari` };
    }
    return { status: "ok", detail: `refresh token tersisa ${days} hari` };
  } catch {
    return { status: "degraded", detail: "sesi Stockbit belum ada" };
  }
}

export async function GET() {
  const checks: Record<string, HealthCheck> = {};

  checks.app = {
    status: "ok",
    detail: "next.js",
    latencyMs: 0,
  };

  checks.redis = await timed(async () => {
    const client = await getRedisReady(600);
    if (!client) return { status: "down", detail: "tidak bisa connect" };
    await client.ping();
    return { status: "ok" };
  });

  checks.qdrant = await timed(async () => {
    const base = (process.env.QDRANT_URL || "http://localhost:6333").replace(
      /\/+$/,
      ""
    );
    const response = await fetch(
      `${base}/collections/telaah_intelligence_cache`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (response.status === 404) {
      return { status: "degraded", detail: "collection belum dibuat" };
    }
    if (!response.ok) {
      return { status: "down", detail: `HTTP ${response.status}` };
    }
    return { status: "ok" };
  });

  checks.scraper = await timed(async () => {
    const base = (process.env.SCRAPER_URL || "").replace(/\/+$/, "");
    if (!base) return { status: "not_configured" };
    const response = await fetch(`${base}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return { status: "down", detail: `HTTP ${response.status}` };
    return { status: "ok" };
  });

  checks.stockbit = await timed(checkStockbit);

  const coreDown = ["redis", "qdrant"].some(
    (key) => checks[key]?.status === "down"
  );
  const degraded = Object.values(checks).some(
    (check) => check.status === "degraded" || check.status === "down"
  );

  return NextResponse.json(
    {
      ok: !coreDown,
      status: coreDown ? "down" : degraded ? "degraded" : "ok",
      version: process.env.APP_VERSION || "0.1.0",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: coreDown ? 503 : 200 }
  );
}
