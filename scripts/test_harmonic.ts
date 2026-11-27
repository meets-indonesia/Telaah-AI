import { scanHarmonicUniverse } from "../src/lib/screener/harmonic-screener";
import { LIQUID_IDX_UNIVERSE } from "../src/lib/screener/universe";

async function main() {
  const flags = process.argv.slice(2).filter((arg) => arg.startsWith("--"));
  const symbols = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const universe = flags.includes("--all")
    ? LIQUID_IDX_UNIVERSE
    : symbols.length > 0
      ? symbols
      : ["BBCA", "TLKM", "ANTM", "BBRI", "ASII"];

  console.log(`Scanning ${universe.length} ticker(s): ${universe.join(", ")}`);
  const result = await scanHarmonicUniverse({
    symbols: universe,
    refresh: true,
  });

  console.log(
    `\n${result.date} | scanned ${result.scanned}/${result.universeSize} | failed ${result.failed}`
  );

  if (result.results.length === 0) {
    console.log("No bullish harmonic candidate near a buy zone.");
  }

  for (const [index, candidate] of result.results.entries()) {
    const best = candidate.best;
    console.log(
      [
        `${index + 1}. ${candidate.symbol} (${best.timeframe} ${best.pattern} ${best.status})`,
        `price ${candidate.price}`,
        `PRZ ${best.prz.low}-${best.prz.high}`,
        `distance ${best.distancePct}%`,
        `invalidation ${best.invalidation}`,
        `targets ${best.targets.t1}/${best.targets.t2}`,
        `score ${candidate.score}`,
        `confluence ${candidate.timeframes.join(",")}`,
      ].join(" | ")
    );
  }

  for (const limitation of result.limitations) {
    console.log(`- ${limitation}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
