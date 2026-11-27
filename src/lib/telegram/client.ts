export const TELEGRAM_MAX_MESSAGE = 4096;
const SAFE_LIMIT = 3900;

export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const TAG_PATTERN = /<\/?([a-z][a-z0-9]*)(?:\s[^>]*)?>/gi;

function openTags(text: string): string[] {
  const stack: Array<{ name: string; full: string }> = [];
  for (const match of text.matchAll(TAG_PATTERN)) {
    const full = match[0];
    const name = match[1].toLowerCase();
    if (full.startsWith("</")) {
      const index = stack.map((tag) => tag.name).lastIndexOf(name);
      if (index >= 0) stack.splice(index, 1);
    } else {
      stack.push({ name, full });
    }
  }
  return stack.map((tag) => tag.full);
}

/**
 * Splits at a paragraph boundary when possible and keeps HTML tags balanced
 * across chunks. The caller still gets a hard split if a single paragraph is
 * larger than Telegram's limit.
 */
export function splitTelegramMessage(
  text: string,
  limit: number = TELEGRAM_MAX_MESSAGE
): string[] {
  if (!text) return [];
  if (text.length <= limit) return [text];

  const effectiveLimit = Math.min(limit, SAFE_LIMIT);
  const chunks: string[] = [];
  let remaining = text;
  let carry: string[] = [];

  while (remaining.length + carry.join("").length > effectiveLimit) {
    const prefix = carry.join("");
    const available = effectiveLimit - prefix.length;
    let cut = remaining.lastIndexOf("\n\n", available);
    if (cut < available * 0.4) cut = remaining.lastIndexOf("\n", available);
    if (cut < available * 0.4) cut = remaining.lastIndexOf(" ", available);
    if (cut <= 0) cut = available;

    const body = remaining.slice(0, cut).trim();
    const opened = openTags(prefix + body);
    const suffix = [...opened]
      .reverse()
      .map((tag) => `</${tag.slice(1).split(/\s/)[0].replace(/>$/, "")}>`)
      .join("");
    chunks.push(`${prefix}${body}${suffix}`);
    carry = opened;
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) {
    const prefix = carry.join("");
    const opened = openTags(prefix + remaining);
    const suffix = [...opened]
      .reverse()
      .map((tag) => `</${tag.slice(1).split(/\s/)[0].replace(/>$/, "")}>`)
      .join("");
    chunks.push(`${prefix}${remaining}${suffix}`);
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

export interface TelegramClient {
  sendMessage(chatId: string | number, text: string): Promise<void>;
  getMe(): Promise<{ id: number; username?: string }>;
  setWebhook(url: string, secretToken?: string): Promise<void>;
  deleteWebhook(): Promise<void>;
  getWebhookInfo(): Promise<Record<string, unknown>>;
}

export function createTelegramClient(
  botToken: string,
  fetchImpl: typeof fetch = fetch
): TelegramClient {
  async function call<T>(method: string, payload?: Record<string, unknown>): Promise<T> {
    const response = await fetchImpl(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? {}),
      signal: AbortSignal.timeout(30_000),
    });
    const body = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: T;
      description?: string;
    };
    if (!response.ok || !body.ok) {
      throw new Error(
        `Telegram ${method} gagal: ${body.description || `HTTP ${response.status}`}`
      );
    }
    return body.result as T;
  }

  return {
    async sendMessage(chatId, text) {
      const chunks = splitTelegramMessage(text);
      for (const chunk of chunks) {
        await call("sendMessage", {
          chat_id: chatId,
          text: chunk,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        });
      }
    },
    async getMe() {
      return call<{ id: number; username?: string }>("getMe");
    },
    async setWebhook(url, secretToken) {
      await call("setWebhook", {
        url,
        secret_token: secretToken,
        allowed_updates: ["message"],
        drop_pending_updates: true,
      });
    },
    async deleteWebhook() {
      await call("deleteWebhook", { drop_pending_updates: true });
    },
    async getWebhookInfo() {
      return call<Record<string, unknown>>("getWebhookInfo");
    },
  };
}
