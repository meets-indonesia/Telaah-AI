"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/context";
import { LOCALES, SupportedLocale } from "@/lib/i18n/config";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();

  // Urutan siklus toggle: id -> en -> zh -> id
  const cycleOrder: SupportedLocale[] = ["id", "en", "zh"];

  const handleNextLanguage = () => {
    const currentIndex = cycleOrder.indexOf(locale);
    const nextIndex = (currentIndex + 1) % cycleOrder.length;
    setLocale(cycleOrder[nextIndex]);
  };

  const current = LOCALES[locale] || LOCALES.id;

  return (
    <button
      type="button"
      onClick={handleNextLanguage}
      title={`Bahasa: ${current.name} (Klik untuk ganti ID / EN / ZH)`}
      aria-label="Switch Language"
      className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-lg hover:border-zinc-300 dark:hover:border-zinc-700/60 shadow-xs transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-700/20 active:scale-95"
    >
      <span className="select-none leading-none scale-110">{current.flag}</span>
    </button>
  );
}
