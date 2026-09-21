"use client";

import React, { useState, useEffect } from "react";
import { FinancialHealthAnalysis } from "@/lib/quant/financials";
import { DollarSign, TrendingUp, TrendingDown, Percent, Shield, BarChart2, Table as TableIcon } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";

interface FinancialModuleProps {
  financials: FinancialHealthAnalysis;
}

export const FinancialModule: React.FC<FinancialModuleProps> = ({ financials }) => {
  const [activeView, setActiveView] = useState<"chart-nominal" | "chart-margin" | "table">("chart-nominal");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (financials.status === "unavailable" || !financials.latest) {
    return (
      <div className="bg-white dark:bg-[#0f1118] rounded-lg border border-slate-200 dark:border-slate-800/80 p-4 transition-colors shadow-2xs">
        <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-900 dark:text-slate-100 mb-1">Business & Financial Health</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Data laporan keuangan kuartalan tidak tersedia atau belum dipublikasikan untuk emiten ini.
        </p>
      </div>
    );
  }

  const formatTrillion = (val: number | null) => {
    if (val === null || val === undefined) return "-";
    const abs = Math.abs(val);
    if (abs >= 1e12) return (val / 1e12).toFixed(2) + " T";
    if (abs >= 1e9) return (val / 1e9).toFixed(1) + " M";
    return val.toLocaleString("id-ID");
  };

  const l = financials.latest;
  const isNetPositive = (l.netIncome || 0) >= 0;

  // Prepare chart data from periods
  const periods = financials.periods && financials.periods.length > 0 ? financials.periods : [l];
  const chartData = periods.map((p) => {
    const d = new Date(p.date);
    const month = d.getMonth();
    const qNum = Math.floor(month / 3) + 1;
    const yearShort = d.getFullYear().toString().slice(-2);
    const qLabel = `Q${qNum} '${yearShort}`;

    const revT = p.revenue !== null ? Number((p.revenue / 1e12).toFixed(2)) : 0;
    const netT = p.netIncome !== null ? Number((p.netIncome / 1e12).toFixed(2)) : 0;

    return {
      name: qLabel,
      fullDate: p.date,
      revenueT: revT,
      netIncomeT: netT,
      rawRevenue: p.revenue,
      rawNetIncome: p.netIncome,
      grossMargin: p.grossMarginPct ?? 0,
      operatingMargin: p.operatingMarginPct ?? 0,
      netMargin: p.netMarginPct ?? 0,
    };
  });

  return (
    <div className="bg-white dark:bg-[#0f1118] rounded-lg border border-slate-200 dark:border-slate-800/80 p-4 shadow-2xs space-y-4 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Business & Financial Health</h3>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              Periode {financials.latestPeriodDate}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Laporan Keuangan Kuartalan • Mata Uang: IDR (Rupiah)
          </p>
        </div>

        {/* Growth YoY / QoQ Pill */}
        <div className="flex items-center gap-2">
          {financials.yoyGrowth.netIncomePct !== null && (
            <div className="bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Laba YoY</span>
              <span
                className={`font-mono font-bold flex items-center gap-1 ${
                  financials.yoyGrowth.netIncomePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {financials.yoyGrowth.netIncomePct >= 0 ? "+" : ""}
                {financials.yoyGrowth.netIncomePct}%
              </span>
            </div>
          )}

          {financials.qoqGrowth.netIncomePct !== null && (
            <div className="bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Laba QoQ</span>
              <span
                className={`font-mono font-bold flex items-center gap-1 ${
                  financials.qoqGrowth.netIncomePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {financials.qoqGrowth.netIncomePct >= 0 ? "+" : ""}
                {financials.qoqGrowth.netIncomePct}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Financial Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Revenue */}
        <div className="bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Pendapatan (Revenue)</span>
          <span className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white block">
            Rp {formatTrillion(l.revenue)}
          </span>
          {financials.yoyGrowth.revenuePct !== null && (
            <span
              className={`text-[10px] font-mono font-semibold block mt-1 ${
                financials.yoyGrowth.revenuePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              YoY: {financials.yoyGrowth.revenuePct >= 0 ? "+" : ""}
              {financials.yoyGrowth.revenuePct}%
            </span>
          )}
        </div>

        {/* Net Income */}
        <div className="bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Laba Bersih (Net Income)</span>
          <span
            className={`text-base sm:text-lg font-mono font-bold block ${
              isNetPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            Rp {formatTrillion(l.netIncome)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1 font-mono">
            NPM: {l.netMarginPct !== null ? `${l.netMarginPct}%` : "-"}
          </span>
        </div>

        {/* Operating Income */}
        <div className="bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Laba Usaha (Operating)</span>
          <span className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white block">
            Rp {formatTrillion(l.operatingIncome)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1 font-mono">
            OPM: {l.operatingMarginPct !== null ? `${l.operatingMarginPct}%` : "-"}
          </span>
        </div>

        {/* Solvency / Debt */}
        <div className="bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Debt-to-Equity (DER)</span>
          <span className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white block">
            {l.debtToEquity !== null ? `${l.debtToEquity}x` : "-"}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1 truncate" title={financials.solvencyHealth.description}>
            {financials.solvencyHealth.hasNetCash ? "Net Cash Position" : financials.solvencyHealth.description}
          </span>
        </div>
      </div>

      {/* Visual Chart / Table Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveView("chart-nominal")}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeView === "chart-nominal"
                ? "bg-white dark:bg-brand-600 text-brand-600 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Bar Chart Pendapatan & Laba</span>
          </button>
          <button
            onClick={() => setActiveView("chart-margin")}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeView === "chart-margin"
                ? "bg-white dark:bg-brand-600 text-brand-600 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Bar Chart Margin (%)</span>
          </button>
          <button
            onClick={() => setActiveView("table")}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              activeView === "table"
                ? "bg-white dark:bg-brand-600 text-brand-600 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tabel Kuartalan</span>
          </button>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          {chartData.length} Kuartal Terakhir
        </span>
      </div>

      {/* View 1: Nominal Bar Chart */}
      {activeView === "chart-nominal" && (
        <div className="bg-slate-50/70 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800/80 p-4">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Historis Pendapatan vs Laba Bersih Kuartalan (Rp Triliun)
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" /> Pendapatan
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Laba Bersih
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    tickFormatter={(val) => `${val} T`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3 text-xs space-y-1 z-50">
                            <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center justify-between gap-3">
                              <span>{data.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{data.fullDate}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-blue-600 dark:text-blue-400 font-mono">
                              <span>Pendapatan:</span>
                              <span className="font-bold">Rp {formatTrillion(data.rawRevenue)}</span>
                            </div>
                            <div
                              className={`flex items-center justify-between gap-4 font-mono font-bold ${
                                (data.rawNetIncome || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              <span>Laba Bersih:</span>
                              <span>Rp {formatTrillion(data.rawNetIncome)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-slate-500 text-[11px] pt-1">
                              <span>Net Profit Margin:</span>
                              <span className="font-mono font-semibold">{data.netMargin}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Bar dataKey="revenueT" name="Pendapatan" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="netIncomeT" name="Laba Bersih" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.netIncomeT >= 0 ? "#10b981" : "#f43f5e"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Memuat Bar Chart...
              </div>
            )}
          </div>
        </div>
      )}

      {/* View 2: Margin Bar Chart */}
      {activeView === "chart-margin" && (
        <div className="bg-slate-50/70 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800/80 p-4">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Historis Margin Keuntungan Kuartalan (%)
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" /> Gross Margin
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Net Margin
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3 text-xs space-y-1.5 z-50 font-mono">
                            <div className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 font-sans flex items-center justify-between gap-3">
                              <span>{data.name}</span>
                              <span className="text-[10px] text-slate-400">{data.fullDate}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-indigo-600 dark:text-indigo-400">
                              <span>Gross Margin:</span>
                              <span className="font-bold">{data.grossMargin}%</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-amber-600 dark:text-amber-400">
                              <span>Operating Margin:</span>
                              <span className="font-bold">{data.operatingMargin}%</span>
                            </div>
                            <div
                              className={`flex items-center justify-between gap-4 font-bold ${
                                data.netMargin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              <span>Net Margin:</span>
                              <span>{data.netMargin}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Bar dataKey="grossMargin" name="Gross Margin %" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="netMargin" name="Net Margin %" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Memuat Bar Chart...
              </div>
            )}
          </div>
        </div>
      )}

      {/* View 3: Historical Quarters Table */}
      {activeView === "table" && financials.periods.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Periode Kuartal</th>
                <th className="py-2.5 px-3 text-right">Pendapatan</th>
                <th className="py-2.5 px-3 text-right">Laba Bersih</th>
                <th className="py-2.5 px-3 text-right">Net Margin</th>
                <th className="py-2.5 px-3 text-right">Kas & Setara</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
              {financials.periods.map((p) => (
                <tr key={p.date} className="hover:bg-slate-100/60 dark:hover:bg-slate-900/50 transition">
                  <td className="py-2 px-3 text-slate-900 dark:text-slate-200 font-sans font-medium">{p.date}</td>
                  <td className="py-2 px-3 text-right">Rp {formatTrillion(p.revenue)}</td>
                  <td
                    className={`py-2 px-3 text-right font-semibold ${
                      (p.netIncome || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    Rp {formatTrillion(p.netIncome)}
                  </td>
                  <td className="py-2 px-3 text-right">{p.netMarginPct !== null ? `${p.netMarginPct}%` : "-"}</td>
                  <td className="py-2 px-3 text-right">Rp {formatTrillion(p.cashAndEquivalents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
