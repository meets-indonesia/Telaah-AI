import type { AnalysisMode, CompanyIntelligenceReport } from "@/lib/agent/types";
import type { AnalysisResult } from "@/lib/agent/analysis-service";
import {
  conversationalReply,
  detectConversationalIntent,
  sanitizeUserPrompt,
} from "@/lib/agent/conversation";
import { extractValidTickers } from "@/lib/agent/chat-router";
import type { TelegramConfig } from "./config";
import { isOwner } from "./config";
import { formatReportMessage } from "./format";

export interface TelegramMessage {
  message_id?: number;
  from?: { id?: number; username?: string; first_name?: string };
  chat: { id: number; type?: string };
  text?: string;
}

export interface TelegramHandlerUpdate {
  update_id?: number;
  message?: TelegramMessage;
}

export interface TelegramAlertDeps {
  list(): Promise<string[]>;
  add(symbol: string): Promise<string[]>;
  remove(symbol: string): Promise<string[]>;
}

export interface TelegramHandlerDeps {
  config: TelegramConfig;
  alerts?: TelegramAlertDeps;
  sendMessage: (chatId: string | number, text: string) => Promise<void>;
  analyze: (input: {
    prompt: string;
    mode?: AnalysisMode;
    confirmedSymbol?: string;
  }) => Promise<AnalysisResult>;
  runBrief: (
    refresh: boolean
  ) => Promise<{ chatId: string | number; text: string }>;
  getLastSymbol: (chatId: string | number) => string | null;
  setLastSymbol: (chatId: string | number, symbol: string) => void;
}

const FOLLOW_UP_PATTERN =
  /(nya\b|itu\b|tadi\b|tersebut\b|risiko|valuasi|target|prospek|support|resistance|gimana|bagaimana|kenapa|mengapa|bandingkan|\bvs\b|harga|dividen|fundamental|teknikal)/i;

function looksLikeFollowUp(text: string): boolean {
  return text.split(/\s+/).filter(Boolean).length <= 24 && FOLLOW_UP_PATTERN.test(text);
}

function startMessage(config: TelegramConfig, chatId: number, userId?: number): string {
  const briefTarget = config.briefChatId
    ? "channel brief yang sudah diatur"
    : "chat ini (kalau kamu mau, kita bisa pindahkan ke channel brief)";
  return [
    "Halo! 👋 Aku <b>Telaah 360</b>, teman riset saham IDX kamu.",
    "",
    "Di sini kamu bisa tanya-jawab soal emiten — fundamental, valuasi, teknikal, flow, sampai trading plan. Kalau mau brief harmonic harian, ketik /brief.",
    "",
    `Brief harian akan aku kirim ke ${briefTarget}.`,
    "",
    "Coba mulai dengan:",
    "• <code>Analisis BBCA</code>",
    "• <code>Gimana valuasi TLKM?</code>",
    "• <code>/brief</code> untuk scan 4H, 1D, 1W, 1M",
    "",
    `ID kamu: <code>${userId ?? "—"}</code> · Chat ID: <code>${chatId}</code>`,
    "",
    "Tenang, ini untuk riset dan edukasi — bukan rekomendasi beli/jual.",
  ].join("\n");
}

function helpMessage(): string {
  return [
    "<b>Yang bisa aku bantu</b>",
    "• <code>Analisis BBCA</code> — telaah lengkap satu emiten",
    "• <code>/analisis TLKM risiko utamanya apa?</code> — analisis dengan pertanyaan spesifik",
    "• <code>/brief</code> — harmonic brief 4H/1D/1W/1M sekarang",
    "• <code>/brief refresh</code> — paksa scan baru, abaikan cache",
    "• <code>/watch BBCA</code> — pantau emiten untuk alert",
    "• <code>/unwatch BBCA</code> — berhenti memantau emiten",
    "• <code>/watchlist</code> — lihat daftar alert",
    "• <code>/id</code> — lihat user ID dan chat ID",
    "",
    "Kalau sudah pernah analisis satu saham, kamu bisa lanjut bertanya tanpa menyebut kodenya lagi — misalnya <code>risiko utamanya apa?</code>.",
    "",
    "Aku tidak bisa membaca pesan di channel broadcast; chat dua arah ada di DM ini atau di grup.",
  ].join("\n");
}

