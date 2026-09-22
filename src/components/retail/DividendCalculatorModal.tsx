"use client";

import React, { useState } from "react";
import { Coins, X, Calculator, PiggyBank, ArrowRight, CheckCircle2, TrendingUp, Info, Target, Sparkles } from "lucide-react";

interface DividendCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
  defaultPrice?: number;
}

const POPULAR_DIVIDEND_STOCKS = [
  { symbol: "BBRI", name: "Bank BRI", yieldPct: 7.5, price: 4600 },
  { symbol: "BBCA", name: "Bank BCA", yieldPct: 2.8, price: 9800 },
  { symbol: "BMRI", name: "Bank Mandiri", yieldPct: 5.4, price: 6250 },
  { symbol: "ASII", name: "Astra International", yieldPct: 7.8, price: 4900 },
  { symbol: "ADRO", name: "Adaro Energy", yieldPct: 12.5, price: 3400 },
  { symbol: "ITMG", name: "Indo Tambangraya", yieldPct: 14.2, price: 26500 },
  { symbol: "PTBA", name: "Bukit Asam", yieldPct: 11.8, price: 2500 },
  { symbol: "TLKM", name: "Telkom Indonesia", yieldPct: 4.8, price: 2850 },
];

export const DividendCalculatorModal: React.FC<DividendCalculatorModalProps> = ({
  isOpen,
  onClose,
  defaultSymbol = "BBRI",
  defaultPrice,
}) => {
  const initialStock = POPULAR_DIVIDEND_STOCKS.find((s) => s.symbol === defaultSymbol) || POPULAR_DIVIDEND_STOCKS[0];

  const [selectedStock, setSelectedStock] = useState(initialStock.symbol);
  const [calcMode, setCalcMode] = useState<"monthlyDca" | "lumpSum" | "targetIncome">("targetIncome");
  const [amount, setAmount] = useState<number>(1000000); // 1 Juta per bulan / modal
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState<number>(5000000); // Target Rp 5 Juta/bln
  const [customPrice, setCustomPrice] = useState<number>(defaultPrice || initialStock.price);
  const [customYield, setCustomYield] = useState<number>(initialStock.yieldPct);
  const [durationYears, setDurationYears] = useState<number>(3);

  if (!isOpen) return null;

  const handleStockSelect = (stock: typeof POPULAR_DIVIDEND_STOCKS[0]) => {
    setSelectedStock(stock.symbol);
    setCustomPrice(stock.price);
    setCustomYield(stock.yieldPct);
  };

  // Calculation formulas
  let totalCapital = 0;
  let yearlyDividend = 0;
  let monthlyDividend = 0;
  let totalShares = 0;
  let totalLots = 0;

  if (calcMode === "targetIncome") {
    // User wants `targetMonthlyIncome` per month -> yearly = targetMonthlyIncome * 12
    const neededYearly = targetMonthlyIncome * 12;
    const yieldDecimal = Math.max(0.01, customYield / 100);
    totalCapital = Math.round(neededYearly / yieldDecimal);
    yearlyDividend = neededYearly;
    monthlyDividend = targetMonthlyIncome;
    totalShares = customPrice > 0 ? Math.ceil(totalCapital / customPrice) : 0;
    totalLots = Math.ceil(totalShares / 100);
  } else if (calcMode === "monthlyDca") {
    totalCapital = amount * 12 * durationYears;
    yearlyDividend = Math.round(totalCapital * (customYield / 100));
    monthlyDividend = Math.round(yearlyDividend / 12);
    totalShares = customPrice > 0 ? Math.floor(totalCapital / customPrice) : 0;
    totalLots = Math.floor(totalShares / 100);
  } else {
    // Lump sum
    totalCapital = amount;
    yearlyDividend = Math.round(totalCapital * (customYield / 100));
    monthlyDividend = Math.round(yearlyDividend / 12);
    totalShares = customPrice > 0 ? Math.floor(totalCapital / customPrice) : 0;
    totalLots = Math.floor(totalShares / 100);
  }

  // Comparison with Bank Deposit (~3.5% net per year)
  const bankDepositYearly = Math.round(totalCapital * 0.035);
  const dividendExcess = yearlyDividend - bankDepositYearly;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Kalkulator Gaji & Dividen Ritel</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Passive Income Goal
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hitung target modal dan jumlah lot untuk dapat gaji bulanan dari dividen emiten IDX
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
          {/* Quick Select Popular Stocks */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
              Pilih Saham Dividen Unggulan:
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {POPULAR_DIVIDEND_STOCKS.map((s) => (
                <button
                  key={s.symbol}
                  type="button"
                  onClick={() => handleStockSelect(s)}
                  className={`p-2 rounded-xl text-center border transition ${
                    selectedStock === s.symbol
                      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 font-bold shadow-xs"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <span className="block text-xs">{s.symbol}</span>
                  <span className="block text-[10px] text-amber-600 dark:text-amber-400">
                    {s.yieldPct}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode Switcher */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Model Perhitungan:
            </label>
            <div className="grid grid-cols-3 rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setCalcMode("targetIncome")}
                className={`py-2 px-2 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
                  calcMode === "targetIncome"
                    ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Target Gaji / Bln</span>
              </button>
              <button
                type="button"
                onClick={() => setCalcMode("monthlyDca")}
                className={`py-2 px-2 rounded-lg font-medium transition ${
                  calcMode === "monthlyDca"
                    ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Nabung Rutin (DCA)
              </button>
              <button
                type="button"
                onClick={() => setCalcMode("lumpSum")}
                className={`py-2 px-2 rounded-lg font-medium transition ${
                  calcMode === "lumpSum"
                    ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Modal Sekaligus
              </button>
            </div>
          </div>

          {/* Dynamic Inputs based on mode */}
          {calcMode === "targetIncome" ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Target Passive Income Dividen per Bulan (Rp):</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    Rp {targetMonthlyIncome.toLocaleString("id-ID")} / bulan
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[1000000, 3000000, 5000000, 10000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetMonthlyIncome(preset)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition ${
                        targetMonthlyIncome === preset
                          ? "bg-amber-500 text-white border-amber-600"
                          : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      {preset >= 1000000 ? `Rp ${preset / 1000000} Jt` : preset}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step={500000}
                  value={targetMonthlyIncome}
                  onChange={(e) => setTargetMonthlyIncome(Math.max(100000, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  {calcMode === "monthlyDca" ? "Tabungan per Bulan (Rp):" : "Total Modal Investasi (Rp):"}
                </label>
                <input
                  type="number"
                  step={500000}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(100000, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              {calcMode === "monthlyDca" && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Jangka Waktu: <strong className="text-amber-600 dark:text-amber-400">{durationYears} Tahun</strong>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={durationYears}
                    onChange={(e) => setDurationYears(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>1 Thn</span>
                    <span>3 Thn</span>
                    <span>5 Thn</span>
                    <span>10 Thn</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Summary Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-50 dark:from-amber-950/40 dark:via-amber-950/20 dark:to-slate-900/60 border border-amber-200 dark:border-amber-800/60 space-y-4">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-amber-500" />
                <span>
                  {calcMode === "targetIncome"
                    ? `Kebutuhan Modal untuk Gaji Rp ${monthlyDividend.toLocaleString("id-ID")}/bln di ${selectedStock}:`
                    : `Estimasi Dividen Saham ${selectedStock}:`}
                </span>
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                Yield Acuan: ~{customYield}% / thn
              </span>
            </div>

            {/* Primary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">
                  {calcMode === "targetIncome" ? "Total Modal Yang Dibutuhkan" : "Dividen per Tahun"}
                </span>
                <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 block mt-0.5">
                  Rp {totalCapital.toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] text-slate-500">
                  {calcMode === "targetIncome" ? "Modal terkumpul" : `~Rp ${monthlyDividend.toLocaleString("id-ID")}/bln`}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Target Jumlah Lot</span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block mt-0.5">
                  {totalLots.toLocaleString("id-ID")} Lot
                </span>
                <span className="text-[10px] text-slate-500">
                  ({totalShares.toLocaleString("id-ID")} lembar @ Rp {customPrice})
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block">
                  {calcMode === "targetIncome" ? "Gaji Dividen per Tahun" : "Total Modal Disetor"}
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  Rp {yearlyDividend.toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] text-slate-500">
                  ~Rp {monthlyDividend.toLocaleString("id-ID")}/bulan
                </span>
              </div>
            </div>

            {/* Comparison vs Bank Deposit */}
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Dividen Saham {selectedStock} ({customYield}%):</span>
                <strong className="text-emerald-600 dark:text-emerald-400">
                  +Rp {yearlyDividend.toLocaleString("id-ID")} / thn
                </strong>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Bunga Bersih Deposito Bank (~3.5%):</span>
                <span className="text-slate-600 dark:text-slate-400">
                  +Rp {bankDepositYearly.toLocaleString("id-ID")} / thn
                </span>
              </div>
              <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between font-bold text-[11px] text-amber-700 dark:text-amber-300">
                <span>Ekstra Imbal Hasil dari Dividen:</span>
                <span>+Rp {Math.max(0, dividendExcess).toLocaleString("id-ID")} / thn</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
