import { getMarketProvider } from "@/lib/market";
import {
  analyzeFlowLens,
  type BandarmologySummary,
} from "@/lib/quant/flow";
import type {
  BrokerRegistryItem,
  BrokerSummaryResponse,
  ForeignFlowResponse,
} from "@/lib/sectors/types";
import { createRedisDedupe, type AlertDedupe } from "@/lib/alerts/run";
import { loadAlertWatchlist } from "@/lib/alerts/store";
import { loadTelegramConfig } from "@/lib/telegram/config";
import { createTelegramClient } from "@/lib/telegram/client";

export interface BandarAlertSource {
  getBrokersRegistry(): Promise<BrokerRegistryItem[]>;
  getBrokerSummary(symbol: string): Promise<BrokerSummaryResponse | null>;
  getForeignFlow(symbol: string): Promise<ForeignFlowResponse | null>;
}

export interface BandarPhaseHit {
  symbol: string;
  summary: BandarmologySummary;
}

export interface BandarAlertResult {
  watchlist: number;
  phases: number;
  sent: number;
  skipped: number;
  messages: string[];
}

export async function scanBandarPhases(
  symbols: string[],
  source: BandarAlertSource
): Promise<BandarPhaseHit[]> {
  const registry = await source.getBrokersRegistry().catch(() => []);
  const hits: BandarPhaseHit[] = [];
  for (const symbol of symbols) {
    const [broker, foreign] = await Promise.all([
      source.getBrokerSummary(symbol).catch(() => null),
      source.getForeignFlow(symbol).catch(() => null),
    ]);
    const flow = analyzeFlowLens(broker, foreign, registry);
    const summary = flow.bandarmologySummary;
    if (!summary || summary.phase === "Netral / Tarik Tambang") continue;
    hits.push({ symbol, summary });
  }
  return hits;
}

export function formatBandarAlert(
  symbol: string,
  summary: BandarmologySummary
): string {
  return [
    `🧭 <b>${symbol}</b> · ${summary.phase}`,
    `Kontrol: ${summary.controllingCohort} · top buyer ${summary.topBuyersSharePct.toFixed(1)}% turnover`,
    `Avg buyer Rp ${summary.topBuyersAvgPrice.toLocaleString("id-ID")} · avg seller Rp ${summary.topSellersAvgPrice.toLocaleString("id-ID")}`,
    summary.humanNarrative,
    "Data agregat broker, bukan identitas investor. Riset, bukan rekomendasi.",
  ].join("\n");
}

function jakartaDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function runBandarAlerts(
  options: {
    dryRun?: boolean;
    now?: Date;
    source?: BandarAlertSource;
    dedupe?: AlertDedupe;
    send?: (chatId: string | number, text: string) => Promise<void>;
  } = {}
): Promise<BandarAlertResult> {
  const watchlist = await loadAlertWatchlist();
  const result: BandarAlertResult = {
    watchlist: watchlist.symbols.length,
    phases: 0,
    sent: 0,
    skipped: 0,
    messages: [],
  };
  if (watchlist.symbols.length === 0) return result;

  const source = options.source ?? getMarketProvider();
  const hits = await scanBandarPhases(watchlist.symbols, source);
  result.phases = hits.length;
  const dedupe = options.dedupe ?? createRedisDedupe();
  const config = loadTelegramConfig();
  const chatId = config?.briefChatId ?? config?.ownerId ?? null;
  const send =
    options.send ??
    (config ? createTelegramClient(config.botToken).sendMessage : null);
  const day = jakartaDay(options.now ?? new Date());

  for (const hit of hits) {
    const key = `telaah:bandar:alert:${day}:${hit.symbol}:${hit.summary.phase}`;
    if (!(await dedupe.claim(key, 3 * 24 * 3600))) {
      result.skipped += 1;
      continue;
    }
    const message = formatBandarAlert(hit.symbol, hit.summary);
    result.messages.push(message);
    if (!options.dryRun && send && chatId) {
      await send(chatId, message);
      result.sent += 1;
    }
  }
  return result;
}
