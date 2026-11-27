const CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const RANGE = "1mo";
const INTERVAL = "1d";
const HISTORY_POINTS = 24;
const CACHE_TTL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

export interface CommodityHistoryPoint {
  date: string;
  price: number;
}

export interface CommodityQuote {
  name: string;
  code: string;
  unit: string;
  latestPrice: number;
  changePct: number;
  history: CommodityHistoryPoint[];
}

interface CommoditySpec {
  symbol: string;
  name: string;
  code: string;
  unit: string;
  factor: number;
}

/**
 * MTF=F is the API2 coal benchmark (not Newcastle); TIO=F is iron ore 62% Fe.
 * HG=F quotes USD/lb, so it is converted to USD/ton for the existing card.
 * Nickel has no reliable free daily contract, so it is intentionally absent.
 */
const COMMODITIES: CommoditySpec[] = [
  { symbol: "MTF=F", name: "Coal API2", code: "COAL", unit: "USD / Ton", factor: 1 },
  { symbol: "GC=F", name: "COMEX Gold", code: "GOLD", unit: "USD / Oz", factor: 1 },
  { symbol: "HG=F", name: "COMEX Copper", code: "COPPER", unit: "USD / Ton", factor: 2204.62 },
  { symbol: "TIO=F", name: "Iron Ore 62% Fe", code: "IRON_ORE", unit: "USD / Ton", factor: 1 },
];

interface ChartBody {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }> | null;
  };
}

let cached: { quotes: CommodityQuote[]; expiresAt: number } | null = null;

async function fetchCommodity(
  spec: CommoditySpec,
  fetchImpl: typeof fetch
): Promise<CommodityQuote | null> {
  const url = `${CHART_BASE}/${encodeURIComponent(spec.symbol)}?range=${RANGE}&interval=${INTERVAL}`;

  try {
    const res = await fetchImpl(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as ChartBody;
    const result = body?.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];

    const points: CommodityHistoryPoint[] = [];
    for (let i = 0; i < timestamps.length; i += 1) {
      const timestamp = timestamps[i];
      const close = closes[i];
      if (!Number.isFinite(timestamp) || typeof close !== "number" || !Number.isFinite(close)) {
        continue;
      }
      points.push({
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        price: close * spec.factor,
      });
    }

    const history = points.slice(-HISTORY_POINTS);
    if (history.length === 0) return null;

    const latest = history[history.length - 1];
    const previous = history.length > 1 ? history[history.length - 2] : null;
    const changePct =
      previous !== null && previous.price > 0
        ? Number((((latest.price - previous.price) / previous.price) * 100).toFixed(2))
        : 0;

    return {
      name: spec.name,
      code: spec.code,
      unit: spec.unit,
      latestPrice: latest.price,
      changePct,
      history,
    };
  } catch {
    return null;
  }
}

/**
 * Global benchmark quotes from Yahoo futures. A contract that cannot be
 * fetched is omitted; there is no nickel quote to fall back on.
 */
export async function getCommodityPrices(
  fetchImpl: typeof fetch = fetch
): Promise<CommodityQuote[]> {
  if (cached && cached.expiresAt > Date.now()) return cached.quotes;

  const settled = await Promise.all(
    COMMODITIES.map((spec) => fetchCommodity(spec, fetchImpl))
  );
  const quotes = settled.filter(
    (quote): quote is CommodityQuote => quote !== null
  );

  if (quotes.length > 0) {
    cached = { quotes, expiresAt: Date.now() + CACHE_TTL_MS };
  }
  return quotes;
}
