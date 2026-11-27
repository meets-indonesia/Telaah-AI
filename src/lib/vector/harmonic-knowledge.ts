import crypto from "node:crypto";
import {
  HARMONIC_KNOWLEDGE,
  type HarmonicKnowledgeDoc,
} from "@/lib/harmonic/knowledge";
import { getEmbedding } from "./embeddings";

const QDRANT_BASE_URL = process.env.QDRANT_URL || "http://localhost:6333";
const COLLECTION_NAME = "telaah_harmonic_knowledge";
const VECTOR_SIZE = 1536;

export interface HarmonicKnowledgeHit {
  score: number;
  doc: HarmonicKnowledgeDoc;
}

let collectionReady = false;

async function ensureCollection(): Promise<boolean> {
  if (collectionReady) return true;
  try {
    const check = await fetch(
      `${QDRANT_BASE_URL}/collections/${COLLECTION_NAME}`
    );
    if (check.ok) {
      collectionReady = true;
      return true;
    }
    const create = await fetch(
      `${QDRANT_BASE_URL}/collections/${COLLECTION_NAME}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vectors: { size: VECTOR_SIZE, distance: "Cosine" },
        }),
      }
    );
    if (!create.ok) return false;
    await Promise.all(
      ["pattern", "topic"].map((field) =>
        fetch(
          `${QDRANT_BASE_URL}/collections/${COLLECTION_NAME}/index`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              field_name: field,
              field_schema: "keyword",
            }),
          }
        )
      )
    );
    collectionReady = true;
    return true;
  } catch {
    return false;
  }
}

function pointId(id: string): string {
  const hash = crypto.createHash("md5").update(id).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

export async function ingestHarmonicKnowledge(): Promise<number> {
  const ready = await ensureCollection();
  if (!ready) return 0;
  const points: Array<{
    id: string;
    vector: number[];
    payload: HarmonicKnowledgeDoc;
  }> = [];
  for (const doc of HARMONIC_KNOWLEDGE) {
    const vector = await getEmbedding(`${doc.title}\n${doc.content}`);
    if (!vector) continue;
    points.push({ id: pointId(doc.id), vector, payload: doc });
  }
  if (points.length === 0) return 0;
  const response = await fetch(
    `${QDRANT_BASE_URL}/collections/${COLLECTION_NAME}/points`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points }),
    }
  );
  return response.ok ? points.length : 0;
}

function keywordSearch(
  query: string,
  pattern?: string,
  limit = 5
): HarmonicKnowledgeHit[] {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);
  return HARMONIC_KNOWLEDGE.filter(
    (doc) =>
      !pattern ||
      pattern === "all" ||
      doc.pattern.toLowerCase() === pattern.toLowerCase()
  )
    .map((doc) => {
      const haystack = `${doc.title} ${doc.content} ${doc.pattern}`.toLowerCase();
      const score = words.reduce(
        (total, word) => total + (haystack.includes(word) ? 1 : 0),
        0
      );
      return { doc, score };
    })
    .filter((hit) => hit.score > 0 || words.length === 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export async function searchHarmonicKnowledge(
  query: string,
  options: { pattern?: string; limit?: number } = {}
): Promise<HarmonicKnowledgeHit[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 5, 10));
  const pattern =
    options.pattern && options.pattern !== "all" ? options.pattern : undefined;
  try {
    const ready = await ensureCollection();
    if (!ready) return keywordSearch(query, options.pattern, limit);
    const vector = await getEmbedding(query);
    if (!vector) return keywordSearch(query, options.pattern, limit);
    const response = await fetch(
      `${QDRANT_BASE_URL}/collections/${COLLECTION_NAME}/points/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vector,
          limit,
          with_payload: true,
          score_threshold: 0.2,
          ...(pattern
            ? {
                filter: {
                  must: [{ key: "pattern", match: { value: pattern } }],
                },
              }
            : {}),
        }),
      }
    );
    if (!response.ok) return keywordSearch(query, options.pattern, limit);
    const data = (await response.json()) as {
      result?: Array<{ score: number; payload: HarmonicKnowledgeDoc }>;
    };
    const hits = (data.result ?? [])
      .filter((hit) => hit.payload?.id)
      .map((hit) => ({ score: hit.score, doc: hit.payload }));
    return hits.length > 0
      ? hits
      : keywordSearch(query, options.pattern, limit);
  } catch {
    return keywordSearch(query, options.pattern, limit);
  }
}
