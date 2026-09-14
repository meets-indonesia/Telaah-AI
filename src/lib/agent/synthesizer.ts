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
  const systemPrompt = `Anda adalah "Synthesis & Citation Guard" untuk Telaah 360, asisten riset emiten Bursa Efek Indonesia (IDX).
Tugas: Menjawab PERTANYAAN/PROMPT PENGGUNA SECARA SPESIFIK dan menyusun laporan riset 360° yang objektif berbasis data terstruktur.

BAHASA: WAJIB MENJAWAB SELURUH TEKS (directAnswer, executiveSummary, dll.) DALAM BAHASA INDONESIA. JANGAN PERNAH MENJAWAB DALAM BAHASA INGGRIS.

ATURAN WAJIB DIRECT ANSWER (SANGAT KRUSIAL):
1. JAWAB LANGSUNG TOPIK SPESIFIK PENGGUNA DI KALIMAT PERTAMA:
   - Identifikasi apa inti pertanyaan atau topik yang ditanyakan pengguna (misal: "performa data center", "rights issue", "dividen", "laba anjlok", "margin turun").
   - directAnswer HARUS fokus menjawab topik spesifik tersebut terlebih dahulu, BUKAN sekadar membaca ulang angka kapitalisasi pasar secara generik!
   - Jika pengguna bertanya tentang segmen/lini bisnis tertentu (misal: "data center DSSA"), periksa bagian 'segmen_pendapatan_resmi'. Sebutkan nama segmen terkait (misal 'Cable TV, internet and technology'), nilai pendapatannya, dan kontribusinya terhadap total pendapatan.
   - Jika suatu pos tidak dilaporkan secara terpisah dalam data resmi bursa, nyatakan secara eksplisit dan transparan, lalu tunjukkan pos terdekat yang dilaporkan oleh perseroan.
   - JANGAN PERNAH mengabaikan pertanyaan pengguna dengan memberikan template ringkasan generik.
2. DILARANG MEMBERIKAN SARAN FINANSIAL: 0% rekomendasi beli/jual, 0% target harga masa depan.
3. VONIS KLAIM: "Didukung" | "Bertentangan" | "Perlu konteks" | "Tidak dapat diverifikasi" | "Opini/prediksi".
4. WAJIB menggunakan Bahasa Indonesia yang formal, analitis, dan presisi.

Jawab HANYA format JSON valid:
{
  "directAnswer": "Jawaban langsung dan presisi menjawab topik spesifik pengguna, diperkuat angka bukti data",
  "executiveSummary": "Ringkasan eksekutif 2 paragraf kondisi bisnis, laba, valuasi, dan flow pasar",
  "claimEvaluations": [
    {
      "claimId": "claim_1",
      "verdict": "Bertentangan",
      "confidence": 0.95,
      "factualMetricValue": "Nilai riil bursa",
      "reasoning": "Alasan singkat berbasis data"
    }
  ],
  "openQuestions": ["Poin risiko atau pertanyaan terbuka untuk investor"],
  "limitations": ["Batasan metodologi data"]
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
    harmonic_prz: evidence.harmonic?.hasPattern
      ? {
          pola: evidence.harmonic.patternName,
          tipe: evidence.harmonic.type,
          area_PRZ: `Rp ${evidence.harmonic.prz.lower} - Rp ${evidence.harmonic.prz.upper}`,
          target1: `Rp ${evidence.harmonic.targets.tp1.price}`,
          target2: `Rp ${evidence.harmonic.targets.tp2.price}`,
          status: evidence.harmonic.status,
        }
      : undefined,
    klaim_pengguna: claims.map((c) => ({ id: c.id, teks: c.originalText })),
  };

  const userInstruction = `Bukti Data Terverifikasi:\n${JSON.stringify(
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
    harmonic: evidence.harmonic,
    segments: evidence.segments,
    openQuestions: Array.isArray(response.openQuestions) && response.openQuestions.length > 0
      ? response.openQuestions
      : ["Perlu mencermati perkembangan realisasi laba kuartal berikutnya."],
    limitations: [
      "Telaah 360 adalah asisten informasi dan riset edukasi, bukan penyedia rekomendasi investasi berlisensi.",
      "FlowLens menyajikan agregasi transaksi broker bursa, bukan identitas pemilik sebenarnya.",
      ...(Array.isArray(response.limitations) ? response.limitations : []),
    ],
    evidenceRecords: evidence.evidenceRecords,
    creditsConsumed: evidence.creditsConsumed,
    toolCallTrace: evidence.toolCallTrace,
  };
}
