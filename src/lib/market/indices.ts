import type { MarketItem } from "@/lib/storage/market-cache";

const CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const RANGE = "1mo";
const INTERVAL = "1d";
const CACHE_TTL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

interface IndexSpec {
  symbol: string;
  name: string;
  code: string;
}

const INDICES: IndexSpec[] = [
  { symbol: "^JKSE", name: "IHSG", code: "COMPOSITE" },
  { symbol: "^JKLQ45", name: "LQ45", code: "LQ45" },
  { symbol: "IDX30.JK", name: "IDX30", code: "IDX30" },
];

interface ChartBody {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }> | null;
  };
}

let cached: { items: MarketItem[]; expiresAt: number } | null = null;

async function fetchIndex(
  spec: IndexSpec,
  fetchImpl: typeof fetch
): Promise<MarketItem | null> {
  const url = `${CHART_BASE}/${encodeURIComponent(spec.symbol)}?range=${RANGE}&interval=${INTERVAL}`;

  try {
    const res = await fetchImpl(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as ChartBody;
    const result = body?.chart?.result?.[0];
    const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value)
    );
    if (closes.length === 0) return null;

    const latest = closes[closes.length - 1];
    const previous = closes.length > 1 ? closes[closes.length - 2] : null;
    const changePct =
      previous !== null && previous > 0
        ? ((latest - previous) / previous) * 100
        : null;

    return {
      name: spec.name,
      code: spec.code,
      price: latest.toLocaleString("id-ID", { maximumFractionDigits: 2 }),
      change:
        changePct === null
          ? ""
          : `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`,
      isPositive: changePct === null ? true : changePct >= 0,
    };
  } catch {
    return null;
  }
}

/**
 * IHSG, LQ45 and IDX30 closes from Yahoo. An index that cannot be fetched is
 * omitted rather than zero-filled.
 */
export async function getMarketIndices(
  fetchImpl: typeof fetch = fetch
): Promise<MarketItem[]> {
  if (cached && cached.expiresAt > Date.now()) return cached.items;

  const settled = await Promise.all(
    INDICES.map((spec) => fetchIndex(spec, fetchImpl))
  );
  const items = settled.filter((item): item is MarketItem => item !== null);

  if (items.length > 0) {
    cached = { items, expiresAt: Date.now() + CACHE_TTL_MS };
  }
  return items;
}
