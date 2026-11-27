"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Clock3,
  Database,
  Loader2,
  RefreshCw,
  Star,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { Header } from "@/components/Header";
import { CompanyLogo } from "@/components/CompanyLogo";
import { LiveChart } from "@/components/LiveChart";
import { DepthCard } from "@/components/DepthCard";
import { SymbolSearch } from "@/components/SymbolSearch";
import { useChartStream } from "@/lib/chart/use-chart-stream";
import type { ChartFrame, ChartTimeframe } from "@/lib/chart/types";
import { chartQuery } from "@/lib/chart/url";
import { getCompanyName } from "@/lib/sectors/companies";
import type { CorporateActionItem } from "@/lib/sectors/types";
import type { HarmonicMatch } from "@/lib/quant/harmonic";
import { computeTechnicalIndicators } from "@/lib/quant/indicators";
import {
  getWatchlistSymbols,
  isWatchlisted,
  toggleWatchlist,
} from "@/lib/storage/history";

const TIMEFRAMES: Array<{ key: ChartTimeframe; label: string }> = [
  { key: "1D", label: "1D" },
  { key: "1W", label: "1W" },
  { key: "1Y", label: "1Y" },
  { key: "5Y", label: "5Y" },
];

const POPULAR = ["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "ADRO"];

function formatPrice(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

function formatVolume(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString("id-ID");
}

function formatClock(iso: string | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function statusLabel(status: string): string {
  if (status === "live") return "Streaming";
  if (status === "reconnecting") return "Menyambung ulang";
  if (status === "offline") return "Terputus";
  return "Menghubungkan";
}

function changeOf(frame: ChartFrame | null): {
  value: number;
  percent: number;
  up: boolean;
} | null {
  if (!frame || frame.candles.length === 0) return null;
  const last = frame.last.close;
  const previous =
    frame.previousClose ??
    frame.candles[frame.candles.length - 2]?.close ??
    frame.candles[0].open;
  if (!previous) return null;
  const value = last - previous;
  return { value, percent: (value / previous) * 100, up: value >= 0 };
}

export default function ChartPage() {
  const [symbol, setSymbol] = useState("BBCA");
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("1W");
  const [hydrated, setHydrated] = useState(false);
  const [quickSymbols, setQuickSymbols] = useState<string[]>(POPULAR);
  const [harmonicEnabled, setHarmonicEnabled] = useState(true);
  const [harmonicMatches, setHarmonicMatches] = useState<HarmonicMatch[]>([]);
  const [harmonicTf, setHarmonicTf] = useState<string | null>(null);
  const [harmonicLoading, setHarmonicLoading] = useState(false);
  const [compareSymbol, setCompareSymbol] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);
  const [watched, setWatched] = useState(false);
  const [corporateActions, setCorporateActions] = useState<
    CorporateActionItem[]
  >([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = (params.get("symbol") || "BBCA")
      .trim()
      .toUpperCase()
      .replace(".JK", "");
    if (/^[A-Z]{4}$/.test(requested)) setSymbol(requested);
    const requestedCompare = (params.get("compare") ?? "")
      .trim()
      .toUpperCase()
      .replace(".JK", "");
    if (/^[A-Z]{4}$/.test(requestedCompare)) {
      setCompareSymbol(requestedCompare);
    }
    const requestedHtf = params.get("htf");
    if (
      requestedHtf === "4H" ||
      requestedHtf === "1D" ||
      requestedHtf === "1W" ||
      requestedHtf === "1M"
    ) {
      setHarmonicTf(requestedHtf);
    }
    const requestedTf = params.get("tf");
    if (
      requestedTf === "1D" ||
      requestedTf === "1W" ||
      requestedTf === "1Y" ||
      requestedTf === "5Y"
    ) {
      setTimeframe(requestedTf);
    }
    const saved = getWatchlistSymbols();
    setQuickSymbols(
      [...new Set([...saved, ...POPULAR])].slice(0, 8)
    );
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const query = chartQuery(
      symbol,
      timeframe,
      harmonicTf,
      compareSymbol || null
    );
    window.history.replaceState(null, "", `/chart?${query}`);
  }, [symbol, timeframe, harmonicTf, compareSymbol, hydrated]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    const canOverlay = timeframe === "1Y" || timeframe === "5Y";
    if (!hydrated || !harmonicEnabled || !canOverlay) {
      setHarmonicMatches([]);
      setHarmonicLoading(false);
      return;
    }
    const controller = new AbortController();
    setHarmonicLoading(true);
    const htfQuery = harmonicTf ? `&htf=${harmonicTf}` : "";
    fetch(`/api/harmonic?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}${htfQuery}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.matches)) {
          setHarmonicMatches(data.matches);
        } else {
          setHarmonicMatches([]);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setHarmonicMatches([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setHarmonicLoading(false);
      });
    return () => controller.abort();
  }, [symbol, timeframe, hydrated, harmonicEnabled, harmonicTf]);

  const { frame, status, error, reconnect } = useChartStream(
    symbol,
    timeframe,
    hydrated
  );
  const { frame: compareFrame } = useChartStream(
    compareSymbol,
    timeframe,
    hydrated && /^[A-Z]{4}$/.test(compareSymbol)
  );

  useEffect(() => {
    if (!hydrated) return;
    setWatched(isWatchlisted(symbol));
  }, [symbol, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    fetch(`/api/corporate-actions?symbol=${encodeURIComponent(symbol)}`, {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) {
          setCorporateActions(data?.success ? data.actions ?? [] : []);
        }
      })
      .catch(() => {
        if (!cancelled) setCorporateActions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, hydrated]);

  const current = frame?.symbol === symbol ? frame : null;
  const currentCompare =
    compareFrame?.symbol === compareSymbol ? compareFrame : null;
  const compareChange = useMemo(() => changeOf(currentCompare), [currentCompare]);
  const change = useMemo(() => changeOf(current), [current]);
  const companyName = getCompanyName(symbol) ?? `PT ${symbol} Tbk`;
  const harmonic = harmonicEnabled ? harmonicMatches[0] ?? null : null;
  const candle = current?.last;
  const technical = useMemo(() => {
    if (!current || current.candles.length < 5) return null;
    return computeTechnicalIndicators(
      current.candles.map((candle) => ({
        symbol: current.symbol,
        date: candle.date ?? new Date(candle.time * 1000).toISOString().slice(0, 10),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }))
    );
  }, [current]);

  const session = useMemo(() => {
    const bars = current?.candles ?? [];
    if (bars.length === 0) return null;
    const lastDate = bars[bars.length - 1].date;
    const matching = bars.filter((bar) => bar.date === lastDate);
    if (matching.length === 0) return bars[bars.length - 1];
    return {
      open: matching[0].open,
      high: Math.max(...matching.map((bar) => bar.high)),
      low: Math.min(...matching.map((bar) => bar.low)),
      close: matching[matching.length - 1].close,
      volume: matching.reduce((total, bar) => total + bar.volume, 0),
      date: lastDate,
    };
  }, [current]);

  const statusTone =
    status === "live"
      ? "text-emerald-600 dark:text-emerald-400"
      : status === "reconnecting" || status === "connecting"
        ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f7f7f8] dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header showSearch={false} />

      <main
        id="main-content"
        className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-4 space-y-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <BarChart3 className="h-4 w-4" />
              </span>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">
                Peta Harga
              </h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-mono dark:border-white/10 dark:bg-white/[0.04] ${statusTone}`}>
                <span className="relative flex h-1.5 w-1.5">
                  {status === "live" && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  )}
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
                </span>
                {statusLabel(status)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Chart intraday dan historis. Update dikirim lewat stream, bukan polling.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            <SymbolSearch
              ref={searchRef}
              value={symbol}
              onSelect={setSymbol}
              className="w-full sm:w-72"
              placeholder="Cari kode atau nama emiten..."
            />
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[0.03]">
              {TIMEFRAMES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTimeframe(item.key)}
                  className={`flex-1 rounded-md px-2.5 py-1.5 font-mono text-[11px] transition sm:flex-none ${
                    timeframe === item.key
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                      : "text-slate-500 hover:bg-slate-100 hover:text-zinc-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  }`}
                  aria-pressed={timeframe === item.key}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_290px]">
          <div className="min-w-0 space-y-3">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-white/10 dark:bg-[#0b0b0c] dark:shadow-none">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-3.5 py-3 dark:border-white/[0.06] sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="flex min-w-0 items-center gap-3">
                <CompanyLogo
                  symbol={symbol}
                  companyName={companyName}
                  size="lg"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
                      {symbol}
                    </span>
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {companyName}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                      {candle ? `Rp ${formatPrice(candle.close)}` : "—"}
                    </span>
                    {change && (
                      <span
                        className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold ${
                          change.up
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {change.up ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {change.up ? "+" : ""}
                        {formatPrice(change.value)} ({change.up ? "+" : ""}
                        {change.percent.toFixed(2)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={() => setWatched(toggleWatchlist(symbol))}
                  aria-pressed={watched}
                  title={
                    watched
                      ? "Hapus dari watchlist"
                      : "Tambah ke watchlist"
                  }
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 transition ${
                    watched
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:text-zinc-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <Star className={`h-3 w-3 ${watched ? "fill-current" : ""}`} />
                  <span className="hidden sm:inline">Watchlist</span>
                </button>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 dark:border-white/10 dark:bg-white/[0.03]">
                  <Database className="h-3 w-3" />
                  {current?.source === "stockbit"
                    ? "Stockbit"
                    : current?.source === "yahoo"
                      ? "Yahoo"
                      : "—"}
                </span>
                {current?.delayed && (
                  <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-600 dark:text-amber-400">
                    delayed
                  </span>
                )}
                {current && (
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {formatClock(current.fetchedAt)} WIB
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2 dark:border-white/[0.06] sm:px-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHarmonicEnabled((value) => !value)}
                  className={`rounded-md border px-2 py-1 font-mono text-[10px] transition ${
                    harmonicEnabled
                      ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                      : "border-slate-200 text-slate-500 hover:text-zinc-900 dark:border-white/10 dark:text-slate-400 dark:hover:text-white"
                  }`}
                  aria-pressed={harmonicEnabled}
                >
                  Harmonic {harmonicEnabled ? "on" : "off"}
                </button>
                {harmonicLoading ? (
                  <span className="text-[10px] font-mono text-slate-400">
                    memuat pola...
                  </span>
                ) : harmonic ? (
                  <span className="truncate text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    <b className="text-zinc-800 dark:text-zinc-200">{harmonic.pattern}</b>{" "}
                    {harmonic.timeframe} · PRZ Rp {harmonic.prz.low.toLocaleString("id-ID", { maximumFractionDigits: 0 })}–{harmonic.prz.high.toLocaleString("id-ID", { maximumFractionDigits: 0 })} · invalidasi Rp {harmonic.invalidation.toLocaleString("id-ID", { maximumFractionDigits: 0 })}
                  </span>
                ) : harmonicEnabled && timeframe !== "1Y" && timeframe !== "5Y" ? (
                  <span className="text-[10px] font-mono text-slate-400">
                    overlay harmonic tersedia di 1Y atau 5Y
                  </span>
                ) : harmonicEnabled ? (
                  <span className="text-[10px] font-mono text-slate-400">
                    tidak ada pola pada timeframe ini
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {compareSymbol ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 font-mono text-[10px] text-amber-700 dark:text-amber-300">
                    <ArrowLeftRight className="h-3 w-3" />
                    vs {compareSymbol}
                    {currentCompare && (
                      <span className="text-amber-600/80 dark:text-amber-200/80">
                        Rp {formatPrice(currentCompare.last.close)}
                        {compareChange
                          ? ` (${compareChange.up ? "+" : ""}${compareChange.percent.toFixed(2)}%)`
                          : ""}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCompareSymbol("");
                        setCompareOpen(false);
                      }}
                      aria-label="Hapus pembanding"
                      className="ml-0.5 rounded p-0.5 transition hover:bg-amber-500/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : compareOpen ? (
                  <SymbolSearch
                    value=""
                    onSelect={(value) => {
                      if (value !== symbol) setCompareSymbol(value);
                      setCompareOpen(false);
                    }}
                    className="w-52"
                    placeholder="Bandingkan dengan..."
                    ariaLabel="Cari emiten pembanding"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setCompareOpen(true)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 font-mono text-[10px] text-slate-500 transition hover:text-zinc-900 dark:border-white/10 dark:text-slate-400 dark:hover:text-white"
                  >
                    <ArrowLeftRight className="h-3 w-3" />
                    Bandingkan
                  </button>
                )}
                {harmonic && (
                  <span className="text-[10px] font-mono text-slate-400">
                    T1 Rp{" "}
                    {harmonic.targets.t1.toLocaleString("id-ID", {
                      maximumFractionDigits: 0,
                    })}{" "}
                    · T2 Rp{" "}
                    {harmonic.targets.t2.toLocaleString("id-ID", {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                )}
              </div>
            </div>
            <div className="p-3 sm:p-4">
              {!hydrated || (!current && status !== "offline") ? (
                <div className="flex h-[460px] flex-col items-center justify-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                  Memuat stream {symbol}...
                </div>
              ) : !current ? (
                <div className="flex h-[460px] flex-col items-center justify-center gap-3 px-6 text-center">
                  <WifiOff className="h-6 w-6 text-rose-500" />
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    Stream chart tidak tersedia.
                  </p>
                  <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
                    {error || `Data ${symbol} belum bisa dimuat.`}
                  </p>
                  <button
                    type="button"
                    onClick={reconnect}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Coba lagi
                  </button>
                </div>
              ) : (
                <>
                  <LiveChart
                    candles={current.candles}
                    intraday={timeframe === "1D" || timeframe === "1W"}
                    dataKey={`${current.symbol}:${current.timeframe}`}
                    harmonic={harmonic}
                    compareCandles={currentCompare?.candles}
                    compareSymbol={compareSymbol || null}
                    corporateActions={corporateActions}
                    height={460}
                  />
                  {current.timeframe === "1D" && current.candles.length < 10 && (
                    <p className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">
                      Stockbit mengirim {current.candles.length} bar intraday untuk sesi
                      ini. Pilih 1Y atau 5Y untuk riwayat harian.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3.5 py-2.5 text-[10px] font-mono text-slate-500 dark:border-white/[0.06] dark:text-slate-400 sm:px-4">
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3 w-3" />
                {current ? `${current.candles.length} candle` : "—"} · {timeframe}
              </span>
              <span className="inline-flex items-center gap-1.5">
                {status === "live" ? (
                  <Wifi className="h-3 w-3 text-emerald-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-amber-500" />
                )}
                {current?.marketLabel ?? "—"} · {statusLabel(status)}
              </span>
            </div>
          </section>

          <DepthCard symbol={symbol} />
          </div>

          <aside className="space-y-3">
            <section className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-white/10 dark:bg-[#0b0b0c]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sesi terakhir
                </h2>
                <span className="font-mono text-[10px] text-slate-400">
                  {timeframe}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                {[
                  ["Open", formatPrice(session?.open)],
                  ["High", formatPrice(session?.high)],
                  ["Low", formatPrice(session?.low)],
                  ["Close", formatPrice(session?.close)],
                  ["Volume", formatVolume(session?.volume)],
                  ["Range", `${formatPrice(session?.low)} – ${formatPrice(session?.high)}`],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wide text-slate-400">
                      {label}
                    </dt>
                    <dd className="truncate font-mono text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-white/10 dark:bg-[#0b0b0c]">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Stream
              </h2>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Status</span>
                  <span className={`inline-flex items-center gap-1.5 font-mono ${statusTone}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {statusLabel(status)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Sumber</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">
                    {current?.source === "stockbit" ? "Stockbit" : current?.source === "yahoo" ? "Yahoo" : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Update</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">
                    {formatClock(current?.fetchedAt)} WIB
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">Pasar</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">
                    {current?.marketLabel ?? "—"}
                  </span>
                </div>
              </div>
              {error && (
                <p className="mt-3 rounded-md border border-rose-500/20 bg-rose-500/10 px-2.5 py-2 text-[10px] leading-relaxed text-rose-600 dark:text-rose-400">
                  {error}
                </p>
              )}
              {status === "offline" && (
                <button
                  type="button"
                  onClick={reconnect}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-zinc-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
                >
                  <RefreshCw className="h-3 w-3" />
                  Sambung ulang
                </button>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-white/10 dark:bg-[#0b0b0c]">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Teknikal
              </h2>
              {technical ? (
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">SMA20 / SMA50</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                      {formatPrice(technical.sma20 ?? undefined)} / {formatPrice(technical.sma50 ?? undefined)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">RSI14</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                      {technical.rsi14 === null ? "—" : technical.rsi14.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">MACD hist</span>
                    <span className={`font-mono ${(technical.macd.histogram ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {technical.macd.histogram === null ? "—" : technical.macd.histogram.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Tren</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                      {technical.trendAssessment}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Data teknikal belum cukup.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-white/10 dark:bg-[#0b0b0c]">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Akses cepat
              </h2>
              <div className="space-y-0.5">
                {quickSymbols.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSymbol(item)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition ${
                      item === symbol
                        ? "bg-slate-100 dark:bg-white/[0.07]"
                        : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <CompanyLogo
                      symbol={item}
                      companyName={getCompanyName(item)}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                        {item}
                      </span>
                      <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">
                        {getCompanyName(item) ?? item}
                      </span>
                    </span>
                    {item === symbol && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
          Chart ini untuk riset dan edukasi. Stockbit adalah sumber tidak resmi dengan sesi
          pribadi; Yahoo adalah fallback tertunda. Bukan rekomendasi beli/jual.
        </p>
      </main>
    </div>
  );
}
