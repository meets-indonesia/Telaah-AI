import { describe, expect, it, vi } from "vitest";
import type { AnalysisResult } from "@/lib/agent/analysis-service";
import type { HarmonicScanResult } from "@/lib/screener/harmonic-screener";
import { escapeTelegramHtml, splitTelegramMessage } from "../client";
import { isOwner, loadTelegramConfig, type TelegramConfig } from "../config";
import { formatBriefMessage, formatReportMessage } from "../format";
import { handleTelegramUpdate, type TelegramHandlerDeps } from "../handler";

const config: TelegramConfig = {
  botToken: "test-token",
  ownerId: 42,
  briefChatId: null,
  webhookSecret: "secret",
  publicBaseUrl: "https://telaah.example",
  briefSecret: null,
};

function scan(): HarmonicScanResult {
  return {
    version: 2,
    generatedAt: "2026-11-24T01:00:00.000Z",
    date: "2026-11-24",
    universeSize: 88,
    scanned: 87,
    failed: 1,
    results: [
      {
        symbol: "INCO",
        price: 3250,
        best: {
          symbol: "INCO",
          timeframe: "1M",
          pattern: "Gartley",
          direction: "bullish",
          status: "completed",
          pivotDates: {
            x: "2025-04-30",
            a: "2025-10-31",
            b: "2025-12-31",
            c: "2026-07-31",
            d: "2026-10-30",
          },
          ratios: { abXa: 0.618, bcAb: 0.5, cdBc: 1.27, adXa: 0.786 },
          prz: { low: 2868.74, high: 3505.49 },
          price: 3250,
          distancePct: 0,
          invalidation: 3193.95,
          targets: { t1: 5700, t2: 7900 },
          riskReward: 2.4,
          rsi: 35,
          fitScore: 38,
          score: 99,
          generatedAt: "2026-11-24T01:00:00.000Z",
        },
        matches: [],
        timeframes: ["1M"],
        confluenceCount: 1,
        score: 99,
      },
      {
        symbol: "HEAL",
        price: 488,
        best: {
          symbol: "HEAL",
          timeframe: "1D",
          pattern: "Gartley",
          direction: "bullish",
          status: "completed",
          pivotDates: {
            x: "2026-10-19",
            a: "2026-10-22",
            b: "2026-10-24",
            c: "2026-10-27",
            d: "2026-10-30",
          },
          ratios: { abXa: 0.618, bcAb: 0.5, cdBc: 1.27, adXa: 0.786 },
          prz: { low: 476.83, high: 488.51 },
          price: 488,
          distancePct: 0,
          invalidation: 481.58,
          targets: { t1: 520, t2: 530 },
          riskReward: 1.8,
          rsi: 38,
          fitScore: 36,
          score: 90,
          generatedAt: "2026-11-24T01:00:00.000Z",
        },
        matches: [],
        timeframes: ["1D", "4H"],
        confluenceCount: 2,
        score: 90,
      },
    ],
    limitations: ["Universe 88 emiten likuid, bukan seluruh bursa."],
  };
}

describe("telegram config", () => {
  it("parses env and authorises only the owner", () => {
    const parsed = loadTelegramConfig({
      TELEGRAM_BOT_TOKEN: "token",
      TELEGRAM_OWNER_ID: "42",
    } as unknown as NodeJS.ProcessEnv);
    expect(parsed?.ownerId).toBe(42);
    expect(isOwner(parsed!, { message: { from: { id: 42 } } })).toBe(true);
    expect(isOwner(parsed!, { message: { from: { id: 43 } } })).toBe(false);
    expect(isOwner({ ...parsed!, ownerId: null }, { message: { from: { id: 42 } } })).toBe(false);
  });
});

describe("telegram client helpers", () => {
  it("escapes HTML and keeps chunks under the limit with balanced tags", () => {
    expect(escapeTelegramHtml("<b>A & B</b>")).toBe("&lt;b&gt;A &amp; B&lt;/b&gt;");

    const chunks = splitTelegramMessage(`<b>${"x".repeat(9000)}</b>`);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(4096);
      const opens = (chunk.match(/<b>/g) || []).length;
      const closes = (chunk.match(/<\/b>/g) || []).length;
      expect(opens).toBe(closes);
    }
  });
});

