"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Zap, Compass, Loader2, Mic, Paperclip, X } from "lucide-react";
import { AnalysisMode } from "@/lib/agent/types";

interface ChatInputProps {
  onSend: (message: string, mode: AnalysisMode, images?: string[]) => void;
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
  const [images, setImages] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle Paste Image from Clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          e.preventDefault();
        }
      }
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        setImages((prev) => [...prev, base64].slice(-4)); // Max 4 images
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      processFile(files[i]);
    }
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
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
    if ((!text.trim() && images.length === 0) || isLoading) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    onSend(text.trim(), mode, images.length > 0 ? images : undefined);
    setText("");
    setImages([]);
  };

  return (
    <div className="border-t border-zinc-200 dark:border-white/10 bg-[#f7f7f8] dark:bg-[#121214] p-2.5 space-y-2">
      {/* Mode Selector Strip */}
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
        <div className="flex items-center gap-1 bg-zinc-200/70 dark:bg-white/5 p-0.5 rounded-lg border border-zinc-300 dark:border-white/10">
          <button
            type="button"
            onClick={() => setMode("quick")}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition ${
              mode === "quick"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs border border-zinc-300 dark:border-white/10"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Zap className="w-2.5 h-2.5" />
            <span>Quick (~6 cr)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("full")}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition ${
              mode === "full"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs border border-zinc-300 dark:border-white/10"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <Compass className="w-2.5 h-2.5" />
            <span>Full (~16 cr)</span>
          </button>
        </div>

        <span className="hidden sm:inline text-zinc-500 dark:text-zinc-400 font-mono text-[10px]">
          Enter ↵
        </span>
      </div>

      {/* Image Preview Thumbnails */}
      {images.length > 0 && (
        <div className="flex items-center gap-2 pt-1 pb-1 overflow-x-auto">
          {images.map((imgSrc, idx) => (
            <div
              key={idx}
              className="relative group shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-zinc-300 dark:border-white/20 bg-zinc-100 dark:bg-zinc-900 shadow-xs"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgSrc} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition"
                title="Hapus gambar"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Field Container */}
      <div className="relative flex items-center rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-900/90 focus-within:border-zinc-500 dark:focus-within:border-white/40 shadow-xs transition-colors">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          multiple
          className="hidden"
        />

        {/* Paperclip Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Lampirkan Gambar (Bisa juga Copy-Paste)"
          className="p-2 ml-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg transition shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <label htmlFor="chat-question" className="sr-only">Pertanyaan saham</label>
        <textarea
          id="chat-question"
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Tanyakan analisis emiten, broker flow, atau valuasi... (Bisa paste gambar)"
          className="w-full resize-none bg-transparent py-2.5 pl-1 pr-20 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none max-h-24 min-h-[40px] font-sans"
        />

        {/* Action Buttons */}
        <div className="absolute right-2 flex items-center gap-1">
          {hasSpeechSupport && (
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-1.5 rounded-lg transition ${
                isListening
                  ? "bg-rose-500 text-white animate-pulse"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
              title="Voice Input"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={(!text.trim() && images.length === 0) || isLoading}
            type="button"
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-xs"
            title="Kirim pesan (Enter)"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
