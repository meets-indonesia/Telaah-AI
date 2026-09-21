"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  CandlestickChart as CandleIcon,
  Radar,
  Pickaxe,
  PlusCircle,
  Coins,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Database,
  MessageSquare,
} from "lucide-react";
import { CompanyIntelligenceReport } from "@/lib/agent/types";

interface SidebarProps {
  report?: CompanyIntelligenceReport | null;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onNewAnalysis?: () => void;
  onOpenEvidence?: () => void;
  onOpenQA?: () => void;
  onShare?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  watchlist?: Array<{ symbol: string; companyName: string; lastPrice?: number }>;
  onSelectWatchlist?: (symbol: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  report,
  activeTab,
  onTabChange,
  onNewAnalysis,
  onOpenEvidence,
  onOpenQA,
  isCollapsed = false,
  onToggleCollapse,
  watchlist = [],
  onSelectWatchlist,
}) => {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Ringkasan 360°", icon: LayoutDashboard },
    { href: "/technical", label: "Terminal Teknikal", icon: CandleIcon },
    { href: "/insider", label: "Whale & Insider Radar", icon: Radar },
    { href: "/commodity", label: "Commodity Lens", icon: Pickaxe },
  ];

  return (
    <aside
      className={`hidden lg:flex fixed top-0 left-0 bottom-0 z-40 bg-[#070b13] border-r border-slate-800/80 transition-all duration-300 flex-col justify-between select-none ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Top Brand Section */}
      <div>
        <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
          {!isCollapsed && (
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-black text-white tracking-tight flex items-center gap-1">
                  Telaah <span className="text-blue-400">360</span>
                </h1>
                <span className="text-[9px] font-mono text-slate-400 uppercase block">
                  Terminal Riset IDX
                </span>
              </div>
            </Link>
          )}

          {isCollapsed && (
            <Link href="/" className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </Link>
          )}

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition ml-auto"
              title={isCollapsed ? "Buka Sidebar" : "Kecilkan Sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* New Analysis Button */}
        <div className="p-2.5">
          <Link
            href="/"
            className={`w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition ${
              isCollapsed ? "px-2" : "px-3"
            }`}
            title="Telaah Emiten Baru"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Telaah Emiten Baru</span>}
          </Link>
        </div>

        {/* Navigation Modules (Real Routes) */}
        <div className="px-2 py-1 space-y-1">
          {!isCollapsed && (
            <span className="px-2.5 text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
              Navigasi Halaman
            </span>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition text-left ${
                  isActive
                    ? "bg-blue-600/25 text-blue-300 border border-blue-500/40 shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                {!isCollapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="truncate">{item.label}</span>

                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Watchlist Section */}
        {!isCollapsed && watchlist.length > 0 && (
          <div className="px-3 pt-3 border-t border-slate-800/60 mt-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5 mb-1.5">
              <Bookmark className="w-3 h-3 text-zinc-400" /> Watchlist Tersimpan
            </span>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {watchlist.slice(0, 5).map((w) => (
                <button
                  key={w.symbol}
                  onClick={() => onSelectWatchlist?.(w.symbol)}
                  className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/60 text-xs text-left transition text-slate-300 hover:text-white"
                >
                  <span className="font-mono font-bold text-blue-400">{w.symbol}</span>
                  {w.lastPrice && (
                    <span className="text-[11px] font-mono text-slate-400">
                      Rp {w.lastPrice.toLocaleString("id-ID")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions & Credit Meter */}
      <div className="p-2.5 border-t border-slate-800/80 space-y-2 bg-[#060910]">
        {/* Drawers Quick Actions if available */}
        {report && (
          <div className="space-y-1">
            {onOpenEvidence && (
              <button
                onClick={onOpenEvidence}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800 transition ${
                  isCollapsed ? "justify-center" : ""
                }`}
                title="Buka Bukti Data"
              >
                <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                {!isCollapsed && <span>Bukti Data ({report.evidenceRecords?.length || 0})</span>}
              </button>
            )}

            {onOpenQA && (
              <button
                onClick={onOpenQA}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 text-xs border border-blue-500/30 transition ${
                  isCollapsed ? "justify-center" : ""
                }`}
                title="Tanya Laporan AI"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                {!isCollapsed && <span>Tanya Laporan AI</span>}
              </button>
            )}
          </div>
        )}

        {/* Credit Meter */}
        {!isCollapsed && report && (
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-400 font-mono space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1 text-slate-400">
                <Coins className="w-3 h-3 text-zinc-400" /> Kredit Terpakai:
              </span>
              <span className="font-bold text-zinc-400">{report.creditsConsumed} Kredit</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-zinc-500"
                style={{ width: `${Math.min(100, (report.creditsConsumed / 30) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-emerald-400 block text-right font-sans">
              Status Efisien (&lt;30 Max PRD)
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};
