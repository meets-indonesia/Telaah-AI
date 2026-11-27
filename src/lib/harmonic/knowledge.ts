export type HarmonicKnowledgeTopic =
  | "structure"
  | "ratios"
  | "entry"
  | "invalidation"
  | "risk"
  | "evaluation";

export interface HarmonicKnowledgeDoc {
  id: string;
  pattern: string;
  topic: HarmonicKnowledgeTopic;
  title: string;
  content: string;
  source: string;
}

const TELAAH_RULES =
  "Telaah harmonic rule set, src/lib/quant/harmonic.ts (2026)";
const CARNEY = "Scott M. Carney, The Harmonic Trader (1999)";
const GARTLEY = "H. M. Gartley, Profits in the Stock Market (1935)";

export const HARMONIC_KNOWLEDGE: HarmonicKnowledgeDoc[] = [
  {
    id: "gartley-rules",
    pattern: "Gartley",
    topic: "ratios",
    title: "Gartley XABCD ratio rules",
    content:
      "Gartley is a five-point XABCD reversal pattern. The classical bullish form starts with X low, A high, B retracement, C rally, and D reversal near the 0.786 retracement of XA. Telaah checks AB/XA 0.568-0.668, BC/AB 0.382-0.886, CD/BC 1.13-1.618, and AD/XA 0.726-0.846. A bearish Gartley is the mirror image. The PRZ is built from the AD and CD Fibonacci zones; D must land inside that zone, not just near a single ratio.",
    source: `${GARTLEY}; ${CARNEY}; ${TELAAH_RULES}`,
  },
  {
    id: "gartley-trade",
    pattern: "Gartley",
    topic: "entry",
    title: "Gartley entry and risk notes",
    content:
      "A completed Gartley is only actionable when price is still inside the PRZ and has not crossed the invalidation level. Telaah computes invalidation slightly beyond the PRZ boundary (0.5% for bullish, 1.005 multiplier for bearish). T1 is the C pivot and T2 is the A pivot. A forming Gartley projects D from the XA leg and should be treated as a watchlist candidate, not a confirmed reversal. Confluence with a higher timeframe improves selectivity but does not remove the risk of a failed pattern.",
    source: `${CARNEY}; ${TELAAH_RULES}`,
  },
  {
    id: "bat-rules",
    pattern: "Bat",
    topic: "ratios",
    title: "Bat XABCD ratio rules",
    content:
      "The Bat pattern uses a deep 0.886 retracement of XA at D. Telaah checks AB/XA 0.382-0.5, BC/AB 0.382-0.886, CD/BC 1.618-2.618, and AD/XA 0.886-0.886. The PRZ is usually tighter than a Gartley because the 0.886 level is the anchor. The pattern is invalid if D breaks the PRZ; a forming Bat is a projection and must be rechecked after the next candles close.",
    source: `${CARNEY}; ${TELAAH_RULES}`,
  },
  {
    id: "bat-trade",
    pattern: "Bat",
    topic: "entry",
    title: "Bat entry and risk notes",
    content:
      "Bat entries are often taken at the 0.886 PRZ with invalidation just beyond the zone. Because the reversal zone can be narrow, slippage and gap risk matter more than in a wide Crab zone. T1 is the C pivot and T2 is the A pivot. A Bat with a weak fit score or a D far outside the PRZ should be excluded. The pattern is a hypothesis; it is not a guarantee of reversal.",
    source: `${CARNEY}; ${TELAAH_RULES}`,
  },
  {
    id: "butterfly-rules",
    pattern: "Butterfly",
    topic: "ratios",
    title: "Butterfly XABCD ratio rules",
    content:
      "Butterfly is an extension pattern: D overshoots X. Telaah checks AB/XA 0.786, BC/AB 0.382-0.886, CD/BC 1.618-2.24, and AD/XA 1.27-1.618. The bullish form ends at a low below X; the bearish form ends at a high above X. The PRZ is outside the original XA range, so the invalidation level is critical. A Butterfly that fails to extend beyond X is not a Butterfly.",
    source: `${CARNEY}; ${TELAAH_RULES}`,
  },
  {
    id: "butterfly-trade",
    pattern: "Butterfly",
    topic: "risk",
    title: "Butterfly risk notes",
    content:
      "Butterfly can produce large targets but also deep adverse excursions. Position size should assume the invalidation level can be hit before T1. T1 is the C pivot and T2 is the A pivot. In Telaah historical stats, Butterfly groups can show high invalidation rates depending on timeframe and direction; always check sample size and walk-forward stability before trusting a high T1 rate.",
    source: `${CARNEY}; ${TELAAH_RULES}`,
  },
  {
    id: "crab-rules",
    pattern: "Crab",
    topic: "ratios",
    title: "Crab XABCD ratio rules",
    content:
      "Crab is an extreme extension pattern anchored near the 1.618 extension of XA. Telaah checks AB/XA 0.382-0.618, BC/AB 0.382-0.886, CD/BC 2.24-3.618, and AD/XA 1.538-1.698. The D point is often far from the prior structure, so the PRZ can be wide. A Crab without a valid 1.618 extension should be treated as an ordinary reversal candidate, not a Crab.",
    source: `${CARNEY}; ${TELAAH_RULES}`,
  },
  {
    id: "crab-trade",
    pattern: "Crab",
    topic: "entry",
    title: "Crab entry and risk notes",
    content:
      "Crab entries require patience: D often forms after a fast extension, and the first touch of the PRZ may not hold. Use the invalidation level and a smaller initial size. T1 is the C pivot and T2 is the A pivot. The wide PRZ can make the reward-to-risk look attractive while hiding gap risk; check liquidity and the higher-timeframe trend.",
    source: `${CARNEY}; ${TELAAH_RULES}`,
  },
  {
    id: "shark-rules",
    pattern: "Shark",
    topic: "ratios",
    title: "Shark XABCD ratio rules",
    content:
      "Shark is a five-point pattern with a shallow XA retracement and an extended BC leg. Telaah checks AB/XA 0.382-0.618, BC/AB 1.13-1.618, CD/BC 1.618-2.24, and AD/XA 0.886-1.13. The D point can sit near or slightly beyond X, so the pattern is sensitive to the PRZ and invalidation definition. Shark is included in Telaah as a separate pattern because its geometry differs from Bat and Cypher.",
    source: `${CARNEY}; ${TELAAH_RULES}`,
  },
  {
    id: "shark-trade",
    pattern: "Shark",
    topic: "risk",
    title: "Shark risk notes",
    content:
      "Shark candidates should be treated cautiously when the D point is outside the PRZ or the pattern is still forming. T1 is the C pivot and T2 is the A pivot. Historical Telaah stats have shown weak and unstable Shark results in some timeframes; use the walk-forward fields and sample size before acting. A high score is not a substitute for invalidation discipline.",
    source: `${CARNEY}; ${TELAAH_RULES}`,
  },
  {
    id: "cypher-rules",
    pattern: "Cypher",
    topic: "ratios",
    title: "Cypher XABCD ratio rules",
    content:
      "Cypher uses a deep BC retracement and a D point near the 0.786 retracement of XC. Telaah checks AB/XA 0.382-0.618, BC/AB 1.13-1.414, CD/BC 1.27-2.0, and AD/XA 0.75-0.82 (mid 0.786). Cypher is not a Gartley variant: the BC leg is larger than the AB leg, and the D zone is defined relative to XC. A Cypher that does not respect the 0.786 XC zone is invalid.",
    source: `${CARNEY}; ${TELAAH_RULES}`,
  },
  {
    id: "cypher-trade",
    pattern: "Cypher",
    topic: "entry",
    title: "Cypher entry and risk notes",
    content:
      "Cypher entries are taken at the 0.786 XC zone with invalidation beyond the PRZ. T1 is the C pivot and T2 is the A pivot. Because the BC leg is extended, the pattern can look like a trend continuation; wait for a completed D and a reaction rather than anticipating the turn. Confluence with 1D/1W structure is a filter, not a guarantee.",
    source: `${CARNEY}; ${TELAAH_RULES}`,
  },
  {
    id: "xabcd-structure",
    pattern: "General",
    topic: "structure",
    title: "XABCD structure and PRZ",
    content:
      "Every Telaah harmonic pattern has five alternating pivots X-A-B-C-D. X is the origin, A the first extreme, B the first retracement, C the second impulse, and D the potential reversal point. The PRZ (Potential Reversal Zone) is the overlap of the AD and CD Fibonacci projections. A pattern is completed only when D is a confirmed pivot and price is inside the PRZ. A forming pattern projects D and is less reliable.",
    source: `${CARNEY}; ${TELAAH_RULES}`,
  },
  {
    id: "invalidation",
    pattern: "General",
    topic: "invalidation",
    title: "Invalidation and target logic",
    content:
      "Telaah places invalidation just beyond the PRZ: for bullish patterns it uses min(D, PRZ low) * 0.995; for bearish patterns max(D, PRZ high) * 1.005. T1 is the C pivot and T2 is the A pivot. A pattern is invalidated when price closes beyond the invalidation level before T1. The outcome stats count T2, T1, invalidated, and timeout separately; a high T1 rate with a high invalidation rate can still be a poor strategy.",
    source: `${TELAAH_RULES}; ${CARNEY}`,
  },
  {
    id: "confluence",
    pattern: "General",
    topic: "entry",
    title: "Timeframe confluence and swing horizons",
    content:
      "Use 4H and 1D patterns for daily swing setups, 1W for weekly swing setups, and 1M for monthly context. Confluence means the same symbol has a valid pattern on more than one timeframe. Confluence raises selectivity but also reduces the number of candidates. A 1D pattern inside a 1W PRZ is not automatically a high-probability trade; check the direction, invalidation distance, liquidity, and event risk.",
    source: `${TELAAH_RULES}`,
  },
  {
    id: "evaluation",
    pattern: "General",
    topic: "evaluation",
    title: "Evaluating a harmonic system without overfitting",
    content:
      "Judge a harmonic rule set with out-of-sample data, not with the same window used to tune it. Telaah reports sample size, T1/T2/invalidation rates, average days to T1, net target distance after fees, and a walk-forward split (first 60% versus the rest). A rule is not proven by one strong group. Require enough samples, stable results across both halves, and a realistic cost/slippage model. No harmonic system is perfect; the goal is a small, durable edge with controlled drawdown.",
    source: `${TELAAH_RULES}; ${CARNEY}`,
  },
];
