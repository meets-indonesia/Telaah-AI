"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Target } from "lucide-react";
import { Header } from "@/components/Header";
import type { CalibrationResult } from "@/lib/harmonic/evaluations";

function tone(rate: number) {
  if (rate >= 60) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 45) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function confidenceTone(value: string) {
  if (value === "high") return "text-emerald-600 dark:text-emerald-400";
  if (value === "medium") return "text-amber-600 dark:text-amber-400";
  return "text-slate-400";
}

export default function HarmonicCalibrationPage() {
  const [data, setData] = useState<CalibrationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/harmonic/calibration", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          throw new Error(result.error || "Kalibrasi tidak tersedia.");
        }
        setData(result as CalibrationResult);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Kalibrasi tidak tersedia."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f7f7f8] dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header />
      <main id="main-content" className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-5 lg:px-6 py-4 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Target className="h-4 w-4" />
              </span>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">
                Harmonic Calibration
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Kandidat live dicatat oleh scanner; cron 17:30 mengukur outcome
              T1/T2/invalidasi. Saran bobot tidak diterapkan otomatis.
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

        {loading ? (
          <div className="flex h-52 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-500 dark:border-white/10 dark:bg-[#0b0b0c] dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
            Memuat evaluasi live...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </div>
        ) : !data || data.totalCandidates === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0b0b0c]">
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              Belum ada evaluasi live.
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Scanner akan mencatat kandidat. Setelah 10 hari, cron evaluasi
              harian mengisi outcome T1/T2/invalidasi.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { label: "Kandidat tercatat", value: data.totalCandidates },
                { label: "Sudah dievaluasi", value: data.evaluated },
                { label: "Menunggu horizon", value: data.pending },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0b0b0c]"
                >
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    {item.label}
                  </div>
                  <div className="mt-1 font-mono text-xl font-semibold text-zinc-950 dark:text-white">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {data.groups.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#0b0b0c]">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  {data.pending} kandidat menunggu horizon evaluasi.
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Evaluasi berjalan setelah kandidat berumur 10 hari. Cron
                  berikutnya 17:30 WIB.
                </p>
              </div>
            ) : (
              <>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b0b0c]">
              <table className="w-full min-w-[900px] text-left text-[11px]">
                <thead className="border-b border-slate-100 font-mono text-[9px] uppercase tracking-wider text-slate-400 dark:border-white/[0.06]">
                  <tr>
                    <th className="px-4 py-2 font-normal">Pola / TF</th>
                    <th className="px-2 py-2 text-right font-normal">Sampel</th>
                    <th className="px-2 py-2 text-right font-normal">T1</th>
                    <th className="px-2 py-2 text-right font-normal">T2</th>
                    <th className="px-2 py-2 text-right font-normal">Invalid</th>
                    <th className="px-2 py-2 text-right font-normal">Hari T1</th>
                    <th className="px-2 py-2 text-right font-normal">Saran Δ</th>
                    <th className="px-4 py-2 text-right font-normal">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {data.groups.map((row) => (
                    <tr key={`${row.pattern}-${row.timeframe}-${row.direction}-${row.status}`}>
                      <td className="px-4 py-2 font-mono text-zinc-800 dark:text-zinc-200">
                        {row.pattern}
                        <span className="ml-1 text-[9px] text-slate-400">
                          {row.timeframe} · {row.direction} · {row.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-slate-500 dark:text-slate-400">
                        {row.total}
                      </td>
                      <td className={`px-2 py-2 text-right font-mono ${tone(row.t1RatePct)}`}>
                        {row.t1RatePct.toFixed(1)}%
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-indigo-600 dark:text-indigo-300">
                        {row.t2RatePct.toFixed(1)}%
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-rose-600 dark:text-rose-400">
                        {row.invalidatedRatePct.toFixed(1)}%
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-slate-500 dark:text-slate-400">
                        {row.avgDaysToT1 === null ? "—" : row.avgDaysToT1.toFixed(0)}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-zinc-700 dark:text-zinc-200">
                        {row.suggestedWeightDelta > 0 ? "+" : ""}
                        {row.suggestedWeightDelta.toFixed(1)}
                      </td>
                      <td className={`px-4 py-2 text-right font-mono ${confidenceTone(row.confidence)}`}>
                        {row.confidence}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              Saran Δ hanya untuk grup dengan minimal 20 sampel dan status
              completed. Ini bukan auto-tuning: bobot production hanya diubah
              setelah review dan validasi out-of-sample.
            </p>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
