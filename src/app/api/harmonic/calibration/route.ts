import { NextRequest, NextResponse } from "next/server";
import {
  aggregateCalibration,
  loadCandidates,
  loadEvaluations,
} from "@/lib/harmonic/evaluations";
import { guardRateLimit, RATE_LIMIT_RULES } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const limited = await guardRateLimit(
    req,
    "harmonicStats",
    RATE_LIMIT_RULES.harmonicStats
  );
  if (limited) return limited;

  const [candidates, evaluations] = await Promise.all([
    loadCandidates({ minAgeDays: 0, maxAgeDays: 120, limit: 5000 }),
    loadEvaluations(),
  ]);
  return NextResponse.json({
    success: true,
    ...aggregateCalibration(candidates, evaluations),
  });
}
