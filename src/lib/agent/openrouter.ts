function sanitizeLingArtifacts(raw: string): string {
  // 1. Konversi tanda baca fullwidth / Chinese ke tanda baca standar
  let s = raw
    .replace(/，/g, ",")
    .replace(/：/g, ":")
    .replace(/“|”/g, "\"")
    .replace(/‘|’/g, "'")
    .replace(/【/g, "[")
    .replace(/】/g, "]")
    .replace(/；/g, ";");

  // 2. Bersihkan karakter kanji / Hanzi yang bocor dari tokenizer Ling
  s = s.replace(/[\u4e00-\u9fa5]/g, "");

  // 3. Bersihkan koma ganda atau koma sebelum kurung kurawal
  s = s.replace(/,\s*,/g, ",");
  s = s.replace(/,\s*([}\]])/g, "$1");

  return s;
}

function sanitizeJsonControlChars(raw: string): string {
  let inString = false;
  let escape = false;
  let out = "";

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === "\\" && inString) {
      escape = !escape;
      out += c;
      continue;
    }
    if (c === "\"" && !escape) {
      inString = !inString;
      out += c;
      continue;
    }
    if (inString) {
      if (c === "\n") {
        out += "\\n";
      } else if (c === "\r") {
        out += "\\r";
      } else if (c === "\t") {
        out += "\\t";
      } else if (c.charCodeAt(0) < 32) {
        out += " ";
      } else {
        out += c;
      }
    } else {
      out += c;
    }
    escape = false;
  }
  return out;
}

function cleanAndParseJson<T = any>(rawContent: string, selectedModel: string): T {
  // 1. Ekstrak dari blok markdown ```json ... ``` bila ada (ambil yang terakhir)
  const regex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  let match;
  let lastBlock: string | null = null;
  while ((match = regex.exec(rawContent)) !== null) {
    lastBlock = match[1];
  }

  let text = lastBlock || rawContent;

  // 2. Bersihkan tag <think>...</think> jika tersisa
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 3. Bersihkan artifak tokenizer Ling
  text = sanitizeLingArtifacts(text);

  // 4. Ambil mulai dari kurung kurawal pertama {
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) {
    throw new Error(`Tidak ditemukan objek JSON dalam respons model ${selectedModel}`);
  }
  text = text.slice(firstBrace);

  // 5. Potong teks apa pun setelah kurung kurawal terakhir }
  const lastBrace = text.lastIndexOf("}");
  if (lastBrace !== -1) {
    text = text.slice(0, lastBrace + 1);
  }

  // 6. Bersihkan karakter kontrol (newline/tab tanpa escape di dalam string JSON)
  text = sanitizeJsonControlChars(text);
  text = text.replace(/,\s*([}\]])/g, "$1");

  // Coba parse
  try {
    return JSON.parse(text) as T;
  } catch (err1) {
    // 7. Jika masih ada unclosed braces atau quotes, seimbangkan
    let s = text;
    let openBraces = 0;
    let inString = false;
    let escape = false;

    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "\\" && inString) {
        escape = !escape;
        continue;
      }
      if (c === "\"" && !escape) {
        inString = !inString;
      }
      if (!inString) {
        if (c === "{") openBraces++;
        else if (c === "}") openBraces--;
      }
      escape = false;
    }

    if (inString) s += "\"";
    while (openBraces > 0) {
      s += "}";
      openBraces--;
    }

    s = s.replace(/,\s*([}\]])/g, "$1");

    try {
      return JSON.parse(s) as T;
    } catch (err2: any) {
      console.error("Gagal parse JSON setelah repair. Snippet:", s.slice(0, 300));
      throw new Error(`Gagal mem-parsing format JSON dari model ${selectedModel}: ${err2.message}`);
    }
  }
}

export async function callOpenRouter<T = any>({
  systemPrompt,
  userPrompt,
  model,
  responseFormat = "json",
  temperature = 0.1,
  maxTokens = 4000,
}: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  responseFormat?: "json" | "text";
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  const primaryModel = model || process.env.OPENROUTER_MODEL || "inclusionai/ling-3.0-flash-fin";
  const fallbackModel = "openai/gpt-4o-mini";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY tidak ditemukan di environment.");
  }

  // Helper internal untuk memanggil OpenRouter dengan model tertentu
  async function makeRequest(modelToUse: string): Promise<T> {
    const isReasoningModel = modelToUse.includes("ling") || modelToUse.includes("r1");

    const payload: any = {
      model: modelToUse,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    if (responseFormat === "json" && !isReasoningModel) {
      payload.response_format = { type: "json_object" };
    }

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://telaah360.local",
        "X-Title": "Telaah 360",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`OpenRouter error [${res.status}]: ${errText}`);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error(`OpenRouter mengembalikan respons kosong dari model ${modelToUse}.`);
    }

    if (responseFormat === "json") {
      return cleanAndParseJson<T>(rawContent, modelToUse);
    }

    const cleanText = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    return cleanText as unknown as T;
  }

  try {
    return await makeRequest(primaryModel);
  } catch (primaryError: any) {
    if (primaryModel !== fallbackModel) {
      console.warn(`[OpenRouter] Model ${primaryModel} gagal (${primaryError.message}). Mencoba fallback ke ${fallbackModel}...`);
      return await makeRequest(fallbackModel);
    }
    throw primaryError;
  }
}
