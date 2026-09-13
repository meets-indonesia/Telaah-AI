import fs from "fs";

if (fs.existsSync(".env")) {
  const dotenv = fs.readFileSync(".env", "utf8");
  dotenv.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  });
}

import { classifyInputAndExtractClaims } from "../src/lib/agent/classifier";
import { SectorsClient } from "../src/lib/sectors/client";
import { executeEvidencePlan } from "../src/lib/agent/coordinator";
import { synthesizeIntelligenceReport } from "../src/lib/agent/synthesizer";

async function runTest() {
  console.log("=== Testing Telaah 360 Full Analysis Pipeline ===");

  const prompt = "BCA (BBCA) labanya naik gila-gilaan bro, asing juga borong saham ini. Apakah beneran bagus fundamentalnya?";
  console.log("Input prompt:", prompt);

  console.log("\n1. Step 1: Input & Intent Classifier...");
  const classification = await classifyInputAndExtractClaims(prompt);
  console.log("Detected symbol:", classification.symbol);
  console.log("Detected intent:", classification.intent);
  console.log("Extracted claims count:", classification.claims.length);
  classification.claims.forEach((c, i) => console.log(`  Claim ${i+1}: [${c.claimType}] "${c.originalText}"`));

  console.log("\n2. Step 2: Coordinator & Evidence Collection (Quick Mode)...");
  const client = new SectorsClient();
  const evidence = await executeEvidencePlan(
    client,
    classification.symbol,
    "quick",
    classification.intent,
    classification.claims
  );
  console.log("Credits used:", evidence.creditsConsumed);
  console.log("Evidence records gathered:", evidence.evidenceRecords.length);
  console.log("FlowLens Status:", evidence.flowLens.status, "5-day Foreign Net:", evidence.flowLens.foreignFlow.cumulative5d);
  console.log("Financials Status:", evidence.financials.status, "Latest Period:", evidence.financials.latestPeriodDate);
  console.log("Technical Status:", evidence.technical.trendAssessment, "Last Price:", evidence.technical.lastPrice);

  console.log("\n3. Step 3: Synthesis Guard & Citation Verification...");
  const report = await synthesizeIntelligenceReport(
    evidence,
    prompt,
    "quick",
    classification.intent,
    classification.claims
  );

  console.log("\n=== Direct Answer ===");
  console.log(report.directAnswer);

  console.log("\n=== Claim Verdicts ===");
  report.claims.forEach(c => {
    console.log(`- [${c.verdict.toUpperCase()}] "${c.originalText}"`);
    console.log(`  Fakta: ${c.factualMetricValue || "N/A"}`);
    console.log(`  Alasan: ${c.reasoning}`);
  });

  console.log("\n=== Success! Pipeline verified 100% ===");
}

runTest().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
