"use client";

import React from "react";
import { ShieldCheck, MessageSquare, LayoutDashboard, Sparkles } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  onSelectExample?: (prompt: string, mode: "quick" | "full") => void;
  currentView?: "chat" | "dashboard";
  onToggleView?: (view: "chat" | "dashboard") => void;
  hasReport?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectExample,
  currentView = "chat",
  onToggleView,
  hasReport = false,
}) => {
  const examples = [
    {
      label: "BBCA • Akumulasi Asing",
      prompt: "BCA (BBCA) labanya naik dan asing akumulasi. Benar gak ya?",
      mode: "quick" as const,
    },
    {
      label: "TLKM • Valuasi & Risiko",
      prompt: "Ada rumor laba TLKM tertekan dan asing jualan. Gimana faktanya?",
      mode: "full" as const,
    },
    {
      label: "ASII • Prospek Ritel",
      prompt: "ASII prospeknya gimana buat investor pemula tahun ini?",
      mode: "quick" as const,
    },
  ];

  return (
    <header className="border-b border-slate-200/90 dark:border-slate-800/80 bg-white/80 dark:bg-[#090d16]/90 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center shadow-md shadow-brand-500/25 ring-2 ring-brand-400/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Telaah <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-blue-500 to-indigo-500 dark:from-brand-400 dark:to-blue-300">360</span>
              </h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-500/30">
                Sectors API v2
              </span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hidden sm:inline-block">
                AI Financial Copilot
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Asisten Saham IDX Ramah Ritel • Analisis Faktual Tanpa Pom-Pom
            </p>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center flex-wrap gap-2.5 justify-between md:justify-end">
          {/* View Mode Toggle: Chat vs Studio */}
          {onToggleView && (
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => onToggleView("chat")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  currentView === "chat"
                    ? "bg-white dark:bg-brand-600 text-brand-700 dark:text-white shadow-sm font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>AI Chat</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleView("dashboard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  currentView === "dashboard"
                    ? "bg-white dark:bg-brand-600 text-brand-700 dark:text-white shadow-sm font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Studio 360°</span>
                {hasReport && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            </div>
          )}

          {/* Quick Example Pills on Desktop */}
          {onSelectExample && (
            <div className="hidden xl:flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px] flex items-center gap-1 pl-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
              </span>
              {examples.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectExample(ex.prompt, ex.mode)}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition text-[11px] truncate max-w-[150px]"
                  title={ex.prompt}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          )}

          {/* Dark / Light Mode Switcher */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
