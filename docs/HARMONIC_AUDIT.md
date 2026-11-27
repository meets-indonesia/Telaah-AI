# Harmonic detector audit

Date: 26 November 2026

## Scope

Reviewed `src/lib/quant/harmonic.ts` and the harmonic screener. The detector is
deterministic and does not call an LLM.

## What the detector does

- Finds confirmed percentage ZigZag pivots.
- Validates XABCD windows against Gartley, Bat, Butterfly, Crab, Shark, and Cypher ratios.
- Computes a PRZ from the AD and CD Fibonacci zones.
- Returns invalidation, T1 (C), T2 (A), risk/reward, RSI context, and score.
- Supports bullish and bearish directions, completed and forming patterns.
- The screener scans 4H, 1D, 1W, and 1M. It defaults to bullish and now supports bearish and all-direction scans.

## Findings

1. Pattern ratio ranges are within the commonly published ranges. They are not
   a guarantee of a valid trade; different sources use slightly different
   tolerances.
2. The detector returns pivot dates but not pivot prices. The chart overlay
   needs both, so `pivotPrices` was added.
3. Scanning several ZigZag scales can produce the same pattern with different
   X points. Matches are now deduplicated by pattern, direction, status, and D
   date, keeping the best fit.
4. `forming` patterns project D with a fixed 0.886 retracement. They are
   informational and should not be treated as completed setups.
5. The buy-focused brief still uses bullish matches by default. The scanner
   page can switch to bearish or all-direction mode.
6. Yahoo data is delayed and can differ from the broker chart. The UI and
   Telegram brief disclose this.
7. The detector has no volume confirmation. Volume and flow are separate
   filters in the alert layer, not part of the pattern score.

## Fixes and coverage

- Added `pivotPrices` to `HarmonicMatch`.
- Deduplicated overlapping matches by D date.
- Added tests for pivot prices, completed Gartley detection, invalidation, and
  pattern ratio rejection.
- Added historical outcome tests for T1, T2, invalidation, and hit-rate
  aggregation.

## Validation snapshot

The stats endpoint now scans 40 liquid names across 4H, 1D, 1W, and 1M:

```text
223 historical patterns
Gartley 1W bullish: 41 samples, T1 65.9%, T2 41.5%
Shark 1D bullish: 32 samples, T1 12.5%, invalidated 71.9%
Butterfly 1D bearish: 29 samples, T1 62.1%, T2 55.2%
Cypher 1D bullish: 10 samples, T1 40.0%
```

These are historical observations, not a promise. The sample is still small for
some groups, and the outcome horizon is 60 bars without fees.

## Limitations

- Ratio ranges are a model, not a truth. False positives are expected.
- The ZigZag is percentage-based, so low-volatility and high-volatility stocks
  use different effective swings.
- Historical outcome statistics are measured on Yahoo daily data with a fixed
  60-bar horizon and do not include fees.
- No live order logic uses this detector.
