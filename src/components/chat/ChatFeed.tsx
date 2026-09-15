"use client";

import React, { useEffect, useRef } from "react";
import {
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  TrendingUp,
  Coins,
  Search,
  Zap,
  Loader2,
  HelpCircle,
  Swords,
  ShieldAlert,
} from "lucide-react";
import { ChatMessage } from "./types";
import { StockMiniCard } from "./StockMiniCard";
import { StockCompareCard } from "./StockCompareCard";
import { RumorFactCheckerCard } from "./RumorFactCheckerCard";
import { MarkdownText } from "./MarkdownText";
import { CompanyIntelligenceReport } from "@/lib/agent/types";

interface ChatFeedProps {
  messages: ChatMessage[];
  isLoading: boolean;
  loadingStage?: string;
  onSelectPrompt: (prompt: string) => void;
  onOpenDeepDive: (report: CompanyIntelligenceReport) => void;
  onOpenShareCard?: (report: CompanyIntelligenceReport) => void;
}

const STARTER_PROMPTS = [
  {
    icon: <Swords className="w-4 h-4 text-indigo-500" />,
    title: "Battle: BBCA vs BBRI",
    desc: "Bandingkan BBCA vs BBRI: Mana valuasi lebih murah dan lebih banyak diakumulasi asing?",
  },
  {
    icon: <ShieldAlert className="w-4 h-4 text-rose-500" />,
    title: "Uji Rumor & Pom-Pom",
    desc: "Ada rumor di grup WA saham TLKM diborong asing 500 miliar. Tolong verifikasi kebenarannya!",
  },
  {
    icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
    title: "Akumulasi Asing BBCA",
    desc: "BCA (BBCA) labanya naik dan asing akumulasi. Benar gak ya?",
  },
  {
    icon: <Coins className="w-4 h-4 text-amber-500" />,
    title: "Dividen & Valuasi TLKM",
    desc: "Ada rumor laba TLKM tertekan dan asing jualan. Gimana faktanya?",
  },
];

export const ChatFeed: React.FC<ChatFeedProps> = ({
  messages,
  isLoading,
  loadingStage,
  onSelectPrompt,
  onOpenDeepDive,
  onOpenShareCard,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, loadingStage]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6">
      {/* Empty State / Welcome Screen */}
      {messages.length === 0 && (
        <div className="max-w-2xl mx-auto my-auto pt-6 pb-12 text-center space-y-6">
          {/* Logo & Headline */}
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 via-blue-500 to-indigo-500 text-white shadow-lg shadow-brand-500/30 ring-4 ring-brand-500/10">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Halo! Mau bedah saham apa hari ini?
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
              Asisten riset saham IDX cerdas berbasis data faktual <strong>Sectors API v2</strong>. Dirancang ramah investor ritel—jelas, lugas, tanpa istilah rumit yang bikin pusing.
            </p>
          </div>

          {/* Prompt Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
            {STARTER_PROMPTS.map((starter, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectPrompt(starter.desc)}
                className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-brand-400 dark:hover:border-brand-700/80 hover:shadow-md transition-all group flex items-start gap-3 text-left"
              >
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/60 transition shrink-0">
                  {starter.icon}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                    {starter.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {starter.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Mini Info Footer */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
            <span>Semua klaim diverifikasi dengan data resmi laporan keuangan & broker IDX</span>
          </div>
        </div>
      )}

      {/* Messages List */}
      {messages.map((msg) => {
        const isUser = msg.sender === "user";

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-3 max-w-3xl ${
              isUser ? "ml-auto justify-end" : "mr-auto justify-start"
            }`}
          >
            {/* Bot Avatar */}
            {!isUser && (
              <div className="w-8 h-8 rounded-xl bg-brand-600 dark:bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            {/* Bubble */}
            <div
              className={`space-y-1.5 max-w-[85%] sm:max-w-[78%] ${
                isUser
                  ? "bg-brand-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-xs"
                  : "bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-xs px-4 py-3.5 border border-slate-200/90 dark:border-slate-800/80 shadow-xs"
              }`}
            >
              {/* Message text with rich markdown formatting */}
              <MarkdownText content={msg.text} isUser={isUser} />

              {/* Optional Stock Card Widget */}
              {msg.stockCard && (
                <StockMiniCard
                  card={msg.stockCard}
                  onOpenDeepDive={onOpenDeepDive}
                  onQuickFollowUp={(q) => onSelectPrompt(q)}
                  onOpenShareCard={onOpenShareCard}
                />
              )}

              {/* Optional Head-to-Head Compare Card */}
              {msg.compareCard && (
                <StockCompareCard
                  comparison={msg.compareCard}
                  onOpenDeepDive={(sym) => onSelectPrompt(`Bagaimana analisis saham ${sym}?`)}
                />
              )}

              {/* Optional Rumor Fact Checker Card */}
              {msg.factCheckCard && (
                <RumorFactCheckerCard
                  symbol={msg.factCheckCard.symbol}
                  originalRumor={msg.factCheckCard.originalRumor}
                  claims={msg.factCheckCard.claims}
                  overallRisk={msg.factCheckCard.overallRisk}
                />
              )}

              {/* Timestamp */}
              <div
                className={`text-[10px] pt-1 ${
                  isUser ? "text-brand-200 text-right" : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {msg.timestamp}
              </div>
            </div>

            {/* User Avatar */}
            {isUser && (
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        );
      })}

      {/* Loading Bubble */}
      {isLoading && (
        <div className="flex items-start gap-3 max-w-3xl mr-auto">
          <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 animate-pulse mt-1">
            <Bot className="w-4 h-4" />
          </div>
          <div className="bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 border border-slate-200/90 dark:border-slate-800/80 shadow-xs flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-brand-600 dark:text-brand-400 animate-spin" />
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {loadingStage || "Sedang memproses & memverifikasi data..."}
              </p>
              <p className="text-[11px] text-slate-400">
                Mengambil data riil dari Sectors API v2
              </p>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
