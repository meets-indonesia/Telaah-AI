import { TechnicalAnalysisResult } from "./indicators";
import { FlowLensAnalysis } from "./flow";
import { FinancialHealthAnalysis } from "./financials";
import { RedFlagAnalysisResult } from "./integrity";
import { ValuationData, extractValuationMultiples } from "../sectors/types";

export type TimeHorizonKey = "scalping" | "swing" | "trend" | "investing";

export interface HorizonPlan {
  key: TimeHorizonKey;
  label: string;
  horizonName: string;
  durationLabel: string;
  strategyName: string;
  suitabilityScore: number; // 0 - 100
  isRecommended: boolean;
  entryZone: [number, number]; // [min, max]
  stopLoss: number;
  stopLossPct: number; // negative number, e.g. -2.5%
  target1: number;
  target1Pct: number; // e.g. +5.0%
  target2: number;
  target2Pct: number; // e.g. +10.0%
  rrr: number; // Risk-to-Reward Ratio (e.g. 2.4)
  catalystFocus: string;
  actionGuidance: string;
}

export interface TradingPlanResult {
  symbol: string;
  currentPrice: number;
  bestFitHorizon: TimeHorizonKey;
  verdictSummary: string;
  supports: {
    s1: number;
    s2: number;
  };
  resistances: {
    r1: number;
    r2: number;
  };
  pivotPoint: number;
  horizons: Record<TimeHorizonKey, HorizonPlan>;
  disclaimer: string;
}

/**
 * Menghitung tick size resmi Bursa Efek Indonesia (IDX)
 */
function getIdxTickSize(price: number): number {
  if (price < 200) return 1;
  if (price < 500) return 2;
  if (price < 2000) return 5;
  if (price < 5000) return 10;
  return 25;
}

function roundToTick(price: number): number {
  const tick = getIdxTickSize(price);
  return Math.round(price / tick) * tick;
}

/**
 * Menghitung Trading Plan Multi-Horizon secara deterministik berbasis data teknikal,
 * broker flow, fundamental, dan radar integritas emiten.
 */
