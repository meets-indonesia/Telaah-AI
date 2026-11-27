import { getMarketMetrics, type MarketMetricItem } from "./market-metrics";

export const BANK_UNIVERSE = [
  "BBCA",
  "BBRI",
  "BMRI",
  "BBNI",
  "BRIS",
  "BTPS",
];

const CACHE_TTL_MS = 10 * 60 * 1000;
let cachedMessage: { at: number; text: string } | null = null;

function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function formatFlow(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const abs = Math.abs(value);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}Rp ${(abs / 1e12).toFixed(1)} T`;
  if (abs >= 1e9) return `${sign}Rp ${(abs / 1e9).toFixed(0)} M`;
  return `${sign}Rp ${Math.round(abs / 1e6)} jt`;
}

export function scoreBank(item: MarketMetricItem): number {
  let score = 0;
  if (item.pe !== null && item.pe > 0) {
    score += item.pe <= 12 ? 30 : item.pe <= 20 ? 24 : item.pe <= 30 ? 14 : 6;
  }
  if (item.pb !== null && item.pb > 0) {
    score += item.pb <= 1.5 ? 25 : item.pb <= 2.5 ? 20 : item.pb <= 4 ? 12 : 5;
  }
  if (item.rsi !== null) {
    score +=
      item.rsi >= 35 && item.rsi <= 55
        ? 20
        : item.rsi > 55 && item.rsi <= 70
          ? 12
          : item.rsi < 35
            ? 14
            : 4;
  }
  score += item.trend === "Bullish" ? 10 : item.trend === "Neutral" ? 6 : 2;
  if (item.flow5d !== null) {
    score += item.flow5d > 0 ? 15 : item.flow5d === 0 ? 5 : 0;
  }
  score +=
    item.marketCap >= 200e12
      ? 10
      : item.marketCap >= 50e12
        ? 7
        : item.marketCap >= 10e12
          ? 4
          : 1;
  return Math.min(100, score);
}

function buildLines(ranked: MarketMetricItem[], scores: Map<string, number>): string {
  const top = ranked.slice(0, 3);
  const best = top[0];
  const lines = [
    `Untuk sektor **bank**, ini shortlist dari ${ranked.length} bank likuid berdasarkan skor screening (valuasi, momentum, flow, dan ukuran). Ini **bukan rekomendasi beli/jual**.`,
    "",
  ];

  top.forEach((item, index) => {
    const score = scores.get(item.symbol) ?? 0;
    lines.push(
      `${index + 1}. **${item.symbol}** — skor ${score}/100`,
      `   ${formatRupiah(item.lastPrice)} · PER ${item.pe ? `${item.pe.toFixed(1)}x` : "N/A"} · PBV ${item.pb ? `${item.pb.toFixed(2)}x` : "N/A"} · RSI ${item.rsi ? item.rsi.toFixed(1) : "N/A"} · tren ${item.trend} · foreign flow 5D ${formatFlow(item.flow5d)}`
    );
  });

  if (best) {
    lines.push(
      "",
      `Kalau mau satu nama untuk ditelaah lebih dulu, **${best.symbol}** punya skor screening tertinggi di batch ini. Skor ini bukan target harga; tetap cek fundamental, invalidasi, dan profil risikomu.`,
      "",
      `Mau aku telaah **${best.symbol}** sekarang? Tulis \`Analisis ${best.symbol}\`, atau pilih bank lain dari daftar di atas.`
    );
  }

  return lines.join("\n");
}

export async function buildBankShortlistMessage(): Promise<string> {
  if (cachedMessage && Date.now() - cachedMessage.at < CACHE_TTL_MS) {
    return cachedMessage.text;
  }

  try {
    const metrics = await getMarketMetrics(BANK_UNIVERSE);
    const valid = metrics.filter(
      (item) =>
        item.lastPrice > 0 &&
        (item.pe !== null || item.pb !== null || item.marketCap > 0)
    );

    if (valid.length === 0) {
      return [
        "Aku belum dapat menarik data bank dengan lengkap saat ini.",
        "",
        "Beberapa bank likuid yang bisa kamu pilih: **BBCA, BBRI, BMRI, BBNI, BRIS, BTPS**.",
        "Tulis misalnya `Analisis BBRI` untuk memulai telaah penuh.",
      ].join("\n");
    }

    const scores = new Map(
      valid.map((item) => [item.symbol, scoreBank(item)])
    );
    const ranked = [...valid].sort(
      (left, right) =>
        (scores.get(right.symbol) ?? 0) - (scores.get(left.symbol) ?? 0) ||
        right.marketCap - left.marketCap
    );

    const text = buildLines(ranked, scores);
    cachedMessage = { at: Date.now(), text };
    return text;
  } catch {
    return [
      "Aku belum dapat menarik data bank dengan lengkap saat ini.",
      "",
      "Beberapa bank likuid yang bisa kamu pilih: **BBCA, BBRI, BMRI, BBNI, BRIS, BTPS**.",
      "Tulis misalnya `Analisis BBRI` untuk memulai telaah penuh.",
    ].join("\n");
  }
}
