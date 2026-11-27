import fs from "fs";
import path from "path";
import { getCoalBenchmark } from "@/lib/market/coal";
import { getCommodityPrices } from "@/lib/market/commodities";
import { getMarketIndices } from "@/lib/market/indices";
import { getUsdIdrRate } from "@/lib/market/fx";

export interface MarketItem {
  name: string;
  code: string;
  price: string;
  change: string;
  isPositive: boolean;
  unit?: string;
}

export interface MarketCacheData {
  lastFetchedAt: number;
  fetchedDate: string;
  asOfDate: string;
  ttlHours: number;
  indices: MarketItem[];
}

const CACHE_FILE_PATH = path.join(process.cwd(), "data", "market_cache.json");
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Membaca cache 1 jam dari disk jika masih valid.
 */
export function getStoredMarketCache(): MarketCacheData | null {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) {
      return null;
    }
    const content = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
    const data: MarketCacheData = JSON.parse(content);
    const age = Date.now() - (data.lastFetchedAt || 0);
    if (age < ONE_HOUR_MS && data.asOfDate && data.indices && data.indices.length > 0) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn("Gagal membaca market_cache.json:", err);
    return null;
  }
}

/**
 * Menyimpan data pasar ke disk dengan timestamp.
 */
export function saveMarketCache(data: MarketCacheData): void {
  try {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Gagal menyimpan market_cache.json:", err);
  }
}

/**
 * Mengambil data pasar terkini (di-refresh setiap 1 jam) dari Yahoo Finance:
 * IHSG/LQ45/IDX30, USD/IDR, dan empat benchmark komoditas.
 */
export async function getOrFetchDailyMarketData(
  forceRefresh: boolean = false
): Promise<MarketCacheData> {
  if (!forceRefresh) {
    const cached = getStoredMarketCache();
    if (cached) return cached;
  }

  const [indices, commodities, usdIdr, coal] = await Promise.all([
    getMarketIndices().catch(() => []),
    getCommodityPrices().catch(() => []),
    getUsdIdrRate().catch(() => null),
    getCoalBenchmark().catch(() => null),
  ]);

  const items: MarketItem[] = [...indices];

  if (usdIdr && Number.isFinite(usdIdr) && usdIdr > 0) {
    items.push({
      name: "USD/IDR",
      code: "USDIDR",
      price: `Rp ${Math.round(usdIdr).toLocaleString("id-ID")}`,
      change: "",
      isPositive: false,
    });
  }

  if (coal) {
    items.push({
      name: "Coal HBA",
      code: "COAL",
      price: `$${coal.price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      change: `${coal.changePct >= 0 ? "+" : ""}${coal.changePct.toFixed(2)}%`,
      isPositive: coal.changePct >= 0,
      unit: "USD / Ton",
    });
  }

  for (const commodity of commodities) {
    items.push({
      name: commodity.name,
      code: commodity.code,
      price: `$${commodity.latestPrice.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      change: `${commodity.changePct >= 0 ? "+" : ""}${commodity.changePct}%`,
      isPositive: commodity.changePct >= 0,
      unit: commodity.unit,
    });
  }

  const payload: MarketCacheData = {
    lastFetchedAt: Date.now(),
    fetchedDate: new Date().toISOString(),
    asOfDate: new Date().toISOString().split("T")[0],
    ttlHours: 1,
    indices: items,
  };

  saveMarketCache(payload);
  return payload;
}
