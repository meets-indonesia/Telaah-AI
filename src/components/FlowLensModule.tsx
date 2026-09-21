"use client";

import React, { useState, useEffect } from "react";
import { ArrowDownRight, ArrowUpRight, AlertCircle, Users, Globe, Building, BarChart2 } from "lucide-react";
import { FlowLensAnalysis } from "@/lib/quant/flow";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";

interface FlowLensModuleProps {
  flowLens: FlowLensAnalysis;
}

export const FlowLensModule: React.FC<FlowLensModuleProps> = ({ flowLens }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (flowLens.status === "unavailable") {
    return (
      <div className="bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-slate-800/80 p-4 shadow-2xs transition-colors">
        <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-900 dark:text-slate-100 mb-1">FlowLens — Broker & Foreign Flow</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
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

  // Prepare Daily Foreign Flow Bar Chart Data
  const series = flowLens.foreignFlow.series || [];
  const chartData = series.map((s) => {
    const d = new Date(s.date);
    const dayMonth = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    const netMiliar = Number((s.netInflow / 1e9).toFixed(2));

    return {
      date: dayMonth,
      fullDate: s.date,
      netMiliar,
      rawNet: s.netInflow,
    };
  });

  const maxBuyerVal = Math.max(...flowLens.topBuyers.map((b) => b.netValue), 1);
  const maxSellerVal = Math.max(...flowLens.topSellers.map((s) => Math.abs(s.netValue)), 1);

  return (
    <div className="bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-slate-800/80 p-4 shadow-2xs space-y-4 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">FlowLens — Broker & Foreign Flow Context</h3>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              {flowLens.totalTradingDays} Hari Bursa
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rentang: <span className="font-mono text-slate-700 dark:text-slate-300">{flowLens.startDate}</span> s.d.{" "}
            <span className="font-mono text-slate-700 dark:text-slate-300">{flowLens.endDate}</span>
          </p>
        </div>

        {/* Foreign Flow Badge */}
        <div className="bg-white dark:bg-slate-900/90 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div>
            <span className="text-[10px] uppercase text-slate-400 dark:text-slate-500 block">Arus Asing 5 Hari</span>
            <span
              className={`text-sm font-mono font-bold flex items-center gap-1 ${
                isForeignPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isForeignPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              Rp {formatIDR(flowLens.foreignFlow.cumulative5d)}
            </span>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              flowLens.foreignFlow.recentTrend === "Net Inflow"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : flowLens.foreignFlow.recentTrend === "Net Outflow"
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            }`}
          >
            {flowLens.foreignFlow.recentTrend}
          </span>
        </div>
      </div>

      {/* Cohort Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white dark:bg-black p-2.5 rounded border border-slate-100 dark:border-slate-800/60">
          <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
            <Globe className="w-3 h-3 text-indigo-500" /> Net Asing
          </span>
          <span
            className={`text-xs sm:text-sm font-mono font-bold block mt-0.5 tabular-nums ${
              flowLens.cohortSummary.foreignNetValue >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            Rp {formatIDR(flowLens.cohortSummary.foreignNetValue)}
          </span>
        </div>

        <div className="bg-white dark:bg-black p-2.5 rounded border border-slate-100 dark:border-slate-800/60">
          <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
            <Building className="w-3 h-3 text-slate-400" /> Net Domestik
          </span>
          <span
            className={`text-xs sm:text-sm font-mono font-bold block mt-0.5 tabular-nums ${
              flowLens.cohortSummary.domesticNetValue >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            Rp {formatIDR(flowLens.cohortSummary.domesticNetValue)}
          </span>
        </div>

        <div className="bg-white dark:bg-black p-2.5 rounded border border-slate-100 dark:border-slate-800/60">
          <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" /> Net Institusi
          </span>
          <span
            className={`text-xs sm:text-sm font-mono font-bold block mt-0.5 tabular-nums ${
              flowLens.cohortSummary.institutionalNetValue >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            Rp {formatIDR(flowLens.cohortSummary.institutionalNetValue)}
          </span>
        </div>

        <div className="bg-white dark:bg-black p-2.5 rounded border border-slate-100 dark:border-slate-800/60">
          <span className="text-[10px] font-mono uppercase text-slate-500 flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" /> Net Ritel
          </span>
          <span
            className={`text-xs sm:text-sm font-mono font-bold block mt-0.5 tabular-nums ${
              flowLens.cohortSummary.retailNetValue >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            Rp {formatIDR(flowLens.cohortSummary.retailNetValue)}
          </span>
        </div>
      </div>

      {/* Foreign Flow Bar Chart */}
      {series.length > 0 && (
        <div className="bg-white/70 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800/80 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-blue-500" />
              <span>Bar Chart Arus Dana Asing Harian (Net Foreign Inflow/Outflow)</span>
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Net Inflow (Beli)
              </span>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" /> Net Outflow (Jual)
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    tickFormatter={(val) => `${val} M`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        const isPos = item.rawNet >= 0;
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-2.5 text-xs z-50 font-mono">
                            <div className="font-sans font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">
                              Tanggal: {item.fullDate}
                            </div>
                            <div className={`font-bold ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                              {isPos ? "Net Inflow: +" : "Net Outflow: "}
                              Rp {formatIDR(item.rawNet)}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-sans">
                              {isPos ? "Asing akumulasi beli bersih" : "Asing distribusi jual bersih"}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Bar dataKey="netMiliar" name="Arus Asing" radius={[3, 3, 0, 0]} maxBarSize={24}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.netMiliar >= 0 ? "#10b981" : "#f43f5e"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Memuat Bar Chart Foreign Flow...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Buyers vs Top Sellers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 5 Buyers */}
        <div className="bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Top 5 Net Buyers (Akumulator)
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Net Buy Value</span>
          </div>

          <div className="space-y-2.5">
            {flowLens.topBuyers.map((b) => {
              const barPct = Math.min(Math.max((b.netValue / maxBuyerVal) * 100, 8), 100);
              return (
                <div
                  key={b.code}
                  className="p-2.5 rounded-lg bg-white dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/60 text-xs shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 font-mono font-bold flex items-center justify-center border border-emerald-500/20 text-xs">
                        {b.code}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px] truncate max-w-[140px]">
                          {b.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {b.isForeign ? "Asing" : "Domestik"} • Avg Rp {b.buyAvgPrice.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block text-xs">
                        +Rp {formatIDR(b.netValue)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {b.netLot.toLocaleString("id-ID")} lot
                      </span>
                    </div>
                  </div>
                  {/* Proportional visual bar meter */}
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {flowLens.topBuyers.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">Tidak ada data net buyer.</p>
            )}
          </div>
        </div>

        {/* Top 5 Sellers */}
        <div className="bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Top 5 Net Sellers (Distributor)
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Net Sell Value</span>
          </div>

          <div className="space-y-2.5">
            {flowLens.topSellers.map((b) => {
              const barPct = Math.min(Math.max((Math.abs(b.netValue) / maxSellerVal) * 100, 8), 100);
              return (
                <div
                  key={b.code}
                  className="p-2.5 rounded-lg bg-white dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/60 text-xs shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded bg-rose-500/10 text-rose-600 dark:text-rose-300 font-mono font-bold flex items-center justify-center border border-rose-500/20 text-xs">
                        {b.code}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px] truncate max-w-[140px]">
                          {b.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {b.isForeign ? "Asing" : "Domestik"} • Avg Rp {b.sellAvgPrice.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400 block text-xs">
                        -Rp {formatIDR(Math.abs(b.netValue))}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {Math.abs(b.netLot).toLocaleString("id-ID")} lot
                      </span>
                    </div>
                  </div>
                  {/* Proportional visual bar meter */}
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {flowLens.topSellers.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">Tidak ada data net seller.</p>
            )}
          </div>
        </div>
      </div>

      {/* Compliance & Limitation Warning Callout */}
      <div className="pt-2 text-[10px] text-slate-400 font-mono border-t border-slate-100 dark:border-slate-800/60">
        Catatan Kepatuhan: {flowLens.limitationDisclaimer}
      </div>
    </div>
  );
};
