"use client";

import React, { useState } from "react";
import { Zap, Compass, ArrowRight, Loader2, AlertCircle, FileText } from "lucide-react";
import { AnalysisMode } from "@/lib/agent/types";

interface InputStationProps {
  onAnalyze: (prompt: string, mode: AnalysisMode, confirmedSymbol?: string) => Promise<void>;
  isLoading: boolean;
  loadingStage: string;
  initialPrompt?: string;
  initialMode?: AnalysisMode;
}

export const InputStation: React.FC<InputStationProps> = ({
  onAnalyze,
  isLoading,
  loadingStage,
  initialPrompt = "",
  initialMode = "full",
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [mode, setMode] = useState<AnalysisMode>(initialMode);
  const [customSymbol, setCustomSymbol] = useState("");
  const [showSymbolOverride, setShowSymbolOverride] = useState(false);

  // Sync if parent updates initialPrompt
  React.useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  React.useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onAnalyze(prompt, mode, customSymbol.trim() ? customSymbol : undefined);
  };

  return (
    <div className="bg-white dark:bg-[#0f172a]/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-md dark:shadow-xl relative overflow-hidden transition-colors">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-96 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-brand-600 dark:text-blue-400" /> Masukkan Postingan, Berita, atau Pertanyaan Emiten
            </label>
            <button
              type="button"
              onClick={() => setShowSymbolOverride(!showSymbolOverride)}
              className="text-xs text-brand-600 dark:text-blue-400 hover:underline transition underline-offset-2"
            >
              {showSymbolOverride ? "Sembunyikan Kode Saham Manual" : "Tentukan Kode Saham Manual"}
            </button>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Contoh: 'Broker BK dan CC borong saham BBCA ratusan miliar, katanya laba Q2 naik 15%. Apakah benar?' atau 'Bagaimana prospek fundamental dan peer valuation BBRI?'"
            className="w-full h-28 px-4 py-3 bg-slate-50 dark:bg-[#090d16]/90 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 text-sm leading-relaxed resize-none transition"
            disabled={isLoading}
          />
        </div>

        {/* Manual Symbol Override if needed */}
        {showSymbolOverride && (
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-medium">Kode Saham (Opsional):</span>
            <input
              type="text"
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
              placeholder="Contoh: BBCA"
              maxLength={4}
              className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-center tracking-wider focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <span className="text-slate-500">
              Kosongkan jika ingin sistem mendeteksi kode saham secara otomatis dari teks.
            </span>
          </div>
        )}

        {/* Mode Selector & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
          {/* Mode Pill Switcher */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMode("quick")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                mode === "quick"
                  ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Check</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-white dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300">~6 kredit</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("full")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                mode === "full"
                  ? "bg-brand-100 dark:bg-blue-600/30 text-brand-800 dark:text-blue-300 border border-brand-300 dark:border-blue-500/50 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-brand-600 dark:text-blue-400" />
              <span>Full Review 360°</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-white dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300">~16 kredit</span>
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{loadingStage || "Menganalisis..."}</span>
              </>
            ) : (
              <>
                <span>Telaah Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
