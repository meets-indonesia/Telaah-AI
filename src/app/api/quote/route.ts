import { NextRequest, NextResponse } from "next/server";
import { ScraperClient } from "@/lib/market/scraper-client";
import { guardRateLimit, RATE_LIMIT_RULES } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const limited = await guardRateLimit(req, "chart", RATE_LIMIT_RULES.chart);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "")
    .trim()
    .toUpperCase()
    .replace(".JK", "");
  if (!/^[A-Z]{4}$/.test(symbol)) {
    return NextResponse.json(
      { success: false, error: "Kode emiten harus 4 huruf." },
      { status: 400 }
    );
  }

  const scraper = new ScraperClient();
  if (!scraper.isConfigured) {
    return NextResponse.json(
      {
        success: false,
        error: "Order book Stockbit tidak tersedia: scraper belum aktif.",
      },
      { status: 503 }
    );
  }

  const quote = await scraper.getQuote(symbol);
  if (!quote) {
    return NextResponse.json(
      {
        success: false,
        error: "Order book Stockbit tidak tersedia untuk emiten ini.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, quote });
}
