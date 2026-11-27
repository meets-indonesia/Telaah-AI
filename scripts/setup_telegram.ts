import fs from "node:fs";
import path from "node:path";

function loadEnv(file = ".env"): void {
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const equals = trimmed.indexOf("=");
      if (equals <= 0) continue;
      const key = trimmed.slice(0, equals).trim();
      let value = trimmed.slice(equals + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // .env is optional when the variables are already exported.
  }
}

async function main() {
  loadEnv();
  const { createTelegramClient } = await import("../src/lib/telegram/client");

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.error(
      "TELEGRAM_BOT_TOKEN belum diisi. Buat bot lewat @BotFather, lalu tambahkan token ke .env."
    );
    process.exitCode = 1;
    return;
  }

  const ownerId = process.env.TELEGRAM_OWNER_ID?.trim();
  if (!ownerId) {
    console.warn(
      "PERINGATAN: TELEGRAM_OWNER_ID belum diisi. Webhook akan mengabaikan semua pesan."
    );
  }

  const client = createTelegramClient(token);
  const me = await client.getMe();
  console.log(`Bot: @${me.username ?? me.id} (id ${me.id})`);

  const mode = process.argv.includes("--delete")
    ? "delete"
    : process.argv.includes("--info")
      ? "info"
      : "set";

  if (mode === "delete") {
    await client.deleteWebhook();
    console.log("Webhook dihapus. Bot berhenti menerima pesan sampai di-set ulang.");
    return;
  }

  if (mode === "info") {
    const info = await client.getWebhookInfo();
    console.log("Webhook info:", JSON.stringify(info, null, 2));
    return;
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error(
      "TELEGRAM_WEBHOOK_SECRET belum diisi. Buat string acak, misalnya: openssl rand -hex 24"
    );
    process.exitCode = 1;
    return;
  }

  const baseUrl = (process.env.TELEGRAM_PUBLIC_URL || "https://telaah.hiiamanop.my.id").replace(
    /\/+$/,
    ""
  );
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  await client.setWebhook(webhookUrl, secret);
  const info = await client.getWebhookInfo();
  console.log(`Webhook diset ke ${webhookUrl}`);
  console.log("Webhook info:", JSON.stringify(info, null, 2));
  console.log(
    `\nLangkah berikutnya: buka https://t.me/${me.username ?? ""} lalu kirim /start.`
  );
}

main().catch((error) => {
  console.error("Gagal mengatur Telegram:", (error as Error)?.message || error);
  process.exitCode = 1;
});
