"use client";

import React from "react";
import {
  Calendar,
  Database,
  Share2,
  MessageSquare,
  Coins,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import { CompanyIntelligenceReport } from "@/lib/agent/types";

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
  const dailyReturn = report.technical?.dailyReturnPct ?? 0;
  const isPositive = dailyReturn >= 0;
  const lastPrice = report.technical?.lastPrice;
  const peRatio = report.valuation?.historical_valuation?.pe?.current ?? report.valuation?.forward_pe;
  const pbvRatio = report.valuation?.historical_valuation?.pb?.current;
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
      <div className="bg-white dark:bg-[#0f1118] rounded-lg border border-slate-200 dark:border-slate-800/80 p-3.5 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/60">
          {/* Company ID */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-slate-900 dark:text-slate-100 font-mono font-bold text-lg tracking-tight">
              {report.symbol}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                  {report.companyName}
                </h2>
                <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  IDX:{report.symbol}
                </span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                  {report.overview?.listing_board || "Papan Utama"}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
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
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-baseline gap-2 justify-end">
                <span className="text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
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
              <span className="text-[10px] text-slate-400 font-mono">
                Terakhir update: {report.dataAsOf}
              </span>
            </div>
          </div>
        </div>

        {/* High-Density Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-3">
          <div className="p-2 rounded bg-slate-50 dark:bg-[#12151f] border border-slate-100 dark:border-slate-800/60">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans">
              Market Cap
            </span>
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              {report.overview?.market_cap
                ? `Rp ${(report.overview.market_cap / 1e12).toFixed(1)}T`
                : "-"}
            </span>
          </div>

          <div className="p-2 rounded bg-slate-50 dark:bg-[#12151f] border border-slate-100 dark:border-slate-800/60">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans">
              P/E (TTM)
            </span>
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              {peRatio ? `${peRatio.toFixed(1)}x` : "-"}
            </span>
          </div>

          <div className="p-2 rounded bg-slate-50 dark:bg-[#12151f] border border-slate-100 dark:border-slate-800/60">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans">
              PBV
            </span>
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              {pbvRatio ? `${pbvRatio.toFixed(2)}x` : "-"}
            </span>
          </div>

          <div className="p-2 rounded bg-slate-50 dark:bg-[#12151f] border border-slate-100 dark:border-slate-800/60">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans">
              RSI (14D)
            </span>
            <span
              className={`text-xs font-mono font-bold tabular-nums ${
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

          <div className="p-2 rounded bg-slate-50 dark:bg-[#12151f] border border-slate-100 dark:border-slate-800/60 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans">
              Foreign Flow
            </span>
            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 truncate block">
              {foreignFlow || "Netral"}
            </span>
          </div>

          <div className="p-2 rounded bg-slate-50 dark:bg-[#12151f] border border-slate-100 dark:border-slate-800/60 col-span-2 sm:col-span-1 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans">
                Credit & As Of
              </span>
              <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-medium">
                {report.creditsConsumed} cr
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenEvidence}
                title="Bukti Data"
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
              >
                <Database className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onOpenQA}
                title="Tanya Laporan"
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onShare}
                title="Bagikan"
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Direct Answer & Core Thesis (Clean Editorial Box) */}
      <div className="bg-slate-50 dark:bg-[#0c0e14] rounded-lg border-l-4 border-l-indigo-500 dark:border-l-indigo-400 border-y border-r border-slate-200 dark:border-slate-800/80 p-3.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-indigo-600 dark:text-indigo-400">
            Intisari Riset
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Mode: {report.mode.toUpperCase()}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug mb-1">
          {report.directAnswer}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {report.executiveSummary}
        </p>
      </div>
    </div>
  );
};
