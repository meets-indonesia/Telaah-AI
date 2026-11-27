import { NextRequest, NextResponse } from "next/server";
import { getRedisReady } from "@/lib/storage/redis";

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

export const RATE_LIMIT_RULES = {
  analyze: { limit: 12, windowMs: 10 * 60_000 },
  qa: { limit: 60, windowMs: 10 * 60_000 },
  compare: { limit: 30, windowMs: 10 * 60_000 },
  chart: { limit: 120, windowMs: 60_000 },
  chartStream: { limit: 30, windowMs: 60_000 },
  translate: { limit: 120, windowMs: 60_000 },
  alerts: { limit: 60, windowMs: 60_000 },
  alertsRun: { limit: 6, windowMs: 60_000 },
  backtest: { limit: 2, windowMs: 3_600_000 },
  harmonic: { limit: 90, windowMs: 60_000 },
  harmonicScan: { limit: 10, windowMs: 300_000 },
  harmonicStats: { limit: 6, windowMs: 300_000 },
  harmonicAlerts: { limit: 12, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;

const REDIS_PREFIX = "telaah:rl:";
const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memory = new Map<string, MemoryEntry>();
let memoryCalls = 0;

export function decisionFor(
  count: number,
  resetAt: number,
  rule: RateLimitRule,
  now: number
): RateLimitDecision {
  const allowed = count <= rule.limit;
  return {
    allowed,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetAt,
    retryAfter: allowed
      ? 0
      : Math.max(1, Math.ceil((resetAt - now) / 1000)),
  };
}

export function clientIp(req: NextRequest): string {
  const cloudflare = req.headers.get("cf-connecting-ip")?.trim();
  if (cloudflare) return cloudflare;

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;

  return req.headers.get("x-real-ip")?.trim() || "local";
}

function memoryDecision(
  key: string,
  rule: RateLimitRule,
  now: number
): RateLimitDecision {
  memoryCalls += 1;
  if (memoryCalls % 128 === 0) {
    for (const [entryKey, entry] of memory) {
      if (entry.resetAt <= now) memory.delete(entryKey);
    }
  }

  const current = memory.get(key);
  const entry =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + rule.windowMs }
      : current;
  entry.count += 1;
  memory.set(key, entry);

  return decisionFor(entry.count, entry.resetAt, rule, now);
}

export async function consumeRateLimit(
  bucket: string,
  identifier: string,
  rule: RateLimitRule,
  now = Date.now()
): Promise<RateLimitDecision> {
  const key = `${bucket}:${identifier}`;
  const client = await getRedisReady(400);

  if (client) {
    try {
      const raw = (await client.eval(
        INCREMENT_SCRIPT,
        1,
        `${REDIS_PREFIX}${key}`,
        rule.windowMs
      )) as [number | string, number | string];
      const count = Number(raw[0]);
      const ttl = Number(raw[1]);
      const resetAt = now + (Number.isFinite(ttl) && ttl > 0 ? ttl : rule.windowMs);
      return decisionFor(count, resetAt, rule, now);
    } catch {
      // Redis is optional; use the in-process window below.
    }
  }

  return memoryDecision(key, rule, now);
}

export async function guardRateLimit(
  req: NextRequest,
  bucket: keyof typeof RATE_LIMIT_RULES,
  rule: RateLimitRule
): Promise<NextResponse | null> {
  if (process.env.RATE_LIMIT_ENABLED === "false") return null;

  const decision = await consumeRateLimit(bucket, clientIp(req), rule);
  if (decision.allowed) return null;

  return NextResponse.json(
    {
      error: `Terlalu banyak permintaan. Coba lagi dalam ${decision.retryAfter} detik.`,
      retryAfter: decision.retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(decision.retryAfter),
        "X-RateLimit-Limit": String(decision.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.floor(decision.resetAt / 1000)),
      },
    }
  );
}

export function resetRateLimitStateForTests(): void {
  memory.clear();
  memoryCalls = 0;
}
