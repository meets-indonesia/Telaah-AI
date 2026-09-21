"use client";

import React, { useState, useEffect, useRef } from "react";
import { Header, MarketIndexItem } from "@/components/Header";
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
import { ChatFeed } from "@/components/chat/ChatFeed";
import { ChatInput } from "@/components/chat/ChatInput";
import { JargonBusterModal } from "@/components/retail/JargonBusterModal";
import { DividendCalculatorModal } from "@/components/retail/DividendCalculatorModal";
import { ShareAlphaCardModal } from "@/components/retail/ShareAlphaCardModal";
import { ChatMessage, ChatSession } from "@/components/chat/types";
import { AnalysisMode, CompanyIntelligenceReport } from "@/lib/agent/types";
import { extractValuationMultiples } from "@/lib/sectors/types";
import { CompanyLogo } from "@/components/CompanyLogo";
import {
  detectComparisonIntent,
  detectNewTargetSymbol,
} from "@/lib/agent/chat-router";
import { saveReportToHistory, getHistory, getReportFromCache } from "@/lib/storage/history";
import {
  AlertCircle,
  HelpCircle,
  LayoutDashboard,
  CandlestickChart as CandleIcon,
  Radar,
  Pickaxe,
  FileSpreadsheet,
  Bot,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Terminal,
  Search,
} from "lucide-react";

type DashboardTab = "overview" | "technical" | "insider" | "commodity" | "all";

