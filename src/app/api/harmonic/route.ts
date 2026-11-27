import { NextRequest, NextResponse } from "next/server";
import { isValidSymbol, normalizeSymbol, normalizeTimeframe } from "@/lib/chart/data";
import { analyzeSymbolHarmonics } from "@/lib/harmonic/service";
import { RATE_LIMIT_RULES, guardRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const limited = await guardRateLimit(req, "harmonic", RATE_LIMIT_RULES.harmonic);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const symbol = normalizeSymbol(searchParams.get("symbol"));
  const timeframe = normalizeTimeframe(searchParams.get("timeframe"));
  const requested = searchParams.get("htf") as
    | "4H"
    | "1D"
    | "1W"
    | "1M"
    | null;
  if (!isValidSymbol(symbol)) {
    return NextResponse.json(
      { success: false, error: "Kode emiten harus 4 huruf." },
      { status: 400 }
    );
  }
  try {
    const result = await analyzeSymbolHarmonics(
      symbol,
      timeframe,
      requested ?? undefined
    );
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Gagal memuat harmonic.",
      },
      { status: 500 }
    );
  }
}
