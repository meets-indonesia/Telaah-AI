"use client";

import React, { useRef, useEffect, useState } from "react";
import { Download, Copy, Check, X, Sparkles, Image as ImageIcon, Share2, ShieldAlert, ShieldCheck, Flame } from "lucide-react";
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
  const [aspectRatio, setAspectRatio] = useState<"story" | "landscape" | "square">("story");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !report) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dimensions based on aspect ratio
    let width = 1080;
    let height = 1920; // default 9:16
    if (aspectRatio === "landscape") {
      width = 1200;
      height = 675; // 16:9
    } else if (aspectRatio === "square") {
      width = 1080;
      height = 1080; // 1:1
    }

    canvas.width = width;
    canvas.height = height;

    // Background Gradient (Deep Navy / Charcoal FinTech look)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#080e1a");
    bgGrad.addColorStop(0.5, "#0d1527");
    bgGrad.addColorStop(1, "#030712");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle neon glow accents
    const glow1 = ctx.createRadialGradient(width * 0.9, height * 0.1, 10, width * 0.9, height * 0.1, 500);
    glow1.addColorStop(0, "rgba(59, 130, 246, 0.25)");
    glow1.addColorStop(1, "rgba(59, 130, 246, 0)");
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, height);

    const glow2 = ctx.createRadialGradient(width * 0.1, height * 0.9, 10, width * 0.1, height * 0.9, 450);
    glow2.addColorStop(0, "rgba(16, 185, 129, 0.15)");
    glow2.addColorStop(1, "rgba(16, 185, 129, 0)");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, width, height);

    // Frame stroke
    ctx.strokeStyle = "rgba(59, 130, 246, 0.25)";
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // 1. Top Brand Header
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px -apple-system, sans-serif";
    ctx.fillText("TELAAH 360", 70, aspectRatio === "landscape" ? 80 : 120);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 22px -apple-system, sans-serif";
    ctx.fillText("AI MARKET INTELLIGENCE • SECTORS API v2", 70, aspectRatio === "landscape" ? 115 : 165);

    // 2. Main Emiten Hero Box
    const boxY = aspectRatio === "landscape" ? 150 : 220;
    const boxHeight = aspectRatio === "landscape" ? 160 : 250;

    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(70, boxY, width - 140, boxHeight);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(70, boxY, width - 140, boxHeight);

    // Symbol
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 90px -apple-system, sans-serif";
    ctx.fillText(report.symbol, 105, boxY + (aspectRatio === "landscape" ? 85 : 110));

    // Company Name & Sector
    ctx.fillStyle = "#94a3b8";
    ctx.font = "normal 30px -apple-system, sans-serif";
    const truncatedName = report.companyName.length > 28 ? report.companyName.slice(0, 26) + "..." : report.companyName;
    ctx.fillText(truncatedName, 105, boxY + (aspectRatio === "landscape" ? 130 : 165));

    // Price & Return on right
    ctx.textAlign = "right";
    const priceStr = `Rp ${(report.technical?.lastPrice || 0).toLocaleString("id-ID")}`;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 58px -apple-system, sans-serif";
    ctx.fillText(priceStr, width - 105, boxY + (aspectRatio === "landscape" ? 80 : 100));

    const changePct = report.technical?.dailyReturnPct || 0;
    const changeStr = `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;
    ctx.fillStyle = changePct >= 0 ? "#10b981" : "#f43f5e";
    ctx.font = "bold 38px -apple-system, sans-serif";
    ctx.fillText(changeStr, width - 105, boxY + (aspectRatio === "landscape" ? 130 : 160));
    ctx.textAlign = "left";

    // 3. Integrity Score & Red Flag Badge
    const integrity = report.integrity;
    const score = integrity?.score ?? 85;
    const verdict = integrity?.verdict ?? "Fakta Solid";
    const badgeY = boxY + boxHeight + 30;

    let badgeColor = "#10b981"; // green
    if (verdict === "Red Flag Alert") badgeColor = "#f43f5e";
    else if (verdict === "Speculative Play") badgeColor = "#f59e0b";

    ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
    ctx.fillRect(70, badgeY, width - 140, 75);
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(70, badgeY, width - 140, 75);

    ctx.fillStyle = badgeColor;
    ctx.font = "bold 28px -apple-system, sans-serif";
    ctx.fillText(`INTEGRITAS RADAR: ${score}/100 (${verdict.toUpperCase()})`, 100, badgeY + 48);

    ctx.textAlign = "right";
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "normal 24px -apple-system, sans-serif";
    const phaseLabel = report.flowLens?.bandarmologySummary?.phase || "Flow Netral";
    ctx.fillText(`Bandarmology: ${phaseLabel}`, width - 100, badgeY + 48);
    ctx.textAlign = "left";

    // 4. Executive Direct Answer / Retail Summary
    const summaryY = badgeY + 110;
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 26px -apple-system, sans-serif";
    ctx.fillText("KESIMPULAN INTELIJEN PASAR:", 70, summaryY);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "normal 30px -apple-system, sans-serif";

    const textToWrap = integrity?.retailSummary || report.directAnswer;
    const words = textToWrap.split(" ");
    let line = "";
    let lineY = summaryY + 50;
    const maxLines = aspectRatio === "story" ? 5 : aspectRatio === "square" ? 3 : 2;
    let linesCount = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > width - 160 && n > 0) {
        ctx.fillText(line, 70, lineY);
        line = words[n] + " ";
        lineY += 45;
        linesCount++;
        if (linesCount >= maxLines) {
          line += "...";
          break;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 70, lineY);

    // 5. 3 Pillar Cards (Only in Story & Square mode)
    if (aspectRatio !== "landscape") {
      const multiples = extractValuationMultiples(report.valuation);
      const pe = multiples.pe ?? report.peerLens?.peers?.find((p) => p.isTarget)?.pe;
      const pb = multiples.pb ?? report.peerLens?.peers?.find((p) => p.isTarget)?.pb;
      const avgBuy = report.flowLens?.bandarmologySummary?.topBuyersAvgPrice;

      const pillars = [
        {
          title: "VALUASI EMITEN",
          value: `PER ${pe ? pe.toFixed(1) + "x" : "-"} • PBV ${pb ? pb.toFixed(2) + "x" : "-"}`,
          accent: "#38bdf8",
        },
        {
          title: "BANDARMOLOGY & ASING",
          value: avgBuy ? `Avg Borongan Top Buyer @ Rp ${avgBuy.toLocaleString("id-ID")}` : (report.flowLens?.foreignFlow?.recentTrend || "Flow Netral"),
          accent: "#10b981",
        },
        {
          title: "STATUS NERACA / UTANG",
          value: report.financials?.solvencyHealth?.description || "Kondisi modal stabil",
          accent: "#f59e0b",
        },
      ];

      const pillarStartY = lineY + 70;
      const cardHeight = aspectRatio === "story" ? 130 : 100;

      pillars.forEach((p, idx) => {
        const py = pillarStartY + idx * (cardHeight + 20);
        if (py + cardHeight < height - 120) {
          ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
          ctx.fillRect(70, py, width - 140, cardHeight);
          ctx.strokeStyle = "rgba(51, 65, 85, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(70, py, width - 140, cardHeight);

          ctx.fillStyle = p.accent;
          ctx.font = "bold 24px -apple-system, sans-serif";
          ctx.fillText(p.title, 100, py + 42);

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 28px -apple-system, sans-serif";
          ctx.fillText(p.value.slice(0, 48), 100, py + 88);
        }
      });
    }

    // 6. Bottom Footer & Disclaimer
    const bottomY = height - 60;
    ctx.fillStyle = "#64748b";
    ctx.font = "normal 22px -apple-system, sans-serif";
    ctx.fillText(`Data per ${report.dataAsOf || "Hari Ini"} • Telaah-AI by Sectors API`, 70, bottomY);

    ctx.textAlign = "right";
    ctx.fillText("Bukan Rekomendasi Jual/Beli • DYOR", width - 70, bottomY);
    ctx.textAlign = "left";
  }, [isOpen, report, aspectRatio]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `Telaah_AlphaCard_${report.symbol}_${aspectRatio}.png`;
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
    } catch {
      alert("Browser Anda belum mendukung salin gambar langsung. Silakan gunakan tombol Unduh.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500 text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Shareable Alpha Card ({report.symbol})
              </h3>
              <p className="text-[11px] text-slate-500">
                Infografis modern & estetik untuk Instagram Story, Twitter/X, & WhatsApp
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
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              aspectRatio === "story"
                ? "bg-sky-500 text-white font-bold shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            IG Story (9:16)
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio("landscape")}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              aspectRatio === "landscape"
                ? "bg-sky-500 text-white font-bold shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            Twitter / X (16:9)
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio("square")}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              aspectRatio === "square"
                ? "bg-sky-500 text-white font-bold shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            Feed Persegi (1:1)
          </button>
        </div>

        {/* Canvas Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-slate-900/90">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[50vh] rounded-2xl shadow-2xl border border-slate-800"
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Gambar (.PNG)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
