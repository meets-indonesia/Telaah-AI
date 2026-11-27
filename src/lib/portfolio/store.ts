export interface Holding {
  symbol: string;
  lots: number;
  avgPrice: number;
}

const KEY = "telaah_portfolio_v1";

export function loadHoldings(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]") as Holding[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        /^[A-Z]{4}$/.test(item.symbol) &&
        Number.isFinite(item.lots) &&
        item.lots > 0 &&
        Number.isFinite(item.avgPrice) &&
        item.avgPrice > 0
    );
  } catch {
    return [];
  }
}

export function saveHoldings(holdings: Holding[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(holdings.slice(0, 25)));
  window.dispatchEvent(new Event("telaah:storage"));
}

export function upsertHolding(holding: Holding): Holding[] {
  const current = loadHoldings();
  const index = current.findIndex((item) => item.symbol === holding.symbol);
  if (index >= 0) current[index] = holding;
  else current.push(holding);
  saveHoldings(current);
  return loadHoldings();
}

export function removeHolding(symbol: string): Holding[] {
  const next = loadHoldings().filter((item) => item.symbol !== symbol);
  saveHoldings(next);
  return next;
}
