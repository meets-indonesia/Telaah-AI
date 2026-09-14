"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { InsiderWhaleRadar } from "@/components/InsiderWhaleRadar";
import { getReportFromCache, getHistory, saveReportToHistory } from "@/lib/storage/history";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import { Radar, Loader2 } from "lucide-react";

export default function InsiderPage() {
  const [symbol, setSymbol] = useState("BBCA");
  const [report, setReport] = useState<CompanyIntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [watchlist, setWatchlist] = useState<any[]>([]);

  const sampleEmiten = ["BBCA", "BBRI", "ADRO", "ANTM", "TLKM", "DSSA", "AMMN"];

  useEffect(() => {
    const history = getHistory();
    setWatchlist(history);
    loadEmitenData("BBCA");
  }, []);

  const loadEmitenData = async (targetSymbol: string) => {
    const clean = targetSymbol.toUpperCase().trim();
    setSymbol(clean);
    setIsLoading(true);

    const cached = getReportFromCache(clean);
    if (cached && cached.insiderRadar) {
      setReport(cached);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Cek transaksi insider direksi, komisaris, dan filings keterbukaan ${clean}`,
          mode: "full",
          confirmedSymbol: clean,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        saveReportToHistory(data.report);
        setWatchlist(getHistory());
      }
    } catch (err) {
      console.error("Failed to load insider data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col bg-[#090d16] text-slate-100 transition-all duration-300 ${isSidebarCollapsed ? "md:pl-16" : "md:pl-64"}`}>
      <Sidebar
        report={report}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        watchlist={watchlist}
        onSelectWatchlist={(sym) => loadEmitenData(sym)}
      />

      <Header onSelectExample={(p) => loadEmitenData(p.slice(0, 4))} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Feature Title & Selector */}
        <div className="bg-[#0f172a]/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Radar className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Whale & Insider Radar
              </h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                OJK Filings
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pelacakan keterbukaan informasi insider trading, deteksi sinyal Cluster Buy direksi, dan perubahan kepemilikan saham &ge;5%.
            </p>
          </div>

          {/* Quick Emiten Picker */}
          <div className="flex items-center gap-2 flex-wrap">
            {sampleEmiten.map((sym) => (
              <button
                key={sym}
                onClick={() => loadEmitenData(sym)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                  symbol === sym
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-20 text-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
            <p className="text-xs font-mono">Memuat radar transaksi insider {symbol}...</p>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && report?.insiderRadar && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <InsiderWhaleRadar
              insiderRadar={report.insiderRadar}
              symbol={report.symbol}
            />
          </div>
        )}
      </main>
    </div>
  );
}
