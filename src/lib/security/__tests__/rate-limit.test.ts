import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage/redis", () => ({
  getRedisReady: vi.fn().mockResolvedValue(null),
}));

import { getRedisReady } from "@/lib/storage/redis";
import {
  clientIp,
  consumeRateLimit,
  decisionFor,
  guardRateLimit,
  resetRateLimitStateForTests,
  type RateLimitRule,
} from "../rate-limit";

const rule: RateLimitRule = { limit: 2, windowMs: 60_000 };
const now = 1_800_000_000_000;

describe("rate limit decisions", () => {
  it("allows requests up to the limit and reports the remainder", () => {
    expect(decisionFor(1, now + 60_000, rule, now)).toEqual({
      allowed: true,
      limit: 2,
      remaining: 1,
      resetAt: now + 60_000,
      retryAfter: 0,
    });

    expect(decisionFor(2, now + 60_000, rule, now)).toEqual({
      allowed: true,
      limit: 2,
      remaining: 0,
      resetAt: now + 60_000,
      retryAfter: 0,
    });
  });

  it("denies the request after the limit with a retry delay", () => {
    const decision = decisionFor(3, now + 60_000, rule, now);
    expect(decision.allowed).toBe(false);
    expect(decision.remaining).toBe(0);
    expect(decision.retryAfter).toBe(60);
  });
});

describe("client identity", () => {
  it("prefers the Cloudflare client IP", () => {
    const request = new NextRequest("http://localhost/api/analyze", {
      headers: {
        "cf-connecting-ip": "203.0.113.7",
        "x-forwarded-for": "198.51.100.4, 198.51.100.5",
      },
    });
    expect(clientIp(request)).toBe("203.0.113.7");
  });

  it("falls back to the first forwarded IP, then to local", () => {
    expect(
      clientIp(
        new NextRequest("http://localhost/api/analyze", {
          headers: { "x-forwarded-for": "198.51.100.4, 198.51.100.5" },
        })
      )
    ).toBe("198.51.100.4");
    expect(
      clientIp(new NextRequest("http://localhost/api/analyze"))
    ).toBe("local");
  });
});

describe("memory fallback", () => {
  beforeEach(() => {
    resetRateLimitStateForTests();
  });

  it("allows the limit then denies the next request", async () => {
    const first = await consumeRateLimit("analyze", "1.2.3.4", rule, now);
    const second = await consumeRateLimit("analyze", "1.2.3.4", rule, now + 1);
    const third = await consumeRateLimit("analyze", "1.2.3.4", rule, now + 2);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(third.retryAfter).toBe(60);
  });

  it("uses Redis counters when Redis is available", async () => {
    const evalMock = vi.fn().mockResolvedValue([2, 30_000]);
    vi.mocked(getRedisReady).mockResolvedValueOnce({
      eval: evalMock,
    } as unknown as Awaited<ReturnType<typeof getRedisReady>>);

    const decision = await consumeRateLimit(
      "analyze",
      "203.0.113.10",
      { limit: 5, windowMs: 60_000 },
      now
    );

    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(3);
    expect(decision.resetAt).toBe(now + 30_000);
    expect(evalMock).toHaveBeenCalledOnce();
  });

  it("falls back to memory when Redis eval fails", async () => {
    vi.mocked(getRedisReady).mockResolvedValueOnce({
      eval: vi.fn().mockRejectedValue(new Error("redis down")),
    } as unknown as Awaited<ReturnType<typeof getRedisReady>>);

    const decision = await consumeRateLimit("analyze", "203.0.113.11", rule, now);
    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(1);
  });

  it("starts a fresh window after the reset time", async () => {
    await consumeRateLimit("analyze", "1.2.3.4", rule, now);
    await consumeRateLimit("analyze", "1.2.3.4", rule, now + 1);
    const blocked = await consumeRateLimit("analyze", "1.2.3.4", rule, now + 2);
    const nextWindow = await consumeRateLimit(
      "analyze",
      "1.2.3.4",
      rule,
      now + 60_001
    );

    expect(blocked.allowed).toBe(false);
    expect(nextWindow.allowed).toBe(true);
  });
});

describe("guardRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStateForTests();
  });

  it("returns null while allowed and a 429 response after the limit", async () => {
    const request = new NextRequest("http://localhost/api/analyze", {
      headers: { "cf-connecting-ip": "203.0.113.9" },
    });

    expect(await guardRateLimit(request, "analyze", rule)).toBeNull();
    expect(await guardRateLimit(request, "analyze", rule)).toBeNull();

    const blocked = await guardRateLimit(request, "analyze", rule);
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("retry-after")).toBeTruthy();
    const body = await blocked?.json();
    expect(body.error).toContain("Terlalu banyak permintaan");
  });
});
