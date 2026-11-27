import type { CompanyIntelligenceReport } from "@/lib/agent/types";
import type { CorporateActionItem } from "@/lib/sectors/types";

export interface DividendInfo {
  hasDividend: boolean;
  dividendPerShare: number | null;
  yieldPct: number | null;
  latestAction?: CorporateActionItem;
}

/**
 * A dividend button is only useful when the active issuer actually has a
 * dividend in its events or a positive peer dividend yield. Missing data is
 * not treated as "pays zero"; it is treated as unknown.
 */
export function extractDividendInfo(
  report: Pick<
    CompanyIntelligenceReport,
    "symbol" | "events" | "peerLens" | "technical"
  >
): DividendInfo {
  const actions = report.events?.actions ?? [];
  const dividendActions = actions
    .filter((action) =>
      /dividen|dividend/i.test(
        `${action.action_type ?? ""} ${action.description ?? ""}`
      )
    )
    .sort((left, right) =>
      String(right.date ?? "").localeCompare(String(left.date ?? ""))
    );

  const latestAction = dividendActions.find(
    (action) => typeof action.amount === "number" && action.amount > 0
  );

  const targetPeer = report.peerLens?.peers?.find(
    (peer) => peer.isTarget || peer.symbol === report.symbol
  );
  const peerYield =
    targetPeer?.dividendYield !== null &&
    targetPeer?.dividendYield !== undefined &&
    targetPeer.dividendYield > 0
      ? targetPeer.dividendYield * 100
      : null;

  const price = report.technical?.lastPrice;
  const computedYield =
    latestAction?.amount && price && price > 0
      ? (latestAction.amount / price) * 100
      : null;

  return {
    hasDividend: dividendActions.length > 0 || peerYield !== null,
    dividendPerShare: latestAction?.amount ?? null,
    yieldPct: peerYield ?? computedYield,
    latestAction,
  };
}
