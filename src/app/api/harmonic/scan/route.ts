import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import {
  scanHarmonicUniverse,
  type HarmonicScanResult,
} from "@/lib/screener/harmonic-screener";
import { recordHarmonicScan } from "@/lib/harmonic/evaluations";
import { cacheGet, cacheSet } from "@/lib/storage/json-cache";
import { RATE_LIMIT_RULES, guardRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const refresh = searchParams.get("refresh") === "1";
  const rawDirection = searchParams.get("direction");
  const direction =
    rawDirection === "bearish" || rawDirection === "all"
      ? rawDirection
      : "bullish";
  const cachePath = path.join(
    process.cwd(),
    "data",
    direction === "bullish"
      ? "harmonic_cache.json"
      : `harmonic_cache_${direction}.json`
  );
  try {
    const redisKey = `harmonic:scan:v2:${direction}`;
    if (!refresh) {
      const cached = await cacheGet<HarmonicScanResult>(redisKey);
      if (cached) {
        return NextResponse.json({ success: true, cached: true, ...cached });
      }
    }

    // Cached reads are cheap and must stay available. Only an actual scan
    // (cache miss or explicit refresh) consumes the scan rate limit.
    const limited = await guardRateLimit(
      req,
      "harmonicScan",
      RATE_LIMIT_RULES.harmonicScan
    );
    if (limited) return limited;

    const result = await scanHarmonicUniverse({
      refresh,
      direction,
      cachePath,
    });
    await cacheSet(redisKey, result, 12 * 3600);
    void recordHarmonicScan(result).catch(() => {
      // Candidate logging must not break the scan response.
    });
    return NextResponse.json({ success: true, cached: false, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal memindai harmonic.",
      },
      { status: 500 }
    );
  }
}
