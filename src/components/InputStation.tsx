"use client";

import React, { useState } from "react";
import { Zap, Compass, ArrowRight, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { AnalysisMode } from "@/lib/agent/types";

interface InputStationProps {
  onAnalyze: (prompt: string, mode: AnalysisMode, confirmedSymbol?: string) => Promise<void>;
  isLoading: boolean;
  loadingStage: string;
  initialPrompt?: string;
  initialMode?: AnalysisMode;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

export const InputStation: React.FC<InputStationProps> = ({
  onAnalyze,
  isLoading,
  loadingStage,
  initialPrompt = "",
  initialMode = "full",
  inputRef,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [mode, setMode] = useState<AnalysisMode>(initialMode);
  const [customSymbol, setCustomSymbol] = useState("");
  const [showOverride, setShowOverride] = useState(false);

  React.useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  React.useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onAnalyze(prompt, mode, customSymbol.trim() ? customSymbol : undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-slate-800/80 p-3.5 transition-colors">
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* Input Bar */}
        <div className="relative">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari analisis emiten atau ketik pertanyaan (contoh: 'Bagaimana prospek valuasi dan akumulasi broker BBCA?' atau 'ADRO')..."
            rows={2}
            className="w-full px-3 py-2 bg-white dark:bg-[#131622] rounded-md border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 text-xs sm:text-sm font-sans resize-none transition"
            disabled={isLoading}
          />
        </div>

        {/* Optional Manual Symbol Override */}
        {showOverride && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-black rounded border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">
              Simbol Manual:
            </span>
            <input
              type="text"
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
              placeholder="BBCA"
              maxLength={4}
              className="w-20 px-2 py-0.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono text-center font-bold tracking-wider text-xs focus:outline-none focus:border-slate-400"
            />
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Kosongkan jika sistem otomatis mendeteksi dari pertanyaan
            </span>
          </div>
        )}

        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#131622] p-0.5 rounded border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setMode("quick")}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition ${
                mode === "quick"
                  ? "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-2xs font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Quick</span>
              <span className="text-[10px] font-mono text-slate-400">~6 cr</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("full")}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition ${
                mode === "full"
                  ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Compass className="w-3 h-3 text-indigo-500" />
              <span>Full 360°</span>
              <span className="text-[10px] font-mono text-slate-400">~16 cr</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOverride(!showOverride)}
              title="Override Simbol Saham"
              className={`p-1 rounded text-xs transition ${
                showOverride
                  ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Submit Action */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
              Enter ↵
            </span>
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-xs">{loadingStage || "Menganalisis..."}</span>
                </>
              ) : (
                <>
                  <span>Analisis</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
