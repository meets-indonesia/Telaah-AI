import { SectorsClient } from "../sectors/client";
import {
  BrokerSummaryResponse,
  CompanyReport,
  CorporateActionsResponse,
  DailyTransaction,
  FilingItem,
  ForeignFlowResponse,
  NewsItem,
  QuarterlyFinancialMetrics,
  extractValuationMultiples,
} from "../sectors/types";
import { computeTechnicalIndicators, TechnicalAnalysisResult } from "../quant/indicators";
import { analyzeFinancialHealth, FinancialHealthAnalysis } from "../quant/financials";
import { analyzeFlowLens, FlowLensAnalysis } from "../quant/flow";
import {
  AnalysisMode,
  AtomicClaim,
  EventsTimelineData,
  EvidenceRecord,
  IntentType,
  PeerLensData,
} from "./types";
import {
  CorporateActionItem,
  InsiderClusterAnalysis,
  CommodityLensData,
} from "../sectors/types";
import { analyzeInsiderCluster } from "../quant/insider";
import { analyzeCommodityLens } from "../quant/commodity";

function normalizeCorporateActions(raw: any): CorporateActionItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "object") return [];

  const list: CorporateActionItem[] = [];

  // Dividends
  if (Array.isArray(raw.dividend)) {
    for (const d of raw.dividend) {
      list.push({
        date: d.ex_date || d.payment_date,
        action_type: "Dividen Tunai",
        description: `Dividen Rp ${d.dividend_amount ? d.dividend_amount.toLocaleString("id-ID") : "-"} per lembar saham`,
        amount: d.dividend_amount,
        ex_date: d.ex_date,
      });
    }
  }

  // Upcoming Dividends
  if (Array.isArray(raw.upcoming_dividend)) {
    for (const d of raw.upcoming_dividend) {
      list.push({
        date: d.ex_date || d.payment_date,
        action_type: "Dividen Mendatang",
        description: `Rencana dividen Rp ${d.dividend_amount ? d.dividend_amount.toLocaleString("id-ID") : "-"} per lembar saham`,
        amount: d.dividend_amount,
        ex_date: d.ex_date,
      });
    }
  }

  // Stock Split
  if (Array.isArray(raw.stock_split)) {
    for (const s of raw.stock_split) {
      list.push({
        date: s.date,
        action_type: "Stock Split",
        description: `Pemecahan nominal saham dengan rasio 1 : ${s.split_ratio || "-"}`,
        ratio: `1:${s.split_ratio}`,
      });
    }
  }

  // Rights Issue
  if (Array.isArray(raw.right_issue)) {
    for (const r of raw.right_issue) {
      list.push({
        date: r.date || r.ex_date,
        action_type: "Rights Issue",
        description: `Hak Memesan Efek Terlebih Dahulu (HMETD)${r.ratio ? ` rasio ${r.ratio}` : ""}${r.price ? ` harga Rp ${r.price}` : ""}`,
        ratio: r.ratio,
        price: r.price,
      });
    }
  }

  // AGM / RUPS
  if (Array.isArray(raw.agm)) {
    for (const a of raw.agm) {
      list.push({
        date: a.agm_date,
        action_type: "RUPS / Public Expose",
        description: `${a.agm_place || "Lokasi tidak disebutkan"}${a.agm_time ? ` (${a.agm_time})` : ""}`,
      });
    }
  }

  // Sort descending by date
  return list.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });
}

export interface EvidenceCollectionResult {
  symbol: string;
  companyName: string;
  overview?: any;
  valuation?: any;
  financials: FinancialHealthAnalysis;
  peerLens: PeerLensData;
  flowLens: FlowLensAnalysis;
  technical: TechnicalAnalysisResult;
  events: EventsTimelineData;
  ownership?: any;
  insiderRadar: InsiderClusterAnalysis;
  commodityLens: CommodityLensData;
  segments?: any;
  providerError?: string;
  evidenceRecords: EvidenceRecord[];
  creditsConsumed: number;
  toolCallTrace: Array<{ endpoint: string; params: any; credits: number; timestamp: string }>;
}

