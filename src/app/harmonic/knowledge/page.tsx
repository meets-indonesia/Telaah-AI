"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Loader2, Search } from "lucide-react";
import { Header } from "@/components/Header";
import type { HarmonicKnowledgeDoc } from "@/lib/harmonic/knowledge";

interface KnowledgeItem {
  score: number;
  doc: HarmonicKnowledgeDoc;
}

const PATTERNS = [
  "all",
  "Gartley",
  "Bat",
  "Butterfly",
  "Crab",
  "Shark",
  "Cypher",
  "General",
];

export default function HarmonicKnowledgePage() {
  const [query, setQuery] = useState("");
  const [pattern, setPattern] = useState("all");
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (search = "", selected = "all") => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (selected !== "all") params.set("pattern", selected);
      const response = await fetch(
        `/api/harmonic/knowledge${params.toString() ? `?${params}` : ""}`,
        { cache: "no-store" }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Gagal memuat knowledge.");
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat knowledge.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f7f7f8] dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header />
      <main id="main-content" className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-5 lg:px-6 py-4 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <BookOpen className="h-4 w-4" />
              </span>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">
                Harmonic Knowledge
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              RAG dari aturan pattern, PRZ, invalidasi, dan evaluasi. Sumber
              literatur dicantumkan di setiap kartu.
            </p>
          </div>
          <Link
            href="/harmonic"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 transition hover:text-zinc-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke scanner
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-white/10 dark:bg-[#0b0b0c]">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void load(query, pattern);
              }}
              placeholder="Cari: cara entry Gartley, invalidasi Crab, PRZ..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-zinc-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-100"
            />
          </div>
          <select
            value={pattern}
            onChange={(event) => {
              setPattern(event.target.value);
              void load(query, event.target.value);
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-mono text-[11px] text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
            aria-label="Filter pattern"
          >
            {PATTERNS.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "Semua pattern" : item}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load(query, pattern)}
            disabled={loading}
            className="h-9 rounded-lg bg-zinc-900 px-4 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Cari
          </button>
        </div>

        {loading ? (
          <div className="flex h-52 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-500 dark:border-white/10 dark:bg-[#0b0b0c] dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            Mencari knowledge...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0b0b0c]">
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              Belum ada hasil.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Coba kata kunci lain atau pilih pattern yang berbeda.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map(({ doc, score }) => (
              <article
                key={doc.id}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0b0b0c]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded border border-indigo-500/20 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[9px] text-indigo-700 dark:text-indigo-300">
                      {doc.pattern}
                    </span>
                    <span className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:border-white/10 dark:text-slate-400">
                      {doc.topic}
                    </span>
                  </div>
                  {score < 1 && (
                    <span className="font-mono text-[9px] text-slate-400">
                      {(score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-sm font-semibold text-zinc-950 dark:text-white">
                  {doc.title}
                </h2>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  {doc.content}
                </p>
                <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-white/[0.06]">
                  Sumber: {doc.source}
                </p>
              </article>
            ))}
          </div>
        )}

        <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
          Knowledge ini adalah ringkasan aturan dan literatur, bukan rekomendasi.
          Tidak ada sistem harmonic yang sempurna; gunakan invalidasi dan ukuran
          posisi yang terkendali.
        </p>
      </main>
    </div>
  );
}
