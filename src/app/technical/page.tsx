"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { TechnicalModule } from "@/components/TechnicalModule";
import { CandlestickChart } from "@/components/CandlestickChart";
import { getReportFromCache, saveReportToHistory } from "@/lib/storage/history";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import {
  Activity,
  CandlestickChart as CandleIcon,
  Loader2,
  TrendingUp,
  TrendingDown,
  Filter,
  BarChart2,
  Layers,
  Search,
} from "lucide-react";

interface ScreenerStock {
  symbol: string;
  companyName: string;
  sector: string;
  price: number;
  change1d: number;
  rsi14: number;
  trend: "Bullish" | "Bearish" | "Neutral";
  sma20Diff: number; // % vs SMA20
}

const TOP_IDX_STOCKS: ScreenerStock[] = [
  { symbol: "BBCA", companyName: "Bank Central Asia", sector: "Financials", price: 6300, change1d: -0.79, rsi14: 45.6, trend: "Bullish", sma20Diff: 0.8 },
  { symbol: "BBRI", companyName: "Bank Rakyat Indonesia", sector: "Financials", price: 3310, change1d: -0.60, rsi14: 54.5, trend: "Bullish", sma20Diff: 1.2 },
  { symbol: "BMRI", companyName: "Bank Mandiri", sector: "Financials", price: 4950, change1d: +0.41, rsi14: 58.2, trend: "Bullish", sma20Diff: 2.1 },
  { symbol: "TLKM", companyName: "Telkom Indonesia", sector: "Infrastructures", price: 2560, change1d: -1.16, rsi14: 41.3, trend: "Neutral", sma20Diff: -0.4 },
  { symbol: "ASII", companyName: "Astra International", sector: "Consumer", price: 4780, change1d: +1.27, rsi14: 62.4, trend: "Bullish", sma20Diff: 3.0 },
  { symbol: "ADRO", companyName: "Adaro Energy", sector: "Energy", price: 3680, change1d: +0.82, rsi14: 52.1, trend: "Neutral", sma20Diff: 0.5 },
  { symbol: "ANTM", companyName: "Aneka Tambang", sector: "Basic Materials", price: 1540, change1d: +2.33, rsi14: 66.8, trend: "Bullish", sma20Diff: 4.2 },
  { symbol: "AMMN", companyName: "Amman Mineral", sector: "Basic Materials", price: 9200, change1d: -1.08, rsi14: 48.9, trend: "Neutral", sma20Diff: -0.2 },
  { symbol: "BREN", companyName: "Barito Renewables", sector: "Energy", price: 6850, change1d: -2.14, rsi14: 38.5, trend: "Bearish", sma20Diff: -3.5 },
  { symbol: "ICBP", companyName: "Indofood CBP", sector: "Consumer", price: 11450, change1d: +0.44, rsi14: 50.3, trend: "Neutral", sma20Diff: 0.1 },
];

