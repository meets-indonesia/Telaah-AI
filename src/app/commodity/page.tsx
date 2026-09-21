"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { CommodityLensModule } from "@/components/CommodityLensModule";
import { getReportFromCache, saveReportToHistory } from "@/lib/storage/history";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import {
  Pickaxe,
  Loader2,
  Flame,
  TrendingUp,
  TrendingDown,
  Layers,
  DollarSign,
  Activity,
} from "lucide-react";

interface CommodityMarketItem {
  name: string;
  code: string;
  unit: string;
  latestPrice: number;
  changePct: number;
  history: Array<{ date: string; price: number }>;
}

const COMMODITY_EMITEN_LIST = [
  { symbol: "ADRO", name: "Adaro Energy", commodity: "Batu Bara", mcap: "117.7T" },
  { symbol: "ANTM", name: "Aneka Tambang", commodity: "Emas & Nikel", mcap: "37.0T" },
  { symbol: "AMMN", name: "Amman Mineral", commodity: "Tembaga & Emas", mcap: "667.2T" },
  { symbol: "DSSA", name: "Dian Swastatika Sentosa", commodity: "Batu Bara & Energi", mcap: "338.9T" },
  { symbol: "PTBA", name: "Bukit Asam", commodity: "Batu Bara", mcap: "30.5T" },
  { symbol: "BUMI", name: "Bumi Resources", commodity: "Batu Bara", mcap: "32.7T" },
  { symbol: "HRUM", name: "Harum Energy", commodity: "Nikel & Batu Bara", mcap: "17.4T" },
];

export default function CommodityPage() {
  const [symbol, setSymbol] = useState("ADRO");
  const [report, setReport] = useState<CompanyIntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Global Commodities Live Prices
  const [commodities, setCommodities] = useState<CommodityMarketItem[]>([]);
  const [isLoadingCommodities, setIsLoadingCommodities] = useState(false);

  useEffect(() => {
    loadEmitenData("ADRO");
    loadCommoditiesPrices();
  }, []);

  const loadCommoditiesPrices = async () => {
    setIsLoadingCommodities(true);
    try {
      const res = await fetch("/api/commodity-prices");
      const data = await res.json();
      if (data.success && Array.isArray(data.commodities)) {
        setCommodities(data.commodities);
      }
    } catch (err) {
      console.error("Failed to load commodity prices:", err);
    } finally {
      setIsLoadingCommodities(false);
    }
  };

  const loadEmitenData = async (targetSymbol: string) => {
    const clean = targetSymbol.toUpperCase().trim();
    setSymbol(clean);
    setIsLoading(true);

    const cached = getReportFromCache(clean);
    if (cached && cached.commodityLens?.isCommodityIssuer) {
      setReport(cached);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Analisis komoditas acuan global, cadangan tambang, dan sensitivitas EBITDA ${clean}`,
          mode: "full",
          confirmedSymbol: clean,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        saveReportToHistory(data.report);
      }
    } catch (err) {
      console.error("Failed to load commodity data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-black text-slate-100 transition-colors">
      <Header />

      <main id="main-content" className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-4 space-y-4">
        {/* Top Overview Banner Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black border border-slate-800/80 p-3.5 rounded-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 flex items-center justify-center shrink-0">
              <Pickaxe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
                  COMMODITY TERMINAL & MINING SENSITIVITY
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Global Acuan
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Korelasi harga komoditas tambang dunia (Batu Bara, Emas, Nikel, Tembaga) terhadap kinerja EBITDA dan laba operasional emiten BEI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar self-start sm:self-auto text-xs font-mono">
            <span className="text-slate-500 text-[10px] uppercase">Emiten:</span>
            {COMMODITY_EMITEN_LIST.map((item) => (
              <button
                key={item.symbol}
                onClick={() => loadEmitenData(item.symbol)}
                className={`px-2 py-0.5 rounded transition ${
                  symbol === item.symbol
                    ? "bg-amber-600 text-white font-bold"
                    : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Global Commodities 4-Metric Grid (Live Sectors Mining API) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoadingCommodities ? (
            <div className="col-span-4 bg-black p-6 rounded-lg border border-slate-800/80 text-center text-xs font-mono text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-500 mx-auto mb-2" />
              Memuat harga acuan komoditas global...
            </div>
          ) : commodities.length === 0 ? (
            <div className="col-span-4 bg-black p-4 rounded-lg border border-slate-800/80 text-center text-xs font-mono text-slate-500">
              Data harga komoditas acuan sedang diperbarui.
            </div>
          ) : (
            commodities.map((c) => {
              const isPos = c.changePct >= 0;
              return (
                <div
                  key={c.code}
                  className="bg-black p-3 rounded-lg border border-slate-800/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 text-xs">{c.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{c.unit}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 font-mono">
                    <span className="text-base sm:text-lg font-bold text-white tabular-nums">
                      ${c.latestPrice.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`text-xs font-bold tabular-nums flex items-center gap-0.5 ${
                        isPos ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isPos ? "+" : ""}{c.changePct}%
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono block">
                    Update Terakhir: {c.history[c.history.length - 1]?.date || "-"}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* 2-Column Workstation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Mining Universe Comparison (4 cols) */}
          <div className="lg:col-span-4 bg-black rounded-lg border border-slate-800/80 p-3.5 space-y-3 flex flex-col">
            <div className="border-b border-slate-800/60 pb-2 flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-400" /> Mining Universe Matrix
              </span>
              <span className="text-[10px] text-slate-500 font-mono">7 Emiten</span>
            </div>

            <div className="space-y-1.5">
              {COMMODITY_EMITEN_LIST.map((item) => {
                const isSelected = symbol === item.symbol;

                return (
                  <div
                    key={item.symbol}
                    onClick={() => loadEmitenData(item.symbol)}
                    className={`p-2.5 rounded border cursor-pointer transition text-xs flex items-center justify-between ${
                      isSelected
                        ? "bg-zinc-500/10 border-zinc-500/30 text-white"
                        : "bg-slate-900/50 border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-100">{item.symbol}</span>
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-zinc-400">
                          {item.commodity}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-sans mt-0.5 block truncate max-w-[170px]">
                        {item.name}
                      </span>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-slate-300 font-semibold text-xs block">
                        Rp {item.mcap}
                      </span>
                      <span className="text-[9px] text-slate-500">Market Cap</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Active Commodity Lens & Sensitivity Simulator (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {isLoading ? (
              <div className="bg-black rounded-lg border border-slate-800/80 p-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500 mx-auto" />
                <p className="text-xs font-mono text-slate-400">
                  Memuat data cadangan tambang & model sensitivitas {symbol}...
                </p>
              </div>
            ) : report && report.commodityLens ? (
              <CommodityLensModule
                commodityLens={report.commodityLens}
                symbol={symbol}
                companyName={report.companyName}
              />
            ) : (
              <div className="bg-black p-12 rounded-lg border border-slate-800/80 text-center text-xs font-mono text-slate-500">
                Pilih salah satu emiten tambang di sisi kiri untuk melihat simulator sensitivitas.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
