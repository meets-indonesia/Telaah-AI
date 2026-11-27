import { YahooClient } from "../src/lib/market/yahoo";
import { getMarketProvider } from "../src/lib/market";

async function main() {
  const yahoo = new YahooClient();

  for (const symbol of ["BBCA", "ADRO"]) {
    const daily = await yahoo.getDailyTransactions(symbol);
    const financials = await yahoo.getQuarterlyFinancials(symbol, 4);
    const snapshot = await yahoo.getCompanySnapshot(symbol);

    const latest = financials?.at(-1);
    console.log(symbol, {
      daily: daily.length,
      lastDate: daily.at(-1)?.date,
      quarters: financials?.length ?? null,
      latestPeriod: latest?.date,
      currency: latest?.currency,
      sourceCurrency: latest?.sourceCurrency,
      name: snapshot?.overview?.company_name ?? snapshot?.company_name,
      pe: snapshot?.valuation?.current_pe,
      pb: snapshot?.valuation?.current_pb,
      multipleBasis: snapshot?.valuation?.multipleBasis,
    });

    if (daily.length === 0) throw new Error(`${symbol}: no daily data`);
    if (!financials?.length) throw new Error(`${symbol}: no financials`);
    if (symbol === "ADRO" && latest?.currency !== "IDR") {
      throw new Error("ADRO: financials were not normalized to IDR");
    }
    if (snapshot?.valuation?.current_pb && snapshot.valuation.current_pb > 100) {
      throw new Error(`${symbol}: PB looks like a mixed-currency artifact`);
    }
  }

  const provider = getMarketProvider();
  console.log("provider", provider.id, [...provider.capabilities]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
