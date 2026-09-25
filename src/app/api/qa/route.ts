import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/agent/openrouter";
import { extractVisionDataWithClaude } from "@/lib/agent/vision";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import { extractValuationMultiples } from "@/lib/sectors/types";

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

    const systemPrompt = `Anda adalah Telaah-AI, asisten riset pasar modal Bursa Efek Indonesia (IDX) yang serba tahu, cerdas, mengalir luwes, dan berbasis data.

KEPRIBADIAN & CARA MENJAWAB:
1. LUWES, MENGALIR, DAN TIDAK KAKU:
   - Anda BUKAN bot kaku yang terjebak pada satu emiten saja. Anda adalah analis riset ekosistem pasar modal Indonesia secara utuh.
   - Ketika pengguna menanyakan saham lain yang berhubungan (misal: anak usaha, perusahaan satu grup konglomerasi, rekan satu sektor/industri, atau ekosistem bisnis seperti SCMA, BUKA, GOTO, SAME untuk EMTK; atau BUMI, BRMS untuk Bakrie; atau ASII, UNTR untuk Astra):
     WAJIB ANDA JELASKAN SECARA MENDALAM! Paparkan hubungan kepemilikannya, bandingkan performa masing-masing emiten (valuasi PER/PBV, skala bisnis, pendapatan, laba, kapitalisasi pasar), sajikan tabel komparasi jika perlu, dan berikan wawasan ekosistem bisnis yang komprehensif. DILARANG KERAS menolak, membatasi diri, atau mengatakan "saya hanya memiliki akses satu emiten" / "aturan isolasi konteks".
2. GROUNDING DATA:
   - Jika pengguna menanyakan emiten yang sedang dibuka (${report.symbol}), padukan dengan data pasar modal yang disediakan di bawah.
   - Jika pengguna bertanya konsep investasi umum atau tips trading, jawab secara ramah dan profesional.
3. OBJEKTIF & BERWAWASAN INSTITUSIONAL:
   - Jaga gaya bahasa tetap santai, tajam, profesional, ramah ritel, dan berwawasan institusional tanpa rekomendasi beli/jual ilegal.`;

    const multiples = extractValuationMultiples(report.valuation);
    const recentHistoryText = history.slice(-6).map((h) => `${h.role === "user" ? "Pengguna" : "Copilot"}: ${h.text}`).join("\n");

    const userPrompt = `Konteks Ringkasan Pasar Modal ${report.symbol} (${report.companyName}):
- Sektor / Subsektor: ${report.overview?.sector || "N/A"} / ${report.overview?.sub_sector || "N/A"}
- Harga Terakhir: Rp ${report.technical?.lastPrice || multiples.lastClosePrice || "-"}
- Valuasi: PER ${multiples.pe ? multiples.pe.toFixed(1) + "x" : "-"}, PBV ${multiples.pb ? multiples.pb.toFixed(2) + "x" : "-"}
- Kapitalisasi Pasar: Rp ${((report.overview?.market_cap || 0) / 1e12).toFixed(1)}T
- Pertumbuhan Laba YoY: ${report.financials?.yoyGrowth?.netIncomePct ? report.financials.yoyGrowth.netIncomePct.toFixed(1) + "%" : "-"}
- Net Margin (NPM): ${report.financials?.latest?.netMarginPct ? report.financials.latest.netMarginPct.toFixed(1) + "%" : "-"}
- Arus Broker 5H: ${report.flowLens?.foreignFlow?.recentTrend || "Netral"}
${report.overview?.affiliates?.length ? `- Afiliasi / Grup Konglomerasi: ${report.overview.affiliates.join(", ")}` : ""}
${report.peerLens?.peers?.length ? `- Rekan Sektor Tercatat: ${report.peerLens.peers.map((p) => `${p.symbol} (${p.pe ? p.pe.toFixed(1) + "x" : "-"} PER)`).join(", ")}` : ""}

${visionContext}${recentHistoryText ? `Riwayat Percakapan Sebelumnya:\n${recentHistoryText}\n\n` : ""}Pertanyaan Pengguna: "${question || "Tolong analisis terkait emiten ini."}"`;

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
