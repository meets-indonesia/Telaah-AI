import { ScraperClient } from "@/lib/market/scraper-client";
import {
  loadTelegramConfig,
} from "@/lib/telegram/config";
import { createTelegramClient } from "@/lib/telegram/client";
import type { DailyTransaction, ForeignFlowResponse } from "@/lib/sectors/types";
import { getRedisReady } from "@/lib/storage/redis";
import { evaluateAlerts, type AlertSignal } from "@/lib/alerts/evaluate";
import {
  alertWatchlistPath,
  loadAlertWatchlist,
} from "@/lib/alerts/store";

export interface AlertDataSource {
  getDailyTransactions(
    symbol: string,
    startDate?: string
  ): Promise<DailyTransaction[] | null>;
  getForeignFlow(
    symbol: string,
    length?: number
  ): Promise<ForeignFlowResponse | null>;
}

export interface AlertSender {
  sendMessage(chatId: string | number, text: string): Promise<void>;
}

export interface AlertDedupe {
  claim(key: string, ttlSeconds: number): Promise<boolean>;
}

export interface AlertRunResult {
  generatedAt: string;
  scanned: number;
  signals: number;
  sent: number;
  skipped: number;
  errors: number;
  messages: string[];
}

export interface AlertRunOptions {
  watchlistPath?: string;
  now?: Date;
  source?: AlertDataSource;
  sender?: AlertSender;
  chatId?: string | number;
  dedupe?: AlertDedupe;
  sleep?: (ms: number) => Promise<void>;
  dryRun?: boolean;
}

const DEDUPE_TTL_SECONDS = 2 * 24 * 60 * 60;

function defaultSource(): AlertDataSource {
  const scraper = new ScraperClient();
  return {
    getDailyTransactions: async (symbol, startDate) => {
      const { YahooClient } = await import("@/lib/market/yahoo");
      return new YahooClient().getDailyTransactions(symbol, startDate);
    },
    getForeignFlow: (symbol, length) => scraper.getForeignFlow(symbol, length),
  };
}

export function createMemoryDedupe(now = () => Date.now()): AlertDedupe {
  const seen = new Map<string, number>();
  return {
    async claim(key, ttlSeconds) {
      const current = now();
      const expiresAt = seen.get(key);
      if (expiresAt && expiresAt > current) return false;
      seen.set(key, current + ttlSeconds * 1000);
      return true;
    },
  };
}

export function createRedisDedupe(): AlertDedupe {
  const memory = createMemoryDedupe();
  return {
    async claim(key, ttlSeconds) {
      const client = await getRedisReady(300);
      if (!client) return memory.claim(key, ttlSeconds);
      try {
        const result = await client.set(
          key,
          "1",
          "EX",
          ttlSeconds,
          "NX"
        );
        return result === "OK";
      } catch {
        return memory.claim(key, ttlSeconds);
      }
    },
  };
}

export function formatAlertMessage(
  signal: AlertSignal,
  publicBaseUrl: string
): string {
  const base = publicBaseUrl.replace(/\/+$/, "");
  return [
    `🔔 <b>${signal.symbol}</b> · ${signal.title}`,
    signal.detail,
    `Tanggal: ${signal.date}`,
    `<a href="${base}/chart?symbol=${signal.symbol}">Buka chart</a>`,
  ].join("\n");
}

function startDateFor(now: Date): string {
  return new Date(now.getTime() - 120 * 86_400_000).toISOString().slice(0, 10);
}

export async function runAlertScan(
  options: AlertRunOptions = {}
): Promise<AlertRunResult> {
  const watchlist = await loadAlertWatchlist(
    options.watchlistPath ?? alertWatchlistPath()
  );
  const now = options.now ?? new Date();
  const source = options.source ?? defaultSource();
  const dedupe = options.dedupe ?? createRedisDedupe();
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const config = loadTelegramConfig();
  const chatId =
    options.chatId ?? config?.briefChatId ?? config?.ownerId ?? null;
  const sender =
    options.sender ??
    (config ? createTelegramClient(config.botToken) : null);

  if (!options.dryRun && (!sender || !chatId)) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN dan TELEGRAM_OWNER_ID atau TELEGRAM_BRIEF_CHAT_ID belum diatur."
    );
  }

  const result: AlertRunResult = {
    generatedAt: now.toISOString(),
    scanned: 0,
    signals: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    messages: [],
  };

  for (const symbol of watchlist.symbols) {
    result.scanned += 1;
    try {
      const candles = await source.getDailyTransactions(
        symbol,
        startDateFor(now)
      );
      if (!candles || candles.length === 0) {
        result.errors += 1;
        continue;
      }
      const flow = await source
        .getForeignFlow(symbol, 5)
        .catch(() => null);
      const signals = evaluateAlerts({
        symbol,
        candles,
        foreignFlow: flow?.data ?? [],
        rules: watchlist.rules,
      });
      result.signals += signals.length;

      for (const signal of signals) {
        if (!options.dryRun) {
          const key = `telaah:alert:${signal.date}:${symbol}:${signal.kind}`;
          if (!(await dedupe.claim(key, DEDUPE_TTL_SECONDS))) {
            result.skipped += 1;
            continue;
          }
        }
        const text = formatAlertMessage(
          signal,
          config?.publicBaseUrl ||
            process.env.TELEGRAM_PUBLIC_URL ||
            "https://telaah.hiiamanop.my.id"
        );
        result.messages.push(text);
        if (!options.dryRun && sender && chatId) {
          await sender.sendMessage(chatId, text);
          result.sent += 1;
        }
      }
    } catch (error) {
      console.error(`Alert scan failed for ${symbol}:`, error);
      result.errors += 1;
    }
    await sleep(250);
  }

  return result;
}
