"use client";

import React, { useRef, useEffect, useState } from "react";
import { Download, Copy, Check, X, Sparkles, Image as ImageIcon, Share2 } from "lucide-react";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import { extractValuationMultiples } from "@/lib/sectors/types";

interface ShareAlphaCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CompanyIntelligenceReport;
}

export const ShareAlphaCardModal: React.FC<ShareAlphaCardModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aspectRatio, setAspectRatio] = useState<"story" | "square">("story");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !report) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dimensions
    const width = 1080;
    const height = aspectRatio === "story" ? 1920 : 1080;
    canvas.width = width;
    canvas.height = height;

    // Background Gradient (Deep Navy Blue to Midnight Black)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#0b1426");
    bgGrad.addColorStop(0.5, "#080d19");
    bgGrad.addColorStop(1, "#030712");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle radial light glow in top-right
    const glow = ctx.createRadialGradient(width * 0.85, height * 0.15, 10, width * 0.85, height * 0.15, 600);
    glow.addColorStop(0, "rgba(37, 99, 235, 0.25)");
    glow.addColorStop(1, "rgba(37, 99, 235, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Outer subtle border
    ctx.strokeStyle = "rgba(59, 130, 246, 0.2)";
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // 1. Top Brand Header
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px -apple-system, sans-serif";
    ctx.fillText("TELAAH 360", 80, 130);

    ctx.fillStyle = "#60a5fa";
    ctx.font = "bold 26px -apple-system, sans-serif";
    ctx.fillText("AI FINANCIAL COPILOT • SECTORS API v2", 80, 180);

    // 2. Big Emiten Badge & Price
    const badgeY = 270;
    ctx.fillStyle = "rgba(37, 99, 235, 0.2)";
    ctx.fillRect(80, badgeY, width - 160, 280);
    ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
    ctx.lineWidth = 3;
    ctx.strokeRect(80, badgeY, width - 160, 280);

    // Symbol
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 110px -apple-system, sans-serif";
    ctx.fillText(report.symbol, 130, badgeY + 130);

    // Company Name
    ctx.fillStyle = "#94a3b8";
    ctx.font = "normal 36px -apple-system, sans-serif";
    const truncatedName = report.companyName.length > 32 ? report.companyName.slice(0, 30) + "..." : report.companyName;
    ctx.fillText(truncatedName, 130, badgeY + 190);

    // Sector
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 30px -apple-system, sans-serif";
    ctx.fillText(report.overview?.sector || "IDX Listed", 130, badgeY + 240);

    // Price on right side
    const priceStr = `Rp ${report.technical?.lastPrice.toLocaleString("id-ID") || "-"}`;
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px -apple-system, sans-serif";
    ctx.fillText(priceStr, width - 130, badgeY + 130);

    const changePct = report.technical?.dailyReturnPct || 0;
    const changeStr = `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;
    ctx.fillStyle = changePct >= 0 ? "#10b981" : "#f43f5e";
    ctx.font = "bold 44px -apple-system, sans-serif";
    ctx.fillText(changeStr, width - 130, badgeY + 190);

    ctx.textAlign = "left"; // reset alignment

    // 3. Verdict Badge
    const verdictY = 600;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(80, verdictY, width - 160, 90);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 32px -apple-system, sans-serif";
    ctx.fillText(`STATUS TREN: ${report.technical?.trendAssessment.toUpperCase() || "NETRAL"}`, 120, verdictY + 58);

    // 4. Executive Direct Answer / Takeaway
    const summaryY = 740;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 30px -apple-system, sans-serif";
    ctx.fillText("INTISARI RISET UNTUK RITEL:", 80, summaryY);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "normal 34px -apple-system, sans-serif";
    
    // Wrap direct answer text
    const words = report.directAnswer.split(" ");
    let line = "";
    let lineY = summaryY + 60;
    const maxLines = aspectRatio === "story" ? 6 : 3;
    let linesCount = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > width - 180 && n > 0) {
        ctx.fillText(line, 80, lineY);
        line = words[n] + " ";
        lineY += 50;
        linesCount++;
        if (linesCount >= maxLines) {
          line += "...";
          break;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 80, lineY);

    // 5. Three Key Pillars Cards
    const pillarsY = lineY + 90;
    const pillarHeight = 150;
    const multiples = extractValuationMultiples(report.valuation);
    const pe = multiples.pe ?? report.peerLens?.peers?.find(p => p.isTarget)?.pe;
    const pb = multiples.pb ?? report.peerLens?.peers?.find(p => p.isTarget)?.pb;

    const pillars = [
      {
        title: "VALUASI",
        desc: `PER ${pe ? pe.toFixed(1) + "x" : "-"} | PBV ${pb ? pb.toFixed(2) + "x" : "-"}`,
      },
      {
        title: "FOREIGN FLOW",
        desc: report.flowLens?.foreignFlow?.recentTrend || "Flow Netral",
      },
      {
        title: "KESEHATAN MODAL",
        desc: report.financials?.solvencyHealth?.description || "Kondisi stabil",
      },
    ];

    pillars.forEach((p, idx) => {
      const py = pillarsY + idx * (pillarHeight + 25);
      if (py + pillarHeight < height - 150) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
        ctx.fillRect(80, py, width - 160, pillarHeight);
        ctx.strokeStyle = "rgba(51, 65, 85, 0.6)";
        ctx.lineWidth = 2;
        ctx.strokeRect(80, py, width - 160, pillarHeight);

        ctx.fillStyle = "#60a5fa";
        ctx.font = "bold 28px -apple-system, sans-serif";
        ctx.fillText(p.title, 120, py + 55);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px -apple-system, sans-serif";
        ctx.fillText(p.desc.slice(0, 42), 120, py + 110);
      }
    });

    // 6. Bottom Disclaimer & Timestamp
    const bottomY = height - 90;
    ctx.fillStyle = "#64748b";
    ctx.font = "normal 24px -apple-system, sans-serif";
    ctx.fillText(`Data per ${report.dataAsOf || "Hari Ini"} • Ditelusuri dengan Telaah 360`, 80, bottomY);

    ctx.textAlign = "right";
    ctx.fillText("Bukan ajakan jual/beli (DYOR)", width - 80, bottomY);
    ctx.textAlign = "left";
  }, [isOpen, report, aspectRatio]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `Telaah360_${report.symbol}_${aspectRatio}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    } catch (e) {
      alert("Browser Anda belum mendukung salin gambar langsung. Silakan gunakan tombol Unduh.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-600 text-white">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Shareable Alpha Card ({report.symbol})
              </h3>
              <p className="text-[11px] text-slate-500">
                Infografis estetik untuk WhatsApp Story & Instagram
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ratio Selector */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setAspectRatio("story")}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              aspectRatio === "story"
                ? "bg-brand-600 text-white font-semibold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            Instagram Story (9:16)
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio("square")}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              aspectRatio === "square"
                ? "bg-brand-600 text-white font-semibold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            Persegi WhatsApp / Feed (1:1)
          </button>
        </div>

        {/* Canvas Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-slate-900/80">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[50vh] rounded-xl shadow-2xl border border-slate-800"
          />
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/60 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={handleCopyImage}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Tersalin ke Clipboard!" : "Salin Gambar"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Gambar (.PNG)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
