# BSJP backtest, 26 November 2026

## Method

- Universe: 41 liquid IDX names in `src/lib/bsjp/universe.ts`.
- Syariah subset: 26 names that are also in the JII70 snapshot.
- Period: 29 November 2021 to 26 November 2026 (5 years).
- Signal: close T, using daily OHLCV through T.
- Entry: close T plus 0.15% slippage.
- Exit: open T+1 minus 0.15% slippage.
- Costs: buy 0.15%, sell 0.25%, lot rounding to 100 shares, IDX tick rounding.
- Maximum 2 positions, 25% of equity per position.
- Market filter: IHSG close above EMA20.
- Historical foreign flow is not used; it is only a live confirmation.
- The daily close is a proxy for the 15:50 entry price. This is optimistic.

## Results

| Metric | All 41 | JII70 syariah 26 |
| --- | ---: | ---: |
| Final equity from Rp100M | Rp81.47M | Rp84.93M |
| Total return | -18.53% | -15.07% |
| CAGR | -4.02% | -3.22% |
| Max drawdown | 21.22% | 16.60% |
| Sharpe | -1.75 | -1.90 |
| Trades | 361 | 259 |
| Win rate | 32.41% | 29.73% |
| Average gross gap | +0.32% | +0.28% |
| Average net return | -0.23% | -0.26% |
| Profit factor | 0.50 | 0.47 |
| Exposure | 7.45% | 5.35% |
| Worst gap | -4.59% | -2.98% |

## Interpretation

The rules as written do not have an edge after costs. The average gross
overnight move is only about 0.3%, while the round-trip cost assumption is
about 0.7%. The low win rate and profit factor below 1 confirm that the
current filter selects momentum that tends to mean-revert at the next open.

The syariah filter reduced losses and drawdown but did not create a positive
expectancy. This is an honest negative result, not a reason to force a
strategy.

## Parameter sweep

A 96-combination sweep was run on the JII70 subset:

- max positions: 1 or 2,
- close strength: 0.70, 0.80, 0.85, 0.90,
- volume ratio: 1.5, 2.0, 2.5,
- return band: (1,7), (2,5), (2,6), (3,6).

No combination had a positive total return after costs. The best total return
was -1.93%, with only 10 trades and a 10% win rate. The best Sharpe was -0.73.
Tighter filters reduced the number of trades and the loss, but did not create
an edge. This is evidence that parameter tuning alone cannot rescue the
current BSJP rules.

The result does not prove BSJP can never work. It proves that this exact
close-to-next-open implementation, with these filters and costs, does not.
A follow-up signal study tested momentum, reversal, breakout, random, and
next-close exits: [BSJP_SIGNAL_RESEARCH_2026-11-26.md](BSJP_SIGNAL_RESEARCH_2026-11-26.md).
Reversal was the best variant but still lost after costs.

The next tests must change the structure, not only the thresholds:

- use an actual 15:50 snapshot instead of the daily close,
- test exits at 09:00/09:15 instead of the opening price,
- add a different momentum or mean-reversion condition,
- test a market breadth filter,
- compare against a random-liquid baseline.

## What not to do

- Do not run this live.
- Do not remove costs to make the report look better.
- Do not promote one lucky trade or one year as evidence.

## Next experiments

1. Test one position only, close strength at least 0.85, volume at least 2x.
2. Test a stricter return band, for example +2% to +5%.
3. Test exit at 09:00/09:15 instead of the open, using intraday data.
4. Test a market breadth filter in addition to IHSG EMA20.
5. Add actual 15:50 paper entries before changing the rules again.

Each experiment must keep the same costs, lot, tick, and walk-forward split.
A positive out-of-sample expectancy after costs is required before paper
trading is promoted to live.

## Reproduce

```bash
curl -X POST "http://127.0.0.1:3000/api/bsjp/backtest?years=5" \
  -H "x-alert-secret: $ALERT_SECRET"
```

The JSON report is written to `data/backtests/`. The directory is generated
and ignored by git.
