"use client";

import React, { useState, useEffect } from "react";
import { PeerLensData } from "@/lib/agent/types";
import { ValuationData } from "@/lib/sectors/types";
import { Scale, Layers, BarChart2, Table as TableIcon } from "lucide-react";
import { CompanyLogo } from "./CompanyLogo";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";

interface PeerLensModuleProps {
  peerLens?: PeerLensData;
  valuation?: ValuationData;
  symbol: string;
}

export const PeerLensModule: React.FC<PeerLensModuleProps> = ({ peerLens, valuation, symbol }) => {
  const [metricTab, setMetricTab] = useState<"pe" | "pb" | "marketCap" | "table">("pe");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const safePeers = Array.isArray(peerLens?.peers) ? peerLens.peers : [];
  if (!peerLens || peerLens.status === "unavailable" || safePeers.length === 0) {
    return (
      <div className="bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-slate-800/80 p-4 transition-colors">
        <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-900 dark:text-slate-100 mb-1">Valuation & Peer Lens</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Data perbandingan rekan sejenis (peer universe) tidak tersedia pada mode analisis ini atau emiten belum memiliki pembanding langsung yang seimbang.
        </p>
      </div>
    );
  }

  const formatTrillion = (val: number) => {
    if (val >= 1e12) return (val / 1e12).toFixed(2) + " T";
    if (val >= 1e9) return (val / 1e9).toFixed(1) + " M";
    return val.toLocaleString("id-ID");
  };

  // Prepare chart items
  const chartData = safePeers.map((p) => {
    const isTarget = p.isTarget || p.symbol === symbol;
    const peVal = p.pe !== null && p.pe !== undefined && p.pe > 0 ? Number(p.pe.toFixed(2)) : 0;
    const pbVal = p.pb !== null && p.pb !== undefined && p.pb > 0 ? Number(p.pb.toFixed(2)) : 0;
    const mCapT = Number((p.marketCap / 1e12).toFixed(2));

    return {
      symbol: p.symbol,
      companyName: p.companyName,
      pe: peVal,
      pb: pbVal,
      marketCapT: mCapT,
      rawMarketCap: p.marketCap,
      divYield: p.dividendYield ? Number((p.dividendYield * 100).toFixed(2)) : null,
      isTarget,
    };
  });

  // Calculate peer averages for reference line
  const validPEs = chartData.filter((d) => d.pe > 0).map((d) => d.pe);
  const avgPE = validPEs.length > 0 ? Number((validPEs.reduce((a, b) => a + b, 0) / validPEs.length).toFixed(1)) : 0;

  const validPBs = chartData.filter((d) => d.pb > 0).map((d) => d.pb);
  const avgPB = validPBs.length > 0 ? Number((validPBs.reduce((a, b) => a + b, 0) / validPBs.length).toFixed(2)) : 0;

  return (
    <div className="bg-white dark:bg-black rounded-lg border border-slate-200 dark:border-slate-800/80 p-4 space-y-3 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Valuation & Peer Lens</h3>
            <span className="text-[10px] uppercase font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
              Basis: {peerLens.basis}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Perbandingan multiple valuasi dan kapitalisasi terhadap emiten sejenis di subsektor yang sama.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-black rounded border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
          <button
            onClick={() => setMetricTab("pe")}
            type="button"
            className={`px-2 py-0.5 rounded transition ${
              metricTab === "pe"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            P/E Ratio
          </button>
          <button
            onClick={() => setMetricTab("pb")}
            type="button"
            className={`px-2 py-0.5 rounded transition ${
              metricTab === "pb"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            P/B Ratio
          </button>
          <button
            onClick={() => setMetricTab("marketCap")}
            type="button"
            className={`px-2 py-0.5 rounded transition ${
              metricTab === "marketCap"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            Market Cap
          </button>
          <button
            onClick={() => setMetricTab("table")}
            type="button"
            className={`px-2 py-0.5 rounded transition ${
              metricTab === "table"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold shadow-2xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            Tabel
          </button>
        </div>
      </div>

      {/* Diagnosa Relatif Sektor Snapshot */}
      {(() => {
        const target = chartData.find((p) => p.isTarget);
        if (!target) return null;

        const isCheaperPE = target.pe > 0 && avgPE > 0 && target.pe < avgPE;
        const isCheaperPB = target.pb > 0 && avgPB > 0 && target.pb < avgPB;
        const sortedByCap = [...chartData].sort((a, b) => b.rawMarketCap - a.rawMarketCap);
        const capRank = sortedByCap.findIndex((p) => p.isTarget) + 1;

        return (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[10px] text-slate-400 block">Posisi Valuasi (P/E)</span>
              <span className={`font-bold mt-0.5 block ${isCheaperPE ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                {target.pe > 0
                  ? isCheaperPE
                    ? `Diskon Sektor (${target.pe}x vs Rata-rata ${avgPE}x)`
                    : `Premium Sektor (${target.pe}x vs Rata-rata ${avgPE}x)`
                  : "Data Belum Tersedia"}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[10px] text-slate-400 block">Peringkat Kapitalisasi Sektor</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                {capRank === 1
                  ? "Pemain No. 1 Terbesar di Sektor"
                  : `Peringkat #${capRank} dari ${chartData.length} Emiten`}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[10px] text-slate-400 block">Daya Tarik Dividen</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                {target.divYield !== null && target.divYield > 0
                  ? `Yield: ${target.divYield}% (Rutin Bagikan)`
                  : "Growth Play (Yield Rendah / Reinvestasi)"}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Bar Chart Section */}
      {metricTab !== "table" && (
        <div className="bg-white/70 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800/80 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-zinc-700" />
              <span>
                {metricTab === "pe" && `Perbandingan P/E Ratio (x) — Rata-rata Peer: ${avgPE}x`}
                {metricTab === "pb" && `Perbandingan P/B Ratio (x) — Rata-rata Peer: ${avgPB}x`}
                {metricTab === "marketCap" && "Perbandingan Market Cap (Rp Triliun)"}
              </span>
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-zinc-900 dark:text-zinc-300 font-semibold">
                <span className="w-2.5 h-2.5 rounded-xs bg-zinc-900" /> Target ({symbol})
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 dark:bg-slate-600" /> Peer Emiten
              </span>
            </div>
          </div>

          <div className="h-60 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="symbol"
                    stroke="#94a3b8"
                    tick={{ fontSize: 11, fontWeight: 600 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    tickFormatter={(val) =>
                      metricTab === "marketCap" ? `${val} T` : `${val}x`
                    }
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3 text-xs space-y-1 font-mono z-50">
                            <div className="font-sans font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center justify-between gap-3">
                              <span className="flex items-center gap-1.5">
                                <span>{item.symbol}</span>
                                {item.isTarget && (
                                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-500 text-white font-sans font-bold">
                                    Target
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal truncate max-w-[130px] font-sans">
                                {item.companyName}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-slate-700 dark:text-slate-300">
                              <span>P/E Ratio:</span>
                              <span className="font-bold">{item.pe > 0 ? `${item.pe}x` : "-"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-slate-700 dark:text-slate-300">
                              <span>P/B Ratio:</span>
                              <span className="font-bold">{item.pb > 0 ? `${item.pb}x` : "-"}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-slate-700 dark:text-slate-300">
                              <span>Market Cap:</span>
                              <span className="font-bold">Rp {item.marketCapT} T</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {metricTab === "pe" && avgPE > 0 && (
                    <ReferenceLine
                      y={avgPE}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{
                        value: `Avg ${avgPE}x`,
                        fill: "#f59e0b",
                        fontSize: 10,
                        position: "insideTopRight",
                      }}
                    />
                  )}
                  {metricTab === "pb" && avgPB > 0 && (
                    <ReferenceLine
                      y={avgPB}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{
                        value: `Avg ${avgPB}x`,
                        fill: "#f59e0b",
                        fontSize: 10,
                        position: "insideTopRight",
                      }}
                    />
                  )}

                  <Bar
                    dataKey={
                      metricTab === "pe"
                        ? "pe"
                        : metricTab === "pb"
                        ? "pb"
                        : "marketCapT"
                    }
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.isTarget
                            ? "#2563eb"
                            : "#94a3b8"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Memuat Bar Chart Valuasi...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-[11px] uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Emiten</th>
                <th className="py-2.5 px-3 text-right">Market Cap</th>
                <th className="py-2.5 px-3 text-right">P/E Ratio</th>
                <th className="py-2.5 px-3 text-right">P/B Ratio</th>
                <th className="py-2.5 px-3 text-right">Div. Yield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
              {safePeers.map((peer) => {
                const isTarget = peer.isTarget || peer.symbol === symbol;
                return (
                  <tr
                    key={peer.symbol}
                    className={`transition ${
                      isTarget
                        ? "bg-zinc-700/10 dark:bg-blue-600/15 border-l-4 border-l-zinc-900 font-semibold text-slate-900 dark:text-white"
                        : "hover:bg-slate-100/60 dark:hover:bg-slate-900/50"
                    }`}
                  >
                    <td className="py-2.5 px-3 font-sans">
                      <div className="flex items-center gap-2">
                        <CompanyLogo symbol={peer.symbol} companyName={peer.companyName} size="xs" />
                        <span
                          className={`font-mono font-bold px-1.5 py-0.5 rounded text-xs ${
                            isTarget
                              ? "bg-zinc-900 text-white"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                          }`}
                        >
                          {peer.symbol}
                        </span>
                        <span className="text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                          {peer.companyName}
                        </span>
                        {isTarget && (
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-400/20 text-zinc-700 dark:text-blue-300 border border-zinc-200 dark:border-blue-400/30 font-sans">
                            Target
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">Rp {formatTrillion(peer.marketCap)}</td>
                    <td className="py-2.5 px-3 text-right">{peer.pe !== null && peer.pe !== undefined ? `${peer.pe.toFixed(1)}x` : "-"}</td>
                    <td className="py-2.5 px-3 text-right">{peer.pb !== null && peer.pb !== undefined ? `${peer.pb.toFixed(2)}x` : "-"}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                      {peer.dividendYield !== null && peer.dividendYield !== undefined ? `${(peer.dividendYield * 100).toFixed(2)}%` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
    </div>
  );
};
