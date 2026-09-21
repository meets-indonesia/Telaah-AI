"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { CompanyLogo } from "@/components/CompanyLogo";
import {
  getWatchlistSymbols,
  toggleWatchlist,
} from "@/lib/storage/history";
import { searchEmiten, IDXCompany } from "@/lib/sectors/companies";
import {
  Star,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Search,
  Plus,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface WatchlistItemData {
  symbol: string;
  name: string;
  sector: string;
  subSector: string;
  marketCap: number;
  lastPrice: number;
  dailyChangePct: number;
  pe: number | null;
  pb: number | null;
  rsi: number | null;
  trend: string;
  flow5d: number;
}

type SortKey = "symbol" | "lastPrice" | "dailyChangePct" | "marketCap" | "pe" | "pb" | "rsi" | "flow5d";

export default function WatchlistPage() {
  const router = useRouter();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [items, setItems] = useState<WatchlistItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [addTickerQuery, setAddTickerQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortAsc, setSortAsc] = useState(false);

  // Load symbols from localStorage
  const refreshSymbols = () => {
    const list = getWatchlistSymbols();
    setSymbols(list);
    return list;
  };

  const fetchMetrics = async (targetSymbols: string[]) => {
    if (targetSymbols.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/watchlist-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: targetSymbols }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items);
      }
    } catch (e) {
      console.warn("Failed to fetch watchlist metrics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const list = refreshSymbols();
    fetchMetrics(list);
  }, []);

  const handleRemove = (symbol: string) => {
    toggleWatchlist(symbol);
    const updated = refreshSymbols();
    setItems((prev) => prev.filter((i) => i.symbol !== symbol));
  };

  const handleAddSymbol = (sym: string) => {
    const clean = sym.toUpperCase().trim();
    if (!clean) return;
    if (!symbols.includes(clean)) {
      toggleWatchlist(clean);
      const updated = refreshSymbols();
      fetchMetrics(updated);
    }
    setAddTickerQuery("");
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  // Add suggestions dropdown
  const addSuggestions = useMemo(() => {
    if (!addTickerQuery.trim()) return [];
    return searchEmiten(addTickerQuery.trim(), 5);
  }, [addTickerQuery]);

  // Filtered & Sorted items
  const displayItems = useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (it) =>
          it.symbol.toLowerCase().includes(q) ||
          it.name.toLowerCase().includes(q) ||
          it.sector.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let valA: any = a[sortKey];
      let valB: any = b[sortKey];

      if (valA === null || valA === undefined) valA = sortAsc ? Infinity : -Infinity;
      if (valB === null || valB === undefined) valB = sortAsc ? Infinity : -Infinity;

      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [items, searchQuery, sortKey, sortAsc]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white dark:bg-black text-slate-900 dark:text-slate-100 transition-colors">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-5">
        {/* Page Title & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-zinc-400 fill-zinc-400" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Daftar Pantauan Emiten (Watchlist)
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pantau valuasi, pergerakan harga harian, dan akumulasi arus modal asing emiten prioritas Anda.
            </p>
          </div>

          {/* Quick Add Emiten Input */}
          <div className="relative flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={addTickerQuery}
                onChange={(e) => setAddTickerQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && addTickerQuery.trim()) {
                    handleAddSymbol(addTickerQuery.trim());
                  }
                }}
                placeholder="Tambah ticker (misal: ASII, BREN)..."
                className="w-64 px-3 py-1.5 text-xs bg-white dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded focus:border-zinc-500 focus:outline-none placeholder-slate-400 font-mono uppercase"
              />
              {addSuggestions.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded shadow-xl z-20 overflow-hidden text-xs">
                  {addSuggestions.map((s) => (
                    <button
                      key={s.symbol}
                      type="button"
                      onClick={() => handleAddSymbol(s.symbol)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {s.symbol}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                        {s.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fetchMetrics(symbols)}
              disabled={loading}
              title="Perbarui Data"
              className="p-1.5 rounded border border-slate-200 dark:border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-zinc-200" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search & Filter Strip */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Saring emiten di watchlist..."
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded focus:outline-none focus:border-zinc-500 text-xs placeholder-slate-400"
            />
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Total: <span className="text-slate-200 font-bold">{displayItems.length}</span> Emiten
          </div>
        </div>

        {/* High-Density Watchlist Matrix Table */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-black/40 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">
                    <button onClick={() => handleSort("symbol")} className="flex items-center gap-1 hover:text-slate-200">
                      Emiten <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <button onClick={() => handleSort("lastPrice")} className="flex items-center gap-1 justify-end hover:text-slate-200 ml-auto">
                      Harga <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <button onClick={() => handleSort("dailyChangePct")} className="flex items-center gap-1 justify-end hover:text-slate-200 ml-auto">
                      24H (%) <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <button onClick={() => handleSort("marketCap")} className="flex items-center gap-1 justify-end hover:text-slate-200 ml-auto">
                      Market Cap <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <button onClick={() => handleSort("pe")} className="flex items-center gap-1 justify-end hover:text-slate-200 ml-auto">
                      P/E (TTM) <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <button onClick={() => handleSort("pb")} className="flex items-center gap-1 justify-end hover:text-slate-200 ml-auto">
                      PBV <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <button onClick={() => handleSort("rsi")} className="flex items-center gap-1 justify-end hover:text-slate-200 ml-auto">
                      RSI (14D) <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    <button onClick={() => handleSort("flow5d")} className="flex items-center gap-1 justify-end hover:text-slate-200 ml-auto">
                      Flow 5D <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-3 text-center">Teknikal</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono tabular-nums">
                {displayItems.length > 0 ? (
                  displayItems.map((item) => {
                    const isPositive = item.dailyChangePct >= 0;
                    const isFlowPositive = item.flow5d > 0;
                    const flowStr = item.flow5d !== 0
                      ? `${isFlowPositive ? "+" : ""}${(item.flow5d / 1e9).toFixed(1)}B`
                      : "-";

                    return (
                      <tr
                        key={item.symbol}
                        onClick={() => router.push(`/?symbol=${item.symbol}`)}
                        className="hover:bg-white dark:hover:bg-white/5 transition cursor-pointer group"
                      >
                        {/* Company / Symbol */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CompanyLogo symbol={item.symbol} companyName={item.name} size="sm" />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block group-hover:text-zinc-950 transition-colors">
                                {item.symbol}
                              </span>
                              <span className="text-[11px] font-sans text-slate-500 truncate block max-w-[180px]">
                                {item.name}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          {item.lastPrice ? `Rp ${item.lastPrice.toLocaleString("id-ID")}` : "-"}
                        </td>

                        {/* Daily Change */}
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-0.5 font-bold ${
                              isPositive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {isPositive ? "+" : ""}
                            {item.dailyChangePct.toFixed(2)}%
                          </span>
                        </td>

                        {/* Market Cap */}
                        <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                          {item.marketCap ? `Rp ${(item.marketCap / 1e12).toFixed(1)}T` : "-"}
                        </td>

                        {/* P/E Ratio */}
                        <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                          {item.pe !== null ? `${item.pe.toFixed(1)}x` : "-"}
                        </td>

                        {/* PBV */}
                        <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300">
                          {item.pb !== null ? `${item.pb.toFixed(2)}x` : "-"}
                        </td>

                        {/* RSI 14 */}
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`${
                              item.rsi && item.rsi > 70
                                ? "text-rose-400 font-bold"
                                : item.rsi && item.rsi < 30
                                ? "text-emerald-400 font-bold"
                                : "text-slate-400"
                            }`}
                          >
                            {item.rsi !== null ? item.rsi.toFixed(1) : "-"}
                          </span>
                        </td>

                        {/* Flow 5D */}
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`${
                              item.flow5d > 0
                                ? "text-emerald-400 font-semibold"
                                : item.flow5d < 0
                                ? "text-rose-400 font-semibold"
                                : "text-slate-400"
                            }`}
                          >
                            {flowStr}
                          </span>
                        </td>

                        {/* Technical Trend */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-sans uppercase font-semibold ${
                              item.trend.toLowerCase().includes("bullish")
                                ? "bg-emerald-500/15 text-emerald-400"
                                : item.trend.toLowerCase().includes("bearish")
                                ? "bg-rose-500/15 text-rose-400"
                                : "bg-white0/15 text-slate-400"
                            }`}
                          >
                            {item.trend}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/?symbol=${item.symbol}`}
                              title="Buka Terminal Telaah"
                              className="p-1 rounded text-slate-400 hover:text-zinc-950 hover:bg-zinc-500/10 transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleRemove(item.symbol)}
                              title="Hapus dari Watchlist"
                              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-zinc-200" />
                          <span>Memuat metrik data bursa watchlist...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p>Belum ada emiten di daftar pantauan Anda.</p>
                          <p className="text-xs text-slate-500">
                            Ketik kode emiten di kotak atas atau klik tombol bintang di halaman terminal.
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
