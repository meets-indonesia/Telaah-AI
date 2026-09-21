import fs from "fs";
import path from "path";

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
const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour cache TTL per user requirement

/**
 * Membaca cache 1 jam dari disk jika masih valid
 */
export function getStoredMarketCache(): MarketCacheData | null {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) {
      return null;
    }
    const content = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
    const data: MarketCacheData = JSON.parse(content);

    // Cek apakah usia cache masih di bawah 1 jam dan memiliki asOfDate yang valid
    const age = Date.now() - (data.lastFetchedAt || 0);
    if (age < ONE_HOUR_MS && data.asOfDate && data.indices && data.indices.length > 0) {
      return data;
    }
    return null; // Expired, perlu fetch ulang
  } catch (err) {
    console.warn("Gagal membaca market_cache.json:", err);
    return null;
  }
}

/**
 * Menyimpan data pasar ke disk dengan timestamp
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
 * Mengambil data pasar terkini (di-refresh setiap 1 jam)
 * Menarik live data dari Sectors API v2 (IHSG, LQ45, IDX30, Gold, Coal, Copper) & Live FX USD/IDR.
 */
export async function getOrFetchDailyMarketData(forceRefresh: boolean = false): Promise<MarketCacheData> {
  // 1. Cek cache 1 jam jika tidak dipaksa refresh
  if (!forceRefresh) {
    const cached = getStoredMarketCache();
    if (cached) {
      return cached;
    }
  }

  const apiKey = process.env.SECTORS_API_KEY || "";
  const authHeaders = { Authorization: apiKey };

  let asOfDate = "";
  const indices: MarketItem[] = [];

  // Helper to fetch index from Sectors API v2
  const fetchIndex = async (code: string, name: string) => {
    try {
      const res = await fetch(`https://api.sectors.app/v2/index-daily/${code.toLowerCase()}/`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const latest = data[data.length - 1];
          const prev = data.length > 1 ? data[data.length - 2] : null;
          const price = Number(latest.price.toFixed(2));
          if (!asOfDate && latest.date) {
            asOfDate = latest.date;
          }
          let changeStr = "";
          let isPositive = true;
          if (prev && prev.price > 0) {
            const pct = Number((((latest.price - prev.price) / prev.price) * 100).toFixed(2));
            changeStr = `${pct >= 0 ? "+" : ""}${pct}%`;
            isPositive = pct >= 0;
          }
          return {
            name,
            code: code.toUpperCase(),
            price: price.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
            change: changeStr,
            isPositive,
          };
        }
      }
    } catch (err) {
      console.warn(`Error fetching index ${code}:`, err);
    }
    return null;
  };

  // Helper to fetch commodity price from Sectors API v2
  const fetchCommodity = async (commodity: string, displayName: string, unit: string) => {
    try {
      const res = await fetch(`https://api.sectors.app/v2/mining/commodities/${commodity.toLowerCase()}/price/`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const latest = data[data.length - 1];
          const prev = data.length > 1 ? data[data.length - 2] : null;
          const price = Number(latest.price_usd_per_ton.toFixed(2));
          let changeStr = "";
          let isPositive = true;
          if (prev && prev.price_usd_per_ton > 0) {
            const pct = Number((((latest.price_usd_per_ton - prev.price_usd_per_ton) / prev.price_usd_per_ton) * 100).toFixed(2));
            changeStr = `${pct >= 0 ? "+" : ""}${pct}%`;
            isPositive = pct >= 0;
          }
          return {
            name: displayName,
            code: commodity.toUpperCase(),
            price: `$${price.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`,
            change: changeStr,
            isPositive,
            unit,
          };
        }
      }
    } catch (err) {
      console.warn(`Error fetching commodity ${commodity}:`, err);
    }
    return null;
  };

  // Helper to fetch live USD/IDR FX
  const fetchUsdIdr = async () => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      if (res.ok) {
        const data = await res.json();
        if (data.rates?.IDR) {
          const rate = Math.round(data.rates.IDR);
          return {
            name: "USD/IDR",
            code: "USDIDR",
            price: `Rp ${rate.toLocaleString("id-ID")}`,
            change: "",
            isPositive: false,
          };
        }
      }
    } catch (err) {
      console.warn("Error fetching USD/IDR:", err);
    }
    return null;
  };

  // Execute in parallel
  const [ihsg, lq45, idx30, usdIdr, gold, coal, copper] = await Promise.all([
    fetchIndex("ihsg", "IHSG"),
    fetchIndex("lq45", "LQ45"),
    fetchIndex("idx30", "IDX30"),
    fetchUsdIdr(),
    fetchCommodity("gold", "COMEX Gold", "/oz"),
    fetchCommodity("coal", "Newcastle Coal", "/ton"),
    fetchCommodity("copper", "LME Copper", "/ton"),
  ]);

  if (ihsg) indices.push(ihsg);
  if (lq45) indices.push(lq45);
  if (idx30) indices.push(idx30);
  if (usdIdr) indices.push(usdIdr);
  if (gold) indices.push(gold);
  if (coal) indices.push(coal);
  if (copper) indices.push(copper);

  // If Sectors didn't return asOfDate, fallback to today's date
  if (!asOfDate) {
    asOfDate = new Date().toISOString().split("T")[0];
  }

  const cachePayload: MarketCacheData = {
    lastFetchedAt: Date.now(),
    fetchedDate: new Date().toISOString(),
    asOfDate,
    ttlHours: 1,
    indices,
  };

  // Simpan ke disk untuk cache 1 jam
  saveMarketCache(cachePayload);

  return cachePayload;
}
