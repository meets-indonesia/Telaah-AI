"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, FileCheck } from "lucide-react";
import { ClaimEvaluation, ClaimVerdict } from "@/lib/agent/types";

interface ClaimCardsProps {
  claims: ClaimEvaluation[];
  onSelectEvidence?: (evidenceId: string) => void;
}

const verdictConfig: Record<
  ClaimVerdict,
  {
    bg: string;
    text: string;
    border: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  "Didukung": {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/20",
    icon: CheckCircle2,
  },
  "Bertentangan": {
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-500/20",
    icon: XCircle,
  },
  "Perlu konteks": {
    bg: "bg-zinc-500/10",
    text: "text-amber-700 dark:text-zinc-400",
    border: "border-zinc-500/20",
    icon: AlertTriangle,
  },
  "Tidak dapat diverifikasi": {
    bg: "bg-white0/10",
    text: "text-slate-700 dark:text-slate-400",
    border: "border-slate-500/20",
    icon: HelpCircle,
  },
  "Opini/prediksi": {
    bg: "bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-500/20",
    icon: FileCheck,
  },
};

export const ClaimCards: React.FC<ClaimCardsProps> = ({ claims, onSelectEvidence }) => {
  if (!claims || claims.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-slate-800/80 p-4 transition-colors">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Verifikasi Klaim Pasar ({claims.length})
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Pemisahan klaim atomik dari narasi pasar dan uji silang terhadap data resmi IDX.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {claims.map((claim, idx) => {
          const cfg = verdictConfig[claim.verdict] || verdictConfig["Tidak dapat diverifikasi"];
          const Icon = cfg.icon;

          return (
            <div
              key={claim.claimId || idx}
              className="p-3 rounded-md bg-white dark:bg-[#131622] border border-slate-200/80 dark:border-slate-800/80 transition"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  Klaim #{idx + 1}
                </span>

                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                  >
                    <Icon className="w-3 h-3" />
                    {claim.verdict}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                    Conf: {(claim.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Original Claim Text */}
              <blockquote className="text-xs font-medium text-slate-800 dark:text-slate-200 italic border-l-2 border-slate-400 dark:border-slate-600 pl-2.5 py-0.5 my-1.5">
                "{claim.originalText}"
              </blockquote>

              {/* Factual Metric / Counter Evidence */}
              {claim.factualMetricValue && (
                <div className="mt-2 mb-1 text-[11px] bg-white dark:bg-[#0c0e14] p-2 rounded border border-slate-200 dark:border-slate-800 flex items-start gap-1.5">
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono font-semibold shrink-0">
                    [Fakta]:
                  </span>
                  <span className="text-slate-800 dark:text-slate-300 font-mono tabular-nums">
                    {claim.factualMetricValue}
                  </span>
                </div>
              )}

              {/* Reasoning */}
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                {claim.reasoning}
              </p>

              {/* Evidence tags */}
              {claim.evidenceIds && claim.evidenceIds.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 text-[10px] text-slate-400">
                  <span>Bukti:</span>
                  {claim.evidenceIds.map((evId) => (
                    <button
                      key={evId}
                      onClick={() => onSelectEvidence?.(evId)}
                      className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:underline font-mono transition"
                    >
                      #{evId}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
