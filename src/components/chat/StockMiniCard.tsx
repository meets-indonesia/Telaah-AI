"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Calculator,
  Radar,
  Share2,
  ExternalLink,
} from "lucide-react";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import { CompanyLogo } from "../CompanyLogo";

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
  const getVerdictStyle = () => {
    switch (card.verdict) {
      case "bullish":
        return {
          label: "PROSPEK POSITIF",
          badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
          icon: <TrendingUp className="w-3 h-3 text-emerald-500" />,
        };
      case "bearish":
        return {
          label: "TEKANAN JUAL",
          badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
          icon: <TrendingDown className="w-3 h-3 text-rose-500" />,
        };
      case "caution":
        return {
          label: "WASPADA / VOLATIL",
          badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
          icon: <TrendingDown className="w-3 h-3 text-amber-500" />,
        };
      default:
        return {
          label: "NETRAL / KONSOLIDASI",
          badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
          icon: null,
        };
    }
  };

  const style = getVerdictStyle();

  return (
    <div className="mt-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10131d] overflow-hidden text-xs transition-colors">
      {/* Header Strip */}
      <div className="p-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#131622] flex items-center justify-between gap-1.5 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <CompanyLogo
            symbol={card.symbol}
            website={card.report?.overview?.website}
            companyName={card.companyName}
            size="sm"
          />
          <div className="min-w-0 truncate">
            <span className="font-mono font-bold text-xs text-slate-100 mr-1.5">
              {card.symbol}
            </span>
            <span className="text-slate-400 truncate text-[11px]">
              {card.companyName}
            </span>
          </div>
        </div>

        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono font-semibold shrink-0 ${style.badge}`}>
          {style.icon}
          <span>{card.verdictText || style.label}</span>
        </div>
      </div>

      {/* Highlights Grid */}
      <div className="p-2.5 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 min-w-0">
          {card.highlights.map((h, i) => (
            <div
              key={i}
              className="p-2 rounded bg-slate-50 dark:bg-[#141722] border border-slate-100 dark:border-slate-800/60 min-w-0 overflow-hidden"
            >
              <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider truncate">
                {h.title}
              </div>
              <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200 mt-0.5 line-clamp-2 break-words">
                {h.desc}
              </div>
            </div>
          ))}
        </div>

        {card.retailTakeaway && (
          <div className="p-2 rounded bg-slate-50 dark:bg-[#121520] border-l-2 border-l-indigo-500 border-y border-r border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed overflow-hidden break-words">
            <strong className="text-slate-900 dark:text-slate-100 mr-1 font-mono">
              [Insight]:
            </strong>
            {card.retailTakeaway}
          </div>
        )}
      </div>

      {/* Actions Strip */}
      <div className="px-2.5 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#121520] flex flex-wrap items-center justify-between gap-1.5 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          {onQuickFollowUp && (
            <>
              <button
                type="button"
                onClick={() => onQuickFollowUp(`Berapa dividen yield dan jadwal dividen ${card.symbol}?`)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-[10px] font-mono transition shrink-0"
              >
                <Calculator className="w-3 h-3 text-slate-400" />
                <span>Dividen</span>
              </button>
              <button
                type="button"
                onClick={() => onQuickFollowUp(`Siapa broker yang paling banyak akumulasi ${card.symbol}?`)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-[10px] font-mono transition shrink-0"
              >
                <Radar className="w-3 h-3 text-slate-400" />
                <span>Broker Flow</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {card.report && onOpenShareCard && (
            <button
              type="button"
              onClick={() => onOpenShareCard(card.report!)}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              title="Bagikan Story Card"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}

          {card.report && (
            <button
              type="button"
              onClick={() => onOpenDeepDive(card.report!)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-semibold hover:bg-slate-800 dark:hover:bg-white transition"
            >
              <span>Buka Terminal</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
