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
  ArrowRight,
  CheckCircle2,
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
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6" aria-live="polite">
      {/* Empty State / Welcome Screen */}
      {messages.length === 0 && (
        <div className="max-w-3xl mx-auto my-auto pt-4 pb-10 space-y-7">
          {/* Logo & Headline */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-500/20">
              <Sparkles className="w-7 h-7" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
              Mulai riset saham tanpa bingung
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              Tulis kode saham atau tempel rumor yang kamu temukan. Telaah 360 akan merangkum data, menjelaskan istilah, dan menunjukkan buktinya.
            </p>
          </div>

          <div className="surface dark:!border-slate-800 dark:!bg-[#0f172a] p-4 sm:p-5">
            <ol className="grid sm:grid-cols-3 gap-4 text-left">
              {["Tulis pertanyaan", "Kami cek data", "Kamu dapat ringkasan"].map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold shrink-0">{index + 1}</span>
                  <div><p className="text-sm font-semibold text-slate-900 dark:text-white">{step}</p><p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 mt-0.5">{index === 0 ? "Contoh: prospek BBCA" : index === 1 ? "Laporan, harga, dan aliran dana" : "Bahasa sederhana plus risiko"}</p></div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Atau coba salah satu contoh</h2>
              <span className="text-[11px] text-slate-400">Klik untuk langsung bertanya</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {STARTER_PROMPTS.map((starter, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectPrompt(starter.desc)}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-brand-400 dark:hover:border-brand-700 hover:shadow-sm transition-all group flex items-start gap-3 text-left"
                >
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/60 transition shrink-0">{starter.icon}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-700 dark:group-hover:text-brand-300">{starter.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">{starter.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Sumber data ditampilkan. Hasil bukan ajakan membeli atau menjual.</span>
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
