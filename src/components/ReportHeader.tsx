"use client";

import React from "react";
import {
  Building2,
  Calendar,
  Layers,
  Database,
  Share2,
  MessageSquare,
  Clock,
  Coins,
  TrendingUp,
  TrendingDown,
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
  const isPositive = (report.technical?.dailyReturnPct || 0) >= 0;

  return (
    <div className="space-y-4">
      {/* Top Bar: Company Identity & Metas */}
      <div className="bg-[#0f172a]/95 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/30 to-slate-800 flex items-center justify-center border border-blue-500/30 text-white font-bold text-xl shadow-inner">
              {report.symbol}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-white tracking-tight">
                  {report.companyName}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  IDX: {report.symbol}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Papan {report.overview?.listing_board || "Utama"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                <span>{report.overview?.sector || "Sektor Terdaftar"}</span>
                <span>•</span>
                <span>{report.overview?.sub_sector || "Subsektor Terdaftar"}</span>
                {report.overview?.market_cap_rank && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 font-medium">Rank #{report.overview.market_cap_rank} Market Cap</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Price & Market Cap Snapshot */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-900/90 px-4 py-2 rounded-xl border border-slate-800 text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                Harga Terakhir
              </span>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-lg font-mono font-bold text-white">
                  Rp {report.technical?.lastPrice ? report.technical.lastPrice.toLocaleString("id-ID") : "-"}
                </span>
                {report.technical?.dailyReturnPct !== undefined && (
                  <span
                    className={`flex items-center gap-0.5 text-xs font-semibold ${
                      isPositive ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {isPositive ? "+" : ""}
                    {report.technical.dailyReturnPct}%
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-900/90 px-4 py-2 rounded-xl border border-slate-800 text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                Market Cap
              </span>
              <span className="text-sm font-mono font-semibold text-slate-200">
                Rp {report.overview?.market_cap ? ((report.overview.market_cap) / 1e12).toFixed(2) + " Triliun" : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons & Freshness Meta */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Data As Of: <strong className="text-slate-300 font-mono">{report.dataAsOf}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              Kredit Terpakai: <strong className="text-amber-400 font-mono">{report.creditsConsumed}</strong>
            </span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/50 uppercase font-mono text-[10px]">
              Mode: {report.mode}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenEvidence}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition shadow-sm"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Bukti Data ({report.evidenceRecords.length})</span>
            </button>

            <button
              onClick={onOpenQA}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-medium border border-blue-500/40 transition shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>Tanya Laporan</span>
            </button>

            <button
              onClick={onShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Bagikan Ringkasan"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bagikan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Direct Answer Hero Box (PRD FR-01 & Section 7 Direct Answer) */}
      <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/60 rounded-2xl border border-blue-500/30 p-5 md:p-6 shadow-lg relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
            Direct Answer
          </span>
          <span className="text-xs text-slate-400">Tanggapan Cepat Telaah 360</span>
        </div>
        <h3 className="text-base md:text-lg font-semibold text-white leading-relaxed mb-3">
          {report.directAnswer}
        </h3>
        <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
          {report.executiveSummary}
        </p>
      </div>
    </div>
  );
};
