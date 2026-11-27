import { randomUUID } from "crypto";
import type Redis from "ioredis";
import {
  fetchChartData,
  idxMarketState,
  readChartCache,
  writeChartCache,
} from "@/lib/chart/data";
import { getRedisReady } from "@/lib/storage/redis";
import type {
  ChartFrame,
  ChartPayload,
  ChartTimeframe,
} from "@/lib/chart/types";

export type { ChartFrame } from "@/lib/chart/types";

type Listener = (frame: ChartFrame) => void;

interface ChartHub {
  origin: string;
  listeners: Map<string, Set<Listener>>;
  latest: Map<string, ChartFrame>;
  inFlight: Map<string, Promise<ChartFrame | null>>;
  lastRefresh: Map<string, number>;
  timer: NodeJS.Timeout | null;
  subscriber: Redis | null;
  subscriberPending: boolean;
}

const globalForChart = globalThis as typeof globalThis & {
  __telaahChartHub?: ChartHub;
};

const hub: ChartHub =
  globalForChart.__telaahChartHub ??
  (globalForChart.__telaahChartHub = {
    origin: randomUUID(),
    listeners: new Map(),
    latest: new Map(),
    inFlight: new Map(),
    lastRefresh: new Map(),
    timer: null,
    subscriber: null,
    subscriberPending: false,
  });

const CHANNEL = "telaah:chart:live";
const REFRESH_MS = Math.max(
  2_000,
  Number(process.env.CHART_STREAM_REFRESH_MS) || 5_000
);
const BURST_MS = 30_000;
const REFRESH_MS_BY_TIMEFRAME: Record<ChartTimeframe, number> = {
  "1D": REFRESH_MS,
  "1W": 15_000,
  "1Y": 60_000,
  "5Y": 5 * 60_000,
};

function refreshIntervalFor(timeframe: ChartTimeframe): number {
  if (idxMarketState().label === "Istirahat") return BURST_MS;
  return REFRESH_MS_BY_TIMEFRAME[timeframe] ?? REFRESH_MS;
}

function timeframeFromKey(key: string): ChartTimeframe {
  return key.split(":")[1] as ChartTimeframe;
}

function keyOf(symbol: string, timeframe: ChartTimeframe): string {
  return `${symbol}:${timeframe}`;
}

function frameFor(payload: ChartPayload): ChartFrame {
  const state = idxMarketState();
  return {
    ...payload,
    marketOpen: state.open,
    marketLabel: state.label,
  };
}

function dispatch(frame: ChartFrame): void {
  hub.latest.set(keyOf(frame.symbol, frame.timeframe), frame);
  const listeners = hub.listeners.get(keyOf(frame.symbol, frame.timeframe));
  if (!listeners) return;
  for (const listener of listeners) {
    try {
      listener(frame);
    } catch {
      // One broken SSE client must not stop the other listeners.
    }
  }
}

async function publish(frame: ChartFrame): Promise<void> {
  dispatch(frame);
  const client = await getRedisReady();
  if (!client) return;
  try {
    await client.publish(
      CHANNEL,
      JSON.stringify({ origin: hub.origin, frame })
    );
  } catch {
    // Local listeners already received the frame.
  }
}

async function ensureSubscriber(): Promise<void> {
  if (hub.subscriber || hub.subscriberPending) return;
  hub.subscriberPending = true;
  try {
    const base = await getRedisReady(1_500);
    if (!base) return;
    const subscriber = base.duplicate({ lazyConnect: true });
    subscriber.on("error", () => {
      // The local hub keeps serving this process while Redis recovers.
    });
    await subscriber.connect();
    await subscriber.subscribe(CHANNEL);
    subscriber.on("message", (_channel, message) => {
      try {
        const parsed = JSON.parse(message) as {
          origin?: string;
          frame?: ChartFrame;
        };
        if (!parsed.frame || parsed.origin === hub.origin) return;
        dispatch(parsed.frame);
      } catch {
        // Ignore malformed frames from another writer.
      }
    });
    hub.subscriber = subscriber;
  } catch {
    // Without Redis, SSE still works in this single app process.
  } finally {
    hub.subscriberPending = false;
  }
}

async function refreshChart(
  symbol: string,
  timeframe: ChartTimeframe
): Promise<ChartFrame | null> {
  const key = keyOf(symbol, timeframe);
  const running = hub.inFlight.get(key);
  if (running) return running;

  const task = (async () => {
    hub.lastRefresh.set(key, Date.now());
    const payload = await fetchChartData(symbol, timeframe);
    if (!payload) return null;
    await writeChartCache(payload);
    const frame = frameFor(payload);
    await publish(frame);
    return frame;
  })()
    .catch(() => null)
    .finally(() => {
      hub.inFlight.delete(key);
    });

  hub.inFlight.set(key, task);
  return task;
}

function shouldRefresh(key: string, now: number): boolean {
  const last = hub.lastRefresh.get(key) ?? 0;
  return now - last >= refreshIntervalFor(timeframeFromKey(key));
}

function stopLoop(): void {
  if (hub.timer) {
    clearInterval(hub.timer);
    hub.timer = null;
  }
}

function ensureLoop(): void {
  if (hub.timer) return;
  hub.timer = setInterval(() => {
    if (hub.listeners.size === 0) {
      stopLoop();
      return;
    }
    if (!idxMarketState().open) return;
    const now = Date.now();
    for (const key of hub.listeners.keys()) {
      if (!shouldRefresh(key, now)) continue;
      const [symbol, timeframe] = key.split(":") as [string, ChartTimeframe];
      void refreshChart(symbol, timeframe);
    }
  }, REFRESH_MS);
}

export async function getChartSnapshot(
  symbol: string,
  timeframe: ChartTimeframe
): Promise<ChartFrame | null> {
  const key = keyOf(symbol, timeframe);
  const fresh = hub.latest.get(key);
  if (fresh && shouldRefresh(key, Date.now()) === false) {
    return fresh;
  }

  const cached = await readChartCache(symbol, timeframe);
  if (cached) {
    const cachedAt = Date.parse(cached.fetchedAt);
    const interval = refreshIntervalFor(timeframe);
    if (Number.isFinite(cachedAt) && Date.now() - cachedAt < interval) {
      const frame = frameFor(cached);
      hub.latest.set(key, frame);
      hub.lastRefresh.set(key, cachedAt);
      return frame;
    }
    hub.latest.set(key, frameFor(cached));
  }

  const refreshed = await refreshChart(symbol, timeframe);
  if (refreshed) return refreshed;
  return hub.latest.get(key) ?? null;
}

export function subscribeChart(
  symbol: string,
  timeframe: ChartTimeframe,
  listener: Listener,
  options: { replay?: boolean } = {}
): () => void {
  const key = keyOf(symbol, timeframe);
  const listeners = hub.listeners.get(key) ?? new Set<Listener>();
  listeners.add(listener);
  hub.listeners.set(key, listeners);

  void ensureSubscriber();
  ensureLoop();

  if (options.replay !== false) {
    const latest = hub.latest.get(key);
    if (latest) listener(latest);
  }

  return () => {
    const current = hub.listeners.get(key);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      hub.listeners.delete(key);
    }
    if (hub.listeners.size === 0) stopLoop();
  };
}

export function activeChartStreams(): number {
  return hub.listeners.size;
}
