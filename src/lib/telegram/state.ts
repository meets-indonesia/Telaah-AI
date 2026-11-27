import fs from "node:fs";
import path from "node:path";

const STATE_FILE_PATH = path.join(process.cwd(), "data", "telegram_state.json");

interface ChatState {
  lastSymbol?: string;
  updatedAt: string;
}

interface TelegramState {
  chats: Record<string, ChatState>;
}

function readState(statePath: string): TelegramState {
  try {
    if (!fs.existsSync(statePath)) return { chats: {} };
    const parsed = JSON.parse(fs.readFileSync(statePath, "utf-8")) as TelegramState;
    if (!parsed || typeof parsed !== "object" || !parsed.chats) return { chats: {} };
    return parsed;
  } catch {
    return { chats: {} };
  }
}

function writeState(state: TelegramState, statePath: string): void {
  try {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    const temporary = `${statePath}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(state, null, 2), "utf-8");
    fs.renameSync(temporary, statePath);
  } catch (error) {
    console.warn("Gagal menyimpan telegram_state.json:", error);
  }
}

export function getLastSymbol(
  chatId: string | number,
  statePath: string = STATE_FILE_PATH
): string | null {
  const state = readState(statePath);
  const entry = state.chats[String(chatId)];
  if (!entry?.lastSymbol || !/^[A-Z]{4}$/.test(entry.lastSymbol)) return null;
  return entry.lastSymbol;
}

export function setLastSymbol(
  chatId: string | number,
  symbol: string,
  statePath: string = STATE_FILE_PATH
): void {
  const clean = symbol.trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(clean)) return;
  const state = readState(statePath);
  state.chats[String(chatId)] = {
    lastSymbol: clean,
    updatedAt: new Date().toISOString(),
  };
  writeState(state, statePath);
}
