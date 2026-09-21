/**
 * OpenRouter Text Embedding Client
 * Computes 1536-dimensional dense vector embeddings for semantic search.
 */

const OPENROUTER_EMBEDDING_URL = "https://openrouter.ai/api/v1/embeddings";
const EMBEDDING_MODEL = "openai/text-embedding-3-small";

export async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn("getEmbedding warning: OPENROUTER_API_KEY not configured.");
    return null;
  }

  const cleanText = text.replace(/\n+/g, " ").trim().slice(0, 8000);
  if (!cleanText) return null;

  try {
    const res = await fetch(OPENROUTER_EMBEDDING_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://telaah360.internal",
        "X-Title": "Telaah 360 Vector Cache",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: cleanText,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`Embedding API returned status ${res.status}: ${errText}`);
      return null;
    }

    const json = await res.json();
    if (json.data && Array.isArray(json.data) && json.data[0]?.embedding) {
      return json.data[0].embedding as number[];
    }
    return null;
  } catch (err: any) {
    console.warn("Failed to generate embedding from OpenRouter:", err.message);
    return null;
  }
}
