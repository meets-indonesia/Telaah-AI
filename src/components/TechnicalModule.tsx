"use client";

import React from "react";
import { TechnicalAnalysisResult } from "@/lib/quant/indicators";
import { CandlestickChart } from "./CandlestickChart";
import { Activity } from "lucide-react";

interface TechnicalModuleProps {
  technical: TechnicalAnalysisResult;
  symbol?: string;
  companyName?: string;
}

export const TechnicalModule: React.FC<TechnicalModuleProps> = ({
  technical,
  symbol = "IDX",
  companyName = "Emiten",
}) => {
  if (technical.trendAssessment === "Data Terbatas") {
    return (
      <div className="bg-white dark:bg-[#0f1118] rounded-lg border border-slate-200 dark:border-slate-800/80 p-4">
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-1">
          Terminal Teknikal
        </h3>
        <p className="text-xs text-slate-500">
          Data harga harian historis tidak tersedia atau tidak dimuat.
        </p>
      </div>
    );
  }

  // RSI status
  const rsi = technical.rsi14;
  let rsiStatus = "Netral";
  let rsiColor = "text-slate-800 dark:text-slate-200";
  if (rsi !== null) {
    if (rsi >= 70) {
      rsiStatus = "Overbought (Jenuh Beli)";
      rsiColor = "text-rose-600 dark:text-rose-400";
    } else if (rsi <= 30) {
      rsiStatus = "Oversold (Jenuh Jual)";
      rsiColor = "text-emerald-600 dark:text-emerald-400";
    }
  }

  return (
    <div className="bg-white dark:bg-[#0f1118] rounded-lg border border-slate-200 dark:border-slate-800/80 p-4 space-y-3 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Terminal Teknikal & Volume
          </h3>
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
              technical.trendAssessment === "Bullish"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : technical.trendAssessment === "Bearish"
                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            }`}
          >
            {technical.trendAssessment.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-[11px] text-slate-400 font-mono">
            Rel. Vol: <strong className="text-slate-800 dark:text-slate-200">{technical.volume.relativeVolume ? `${technical.volume.relativeVolume}x` : "-"}</strong>
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            As Of: <strong className="text-slate-800 dark:text-slate-200">{technical.lastDate}</strong>
          </span>
        </div>
      </div>

      {/* Indicators Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-slate-50 dark:bg-[#12151f] p-2.5 rounded border border-slate-100 dark:border-slate-800/60">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">RSI (14 Wilder)</span>
          <span className={`text-base font-mono font-bold block tabular-nums ${rsiColor}`}>
            {rsi != null ? rsi.toFixed(1) : "-"}
          </span>
          <span className="text-[10px] text-slate-400 block truncate">{rsiStatus}</span>
        </div>

        <div className="bg-slate-50 dark:bg-[#12151f] p-2.5 rounded border border-slate-100 dark:border-slate-800/60">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">Moving Averages</span>
          <div className="font-mono text-[11px] space-y-0.5">
            <div className="text-slate-600 dark:text-slate-400">
              SMA20: <strong className="text-amber-600 dark:text-amber-400 tabular-nums">Rp {technical.sma20?.toLocaleString("id-ID") ?? "-"}</strong>
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              SMA50: <strong className="text-indigo-600 dark:text-indigo-400 tabular-nums">Rp {technical.sma50?.toLocaleString("id-ID") ?? "-"}</strong>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-[#12151f] p-2.5 rounded border border-slate-100 dark:border-slate-800/60">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">MACD (12, 26, 9)</span>
          <div className="font-mono text-[11px] space-y-0.5">
            <div className="text-slate-600 dark:text-slate-400">
              Line: <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{technical.macd.macdLine ?? "-"}</strong>
            </div>
            <div className="text-slate-600 dark:text-slate-400">
              Hist: <strong className={`tabular-nums ${(technical.macd.histogram || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{technical.macd.histogram ?? "-"}</strong>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-[#12151f] p-2.5 rounded border border-slate-100 dark:border-slate-800/60">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">Volume Transaksi</span>
          <span className="text-base font-mono font-bold text-slate-900 dark:text-slate-100 block tabular-nums">
            {(technical.volume.lastVolume / 1e6).toFixed(1)}M Lot
          </span>
          <span className="text-[10px] text-slate-400 block font-mono tabular-nums truncate">
            Avg 20H: {((technical.volume.avgVolume20 || 0) / 1e6).toFixed(1)}M
          </span>
        </div>
      </div>

      {/* Interactive Candlestick Chart Terminal */}
      {technical.chartSeries.length > 0 && (
        <div className="pt-1">
          <CandlestickChart
            series={technical.chartSeries}
            symbol={symbol}
            companyName={companyName}
          />
        </div>
      )}
    </div>
  );
};
