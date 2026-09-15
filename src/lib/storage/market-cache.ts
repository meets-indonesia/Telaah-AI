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
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Membaca cache 24 jam dari disk jika masih valid
 */
export function getStoredMarketCache(): MarketCacheData | null {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) {
      return null;
    }
    const content = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
    const data: MarketCacheData = JSON.parse(content);

    // Cek apakah usia cache masih di bawah 24 jam
    const age = Date.now() - data.lastFetchedAt;
    if (age < TWENTY_FOUR_HOURS_MS) {
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
 * Mengambil data pasar terkini (1x per 24 jam)
 * Jika cache masih berlaku (< 24 jam), langsung return dari disk (0 kredit).
 * Jika sudah lewat 24 jam, tarik data baru dari Sectors API v2 & Free FX lalu simpan ke disk.
 */
export async function getOrFetchDailyMarketData(forceRefresh: boolean = false): Promise<MarketCacheData> {
  // 1. Cek cache 24 jam
  if (!forceRefresh) {
    const cached = getStoredMarketCache();
    if (cached) {
      return cached;
    }
  }

  const apiKey = process.env.SECTORS_API_KEY || "";
  let ihsgPrice: number | null = null;
  let ihsgChange: number | null = null;
  let asOfDate = "";
  let usdIdrRate: number | null = null;

  // 2. Fetch live IHSG dari Sectors API v2 (/v2/index-daily/ihsg/)
  try {
    const res = await fetch("https://api.sectors.app/v2/index-daily/ihsg/", {
      headers: { Authorization: apiKey },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const latest = data[data.length - 1];
        const prev = data.length > 1 ? data[data.length - 2] : null;

        ihsgPrice = Number(latest.price.toFixed(2));
        asOfDate = latest.date;

        if (prev && prev.price > 0) {
          ihsgChange = Number((((latest.price - prev.price) / prev.price) * 100).toFixed(2));
        }
      }
    }
  } catch (err) {
    console.warn("Error fetching IHSG from sectors API:", err);
  }

  // 3. Fetch live USD/IDR dari public daily FX rate (Gratis, tanpa kredit)
  try {
    const fxRes = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 86400 },
    });
    if (fxRes.ok) {
      const fxData = await fxRes.json();
      if (fxData.rates?.IDR) {
        usdIdrRate = Math.round(fxData.rates.IDR);
      }
    }
  } catch (err) {
    console.warn("Error fetching live USD/IDR:", err);
  }

  // 4. Publish only values fetched successfully. No placeholder market numbers.
  const indices: MarketItem[] = [];
  if (ihsgPrice !== null && ihsgChange !== null) {
    indices.push({
      name: "IHSG",
      code: "COMPOSITE",
      price: ihsgPrice.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
      change: `${ihsgChange >= 0 ? "+" : ""}${ihsgChange}%`,
      isPositive: ihsgChange >= 0,
    });
  }
  if (usdIdrRate !== null) {
    indices.push({
      name: "USD/IDR",
      code: "USDIDR",
      price: `Rp ${usdIdrRate.toLocaleString("id-ID")}`,
      change: "",
      isPositive: false,
    });
  }

  const cachePayload: MarketCacheData = {
    lastFetchedAt: Date.now(),
    fetchedDate: new Date().toISOString(),
    asOfDate,
    ttlHours: 24,
    indices,
  };

  // 5. Simpan ke file cache disk untuk 24 jam ke depan
  saveMarketCache(cachePayload);

  return cachePayload;
}
