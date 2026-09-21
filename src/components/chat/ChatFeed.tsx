"use client";

import React, { useEffect, useRef } from "react";
import {
  Bot,
  User,
  Scale,
  ShieldCheck,
  TrendingUp,
  Coins,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { ChatMessage } from "./types";
import { StockMiniCard } from "./StockMiniCard";
import { StockCompareCard } from "./StockCompareCard";
import { RumorFactCheckerCard } from "./RumorFactCheckerCard";
import { StockInlineArtifact } from "./StockInlineArtifact";
import { MarkdownText } from "./MarkdownText";
import { CompanyIntelligenceReport } from "@/lib/agent/types";

interface ChatFeedProps {
  messages: ChatMessage[];
  isLoading: boolean;
  loadingStage?: string;
  onSelectPrompt: (prompt: string) => void;
  onOpenDeepDive: (report: CompanyIntelligenceReport) => void;
  onOpenSymbolTerminal?: (symbol: string) => void;
  onOpenShareCard?: (report: CompanyIntelligenceReport) => void;
}

const STARTER_PROMPTS = [
  {
    icon: <Scale className="w-3.5 h-3.5 text-indigo-500" />,
    title: "Komparasi: BBCA vs BBRI",
    desc: "Bandingkan valuasi PER, PBV, dan akumulasi foreign flow BBCA vs BBRI.",
  },
  {
    icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />,
    title: "Verifikasi Arus Asing TLKM",
    desc: "Cek akumulasi broker dan net foreign flow TLKM 5 hari terakhir.",
  },
  {
    icon: <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />,
    title: "Sensitivitas Komoditas ADRO",
    desc: "Telaah korelasi laba dan sensitivitas harga batu bara terhadap operasional ADRO.",
  },
];

export const ChatFeed: React.FC<ChatFeedProps> = ({
  messages,
  isLoading,
  loadingStage,
  onSelectPrompt,
  onOpenDeepDive,
  onOpenSymbolTerminal,
  onOpenShareCard,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, loadingStage]);

  return (
    <div className="flex-1 overflow-y-auto pl-3 sm:pl-4 pr-4 sm:pr-5 py-3.5 space-y-3.5 text-xs font-sans" aria-live="polite">
      {/* Empty State / Terminal Starter */}
      {messages.length === 0 && (
        <div className="my-auto py-6 space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold">
              Quantitative Copilot
            </span>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Asisten Riset Emiten IDX
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Ajukan pertanyaan mengenai valuasi, laporan keuangan resmi, broker flow, atau uji komparasi antar-saham.
            </p>
          </div>

          <div className="space-y-1.5 pt-2">
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
              Rekomendasi Prompt:
            </span>
            {STARTER_PROMPTS.map((starter, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectPrompt(starter.desc)}
                className="w-full p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-black hover:border-slate-300 dark:hover:border-slate-700 transition text-left group flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded bg-white dark:bg-slate-800 shrink-0">
                    {starter.icon}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {starter.title}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                      {starter.desc}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Feed */}
      {messages.map((msg) => {
        const isUser = msg.sender === "user";

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              isUser ? "ml-auto justify-end" : "mr-auto justify-start w-full"
            }`}
          >
            {!isUser && (
              <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 text-slate-600 dark:text-slate-300">
                <Bot className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            )}

            <div
              className={`space-y-1.5 min-w-0 ${
                isUser
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl px-3.5 py-2.5 text-xs max-w-[85%] shadow-xs"
                  : "bg-transparent text-zinc-800 dark:text-zinc-200 text-xs w-full min-w-0"
              }`}
            >
              {/* Optional user-attached images */}
              {msg.images && msg.images.length > 0 && (
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {msg.images.map((imgSrc, idx) => (
                    <div
                      key={idx}
                      className="w-24 h-24 rounded-lg overflow-hidden border border-zinc-300 dark:border-white/20 bg-zinc-800 shrink-0 shadow-xs"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgSrc} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Message text with clean formatting */}
              <div className={!isUser ? "bg-white dark:bg-[#18181b] p-3.5 rounded-xl border border-zinc-200 dark:border-white/10 space-y-2 leading-relaxed overflow-hidden break-words shadow-xs" : ""}>
                <MarkdownText content={msg.text} isUser={isUser} />
              </div>

              {/* Optional Stock Card Widget & Full Inline Artifact */}
              {msg.stockCard?.report ? (
                <StockInlineArtifact
                  report={msg.stockCard.report}
                  onToggleCopilot={() => {
                    if (onOpenDeepDive && msg.stockCard?.report) {
                      onOpenDeepDive(msg.stockCard.report);
                    }
                  }}
                  onShare={() => {
                    if (onOpenShareCard && msg.stockCard?.report) {
                      onOpenShareCard(msg.stockCard.report);
                    }
                  }}
                />
              ) : msg.stockCard ? (
                <StockMiniCard
                  card={msg.stockCard}
                  onOpenDeepDive={onOpenDeepDive}
                  onQuickFollowUp={(q) => onSelectPrompt(q)}
                  onOpenShareCard={onOpenShareCard}
                />
              ) : null}

              {/* Optional Head-to-Head Compare Card */}
              {msg.compareCard && (
                <StockCompareCard
                  comparison={msg.compareCard}
                  onOpenDeepDive={(sym) => {
                    if (onOpenSymbolTerminal) {
                      onOpenSymbolTerminal(sym);
                    } else {
                      onSelectPrompt(`Bagaimana analisis saham ${sym}?`);
                    }
                  }}
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
                className={`text-[9px] font-mono ${
                  isUser ? "text-slate-300 dark:text-slate-600 text-right" : "text-slate-400"
                }`}
              >
                {msg.timestamp}
              </div>
            </div>

            {isUser && (
              <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 text-slate-600 dark:text-slate-300">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        );
      })}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 p-2.5 rounded-md bg-white dark:bg-black border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-mono">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
          <span>{loadingStage || "Memproses query data Sectors API v2..."}</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
