export interface VisionExtractionResult {
  detectedTicker: string | null;
  companyName: string | null;
  imageType: "candlestick_chart" | "broker_summary" | "financial_report" | "social_media_rumor" | "general";
  extractedData: string;
  summary: string;
}

/**
 * Stage 1 in 2-Model Pipeline:
 * Uses GPT-4o-mini Vision to inspect image(s), perform high-accuracy OCR,
 * and extract tables/charts/tickers before passing the data to Qwen 3.5 397B.
 */
export async function extractVisionDataWithGPT(
  images: string[],
  userPrompt?: string
): Promise<VisionExtractionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !images || images.length === 0) {
    return {
      detectedTicker: null,
      companyName: null,
      imageType: "general",
      extractedData: "",
      summary: "",
    };
  }

  // Format multimodal content for OpenRouter (GPT-4o-mini Vision)
  const imageContents = images.slice(0, 4).map((imgBase64) => ({
    type: "image_url",
    image_url: {
      url: imgBase64.startsWith("data:") ? imgBase64 : `data:image/jpeg;base64,${imgBase64}`,
    },
  }));

  const systemPrompt = `You are a high-precision Indonesian Stock Exchange (IDX) Vision OCR Analyst.
Your task is to analyze the provided image(s) related to Indonesian stocks (IDX) and extract all factual data.

Carefully inspect the image for:
1. IDX Stock Ticker: Look for 4-letter uppercase tickers (e.g. BBCA, BBRI, BMRI, TLKM, ASII, DEWA, ADRO, GOTO, BREN, ANTM, CUAN, etc.) or company names.
2. If it's a Candlestick / Technical Chart: Identify the stock ticker, timeframe (1D, 1H, 15m), current price, key support & resistance levels, indicators (RSI value, MACD, Moving Averages like MA20/MA50).
3. If it's a Broker Summary / Done Detail: Identify the stock ticker, date, top buyer brokers (e.g. CC, YP, PD, BK, AK, RX) with volume/value and average price (WAP), top seller brokers, net foreign flow.
4. If it's a Financial Statement / Ratio table: Identify revenue, net profit, YoY/QoQ growth, PER, PBV, DER, EPS.
5. If it's a Social Media / News / Telegram Post: Extract the rumor/news claims, numbers mentioned, target prices claimed, and sentiment.

You MUST respond strictly in valid JSON matching this schema:
{
  "detectedTicker": "4-letter ticker string or null if none visible",
  "companyName": "Company name string or null",
  "imageType": "candlestick_chart | broker_summary | financial_report | social_media_rumor | general",
  "extractedData": "Detailed structured bullet points of all numbers, prices, brokers, or claims read from the image",
  "summary": "Concise 2-3 sentence overview of what the image shows in Indonesian"
}`;

  const userText = userPrompt?.trim()
    ? `Catatan/Pertanyaan Pengguna: "${userPrompt}"\n\nEkstrak seluruh informasi pasar modal dari gambar terlampir.`
    : "Ekstrak seluruh informasi pasar modal dari gambar terlampir.";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://telaah360.local",
        "X-Title": "Telaah 360",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              ...imageContents,
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("Vision extraction failed with status:", res.status);
      return {
        detectedTicker: null,
        companyName: null,
        imageType: "general",
        extractedData: "",
        summary: "",
      };
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("Empty vision response");

    const parsed = JSON.parse(rawContent);
    return {
      detectedTicker: parsed.detectedTicker ? parsed.detectedTicker.toUpperCase().trim() : null,
      companyName: parsed.companyName || null,
      imageType: parsed.imageType || "general",
      extractedData: parsed.extractedData || "",
      summary: parsed.summary || "",
    };
  } catch (err) {
    console.warn("Vision extraction error:", err);
    return {
      detectedTicker: null,
      companyName: null,
      imageType: "general",
      extractedData: "",
      summary: "",
    };
  }
}
