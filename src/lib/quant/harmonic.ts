/**
 * Deterministic harmonic-pattern detection for IDX swing trading.
 *
 * The engine finds confirmed ZigZag pivots, validates classic XABCD
 * Fibonacci ratios, and returns a Potential Reversal Zone (PRZ) with an
 * invalidation level. It never fetches data and never uses an LLM.
 */

export type HarmonicTimeframe = "4H" | "1D" | "1W" | "1M";
export type HarmonicPattern =
  | "Gartley"
  | "Bat"
  | "Butterfly"
  | "Crab"
  | "Shark"
  | "Cypher";
export type HarmonicDirection = "bullish" | "bearish";
export type HarmonicStatus = "completed" | "forming";

export interface HarmonicCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HarmonicPivot {
  index: number;
  date: string;
  price: number;
  type: "high" | "low";
}

export interface HarmonicRatios {
  abXa: number;
  bcAb: number;
  cdBc: number;
  adXa: number;
}

export interface HarmonicEvaluation {
  pattern: HarmonicPattern;
  ratios: HarmonicRatios;
  prz: { low: number; high: number };
  fitScore: number;
}

export interface HarmonicMatch {
  symbol: string;
  timeframe: HarmonicTimeframe;
  pattern: HarmonicPattern;
  direction: HarmonicDirection;
  status: HarmonicStatus;
  pivotDates: { x: string; a: string; b: string; c: string; d: string };
  pivotPrices?: { x: number; a: number; b: number; c: number; d: number };
  ratios: HarmonicRatios;
  prz: { low: number; high: number };
  price: number;
  distancePct: number;
  invalidation: number;
  targets: { t1: number; t2: number };
  riskReward: number | null;
  rsi: number | null;
  fitScore: number;
  score: number;
  generatedAt: string;
}

export interface DetectOptions {
  symbol: string;
  timeframe: HarmonicTimeframe;
  rsi?: number | null;
  now?: string;
  includeForming?: boolean;
}

export const TIMEFRAME_CONFIG: Record<
  HarmonicTimeframe,
  { zigzagPct: number; maxDistancePct: number; weight: number; minCandles: number }
> = {
  "4H": { zigzagPct: 4, maxDistancePct: 10, weight: 5, minCandles: 40 },
  "1D": { zigzagPct: 7, maxDistancePct: 15, weight: 12, minCandles: 60 },
  "1W": { zigzagPct: 10, maxDistancePct: 20, weight: 17, minCandles: 40 },
  "1M": { zigzagPct: 15, maxDistancePct: 25, weight: 20, minCandles: 24 },
};

interface PatternRule {
  name: HarmonicPattern;
  ab: [number, number];
  bc: [number, number];
  cd: [number, number];
  ad: [number, number];
  adMid: number;
  cdMid: number;
}

const PATTERNS: PatternRule[] = [
  {
    name: "Gartley",
    ab: [0.568, 0.668],
    bc: [0.382, 0.886],
    cd: [1.13, 1.618],
    ad: [0.726, 0.846],
    adMid: 0.786,
    cdMid: 1.374,
  },
  {
    name: "Bat",
    ab: [0.382, 0.5],
    bc: [0.382, 0.886],
    cd: [1.618, 2.618],
    ad: [0.826, 0.946],
    adMid: 0.886,
    cdMid: 2.118,
  },
  {
    name: "Butterfly",
    ab: [0.726, 0.846],
    bc: [0.382, 0.886],
    cd: [1.618, 2.24],
    ad: [1.27, 1.618],
    adMid: 1.44,
    cdMid: 1.929,
  },
  {
    name: "Crab",
    ab: [0.382, 0.618],
    bc: [0.382, 0.886],
    cd: [2.24, 3.618],
    ad: [1.538, 1.698],
    adMid: 1.618,
    cdMid: 2.929,
  },
  {
    name: "Shark",
    ab: [0.382, 0.618],
    bc: [1.13, 1.618],
    cd: [1.618, 2.24],
    ad: [0.886, 1.13],
    adMid: 1.008,
    cdMid: 1.929,
  },
  {
    name: "Cypher",
    ab: [0.382, 0.618],
    bc: [1.13, 1.414],
    cd: [1.27, 2.0],
    ad: [0.75, 0.82],
    adMid: 0.786,
    cdMid: 1.635,
  },
];

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rangeFit(value: number, range: [number, number]): number {
  const [min, max] = range;
  if (!Number.isFinite(value) || value < min - 1e-9 || value > max + 1e-9) return 0;
  const mid = (min + max) / 2;
  const half = (max - min) / 2 || 1;
  return 1 - (Math.abs(value - mid) / half) * 0.2;
}

