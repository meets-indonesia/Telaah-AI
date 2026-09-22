import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/agent/openrouter";
import { CompanyIntelligenceReport } from "@/lib/agent/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = body.question?.trim();
    const report: CompanyIntelligenceReport = body.report;
    const history: Array<{ role: "user" | "assistant"; text: string }> = Array.isArray(body.history) ? body.history : [];

    if (!question || !report) {
      return NextResponse.json(
        { error: "Pertanyaan dan data laporan harus disertakan." },
        { status: 400 }
      );
    }

    const systemPrompt = `Anda adalah Telaah-AI, asisten riset saham ramah pemula (Financial Copilot) untuk bursa saham Indonesia (IDX).
Tugas Anda: Menjawab pertanyaan HANYA terfokus pada emiten yang sedang aktif di kanvas terminal (${report.symbol} - ${report.companyName}).

ATURAN ISOLASI KONTEKS & GROUNDING:
1. FOCUS PADA ${report.symbol}: Setiap jawaban harus merujuk pada data fundamental, teknikal, dan flow resmi dari ${report.symbol}. Jika pengguna bertanya hal di luar emiten ini, arahkan kembali secara sopan ke data ${report.symbol}.
2. RAMAH RITEL & EDUKATIF: Bahasa Indonesia jelas, santai, terstruktur, tanpa jargon berbelit.
3. GROUNDED ON DATA: Jangan mengarang angka di luar data laporan ini.
4. BUKAN AJAKAN BELI: Jangan memberi perintah beli/jual atau rekomendasi spekulatif.`;

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

    // Format riwayat percakapan copilot sebelumnya untuk context window percakapan
    const recentHistoryText = history.slice(-6).map((h) => `${h.role === "user" ? "Pengguna" : "Copilot"}: ${h.text}`).join("\n");

    const userPrompt = `Data Laporan Resmi ${report.symbol}:\n${JSON.stringify(context, null, 2)}\n\n${recentHistoryText ? `Riwayat Percakapan Sebelumnya:\n${recentHistoryText}\n\n` : ""}Pertanyaan Pengguna: "${question}"`;

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
      answer = `**Berdasarkan data resmi Sectors API untuk ${report.symbol} (${report.companyName})**:\n\n` +
        `• **Ringkasan:** ${report.directAnswer}\n` +
        `• **Harga & Tren:** Rp ${report.technical.lastPrice.toLocaleString("id-ID")} (${report.technical.trendAssessment})\n` +
        `• **Foreign Flow (Asing):** ${report.flowLens.foreignFlow.recentTrend}\n\n` +
        `*Catatan:* Gunakan menu Studio 360° jika ingin melihat grafik candlestick dan broker summary detail.`;
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
