"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { ClaimEvaluation } from "@/lib/agent/types";

interface RumorFactCheckerCardProps {
  symbol: string;
  originalRumor: string;
  claims: ClaimEvaluation[];
  overallRisk: "low" | "medium" | "high";
  onSelectEvidence?: (evidenceId: string) => void;
}

export const RumorFactCheckerCard: React.FC<RumorFactCheckerCardProps> = ({
  symbol,
  originalRumor,
  claims,
  overallRisk,
  onSelectEvidence,
}) => {
  const getRiskBadge = () => {
    switch (overallRisk) {
      case "high":
        return {
          label: "RISIKO POM-POM TINGGI",
          bg: "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
          icon: <ShieldAlert className="w-4 h-4 text-red-600" />,
        };
      case "medium":
        return {
          label: "PERLU HATI-HATI (SEBAGIAN VALID)",
          bg: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
        };
      default:
        return {
          label: "TERVALIDASI DATA FAKTUAL",
          bg: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
          icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
        };
    }
  };

  const riskBadge = getRiskBadge();

  return (
    <div className="mt-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0e1626] shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent dark:from-red-950/30 dark:via-amber-950/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Fact-Checker Rumor & Pom-Pom Saham ({symbol})
            </h4>
            <p className="text-[10px] text-slate-500">
              Audit silang data real-time Sectors API v2
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${riskBadge.bg}`}
        >
          {riskBadge.icon}
          <span>{riskBadge.label}</span>
        </div>
      </div>

      {/* The Rumor Quote */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Klaim / Narasi yang Diuji:
        </div>
        <p className="text-xs italic text-slate-700 dark:text-slate-300 font-serif leading-relaxed">
          &ldquo;{originalRumor}&rdquo;
        </p>
      </div>

      {/* Claims Breakdown */}
      <div className="p-3.5 space-y-2.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Hasil Verifikasi Tiap Poin:
        </div>

        <div className="space-y-2">
          {claims.map((c, i) => {
            const isSupported = c.verdict === "Didukung";
            const isRefuted = c.verdict === "Bertentangan";

            return (
              <div
                key={c.claimId || i}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {c.originalText}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      isSupported
                        ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                        : isRefuted
                        ? "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400"
                        : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {isSupported ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : isRefuted ? (
                      <XCircle className="w-3 h-3" />
                    ) : (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                    <span>{c.verdict}</span>
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {c.reasoning}
                </p>

                {c.factualMetricValue && (
                  <div className="text-[10px] text-slate-500 font-mono pt-0.5">
                    <strong>Fakta Data:</strong> {c.factualMetricValue}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Warning Tips for Retail */}
        <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Tips Edukasi Ritel:</strong> Jangan pernah membeli saham hanya karena ajakan viral atau tangkapan layar keuntungan di media sosial sebelum memverifikasi laporan keuangan resmi dan pergerakan akumulasi broker di Telaah 360.
          </p>
        </div>
      </div>
    </div>
  );
};
