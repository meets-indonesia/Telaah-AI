import { FinancialHealthAnalysis } from "./financials";
import { FlowLensAnalysis } from "./flow";
import { TechnicalAnalysisResult } from "./indicators";
import { ValuationData, InsiderClusterAnalysis, extractValuationMultiples } from "../sectors/types";

export interface IntegrityCheckItem {
  id: string;
  category: "cash_flow" | "solvency" | "insider" | "flow_quality" | "valuation";
  label: string;
  status: "pass" | "warning" | "danger" | "neutral";
  detail: string;
  weight: number;
  penalty: number;
}

export type IntegrityVerdict = "Fakta Solid" | "Speculative Play" | "Red Flag Alert";

export interface RedFlagAnalysisResult {
  score: number; // 0 - 100
  verdict: IntegrityVerdict;
  headline: string;
  retailSummary: string;
  checks: IntegrityCheckItem[];
  riskCount: {
    danger: number;
    warning: number;
    pass: number;
  };
}

/**
 * Menghitung skor integritas & mendeteksi Red Flag emiten secara deterministik.
 * Membandingkan kualitas laba riil (operating cash flow), beban utang, aksi insider/direksi,
 * divergensi flow asing/institusi, dan kewajaran valuasi.
 */
export function calculateIntegrityScore(params: {
  financials?: FinancialHealthAnalysis;
  flow?: FlowLensAnalysis;
  technical?: TechnicalAnalysisResult;
  valuation?: ValuationData;
  insiderRadar?: InsiderClusterAnalysis;
  currentPrice?: number | null;
}): RedFlagAnalysisResult {
  const { financials, flow, technical, valuation, insiderRadar } = params;
  const checks: IntegrityCheckItem[] = [];
  let score = 100;

  // 1. Cash Flow vs Net Income (Laba Riil vs Laba Semu)
  const latestFinancial = financials?.latest;
  if (latestFinancial) {
    const netIncome = latestFinancial.netIncome;
    const opCashFlow = latestFinancial.cashFlowOperating;

    if (netIncome !== null && opCashFlow !== null) {
      if (netIncome > 0 && opCashFlow <= 0) {
        checks.push({
          id: "cf_quality_negative",
          category: "cash_flow",
          label: "Arus Kas Operasional Negatif",
          status: "danger",
          detail: `Laba bersih positif (Rp ${(netIncome / 1e9).toFixed(1)} Miliar), tetapi arus kas operasi minus (Rp ${(opCashFlow / 1e9).toFixed(1)} Miliar). Indikasi penjualan belum jadi uang tunai (piutang tertahan/akrual tinggi).`,
          weight: 25,
          penalty: 25,
        });
        score -= 25;
      } else if (netIncome > 0 && opCashFlow > 0 && opCashFlow < netIncome * 0.5) {
        checks.push({
          id: "cf_quality_weak",
          category: "cash_flow",
          label: "Konversi Kas Rendah",
          status: "warning",
          detail: `Arus kas operasi lebih kecil dari 50% laba bersih. Kualitas laba tergolong moderat.`,
          weight: 15,
          penalty: 10,
        });
        score -= 10;
      } else if (netIncome > 0 && opCashFlow >= netIncome * 0.7) {
        checks.push({
          id: "cf_quality_solid",
          category: "cash_flow",
          label: "Kualitas Laba Sangat Sehat",
          status: "pass",
          detail: `Arus kas operasi kuat dan menopang laba bersih secara riil. Uang masuk dari bisnis berjalan lancar.`,
          weight: 20,
          penalty: 0,
        });
      }
    } else {
      checks.push({
        id: "cf_quality_nodata",
        category: "cash_flow",
        label: "Arus Kas Kuartalan",
        status: "neutral",
        detail: "Data arus kas operasional kuartal terakhir terbatas pada ringkasan laporan.",
        weight: 0,
        penalty: 0,
      });
    }

    // 2. Solvency & Debt Risk (Risiko Utang)
    const d2e = latestFinancial.debtToEquity;
    if (d2e !== null) {
      if (d2e > 3.0) {
        checks.push({
          id: "debt_high",
          category: "solvency",
          label: "Leverage Utang Sangat Tinggi",
          status: "danger",
          detail: `Debt-to-Equity ${d2e}x (>3.0x). Beban bunga berpotensi menggerus laba secara agresif.`,
          weight: 20,
          penalty: 20,
        });
        score -= 20;
      } else if (d2e > 1.8) {
        checks.push({
          id: "debt_moderate",
          category: "solvency",
          label: "Rasio Utang Diperhatikan",
          status: "warning",
          detail: `Debt-to-Equity ${d2e}x. Utang di atas rata-rata industri namun masih dalam batas pantauan.`,
          weight: 10,
          penalty: 8,
        });
        score -= 8;
      } else {
        checks.push({
          id: "debt_healthy",
          category: "solvency",
          label: "Struktur Modal Terjaga",
          status: "pass",
          detail: `Debt-to-Equity ${d2e}x tergolong aman dan rasional.`,
          weight: 15,
          penalty: 0,
        });
      }
    }
  }

  // 3. Insider / Whale Alignment (Aksi Pemilik & Direksi)
  if (insiderRadar && insiderRadar.status === "available") {
    if (insiderRadar.clusterSellDetected || insiderRadar.signal.includes("Sell") || insiderRadar.signal.includes("Distribusi")) {
      checks.push({
        id: "insider_dumping",
        category: "insider",
        label: "Insider / Pengendali Mengurangi Kepemilikan",
        status: "danger",
        detail: `Tercatat aksi jual bersih (${(Math.abs(insiderRadar.netShares) / 100).toLocaleString("id-ID")} lot) oleh manajemen/pengendali terkini.`,
        weight: 20,
        penalty: 20,
      });
      score -= 20;
    } else if (insiderRadar.clusterBuyDetected || insiderRadar.signal.includes("Buy") || insiderRadar.signal.includes("Akumulasi")) {
      checks.push({
        id: "insider_accumulating",
        category: "insider",
        label: "Insider / Direksi Menambah Kepemilikan",
        status: "pass",
        detail: `Manajemen atau pemegang saham utama menambah porsi kepemilikan (${(insiderRadar.totalBuyShares / 100).toLocaleString("id-ID")} lot) sebagai sinyal keyakinan bisnis.`,
        weight: 15,
        penalty: 0,
      });
    }
  }

  // 4. Flow Quality & Divergence (Kualitas Arus Broker & Asing)
  if (flow && flow.status === "available") {
    const phase = flow.bandarmologySummary?.phase;
    const isForeignOutflow = flow.foreignFlow.cumulative5d < -10_000_000_000;
    const isBullishTrend = technical?.trendAssessment === "Bullish";

    if (isBullishTrend && (isForeignOutflow || phase === "Distribusi Aktif" || phase === "Distribusi Halus")) {
      checks.push({
        id: "flow_divergence_warning",
        category: "flow_quality",
        label: "Divergensi Harga vs Distribusi Partisipan Besar",
        status: "danger",
        detail: "Tren harga teknikal menguat namun data broker/asing mengindikasikan aksi lepas barang (net sell). Waspada potensi 'cuci piring'.",
        weight: 20,
        penalty: 20,
      });
      score -= 20;
    } else if (phase === "Distribusi Aktif") {
      checks.push({
        id: "flow_distribution_active",
        category: "flow_quality",
        label: "Arus Transaksi Didominasi Distribusi",
        status: "warning",
        detail: "Top broker tercatat melepas muatan secara agresif.",
        weight: 10,
        penalty: 10,
      });
      score -= 10;
    } else if (phase === "Akumulasi Kuat" || phase === "Akumulasi Halus") {
      checks.push({
        id: "flow_accumulation_healthy",
        category: "flow_quality",
        label: "Akumulasi Modal Masuk Terverifikasi",
        status: "pass",
        detail: "Top broker dan institusi aktif mengumpulkan barang secara konsisten.",
        weight: 15,
        penalty: 0,
      });
    }
  }

  // 5. Valuation Stretch (Tingkat Kemahalan Harga)
  if (valuation) {
    const multiples = extractValuationMultiples(valuation);
    const pe = multiples.pe;
    const pbv = multiples.pb;

    if (pe !== null && pe !== undefined && pe > 50 && (pbv === null || pbv === undefined || pbv > 5)) {
      checks.push({
        id: "valuation_extreme",
        category: "valuation",
        label: "Valuasi Sangat Premium (P/E > 50x)",
        status: "warning",
        detail: `P/E ${pe.toFixed(1)}x dan PBV ${pbv ? pbv.toFixed(1) + "x" : "tinggi"}. Ekspektasi pasar sangat tinggi, toleransi terhadap penurunan laba sangat sempit.`,
        weight: 10,
        penalty: 10,
      });
      score -= 10;
    } else if (pe !== null && pe !== undefined && pe > 0 && pe <= 15) {
      checks.push({
        id: "valuation_reasonable",
        category: "valuation",
        label: "Valuasi Wajar / Atraktif",
        status: "pass",
        detail: `P/E ${pe.toFixed(1)}x masih dalam rentang valuasi yang terjangkau secara fundamental.`,
        weight: 10,
        penalty: 0,
      });
    }
  }

  // Clamp score between 0 and 100
  const finalScore = Math.max(0, Math.min(100, score));

  // Determine verdict & retail summary
  let verdict: IntegrityVerdict = "Fakta Solid";
  let headline = "Kondisi Fundamental & Arus Dana Solid";
  let retailSummary = "Emiten memiliki fundamental yang terjaga dengan arus kas operasional riil dan risiko manipulasi rendah.";

  const dangerCount = checks.filter((c) => c.status === "danger").length;
  const warningCount = checks.filter((c) => c.status === "warning").length;
  const passCount = checks.filter((c) => c.status === "pass").length;

  if (finalScore < 50 || dangerCount >= 2) {
    verdict = "Red Flag Alert";
    headline = "Waspada! Terdeteksi Anomali Signifikan / Risiko Tinggi";
    retailSummary = "Terdapat beberapa tanda bahaya (seperti kas operasi minus, aksi jual orang dalam, atau distribusi tersembunyi). Hati-hati jangan sampai jadi 'korban cuci piring' di pucuk.";
  } else if (finalScore < 75 || dangerCount === 1 || warningCount >= 2) {
    verdict = "Speculative Play";
    headline = "Profil Spekulatif — Perlu Konfirmasi Tambahan";
    retailSummary = "Secara umum bisnis berjalan, namun terdapat catatan risiko (valuasi premium, leverage utang, atau divergensi arus dana) yang wajib dipantau ketat.";
  } else {
    verdict = "Fakta Solid";
    headline = "Kualitas Bisnis & Arus Dana Kuat (Low Red Flag)";
    retailSummary = "Bisnis menghasilkan uang riil, rasio utang terkendali, dan didukung akumulasi institusi yang wajar. Cocok untuk riset investasi terukur.";
  }

  return {
    score: finalScore,
    verdict,
    headline,
    retailSummary,
    checks,
    riskCount: {
      danger: dangerCount,
      warning: warningCount,
      pass: passCount,
    },
  };
}
