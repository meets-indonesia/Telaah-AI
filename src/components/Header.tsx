"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, MessageSquare, LayoutDashboard, CandlestickChart, Radar, Pickaxe } from "lucide-react";
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
  const pathname = usePathname();
  const navItems = [
    { href: "/", label: "Beranda", icon: LayoutDashboard },
    { href: "/technical", label: "Teknikal", icon: CandlestickChart },
    { href: "/insider", label: "Insider", icon: Radar },
    { href: "/commodity", label: "Komoditas", icon: Pickaxe },
  ];

  return (
    <header className="border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#0b101d]/95 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Telaah 360, beranda">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm shadow-brand-500/20">
            <ShieldCheck className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-slate-950 dark:text-white">Telaah <span className="text-brand-600 dark:text-brand-400">360</span></div>
            <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400">Riset saham, dijelaskan sederhana</p>
          </div>
        </Link>

        <nav aria-label="Navigasi utama" className="hidden lg:flex items-center gap-1 ml-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"}`}>
                <Icon className="w-4 h-4" aria-hidden="true" />{item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* View Mode Toggle: Chat vs Studio */}
          {onToggleView && (
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs" aria-label="Tampilan beranda">
              <button
                type="button"
                onClick={() => onToggleView("chat")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  currentView === "chat"
                    ? "bg-white dark:bg-brand-600 text-brand-700 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Tanya AI</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleView("dashboard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  currentView === "dashboard"
                    ? "bg-white dark:bg-brand-600 text-brand-700 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Laporan</span>
                {hasReport && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            </div>
          )}

          <ThemeToggle />
        </div>
      </div>
      <nav aria-label="Navigasi seluler" className="lg:hidden flex items-center gap-1 overflow-x-auto px-3 pb-2 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex-1 min-w-fit inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${active ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300" : "text-slate-500 dark:text-slate-400"}`}><Icon className="w-3.5 h-3.5" />{item.label}</Link>;
        })}
      </nav>
    </header>
  );
};
