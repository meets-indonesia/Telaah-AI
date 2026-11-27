import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(async () => {}),
}));

vi.mock("@/lib/telegram/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/telegram/client")>();
  return {
    ...actual,
    createTelegramClient: () => ({
      sendMessage: mocks.sendMessage,
      getMe: async () => ({ id: 1, username: "telaah_bot" }),
      setWebhook: async () => {},
      deleteWebhook: async () => {},
      getWebhookInfo: async () => ({}),
    }),
  };
});

import { POST as postWebhook } from "../webhook/route";

function update(updateId: number, userId: number, text: string) {
  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      from: { id: userId },
      chat: { id: userId },
      text,
    },
  };
}

function request(body: unknown, secret?: string) {
  return new Request("http://localhost/api/telegram/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "x-telegram-bot-api-secret-token": secret } : {}),
    },
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
  vi.stubEnv("TELEGRAM_OWNER_ID", "42");
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "hook-secret");
  mocks.sendMessage.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/telegram/webhook", () => {
  it("returns 503 when the bot is not configured", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const response = await postWebhook(request(update(1, 42, "/start"), "hook-secret"));
    expect(response.status).toBe(503);
  });

  it("rejects a missing or wrong webhook secret", async () => {
    expect((await postWebhook(request(update(2, 42, "/start")))).status).toBe(401);
    expect((await postWebhook(request(update(3, 42, "/start"), "nope"))).status).toBe(401);
  });

  it("ignores messages from strangers", async () => {
    const response = await postWebhook(request(update(4, 99, "/start"), "hook-secret"));
    expect(response.status).toBe(200);
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it("answers the owner through the Bot API", async () => {
    const response = await postWebhook(request(update(5, 42, "/id"), "hook-secret"));
    expect(response.status).toBe(200);
    expect(mocks.sendMessage).toHaveBeenCalledWith(
      42,
      expect.stringContaining("Chat ID")
    );
  });
});
