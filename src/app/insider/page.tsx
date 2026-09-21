"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { InsiderWhaleRadar } from "@/components/InsiderWhaleRadar";
import { getReportFromCache, saveReportToHistory } from "@/lib/storage/history";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import {
  Radar,
  Loader2,
  Users,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  FileText,
  Filter,
  ExternalLink,
} from "lucide-react";

interface LiveFiling {
  title: string;
  body: string;
  source: string;
  timestamp: string;
  symbol: string;
  transaction_type: string;
  holder_type: string;
  holder_name: string;
  amount_transaction: number;
  price: number;
  transaction_value: number;
  share_percentage_before?: number;
  share_percentage_after?: number;
}

const SAMPLE_RADAR_EMITEN = ["BBCA", "BBRI", "ADRO", "ANTM", "TLKM", "DSSA", "AMMN", "KIJA"];

export default function InsiderPage() {
  const [symbol, setSymbol] = useState("BBCA");
  const [report, setReport] = useState<CompanyIntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Live OJK Filings Stream
  const [filings, setFilings] = useState<LiveFiling[]>([]);
  const [filingFilter, setFilingFilter] = useState<"all" | "buy" | "sell">("all");
  const [isLoadingFilings, setIsLoadingFilings] = useState(false);

  useEffect(() => {
    loadEmitenData("BBCA");
    loadFilingsFeed("all");
  }, []);

  const loadFilingsFeed = async (type: "all" | "buy" | "sell") => {
    setFilingFilter(type);
    setIsLoadingFilings(true);
    try {
      const typeParam = type !== "all" ? `&type=${type}` : "";
      const res = await fetch(`/api/insider-feed?limit=25${typeParam}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.filings)) {
        setFilings(data.filings);
      }
    } catch (err) {
      console.error("Failed to load filings feed:", err);
    } finally {
      setIsLoadingFilings(false);
    }
  };

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
      }
    } catch (err) {
      console.error("Failed to load insider data:", err);
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
            <div className="w-8 h-8 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Radar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white uppercase font-mono">
                  IDX INSIDER FLOW & WHALE RADAR
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  OJK Stream
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pelacakan aksi beli dan jual saham oleh Direksi, Komisaris, dan Pemegang Saham Pengendali dari keterbukaan informasi bursa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar self-start sm:self-auto text-xs font-mono">
            <span className="text-slate-500 text-[10px] uppercase">Emiten:</span>
            {SAMPLE_RADAR_EMITEN.map((sym) => (
              <button
                key={sym}
                onClick={() => loadEmitenData(sym)}
                className={`px-2 py-0.5 rounded transition ${
                  symbol === sym
                    ? "bg-indigo-600 text-white font-bold"
                    : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Live OJK Filings Feed (5 cols) */}
          <div className="lg:col-span-5 bg-black rounded-lg border border-slate-800/80 p-3.5 space-y-3 flex flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                  Live OJK Filings Feed
                </span>
              </div>

              {/* Feed Filter Buttons */}
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <button
                  onClick={() => loadFilingsFeed("all")}
                  className={`px-1.5 py-0.5 rounded transition ${
                    filingFilter === "all"
                      ? "bg-slate-800 text-white font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => loadFilingsFeed("buy")}
                  className={`px-1.5 py-0.5 rounded transition ${
                    filingFilter === "buy"
                      ? "bg-emerald-600 text-white font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Beli
                </button>
                <button
                  onClick={() => loadFilingsFeed("sell")}
                  className={`px-1.5 py-0.5 rounded transition ${
                    filingFilter === "sell"
                      ? "bg-rose-600 text-white font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Jual
                </button>
              </div>
            </div>

            {/* Feed List */}
            <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {isLoadingFilings ? (
                <div className="py-12 text-center text-xs font-mono text-slate-400 space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mx-auto" />
                  <p>Memuat live feed keterbukaan OJK...</p>
                </div>
              ) : filings.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center font-mono">
                  Tidak ada laporan filing terkini yang ditemukan.
                </p>
              ) : (
                filings.map((f, i) => {
                  const isBuy = f.transaction_type?.toLowerCase() === "buy";
                  const cleanSym = f.symbol?.replace(".JK", "") || "IDX";

                  return (
                    <div
                      key={i}
                      onClick={() => loadEmitenData(cleanSym)}
                      className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-100 px-1 py-0.2 bg-slate-800 rounded text-[11px]">
                            {cleanSym}
                          </span>
                          <span
                            className={`text-[9px] font-mono font-bold uppercase px-1 py-0.2 rounded ${
                              isBuy
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {f.transaction_type}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {f.timestamp ? f.timestamp.split("T")[0] : "-"}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300 font-medium">
                        {f.holder_name}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>
                          {f.amount_transaction
                            ? `${f.amount_transaction.toLocaleString("id-ID")} lbr`
                            : "-"}
                        </span>
                        {f.price ? <span>@ Rp {f.price.toLocaleString("id-ID")}</span> : null}
                        {f.transaction_value ? (
                          <span className="font-bold text-slate-200">
                            Rp {(f.transaction_value / 1e9).toFixed(1)}B
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Active Emiten Radar Dossier (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {isLoading ? (
              <div className="bg-black rounded-lg border border-slate-800/80 p-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
                <p className="text-xs font-mono text-slate-400">
                  Menganalisis cluster transaksi insider & kepemilikan {symbol}...
                </p>
              </div>
            ) : report && report.insiderRadar ? (
              <div className="space-y-4">
                <InsiderWhaleRadar
                  insiderRadar={report.insiderRadar}
                  symbol={symbol}
                />
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
