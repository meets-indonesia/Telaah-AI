import { MarketDataError } from "./errors";
import { OpenMarketProvider } from "./open-market";
import { SectorsProvider } from "./sectors-provider";
import type { MarketDataProvider } from "./provider";

export function getMarketProvider(): MarketDataProvider {
  const mode = (process.env.MARKET_DATA_PROVIDER || "open").trim().toLowerCase();

  if (mode === "sectors") {
    if (!process.env.SECTORS_API_KEY) {
      throw new MarketDataError(
        "MARKET_DATA_PROVIDER=sectors requires SECTORS_API_KEY.",
        "sectors",
        "config"
      );
    }
    return new SectorsProvider();
  }

  if (mode === "open") {
    return new OpenMarketProvider();
  }

  throw new MarketDataError(
    `Unknown MARKET_DATA_PROVIDER "${mode}". Use "open" or "sectors".`,
    "provider",
    "config"
  );
}

export type { MarketDataProvider } from "./provider";
