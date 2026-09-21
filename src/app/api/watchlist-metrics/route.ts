import { NextResponse } from "next/server";
import { SectorsClient } from "@/lib/sectors/client";
import { extractValuationMultiples } from "@/lib/sectors/types";
import { computeTechnicalIndicators } from "@/lib/quant/indicators";
import { getCompanyName } from "@/lib/sectors/companies";

export async function POST(req: Request) {
  try {
    const { symbols } = await req.json();
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ success: true, items: [] });
    }

    // Limit batch to max 25 symbols at once for performance
    const targetSymbols = symbols.slice(0, 25).map((s: string) => s.toUpperCase().trim());
    const client = new SectorsClient();

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // Fetch batch overview, valuation and daily data in parallel
    const items = await Promise.all(
      targetSymbols.map(async (symbol) => {
        try {
          const [reportData, dailyData, flowData] = await Promise.all([
            client.getCompanyReport(symbol, ["overview", "valuation"]).catch(() => null),
            client.getDailyTransactions(symbol, ninetyDaysAgo).catch(() => null),
            client.getForeignFlow(symbol).catch(() => null),
          ]);

          const multiples = extractValuationMultiples(reportData?.valuation);
          const tech = dailyData && dailyData.length > 0
            ? computeTechnicalIndicators(dailyData)
            : null;

          const lastPrice = tech?.lastPrice || multiples.lastClosePrice || 0;
          const dailyChangePct = tech?.dailyReturnPct ?? (multiples.dailyChange ? multiples.dailyChange * 100 : 0);

          // Calculate 5-day foreign flow
          let flow5d = 0;
          if (flowData && Array.isArray(flowData)) {
            const recent = flowData.slice(-5);
            flow5d = recent.reduce((sum, r) => sum + (r.net_foreign_buy || 0), 0);
          }

          return {
            symbol,
            name: reportData?.company_name || getCompanyName(symbol) || `PT ${symbol} Tbk`,
            sector: reportData?.overview?.sector || "Umum",
            subSector: reportData?.overview?.sub_sector || "",
            marketCap: reportData?.overview?.market_cap || 0,
            lastPrice,
            dailyChangePct,
            pe: multiples.pe ?? null,
            pb: multiples.pb ?? null,
            rsi: tech?.rsi14 ?? null,
            trend: tech?.trendAssessment || "Neutral",
            flow5d,
          };
        } catch {
          return {
            symbol,
            name: getCompanyName(symbol) || `PT ${symbol} Tbk`,
            sector: "Umum",
            subSector: "",
            marketCap: 0,
            lastPrice: 0,
            dailyChangePct: 0,
            pe: null,
            pb: null,
            rsi: null,
            trend: "Neutral",
            flow5d: 0,
          };
        }
      })
    );

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch watchlist metrics" }, { status: 500 });
  }
}
