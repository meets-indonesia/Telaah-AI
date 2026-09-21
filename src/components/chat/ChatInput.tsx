"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Zap, Compass, Loader2, Mic } from "lucide-react";
import { AnalysisMode } from "@/lib/agent/types";

interface ChatInputProps {
  onSend: (message: string, mode: AnalysisMode) => void;
  isLoading: boolean;
  initialValue?: string;
}

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

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
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

  return (
    <div className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0c0e15] p-2.5 space-y-1.5">
      {/* Mode Selector Strip */}
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#131622] p-0.5 rounded border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setMode("quick")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${
              mode === "quick"
                ? "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 font-bold shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Zap className="w-2.5 h-2.5 text-amber-500" />
            <span>Quick (~6 cr)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("full")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${
              mode === "full"
                ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Compass className="w-2.5 h-2.5 text-indigo-500" />
            <span>Full (~16 cr)</span>
          </button>
        </div>

        <span className="hidden sm:inline text-slate-400 font-mono text-[10px]">
          Enter ↵
        </span>
      </div>

      {/* Input Field */}
      <div className="relative flex items-center rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#131622] focus-within:border-slate-400 dark:focus-within:border-slate-600 transition-colors">
        <label htmlFor="chat-question" className="sr-only">Pertanyaan saham</label>
        <textarea
          id="chat-question"
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tanyakan analisis emiten, broker flow, atau valuasi..."
          className="w-full resize-none bg-transparent py-2 pl-3 pr-16 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none max-h-24 min-h-[36px] font-sans"
        />

        {/* Action Buttons */}
        <div className="absolute right-1.5 flex items-center gap-1">
          {hasSpeechSupport && (
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-1.5 rounded transition ${
                isListening
                  ? "bg-rose-500 text-white animate-pulse"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Voice Input"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isLoading}
            type="button"
            className="p-1.5 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Kirim pesan (Enter)"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