describe("telegram formatters", () => {
  it("formats the brief with the top candidates and a disclaimer", () => {
    const text = formatBriefMessage(scan());
    expect(text).toContain("Telaah Harmonic Brief");
    expect(text).toContain("INCO");
    expect(text).toContain("PRZ");
    expect(text).toContain("Bukan rekomendasi");
  });

  it("formats a report without throwing on missing optional modules", () => {
    const text = formatReportMessage(
      {
        symbol: "BBCA",
        companyName: "Bank Central Asia",
        directAnswer: "Laba tumbuh sehat.",
        technical: { lastPrice: 5550, trendAssessment: "Neutral", rsi14: 48 },
        dataAsOf: "2026-09-30",
      } as any,
      "https://telaah.example"
    );
    expect(text).toContain("BBCA");
    expect(text).toContain("Rp 5.550");
    expect(text).toContain("Buka di Telaah 360");
  });
});

function makeDeps(overrides: Partial<TelegramHandlerDeps> = {}) {
  const sent: Array<{ chatId: string | number; text: string }> = [];
  const analyze = vi.fn(async (): Promise<AnalysisResult> => ({
    type: "message",
    message: "Balasan analisis.",
  }));
  const deps: TelegramHandlerDeps = {
    config,
    sendMessage: async (chatId, text) => {
      sent.push({ chatId, text });
    },
    analyze,
    runBrief: async () => ({ chatId: 42, text: "BRIEF RESULT" }),
    getLastSymbol: () => null,
    setLastSymbol: vi.fn(),
    alerts: {
      list: vi.fn(async () => ["BBCA"]),
      add: vi.fn(async () => ["BBCA", "BBRI"]),
      remove: vi.fn(async () => ["BBCA"]),
    },
    ...overrides,
  };
  return { deps, sent, analyze };
}

describe("telegram handler", () => {
  it("welcomes the owner on /start", async () => {
    const { deps, sent, analyze } = makeDeps();
    await handleTelegramUpdate(
      { update_id: 1, message: { from: { id: 42 }, chat: { id: 42 }, text: "/start" } },
      deps
    );
    expect(sent[0].text).toContain("Telaah 360");
    expect(analyze).not.toHaveBeenCalled();
  });

  it("acknowledges /brief before the scan finishes", async () => {
    const { deps, sent } = makeDeps();
    await handleTelegramUpdate(
      { update_id: 2, message: { from: { id: 42 }, chat: { id: 42 }, text: "/brief refresh" } },
      deps
    );
    expect(sent[0].text).toContain("brief harmonic baru");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sent.some((entry) => entry.text === "BRIEF RESULT")).toBe(true);
  });

  it("ignores strangers completely", async () => {
    const { deps, sent, analyze } = makeDeps();
    await handleTelegramUpdate(
      { update_id: 3, message: { from: { id: 99 }, chat: { id: 99 }, text: "halo" } },
      deps
    );
    expect(sent).toHaveLength(0);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("answers a greeting warmly without spending an LLM call", async () => {
    const { deps, sent, analyze } = makeDeps();
    await handleTelegramUpdate(
      { update_id: 4, message: { from: { id: 42 }, chat: { id: 42 }, text: "halo" } },
      deps
    );
    expect(sent[0].text).toContain("Halo!");
    expect(analyze).not.toHaveBeenCalled();
  });

  it("adds and removes alert symbols from chat", async () => {
    const { deps, sent } = makeDeps();
    await handleTelegramUpdate(
      { update_id: 6, message: { from: { id: 42 }, chat: { id: 42 }, text: "/watch BBRI" } },
      deps
    );
    expect(deps.alerts?.add).toHaveBeenCalledWith("BBRI");
    expect(sent[0].text).toContain("BBRI");

    await handleTelegramUpdate(
      { update_id: 7, message: { from: { id: 42 }, chat: { id: 42 }, text: "/unwatch BBCA" } },
      deps
    );
    expect(deps.alerts?.remove).toHaveBeenCalledWith("BBCA");
  });

  it("lists the alert watchlist", async () => {
    const { deps, sent } = makeDeps();
    await handleTelegramUpdate(
      { update_id: 8, message: { from: { id: 42 }, chat: { id: 42 }, text: "/watchlist" } },
      deps
    );
    expect(sent[0].text).toContain("Watchlist alert");
    expect(sent[0].text).toContain("BBCA");
  });

  it("uses the last symbol for a follow-up question", async () => {
    const { deps, analyze } = makeDeps({ getLastSymbol: () => "BBCA" });
    await handleTelegramUpdate(
      {
        update_id: 5,
        message: { from: { id: 42 }, chat: { id: 42 }, text: "risiko utamanya apa?" },
      },
      deps
    );
    expect(analyze).toHaveBeenCalledWith(
      expect.objectContaining({ confirmedSymbol: "BBCA", mode: "full" })
    );
  });
});