export async function executeEvidencePlan(
  client: SectorsClient,
  symbol: string,
  mode: AnalysisMode,
  intent: IntentType,
  claims: AtomicClaim[]
): Promise<EvidenceCollectionResult> {
  const clean = symbol.trim().toUpperCase().replace(".JK", "");
  const retrievedAt = new Date().toISOString();
  const evidenceRecords: EvidenceRecord[] = [];

  // Determine needed modules based on mode
  const needFlow =
    mode === "full" ||
    intent === "claim_check" ||
    intent === "market_technical" ||
    claims.some((c) => c.claimType === "flow");

  const needTechnical =
    mode === "full" ||
    intent === "market_technical" ||
    intent === "thesis_review" ||
    claims.some((c) => c.claimType === "price_technical");

  const needFinancials =
    mode === "full" ||
    intent === "company_overview" ||
    intent === "thesis_review" ||
    claims.some((c) => c.claimType === "financial" || c.claimType === "valuation");

  const needEvents =
    mode === "full" ||
    intent === "news_event" ||
    claims.some((c) => c.claimType === "event" || c.claimType === "flow");

  // Plan sections for company report - always include overview & valuation for terminal metrics
  const reportSections: Array<"overview" | "valuation" | "financials" | "peers" | "ownership" | "management"> = [
    "overview",
    "valuation",
  ];

  if (mode === "full") {
    reportSections.push("financials", "peers", "ownership", "management");
  } else {
    if (needFinancials) reportSections.push("financials");
  }

  // Pre-load broker registry from cache (0 credits)
  let brokerRegistry: import("../sectors/types").BrokerRegistryItem[];
  try {
    brokerRegistry = await client.getBrokersRegistry();
  } catch (error) {
    // Registry is optional, but provider failures still need to be visible in the report trace.
    brokerRegistry = [];
  }

  // Parallel asynchronous fetching with graceful fallbacks
  let companyReportPromise: Promise<CompanyReport | null> = client
    .getCompanyReport(clean, reportSections)
    .catch((err) => {
      console.warn(`Company report fetch failed for ${clean}:`, err.message);
      return null;
    });

  // Always fetch up to 90 days of daily transactions (1 credit in Sectors v2) so SMA20, SMA50, MACD, and charts are fully populated
  const ninetyDaysAgo = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  let dailyPromise: Promise<DailyTransaction[] | null> = client
    .getDailyTransactions(clean, ninetyDaysAgo)
    .catch((err) => {
      console.warn(`Daily transactions fetch failed for ${clean}:`, err.message);
      return null;
    });

  let brokerSummaryPromise: Promise<BrokerSummaryResponse | null> = needFlow
    ? client.getBrokerSummary(clean).catch(() => null)
    : Promise.resolve(null);

  let foreignFlowPromise: Promise<ForeignFlowResponse | null> = needFlow
    ? client.getForeignFlow(clean).catch(() => null)
    : Promise.resolve(null);

  let corporateActionsPromise: Promise<CorporateActionsResponse | null> = needEvents
    ? client.getCorporateActions(clean).catch(() => null)
    : Promise.resolve(null);

  let filingsPromise: Promise<{ results: FilingItem[] } | null> = needEvents
    ? client.getFilings(clean).catch(() => null)
    : Promise.resolve(null);

  let newsPromise: Promise<{ results: NewsItem[] } | null> = needEvents
    ? client.getNews(clean, 5).catch(() => null)
    : Promise.resolve(null);

  let suspensionsPromise: Promise<{ results: any[] } | null> = needEvents
    ? client.getSuspensions(clean).catch(() => null)
    : Promise.resolve(null);

  let quarterlyPromise: Promise<QuarterlyFinancialMetrics[] | null> = needFinancials
    ? client.getQuarterlyFinancials(clean, mode === "full" ? 4 : 2).catch(() => null)
    : Promise.resolve(null);

  let segmentsPromise: Promise<any | null> = client
    .getCompanySegments(clean)
    .catch(() => null);

  // Await all parallel fetches
  const [
    companyReport,
    dailyTransactions,
    brokerSummary,
    foreignFlow,
    corporateActions,
    filingsRes,
    newsRes,
    suspensionsRes,
    quarterlyData,
    segmentsData,
  ] = await Promise.all([
    companyReportPromise,
    dailyPromise,
    brokerSummaryPromise,
    foreignFlowPromise,
    corporateActionsPromise,
    filingsPromise,
    newsPromise,
    suspensionsPromise,
    quarterlyPromise,
    segmentsPromise,
  ]);

  const companyName = companyReport?.company_name || `PT ${clean} Tbk`;
  const providerErrors = [
    companyReport,
    dailyTransactions,
    brokerSummary,
    foreignFlow,
    corporateActions,
    filingsRes,
    newsRes,
    suspensionsRes,
    quarterlyData,
    segmentsData,
  ].every((value) => value === null)
    ? "Sectors API tidak mengembalikan data. Periksa subscription/API key Sectors."
    : undefined;

  if (providerErrors) {
    throw client.getLastError() instanceof Error ? client.getLastError() : new Error(providerErrors);
  }

  // 1. Process Overview Evidence
  if (companyReport?.overview) {
    evidenceRecords.push({
      id: "ev_overview_01",
      module: "overview",
      sourceEndpoint: `/v2/company/report/${clean}/?sections=overview`,
      asOfDate: retrievedAt.split("T")[0],
      retrievedAt,
      summary: `Profil emiten ${clean}: Sektor ${companyReport.overview.sector || "N/A"}, Subsektor ${
        companyReport.overview.sub_sector || "N/A"
      }, Market Cap Rp ${((companyReport.overview.market_cap || 0) / 1e12).toFixed(2)}T (Peringkat #${
        companyReport.overview.market_cap_rank || "-"
      }).`,
      rawData: companyReport.overview,
    });
  }

  // 2. Process Financials Engine
  const financials = analyzeFinancialHealth(
    quarterlyData || [],
    companyReport?.financials
  );

  if (financials.status !== "unavailable" && financials.latest) {
    evidenceRecords.push({
      id: "ev_fin_01",
      module: "financials",
      sourceEndpoint: `/v2/financials/quarterly/${clean}/`,
      asOfDate: financials.latestPeriodDate || retrievedAt.split("T")[0],
      retrievedAt,
      summary: `Kinerja keuangan periode ${financials.latestPeriodDate}: Pendapatan Rp ${(
        (financials.latest.revenue || 0) / 1e12
      ).toFixed(2)}T, Laba Bersih Rp ${((financials.latest.netIncome || 0) / 1e12).toFixed(
        2
      )}T, NPM ${financials.latest.netMarginPct ?? "-"}%, Pertumbuhan Laba YoY ${
        financials.yoyGrowth.netIncomePct !== null ? financials.yoyGrowth.netIncomePct + "%" : "N/A"
      }.`,
      rawData: financials,
    });
  }

  // 3. Process FlowLens Engine
  const flowLens = analyzeFlowLens(brokerSummary, foreignFlow, brokerRegistry);
  if (flowLens.status !== "unavailable") {
    evidenceRecords.push({
      id: "ev_flow_01",
      module: "flowlens",
      sourceEndpoint: `/v2/broker-summary/${clean}/ & /v2/foreign-flow/${clean}/`,
      asOfDate: flowLens.endDate || retrievedAt.split("T")[0],
      retrievedAt,
      summary: `FlowLens (${flowLens.totalTradingDays} hari bursa): Arus dana asing 5H Rp ${(
        flowLens.foreignFlow.cumulative5d / 1e9
      ).toFixed(1)}M (${flowLens.foreignFlow.recentTrend}). Top net buyer: ${
        flowLens.topBuyers[0] ? `${flowLens.topBuyers[0].code} (Rp ${(flowLens.topBuyers[0].netValue / 1e9).toFixed(1)}M)` : "-"
      }. Top net seller: ${
        flowLens.topSellers[0] ? `${flowLens.topSellers[0].code} (Rp ${(Math.abs(flowLens.topSellers[0].netValue) / 1e9).toFixed(1)}M)` : "-"
      }.`,
      rawData: {
        cohortSummary: flowLens.cohortSummary,
        foreignCumulative5d: flowLens.foreignFlow.cumulative5d,
        topBuyers: flowLens.topBuyers.slice(0, 3),
        topSellers: flowLens.topSellers.slice(0, 3),
      },
    });
  }

  // 4. Process Technical Engine
  const technical = computeTechnicalIndicators(dailyTransactions || []);
  if (technical.trendAssessment !== "Data Terbatas") {
    evidenceRecords.push({
      id: "ev_tech_01",
      module: "technical",
      sourceEndpoint: `/v2/daily/${clean}/`,
      asOfDate: technical.lastDate,
      retrievedAt,
      summary: `Data teknikal per ${technical.lastDate}: Harga Rp ${technical.lastPrice} (${
        technical.dailyReturnPct >= 0 ? "+" : ""
      }${technical.dailyReturnPct}%), SMA20 Rp ${technical.sma20 ?? "-"}, RSI(14) ${
        technical.rsi14 ?? "-"
      }, Trend: ${technical.trendAssessment}, Relative Volume: ${
        technical.volume.relativeVolume ? technical.volume.relativeVolume + "x" : "-"
      }.`,
      rawData: {
        lastPrice: technical.lastPrice,
        sma20: technical.sma20,
        sma50: technical.sma50,
        rsi14: technical.rsi14,
        macd: technical.macd,
        volume: technical.volume,
      },
    });
  }

  // 5. Process Peer Lens
  let peerLens: PeerLensData = {
    status: "unavailable",
    basis: "Subsektor",
    peers: [],
  };

  if (companyReport?.peers && companyReport.peers.length > 0) {
    const rawPeers = companyReport.peers[0]?.peers_data?.companies || [];
    const group = companyReport.peers[0]?.peers_data?.group_name?.sub_sector || "Sektor Serupa";
    
    // Validate up to 5 comparable peers
    const validPeers = rawPeers
      .filter((p: any) => p.symbol.toUpperCase().replace(".JK", "") !== clean)
      .slice(0, 5)
      .map((p: any) => ({
        symbol: p.symbol.toUpperCase().replace(".JK", ""),
        companyName: p.company_name,
        marketCap: p.market_cap,
        pe: p.pe_ttm ?? p.pe ?? null,
        pb: p.pb_mrq ?? p.pb ?? null,
        dividendYield: p.dividend_yield ?? null,
        isTarget: false,
      }));

    if (validPeers.length > 0) {
      // Add target company to comparison list
      const multiples = extractValuationMultiples(companyReport?.valuation);
      const targetCompanyItem = {
        symbol: clean,
        companyName,
        marketCap: companyReport.overview?.market_cap || 0,
        pe: multiples.pe,
        pb: multiples.pb,
        dividendYield: null,
        isTarget: true,
      };

      peerLens = {
        status: "available",
        basis: group,
        peers: [targetCompanyItem, ...validPeers],
      };

      evidenceRecords.push({
        id: "ev_peers_01",
        module: "valuation",
        sourceEndpoint: `/v2/company/report/${clean}/?sections=peers,valuation`,
        asOfDate: retrievedAt.split("T")[0],
        retrievedAt,
        summary: `Peer Lens pembanding untuk subsektor ${group} dengan ${validPeers.length} emiten kompetitor.`,
        rawData: peerLens.peers,
      });
    }
  }

  // 6. Process Events & Timeline
  const normalizedActions = normalizeCorporateActions(corporateActions?.corporate_actions);
  const events: EventsTimelineData = {
    status:
      normalizedActions.length > 0 ||
      (filingsRes?.results && filingsRes.results.length > 0) ||
      (newsRes?.results && newsRes.results.length > 0)
        ? "available"
        : "partial",
    actions: normalizedActions,
    filings: filingsRes?.results || [],
    news: newsRes?.results || [],
    suspensions: suspensionsRes?.results || [],
  };

  if (events.status !== "partial" || events.news.length > 0 || events.actions.length > 0) {
    evidenceRecords.push({
      id: "ev_events_01",
      module: "events",
      sourceEndpoint: `/v2/company/corporate-actions/${clean}/, /v2/filings/, /v2/news/`,
      asOfDate: retrievedAt.split("T")[0],
      retrievedAt,
      summary: `Terdapat ${normalizedActions.length} aksi korporasi tercatat, ${events.filings.length} keterbukaan kepemilikan/insider, dan ${events.news.length} berita terbaru.`,
      rawData: {
        actionsCount: normalizedActions.length,
        filingsCount: events.filings.length,
        newsCount: events.news.length,
      },
    });
  }

  // 7. Process Whale & Insider Cluster Watch Engine
  const insiderRadar = analyzeInsiderCluster(
    events.filings,
    companyReport?.management,
    companyReport?.ownership,
    clean,
    technical.lastPrice
  );

  if (insiderRadar.status !== "unavailable") {
    evidenceRecords.push({
      id: "ev_insider_01",
      module: "insider",
      sourceEndpoint: `/v2/filings/?symbol=${clean} & /v2/company/report/${clean}/?sections=management,ownership`,
      asOfDate: retrievedAt.split("T")[0],
      retrievedAt,
      summary: `Insider & Whale Radar: ${insiderRadar.summary}`,
      rawData: {
        signal: insiderRadar.signal,
        score: insiderRadar.score,
        clusterBuy: insiderRadar.clusterBuyDetected,
        clusterSell: insiderRadar.clusterSellDetected,
        totalBuyShares: insiderRadar.totalBuyShares,
        actors: insiderRadar.insiderActors,
      },
    });
  }

  // 8. Process Mining & Commodity Lens Engine
  const commodityLens = analyzeCommodityLens(clean, companyReport?.overview);
  if (commodityLens.isCommodityIssuer) {
    evidenceRecords.push({
      id: "ev_commodity_01",
      module: "commodity",
      sourceEndpoint: `/v2/mining/* & Acuan Komoditas Global (${commodityLens.primaryCommodity})`,
      asOfDate: retrievedAt.split("T")[0],
      retrievedAt,
      summary: `Commodity Lens: Emiten komoditas dengan eksposur utama ${commodityLens.primaryCommodity}. ${commodityLens.sensitivityEstimate.narrative}`,
      rawData: {
        primaryCommodity: commodityLens.primaryCommodity,
        benchmarks: commodityLens.benchmarks,
        operations: commodityLens.operations,
        sensitivity: commodityLens.sensitivityEstimate,
      },
    });
  }

  // 9. Process Segments Breakdown Engine
  if (segmentsData?.revenue_breakdown && Array.isArray(segmentsData.revenue_breakdown)) {
    const revSources = segmentsData.revenue_breakdown
      .filter((x: any) => x.target === "Total Revenue" && x.value > 0)
      .map((x: any) => `${x.source} (Rp ${(x.value / 1e12).toFixed(2)}T)`);

    if (revSources.length > 0) {
      evidenceRecords.push({
        id: "ev_segments_01",
        module: "segments",
        sourceEndpoint: `/v2/company/get-segments/${clean}/`,
        asOfDate: String(segmentsData.financial_year || retrievedAt.split("T")[0]),
        retrievedAt,
        summary: `Segmen Pendapatan Resmi (${segmentsData.financial_year}): ${revSources.join(", ")}`,
        rawData: segmentsData,
      });
    }
  }

  return {
    symbol: clean,
    companyName,
    overview: companyReport?.overview,
    valuation: companyReport?.valuation ? {
      ...companyReport.valuation,
      ...extractValuationMultiples(companyReport.valuation),
    } : undefined,
    financials,
    peerLens,
    flowLens,
    technical,
    events,
    ownership: companyReport?.ownership,
    insiderRadar,
    commodityLens,
    segments: segmentsData,
    providerError: providerErrors,
    evidenceRecords,
    creditsConsumed: client.getCreditsUsed(),
    toolCallTrace: client.getCallLog(),
  };
}
