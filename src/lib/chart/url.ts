export function chartQuery(
  symbol: string,
  timeframe: string,
  harmonicTimeframe: string | null,
  compareSymbol?: string | null
): string {
  const params = new URLSearchParams({ symbol, tf: timeframe });
  if (harmonicTimeframe) params.set("htf", harmonicTimeframe);
  if (compareSymbol) params.set("compare", compareSymbol);
  return params.toString();
}
