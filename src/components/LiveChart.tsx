"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ColorType,
  CrosshairMode,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  LineStyle,
  type SeriesMarker,
  TickMarkType,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { ChartCandle } from "@/lib/market/scraper-client";
import type { CorporateActionItem } from "@/lib/sectors/types";
import type { HarmonicMatch } from "@/lib/quant/harmonic";
import { PrzBandPrimitive } from "@/components/chart/prz-band";

interface LiveChartProps {
  candles: ChartCandle[];
  intraday: boolean;
  dataKey: string;
  harmonic?: HarmonicMatch | null;
  compareCandles?: ChartCandle[];
  compareSymbol?: string | null;
  corporateActions?: CorporateActionItem[];
  height?: number;
}

function chartTime(candle: ChartCandle, intraday: boolean): Time {
  // lightweight-charts renders UTCTimestamp in UTC. Shift WIB bars so the
  // axis reads 09:00–16:00 instead of 02:00–09:00.
  if (intraday) return (candle.time + 7 * 3600) as UTCTimestamp;
  return candle.date ?? new Date(candle.time * 1000).toISOString().slice(0, 10);
}

function timeValue(time: Time): number {
  return typeof time === "number"
    ? time
    : Date.parse(`${time}T00:00:00Z`) / 1000;
}

