import {
  scanHarmonicUniverse,
  type HarmonicScanResult,
} from "@/lib/screener/harmonic-screener";
import { createTelegramClient } from "./client";
import { loadTelegramConfig } from "./config";
import { formatBriefMessage } from "./format";

export interface BriefDelivery {
  scan: HarmonicScanResult;
  text: string;
  chatId: string | number;
}

export async function createBriefDelivery(
  refresh: boolean,
  fallbackChatId?: string | number
): Promise<BriefDelivery> {
  const scan = await scanHarmonicUniverse({ refresh });
  const text = formatBriefMessage(scan);
  const config = loadTelegramConfig();
  const chatId =
    config?.briefChatId ?? fallbackChatId ?? config?.ownerId ?? null;

  if (!chatId) {
    throw new Error(
      "TELEGRAM_BRIEF_CHAT_ID atau TELEGRAM_OWNER_ID belum diatur."
    );
  }

  return { scan, text, chatId };
}

export async function sendHarmonicBrief(options: {
  refresh?: boolean;
  fallbackChatId?: string | number;
} = {}): Promise<BriefDelivery> {
  const config = loadTelegramConfig();
  if (!config) {
    throw new Error("TELEGRAM_BOT_TOKEN belum diatur.");
  }

  const delivery = await createBriefDelivery(
    options.refresh ?? false,
    options.fallbackChatId
  );
  const client = createTelegramClient(config.botToken);
  await client.sendMessage(delivery.chatId, delivery.text);
  return delivery;
}
