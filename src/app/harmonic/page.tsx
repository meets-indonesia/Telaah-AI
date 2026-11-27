"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Activity,
  BookOpen,
  Star,
  Target,
} from "lucide-react";
import { Header } from "@/components/Header";
import { CompanyLogo } from "@/components/CompanyLogo";
import { getCompanyName } from "@/lib/sectors/companies";
import { getWatchlistSymbols } from "@/lib/storage/history";
import type {
  HarmonicCandidate,
  HarmonicScanResult,
} from "@/lib/screener/harmonic-screener";
import type {
  HarmonicMatch,
  HarmonicPattern,
  HarmonicTimeframe,
} from "@/lib/quant/harmonic";
import type { HarmonicStatsResult } from "@/lib/harmonic/outcomes";

const PATTERNS: Array<"all" | HarmonicPattern> = [
  "all",
  "Gartley",
  "Bat",
  "Butterfly",
  "Crab",
  "Shark",
  "Cypher",
];
const TIMEFRAMES: Array<"all" | HarmonicTimeframe> = [
  "all",
  "4H",
  "1D",
  "1W",
  "1M",
];

function chartTimeframe(timeframe: HarmonicTimeframe): string {
  if (timeframe === "1M") return "5Y";
  return "1Y";
}

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-indigo-600 dark:text-indigo-300";
  return "text-slate-500 dark:text-slate-400";
}

function wfTone(
  verdict: "stable" | "improved" | "decayed" | "insufficient"
): string {
  if (verdict === "stable") return "text-emerald-600 dark:text-emerald-400";
  if (verdict === "improved") return "text-indigo-600 dark:text-indigo-300";
  if (verdict === "decayed") return "text-rose-600 dark:text-rose-400";
  return "text-slate-400";
}

