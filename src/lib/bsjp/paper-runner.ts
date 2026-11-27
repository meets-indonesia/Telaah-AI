import { ScraperClient } from "@/lib/market/scraper-client";
import { createTelegramClient } from "@/lib/telegram/client";
import { loadTelegramConfig } from "@/lib/telegram/config";
import { scanBsjp, type BsjpScanResult } from "@/lib/bsjp/scanner";
import { DEFAULT_BSJP_COSTS } from "@/lib/bsjp/backtest";
import {
  closePaperPositions,
  formatPaperEntry,
  formatPaperExit,
  loadPaperPositions,
  paperPath,
  recordPaperEntries,
  type PaperPosition,
} from "@/lib/bsjp/paper";

export interface PaperEntryResult {
  scan: BsjpScanResult;
  added: PaperPosition[];
  messages: string[];
  sent: number;
  dryRun: boolean;
}

export interface PaperExitResult {
  closed: PaperPosition[];
  messages: string[];
  sent: number;
  remaining: number;
  dryRun: boolean;
}

export async function runPaperEntry(
  options: {
    now?: Date;
    dryRun?: boolean;
    scan?: () => Promise<BsjpScanResult>;
    send?: (chatId: string | number, text: string) => Promise<void>;
    chatId?: string | number;
    filePath?: string;
  } = {}
): Promise<PaperEntryResult> {
  const now = options.now ?? new Date();
  const scan = options.scan ?? (() => scanBsjp({ syariahOnly: true }));
  const result = await scan();
  const candidates = result.candidates;
  const messages = candidates.map((candidate) =>
    formatPaperEntry({
      id: `${now.toISOString().slice(0, 10)}:${candidate.symbol}`,
      entryDate: new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10),
      symbol: candidate.symbol,
      score: candidate.score,
      entryPrice: candidate.last,
      entryAt: now.toISOString(),
      status: "open",
    })
  );

  if (options.dryRun) {
    return { scan: result, added: [], messages, sent: 0, dryRun: true };
  }

  const added = await recordPaperEntries(candidates, now, options.filePath ?? paperPath());
  const config = loadTelegramConfig();
  const chatId =
    options.chatId ?? config?.briefChatId ?? config?.ownerId ?? null;
  const send =
    options.send ??
    (config ? createTelegramClient(config.botToken).sendMessage : null);
  let sent = 0;
  if (send && chatId) {
    for (const message of messages) {
      await send(chatId, message);
      sent += 1;
    }
  }
  return { scan: result, added: added.added, messages, sent, dryRun: false };
}

export async function runPaperExit(
  options: {
    now?: Date;
    dryRun?: boolean;
    getQuote?: (symbol: string) => Promise<{ symbol: string; last: number } | null>;
    send?: (chatId: string | number, text: string) => Promise<void>;
    chatId?: string | number;
    filePath?: string;
  } = {}
): Promise<PaperExitResult> {
  const now = options.now ?? new Date();
  const store = await loadPaperPositions(options.filePath ?? paperPath());
  const open = store.positions.filter((position) => position.status === "open");
  const scraper = new ScraperClient();
  const getQuote = options.getQuote ?? ((symbol: string) => scraper.getQuote(symbol));
  const quotes: Array<{ symbol: string; last: number }> = [];
  for (const position of open) {
    try {
      const quote = await getQuote(position.symbol);
      if (quote?.last) quotes.push({ symbol: quote.symbol, last: quote.last });
    } catch {
      // Leave the position open and retry next morning.
    }
  }

  if (options.dryRun) {
    const messages = open
      .filter((position) => quotes.some((quote) => quote.symbol === position.symbol))
      .map((position) => {
        const quote = quotes.find((item) => item.symbol === position.symbol)!;
        const gross = ((quote.last - position.entryPrice) / position.entryPrice) * 100;
        const netBuy =
          position.entryPrice * (1 + DEFAULT_BSJP_COSTS.buyFeePct / 100);
        const netSell = quote.last * (1 - DEFAULT_BSJP_COSTS.sellFeePct / 100);
        const net = ((netSell - netBuy) / netBuy) * 100;
        return formatPaperExit({
          ...position,
          exitPrice: quote.last,
          exitDate: new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10),
          exitAt: now.toISOString(),
          grossPct: gross,
          netPct: net,
          status: "closed",
        });
      });
    return { closed: [], messages, sent: 0, remaining: open.length, dryRun: true };
  }

  const { closed, remaining } = await closePaperPositions(
    quotes,
    now,
    options.filePath ?? paperPath()
  );
  const messages = closed.map(formatPaperExit);
  const config = loadTelegramConfig();
  const chatId =
    options.chatId ?? config?.briefChatId ?? config?.ownerId ?? null;
  const send =
    options.send ??
    (config ? createTelegramClient(config.botToken).sendMessage : null);
  let sent = 0;
  if (send && chatId) {
    for (const message of messages) {
      await send(chatId, message);
      sent += 1;
    }
  }
  return { closed, messages, sent, remaining: remaining.length, dryRun: false };
}
