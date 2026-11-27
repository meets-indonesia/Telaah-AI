export type MarketDataErrorKind = "network" | "not_found" | "blocked" | "provider" | "config";

export class MarketDataError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly kind: MarketDataErrorKind = "provider"
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}

export function marketDataErrorMessage(error: unknown): string {
  if (error instanceof MarketDataError) return error.message;
  return "Sumber data pasar tidak dapat diakses. Coba lagi beberapa saat.";
}
