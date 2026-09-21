import { QuarterlyFinancialMetrics, FinancialsReportData } from "../sectors/types";

export interface NormalizedFinancialPeriod {
  date: string;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  grossMarginPct: number | null;
  operatingMarginPct: number | null;
  netMarginPct: number | null;
  totalAssets: number | null;
  totalDebt: number | null;
  totalEquity: number | null;
  cashAndEquivalents: number | null;
  debtToEquity: number | null;
  cashFlowOperating: number | null;
  freeCashFlow: number | null;
}

export interface FinancialHealthAnalysis {
  status: "available" | "partial" | "unavailable";
  latestPeriodDate: string | null;
  currency: string;
  unit: string;
  latest: NormalizedFinancialPeriod | null;
  qoqGrowth: {
    revenuePct: number | null;
    netIncomePct: number | null;
  };
  yoyGrowth: {
    revenuePct: number | null;
    netIncomePct: number | null;
  };
  periods: NormalizedFinancialPeriod[];
  solvencyHealth: {
    debtToEquityRatio: number | null;
    hasNetCash: boolean | null;
    description: string;
  };
}

function calcMargin(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator === null || numerator === undefined || denominator === null || denominator === undefined || denominator === 0) {
    return null;
  }
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function calcGrowth(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current === null || current === undefined || previous === null || previous === undefined || previous === 0) {
    return null;
  }
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(2));
}

function normalizeGrowthRatio(val: number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  // If absolute value is small ratio (e.g. 0.0639 -> 6.39%)
  const pct = Math.abs(val) <= 2 ? val * 100 : val;
  return Number(pct.toFixed(2));
}

