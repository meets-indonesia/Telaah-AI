"use client";

import React, { useState, useEffect } from "react";
import {
  getHistory,
  getReportFromCache,
  removeHistoryItem,
  clearHistory,
  toggleWatchlist,
  getWatchlistSymbols,
  SavedReportItem,
  formatRelativeTime,
} from "@/lib/storage/history";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import {
  History,
  Star,
  Trash2,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Bookmark,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface HistoryWatchlistBarProps {
  currentSymbol?: string;
  onRestoreReport: (report: CompanyIntelligenceReport) => void;
  onSelectSymbolPrompt?: (symbol: string) => void;
}

export const HistoryWatchlistBar: React.FC<HistoryWatchlistBarProps> = ({
  currentSymbol,
  onRestoreReport,
  onSelectSymbolPrompt,
}) => {
  const [historyItems, setHistoryItems] = useState<SavedReportItem[]>([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load from local storage
  const refreshHistory = () => {
    setHistoryItems(getHistory());
    setWatchlistSymbols(getWatchlistSymbols());
  };

  useEffect(() => {
    refreshHistory();

    const handleStorageChange = () => {
      refreshHistory();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [currentSymbol]);

  const handleRestore = (symbol: string) => {
    const cached = getReportFromCache(symbol);
    if (cached) {
      onRestoreReport(cached);
      setToastMessage(`⚡ Memuat arsip telaah lokal untuk ${symbol} (0 Kredit API)`);
      setTimeout(() => setToastMessage(null), 3500);
    } else if (onSelectSymbolPrompt) {
      onSelectSymbolPrompt(symbol);
    }
  };

  const handleToggleWatchlist = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    toggleWatchlist(symbol);
    refreshHistory();
  };

  const handleRemoveItem = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    removeHistoryItem(symbol);
    refreshHistory();
  };

  const handleClearAll = () => {
    if (confirm("Apakah Anda yakin ingin menghapus seluruh riwayat telaah?")) {
      clearHistory();
      refreshHistory();
    }
  };

  if (historyItems.length === 0 && watchlistSymbols.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-2">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs px-3.5 py-1.5 rounded-xl flex items-center justify-between animate-in fade-in duration-200">
          <span className="flex items-center gap-1.5 font-medium">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            {toastMessage}
          </span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs ml-3"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Bar */}
      <div className="bg-[#0b101b]/95 border border-slate-800/90 rounded-xl p-2.5 shadow-md flex items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 shrink-0">
          <History className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="hidden sm:inline">Riwayat:</span>
        </div>

        {/* Horizontal Scrollable Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          {historyItems.map((item) => {
            const isTarget = currentSymbol === item.symbol;
            const isFav = watchlistSymbols.includes(item.symbol);
            const isPos = (item.dailyReturnPct || 0) >= 0;

            return (
              <div
                key={item.id}
                onClick={() => handleRestore(item.symbol)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer shrink-0 transition select-none ${
                  isTarget
                    ? "bg-blue-600/25 border-blue-500/50 text-white shadow-sm"
                    : "bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
                }`}
                title={`Buka arsip ${item.symbol} (${item.formattedDate})`}
              >
                {/* Watchlist Star Toggle */}
                <button
                  type="button"
                  onClick={(e) => handleToggleWatchlist(e, item.symbol)}
                  className={`p-0.5 rounded hover:bg-slate-800 transition ${
                    isFav ? "text-amber-400" : "text-slate-600 hover:text-slate-400"
                  }`}
                  title={isFav ? "Hapus dari Watchlist" : "Simpan ke Watchlist"}
                >
                  <Star className={`w-3 h-3 ${isFav ? "fill-amber-400" : ""}`} />
                </button>

                {/* Symbol & Price */}
                <span className="font-mono font-bold">{item.symbol}</span>

                {item.lastPrice !== undefined && (
                  <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                    {item.lastPrice.toLocaleString("id-ID")}
                  </span>
                )}

                {item.dailyReturnPct !== undefined && (
                  <span
                    className={`text-[10px] font-mono hidden md:inline ${
                      isPos ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isPos ? "+" : ""}
                    {item.dailyReturnPct}%
                  </span>
                )}

                {/* Relative timestamp */}
                <span className="text-[9px] text-slate-500 font-mono">
                  {formatRelativeTime(item.timestamp)}
                </span>

                {/* Delete button on hover */}
                <button
                  type="button"
                  onClick={(e) => handleRemoveItem(e, item.symbol)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-0.5 rounded transition ml-0.5"
                  title="Hapus riwayat emiten ini"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {/* Clear button */}
        {historyItems.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[10px] text-slate-500 hover:text-rose-400 transition shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-900"
            title="Bersihkan riwayat telaah lokal"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden lg:inline">Bersihkan</span>
          </button>
        )}
      </div>
    </div>
  );
};
