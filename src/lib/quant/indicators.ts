import { DailyTransaction } from "../sectors/types";

export interface CandlestickPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20?: number;
  sma50?: number;
  isBullish: boolean;
  changePct: number;
}

export interface TechnicalAnalysisResult {
  lastPrice: number;
  lastDate: string;
  dailyReturnPct: number;
  sma20: number | null;
  sma50: number | null;
  ema5: number | null;
  rsi14: number | null;
  macd: {
    macdLine: number | null;
    signalLine: number | null;
    histogram: number | null;
  };
  volume: {
    lastVolume: number;
    avgVolume20: number | null;
    relativeVolume: number | null; // lastVolume / avgVolume20
  };
  trendAssessment: "Bullish" | "Bearish" | "Neutral" | "Data Terbatas";
  chartSeries: CandlestickPoint[];
}

/**
 * Menghitung SMA (Simple Moving Average)
 */
function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

/**
 * Menghitung EMA (Exponential Moving Average)
 */
function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);

  let initialSMA = 0;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      initialSMA = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result.push(initialSMA);
    } else {
      const prevEMA = result[i - 1]!;
      const currentEMA = data[i] * k + prevEMA * (1 - k);
      result.push(currentEMA);
    }
  }
  return result;
}

/**
 * Menghitung RSI 14 (Wilder's Smoothing)
 */
function calculateRSI(closes: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (closes.length < period + 1) {
    return closes.map(() => null);
  }

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average for first period
  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  // Fill null for initial period
  for (let i = 0; i < period; i++) {
    result.push(null);
  }

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs));

  // Wilder's smoothing for subsequent periods
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const currentRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + currentRS));
  }

  return result;
}

/**
 * Menghitung MACD (12, 26, 9)
 */