export default function TechnicalPage() {
  const [selectedSymbol, setSelectedSymbol] = useState("BBRI");
  const [report, setReport] = useState<CompanyIntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [screenerFilter, setScreenerFilter] = useState<"ALL" | "BULLISH" | "OVERSOLD" | "OVERBOUGHT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadEmitenData("BBRI");
  }, []);

  const loadEmitenData = async (targetSymbol: string) => {
    const clean = targetSymbol.toUpperCase().trim();
    setSelectedSymbol(clean);
    setIsLoading(true);

    const cached = getReportFromCache(clean);
    if (cached && cached.technical && cached.technical.chartSeries?.length > 20) {
      setReport(cached);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Analisis teknikal lengkap dan chart harian ${clean}`,
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
      console.error("Failed to load technical:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStocks = TOP_IDX_STOCKS.filter((stock) => {
    const matchSearch = stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;

    if (screenerFilter === "BULLISH") return stock.trend === "Bullish";
    if (screenerFilter === "OVERSOLD") return stock.rsi14 < 45;
    if (screenerFilter === "OVERBOUGHT") return stock.rsi14 > 60;
    return true;
  });

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#090a0f] text-slate-100 transition-colors">
      <Header />

      <main id="main-content" className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-4 space-y-4">
        {/* Page Top Banner Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1118] border border-slate-800/80 p-3.5 rounded-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CandleIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
                  IDX TECHNICAL TERMINAL & SCREENER
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Live Feed
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pindai momentum harga, SMA20/50, dan RSI 14 Wilder lintas saham paling likuid di Bursa Efek Indonesia.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-[11px]">
            <span className="text-slate-400">Aktif:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              {selectedSymbol}
            </span>
          </div>
        </div>

        {/* 2-Column Institutional Workstation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left / Screener Matrix: 5 cols */}
          <div className="lg:col-span-5 bg-[#0f1118] rounded-lg border border-slate-800/80 p-3.5 space-y-3 flex flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  Market Screener Matrix
                </span>
              </div>

              {/* Screener Filter Tabs */}
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <button
                  onClick={() => setScreenerFilter("ALL")}
                  className={`px-1.5 py-0.5 rounded transition ${
                    screenerFilter === "ALL"
                      ? "bg-slate-800 text-white font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setScreenerFilter("BULLISH")}
                  className={`px-1.5 py-0.5 rounded transition ${
                    screenerFilter === "BULLISH"
                      ? "bg-emerald-600 text-white font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Bullish
                </button>
                <button
                  onClick={() => setScreenerFilter("OVERSOLD")}
                  className={`px-1.5 py-0.5 rounded transition ${
                    screenerFilter === "OVERSOLD"
                      ? "bg-indigo-600 text-white font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  RSI &lt;45
                </button>
              </div>
            </div>

            {/* Quick Search inside screener */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari simbol atau emiten..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#131622] rounded border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600 font-sans"
              />
            </div>

            {/* Screener Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800/80">
                  <tr>
                    <th className="py-2 px-2 font-semibold">Emiten</th>
                    <th className="py-2 px-2 text-right font-semibold">Harga</th>
                    <th className="py-2 px-2 text-right font-semibold">1D %</th>
                    <th className="py-2 px-2 text-right font-semibold">RSI(14)</th>
                    <th className="py-2 px-2 text-right font-semibold">Tren</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredStocks.map((stock) => {
                    const isSelected = selectedSymbol === stock.symbol;
                    const isPos = stock.change1d >= 0;

                    return (
                      <tr
                        key={stock.symbol}
                        onClick={() => loadEmitenData(stock.symbol)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? "bg-indigo-600/15 border-l-2 border-l-indigo-500 text-white"
                            : "hover:bg-slate-800/40 text-slate-300 hover:text-white"
                        }`}
                      >
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-100">{stock.symbol}</span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[90px] hidden sm:inline font-sans">
                              {stock.companyName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-semibold tabular-nums">
                          {stock.price.toLocaleString("id-ID")}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold tabular-nums">
                          <span
                            className={
                              isPos ? "text-emerald-400" : "text-rose-400"
                            }
                          >
                            {isPos ? "+" : ""}
                            {stock.change1d.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          <span
                            className={
                              stock.rsi14 > 60
                                ? "text-rose-400 font-bold"
                                : stock.rsi14 < 45
                                ? "text-emerald-400 font-bold"
                                : "text-slate-300"
                            }
                          >
                            {stock.rsi14.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span
                            className={`text-[9px] uppercase px-1 py-0.2 rounded font-bold ${
                              stock.trend === "Bullish"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : stock.trend === "Bearish"
                                ? "bg-rose-500/10 text-rose-400"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {stock.trend}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right / Terminal Chart & Indicators: 7 cols */}
          <div className="lg:col-span-7 space-y-4">
            {isLoading ? (
              <div className="bg-[#0f1118] rounded-lg border border-slate-800/80 p-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
                <p className="text-xs font-mono text-slate-400">
                  Memuat data transaksi 90 hari {selectedSymbol} dari Sectors API v2...
                </p>
              </div>
            ) : report && report.technical ? (
              <div className="space-y-4">
                {/* Technical Module with Indicators */}
                <TechnicalModule
                  technical={report.technical}
                  symbol={report.symbol}
                  companyName={report.companyName}
                />
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
