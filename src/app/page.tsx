"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { InputStation } from "@/components/InputStation";
import { ReportHeader } from "@/components/ReportHeader";
import { ClaimCards } from "@/components/ClaimCards";
import { FlowLensModule } from "@/components/FlowLensModule";
import { FinancialModule } from "@/components/FinancialModule";
import { TechnicalModule } from "@/components/TechnicalModule";
import { PeerLensModule } from "@/components/PeerLensModule";
import { EventsModule } from "@/components/EventsModule";
import { InsiderWhaleRadar } from "@/components/InsiderWhaleRadar";
import { CommodityLensModule } from "@/components/CommodityLensModule";
import { HarmonicPRZModule } from "@/components/HarmonicPRZModule";
import { HistoryWatchlistBar } from "@/components/HistoryWatchlistBar";
import { EvidenceDrawer } from "@/components/EvidenceDrawer";
import { ReportQADrawer } from "@/components/ReportQADrawer";
import { ShareModal } from "@/components/ShareModal";
import { AnalysisMode, CompanyIntelligenceReport } from "@/lib/agent/types";
import { saveReportToHistory, getHistory, getReportFromCache } from "@/lib/storage/history";
import {
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  LayoutDashboard,
  CandlestickChart as CandleIcon,
  Radar,
  Pickaxe,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Flame,
  Globe2,
  Compass,
} from "lucide-react";

type DashboardTab = "overview" | "harmonic" | "technical" | "insider" | "commodity" | "all";

