"use client";

import React from "react";
import { PeerLensData } from "@/lib/agent/types";
import { ValuationData } from "@/lib/sectors/types";
import { Scale, Layers } from "lucide-react";

interface PeerLensModuleProps {
  peerLens?: PeerLensData;
  valuation?: ValuationData;
  symbol: string;
}

export const PeerLensModule: React.FC<PeerLensModuleProps> = ({ peerLens, valuation, symbol }) => {
  const safePeers = Array.isArray(peerLens?.peers) ? peerLens.peers : [];
  if (!peerLens || peerLens.status === "unavailable" || safePeers.length === 0) {
    return (
      <div className="bg-[#0f172a]/95 rounded-2xl border border-slate-800 p-6">
        <h3 className="text-base font-bold text-white mb-2">Valuation & Peer Lens</h3>
        <p className="text-xs text-slate-500">
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

  return (
    <div className="bg-[#0f172a]/95 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Valuation & Peer Lens</h3>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
              Basis: {peerLens.basis}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Perbandingan multiple valuasi terhadap emiten sejenis di subsektor yang sama.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Emiten</th>
              <th className="py-2.5 px-3 text-right">Market Cap</th>
              <th className="py-2.5 px-3 text-right">P/E Ratio</th>
              <th className="py-2.5 px-3 text-right">P/B Ratio</th>
              <th className="py-2.5 px-3 text-right">Div. Yield</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {safePeers.map((peer) => {
              const isTarget = peer.isTarget || peer.symbol === symbol;
              return (
                <tr
                  key={peer.symbol}
                  className={`transition ${
                    isTarget
                      ? "bg-blue-600/15 border-l-4 border-l-blue-500 font-semibold text-white"
                      : "hover:bg-slate-900/50"
                  }`}
                >
                  <td className="py-2.5 px-3 font-sans">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold px-1.5 py-0.5 rounded text-xs ${
                          isTarget
                            ? "bg-blue-500 text-white"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {peer.symbol}
                      </span>
                      <span className="text-[11px] text-slate-300 truncate max-w-[160px]">
                        {peer.companyName}
                      </span>
                      {isTarget && (
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-blue-400/20 text-blue-300 border border-blue-400/30 font-sans">
                          Target
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">Rp {formatTrillion(peer.marketCap)}</td>
                  <td className="py-2.5 px-3 text-right">{peer.pe !== null && peer.pe !== undefined ? `${peer.pe.toFixed(1)}x` : "-"}</td>
                  <td className="py-2.5 px-3 text-right">{peer.pb !== null && peer.pb !== undefined ? `${peer.pb.toFixed(2)}x` : "-"}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">
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