function alternates(pivots: HarmonicPivot[]): boolean {
  return pivots.every(
    (pivot, index) => index === 0 || pivot.type !== pivots[index - 1].type
  );
}

/**
 * Weekly/monthly bars can contain both the high and the low of a swing. The
 * raw ZigZag can then emit two pivots on the same bar; keep one so the XABCD
 * sequence stays a real alternating swing structure.
 */
function normalizePivots(pivots: HarmonicPivot[]): HarmonicPivot[] {
  const cleaned: HarmonicPivot[] = [];

  for (const pivot of pivots) {
    const last = cleaned[cleaned.length - 1];
    if (!last) {
      cleaned.push(pivot);
      continue;
    }

    if (pivot.index === last.index) {
      const before = cleaned[cleaned.length - 2];
      if (before && before.type === pivot.type) continue;
      cleaned[cleaned.length - 1] = pivot;
      continue;
    }

    if (pivot.type === last.type) {
      const keepNew =
        pivot.type === "high" ? pivot.price > last.price : pivot.price < last.price;
      if (keepNew) cleaned[cleaned.length - 1] = pivot;
      continue;
    }

    cleaned.push(pivot);
  }

  return cleaned;
}

/**
 * Percentage ZigZag. A pivot is only confirmed after price reverses by at
 * least `thresholdPct` from the running extreme, which keeps noise out of
 * the Fibonacci ratios.
 */
export function findPivots(
  candles: HarmonicCandle[],
  thresholdPct: number
): HarmonicPivot[] {
  if (candles.length < 3) return [];
  const threshold = Math.max(0.5, thresholdPct) / 100;

  let direction: "up" | "down" | null = null;
  let extremePrice = candles[0].close;
  let extremeIndex = 0;
  let oppositePrice = candles[0].close;
  let oppositeIndex = 0;

  for (let i = 1; i < candles.length; i += 1) {
    const candle = candles[i];
    if (candle.high >= extremePrice * (1 + threshold)) {
      direction = "up";
      extremePrice = candle.high;
      extremeIndex = i;
      oppositePrice = candle.low;
      oppositeIndex = i;
      break;
    }
    if (candle.low <= extremePrice * (1 - threshold)) {
      direction = "down";
      extremePrice = candle.low;
      extremeIndex = i;
      oppositePrice = candle.high;
      oppositeIndex = i;
      break;
    }
  }

  if (!direction) return [];
  const pivots: HarmonicPivot[] = [];

  for (let i = extremeIndex + 1; i < candles.length; i += 1) {
    const candle = candles[i];

    if (direction === "up") {
      if (candle.high > extremePrice) {
        extremePrice = candle.high;
        extremeIndex = i;
        oppositePrice = candle.low;
        oppositeIndex = i;
      } else if (candle.low < oppositePrice) {
        oppositePrice = candle.low;
        oppositeIndex = i;
      }

      if (candle.low <= extremePrice * (1 - threshold)) {
        pivots.push({
          index: extremeIndex,
          date: candles[extremeIndex].date,
          price: extremePrice,
          type: "high",
        });
        direction = "down";
        extremePrice = oppositePrice;
        extremeIndex = oppositeIndex;
        oppositePrice = candle.high;
        oppositeIndex = i;
      }
    } else {
      if (candle.low < extremePrice) {
        extremePrice = candle.low;
        extremeIndex = i;
        oppositePrice = candle.high;
        oppositeIndex = i;
      } else if (candle.high > oppositePrice) {
        oppositePrice = candle.high;
        oppositeIndex = i;
      }

      if (candle.high >= extremePrice * (1 + threshold)) {
        pivots.push({
          index: extremeIndex,
          date: candles[extremeIndex].date,
          price: extremePrice,
          type: "low",
        });
        direction = "up";
        extremePrice = oppositePrice;
        extremeIndex = oppositeIndex;
        oppositePrice = candle.low;
        oppositeIndex = i;
      }
    }
  }

  return normalizePivots(pivots);
}

