import { ScraperClient } from "@/lib/market/scraper-client";
import { loadTelegramConfig } from "@/lib/telegram/config";
import { createTelegramClient } from "@/lib/telegram/client";
import {
  createRedisDedupe,
  type AlertDedupe,
} from "@/lib/alerts/run";

export interface StockbitSessionStatus {
  configured: boolean;
  logged_in?: boolean;
  expired?: boolean;
  source?: string;
  access_expires_at?: string | null;
  refresh_expires_at?: string | null;
  limitations?: string[];
}

export type StockbitSessionAlertKind =
  | "missing"
  | "expired"
  | "refresh_72h"
  | "refresh_24h"
  | "unavailable";

export interface StockbitSessionAlert {
  kind: StockbitSessionAlertKind;
  severity: "warning" | "critical";
  hoursLeft: number | null;
  expiresAt: string | null;
}

export interface StockbitSessionCheckResult {
  status: StockbitSessionStatus | null;
  alert: StockbitSessionAlert | null;
  sent: boolean;
  message: string | null;
}

export interface StockbitSessionCheckOptions {
  getStatus?: () => Promise<StockbitSessionStatus | null>;
  send?: (chatId: string | number, text: string) => Promise<void>;
  chatId?: string | number;
  dedupe?: AlertDedupe;
  now?: Date;
  dryRun?: boolean;
}

const HOUR = 3600_000;

function hoursUntil(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return null;
  return (time - now.getTime()) / HOUR;
}

export function assessStockbitSession(
  status: StockbitSessionStatus | null,
  now = new Date()
): StockbitSessionAlert | null {
  if (!status) {
    return {
      kind: "unavailable",
      severity: "critical",
      hoursLeft: null,
      expiresAt: null,
    };
  }
  if (!status.configured) {
    return {
      kind: "missing",
      severity: "critical",
      hoursLeft: null,
      expiresAt: null,
    };
  }

  const refreshAt = status.refresh_expires_at ?? null;
  const hoursLeft = hoursUntil(refreshAt, now);
  if (hoursLeft === null) {
    return {
      kind: "missing",
      severity: "critical",
      hoursLeft: null,
      expiresAt: refreshAt,
    };
  }
  if (status.expired || status.logged_in === false || hoursLeft <= 0) {
    return {
      kind: "expired",
      severity: "critical",
      hoursLeft,
      expiresAt: refreshAt,
    };
  }
  if (hoursLeft <= 24) {
    return {
      kind: "refresh_24h",
      severity: "critical",
      hoursLeft,
      expiresAt: refreshAt,
    };
  }
  if (hoursLeft <= 72) {
    return {
      kind: "refresh_72h",
      severity: "warning",
      hoursLeft,
      expiresAt: refreshAt,
    };
  }
  return null;
}

function formatExpiry(iso: string | null): string {
  if (!iso) return "waktu yang tidak diketahui";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "waktu yang tidak diketahui";
  return `${date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })} WIB`;
}

export function formatStockbitSessionAlert(alert: StockbitSessionAlert): string {
  const command = "./deploy/podman/stockbit-login.sh";
  if (alert.kind === "unavailable") {
    return [
      "⚠️ <b>Cek sesi Stockbit gagal</b>",
      "Scraper tidak bisa dihubungi saat pengecekan sesi.",
      "Pastikan container <code>telaah-scraper</code> hidup.",
      `Panduan: docs/PHASE2_IDX_SCRAPER.md`,
    ].join("\n");
  }
  if (alert.kind === "missing") {
    return [
      "⚠️ <b>Sesi Stockbit belum diatur</b>",
      "Broker summary dan chart realtime akan jatuh ke fallback.",
      "Login ulang:",
      `<code>cd /home/ahmad/workspace/Telaah-AI && ${command}</code>`,
      "Panduan: docs/PHASE2_IDX_SCRAPER.md",
    ].join("\n");
  }

  const prefix =
    alert.kind === "expired"
      ? "Sesi Stockbit sudah kedaluwarsa."
      : `Refresh token kedaluwarsa dalam ${Math.max(
          0,
          Math.ceil(alert.hoursLeft ?? 0)
        )} jam (${formatExpiry(alert.expiresAt)}).`;

  return [
    "⚠️ <b>Sesi Stockbit perlu diperbarui</b>",
    prefix,
    "Login ulang:",
    `<code>cd /home/ahmad/workspace/Telaah-AI && ${command}</code>`,
    "Panduan: docs/PHASE2_IDX_SCRAPER.md",
  ].join("\n");
}

export async function checkStockbitSession(
  options: StockbitSessionCheckOptions = {}
): Promise<StockbitSessionCheckResult> {
  const now = options.now ?? new Date();
  const getStatus =
    options.getStatus ??
    (() => new ScraperClient().getStockbitStatus());
  let status: StockbitSessionStatus | null = null;
  try {
    status = await getStatus();
  } catch {
    status = null;
  }

  const alert = assessStockbitSession(status, now);
  if (!alert) return { status, alert: null, sent: false, message: null };

  const message = formatStockbitSessionAlert(alert);
  const dedupe = options.dedupe ?? createRedisDedupe();
  const key =
    alert.kind === "unavailable"
      ? "telaah:stockbit-session:unavailable"
      : `telaah:stockbit-session:${alert.kind}:${alert.expiresAt ?? "none"}`;
  const ttl = alert.kind === "unavailable" ? 6 * 3600 : 7 * 24 * 3600;

  if (!options.dryRun && !(await dedupe.claim(key, ttl))) {
    return { status, alert, sent: false, message };
  }

  if (options.dryRun) {
    return { status, alert, sent: false, message };
  }

  const config = loadTelegramConfig();
  const chatId =
    options.chatId ?? config?.briefChatId ?? config?.ownerId ?? null;
  const send =
    options.send ??
    (config ? createTelegramClient(config.botToken).sendMessage : null);
  if (!send || !chatId) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN dan TELEGRAM_OWNER_ID atau TELEGRAM_BRIEF_CHAT_ID belum diatur."
    );
  }

  await send(chatId, message);
  return { status, alert, sent: true, message };
}
