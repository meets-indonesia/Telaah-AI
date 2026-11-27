import { createHash } from "node:crypto";
import { getRedisReady } from "./redis";

const PREFIX = "telaah:cache:";
const MAX_MEMORY_ENTRIES = 200;

interface MemoryEntry {
  value: unknown;
  expiresAt: number;
}

const memory = new Map<string, MemoryEntry>();
const inFlight = new Map<string, Promise<unknown>>();

export function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function memoryGet<T>(key: string): T | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value as T;
}

function memorySet<T>(key: string, value: T, ttlSeconds: number): void {
  if (memory.size >= MAX_MEMORY_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
  memory.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
  });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const fullKey = `${PREFIX}${key}`;
  const client = await getRedisReady(250);
  if (client) {
    try {
      const raw = await client.get(fullKey);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      // Fall back to the in-process cache below.
    }
  }
  return memoryGet<T>(fullKey);
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  const fullKey = `${PREFIX}${key}`;
  memorySet(fullKey, value, ttlSeconds);
  const client = await getRedisReady(250);
  if (!client) return;
  try {
    await client.set(fullKey, JSON.stringify(value), "EX", Math.max(1, ttlSeconds));
  } catch {
    // The in-process cache still serves this instance.
  }
}

export async function cacheDel(key: string): Promise<void> {
  const fullKey = `${PREFIX}${key}`;
  memory.delete(fullKey);
  const client = await getRedisReady(250);
  if (!client) return;
  try {
    await client.del(fullKey);
  } catch {
    // Ignore cache invalidation failures.
  }
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<{ value: T; hit: boolean }> {
  const existing = await cacheGet<T>(key);
  if (existing !== null && existing !== undefined) {
    return { value: existing, hit: true };
  }

  const running = inFlight.get(key);
  if (running) {
    return { value: (await running) as T, hit: false };
  }

  const job = (async () => {
    const value = await loader();
    if (value !== null && value !== undefined) {
      await cacheSet(key, value, ttlSeconds);
    }
    return value;
  })();
  inFlight.set(key, job);
  try {
    return { value: await job, hit: false };
  } finally {
    inFlight.delete(key);
  }
}
