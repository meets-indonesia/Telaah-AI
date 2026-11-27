import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  runBsjpBacktestFromYahoo,
  summarizeBacktest,
} from "@/lib/bsjp/backtest-runner";
import {
  RATE_LIMIT_RULES,
  guardRateLimit,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function secretMatches(received: string | null, expected: string): boolean {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
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

  const limited = await guardRateLimit(req, "backtest", RATE_LIMIT_RULES.backtest);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const years = Number(searchParams.get("years") ?? 5);
  const forceRefresh = searchParams.get("refresh") === "1";
  const syariahOnly = searchParams.get("all") !== "1";
  try {
    const result = await runBsjpBacktestFromYahoo({
      years,
      forceRefresh,
      syariahOnly,
    });
    return NextResponse.json({
      ok: true,
      reportPath: result.reportPath,
      fetched: result.fetched,
      cached: result.cached,
      failed: result.failed,
      syariahOnly,
      summary: summarizeBacktest(result.report),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Backtest gagal dijalankan.",
      },
      { status: 500 }
    );
  }
}
