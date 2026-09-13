import { callOpenRouter } from "./openrouter";
import { EvidenceCollectionResult } from "./coordinator";
import {
  AnalysisMode,
  AtomicClaim,
  ClaimEvaluation,
  CompanyIntelligenceReport,
  IntentType,
} from "./types";

interface SynthesisResponse {
  directAnswer: string;
  executiveSummary: string;
  claimEvaluations: Array<{
    claimId: string;
    verdict: "Didukung" | "Bertentangan" | "Perlu konteks" | "Tidak dapat diverifikasi" | "Opini/prediksi";
    confidence: number;
    reasoning: string;
    factualMetricValue?: string;
  }>;
  openQuestions: string[];
  limitations: string[];
}

export async function synthesizeIntelligenceReport(
  evidence: EvidenceCollectionResult,
  userPrompt: string,
  mode: AnalysisMode,
  intent: IntentType,
  claims: AtomicClaim[]
): Promise<CompanyIntelligenceReport> {
  const systemPrompt = `Anda adalah "Synthesis & Citation Guard" dari Telaah 360, asisten riset emiten Bursa Efek Indonesia (IDX).
Tugas Anda: Menyusun laporan riset 360° yang objektif, kritis, dan berbasis bukti empiris murni dari data terstruktur yang disediakan.

ATURAN KETAT (COMPLIANCE & SAFETY):
1. DILARANG MEMBERIKAN SARAN FINANSIAL: Jangan pernah menggunakan kata "Rekomendasi Beli/Jual/Hold", jangan memberikan target harga masa depan, dan jangan memprediksi masa depan ("saham ini pasti naik").
2. SETIAP ANGKA HARUS BERSUMBER DARI EVIDENCE: Jangan pernah mengarang angka baru. Jika metrik bernilai null atau tidak ada, katakan terus terang "Data belum tersedia".
3. ATURAN BROKER FLOW: Kode broker dan cohort (asing/domestik/ritel/institusi) adalah metadata bursa agregat, BUKAN identitas investor, BUKAN bukti kepemilikan definitif, dan TIDAK merefleksikan koordinasi atau manipulasi bandar.
4. VERDICT KLAIM (Jika ada klaim pengguna):
   - "Didukung": Bukti angka & periode sesuai fakta.
   - "Bertentangan": Bukti secara material berkebalikan dari klaim.
   - "Perlu konteks": Ada unsur kebenaran parsial, namun narasi mengabaikan faktor risiko/konteks lain.
   - "Tidak dapat diverifikasi": Data periode/metrik tidak mencukupi.
   - "Opini/prediksi": Merupakan pandangan subjektif atau harapan masa depan.

Jawab HANYA dalam JSON valid:
{
  "directAnswer": "Jawaban langsung dan padat menjawab pertanyaan/isu utama pengguna, beserta tanggal data terakhir.",
  "executiveSummary": "Ringkasan eksekutif 2-3 paragraf mencakup kondisi bisnis, kinerja laba/margin, valuasi & peer, serta dinamika flow bursa.",
  "claimEvaluations": [
    {
      "claimId": "id_klaim",
      "verdict": "Didukung",
      "confidence": 0.95,
      "reasoning": "Penjelasan mengapa klaim didukung atau bertentangan berdasarkan data faktual.",
      "factualMetricValue": "Angka riil dari bukti (misal: Net Inflow Rp 45.2M atau Pertumbuhan Laba YoY -12%)"
    }
  ],
  "openQuestions": ["Poin pertanyaan terbuka atau risiko bisnis yang perlu dicermati oleh investor"],
  "limitations": ["Batasan metodologi (misal: data transaksi broker agregat, laporan keuangan belum diaudit, dll.)"]
}`;

  // Package evidence cleanly for the LLM
  const evidencePayload = {
    symbol: evidence.symbol,
    companyName: evidence.companyName,
    userPrompt,
    mode,
    intent,
    claims,
    overview: evidence.overview,
    financials: {
      status: evidence.financials.status,
      latestDate: evidence.financials.latestPeriodDate,
      latestMetrics: evidence.financials.latest,
      qoqGrowth: evidence.financials.qoqGrowth,
      yoyGrowth: evidence.financials.yoyGrowth,
      solvency: evidence.financials.solvencyHealth,
    },
    valuation: evidence.valuation,
    peerLens: {
      basis: evidence.peerLens.basis,
      peers: evidence.peerLens.peers,
    },
    flowLens: {
      status: evidence.flowLens.status,
      period: `${evidence.flowLens.startDate} s.d ${evidence.flowLens.endDate} (${evidence.flowLens.totalTradingDays} hari)`,
      topBuyers: evidence.flowLens.topBuyers.slice(0, 3),
      topSellers: evidence.flowLens.topSellers.slice(0, 3),
      cohortSummary: evidence.flowLens.cohortSummary,
      foreignFlow5d: evidence.flowLens.foreignFlow.cumulative5d,
      recentTrend: evidence.flowLens.foreignFlow.recentTrend,
    },
    technical: {
      lastPrice: evidence.technical.lastPrice,
      lastDate: evidence.technical.lastDate,
      dailyReturnPct: evidence.technical.dailyReturnPct,
      sma20: evidence.technical.sma20,
      sma50: evidence.technical.sma50,
      rsi14: evidence.technical.rsi14,
      trendAssessment: evidence.technical.trendAssessment,
      relativeVolume: evidence.technical.volume.relativeVolume,
    },
    eventsSummary: {
      actionsCount: evidence.events.actions.length,
      recentFilings: evidence.events.filings.slice(0, 3).map((f) => ({ date: f.date, title: f.title })),
      recentNews: evidence.events.news.slice(0, 3).map((n) => ({ date: n.published_at, title: n.title })),
    },
  };

  const userInstruction = `Berikut adalah data empiris hasil audit sistem Telaah 360:\n${JSON.stringify(
    evidencePayload,
    null,
    2
  )}\n\nLakukan sintesis mendalam untuk menjawab prompt pengguna: "${userPrompt}".`;

  let response: SynthesisResponse;
  try {
    response = await callOpenRouter<SynthesisResponse>({
      systemPrompt,
      userPrompt: userInstruction,
      temperature: 0.15,
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

  // Bind claims back to evaluations
  const claimEvaluationsMap = new Map(
    (response.claimEvaluations || []).map((e) => [e.claimId, e])
  );

  const evaluatedClaims: ClaimEvaluation[] = claims.map((c) => {
    const evalData = claimEvaluationsMap.get(c.id);
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
      verdict: evalData?.verdict || "Tidak dapat diverifikasi",
      confidence: evalData?.confidence ?? 0.7,
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
    directAnswer: response.directAnswer,
    executiveSummary: response.executiveSummary,
    claims: evaluatedClaims,
    overview: evidence.overview,
    financials: evidence.financials,
    valuation: evidence.valuation,
    peerLens: evidence.peerLens,
    flowLens: evidence.flowLens,
    technical: evidence.technical,
    events: evidence.events,
    ownership: evidence.ownership,
    openQuestions: response.openQuestions || [],
    limitations: [
      "Telaah 360 adalah asisten informasi dan riset, bukan penyedia rekomendasi investasi berlisensi.",
      "FlowLens menyajikan agregasi transaksi broker bursa, bukan identitas pemilik sebenarnya.",
      ...(response.limitations || []),
    ],
    evidenceRecords: evidence.evidenceRecords,
    creditsConsumed: evidence.creditsConsumed,
    toolCallTrace: evidence.toolCallTrace,
  };
}
