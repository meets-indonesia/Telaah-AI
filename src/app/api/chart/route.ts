import { NextRequest, NextResponse } from "next/server";
import {
  isValidSymbol,
  normalizeSymbol,
  normalizeTimeframe,
} from "@/lib/chart/data";
import { getChartSnapshot } from "@/lib/chart/stream";
import { guardRateLimit, RATE_LIMIT_RULES } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const limited = await guardRateLimit(req, "chart", RATE_LIMIT_RULES.chart);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const symbol = normalizeSymbol(searchParams.get("symbol"));
  const timeframe = normalizeTimeframe(searchParams.get("timeframe"));

  if (!isValidSymbol(symbol)) {
    return NextResponse.json(
      { success: false, error: "Kode emiten harus 4 huruf." },
      { status: 400 }
    );
  }

  const snapshot = await getChartSnapshot(symbol, timeframe).catch(() => null);
  if (!snapshot) {
    return NextResponse.json(
      { success: false, error: `Data chart ${symbol} tidak tersedia.` },
      { status: 503 }
    );
  }

  return NextResponse.json(snapshot);
}
