"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { CommodityLensModule } from "@/components/CommodityLensModule";
import { FeaturePageHeader } from "@/components/FeaturePageHeader";
import { getReportFromCache, saveReportToHistory } from "@/lib/storage/history";
import { CompanyIntelligenceReport } from "@/lib/agent/types";
import { Pickaxe, Loader2 } from "lucide-react";

export default function CommodityPage() {
  const [symbol, setSymbol] = useState("ADRO");
  const [report, setReport] = useState<CompanyIntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const commodityEmiten = ["ADRO", "ANTM", "AMMN", "DSSA", "PTBA", "BUMI", "HRUM"];

  useEffect(() => {
    loadEmitenData("ADRO");
  }, []);

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
    <div className="min-h-[100dvh] flex flex-col bg-[#f6f8fb] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      <Header onSelectExample={(p) => loadEmitenData(p.slice(0, 4))} />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <FeaturePageHeader icon={Pickaxe} title="Hubungkan harga komoditas dengan kinerja emiten" description="Pahami pengaruh batu bara, nikel, emas, dan tembaga terhadap pendapatan perusahaan tambang. Uji perubahan harga lewat simulator sensitivitas." activeSymbol={symbol} symbols={commodityEmiten} onSelectSymbol={loadEmitenData} />

        {/* Loading Spinner */}
        {isLoading && (
          <div className="surface dark:!border-slate-800 dark:!bg-[#0f172a] py-20 text-center space-y-3 text-slate-500" role="status" aria-live="polite">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
            <p className="text-xs font-mono">Memuat analisis komoditas dan tambang {symbol}...</p>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && report?.commodityLens && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <CommodityLensModule
              commodityLens={report.commodityLens}
              symbol={report.symbol}
              companyName={report.companyName}
            />
          </div>
        )}
      </main>
    </div>
  );
}
