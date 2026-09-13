"use client";

import React from "react";
import { FinancialHealthAnalysis } from "@/lib/quant/financials";
import { DollarSign, TrendingUp, TrendingDown, Percent, Shield } from "lucide-react";

interface FinancialModuleProps {
  financials: FinancialHealthAnalysis;
}

export const FinancialModule: React.FC<FinancialModuleProps> = ({ financials }) => {
  if (financials.status === "unavailable" || !financials.latest) {
    return (
      <div className="bg-[#0f172a]/95 rounded-2xl border border-slate-800 p-6">
        <h3 className="text-base font-bold text-white mb-2">Business & Financial Health</h3>
        <p className="text-xs text-slate-500">
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

  return (
    <div className="bg-[#0f172a]/95 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Business & Financial Health</h3>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Periode {financials.latestPeriodDate}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Laporan Keuangan Kuartalan • Mata Uang: IDR (Rupiah)
          </p>
        </div>

        {/* Growth YoY / QoQ Pill */}
        <div className="flex items-center gap-2">
          {financials.yoyGrowth.netIncomePct !== null && (
            <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 block">Laba YoY</span>
              <span
                className={`font-mono font-bold flex items-center gap-1 ${
                  financials.yoyGrowth.netIncomePct >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {financials.yoyGrowth.netIncomePct >= 0 ? "+" : ""}
                {financials.yoyGrowth.netIncomePct}%
              </span>
            </div>
          )}

          {financials.qoqGrowth.netIncomePct !== null && (
            <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 block">Laba QoQ</span>
              <span
                className={`font-mono font-bold flex items-center gap-1 ${
                  financials.qoqGrowth.netIncomePct >= 0 ? "text-emerald-400" : "text-rose-400"
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
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Pendapatan (Revenue)</span>
          <span className="text-base sm:text-lg font-mono font-bold text-white block">
            Rp {formatTrillion(l.revenue)}
          </span>
          {financials.yoyGrowth.revenuePct !== null && (
            <span
              className={`text-[10px] font-mono font-semibold block mt-1 ${
                financials.yoyGrowth.revenuePct >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              YoY: {financials.yoyGrowth.revenuePct >= 0 ? "+" : ""}
              {financials.yoyGrowth.revenuePct}%
            </span>
          )}
        </div>

        {/* Net Income */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Laba Bersih (Net Income)</span>
          <span
            className={`text-base sm:text-lg font-mono font-bold block ${
              isNetPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            Rp {formatTrillion(l.netIncome)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1 font-mono">
            NPM: {l.netMarginPct !== null ? `${l.netMarginPct}%` : "-"}
          </span>
        </div>

        {/* Operating Income */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Laba Usaha (Operating)</span>
          <span className="text-base sm:text-lg font-mono font-bold text-white block">
            Rp {formatTrillion(l.operatingIncome)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1 font-mono">
            OPM: {l.operatingMarginPct !== null ? `${l.operatingMarginPct}%` : "-"}
          </span>
        </div>

        {/* Solvency / Debt */}
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Debt-to-Equity (DER)</span>
          <span className="text-base sm:text-lg font-mono font-bold text-white block">
            {l.debtToEquity !== null ? `${l.debtToEquity}x` : "-"}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1 truncate" title={financials.solvencyHealth.description}>
            {financials.solvencyHealth.hasNetCash ? "Net Cash Position" : financials.solvencyHealth.description}
          </span>
        </div>
      </div>

      {/* Historical Quarters Table if available */}
      {financials.periods.length > 1 && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Periode Kuartal</th>
                <th className="py-2.5 px-3 text-right">Pendapatan</th>
                <th className="py-2.5 px-3 text-right">Laba Bersih</th>
                <th className="py-2.5 px-3 text-right">Net Margin</th>
                <th className="py-2.5 px-3 text-right">Kas & Setara</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {financials.periods.map((p) => (
                <tr key={p.date} className="hover:bg-slate-900/50 transition">
                  <td className="py-2 px-3 text-slate-200 font-sans font-medium">{p.date}</td>
                  <td className="py-2 px-3 text-right">Rp {formatTrillion(p.revenue)}</td>
                  <td
                    className={`py-2 px-3 text-right font-semibold ${
                      (p.netIncome || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
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
