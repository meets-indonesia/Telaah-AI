import { NextRequest, NextResponse } from "next/server";
import { getCachedTranslation, setCachedTranslation } from "@/lib/storage/redis";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { text, targetLang } = await req.json();

    if (!text || !targetLang) {
      return NextResponse.json({ error: "Missing text or targetLang" }, { status: 400 });
    }

    if (targetLang === "id") {
      return NextResponse.json({ translatedText: text, cached: true });
    }

    // 1. Cek cache Redis / memory
    const cached = await getCachedTranslation(text, targetLang);
    if (cached) {
      return NextResponse.json({ translatedText: cached, cached: true });
    }

    // 2. Fallback to OpenRouter LLM for translation
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json({ translatedText: text, cached: false, note: "No LLM API key configured" });
    }

    const langName = targetLang === "zh" ? "Simplified Chinese (简体中文)" : "English";

    const prompt = `You are a financial stock market translator. Translate the following Indonesian IDX stock analysis into ${langName}.
CRITICAL RULES:
1. Preserve Indonesian IDX stock tickers (e.g. BBCA, BBRI, DEWA, TLKM, ADRO) exactly as they are.
2. Keep numbers, currencies (Rp, IDR, $, T, B, M), and technical ratio abbreviations (PER, PBV, DER, RSI, WAP, SL, TP, RRR) standard.
3. Keep the tone natural, sharp, and professional for retail traders.
4. Output ONLY the translated text, nothing else.

Text to translate:
"""
${text}
"""`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ translatedText: text, cached: false });
    }

    const data = await res.json();
    let translatedText = data.choices?.[0]?.message?.content?.trim() || text;
    // Strip leading/trailing triple quotes if LLM wraps output
    if (translatedText.startsWith('"""') && translatedText.endsWith('"""')) {
      translatedText = translatedText.slice(3, -3).trim();
    }

    // 3. Simpan ke Redis cache permanen
    await setCachedTranslation(text, targetLang, translatedText);

    return NextResponse.json({ translatedText, cached: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to translate" }, { status: 500 });
  }
}
