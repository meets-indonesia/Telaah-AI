"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  TrendingUp,
  Radar,
  FileSpreadsheet,
  ExternalLink,
  Star,
  Sparkles,
  BarChart3,
  Scale,
} from "lucide-react";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import { FlowLensModule } from "@/components/FlowLensModule";
import { FinancialModule } from "@/components/FinancialModule";
import { TechnicalModule } from "@/components/TechnicalModule";
import { PeerLensModule } from "@/components/PeerLensModule";
import { EventsModule } from "@/components/EventsModule";
import { InsiderWhaleRadar } from "@/components/InsiderWhaleRadar";
import { CommodityLensModule } from "@/components/CommodityLensModule";
import { ReportHeader } from "@/components/ReportHeader";
import { ExecutiveSummary } from "@/components/retail/ExecutiveSummary";

interface StockInlineArtifactProps {
  report: CompanyIntelligenceReport;
  onOpenEvidence?: () => void;
  onToggleCopilot?: () => void;
  onShare?: () => void;
  onOpenTradingPlan?: () => void;
  onOpenDividendCalc?: () => void;
}

export const StockInlineArtifact: React.FC<StockInlineArtifactProps> = ({
  report,
  onOpenEvidence = () => {},
  onToggleCopilot = () => {},
  onShare = () => {},
  onOpenTradingPlan = () => {},
  onOpenDividendCalc = () => {},
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "financials" | "flow" | "technical" | "peers" | "all">("overview");

  const isCommodity = report?.commodityLens?.isCommodityIssuer;

  return (
    <div className="w-full my-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black overflow-hidden shadow-sm transition-all duration-200">
      {/* 1. Header Ringkas Profil Emiten & Metrik Utama */}
      <ReportHeader
        report={report}
        onOpenEvidence={onOpenEvidence}
        onToggleCopilot={onToggleCopilot}
        onShare={onShare}
        onOpenTradingPlan={onOpenTradingPlan}
      />

      {/* 2. Toggle Bar Modul Rinci */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {isExpanded ? "Navigasi Modul Terbuka" : "Eksplorasi Modul Finansial, Bandar & Teknikal"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-white dark:bg-black border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 hover:border-zinc-500 hover:text-zinc-950 transition"
        >
          <span>{isExpanded ? "Tutup Rincian Modul" : "Buka Modul Riset Lengkap"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 3. Area Modul Terbuka (Accordion) */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-black">
          {/* Workstation Tab Bar */}
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1 rounded-xl flex items-center gap-1 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setActiveTab("overview")}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === "overview"
                  ? "bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 font-bold shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Ringkasan Cepat</span>
            </button>

            <button
              onClick={() => setActiveTab("financials")}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === "financials"
                  ? "bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 font-bold shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Fundamental</span>
            </button>

            <button
              onClick={() => setActiveTab("flow")}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === "flow"
                  ? "bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 font-bold shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-white"
              }`}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>Bandar Flow</span>
            </button>

            <button
              onClick={() => setActiveTab("technical")}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === "technical"
                  ? "bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 font-bold shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-zinc-200" />
              <span>Teknikal</span>
            </button>

            <button
              onClick={() => setActiveTab("peers")}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === "peers"
                  ? "bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 font-bold shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-white"
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Rekan Sektor</span>
            </button>

            <button
              onClick={() => setActiveTab("all")}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === "all"
                  ? "bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 font-bold shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-200" />
              <span>Semua Modul</span>
            </button>
          </div>

          {/* Konten Tab */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <ExecutiveSummary
                report={report}
                onOpenTradingPlan={onOpenTradingPlan}
                onOpenDividendCalc={onOpenDividendCalc}
                onNavigateTab={(tabKey) => {
                  if (tabKey === "financials") setActiveTab("financials");
                  else if (tabKey === "flow") setActiveTab("flow");
                  else if (tabKey === "peers") setActiveTab("peers");
                  else if (tabKey === "technical") setActiveTab("technical");
                }}
              />
            </div>
          )}

          {(activeTab === "financials" || activeTab === "all") && (
            <div className="space-y-4">
              <FinancialModule financials={report.financials} />
            </div>
          )}

          {(activeTab === "flow" || activeTab === "all") && (
            <div className="space-y-4">
              <FlowLensModule flowLens={report.flowLens} />
              <InsiderWhaleRadar insiderRadar={report.insiderRadar} symbol={report.symbol} />
            </div>
          )}

          {(activeTab === "technical" || activeTab === "all") && (
            <div className="space-y-4">
              <TechnicalModule technical={report.technical} symbol={report.symbol} companyName={report.companyName} />
            </div>
          )}

          {(activeTab === "peers" || activeTab === "all") && (
            <div className="space-y-4">
              <PeerLensModule peerLens={report.peerLens} valuation={report.valuation} symbol={report.symbol} />
              <EventsModule events={report.events} openQuestions={report.openQuestions} limitations={report.limitations} />
            </div>
          )}

          {(activeTab === "all") && isCommodity && (
            <div className="space-y-4">
              <CommodityLensModule
                commodityLens={report.commodityLens!}
                symbol={report.symbol}
                companyName={report.companyName}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
