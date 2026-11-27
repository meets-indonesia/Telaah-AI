"use client";

import React, { useEffect, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import type { StockbitQuote } from "@/lib/market/scraper-client";

function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return value.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

function formatVolume(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString("id-ID");
}

export function DepthCard({ symbol }: { symbol: string }) {
  const [quote, setQuote] = useState<StockbitQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const response = await fetch(
          `/api/quote?symbol=${encodeURIComponent(symbol)}`,
          { cache: "no-store" }
        );
        const data = await response.json();
        if (cancelled) return;
        if (data.success) {
          setQuote(data.quote as StockbitQuote);
          setError(null);
        } else {
          setQuote(null);
          setError(data.error || "Order book tidak tersedia.");
        }
      } catch {
        if (!cancelled) setError("Order book tidak tersedia.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(load, 5_000);
        }
      }
    };

    setQuote(null);
    setError(null);
    setLoading(true);
    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [symbol]);

  const offers = (quote?.offers ?? []).slice(0, 5);
  const bids = (quote?.bids ?? []).slice(0, 5);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-white/10 dark:bg-[#0b0b0c]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <ArrowDownUp className="h-3.5 w-3.5 text-indigo-500" />
            Order book
          </h2>
          <span className="font-mono text-[10px] font-bold text-zinc-900 dark:text-zinc-100">
            {symbol}
          </span>
          <span className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:border-white/10 dark:text-slate-400">
            {quote ? "Stockbit" : loading ? "memuat" : "N/A"}
          </span>
        </div>
        <span className="font-mono text-[9px] text-slate-400">
          refresh 5s · top-5
        </span>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <p className="text-[10px] text-amber-600 dark:text-amber-400">
            {error}
          </p>
          <p className="mt-1 text-[9px] leading-relaxed text-slate-400">
            Depth bursa penuh memerlukan feed berlisensi; yang tersedia hanya
            top-5 dari Stockbit.
          </p>
        </div>
      ) : quote ? (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <div className="text-[8px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Best bid
              </div>
              <div className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {formatPrice(quote.bid)}
              </div>
            </div>
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2">
              <div className="text-[8px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Best offer
              </div>
              <div className="font-mono text-sm font-semibold text-rose-700 dark:text-rose-300">
                {formatPrice(quote.offer)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-[8px] font-mono uppercase tracking-wider text-slate-400">
                ARA
              </div>
              <div className="font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {formatPrice(quote.ara)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-[8px] font-mono uppercase tracking-wider text-slate-400">
                ARB
              </div>
              <div className="font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {formatPrice(quote.arb)}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <span>Bid / beli</span>
                <span className="text-slate-400">Harga · Vol</span>
              </div>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-white/[0.06] dark:border-white/10">
                {bids.length === 0 ? (
                  <p className="px-2 py-2 text-[10px] text-slate-400">
                    Tidak ada level bid.
                  </p>
                ) : (
                  bids.map((level, index) => (
                    <div
                      key={`bid-${level.price}-${index}`}
                      className="flex items-center justify-between px-2.5 py-1.5 font-mono text-[10px]"
                    >
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {formatPrice(level.price)}
                      </span>
                      <span className="text-slate-400">
                        {formatVolume(level.volume)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-rose-600 dark:text-rose-400">
                <span>Offer / jual</span>
                <span className="text-slate-400">Harga · Vol</span>
              </div>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-white/[0.06] dark:border-white/10">
                {offers.length === 0 ? (
                  <p className="px-2 py-2 text-[10px] text-slate-400">
                    Tidak ada level offer.
                  </p>
                ) : (
                  offers.map((level, index) => (
                    <div
                      key={`offer-${level.price}-${index}`}
                      className="flex items-center justify-between px-2.5 py-1.5 font-mono text-[10px]"
                    >
                      <span className="text-rose-600 dark:text-rose-400">
                        {formatPrice(level.price)}
                      </span>
                      <span className="text-slate-400">
                        {formatVolume(level.volume)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <p className="text-[9px] leading-relaxed text-slate-400">
            Top-5, unofficial, near-real-time. Bukan depth bursa penuh dan bukan
            tick-by-tick exchange feed.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-[10px] text-slate-400">
          Memuat order book...
        </p>
      )}
    </section>
  );
}
