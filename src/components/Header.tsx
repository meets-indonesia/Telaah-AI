"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Calculator,
  BookOpen,
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
  onOpenJargon?: () => void;
  onOpenDividend?: () => void;
  onFocusSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  marketIndices = [],
  marketAsOfDate = "2026-09-11",
  isCopilotOpen = true,
  onToggleCopilot,
  onOpenJargon,
  onOpenDividend,
  onFocusSearch,
}) => {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Terminal" },
    { href: "/watchlist", label: "Watchlist" },
    { href: "/technical", label: "Teknikal" },
    { href: "/insider", label: "Insider" },
    { href: "/commodity", label: "Komoditas" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/75 backdrop-blur-md supports-[backdrop-filter]:bg-black/75">
      {/* Top Main Navigation Bar */}
      <div className="w-full px-3 lg:px-5 h-13 flex items-center justify-between gap-3 text-xs">
        {/* Brand & Section Nav */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/" className="flex items-center gap-2 group" aria-label="Telaah 360">
            {/* Custom Brand Logo */}
            <div className="h-7 w-auto flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/dark-logo.png"
                alt="Telaah 360 Logo"
                className="h-7 w-auto object-contain block dark:block"
              />
            </div>
            <span className="text-slate-300 font-medium tracking-tight text-xs">
              Telaah
            </span>
          </Link>

          <nav aria-label="Navigasi Utama" className="hidden sm:flex items-center gap-0.5 border-l border-white/10 pl-3">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    active
                      ? "bg-orange-500/15 text-orange-400 border border-orange-500/30 font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
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
            className="w-full flex items-center justify-between px-2.5 py-1 rounded bg-black/50 border border-white/10 text-slate-400 hover:border-orange-500/50 hover:text-slate-200 transition text-xs"
          >
            <span className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Cari emiten (contoh: BBCA, ADRO)...</span>
            </span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 bg-white/10 text-slate-300 rounded border border-white/10">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right Tools & Toggles */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenDividend && (
            <button
              type="button"
              onClick={onOpenDividend}
              title="Kalkulator Dividen"
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 text-slate-400 hover:text-white text-xs transition"
            >
              <Calculator className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden xl:inline">Dividen</span>
            </button>
          )}

          {onOpenJargon && (
            <button
              type="button"
              onClick={onOpenJargon}
              title="Kamus Jargon Saham"
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 text-slate-400 hover:text-white text-xs transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden xl:inline">Jargon</span>
            </button>
          )}

          {/* Copilot Dock Toggle Button with Hotkey */}
          {onToggleCopilot && (
            <button
              type="button"
              onClick={onToggleCopilot}
              title={`Toggle Copilot (${isCopilotOpen ? "Tutup" : "Buka"}) (⌘J)`}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition rounded ${
                isCopilotOpen
                  ? "text-orange-400 hover:text-orange-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {isCopilotOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
              <span>Copilot</span>
              <kbd className="hidden lg:inline-flex items-center text-[9px] font-mono text-slate-500 ml-0.5">⌘J</kbd>
            </button>
          )}

          <div className="h-4 w-px bg-white/10 mx-0.5" />
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
        <div className="border-t border-white/10 bg-black/60 px-3 py-1 flex items-center text-[11px] font-mono overflow-hidden">
          <div className="shrink-0 flex items-center gap-2 pr-3 border-r border-white/10 font-sans font-medium text-slate-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-orange-400">
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
                  className="flex items-center gap-1.5 shrink-0 px-1 py-0.5 rounded hover:bg-white/5 transition cursor-default"
                >
                  <span className="text-slate-400 font-sans font-medium">{item.name}</span>
                  <span className="font-semibold text-slate-200 tabular-nums">
                    {item.price}
                    {item.unit && <span className="text-[9px] text-slate-400 font-normal ml-0.5">{item.unit}</span>}
                  </span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded font-semibold tabular-nums ${
                      item.isPositive
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-rose-400 bg-rose-500/10"
                    }`}
                  >
                    {item.change}
                  </span>
                  <span className="text-slate-700 select-none">•</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
