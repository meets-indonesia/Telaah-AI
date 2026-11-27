import Redis from "ioredis";
import crypto from "crypto";

let redisClient: Redis | null = null;
const memoryCache = new Map<string, string>();

/**
 * Wait briefly for the shared connection to become usable. Chart streaming
 * calls this on the request path, so it must never hang when Redis is down.
 */
export async function getRedisReady(timeoutMs = 750): Promise<Redis | null> {
  const client = getRedisClient();
  if (!client) return null;
  if (client.status === "ready") return client;
  if (client.status === "end") return null;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: Redis | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.off("ready", onReady);
      client.off("end", onEnd);
      resolve(value);
    };
    const onReady = () => finish(client);
    const onEnd = () => finish(null);
    const timer = setTimeout(() => finish(null), timeoutMs);
    client.once("ready", onReady);
    client.once("end", onEnd);
    if (client.status === "ready") onReady();
  });
}

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      retryStrategy: () => null, // don't spam if redis offline
      lazyConnect: true,
    });

    client.on("error", (err) => {
      // Keep quiet on offline redis fallback
      if (process.env.NODE_ENV === "development") {
        // silent fallback to memory cache
      }
    });

    redisClient = client;
    client.connect().catch(() => {
      // offline fallback
    });
    return redisClient;
  } catch (e) {
    return null;
  }
}

export function makeTranslationKey(text: string, targetLang: string): string {
  const hash = crypto.createHash("sha256").update(text.trim()).digest("hex");
  return `tr:${targetLang}:${hash}`;
}

export async function getCachedTranslation(text: string, targetLang: string): Promise<string | null> {
  const key = makeTranslationKey(text, targetLang);
  const client = getRedisClient();

  if (client && client.status === "ready") {
    try {
      const cached = await client.get(key);
      if (cached) return cached;
    } catch (e) {
      // fall through
    }
  }

  return memoryCache.get(key) || null;
}

export async function setCachedTranslation(text: string, targetLang: string, translated: string): Promise<void> {
  const key = makeTranslationKey(text, targetLang);
  memoryCache.set(key, translated);

  const client = getRedisClient();
  if (client && client.status === "ready") {
    try {
      // Cache indefinitely / 30 days
      await client.set(key, translated, "EX", 60 * 60 * 24 * 30);
    } catch (e) {
      // ignore redis write error
    }
  }
}
