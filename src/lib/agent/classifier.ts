import { callOpenRouter } from "./openrouter";
import { AtomicClaim, IntentType } from "./types";
import { VALID_IDX_TICKERS } from "./chat-router";

export interface ClassificationResult {
  symbol: string;
  companyNameCandidate?: string;
  intent: IntentType;
  isAmbiguous: boolean;
  claims: AtomicClaim[];
  explanation: string;
}

export async function classifyInputAndExtractClaims(rawInput: string): Promise<ClassificationResult> {
  const systemPrompt = `Anda adalah Input & Intent Interpreter untuk Telaah 360, asisten riset saham Bursa Efek Indonesia (IDX).
Tugas:
1. Ambil 1 kode saham IDX 4 huruf kapital (misal: BBCA, BBRI, GOTO, TLKM, ASII, BMRI).
   Jika pengguna menyebut nama perusahaan ("Bank BCA"), ubah ke simbolnya (BBCA).
2. Tentukan intensitas/tipe input: "claim_check" | "news_event" | "company_overview" | "thesis_review" | "market_technical".
3. Ekstrak klaim-klaim spesifik yang ingin diuji sebagai array string (maksimal 5 klaim).

Jawab HANYA format JSON valid:
{
  "symbol": "BBCA",
  "companyNameCandidate": "PT Bank Central Asia Tbk",
  "intent": "claim_check",
  "isAmbiguous": false,
  "claims": ["Laba naik gila-gilaan", "Asing borong saham"],
  "explanation": "Ringkasan deteksi"
}`;

  const userPrompt = `Input pengguna:\n"""\n${rawInput.slice(0, 4000)}\n"""`;

  try {
    const result = await callOpenRouter<any>({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
    });

    // Sanitasi simbol
    let sym = String(result.symbol || "").toUpperCase().replace(".JK", "").trim();
    if (!VALID_IDX_TICKERS.has(sym)) {
      // Coba cari ticker 4 huruf yang valid dalam teks kembalian
      const match = sym.match(/\b([A-Z]{4})\b/);
      if (match && VALID_IDX_TICKERS.has(match[1])) {
        sym = match[1];
      } else {
        sym = "";
      }
    }
    const isAmbiguous = !sym || !VALID_IDX_TICKERS.has(sym);

    // Sanitasi intent
    const rawIntent = String(result.intent || "").toLowerCase();
    let validIntent: IntentType = "claim_check";
    if (rawIntent.includes("tech") || rawIntent.includes("chart") || rawIntent.includes("rsi")) {
      validIntent = "market_technical";
    } else if (rawIntent.includes("news") || rawIntent.includes("event") || rawIntent.includes("dividen") || rawIntent.includes("rights")) {
      validIntent = "news_event";
    } else if (rawIntent.includes("thesis") || rawIntent.includes("turnaround")) {
      validIntent = "thesis_review";
    } else if (rawIntent.includes("overview") || rawIntent.includes("fundamental") || rawIntent.includes("bisnis")) {
      validIntent = "company_overview";
    } else {
      validIntent = "claim_check";
    }

    // Normalisasi klaim ke AtomicClaim[]
    const rawClaims = Array.isArray(result.claims) ? result.claims : [];
    const normalizedClaims: AtomicClaim[] = rawClaims.map((c: any, i: number) => {
      if (typeof c === "string") {
        const text = c.trim();
        const isFlow = /asing|foreign|broker|bandar|akumulasi|distribusi|borong/i.test(text);
        const isTech = /rsi|macd|sma|chart|breakout|support|resistance|volume/i.test(text);
        const isEvent = /dividen|rights|rups|split|akuisisi|merger/i.test(text);
        return {
          id: `claim_${i + 1}`,
          originalText: text,
          claimType: isFlow ? "flow" : isTech ? "price_technical" : isEvent ? "event" : "financial",
        };
      }
      return {
        id: c.id || `claim_${i + 1}`,
        originalText: c.originalText || c.text || c.claim || String(c),
        claimType: c.claimType || "general",
        targetMetric: c.targetMetric,
        statedPeriod: c.statedPeriod,
      };
    });

    return {
      symbol: sym,
      companyNameCandidate: result.companyNameCandidate || undefined,
      intent: validIntent,
      isAmbiguous: !/^[A-Z]{4}$/.test(sym),
      claims: normalizedClaims,
      explanation: result.explanation || "Deteksi otomatis",
    };
  } catch (error) {
    console.error("Error in classifyInputAndExtractClaims:", error);
    // Fallback regex detection jika LLM gagal
    const match = rawInput.match(/\b([A-Z]{4})\b/);
    return {
      symbol: match ? match[1] : "",
      companyNameCandidate: undefined,
      intent: "company_overview",
      isAmbiguous: !match,
      claims: [],
      explanation: "Fallback regex classifier",
    };
  }
}
