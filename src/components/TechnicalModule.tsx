"use client";

import React from "react";
import { TechnicalAnalysisResult } from "@/lib/quant/indicators";
import { Activity, Gauge, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";

interface TechnicalModuleProps {
  technical: TechnicalAnalysisResult;
}

export const TechnicalModule: React.FC<TechnicalModuleProps> = ({ technical }) => {
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
            <div>SMA20: <strong className="text-blue-400">Rp {technical.sma20?.toLocaleString("id-ID") ?? "-"}</strong></div>
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

      {/* Mini Trend Sparkline Table / Visualization */}
      {technical.chartSeries.length > 0 && (
        <div className="bg-slate-950/50 rounded-xl border border-slate-800/80 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-blue-400" /> Pergerakan Harga Terkini ({technical.chartSeries.length} Hari Terakhir)
            </span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Close</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> SMA20</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" /> SMA50</span>
            </div>
          </div>

          {/* Clean SVG Line chart */}
          <div className="w-full h-36 relative mt-2">
            {(() => {
              const pts = technical.chartSeries;
              if (pts.length < 2) return null;
              const closes = pts.map((p) => p.close);
              const min = Math.min(...closes) * 0.98;
              const max = Math.max(...closes) * 1.02;
              const range = max - min || 1;

              const width = 800;
              const height = 130;

              const getX = (idx: number) => (idx / (pts.length - 1)) * width;
              const getY = (val: number) => height - ((val - min) / range) * height;

              const pathData = pts
                .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(p.close)}`)
                .join(" ");

              const sma20Pts = pts.filter((p) => p.sma20 !== undefined);
              const sma20Path = sma20Pts
                .map((p, i) => {
                  const originalIdx = pts.indexOf(p);
                  return `${i === 0 ? "M" : "L"} ${getX(originalIdx)} ${getY(p.sma20!)}`;
                })
                .join(" ");

              return (
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Area fill */}
                  <path
                    d={`${pathData} L ${width} ${height} L 0 ${height} Z`}
                    fill="url(#priceGrad)"
                  />

                  {/* Close price line */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* SMA20 line */}
                  {sma20Path && (
                    <path
                      d={sma20Path}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                  )}
                </svg>
              );
            })()}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
            <span>{technical.chartSeries[0]?.date}</span>
            <span>{technical.chartSeries[Math.floor(technical.chartSeries.length / 2)]?.date}</span>
            <span>{technical.chartSeries[technical.chartSeries.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
};
