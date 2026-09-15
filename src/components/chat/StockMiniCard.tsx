"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Sparkles,
  PieChart,
  Users,
  AlertTriangle,
  Share2,
} from "lucide-react";
import { CompanyIntelligenceReport } from "@/lib/agent/types";

interface StockMiniCardProps {
  card: {
    symbol: string;
    companyName: string;
    sector?: string;
    price?: number;
    changePct?: number;
    verdict?: "bullish" | "bearish" | "neutral" | "caution";
    verdictText?: string;
    highlights: Array<{ title: string; desc: string; icon?: "check" | "alert" | "info" }>;
    retailTakeaway?: string;
    report?: CompanyIntelligenceReport;
  };
  onOpenDeepDive: (report: CompanyIntelligenceReport) => void;
  onQuickFollowUp?: (question: string) => void;
  onOpenShareCard?: (report: CompanyIntelligenceReport) => void;
}

export const StockMiniCard: React.FC<StockMiniCardProps> = ({
  card,
  onOpenDeepDive,
  onQuickFollowUp,
  onOpenShareCard,
}) => {
  const isPositive = (card.changePct ?? 0) >= 0;

  const getVerdictBadge = () => {
    switch (card.verdict) {
      case "bullish":
        return {
          label: "PROSPEK POSITIF",
          bg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
          icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />,
        };
      case "bearish":
        return {
          label: "TEKANAN JUAL",
          bg: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
          icon: <TrendingDown className="w-3.5 h-3.5 text-red-600" />,
        };
      case "caution":
        return {
          label: "WASPADA / VOLATIL",
          bg: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
        };
      default:
        return {
          label: "NETRAL / KONSOLIDASI",
          bg: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
          icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />,
        };
    }
  };

  const badge = getVerdictBadge();

  return (
    <div className="mt-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#0e1626] shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Top Banner / Price strip */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-brand-50/50 via-slate-50/50 to-transparent dark:from-brand-950/30 dark:via-slate-900/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
            {card.symbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {card.symbol}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[140px] sm:max-w-[200px]">
                {card.companyName}
              </span>
            </div>
            {card.sector && (
              <span className="text-[11px] text-brand-600 dark:text-brand-400 font-medium">
                {card.sector}
              </span>
            )}
          </div>
        </div>

        {/* Verdict Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${badge.bg}`}
        >
          {badge.icon}
          <span>{card.verdictText || badge.label}</span>
        </div>
      </div>

      {/* Highlights for Retail */}
      <div className="p-3.5 space-y-2.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Ringkasan Mudah Dipahami
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {card.highlights.map((h, i) => (
            <div
              key={i}
              className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/60 flex flex-col justify-between"
            >
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {h.title}
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 line-clamp-2">
                {h.desc}
              </span>
            </div>
          ))}
        </div>

        {card.retailTakeaway && (
          <div className="p-3 rounded-xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200/70 dark:border-brand-800/60 text-xs text-brand-900 dark:text-brand-200">
            <span className="font-bold text-brand-700 dark:text-brand-300 mr-1.5">
              💡 Catatan untuk Ritel:
            </span>
            {card.retailTakeaway}
          </div>
        )}
      </div>

      {/* Bottom Bar: Action Deep Dive & Follow-ups */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-2">
        {/* Quick follow up pill buttons */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {onQuickFollowUp && (
            <>
              <button
                type="button"
                onClick={() => onQuickFollowUp(`Berapa dividen yield dan jadwal pembagian dividen ${card.symbol}?`)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-brand-400 hover:text-brand-600 text-[11px] transition"
              >
                💰 Cek Dividen
              </button>
              <button
                type="button"
                onClick={() => onQuickFollowUp(`Siapa broker asing/lokal yang paling banyak akumulasi ${card.symbol}?`)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-brand-400 hover:text-brand-600 text-[11px] transition"
              >
                🐋 Radar Broker/Bandar
              </button>
            </>
          )}
        </div>

        {/* Actions on right */}
        <div className="flex items-center gap-1.5">
          {card.report && onOpenShareCard && (
            <button
              type="button"
              onClick={() => onOpenShareCard(card.report!)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition active:scale-[0.98]"
              title="Buat kartu gambar untuk WhatsApp / Instagram Story"
            >
              <Share2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span className="hidden sm:inline">Kartu Story</span>
            </button>
          )}

          {/* Deep Dive button */}
          {card.report && (
            <button
              type="button"
              onClick={() => onOpenDeepDive(card.report!)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs transition active:scale-[0.98]"
            >
              <span>Buka Studio 360°</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
