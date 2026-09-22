import { BrokerRegistryItem, BrokerSummaryResponse, ForeignFlowResponse } from "../sectors/types";

export interface BrokerParticipantMetric {
  code: string;
  name: string;
  isForeign: boolean;
  cohort: string;
  buyValue: number;
  sellValue: number;
  netValue: number;
  buyLot: number;
  sellLot: number;
  netLot: number;
  buyAvgPrice: number;
  sellAvgPrice: number;
  frequency: number;
}

export interface BandarmologySummary {
  phase: "Akumulasi Kuat" | "Akumulasi Halus" | "Distribusi Aktif" | "Distribusi Halus" | "Netral / Tarik Tambang";
  topBuyersAvgPrice: number;
  topSellersAvgPrice: number;
  topBuyersSharePct: number;
  controllingCohort: "Asing / Institusi" | "Ritel Domestik" | "Campuran Seimbang";
  humanNarrative: string;
}

export interface FlowLensAnalysis {
  status: "available" | "partial" | "unavailable";
  startDate: string;
  endDate: string;
  totalTradingDays: number;
  totalTurnover: number;
  topBuyers: BrokerParticipantMetric[];
  topSellers: BrokerParticipantMetric[];
  cohortSummary: {
    foreignNetValue: number;
    domesticNetValue: number;
    institutionalNetValue: number;
    retailNetValue: number;
  };
  foreignFlow: {
    cumulative5d: number;
    cumulative14d: number;
    recentTrend: "Net Inflow" | "Net Outflow" | "Netral";
    series: Array<{ date: string; netInflow: number }>;
  };
  bandarmologySummary?: BandarmologySummary;
  limitationDisclaimer: string;
}

