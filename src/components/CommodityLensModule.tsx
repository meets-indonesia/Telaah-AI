"use client";

import React, { useState } from "react";
import { CommodityLensData } from "@/lib/sectors/types";
import {
  Pickaxe,
  Flame,
  TrendingUp,
  TrendingDown,
  Gauge,
  MapPin,
  Layers,
  DollarSign,
  Sliders,
  ShieldAlert,
  Info,
  ChevronRight,
} from "lucide-react";

interface CommodityLensModuleProps {
  commodityLens?: CommodityLensData;
  symbol: string;
  companyName: string;
}

export const CommodityLensModule: React.FC<CommodityLensModuleProps> = ({
  commodityLens,
  symbol,
  companyName,
}) => {
  const [priceShock, setPriceShock] = useState<number>(10); // default +10%

  if (!commodityLens || !commodityLens.isCommodityIssuer) {
    return null;
  }

  const {
    sectorBadge,
    primaryCommodity,
    benchmarks,
    operations,
    sensitivityEstimate,
  } = commodityLens;

  // Calculate dynamic simulated impact based on user's slider
  const baseMultiplier = sensitivityEstimate.priceShockPercent > 0
    ? sensitivityEstimate.estimatedEbitdaImpactPercent / sensitivityEstimate.priceShockPercent
    : 1.35;

  const simulatedEbitdaImpact = Number((priceShock * baseMultiplier).toFixed(1));

  return (
    <div className="bg-white dark:bg-[#0f1118] rounded-lg border border-slate-200 dark:border-slate-800/80 p-4 space-y-4 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <Pickaxe className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Commodity & Mining Lens</h3>
            <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              {sectorBadge}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Korelasi harga komoditas acuan, cadangan, dan sensitivitas EBITDA {companyName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-50 dark:bg-[#12151f] px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-[10px] font-mono text-slate-400 block">Komoditas Inti</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-xs">{primaryCommodity}</span>
          </div>
        </div>
      </div>

      {/* Commodity Benchmark Tracker Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-400" /> Harga Acuan Komoditas Global Terkait
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">
            Data Benchmark: {benchmarks[0]?.lastUpdated || "Live"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {benchmarks.map((bm, idx) => {
            const isBullish = bm.trend === "Bullish";
            const isBearish = bm.trend === "Bearish";
            const isPosDay = bm.dailyChangePct !== null && bm.dailyChangePct >= 0;

            return (
              <div
                key={idx}
                className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-semibold text-slate-200 text-xs">{bm.commodityName}</h5>
                    <span className="text-[10px] font-mono text-slate-400">{bm.symbol}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                      isBullish
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : isBearish
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {bm.trend}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-base sm:text-lg font-mono font-bold text-white">
                      ${bm.currentPrice === null ? "-" : bm.currentPrice.toLocaleString("en-US")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono ml-1">
                      {bm.currency}/{bm.unit}
                    </span>
                  </div>

                  <div className="text-right text-[11px] font-mono">
                    <div
                      className={`flex items-center justify-end gap-0.5 font-bold ${
                        isPosDay ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isPosDay ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {bm.dailyChangePct === null ? "-" : `${isPosDay ? "+" : ""}${bm.dailyChangePct}%`}
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      30H: {bm.change30dPct === null ? "-" : `${bm.change30dPct >= 0 ? "+" : ""}${bm.change30dPct}%`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Operational Concessions, Reserves & Capacity */}
      {operations && (
        <div className="space-y-3 pt-1">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-blue-400" /> Profil Operasi & Cadangan Tambang Terbukti
          </h4>

          {/* Key Metric Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                Cadangan Terbukti (2P Reserves)
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-slate-100 block">
                {operations.provenReserves || "Tersedia di Lapkeu"}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {operations.probableReserves || "Eksplorasi berlanjut"}
              </span>
            </div>

            <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                Target Volume Produksi
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-amber-400 block">
                {operations.annualProductionTarget || "Sesuai RKAB"}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Kapasitas run-rate tahunan
              </span>
            </div>

            <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                Cash Cost Produksi
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-emerald-400 block">
                {operations.cashCostPerUnit || "Biaya Kas Kompetitif"}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Bantalan margin of safety operasional
              </span>
            </div>
          </div>

          {/* Concessions & Sites Table */}
          {operations.concessionsOrSites && operations.concessionsOrSites.length > 0 && (
            <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-3 space-y-2">
              <span className="text-[11px] font-semibold text-slate-300 block">
                Wilayah Konsesi & Fasilitas Pengolahan:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {operations.concessionsOrSites.map((site, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs flex items-start gap-2.5"
                  >
                    <div className="w-6 h-6 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-200 font-semibold">{site.name}</strong>
                        {site.reserves && site.reserves !== "-" && (
                          <span className="text-[10px] font-mono text-amber-400">
                            {site.reserves}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                        <span>{site.location}</span>
                        <span className="text-slate-500 text-[10px]">{site.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Commodity Price Sensitivity Simulator */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 rounded-xl border border-blue-500/30 p-4 md:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h4 className="text-sm font-bold text-white">
              Simulator Sensitivitas Harga Komoditas terhadap EBITDA
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Model Operasional Telaah 360
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {sensitivityEstimate.narrative}
        </p>

        {/* Interactive Slider */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Skenario Perubahan Harga Komoditas Acuan:</span>
            <span
              className={`text-sm font-bold px-2 py-0.5 rounded ${
                priceShock > 0
                  ? "bg-emerald-500/20 text-emerald-300"
                  : priceShock < 0
                  ? "bg-rose-500/20 text-rose-300"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {priceShock >= 0 ? "+" : ""}
              {priceShock}%
            </span>
          </div>

          <input
            type="range"
            min="-25"
            max="35"
            step="5"
            value={priceShock}
            onChange={(e) => setPriceShock(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />

          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>-25% (Bearish)</span>
            <span>0% (Stabil)</span>
            <span>+10% (Baseline)</span>
            <span>+35% (Commodity Boom)</span>
          </div>
        </div>

        {/* Impact Output Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-slate-400 block">
              Estimasi Dampak terhadap EBITDA Konsolidasi {symbol}:
            </span>
            <span className="text-xs text-slate-300">
              Tingkat operating leverage mengikuti struktur biaya kas tetap penambangan.
            </span>
          </div>

          <div className="text-right">
            <span
              className={`text-lg sm:text-xl font-mono font-bold block ${
                simulatedEbitdaImpact >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {simulatedEbitdaImpact >= 0 ? "+" : ""}
              {simulatedEbitdaImpact}%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              EBITDA Tahunan
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