function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
} {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine: (number | null)[] = [];
  const validMacdValues: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      const val = fastEMA[i]! - slowEMA[i]!;
      macdLine.push(val);
      validMacdValues.push(val);
    } else {
      macdLine.push(null);
    }
  }

  // Signal line is EMA of valid macd values
  const signalOnValid = calculateEMA(validMacdValues, signalPeriod);
  const signalLine: (number | null)[] = [];
  const histogram: (number | null)[] = [];

  let signalIdx = 0;
  for (let i = 0; i < closes.length; i++) {
    if (macdLine[i] === null) {
      signalLine.push(null);
      histogram.push(null);
    } else {
      const sigVal = signalOnValid[signalIdx++];
      signalLine.push(sigVal);
      if (sigVal !== null) {
        histogram.push(macdLine[i]! - sigVal);
      } else {
        histogram.push(null);
      }
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Komputasi teknikal komprehensif dari data historis daily (hingga 90 hari)
 */
export function computeTechnicalIndicators(dailyData: DailyTransaction[]): TechnicalAnalysisResult {
  if (!dailyData || dailyData.length === 0) {
    return {
      lastPrice: 0,
      lastDate: "",
      dailyReturnPct: 0,
      sma20: null,
      sma50: null,
      ema5: null,
      rsi14: null,
      macd: { macdLine: null, signalLine: null, histogram: null },
      volume: { lastVolume: 0, avgVolume20: null, relativeVolume: null },
      trendAssessment: "Data Terbatas",
      chartSeries: [],
    };
  }

  // Sort ascending by date
  const sorted = [...dailyData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const closes = sorted.map((d) => d.close);
  const volumes = sorted.map((d) => d.volume);

  const sma20Series = calculateSMA(closes, 20);
  const sma50Series = calculateSMA(closes, 50);
  const ema5Series = calculateEMA(closes, 5);
  const rsi14Series = calculateRSI(closes, 14);
  const { macdLine, signalLine, histogram } = calculateMACD(closes, 12, 26, 9);
  const volumeSMA20 = calculateSMA(volumes, 20);

  const lastIdx = sorted.length - 1;
  const prevIdx = Math.max(0, lastIdx - 1);

  const lastClose = closes[lastIdx];
  const prevClose = closes[prevIdx];
  const dailyReturnPct = prevClose > 0 ? ((lastClose - prevClose) / prevClose) * 100 : 0;

  const currentSma20 = sma20Series[lastIdx];
  const currentSma50 = sma50Series[lastIdx];
  const currentEma5 = ema5Series[lastIdx];
  const currentRsi = rsi14Series[lastIdx];
  const currentMacd = macdLine[lastIdx];
  const currentSignal = signalLine[lastIdx];
  const currentHist = histogram[lastIdx];

  const currentVolume = volumes[lastIdx];
  const currentAvgVol20 = volumeSMA20[lastIdx];
  const relativeVolume = currentAvgVol20 && currentAvgVol20 > 0 ? currentVolume / currentAvgVol20 : null;

  // Trend assessment rule based on price vs SMA20 & SMA50
  let trendAssessment: "Bullish" | "Bearish" | "Neutral" | "Data Terbatas" = "Neutral";
  if (currentSma20 !== null && currentSma50 !== null) {
    if (lastClose > currentSma20 && currentSma20 > currentSma50) {
      trendAssessment = "Bullish";
    } else if (lastClose < currentSma20 && currentSma20 < currentSma50) {
      trendAssessment = "Bearish";
    } else {
      trendAssessment = "Neutral";
    }
  } else if (currentSma20 !== null) {
    trendAssessment = lastClose >= currentSma20 ? "Bullish" : "Bearish";
  }

  // Chart series for frontend display (up to 90 trading days for full candlestick analysis)
  const chartLength = Math.min(90, sorted.length);
  const startSlice = sorted.length - chartLength;
  const chartSeries: CandlestickPoint[] = sorted.slice(startSlice).map((item, idx) => {
    const globalIdx = startSlice + idx;
    const prevItem = globalIdx > 0 ? sorted[globalIdx - 1] : null;

    // Preserve real open, high, low if present; otherwise deduce plausible values
    let open = item.open;
    let high = item.high;
    let low = item.low;
    const close = item.close;

    if (!open || open <= 0) {
      open = prevItem ? prevItem.close : close;
    }
    if (!high || high <= 0) {
      high = Math.max(open, close) * 1.005;
    }
    if (!low || low <= 0) {
      low = Math.min(open, close) * 0.995;
    }

    // Ensure valid high >= max(open, close) and low <= min(open, close)
    high = Math.max(high, open, close);
    low = Math.min(low, open, close);

    const isBullish = close >= open;
    const changePct = open > 0 ? Number((((close - open) / open) * 100).toFixed(2)) : 0;

    return {
      date: item.date,
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      volume: item.volume || 0,
      sma20: sma20Series[globalIdx] ? Math.round(sma20Series[globalIdx]!) : undefined,
      sma50: sma50Series[globalIdx] ? Math.round(sma50Series[globalIdx]!) : undefined,
      isBullish,
      changePct,
    };
  });

  return {
    lastPrice: lastClose,
    lastDate: sorted[lastIdx].date,
    dailyReturnPct: Number(dailyReturnPct.toFixed(2)),
    sma20: currentSma20 !== null ? Number(currentSma20.toFixed(2)) : null,
    sma50: currentSma50 !== null ? Number(currentSma50.toFixed(2)) : null,
    ema5: currentEma5 !== null ? Number(currentEma5.toFixed(2)) : null,
    rsi14: currentRsi !== null ? Number(currentRsi.toFixed(2)) : null,
    macd: {
      macdLine: currentMacd !== null ? Number(currentMacd.toFixed(2)) : null,
      signalLine: currentSignal !== null ? Number(currentSignal.toFixed(2)) : null,
      histogram: currentHist !== null ? Number(currentHist.toFixed(2)) : null,
    },
    volume: {
      lastVolume: currentVolume,
      avgVolume20: currentAvgVol20 !== null ? Math.round(currentAvgVol20) : null,
      relativeVolume: relativeVolume !== null ? Number(relativeVolume.toFixed(2)) : null,
    },
    trendAssessment,
    chartSeries,
  };
}
