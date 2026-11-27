import { XMLParser } from "fast-xml-parser";
import type { NewsItem } from "@/lib/sectors/types";

const NEWS_BASE = "https://news.google.com/rss/search";
const CACHE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 5;
const REQUEST_TIMEOUT_MS = 10_000;

const parser = new XMLParser({
  ignoreAttributes: true,
  processEntities: true,
  htmlEntities: true,
  parseTagValue: false,
  trimValues: true,
});

interface RssItem {
  title?: unknown;
  link?: unknown;
  pubDate?: unknown;
  source?: unknown;
}

interface RssBody {
  rss?: { channel?: { item?: RssItem | RssItem[] } };
}

interface NewsCacheEntry {
  items: NewsItem[];
  expiresAt: number;
}

const cache = new Map<string, NewsCacheEntry>();

function asText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? text : undefined;
  }
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return asText(record["#text"]);
  }
  return undefined;
}

function stripSourceSuffix(title: string, source: string | undefined): string {
  if (!source) return title;
  const suffix = ` - ${source}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
}

function toNewsItem(item: RssItem): NewsItem | null {
  const title = asText(item.title);
  if (!title) return null;

  const source = asText(item.source);
  const link = asText(item.link);
  const pubDate = asText(item.pubDate);

  const news: NewsItem = { title: stripSourceSuffix(title, source) };
  if (link) news.url = link;
  if (source) news.source = source;
  if (pubDate) {
    const ms = Date.parse(pubDate);
    // Keep an unparseable date as-is instead of inventing one.
    news.published_at = Number.isNaN(ms) ? pubDate : new Date(ms).toISOString();
  }
  return news;
}

function parseRss(xml: string): NewsItem[] {
  const parsed = parser.parse(xml) as RssBody;
  const raw = parsed?.rss?.channel?.item;
  const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return items
    .map(toNewsItem)
    .filter((item): item is NewsItem => item !== null);
}

/**
 * Indonesian Google News headlines for a ticker. Failures return an empty list:
 * a missing headline is better than a fabricated one.
 */
export function extractNewsImage(
  html: string,
  baseUrl: string
): string | null {
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const raw = match?.[1]?.trim();
    if (!raw) continue;
    try {
      const url = new URL(raw.replace(/&amp;/g, "&"), baseUrl).toString();
      return /^https?:\/\//i.test(url) ? url : null;
    } catch {
      return null;
    }
  }
  return null;
}

const imageCache = new Map<string, { image: string | null; expiresAt: number }>();
const decodedCache = new Map<string, { url: string | null; expiresAt: number }>();
const BATCHEXECUTE_URL =
  "https://news.google.com/_/DotsSplashUi/data/batchexecute";
const GARTURLREQ_CTX: unknown[] = [
  ["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1],
  "X",
  "X",
  1,
  [1, 1, 1],
  1,
  1,
  null,
  0,
  0,
  null,
  0,
];

function articleId(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);
    if (url.hostname !== "news.google.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const index = parts.lastIndexOf("articles");
    if (index >= 0 && parts[index + 1]) return parts[index + 1];
    const readIndex = parts.lastIndexOf("read");
    if (readIndex >= 0 && parts[readIndex + 1]) return parts[readIndex + 1];
    return null;
  } catch {
    return null;
  }
}

function paramsPageUrl(id: string, sourceUrl: string): string {
  const url = new URL(sourceUrl);
  const hl = url.searchParams.get("hl") ?? "id";
  const gl = url.searchParams.get("gl") ?? "ID";
  const ceid = url.searchParams.get("ceid") ?? "ID:id";
  return `https://news.google.com/rss/articles/${id}?hl=${encodeURIComponent(
    hl
  )}&gl=${encodeURIComponent(gl)}&ceid=${encodeURIComponent(ceid)}`;
}

async function fetchDecodingParams(
  id: string,
  sourceUrl: string,
  fetchImpl: typeof fetch
): Promise<{ id: string; ts: string; sg: string } | null> {
  try {
    const response = await fetchImpl(paramsPageUrl(id, sourceUrl), {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
    if (!sg || !ts) return null;
    return { id, ts, sg };
  } catch {
    return null;
  }
}

function parseBatchResponse(
  text: string
): Array<{ id: string | null; url: string }> {
  let body = text;
  if (body.includes("\n\n")) {
    body = body.slice(body.indexOf("\n\n") + 2);
  }
  body = body.trim();
  if (body.startsWith(")]}'")) body = body.slice(4).trim();
  let rows: unknown;
  try {
    rows = JSON.parse(body);
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];
  const decoded: Array<{ id: string | null; url: string }> = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 3) continue;
    if (row[0] !== "wrb.fr" && row[1] !== "Fbv4je") continue;
    let payload = row[2];
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        continue;
      }
    }
    if (
      !Array.isArray(payload) ||
      payload[0] !== "garturlres" ||
      typeof payload[1] !== "string"
    ) {
      continue;
    }

    // Google returns rows out of order. The caller's index is echoed in the
    // trailing cells, so map by that id instead of response order.
    let id: string | null = null;
    for (let i = row.length - 1; i >= 3; i -= 1) {
      const cell = row[i];
      if (cell !== null && cell !== undefined) {
        id = String(cell);
        break;
      }
    }
    decoded.push({ id, url: payload[1] });
  }
  return decoded;
}

async function decodeGoogleNewsUrls(
  urls: string[],
  fetchImpl: typeof fetch
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const pending: Array<{ source: string; id: string; ts: string; sg: string }> = [];
  for (const source of urls) {
    const cached = decodedCache.get(source);
    if (cached && cached.expiresAt > Date.now()) {
      if (cached.url) result.set(source, cached.url);
      continue;
    }
    const id = articleId(source);
    if (!id) {
      decodedCache.set(source, { url: null, expiresAt: Date.now() + CACHE_TTL_MS });
      continue;
    }
    const params = await fetchDecodingParams(id, source, fetchImpl);
    if (!params) {
      decodedCache.set(source, { url: null, expiresAt: Date.now() + CACHE_TTL_MS });
      continue;
    }
    pending.push({ source, ...params });
  }
  if (pending.length === 0) return result;

  const envelopes = pending.map((entry, index) => [
    "Fbv4je",
    JSON.stringify([
      "garturlreq",
      GARTURLREQ_CTX,
      entry.id,
      Number(entry.ts) || entry.ts,
      entry.sg,
    ]),
    null,
    String(index),
  ]);
  try {
    const response = await fetchImpl(BATCHEXECUTE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
      },
      body: `f.req=${encodeURIComponent(JSON.stringify([envelopes]))}`,
      signal: AbortSignal.timeout(10_000),
    });
    const decoded = response.ok ? parseBatchResponse(await response.text()) : [];
    const byId = new Map<string, string>();
    const ordered: string[] = [];
    for (const row of decoded) {
      if (row.id !== null) byId.set(row.id, row.url);
      ordered.push(row.url);
    }
    pending.forEach((entry, index) => {
      const url =
        byId.get(String(index)) ??
        (byId.size === 0 ? ordered[index] : undefined);
      if (url) result.set(entry.source, url);
      decodedCache.set(entry.source, {
        url: url ?? null,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    });
  } catch {
    for (const entry of pending) {
      decodedCache.set(entry.source, {
        url: null,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
    }
  }
  return result;
}

async function fetchArticleImage(
  url: string,
  fetchImpl: typeof fetch
): Promise<string | null> {
  const cached = imageCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.image;
  try {
    const response = await fetchImpl(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) {
      imageCache.set(url, { image: null, expiresAt: Date.now() + CACHE_TTL_MS });
      return null;
    }
    const html = await response.text();
    const image = extractNewsImage(html, response.url || url);
    imageCache.set(url, { image, expiresAt: Date.now() + CACHE_TTL_MS });
    return image;
  } catch {
    imageCache.set(url, { image: null, expiresAt: Date.now() + CACHE_TTL_MS });
    return null;
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        results[index] = await worker(items[index]);
      }
    })
  );
  return results;
}

export async function enrichNewsItems(
  items: NewsItem[],
  fetchImpl: typeof fetch = fetch
): Promise<NewsItem[]> {
  const googleUrls = items
    .map((item) => item.url)
    .filter((url): url is string => Boolean(url && articleId(url)));
  const decoded = await decodeGoogleNewsUrls(googleUrls, fetchImpl);

  return mapLimit(items, 6, async (item) => {
    if (!item.url) return item;
    const publisherUrl = decoded.get(item.url) ?? item.url;
    const image = await fetchArticleImage(publisherUrl, fetchImpl);
    return {
      ...item,
      url: publisherUrl,
      ...(image ? { image } : {}),
    };
  });
}

export async function fetchGoogleNewsWithImages(
  symbol: string,
  limit: number = DEFAULT_LIMIT,
  fetchImpl: typeof fetch = fetch
): Promise<NewsItem[]> {
  const items = await fetchGoogleNews(symbol, limit, fetchImpl);
  return enrichNewsItems(items, fetchImpl);
}

export async function fetchGoogleNews(
  symbol: string,
  limit: number = DEFAULT_LIMIT,
  fetchImpl: typeof fetch = fetch
): Promise<NewsItem[]> {
  const clean = symbol.trim().toUpperCase();
  if (!clean) return [];

  const wanted = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT;

  const cached = cache.get(clean);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.items.slice(0, wanted);
  }

  const url = `${NEWS_BASE}?q=${encodeURIComponent(clean)}+saham&hl=id&gl=ID&ceid=ID:id`;

  try {
    const res = await fetchImpl(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const items = parseRss(xml);
    cache.set(clean, { items, expiresAt: Date.now() + CACHE_TTL_MS });
    return items.slice(0, wanted);
  } catch {
    return [];
  }
}
