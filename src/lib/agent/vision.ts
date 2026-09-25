import { fetchArticleFromUrl, searchLiveWebNews } from "./web-fetcher";

export interface VisionExtractionResult {
  detectedTicker: string | null;
  companyName: string | null;
  imageType: "candlestick_chart" | "broker_summary" | "financial_report" | "news_rumor" | "general";
  extractedData: string;
  summary: string;
  detectedUrl?: string | null;
  newsHeadline?: string | null;
  webArticleContent?: string | null;
}

/**
 * High-accuracy Vision Analyst using flagship multimodal model.
 * Inspects image(s), extracts all factual data, and if a news article
 * is incomplete or has a URL, automatically performs web fetching.
 */
export async function extractVisionDataWithClaude(
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

  // Format multimodal content
  const imageContents = images.slice(0, 4).map((imgBase64) => ({
    type: "image_url",
    image_url: {
      url: imgBase64.startsWith("data:") ? imgBase64 : `data:image/jpeg;base64,${imgBase64}`,
    },
  }));

  const systemPrompt = `You are a high-precision Indonesian Stock Exchange (IDX) Vision OCR Analyst.
Your task is to analyze the provided image(s) related to Indonesian stocks (IDX) and extract all factual data.

Carefully inspect the image for:
1. IDX Stock Ticker: Look for 4-letter uppercase tickers (e.g. BBCA, BBRI, ANII, BMRI, TLKM, ASII, DEWA, ADRO, GOTO, BREN, ANTM, CUAN, etc.) or company names.
2. If it's a Candlestick / Technical Chart: Identify the stock ticker, timeframe (1D, 1H, 15m), current price, key support & resistance levels, indicators (RSI value, MACD, Moving Averages like MA20/MA50).
3. If it's a Broker Summary / Done Detail: Identify the stock ticker, date, top buyer brokers (e.g. CC, YP, PD, BK, AK, RX) with volume/value and average price (WAP), top seller brokers, net foreign flow.
4. If it's a Financial Statement / Ratio table: Identify revenue, net profit, YoY/QoQ growth, PER, PBV, DER, EPS.
5. If it's a News Article, Media Screenshot, or Rumor/Post:
   - Identify the exact news headline / title.
   - Look for any visible URL, website link, or media source (e.g. cnbcindonesia.com, kontan.co.id, bisnis.com, emitennews.com, etc.).
   - Extract all numbers, corporate actions (e.g. suspensi, UMA, tender offer, rights issue, dividen).
   - If the article body is cropped, incomplete, or only shows a headline/preview, set "needsWebFetch": true so full live news can be fetched.

You MUST respond strictly in valid JSON matching this schema:
{
  "detectedTicker": "4-letter ticker string or null if none visible",
  "companyName": "Company name string or null",
  "imageType": "candlestick_chart | broker_summary | financial_report | news_rumor | general",
  "extractedData": "Detailed structured bullet points of all numbers, prices, brokers, or claims read from the image",
  "summary": "Concise 2-3 sentence overview of what the image shows in Indonesian",
  "detectedUrl": "Full URL string if visible in image, or null",
  "newsHeadline": "Exact news headline or article title if present, or null",
  "needsWebFetch": true or false
}`;

  const userText = userPrompt?.trim()
    ? `Catatan/Pertanyaan Pengguna: "${userPrompt}"\n\nEkstrak seluruh informasi pasar modal dari gambar terlampir.`
    : "Ekstrak seluruh informasi pasar modal dari gambar terlampir.";

  // Primary model: Claude 3.7 Sonnet, fallback: GPT-4o
  const modelsToTry = [
    process.env.VISION_MODEL || "anthropic/claude-3.7-sonnet",
    "openai/gpt-4o",
  ];

  let rawContent: string | null = null;

  for (const modelName of modelsToTry) {
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
          model: modelName,
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

      if (res.ok) {
        const data = await res.json();
        rawContent = data.choices?.[0]?.message?.content;
        if (rawContent) break;
      }
    } catch (err) {
      console.warn(`Vision model ${modelName} failed, attempting next model:`, err);
    }
  }

  if (!rawContent) {
    return {
      detectedTicker: null,
      companyName: null,
      imageType: "general",
      extractedData: "",
      summary: "",
    };
  }

  try {
    const parsed = JSON.parse(rawContent);
    const detectedTicker = parsed.detectedTicker ? parsed.detectedTicker.toUpperCase().trim() : null;
    const companyName = parsed.companyName || null;
    const imageType = parsed.imageType || "general";
    let extractedData = parsed.extractedData || "";
    const summary = parsed.summary || "";
    const detectedUrl = parsed.detectedUrl || null;
    const newsHeadline = parsed.newsHeadline || null;
    const needsWebFetch = parsed.needsWebFetch === true || (!extractedData && !!newsHeadline);

    // Feature: Automatic Web Fetching if article content is missing or URL detected
    let webArticleContent: string | null = null;

    if (detectedUrl) {
      webArticleContent = await fetchArticleFromUrl(detectedUrl);
    }

    if (!webArticleContent && (needsWebFetch || newsHeadline)) {
      webArticleContent = await searchLiveWebNews(newsHeadline || summary, detectedTicker);
    }

    if (webArticleContent) {
      extractedData += `\n\n[Hasil Web Fetch Berita Lengkap Terkini]:\n${webArticleContent}`;
    }

    return {
      detectedTicker,
      companyName,
      imageType,
      extractedData,
      summary,
      detectedUrl,
      newsHeadline,
      webArticleContent,
    };
  } catch (err) {
    console.warn("Vision parsing error:", err);
    return {
      detectedTicker: null,
      companyName: null,
      imageType: "general",
      extractedData: "",
      summary: "",
    };
  }
}
