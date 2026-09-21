"use client";

import React, { useState, useMemo, useRef } from "react";
import { CandlestickPoint } from "@/lib/quant/indicators";
import {
  TrendingUp,
  TrendingDown,
  Maximize2,
  Sliders,
  BarChart2,
  Eye,
  EyeOff,
  Activity,
} from "lucide-react";

interface CandlestickChartProps {
  series: CandlestickPoint[];
  symbol: string;
  companyName: string;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  series,
  symbol,
  companyName,
}) => {
  const [timeframe, setTimeframe] = useState<"30d" | "90d" | "all">("90d");
  const [chartType, setChartType] = useState<"candle" | "line">("candle");
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter series based on timeframe
  const filteredData = useMemo(() => {
    if (!series || series.length === 0) return [];
    if (timeframe === "30d") return series.slice(-30);
    if (timeframe === "90d") return series.slice(-60);
    return series;
  }, [series, timeframe]);

  // Calculations for scale
  const { minPrice, maxPrice, maxVolume, priceRange } = useMemo(() => {
    if (filteredData.length === 0) {
      return { minPrice: 0, maxPrice: 100, maxVolume: 100, priceRange: 100 };
    }

    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    filteredData.forEach((d) => {
      if (d.low < min) min = d.low;
      if (d.high > max) max = d.high;
      if (d.sma20 && d.sma20 < min) min = d.sma20;
      if (d.sma20 && d.sma20 > max) max = d.sma20;
      if (d.sma50 && d.sma50 < min) min = d.sma50;
      if (d.sma50 && d.sma50 > max) max = d.sma50;
      if (d.volume > maxVol) maxVol = d.volume;
    });

    // Add 4% padding
    const padding = (max - min) * 0.05 || 10;
    return {
      minPrice: Math.floor(min - padding),
      maxPrice: Math.ceil(max + padding),
      maxVolume: maxVol || 1,
      priceRange: max - min + padding * 2 || 1,
    };
  }, [filteredData]);

  // Selected item (either hovered or the latest item)
  const activeItem = useMemo(() => {
    if (hoveredIndex !== null && filteredData[hoveredIndex]) {
      return filteredData[hoveredIndex];
    }
    return filteredData[filteredData.length - 1] || null;
  }, [hoveredIndex, filteredData]);

  if (filteredData.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
        Data historis teknikal tidak tersedia untuk grafik candlestick.
      </div>
    );
  }

  // Dimensions
  const svgWidth = 900;
  const svgHeight = showVolume ? 360 : 280;
  const priceHeight = showVolume ? 250 : 250;
  const volumeHeight = 70;
  const volumeTop = 270;
  const rightAxisWidth = 65;
  const chartWidth = svgWidth - rightAxisWidth;

  const getX = (index: number) => {
    if (filteredData.length <= 1) return chartWidth / 2;
    return (index / (filteredData.length - 1)) * (chartWidth - 20) + 10;
  };

  const getY = (price: number) => {
    return priceHeight - ((price - minPrice) / priceRange) * priceHeight + 10;
  };

  const getVolY = (vol: number) => {
    const barH = (vol / maxVolume) * volumeHeight;
    return svgHeight - barH - 10;
  };

  const candleWidth = Math.max(
    3,
    Math.min(14, (chartWidth / filteredData.length) * 0.65)
  );

  // Path data for SMA20
  let isFirstSMA20 = true;
  const sma20Path = filteredData
    .map((d, i) => {
      if (d.sma20 === undefined || d.sma20 === null) return "";
      const cmd = isFirstSMA20 ? "M" : "L";
      isFirstSMA20 = false;
      return `${cmd} ${getX(i)} ${getY(d.sma20)}`;
    })
    .filter(Boolean)
    .join(" ");

  // Path data for SMA50
  let isFirstSMA50 = true;
  const sma50Path = filteredData
    .map((d, i) => {
      if (d.sma50 === undefined || d.sma50 === null) return "";
      const cmd = isFirstSMA50 ? "M" : "L";
      isFirstSMA50 = false;
      return `${cmd} ${getX(i)} ${getY(d.sma50)}`;
    })
    .filter(Boolean)
    .join(" ");

  // Path data for Line chart mode
  const linePath = filteredData
    .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.close)}`)
    .join(" ");

  // Price axis labels (5 steps)
  const yLabels = Array.from({ length: 5 }).map((_, i) => {
    const val = minPrice + (priceRange / 4) * (4 - i);
    return {
      price: Math.round(val),
      y: getY(val),
    };
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = svgWidth / rect.width;
    const svgX = clientX * scaleX;

    // Find nearest data index
    let closestIdx = 0;
    let minDiff = Infinity;
    filteredData.forEach((_, idx) => {
      const diff = Math.abs(getX(idx) - svgX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setHoveredIndex(closestIdx);
  };

  return (
    <div
      ref={containerRef}
      className="bg-[#090d16] rounded-2xl border border-slate-800 p-4 md:p-5 shadow-2xl space-y-4"
    >
      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs font-mono">
            {symbol}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Interactive Candlestick Terminal</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {filteredData.length} Hari Bursa
              </span>
            </div>
            <span className="text-xs text-slate-400">{companyName}</span>
          </div>
        </div>

        {/* Controls: Timeframe & Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type Toggle */}
          <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setChartType("candle")}
              className={`px-2.5 py-1 rounded font-medium transition ${
                chartType === "candle"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Candle
            </button>
            <button
              onClick={() => setChartType("line")}
              className={`px-2.5 py-1 rounded font-medium transition ${
                chartType === "line"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Line
            </button>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setTimeframe("30d")}
              className={`px-2 py-1 rounded font-medium transition ${
                timeframe === "30d"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              1B
            </button>
            <button
              onClick={() => setTimeframe("90d")}
              className={`px-2 py-1 rounded font-medium transition ${
                timeframe === "90d"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              3B
            </button>
            <button
              onClick={() => setTimeframe("all")}
              className={`px-2 py-1 rounded font-medium transition ${
                timeframe === "all"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Semua
            </button>
          </div>

          {/* Indicator toggles */}
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setShowSMA20(!showSMA20)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono transition ${
                showSMA20 ? "text-amber-400 font-bold bg-amber-500/10" : "text-slate-500"
              }`}
              title="Toggle SMA 20"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              SMA20
            </button>
            <button
              onClick={() => setShowSMA50(!showSMA50)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono transition ${
                showSMA50 ? "text-indigo-400 font-bold bg-indigo-500/10" : "text-slate-500"
              }`}
              title="Toggle SMA 50"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              SMA50
            </button>
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono transition ${
                showVolume ? "text-blue-400 font-bold bg-blue-500/10" : "text-slate-500"
              }`}
              title="Toggle Volume Pane"
            >
              <BarChart2 className="w-3 h-3" />
              Vol
            </button>
          </div>
        </div>
      </div>

      {/* Live Active Bar OHLCV Inspection Header */}
      {activeItem && (
        <div className="bg-slate-950/80 rounded-xl px-3.5 py-2 border border-slate-800/80 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-500">Tgl:</span>
            <span className="text-white font-semibold">{activeItem.date}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div>
              <span className="text-slate-500 mr-1">O:</span>
              <span className="text-slate-200">Rp {activeItem.open.toLocaleString("id-ID")}</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">H:</span>
              <span className="text-emerald-400">Rp {activeItem.high.toLocaleString("id-ID")}</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">L:</span>
              <span className="text-rose-400">Rp {activeItem.low.toLocaleString("id-ID")}</span>
            </div>
            <div>
              <span className="text-slate-500 mr-1">C:</span>
              <span
                className={`font-bold ${
                  activeItem.isBullish ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                Rp {activeItem.close.toLocaleString("id-ID")}
              </span>
            </div>
            <div
              className={`flex items-center gap-0.5 font-bold ${
                activeItem.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {activeItem.changePct >= 0 ? "+" : ""}
              {activeItem.changePct}%
            </div>
            <div>
              <span className="text-slate-500 mr-1">Vol:</span>
              <span className="text-slate-300 font-mono">
                {(activeItem.volume / 1e6).toFixed(2)}M Lot
              </span>
            </div>
            {activeItem.sma20 && showSMA20 && (
              <div className="text-amber-400 hidden sm:inline">
                <span className="text-slate-500 mr-1">SMA20:</span>
                Rp {activeItem.sma20.toLocaleString("id-ID")}
              </div>
            )}
            {activeItem.sma50 && showSMA50 && (
              <div className="text-indigo-400 hidden md:inline">
                <span className="text-slate-500 mr-1">SMA50:</span>
                Rp {activeItem.sma50.toLocaleString("id-ID")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SVG Canvas Area */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Grid pattern */}
            <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background & Grid Lines */}
          <rect width={chartWidth} height={svgHeight} fill="#060911" rx="8" />

          {/* Horizontal Grid lines & Price Labels */}
          {yLabels.map((lbl, idx) => (
            <g key={idx}>
              <line
                x1={0}
                y1={lbl.y}
                x2={chartWidth}
                y2={lbl.y}
                stroke="#1e293b"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={chartWidth + 8}
                y={lbl.y + 4}
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                Rp {lbl.price.toLocaleString("id-ID")}
              </text>
            </g>
          ))}

          {/* Volume separator line */}
          {showVolume && (
            <line
              x1={0}
              y1={volumeTop - 15}
              x2={chartWidth}
              y2={volumeTop - 15}
              stroke="#1e293b"
              strokeWidth="1"
            />
          )}

          {/* Volume Bars */}
          {showVolume &&
            filteredData.map((d, i) => {
              const x = getX(i);
              const barH = (d.volume / maxVolume) * volumeHeight;
              const y = svgHeight - barH - 8;
              const color = d.isBullish ? "#10b981" : "#f43f5e";
              return (
                <rect
                  key={`vol_${i}`}
                  x={x - candleWidth / 2}
                  y={y}
                  width={candleWidth}
                  height={barH}
                  fill={color}
                  opacity={hoveredIndex === i ? 0.9 : 0.4}
                  rx="1"
                />
              );
            })}

          {/* Line Mode Area */}
          {chartType === "line" && (
            <>
              <path
                d={`${linePath} L ${getX(filteredData.length - 1)} ${priceHeight + 10} L ${getX(
                  0
                )} ${priceHeight + 10} Z`}
                fill="url(#areaGlow)"
              />
              <path
                d={linePath}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Candlestick Rendering */}
          {chartType === "candle" &&
            filteredData.map((d, i) => {
              const x = getX(i);
              const isBull = d.isBullish;
              const candleColor = isBull ? "#10b981" : "#f43f5e";

              const yOpen = getY(d.open);
              const yClose = getY(d.close);
              const yHigh = getY(d.high);
              const yLow = getY(d.low);

              const bodyTop = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

              const isHovered = hoveredIndex === i;

              return (
                <g key={`candle_${i}`} opacity={hoveredIndex === null || isHovered ? 1 : 0.65}>
                  {/* Upper and Lower Wick */}
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={candleColor}
                    strokeWidth={isHovered ? "2" : "1.2"}
                  />

                  {/* Candle Body */}
                  <rect
                    x={x - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    fill={isBull ? "#10b981" : "#f43f5e"}
                    stroke={candleColor}
                    strokeWidth="1"
                    rx="1"
                  />
                </g>
              );
            })}

          {/* Overlay: SMA20 Line */}
          {showSMA20 && sma20Path && (
            <path
              d={sma20Path}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Overlay: SMA50 Line */}
          {showSMA50 && sma50Path && (
            <path
              d={sma50Path}
              fill="none"
              stroke="#818cf8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Hover Crosshair */}
          {hoveredIndex !== null && filteredData[hoveredIndex] && (
            <g>
              {/* Vertical crosshair */}
              <line
                x1={getX(hoveredIndex)}
                y1={0}
                x2={getX(hoveredIndex)}
                y2={svgHeight}
                stroke="#64748b"
                strokeDasharray="4 4"
                strokeWidth="1"
              />

              {/* Horizontal crosshair at hovered close */}
              <line
                x1={0}
                y1={getY(filteredData[hoveredIndex].close)}
                x2={chartWidth}
                y2={getY(filteredData[hoveredIndex].close)}
                stroke="#64748b"
                strokeDasharray="4 4"
                strokeWidth="1"
              />

              {/* Right Axis Price Pill */}
              <rect
                x={chartWidth}
                y={getY(filteredData[hoveredIndex].close) - 10}
                width={rightAxisWidth}
                height={20}
                fill="#1e293b"
                rx="4"
              />
              <text
                x={chartWidth + 6}
                y={getY(filteredData[hoveredIndex].close) + 4}
                fill="#ffffff"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Rp {filteredData[hoveredIndex].close.toLocaleString("id-ID")}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Footer Meta & Date Milestones */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
        <span>Awal: {filteredData[0]?.date}</span>
        <span className="hidden sm:inline text-slate-400">
          Crosshair aktif • Sorot candle untuk melihat rincian OHLC
        </span>
        <span>Akhir: {filteredData[filteredData.length - 1]?.date}</span>
      </div>
    </div>
  );
};
