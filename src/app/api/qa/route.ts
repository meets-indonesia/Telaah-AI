import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/agent/openrouter";
import { extractVisionDataWithClaude } from "@/lib/agent/vision";
import { CompanyIntelligenceReport } from "@/lib/agent/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = body.question?.trim();
    const report: CompanyIntelligenceReport = body.report;
    const history: Array<{ role: "user" | "assistant"; text: string }> = Array.isArray(body.history) ? body.history : [];
    const images: string[] = Array.isArray(body.images) ? body.images : [];

    if ((!question && images.length === 0) || !report) {
      return NextResponse.json(
        { error: "Pertanyaan dan data laporan harus disertakan." },
        { status: 400 }
      );
    }

    let visionContext = "";
    if (images.length > 0) {
      const visionResult = await extractVisionDataWithClaude(images, question);
      visionContext = `[Temuan Visual Gambar Terlampir (${visionResult.imageType})]:\n${visionResult.summary}\n${visionResult.extractedData}\n\n`;
    }

    const systemPrompt = `Anda adalah Telaah-AI, asisten riset pasar modal Indonesia (IDX) yang cerdas, objektif, dan ramah.
Konteks emiten yang sedang aktif di terminal saat ini: ${report.symbol} (${report.companyName}).

PANDUAN MENJAWAB:
1. FLEKSIBEL & RESPONSIF:
   - Jika pengguna bertanya tentang ${report.symbol}, gunakan data laporan resmi untuk menjawab secara mendalam dan presisi.
   - Jika pengguna melampirkan gambar, screenshot grafik, atau menanyakan emiten lain: BAHAS DAN JELASKAN DATA GAMBAR ATAU EMITEN LAIN TERSEBUT DENGAN JELAS DAN TUNTAS. DILARANG menolak atau menepis pertanyaan pengguna hanya karena berbeda dengan emiten yang sedang terbuka. Berikan analisis mendalam atas gambar/data yang dilampirkan, lalu bandingkan dengan ${report.symbol} jika relevan.
   - Jika pengguna menyapa atau bertanya konsep umum (misal: tips investasi, indikator, dividen), jawab secara edukatif dan santai.
2. RAMAH RITEL & EDUKATIF: Bahasa Indonesia jelas, santai, terstruktur, tanpa jargon berbelit.
3. GROUNDED ON DATA: Jangan mengarang angka.
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

    const userPrompt = `Data Laporan Resmi ${report.symbol}:\n${JSON.stringify(context, null, 2)}\n\n${visionContext}${recentHistoryText ? `Riwayat Percakapan Sebelumnya:\n${recentHistoryText}\n\n` : ""}Pertanyaan Pengguna: "${question || "Tolong analisis gambar terkait emiten ini."}"`;

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
