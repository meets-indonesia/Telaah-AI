# BSJP reversal hold research, 26 November 2026

This experiment tests the best signal from the previous study, `reversal`,
with 2-day and 3-day holds and three cost assumptions.

## Setup

- Universe: 26 JII70 syariah names.
- Period: 29 November 2021 to 26 November 2026.
- Signal: weak close in an uptrend, volume at least 1.5x, RSI 30-55.
- Entry: close T.
- Exits: next open, next close, close T+2, close T+3.
- Positions: 1 or 2, 25% of equity each.
- Cost models:
  - `retail`: buy 0.15%, sell 0.25%, slippage 0.15% per side.
  - `low`: buy 0.10%, sell 0.10%, slippage 0.05% per side.
  - `zero`: no costs, for gross edge diagnosis only.

## Results

| Cost | Exit | Pos | Total return | Max DD | Sharpe | Trades | Win rate | Avg gross | Avg net | PF |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| zero | hold 3d | 2 | +7.73% | 5.51% | 0.41 | 78 | 47.4% | +0.41% | +0.41% | 1.32 |
| zero | hold 2d | 2 | +7.12% | 3.85% | 0.39 | 78 | 59.0% | +0.38% | +0.38% | 1.30 |
| low | hold 3d | 2 | +3.19% | 7.23% | 0.19 | 78 | 44.9% | +0.41% | +0.18% | 1.12 |
| low | hold 2d | 2 | +2.72% | 4.34% | 0.17 | 78 | 57.7% | +0.38% | +0.16% | 1.11 |
| low | hold 3d | 1 | +1.87% | 7.96% | 0.12 | 72 | 44.4% | +0.35% | +0.12% | 1.08 |
| low | hold 2d | 1 | +1.44% | 5.83% | 0.10 | 72 | 58.3% | +0.33% | +0.10% | 1.06 |
| retail | hold 3d | 2 | -2.62% | 9.67% | -0.12 | 78 | 42.3% | +0.41% | -0.12% | 0.91 |
| retail | hold 2d | 2 | -3.10% | 7.52% | -0.15 | 78 | 50.0% | +0.38% | -0.15% | 0.89 |
| retail | next open | 1 | -6.54% | 7.76% | -0.87 | 72 | 25.0% | +0.16% | -0.38% | 0.41 |

The full matrix has 24 rows. At retail costs, every exit is still negative. At
the optimistic low-cost model, 2-3 day holds turn slightly positive, but the
CAGR is very small and the sample has only about 78 trades over five years.

## Interpretation

- The reversal signal has a small gross edge; holding 2-3 days lets it clear
  the 0.7% retail round-trip cost only under the low-cost assumption.
- At realistic retail costs it still loses. Do not treat the low-cost rows as
  a live result.
- The low-cost model is an assumption, not a broker quote.
- A 3% total return over five years is not enough to justify risk, and the
  result may be overfit after testing many combinations.
- No live execution.

## Next

The paper journal will record actual 15:50 entries and 09:00 exits. That will
tell us whether the daily close proxy and the cost assumptions are realistic.
