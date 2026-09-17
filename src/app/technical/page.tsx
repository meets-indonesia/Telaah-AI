"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { TechnicalModule } from "@/components/TechnicalModule";
import { FeaturePageHeader } from "@/components/FeaturePageHeader";
import { getReportFromCache, saveReportToHistory } from "@/lib/storage/history";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import { CandlestickChart as CandleIcon, Loader2 } from "lucide-react";

export default function TechnicalPage() {
  const [symbol, setSymbol] = useState("BBCA");
  const [report, setReport] = useState<CompanyIntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sampleEmiten = ["BBCA", "BBRI", "ADRO", "ANTM", "TLKM", "DSSA", "AMMN"];

  useEffect(() => {
    loadEmitenData("BBCA");
  }, []);

  const loadEmitenData = async (targetSymbol: string) => {
    const clean = targetSymbol.toUpperCase().trim();
    setSymbol(clean);
    setIsLoading(true);

    const cached = getReportFromCache(clean);
    if (cached && cached.technical) {
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

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f6f8fb] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      <Header onSelectExample={(p) => loadEmitenData(p.slice(0, 4))} />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <FeaturePageHeader icon={CandleIcon} title="Baca arah harga dengan lebih mudah" description="Lihat tren, momentum, support, dan resistance dalam satu tampilan. Cocok untuk memahami waktu masuk dan risiko tanpa harus menghafal semua indikator." activeSymbol={symbol} symbols={sampleEmiten} onSelectSymbol={loadEmitenData} />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="surface dark:!border-slate-800 dark:!bg-[#0f172a] py-20 text-center space-y-3 text-slate-500" role="status" aria-live="polite">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
            <p className="text-xs font-mono">Memuat terminal teknikal {symbol}...</p>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && report?.technical && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <TechnicalModule
              technical={report.technical}
              symbol={report.symbol}
              companyName={report.companyName}
            />
          </div>
        )}
      </main>
    </div>
  );
}
