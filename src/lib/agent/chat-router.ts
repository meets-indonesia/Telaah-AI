/**
 * Utility for context-aware chat intent routing and IDX ticker extraction.
 * Distinguishes genuine IDX tickers from common 4-letter Indonesian/English words,
 * handles follow-up context (e.g., "bila dibandingkan dengan WIFI"), and maintains conversational continuity.
 */

// Common 4-letter words in Indonesian and English that must never be mistaken for stock tickers
const COMMON_WORDS_BLACKLIST = new Set([
  "BILA", "JIKA", "NGAN", "DENG", "SAMA", "DARI", "PADA", "AKAN", "YANG", "TAPI",
  "JUGA", "KITA", "KAMI", "SAYA", "KAMU", "NAMA", "BUAT", "BISA", "DONG", "KALO",
  "ATAU", "BAIK", "DULU", "HARI", "LALU", "KINI", "ESOK", "SAAT", "PULA", "DEMI",
  "CARA", "AGAR", "BIAR", "DAPAT", "MAKA", "LEBI", "KURG", "TIDK", "TIDA", "BANY",
  "SEDI", "LIAT", "CEKK", "BAGI", "MANA", "GIMA", "APAK", "TENT", "SUDA", "BELU",
  "INFO", "DATA", "POST", "CHAT", "USER", "BOTS", "FULL", "FREE", "TEST", "WITH",
  "WHEN", "WHAT", "MORE", "LESS", "GOOD", "MUCH", "SOME", "MANY", "VERY", "JUST",
  "WELL", "HAVE", "BEEN", "WILL", "FROM", "THEM", "THEY", "THIS", "THAT", "HERE",
]);

/**
 * Extract legitimate 4-letter IDX tickers from a user prompt.
 */
export function extractValidTickers(text: string): string[] {
  const found: string[] = [];

  // 1. Explicitly tagged tickers: "saham inet", "emiten wifi", "$BBCA"
  const taggedMatches = text.matchAll(/(?:saham|emiten|kode|\$)\s*([a-zA-Z]{4})\b/gi);
  for (const m of taggedMatches) {
    const sym = m[1].toUpperCase();
    if (!COMMON_WORDS_BLACKLIST.has(sym) && !found.includes(sym)) {
      found.push(sym);
    }
  }

  // 2. All-caps 4-letter words in the prompt: e.g. "WIFI", "BBCA", "INET"
  const capsMatches = text.matchAll(/\b([A-Z]{4})\b/g);
  for (const m of capsMatches) {
    const sym = m[1].toUpperCase();
    if (!COMMON_WORDS_BLACKLIST.has(sym) && !found.includes(sym)) {
      found.push(sym);
    }
  }

  return found;
}

export interface ComparisonIntent {
  isCompare: boolean;
  symbolA?: string;
  symbolB?: string;
}

/**
 * Context-aware comparison detector.
 * Supports:
 * - Direct: "BBCA vs BBRI" -> [BBCA, BBRI]
 * - Follow-up: "bila dibandingkan dengan WIFI bagaimana?" with activeSymbol INET -> [INET, WIFI]
 */
export function detectComparisonIntent(
  userText: string,
  activeSymbol?: string
): ComparisonIntent {
  const isComparePhrase =
    /(?:bandingkan|dibandingkan|komparasi|versus|\bvs\b|lawan|head[- ]to[- ]head)/i.test(userText);

  if (!isComparePhrase) {
    return { isCompare: false };
  }

  const tickers = extractValidTickers(userText);

  // Case 1: Two explicit tickers provided in prompt: e.g. "Bandingkan BBCA dan BBRI"
  if (tickers.length >= 2) {
    return {
      isCompare: true,
      symbolA: tickers[0],
      symbolB: tickers[1],
    };
  }

  // Case 2: One ticker provided, and an active stock exists in context:
  // e.g. activeSymbol is "INET", prompt is "bila dibandingkan dengan WIFI bagaimana?"
  if (tickers.length === 1 && activeSymbol) {
    const candidate = tickers[0];
    if (candidate !== activeSymbol.toUpperCase()) {
      return {
        isCompare: true,
        symbolA: activeSymbol.toUpperCase(),
        symbolB: candidate,
      };
    }
  }

  return { isCompare: false };
}

/**
 * Determine if user is asking to switch to or analyze a brand new stock.
 * If user text has a new valid ticker that is different from activeSymbol, returns that ticker.
 * Otherwise returns null (meaning it's a follow-up conversation about the active stock).
 */
export function detectNewTargetSymbol(
  userText: string,
  activeSymbol?: string
): string | null {
  const tickers = extractValidTickers(userText);

  if (tickers.length === 0) {
    return null;
  }

  const primaryTicker = tickers[0];

  // If there is no active stock yet, this ticker is the new target
  if (!activeSymbol) {
    return primaryTicker;
  }

  // If the ticker is different from the currently active stock, switch to it
  if (primaryTicker !== activeSymbol.toUpperCase()) {
    return primaryTicker;
  }

  return null;
}