export async function handleTelegramUpdate(
  update: TelegramHandlerUpdate,
  deps: TelegramHandlerDeps
): Promise<void> {
  const message = update.message;
  if (!message?.text || !message.chat?.id) return;
  if (!isOwner(deps.config, update)) return;

  const chatId = message.chat.id;
  const text = message.text.trim();
  if (!text) return;

  const send = (content: string) => deps.sendMessage(chatId, content);

  const respond = async (prompt: string, explicitSymbol?: string) => {
    const lastSymbol = deps.getLastSymbol(chatId);
    const followUpSymbol =
      !explicitSymbol &&
      lastSymbol &&
      looksLikeFollowUp(prompt)
        ? lastSymbol
        : undefined;
    const confirmedSymbol = explicitSymbol || followUpSymbol;

    try {
      const result = await deps.analyze({
        prompt,
        mode: "full",
        confirmedSymbol,
      });

      if (result.type === "report") {
        deps.setLastSymbol(chatId, result.report.symbol);
        await send(formatReportMessage(result.report, deps.config.publicBaseUrl));
        return;
      }
      if (result.type === "confirmation") {
        await send(
          `Sepertinya maksudmu <b>${result.candidateSymbol}</b>, ya? Balas <code>/analisis ${result.candidateSymbol}</code> supaya aku langsung telaah.`
        );
        return;
      }
      if (result.type === "message") {
        await send(result.message);
        return;
      }
      await send(
        `Hmm, ada yang perlu diperbaiki: ${result.message} Coba tulis ulang, ya.`
      );
    } catch (error) {
      console.error("Telegram analysis failed:", error);
      await send(
        "Maaf, analisisnya sedang gagal di tengah jalan. Coba lagi sebentar, ya. 🙏"
      );
    }
  };

  if (!text.startsWith("/")) {
    const sanitized = sanitizeUserPrompt(text);
    if (!sanitized.text) {
      await send("Pesanmu kosong. Coba tulis pertanyaan atau kode saham, ya.");
      return;
    }
    const conversational = detectConversationalIntent(sanitized.text);
    if (conversational) {
      await send(conversationalReply(conversational));
      return;
    }
    await respond(sanitized.text);
    return;
  }

  const [rawCommand, ...args] = text.split(/\s+/);
  const command = rawCommand.replace(/^\//, "").split("@")[0].toLowerCase();

  if (command === "start") {
    await send(startMessage(deps.config, chatId, message.from?.id));
    return;
  }
  if (command === "help") {
    await send(helpMessage());
    return;
  }
  if (command === "id") {
    await send(
      `User ID: <code>${message.from?.id ?? "—"}</code>\nChat ID: <code>${chatId}</code>`
    );
    return;
  }
  if (command === "watch" || command === "unwatch") {
    if (!deps.alerts) {
      await send("Fitur alert belum aktif di server ini.");
      return;
    }
    const raw = args.join(" ").trim();
    const symbol =
      extractValidTickers(raw)[0] ?? raw.toUpperCase().replace(".JK", "");
    if (!/^[A-Z]{4}$/.test(symbol)) {
      await send("Tulis kode emiten 4 huruf. Contoh: <code>/watch BBCA</code>.");
      return;
    }
    try {
      const symbols =
        command === "watch"
          ? await deps.alerts.add(symbol)
          : await deps.alerts.remove(symbol);
      const verb = command === "watch" ? "dipantau" : "dihentikan";
      await send(
        `<b>${symbol}</b> ${verb}.\nWatchlist alert: ${
          symbols.length ? symbols.map((item) => `<code>${item}</code>`).join(", ") : "kosong"
        }`
      );
    } catch (error) {
      await send(
        `Gagal memperbarui watchlist: ${
          error instanceof Error ? error.message : "coba lagi."
        }`
      );
    }
    return;
  }
  if (command === "watchlist") {
    if (!deps.alerts) {
      await send("Fitur alert belum aktif di server ini.");
      return;
    }
    const symbols = await deps.alerts.list();
    await send(
      symbols.length
        ? `<b>Watchlist alert</b>\n${symbols.map((item) => `• <code>${item}</code>`).join("\n")}`
        : "Watchlist alert masih kosong. Tambah dengan <code>/watch BBCA</code>."
    );
    return;
  }
  if (command === "brief") {
    const refresh = args.some((arg) => arg.toLowerCase() === "refresh");
    await send(
      refresh
        ? "Oke, aku buat brief harmonic baru — scan 4H, 1D, 1W, 1M. Bisa 1–3 menit, nanti aku kirim hasilnya, ya. ☕"
        : "Oke, aku siapkan harmonic brief 4H, 1D, 1W, 1M. Kalau cache hari ini masih segar, ini cepat; kalau perlu scan baru, bisa 1–3 menit. Nanti aku kirim hasilnya, ya."
    );

    void deps
      .runBrief(refresh)
      .then((delivery) => deps.sendMessage(delivery.chatId, delivery.text))
      .catch(async (error) => {
        console.error("Telegram brief failed:", error);
        await send(
          "Maaf, brief harmonic-nya gagal disiapkan. Coba lagi beberapa saat, ya. 🙏"
        );
      });
    return;
  }
  if (command === "analisis" || command === "ai") {
    const prompt = args.join(" ").trim();
    if (!prompt) {
      await send(
        "Tulis emiten atau pertanyaannya, ya. Contoh: <code>/analisis BBCA risiko utamanya apa?</code>"
      );
      return;
    }
    const explicitSymbol = extractValidTickers(prompt)[0];
    await respond(prompt, explicitSymbol);
    return;
  }

  await send(helpMessage());
}

export type TelegramReport = CompanyIntelligenceReport;
