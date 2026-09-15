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

    const systemPrompt = `Anda adalah Telaah-AI, asisten riset saham ramah pemula (Financial Copilot) untuk bursa saham Indonesia (IDX).
Tugas Anda adalah menjawab pertanyaan pengguna HANYA berdasarkan bukti dan data yang ada pada Laporan Intelijen Emiten (${report.symbol} - ${report.companyName}).

ATURAN PENTING & GAYA KOMUNIKASI:
1. RAMAH RITEL PEMULA: Jelaskan dengan bahasa Indonesia yang santai, edukatif, dan mudah dipahami. Jika menyebut istilah seperti PBV, PER, Foreign Flow, atau Broker Summary, beri analogi singkat sehari-hari.
2. GROUNDED ON EVIDENCE: Hanya gunakan data faktual dari laporan ini. Jangan mengarang angka atau rumor di luar data.
3. ANTI FOMO / BUKAN AJAKAN BELI: Jangan memberi perintah beli/jual atau target harga fiktif. Berikan kesimpulan objektif (Kelebihan vs Risiko).
4. FORMAT RAPI: Gunakan poin-poin singkat agar nyaman dibaca di layar HP/chat.`;

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

    let answer = "";
    if (process.env.OPENROUTER_API_KEY) {
      answer = await callOpenRouter<string>({
        systemPrompt,
        userPrompt,
        responseFormat: "text",
        temperature: 0.2,
      });
    } else {
      // Fallback ringkasan edukatif berbasis data laporan langsung
      answer = `📌 **Berdasarkan data resmi Sectors API untuk ${report.symbol} (${report.companyName})**:\n\n` +
        `• **Ringkasan:** ${report.directAnswer}\n` +
        `• **Harga & Tren:** Rp ${report.technical.lastPrice.toLocaleString("id-ID")} (${report.technical.trendAssessment})\n` +
        `• **Foreign Flow (Asing):** ${report.flowLens.foreignFlow.recentTrend}\n\n` +
        `💡 *Catatan Ritel:* Gunakan menu Studio 360° jika ingin melihat grafik candlestick dan broker summary detail.`;
    }

    return NextResponse.json({ success: true, answer });
  } catch (error: any) {
    console.error("Error in /api/qa:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses pertanyaan lanjutan." },
      { status: 500 }
    );
  }
}
