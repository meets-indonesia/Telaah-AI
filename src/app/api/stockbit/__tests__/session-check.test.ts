import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/market/stockbit-session", () => ({
  checkStockbitSession: vi.fn(async () => ({
    status: { configured: true, logged_in: true },
    alert: null,
    sent: false,
    message: null,
  })),
}));

import { POST } from "../session-check/route";
import { resetRateLimitStateForTests } from "@/lib/security/rate-limit";

const previous = process.env.ALERT_SECRET;

afterEach(() => {
  resetRateLimitStateForTests();
  if (previous === undefined) delete process.env.ALERT_SECRET;
  else process.env.ALERT_SECRET = previous;
});

function request(secret?: string): NextRequest {
  return new NextRequest("http://localhost/api/stockbit/session-check", {
    method: "POST",
    headers: secret ? { "x-alert-secret": secret } : {},
  });
}

describe("/api/stockbit/session-check", () => {
  it("requires ALERT_SECRET", async () => {
    delete process.env.ALERT_SECRET;
    expect((await POST(request("x"))).status).toBe(503);
  });

  it("rejects a wrong secret", async () => {
    process.env.ALERT_SECRET = "session-secret";
    expect((await POST(request("wrong"))).status).toBe(401);
  });

  it("accepts the configured secret", async () => {
    process.env.ALERT_SECRET = "session-secret";
    const response = await POST(request("session-secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, sent: false });
  });
});
