import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sampleScan = {
  generatedAt: "2026-11-24T01:00:00.000Z",
  date: "2026-11-24",
  universeSize: 88,
  scanned: 87,
  failed: 1,
  results: [],
  limitations: [],
};

const mocks = vi.hoisted(() => ({
  scanHarmonicUniverse: vi.fn(),
  sendHarmonicBrief: vi.fn(),
}));

vi.mock("@/lib/screener/harmonic-screener", () => ({
  scanHarmonicUniverse: mocks.scanHarmonicUniverse,
}));
vi.mock("@/lib/telegram/brief", () => ({
  sendHarmonicBrief: mocks.sendHarmonicBrief,
}));

const { scanHarmonicUniverse, sendHarmonicBrief } = mocks;

import { POST as postBrief } from "../harmonic/route";

function request(query = "", headers: Record<string, string> = {}) {
  return new Request(`http://localhost/api/brief/harmonic${query}`, {
    method: "POST",
    headers,
  }) as any;
}

beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
  vi.stubEnv("TELEGRAM_OWNER_ID", "42");
  vi.stubEnv("BRIEF_SECRET", "brief-secret");
  scanHarmonicUniverse.mockReset();
  scanHarmonicUniverse.mockResolvedValue(sampleScan);
  sendHarmonicBrief.mockReset();
  sendHarmonicBrief.mockResolvedValue({
    scan: sampleScan,
    text: "brief",
    chatId: 42,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/brief/harmonic", () => {
  it("rejects a missing or wrong secret", async () => {
    const response = await postBrief(request());
    expect(response.status).toBe(401);
    const wrong = await postBrief(request("", { "x-brief-secret": "nope" }));
    expect(wrong.status).toBe(401);
    expect(sendHarmonicBrief).not.toHaveBeenCalled();
  });

  it("returns a dry-run preview without sending", async () => {
    const response = await postBrief(
      request("?dry=1&refresh=1", { "x-brief-secret": "brief-secret" })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.dry).toBe(true);
    expect(body.preview).toContain("Telaah Harmonic Brief");
    expect(scanHarmonicUniverse).toHaveBeenCalledWith({ refresh: true });
    expect(sendHarmonicBrief).not.toHaveBeenCalled();
  });

  it("sends the brief when not in dry-run mode", async () => {
    const response = await postBrief(
      request("", { authorization: "Bearer brief-secret" })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sent).toBe(true);
    expect(sendHarmonicBrief).toHaveBeenCalledWith({ refresh: false });
  });
});
