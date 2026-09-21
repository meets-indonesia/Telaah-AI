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
    <div className="border-t border-white/10 bg-black/75 p-2.5 space-y-1.5">
      {/* Mode Selector Strip */}
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-1 bg-black/50 p-0.5 rounded border border-white/10">
          <button
            type="button"
            onClick={() => setMode("quick")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${
              mode === "quick"
                ? "bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-2.5 h-2.5 text-orange-400" />
            <span>Quick (~6 cr)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("full")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${
              mode === "full"
                ? "bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Compass className="w-2.5 h-2.5 text-orange-400" />
            <span>Full (~16 cr)</span>
          </button>
        </div>

        <span className="hidden sm:inline text-slate-500 font-mono text-[10px]">
          Enter ↵
        </span>
      </div>

      {/* Input Field */}
      <div className="relative flex items-center rounded-md border border-white/10 bg-black/50 focus-within:border-orange-500/60 transition-colors">
        <label htmlFor="chat-question" className="sr-only">Pertanyaan saham</label>
        <textarea
          id="chat-question"
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tanyakan analisis emiten, broker flow, atau valuasi..."
          className="w-full resize-none bg-transparent py-2 pl-3 pr-16 text-xs text-slate-100 placeholder-slate-500 focus:outline-none max-h-24 min-h-[36px] font-sans"
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
                  : "text-slate-400 hover:text-slate-200"
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
            className="p-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Kirim pesan (Enter)"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
