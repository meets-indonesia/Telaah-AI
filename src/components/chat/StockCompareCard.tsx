"use client";

import React from "react";
import { Swords, Trophy, ExternalLink, TrendingUp, Info } from "lucide-react";
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
    <div className="mt-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0e1626] shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Header Banner */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-brand-600 text-white shadow-xs">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Head-to-Head Battle:</span>
              <span className="text-brand-600 dark:text-brand-400 font-black">{comparison.symbolA}</span>
              <span className="text-slate-400 font-normal">vs</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-black">{comparison.symbolB}</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Komparasi data resmi Sectors API v2
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Emiten Profile */}
      <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center p-3">
        {/* Emiten A */}
        <div className="space-y-1 pr-2">
          <div className="inline-block px-2 py-0.5 rounded-md bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 font-black text-xs">
            {comparison.symbolA}
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            Rp {comparison.priceA.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-slate-500 truncate">{comparison.nameA}</div>
          {onOpenDeepDive && (
            <button
              onClick={() => onOpenDeepDive(comparison.symbolA)}
              type="button"
              className="mt-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Detail {comparison.symbolA}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Emiten B */}
        <div className="space-y-1 pl-2">
          <div className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-black text-xs">
            {comparison.symbolB}
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            Rp {comparison.priceB.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-slate-500 truncate">{comparison.nameB}</div>
          {onOpenDeepDive && (
            <button
              onClick={() => onOpenDeepDive(comparison.symbolB)}
              type="button"
              className="mt-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Detail {comparison.symbolB}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Metrics Table with Visual Comparison Bar Meters */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
          <span>Perbandingan Metrik Utama</span>
          <span className="text-[10px] lowercase text-slate-400">Visual Bar Meter</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
          {comparison.metrics.map((m, idx) => {
            // Calculate proportional bar width
            let pctA = 50;
            let pctB = 50;
            const numA = parseFloat(String(m.valueA).replace(/[^0-9.-]+/g, ""));
            const numB = parseFloat(String(m.valueB).replace(/[^0-9.-]+/g, ""));

            if (!isNaN(numA) && !isNaN(numB) && numA > 0 && numB > 0) {
              if (m.name.includes("P/E") || m.name.includes("P/B") || m.name.includes("DER")) {
                // Lower is better: invert weight for bar visual
                const invA = 1 / numA;
                const invB = 1 / numB;
                pctA = Math.round((invA / (invA + invB)) * 100);
                pctB = 100 - pctA;
              } else {
                pctA = Math.round((numA / (numA + numB)) * 100);
                pctB = 100 - pctA;
              }
              // Clamp between 15% and 85% for visual balance
              pctA = Math.min(Math.max(pctA, 15), 85);
              pctB = 100 - pctA;
            } else if (m.winner === "A") {
              pctA = 65;
              pctB = 35;
            } else if (m.winner === "B") {
              pctA = 35;
              pctB = 65;
            }

            return (
              <div
                key={idx}
                className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition space-y-1.5"
              >
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-4 pr-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                      {m.name}
                    </span>
                    <span className="block text-[9px] text-slate-400 truncate">{m.category}</span>
                  </div>

                  {/* Value A */}
                  <div className="col-span-4 text-center font-semibold text-slate-900 dark:text-slate-100 text-[11px]">
                    <div className="flex items-center justify-center gap-1">
                      <span className={m.winner === "A" ? "text-brand-600 dark:text-brand-400 font-bold" : ""}>
                        {m.valueA}
                      </span>
                      {m.winner === "A" && (
                        <span title="Lebih Unggul">
                          <Trophy className="w-3 h-3 text-amber-500 inline-block" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Value B */}
                  <div className="col-span-4 text-center font-semibold text-slate-900 dark:text-slate-100 text-[11px]">
                    <div className="flex items-center justify-center gap-1">
                      <span className={m.winner === "B" ? "text-indigo-600 dark:text-indigo-400 font-bold" : ""}>
                        {m.valueB}
                      </span>
                      {m.winner === "B" && (
                        <span title="Lebih Unggul">
                          <Trophy className="w-3 h-3 text-amber-500 inline-block" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comparative Dual Bar Meter */}
                <div className="flex items-center gap-1 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden px-0.5">
                  <div
                    className={`h-1 rounded-full transition-all duration-500 ${
                      m.winner === "A" ? "bg-brand-600" : "bg-brand-400/50"
                    }`}
                    style={{ width: `${pctA}%` }}
                    title={`${comparison.symbolA}: ${pctA}%`}
                  />
                  <div
                    className={`h-1 rounded-full transition-all duration-500 ${
                      m.winner === "B" ? "bg-indigo-600" : "bg-indigo-400/50"
                    }`}
                    style={{ width: `${pctB}%` }}
                    title={`${comparison.symbolB}: ${pctB}%`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Retail Summary Callout */}
        <div className="p-3 rounded-xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200/70 dark:border-brand-800/60 text-xs text-slate-800 dark:text-slate-200 space-y-1">
          <div className="font-bold text-brand-700 dark:text-brand-300 flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>Kesimpulan Komparasi untuk Ritel:</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            {comparison.retailSummary}
          </p>
        </div>
      </div>
    </div>
  );
};
