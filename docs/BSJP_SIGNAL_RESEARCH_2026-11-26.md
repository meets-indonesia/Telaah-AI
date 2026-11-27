# BSJP signal research, 26 November 2026

This experiment tests whether a different signal or exit can escape the
next-open mean reversion that made the first BSJP backtest negative.

## Setup

- Universe: 26 JII70 syariah names from the BSJP liquid list.
- Period: 29 November 2021 to 26 November 2026.
- Costs: buy 0.15%, sell 0.25%, slippage 0.15% per side.
- Maximum 1 or 2 positions, 25% of equity each.
- Signals:
  - `momentum`: strong close, volume, uptrend, RSI 50-72.
  - `reversal`: weak close in an uptrend, volume, RSI 30-55.
  - `breakout`: close above the previous 20-day high, volume, uptrend.
  - `random`: deterministic random pick from liquid syariah names.
- Exits:
  - `next_open`: sell at the next open.
  - `next_close`: sell at the next close.
- Market filter: IHSG above EMA20.

## Results

All 16 combinations were negative after costs.

| Signal | Exit | Max pos | Total return | Max DD | Sharpe | Trades | Win rate | Avg gross | Avg net | PF |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| reversal | next_open | 1 | -6.54% | 7.76% | -0.87 | 72 | 25.0% | +0.16% | -0.38% | 0.41 |
| reversal | next_open | 2 | -6.87% | 8.06% | -0.91 | 78 | 24.4% | +0.16% | -0.37% | 0.40 |
| reversal | next_close | 2 | -9.28% | 10.88% | -0.77 | 78 | 48.7% | +0.04% | -0.50% | 0.58 |
| momentum | next_open | 1 | -11.62% | 13.02% | -1.67 | 204 | 30.4% | +0.30% | -0.25% | 0.47 |
| breakout | next_open | 1 | -12.91% | 12.98% | -2.01 | 191 | 29.3% | +0.27% | -0.29% | 0.40 |
| random | next_open | 1 | -39.83% | 40.05% | -3.44 | 634 | 27.1% | n/a | -0.32% | 0.36 |
| random | next_close | 2 | -83.46% | 83.55% | -3.72 | 1268 | 34.7% | n/a | -0.57% | 0.44 |

## Interpretation

- The signals do contain information: reversal and momentum beat the random
  baseline by a wide margin.
- The best structural variant is **reversal**, not momentum: buy a weak close
  in an uptrend and sell the next open.
- The average gross move of the best variant is about **0.16%**, far below the
  roughly 0.70% round-trip cost.
- Holding to the next close does not help; it adds exposure and costs.
- No combination has a positive expectancy after realistic retail costs.

The honest conclusion is that this BSJP implementation is not viable at the
current cost structure. A lower-cost execution route or a longer holding
period would be required, and both change the strategy.

## Next experiments

1. Test the reversal signal with 2- and 3-day holds to amortize costs.
2. Test a limit-order entry near the close to reduce slippage.
3. Record actual 15:50 and 09:00 snapshots for paper validation.
4. Test a broker cost model below 0.2% round trip, clearly labelled as an
   assumption, not a live quote.
5. Compare any survivor with the random-liquid baseline again.

Do not promote this to live trading.
