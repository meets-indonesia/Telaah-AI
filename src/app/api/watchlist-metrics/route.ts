import { NextResponse } from "next/server";
import {
  getMarketMetrics,
  type MarketMetricItem,
} from "@/lib/screener/market-metrics";
import { cached, hashKey } from "@/lib/storage/json-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { symbols, includeFlow } = await req.json();
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ success: true, items: [] });
    }

    const cleanSymbols = symbols
      .map((symbol: string) => String(symbol).toUpperCase().trim())
      .filter((symbol: string) => /^[A-Z]{4}$/.test(symbol));
    const withFlow = includeFlow !== false;
    const key = `screener:metrics:${hashKey(
      `${cleanSymbols.join(",")}|${withFlow}`
    )}:v1`;
    const { value, hit } = await cached<MarketMetricItem[]>(
      key,
      10 * 60,
      () => getMarketMetrics(cleanSymbols, { includeFlow: withFlow })
    );

    return NextResponse.json({ success: true, items: value, cached: hit });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch watchlist metrics",
      },
      { status: 500 }
    );
  }
}
