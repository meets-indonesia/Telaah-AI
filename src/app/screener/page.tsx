"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Bookmark, Filter, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { CompanyLogo } from "@/components/CompanyLogo";
import { getCompanyName } from "@/lib/sectors/companies";
import { LIQUID_IDX_UNIVERSE } from "@/lib/screener/universe";
import {
  loadPresets,
  removePreset,
  savePreset,
  type ScreenerPreset,
} from "@/lib/screener/presets";
import type { MarketMetricItem } from "@/lib/screener/market-metrics";

const SYMBOLS = LIQUID_IDX_UNIVERSE;

function formatNumber(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("id-ID", { maximumFractionDigits: digits });
}

export default function ScreenerPage() {
  const [items, setItems] = useState<MarketMetricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [maxPe, setMaxPe] = useState("");
  const [maxPb, setMaxPb] = useState("");
  const [minRsi, setMinRsi] = useState("");
  const [trend, setTrend] = useState("all");
  const [presets, setPresets] = useState<ScreenerPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [activePreset, setActivePreset] = useState("");
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const [fullMode, setFullMode] = useState(false);
  const [fullMeta, setFullMeta] = useState<{
    complete: boolean;
    total: number;
    generatedAt: string | null;
    passes?: {
      base: { complete: boolean; progressPct: number };
      fundamentals: {
        complete: boolean;
        progressPct: number;
        updatedAt: string | null;
      };
      flow: {
        complete: boolean;
        progressPct: number;
        updatedAt: string | null;
      };
    } | null;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshotResponse = await fetch("/api/screener/snapshot", {
        cache: "no-store",
      });
      const snapshot = await snapshotResponse.json();
      if (
        snapshot.success &&
        Array.isArray(snapshot.items) &&
        snapshot.items.length > 0
      ) {
        setItems(snapshot.items as MarketMetricItem[]);
        setSnapshotAt(snapshot.generatedAt ?? null);
        setFallback(false);
        return;
      }

      const fallbackSymbols = SYMBOLS.slice(0, 20);
      const response = await fetch("/api/watchlist-metrics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbols: fallbackSymbols,
          includeFlow: false,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat screener.");
      }
      setItems(data.items as MarketMetricItem[]);
      setSnapshotAt(null);
      setFallback(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat screener.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    setPresets(loadPresets());
  }, []);

  const loadFull = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/screener/full-snapshot", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Gagal memuat full IDX.");
      }
      setItems((data.items ?? []) as MarketMetricItem[]);
      setFullMeta({
        complete: Boolean(data.complete),
        total: Number(data.total) || 962,
        generatedAt: data.generatedAt ?? null,
        passes: data.passes ?? null,
      });
      setSnapshotAt(data.generatedAt ?? null);
      setFallback(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat full IDX."
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (full: boolean) => {
    setFullMode(full);
    setActivePreset("");
    setSector("all");
    setMaxPe("");
    setMaxPb("");
    if (full) void loadFull();
    else void load();
  };

  const applyPreset = (id: string) => {
    setActivePreset(id);
    const preset = presets.find((item) => item.id === id);
    if (!preset) return;
    setSector(preset.sector);
    setMaxPe(preset.maxPe);
    setMaxPb(preset.maxPb);
    setMinRsi(preset.minRsi);
    setTrend(preset.trend);
  };

  const persistPreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const next = savePreset({ name, sector, maxPe, maxPb, minRsi, trend });
    setPresets(next);
    setPresetName("");
    const saved = next.find(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    );
    setActivePreset(saved?.id ?? "");
  };

  const deleteActivePreset = () => {
    if (!activePreset) return;
    setPresets(removePreset(activePreset));
    setActivePreset("");
  };

  const sectors = useMemo(
    () => [...new Set(items.map((item) => item.sector).filter(Boolean))].sort(),
    [items]
  );

  const valuationReady =
    !fullMode || Boolean(fullMeta?.passes?.fundamentals.complete);
  const results = useMemo(() => {
    const needle = query.trim().toUpperCase();
    const peLimit = Number(maxPe);
    const pbLimit = Number(maxPb);
    const rsiLimit = Number(minRsi);
    return items.filter((item) => {
      if (needle && !item.symbol.includes(needle) && !item.name.toUpperCase().includes(needle)) return false;
      if (!fullMode && sector !== "all" && item.sector !== sector) return false;
      if (valuationReady) {
        if (maxPe && Number.isFinite(peLimit) && (item.pe === null || item.pe > peLimit)) return false;
        if (maxPb && Number.isFinite(pbLimit) && (item.pb === null || item.pb > pbLimit)) return false;
      }
      if (minRsi && Number.isFinite(rsiLimit) && (item.rsi === null || item.rsi < rsiLimit)) return false;
      if (trend !== "all" && item.trend !== trend) return false;
      return true;
    });
  }, [
    items,
    query,
    sector,
    maxPe,
    maxPb,
    minRsi,
    trend,
    fullMode,
    valuationReady,
  ]);

  const visibleResults = results.slice(0, 200);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f7f7f8] dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header />
      <main id="main-content" className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Filter className="h-4 w-4" />
              </span>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">
                Screener
              </h1>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                {fullMode ? `${fullMeta?.total ?? 962} IDX` : `${SYMBOLS.length} likuid`}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {fullMode
                ? "Full IDX: base price/technical, lalu pass fundamental (PER/PBV/sector) dan flow. Progress terlihat di bawah."
                : "Filter valuasi, RSI, tren, dan foreign flow untuk 88 emiten likuid. Snapshot diperbarui harian oleh cron; fallback 20 emiten jika snapshot belum siap."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-white/[0.03]">
              <button
                type="button"
                onClick={() => switchMode(false)}
                className={`rounded-md px-2 py-1.5 font-mono text-[10px] transition ${
                  !fullMode
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                    : "text-slate-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                aria-pressed={!fullMode}
              >
                88 likuid
              </button>
              <button
                type="button"
                onClick={() => switchMode(true)}
                className={`rounded-md px-2 py-1.5 font-mono text-[10px] transition ${
                  fullMode
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                    : "text-slate-500 hover:text-zinc-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                aria-pressed={fullMode}
              >
                Full IDX
              </button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value.toUpperCase())}
                placeholder="Cari emiten..."
                className="h-9 w-44 rounded-lg border border-slate-200 bg-white pl-8 pr-3 font-mono text-xs text-zinc-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-100"
              />
            </div>
            <button
              type="button"
              onClick={() => void (fullMode ? loadFull() : load())}
              disabled={loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Muat ulang
            </button>
          </div>
        </div>

        {fallback && (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
            Snapshot 88 emiten belum siap. Menampilkan 20 emiten likuid tanpa
            flow. Cron akan membangun snapshot lengkap pada jadwal berikutnya.
          </p>
        )}

        {fullMode && fullMeta && (
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[10px] text-slate-500 dark:border-white/10 dark:bg-[#0b0b0c] dark:text-slate-400">
            Base {fullMeta.passes?.base.progressPct.toFixed(0) ?? "0"}% ·
            Fundamental {fullMeta.passes?.fundamentals.progressPct.toFixed(0) ?? "0"}% ·
            Flow {fullMeta.passes?.flow.progressPct.toFixed(0) ?? "0"}%
          </p>
        )}

        {!fullMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-white/10 dark:bg-[#0b0b0c]">
          <Bookmark className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={activePreset}
            onChange={(event) => applyPreset(event.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
            aria-label="Preset screener"
          >
            <option value="">Preset tersimpan</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <input
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="Nama preset"
            className="h-8 w-36 rounded-md border border-slate-200 bg-white px-2 font-mono text-[11px] text-zinc-700 outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
          />
          <button
            type="button"
            onClick={persistPreset}
            disabled={!presetName.trim()}
            className="h-8 rounded-md bg-zinc-900 px-3 text-[11px] font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Simpan
          </button>
          <button
            type="button"
            onClick={deleteActivePreset}
            disabled={!activePreset}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-[11px] text-slate-500 transition hover:text-rose-600 disabled:opacity-40 dark:border-white/10 dark:text-slate-400"
          >
            <Trash2 className="h-3 w-3" />
            Hapus
          </button>
        </div>
        )}

        <div className={`grid gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-white/10 dark:bg-[#0b0b0c] sm:grid-cols-2 ${fullMode ? (valuationReady ? "lg:grid-cols-5" : "lg:grid-cols-3") : "lg:grid-cols-6"}`}>
          {!fullMode && (
          <select
            value={sector}
            onChange={(event) => setSector(event.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
            aria-label="Sektor"
          >
            <option value="all">Semua sektor</option>
            {sectors.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          )}
          {valuationReady && (
          <input
            value={maxPe}
            onChange={(event) => setMaxPe(event.target.value)}
            placeholder="PER maks"
            inputMode="decimal"
            className="h-8 rounded-md border border-slate-200 bg-white px-2 font-mono text-[11px] text-zinc-700 outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
          />
          )}
          {valuationReady && (
          <input
            value={maxPb}
            onChange={(event) => setMaxPb(event.target.value)}
            placeholder="PBV maks"
            inputMode="decimal"
            className="h-8 rounded-md border border-slate-200 bg-white px-2 font-mono text-[11px] text-zinc-700 outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
          />
          )}
          <input
            value={minRsi}
            onChange={(event) => setMinRsi(event.target.value)}
            placeholder="RSI min"
            inputMode="decimal"
            className="h-8 rounded-md border border-slate-200 bg-white px-2 font-mono text-[11px] text-zinc-700 outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
          />
          <select
            value={trend}
            onChange={(event) => setTrend(event.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
            aria-label="Tren"
          >
            <option value="all">Semua tren</option>
            <option value="Bullish">Bullish</option>
            <option value="Neutral">Neutral</option>
            <option value="Bearish">Bearish</option>
          </select>
          <span className="self-center text-right font-mono text-[10px] text-slate-400">
            {results.length} hasil{fullMode && results.length > 200 ? " · tampil 200" : ""}
          </span>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-500 dark:border-white/10 dark:bg-[#0b0b0c] dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            Memuat snapshot screener...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center text-sm text-rose-600 dark:text-rose-300">
            {error}
          </div>
        ) : fullMode && items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0b0b0c]">
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Snapshot full IDX belum tersedia.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Jalankan <code>./deploy/podman/screener-full-snapshot.sh</code>{" "}
              atau tunggu cron 18:00.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0b0b0c]">
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Tidak ada emiten yang cocok.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Longgarkan filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b0b0c]">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="border-b border-slate-100 font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:border-white/[0.06]">
                <tr>
                  <th className="px-4 py-2 font-normal">Emiten</th>
                  <th className="px-2 py-2 text-right font-normal">Harga</th>
                  <th className="px-2 py-2 text-right font-normal">PER</th>
                  <th className="px-2 py-2 text-right font-normal">PBV</th>
                  <th className="px-2 py-2 text-right font-normal">RSI</th>
                  <th className="px-2 py-2 text-right font-normal">Flow 5D</th>
                  <th className="px-4 py-2 text-right font-normal">Tren</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {visibleResults.map((item) => (
                  <tr key={item.symbol}>
                    <td className="px-4 py-2.5">
                      <a href={`/chart?symbol=${item.symbol}&tf=1Y`} className="flex items-center gap-2">
                        <CompanyLogo symbol={item.symbol} companyName={item.name} size="sm" />
                        <div>
                          <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{item.symbol}</div>
                          <div className="max-w-[220px] truncate text-[10px] text-slate-500 dark:text-slate-400">
                            {getCompanyName(item.symbol) ?? item.name}
                          </div>
                        </div>
                      </a>
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono">{formatNumber(item.lastPrice, 0)}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{formatNumber(item.pe)}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{formatNumber(item.pb)}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{formatNumber(item.rsi)}</td>
                    <td className={`px-2 py-2.5 text-right font-mono ${item.flow5d === null ? "text-slate-400" : item.flow5d >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {item.flow5d === null ? "—" : `${item.flow5d >= 0 ? "+" : ""}${(item.flow5d / 1e9).toFixed(1)}B`}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[11px] text-slate-600 dark:text-slate-300">{item.trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          {fullMode
            ? "Full IDX: price/technical snapshot; PER/PBV/flow belum tersedia untuk seluruh bursa. Bukan rekomendasi."
            : "Sampel 88 emiten likuid, bukan seluruh bursa. Bukan rekomendasi."}
        </p>
      </main>
    </div>
  );
}
