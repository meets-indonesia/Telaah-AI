"use client";

import React, { useState } from "react";
import { HarmonicPatternResult } from "@/lib/quant/harmonic";
import {
  TrendingDown,
  TrendingUp,
  Target,
  ShieldAlert,
  Sliders,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  Clock,
  Compass,
} from "lucide-react";

interface HarmonicPRZModuleProps {
  harmonic: HarmonicPatternResult;
  symbol: string;
  currentPrice: number;
}

export const HarmonicPRZModule: React.FC<HarmonicPRZModuleProps> = ({
  harmonic,
  symbol,
  currentPrice,
}) => {
  const [activeView, setActiveView] = useState<"diagram" | "ratios">("diagram");

  if (!harmonic || !harmonic.hasPattern) {
    return (
      <div className="bg-[#0f172a]/95 rounded-2xl border border-slate-800 p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <Compass className="w-5 h-5 text-purple-400" /> Harmonic Pattern & PRZ Projection
        </h3>
        <p className="text-xs text-slate-500">
          Belum terbentuk konfluensi pola XABCD yang valid pada data transaksi harian emiten {symbol}.
        </p>
      </div>
    );
  }

  const {
    patternName,
    patternVariant,
    type,
    status,
    points,
    ratios,
    prz,
    targets,
    confidenceScore,
    narrative,
    educationalDisclaimer,
  } = harmonic;

  const isBearish = type === "BEARISH_REVERSAL";

  return (
    <div className="bg-[#0f172a]/95 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl space-y-6 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Harmonic Pattern & PRZ Projection</h3>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                isBearish
                  ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              }`}
            >
              {isBearish ? "Bearish Reversal Setup" : "Bullish Reversal Setup"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Analisis Geometri Fibonacci XABCD • Area PRZ (Potential Reversal Zone) & Multi-Target Projection
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-500 block uppercase">Confidence Fit</span>
            <span className="text-xs font-mono font-bold text-purple-400">
              {confidenceScore}% Fibonacci Fit
            </span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono ${
              status === "IN_PRZ"
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse"
                : status === "REVERSED"
                ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                : "bg-blue-500/15 text-blue-300 border-blue-500/30"
            }`}
          >
            {status === "IN_PRZ"
              ? "⚡ Inside PRZ Area"
              : status === "REVERSED"
              ? "🎯 PRZ Rejection Confirmed"
              : "📈 Approaching PRZ"}
          </div>
        </div>
      </div>

      {/* Pattern Banner & Concept Overview */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-slate-900/60 border border-purple-500/20 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-purple-300 font-mono flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Pola Terdeteksi: {patternName}
          </span>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {patternVariant}
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {narrative}
        </p>
      </div>

      {/* Geometrical XABCD Diagram & PRZ Visualizer */}
      <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" /> Geometri Struktur X-A-B-C-D & Fibonacci Retracements
          </span>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-amber-400">Titik D: Area Reversal (PRZ)</span>
            <span className="text-slate-500">•</span>
            <span className="text-purple-400">Target TP1/TP2/TP3</span>
          </div>
        </div>

        {/* SVG Visualization for XABCD Wings */}
        {points && (
          <div className="w-full h-56 relative bg-slate-950 rounded-lg p-2 border border-slate-900">
            {(() => {
              const pts = [points.X, points.A, points.B, points.C, points.D];
              const prices = pts.map((p) => p.price);
              const minP = Math.min(...prices, prz.lower, targets.tp3.price, targets.stopLoss.price) * 0.98;
              const maxP = Math.max(...prices, prz.upper, targets.stopLoss.price) * 1.02;
              const range = maxP - minP || 1;

              const W = 800;
              const H = 200;

              // Coordinate calculation
              const getX = (i: number) => 70 + i * 165;
              const getY = (p: number) => H - 25 - ((p - minP) / range) * (H - 50);

              const pX = { x: getX(0), y: getY(points.X.price), name: "X", price: points.X.price, date: points.X.date };
              const pA = { x: getX(1), y: getY(points.A.price), name: "A", price: points.A.price, date: points.A.date };
              const pB = { x: getX(2), y: getY(points.B.price), name: "B", price: points.B.price, date: points.B.date };
              const pC = { x: getX(3), y: getY(points.C.price), name: "C", price: points.C.price, date: points.C.date };
              const pD = { x: getX(4), y: getY(points.D.price), name: "D", price: points.D.price, date: points.D.date };

              const przTopY = getY(prz.upper);
              const przBottomY = getY(prz.lower);
              const tp1Y = getY(targets.tp1.price);
              const tp2Y = getY(targets.tp2.price);
              const tp3Y = getY(targets.tp3.price);
              const slY = getY(targets.stopLoss.price);

              return (
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full select-none">
                  <defs>
                    <linearGradient id="wingXAB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="wingBCD" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {/* PRZ Horizontal Shaded Zone */}
                  <rect
                    x={pC.x - 20}
                    y={Math.min(przTopY, przBottomY)}
                    width={W - pC.x + 20}
                    height={Math.max(16, Math.abs(przBottomY - przTopY))}
                    fill="#f59e0b"
                    fillOpacity="0.15"
                    stroke="#f59e0b"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={W - 10}
                    y={przTopY + 12}
                    textAnchor="end"
                    fill="#f59e0b"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    PRZ [{prz.lower} - {prz.upper}]
                  </text>

                  {/* Target Projection Lines */}
                  <line x1={pD.x} y1={tp1Y} x2={W - 20} y2={tp1Y} stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" />
                  <text x={W - 25} y={tp1Y - 4} textAnchor="end" fill="#10b981" fontSize="9" fontFamily="monospace">
                    TP1 (0.382): Rp {targets.tp1.price}
                  </text>

                  <line x1={pD.x} y1={tp2Y} x2={W - 20} y2={tp2Y} stroke="#10b981" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x={W - 25} y={tp2Y - 4} textAnchor="end" fill="#10b981" fontSize="9" fontFamily="monospace">
                    TP2 (0.618): Rp {targets.tp2.price}
                  </text>

                  <line x1={pD.x} y1={tp3Y} x2={W - 20} y2={tp3Y} stroke="#059669" strokeWidth="1.5" strokeDasharray="4 4" />
                  <text x={W - 25} y={tp3Y - 4} textAnchor="end" fill="#059669" fontSize="9" fontFamily="monospace">
                    TP3 (1.000): Rp {targets.tp3.price}
                  </text>

                  {/* Stop Loss Line */}
                  <line x1={pD.x} y1={slY} x2={W - 20} y2={slY} stroke="#f43f5e" strokeWidth="1" strokeDasharray="2 2" />
                  <text x={W - 25} y={slY - 4} textAnchor="end" fill="#f43f5e" fontSize="9" fontFamily="monospace">
                    SL Area: Rp {targets.stopLoss.price}
                  </text>

                  {/* Shaded Triangle Wings: XAB and BCD */}
                  <polygon
                    points={`${pX.x},${pX.y} ${pA.x},${pA.y} ${pB.x},${pB.y}`}
                    fill="url(#wingXAB)"
                    stroke="#8b5cf6"
                    strokeWidth="1.2"
                  />
                  <polygon
                    points={`${pB.x},${pB.y} ${pC.x},${pC.y} ${pD.x},${pD.y}`}
                    fill="url(#wingBCD)"
                    stroke="#ec4899"
                    strokeWidth="1.2"
                  />

                  {/* Direct Legs X-A, A-B, B-C, C-D */}
                  <line x1={pX.x} y1={pX.y} x2={pA.x} y2={pA.y} stroke="#a78bfa" strokeWidth="2.5" />
                  <line x1={pA.x} y1={pA.y} x2={pB.x} y2={pB.y} stroke="#c084fc" strokeWidth="2.5" />
                  <line x1={pB.x} y1={pB.y} x2={pC.x} y2={pC.y} stroke="#f472b6" strokeWidth="2.5" />
                  <line x1={pC.x} y1={pC.y} x2={pD.x} y2={pD.y} stroke="#fb7185" strokeWidth="2.5" />

                  {/* Fibonacci Ratio Labels on Legs */}
                  <text x={(pX.x + pB.x) / 2} y={(pX.y + pB.y) / 2 - 6} fill="#a78bfa" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    {ratios.AB_XA} XA
                  </text>
                  <text x={(pA.x + pC.x) / 2} y={(pA.y + pC.y) / 2 - 6} fill="#c084fc" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    {ratios.BC_AB} AB
                  </text>
                  <text x={(pB.x + pD.x) / 2} y={(pB.y + pD.y) / 2 - 8} fill="#f472b6" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    {ratios.CD_BC} BC
                  </text>
                  <text x={(pX.x + pD.x) / 2} y={Math.min(pX.y, pD.y) - 10} fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    XD: {ratios.XD_XA}
                  </text>

                  {/* Node Circles & Labels */}
                  {[pX, pA, pB, pC, pD].map((node) => (
                    <g key={node.name}>
                      <circle cx={node.x} cy={node.y} r="6" fill="#0f172a" stroke="#ffffff" strokeWidth="2.5" />
                      <circle cx={node.x} cy={node.y} r="3" fill={node.name === "D" ? "#f59e0b" : "#8b5cf6"} />
                      <text x={node.x} y={node.y > 100 ? node.y + 18 : node.y - 10} textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
                        {node.name}
                      </text>
                      <text x={node.x} y={node.y > 100 ? node.y + 28 : node.y - 20} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                        Rp {node.price.toLocaleString("id-ID")}
                      </text>
                    </g>
                  ))}
                </svg>
              );
            })()}
          </div>
        )}
      </div>

      {/* Target & PRZ Matrix Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* PRZ Zone Card */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
          <span className="text-[10px] text-amber-300 uppercase font-semibold block">
            PRZ Reversal Zone
          </span>
          <span className="text-base font-mono font-bold text-white block">
            Rp {prz.lower.toLocaleString("id-ID")} - {prz.upper.toLocaleString("id-ID")}
          </span>
          <span className="text-[10px] text-amber-400/90 font-mono block">
            Midpoint: Rp {prz.midpoint.toLocaleString("id-ID")}
          </span>
        </div>

        {/* Target 1 */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Target 1 (0.382)</span>
            {targets.tp1.isHit && (
              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded font-mono font-semibold">
                TERCAPAI
              </span>
            )}
          </div>
          <span className="text-base font-mono font-bold text-emerald-400 block">
            Rp {targets.tp1.price.toLocaleString("id-ID")}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block">
            Retracement 38.2% CD
          </span>
        </div>

        {/* Target 2 */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Target 2 (0.618)</span>
            {targets.tp2.isHit && (
              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded font-mono font-semibold">
                TERCAPAI
              </span>
            )}
          </div>
          <span className="text-base font-mono font-bold text-emerald-400 block">
            Rp {targets.tp2.price.toLocaleString("id-ID")}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block">
            Golden Ratio 61.8% CD
          </span>
        </div>

        {/* Target 3 / Extension */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Target 3 (1.000)</span>
            {targets.tp3.isHit && (
              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded font-mono font-semibold">
                TERCAPAI
              </span>
            )}
          </div>
          <span className="text-base font-mono font-bold text-emerald-400 block">
            Rp {targets.tp3.price.toLocaleString("id-ID")}
          </span>
          <span className="text-[10px] text-slate-500 font-mono block">
            Full 100% Retracement CD
          </span>
        </div>
      </div>

      {/* Educational Compliance Disclaimer */}
      <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">{educationalDisclaimer}</p>
      </div>
    </div>
  );
};
