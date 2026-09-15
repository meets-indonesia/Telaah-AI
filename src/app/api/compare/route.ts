import { NextRequest, NextResponse } from "next/server";
import { SectorsClient } from "@/lib/sectors/client";
import { computeTechnicalIndicators } from "@/lib/quant/indicators";

export interface StockCompareMetric {
  category: string;
  name: string;
  valueA: string | number;
  valueB: string | number;
  winner?: "A" | "B" | "TIE";
  explanation: string;
}

export interface StockCompareResult {
  symbolA: string;
  nameA: string;
  priceA: number;
  sectorA: string;
  symbolB: string;
  nameB: string;
  priceB: number;
  sectorB: string;
  metrics: StockCompareMetric[];
  verdictA: string;
  verdictB: string;
  retailSummary: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let symbolA = body.symbolA?.trim()?.toUpperCase()?.replace(".JK", "");
    let symbolB = body.symbolB?.trim()?.toUpperCase()?.replace(".JK", "");

    if (!symbolA || !symbolB) {
      // Check if user sent a prompt like "Bandingkan BBCA vs BBRI"
      const prompt = body.prompt || "";
      const matches = prompt.match(/\b([A-Z]{4})\b.*?(?:vs|dan|dengan|lawan|bandingkan)\b.*?([A-Z]{4})\b/i);
      if (matches) {
        symbolA = matches[1].toUpperCase();
        symbolB = matches[2].toUpperCase();
      }
    }

    if (!symbolA || !symbolB || !/^[A-Z]{4}$/.test(symbolA) || !/^[A-Z]{4}$/.test(symbolB)) {
      return NextResponse.json(
        { error: "Mohon sertakan 2 kode saham IDX 4 huruf yang valid (contoh: BBCA dan BBRI)." },
        { status: 400 }
      );
    }

    const client = new SectorsClient();

    // Fetch data in parallel for both tickers
    const [reportA, reportB, dailyA, dailyB, flowA, flowB] = await Promise.allSettled([
      client.getCompanyReport(symbolA, ["overview", "valuation", "financials", "peers"]),
      client.getCompanyReport(symbolB, ["overview", "valuation", "financials", "peers"]),
      client.getDailyTransactions(symbolA),
      client.getDailyTransactions(symbolB),
      client.getForeignFlow(symbolA),
      client.getForeignFlow(symbolB),
    ]);

    const repA = reportA.status === "fulfilled" ? reportA.value : null;
    const repB = reportB.status === "fulfilled" ? reportB.value : null;
    const txA = dailyA.status === "fulfilled" ? dailyA.value : [];
    const txB = dailyB.status === "fulfilled" ? dailyB.value : [];
    const fA = flowA.status === "fulfilled" ? flowA.value : [];
    const fB = flowB.status === "fulfilled" ? flowB.value : [];

    const techA = computeTechnicalIndicators(txA);
    const techB = computeTechnicalIndicators(txB);

    // Extract metrics
    const priceA = techA.lastPrice || 0;
    const priceB = techB.lastPrice || 0;

    const peA = repA?.valuation?.historical_valuation?.pe?.current ?? null;
    const peB = repB?.valuation?.historical_valuation?.pe?.current ?? null;

    const pbA = repA?.valuation?.historical_valuation?.pb?.current ?? null;
    const pbB = repB?.valuation?.historical_valuation?.pb?.current ?? null;

    // Foreign net flow (sum last 5 days)
    const flowItemsA = Array.isArray(fA) ? fA : Array.isArray((fA as any)?.data) ? (fA as any).data : [];
    const flowItemsB = Array.isArray(fB) ? fB : Array.isArray((fB as any)?.data) ? (fB as any).data : [];

    const netFlowA = flowItemsA.slice(0, 5).reduce((acc: number, cur: any) => acc + (cur.net_foreign_inflow || cur.net_foreign_flow || 0), 0);
    const netFlowB = flowItemsB.slice(0, 5).reduce((acc: number, cur: any) => acc + (cur.net_foreign_inflow || cur.net_foreign_flow || 0), 0);

