"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Calculator,
  BookOpen,
  Scale,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Command,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

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
  isCopilotOpen?: boolean;
  onToggleCopilot?: () => void;
  onOpenCompare?: () => void;
  onOpenJargon?: () => void;
  onOpenDividend?: () => void;
  onFocusSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  marketIndices = [],
  marketAsOfDate = "2026-09-11",
  isCopilotOpen = true,
  onToggleCopilot,
  onOpenCompare,
  onOpenJargon,
  onOpenDividend,
  onFocusSearch,
}) => {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Terminal" },
    { href: "/technical", label: "Teknikal" },
    { href: "/insider", label: "Insider" },
    { href: "/commodity", label: "Komoditas" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-terminal-border bg-[#090a0f]/95 dark:bg-[#090a0f]/95 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-[#090a0f]/80">
      {/* Top Main Navigation Bar */}
      <div className="w-full px-3 lg:px-5 h-12 flex items-center justify-between gap-3 text-xs">
        {/* Brand & Section Nav */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/" className="flex items-center gap-2 group" aria-label="Telaah 360, Terminal">
            <div className="w-6 h-6 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/60 transition-colors">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">TELAAH</span>
              <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">360°</span>
              <span className="hidden md:inline-block text-[9px] px-1 py-0.2 rounded border border-slate-300 dark:border-slate-800 text-slate-500 font-mono uppercase tracking-wider">
                Terminal
              </span>
            </div>
          </Link>

          <nav aria-label="Navigasi Utama" className="hidden sm:flex items-center gap-0.5 border-l border-slate-200 dark:border-slate-800/80 pl-3">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    active
                      ? "bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Global Search Hotkey Trigger */}
        <div className="flex-1 max-w-sm mx-2 hidden md:block">
          <button
            type="button"
            onClick={onFocusSearch}
            className="w-full flex items-center justify-between px-2.5 py-1 rounded bg-slate-100 dark:bg-[#12151f] border border-slate-200 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 transition text-xs"
          >
            <span className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400">Cari emiten (contoh: BBCA, ADRO)...</span>
            </span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded border border-slate-300 dark:border-slate-700">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right Tools & Toggles */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenCompare && (
            <button
              type="button"
              onClick={onOpenCompare}
              title="Bandingkan 2 Saham"
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs transition"
            >
              <Scale className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Compare</span>
            </button>
          )}

          {onOpenDividend && (
            <button
              type="button"
              onClick={onOpenDividend}
              title="Kalkulator Dividen"
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs transition"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Dividen</span>
            </button>
          )}

          {onOpenJargon && (
            <button
              type="button"
              onClick={onOpenJargon}
              title="Kamus Jargon Saham"
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs transition"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Jargon</span>
            </button>
          )}

          {/* Copilot Dock Toggle Button with Hotkey */}
          {onToggleCopilot && (
            <button
              type="button"
              onClick={onToggleCopilot}
              title={`Toggle AI Copilot (${isCopilotOpen ? "Tutup" : "Buka"}) (⌘J)`}
              className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium transition ${
                isCopilotOpen
                  ? "bg-slate-200/80 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {isCopilotOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
              <span>Copilot</span>
              <kbd className="hidden lg:inline-flex items-center text-[9px] font-mono px-1 py-0.2 bg-slate-300/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 rounded ml-0.5">
                ⌘J
              </kbd>
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 dark:border-slate-800/80 mx-0.5" />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile Nav Links Row */}
      <nav aria-label="Navigasi Seluler" className="sm:hidden flex items-center gap-1 overflow-x-auto px-3 py-1 border-t border-slate-100 dark:border-slate-800/60 no-scrollbar text-xs bg-slate-50/50 dark:bg-[#0c0e15]">
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
        <div className="border-t border-terminal-border bg-slate-50 dark:bg-[#07090e] px-3 py-1 flex items-center text-[11px] font-mono overflow-hidden">
          <div className="shrink-0 flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-slate-800/80 font-sans font-medium text-slate-500 dark:text-slate-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-300">
              IDX LIVE
            </span>
            <span className="text-[9px] text-slate-400 hidden sm:inline">
              ({marketAsOfDate})
            </span>
          </div>

          {/* Tape Container */}
          <div className="overflow-hidden relative w-full ml-3 flex items-center">
            <div className="animate-ticker flex items-center gap-6 py-0.5">
              {[...marketIndices, ...marketIndices].map((item, idx) => (
                <div
                  key={`${item.code}-${idx}`}
                  className="flex items-center gap-1.5 shrink-0 px-1 py-0.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition cursor-default"
                >
                  <span className="text-slate-600 dark:text-slate-400 font-sans font-medium">{item.name}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-200 tabular-nums">
                    {item.price}
                    {item.unit && <span className="text-[9px] text-slate-400 font-normal ml-0.5">{item.unit}</span>}
                  </span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-semibold tabular-nums ${
                      item.isPositive
                        ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10"
                        : "text-rose-700 dark:text-rose-400 bg-rose-500/10"
                    }`}
                  >
                    {item.change}
                  </span>
                  <span className="text-slate-300 dark:text-slate-800 select-none">•</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
