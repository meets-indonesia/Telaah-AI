import { CompanyIntelligenceReport } from "../agent/types";

export interface SavedReportItem {
  id: string;
  symbol: string;
  companyName: string;
  lastPrice?: number;
  dailyReturnPct?: number;
  sector?: string;
  timestamp: number;
  formattedDate: string;
  mode: "quick" | "full";
  directAnswerSnippet: string;
  isWatchlist?: boolean;
}

const HISTORY_STORAGE_KEY = "telaah360_history_v2";
const REPORT_CACHE_KEY_PREFIX = "telaah360_cache_rep_";
const WATCHLIST_STORAGE_KEY = "telaah360_watchlist_v2";
const MAX_HISTORY_ITEMS = 15;

/**
 * Format relative time (e.g. "Baru saja", "15 mnt lalu", "2 jam lalu", "Kemarin")
 */
export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 2) return "Baru saja";
  if (diffMins < 60) return `${diffMins} mnt lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return new Date(timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/**
 * Mendapatkan daftar simbol di watchlist
 */
export function getWatchlistSymbols(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : ["BBCA", "ADRO", "BBRI"];
  } catch {
    return ["BBCA", "ADRO", "BBRI"];
  }
}

/**
 * Toggle status watchlist suatu emiten
 */
export function toggleWatchlist(symbol: string): boolean {
  if (typeof window === "undefined") return false;
  const clean = symbol.toUpperCase().trim();
  const current = getWatchlistSymbols();
  const exists = current.includes(clean);

  let updated: string[];
  if (exists) {
    updated = current.filter((s) => s !== clean);
  } else {
    updated = [clean, ...current];
  }

  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Gagal menyimpan watchlist ke localStorage:", e);
  }

  return !exists;
}

/**
 * Memeriksa apakah suatu emiten ada di watchlist
 */
export function isWatchlisted(symbol: string): boolean {
  const clean = symbol.toUpperCase().trim();
  return getWatchlistSymbols().includes(clean);
}

/**
 * Mengambil ringkasan riwayat penelaahan pengguna
 */
export function getHistory(): SavedReportItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed: SavedReportItem[] = JSON.parse(raw);
    const watchlist = getWatchlistSymbols();
    return parsed.map((item) => ({
      ...item,
      isWatchlist: watchlist.includes(item.symbol),
    }));
  } catch (err) {
    console.error("Gagal membaca riwayat dari localStorage:", err);
    return [];
  }
}

/**
 * Menyimpan laporan penelaahan ke riwayat & cache lokal
 */
export function saveReportToHistory(report: CompanyIntelligenceReport): void {
  if (typeof window === "undefined" || !report || !report.symbol) return;

  const clean = report.symbol.toUpperCase().trim();
  const now = Date.now();

  const summaryItem: SavedReportItem = {
    id: report.id || `rep_${clean}_${now}`,
    symbol: clean,
    companyName: report.companyName,
    lastPrice: report.technical?.lastPrice,
    dailyReturnPct: report.technical?.dailyReturnPct,
    sector: report.overview?.sub_sector || report.overview?.sector,
    timestamp: now,
    formattedDate: new Date(now).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    mode: report.mode,
    directAnswerSnippet: report.directAnswer
      ? report.directAnswer.slice(0, 100) + (report.directAnswer.length > 100 ? "..." : "")
      : "Laporan Telaah 360",
    isWatchlist: isWatchlisted(clean),
  };

  try {
    // 1. Simpan full report di cache key tersendiri
    const cacheKey = `${REPORT_CACHE_KEY_PREFIX}${clean}`;
    localStorage.setItem(cacheKey, JSON.stringify(report));

    // 2. Perbarui list riwayat
    const existing = getHistory().filter((item) => item.symbol !== clean);
    const updated = [summaryItem, ...existing].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Gagal menyimpan riwayat penelaahan ke localStorage:", err);
  }
}

/**
 * Mengambil full report yang tersimpan dari cache lokal (0 Kredit API)
 */
export function getReportFromCache(symbol: string): CompanyIntelligenceReport | null {
  if (typeof window === "undefined") return null;
  const clean = symbol.toUpperCase().trim();
  const cacheKey = `${REPORT_CACHE_KEY_PREFIX}${clean}`;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    return JSON.parse(raw) as CompanyIntelligenceReport;
  } catch (err) {
    console.error(`Gagal membaca cache report untuk ${clean}:`, err);
    return null;
  }
}

/**
 * Menghapus satu item dari riwayat
 */
export function removeHistoryItem(symbol: string): void {
  if (typeof window === "undefined") return;
  const clean = symbol.toUpperCase().trim();
  try {
    const current = getHistory().filter((item) => item.symbol !== clean);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(current));
    localStorage.removeItem(`${REPORT_CACHE_KEY_PREFIX}${clean}`);
  } catch (err) {
    console.error("Gagal menghapus item riwayat:", err);
  }
}

/**
 * Membersihkan seluruh riwayat penelaahan
 */
export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    const history = getHistory();
    for (const h of history) {
      localStorage.removeItem(`${REPORT_CACHE_KEY_PREFIX}${h.symbol}`);
    }
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (err) {
    console.error("Gagal membersihkan riwayat:", err);
  }
}
