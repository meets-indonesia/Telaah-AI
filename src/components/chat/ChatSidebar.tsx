"use client";

import React from "react";
import {
  Plus,
  MessageSquare,
  TrendingUp,
  Bookmark,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Database,
  Sparkles,
  Swords,
  BookOpen,
  Coins,
} from "lucide-react";
import { ChatSession } from "./types";

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onSelectQuickSymbol: (symbol: string) => void;
  onOpenCompare?: () => void;
  onOpenJargon?: () => void;
  onOpenDividend?: () => void;
  creditUsed?: number;
}

const POPULAR_TICKERS = [
  { symbol: "BBCA", name: "Bank Central Asia", badge: "Perbankan" },
  { symbol: "BBRI", name: "Bank Rakyat Indonesia", badge: "Perbankan" },
  { symbol: "TLKM", name: "Telkom Indonesia", badge: "Telko" },
  { symbol: "ASII", name: "Astra International", badge: "Konglomerasi" },
  { symbol: "ADRO", name: "Adaro Energy", badge: "Energi" },
  { symbol: "ICBP", name: "Indofood CBP", badge: "Konsumer" },
];

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onToggle,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onSelectQuickSymbol,
  onOpenCompare,
  onOpenJargon,
  onOpenDividend,
  creditUsed = 0,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      <aside
        aria-label="Menu alat dan riwayat"
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 flex flex-col bg-white dark:bg-[#0b101d] border-r border-slate-200 dark:border-slate-800/80 transition-transform duration-300 w-72 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top: New Chat button */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-2">
          <button
            onClick={onNewChat}
            type="button"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm shadow-brand-500/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Obrolan Baru</span>
          </button>
          <button
            onClick={onToggle}
            type="button"
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Tutup menu"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Middle: Scrollable list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Quick Smart Tools for Retail */}
          <div>
            <div className="px-2 mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-500" /> Alat bantu pemula
              </span>
            </div>
            <div className="space-y-1">
              {onOpenCompare && (
                <button
                  type="button"
                  onClick={onOpenCompare}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition text-left"
                >
                  <Swords className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="font-medium">Bandingkan dua saham</span>
                </button>
              )}
              {onOpenJargon && (
                <button
                  type="button"
                  onClick={onOpenJargon}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition text-left"
                >
                  <BookOpen className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                  <span className="font-medium">Kamus istilah saham</span>
                </button>
              )}
              {onOpenDividend && (
                <button
                  type="button"
                  onClick={onOpenDividend}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition text-left"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-medium">Kalkulator Dividen</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Watchlist / Populer */}
          <div>
            <div className="px-2 mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Bookmark className="w-3 h-3 text-brand-500" /> Saham populer
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {POPULAR_TICKERS.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => onSelectQuickSymbol(item.symbol)}
                  className="flex flex-col items-start p-2 rounded-lg text-left bg-slate-50 hover:bg-brand-50/70 dark:bg-slate-900/60 dark:hover:bg-brand-950/40 border border-slate-200/80 dark:border-slate-800/70 hover:border-brand-300 dark:hover:border-brand-800 transition group"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                    {item.symbol}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate w-full">
                    {item.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat History */}
          <div>
            <div className="px-2 mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-slate-400" /> Riwayat Obrolan
              </span>
              <span className="text-[10px] text-slate-500">{sessions.length}</span>
            </div>

            {sessions.length === 0 ? (
              <div className="px-3 py-4 text-center rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800/80">
                <p className="text-xs text-slate-400">Belum ada obrolan.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Tanyakan kode saham untuk memulai.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <div
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                        isActive
                          ? "bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/80 font-medium"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{session.title}</span>
                      </div>
                      <button
                        onClick={(e) => onDeleteSession(session.id, e)}
                        type="button"
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                        title="Hapus obrolan"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Sectors quota info */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 text-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-brand-500" />
              Sectors API v2
            </span>
            <span className="font-semibold text-brand-600 dark:text-brand-400">
              {creditUsed} kredit dipakai
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Data terverifikasi Bursa Efek Indonesia (IDX).
          </p>
        </div>
      </aside>
    </>
  );
};