/**
 * Validates one XABCD window against the classic pattern ratios.
 *
 * `status: "forming"` checks only AB/XA and BC/AB; AD and CD are projected,
 * because D has not printed yet.
 */
export function evaluateHarmonicPoints(
  points: { x: number; a: number; b: number; c: number; d: number },
  direction: HarmonicDirection,
  status: HarmonicStatus = "completed"
): HarmonicEvaluation | null {
  const sign = direction === "bullish" ? 1 : -1;
  const x = points.x * sign;
  const a = points.a * sign;
  const b = points.b * sign;
  const c = points.c * sign;
  const d = points.d * sign;

  const xa = a - x;
  const ab = a - b;
  const bc = c - b;
  const cd = c - d;
  const ad = a - d;

  if (xa <= 0 || ab <= 0 || bc <= 0 || cd <= 0 || ad <= 0) return null;
  if (!(x < a && b < a && c > b && d < c)) return null;

  const ratios: HarmonicRatios = {
    abXa: ab / xa,
    bcAb: bc / ab,
    cdBc: cd / bc,
    adXa: ad / xa,
  };

  let best: { rule: PatternRule; fitScore: number; prz: { low: number; high: number } } | null =
    null;

  for (const rule of PATTERNS) {
    if (rangeFit(ratios.abXa, rule.ab) === 0) continue;
    if (rangeFit(ratios.bcAb, rule.bc) === 0) continue;
    if (status === "completed") {
      if (rangeFit(ratios.cdBc, rule.cd) === 0) continue;
      if (rangeFit(ratios.adXa, rule.ad) === 0) continue;
    }

    const xaZone = [
      a - xa * rule.ad[1],
      a - xa * rule.ad[0],
    ].sort((left, right) => left - right) as [number, number];
    const bcZone = [
      c - bc * rule.cd[1],
      c - bc * rule.cd[0],
    ].sort((left, right) => left - right) as [number, number];

    let low = Math.max(xaZone[0], bcZone[0]);
    let high = Math.min(xaZone[1], bcZone[1]);
    const gapTolerance = Math.abs(a) * 0.002;

    if (low > high + gapTolerance) continue;
    if (low > high) {
      const middle = (low + high) / 2;
      low = middle;
      high = middle;
    }

    const pad = ((low + high) / 2) * 0.005;
    low -= pad;
    high += pad;

    if (status === "completed") {
      const dTolerance = Math.abs(d) * 0.005;
      if (d < low - dTolerance || d > high + dTolerance) continue;
    }

    const fitParts =
      status === "completed"
        ? [
            rangeFit(ratios.abXa, rule.ab),
            rangeFit(ratios.bcAb, rule.bc),
            rangeFit(ratios.cdBc, rule.cd),
            rangeFit(ratios.adXa, rule.ad),
          ]
        : [rangeFit(ratios.abXa, rule.ab), rangeFit(ratios.bcAb, rule.bc), 1, 1];

    const fitScore = round(
      (fitParts.reduce((sum, part) => sum + part, 0) / fitParts.length) * 40,
      1
    );

    if (!best || fitScore > best.fitScore) {
      best = { rule, fitScore, prz: { low, high } };
    }
  }

  if (!best) return null;

  const prz =
    direction === "bullish"
      ? best.prz
      : { low: -best.prz.high, high: -best.prz.low };

  return {
    pattern: best.rule.name,
    ratios: {
      abXa: round(ratios.abXa, 3),
      bcAb: round(ratios.bcAb, 3),
      cdBc: round(ratios.cdBc, 3),
      adXa: round(ratios.adXa, 3),
    },
    prz: { low: round(prz.low), high: round(prz.high) },
    fitScore: best.fitScore,
  };
}

