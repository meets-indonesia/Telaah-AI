export const MAX_PROMPT_CHARS = 4000;

const INJECTION_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /abaikan (semua )?instruksi (sebelumnya|di atas)/i,
  /system prompt/i,
  /reveal (your |the )?(prompt|instructions)/i,
  /bocorkan (prompt|instruksi)/i,
  /jailbreak/i,
  /developer mode/i,
  /act as (a )?different/i,
  /you are now (a )?/i,
];

export function sanitizeUserPrompt(raw: unknown): { text: string; tooLong: boolean } {
  if (typeof raw !== "string") return { text: "", tooLong: false };
  const tooLong = raw.length > MAX_PROMPT_CHARS;
  const text = raw
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PROMPT_CHARS);
  return { text, tooLong };
}

export function looksLikePromptInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

export type SectorRequest = "bank";

/**
 * A request for a sector shortlist is not a ticker request. "emiten bank"
 * must not be read as the BANK ticker, while an explicit uppercase "BANK"
 * or "Analisis BANK" still is.
 */
export function detectSectorRequest(text: string): SectorRequest | null {
  const raw = text.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  if (!/\bbank\b|\bperbankan\b/.test(lower)) return null;

  const listIntent =
    /(rekomendasi|saham|emiten|daftar|shortlist|pilih|apa|bagus|lain|lainnya|alternatif|bandingkan|screen)/i.test(
      lower
    );
  if (!listIntent) return null;

  const explicitUppercaseTicker = /\bBANK\b/.test(raw);
  const explicitAnalysis =
    /\b(analisis|telaah|valuasi|harga|prospek)\b/i.test(lower);
  if (
    explicitUppercaseTicker &&
    explicitAnalysis &&
    !/(rekomendasi|daftar|shortlist|pilih|lain|lainnya|bandingkan)/i.test(lower)
  ) {
    return null;
  }

  return "bank";
}

export type ConversationalIntent = "greeting" | "thanks" | "capabilities";

export function detectConversationalIntent(text: string): ConversationalIntent | null {
  const value = text.trim().toLowerCase();
  if (!value) return null;

  const hasExplicitTicker =
    /\b[A-Z]{4}\b/.test(text) || /(?:saham|emiten|kode)\s+[a-z]{4}\b/i.test(text);
  const isShort = value.split(/\s+/).filter(Boolean).length <= 3;

  if (
    isShort &&
    !hasExplicitTicker &&
    /^(halo|hallo|hola|helo|hai|hi|hello|hey|pagi|siang|sore|malam|selamat (pagi|siang|sore|malam)|assalamualaikum|salam)\b/.test(
      value
    )
  ) {
    return "greeting";
  }
  if (/^(makasih|terima kasih|thanks|thank you|thx)\b/.test(value)) {
    return "thanks";
  }
  if (
    /^(apa (yang )?bisa kamu|lakukan|fitur|siapa kamu|kamu siapa|bantuan|help|bisa bantu apa)\b/.test(
      value
    )
  ) {
    return "capabilities";
  }
  return null;
}

export function conversationalReply(intent: ConversationalIntent): string {
  if (intent === "thanks") {
    return "Sama-sama! 😊 Kalau mau lanjut, tinggal sebutkan kode sahamnya, ya — misalnya **BBCA**, **TLKM**, atau **ANTM**.";
  }
  if (intent === "capabilities") {
    return [
      "Tentu, aku **Telaah 360** — teman riset emiten IDX kamu.",
      "",
      "Yang bisa aku bantu:",
      "- ringkasan fundamental & laporan kuartalan",
      "- valuasi (PER/PBV), peers, dan profil emiten",
      "- teknikal (tren, RSI, SMA, support/resistance)",
      "- foreign flow dan insider filings bila tersedia",
      "- trading plan probabilistik dan audit bukti",
      "",
      "Mau mulai dari emiten mana? Tulis kode saham atau nama perusahaannya, ya. Contoh: **Analisis BBCA**.",
    ].join("\n");
  }
  return [
    "Halo! 👋 Senang ketemu kamu. Aku **Telaah 360**, teman riset saham IDX kamu.",
    "",
    "Mau mulai dari emiten mana? Tulis kode saham atau nama perusahaannya, ya — misalnya **BBCA**, **TLKM**, atau **ANTM**.",
    "Aku bisa bantu fundamental, valuasi, teknikal, flow, insider, dan trading plan. Kalau soal sektor, sebutkan emiten yang mau dibandingkan, nanti aku ambil datanya.",
    "",
    "Tenang, ini untuk riset dan edukasi — bukan rekomendasi beli/jual.",
  ].join("\n");
}

export const NO_SYMBOL_MESSAGE = [
  "Hmm, sepertinya aku belum menangkap kode sahamnya. 😊",
  "",
  "Coba tulis **kode 4 huruf** atau nama perusahaannya, ya. Contohnya:",
  "- `Analisis BBCA`",
  "- `Gimana valuasi TLKM?`",
  "- `Bandingkan ANTM vs INCO`",
  "",
  "Kalau pertanyaannya soal sektor atau ide saham, sebutkan emiten yang mau kamu bandingkan — nanti aku ambil data yang tepat.",
].join("\n");

export const INJECTION_REFUSAL =
  "Waduh, itu instruksi yang mencoba mengubah aturan sistem atau membocorkan prompt — nggak bisa aku ikuti, ya. 🙏 " +
  "Tapi aku tetap siap bantu riset emiten IDX. Sebutkan kode saham atau pertanyaan pasar yang konkret, nanti kita bahas.";