function formatAxisTime(time: Time, tickMarkType?: TickMarkType): string {
  if (typeof time === "number") {
    const date = new Date(time * 1000);
    if (
      tickMarkType === TickMarkType.DayOfMonth ||
      tickMarkType === TickMarkType.Month ||
      tickMarkType === TickMarkType.Year
    ) {
      return date.toLocaleDateString("id-ID", {
        day: tickMarkType === TickMarkType.Year ? undefined : "2-digit",
        month: "short",
        year: tickMarkType === TickMarkType.Year ? "numeric" : undefined,
        timeZone: "UTC",
      });
    }
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  }
  const date = new Date(`${String(time)}T00:00:00Z`);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function legendTime(candle: ChartCandle, intraday: boolean): string {
  if (!intraday) {
    return (
      candle.date ??
      new Date(candle.time * 1000).toLocaleDateString("id-ID")
    );
  }
  return new Date((candle.time + 7 * 3600) * 1000).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function volumeLabel(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString("id-ID");
}

export const LiveChart: React.FC<LiveChartProps> = ({
  candles,
  intraday,
  dataKey,
  harmonic = null,
  compareCandles,
  compareSymbol = null,
  corporateActions = [],
  height = 460,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const dataKeyRef = useRef<string>("");
  const firstTimeRef = useRef<string>("");
  const lastTimeRef = useRef<string>("");
  const candlesRef = useRef<ChartCandle[]>(candles);
  const harmonicSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const harmonicLinesRef = useRef<IPriceLine[]>([]);
  const harmonicBandRef = useRef<PrzBandPrimitive | null>(null);
  const compareSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const harmonicMarkersRef = useRef<SeriesMarker<Time>[]>([]);
  const corporateMarkersRef = useRef<SeriesMarker<Time>[]>([]);
  const [hovered, setHovered] = useState<ChartCandle | null>(null);
  const [isDark, setIsDark] = useState(true);

  const syncMarkers = useCallback(() => {
    const series = candleRef.current;
    if (!series) return;
    const markers = [
      ...harmonicMarkersRef.current,
      ...corporateMarkersRef.current,
    ].sort((left, right) => timeValue(left.time) - timeValue(right.time));
    series.setMarkers(markers);
  }, []);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const dark = document.documentElement.classList.contains("dark");
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientWidth < 640 ? Math.min(height, 340) : height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: dark ? "#8B95A7" : "#64748b",
        fontFamily: "Poppins, ui-sans-serif, system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: {
          color: dark
            ? "rgba(148, 163, 184, 0.08)"
            : "rgba(100, 116, 139, 0.14)",
        },
        horzLines: {
          color: dark
            ? "rgba(148, 163, 184, 0.08)"
            : "rgba(100, 116, 139, 0.14)",
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(148, 163, 184, 0.4)", width: 1 },
        horzLine: { color: "rgba(148, 163, 184, 0.4)", width: 1 },
      },
      rightPriceScale: {
        borderColor: dark
          ? "rgba(148, 163, 184, 0.2)"
          : "rgba(100, 116, 139, 0.25)",
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: dark
          ? "rgba(148, 163, 184, 0.2)"
          : "rgba(100, 116, 139, 0.25)",
        timeVisible: intraday,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 8,
        tickMarkFormatter: (time: Time, tickMarkType: TickMarkType) =>
          formatAxisTime(time, tickMarkType),
      },
      localization: {
        locale: "id-ID",
        priceFormatter: (price: number) =>
          price.toLocaleString("id-ID", { maximumFractionDigits: 0 }),
        timeFormatter: (time: Time) => formatAxisTime(time),
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
      priceFormat: { type: "price", precision: 0, minMove: 1 },
      priceLineColor: "#10b981",
      priceLineStyle: 2,
    });
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.84, bottom: 0 },
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setHovered(null);
        return;
      }
      const found = candlesRef.current.find(
        (candle) => chartTime(candle, intraday) === param.time
      );
      setHovered(found ?? null);
    });

    const observer = new ResizeObserver(() => {
      const width = container.clientWidth;
      chart.applyOptions({
        width,
        height: width < 640 ? Math.min(height, 340) : height,
      });
    });
    observer.observe(container);

    chartRef.current = chart;
    candleRef.current = candleSeries;
    volumeRef.current = volumeSeries;
    dataKeyRef.current = "";
    firstTimeRef.current = "";
    lastTimeRef.current = "";

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      harmonicSeriesRef.current = null;
      harmonicLinesRef.current = [];
      harmonicBandRef.current = null;
      compareSeriesRef.current = null;
      harmonicMarkersRef.current = [];
      corporateMarkersRef.current = [];
    };
  }, [height, intraday]);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleRef.current;
    if (!chart || !candleSeries) return;

    harmonicMarkersRef.current = [];
    syncMarkers();
    if (harmonicSeriesRef.current) {
      try {
        chart.removeSeries(harmonicSeriesRef.current);
      } catch {
        // Chart was already recreated.
      }
      harmonicSeriesRef.current = null;
    }
    for (const line of harmonicLinesRef.current) {
      try {
        candleSeries.removePriceLine(line);
      } catch {
        // Chart was already recreated.
      }
    }
    harmonicLinesRef.current = [];

    if (harmonicBandRef.current) {
      try {
        candleSeries.detachPrimitive(harmonicBandRef.current);
      } catch {
        // Chart was already recreated.
      }
      harmonicBandRef.current = null;
    }

    if (!harmonic?.pivotPrices) return;

    const sourceCandles = candlesRef.current;
    const dates = [
      harmonic.pivotDates.x,
      harmonic.pivotDates.a,
      harmonic.pivotDates.b,
      harmonic.pivotDates.c,
      harmonic.pivotDates.d,
    ];
    const values = [
      harmonic.pivotPrices.x,
      harmonic.pivotPrices.a,
      harmonic.pivotPrices.b,
      harmonic.pivotPrices.c,
      harmonic.pivotPrices.d,
    ];
    const points: Array<{ time: Time; value: number }> = [];
    const markers: SeriesMarker<Time>[] = [];
    const labels = ["X", "A", "B", "C", "D"];
    const bullish = harmonic.direction === "bullish";

    dates.forEach((date, index) => {
      let best: ChartCandle | null = null;
      let bestDiff = Number.POSITIVE_INFINITY;
      for (const candle of sourceCandles) {
        if (!candle.date) continue;
        const diff = Math.abs(Date.parse(candle.date) - Date.parse(date));
        if (diff < bestDiff) {
          best = candle;
          bestDiff = diff;
        }
      }
      if (!best) return;
      const time = chartTime(best, intraday);
      if (points.some((point) => point.time === time)) return;
      points.push({ time, value: values[index] });
      markers.push({
        time,
        position:
          (index % 2 === 0 ? bullish : !bullish) ? "belowBar" : "aboveBar",
        color: bullish ? "#10b981" : "#f43f5e",
        shape: "circle",
        text: labels[index],
      });
    });

    if (points.length >= 2) {
      const line = chart.addLineSeries({
        color: bullish ? "#34d399" : "#fb7185",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      line.setData(points);
      harmonicSeriesRef.current = line;
    }
    harmonicMarkersRef.current = markers;
    syncMarkers();

    const lines: IPriceLine[] = [];
    const addLine = (price: number, color: string, title: string, style = LineStyle.Dashed) => {
      if (!Number.isFinite(price) || price <= 0) return;
      lines.push(
        candleSeries.createPriceLine({
          price,
          color,
          lineWidth: 1,
          lineStyle: style,
          axisLabelVisible: true,
          title,
        })
      );
    };
    addLine(harmonic.invalidation, "#ef4444", "Invalidasi");
    addLine(harmonic.targets.t1, "#60a5fa", "T1", LineStyle.Dotted);
    addLine(harmonic.targets.t2, "#60a5fa", "T2", LineStyle.Dotted);

    const band = new PrzBandPrimitive(
      harmonic.prz.low,
      harmonic.prz.high,
      bullish ? "rgba(16, 185, 129, 0.16)" : "rgba(244, 63, 94, 0.16)"
    );
    candleSeries.attachPrimitive(band);
    harmonicBandRef.current = band;

    harmonicLinesRef.current = lines;

    return () => {
      for (const line of lines) {
        try {
          candleSeries.removePriceLine(line);
        } catch {
          // Chart was already recreated.
        }
      }
      if (harmonicBandRef.current) {
        try {
          candleSeries.detachPrimitive(harmonicBandRef.current);
        } catch {
          // Chart was already recreated.
        }
        harmonicBandRef.current = null;
      }
      if (harmonicSeriesRef.current) {
        try {
          chart.removeSeries(harmonicSeriesRef.current);
        } catch {
          // Chart was already recreated.
        }
        harmonicSeriesRef.current = null;
      }
      harmonicMarkersRef.current = [];
    syncMarkers();
    };
  }, [harmonic, intraday, dataKey, candles.length, syncMarkers]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (!compareSymbol || !compareCandles || compareCandles.length === 0) {
      if (compareSeriesRef.current) {
        try {
          chart.removeSeries(compareSeriesRef.current);
        } catch {
          // Chart was already recreated.
        }
        compareSeriesRef.current = null;
      }
      chart.priceScale("left").applyOptions({ visible: false });
      return;
    }
    let series = compareSeriesRef.current;
    if (!series) {
      series = chart.addLineSeries({
        color: "#f59e0b",
        lineWidth: 2,
        priceScaleId: "left",
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: false,
        title: compareSymbol,
      });
      compareSeriesRef.current = series;
      chart.priceScale("left").applyOptions({
        visible: true,
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.28 },
      });
    }
    const seen = new Set<string>();
    const data = compareCandles
      .map((candle) => ({
        time: chartTime(candle, intraday),
        value: candle.close,
      }))
      .filter((point) => {
        const key = String(point.time);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => timeValue(left.time) - timeValue(right.time));
    series.applyOptions({ title: compareSymbol });
    series.setData(data);
  }, [compareSymbol, compareCandles, intraday, dataKey]);

  useEffect(() => {
    const candleSeries = candleRef.current;
    if (!candleSeries) return;
    if (!corporateActions.length) {
      corporateMarkersRef.current = [];
      syncMarkers();
      return;
    }
    const source = candlesRef.current;
    const byDate = new Map<string, ChartCandle>();
    for (const candle of source) {
      if (candle.date) byDate.set(candle.date, candle);
    }
    const sortedDates = [...byDate.keys()].sort();
    const markers: SeriesMarker<Time>[] = [];
    const seen = new Set<string>();
    for (const action of corporateActions) {
      const actionDate = action.ex_date ?? action.date;
      if (!actionDate) continue;
      let candle = byDate.get(actionDate);
      if (!candle) {
        const next = sortedDates.find((date) => date >= actionDate);
        if (next) candle = byDate.get(next);
      }
      if (!candle) continue;
      const isDividend = /dividen|dividend/i.test(
        `${action.action_type ?? ""} ${action.description ?? ""}`
      );
      const key = `${candle.date}:${isDividend ? "D" : "S"}`;
      if (seen.has(key)) continue;
      seen.add(key);
      markers.push({
        time: chartTime(candle, intraday),
        position: "belowBar",
        color: isDividend ? "#f59e0b" : "#a78bfa",
        shape: "square",
        text: isDividend ? "D" : "S",
      });
    }
    corporateMarkersRef.current = markers;
    syncMarkers();
  }, [corporateActions, intraday, dataKey, syncMarkers]);

  useEffect(() => {
    if (!candleRef.current || !volumeRef.current || candles.length === 0) return;

    const candleData: CandlestickData[] = candles.map((candle) => ({
      time: chartTime(candle, intraday),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
    const volumeData: HistogramData[] = candles.map((candle) => ({
      time: chartTime(candle, intraday),
      value: candle.volume,
      color:
        candle.close >= candle.open
          ? "rgba(16, 185, 129, 0.32)"
          : "rgba(244, 63, 94, 0.32)",
    }));

    const nextFirst = String(candleData[0].time);
    const nextLast = String(candleData[candleData.length - 1].time);
    const sameSeries =
      dataKeyRef.current === dataKey && firstTimeRef.current === nextFirst;

    if (!sameSeries) {
      candleRef.current.setData(candleData);
      volumeRef.current.setData(volumeData);
      chartRef.current?.timeScale().fitContent();
      dataKeyRef.current = dataKey;
      firstTimeRef.current = nextFirst;
      lastTimeRef.current = nextLast;
      return;
    }

    if (lastTimeRef.current === nextLast) {
      candleRef.current.update(candleData[candleData.length - 1]);
      volumeRef.current.update(volumeData[volumeData.length - 1]);
      return;
    }

    // A new bar arrived. Update only the bars the stream added so the user's
    // zoom and scroll position stay where they were.
    const previousLast = lastTimeRef.current;
    const start = candleData.findIndex(
      (candle) => String(candle.time) === previousLast
    );
    for (let index = Math.max(0, start); index < candleData.length; index += 1) {
      candleRef.current.update(candleData[index]);
      volumeRef.current.update(volumeData[index]);
    }
    lastTimeRef.current = nextLast;
  }, [candles, intraday, dataKey]);

  useEffect(() => {
    chartRef.current?.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#8B95A7" : "#64748b",
      },
      grid: {
        vertLines: {
          color: isDark
            ? "rgba(148, 163, 184, 0.08)"
            : "rgba(100, 116, 139, 0.14)",
        },
        horzLines: {
          color: isDark
            ? "rgba(148, 163, 184, 0.08)"
            : "rgba(100, 116, 139, 0.14)",
        },
      },
    });
  }, [isDark]);

  const current = hovered ?? candles[candles.length - 1];

  return (
    <div className="w-full">
      {current && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-[10px] font-mono text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400">
          <span className="text-slate-400 dark:text-slate-500">
            {legendTime(current, intraday)}
          </span>
          <span>
            O{" "}
            <b className="text-zinc-900 dark:text-slate-100">
              {current.open.toLocaleString("id-ID")}
            </b>
          </span>
          <span>
            H{" "}
            <b className="text-emerald-600 dark:text-emerald-400">
              {current.high.toLocaleString("id-ID")}
            </b>
          </span>
          <span>
            L{" "}
            <b className="text-rose-600 dark:text-rose-400">
              {current.low.toLocaleString("id-ID")}
            </b>
          </span>
          <span>
            C{" "}
            <b className="text-zinc-900 dark:text-slate-100">
              {current.close.toLocaleString("id-ID")}
            </b>
          </span>
          <span>
            Vol{" "}
            <b className="text-zinc-900 dark:text-slate-100">
              {volumeLabel(current.volume)}
            </b>
          </span>
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  );
};