export default function HarmonicPage() {
  const [scan, setScan] = useState<HarmonicScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pattern, setPattern] = useState<"all" | HarmonicPattern>("all");
  const [timeframe, setTimeframe] = useState<"all" | HarmonicTimeframe>("all");
  const [direction, setDirection] = useState<"bullish" | "bearish" | "all">(
    "bullish"
  );
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [stats, setStats] = useState<HarmonicStatsResult | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const load = useCallback(async (
    refresh = false,
    dir: "bullish" | "bearish" | "all" = direction
  ) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/harmonic/scan?direction=${dir}${refresh ? "&refresh=1" : ""}`,
        { cache: "no-store" }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal memindai harmonic.");
      }
      setScan(data as HarmonicScanResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memindai harmonic.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [direction]);

  useEffect(() => {
    setWatchlist(getWatchlistSymbols());
  }, []);

  useEffect(() => {
    void load(false, direction);
  }, [direction, load]);

  useEffect(() => {
    fetch("/api/harmonic/stats", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data?.success) setStats(data as HarmonicStatsResult);
      })
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, []);

  const timeframeCounts = useMemo(() => {
    const counts: Record<HarmonicTimeframe, number> = {
      "4H": 0,
      "1D": 0,
      "1W": 0,
      "1M": 0,
    };
    const seen = new Set<string>();
    for (const candidate of scan?.results ?? []) {
      for (const match of candidate.matches) {
        const key = `${candidate.symbol}|${match.timeframe}`;
        if (seen.has(key)) continue;
        seen.add(key);
        counts[match.timeframe] += 1;
      }
    }
    return counts;
  }, [scan]);

  const results = useMemo(() => {
    const list = scan?.results ?? [];
    const needle = query.trim().toUpperCase();
    const rows = list.flatMap((candidate) => {
      const match =
        timeframe === "all"
          ? candidate.best
          : candidate.matches
              .filter((item) => item.timeframe === timeframe)
              .sort((left, right) => right.score - left.score)[0];
      if (!match) return [];
      if (watchlistOnly && !watchlist.includes(candidate.symbol)) return [];
      if (pattern !== "all" && match.pattern !== pattern) return [];
      if (
        needle &&
        !candidate.symbol.includes(needle) &&
        !(getCompanyName(candidate.symbol) ?? "").toUpperCase().includes(needle)
      ) {
        return [];
      }
      return [{ candidate, match }];
    });
    return rows.sort(
      (left, right) =>
        right.match.score - left.match.score ||
        right.candidate.confluenceCount - left.candidate.confluenceCount ||
        Math.abs(left.match.distancePct) - Math.abs(right.match.distancePct)
    );
  }, [scan, pattern, timeframe, watchlistOnly, watchlist, query]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f7f7f8] dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header />
      <main
        id="main-content"
        className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-4 space-y-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Activity className="h-4 w-4" />
              </span>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">
                Harmonic Pattern
              </h1>
              {scan && (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                  {scan.scanned}/{scan.universeSize} emiten
                </span>
              )}
              <Link
                href="/harmonic/knowledge"
                className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-2 py-0.5 font-mono text-[10px] text-indigo-700 transition hover:bg-indigo-500/10 dark:text-indigo-300"
              >
                <BookOpen className="h-3 w-3" />
                Knowledge
              </Link>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Gartley, Bat, Butterfly, Crab, Shark, Cypher pada 4H, 1D, 1W, dan
              1M. Filter 1D untuk swing harian, 1W untuk swing mingguan.
              Data Yahoo dapat tertunda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:shrink-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value.toUpperCase())}
                placeholder="Cari emiten..."
                className="h-9 w-44 rounded-lg border border-slate-200 bg-white pl-8 pr-3 font-mono text-xs text-zinc-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-100"
              />
            </div>
            <Link
              href="/harmonic/knowledge"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:text-zinc-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:text-white"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Knowledge
            </Link>
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              aria-label={refreshing ? "Memindai harmonic" : "Refresh harmonic"}
              title={refreshing ? "Memindai..." : "Refresh"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-zinc-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.07]"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-white/10 dark:bg-[#0b0b0c]">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={pattern}
            onChange={(event) =>
              setPattern(event.target.value as "all" | HarmonicPattern)
            }
            className="h-8 rounded-md border border-slate-200 bg-white px-2 font-mono text-[11px] text-zinc-700 outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
            aria-label="Filter pola"
          >
            {PATTERNS.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "Semua pola" : item}
              </option>
            ))}
          </select>
          <select
            value={timeframe}
            onChange={(event) =>
              setTimeframe(event.target.value as "all" | HarmonicTimeframe)
            }
            className="h-8 rounded-md border border-slate-200 bg-white px-2 font-mono text-[11px] text-zinc-700 outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
            aria-label="Filter timeframe"
          >
            {TIMEFRAMES.map((item) => (
              <option key={item} value={item}>
                {item === "all"
                  ? `Semua TF (${scan?.results.length ?? 0})`
                  : `${item} · ${timeframeCounts[item]}`}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 rounded-md border border-slate-200 p-0.5 dark:border-white/10">
            {(["bullish", "bearish", "all"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDirection(item)}
                className={`rounded px-2 py-1 font-mono text-[10px] transition ${
                  direction === item
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                    : "text-slate-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                aria-pressed={direction === item}
              >
                {item === "bullish" ? "Bull" : item === "bearish" ? "Bear" : "All"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setWatchlistOnly((value) => !value)}
            className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 font-mono text-[11px] transition ${
              watchlistOnly
                ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-400"
            }`}
            aria-pressed={watchlistOnly}
          >
            <Star className={`h-3 w-3 ${watchlistOnly ? "fill-current" : ""}`} />
            Watchlist ({watchlist.length})
          </button>
          {scan && (
            <span className="ml-auto font-mono text-[10px] text-slate-400">
              {results.length} kandidat
            </span>
          )}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b0b0c]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-white/[0.06]">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Success rate historis
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {stats
                  ? `${stats.patterns} pola · ${stats.symbols} emiten · ${stats.timeframes.join("/")} · WF ${stats.walkForwardSplitPct}/${100 - stats.walkForwardSplitPct} · fee ${stats.feePct}%`
                  : "Sampel 88 emiten likuid · 4H/1D/1W/1M"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/harmonic/calibration"
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 font-mono text-[10px] text-slate-500 transition hover:text-zinc-950 dark:border-white/10 dark:text-slate-400 dark:hover:text-white"
              >
                <Target className="h-3 w-3" />
                Calibration
              </Link>
              {statsLoading && (
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  menghitung...
                </span>
              )}
            </div>
          </div>
          {stats && stats.stats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="border-b border-slate-100 font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:border-white/[0.06]">
                  <tr>
                    <th className="px-4 py-2 font-normal">Pola</th>
                    <th className="px-2 py-2 text-right font-normal">Sampel</th>
                    <th className="px-2 py-2 text-right font-normal">T1</th>
                    <th className="px-2 py-2 text-right font-normal">T2</th>
                    <th className="px-2 py-2 text-right font-normal">Invalid</th>
                    <th className="px-2 py-2 text-right font-normal">WF T1</th>
                    <th className="px-2 py-2 text-right font-normal">Net T1</th>
                    <th className="px-4 py-2 text-right font-normal">Hari ke T1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {stats.stats.map((row) => (
                    <tr key={`${row.pattern}-${row.direction}-${row.timeframe}`}>
                      <td className="px-4 py-2 font-mono text-zinc-800 dark:text-zinc-200">
                        {row.pattern}
                        <span className="ml-1 text-[9px] text-slate-400">
                          {row.timeframe} · {row.direction}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-slate-500 dark:text-slate-400">
                        {row.total}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {row.t1RatePct.toFixed(1)}%
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-indigo-600 dark:text-indigo-300">
                        {row.t2RatePct.toFixed(1)}%
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-rose-600 dark:text-rose-400">
                        {row.total ? ((row.invalidated / row.total) * 100).toFixed(1) : "0.0"}%
                      </td>
                      <td
                        className={`px-2 py-2 text-right font-mono ${wfTone(row.walkForwardVerdict)}`}
                        title={`${row.firstHalf.total} sampel paruh 1 vs ${row.secondHalf.total} sampel paruh 2`}
                      >
                        {row.firstHalf.total >= 5 && row.secondHalf.total >= 5
                          ? `${row.firstHalf.t1RatePct.toFixed(0)}% → ${row.secondHalf.t1RatePct.toFixed(0)}%`
                          : "—"}
                      </td>
                      <td
                        className={`px-2 py-2 text-right font-mono ${
                          row.netAvgT1Pct === null
                            ? "text-slate-400"
                            : row.netAvgT1Pct >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {row.netAvgT1Pct === null
                          ? "—"
                          : `${row.netAvgT1Pct >= 0 ? "+" : ""}${row.netAvgT1Pct.toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-slate-500 dark:text-slate-400">
                        {row.avgDaysToT1 === null ? "—" : row.avgDaysToT1.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !statsLoading ? (
            <p className="px-4 py-4 text-[11px] text-slate-500 dark:text-slate-400">
              Statistik belum tersedia.
            </p>
          ) : null}
          {stats && stats.stats.length > 0 && (
            <p className="border-t border-slate-100 px-4 py-2 text-[10px] leading-relaxed text-slate-500 dark:border-white/[0.06] dark:text-slate-400">
              WF T1 = T1 rate paruh pertama → paruh kedua (minimal 5 sampel per
              paruh). Net T1 = target T1 rata-rata setelah fee round-trip; bukan
              expectancy dan belum menghitung slippage.
            </p>
          )}
        </section>

        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-500 dark:border-white/10 dark:bg-[#0b0b0c] dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            Memindai harmonic...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center text-sm text-rose-600 dark:text-rose-300">
            {error}
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0b0b0c]">
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              Tidak ada kandidat yang cocok.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Coba hapus filter atau refresh scan.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b0b0c]">
            <div className="hidden grid-cols-[minmax(0,1.4fr)_1fr_1fr_0.8fr_0.6fr] gap-3 border-b border-slate-100 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-400 dark:border-white/[0.06] md:grid">
              <span>Emiten</span>
              <span>Pola / TF</span>
              <span>PRZ</span>
              <span>Jarak</span>
              <span className="text-right">Skor</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {results.map(({ candidate, match }) => (
                <HarmonicRow
                  key={`${candidate.symbol}-${match.timeframe}-${match.pattern}`}
                  candidate={candidate}
                  match={match}
                />
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
          PRZ = Potential Reversal Zone. Pola harmonic tidak menjamin reversal.
          Selalu gunakan invalidasi. Bukan rekomendasi beli/jual.
        </p>
      </main>
    </div>
  );
}

function HarmonicRow({
  candidate,
  match,
}: {
  candidate: HarmonicCandidate;
  match: HarmonicMatch;
}) {
  const name = getCompanyName(candidate.symbol) ?? candidate.symbol;
  const href = `/chart?symbol=${encodeURIComponent(candidate.symbol)}&tf=${chartTimeframe(
    match.timeframe
  )}&htf=${match.timeframe}`;

  return (
    <LinkRow
      href={href}
      symbol={candidate.symbol}
      name={name}
      best={match}
      confluence={candidate.timeframes}
      score={match.score}
    />
  );
}

function LinkRow({
  href,
  symbol,
  name,
  best,
  confluence,
  score,
}: {
  href: string;
  symbol: string;
  name: string;
  best: HarmonicCandidate["best"];
  confluence: HarmonicTimeframe[];
  score: number;
}) {
  return (
    <Link
      href={href}
      className="grid gap-2 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-white/[0.03] md:grid-cols-[minmax(0,1.4fr)_1fr_1fr_0.8fr_0.6fr] md:items-center md:gap-3"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <CompanyLogo symbol={symbol} companyName={name} size="sm" />
        <div className="min-w-0">
          <span className="block font-mono text-sm font-bold text-zinc-950 dark:text-white">
            {symbol}
          </span>
          <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
            {name}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200">
          {best.pattern}
        </span>
        <span className="font-mono text-[10px] text-slate-400">{best.timeframe}</span>
        <span className="font-mono text-[10px] text-slate-400">{best.status}</span>
      </div>
      <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
        {best.prz.low.toLocaleString("id-ID")}–{best.prz.high.toLocaleString("id-ID")}
      </div>
      <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
        {best.distancePct >= 0 ? "+" : ""}
        {best.distancePct.toFixed(2)}%
        {confluence.length > 1 && (
          <span className="ml-1 text-[9px] text-indigo-500 dark:text-indigo-300">
            {confluence.join("/")}
          </span>
        )}
      </div>
      <div className={`text-left font-mono text-sm font-bold md:text-right ${scoreTone(score)}`}>
        {score}
      </div>
    </Link>
  );
}
