import { NextRequest, NextResponse } from "next/server";
import { runHarmonicStats, type HarmonicStatsResult } from "@/lib/harmonic/outcomes";
import { cacheGet, cacheSet } from "@/lib/storage/json-cache";
import { RATE_LIMIT_RULES, guardRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const redisKey = "harmonic:stats:v2";
  if (!refresh) {
    const cached = await cacheGet<HarmonicStatsResult>(redisKey);
    if (cached) {
      return NextResponse.json({ success: true, cached: true, ...cached });
    }
  }

  const limited = await guardRateLimit(
    req,
    "harmonicStats",
    RATE_LIMIT_RULES.harmonicStats
  );
  if (limited) return limited;

  try {
    const result = await runHarmonicStats();
    await cacheSet(redisKey, result, 12 * 3600);
    return NextResponse.json({ success: true, cached: false, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Gagal menghitung statistik.",
      },
      { status: 500 }
    );
  }
}
