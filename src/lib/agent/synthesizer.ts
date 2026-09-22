import { callOpenRouter } from "./openrouter";
import { EvidenceCollectionResult } from "./coordinator";
import {
  AnalysisMode,
  AtomicClaim,
  ClaimEvaluation,
  CompanyIntelligenceReport,
  IntentType,
} from "./types";

interface RawEvaluationItem {
  claimId?: string;
  claim?: string;
  originalText?: string;
  verdict?: "Didukung" | "Bertentangan" | "Perlu konteks" | "Tidak dapat diverifikasi" | "Opini/prediksi";
  confidence?: number;
  reasoning?: string;
  factualMetricValue?: string;
}

interface SynthesisResponse {
  directAnswer?: string;
  executiveSummary?: string;
  claimEvaluations?: RawEvaluationItem[];
  openQuestions?: string[];
  limitations?: string[];
}

export async function synthesizeIntelligenceReport(
  evidence: EvidenceCollectionResult,
  userPrompt: string,
  mode: AnalysisMode,
  intent: IntentType,
  claims: AtomicClaim[]
): Promise<CompanyIntelligenceReport> {
  const systemPrompt = `Anda adalah "Equity Research Synthesizer" untuk Telaah 360 Terminal, asisten riset pasar modal Bursa Efek Indonesia (IDX).
Tugas: Menyusun ringkasan riset institusional yang objektif, presisi, dan berbasis data resmi bursa (gaya Bloomberg Brief / Equity Research Note).

BAHASA: WAJIB MENGGUNAKAN BAHASA INDONESIA YANG FORMAL, ANALITIS, DAN PRESISI. DILARANG MENJAWAB DALAM BAHASA INGGRIS.

STANDAR GAYA PENULISAN INSTITUSIONAL (ANTI-AI SLOP):
1. HINDARI TOTAL: Segala bentuk emoji (✨, 💡, 🚀, dll.), basa-basi pembuka ("Halo!", "Tentu, mari kita telaah..."), kalimat penutup klise ("Semoga membantu!"), dan REPETISI KATA/LOOPING (dilarang mengulang kata yang sama seperti "bersih bersih bersih").
2. DIRECT ANSWER:
   - Jawab langsung pertanyaan atau topik inti pengguna di 1-2 kalimat pertama dengan angka data riil. Panjang maksimal 3 kalimat.
   - Contoh: "TLKM mencatat pendapatan Rp 38,69T dengan laba bersih Rp 6,28T (NPM 16,23%) per semester I 2026. Aliran broker 5 hari menunjukkan net outflow asing Rp 113,4M dengan valuasi PER 14,5x."
   - Jika pengguna menanyakan segmen/lini bisnis spesifik, sebutkan angka dari pos resmi yang dilaporkan.
3. EXECUTIVE SUMMARY:
   - Tulis 1-2 paragraf padat terstruktur:
     Paragraf 1: Posisi bisnis, margin laba, dan kesehatan neraca (DER/kas).
     Paragraf 2: Aliran dana asing/broker, valuasi komparatif, dan katalis/risiko utama.
   - Jangan mengulang kalimat dari directAnswer secara verbatim.
4. KLAIM PASAR & OBJEKTIVITAS:
   - Vonis klaim objektif: "Didukung" | "Bertentangan" | "Perlu konteks" | "Tidak dapat diverifikasi" | "Opini/prediksi".
   - 0% rekomendasi beli/jual, 0% target harga spekulatif.

Jawab HANYA dalam format JSON valid berikut:
{
  "directAnswer": "Tesis langsung 1-2 kalimat menjawab pertanyaan pengguna didukung angka data",
  "executiveSummary": "Ringkasan institusional 1-2 paragraf mengenai fundamental, margin, arus broker, dan valuasi",
  "claimEvaluations": [
    {
      "claimId": "claim_1",
      "verdict": "Bertentangan",
      "confidence": 0.95,
      "factualMetricValue": "Nilai riil bursa",
      "reasoning": "Penjelasan singkat berbasis data resmi bursa"
    }
  ],
  "openQuestions": ["Poin risiko utama atau catatan kritis untuk investor"],
  "limitations": ["Batasan data atau periode laporan"]
}`;

  // Siapkan rincian segmen jika tersedia
  let segmenBreakdown: any = "Data rincian segmen tidak dilaporkan.";
  if (evidence.segments?.revenue_breakdown && Array.isArray(evidence.segments.revenue_breakdown)) {
    const sources = evidence.segments.revenue_breakdown
      .filter((x: any) => x.target === "Total Revenue" && x.value > 0)
      .map((x: any) => ({
        lini_bisnis: x.source,
        pendapatan: `Rp ${(x.value / 1e12).toFixed(2)} Triliun`,
      }));
    if (sources.length > 0) {
      segmenBreakdown = sources;
    }
  }

  // Siapkan ringkasan bukti data yang padat dan informatif
  const evidenceSummary = {
    emiten: `${evidence.symbol} - ${evidence.companyName}`,
    sektor: evidence.overview?.sector || "N/A",
    subsektor: evidence.overview?.sub_sector || "N/A",
    marketCap: evidence.overview?.market_cap
      ? `Rp ${((evidence.overview.market_cap) / 1e12).toFixed(2)} Triliun`
      : "-",
    segmen_pendapatan_resmi: segmenBreakdown,
    laba_pendapatan: {
      periode: evidence.financials.latestPeriodDate,
      pendapatan: evidence.financials.latest?.revenue
        ? `Rp ${(evidence.financials.latest.revenue / 1e12).toFixed(2)} T`
        : "-",
      labaBersih: evidence.financials.latest?.netIncome
        ? `Rp ${(evidence.financials.latest.netIncome / 1e12).toFixed(2)} T`
        : "-",
      yoyLabaGrowth: evidence.financials.yoyGrowth.netIncomePct !== null
        ? `${evidence.financials.yoyGrowth.netIncomePct}%`
        : "N/A",
      qoqLabaGrowth: evidence.financials.qoqGrowth.netIncomePct !== null
        ? `${evidence.financials.qoqGrowth.netIncomePct}%`
        : "N/A",
      netProfitMargin: evidence.financials.latest?.netMarginPct !== null
        ? `${evidence.financials.latest?.netMarginPct}%`
        : "-",
    },
    arus_asing_dan_broker: {
      foreignFlow5Hari: evidence.flowLens.status !== "unavailable"
        ? `Rp ${(evidence.flowLens.foreignFlow.cumulative5d / 1e9).toFixed(1)} Miliar`
        : "-",
      foreignTrend: evidence.flowLens.foreignFlow.recentTrend,
      topNetBuyer: evidence.flowLens.topBuyers[0]?.code || "-",
      topNetSeller: evidence.flowLens.topSellers[0]?.code || "-",
    },
    teknikal: {
      hargaTerakhir: evidence.technical.lastPrice
        ? `Rp ${evidence.technical.lastPrice.toLocaleString("id-ID")}`
        : "-",
      trend: evidence.technical.trendAssessment,
      rsi14: evidence.technical.rsi14 ?? "-",
      sma20: evidence.technical.sma20 ?? "-",
    },
    radar_insider_direksi: {
      signal: evidence.insiderRadar?.signal,
      summary: evidence.insiderRadar?.summary,
      clusterBuyTerdeteksi: evidence.insiderRadar?.clusterBuyDetected,
      clusterSellTerdeteksi: evidence.insiderRadar?.clusterSellDetected,
      totalLembarBeli: evidence.insiderRadar?.totalBuyShares,
    },
    lensa_komoditas: evidence.commodityLens?.isCommodityIssuer
      ? {
          komoditasUtama: evidence.commodityLens.primaryCommodity,
          estimasiSensitivitas: evidence.commodityLens.sensitivityEstimate.narrative,
        }
      : undefined,
    klaim_pengguna: claims.map((c) => ({ id: c.id, teks: c.originalText })),
  };

  const userInstruction = `${evidence.providerError ? `PERINGATAN PROVIDER: ${evidence.providerError}\nJangan mengarang angka atau menyimpulkan kondisi perusahaan dari data kosong.\n\n` : ""}Bukti Data Terverifikasi:\n${JSON.stringify(
    evidenceSummary,
    null,
    2
  )}\n\nPrompt Pengguna (JAWAB DENGAN FOKUS SPESIFIK PADA TOPIK INI): "${userPrompt}"`;

  let response: SynthesisResponse;
  try {
    response = await callOpenRouter<SynthesisResponse>({
      systemPrompt,
      userPrompt: userInstruction,
      temperature: 0.1,
    });
  } catch (error) {
    console.error("Error in synthesizeIntelligenceReport:", error);
    response = {
      directAnswer: `Telaah 360 telah memeriksa data untuk emiten ${evidence.symbol} (${evidence.companyName}).`,
      executiveSummary: `Emiten ${evidence.symbol} beroperasi di sektor ${evidence.overview?.sector || "N/A"}. Harga terakhir tercatat Rp ${evidence.technical.lastPrice}.`,
      claimEvaluations: claims.map((c) => ({
        claimId: c.id,
        verdict: "Tidak dapat diverifikasi",
        confidence: 0.5,
        reasoning: "Gagal menghubungkan klaim dengan ringkasan otomatis.",
        factualMetricValue: undefined,
      })),
      openQuestions: ["Perlu verifikasi lebih lanjut terhadap laporan keuangan terbaru."],
      limitations: ["Data broker bursa bersifat agregat harian."],
    };
  }

  // Petakan evaluasi klaim kembali ke klaim asli
  const rawEvals = Array.isArray(response.claimEvaluations) ? response.claimEvaluations : [];
  
  const evaluatedClaims: ClaimEvaluation[] = claims.map((c, idx) => {
    // Cari evaluasi berdasarkan claimId atau pencocokan teks
    const evalData =
      rawEvals.find((e) => e.claimId === c.id) ||
      rawEvals.find((e) => e.claim && e.claim.toLowerCase().includes(c.originalText.toLowerCase().slice(0, 15))) ||
      rawEvals[idx];

    const relatedEvidence = evidence.evidenceRecords
      .filter((ev) => {
        if (c.claimType === "flow" && ev.module === "flowlens") return true;
        if (c.claimType === "financial" && ev.module === "financials") return true;
        if (c.claimType === "price_technical" && ev.module === "technical") return true;
        if (c.claimType === "event" && ev.module === "events") return true;
        if (c.claimType === "valuation" && ev.module === "valuation") return true;
        return false;
      })
      .map((ev) => ev.id);

    return {
      claimId: c.id,
      originalText: c.originalText,
      verdict: evalData?.verdict || "Perlu konteks",
      confidence: evalData?.confidence ?? 0.85,
      reasoning: evalData?.reasoning || "Evaluasi berdasarkan metrik empiris bursa.",
      factualMetricValue: evalData?.factualMetricValue,
      evidenceIds: relatedEvidence.length > 0 ? relatedEvidence : ["ev_overview_01"],
    };
  });

  const reportId = `rep_${evidence.symbol.toLowerCase()}_${Date.now()}`;
  const now = new Date().toISOString();

  return {
    id: reportId,
    symbol: evidence.symbol,
    companyName: evidence.companyName,
    userPrompt,
    mode,
    intent,
    generatedAt: now,
    dataAsOf: evidence.technical.lastDate || now.split("T")[0],
    directAnswer: response.directAnswer || `Hasil telaah terhadap emiten ${evidence.symbol}.`,
    executiveSummary: response.executiveSummary || `Ringkasan kondisi terkini ${evidence.companyName}.`,
    claims: evaluatedClaims,
    overview: evidence.overview,
    financials: evidence.financials,
    valuation: evidence.valuation,
    peerLens: evidence.peerLens,
    flowLens: evidence.flowLens,
    technical: evidence.technical,
    events: evidence.events,
    ownership: evidence.ownership,
    insiderRadar: evidence.insiderRadar,
    commodityLens: evidence.commodityLens,
    integrity: evidence.integrity,
    tradingPlan: evidence.tradingPlan,
    segments: evidence.segments,
    openQuestions: Array.isArray(response.openQuestions) && response.openQuestions.length > 0
      ? response.openQuestions
      : ["Perlu mencermati perkembangan realisasi laba kuartal berikutnya."],
    limitations: [
      ...(evidence.providerError ? [evidence.providerError] : []),
      "Telaah 360 adalah asisten informasi dan riset edukasi, bukan penyedia rekomendasi investasi berlisensi.",
      "FlowLens menyajikan agregasi transaksi broker bursa, bukan identitas pemilik sebenarnya.",
      ...(Array.isArray(response.limitations) ? response.limitations : []),
    ],
    evidenceRecords: evidence.evidenceRecords,
    creditsConsumed: evidence.creditsConsumed,
    toolCallTrace: evidence.toolCallTrace,
  };
}