export function analyzeFlowLens(
  brokerSummaryData: BrokerSummaryResponse | null,
  foreignFlowData: ForeignFlowResponse | null,
  brokerRegistry: BrokerRegistryItem[]
): FlowLensAnalysis {
  const limitationDisclaimer =
    "PENTING (Compliance & Metodologi): Kode dan cohort broker adalah data agregat transaksi bursa, BUKAN identitas investor, BUKAN kepemilikan definitif, dan TIDAK merefleksikan niat atau koordinasi bandar.";

  const registryMap = new Map<string, BrokerRegistryItem>();
  for (const b of brokerRegistry) {
    registryMap.set(b.code.toUpperCase(), b);
  }

  if (!brokerSummaryData || !brokerSummaryData.data || brokerSummaryData.data.length === 0) {
    return {
      status: "unavailable",
      startDate: "",
      endDate: "",
      totalTradingDays: 0,
      totalTurnover: 0,
      topBuyers: [],
      topSellers: [],
      cohortSummary: {
        foreignNetValue: 0,
        domesticNetValue: 0,
        institutionalNetValue: 0,
        retailNetValue: 0,
      },
      foreignFlow: {
        cumulative5d: 0,
        cumulative14d: 0,
        recentTrend: "Netral",
        series: [],
      },
      limitationDisclaimer,
    };
  }

  const brokerMap = new Map<
    string,
    {
      buyValue: number;
      sellValue: number;
      buyLot: number;
      sellLot: number;
      buyWeightedSum: number;
      sellWeightedSum: number;
      frequency: number;
    }
  >();

  let totalTurnover = 0;
  const days = brokerSummaryData.data;
  const startDate = days[0]?.date || brokerSummaryData.start || "";
  const endDate = days[days.length - 1]?.date || brokerSummaryData.end || "";

  for (const day of days) {
    for (const item of day.summary) {
      const code = item.broker_code.toUpperCase();
      let entry = brokerMap.get(code);
      if (!entry) {
        entry = {
          buyValue: 0,
          sellValue: 0,
          buyLot: 0,
          sellLot: 0,
          buyWeightedSum: 0,
          sellWeightedSum: 0,
          frequency: 0,
        };
        brokerMap.set(code, entry);
      }

      entry.buyValue += item.bval || 0;
      entry.sellValue += item.sval || 0;
      entry.buyLot += item.blot || 0;
      entry.sellLot += item.slot || 0;
      entry.buyWeightedSum += (item.bavg_per_share || 0) * (item.blot || 0);
      entry.sellWeightedSum += (item.savg_per_share || 0) * (item.slot || 0);
      entry.frequency += (item.bfreq || 0) + (item.sfreq || 0);

      totalTurnover += (item.bval || 0) + (item.sval || 0);
    }
  }

  const participants: BrokerParticipantMetric[] = [];
  let foreignNet = 0;
  let domesticNet = 0;
  let instNet = 0;
  let retailNet = 0;

  for (const [code, val] of Array.from(brokerMap.entries())) {
    const reg = registryMap.get(code);
    const name = reg?.name || `Broker ${code}`;
    const isForeign = reg?.is_foreign || false;
    const cohort = reg?.cohort || "institutional";

    const netVal = val.buyValue - val.sellValue;
    const netLot = val.buyLot - val.sellLot;
    const buyAvg = val.buyLot > 0 ? Math.round(val.buyWeightedSum / val.buyLot) : 0;
    const sellAvg = val.sellLot > 0 ? Math.round(val.sellWeightedSum / val.sellLot) : 0;

    participants.push({
      code,
      name,
      isForeign,
      cohort,
      buyValue: val.buyValue,
      sellValue: val.sellValue,
      netValue: netVal,
      buyLot: val.buyLot,
      sellLot: val.sellLot,
      netLot,
      buyAvgPrice: buyAvg,
      sellAvgPrice: sellAvg,
      frequency: val.frequency,
    });

    if (isForeign) foreignNet += netVal;
    else domesticNet += netVal;

    if (cohort.toLowerCase().includes("retail")) retailNet += netVal;
    else instNet += netVal;
  }

  // Top buyers by net value descending
  const buyers = [...participants].sort((a, b) => b.netValue - a.netValue);
  const topBuyers = buyers.filter((b) => b.netValue > 0).slice(0, 5);

  // Top sellers by net value ascending (most negative net value)
  const sellers = [...participants].sort((a, b) => a.netValue - b.netValue);
  const topSellers = sellers.filter((s) => s.netValue < 0).slice(0, 5);

  // Foreign flow analysis
  const ffSeries: Array<{ date: string; netInflow: number }> = [];
  let cum5d = 0;
  let cum14d = 0;

  if (foreignFlowData?.data && foreignFlowData.data.length > 0) {
    const sortedFF = [...foreignFlowData.data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const item of sortedFF) {
      ffSeries.push({
        date: item.date,
        netInflow: item.net_foreign_inflow || 0,
      });
    }

    const last5 = sortedFF.slice(-5);
    cum5d = last5.reduce((acc, curr) => acc + (curr.net_foreign_inflow || 0), 0);

    const last14 = sortedFF.slice(-14);
    cum14d = last14.reduce((acc, curr) => acc + (curr.net_foreign_inflow || 0), 0);
  }

  let recentTrend: "Net Inflow" | "Net Outflow" | "Netral" = "Netral";
  if (cum5d > 5_000_000_000) recentTrend = "Net Inflow";
  else if (cum5d < -5_000_000_000) recentTrend = "Net Outflow";

  // Hitung Bandarmology Human Decoder
  const top3Buyers = topBuyers.slice(0, 3);
  const top3Sellers = topSellers.slice(0, 3);

  const top3BuyValue = top3Buyers.reduce((acc, b) => acc + b.buyValue, 0);
  const top3BuyLot = top3Buyers.reduce((acc, b) => acc + b.buyLot, 0);
  const top3BuyAvg = top3BuyLot > 0 ? Math.round(top3BuyValue / (top3BuyLot * 100)) : 0;

  const top3SellValue = top3Sellers.reduce((acc, s) => acc + s.sellValue, 0);
  const top3SellLot = top3Sellers.reduce((acc, s) => acc + s.sellLot, 0);
  const top3SellAvg = top3SellLot > 0 ? Math.round(top3SellValue / (top3SellLot * 100)) : 0;

  const top3NetBuyVal = top3Buyers.reduce((acc, b) => acc + b.netValue, 0);
  const topBuyersSharePct = totalTurnover > 0 ? Number(((top3BuyValue / totalTurnover) * 100).toFixed(1)) : 0;

  let controllingCohort: "Asing / Institusi" | "Ritel Domestik" | "Campuran Seimbang" = "Campuran Seimbang";
  if (foreignNet > 5_000_000_000 || instNet > 10_000_000_000) {
    controllingCohort = "Asing / Institusi";
  } else if (retailNet > 5_000_000_000) {
    controllingCohort = "Ritel Domestik";
  }

  let phase: "Akumulasi Kuat" | "Akumulasi Halus" | "Distribusi Aktif" | "Distribusi Halus" | "Netral / Tarik Tambang" = "Netral / Tarik Tambang";
  let humanNarrative = "";

  const buyerCodes = top3Buyers.map((b) => b.code).join(", ");
  const sellerCodes = top3Sellers.map((s) => s.code).join(", ");

  if (top3NetBuyVal > 20_000_000_000 && controllingCohort === "Asing / Institusi") {
    phase = "Akumulasi Kuat";
    humanNarrative = `Top broker (${buyerCodes || "Institusi"}) melakukan akumulasi masif senilai Rp ${(top3NetBuyVal / 1e9).toFixed(1)} Miliar dengan rata-rata harga borongan di kisaran Rp ${top3BuyAvg.toLocaleString("id-ID")}. Arus didominasi modal besar/asing.`;
  } else if (top3NetBuyVal > 5_000_000_000) {
    phase = "Akumulasi Halus";
    humanNarrative = `Terpantau akumulasi bertahap dari ${buyerCodes || "beberapa broker"} dengan rata-rata harga Rp ${top3BuyAvg.toLocaleString("id-ID")}. Barang mulai terkonsentrasi ke tangan partisipan besar.`;
  } else if (top3NetBuyVal < -20_000_000_000 || (foreignNet < -20_000_000_000 && retailNet > 10_000_000_000)) {
    phase = "Distribusi Aktif";
    humanNarrative = `Waspada distribusi agresif dari ${sellerCodes || "broker institusi"} sementara broker ritel banyak menampung barang. Rata-rata buang barang di kisaran Rp ${top3SellAvg.toLocaleString("id-ID")}.`;
  } else if (top3NetBuyVal < -5_000_000_000) {
    phase = "Distribusi Halus";
    humanNarrative = `Terdapat indikasi pelepasan muatan secara bertahap oleh ${sellerCodes || "broker utama"} di area Rp ${top3SellAvg.toLocaleString("id-ID")}.`;
  } else {
    phase = "Netral / Tarik Tambang";
    humanNarrative = `Kekuatan beli dan jual relatif seimbang antar broker, belum ada konsentrasi akumulasi atau distribusi searah yang dominan.`;
  }

  const bandarmologySummary: BandarmologySummary = {
    phase,
    topBuyersAvgPrice: top3BuyAvg,
    topSellersAvgPrice: top3SellAvg,
    topBuyersSharePct,
    controllingCohort,
    humanNarrative,
  };

  return {
    status: "available",
    startDate,
    endDate,
    totalTradingDays: days.length,
    totalTurnover,
    topBuyers,
    topSellers,
    cohortSummary: {
      foreignNetValue: foreignNet,
      domesticNetValue: domesticNet,
      institutionalNetValue: instNet,
      retailNetValue: retailNet,
    },
    foreignFlow: {
      cumulative5d: cum5d,
      cumulative14d: cum14d,
      recentTrend,
      series: ffSeries.slice(-20), // last 20 trading days
    },
    bandarmologySummary,
    limitationDisclaimer,
  };
}
