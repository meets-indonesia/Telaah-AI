import {
  loadPaperPositions,
  paperPath,
  type PaperPosition,
} from "@/lib/bsjp/paper";
import { createTelegramClient } from "@/lib/telegram/client";
import { loadTelegramConfig } from "@/lib/telegram/config";

export interface PaperReport {
  generatedAt: string;
  total: number;
  open: number;
  closed: number;
  winRatePct: number;
  totalNetPct: number;
  avgNetPct: number;
  avgGrossPct: number;
  avgEntrySlippagePct: number | null;
  avgExitSlippagePct: number | null;
  profitFactor: number;
  positions: PaperPosition[];
}

function average(values: number[]): number {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

export function summarizePaper(
  positions: PaperPosition[],
  now = new Date()
): PaperReport {
  const closed = positions.filter((position) => position.status === "closed");
  const wins = closed.filter((position) => (position.netPct ?? 0) > 0);
  const losses = closed.filter((position) => (position.netPct ?? 0) < 0);
  const grossSum = losses.reduce(
    (total, position) => total + Math.abs(position.netPct ?? 0),
    0
  );
  return {
    generatedAt: now.toISOString(),
    total: positions.length,
    open: positions.filter((position) => position.status === "open").length,
    closed: closed.length,
    winRatePct: closed.length ? (wins.length / closed.length) * 100 : 0,
    totalNetPct: closed.reduce(
      (total, position) => total + (position.netPct ?? 0),
      0
    ),
    avgNetPct: average(closed.map((position) => position.netPct ?? 0)),
    avgGrossPct: average(closed.map((position) => position.grossPct ?? 0)),
    avgEntrySlippagePct:
      closed.filter((position) => position.entrySlippagePct !== undefined).length
        ? average(
            closed
              .filter((position) => position.entrySlippagePct !== undefined)
              .map((position) => position.entrySlippagePct ?? 0)
          )
        : null,
    avgExitSlippagePct:
      closed.filter((position) => position.exitSlippagePct !== undefined).length
        ? average(
            closed
              .filter((position) => position.exitSlippagePct !== undefined)
              .map((position) => position.exitSlippagePct ?? 0)
          )
        : null,
    profitFactor: grossSum > 0
      ? wins.reduce((total, position) => total + (position.netPct ?? 0), 0) /
        grossSum
      : wins.length > 0
        ? 999
        : 0,
    positions,
  };
}

export function formatPaperReport(report: PaperReport): string {
  const lines = [
    `📊 <b>BSJP paper report</b> · ${new Date(report.generatedAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}`,
    `Posisi: ${report.total} · open ${report.open} · closed ${report.closed}`,
    `Win rate: ${report.winRatePct.toFixed(1)}% · net total ${report.totalNetPct >= 0 ? "+" : ""}${report.totalNetPct.toFixed(2)}% · PF ${report.profitFactor.toFixed(2)}`,
    `Rata-rata net/trade: ${report.avgNetPct >= 0 ? "+" : ""}${report.avgNetPct.toFixed(2)}% · gross ${report.avgGrossPct >= 0 ? "+" : ""}${report.avgGrossPct.toFixed(2)}%`,
  ];
  if (report.avgEntrySlippagePct !== null) {
    lines.push(
      `Entry vs close: ${report.avgEntrySlippagePct >= 0 ? "+" : ""}${report.avgEntrySlippagePct.toFixed(2)}%`
    );
  }
  if (report.avgExitSlippagePct !== null) {
    lines.push(
      `Exit vs open: ${report.avgExitSlippagePct >= 0 ? "+" : ""}${report.avgExitSlippagePct.toFixed(2)}%`
    );
  }
  lines.push("Paper only, bukan rekomendasi.");
  return lines.join("\n");
}

export async function runPaperReport(options: {
  now?: Date;
  dryRun?: boolean;
  notify?: boolean;
  filePath?: string;
  chatId?: string | number;
  send?: (chatId: string | number, text: string) => Promise<void>;
} = {}): Promise<{ report: PaperReport; message: string; sent: boolean }> {
  const store = await loadPaperPositions(options.filePath ?? paperPath());
  const report = summarizePaper(store.positions, options.now);
  const message = formatPaperReport(report);
  if (options.dryRun || !options.notify) {
    return { report, message, sent: false };
  }
  const config = loadTelegramConfig();
  const chatId = options.chatId ?? config?.briefChatId ?? config?.ownerId ?? null;
  const send =
    options.send ??
    (config ? createTelegramClient(config.botToken).sendMessage : null);
  if (!send || !chatId) return { report, message, sent: false };
  await send(chatId, message);
  return { report, message, sent: true };
}
