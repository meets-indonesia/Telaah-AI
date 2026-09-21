"use client";

import React, { useState } from "react";
import {
  Radar,
  Users,
  ShieldCheck,
  FileText,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { InsiderClusterAnalysis } from "@/lib/sectors/types";

interface InsiderWhaleRadarProps {
  insiderRadar?: InsiderClusterAnalysis;
  symbol: string;
}

export const InsiderWhaleRadar: React.FC<InsiderWhaleRadarProps> = ({
  insiderRadar,
  symbol,
}) => {
  const [filterType, setFilterType] = useState<"ALL" | "BUY" | "SELL">("ALL");

  if (!insiderRadar || insiderRadar.status === "unavailable") {
    return (
      <div className="bg-white dark:bg-[#0f1118] rounded-lg border border-slate-200 dark:border-slate-800/80 p-4">
        <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-900 dark:text-slate-100 mb-1">
          Whale & Insider Cluster Watch
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Data keterbukaan transaksi orang dalam (insider filings) tidak tersedia untuk emiten ini.
        </p>
      </div>
    );
  }

  const {
    signal,
    score,
    summary,
    totalBuyShares,
    totalSellShares,
    netShares,
    totalBuyValue,
    totalSellValue,
    netValue,
    clusterBuyDetected,
    clusterSellDetected,
    insiderActors,
    transactions,
  } = insiderRadar;

  const isBullishSignal = score > 0;
  const isBearishSignal = score < 0;

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === "BUY") return t.action === "BUY";
    if (filterType === "SELL") return t.action === "SELL";
    return true;
  });

  return (
    <div className="bg-white dark:bg-[#0f1118] rounded-lg border border-slate-200 dark:border-slate-800/80 p-4 space-y-3 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <Radar className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Whale & Insider Cluster Watch
          </h3>
          <span className="text-[10px] font-mono uppercase font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            OJK Filings
          </span>
        </div>

        {/* Signal Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              clusterBuyDetected
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                : clusterSellDetected
                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                : isBullishSignal
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : isBearishSignal
                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            }`}
          >
            {signal.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Cluster Announcement Banner */}
      {clusterBuyDetected && (
        <div className="p-3 rounded-md bg-emerald-500/10 border-l-4 border-l-emerald-500 border-y border-r border-emerald-500/20 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[11px] mb-0.5">
            <UserCheck className="w-3.5 h-3.5" />
            <span>[SIGNAL: CLUSTER ACCUMULATION DETECTED]</span>
          </div>
          <p className="leading-relaxed text-slate-700 dark:text-slate-300 text-xs">
            {summary} Akumulasi serentak figur kunci manajemen mengindikasikan keyakinan fundamental internal yang kuat.
          </p>
        </div>
      )}

      {clusterSellDetected && (
        <div className="p-3 rounded-md bg-rose-500/10 border-l-4 border-l-rose-500 border-y border-r border-rose-500/20 text-xs">
          <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-mono font-bold text-[11px] mb-0.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>[WARNING: CLUSTER DISTRIBUTION DETECTED]</span>
          </div>
          <p className="leading-relaxed text-slate-700 dark:text-slate-300 text-xs">
            {summary} Pelepasan saham oleh pejabat perseroan perlu dicermati sebagai potensi profit taking internal.
          </p>
        </div>
      )}

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-slate-50 dark:bg-[#12151f] p-2.5 rounded border border-slate-100 dark:border-slate-800/60">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
            Total Saham Dibeli
          </span>
          <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 block tabular-nums">
            +{(totalBuyShares / 1e6).toFixed(2)}M Lbr
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block tabular-nums">
            Rp {(totalBuyValue / 1e9).toFixed(1)}B
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-[#12151f] p-2.5 rounded border border-slate-100 dark:border-slate-800/60">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
            Total Saham Dijual
          </span>
          <span className="text-sm font-mono font-bold text-rose-600 dark:text-rose-400 block tabular-nums">
            {totalSellShares > 0 ? `-${(totalSellShares / 1e6).toFixed(2)}M Lbr` : "0 Lbr"}
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block tabular-nums">
            {totalSellValue > 0 ? `Rp ${(totalSellValue / 1e9).toFixed(1)}B` : "Nihil"}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-[#12151f] p-2.5 rounded border border-slate-100 dark:border-slate-800/60">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
            Akumulasi Bersih (Net)
          </span>
          <span
            className={`text-sm font-mono font-bold block tabular-nums ${
              netShares >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {netShares >= 0 ? "+" : ""}
            {(netShares / 1e6).toFixed(2)}M Lbr
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block tabular-nums">
            Net: Rp {(Math.abs(netValue) / 1e9).toFixed(1)}B
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-[#12151f] p-2.5 rounded border border-slate-100 dark:border-slate-800/60">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-0.5">
            Eksekutif Terlibat
          </span>
          <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 block tabular-nums">
            {insiderActors.length} Orang
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
            {transactions.length} Laporan Filing
          </span>
        </div>
      </div>

      {/* Key Insiders Grid */}
      {insiderActors.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">
            Figur Kunci Manajemen:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {insiderActors.map((actor, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-[#12151f] p-2 rounded border border-slate-100 dark:border-slate-800/60 text-xs flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate text-xs">
                    {actor.name}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate block">
                    {actor.position}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`font-mono text-[11px] font-bold tabular-nums ${
                      actor.netShares >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {actor.netShares >= 0 ? "+" : ""}{(actor.netShares / 1e3).toFixed(0)}k lbr
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Filings Log */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Riwayat Keterbukaan Informasi ({filteredTransactions.length}):
          </span>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-1.5 py-0.2 rounded transition ${
                filterType === "ALL"
                  ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterType("BUY")}
              className={`px-1.5 py-0.2 rounded transition ${
                filterType === "BUY"
                  ? "bg-emerald-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              Beli
            </button>
            <button
              onClick={() => setFilterType("SELL")}
              className={`px-1.5 py-0.2 rounded transition ${
                filterType === "SELL"
                  ? "bg-rose-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              Jual
            </button>
          </div>
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {filteredTransactions.map((tx, idx) => (
            <div
              key={idx}
              className="p-2 rounded bg-slate-50 dark:bg-[#12151f] border border-slate-100 dark:border-slate-800/60 text-xs flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`px-1 py-0.2 rounded font-mono text-[9px] font-bold ${
                    tx.action === "BUY"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {tx.action}
                </span>
                <div className="truncate">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mr-1.5 text-xs truncate">
                    {tx.insiderName}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                    ({tx.position})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] tabular-nums">
                <span
                  className={`font-semibold ${
                    tx.action === "BUY" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {tx.action === "BUY" ? "+" : "-"}{tx.shares.toLocaleString("id-ID")} lbr
                </span>
                <span className="text-slate-400 text-[10px]">
                  {tx.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