export function calculateTradingPlan(params: {
  symbol: string;
  technical: TechnicalAnalysisResult;
  flow?: FlowLensAnalysis;
  financials?: FinancialHealthAnalysis;
  valuation?: ValuationData;
  integrity?: RedFlagAnalysisResult;
}): TradingPlanResult {
  const { symbol, technical, flow, financials, valuation, integrity } = params;
  const currentPrice = technical.lastPrice || 1000;
  const tick = getIdxTickSize(currentPrice);

  // 1. Hitung Pivot, Support, & Resistance dari chart series
  const series = technical.chartSeries || [];
  const high30 = series.length > 0 ? Math.max(...series.map((p) => p.high)) : currentPrice * 1.1;
  const low30 = series.length > 0 ? Math.min(...series.map((p) => p.low)) : currentPrice * 0.9;
  const close = currentPrice;

  // Standard Pivot Formula
  const pivotPoint = roundToTick((high30 + low30 + close) / 3);
  const r1 = roundToTick(technical.sma20 && technical.sma20 > currentPrice ? technical.sma20 : Math.max(currentPrice + tick * 4, high30));
  const r2 = roundToTick(Math.max(r1 + tick * 8, high30 * 1.05));
  const s1 = roundToTick(technical.sma20 && technical.sma20 < currentPrice ? technical.sma20 : Math.min(currentPrice - tick * 4, low30));
  const s2 = roundToTick(Math.min(s1 - tick * 8, low30 * 0.95));

  const sma20 = technical.sma20 || currentPrice;
  const sma50 = technical.sma50 || currentPrice;
  const avgBuyBandar = flow?.bandarmologySummary?.topBuyersAvgPrice || currentPrice;
  const multiples = extractValuationMultiples(valuation);
  const intrinsicVal = multiples.intrinsicValue || currentPrice * 1.25;

  // 2. Horizon 1: Scalping / Fast Trade (1 - 3 Hari)
  const scalpEntryMin = roundToTick(currentPrice - tick * 2);
  const scalpEntryMax = roundToTick(currentPrice + tick * 1);
  const scalpSL = roundToTick(currentPrice - tick * 3);
  const scalpTP1 = roundToTick(currentPrice + tick * 4);
  const scalpTP2 = roundToTick(currentPrice + tick * 8);

  const scalpRisk = Math.abs(currentPrice - scalpSL);
  const scalpReward = Math.abs(scalpTP1 - currentPrice);
  const scalpRRR = scalpRisk > 0 ? Number((scalpReward / scalpRisk).toFixed(2)) : 1.5;

  const scalpSuitability = (technical.volume.relativeVolume && technical.volume.relativeVolume > 1.2) ? 85 : 55;

  // 3. Horizon 2: Swing Trading (1 - 4 Minggu)
  const swingEntryMin = roundToTick(Math.min(s1, currentPrice * 0.98));
  const swingEntryMax = roundToTick(Math.max(s1 + tick * 2, currentPrice));
  const swingSL = roundToTick(s1 - tick * 3);
  const swingTP1 = roundToTick(Math.max(currentPrice * 1.06, r1));
  const swingTP2 = roundToTick(Math.max(currentPrice * 1.12, r2));

  const swingRisk = Math.abs(currentPrice - swingSL);
  const swingReward = Math.abs(swingTP1 - currentPrice);
  const swingRRR = swingRisk > 0 ? Number((swingReward / swingRisk).toFixed(2)) : 2.2;

  const swingSuitability = (flow?.bandarmologySummary?.phase.includes("Akumulasi") || technical.trendAssessment === "Bullish") ? 90 : 65;

  // 4. Horizon 3: Trend Following (1 - 3 Bulan)
  const trendEntryMin = roundToTick(Math.min(sma50, currentPrice * 0.96));
  const trendEntryMax = roundToTick(currentPrice);
  const trendSL = roundToTick(Math.min(sma50 - tick * 4, s2));
  const trendTP1 = roundToTick(Math.max(currentPrice * 1.15, r2));
  const trendTP2 = roundToTick(Math.max(currentPrice * 1.25, r2 * 1.1));

  const trendRisk = Math.abs(currentPrice - trendSL);
  const trendReward = Math.abs(trendTP1 - currentPrice);
  const trendRRR = trendRisk > 0 ? Number((trendReward / trendRisk).toFixed(2)) : 2.5;

  const trendSuitability = (financials?.yoyGrowth.revenuePct && financials.yoyGrowth.revenuePct > 0 && technical.lastPrice > sma50) ? 88 : 60;

  // 5. Horizon 4: Long-Term Investing (6 - 12+ Bulan)
  const investEntryMin = roundToTick(Math.min(currentPrice * 0.92, s2));
  const investEntryMax = roundToTick(currentPrice);
  const investSL = roundToTick(s2 * 0.9); // Deep safety net
  const investTP1 = roundToTick(Math.max(intrinsicVal, currentPrice * 1.2));
  const investTP2 = roundToTick(Math.max(intrinsicVal * 1.2, currentPrice * 1.35));

  const investRisk = Math.abs(currentPrice - investSL);
  const investReward = Math.abs(investTP1 - currentPrice);
  const investRRR = investRisk > 0 ? Number((investReward / investRisk).toFixed(2)) : 3.0;

  const investSuitability = (integrity?.verdict === "Fakta Solid" && (multiples.pe === null || (multiples.pe && multiples.pe < 25))) ? 95 : 50;

  // Tentukan best-fit horizon
  const scores: Record<TimeHorizonKey, number> = {
    scalping: scalpSuitability,
    swing: swingSuitability,
    trend: trendSuitability,
    investing: investSuitability,
  };

  let bestFitHorizon: TimeHorizonKey = "swing";
  let maxScore = -1;
  for (const [k, score] of Object.entries(scores) as [TimeHorizonKey, number][]) {
    if (score > maxScore) {
      maxScore = score;
      bestFitHorizon = k;
    }
  }

  const calcPct = (target: number, base: number) => Number((((target - base) / base) * 100).toFixed(1));

  const horizons: Record<TimeHorizonKey, HorizonPlan> = {
    scalping: {
      key: "scalping",
      label: "Fast Trade / Scalping",
      horizonName: "Scalping & Day Trading",
      durationLabel: "1 – 3 Hari Bursa",
      strategyName: "Momentum & Volatility Play",
      suitabilityScore: scalpSuitability,
      isRecommended: bestFitHorizon === "scalping",
      entryZone: [scalpEntryMin, scalpEntryMax],
      stopLoss: scalpSL,
      stopLossPct: calcPct(scalpSL, currentPrice),
      target1: scalpTP1,
      target1Pct: calcPct(scalpTP1, currentPrice),
      target2: scalpTP2,
      target2Pct: calcPct(scalpTP2, currentPrice),
      rrr: scalpRRR,
      catalystFocus: "Spike Volume harian & Momentum RSI 14",
      actionGuidance: "Disiplin cut loss ketat. Ambil cuan cepat saat resistance intraday tersentuh.",
    },
    swing: {
      key: "swing",
      label: "Swing Trading",
      horizonName: "Swing Trading",
      durationLabel: "1 – 4 Minggu",
      strategyName: "Buy on Weakness / Support Bounce",
      suitabilityScore: swingSuitability,
      isRecommended: bestFitHorizon === "swing",
      entryZone: [swingEntryMin, swingEntryMax],
      stopLoss: swingSL,
      stopLossPct: calcPct(swingSL, currentPrice),
      target1: swingTP1,
      target1Pct: calcPct(swingTP1, currentPrice),
      target2: swingTP2,
      target2Pct: calcPct(swingTP2, currentPrice),
      rrr: swingRRR,
      catalystFocus: "Akumulasi Net Buyer Broker & Support SMA20",
      actionGuidance: "Tunggu konfirmasi pantulan di area support. Manfaatkan siklus flow broker untuk take profit di target resistance.",
    },
    trend: {
      key: "trend",
      label: "Trend Following",
      horizonName: "Medium-Term Trend",
      durationLabel: "1 – 3 Bulan",
      strategyName: "Stage-2 Markup Following",
      suitabilityScore: trendSuitability,
      isRecommended: bestFitHorizon === "trend",
      entryZone: [trendEntryMin, trendEntryMax],
      stopLoss: trendSL,
      stopLossPct: calcPct(trendSL, currentPrice),
      target1: trendTP1,
      target1Pct: calcPct(trendTP1, currentPrice),
      target2: trendTP2,
      target2Pct: calcPct(trendTP2, currentPrice),
      rrr: trendRRR,
      catalystFocus: "Breakout SMA50 & Arus Akumulasi Asing Konsisten",
      actionGuidance: "Biarkan keuntungan bertumbuh (*let your winners run*) menggunakan Trailing Stop di bawah garis SMA50.",
    },
    investing: {
      key: "investing",
      label: "Long-Term Investing",
      horizonName: "Value & Growth Investing",
      durationLabel: "6 – 12+ Bulan",
      strategyName: "Dollar Cost Averaging (DCA)",
      suitabilityScore: investSuitability,
      isRecommended: bestFitHorizon === "investing",
      entryZone: [investEntryMin, investEntryMax],
      stopLoss: investSL,
      stopLossPct: calcPct(investSL, currentPrice),
      target1: investTP1,
      target1Pct: calcPct(investTP1, currentPrice),
      target2: investTP2,
      target2Pct: calcPct(investTP2, currentPrice),
      rrr: investRRR,
      catalystFocus: "Nilai Wajar Intrinsik, Pertumbuhan Laba Riil & Dividen",
      actionGuidance: "Akumulasi bertahap saat valuasi murah atau terjadi koreksi pasar. Fokus pada dividen reinvestment.",
    },
  };

  let verdictSummary = `Profil ${symbol} saat ini paling optimal untuk strategi ${horizons[bestFitHorizon].label} (${horizons[bestFitHorizon].durationLabel}) dengan RRR ${horizons[bestFitHorizon].rrr}x.`;

  return {
    symbol,
    currentPrice,
    bestFitHorizon,
    verdictSummary,
    supports: { s1, s2 },
    resistances: { r1, r2 },
    pivotPoint,
    horizons,
    disclaimer: "Kalkulasi berbasis analisis teknikal dan manajemen risiko matematis. Bukan rekomendasi beli/jual mengikat. Disiplin gunakan money management mandiri.",
  };
}
