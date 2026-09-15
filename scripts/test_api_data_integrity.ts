import assert from "node:assert/strict";
import { SectorsApiError } from "../src/lib/sectors/errors";
import { analyzeCommodityLens } from "../src/lib/quant/commodity";

// Sectors subscription failures must remain distinguishable from an empty dataset.
const subscriptionError = new SectorsApiError(
  401,
  "SUBSCRIPTION_DOES_NOT_ALLOW",
  "Your current subscription does not allow this request."
);
assert.equal(subscriptionError.kind, "subscription_not_allowed");
assert.equal(subscriptionError.status, 401);

// No issuer may receive a fabricated commodity profile or price.
const unavailable = analyzeCommodityLens("TPIA", {
  sector: "Basic Materials",
  sub_sector: "Chemicals",
});
assert.equal(unavailable.isCommodityIssuer, false);
assert.equal(unavailable.benchmarks.length, 0);
assert.equal(unavailable.sensitivityEstimate.priceShockPercent, 0);
assert.match(unavailable.sensitivityEstimate.narrative, /tidak tersedia/i);

console.log("API data-integrity checks passed");
