"use client";

import React, { useState } from "react";
import {
  X,
  Target,
  Zap,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign,
  Layers,
} from "lucide-react";
import { TradingPlanResult, TimeHorizonKey, HorizonPlan } from "@/lib/quant/tradingPlan";

interface TradingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradingPlan?: TradingPlanResult;
  symbol: string;
  currentPrice: number;
}

export const TradingPlanModal: React.FC<TradingPlanModalProps> = ({
  isOpen,
  onClose,
  tradingPlan,
  symbol,
  currentPrice,
}) => {
  const [activeHorizon, setActiveHorizon] = useState<TimeHorizonKey>(
    tradingPlan?.bestFitHorizon || "swing"
  );

  // Position Sizing Calculator state
  const [portfolioCapital, setPortfolioCapital] = useState<number>(10000000); // 10 Juta IDR
  const [riskPercent, setRiskPercent] = useState<number>(2); // 2% risk tolerance

  if (!isOpen || !tradingPlan) return null;

  const currentPlan: HorizonPlan = tradingPlan.horizons[activeHorizon] || tradingPlan.horizons.swing;
  const price = tradingPlan.currentPrice || currentPrice || 1000;

  // Position sizing calculations
  const maxRiskAmount = (portfolioCapital * riskPercent) / 100; // Rp risiko max
  const riskPerShare = Math.max(1, Math.abs(price - currentPlan.stopLoss));
  const maxShares = Math.floor(maxRiskAmount / riskPerShare);
  const maxLots = Math.max(1, Math.floor(maxShares / 100));
  const totalCapitalRequired = maxLots * 100 * price;
  const capitalAllocationPct = portfolioCapital > 0 ? Number(((totalCapitalRequired / portfolioCapital) * 100).toFixed(1)) : 0;

  const potentialLoss = Math.round(maxLots * 100 * (currentPlan.stopLoss - price));
  const potentialProfitTP1 = Math.round(maxLots * 100 * (currentPlan.target1 - price));
  const potentialProfitTP2 = Math.round(maxLots * 100 * (currentPlan.target2 - price));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Trading & Investment Plan ({symbol})
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Rp {price.toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Level teknis & kalkulator manajemen risiko (Position Sizing) multi-horizon
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Time Horizon Switcher Tabs */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Pilih Time Horizon Strategi:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { key: "scalping", icon: <Zap className="w-3.5 h-3.5 text-amber-500" />, label: "Scalping", duration: "1 – 3 Hari", desc: "Fast Trade" },
                  { key: "swing", icon: <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />, label: "Swing Trade", duration: "1 – 4 Minggu", desc: "Support Bounce" },
                  { key: "trend", icon: <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />, label: "Trend Follow", duration: "1 – 3 Bulan", desc: "Stage 2 Markup" },
                  { key: "investing", icon: <Layers className="w-3.5 h-3.5 text-sky-500" />, label: "Long-Term", duration: "6 – 12+ Bulan", desc: "Value / DCA" },
                ] as const
              ).map((tab) => {
                const isSelected = activeHorizon === tab.key;
                const isRec = tradingPlan.bestFitHorizon === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveHorizon(tab.key)}
                    className={`p-2.5 rounded-xl text-left border transition relative flex flex-col justify-between ${
                      isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs ring-1 ring-indigo-500/20"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs flex items-center gap-1.5">
                          {tab.icon}
                          <span>{tab.label}</span>
                        </span>
                        {isRec && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                            Optimal
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] opacity-75 block font-mono mt-1">{tab.duration}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Horizon Blueprint Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                  {currentPlan.horizonName} ({currentPlan.durationLabel})
                </span>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  Strategi: {currentPlan.strategyName}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Risk-to-Reward:</span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  1 : {currentPlan.rrr} RRR
                </span>
              </div>
            </div>

            {/* Visual Price Ladder */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 text-xs">
              {/* Target 2 */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> Target 2 (TP2)
                </span>
                <span className="text-base font-mono font-black text-emerald-700 dark:text-emerald-300 mt-1 block">
                  Rp {currentPlan.target2.toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] font-bold text-emerald-600">
                  +{currentPlan.target2Pct}%
                </span>
              </div>

              {/* Target 1 */}
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> Target 1 (TP1)
                </span>
                <span className="text-base font-mono font-black text-emerald-700 dark:text-emerald-300 mt-1 block">
                  Rp {currentPlan.target1.toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] font-bold text-emerald-600">
                  +{currentPlan.target1Pct}%
                </span>
              </div>

              {/* Current Price */}
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
                  Harga Saat Ini
                </span>
                <span className="text-base font-mono font-black text-slate-900 dark:text-white mt-1 block">
                  Rp {price.toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] text-slate-500">Market Price</span>
              </div>

              {/* Entry Zone */}
              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-sky-500" /> Area Beli (Entry)
                </span>
                <span className="text-xs sm:text-sm font-mono font-bold text-sky-900 dark:text-sky-200 mt-1 block">
                  {currentPlan.entryZone[0]} – {currentPlan.entryZone[1]}
                </span>
                <span className="text-[10px] text-sky-600">Zona Ideal</span>
              </div>

              {/* Stop Loss */}
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Stop Loss (Cut)
                </span>
                <span className="text-base font-mono font-black text-rose-700 dark:text-rose-300 mt-1 block">
                  Rp {currentPlan.stopLoss.toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] font-bold text-rose-600">
                  {currentPlan.stopLossPct}%
                </span>
              </div>
            </div>

            {/* Action Guidance & Catalyst Focus */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-white">Panduan Eksekusi:</span>
                <span className="text-slate-600 dark:text-slate-300">{currentPlan.actionGuidance}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700 dark:text-slate-400">Katalis Acuan:</span>
                <span>{currentPlan.catalystFocus}</span>
              </div>
            </div>
          </div>

          {/* Interactive Position Sizing & Money Management Calculator */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-slate-50 dark:from-indigo-950/40 dark:via-indigo-950/20 dark:to-slate-900/60 border border-indigo-200 dark:border-indigo-800/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Kalkulator Money Management & Position Sizing Ritel
                </h4>
              </div>
              <span className="text-[10px] text-slate-500">Hitung otomatis batas beli aman</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Modal Portofolio */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Total Modal Portofolio Trading (Rp):
                </label>
                <input
                  type="number"
                  step={1000000}
                  value={portfolioCapital}
                  onChange={(e) => setPortfolioCapital(Math.max(100000, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Toleransi Risiko (%) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Toleransi Risiko per Trade:</span>
                  <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                    {riskPercent}% (Maksimal Rugi Rp {maxRiskAmount.toLocaleString("id-ID")})
                  </strong>
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.5}
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>1% (Konservatif)</span>
                  <span>2% (Disarankan)</span>
                  <span>5% (Agresif)</span>
                </div>
              </div>
            </div>

            {/* Position Sizing Recommendation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Maksimal Jumlah Pembelian</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">
                  {maxLots.toLocaleString("id-ID")} Lot
                </span>
                <span className="text-[10px] text-slate-500">
                  ({(maxLots * 100).toLocaleString("id-ID")} Lembar Saham)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total Modal Yang Digunakan</span>
                <span className="text-lg font-black text-slate-900 dark:text-white block mt-0.5">
                  Rp {totalCapitalRequired.toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] text-slate-500">
                  {capitalAllocationPct}% dari total modal porto
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Potensi Rugi vs Cuan TP1</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono font-bold text-rose-600">
                    -{Math.abs(potentialLoss).toLocaleString("id-ID")}
                  </span>
                  <span className="text-slate-400">vs</span>
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    +{potentialProfitTP1.toLocaleString("id-ID")}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  Rasio RRR: 1 : {currentPlan.rrr}x
                </span>
              </div>
            </div>
          </div>

          {/* Reference Pivot, Support, and Resistance Levels */}
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs">
            <div className="flex items-center justify-between font-mono text-[11px] text-slate-600 dark:text-slate-400 flex-wrap gap-2">
              <span>S2: <strong>Rp {tradingPlan.supports.s2}</strong></span>
              <span>S1: <strong>Rp {tradingPlan.supports.s1}</strong></span>
              <span>Pivot: <strong>Rp {tradingPlan.pivotPoint}</strong></span>
              <span>R1: <strong>Rp {tradingPlan.resistances.r1}</strong></span>
              <span>R2: <strong>Rp {tradingPlan.resistances.r2}</strong></span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 bg-slate-50/60 dark:bg-slate-900/40">
          <span>{tradingPlan.disclaimer}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
