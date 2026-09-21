"use client";

import React, { useState } from "react";
import { Coins, X, Calculator, PiggyBank, ArrowRight, CheckCircle2, TrendingUp, Info } from "lucide-react";

interface DividendCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
  defaultPrice?: number;
}

const POPULAR_DIVIDEND_STOCKS = [
  { symbol: "BBRI", name: "Bank BRI", yieldPct: 7.5, price: 4600 },
  { symbol: "BBCA", name: "Bank BCA", yieldPct: 2.8, price: 9800 },
  { symbol: "ASII", name: "Astra International", yieldPct: 7.8, price: 4900 },
  { symbol: "ADRO", name: "Adaro Energy", yieldPct: 12.5, price: 3400 },
  { symbol: "ITMG", name: "Indo Tambangraya", yieldPct: 14.2, price: 26500 },
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
  const [calcMode, setCalcMode] = useState<"monthly" | "lumpSum">("monthly");
  const [amount, setAmount] = useState<number>(1000000); // 1 Juta per bulan / modal
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
  const totalCapital = calcMode === "monthly" ? amount * 12 * durationYears : amount;
  const yearlyInvestment = calcMode === "monthly" ? amount * 12 : amount;
  
  // Total shares & lots (1 lot = 100 shares)
  const totalShares = customPrice > 0 ? Math.floor(totalCapital / customPrice) : 0;
  const totalLots = Math.floor(totalShares / 100);

  // Dividend earned per year based on current capital
  const yearlyDividend = Math.round(totalCapital * (customYield / 100));
  const monthlyDividend = Math.round(yearlyDividend / 12);

  // Comparison with Bank Deposit (~3.5% net per year)
  const bankDepositYearly = Math.round(totalCapital * 0.035);
  const dividendExcess = yearlyDividend - bankDepositYearly;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-zinc-500 text-white flex items-center justify-center shadow-xs">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Kalkulator Dividen & Passive Income</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-zinc-950 text-amber-700 dark:text-zinc-300 border border-amber-200 dark:border-amber-800">
                  Simulasi Ritel
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hitung estimasi dividen tunai per tahun dan bandingkan dengan bunga deposito bank
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
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {POPULAR_DIVIDEND_STOCKS.map((s) => (
                <button
                  key={s.symbol}
                  type="button"
                  onClick={() => handleStockSelect(s)}
                  className={`p-2 rounded-xl text-center border transition ${
                    selectedStock === s.symbol
                      ? "bg-zinc-50 dark:bg-zinc-950/60 border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold shadow-xs"
                      : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <span className="block text-xs">{s.symbol}</span>
                  <span className="block text-[10px] text-amber-600 dark:text-zinc-400">
                    {s.yieldPct}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Investment Mode & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mode Switcher */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Metode Investasi:
              </label>
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setCalcMode("monthly")}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                    calcMode === "monthly"
                      ? "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-white shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  Nabung Bulanan (DCA)
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode("lumpSum")}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                    calcMode === "lumpSum"
                      ? "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-white shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                  }`}
                >
                  Modal Sekaligus
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                {calcMode === "monthly" ? "Tabungan per Bulan (Rp):" : "Total Modal Investasi (Rp):"}
              </label>
              <input
                type="number"
                step={500000}
                value={amount}
                onChange={(e) => setAmount(Math.max(100000, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-700/20"
              />
            </div>
          </div>

          {/* Duration in Years (only for monthly mode) */}
          {calcMode === "monthly" && (
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Jangka Waktu Rutin: <strong className="text-zinc-900 dark:text-zinc-300">{durationYears} Tahun</strong>
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={durationYears}
                onChange={(e) => setDurationYears(Number(e.target.value))}
                className="w-full accent-zinc-900"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>1 Tahun</span>
                <span>3 Tahun</span>
                <span>5 Tahun</span>
                <span>10 Tahun</span>
              </div>
            </div>
          )}

          {/* Results Summary Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-zinc-700/10 via-zinc-500/5 to-slate-50 dark:from-zinc-950/60 dark:via-zinc-950/30 dark:to-slate-900/60 border border-zinc-200 dark:border-zinc-800/60 space-y-4">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-zinc-900 dark:text-zinc-300" />
                <span>Estimasi Hasil untuk Saham {selectedStock}:</span>
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                Yield acuan: ~{customYield}%/thn
              </span>
            </div>

            {/* Primary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Dividen per Tahun</span>
                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  Rp {yearlyDividend.toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] text-slate-500">
                  ~Rp {monthlyDividend.toLocaleString("id-ID")}/bln
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total Kepemilikan</span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block mt-0.5">
                  {totalLots.toLocaleString("id-ID")} Lot
                </span>
                <span className="text-[10px] text-slate-500">
                  ({totalShares.toLocaleString("id-ID")} Lembar)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block">Total Modal Disetor</span>
                <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-300 block mt-0.5">
                  Rp {totalCapital.toLocaleString("id-ID")}
                </span>
                <span className="text-[10px] text-slate-500">
                  {calcMode === "monthly" ? `${durationYears} tahun tabungan` : "Modal awal"}
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
              <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between font-bold text-[11px] text-zinc-700 dark:text-zinc-300">
                <span>Selisih Keuntungan Lebih Tinggi:</span>
                <span>+Rp {Math.max(0, dividendExcess).toLocaleString("id-ID")} / thn</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
