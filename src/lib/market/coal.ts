const LISTING_BASE = "https://www.esdm.go.id/id/media-center/arsip-berita";
const LISTING_PAGES = 2;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

export interface CoalBenchmark {
  price: number;
  changePct: number;
  period: string | null;
  sourceUrl: string;
}

let cached: { quote: CoalBenchmark; expiresAt: number } | null = null;

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function parseLocalizedNumber(value: string): number {
  const raw = value.trim();
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  return Number(normalized);
}

function metaContent(html: string, key: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return null;
}

/**
 * HBA press releases follow the same sentence across periods, e.g.
 * "HBA periode 15-30 November 2026 sebesar USD 130,81 per ton,
 * naik USD 5,21 atau 4,15 persen".
 */
export function extractHbaQuote(
  html: string,
  sourceUrl: string
): CoalBenchmark | null {
  const description = metaContent(html, "og:description");
  const title = metaContent(html, "og:title");
  const text = description ?? html.replace(/<[^>]+>/g, " ");

  if (!/HBA|Harga Batubara Acuan/i.test(`${title ?? ""} ${text}`)) {
    return null;
  }

  const priceMatch = text.match(
    /sebesar\s+USD\s*([0-9][0-9.,]*)\s*(?:per|\/)\s*ton/i
  );
  if (!priceMatch) return null;
  const price = parseLocalizedNumber(priceMatch[1]);
  if (!Number.isFinite(price) || price <= 0) return null;

  const changeMatch = text.match(
    /(naik|turun|terkoreksi|melemah|menguat)\s+(?:USD\s*[0-9][0-9.,]*\s*(?:atau\s+)?)?([0-9][0-9.,]*)\s*persen/i
  );
  const changeValue = changeMatch
    ? parseLocalizedNumber(changeMatch[2])
    : 0;
  const declining = ["turun", "terkoreksi", "melemah"].includes(
    changeMatch?.[1]?.toLowerCase() ?? ""
  );
  const changePct = Number.isFinite(changeValue)
    ? changeValue * (declining ? -1 : 1)
    : 0;

  const periodMatch = text.match(
    /periode\s+([0-9]{1,2}\s*[-\u2013]\s*[0-9]{1,2}\s+[A-Za-z]+\s+\d{4}|(?:pertama|kedua)\s+[A-Za-z]+\s+\d{4})/i
  );

  return {
    price,
    changePct,
    period: periodMatch?.[1]?.replace(/\s+/g, " ") ?? null,
    sourceUrl,
  };
}

export function extractHbaArticleUrl(html: string): string | null {
  const match = html.match(
    /href=["']([^"']*\/arsip-berita\/hba-[^"']*)["']/i
  );
  if (!match?.[1]) return null;
  try {
    return new URL(match[1], LISTING_BASE).toString();
  } catch {
    return null;
  }
}

async function fetchText(
  url: string,
  fetchImpl: typeof fetch
): Promise<string | null> {
  try {
    const response = await fetchImpl(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function findLatestHbaArticle(
  fetchImpl: typeof fetch
): Promise<string | null> {
  for (let page = 1; page <= LISTING_PAGES; page += 1) {
    const html = await fetchText(`${LISTING_BASE}?page=${page}`, fetchImpl);
    if (!html) continue;
    const articleUrl = extractHbaArticleUrl(html);
    if (articleUrl) return articleUrl;
  }
  return null;
}

/**
 * Indonesian coal benchmark (HBA) from the Ministry of Energy and Mineral
 * Resources. HBA is set twice a month, so a six-hour cache is enough.
 */
export async function getCoalBenchmark(
  fetchImpl: typeof fetch = fetch
): Promise<CoalBenchmark | null> {
  if (cached && cached.expiresAt > Date.now()) return cached.quote;

  const articleUrl = await findLatestHbaArticle(fetchImpl);
  if (!articleUrl) return cached?.quote ?? null;

  const html = await fetchText(articleUrl, fetchImpl);
  if (!html) return cached?.quote ?? null;

  const quote = extractHbaQuote(html, articleUrl);
  if (!quote) return cached?.quote ?? null;

  cached = { quote, expiresAt: Date.now() + CACHE_TTL_MS };
  return quote;
}
