"use client";

import React from "react";
import { ArrowDownRight, ArrowUpRight, AlertCircle, Users, Globe, Building } from "lucide-react";
import { FlowLensAnalysis } from "@/lib/quant/flow";

interface FlowLensModuleProps {
  flowLens: FlowLensAnalysis;
}

export const FlowLensModule: React.FC<FlowLensModuleProps> = ({ flowLens }) => {
  if (flowLens.status === "unavailable") {
    return (
      <div className="bg-[#0f172a]/95 rounded-2xl border border-slate-800 p-6">
        <h3 className="text-base font-bold text-white mb-2">FlowLens — Broker & Foreign Flow</h3>
        <p className="text-xs text-slate-500">
          Data agregat broker tidak tersedia atau tidak dipicu pada mode analisis ini.
        </p>
      </div>
    );
  }

  const formatIDR = (num: number) => {
    const abs = Math.abs(num);
    if (abs >= 1e12) return (num / 1e12).toFixed(2) + " Triliun";
    if (abs >= 1e9) return (num / 1e9).toFixed(1) + " Miliar";
    if (abs >= 1e6) return (num / 1e6).toFixed(1) + " Juta";
    return num.toLocaleString("id-ID");
  };

  const isForeignPositive = flowLens.foreignFlow.cumulative5d >= 0;

  return (
    <div className="bg-[#0f172a]/95 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">FlowLens — Broker & Foreign Flow Context</h3>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
              {flowLens.totalTradingDays} Hari Bursa
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Rentang: <span className="font-mono text-slate-300">{flowLens.startDate}</span> s.d.{" "}
            <span className="font-mono text-slate-300">{flowLens.endDate}</span>
          </p>
        </div>

        {/* Foreign Flow Badge */}
        <div className="bg-slate-900/90 px-3.5 py-1.5 rounded-xl border border-slate-800 flex items-center gap-3">
          <div>
            <span className="text-[10px] uppercase text-slate-400 block">Arus Asing 5 Hari</span>
            <span
              className={`text-sm font-mono font-bold flex items-center gap-1 ${
                isForeignPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isForeignPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              Rp {formatIDR(flowLens.foreignFlow.cumulative5d)}
            </span>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              flowLens.foreignFlow.recentTrend === "Net Inflow"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : flowLens.foreignFlow.recentTrend === "Net Outflow"
                ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {flowLens.foreignFlow.recentTrend}
          </span>
        </div>
      </div>

      {/* Cohort Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Globe className="w-3 h-3 text-blue-400" /> Net Asing (Foreign)
          </span>
          <span
            className={`text-xs sm:text-sm font-mono font-bold block mt-1 ${
              flowLens.cohortSummary.foreignNetValue >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            Rp {formatIDR(flowLens.cohortSummary.foreignNetValue)}
          </span>
        </div>

        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Building className="w-3 h-3 text-indigo-400" /> Net Domestik
          </span>
          <span
            className={`text-xs sm:text-sm font-mono font-bold block mt-1 ${
              flowLens.cohortSummary.domesticNetValue >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            Rp {formatIDR(flowLens.cohortSummary.domesticNetValue)}
          </span>
        </div>

        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Users className="w-3 h-3 text-amber-400" /> Net Institusi
          </span>
          <span
            className={`text-xs sm:text-sm font-mono font-bold block mt-1 ${
              flowLens.cohortSummary.institutionalNetValue >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            Rp {formatIDR(flowLens.cohortSummary.institutionalNetValue)}
          </span>
        </div>

        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800/80">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Users className="w-3 h-3 text-purple-400" /> Net Ritel
          </span>
          <span
            className={`text-xs sm:text-sm font-mono font-bold block mt-1 ${
              flowLens.cohortSummary.retailNetValue >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            Rp {formatIDR(flowLens.cohortSummary.retailNetValue)}
          </span>
        </div>
      </div>

      {/* Top Buyers vs Top Sellers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 5 Buyers */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Top 5 Net Buyers
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Net Buy Value</span>
          </div>

          <div className="space-y-2">
            {flowLens.topBuyers.map((b) => (
              <div
                key={b.code}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded bg-emerald-500/10 text-emerald-300 font-mono font-bold flex items-center justify-center border border-emerald-500/20 text-xs">
                    {b.code}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-200 block text-[11px] truncate max-w-[140px]">
                      {b.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {b.isForeign ? "Asing" : "Domestik"} • Rata-rata Rp {b.buyAvgPrice.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-400 block text-xs">
                    +Rp {formatIDR(b.netValue)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {b.netLot.toLocaleString("id-ID")} lot
                  </span>
                </div>
              </div>
            ))}
            {flowLens.topBuyers.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-3">Tidak ada data net buyer.</p>
            )}
          </div>
        </div>

        {/* Top 5 Sellers */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> Top 5 Net Sellers
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Net Sell Value</span>
          </div>

          <div className="space-y-2">
            {flowLens.topSellers.map((b) => (
              <div
                key={b.code}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded bg-rose-500/10 text-rose-300 font-mono font-bold flex items-center justify-center border border-rose-500/20 text-xs">
                    {b.code}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-200 block text-[11px] truncate max-w-[140px]">
                      {b.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {b.isForeign ? "Asing" : "Domestik"} • Rata-rata Rp {b.sellAvgPrice.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-rose-400 block text-xs">
                    -Rp {formatIDR(Math.abs(b.netValue))}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {Math.abs(b.netLot).toLocaleString("id-ID")} lot
                  </span>
                </div>
              </div>
            ))}
            {flowLens.topSellers.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-3">Tidak ada data net seller.</p>
            )}
          </div>
        </div>
      </div>

      {/* Compliance & Limitation Warning Callout (PRD Section 6 & FR-06) */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-300/90 leading-relaxed">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>{flowLens.limitationDisclaimer}</p>
      </div>
    </div>
  );
};
