"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Calculator,
  BookOpen,
  Search,
  Command,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { useI18n } from "@/lib/i18n/context";

export interface MarketIndexItem {
  name: string;
  code: string;
  price: string;
  change: string;
  isPositive: boolean;
  unit?: string;
}

interface HeaderProps {
  onSelectExample?: (prompt: string, mode: "quick" | "full") => void;
  currentView?: "chat" | "dashboard";
  onToggleView?: (view: "chat" | "dashboard") => void;
  hasReport?: boolean;
  marketIndices?: MarketIndexItem[];
  marketAsOfDate?: string;
  onOpenJargon?: () => void;
  onOpenDividend?: () => void;
  onFocusSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  marketIndices = [],
  marketAsOfDate = "",
  onOpenJargon,
  onOpenDividend,
  onFocusSearch,
}) => {
  const pathname = usePathname();
  const { t } = useI18n();

  const navLinks = [
    { href: "/", label: t("nav.terminal", "Terminal") },
    { href: "/watchlist", label: t("nav.watchlist", "Watchlist") },
  ];

  return (
    <header className="shrink-0 z-30 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-black/75 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 dark:supports-[backdrop-filter]:bg-black/75">
      {/* Top Main Navigation Bar */}
      <div className="w-full px-3 lg:px-5 py-2.5 min-h-[50px] flex items-center justify-between gap-3 text-xs">
        {/* Brand & Section Nav */}
        <div className="flex items-center gap-4 shrink-0 py-0.5">
          <nav aria-label="Navigasi Utama" className="hidden sm:flex items-center gap-1 py-0.5">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    active
                      ? "font-bold text-zinc-950 dark:text-white"
                      : "font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Global Search Hotkey Trigger */}
        <div className="flex-1 max-w-sm mx-2 py-0.5">
          <button
            type="button"
            onClick={onFocusSearch}
            className="w-full flex items-center justify-between px-3 py-2 rounded bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-zinc-500 hover:text-slate-900 dark:hover:text-slate-200 transition text-xs"
          >
            <span className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="text-slate-600 dark:text-slate-400">Cari emiten</span>
            </span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded border border-slate-300 dark:border-white/10">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right Tools & Toggles */}
        <div className="flex items-center gap-1.5 shrink-0 py-0.5">
          {onOpenDividend && (
            <button
              type="button"
              onClick={onOpenDividend}
              title={t("btn.dividend", "Kalkulator Dividen")}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white text-xs transition"
            >
              <Calculator className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
              <span className="hidden xl:inline">{t("btn.dividendShort", "Dividen")}</span>
            </button>
          )}

          {onOpenJargon && (
            <button
              type="button"
              onClick={onOpenJargon}
              title={t("btn.jargon", "Kamus Jargon Saham")}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-50 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white text-xs transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
              <span className="hidden xl:inline">{t("btn.jargonShort", "Jargon")}</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-0.5" />
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile Nav Links Row */}
      <nav aria-label="Navigasi Seluler" className="sm:hidden flex items-center gap-1 overflow-x-auto px-3 py-1 border-t border-slate-100 dark:border-white/10 no-scrollbar text-xs bg-white dark:bg-black">
        {navLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors shrink-0 ${
                active
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Global Macro Ticker Tape Strip */}
      {marketIndices && marketIndices.length > 0 && (
        <div className="border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/60 px-3 py-1 flex items-center text-[11px] font-mono overflow-hidden">
          <div className="shrink-0 flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-white/10 font-sans font-medium text-slate-500 dark:text-slate-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-zinc-700"></span>
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-900 dark:text-zinc-100">
              {t("ticker.status", "IDX TERKINI")}
            </span>
            {marketAsOfDate && (
              <span className="text-[9px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                ({marketAsOfDate})
              </span>
            )}
          </div>

          {/* Tape Container */}
          <div className="overflow-hidden relative w-full ml-3 flex items-center">
            <div className="animate-ticker flex items-center gap-6 py-0.5">
              {[...marketIndices, ...marketIndices].map((item, idx) => (
                <div
                  key={`${item.code}-${idx}`}
                  className="flex items-center gap-1.5 shrink-0 px-1 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-white/5 transition cursor-default"
                >
                  <span className="text-slate-600 dark:text-slate-400 font-sans font-medium">{item.name}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200 tabular-nums">
                    {item.price}
                    {item.unit && <span className="text-[9px] text-slate-500 dark:text-slate-400 font-normal ml-0.5">{item.unit}</span>}
                  </span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-semibold tabular-nums ${
                      item.isPositive
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                        : "text-rose-600 dark:text-rose-400 bg-rose-500/10"
                    }`}
                  >
                    {item.change}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700 select-none">•</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