export default function Home() {
  const [report, setReport] = useState<CompanyIntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dashboard Active Tab
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [watchlistItems, setWatchlistItems] = useState<Array<{ symbol: string; companyName: string; lastPrice?: number }>>([]);

  // Ambiguity confirmation state
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [candidateSymbol, setCandidateSymbol] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [pendingMode, setPendingMode] = useState<AnalysisMode>("full");

  // Drawers & Modals
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isQAOpen, setIsQAOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);

  // Trigger from example pills
  const [promptValue, setPromptValue] = useState("");
  const [modeValue, setModeValue] = useState<AnalysisMode>("full");

  // Live Market Ribbon state
  const [marketIndices, setMarketIndices] = useState<Array<{ name: string; code: string; price: string; change: string; isPositive: boolean; unit?: string }>>([
    { name: "IHSG", code: "COMPOSITE", price: "6.541,4", change: "-0.73%", isPositive: false },
    { name: "Brent Crude", code: "BRENT", price: "$109.80", change: "+2.85%", isPositive: true, unit: "/barel" },
    { name: "USD/IDR", code: "USDIDR", price: "Rp 17.585", change: "+0.45%", isPositive: false },
    { name: "Newcastle Coal", code: "COAL", price: "$148.50", change: "+1.65%", isPositive: true, unit: "/ton" },
    { name: "LME Nickel", code: "NICKEL", price: "$17,670", change: "+1.20%", isPositive: true, unit: "/ton" },
    { name: "COMEX Gold", code: "GOLD", price: "$2,742.5", change: "+1.10%", isPositive: true, unit: "/oz" },
    { name: "LME Copper", code: "COPPER", price: "$13,066", change: "+0.85%", isPositive: true, unit: "/ton" },
  ]);
  const [marketAsOfDate, setMarketAsOfDate] = useState<string>("2026-09-11");

  // Fetch live market overview from Sectors API on mount
  useEffect(() => {
    fetch("/api/market-overview")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.indices)) {
          setMarketIndices(data.indices);
          if (data.asOfDate) setMarketAsOfDate(data.asOfDate);
        }
      })
      .catch(() => {});
  }, []);

  // Initial load: restore latest viewed report if available
  useEffect(() => {
    const history = getHistory();
    if (history.length > 0) {
      setWatchlistItems(history.map(h => ({ symbol: h.symbol, companyName: h.companyName, lastPrice: h.lastPrice })));
      if (!report) {
        const latest = getReportFromCache(history[0].symbol);
        if (latest) {
          setReport(latest);
        }
      }
    }
  }, []);

  const handleSelectExample = (prompt: string, mode: AnalysisMode) => {
    setPromptValue(prompt);
    setModeValue(mode);
    executeAnalysis(prompt, mode);
  };

  const handleQuickEmiten = (symbol: string, promptText: string) => {
    // Check local cache first for 0-credit instant load
    const cached = getReportFromCache(symbol);
    if (cached) {
      setReport(cached);
      setErrorMessage(null);
      setNeedsConfirmation(false);
      return;
    }

    setPromptValue(promptText);
    setModeValue("full");
    executeAnalysis(promptText, "full", symbol);
  };

  const executeAnalysis = async (prompt: string, mode: AnalysisMode, confirmedSymbol?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setNeedsConfirmation(false);

    setLoadingStage("Menganalisis intensi & mengekstrak klaim atomik...");

    try {
      const stageTimer1 = setTimeout(() => {
        setLoadingStage("Mengambil data resmi Sectors API v2 (Financials, Flow, Price, Filings)...");
      }, 1500);

      const stageTimer2 = setTimeout(() => {
        setLoadingStage("Menghitung indikator teknikal & rasio keuangan deterministik...");
      }, 3500);

      const stageTimer3 = setTimeout(() => {
        setLoadingStage("Sintesis laporan Telaah 360 & verifikasi bukti citation guard...");
      }, 5500);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mode,
          confirmedSymbol,
        }),
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan telaah emiten.");
      }

      if (data.needsConfirmation) {
        setNeedsConfirmation(true);
        setCandidateSymbol(data.candidateSymbol || "");
        setPendingPrompt(prompt);
        setPendingMode(mode);
        setIsLoading(false);
        return;
      }

      if (data.report) {
        setReport(data.report);
        saveReportToHistory(data.report);

        // Auto switch to commodity tab if commodity issuer
        if (data.report.commodityLens?.isCommodityIssuer) {
          // Keep on overview or let user navigate
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat memproses permintaan.");
    } finally {
      setIsLoading(false);
      setLoadingStage("");
    }
  };

  const handleRestoreReport = (cachedReport: CompanyIntelligenceReport) => {
    setReport(cachedReport);
    setErrorMessage(null);
    setNeedsConfirmation(false);
  };

  const handleConfirmSymbol = (sym: string) => {
    if (!sym || !/^[A-Z]{4}$/.test(sym.toUpperCase())) {
      setErrorMessage("Kode saham harus 4 huruf kapital (misal: BBCA, TLKM).");
      return;
    }
    executeAnalysis(pendingPrompt, pendingMode, sym.toUpperCase());
  };

  const handleOpenEvidenceWithId = (evidenceId: string) => {
    setSelectedEvidenceId(evidenceId);
    setIsEvidenceOpen(true);
  };

  const isCommodity = report?.commodityLens?.isCommodityIssuer;

  const handleNewAnalysis = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const textarea = document.querySelector("textarea");
    if (textarea) textarea.focus();
  };

  return (
    <div className={`min-h-screen flex flex-col bg-[#090d16] text-slate-100 transition-all duration-300 ${isSidebarCollapsed ? "md:pl-16" : "md:pl-64"}`}>
      {/* Terminal Sidebar */}
      <Sidebar
        report={report}
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t)}
        onNewAnalysis={handleNewAnalysis}
        onOpenEvidence={() => {
          setSelectedEvidenceId(null);
          setIsEvidenceOpen(true);
        }}
        onOpenQA={() => setIsQAOpen(true)}
        onShare={() => setIsShareOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        watchlist={watchlistItems}
        onSelectWatchlist={(sym) =>
          executeAnalysis(`Telaah komprehensif saham ${sym}`, "full", sym)
        }
      />

      {/* Top Navbar */}
      <Header onSelectExample={handleSelectExample} />

      {/* Global Market Ribbon (Live Animated Financial Ticker Tape) */}
      <div className="border-b border-slate-800/60 bg-[#070a12] px-3 sm:px-4 py-1.5 overflow-hidden text-[11px] font-mono select-none relative">
        <div className="max-w-7xl mx-auto flex items-center relative">
          {/* Static Left Label with Live Pulse */}
          <div className="shrink-0 z-20 flex items-center gap-2 bg-[#070a12] pr-3 sm:pr-4 border-r border-slate-800/80 text-slate-300 font-sans font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-white tracking-tight flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Market Acuan</span>
              <span className="text-[10px] text-slate-400 font-mono">({marketAsOfDate})</span>
            </span>
          </div>

          {/* Fade Gradients for smooth tape entry/exit */}
          <div className="pointer-events-none absolute left-[125px] sm:left-[215px] top-0 bottom-0 w-8 bg-gradient-to-r from-[#070a12] to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#070a12] to-transparent z-10" />

          {/* Continuous Moving Tape Track */}
          <div className="overflow-hidden relative w-full ml-3 flex items-center">
            <div className="animate-ticker flex items-center gap-8 py-0.5" title="Arahkan kursor untuk menjeda pita pasar">
              {[...marketIndices, ...marketIndices].map((item, idx) => (
                <div key={`${item.code}-${idx}`} className="flex items-center gap-1.5 shrink-0 hover:bg-slate-800/60 px-2 py-0.5 rounded transition cursor-pointer">
                  <span className="text-slate-400 font-sans">{item.name}</span>
                  <span className="font-semibold text-white">
                    {item.price}
                    {item.unit && <span className="text-[9px] text-slate-500 font-normal ml-0.5">{item.unit}</span>}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      item.isPositive ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {item.change}
                  </span>
                  <span className="text-slate-700 ml-2 select-none">•</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Watchlist & Search History Ribbon */}
        <HistoryWatchlistBar
          currentSymbol={report?.symbol}
          onRestoreReport={handleRestoreReport}
          onSelectSymbolPrompt={(sym) =>
            executeAnalysis(`Bagaimana kondisi fundamental, flow, dan evaluasi terkini ${sym}?`, "full", sym)
          }
        />

        {/* Quick Emiten Shortcuts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 shrink-0 font-medium text-[11px] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Emiten Populer:
          </span>
          <button
            onClick={() => handleQuickEmiten("BBCA", "Bagaimana aksi akumulasi direksi dan kinerja laba BBCA terkini?")}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition shrink-0 font-mono text-[11px]"
          >
            BBCA • Cluster-Buy Direksi
          </button>
          <button
            onClick={() => handleQuickEmiten("ADRO", "Bagaimana dampak harga batu bara acuan terhadap laba dan cadangan ADRO?")}
            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition shrink-0 font-mono text-[11px]"
          >
            ADRO • Komoditas Batu Bara
          </button>
          <button
            onClick={() => handleQuickEmiten("ANTM", "Cek sensitivitas laba ANTM terhadap harga emas dan nikel LME")}
            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition shrink-0 font-mono text-[11px]"
          >
            ANTM • Nikel & Emas
          </button>
          <button
            onClick={() => handleQuickEmiten("BBRI", "Telaah fundamental, foreign flow dan dividen yield BBRI")}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition shrink-0 font-mono text-[11px]"
          >
            BBRI • Finansial & Flow
          </button>
          <button
            onClick={() => handleQuickEmiten("AMMN", "Bagaimana cadangan tembaga dan harga komoditas acuan AMMN?")}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition shrink-0 font-mono text-[11px]"
          >
            AMMN • Tembaga & Emas
          </button>
          <button
            onClick={() => handleQuickEmiten("TLKM", "Cek evaluasi klaim margin laba dan foreign flow TLKM")}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition shrink-0 font-mono text-[11px]"
          >
            TLKM • Telekomunikasi
          </button>
        </div>

        {/* Input Station */}
        <InputStation
          onAnalyze={executeAnalysis}
          isLoading={isLoading}
          loadingStage={loadingStage}
          initialPrompt={promptValue}
          initialMode={modeValue}
        />

        {/* Error Callout */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Terjadi Kendala Analisis</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Needs Confirmation Prompt (Ambiguous Ticker) */}
        {needsConfirmation && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-200 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Konfirmasi Kode Emiten IDX</h3>
            </div>
            <p className="text-xs text-slate-300">
              Sistem mendeteksi kemungkinan emiten{" "}
              <strong className="text-amber-400 font-mono">
                {candidateSymbol || "tidak terdeteksi jelas"}
              </strong>
              , namun membutuhkan konfirmasi Anda untuk memastikan data yang ditarik 100% akurat.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                defaultValue={candidateSymbol}
                placeholder="Misal: BBCA"
                maxLength={4}
                id="confirmedSymbolInput"
                className="w-28 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-center tracking-wider text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <button
                onClick={() => {
                  const input = document.getElementById("confirmedSymbolInput") as HTMLInputElement;
                  handleConfirmSymbol(input.value.trim());
                }}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition"
              >
                Lanjutkan Telaah
              </button>
            </div>
          </div>
        )}

        {/* The 360° Dossier / Dashboard Canvas */}
        {report && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Header & Direct Answer */}
            <ReportHeader
              report={report}
              onOpenEvidence={() => {
                setSelectedEvidenceId(null);
                setIsEvidenceOpen(true);
              }}
              onOpenQA={() => setIsQAOpen(true)}
              onShare={() => setIsShareOpen(true)}
            />

            {/* Dashboard Navigation Tabs */}
            <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl flex items-center justify-between gap-2 overflow-x-auto shadow-lg">
              <div className="flex items-center gap-1.5 flex-1 min-w-max">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === "overview"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Ringkasan 360°</span>
                </button>

                <button
                  onClick={() => setActiveTab("harmonic")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === "harmonic"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "text-purple-400 hover:text-purple-300 hover:bg-purple-950/40"
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span>Harmonic PRZ Engine</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    NEW
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("technical")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === "technical"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <CandleIcon className="w-4 h-4" />
                  <span>Terminal Teknikal</span>
                </button>

                <button
                  onClick={() => setActiveTab("insider")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === "insider"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Radar className="w-4 h-4" />
                  <span>Whale & Insider Radar</span>
                  {report.insiderRadar?.clusterBuyDetected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>

                {isCommodity && (
                  <button
                    onClick={() => setActiveTab("commodity")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                      activeTab === "commodity"
                        ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                        : "text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20"
                    }`}
                  >
                    <Pickaxe className="w-4 h-4" />
                    <span>Commodity Lens</span>
                    <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-bold">
                      Aktif
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab("all")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTab === "all"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Semua Modul</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: OVERVIEW */}
            {(activeTab === "overview" || activeTab === "all") && (
              <div className="space-y-6">
                {/* Atomic Claims Evaluation */}
                <ClaimCards
                  claims={report.claims}
                  onSelectEvidence={handleOpenEvidenceWithId}
                />

                {/* Whale & Insider Radar Widget */}
                {report.insiderRadar && (
                  <InsiderWhaleRadar
                    insiderRadar={report.insiderRadar}
                    symbol={report.symbol}
                  />
                )}

                {/* Harmonic Pattern & PRZ Projection Widget */}
                {report.harmonic && report.harmonic.hasPattern && (
                  <HarmonicPRZModule
                    harmonic={report.harmonic}
                    symbol={report.symbol}
                    currentPrice={report.technical.lastPrice}
                  />
                )}

                {/* Mining & Commodity Lens Widget (if applicable) */}
                {isCommodity && report.commodityLens && (
                  <CommodityLensModule
                    commodityLens={report.commodityLens}
                    symbol={report.symbol}
                    companyName={report.companyName}
                  />
                )}

                {/* Grid Modules: Left Column (Financial & Technical) vs Right Column (FlowLens & Peers) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <FinancialModule financials={report.financials} />
                    <TechnicalModule
                      technical={report.technical}
                      symbol={report.symbol}
                      companyName={report.companyName}
                    />
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <FlowLensModule flowLens={report.flowLens} />
                    <PeerLensModule
                      peerLens={report.peerLens}
                      valuation={report.valuation}
                      symbol={report.symbol}
                    />
                  </div>
                </div>

                {/* Full-width Events & Disclosure Timeline */}
                <EventsModule
                  events={report.events}
                  openQuestions={report.openQuestions}
                  limitations={report.limitations}
                />
              </div>
            )}

            {/* TAB CONTENT 2: HARMONIC PRZ ENGINE */}
            {activeTab === "harmonic" && report.harmonic && (
              <div className="space-y-6">
                <HarmonicPRZModule
                  harmonic={report.harmonic}
                  symbol={report.symbol}
                  currentPrice={report.technical.lastPrice}
                />
              </div>
            )}

            {/* TAB CONTENT 3: TECHNICAL CANDLESTICK TERMINAL */}
            {activeTab === "technical" && (
              <div className="space-y-6">
                <TechnicalModule
                  technical={report.technical}
                  symbol={report.symbol}
                  companyName={report.companyName}
                />
              </div>
            )}

            {/* TAB CONTENT 3: WHALE & INSIDER RADAR */}
            {activeTab === "insider" && report.insiderRadar && (
              <div className="space-y-6">
                <InsiderWhaleRadar
                  insiderRadar={report.insiderRadar}
                  symbol={report.symbol}
                />
              </div>
            )}

            {/* TAB CONTENT 4: COMMODITY LENS */}
            {activeTab === "commodity" && report.commodityLens && (
              <div className="space-y-6">
                <CommodityLensModule
                  commodityLens={report.commodityLens}
                  symbol={report.symbol}
                  companyName={report.companyName}
                />
              </div>
            )}
          </div>
        )}

        {/* Empty State / Welcome Screen */}
        {!report && !isLoading && !needsConfirmation && (
          <div className="py-14 text-center max-w-2xl mx-auto space-y-4 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-xl">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                Dashboard Riset Emiten IDX Berbasis Bukti Nyata
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-lg mx-auto">
                Ketik kode saham, tempel analisis media sosial, atau pilih tombol pintas di atas.
                Telaah 360 memadukan Candlestick Terminal interaktif, Whale & Insider Radar,
                Lensa Komoditas/Tambang, dan audit aliran dana broker tanpa rekomendasi sepihak.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Radar className="w-4 h-4 text-indigo-400" /> Insider Radar
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Deteksi cluster buying dan penjualan direksi/komisaris langsung dari filings resmi OJK.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Pickaxe className="w-4 h-4 text-amber-400" /> Commodity Lens
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Lacak harga komoditas acuan (Batu Bara, Nikel, Emas) dan cadangan tambang emiten.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CandleIcon className="w-4 h-4 text-blue-400" /> Candlestick Terminal
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Grafik OHLC interaktif dengan histogram volume, moving averages, dan crosshair realtime.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button for QA & Evidence when report is present */}
      {report && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
          <button
            onClick={() => setIsQAOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xl shadow-blue-600/30 transition transform hover:scale-105"
          >
            <span>Tanya Laporan</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        </div>
      )}

      {/* Slide-over Drawers and Modals */}
      {report && (
        <>
          <EvidenceDrawer
            isOpen={isEvidenceOpen}
            onClose={() => setIsEvidenceOpen(false)}
            evidenceRecords={report.evidenceRecords}
            toolCallTrace={report.toolCallTrace}
            selectedEvidenceId={selectedEvidenceId}
          />

          <ReportQADrawer
            isOpen={isQAOpen}
            onClose={() => setIsQAOpen(false)}
            report={report}
          />

          <ShareModal
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            report={report}
          />
        </>
      )}
    </div>
  );
}
