"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, Sparkles } from "lucide-react";
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
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    icon: CheckCircle2,
  },
  "Bertentangan": {
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/30",
    icon: XCircle,
  },
  "Perlu konteks": {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    icon: AlertTriangle,
  },
  "Tidak dapat diverifikasi": {
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500/30",
    icon: HelpCircle,
  },
  "Opini/prediksi": {
    bg: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
    icon: Sparkles,
  },
};

export const ClaimCards: React.FC<ClaimCardsProps> = ({ claims, onSelectEvidence }) => {
  if (!claims || claims.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-[#0f172a]/95 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-sm dark:shadow-xl transition-colors">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Claim Intelligence ({claims.length} Klaim Diuji)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pemisahan klaim atomik dari teks masukan dan verifikasi silang terhadap data pasar & finansial resmi IDX.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {claims.map((claim, idx) => {
          const cfg = verdictConfig[claim.verdict] || verdictConfig["Tidak dapat diverifikasi"];
          const Icon = cfg.icon;

          return (
            <div
              key={claim.claimId || idx}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-brand-500/40 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Klaim #{idx + 1}
                </span>

                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {claim.verdict}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Confidence: {(claim.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Original Claim Text */}
              <blockquote className="text-sm font-medium text-slate-800 dark:text-slate-200 italic border-l-2 border-brand-500 pl-3 py-0.5 my-2">
                "{claim.originalText}"
              </blockquote>

              {/* Factual Metric / Counter Evidence */}
              {claim.factualMetricValue && (
                <div className="mt-2.5 mb-1.5 text-xs bg-white dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80 flex items-start gap-2 shadow-2xs">
                  <span className="text-brand-600 dark:text-blue-400 font-semibold shrink-0">Fakta Bursa:</span>
                  <span className="text-slate-800 dark:text-slate-300 font-mono">{claim.factualMetricValue}</span>
                </div>
              )}

              {/* Reasoning */}
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                {claim.reasoning}
              </p>

              {/* Evidence tags */}
              {claim.evidenceIds && claim.evidenceIds.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-[11px] text-slate-500">
                  <span>Referensi Bukti:</span>
                  {claim.evidenceIds.map((evId) => (
                    <button
                      key={evId}
                      onClick={() => onSelectEvidence?.(evId)}
                      className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-brand-600 dark:text-blue-400 hover:text-brand-700 dark:hover:text-blue-300 font-mono transition"
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
