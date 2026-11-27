import fs from "node:fs";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(".env")) return env;
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const apiKey = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || "";
  const primary = env.OPENROUTER_MODEL || "qwen/qwen3.5-397b-a17b";
  const fallback = "openai/gpt-4o-mini";

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY kosong di .env.");
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://telaah360.local",
    "X-Title": "Telaah 360",
  };

  const keyRes = await fetch("https://openrouter.ai/api/v1/key", { headers });
  const keyText = await keyRes.text();
  console.log(`Auth /api/v1/key: HTTP ${keyRes.status} ${keyText.slice(0, 300)}`);

  if (!keyRes.ok) {
    console.error("API key ditolak OpenRouter. Buat key baru di https://openrouter.ai/keys lalu restart dev server.");
    process.exit(1);
  }

  for (const model of [primary, fallback]) {
    const started = Date.now();
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with exactly: PONG" }],
        max_tokens: 10,
        temperature: 0,
        reasoning: { effort: "none" },
      }),
    });
    const text = await res.text();
    console.log(`\nChat ${model}: HTTP ${res.status} in ${Date.now() - started}ms`);
    if (!res.ok) {
      console.error(text.slice(0, 500));
    } else {
      const json = JSON.parse(text);
      console.log("Reply:", json.choices?.[0]?.message?.content ?? "(empty)");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
