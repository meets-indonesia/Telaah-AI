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

interface StockInlineArtifactProps {
  report: CompanyIntelligenceReport;
  onOpenEvidence?: () => void;
  onOpenQA?: () => void;
  onShare?: () => void;
}

export const StockInlineArtifact: React.FC<StockInlineArtifactProps> = ({
  report,
  onOpenEvidence = () => {},
  onOpenQA = () => {},
  onShare = () => {},
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "technical" | "insider" | "all">("overview");

  const isCommodity = report?.commodityLens?.isCommodityIssuer;

  return (
    <div className="w-full my-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black overflow-hidden shadow-sm transition-all duration-200">
      {/* 1. Header Ringkas Profil Emiten & Metrik Utama */}
      <ReportHeader
        report={report}
        onOpenEvidence={onOpenEvidence}
        onOpenQA={onOpenQA}
        onShare={onShare}
      />

      {/* 2. Tombol Accordion Buka Modul Lengkap (Financials, FlowLens, Peers, Events) */}
      <div className="border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
          {isExpanded
            ? "Menampilkan seluruh modul riset bursa resmi:"
            : "Data laporan bursa lengkap (FlowLens, Finansial, Peer, Timeline) tersedia."}
        </span>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-white dark:bg-black border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 hover:border-orange-500/50 hover:text-orange-400 transition"
        >
          <span>{isExpanded ? "Sembunyikan Modul Rinci" : "Buka Modul Riset Lengkap"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 3. Area Modul Terbuka (Accordion) */}
      {isExpanded && (
        <div className="p-4 space-y-4 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-black">
          {/* Workstation Tab Bar */}
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-1 rounded-md flex items-center gap-1 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                activeTab === "overview"
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-orange-400" />
              <span>Ringkasan & Finansial</span>
            </button>

            <button
              onClick={() => setActiveTab("technical")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                activeTab === "technical"
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
              <span>Terminal Teknikal</span>
            </button>

            <button
              onClick={() => setActiveTab("insider")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                activeTab === "insider"
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-white"
              }`}
            >
              <Radar className="w-3.5 h-3.5 text-orange-400" />
              <span>Whale & Broker Flow</span>
            </button>

            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                activeTab === "all"
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-orange-400" />
              <span>Semua Modul</span>
            </button>
          </div>

          {/* Konten Tab */}
          {(activeTab === "overview" || activeTab === "all") && (
            <div className="space-y-4">
              <FlowLensModule flowLens={report.flowLens} />
              <FinancialModule financials={report.financials} />
              <PeerLensModule peerLens={report.peerLens} valuation={report.valuation} symbol={report.symbol} />
              <EventsModule events={report.events} openQuestions={report.openQuestions} limitations={report.limitations} />
            </div>
          )}

          {(activeTab === "technical" || activeTab === "all") && (
            <div className="space-y-4">
              <TechnicalModule technical={report.technical} symbol={report.symbol} companyName={report.companyName} />
            </div>
          )}

          {(activeTab === "insider" || activeTab === "all") && (
            <div className="space-y-4">
              <InsiderWhaleRadar insiderRadar={report.insiderRadar} symbol={report.symbol} />
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
