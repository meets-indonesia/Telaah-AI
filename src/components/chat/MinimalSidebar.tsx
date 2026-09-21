"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquarePen,
  ChevronLeft,
  ChevronRight,
  History,
  Star,
  Trash2,
  Clock,
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
  Search,
  BookOpen,
  Calculator,
  Compass,
  Zap,
} from "lucide-react";
import { SavedReportItem, formatRelativeTime } from "@/lib/storage/history";
import { ChatSession } from "@/components/chat/types";
import { CompanyLogo } from "@/components/CompanyLogo";

interface MinimalSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  historyItems: SavedReportItem[];
  watchlistSymbols: string[];
  currentSymbol?: string;
  onSelectSymbol: (symbol: string) => void;
  onRemoveHistory: (symbol: string) => void;
  onClearHistory: () => void;
}

export const MinimalSidebar: React.FC<MinimalSidebarProps> = ({
  isOpen,
  onToggle,
  onNewChat,
  historyItems,
  watchlistSymbols,
  currentSymbol,
  onSelectSymbol,
  onRemoveHistory,
  onClearHistory,
}) => {
  const pathname = usePathname();
  const [activeSubTab, setActiveSubTab] = useState<"history" | "watchlist">("history");

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out bg-white dark:bg-black border-r border-slate-200 dark:border-white/10 ${
          isOpen ? "w-64" : "w-0 md:w-16 overflow-hidden"
        }`}
      >
        {/* Top Header & Brand */}
        <div className="h-14 px-3.5 flex items-center justify-between border-b border-slate-200 dark:border-white/10 shrink-0">
          {isOpen ? (
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <div className="h-6 w-auto flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/dark-logo.png" alt="Telaah 360" className="h-6 w-auto object-contain" />
              </div>
              <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white truncate">
                Telaah
              </span>
            </Link>
          ) : (
            <div className="mx-auto">
              <img src="/brand/dark-logo.png" alt="Telaah" className="h-6 w-auto object-contain" />
            </div>
          )}

          <button
            type="button"
            onClick={onToggle}
            title={isOpen ? "Tutup Sidebar" : "Buka Sidebar"}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Action: New Research Chat */}
        <div className="p-3 shrink-0">
          <button
            type="button"
            onClick={onNewChat}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white text-xs font-medium transition shadow-xs ${
              !isOpen ? "md:px-0" : ""
            }`}
          >
            <SquarePen className="w-4 h-4 text-orange-500 shrink-0" />
            {isOpen && <span>Riset Emiten Baru</span>}
          </button>
        </div>

        {/* Navigation Stations */}
        <div className="px-2 space-y-0.5 shrink-0 text-xs font-medium">
          {[
            { href: "/", label: "Percakapan Terminal", icon: LayoutDashboard },
            { href: "/watchlist", label: "Watchlist Matriks", icon: Star },
            { href: "/technical", label: "Screener Teknikal", icon: Compass },
            { href: "/insider", label: "Insider Whales", icon: Zap },
          ].map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition ${
                  active
                    ? "bg-orange-500/15 text-orange-400 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                } ${!isOpen ? "justify-center px-0" : ""}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {isOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Middle Content: History & Watchlist (Only visible when open) */}
        {isOpen ? (
          <div className="flex-1 flex flex-col min-h-0 mt-3 border-t border-slate-200 dark:border-white/10">
            {/* Sub Tabs */}
            <div className="flex items-center px-3 pt-2.5 gap-2 text-xs border-b border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setActiveSubTab("history")}
                className={`pb-1.5 flex items-center gap-1.5 text-[11px] font-medium transition border-b-2 ${
                  activeSubTab === "history"
                    ? "border-orange-500 text-orange-400 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Riwayat ({historyItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab("watchlist")}
                className={`pb-1.5 flex items-center gap-1.5 text-[11px] font-medium transition border-b-2 ${
                  activeSubTab === "watchlist"
                    ? "border-orange-500 text-orange-400 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>Watchlist ({watchlistSymbols.length})</span>
              </button>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
              {activeSubTab === "history" ? (
                historyItems.length > 0 ? (
                  historyItems.map((item) => {
                    const isSelected = currentSymbol === item.symbol;
                    const isPositive = (item.dailyReturnPct ?? 0) >= 0;
                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectSymbol(item.symbol)}
                        className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                          isSelected
                            ? "bg-orange-500/10 text-orange-400 border border-orange-500/25"
                            : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CompanyLogo symbol={item.symbol} companyName={item.companyName} size="sm" />
                          <div className="min-w-0">
                            <span className="font-mono font-bold block leading-tight">
                              {item.symbol}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block max-w-[110px]">
                              {item.companyName}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {item.lastPrice ? (
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                isPositive ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {item.lastPrice.toLocaleString("id-ID")}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveHistory(item.symbol);
                            }}
                            title="Hapus dari riwayat"
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    Belum ada riwayat telaah.
                  </div>
                )
              ) : (
                watchlistSymbols.length > 0 ? (
                  watchlistSymbols.map((sym) => (
                    <div
                      key={sym}
                      onClick={() => onSelectSymbol(sym)}
                      className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                        currentSymbol === sym
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                          : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CompanyLogo symbol={sym} size="sm" />
                        <span className="font-mono font-bold block">{sym}</span>
                      </div>
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    Watchlist masih kosong.
                  </div>
                )
              )}
            </div>

            {/* Bottom Footer Actions */}
            {activeSubTab === "history" && historyItems.length > 0 && (
              <div className="p-2 border-t border-slate-100 dark:border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="w-full text-center text-[10px] text-slate-400 hover:text-rose-400 py-1 transition font-mono"
                >
                  Bersihkan Riwayat
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center py-4 space-y-3">
            {historyItems.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSymbol(item.symbol)}
                title={item.symbol}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition"
              >
                <CompanyLogo symbol={item.symbol} size="sm" />
              </button>
            ))}
          </div>
        )}
      </aside>
    </>
  );
};
