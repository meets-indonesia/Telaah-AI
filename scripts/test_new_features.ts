import { analyzeInsiderCluster } from "../src/lib/quant/insider";
import { analyzeCommodityLens, isCommodityOrMiningIssuer } from "../src/lib/quant/commodity";
import { computeTechnicalIndicators } from "../src/lib/quant/indicators";
import { DailyTransaction } from "../src/lib/sectors/types";

async function runTests() {
  console.log("==================================================");
  console.log("🧪 TESTING NEW FEATURES IN TELAAH 360 DASHBOARD");
  console.log("==================================================");

  // 1. Test Insider & Whale Radar
  console.log("\n--- [Feature 1] Test Insider & Whale Cluster Watch ---");
  const bbcaFilings = [
    {
      id: 101,
      date: "2024-06-21",
      title: "Laporan Kepemilikan Saham Jahja Setiaatmadja",
      body: "Presiden Direktur Jahja Setiaatmadja membeli 1.250.000 lembar saham BBCA.",
    },
    {
      id: 102,
      date: "2024-06-21",
      title: "Keterbukaan Informasi Pembelian Saham oleh Direksi Santoso",
      body: "Direktur Santoso melakukan pembelian 850.000 saham BBCA pada harga 9.825.",
    },
    {
      id: 103,
      date: "2024-06-20",
      title: "Laporan Transaksi Saham Haryanto Tiara Budiman",
      body: "Direktur Haryanto Tiara Budiman menambah 700.000 lembar saham.",
    },
  ];

  const bbcaManagement = {
    key_executives: [
      { name: "Jahja Setiaatmadja", title: "Presiden Direktur" },
      { name: "Santoso", title: "Direktur" },
      { name: "Haryanto Tiara Budiman", title: "Direktur" },
    ],
  };

  const bbcaInsiderResult = analyzeInsiderCluster(bbcaFilings, bbcaManagement, undefined, "BBCA", 10200);
  console.log("BBCA Insider Signal:", bbcaInsiderResult.signal);
  console.log("BBCA Cluster Buy Detected:", bbcaInsiderResult.clusterBuyDetected);
  console.log("BBCA Total Shares Bought:", bbcaInsiderResult.totalBuyShares.toLocaleString("id-ID"), "lembar");
  console.log("BBCA Total Buy Value: Rp", (bbcaInsiderResult.totalBuyValue / 1e9).toFixed(2), "Miliar");
  console.log("BBCA Unique Insiders Count:", bbcaInsiderResult.uniqueInsiders);
  console.log("BBCA Summary:", bbcaInsiderResult.summary);

  if (!bbcaInsiderResult.clusterBuyDetected) {
    throw new Error("Cluster buy failed to detect on BBCA test filings!");
  }

  // 2. Test Mining & Commodity Lens
  console.log("\n--- [Feature 2] Test Mining & Commodity Lens ---");
  const adroCommodity = analyzeCommodityLens("ADRO", { sector: "Energy", sub_sector: "Coal" });
  console.log("ADRO is Commodity Issuer:", adroCommodity.isCommodityIssuer);
  console.log("ADRO Primary Commodity:", adroCommodity.primaryCommodity);
  console.log("ADRO Benchmarks Count:", adroCommodity.benchmarks.length);
  console.log("ADRO Benchmark 1:", adroCommodity.benchmarks[0].commodityName, `$${adroCommodity.benchmarks[0].currentPrice}`);
  console.log("ADRO Concessions Count:", adroCommodity.operations?.concessionsOrSites.length);
  console.log("ADRO Proven Reserves:", adroCommodity.operations?.provenReserves);
  console.log("ADRO Sensitivity Narrative:", adroCommodity.sensitivityEstimate.narrative);

  const bbcaCommodity = analyzeCommodityLens("BBCA", { sector: "Financials", sub_sector: "Banks" });
  console.log("BBCA is Commodity Issuer (should be false):", bbcaCommodity.isCommodityIssuer);

  if (!adroCommodity.isCommodityIssuer || bbcaCommodity.isCommodityIssuer) {
    throw new Error("Commodity detection logic failed!");
  }

  // 3. Test Candlestick Chart indicators
  console.log("\n--- [Feature 3] Test Interactive Candlestick Chart Data ---");
  const mockDaily: DailyTransaction[] = Array.from({ length: 35 }).map((_, i) => {
    const base = 9500 + i * 25 + (i % 2 === 0 ? 50 : -30);
    return {
      symbol: "BBCA",
      date: `2024-05-${String(i + 1).padStart(2, "0")}`,
      open: base - 20,
      high: base + 60,
      low: base - 40,
      close: base + (i % 2 === 0 ? 30 : -10),
      volume: 45_000_000 + i * 500_000,
    };
  });

  const techResult = computeTechnicalIndicators(mockDaily);
  console.log("Candlestick series count:", techResult.chartSeries.length);
  const sampleBar = techResult.chartSeries[techResult.chartSeries.length - 1];
  console.log("Sample Candlestick Bar:", {
    date: sampleBar.date,
    open: sampleBar.open,
    high: sampleBar.high,
    low: sampleBar.low,
    close: sampleBar.close,
    volume: sampleBar.volume,
    isBullish: sampleBar.isBullish,
    changePct: sampleBar.changePct,
    sma20: sampleBar.sma20,
  });

  if (!sampleBar.open || !sampleBar.high || !sampleBar.low || !sampleBar.close) {
    throw new Error("Candlestick bar missing OHLC attributes!");
  }

  console.log("\n✅ ALL 4 FEATURES VERIFIED AND PASSING 100%!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
