"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { Header } from "@/components/Header";
import { CompanyLogo } from "@/components/CompanyLogo";
import { SymbolSearch } from "@/components/SymbolSearch";
import { getCompanyName } from "@/lib/sectors/companies";
import {
  loadHoldings,
  removeHolding,
  upsertHolding,
  type Holding,
} from "@/lib/portfolio/store";
import type { DividendCalendarItem } from "@/lib/market/dividend-calendar";
import type { MarketMetricItem } from "@/lib/screener/market-metrics";

function formatIdr(value: number): string {
  return value.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [symbol, setSymbol] = useState("BBCA");
  const [lots, setLots] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [metrics, setMetrics] = useState<Record<string, MarketMetricItem>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [dividends, setDividends] = useState<DividendCalendarItem[]>([]);
  const [dividendLoading, setDividendLoading] = useState(true);
  const [dividendError, setDividendError] = useState<string | null>(null);

  useEffect(() => {
    setHoldings(loadHoldings());
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDividendLoading(true);
    setDividendError(null);
    fetch("/api/dividend-calendar", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) {
          throw new Error(data.error || "Kalender dividen tidak tersedia.");
        }
        setDividends((data.items ?? []) as DividendCalendarItem[]);
        if (data.limited) {
          setDividendError(
            "Sumber IDX sedang lambat; daftar dividen mungkin tidak lengkap."
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDividendError(
            err instanceof Error
              ? err.message
              : "Kalender dividen tidak tersedia."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDividendLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const holdingDividends = useMemo(() => {
    const symbols = new Set(holdings.map((item) => item.symbol));
    return dividends.filter((item) => symbols.has(item.symbol));
  }, [dividends, holdings]);

  useEffect(() => {
    if (!ready || holdings.length === 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/watchlist-metrics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbols: holdings.map((item) => item.symbol) }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) throw new Error(data.error || "Gagal memuat harga.");
        setMetrics(
          Object.fromEntries(
            (data.items as MarketMetricItem[]).map((item) => [item.symbol, item])
          )
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat harga.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [holdings, ready]);

  const rows = useMemo(
    () =>
      holdings.map((holding) => {
        const metric = metrics[holding.symbol];
        const shares = holding.lots * 100;
        const cost = shares * holding.avgPrice;
        const last = metric?.lastPrice ?? null;
        const value = last ? shares * last : null;
        const pnl = value === null ? null : value - cost;
        const pnlPct = pnl === null || cost === 0 ? null : (pnl / cost) * 100;
        return { holding, metric, shares, cost, last, value, pnl, pnlPct };
      }),
    [holdings, metrics]
  );

  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
  const totalValue = rows.reduce((sum, row) => sum + (row.value ?? 0), 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const add = () => {
    const parsedLots = Number(lots);
    const parsedPrice = Number(avgPrice);
    if (!/^[A-Z]{4}$/.test(symbol)) {
      setError("Kode emiten harus 4 huruf.");
      return;
    }
    if (!Number.isFinite(parsedLots) || parsedLots <= 0) {
      setError("Lot harus lebih dari 0.");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Harga rata-rata harus lebih dari 0.");
      return;
    }
    setHoldings(upsertHolding({ symbol, lots: parsedLots, avgPrice: parsedPrice }));
    setLots("");
    setAvgPrice("");
    setError(null);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f7f7f8] dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header />
      <main id="main-content" className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-4 space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Wallet className="h-4 w-4" />
              </span>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">
                Portfolio
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Catatan lokal. Tidak tersimpan di server.
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-semibold text-zinc-950 dark:text-white">
              Rp {formatIdr(totalValue)}
            </div>
            <div className={`font-mono text-xs ${totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {totalPnl >= 0 ? "+" : ""}Rp {formatIdr(totalPnl)} ({formatPct(totalPnlPct)})
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0b0b0c] sm:grid-cols-[minmax(0,1fr)_120px_140px_auto] sm:items-end">
          <div>
            <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Emiten
            </label>
            <SymbolSearch value={symbol} onSelect={setSymbol} />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Lot
            </label>
            <input
              value={lots}
              onChange={(event) => setLots(event.target.value)}
              inputMode="numeric"
              placeholder="10"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs text-zinc-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Harga rata-rata
            </label>
            <input
              value={avgPrice}
              onChange={(event) => setAvgPrice(event.target.value)}
              inputMode="decimal"
              placeholder="3000"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs text-zinc-900 outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-100"
            />
          </div>
          <button
            type="button"
            onClick={add}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white transition hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Simpan
          </button>
        </div>

        {error && (
          <p className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
            {error}
          </p>
        )}

        {rows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0b0b0c]">
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              Portfolio masih kosong.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tambahkan emiten, jumlah lot, dan harga rata-rata.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b0b0c]">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-100 font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:border-white/[0.06]">
                <tr>
                  <th className="px-4 py-2 font-normal">Emiten</th>
                  <th className="px-2 py-2 text-right font-normal">Lot</th>
                  <th className="px-2 py-2 text-right font-normal">Avg</th>
                  <th className="px-2 py-2 text-right font-normal">Last</th>
                  <th className="px-2 py-2 text-right font-normal">Nilai</th>
                  <th className="px-2 py-2 text-right font-normal">P&L</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {rows.map((row) => (
                  <tr key={row.holding.symbol}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <CompanyLogo symbol={row.holding.symbol} size="sm" />
                        <div>
                          <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            {row.holding.symbol}
                          </div>
                          <div className="max-w-[220px] truncate text-[10px] text-slate-500 dark:text-slate-400">
                            {getCompanyName(row.holding.symbol) ?? row.metric?.name ?? ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono">{row.holding.lots}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{formatIdr(row.holding.avgPrice)}</td>
                    <td className="px-2 py-2.5 text-right font-mono">
                      {row.last === null ? "—" : formatIdr(row.last)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono">
                      {row.value === null ? "—" : `Rp ${formatIdr(row.value)}`}
                    </td>
                    <td className={`px-2 py-2.5 text-right font-mono ${row.pnl === null ? "text-slate-400" : row.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {row.pnl === null ? "—" : `${row.pnl >= 0 ? "+" : ""}${formatIdr(row.pnl)}`}
                      {row.pnlPct !== null && (
                        <span className="ml-1 text-[10px]">({formatPct(row.pnlPct)})</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setHoldings(removeHolding(row.holding.symbol))}
                        aria-label={`Hapus ${row.holding.symbol}`}
                        className="rounded p-1 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            memuat harga...
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b0b0c]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-500" />
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Kalender dividen
                </h2>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Bulan ini · sumber IDX · {holdingDividends.length} untuk holdings
                </p>
              </div>
            </div>
            {dividendLoading && (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                memuat...
              </span>
            )}
          </div>
          {dividendError && (
            <p className="border-b border-amber-500/10 bg-amber-500/5 px-4 py-2 text-[10px] text-amber-700 dark:text-amber-300">
              {dividendError}
            </p>
          )}
          {!dividendLoading && holdingDividends.length > 0 && (
            <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {holdingDividends.map((item) => (
                <li
                  key={`${item.symbol}-${item.date}-${item.description}`}
                  className="flex items-start gap-3 px-4 py-2.5"
                >
                  <span className="mt-0.5 w-20 shrink-0 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    {item.date}
                  </span>
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {item.symbol}
                    </span>
                    <span className="ml-1 rounded border border-amber-500/20 bg-amber-500/10 px-1 py-0.5 font-mono text-[9px] text-amber-700 dark:text-amber-300">
                      {item.kind}
                    </span>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!dividendLoading && holdingDividends.length === 0 && (
            <p className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400">
              Tidak ada dividen untuk holdings bulan ini.
            </p>
          )}
          {!dividendLoading && dividends.length > 0 && (
            <details className="border-t border-slate-100 px-4 py-2 dark:border-white/[0.06]">
              <summary className="cursor-pointer font-mono text-[10px] text-slate-500 dark:text-slate-400">
                Semua dividen bulan ini ({dividends.length})
              </summary>
              <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {dividends.map((item) => (
                  <div
                    key={`all-${item.symbol}-${item.date}-${item.description}`}
                    className="flex items-start gap-2 text-[10px]"
                  >
                    <span className="w-20 shrink-0 font-mono text-slate-400">
                      {item.date}
                    </span>
                    <span className="w-10 shrink-0 font-mono font-bold text-zinc-700 dark:text-zinc-200">
                      {item.symbol}
                    </span>
                    <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
      </main>
    </div>
  );
}
