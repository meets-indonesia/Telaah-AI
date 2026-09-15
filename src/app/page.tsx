"use client";

import React, { useState, useEffect } from "react";
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
import { HistoryWatchlistBar } from "@/components/HistoryWatchlistBar";
import { EvidenceDrawer } from "@/components/EvidenceDrawer";
import { ReportQADrawer } from "@/components/ReportQADrawer";
import { ShareModal } from "@/components/ShareModal";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatFeed } from "@/components/chat/ChatFeed";
import { ChatInput } from "@/components/chat/ChatInput";
import { JargonBusterModal } from "@/components/retail/JargonBusterModal";
import { DividendCalculatorModal } from "@/components/retail/DividendCalculatorModal";
import { ShareAlphaCardModal } from "@/components/retail/ShareAlphaCardModal";
import { ChatMessage, ChatSession } from "@/components/chat/types";
import { AnalysisMode, CompanyIntelligenceReport } from "@/lib/agent/types";
import { saveReportToHistory, getHistory, getReportFromCache } from "@/lib/storage/history";
import {
  AlertCircle,
  HelpCircle,
  LayoutDashboard,
  CandlestickChart as CandleIcon,
  Radar,
  Pickaxe,
  FileSpreadsheet,
  Globe2,
  Sparkles,
  MessageSquare,
  Menu,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";

type DashboardTab = "overview" | "technical" | "insider" | "commodity" | "all";
type ViewMode = "chat" | "dashboard";

export default function Home() {
  // Current View: "chat" (default copilot) or "dashboard" (Studio 360°)
  const [currentView, setCurrentView] = useState<ViewMode>("chat");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Chat Sessions & Messages State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Active Report State
  const [report, setReport] = useState<CompanyIntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dashboard Active Tab
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  // Ambiguity confirmation state
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [candidateSymbol, setCandidateSymbol] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [pendingMode, setPendingMode] = useState<AnalysisMode>("full");

  // Drawers & Modals
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isQAOpen, setIsQAOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isJargonOpen, setIsJargonOpen] = useState(false);
  const [isDividendOpen, setIsDividendOpen] = useState(false);
  const [isShareCardOpen, setIsShareCardOpen] = useState(false);
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

  // Initial load: restore latest viewed report & chat sessions
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem("telaah_chat_sessions");
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          setMessages(parsed[0].messages || []);
          if (parsed[0].report) setReport(parsed[0].report);
          return;
        }
      }
    } catch (e) {}

    // Fallback: check history for report
    const history = getHistory();
    if (history.length > 0 && !report) {
      const latest = getReportFromCache(history[0].symbol);
      if (latest) {
        setReport(latest);
      }
    }
  }, []);

  // Sync sessions to localStorage
  const persistSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    try {
      localStorage.setItem("telaah_chat_sessions", JSON.stringify(updatedSessions));
    } catch (e) {}
  };

  const handleNewChat = () => {
    const newSessionId = "chat_" + Date.now();
    const newSession: ChatSession = {
      id: newSessionId,
      title: "Obrolan Baru",
      date: new Date().toLocaleDateString("id-ID"),
      messages: [],
      report: null,
    };
    const updated = [newSession, ...sessions];
    persistSessions(updated);
    setActiveSessionId(newSessionId);
    setMessages([]);
    setReport(null);
    setCurrentView("chat");
  };

  const handleSelectSession = (id: string) => {
    const found = sessions.find((s) => s.id === id);
    if (found) {
      setActiveSessionId(id);
      setMessages(found.messages || []);
      if (found.report) setReport(found.report);
      setCurrentView("chat");
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    persistSessions(updated);
    if (activeSessionId === id) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
        setMessages(updated[0].messages || []);
        if (updated[0].report) setReport(updated[0].report);
      } else {
        handleNewChat();
      }
    }
  };

  const handleSelectExample = (prompt: string, mode: AnalysisMode) => {
    setPromptValue(prompt);
    setModeValue(mode);
    executeAnalysis(prompt, mode);
  };

  const handleQuickEmiten = (symbol: string, promptText: string) => {
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

  // Main chat prompt submission handler
  const handleChatSend = async (userText: string, mode: AnalysisMode = "quick") => {
    const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: "u_" + Date.now(),
      sender: "user",
      text: userText,
      timestamp: timeStr,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    // 1. Check if user asked to open Kamus or Jargon Buster
    if (/kamus|istilah|jargon/i.test(userText)) {
      setIsJargonOpen(true);
      const botReply: ChatMessage = {
        id: "b_" + Date.now(),
        sender: "assistant",
        text: "📖 Saya telah membuka **Kamus Pintar Saham Ritel (Jargon Buster)** untuk Anda! Di sana Anda bisa membaca arti istilah pasar modal (PBV, PER, Foreign Flow, HAKA/HAKI) dengan analogi sehari-hari.",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      const finalMsgs = [...newMessages, botReply];
      setMessages(finalMsgs);
      updateActiveSession(finalMsgs, report);
      return;
    }

    // 2. Check if user asked to open Kalkulator Dividen
    if (/kalkulator|hitung dividen|passive income/i.test(userText)) {
      setIsDividendOpen(true);
      const botReply: ChatMessage = {
        id: "b_" + Date.now(),
        sender: "assistant",
        text: "💰 Saya telah membuka **Kalkulator Dividen & Simulasi Passive Income** untuk Anda! Anda bisa mensimulasikan tabungan bulanan (DCA) atau modal awal dan melihat potensi dividen per tahun vs bunga deposito bank.",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      const finalMsgs = [...newMessages, botReply];
      setMessages(finalMsgs);
      updateActiveSession(finalMsgs, report);
      return;
    }

    // 3. Check if user requested a Head-to-Head Comparison (e.g., "BBCA vs BBRI" or "Bandingkan BBCA dan BBRI")
    const compareMatch = userText.match(/\b([A-Z]{4})\b.*?(?:vs|dan|dengan|lawan|bandingkan)\b.*?([A-Z]{4})\b/i);
    if (compareMatch) {
      const symA = compareMatch[1].toUpperCase();
      const symB = compareMatch[2].toUpperCase();
      if (symA !== symB) {
        setIsLoading(true);
        setLoadingStage(`Membandingkan data resmi ${symA} vs ${symB} secara paralel...`);

        try {
          const compRes = await fetch("/api/compare", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbolA: symA, symbolB: symB }),
          });
          const compData = await compRes.json();

          if (compData.success && compData.comparison) {
            const botReply: ChatMessage = {
              id: "b_" + Date.now(),
              sender: "assistant",
              text: `⚔️ **Hasil Komparasi Head-to-Head: ${symA} vs ${symB}**\n\n${compData.comparison.retailSummary}\n\n*Periksa kartu perbandingan metrik utama di bawah:*`,
              timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
              compareCard: compData.comparison,
            };
            const finalMsgs = [...newMessages, botReply];
            setMessages(finalMsgs);
            updateActiveSession(finalMsgs, report);
            setIsLoading(false);
            setLoadingStage("");
            return;
          }
        } catch (e) {
          // If compare endpoint errors, continue to normal analysis
        }
      }
    }

    // If report is already active and the question doesn't clearly introduce a new ticker, ask QA first
    const isNewTickerPattern = /\b[A-Z]{4}\b/i.test(userText);
    if (report && !isNewTickerPattern) {
      setIsLoading(true);
      setLoadingStage(`Menjawab pertanyaan berbasis data ${report.symbol}...`);

      try {
        const qaRes = await fetch("/api/qa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: userText, report }),
        });
        const qaData = await qaRes.json();

        const botReply: ChatMessage = {
          id: "b_" + Date.now(),
          sender: "assistant",
          text: qaData.answer || `Data untuk ${report.symbol} tercatat dengan baik. Silakan cek modul studio jika perlu detail tambahan.`,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        };

        const finalMsgs = [...newMessages, botReply];
        setMessages(finalMsgs);
        updateActiveSession(finalMsgs, report);
      } catch (err: any) {
        const botReply: ChatMessage = {
          id: "b_" + Date.now(),
          sender: "assistant",
          text: `Maaf, terjadi kendala: ${err.message || "Gagal memproses pertanyaan"}.`,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages([...newMessages, botReply]);
      } finally {
        setIsLoading(false);
        setLoadingStage("");
      }
      return;
    }

    // Otherwise run full or quick analysis
    await executeAnalysis(userText, mode);
  };

  const updateActiveSession = (updatedMessages: ChatMessage[], newReport?: CompanyIntelligenceReport | null) => {
    let currentId = activeSessionId;
    let currentList = [...sessions];

    if (!currentId || !currentList.find((s) => s.id === currentId)) {
      currentId = "chat_" + Date.now();
      setActiveSessionId(currentId);
      currentList.unshift({
        id: currentId,
        title: updatedMessages[0]?.text.slice(0, 26) || "Obrolan Baru",
        date: new Date().toLocaleDateString("id-ID"),
        messages: updatedMessages,
        report: newReport || report,
      });
    } else {
      currentList = currentList.map((s) => {
        if (s.id === currentId) {
          return {
            ...s,
            title: s.title === "Obrolan Baru" && updatedMessages[0] ? updatedMessages[0].text.slice(0, 26) : s.title,
            messages: updatedMessages,
            report: newReport !== undefined ? newReport : s.report,
          };
        }
        return s;
      });
    }

    persistSessions(currentList);
  };

  const executeAnalysis = async (prompt: string, mode: AnalysisMode, confirmedSymbol?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setNeedsConfirmation(false);

    setLoadingStage("Menganalisis intensi & mengekstrak klaim atomik...");

    try {
      const stageTimer1 = setTimeout(() => {
        setLoadingStage("Mengambil data resmi Sectors API v2 (Financials, Flow, Price, Filings)...");
      }, 1200);

      const stageTimer2 = setTimeout(() => {
        setLoadingStage("Menghitung indikator teknikal & rasio keuangan deterministik...");
      }, 2800);

      const stageTimer3 = setTimeout(() => {
        setLoadingStage("Sintesis laporan ramah ritel & verifikasi bukti citation guard...");
      }, 4500);

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
        const rep: CompanyIntelligenceReport = data.report;
        setReport(rep);
        saveReportToHistory(rep);

        // Build friendly retail text & rich card
        const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
        const peVal = rep.valuation?.historical_valuation?.pe?.current ?? rep.peerLens?.peers?.find((p) => p.isTarget)?.pe;
        const pbVal = rep.valuation?.historical_valuation?.pb?.current ?? rep.peerLens?.peers?.find((p) => p.isTarget)?.pb;
        const peStr = peVal ? `${peVal.toFixed(1)}x` : "-";
        const pbStr = pbVal ? `${pbVal.toFixed(2)}x` : "-";

        const trendText = rep.technical?.trendAssessment || "";
        const isBullish = trendText.toLowerCase().includes("bullish") || (rep.flowLens?.foreignFlow?.cumulative5d ?? 0) > 0;
        const verdict = isBullish ? "bullish" : "neutral";
        const verdictText = isBullish ? "AKUMULASI / POSITIF" : "NETRAL / WAIT & SEE";

        const summaryText = `✨ **Hasil Telaah Cerdas untuk ${rep.symbol} (${rep.companyName})**:\n\n` +
          `• **Intisari:** ${rep.directAnswer}\n` +
          `• **Kondisi Keuangan:** ${rep.financials?.solvencyHealth?.description || "Kondisi keuangan terpantau stabil."}\n` +
          `• **Arus Bandar / Asing:** ${rep.flowLens?.foreignFlow?.recentTrend || "Flow normal"}\n` +
          `• **Valuasi Saham:** PER ${peStr} | PBV ${pbStr}.\n\n` +
          `💡 *Tips Ritel:* Simak kartu ringkasan di bawah, atau klik **"Buka Studio 360°"** untuk melihat grafik candlestick, broker summary, dan radar insider komplit!`;

        const isRumorQuery =
          prompt.toLowerCase().includes("rumor") ||
          prompt.toLowerCase().includes("pom-pom") ||
          prompt.toLowerCase().includes("hoaks") ||
          (Array.isArray(rep.claims) && rep.claims.length > 0 && rep.intent === "claim_check");

        let factCheckCard = undefined;
        if (isRumorQuery && Array.isArray(rep.claims) && rep.claims.length > 0) {
          const hasRefuted = rep.claims.some((c) => c.verdict === "Bertentangan");
          const hasContext = rep.claims.some((c) => c.verdict === "Perlu konteks");
          const overallRisk: "low" | "medium" | "high" = hasRefuted ? "high" : hasContext ? "medium" : "low";
          factCheckCard = {
            symbol: rep.symbol,
            originalRumor: prompt,
            claims: rep.claims,
            overallRisk,
          };
        }

        const botMsg: ChatMessage = {
          id: "b_" + Date.now(),
          sender: "assistant",
          text: summaryText,
          timestamp: timeStr,
          stockCard: {
            symbol: rep.symbol,
            companyName: rep.companyName,
            sector: rep.overview?.sector,
            price: rep.technical?.lastPrice,
            changePct: rep.technical?.dailyReturnPct ?? 0,
            verdict,
            verdictText,
            highlights: [
              { title: "Fundamental & Laba", desc: rep.financials?.solvencyHealth?.description || "Kondisi keuangan sehat" },
              { title: "Arus Asing", desc: rep.flowLens?.foreignFlow?.recentTrend || "Flow terpantau" },
              { title: "Teknikal & RSI", desc: `${rep.technical?.trendAssessment || "Netral"} (RSI: ${rep.technical?.rsi14 ? Math.round(rep.technical.rsi14) : 50})` },
            ],
            retailTakeaway: rep.directAnswer,
            report: rep,
          },
          factCheckCard,
        };

        // If in chat view, append to chat
        const updatedMsgs = [...messages, botMsg];
        setMessages(updatedMsgs);
        updateActiveSession(updatedMsgs, rep);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat memproses permintaan.");
      const errorMsg: ChatMessage = {
        id: "err_" + Date.now(),
        sender: "assistant",
        text: `⚠️ Maaf, terjadi kendala saat memproses: ${err.message || "Gagal mengambil data Sectors"}. Coba periksa koneksi internet atau simbol saham yang Anda cari.`,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar with View Switcher & Theme Toggle */}
      <Header
        onSelectExample={handleSelectExample}
        currentView={currentView}
        onToggleView={(view) => setCurrentView(view)}
        hasReport={!!report}
      />

      {/* Global Market Ribbon (Live Animated Financial Ticker Tape) */}
      <div className="border-b border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-[#070a12] px-3 sm:px-4 py-1.5 overflow-hidden text-[11px] font-mono select-none relative transition-colors">
        <div className="max-w-7xl mx-auto flex items-center relative">
          {/* Static Left Label with Live Pulse */}
          <div className="shrink-0 z-20 flex items-center gap-2 bg-white dark:bg-[#070a12] pr-3 sm:pr-4 border-r border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 font-sans font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 text-brand-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Market Acuan</span>
              <span className="text-[10px] text-slate-500 font-mono">({marketAsOfDate})</span>
            </span>
          </div>

          {/* Fade Gradients for smooth tape entry/exit */}
          <div className="pointer-events-none absolute left-[125px] sm:left-[215px] top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-[#070a12] to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-[#070a12] to-transparent z-10" />

          {/* Continuous Moving Tape Track */}
          <div className="overflow-hidden relative w-full ml-3 flex items-center">
            <div className="animate-ticker flex items-center gap-8 py-0.5" title="Arahkan kursor untuk menjeda pita pasar">
              {[...marketIndices, ...marketIndices].map((item, idx) => (
                <div
                  key={`${item.code}-${idx}`}
                  className="flex items-center gap-1.5 shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800/60 px-2 py-0.5 rounded transition cursor-pointer"
                >
                  <span className="text-slate-500 dark:text-slate-400 font-sans">{item.name}</span>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {item.price}
                    {item.unit && <span className="text-[9px] text-slate-400 font-normal ml-0.5">{item.unit}</span>}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      item.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {item.change}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700 ml-2 select-none">•</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW MODE 1: CHAT COPILOT (ChatGPT / Gemini Saham IDX)
          ========================================================================= */}
      {currentView === "chat" && (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Collapsible Left Sidebar */}
          <ChatSidebar
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewChat={handleNewChat}
            onDeleteSession={handleDeleteSession}
            onSelectQuickSymbol={(sym) => {
              handleChatSend(`Bagaimana prospek dan valuasi saham ${sym} saat ini?`, "quick");
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            onOpenCompare={() => {
              handleChatSend("Bandingkan BBCA vs BBRI", "quick");
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            onOpenJargon={() => setIsJargonOpen(true)}
            onOpenDividend={() => setIsDividendOpen(true)}
          />

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-[#090d16] relative">
            {/* Top Sub-Bar for Mobile Sidebar Toggle & Active Symbol Pill */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/40 text-xs">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
              >
                <Menu className="w-3.5 h-3.5" />
                <span>Menu & Riwayat</span>
              </button>

              {report && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px] hidden sm:inline">Emiten Aktif:</span>
                  <button
                    onClick={() => setCurrentView("dashboard")}
                    type="button"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 text-[11px] font-bold transition"
                  >
                    <span>{report.symbol}</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Chat Feed */}
            <ChatFeed
              messages={messages}
              isLoading={isLoading}
              loadingStage={loadingStage}
              onSelectPrompt={(p) => handleChatSend(p, "quick")}
              onOpenDeepDive={(rep) => {
                setReport(rep);
                setCurrentView("dashboard");
              }}
              onOpenShareCard={(rep) => {
                setReport(rep);
                setIsShareCardOpen(true);
              }}
            />


            {/* Sticky Bottom Chat Input */}
            <ChatInput
              onSend={handleChatSend}
              isLoading={isLoading}
              initialValue=""
            />

          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: STUDIO 360° DASHBOARD (Deep Dive Analisis Kuantitatif)
          ========================================================================= */}
      {currentView === "dashboard" && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
          {/* Quick Back to Chat Banner */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 text-xs">
            <div className="flex items-center gap-2 text-brand-900 dark:text-brand-200 font-medium">
              <LayoutDashboard className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
              <span>
                Mode <strong>Studio 360°</strong> — Data lengkap, grafik teknikal, laporan keuangan & bandarmologi.
              </span>
            </div>
            <button
              onClick={() => setCurrentView("chat")}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-xs transition active:scale-95 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Chat AI</span>
            </button>
          </div>

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
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Emiten Pilihan:
            </span>
            <button
              onClick={() => handleQuickEmiten("BBCA", "Bagaimana aksi akumulasi direksi dan kinerja laba BBCA terkini?")}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition shrink-0 font-mono text-[11px]"
            >
              BBCA • Cluster-Buy Direksi
            </button>
            <button
              onClick={() => handleQuickEmiten("ADRO", "Bagaimana dampak harga batu bara acuan terhadap laba dan cadangan ADRO?")}
              className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 transition shrink-0 font-mono text-[11px]"
            >
              ADRO • Komoditas Batu Bara
            </button>
            <button
              onClick={() => handleQuickEmiten("ANTM", "Cek sensitivitas laba ANTM terhadap harga emas dan nikel LME")}
              className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 transition shrink-0 font-mono text-[11px]"
            >
              ANTM • Nikel & Emas
            </button>
            <button
              onClick={() => handleQuickEmiten("BBRI", "Telaah fundamental, foreign flow dan dividen yield BBRI")}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition shrink-0 font-mono text-[11px]"
            >
              BBRI • Finansial & Flow
            </button>
            <button
              onClick={() => handleQuickEmiten("TLKM", "Cek evaluasi klaim margin laba dan foreign flow TLKM")}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition shrink-0 font-mono text-[11px]"
            >
              TLKM • Telekomunikasi
            </button>
          </div>

          {/* Input Station (if user wants to submit new prompt inside Studio) */}
          <InputStation
            onAnalyze={executeAnalysis}
            isLoading={isLoading}
            loadingStage={loadingStage}
            initialPrompt={promptValue}
            initialMode={modeValue}
          />

          {/* Error Callout */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Terjadi Kendala Analisis</strong>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Needs Confirmation Prompt (Ambiguous Ticker) */}
          {needsConfirmation && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-800 dark:text-slate-200 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Konfirmasi Kode Emiten IDX</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Sistem mendeteksi kemungkinan emiten{" "}
                <strong className="text-amber-600 dark:text-amber-400 font-mono">
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
                  className="w-28 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-center tracking-wider text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
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
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl flex items-center justify-between gap-2 overflow-x-auto shadow-md">
                <div className="flex items-center gap-1.5 flex-1 min-w-max">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                      activeTab === "overview"
                        ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Ringkasan 360°</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("technical")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                      activeTab === "technical"
                        ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <CandleIcon className="w-4 h-4" />
                    <span>Terminal Teknikal</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("insider")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                      activeTab === "insider"
                        ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Radar className="w-4 h-4" />
                    <span>Whale & Insider Radar</span>
                    {report.insiderRadar?.clusterBuyDetected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </button>

                  {isCommodity && (
                    <button
                      onClick={() => setActiveTab("commodity")}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                        activeTab === "commodity"
                          ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
                          : "text-amber-600 dark:text-amber-400 hover:text-amber-700 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"
                      }`}
                    >
                      <Pickaxe className="w-4 h-4" />
                      <span>Commodity Lens</span>
                      <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-bold">
                        Aktif
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab("all")}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                      activeTab === "all"
                        ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Semua Modul</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Ringkasan 360° (Default Overview) */}
              {(activeTab === "overview" || activeTab === "all") && (
                <div className="space-y-5">
                  <ClaimCards claims={report.claims} onSelectEvidence={handleOpenEvidenceWithId} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <FlowLensModule flowLens={report.flowLens} />
                    <FinancialModule financials={report.financials} />
                  </div>
                  <PeerLensModule peerLens={report.peerLens} valuation={report.valuation} symbol={report.symbol} />
                  <EventsModule events={report.events} openQuestions={report.openQuestions} limitations={report.limitations} />
                </div>
              )}

              {/* Tab 2: Terminal Teknikal */}
              {(activeTab === "technical" || activeTab === "all") && (
                <div className="space-y-5">
                  <TechnicalModule technical={report.technical} symbol={report.symbol} companyName={report.companyName} />
                </div>
              )}

              {/* Tab 3: Whale & Insider Radar */}
              {(activeTab === "insider" || activeTab === "all") && (
                <div className="space-y-5">
                  <InsiderWhaleRadar insiderRadar={report.insiderRadar} symbol={report.symbol} />
                </div>
              )}

              {/* Tab 4: Commodity Lens (Only for Commodity Issuers) */}
              {(activeTab === "commodity" || activeTab === "all") && isCommodity && (
                <div className="space-y-5">
                  <CommodityLensModule
                    commodityLens={report.commodityLens!}
                    symbol={report.symbol}
                    companyName={report.companyName}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {/* Drawers and Modals */}
      {report && (
        <>
          <EvidenceDrawer
            isOpen={isEvidenceOpen}
            onClose={() => {
              setIsEvidenceOpen(false);
              setSelectedEvidenceId(null);
            }}
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

      {/* Jargon Buster / Kamus Pintar Ritel Modal */}
      <JargonBusterModal
        isOpen={isJargonOpen}
        onClose={() => setIsJargonOpen(false)}
      />

      {/* Dividend & Passive Income Calculator Modal */}
      <DividendCalculatorModal
        isOpen={isDividendOpen}
        onClose={() => setIsDividendOpen(false)}
        defaultSymbol={report?.symbol || "BBRI"}
        defaultPrice={report?.technical?.lastPrice}
      />

      {/* Shareable Alpha Card (Image Generator for WA/IG) */}
      {report && (
        <ShareAlphaCardModal
          isOpen={isShareCardOpen}
          onClose={() => setIsShareCardOpen(false)}
          report={report}
        />
      )}
    </div>
  );
}
