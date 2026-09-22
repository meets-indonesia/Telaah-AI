"use client";

import React, { useState } from "react";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import { X, Copy, Check, Share2 } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CompanyIntelligenceReport;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, report }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Format shareable summary
  const claimsSummary = report.claims
    .map((c, i) => `${i + 1}. [${c.verdict.toUpperCase()}] "${c.originalText}" -> ${c.reasoning}`)
    .join("\n");

  const shareText = `[TELAAH 360 REPORT: ${report.symbol} - ${report.companyName}]
Data per: ${report.dataAsOf}

KESIMPULAN UTAMA:
${report.directAnswer}

AUDIT KLAIM PASAR:
${claimsSummary || "Tidak ada klaim spesifik."}

DATA RINGKAS:
• Harga: Rp ${report.technical?.lastPrice?.toLocaleString("id-ID") || "-"} (${(report.technical?.dailyReturnPct || 0) >= 0 ? "+" : ""}${report.technical?.dailyReturnPct || 0}%)
• Trend Teknikal: ${report.technical?.trendAssessment || "-"}
• Arus Asing (5 Hari): Rp ${(report.flowLens?.foreignFlow?.cumulative5d / 1e9).toFixed(1)}M (${report.flowLens?.foreignFlow?.recentTrend})
• Top Net Buyer: ${report.flowLens?.topBuyers?.[0]?.code || "-"}
• Top Net Seller: ${report.flowLens?.topSellers?.[0]?.code || "-"}

Catatan: Data bersumber dari Sectors API v2. Edukasi/Riset, bukan rekomendasi investasi. Dihasilkan via Telaah 360.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0f172a] rounded-2xl border border-slate-800 p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">Bagikan Ringkasan Laporan</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Salin ringkasan berbasis bukti ini untuk dibagikan ke grup Telegram, WhatsApp, atau media sosial:
        </p>

        <textarea
          readOnly
          value={shareText}
          rows={11}
          className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 focus:outline-none resize-none leading-relaxed"
        />

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Tutup
          </button>
          <button
            onClick={handleCopy}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Tersalin ke Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Ringkasan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
