import type { CompanyIntelligenceReport } from "@/lib/agent/types";
import type { HarmonicScanResult } from "@/lib/screener/harmonic-screener";
import { escapeTelegramHtml } from "./client";

const number0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const number2 = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function html(text: string): string {
  return escapeTelegramHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function price(value: number | null | undefined): string {
  return Number.isFinite(value) ? `Rp ${number0.format(value as number)}` : "—";
}

function ratio(value: number | null | undefined): string {
  return Number.isFinite(value) ? `${number2.format(value as number)}x` : "—";
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function distanceLabel(distancePct: number): string {
  const distance = Math.abs(distancePct);
  if (distance <= 2) return "di area PRZ";
  if (distance <= 8) return "dekat";
  return "pantau";
}

export function formatReportMessage(
  report: CompanyIntelligenceReport,
  publicBaseUrl: string
): string {
  const technical = report.technical;
  const valuation = report.valuation;
  const flow = report.flowLens?.foreignFlow;
  const plan = report.tradingPlan;
  const horizon = plan?.horizons?.[plan.bestFitHorizon];

  const lines = [
    `📊 <b>${escapeTelegramHtml(report.symbol)}</b> — ${escapeTelegramHtml(
      truncate(report.companyName || "", 70)
    )}`,
    `Harga <b>${price(technical?.lastPrice)}</b> · Tren ${escapeTelegramHtml(
      technical?.trendAssessment || "Data terbatas"
    )} · RSI ${Number.isFinite(technical?.rsi14) ? technical.rsi14 : "—"}`,
  ];

  if (valuation) {
    lines.push(
      `Valuasi PER ${ratio(valuation.current_pe)} · PBV ${ratio(valuation.current_pb)}`
    );
  }

  if (flow) {
    const flowValue =
      Number.isFinite(flow.cumulative5d) && flow.cumulative5d !== 0
        ? ` (${flow.cumulative5d > 0 ? "+" : "−"}${price(Math.abs(flow.cumulative5d))})`
        : "";
    lines.push(`Asing 5D: ${escapeTelegramHtml(flow.recentTrend)}${flowValue}`);
  }

  if (horizon) {
    lines.push(
      `Plan ${escapeTelegramHtml(horizon.label)}: entry ${price(horizon.entryZone[0])}–${price(
        horizon.entryZone[1]
      )} · SL ${price(horizon.stopLoss)} · TP ${price(horizon.target1)}/${price(
        horizon.target2
      )}`
    );
  }

  lines.push("", `<b>Inti:</b> ${html(truncate(report.directAnswer || "", 650))}`);

  if (report.dataAsOf) {
    lines.push(`Data per ${escapeTelegramHtml(report.dataAsOf)}.`);
  }

  lines.push(
    `Bukan rekomendasi beli/jual.`,
    `<a href="${publicBaseUrl}/?symbol=${encodeURIComponent(report.symbol)}">Buka di Telaah 360</a>`
  );

  return lines.join("\n");
}

export function formatBriefMessage(scan: HarmonicScanResult): string {
  const time = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(scan.generatedAt));

  const lines = [
    `📈 <b>Telaah Harmonic Brief</b>`,
    `${escapeTelegramHtml(scan.date)} · ${scan.scanned}/${scan.universeSize} emiten dipindai · ${escapeTelegramHtml(time)} WIB`,
    "",
  ];

  if (scan.results.length === 0) {
    lines.push(
      "Belum ada pola bullish yang dekat area buy hari ini. Sabar, ya — peluang berikutnya bisa muncul besok.",
      "",
      "Ini bukan rekomendasi beli/jual."
    );
    return lines.join("\n");
  }

  lines.push(
    `<b>${scan.results.length} terdekat ke area buy</b>`,
    ""
  );

  scan.results.forEach((candidate, index) => {
    const best = candidate.best;
    const zoneWidth = ((best.prz.high - best.prz.low) / best.prz.low) * 100;
    const targetLine = Number.isFinite(best.targets.t1)
      ? ` · target ${number0.format(best.targets.t1)}/${number0.format(best.targets.t2)}`
      : "";
    const confluences =
      candidate.timeframes.length > 1
        ? ` · konfluensi ${candidate.timeframes.join(", ")}`
        : "";

    lines.push(
      `${index + 1}. <b>${escapeTelegramHtml(candidate.symbol)}</b> · ${best.timeframe} ${best.pattern} (${best.status})`,
      `   ${price(candidate.price)} · PRZ ${number0.format(best.prz.low)}–${number0.format(
        best.prz.high
      )} (${number2.format(zoneWidth)}%) · jarak ${number2.format(
        Math.abs(best.distancePct)
      )}% (${distanceLabel(best.distancePct)})`,
      `   Invalidasi ${number0.format(best.invalidation)}${targetLine}`,
      `   Skor ${candidate.score} · ${confluences || "1 timeframe"} · <a href="https://www.tradingview.com/chart/?symbol=IDX%3A${encodeURIComponent(
        candidate.symbol
      )}">chart</a>`,
      ""
    );
  });

  lines.push(
    "PRZ = Potential Reversal Zone. Pola harmonic tidak menjamin reversal; selalu pasang rencana invalidasi.",
    "Harga memakai close Yahoo terakhir; chart TradingView bisa memakai feed yang sedikit berbeda.",
    "Data Yahoo dapat tertunda. Bukan rekomendasi beli/jual."
  );

  return lines.join("\n");
}
