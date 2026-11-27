"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChartFrame, ChartTimeframe } from "@/lib/chart/types";

export type ChartStreamStatus =
  | "connecting"
  | "live"
  | "reconnecting"
  | "offline";

interface UseChartStreamResult {
  frame: ChartFrame | null;
  status: ChartStreamStatus;
  error: string | null;
  reconnect: () => void;
}

export function useChartStream(
  symbol: string,
  timeframe: ChartTimeframe,
  enabled: boolean
): UseChartStreamResult {
  const [frame, setFrame] = useState<ChartFrame | null>(null);
  const [status, setStatus] = useState<ChartStreamStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const reconnect = useCallback(() => {
    setError(null);
    setStatus("connecting");
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    setFrame(null);
    setError(null);
    setStatus("connecting");
  }, [symbol, timeframe]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let source: EventSource | null = null;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const close = () => {
      source?.close();
      source = null;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const handleFrame = (event: MessageEvent<string>) => {
      try {
        const next = JSON.parse(event.data) as ChartFrame;
        if (cancelled) return;
        setFrame(next);
        setStatus("live");
        setError(null);
      } catch {
        // Ignore a malformed frame; the next one is usually fine.
      }
    };

    const connect = () => {
      if (cancelled) return;
      close();
      setStatus(retry === 0 ? "connecting" : "reconnecting");

      source = new EventSource(
        `/api/chart/stream?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`
      );
      source.onopen = () => {
        if (cancelled) return;
        retry = 0;
        setStatus("live");
      };
      source.addEventListener("snapshot", handleFrame as EventListener);
      source.addEventListener("candles", handleFrame as EventListener);
      source.addEventListener("error", (event) => {
        if (cancelled) return;
        const message = (event as MessageEvent<string>).data;
        if (message) {
          try {
            const parsed = JSON.parse(message) as { message?: string };
            setError(parsed.message || "Stream chart terputus.");
          } catch {
            setError("Stream chart terputus.");
          }
          setStatus("offline");
          close();
          return;
        }

        close();
        retry += 1;
        if (retry > 6) {
          setStatus("offline");
          setError("Tidak bisa menyambung ke stream chart. Coba lagi.");
          return;
        }
        setStatus("reconnecting");
        timer = setTimeout(connect, Math.min(15_000, 1000 * 2 ** retry));
      });
    };

    connect();

    return () => {
      cancelled = true;
      close();
    };
  }, [symbol, timeframe, enabled, attempt]);

  return { frame, status, error, reconnect };
}
