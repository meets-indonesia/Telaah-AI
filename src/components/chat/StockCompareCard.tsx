"use client";

import React from "react";
import { Scale, ChevronRight, ExternalLink } from "lucide-react";
import { StockCompareResult } from "@/app/api/compare/route";

interface StockCompareCardProps {
  comparison: StockCompareResult;
  onOpenDeepDive?: (symbol: string) => void;
}

export const StockCompareCard: React.FC<StockCompareCardProps> = ({
  comparison,
  onOpenDeepDive,
}) => {
  return (
    <div className="mt-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10131d] overflow-hidden text-xs transition-colors">
      {/* Header Strip */}
      <div className="p-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#131622] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-tight">
            Komparasi Valuasi: {comparison.symbolA} vs {comparison.symbolB}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">Sectors v2</span>
      </div>

      {/* Side-by-Side Emiten Profile */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-[#121520] p-2.5 text-center">
        {/* Emiten A */}
        <div className="space-y-0.5 pr-2">
          <span className="font-mono font-bold text-xs text-slate-100 px-2 py-0.5 rounded bg-slate-800 inline-block">
            {comparison.symbolA}
          </span>
          <div className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            Rp {comparison.priceA ? comparison.priceA.toLocaleString("id-ID") : "-"}
          </div>
          <div className="text-[10px] text-slate-400 truncate">{comparison.nameA}</div>
          {onOpenDeepDive && (
            <button
              onClick={() => onOpenDeepDive(comparison.symbolA)}
              type="button"
              className="mt-0.5 text-[10px] font-mono text-indigo-500 hover:underline inline-flex items-center gap-0.5"
            >
              <span>Terminal {comparison.symbolA}</span>
              <ChevronRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Emiten B */}
        <div className="space-y-0.5 pl-2">
          <span className="font-mono font-bold text-xs text-slate-100 px-2 py-0.5 rounded bg-slate-800 inline-block">
            {comparison.symbolB}
          </span>
          <div className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            Rp {comparison.priceB ? comparison.priceB.toLocaleString("id-ID") : "-"}
          </div>
          <div className="text-[10px] text-slate-400 truncate">{comparison.nameB}</div>
          {onOpenDeepDive && (
            <button
              onClick={() => onOpenDeepDive(comparison.symbolB)}
              type="button"
              className="mt-0.5 text-[10px] font-mono text-indigo-500 hover:underline inline-flex items-center gap-0.5"
            >
              <span>Terminal {comparison.symbolB}</span>
              <ChevronRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Metrics Table */}
      <div className="p-2.5 space-y-1.5">
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-md overflow-hidden text-xs">
          {comparison.metrics.map((m, idx) => (
            <div key={idx} className="p-2 bg-slate-50/50 dark:bg-[#12151f] space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {m.name}
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase">{m.category}</span>
              </div>

              <div className="flex items-center justify-between font-mono text-xs tabular-nums">
                <span className={m.winner === "A" ? "font-bold text-emerald-400" : "text-slate-400"}>
                  {m.valueA}
                </span>
                <span className="text-[10px] text-slate-500">vs</span>
                <span className={m.winner === "B" ? "font-bold text-emerald-400" : "text-slate-400"}>
                  {m.valueB}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Note */}
        {comparison.retailSummary && (
          <div className="p-2 rounded bg-slate-50 dark:bg-[#121520] border-l-2 border-l-indigo-500 border-y border-r border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
            <strong className="text-slate-900 dark:text-slate-100 mr-1 font-mono">
              [Tesis Komparasi]:
            </strong>
            {comparison.retailSummary}
          </div>
        )}
      </div>
    </div>
  );
};
