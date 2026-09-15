import { CommodityLensData, CompanyOverview } from "../sectors/types";

/**
 * Commodity Lens only renders verified provider data.
 * No static issuer profiles, prices, reserves, or sensitivity assumptions belong here.
 */
export function isCommodityOrMiningIssuer(
  _symbol: string,
  _overview?: CompanyOverview
): boolean {
  return false;
}

export function analyzeCommodityLens(
  _symbol: string,
  overview?: CompanyOverview
): CommodityLensData {
  return {
    isCommodityIssuer: false,
    status: "unavailable",
    reason: "Verified issuer and commodity data are unavailable from the current Sectors API subscription.",
    sectorBadge: overview?.sector || "Data tidak tersedia",
    primaryCommodity: "N/A",
    benchmarks: [],
    sensitivityEstimate: {
      baseCommodity: "N/A",
      priceShockPercent: 0,
      estimatedEbitdaImpactPercent: 0,
      narrative: "Data komoditas dan sensitivitas EBITDA tidak tersedia; tidak ada estimasi hardcoded yang digunakan.",
    },
  };
}
