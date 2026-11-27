import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runAnalysis } from "@/lib/agent/analysis-service";
import { createBriefDelivery } from "@/lib/telegram/brief";
import { createTelegramClient } from "@/lib/telegram/client";
import { isOwner, loadTelegramConfig } from "@/lib/telegram/config";
import {
  handleTelegramUpdate,
  type TelegramHandlerUpdate,
} from "@/lib/telegram/handler";
import { getLastSymbol, setLastSymbol } from "@/lib/telegram/state";
import {
  addAlertSymbol,
  loadAlertWatchlist,
  removeAlertSymbol,
} from "@/lib/alerts/store";

export const dynamic = "force-dynamic";

const processedUpdates = new Set<number>();

function secretMatches(received: string | null, expected: string): boolean {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export async function POST(req: NextRequest) {
  const config = loadTelegramConfig();
  if (!config) {
    return NextResponse.json(
      { ok: false, error: "Telegram bot belum diatur." },
      { status: 503 }
    );
  }
  if (!config.webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_WEBHOOK_SECRET belum diatur." },
      { status: 503 }
    );
  }
  if (
    !secretMatches(
      req.headers.get("x-telegram-bot-api-secret-token"),
      config.webhookSecret
    )
  ) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TelegramHandlerUpdate;
  try {
    update = (await req.json()) as TelegramHandlerUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON tidak valid." }, { status: 400 });
  }

  if (typeof update.update_id === "number") {
    if (processedUpdates.has(update.update_id)) {
      return NextResponse.json({ ok: true });
    }
    processedUpdates.add(update.update_id);
    if (processedUpdates.size > 200) {
      const oldest = processedUpdates.values().next().value;
      if (typeof oldest === "number") processedUpdates.delete(oldest);
    }
  }

  if (!isOwner(config, update)) {
    return NextResponse.json({ ok: true });
  }

  const client = createTelegramClient(config.botToken);
  const chatId = update.message?.chat?.id;

  try {
    await handleTelegramUpdate(update, {
      config,
      sendMessage: (target, text) => client.sendMessage(target, text),
      analyze: (input) => runAnalysis(input),
      runBrief: async (refresh) => {
        const delivery = await createBriefDelivery(refresh, chatId);
        return { chatId: delivery.chatId, text: delivery.text };
      },
      getLastSymbol,
      setLastSymbol,
      alerts: {
        list: async () => (await loadAlertWatchlist()).symbols,
        add: (symbol) => addAlertSymbol(symbol),
        remove: (symbol) => removeAlertSymbol(symbol),
      },
    });
  } catch (error) {
    console.error("Telegram webhook handler failed:", error);
  }

  return NextResponse.json({ ok: true });
}
