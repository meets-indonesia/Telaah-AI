import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AlertDataSource, AlertDedupe } from "../run";
import { createMemoryDedupe, formatAlertMessage, runAlertScan } from "../run";
import { saveAlertWatchlist, DEFAULT_ALERT_RULES } from "../store";
import type { DailyTransaction } from "@/lib/sectors/types";

const folders: string[] = [];

async function tempWatchlist(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), "telaah-alert-run-"));
  folders.push(folder);
  return path.join(folder, "watchlist.json");
}

afterEach(async () => {
  await Promise.all(
    folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true }))
  );
});

function candlesFor(symbol: string, close: number, volume: number): DailyTransaction[] {
  const rows = Array.from({ length: 20 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 1 + index)).toISOString().slice(0, 10);
    return {
      symbol,
      date,
      open: 1000,
      high: 1010,
      low: 990,
      close: 1000,
      volume: 1000,
    };
  });
  rows.push({
    symbol,
    date: "2026-10-21",
    open: 1000,
    high: 1100,
    low: 1000,
    close,
    volume,
  });
  return rows;
}

function source(overrides: Partial<AlertDataSource> = {}): AlertDataSource {
  return {
    getDailyTransactions: vi.fn(async (symbol: string) =>
      candlesFor(symbol, 1070, 3000)
    ),
    getForeignFlow: vi.fn(async () => ({
      symbol: "BBCA",
      data: [
        {
          date: "2026-10-21",
          net_foreign_inflow: 75_000_000_000,
          net_foreign_shares: 1_000_000,
        },
      ],
    })),
    ...overrides,
  };
}

describe("alert scan", () => {
  it("sends one Telegram message per new signal", async () => {
    const watchlistPath = await tempWatchlist();
    await saveAlertWatchlist(
      {
        symbols: ["BBCA"],
        rules: DEFAULT_ALERT_RULES,
        updatedAt: new Date().toISOString(),
      },
      watchlistPath
    );
    const sendMessage = vi.fn(async (_chatId: string | number, _text: string) => {});
    const result = await runAlertScan({
      watchlistPath,
      now: new Date("2026-10-21T10:00:00Z"),
      source: source(),
      sender: { sendMessage },
      chatId: 42,
      dedupe: createMemoryDedupe(),
      sleep: async () => {},
    });

    expect(result.scanned).toBe(1);
    expect(result.sent).toBe(4);
    expect(sendMessage).toHaveBeenCalledTimes(4);
    expect(sendMessage.mock.calls[0][1]).toContain("BBCA");
  });

  it("does not send the same signal twice", async () => {
    const watchlistPath = await tempWatchlist();
    await saveAlertWatchlist(
      {
        symbols: ["BBCA"],
        rules: DEFAULT_ALERT_RULES,
        updatedAt: new Date().toISOString(),
      },
      watchlistPath
    );
    const sendMessage = vi.fn(async (_chatId: string | number, _text: string) => {});
    const dedupe: AlertDedupe = createMemoryDedupe();
    const options = {
      watchlistPath,
      now: new Date("2026-10-21T10:00:00Z"),
      source: source(),
      sender: { sendMessage },
      chatId: 42,
      dedupe,
      sleep: async () => {},
    };

    await runAlertScan(options);
    const second = await runAlertScan(options);

    expect(second.sent).toBe(0);
    expect(second.skipped).toBe(4);
  });

  it("does not consume dedupe keys during a dry run", async () => {
    const watchlistPath = await tempWatchlist();
    await saveAlertWatchlist(
      {
        symbols: ["BBCA"],
        rules: DEFAULT_ALERT_RULES,
        updatedAt: new Date().toISOString(),
      },
      watchlistPath
    );
    const sendMessage = vi.fn(async (_chatId: string | number, _text: string) => {});
    const dedupe = createMemoryDedupe();
    const base = {
      watchlistPath,
      now: new Date("2026-10-21T10:00:00Z"),
      source: source(),
      sender: { sendMessage },
      chatId: 42,
      dedupe,
      sleep: async () => {},
    };

    const dry = await runAlertScan({ ...base, dryRun: true });
    expect(dry.sent).toBe(0);
    expect(dry.messages).toHaveLength(4);
    expect(sendMessage).not.toHaveBeenCalled();

    const live = await runAlertScan({ ...base, dryRun: false });
    expect(live.sent).toBe(4);
    expect(sendMessage).toHaveBeenCalledTimes(4);
  });

  it("keeps scanning when one symbol fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const watchlistPath = await tempWatchlist();
    await saveAlertWatchlist(
      {
        symbols: ["FAIL", "BBCA"],
        rules: DEFAULT_ALERT_RULES,
        updatedAt: new Date().toISOString(),
      },
      watchlistPath
    );
    const sendMessage = vi.fn(async (_chatId: string | number, _text: string) => {});
    const result = await runAlertScan({
      watchlistPath,
      now: new Date("2026-10-21T10:00:00Z"),
      source: source({
        getDailyTransactions: vi.fn(async (symbol: string) => {
          if (symbol === "FAIL") throw new Error("upstream down");
          return candlesFor(symbol, 1070, 3000);
        }),
      }),
      sender: { sendMessage },
      chatId: 42,
      dedupe: createMemoryDedupe(),
      sleep: async () => {},
    });

    expect(result.errors).toBe(1);
    expect(result.sent).toBeGreaterThan(0);
    errorSpy.mockRestore();
  });

  it("stays quiet when there are no signals", async () => {
    const watchlistPath = await tempWatchlist();
    await saveAlertWatchlist(
      {
        symbols: ["BBCA"],
        rules: DEFAULT_ALERT_RULES,
        updatedAt: new Date().toISOString(),
      },
      watchlistPath
    );
    const sendMessage = vi.fn(async (_chatId: string | number, _text: string) => {});
    const result = await runAlertScan({
      watchlistPath,
      now: new Date("2026-10-21T10:00:00Z"),
      source: source({
        getDailyTransactions: vi.fn(async (symbol: string) =>
          candlesFor(symbol, 1000, 1000)
        ),
        getForeignFlow: vi.fn(async () => ({ symbol: "BBCA", data: [] })),
      }),
      sender: { sendMessage },
      chatId: 42,
      dedupe: createMemoryDedupe(),
      sleep: async () => {},
    });

    expect(result.sent).toBe(0);
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

describe("alert message", () => {
  it("includes the symbol, signal, and chart link", () => {
    const text = formatAlertMessage(
      {
        kind: "breakout_high",
        symbol: "BBCA",
        title: "Tembus high",
        detail: "Close Rp 6.000",
        severity: "info",
        value: 6000,
        date: "2026-10-21",
      },
      "https://telaah.example"
    );
    expect(text).toContain("BBCA");
    expect(text).toContain("Tembus high");
    expect(text).toContain("https://telaah.example/chart?symbol=BBCA");
  });
});
