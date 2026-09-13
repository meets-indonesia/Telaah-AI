import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/agent/openrouter";
import { CompanyIntelligenceReport } from "@/lib/agent/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = body.question?.trim();
    const report: CompanyIntelligenceReport = body.report;

    if (!question || !report) {
      return NextResponse.json(
        { error: "Pertanyaan dan data laporan harus disertakan." },
        { status: 400 }
      );
    }

    const systemPrompt = `Anda adalah asisten riset cerdas untuk Telaah 360.
Tugas Anda adalah menjawab pertanyaan lanjutan pengguna HANYA berdasarkan bukti dan data yang ada pada Laporan Intelijen Emiten (${report.symbol} - ${report.companyName}).

ATURAN KETAT:
1. Grounded strictly on evidence: Jika informasi tidak ada di dalam laporan, katakan dengan jujur bahwa data tersebut tidak tercantum dalam laporan saat ini.
2. TOLAK SARAN FINANSIAL: Jika pengguna bertanya "apakah saya harus beli?", "kapan jual?", atau meminta target harga masa depan, tolak dengan sopan dan jelaskan posisi Anda sebagai asisten riset edukasi/informasi.
3. Jawab dalam Bahasa Indonesia yang profesional, padat, dan analitis. Sertakan kutipan angka atau periode faktual jika relevan.`;

    const context = {
      symbol: report.symbol,
      companyName: report.companyName,
      directAnswer: report.directAnswer,
      financials: {
        latestDate: report.financials.latestPeriodDate,
        metrics: report.financials.latest,
        growthYoY: report.financials.yoyGrowth,
        solvency: report.financials.solvencyHealth,
      },
      flowLens: {
        topBuyers: report.flowLens.topBuyers.slice(0, 3),
        topSellers: report.flowLens.topSellers.slice(0, 3),
        foreignFlowTrend: report.flowLens.foreignFlow.recentTrend,
        foreignFlow5d: report.flowLens.foreignFlow.cumulative5d,
      },
      technical: {
        price: report.technical.lastPrice,
        trend: report.technical.trendAssessment,
        rsi: report.technical.rsi14,
        sma20: report.technical.sma20,
      },
      peers: report.peerLens?.peers,
      eventsCount: report.events?.actions.length,
      claims: report.claims,
    };

    const userPrompt = `Data Laporan:\n${JSON.stringify(context, null, 2)}\n\nPertanyaan Pengguna: "${question}"`;

    const answer = await callOpenRouter<string>({
      systemPrompt,
      userPrompt,
      responseFormat: "text",
      temperature: 0.2,
    });

    return NextResponse.json({ success: true, answer });
  } catch (error: any) {
    console.error("Error in /api/qa:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses pertanyaan lanjutan." },
      { status: 500 }
    );
  }
}
