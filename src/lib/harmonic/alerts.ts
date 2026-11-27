import { createRedisDedupe, type AlertDedupe } from "@/lib/alerts/run";
import { loadAlertWatchlist } from "@/lib/alerts/store";
import { scanHarmonicUniverse } from "@/lib/screener/harmonic-screener";
import { loadTelegramConfig } from "@/lib/telegram/config";
import { createTelegramClient } from "@/lib/telegram/client";

export interface HarmonicAlertResult {
  watchlist: number;
  candidates: number;
  sent: number;
  skipped: number;
  messages: string[];
}

function formatAlert(candidate: {
  symbol: string;
  best: {
    pattern: string;
    timeframe: string;
    status: string;
    prz: { low: number; high: number };
    invalidation: number;
    targets: { t1: number; t2: number };
  };
  price: number;
  score: number;
  timeframes: string[];
}): string {
  const best = candidate.best;
  return [
    `🎯 <b>${candidate.symbol}</b> · ${best.pattern} ${best.timeframe} (${best.status})`,
    `Harga Rp ${candidate.price.toLocaleString("id-ID")} · PRZ Rp ${best.prz.low.toLocaleString("id-ID", { maximumFractionDigits: 0 })}–${best.prz.high.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`,
    `Invalidasi Rp ${best.invalidation.toLocaleString("id-ID", { maximumFractionDigits: 0 })} · T1 Rp ${best.targets.t1.toLocaleString("id-ID", { maximumFractionDigits: 0 })} · T2 Rp ${best.targets.t2.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`,
    `Skor ${candidate.score}${candidate.timeframes.length > 1 ? ` · confluence ${candidate.timeframes.join("/")}` : ""}`,
    "Paper/research only. Bukan rekomendasi.",
  ].join("\n");
}

export async function runHarmonicAlerts(
  options: {
    dryRun?: boolean;
    now?: Date;
    maxDistancePct?: number;
    dedupe?: AlertDedupe;
    send?: (chatId: string | number, text: string) => Promise<void>;
  } = {}
): Promise<HarmonicAlertResult> {
  const watchlist = await loadAlertWatchlist();
  const symbols = watchlist.symbols;
  const result: HarmonicAlertResult = {
    watchlist: symbols.length,
    candidates: 0,
    sent: 0,
    skipped: 0,
    messages: [],
  };
  if (symbols.length === 0) return result;

  const scan = await scanHarmonicUniverse({
    symbols,
    refresh: true,
    direction: "bullish",
    cachePath: "data/harmonic_alerts_cache.json",
  });
  result.candidates = scan.results.length;
  const maxDistance = options.maxDistancePct ?? 1.5;
  const dedupe = options.dedupe ?? createRedisDedupe();
  const config = loadTelegramConfig();
  const chatId = config?.briefChatId ?? config?.ownerId ?? null;
  const send =
    options.send ??
    (config ? createTelegramClient(config.botToken).sendMessage : null);

  for (const candidate of scan.results) {
    if (Math.abs(candidate.best.distancePct) > maxDistance) continue;
    if (candidate.best.status !== "completed") continue;
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(options.now ?? new Date());
    const key = `telaah:harmonic:alert:${day}:${candidate.symbol}:${candidate.best.pattern}:${candidate.best.timeframe}`;
    if (!(await dedupe.claim(key, 7 * 24 * 3600))) {
      result.skipped += 1;
      continue;
    }
    const message = formatAlert(candidate);
    result.messages.push(message);
    if (!options.dryRun && send && chatId) {
      await send(chatId, message);
      result.sent += 1;
    }
  }
  return result;
}
