"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Zap, Shield, Sparkles, Loader2, Mic, MicOff, Volume2 } from "lucide-react";
import { AnalysisMode } from "@/lib/agent/types";

interface ChatInputProps {
  onSend: (message: string, mode: AnalysisMode) => void;
  isLoading: boolean;
  initialValue?: string;
}

const QUICK_TICKERS = ["BBCA", "BBRI", "TLKM", "ASII", "ADRO", "BMRI", "BREN"];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isLoading,
  initialValue = "",
}) => {
  const [text, setText] = useState(initialValue);
  const [mode, setMode] = useState<AnalysisMode>("quick");
  const [isListening, setIsListening] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setHasSpeechSupport(true);
        const recognition = new SpeechRecognition();
        recognition.lang = "id-ID";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  useEffect(() => {
    if (initialValue) {
      setText(initialValue);
      textareaRef.current?.focus();
    }
  }, [initialValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || isLoading) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    onSend(text.trim(), mode);
    setText("");
  };

  const handleChipClick = (ticker: string) => {
    setText(`Bagaimana analisis saham ${ticker} saat ini?`);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0b101d]/90 backdrop-blur-md p-3 sm:p-4">
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Quick ticker pills & Mode selector */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          {/* Quick Ticker Chips */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-slate-400 font-medium">Saham:</span>
            {QUICK_TICKERS.map((ticker) => (
              <button
                key={ticker}
                type="button"
                onClick={() => handleChipClick(ticker)}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition"
              >
                {ticker}
              </button>
            ))}
          </div>

          {/* Mode Pill Toggle */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setMode("quick")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                mode === "quick"
                  ? "bg-white dark:bg-brand-600 text-brand-700 dark:text-white shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
              title="Analisis ringkas dan cepat (hemat kuota API)"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Cepat</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("full")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                mode === "full"
                  ? "bg-white dark:bg-brand-600 text-brand-700 dark:text-white shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
              title="Analisis 360° lengkap 5 dimensi"
            >
              <Shield className="w-3 h-3 text-brand-500" />
              <span>Mendalam</span>
            </button>
          </div>
        </div>

        {/* Textarea Input Card */}
        <div className="relative flex items-end rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan kode saham atau rumor pasar (misal: BBCA prospeknya gimana?)..."
            className="w-full resize-none bg-transparent py-3 pl-4 pr-20 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none max-h-32 min-h-[44px]"
            style={{
              height: "auto",
            }}
          />

          {/* Action Buttons: Voice Input & Submit */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            {hasSpeechSupport && (
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-500/30 ring-2 ring-red-400/40"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                title={isListening ? "Mendengarkan... Klik untuk selesai" : "Bicara (Voice Input)"}
              >
                {isListening ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4 text-slate-400" />}
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={!text.trim() || isLoading}
              type="button"
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                text.trim() && !isLoading
                  ? "bg-brand-600 hover:bg-brand-700 text-white shadow-xs cursor-pointer active:scale-95"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              }`}
              title="Kirim pesan (Enter)"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Micro disclaimer */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span>Tekan <strong>Enter</strong> untuk kirim, <strong>Shift + Enter</strong> untuk baris baru</span>
          <span>Bukan ajakan beli/jual (DYOR)</span>
        </div>
      </div>
    </div>
  );
};
