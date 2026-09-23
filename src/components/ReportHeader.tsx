"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Database,
  Share2,
  MessageSquare,
  Coins,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Star,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Flame,
  HelpCircle,
  Zap,
  Target,
  Lightbulb,
  Building2,
  DollarSign,
  Activity,
  Layers,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import { extractValuationMultiples } from "@/lib/sectors/types";
import { toggleWatchlist, isWatchlisted } from "@/lib/storage/history";
import { CompanyLogo } from "./CompanyLogo";
import { useI18n } from "@/lib/i18n/context";
import { AutoTranslateText } from "@/components/chat/AutoTranslateText";

interface ReportHeaderProps {
  report: CompanyIntelligenceReport;
  onOpenEvidence: () => void;
  onToggleCopilot?: () => void;
  onShare: () => void;
  onOpenTradingPlan?: () => void;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  report,
  onOpenEvidence,
  onToggleCopilot,
  onShare,
  onOpenTradingPlan,
}) => {
  const { t } = useI18n();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isRetailMode, setIsRetailMode] = useState(false);
  const [showIntegrityDetails, setShowIntegrityDetails] = useState(false);

  useEffect(() => {
    if (report?.symbol) {
      setInWatchlist(isWatchlisted(report.symbol));
    }
  }, [report?.symbol]);

  const handleToggleWatchlist = () => {
    if (!report?.symbol) return;
    const newState = toggleWatchlist(report.symbol);
    setInWatchlist(newState);
  };

  const multiples = extractValuationMultiples(report.valuation);
  const lastPrice = report.technical?.lastPrice || multiples.lastClosePrice;
  const dailyReturn = report.technical?.lastPrice
    ? (report.technical?.dailyReturnPct ?? 0)
    : (multiples.dailyChange ? multiples.dailyChange * 100 : 0);
  const isPositive = dailyReturn >= 0;
  const peRatio = multiples.pe;
  const pbvRatio = multiples.pb;
  const rsi = report.technical?.rsi14;
  const foreignVal = report.flowLens?.cohortSummary?.foreignNetValue;
  const foreignFlow = foreignVal
    ? `${foreignVal > 0 ? "+Rp " : "-Rp "}${Math.abs(foreignVal / 1e9).toFixed(1)}B`
    : report.flowLens?.status === "available"
    ? "Netral"
    : "-";

  const integrity = report.integrity;
  const score = integrity?.score ?? 85;
  const verdict = integrity?.verdict ?? "Fakta Solid";

  // Contextual Evaluation Helpers
  const getPeEvaluation = (pe: number | null | undefined) => {
    if (pe === null || pe === undefined) return { label: "N/A", color: "text-slate-400 bg-slate-100 dark:bg-slate-800" };
    if (pe <= 0) return { label: "Laba Negatif", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/50" };
    if (pe <= 15) return { label: "Murah / Terjangkau", color: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50" };
    if (pe <= 28) return { label: "Valuasi Wajar", color: "text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50" };
    return { label: "Valuasi Premium", color: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50" };
  };

  const getRsiEvaluation = (r: number | null | undefined) => {
    if (r === null || r === undefined) return { label: "N/A", color: "text-slate-400 bg-slate-100 dark:bg-slate-800" };
    if (r < 30) return { label: "Jenuh Jual (Oversold)", color: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50" };
    if (r > 70) return { label: "Jenuh Beli (Overbought)", color: "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50" };
    return { label: "Momentum Netral", color: "text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800" };
  };

  const peEval = getPeEvaluation(peRatio);
  const rsiEval = getRsiEvaluation(rsi);

  return (
    <div className="space-y-3">
      {/* Institutional Emiten Strip */}
      <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-slate-800/80 p-4 transition-colors shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/60">
          {/* Company ID & Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <CompanyLogo
              symbol={report.symbol}
              website={report.overview?.website}
              companyName={report.companyName}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate max-w-[200px] sm:max-w-md">
                  {report.companyName}
                </h2>
                <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                  IDX:{report.symbol}
                </span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 shrink-0">
                  {report.overview?.listing_board || "Papan Utama"}
                </span>

                {/* Red Flag & Integrity Score Meter Badge */}
                {integrity && (
                  <button
                    type="button"
                    onClick={() => setShowIntegrityDetails(!showIntegrityDetails)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition ${
                      verdict === "Fakta Solid"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                        : verdict === "Speculative Play"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20"
                    }`}
                  >
                    {verdict === "Fakta Solid" ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    ) : verdict === "Speculative Play" ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    <span>Radar: {score}/100</span>
                    <span className="text-[9px] uppercase tracking-wider font-semibold opacity-90">({verdict})</span>
                  </button>
                )}

                {/* Trading Plan Quick Badge */}
                {report.tradingPlan && onOpenTradingPlan && (
                  <button
                    type="button"
                    onClick={onOpenTradingPlan}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/20 transition"
                  >
                    <Target className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Plan: {report.tradingPlan.horizons[report.tradingPlan.bestFitHorizon].label}</span>
                    <span className="text-[9px] font-mono opacity-80">(1:{report.tradingPlan.horizons[report.tradingPlan.bestFitHorizon].rrr})</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                <span>{report.overview?.sector || "Sektor"}</span>
                <span>•</span>
                <span>{report.overview?.sub_sector || "Subsektor"}</span>
                {report.overview?.market_cap_rank && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      Rank #{report.overview.market_cap_rank}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Pricing & Performance */}
          <div className="flex items-start justify-between sm:justify-end gap-2.5 sm:gap-4 shrink-0 w-full sm:w-auto">
            <div className="text-right shrink-0">
              <button
                type="button"
                onClick={handleToggleWatchlist}
                title={inWatchlist ? "Hapus dari Watchlist" : "Simpan ke Watchlist"}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 mb-2 text-xs rounded border transition shrink-0 ${
                  inWatchlist
                    ? "bg-yellow-400/15 border-yellow-500/40 text-yellow-700 dark:text-yellow-400 font-semibold"
                    : "border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Star className={`w-3.5 h-3.5 shrink-0 ${inWatchlist ? "fill-yellow-400 text-yellow-500 dark:text-yellow-400" : ""}`} />
                <span>{inWatchlist ? "Tersimpan" : "Watchlist"}</span>
              </button>
              <div className="flex items-baseline gap-2 justify-end">
                <span className="text-xl sm:text-2xl font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {lastPrice ? `Rp ${lastPrice.toLocaleString("id-ID")}` : "-"}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-mono font-bold tabular-nums ${
                    isPositive
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositive ? "+" : ""}
                  {dailyReturn.toFixed(2)}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block">
                Terakhir: {report.dataAsOf}
              </span>
            </div>
          </div>
        </div>

        {/* Integrity Details Collapsible Card */}
        {showIntegrityDetails && integrity && (
          <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 animate-in fade-in space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Audit Radar Integritas & Red Flag ({report.symbol})
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Skor: {integrity.score}/100</span>
              </div>
              <button
                type="button"
                onClick={() => setShowIntegrityDetails(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Tutup
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {integrity.headline}: {integrity.retailSummary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {integrity.checks.map((c) => (
                <div
                  key={c.id}
                  className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-800 dark:text-slate-200">{c.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        c.status === "pass"
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                          : c.status === "warning"
                          ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                          : c.status === "danger"
                          ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {c.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced High-Density Key Metrics Grid with Contextual Micro-Evaluations */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3">
          {/* Market Cap */}
          <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 min-w-0 overflow-hidden flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans truncate">
              {t("metric.marketCap", "Kapitalisasi Pasar")}
            </span>
            <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums truncate block my-0.5">
              {report.overview?.market_cap
                ? `Rp ${(report.overview.market_cap / 1e12).toFixed(1)}T`
                : "-"}
            </span>
            <span className="text-[10px] text-slate-500 truncate block">
              {report.overview?.market_cap_rank ? `Peringkat #${report.overview.market_cap_rank}` : "Papan IDX"}
            </span>
          </div>

          {/* P/E Ratio with Status */}
          <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 min-w-0 overflow-hidden flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans truncate">
              {t("metric.pe", "P/E Ratio (Valuasi Laba)")}
            </span>
            <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums truncate block my-0.5">
              {peRatio ? `${peRatio.toFixed(1)}x` : "-"}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded w-fit ${peEval.color}`}>
              {peEval.label}
            </span>
          </div>

          {/* PBV Ratio */}
          <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 min-w-0 overflow-hidden flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans truncate">
              {t("metric.pbv", "PBV (Nilai Buku Aset)")}
            </span>
            <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums truncate block my-0.5">
              {pbvRatio ? `${pbvRatio.toFixed(2)}x` : "-"}
            </span>
            <span className="text-[10px] text-slate-500 truncate block">
              {pbvRatio && pbvRatio < 1.5 ? "Di Bawah Nilai Buku" : "Standar Industri"}
            </span>
          </div>

          {/* RSI Momentum */}
          <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 min-w-0 overflow-hidden flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans truncate">
              {t("metric.rsi", "RSI 14 (Momentum Harga)")}
            </span>
            <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums truncate block my-0.5">
              {rsi != null ? rsi.toFixed(1) : "-"}
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded w-fit ${rsiEval.color}`}>
              {rsiEval.label}
            </span>
          </div>

          {/* Foreign Flow */}
          <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 min-w-0 overflow-hidden flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans truncate">
              {t("metric.foreignFlow", "Arus Asing 5 Hari")}
            </span>
            <span className={`text-sm font-mono font-bold truncate block my-0.5 ${foreignVal && foreignVal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {foreignFlow || "Netral"}
            </span>
            <span className="text-[10px] text-slate-500 truncate block">
              {report.flowLens?.foreignFlow?.recentTrend || "Flow Netral"}
            </span>
          </div>

          {/* Action Tools & API Cost */}
          <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/60 min-w-0 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-sans">
              <span>{t("metric.actionAudit", "Aksi & Audit")}</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                {report.fromVectorCache ? "0 cr" : `${report.creditsConsumed} cr`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={onOpenEvidence}
                title="Lihat Bukti Data & Audit Trail"
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 transition"
              >
                <Database className="w-3.5 h-3.5" />
              </button>
              {onOpenTradingPlan && (
                <button
                  type="button"
                  onClick={onOpenTradingPlan}
                  title="Buka Trading & Investment Plan"
                  aria-label="Open Trading Plan"
                  className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
                >
                  <Target className="w-3.5 h-3.5" />
                </button>
              )}
              {onToggleCopilot && (
                <button
                  type="button"
                  onClick={onToggleCopilot}
                  title="Buka Copilot Emiten Ini"
                  aria-label="Toggle Copilot"
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onShare}
                title="Bagikan Alpha Card"
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 4-Pillar Decision Deck: "Peta 3-Detik Keputusan Investasi" */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Pilar 1: Kesehatan Bisnis & Laba */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 shadow-2xs space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="shrink-0 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t("pillar.health", "1. Kesehatan Bisnis")}
              </span>
            </div>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              integrity?.riskCount.danger === 0
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
            }`}>
              {integrity?.riskCount.danger === 0 ? "Laba Riil Kuat" : "Perlu Pantauan"}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
            {report.financials?.solvencyHealth?.description || "Arus kas operasi positif dan menopang pertumbuhan bisnis."}
          </p>
        </div>

        {/* Pilar 2: Valuasi & Kemurahan Harga */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 shadow-2xs space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="shrink-0 p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t("pillar.valuation", "2. Kewajaran Valuasi")}
              </span>
            </div>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${peEval.color}`}>
              {peEval.label.split(" ")[0]}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
            {peRatio ? `PER ${peRatio.toFixed(1)}x dan PBV ${pbvRatio ? pbvRatio.toFixed(1) + "x" : "-"} terhadap rata-rata emiten sejenis.` : "Valuasi pasar stabil."}
          </p>
        </div>

        {/* Pilar 3: Arus Bandar & Asing */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 shadow-2xs space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="shrink-0 p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t("pillar.bandar", "3. Bandar & Asing")}
              </span>
            </div>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              report.flowLens?.bandarmologySummary?.phase.includes("Akumulasi")
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                : report.flowLens?.bandarmologySummary?.phase.includes("Distribusi")
                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}>
              {report.flowLens?.bandarmologySummary?.phase.split(" ")[0] || "Netral"}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
            {report.flowLens?.bandarmologySummary?.topBuyersAvgPrice
              ? `Avg modal borongan top buyer di Rp ${report.flowLens.bandarmologySummary.topBuyersAvgPrice.toLocaleString("id-ID")}.`
              : `Arus asing 5 hari: ${foreignFlow}.`}
          </p>
        </div>

        {/* Pilar 4: Rencana Trading & Eksekusi */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 shadow-2xs space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="shrink-0 p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Target className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t("pillar.plan", "4. Trading Plan")}
              </span>
            </div>
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
              {report.tradingPlan ? report.tradingPlan.horizons[report.tradingPlan.bestFitHorizon].label : "Optimal"}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
            {report.tradingPlan
              ? `RRR 1:${report.tradingPlan.horizons[report.tradingPlan.bestFitHorizon].rrr} • SL ${report.tradingPlan.horizons[report.tradingPlan.bestFitHorizon].stopLossPct}% • TP1 +${report.tradingPlan.horizons[report.tradingPlan.bestFitHorizon].target1Pct}%`
              : "Disiplin gunakan batasan stop loss terukur."}
          </p>
        </div>
      </div>

      {/* Executive Thesis & Direct Answer Strip with ELIR Retail Toggle */}
      <div className="bg-slate-950 text-white rounded-2xl border border-slate-800 p-4 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-slate-300 uppercase tracking-wider font-bold">
              {isRetailMode ? t("thesis.retailTitle", "Intisari Bahasa Ritel Unyu (ELIR)") : t("thesis.title", "Executive Thesis & Kesimpulan Riset")}
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsRetailMode(!isRetailMode)}
              className={`px-3 py-1 rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 transition ${
                isRetailMode
                  ? "bg-amber-500 text-black shadow-xs font-black"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isRetailMode ? t("thesis.switchRetail", "Mode: Ritel Santai") : t("thesis.switchFormal", "Ganti: Mode Ritel")}</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-200 leading-relaxed space-y-2">
          {isRetailMode ? (
            <div className="space-y-2 bg-slate-900/90 p-3.5 rounded-xl border border-amber-500/30 text-amber-100">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs sm:text-sm">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Terjemahan Bahasa Warung Kopi:</span>
              </div>
          <div className="text-xs sm:text-[13px] leading-relaxed text-white">
            <AutoTranslateText text={integrity?.retailSummary || report.directAnswer} className="text-white" />
          </div>
              {report.flowLens?.bandarmologySummary && (
                <div className="text-[11px] text-amber-200/90 pt-2 border-t border-amber-500/20 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Status Bandar: <strong>{report.flowLens.bandarmologySummary.phase}</strong> ({report.flowLens.bandarmologySummary.controllingCohort}). {report.flowLens.bandarmologySummary.topBuyersAvgPrice > 0 ? `Avg borongan mereka di Rp ${report.flowLens.bandarmologySummary.topBuyersAvgPrice.toLocaleString("id-ID")}.` : ""}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="font-semibold text-white text-xs sm:text-[13px] leading-relaxed">
                <AutoTranslateText text={report.directAnswer} className="text-white font-medium" />
              </div>
              {report.executiveSummary && report.executiveSummary !== report.directAnswer && (
                <div className="text-[11px] text-slate-200 leading-relaxed pt-1.5 border-t border-slate-800">
                  <AutoTranslateText text={report.executiveSummary} className="text-slate-200" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