export function analyzeFinancialHealth(
  quarterlyData: QuarterlyFinancialMetrics[],
  companyReportFinancials?: FinancialsReportData
): FinancialHealthAnalysis {
  if (!quarterlyData || quarterlyData.length === 0) {
    // If quarterly endpoint is empty, check if companyReportFinancials has anything
    if (companyReportFinancials?.historical_financials && companyReportFinancials.historical_financials.length > 0) {
      const hist = companyReportFinancials.historical_financials;
      const latest = hist[hist.length - 1];
      const prev = hist.length > 1 ? hist[hist.length - 2] : null;

      const normLatest: NormalizedFinancialPeriod = {
        date: latest.date,
        revenue: latest.revenue ?? null,
        grossProfit: latest.gross_profit ?? null,
        operatingIncome: latest.operating_profit ?? null,
        netIncome: latest.net_income ?? null,
        grossMarginPct: calcMargin(latest.gross_profit, latest.revenue),
        operatingMarginPct: calcMargin(latest.operating_profit, latest.revenue),
        netMarginPct: calcMargin(latest.net_income, latest.revenue),
        totalAssets: null,
        totalDebt: null,
        totalEquity: null,
        cashAndEquivalents: null,
        debtToEquity: null,
        cashFlowOperating: null,
        freeCashFlow: null,
      };

      return {
        status: "partial",
        latestPeriodDate: latest.date,
        currency: "IDR",
        unit: "Rupiah",
        latest: normLatest,
        qoqGrowth: {
          revenuePct: prev ? calcGrowth(latest.revenue, prev.revenue) : null,
          netIncomePct: prev ? calcGrowth(latest.net_income, prev.net_income) : null,
        },
        yoyGrowth: {
          revenuePct: normalizeGrowthRatio(companyReportFinancials.yoy_quarter_revenue_growth),
          netIncomePct: normalizeGrowthRatio(companyReportFinancials.yoy_quarter_earnings_growth),
        },
        periods: [normLatest],
        solvencyHealth: {
          debtToEquityRatio: null,
          hasNetCash: null,
          description: "Data neraca kuartalan terbatas.",
        },
      };
    }

    return {
      status: "unavailable",
      latestPeriodDate: null,
      currency: "IDR",
      unit: "Rupiah",
      latest: null,
      qoqGrowth: { revenuePct: null, netIncomePct: null },
      yoyGrowth: { revenuePct: null, netIncomePct: null },
      periods: [],
      solvencyHealth: {
        debtToEquityRatio: null,
        hasNetCash: null,
        description: "Data finansial tidak tersedia untuk emiten ini.",
      },
    };
  }

  // Sort ascending by date
  const sorted = [...quarterlyData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const periods: NormalizedFinancialPeriod[] = sorted.map((q) => {
    const rev = q.revenue ?? (q.financials_sector_metrics?.interest_income ?? null);
    const net = q.earnings ?? null;
    const gross = q.gross_profit ?? (q.financials_sector_metrics?.net_interest_income ?? null);
    const op = q.operating_pnl ?? q.ebit ?? null;
    const debt = q.total_debt ?? null;
    const equity = q.total_equity ?? null;
    const cash = q.cash_and_short_term_investments ?? null;

    let d2e: number | null = null;
    if (debt !== null && equity !== null && equity !== 0) {
      d2e = Number((debt / equity).toFixed(2));
    }

    return {
      date: q.date,
      revenue: rev,
      grossProfit: gross,
      operatingIncome: op,
      netIncome: net,
      grossMarginPct: calcMargin(gross, rev),
      operatingMarginPct: calcMargin(op, rev),
      netMarginPct: calcMargin(net, rev),
      totalAssets: q.total_assets ?? null,
      totalDebt: debt,
      totalEquity: equity,
      cashAndEquivalents: cash,
      debtToEquity: d2e,
      cashFlowOperating: q.operating_cash_flow ?? null,
      freeCashFlow: q.free_cash_flow ?? null,
    };
  });

  const latest = periods[periods.length - 1];
  const prevQ = periods.length >= 2 ? periods[periods.length - 2] : null;
  // YoY comparison: 4 quarters prior
  const prevYoY = periods.length >= 5 ? periods[periods.length - 5] : null;

  const qoqRev = prevQ ? calcGrowth(latest.revenue, prevQ.revenue) : null;
  const qoqNet = prevQ ? calcGrowth(latest.netIncome, prevQ.netIncome) : null;

  const yoyRev = prevYoY
    ? calcGrowth(latest.revenue, prevYoY.revenue)
    : normalizeGrowthRatio(companyReportFinancials?.yoy_quarter_revenue_growth);
  const yoyNet = prevYoY
    ? calcGrowth(latest.netIncome, prevYoY.netIncome)
    : normalizeGrowthRatio(companyReportFinancials?.yoy_quarter_earnings_growth);

  let solvencyDesc = "Data solvabilitas belum lengkap.";
  let hasNetCash: boolean | null = null;
  if (latest.totalDebt !== null && latest.cashAndEquivalents !== null) {
    hasNetCash = latest.cashAndEquivalents > latest.totalDebt;
    if (hasNetCash) {
      solvencyDesc = "Posisi Net Cash (Kas lebih besar dari total utang berbunga).";
    } else if (latest.debtToEquity !== null && latest.debtToEquity > 2.0) {
      solvencyDesc = `Debt-to-Equity tinggi (${latest.debtToEquity}x). Perhatikan beban bunga.`;
    } else if (latest.debtToEquity !== null) {
      solvencyDesc = `Debt-to-Equity sehat (${latest.debtToEquity}x).`;
    }
  }

  return {
    status: "available",
    latestPeriodDate: latest.date,
    currency: "IDR",
    unit: "Rupiah",
    latest,
    qoqGrowth: {
      revenuePct: qoqRev,
      netIncomePct: qoqNet,
    },
    yoyGrowth: {
      revenuePct: yoyRev,
      netIncomePct: yoyNet,
    },
    periods,
    solvencyHealth: {
      debtToEquityRatio: latest.debtToEquity,
      hasNetCash,
      description: solvencyDesc,
    },
  };
}
