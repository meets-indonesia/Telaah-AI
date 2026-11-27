export interface TelegramConfig {
  botToken: string;
  ownerId: number | null;
  briefChatId: string | null;
  webhookSecret: string | null;
  publicBaseUrl: string;
  briefSecret: string | null;
}

export function loadTelegramConfig(
  env: NodeJS.ProcessEnv = process.env
): TelegramConfig | null {
  const botToken = env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) return null;

  const ownerId = Number(env.TELEGRAM_OWNER_ID);
  return {
    botToken,
    ownerId: Number.isFinite(ownerId) && ownerId > 0 ? ownerId : null,
    briefChatId: env.TELEGRAM_BRIEF_CHAT_ID?.trim() || null,
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET?.trim() || null,
    publicBaseUrl: (env.TELEGRAM_PUBLIC_URL || "https://telaah.hiiamanop.my.id").replace(
      /\/+$/,
      ""
    ),
    briefSecret: env.BRIEF_SECRET?.trim() || null,
  };
}

export interface TelegramUpdateLike {
  message?: {
    from?: { id?: number };
    chat?: { id?: number };
  };
}

export function isOwner(
  config: TelegramConfig,
  update: TelegramUpdateLike
): boolean {
  if (!config.ownerId) return false;
  return (
    update.message?.from?.id === config.ownerId ||
    update.message?.chat?.id === config.ownerId
  );
}