    const metrics: StockCompareMetric[] = [
      {
        category: "Valuasi",
        name: "Price to Earnings (PER)",
        valueA: peA ? `${peA.toFixed(1)}x` : "N/A",
        valueB: peB ? `${peB.toFixed(1)}x` : "N/A",
        winner: peA && peB ? (peA < peB ? "A" : peB < peA ? "B" : "TIE") : undefined,
        explanation: "PER lebih rendah menunjukkan valuasi harga saham relatif lebih murah terhadap laba per saham.",
      },
      {
        category: "Valuasi",
        name: "Price to Book (PBV)",
        valueA: pbA ? `${pbA.toFixed(2)}x` : "N/A",
        valueB: pbB ? `${pbB.toFixed(2)}x` : "N/A",
        winner: pbA && pbB ? (pbA < pbB ? "A" : pbB < pbA ? "B" : "TIE") : undefined,
        explanation: "PBV mencerminkan kelipatan harga pasar dibanding nilai aset bersih (buku) perusahaan.",
      },
      {
        category: "Arus Modal",
        name: "Foreign Flow (5 Hari)",
        valueA: netFlowA >= 0 ? `+Rp ${(netFlowA / 1e9).toFixed(1)} M` : `-Rp ${(Math.abs(netFlowA) / 1e9).toFixed(1)} M`,
        valueB: netFlowB >= 0 ? `+Rp ${(netFlowB / 1e9).toFixed(1)} M` : `-Rp ${(Math.abs(netFlowB) / 1e9).toFixed(1)} M`,
        winner: netFlowA > netFlowB ? "A" : netFlowB > netFlowA ? "B" : "TIE",
        explanation: "Akumulasi dana asing yang positif menunjukkan minat institusi luar negeri terhadap emiten.",
      },
      {
        category: "Teknikal",
        name: "Tren Jangka Pendek",
        valueA: techA.trendAssessment,
        valueB: techB.trendAssessment,
        winner: techA.trendAssessment === "Bullish" ? "A" : techB.trendAssessment === "Bullish" ? "B" : "TIE",
        explanation: "Status tren teknikal berdasarkan pergerakan harga relatif terhadap rata-rata MA20 & MA50.",
      },
    ];

    const result: StockCompareResult = {
      symbolA,
      nameA: repA?.overview?.company_name || symbolA,
      priceA,
      sectorA: repA?.overview?.sector || "IDX",
      symbolB,
      nameB: repB?.overview?.company_name || symbolB,
      priceB,
      sectorB: repB?.overview?.sector || "IDX",
      metrics,
      verdictA: netFlowA > 0 ? "Akumulasi Asing Positif" : "Tekanan Jual Asing",
      verdictB: netFlowB > 0 ? "Akumulasi Asing Positif" : "Tekanan Jual Asing",
      retailSummary: `Komparasi langsung antara **${symbolA}** dan **${symbolB}**: ` +
        (peA && peB
          ? peA < peB
            ? `${symbolA} memiliki valuasi PER lebih atraktif (${peA.toFixed(1)}x vs ${peB.toFixed(1)}x). `
            : `${symbolB} memiliki valuasi PER lebih atraktif (${peB.toFixed(1)}x vs ${peA.toFixed(1)}x). `
          : "") +
        (netFlowA > netFlowB
          ? `Aliran dana asing dalam 5 hari terakhir lebih dominan masuk ke **${symbolA}**.`
          : `Aliran dana asing dalam 5 hari terakhir lebih dominan masuk ke **${symbolB}** serta mencatatkan akumulasi lebih kuat.`),
    };

    return NextResponse.json({ success: true, comparison: result });
  } catch (error: any) {
    console.error("Error in /api/compare:", error);
    return NextResponse.json(
      { error: error.message || "Gagal melakukan perbandingan saham." },
      { status: 500 }
    );
  }
}
