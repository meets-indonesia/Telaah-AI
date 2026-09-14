"use client";

import React, { useState } from "react";
import { InsiderClusterAnalysis } from "@/lib/sectors/types";
import {
  Radar,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Users,
  Briefcase,
  FileText,
  Calendar,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";

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
      <div className="bg-[#0f172a]/95 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <Radar className="w-5 h-5 text-blue-400" /> Whale & Insider Cluster Watch
        </h3>
        <p className="text-xs text-slate-500">
          Belum ada data keterbukaan informasi insider filings yang terverifikasi untuk {symbol}.
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
    <div className="bg-[#0f172a]/95 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl space-y-5 relative overflow-hidden">
      {/* Background Radar Effect */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Radar className="w-4 h-4 animate-spin-slow" />
            </div>
            <h3 className="text-base font-bold text-white">Whale & Insider Cluster Watch</h3>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              OJK Filings
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pelacakan transaksi kepemilikan saham oleh Direksi, Komisaris, dan Pengendali resmi emiten.
          </p>
        </div>

        {/* Signal Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
              clusterBuyDetected
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                : clusterSellDetected
                ? "bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-lg shadow-rose-500/10"
                : isBullishSignal
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : isBearishSignal
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                : "bg-slate-800 text-slate-300 border-slate-700"
            }`}
          >
            {clusterBuyDetected ? (
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            ) : isBullishSignal ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : isBearishSignal ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>{signal}</span>
          </div>
        </div>
      </div>

      {/* Cluster Announcement Callout Banner */}
      {clusterBuyDetected && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-3 shadow-inner">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-emerald-300 uppercase tracking-wider block text-[11px] mb-0.5">
              🚀 High-Conviction Sinyal: Cluster-Buy Terdeteksi
            </span>
            <p className="leading-relaxed text-slate-200">
              {summary} Aksi serentak para direksi adalah salah satu indikator keyakinan fundamental
              tertinggi karena pengurus perseroan memiliki pemahaman terdalam atas realitas bisnis
              emiten.
            </p>
          </div>
        </div>
      )}

      {clusterSellDetected && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/50 via-slate-900 to-slate-900 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3 shadow-inner">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-rose-300 uppercase tracking-wider block text-[11px] mb-0.5">
              ⚠️ Peringatan: Cluster-Sell Terdeteksi
            </span>
            <p className="leading-relaxed text-slate-200">
              {summary} Pelepasan saham oleh beberapa pejabat perseroan perlu dicermati oleh investor
              sebagai potensi sinyal kehati-hatian atau profit taking internal.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
            Total Saham Dibeli
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-emerald-400 block">
            +{(totalBuyShares / 1e6).toFixed(2)} Jt
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Rp {(totalBuyValue / 1e9).toFixed(1)} Miliar
          </span>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
            Total Saham Dijual
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-rose-400 block">
            {totalSellShares > 0 ? `-${(totalSellShares / 1e6).toFixed(2)} Jt` : "0 Lembar"}
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            {totalSellValue > 0 ? `Rp ${(totalSellValue / 1e9).toFixed(1)} Miliar` : "Nihil"}
          </span>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
            Akumulasi Bersih (Net)
          </span>
          <span
            className={`text-base sm:text-lg font-mono font-bold block ${
              netShares >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {netShares >= 0 ? "+" : ""}
            {(netShares / 1e6).toFixed(2)} Jt Lembar
          </span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
            Net Value: Rp {(Math.abs(netValue) / 1e9).toFixed(1)} M
          </span>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
            Eksekutif Terlibat
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-white block">
            {insiderActors.length} Orang
          </span>
          <span className="text-[10px] text-indigo-400 block mt-0.5">
            {transactions.length} Laporan Filing
          </span>
        </div>
      </div>

      {/* Key Insiders / Board Members Directory */}
      {insiderActors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Users className="w-3.5 h-3.5 text-blue-400" /> Figur Kunci Manajemen & Posisi Transaksi
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {insiderActors.map((actor, idx) => (
              <div
                key={idx}
                className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 hover:border-slate-700 transition space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="font-semibold text-slate-200 text-xs">{actor.name}</h5>
                    <span className="text-[10px] text-slate-400 block">{actor.position}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      actor.netShares >= 0
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {actor.netShares >= 0 ? "BUY" : "SELL"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60 font-mono">
                  <span className="text-slate-400">Net:</span>
                  <span
                    className={`font-bold ${
                      actor.netShares >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {actor.netShares >= 0 ? "+" : ""}
                    {actor.netShares.toLocaleString("id-ID")} lbr
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filings Timeline & History */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5 text-amber-400" /> Riwayat Keterbukaan Informasi (Filings)
          </h4>
          {/* Filters */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[10px]">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-2 py-0.5 rounded transition ${
                filterType === "ALL" ? "bg-slate-700 text-white font-bold" : "text-slate-400"
              }`}
            >
              Semua ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType("BUY")}
              className={`px-2 py-0.5 rounded transition ${
                filterType === "BUY" ? "bg-emerald-600 text-white font-bold" : "text-slate-400"
              }`}
            >
              Beli ({transactions.filter((t) => t.action === "BUY").length})
            </button>
            <button
              onClick={() => setFilterType("SELL")}
              className={`px-2 py-0.5 rounded transition ${
                filterType === "SELL" ? "bg-rose-600 text-white font-bold" : "text-slate-400"
              }`}
            >
              Jual ({transactions.filter((t) => t.action === "SELL").length})
            </button>
          </div>
        </div>

        {/* Transaction items */}
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {filteredTransactions.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center">
              Tidak ada data transaksi untuk kategori filter ini.
            </p>
          ) : (
            filteredTransactions.map((tx, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold font-mono border ${
                      tx.action === "BUY"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : tx.action === "SELL"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {tx.action === "BUY" ? "BELI" : tx.action === "SELL" ? "JUAL" : "INFO"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100">{tx.insiderName}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {tx.position}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{tx.filingTitle}</p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 text-right font-mono text-xs shrink-0">
                  <span
                    className={`font-bold ${
                      tx.action === "BUY" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {tx.action === "BUY" ? "+" : tx.action === "SELL" ? "-" : ""}
                    {tx.shares > 0 ? `${tx.shares.toLocaleString("id-ID")} lbr` : "Keterbukaan"}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    {tx.value ? <span>Rp {(tx.value / 1e9).toFixed(1)} M</span> : null}
                    <span>•</span>
                    <span>{tx.date}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Educational / Regulatory Note */}
      <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between gap-2">
        <span>
          💡 <strong>Konteks Regulasi:</strong> Sesuai POJK No. 11/POJK.04/2017, Direksi, Komisaris,
          dan pemegang saham ≥5% wajib melaporkan setiap perubahan kepemilikan saham dalam waktu
          maksimal 3 hari kerja bursa.
        </span>
      </div>
    </div>
  );
};
