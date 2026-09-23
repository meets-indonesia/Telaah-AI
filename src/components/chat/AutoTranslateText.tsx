"use client";

import React, { useEffect, useState, useRef } from "react";
import { useI18n } from "@/lib/i18n/context";
import { MarkdownText } from "./MarkdownText";

interface AutoTranslateTextProps {
  text: string;
  isUser?: boolean;
  className?: string;
}

export function AutoTranslateText({ text, isUser, className = "" }: AutoTranslateTextProps) {
  const { locale } = useI18n();
  const [displayText, setDisplayText] = useState(text);
  const [isTranslating, setIsTranslating] = useState(false);
  const lastTranslatedRef = useRef<{ text: string; lang: string } | null>(null);

  useEffect(() => {
    // Jika bahasa Indonesia (bahasa asli emiten IDX), langsung tampilkan aslinya
    if (locale === "id") {
      setDisplayText(text);
      return;
    }

    if (
      lastTranslatedRef.current?.text === text &&
      lastTranslatedRef.current?.lang === locale
    ) {
      return;
    }

    let isMounted = true;
    setIsTranslating(true);

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang: locale }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.translatedText) {
          setDisplayText(data.translatedText);
          lastTranslatedRef.current = { text, lang: locale };
        }
      })
      .catch(() => {
        // Fallback to original text on error
      })
      .finally(() => {
        if (isMounted) setIsTranslating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [text, locale]);

  return (
    <div className={`relative ${isTranslating ? "opacity-75 transition-opacity" : ""}`}>
      <MarkdownText content={displayText} isUser={isUser} className={className} />
    </div>
  );
}