export function distanceToZone(
  price: number,
  prz: { low: number; high: number },
  direction: HarmonicDirection
): number {
  if (direction === "bullish") {
    if (price > prz.high) return ((price - prz.high) / prz.high) * 100;
    if (price < prz.low) return ((price - prz.low) / prz.low) * 100;
    return 0;
  }
  if (price < prz.low) return ((prz.low - price) / prz.low) * 100;
  if (price > prz.high) return ((prz.high - price) / prz.high) * 100;
  return 0;
}

function buildMatch(params: {
  symbol: string;
  timeframe: HarmonicTimeframe;
  direction: HarmonicDirection;
  status: HarmonicStatus;
  window: HarmonicPivot[];
  evaluation: HarmonicEvaluation;
  currentPrice: number;
  rsi: number | null;
  now: string;
}): HarmonicMatch {
  const {
    symbol,
    timeframe,
    direction,
    status,
    window,
    evaluation,
    currentPrice,
    rsi,
    now,
  } = params;
  const c = window[3];
  const a = window[1];
  const dPrice =
    status === "completed"
      ? window[4].price
      : (evaluation.prz.low + evaluation.prz.high) / 2;
  const invalidationBase =
    direction === "bullish"
      ? Math.min(dPrice, evaluation.prz.low)
      : Math.max(dPrice, evaluation.prz.high);
  const invalidation =
    direction === "bullish"
      ? invalidationBase * 0.995
      : invalidationBase * 1.005;
  const distancePct = distanceToZone(currentPrice, evaluation.prz, direction);

  const risk =
    direction === "bullish" ? currentPrice - invalidation : invalidation - currentPrice;
  const reward =
    direction === "bullish" ? c.price - currentPrice : currentPrice - c.price;
  const riskReward = risk > 0 && reward > 0 ? round(reward / risk, 2) : null;

  const proximity = Math.max(0, 30 - Math.abs(distancePct) * 3);
  const statusScore = status === "completed" ? 10 : 5;
  const rsiScore =
    rsi === null
      ? 0
      : direction === "bullish"
        ? rsi <= 35
          ? 5
          : rsi <= 45
            ? 3
            : 0
        : rsi >= 65
          ? 5
          : rsi >= 55
            ? 3
            : 0;
  const score = clamp(
    Math.round(
      evaluation.fitScore +
        proximity +
        TIMEFRAME_CONFIG[timeframe].weight +
        statusScore +
        rsiScore
    ),
    0,
    100
  );

  return {
    symbol,
    timeframe,
    pattern: evaluation.pattern,
    direction,
    status,
    pivotDates: {
      x: window[0].date,
      a: window[1].date,
      b: window[2].date,
      c: window[3].date,
      d:
        status === "completed"
          ? window[4].date
          : window[3].date,
    },
    pivotPrices: {
      x: round(window[0].price),
      a: round(window[1].price),
      b: round(window[2].price),
      c: round(window[3].price),
      d: round(status === "completed" ? window[4].price : dPrice),
    },
    ratios: evaluation.ratios,
    prz: evaluation.prz,
    price: round(currentPrice),
    distancePct: round(distancePct, 2),
    invalidation: round(invalidation),
    targets: { t1: round(c.price), t2: round(a.price) },
    riskReward,
    rsi: rsi === null ? null : round(rsi, 1),
    fitScore: evaluation.fitScore,
    score,
    generatedAt: now,
  };
}

