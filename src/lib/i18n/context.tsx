"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { SupportedLocale, LOCALES, UI_DICTIONARY } from "./config";

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, fallback?: string) => string;
}

const LOCALE_STORAGE_KEY = "telaah_locale";

const I18nContext = createContext<I18nContextType>({
  locale: "id",
  setLocale: () => {},
  t: (key, fallback) => fallback || key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>("id");

  useEffect(() => {
    // 1. Initial read on client mount
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale;
      if (saved && LOCALES[saved]) {
        setLocaleState(saved);
      }
    } catch (e) {}

    // 2. Listen to custom event & cross-tab storage
    const handleLocaleChange = () => {
      try {
        const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale;
        if (saved && LOCALES[saved]) {
          setLocaleState(saved);
        }
      } catch (e) {}
    };

    window.addEventListener("telaah:locale", handleLocaleChange);
    window.addEventListener("storage", handleLocaleChange);

    return () => {
      window.removeEventListener("telaah:locale", handleLocaleChange);
      window.removeEventListener("storage", handleLocaleChange);
    };
  }, []);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      window.dispatchEvent(new Event("telaah:locale"));
    } catch (e) {}
  };

  const t = (key: string, fallback?: string): string => {
    const dict = UI_DICTIONARY[locale] || UI_DICTIONARY.id;
    if (dict[key]) return dict[key];
    if (UI_DICTIONARY.id[key]) return UI_DICTIONARY.id[key];
    return fallback || key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
