"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MinimalSidebar } from "@/components/chat/MinimalSidebar";
import { ChatSession } from "@/components/chat/types";
import { getWatchlistSymbols } from "@/lib/storage/history";

const SESSIONS_KEY = "telaah_chat_sessions";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const refresh = () => {
    try {
      setSessions(JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]"));
    } catch {
      setSessions([]);
    }
    setWatchlist(getWatchlistSymbols());
  };

  useEffect(() => {
    refresh();
    setActiveSessionId(new URLSearchParams(window.location.search).get("session"));
    window.addEventListener("storage", refresh);
    window.addEventListener("telaah:storage", refresh);
    window.addEventListener("telaah:sessions", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("telaah:storage", refresh);
      window.removeEventListener("telaah:sessions", refresh);
    };
  }, []);

  const persist = (next: ChatSession[]) => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
    setSessions(next);
    window.dispatchEvent(new Event("telaah:sessions"));
  };

  const goHome = (query: string) => {
    setActiveSessionId(new URLSearchParams(query).get("session"));
    router.push(`/?${query}`);
    window.dispatchEvent(new CustomEvent("telaah:navigate", { detail: query }));
  };

  return (
    <div className="min-h-[100dvh] flex bg-[#f7f7f8] dark:bg-[#121214]">
      <MinimalSidebar
        isOpen={isOpen}
        onToggle={() => setIsOpen((value) => !value)}
        onNewChat={() => goHome(`newChat=${Date.now()}`)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => goHome(`session=${encodeURIComponent(id)}`)}
        onTogglePinSession={(id) => persist(sessions.map((s) => s.id === id ? { ...s, isPinned: !s.isPinned } : s))}
        onDeleteSession={(id) => persist(sessions.filter((s) => s.id !== id))}
        watchlistSymbols={watchlist}
        onSelectSymbol={(symbol) => goHome(`symbol=${encodeURIComponent(symbol)}`)}
        onClearAllSessions={() => {
          if (confirm("Apakah Anda yakin ingin menghapus seluruh riwayat obrolan?")) persist([]);
        }}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
