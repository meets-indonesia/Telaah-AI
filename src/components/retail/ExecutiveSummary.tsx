"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/context";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import { extractValuationMultiples } from "@/lib/sectors/types";
import { extractDividendInfo } from "@/lib/quant/dividends";
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Crosshair,
  Calculator,
  Sparkles,
  BarChart3,
  Scale,
  Users,
} from "lucide-react";

interface ExecutiveSummaryProps {
  report: CompanyIntelligenceReport;
  onOpenTradingPlan?: () => void;
  onOpenDividendCalc?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  report,
  onOpenTradingPlan,
  onOpenDividendCalc,
  onNavigateTab,
}) => {
  const { t } = useI18n();
  const { symbol, companyName, financials, flowLens, valuation, technical, integrity, tradingPlan } = report;

  // Key derived values
  const hasFinancials = Boolean(financials?.latest);
  const yoyLaba = hasFinancials ? financials?.yoyGrowth?.netIncomePct : null;
  const isNetCash = financials?.solvencyHealth?.hasNetCash;
  const isLabaGrowing = hasFinancials && yoyLaba !== null && yoyLaba !== undefined && yoyLaba > 0;
  const topBuyers = flowLens?.topBuyers || [];
  const totalBuyerVal = topBuyers.slice(0, 3).reduce((acc: number, b) => acc + b.netValue, 0);
  const hasBrokerSummary = topBuyers.length > 0;
  const isAccumulated = hasBrokerSummary && totalBuyerVal > 0;
  const dividendInfo = extractDividendInfo(report);

  // Valuation
  const multiples = valuation ? extractValuationMultiples(valuation) : null;
  const peVal = valuation?.current_pe ?? multiples?.pe ?? null;
  const pbVal = valuation?.current_pb ?? multiples?.pb ?? null;
  const divYieldPct = dividendInfo.yieldPct;

  return (
    <div className="space-y-4">
      {/* 1. HERO VERDICT & CORE TAKEAWAY */}
      <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                RINGKASAN EKSEKUTIF
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {companyName} ({symbol})
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {!hasFinancials
                ? "Data Fundamental Terbatas, Fokus pada Teknikal & Risiko"
                : isLabaGrowing && isAccumulated
                  ? "Fundamental Sehat dengan Dukungan Akumulasi Whale"
                  : isLabaGrowing
                    ? "Pertumbuhan Fundamental Kuat, Pantau Titik Beli Teknikal"
                    : isAccumulated
                      ? "Fase Akumulasi Bandar, Cek Ketahanan Fundamental"
                      : "Momentum Konsolidasi, Disarankan Disiplin Risk Management"}
            </h2>
          </div>

          {/* Quick Score Pill */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2.5 px-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 text-right">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Skor Integritas Data</span>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                  {integrity?.score ?? 0}/100
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 3-PILLAR SNAPSHOT STRIP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 pt-4">
          {/* Fundamental Pillar */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-zinc-800/60 space-y-1.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="min-w-0 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 shrink-0 text-blue-500" />
                Kesehatan Bisnis
              </span>
              <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${isLabaGrowing ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                {isLabaGrowing ? "Laba Tumbuh" : "Melambat"}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {hasFinancials ? (
                <>
                  Laba YoY: <strong className="text-slate-900 dark:text-white">{yoyLaba != null ? `${yoyLaba.toFixed(1)}%` : "-"}</strong>. Struktur modal {isNetCash ? "sangat aman (Net Cash)." : "terkendali."}
                </>
              ) : (
                "Laporan keuangan rinci belum tersedia; kesehatan bisnis belum dapat diverifikasi."
              )}
            </p>
            <button
              onClick={() => onNavigateTab?.("financials")}
              type="button"
              className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 pt-1"
            >
              Lihat Laporan Keuangan <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Bandarmology Pillar */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-zinc-800/60 space-y-1.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="min-w-0 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 shrink-0 text-emerald-500" />
                Arus Bandar
              </span>
              <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${isAccumulated ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-500/10 text-slate-600 dark:text-slate-400"}`}>
                {isAccumulated ? "Akumulasi" : "Netral"}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {hasBrokerSummary
                ? <>Top buyer menyerap <strong className="text-slate-900 dark:text-white">Rp {(Math.abs(totalBuyerVal) / 1e9).toFixed(1)} Miliar</strong> pada rentang harga saat ini.</>
                : "Broker summary belum aktif: IPOT sedang down dan Stockbit belum dikonfigurasi. FlowLens hanya menampilkan foreign flow."}
            </p>
            <button
              onClick={() => onNavigateTab?.("flow")}
              type="button"
              className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 pt-1"
            >
              Lihat Analisis Bandar <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Valuation Pillar */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-zinc-800/60 space-y-1.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="min-w-0 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Scale className="w-4 h-4 shrink-0 text-amber-500" />
                Valuasi Harga
              </span>
              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                P/E: {peVal ? `${peVal.toFixed(1)}x` : "-"}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              PBV tercatat <strong className="text-slate-900 dark:text-white">{pbVal ? `${pbVal.toFixed(1)}x` : "-"}</strong> dengan yield dividen {divYieldPct ? `${divYieldPct.toFixed(1)}%` : "-"}.
            </p>
            <button
              onClick={() => onNavigateTab?.("peers")}
              type="button"
              className="text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 pt-1"
            >
              Bandingkan Rekan Sektor <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. KEY HIGHLIGHTS: APA YANG HARUS DIKETAHUI INVESTOR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Poin Positif / Katalis */}
        <div className="p-4 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
            <Sparkles className="w-4 h-4" />
            <span>Kekuatan Utama & Sinyal Positif</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            {hasFinancials && financials?.periods?.[0]?.operatingMarginPct ? (
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>
                  <strong>Kinerja Operasional:</strong> Margin laba operasional {financials.periods[0].operatingMarginPct}% menunjukkan kontrol beban yang baik.
                </span>
              </li>
            ) : (
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                <span>Data margin operasional belum tersedia; tidak ada klaim positif yang dibuat.</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${hasFinancials ? "bg-emerald-500" : "bg-slate-400"}`} />
              <span>
                <strong>Kekuatan Neraca:</strong>{" "}
                {financials?.solvencyHealth?.description ||
                  (hasFinancials
                    ? "Struktur permodalan terkendali tanpa risiko gagal bayar mendesak."
                    : "Data neraca belum tersedia; belum dapat diverifikasi.")}
              </span>
            </li>
            {divYieldPct !== null && divYieldPct > 2 && (
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>
                  <strong>Dividen Rutin:</strong> Estimasi yield {divYieldPct.toFixed(1)}% per tahun memberi safety net arus kas.
                </span>
              </li>
            )}
          </ul>
        </div>

        {/* Hal yang Perlu Diwaspadai */}
        <div className="p-4 rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Faktor Risiko & Hal yang Perlu Dipantau</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <span>
                <strong>Level Kunci:</strong> Area support kunci di Rp {(tradingPlan?.supports?.s1 ?? technical?.sma20 ?? 0).toLocaleString("id-ID")} sebagai batas proteksi modal.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <span>
                <strong>Momentum Indikator:</strong> RSI 14 berada di level {technical?.rsi14 ? Number(technical.rsi14).toFixed(1) : "-"} (tren {technical?.trendAssessment ?? "Netral"}).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <span>
                <strong>Rotasi Sektoral:</strong> Perhatikan volume transaksi harian untuk memastikan likuiditas memadai saat eksekusi beli/jual.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* 4. FAST ACTION CENTER: TRADING PLAN & TOOLS */}
      <div className="p-4 rounded-xl bg-black dark:bg-linear-to-r dark:from-slate-900 dark:to-slate-800 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-md">
        <div className="min-w-0 flex-1 space-y-0.5 text-left">
          <div className="flex items-center justify-start gap-2">
            <Crosshair className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="font-bold text-xs text-white leading-snug">
              {t("summary.readyTitle", "Siap Eksekusi? Gunakan Trading Plan & Kalkulator")}
            </h3>
          </div>
          <p className="text-[11px] text-slate-300 max-w-md leading-snug">
            {t("summary.readySubtitle", "Dapatkan area beli ideal, batas cut loss, target profit multi-horizon, dan simulasi alokasi lot otomatis.")}
          </p>
        </div>

        <div className="flex w-full sm:w-auto max-w-full flex-col items-stretch sm:items-end gap-1.5">
          <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
            {report.tradingPlan && onOpenTradingPlan && (
              <button
                onClick={onOpenTradingPlan}
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition shadow-2xs"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>{t("summary.openTradingPlan", "Buka Trading Plan")}</span>
              </button>
            )}

            {dividendInfo.hasDividend && onOpenDividendCalc && (
              <button
                onClick={onOpenDividendCalc}
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-black font-semibold text-xs border border-white transition"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>{t("summary.openDividend", "Kalkulator Dividen")}</span>
              </button>
            )}
          </div>

          {!dividendInfo.hasDividend && (
            <span
              className="text-[10px] leading-snug text-slate-400 text-left sm:text-right"
              title="Emiten ini belum membagikan dividen pada data yang tersedia."
            >
              Kalkulator dividen tidak tersedia
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