export default function Home() {
  // Split pane: Copilot dock visibility
  const [isCopilotOpen, setIsCopilotOpen] = useState(true);

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

  // Quick Command Search Dialog state (⌘K)
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [modalSearchText, setModalSearchText] = useState("");
  const modalSearchInputRef = useRef<HTMLInputElement>(null);

  // Trigger from example pills
  const [promptValue, setPromptValue] = useState("");
  const [modeValue, setModeValue] = useState<AnalysisMode>("full");

  // Live Market Ribbon state
  const [marketIndices, setMarketIndices] = useState<MarketIndexItem[]>([
    { name: "IHSG", code: "COMPOSITE", price: "6.541,4", change: "-0.73%", isPositive: false },
    { name: "Brent Crude", code: "BRENT", price: "$109.80", change: "+2.85%", isPositive: true, unit: "/barel" },
    { name: "USD/IDR", code: "USDIDR", price: "Rp 17.585", change: "+0.45%", isPositive: false },
    { name: "Newcastle Coal", code: "COAL", price: "$148.50", change: "+1.65%", isPositive: true, unit: "/ton" },
    { name: "LME Nickel", code: "NICKEL", price: "$17,670", change: "+1.20%", isPositive: true, unit: "/ton" },
    { name: "COMEX Gold", code: "GOLD", price: "$2,742.5", change: "+1.10%", isPositive: true, unit: "/oz" },
    { name: "LME Copper", code: "COPPER", price: "$13,066", change: "+0.85%", isPositive: true, unit: "/ton" },
  ]);
  const [marketAsOfDate, setMarketAsOfDate] = useState<string>("2026-09-18");

  // Fetch live market overview from Sectors API on mount & poll every 1 hour
  useEffect(() => {
    const fetchMarket = () => {
      fetch("/api/market-overview")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.indices)) {
            setMarketIndices(data.indices);
            if (data.asOfDate) setMarketAsOfDate(data.asOfDate);
          }
        })
        .catch(() => {});
    };

    fetchMarket();
    const interval = setInterval(fetchMarket, 60 * 60 * 1000); // Poll every 1 hour
    return () => clearInterval(interval);
  }, []);

  // Global Keyboard Shortcuts (⌘K search, ⌘J toggle copilot, Esc close modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => modalSearchInputRef.current?.focus(), 50);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsCopilotOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsEvidenceOpen(false);
        setIsQAOpen(false);
        setIsShareOpen(false);
        setIsJargonOpen(false);
        setIsDividendOpen(false);
        setIsShareCardOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
      report: report,
    };
    const updated = [newSession, ...sessions];
    persistSessions(updated);
    setActiveSessionId(newSessionId);
    setMessages([]);
  };

  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      setActiveSessionId(session.id);
      setMessages(session.messages);
      if (session.report) setReport(session.report);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    const updated = sessions.filter((s) => s.id !== sessionId);
    persistSessions(updated);
    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
        setMessages(updated[0].messages);
        if (updated[0].report) setReport(updated[0].report);
      } else {
        handleNewChat();
      }
    }
  };

  const handleSelectExample = (prompt: string, mode: "quick" | "full" = "full") => {
    setPromptValue(prompt);
    setModeValue(mode);
    executeAnalysis(prompt, mode);
  };

  const handleQuickEmiten = async (symbol: string, promptText: string) => {
    const clean = symbol.toUpperCase().trim();

    // 1. Check local storage cache
    const cached = getReportFromCache(clean);
    if (cached) {
      setReport(cached);
      setErrorMessage(null);
      setNeedsConfirmation(false);
      return;
    }

    // 2. Query server (which checks Qdrant vector semantic cache before calling Sectors API)
    setPromptValue(promptText);
    setModeValue("full");
    await executeAnalysis(promptText, "full", clean);
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
        text: "Saya telah membuka **Kamus Pintar Saham (Jargon Buster)**. Anda dapat memeriksa penjelasan istilah pasar modal resmi IDX.",
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
        text: "Saya telah membuka **Kalkulator Dividen**. Anda dapat memproyeksikan yield dan estimasi dividen tunai per tahun.",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      const finalMsgs = [...newMessages, botReply];
      setMessages(finalMsgs);
      updateActiveSession(finalMsgs, report);
      return;
    }

    // 3. Check if user requested a Head-to-Head Comparison (Context-Aware)
    const compIntent = detectComparisonIntent(userText, report?.symbol);
    if (compIntent.isCompare && compIntent.symbolA && compIntent.symbolB) {
      const symA = compIntent.symbolA;
      const symB = compIntent.symbolB;
      setIsLoading(true);
      setLoadingStage(`Membandingkan data resmi ${symA} vs ${symB}...`);

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
            text: `**Komparasi Finansial & Valuasi: ${symA} vs ${symB}**\n\n${compData.comparison.retailSummary}`,
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
      } catch (e) {}
    }

    // 4. Check if user introduced a NEW stock ticker to switch focus
    const newTarget = detectNewTargetSymbol(userText, report?.symbol);
    if (newTarget) {
      await executeAnalysis(userText, mode, newTarget, newMessages);
      return;
    }

    // 5. If a report is already active and NO new stock was introduced, answer as contextual QA
    if (report) {
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
          text: qaData.answer || `Data untuk ${report.symbol} tercatat dengan baik. Silakan cek modul terminal jika perlu rincian lanjutan.`,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        };

        const finalMsgs = [...newMessages, botReply];
        setMessages(finalMsgs);
        updateActiveSession(finalMsgs, report);
      } catch (err: any) {
        const botReply: ChatMessage = {
          id: "b_" + Date.now(),
          sender: "assistant",
          text: `Kendala: ${err.message || "Gagal memproses pertanyaan"}.`,
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
    await executeAnalysis(userText, mode, undefined, newMessages);
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

  const executeAnalysis = async (
    prompt: string,
    mode: AnalysisMode,
    confirmedSymbol?: string,
    existingMessages?: ChatMessage[]
  ) => {
    setIsLoading(true);
    setErrorMessage(null);
    setNeedsConfirmation(false);

    // If caller didn't pass existingMessages (e.g. from search modal or quick chips), add user message
    let baseMessages = existingMessages;
    if (!baseMessages) {
      const timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const userMsg: ChatMessage = {
        id: "u_" + Date.now(),
        sender: "user",
        text: prompt,
        timestamp: timeStr,
      };
      baseMessages = [...messages, userMsg];
      setMessages(baseMessages);
    }

    setLoadingStage("Menganalisis intensi & mengekstrak data emiten...");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          mode,
          confirmedSymbol,
        }),
      });

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
        const multiples = extractValuationMultiples(rep.valuation);
        const peVal = multiples.pe ?? rep.peerLens?.peers?.find((p) => p.isTarget)?.pe;
        const pbVal = multiples.pb ?? rep.peerLens?.peers?.find((p) => p.isTarget)?.pb;
        const peStr = peVal ? `${peVal.toFixed(1)}x` : "-";
        const pbStr = pbVal ? `${pbVal.toFixed(2)}x` : "-";

        const trendText = rep.technical?.trendAssessment || "";
        const isBullish = trendText.toLowerCase().includes("bullish") || (rep.flowLens?.foreignFlow?.cumulative5d ?? 0) > 0;
        const verdict: "bullish" | "neutral" = isBullish ? "bullish" : "neutral";
        const verdictText = isBullish ? "AKUMULASI / POSITIF" : "NETRAL / WAIT & SEE";

        const botMsgText = `**${rep.symbol} — ${rep.companyName}**\n\n${rep.directAnswer}\n\n` +
          `• **Valuasi**: PER ${peStr} | PBV ${pbStr}\n` +
          `• **Kondisi Finansial**: ${rep.financials?.solvencyHealth?.description || "Kondisi keuangan terpantau stabil."}\n` +
          `• **Arus Broker**: ${rep.flowLens?.foreignFlow?.recentTrend || "Flow normal"}`;

        const botReply: ChatMessage = {
          id: "b_" + Date.now(),
          sender: "assistant",
          text: botMsgText,
          timestamp: timeStr,
          stockCard: {
            symbol: rep.symbol,
            companyName: rep.companyName,
            sector: rep.overview?.sector,
            price: rep.technical?.lastPrice,
            changePct: rep.technical?.dailyReturnPct,
            verdict,
            verdictText,
            highlights: [
              {
                title: "Fundamental & Laba",
                desc: rep.financials?.solvencyHealth?.description || "Data keuangan tercatat sesuai laporan berkala.",
                icon: "check",
              },
              {
                title: "Arus Asing",
                desc: rep.flowLens?.foreignFlow?.recentTrend || "Netral",
                icon: "info",
              },
              {
                title: "Teknikal & RSI",
                desc: `${rep.technical?.trendAssessment || "Netral"} (RSI: ${rep.technical?.rsi14?.toFixed(0) || "50"})`,
                icon: "alert",
              },
            ],
            retailTakeaway: rep.directAnswer,
            report: rep,
          },
        };

        const finalMsgs = [...baseMessages, botReply];
        setMessages(finalMsgs);
        updateActiveSession(finalMsgs, rep);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat memproses data.");
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
    <div className="min-h-[100dvh] flex flex-col bg-[#f8fafc] dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Terminal Bar */}
      <Header
        marketIndices={marketIndices}
        marketAsOfDate={marketAsOfDate}
        isCopilotOpen={isCopilotOpen}
        onToggleCopilot={() => setIsCopilotOpen(!isCopilotOpen)}
        onOpenCompare={() => handleChatSend("Bandingkan BBCA vs BBRI", "quick")}
        onOpenJargon={() => setIsJargonOpen(true)}
        onOpenDividend={() => setIsDividendOpen(true)}
        onFocusSearch={() => {
          setIsSearchOpen(true);
          setTimeout(() => modalSearchInputRef.current?.focus(), 50);
        }}
      />

      {/* Unified Split-Pane Terminal Stage */}
      <main id="main-content" className="flex-1 flex flex-col lg:flex-row min-w-0 overflow-hidden relative">
        {/* =========================================================================
            LEFT STAGE: FINANCIAL WORKSTATION & ANALYTICS
            ========================================================================= */}
        <div
          className={`flex-1 min-w-0 h-[calc(100dvh-5rem)] overflow-y-auto px-3 sm:px-5 py-3.5 space-y-3 transition-all duration-200`}
        >
          {/* Watchlist & Search History Ribbon */}
          <HistoryWatchlistBar
            currentSymbol={report?.symbol}
            onRestoreReport={handleRestoreReport}
            onSelectSymbolPrompt={(sym) =>
              executeAnalysis(`Bagaimana kondisi fundamental, flow, dan evaluasi terkini ${sym}?`, "full", sym)
            }
          />

          {/* Quick Emiten Shortcuts Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            <span className="text-slate-400 shrink-0 font-mono text-[10px] uppercase tracking-wider">
              Quick:
            </span>
            <button
              onClick={() => handleQuickEmiten("BBCA", "Bagaimana aksi akumulasi direksi dan kinerja laba BBCA terkini?")}
              className="px-2 py-0.5 rounded bg-white dark:bg-[#12151f] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition shrink-0 font-mono text-[11px]"
            >
              BBCA • Cluster Direksi
            </button>
            <button
              onClick={() => handleQuickEmiten("ADRO", "Bagaimana dampak harga batu bara acuan terhadap laba dan cadangan ADRO?")}
              className="px-2 py-0.5 rounded bg-white dark:bg-[#12151f] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition shrink-0 font-mono text-[11px]"
            >
              ADRO • Batu Bara
            </button>
            <button
              onClick={() => handleQuickEmiten("ANTM", "Cek sensitivitas laba ANTM terhadap harga emas dan nikel LME")}
              className="px-2 py-0.5 rounded bg-white dark:bg-[#12151f] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition shrink-0 font-mono text-[11px]"
            >
              ANTM • Nikel & Emas
            </button>
            <button
              onClick={() => handleQuickEmiten("BBRI", "Telaah fundamental, foreign flow dan dividen yield BBRI")}
              className="px-2 py-0.5 rounded bg-white dark:bg-[#12151f] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition shrink-0 font-mono text-[11px]"
            >
              BBRI • Foreign Flow
            </button>
            <button
              onClick={() => handleQuickEmiten("TLKM", "Cek evaluasi klaim margin laba dan foreign flow TLKM")}
              className="px-2 py-0.5 rounded bg-white dark:bg-[#12151f] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition shrink-0 font-mono text-[11px]"
            >
              TLKM • Telko
            </button>
          </div>

      {/* Quick Search Dialog Modal (⌘K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-[#0f1118] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center px-3.5 border-b border-slate-100 dark:border-slate-800/80">
              <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
              <input
                ref={modalSearchInputRef}
                type="text"
                value={modalSearchText}
                onChange={(e) => setModalSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && modalSearchText.trim()) {
                    setIsSearchOpen(false);
                    executeAnalysis(modalSearchText.trim(), "full");
                  }
                }}
                placeholder="Ketik kode emiten (BBCA, TLKM, ADRO) atau pertanyaan..."
                className="w-full py-3 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-sans"
              />
              <kbd
                onClick={() => setIsSearchOpen(false)}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer hover:bg-slate-200"
              >
                ESC
              </kbd>
            </div>

            {/* Quick Suggestions */}
            <div className="p-3 space-y-1.5 text-xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Emiten Populer:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { sym: "BBCA", name: "Bank Central Asia" },
                  { sym: "BBRI", name: "Bank Rakyat Indonesia" },
                  { sym: "TLKM", name: "Telkom Indonesia" },
                  { sym: "ADRO", name: "Adaro Energy" },
                  { sym: "ANTM", name: "Aneka Tambang" },
                  { sym: "ASII", name: "Astra International" },
                ].map((item) => (
                  <button
                    key={item.sym}
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      handleQuickEmiten(item.sym, `Bagaimana prospek dan valuasi ${item.sym}?`);
                    }}
                    className="flex items-center justify-between p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800/70 text-left transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CompanyLogo symbol={item.sym} companyName={item.name} size="sm" />
                      <div className="min-w-0">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">
                          {item.sym}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate block max-w-[130px]">
                          {item.name}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">↵</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

          {/* Error Callout */}
          {errorMessage && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Kendala Analisis:</strong>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Ambiguous Ticker Confirmation */}
          {needsConfirmation && (
            <div className="p-3.5 rounded bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-200 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">Konfirmasi Kode Emiten IDX</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Sistem mendeteksi kemungkinan emiten{" "}
                <strong className="text-amber-600 dark:text-amber-400 font-mono">
                  {candidateSymbol || "tidak terdeteksi jelas"}
                </strong>
                . Mohon konfirmasi kode 4 huruf:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  defaultValue={candidateSymbol}
                  placeholder="BBCA"
                  maxLength={4}
                  id="confirmedSymbolInput"
                  className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono text-center tracking-wider text-xs focus:outline-none"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById("confirmedSymbolInput") as HTMLInputElement;
                    handleConfirmSymbol(input.value.trim());
                  }}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded transition"
                >
                  Lanjutkan Telaah
                </button>
              </div>
            </div>
          )}

          {/* Active Emiten Intelligence Canvas */}
          {report ? (
            <div className="space-y-3">
              {/* Institutional Emiten Strip */}
              <ReportHeader
                report={report}
                onOpenEvidence={() => {
                  setSelectedEvidenceId(null);
                  setIsEvidenceOpen(true);
                }}
                onOpenQA={() => setIsQAOpen(true)}
                onShare={() => setIsShareOpen(true)}
              />

              {/* Workstation Tab Bar */}
              <div className="bg-white dark:bg-[#0f1118] border border-slate-200 dark:border-slate-800/80 p-1 rounded-md flex items-center justify-between gap-1 overflow-x-auto text-xs">
                <div className="flex items-center gap-1 flex-1 min-w-max font-medium">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                      activeTab === "overview"
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold shadow-2xs"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-orange-400" />
                    <span>Ringkasan 360°</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("technical")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                      activeTab === "technical"
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold shadow-2xs"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <CandleIcon className="w-3.5 h-3.5 text-orange-400" />
                    <span>Terminal Teknikal</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("insider")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                      activeTab === "insider"
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold shadow-2xs"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Radar className="w-3.5 h-3.5 text-orange-400" />
                    <span>Whale & Broker Flow</span>
                    {report.insiderRadar?.clusterBuyDetected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </button>

                  {isCommodity && (
                    <button
                      onClick={() => setActiveTab("commodity")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                        activeTab === "commodity"
                          ? "bg-amber-600/30 text-amber-400 border border-amber-500/40 font-semibold shadow-2xs"
                          : "text-amber-500 hover:bg-amber-950/40"
                      }`}
                    >
                      <Pickaxe className="w-3.5 h-3.5" />
                      <span>Commodity Lens</span>
                    </button>
                  )}

                  <button
                    onClick={() => setActiveTab("all")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                      activeTab === "all"
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold shadow-2xs"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-orange-400" />
                    <span>Semua Modul</span>
                  </button>
                </div>
              </div>

              {/* Tab Content: Overview */}
              {(activeTab === "overview" || activeTab === "all") && (
                <div className="space-y-3">
                  <ClaimCards claims={report.claims} onSelectEvidence={handleOpenEvidenceWithId} />
                  <FlowLensModule flowLens={report.flowLens} />
                  <FinancialModule financials={report.financials} />
                  <PeerLensModule peerLens={report.peerLens} valuation={report.valuation} symbol={report.symbol} />
                  <EventsModule events={report.events} openQuestions={report.openQuestions} limitations={report.limitations} />
                </div>
              )}

              {/* Tab Content: Technical */}
              {(activeTab === "technical" || activeTab === "all") && (
                <div className="space-y-3">
                  <TechnicalModule technical={report.technical} symbol={report.symbol} companyName={report.companyName} />
                </div>
              )}

              {/* Tab Content: Insider & Whale Radar */}
              {(activeTab === "insider" || activeTab === "all") && (
                <div className="space-y-3">
                  <InsiderWhaleRadar insiderRadar={report.insiderRadar} symbol={report.symbol} />
                </div>
              )}

              {/* Tab Content: Commodity Lens */}
              {(activeTab === "commodity" || activeTab === "all") && isCommodity && (
                <div className="space-y-3">
                  <CommodityLensModule
                    commodityLens={report.commodityLens!}
                    symbol={report.symbol}
                    companyName={report.companyName}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
              <Terminal className="w-8 h-8 text-slate-400 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Terminal Saham Siap Digunakan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Ketik kode emiten atau ajukan pertanyaan di search bar di atas, atau klik salah satu saham acuan (BBCA, ADRO, BBRI) untuk memulai riset.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            RIGHT DOCK: DOCKED AI RESEARCH COPILOT (Collapsible ⌘J)
            ========================================================================= */}
        {isCopilotOpen && (
          <>
            {/* Mobile Backdrop Overlay */}
            <div
              onClick={() => setIsCopilotOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-xs z-30"
            />
            <aside className="fixed lg:static inset-y-0 right-0 z-40 w-[90vw] sm:w-[400px] lg:w-[360px] xl:w-[28vw] min-w-[320px] shrink-0 border-l border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c0e15] flex flex-col h-full lg:h-[calc(100dvh-5rem)] shadow-xl lg:shadow-none">
            {/* Copilot Header */}
            <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between gap-2 bg-black/80">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-orange-400" />
                <span className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
                  RESEARCH COPILOT
                </span>
                {report && (
                  <span className="px-1.5 py-0.2 rounded bg-orange-500/15 text-[10px] font-mono font-bold text-orange-400 border border-orange-500/30">
                    {report.symbol}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleNewChat}
                  title="Obrolan Baru"
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCopilotOpen(false)}
                  title="Tutup Copilot (⌘J)"
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chat Feed */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <ChatFeed
                messages={messages}
                isLoading={isLoading}
                loadingStage={loadingStage}
                onSelectPrompt={(p) => handleChatSend(p, "quick")}
                onOpenDeepDive={(rep) => {
                  setReport(rep);
                }}
                onOpenSymbolTerminal={(sym) => {
                  handleQuickEmiten(sym, `Bagaimana analisis saham ${sym}?`);
                }}
                onOpenShareCard={(rep) => {
                  setReport(rep);
                  setIsShareCardOpen(true);
                }}
              />
            </div>

            {/* Quick Contextual Prompts Strip */}
            {report && (
              <div className="px-3 py-1.5 border-t border-white/10 bg-black/70 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono no-scrollbar">
                <button
                  onClick={() => handleChatSend(`Berapa dividen yield dan perkiraan dividen tunai ${report.symbol}?`, "quick")}
                  className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 hover:text-orange-400 hover:border-orange-500/40 shrink-0 transition"
                >
                  Dividen Yield
                </button>
                <button
                  onClick={() => handleChatSend(`Analisis broker summary dan akumulasi asing 5 hari ${report.symbol}`, "quick")}
                  className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 hover:text-orange-400 hover:border-orange-500/40 shrink-0 transition"
                >
                  Broker Flow 5H
                </button>
                <button
                  onClick={() => handleChatSend(`Apa risiko utama dan catatan kritis untuk ${report.symbol}?`, "quick")}
                  className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 hover:text-orange-400 hover:border-orange-500/40 shrink-0 transition"
                >
                  Risiko Utama
                </button>
              </div>
            )}

            {/* Sticky Bottom Chat Input */}
            <ChatInput
              onSend={handleChatSend}
              isLoading={isLoading}
              initialValue=""
            />
          </aside>
          </>
        )}
      </main>

      {/* Floating Copilot Toggle when collapsed */}
      {!isCopilotOpen && (
        <button
          type="button"
          onClick={() => setIsCopilotOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg text-xs font-semibold hover:bg-slate-800 transition"
        >
          <PanelRightOpen className="w-4 h-4" />
          <span>Buka Copilot (⌘J)</span>
        </button>
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
