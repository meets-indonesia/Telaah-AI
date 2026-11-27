"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Filter,
  LayoutGrid,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { CompanyLogo } from "@/components/CompanyLogo";
import { LiveChart } from "@/components/LiveChart";
import { SymbolSearch } from "@/components/SymbolSearch";
import { useChartStream } from "@/lib/chart/use-chart-stream";
import { getCompanyName } from "@/lib/sectors/companies";
import { getWatchlistSymbols } from "@/lib/storage/history";
import {
  deleteWorkspaceLayout,
  loadLastWorkspace,
  loadWorkspaceLayouts,
  saveLastWorkspace,
  type WorkspaceLayout,
  type WorkspacePanel,
} from "@/lib/workspace/layouts";
import type { HarmonicScanResult } from "@/lib/screener/harmonic-screener";
import type { MarketMetricItem } from "@/lib/screener/market-metrics";

function formatPrice(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

function formatPct(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function chartChange(frame: ReturnType<typeof useChartStream>["frame"]) {
  if (!frame || frame.candles.length === 0) return null;
  const previous =
    frame.previousClose ??
    frame.candles[frame.candles.length - 2]?.close ??
    frame.candles[0].open;
  if (!previous) return null;
  const value = frame.last.close - previous;
  return { value, percent: (value / previous) * 100, up: value >= 0 };
}

export default function WorkspacePage() {
  const [hydrated, setHydrated] = useState(false);
  const [layouts, setLayouts] = useState<WorkspaceLayout[]>([]);
  const [layoutId, setLayoutId] = useState("swing");
  const [panels, setPanels] = useState<WorkspacePanel[]>([]);
  const [symbol, setSymbol] = useState("IHSG");
  const [harmonicScan, setHarmonicScan] = useState<HarmonicScanResult | null>(
    null
  );
  const [screenerItems, setScreenerItems] = useState<MarketMetricItem[]>([]);
  const [watchlistMetrics, setWatchlistMetrics] = useState<
    Record<string, MarketMetricItem>
  >({});
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [watchlistLoaded, setWatchlistLoaded] = useState(false);

  const { frame, status } = useChartStream(symbol, "1Y", hydrated);
  const current = frame?.symbol === symbol ? frame : null;
  const change = useMemo(() => chartChange(current), [current]);
  const companyName = getCompanyName(symbol) ?? `PT ${symbol} Tbk`;
  const harmonicMatch = useMemo(
    () =>
      harmonicScan?.results.find((item) => item.symbol === symbol)?.best ?? null,
    [harmonicScan, symbol]
  );

  useEffect(() => {
    const saved = loadLastWorkspace();
    const nextLayouts = loadWorkspaceLayouts();
    const layout =
      nextLayouts.find((item) => item.id === saved.layoutId) ??
      nextLayouts[0];
    setLayouts(nextLayouts);
    setLayoutId(layout.id);
    setPanels(layout.panels);
    setSymbol(saved.symbol);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveLastWorkspace(layoutId, symbol);
  }, [layoutId, symbol, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    fetch("/api/harmonic/scan", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data?.success) {
          setHarmonicScan(data as HarmonicScanResult);
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    fetch("/api/screener/snapshot", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && data?.success) {
          setScreenerItems((data.items ?? []) as MarketMetricItem[]);
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const saved = getWatchlistSymbols();
    const targets = saved.slice(0, 6);
    setWatchlistSymbols(targets);
    setWatchlistLoaded(true);
    if (targets.length === 0) {
      setWatchlistMetrics({});
      return;
    }
    let cancelled = false;
    fetch("/api/watchlist-metrics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        symbols: targets,
        includeFlow: false,
        includeFundamentals: false,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data?.success) return;
        setWatchlistMetrics(
          Object.fromEntries(
            (data.items as MarketMetricItem[]).map((item) => [
              item.symbol,
              item,
            ])
          )
        );
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (screenerItems.length === 0 || watchlistSymbols.length === 0) return;
    setWatchlistMetrics((previous) => {
      const next = { ...previous };
      let changed = false;
      for (const symbol of watchlistSymbols) {
        if (next[symbol]) continue;
        const item = screenerItems.find((row) => row.symbol === symbol);
        if (item) {
          next[symbol] = item;
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [screenerItems, watchlistSymbols]);

  const applyLayout = (id: string) => {
    const layout = layouts.find((item) => item.id === id);
    if (!layout) return;
    setLayoutId(id);
    setPanels(layout.panels);
    setSymbol(layout.symbol);
  };

  const deleteLayout = () => {
    const isDefault = ["swing", "monitor", "research"].includes(layoutId);
    if (isDefault) return;
    const next = deleteWorkspaceLayout(layoutId);
    setLayouts(next);
    setLayoutId("swing");
    setPanels(next[0].panels);
  };

  const sortedScreener = useMemo(
    () =>
      [...screenerItems]
        .filter((item) => item.lastPrice > 0)
        .sort((left, right) => right.dailyChangePct - left.dailyChangePct)
        .slice(0, 6),
    [screenerItems]
  );

  const bottomPanels = panels.filter((panel) => panel !== "chart");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f7f7f8] dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header showSearch={false} />
      <main
        id="main-content"
        className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-4 space-y-3"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <LayoutGrid className="h-4 w-4" />
              </span>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">
                Workspace
              </h1>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                linked panels
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Chart, harmonic, watchlist, dan screener dalam satu layar. Klik
              emiten di panel mana pun untuk mengganti chart.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SymbolSearch
              value={symbol}
              onSelect={setSymbol}
              className="w-full sm:w-64"
              placeholder="Ganti emiten..."
            />
            <select
              value={layoutId}
              onChange={(event) => applyLayout(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-mono text-[11px] text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
              aria-label="Layout workspace"
            >
              {layouts.map((layout) => (
                <option key={layout.id} value={layout.id}>
                  {layout.name}
                </option>
              ))}
            </select>
            {!["swing", "monitor", "research"].includes(layoutId) && (
              <button
                type="button"
                onClick={deleteLayout}
                aria-label="Hapus layout"
                title="Hapus layout"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:text-rose-600 dark:border-white/10 dark:text-slate-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b0b0c]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2.5 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
              <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                {symbol}
              </span>
              <span className="text-[10px] text-slate-400">{companyName}</span>
              {current && (
                <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-white">
                  Rp {formatPrice(current.last.close)}
                </span>
              )}
              {change && (
                <span
                  className={`font-mono text-[10px] font-semibold ${
                    change.up
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {change.up ? "+" : ""}
                  {formatPrice(change.value)} ({formatPct(change.percent)})
                </span>
              )}
              <span className="font-mono text-[9px] text-slate-400">
                {status}
              </span>
            </div>
            <Link
              href={`/chart?symbol=${symbol}&tf=1Y`}
              className="font-mono text-[10px] text-slate-500 transition hover:text-zinc-950 dark:text-slate-400 dark:hover:text-white"
            >
              Buka chart →
            </Link>
          </div>
          <div className="p-2 sm:p-3">
            {!hydrated || !current ? (
              <div className="flex h-[320px] items-center justify-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                Memuat {symbol}...
              </div>
            ) : (
              <LiveChart
                candles={current.candles}
                intraday={false}
                dataKey={`${current.symbol}:${current.timeframe}`}
                harmonic={harmonicMatch}
                height={320}
              />
            )}
          </div>
        </section>

        <div className="grid gap-3 lg:grid-cols-3">
          {bottomPanels.map((panel) => (
            <section
              key={panel}
              className="flex min-h-[260px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b0b0c]"
            >
              <PanelHeader panel={panel} />
              <div className="flex-1 overflow-y-auto p-2">
                {panel === "harmonic" && (
                  <HarmonicPanel
                    scan={harmonicScan}
                    onSelect={setSymbol}
                  />
                )}
                {panel === "watchlist" && (
                  <WatchlistPanel
                    symbols={watchlistSymbols}
                    metrics={watchlistMetrics}
                    loaded={watchlistLoaded}
                    onSelect={setSymbol}
                  />
                )}
                {panel === "screener" && (
                  <ScreenerPanel
                    items={sortedScreener}
                    onSelect={setSymbol}
                  />
                )}
              </div>
            </section>
          ))}
        </div>

        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          Workspace menyimpan layout dan simbol terakhir di browser. Bukan
          rekomendasi; gunakan invalidasi dan ukuran posisi.
        </p>
      </main>
    </div>
  );
}

function PanelHeader({ panel }: { panel: WorkspacePanel }) {
  const config = {
    harmonic: {
      title: "Harmonic",
      icon: <Activity className="h-3.5 w-3.5 text-indigo-500" />,
      href: "/harmonic",
    },
    watchlist: {
      title: "Watchlist",
      icon: <Star className="h-3.5 w-3.5 text-amber-500" />,
      href: "/watchlist",
    },
    screener: {
      title: "Screener",
      icon: <Filter className="h-3.5 w-3.5 text-sky-500" />,
      href: "/screener",
    },
    chart: {
      title: "Chart",
      icon: <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />,
      href: "/chart",
    },
  }[panel];

  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-white/[0.06]">
      <div className="flex items-center gap-1.5">
        {config.icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {config.title}
        </span>
      </div>
      <Link
        href={config.href}
        className="font-mono text-[9px] text-slate-400 transition hover:text-zinc-900 dark:hover:text-white"
      >
        buka →
      </Link>
    </div>
  );
}

function HarmonicPanel({
  scan,
  onSelect,
}: {
  scan: HarmonicScanResult | null;
  onSelect: (symbol: string) => void;
}) {
  if (!scan) {
    return <PanelLoading label="memindai harmonic..." />;
  }
  if (scan.results.length === 0) {
    return <PanelEmpty label="Tidak ada kandidat." />;
  }
  return (
    <div className="space-y-1">
      {scan.results.slice(0, 6).map((candidate) => (
        <button
          key={candidate.symbol}
          type="button"
          onClick={() => onSelect(candidate.symbol)}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-100 dark:hover:bg-white/[0.05]"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {candidate.symbol}
            </span>
            <span className="rounded border border-slate-200 px-1 py-0.5 font-mono text-[9px] text-slate-500 dark:border-white/10 dark:text-slate-400">
              {candidate.best.pattern} · {candidate.best.timeframe}
            </span>
          </span>
          <span className="shrink-0 font-mono text-[10px] text-slate-500 dark:text-slate-400">
            {candidate.best.distancePct >= 0 ? "+" : ""}
            {candidate.best.distancePct.toFixed(1)}%
          </span>
        </button>
      ))}
    </div>
  );
}

function WatchlistPanel({
  symbols,
  metrics,
  loaded,
  onSelect,
}: {
  symbols: string[];
  metrics: Record<string, MarketMetricItem>;
  loaded: boolean;
  onSelect: (symbol: string) => void;
}) {
  if (!loaded) {
    return <PanelLoading label="memuat watchlist..." />;
  }
  if (symbols.length === 0) {
    return (
      <PanelEmpty label="Belum ada emiten di watchlist. Tambahkan dari halaman Watchlist." />
    );
  }
  return (
    <div className="space-y-1">
      {symbols.map((symbol) => {
        const metric = metrics[symbol];
        return (
          <button
            key={symbol}
            type="button"
            onClick={() => onSelect(symbol)}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-100 dark:hover:bg-white/[0.05]"
          >
            <span className="flex items-center gap-2">
              <CompanyLogo symbol={symbol} size="sm" />
              <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {symbol}
              </span>
            </span>
            <span className="text-right">
              <span className="block font-mono text-[10px] text-zinc-700 dark:text-zinc-200">
                {metric ? formatPrice(metric.lastPrice) : "—"}
              </span>
              <span
                className={`block font-mono text-[9px] ${
                  !metric
                    ? "text-slate-400"
                    : metric.dailyChangePct >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {metric ? formatPct(metric.dailyChangePct) : "memuat"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ScreenerPanel({
  items,
  onSelect,
}: {
  items: MarketMetricItem[];
  onSelect: (symbol: string) => void;
}) {
  if (items.length === 0) {
    return <PanelLoading label="memuat screener..." />;
  }
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <button
          key={item.symbol}
          type="button"
          onClick={() => onSelect(item.symbol)}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-100 dark:hover:bg-white/[0.05]"
        >
          <span className="flex items-center gap-2">
            <CompanyLogo symbol={item.symbol} companyName={item.name} size="sm" />
            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
              {item.symbol}
            </span>
          </span>
          <span
            className={`font-mono text-[10px] ${
              item.dailyChangePct >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatPct(item.dailyChangePct)}
          </span>
        </button>
      ))}
    </div>
  );
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
      <Loader2 className="h-3 w-3 animate-spin" />
      {label}
    </div>
  );
}

function PanelEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
      {label}
    </div>
  );
}
