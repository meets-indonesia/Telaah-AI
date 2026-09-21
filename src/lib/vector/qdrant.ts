import crypto from "crypto";
import { CompanyIntelligenceReport, AnalysisMode } from "@/lib/agent/types";
import { getEmbedding } from "./embeddings";

const QDRANT_BASE_URL = process.env.QDRANT_URL || "http://localhost:6333";
const COLLECTION_NAME = "telaah_intelligence_cache";
const VECTOR_SIZE = 1536;

export interface VectorCachePayload {
  symbol: string;
  prompt: string;
  mode: AnalysisMode;
  capturedDate: string; // YYYY-MM-DD
  capturedTimestamp: number;
  report: CompanyIntelligenceReport;
}

export interface SemanticMatchResult {
  isMatch: boolean;
  score: number;
  isFresh: boolean;
  payload?: VectorCachePayload;
}

/**
 * Returns current date in Western Indonesia Time (WIB, UTC+7) as YYYY-MM-DD
 */
export function getTodayWIB(): string {
  const now = new Date();
  // Format to Asia/Jakarta timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // Output format: YYYY-MM-DD
}

let isCollectionReady = false;

/**
 * Ensure Qdrant collection exists with Cosine distance
 */
export async function ensureCollectionExists(): Promise<boolean> {
  if (isCollectionReady) return true;

  try {
    const checkRes = await fetch(`${QDRANT_BASE_URL}/collections/${COLLECTION_NAME}`);
    if (checkRes.ok) {
      isCollectionReady = true;
      return true;
    }

    // Create collection
    const createRes = await fetch(`${QDRANT_BASE_URL}/collections/${COLLECTION_NAME}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vectors: {
          size: VECTOR_SIZE,
          distance: "Cosine",
        },
      }),
    });

    if (createRes.ok) {
      // Create payload index for symbol to allow fast filtered search
      await fetch(`${QDRANT_BASE_URL}/collections/${COLLECTION_NAME}/index`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_name: "symbol",
          field_schema: "keyword",
        }),
      }).catch(() => {});

      isCollectionReady = true;
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn("Qdrant not reachable:", err.message);
    return false;
  }
}

/**
 * Perform semantic search on Qdrant
 * Threshold: similarity >= 0.88
 * Checks if capturedDate === todayWIB
 */
export async function searchSemanticReportCache(
  prompt: string,
  symbol?: string,
  minSimilarity: number = 0.88
): Promise<SemanticMatchResult> {
  try {
    const collectionOk = await ensureCollectionExists();
    if (!collectionOk) {
      return { isMatch: false, score: 0, isFresh: false };
    }

    const vector = await getEmbedding(prompt);
    if (!vector) {
      return { isMatch: false, score: 0, isFresh: false };
    }

    const filterClause: any = {};
    if (symbol) {
      filterClause.must = [
        {
          key: "symbol",
          match: { value: symbol.toUpperCase().replace(".JK", "") },
        },
      ];
    }

    const searchBody: any = {
      vector,
      limit: 1,
      with_payload: true,
      score_threshold: minSimilarity,
    };

    if (symbol) {
      searchBody.filter = filterClause;
    }

    const searchRes = await fetch(`${QDRANT_BASE_URL}/collections/${COLLECTION_NAME}/points/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(searchBody),
    });

    if (!searchRes.ok) {
      return { isMatch: false, score: 0, isFresh: false };
    }

    const data = await searchRes.json();
    const hit = data.result?.[0];

    if (!hit) {
      return { isMatch: false, score: 0, isFresh: false };
    }

    const payload = hit.payload as VectorCachePayload;
    const today = getTodayWIB();
    const isFresh = payload.capturedDate === today;

    return {
      isMatch: true,
      score: hit.score,
      isFresh,
      payload,
    };
  } catch (err: any) {
    console.warn("searchSemanticReportCache error:", err.message);
    return { isMatch: false, score: 0, isFresh: false };
  }
}

/**
 * Upsert analyzed report into Qdrant vector database
 */
export async function upsertReportToVectorCache(
  prompt: string,
  symbol: string,
  report: CompanyIntelligenceReport,
  mode: AnalysisMode
): Promise<boolean> {
  try {
    const collectionOk = await ensureCollectionExists();
    if (!collectionOk) return false;

    const vector = await getEmbedding(prompt);
    if (!vector) return false;

    const cleanSymbol = symbol.toUpperCase().replace(".JK", "");
    const today = getTodayWIB();

    // Deterministic UUID based on symbol + prompt hash
    const hash = crypto.createHash("md5").update(`${cleanSymbol}_${prompt.toLowerCase().trim()}`).digest("hex");
    const pointId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;

    const payload: VectorCachePayload = {
      symbol: cleanSymbol,
      prompt,
      mode,
      capturedDate: today,
      capturedTimestamp: Date.now(),
      report,
    };

    const upsertRes = await fetch(`${QDRANT_BASE_URL}/collections/${COLLECTION_NAME}/points`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points: [
          {
            id: pointId,
            vector,
            payload,
          },
        ],
      }),
    });

    return upsertRes.ok;
  } catch (err: any) {
    console.warn("upsertReportToVectorCache error:", err.message);
    return false;
  }
}
