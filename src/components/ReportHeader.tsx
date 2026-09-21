"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Database,
  Share2,
  MessageSquare,
  Coins,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Star,
} from "lucide-react";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import { extractValuationMultiples } from "@/lib/sectors/types";
import { toggleWatchlist, isWatchlisted } from "@/lib/storage/history";
import { CompanyLogo } from "./CompanyLogo";

interface ReportHeaderProps {
  report: CompanyIntelligenceReport;
  onOpenEvidence: () => void;
  onOpenQA: () => void;
  onShare: () => void;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  report,
  onOpenEvidence,
  onOpenQA,
  onShare,
}) => {
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    if (report?.symbol) {
      setInWatchlist(isWatchlisted(report.symbol));
    }
  }, [report?.symbol]);

  const handleToggleWatchlist = () => {
    if (!report?.symbol) return;
    const newState = toggleWatchlist(report.symbol);
    setInWatchlist(newState);
  };

  const multiples = extractValuationMultiples(report.valuation);
  const lastPrice = report.technical?.lastPrice || multiples.lastClosePrice;
  const dailyReturn = report.technical?.lastPrice
    ? (report.technical?.dailyReturnPct ?? 0)
    : (multiples.dailyChange ? multiples.dailyChange * 100 : 0);
  const isPositive = dailyReturn >= 0;
  const peRatio = multiples.pe;
  const pbvRatio = multiples.pb;
  const rsi = report.technical?.rsi14;
  const foreignVal = report.flowLens?.cohortSummary?.foreignNetValue;
  const foreignFlow = foreignVal
    ? `${foreignVal > 0 ? "+Rp " : "-Rp "}${Math.abs(foreignVal / 1e9).toFixed(1)}B`
    : report.flowLens?.status === "available"
    ? "Netral"
    : "-";

  return (
    <div className="space-y-2.5">
      {/* Institutional Emiten Strip */}
      <div className="bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-slate-800/80 p-3.5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/60">
          {/* Company ID & Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <CompanyLogo
              symbol={report.symbol}
              website={report.overview?.website}
              companyName={report.companyName}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate max-w-[200px] sm:max-w-md">
                  {report.companyName}
                </h2>
                <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                  IDX:{report.symbol}
                </span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shrink-0">
                  {report.overview?.listing_board || "Papan Utama"}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                <span>{report.overview?.sector || "Sektor"}</span>
                <span>•</span>
                <span>{report.overview?.sub_sector || "Subsektor"}</span>
                {report.overview?.market_cap_rank && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      Rank #{report.overview.market_cap_rank}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Pricing & Performance */}
          <div className="flex items-start justify-between sm:justify-end gap-2.5 sm:gap-4 shrink-0 w-full sm:w-auto">
            <div className="text-right shrink-0">
              <button
                type="button"
                onClick={handleToggleWatchlist}
                title={inWatchlist ? "Hapus dari Watchlist" : "Simpan ke Watchlist"}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 mb-1 text-xs rounded border transition shrink-0 ${
                  inWatchlist
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-500 dark:text-amber-400 font-semibold"
                    : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Star className={`w-3.5 h-3.5 shrink-0 ${inWatchlist ? "fill-amber-400 text-amber-400" : ""}`} />
                <span>{inWatchlist ? "Tersimpan" : "Watchlist"}</span>
              </button>
              <div className="flex items-baseline gap-2 justify-end">
                <span className="text-xl sm:text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {lastPrice ? `Rp ${lastPrice.toLocaleString("id-ID")}` : "-"}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono font-bold tabular-nums ${
                    isPositive
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositive ? "+" : ""}
                  {dailyReturn.toFixed(2)}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block">
                Terakhir: {report.dataAsOf}
              </span>
            </div>
          </div>
        </div>

        {/* High-Density Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 pt-3">
          <div className="p-2 rounded bg-white dark:bg-black border border-slate-100 dark:border-slate-800/60 min-w-0 overflow-hidden">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans truncate">
              Market Cap
            </span>
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums truncate block">
              {report.overview?.market_cap
                ? `Rp ${(report.overview.market_cap / 1e12).toFixed(1)}T`
                : "-"}
            </span>
          </div>

          <div className="p-2 rounded bg-white dark:bg-black border border-slate-100 dark:border-slate-800/60 min-w-0 overflow-hidden">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans truncate">
              P/E (TTM)
            </span>
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums truncate block">
              {peRatio ? `${peRatio.toFixed(1)}x` : "-"}
            </span>
          </div>

          <div className="p-2 rounded bg-white dark:bg-black border border-slate-100 dark:border-slate-800/60 min-w-0 overflow-hidden">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans truncate">
              PBV
            </span>
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums truncate block">
              {pbvRatio ? `${pbvRatio.toFixed(2)}x` : "-"}
            </span>
          </div>

          <div className="p-2 rounded bg-white dark:bg-black border border-slate-100 dark:border-slate-800/60 min-w-0 overflow-hidden">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans truncate">
              RSI (14D)
            </span>
            <span
              className={`text-xs font-mono font-bold tabular-nums truncate block ${
                rsi && rsi > 70
                  ? "text-rose-600 dark:text-rose-400"
                  : rsi && rsi < 30
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-800 dark:text-slate-200"
              }`}
            >
              {rsi != null ? rsi.toFixed(1) : "-"}
            </span>
          </div>

          <div className="p-2 rounded bg-white dark:bg-black border border-slate-100 dark:border-slate-800/60 min-w-0 overflow-hidden">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans truncate">
              Foreign Flow
            </span>
            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 truncate block tabular-nums">
              {foreignFlow || "Netral"}
            </span>
          </div>

          <div className="sm:col-span-3 xl:col-span-1 p-2 rounded bg-white dark:bg-black border border-slate-100 dark:border-slate-800/60 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans">
                  Biaya Analisis
                </span>
                <span className="text-[11px] font-mono font-semibold tabular-nums block whitespace-nowrap">
                  {report.fromVectorCache ? (
                    <span className="text-emerald-600 dark:text-emerald-400" title={`Matched in local Qdrant (similarity ${((report.cacheScore || 1) * 100).toFixed(0)}%)`}>
                      0 kredit · Cache lokal
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      {report.creditsConsumed} kredit API
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onOpenEvidence}
                  title="Lihat Bukti Data"
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
                >
                  <Database className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onOpenQA}
                  title="Tanya Laporan"
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  title="Bagikan Laporan"
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Thesis & Direct Answer Strip */}
      <div className="bg-black/75 rounded-md border border-white/10 p-3.5 space-y-2">
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-orange-400 uppercase tracking-wider font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span>Executive Brief</span>
          </div>
          <span className="text-slate-500 uppercase tracking-widest text-[9px]">
            Mode: {report.mode}
          </span>
        </div>

        <div className="text-xs text-slate-200 leading-relaxed space-y-1.5">
          <p className="font-semibold text-slate-100 text-xs sm:text-[13px] leading-snug">
            {report.directAnswer}
          </p>
          {report.executiveSummary && report.executiveSummary !== report.directAnswer && (
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-white/5">
              {report.executiveSummary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
