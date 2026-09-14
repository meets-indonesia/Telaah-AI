"use client";

import React, { useState } from "react";
import { TechnicalAnalysisResult } from "@/lib/quant/indicators";
import { CandlestickChart } from "./CandlestickChart";
import {
  Activity,
  Gauge,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Maximize2,
  Minimize2,
} from "lucide-react";

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
  const [isExpanded, setIsExpanded] = useState(false);

  if (technical.trendAssessment === "Data Terbatas") {
    return (
      <div className="bg-[#0f172a]/95 rounded-2xl border border-slate-800 p-6">
        <h3 className="text-base font-bold text-white mb-2">Price, Volume & Technical Context</h3>
        <p className="text-xs text-slate-500">
          Data harga harian historis tidak tersedia atau tidak dimuat.
        </p>
      </div>
    );
  }

  // RSI status
  const rsi = technical.rsi14;
  let rsiStatus = "Netral";
  let rsiColor = "text-slate-300";
  if (rsi !== null) {
    if (rsi >= 70) {
      rsiStatus = "Overbought (Jenuh Beli)";
      rsiColor = "text-rose-400";
    } else if (rsi <= 30) {
      rsiStatus = "Oversold (Jenuh Jual)";
      rsiColor = "text-emerald-400";
    }
  }

  return (
    <div className="bg-[#0f172a]/95 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Price, Volume & Technical Context</h3>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                technical.trendAssessment === "Bullish"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : technical.trendAssessment === "Bearish"
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              Trend: {technical.trendAssessment}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Data Terakhir: <span className="font-mono text-slate-300">{technical.lastDate}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-500 block">Relative Volume (vs 20H)</span>
            <span className="font-mono font-bold text-white">
              {technical.volume.relativeVolume ? `${technical.volume.relativeVolume}x` : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Indicators Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">RSI (14 Wilder)</span>
          <span className={`text-base sm:text-lg font-mono font-bold block ${rsiColor}`}>
            {rsi ?? "-"}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{rsiStatus}</span>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">Moving Averages</span>
          <div className="font-mono text-xs space-y-0.5 text-slate-200">
            <div>SMA20: <strong className="text-amber-400">Rp {technical.sma20?.toLocaleString("id-ID") ?? "-"}</strong></div>
            <div>SMA50: <strong className="text-indigo-400">Rp {technical.sma50?.toLocaleString("id-ID") ?? "-"}</strong></div>
          </div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">MACD (12, 26, 9)</span>
          <div className="font-mono text-xs space-y-0.5">
            <div className="text-slate-200">Line: <strong>{technical.macd.macdLine ?? "-"}</strong></div>
            <div className="text-slate-400">Hist: <strong className={(technical.macd.histogram || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}>{technical.macd.histogram ?? "-"}</strong></div>
          </div>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 block mb-1">Volume Terakhir</span>
          <span className="text-base sm:text-lg font-mono font-bold text-white block">
            {(technical.volume.lastVolume / 1e6).toFixed(1)} Jt Lot
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
            Rata-rata 20H: {( (technical.volume.avgVolume20 || 0) / 1e6 ).toFixed(1)} Jt
          </span>
        </div>
      </div>

      {/* Interactive Candlestick Chart Terminal (Upgrade dari SVG Line Biasa) */}
      {technical.chartSeries.length > 0 && (
        <div className="pt-2">
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