export function detectHarmonicPatterns(
  candles: HarmonicCandle[],
  options: DetectOptions
): HarmonicMatch[] {
  const config = TIMEFRAME_CONFIG[options.timeframe];
  if (!candles || candles.length < 5) return [];

  const now = options.now ?? new Date().toISOString();
  const rsi = options.rsi ?? null;
  const currentPrice = candles[candles.length - 1].close;
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return [];

  const matches: HarmonicMatch[] = [];
  const seen = new Set<string>();

  const pushMatch = (match: HarmonicMatch) => {
    const key = [
      match.timeframe,
      match.direction,
      match.pattern,
      match.status,
      match.pivotDates.x,
      match.pivotDates.d,
    ].join("|");
    if (seen.has(key)) return;
    seen.add(key);
    matches.push(match);
  };

  // One ZigZag scale can miss a clean swing that a slightly larger or smaller
  // scale captures. Scanning a few scales keeps the ratios honest while
  // giving the daily brief enough candidates on quiet days.
  const scales = [...new Set(
    [0.75, 1, 1.3, 1.6].map(
      (factor) => Math.round(config.zigzagPct * factor * 10) / 10
    )
  )];

  for (const scale of scales) {
    const pivots = findPivots(candles, scale);
    if (pivots.length < 4) continue;

    for (let end = 4; end < pivots.length; end += 1) {
      const window = pivots.slice(end - 4, end + 1);
      if (!alternates(window)) continue;

      const direction: HarmonicDirection =
        window[0].type === "low" ? "bullish" : "bearish";
      const evaluation = evaluateHarmonicPoints(
        {
          x: window[0].price,
          a: window[1].price,
          b: window[2].price,
          c: window[3].price,
          d: window[4].price,
        },
        direction,
        "completed"
      );
      if (!evaluation) continue;

      const dPrice = window[4].price;
      const invalidation =
        direction === "bullish" ? dPrice * 0.995 : dPrice * 1.005;
      if (
        direction === "bullish"
          ? currentPrice <= invalidation
          : currentPrice >= invalidation
      ) {
        continue;
      }

      const distancePct = distanceToZone(currentPrice, evaluation.prz, direction);
      if (Math.abs(distancePct) > config.maxDistancePct) continue;

      pushMatch(
        buildMatch({
          symbol: options.symbol,
          timeframe: options.timeframe,
          direction,
          status: "completed",
          window,
          evaluation,
          currentPrice,
          rsi,
          now,
        })
      );
    }

    if (options.includeForming !== false) {
      const window = pivots.slice(-4);
      if (alternates(window)) {
        const direction: HarmonicDirection =
          window[0].type === "low" ? "bullish" : "bearish";
        const sign = direction === "bullish" ? 1 : -1;
        const x = window[0].price * sign;
        const a = window[1].price * sign;
        const projectedD = a - (a - x) * 0.886;
        const evaluation = evaluateHarmonicPoints(
          {
            x: window[0].price,
            a: window[1].price,
            b: window[2].price,
            c: window[3].price,
            d: projectedD * sign,
          },
          direction,
          "forming"
        );

        if (evaluation) {
          const invalidation =
            direction === "bullish"
              ? evaluation.prz.low * 0.995
              : evaluation.prz.high * 1.005;
          const broken =
            direction === "bullish"
              ? currentPrice <= invalidation
              : currentPrice >= invalidation;
          const distancePct = distanceToZone(
            currentPrice,
            evaluation.prz,
            direction
          );

          if (!broken && Math.abs(distancePct) <= config.maxDistancePct) {
            pushMatch(
              buildMatch({
                symbol: options.symbol,
                timeframe: options.timeframe,
                direction,
                status: "forming",
                window: [
                  ...window,
                  {
                    index: window[3].index,
                    date: candles[candles.length - 1].date,
                    price: evaluation.prz.low,
                    type: direction === "bullish" ? "low" : "high",
                  },
                ],
                evaluation,
                currentPrice,
                rsi,
                now,
              })
            );
          }
        }
      }
    }
  }

  const bestByD = new Map<string, HarmonicMatch>();
  for (const match of matches) {
    const key = [
      match.timeframe,
      match.direction,
      match.pattern,
      match.status,
      match.pivotDates.d,
    ].join("|");
    const existing = bestByD.get(key);
    if (
      !existing ||
      match.fitScore > existing.fitScore ||
      (match.fitScore === existing.fitScore && match.score > existing.score)
    ) {
      bestByD.set(key, match);
    }
  }

  return [...bestByD.values()].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return Math.abs(left.distancePct) - Math.abs(right.distancePct);
  });
}
