import { describe, expect, it, vi } from "vitest";
import {
  assessStockbitSession,
  checkStockbitSession,
  formatStockbitSessionAlert,
  type StockbitSessionStatus,
} from "../stockbit-session";
import { createMemoryDedupe } from "@/lib/alerts/run";

const now = new Date("2026-11-24T10:00:00Z");

function status(overrides: Partial<StockbitSessionStatus> = {}): StockbitSessionStatus {
  return {
    configured: true,
    logged_in: true,
    expired: false,
    source: "file",
    access_expires_at: "2026-11-25T06:30:03+00:00",
    refresh_expires_at: "2026-12-01T06:30:03+00:00",
    limitations: [],
    ...overrides,
  };
}

describe("stockbit session assessment", () => {
  it("warns when no session is configured", () => {
    expect(assessStockbitSession(status({ configured: false }), now)?.kind).toBe(
      "missing"
    );
  });

  it("warns when the session is expired or logged out", () => {
    expect(assessStockbitSession(status({ expired: true }), now)?.kind).toBe(
      "expired"
    );
    expect(assessStockbitSession(status({ logged_in: false }), now)?.kind).toBe(
      "expired"
    );
  });

  it("alerts at 72 hours and again at 24 hours", () => {
    const in48h = new Date(now.getTime() + 48 * 3600_000).toISOString();
    const in10h = new Date(now.getTime() + 10 * 3600_000).toISOString();
    expect(
      assessStockbitSession(status({ refresh_expires_at: in48h }), now)?.kind
    ).toBe("refresh_72h");
    expect(
      assessStockbitSession(status({ refresh_expires_at: in10h }), now)?.kind
    ).toBe("refresh_24h");
  });

  it("stays quiet when the refresh token still has days left", () => {
    expect(assessStockbitSession(status(), now)).toBeNull();
  });
});

describe("stockbit session message", () => {
  it("contains the expiry date and the one-command login helper", () => {
    const alert = assessStockbitSession(
      status({ refresh_expires_at: "2026-11-26T06:30:03+00:00" }),
      now
    );
    expect(alert).not.toBeNull();
    const text = formatStockbitSessionAlert(alert!);
    expect(text).toContain("26 Nov 2026");
    expect(text).toContain("./deploy/podman/stockbit-login.sh");
    expect(text).toContain("docs/PHASE2_IDX_SCRAPER.md");
  });
});

describe("stockbit session check", () => {
  it("sends once and deduplicates the same expiry", async () => {
    const send = vi.fn(async (_chatId: string | number, _text: string) => {});
    const dedupe = createMemoryDedupe();
    const options = {
      getStatus: async () =>
        status({ refresh_expires_at: "2026-11-26T06:30:03+00:00" }),
      send,
      chatId: 42,
      dedupe,
      now,
    };
    const first = await checkStockbitSession(options);
    const second = await checkStockbitSession(options);

    expect(first.sent).toBe(true);
    expect(second.sent).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("reports an unavailable scraper without throwing", async () => {
    const send = vi.fn(async (_chatId: string | number, _text: string) => {});
    const result = await checkStockbitSession({
      getStatus: async () => null,
      send,
      chatId: 42,
      dedupe: createMemoryDedupe(),
      now,
    });
    expect(result.alert?.kind).toBe("unavailable");
    expect(send).toHaveBeenCalledTimes(1);
  });
});
