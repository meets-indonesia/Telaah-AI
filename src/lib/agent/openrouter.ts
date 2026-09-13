export async function callOpenRouter<T = any>({
  systemPrompt,
  userPrompt,
  model = "openai/gpt-4o-mini",
  responseFormat = "json",
  temperature = 0.1,
}: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  responseFormat?: "json" | "text";
  temperature?: number;
}): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY tidak ditemukan di environment.");
  }

  const payload: any = {
    model,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  if (responseFormat === "json") {
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
    throw new Error("OpenRouter mengembalikan respons kosong.");
  }

  if (responseFormat === "json") {
    try {
      return JSON.parse(rawContent) as T;
    } catch (e) {
      // Clean possible markdown code fence
      const cleanJson = rawContent
        .replace(/^```json\s*/, "")
        .replace(/^```\s*/, "")
        .replace(/```$/, "")
        .trim();
      return JSON.parse(cleanJson) as T;
    }
  }

  return rawContent as unknown as T;
}
