# Robo trade: design and phased plan

Status: design only. No live order execution is implemented. This document is
the gate before any backtest or paper-trading code is written.

## 1. Intent

Build a rules-based IDX trading assistant that can:

1. generate signals from the existing research stack,
2. size positions with explicit risk limits,
3. backtest the rules with realistic costs,
4. run paper trading and publish a Telegram journal,
5. only later, with broker access and explicit approval, submit real orders.

The product is a research and execution assistant, not a promise of returns.

## 1a. Selected v1 strategy: BSJP daily

The first strategy is **BSJP (beli sore, jual pagi)**: buy near the close,
hold overnight, sell at the next morning open. The detailed rules, costs, and
backtest assumptions are in [BSJP_DAILY.md](BSJP_DAILY.md).

This choice replaces the open holding-period question. Swing and intraday
strategies remain out of scope for v1.

## 2. Hard constraints

- The connected Stockbit session has no securities account (`acn` is empty).
- Stockbit's internal trading WebSocket rejected this account with
  `you are not authorized`.
- No broker API, no PIN, and no order credential is available today.
- Live execution is blocked until a broker provides a supported API and the
  owner explicitly enables it.
- Never store a broker password, PIN, OTP, or full trading token in the repo,
  logs, or Telegram.

## 3. Non-goals

- No high-frequency trading or colocation.
- No leverage, margin, short selling, or derivatives in v1.
- No martingale, grid averaging, or averaging down.
- No "AI decides position size" step. LLM output may explain a signal, never
  override risk limits.
- No claim that a backtest guarantees future returns.

## 4. Architecture

```text
market data + indicators + flow
            |
        signal engine
            |
     risk and position sizer
            |
   backtest / paper / live adapter
            |
     order journal + Telegram
```

Components:

- **Signal engine**: deterministic rules over daily and intraday candles.
- **Risk engine**: position size, exposure, daily loss, and kill switch.
- **Portfolio**: cash, positions, average price, realized and unrealized P&L.
- **Execution adapter**: `paper` first, `live` later behind an interface.
- **Journal**: every signal, order, fill, rejection, and reason.
- **Scheduler**: pre-open plan, intraday checks, post-close review.

Reuse: Yahoo/IDX market data, Stockbit flow, Redis, Telegram client, cron
scripts.

## 5. Signal stack for v1

A long-only daily system:

- Trend filter: close above EMA50 and EMA20 above EMA50.
- Pullback or harmonic confluence: bullish harmonic pattern inside PRZ, or a
  pullback to EMA20 that holds.
- Confirmation: volume at least 1.5x the 20-day average.
- Optional confirmation: positive foreign flow or bandar accumulation.
- No entry if the stock is suspended, illiquid, or in a downtrend.

Exit rules:

- hard stop below the pattern invalidation or 2 ATR,
- first target at 2R, second target at 3R,
- trail with 2 ATR after 1R,
- time stop after 20 trading days,
- exit before a known suspension or delisting risk.

## 6. Risk rules

Defaults, all configurable:

| Rule | Default |
| --- | ---: |
| Risk per trade | 1% of equity |
| Max concurrent positions | 3 |
| Max position value | 20% of equity |
| Max daily loss | 3% of equity |
| Max portfolio drawdown stop | 10% |
| Max trades per day | 2 |
| Min average daily value | Rp 1 billion |
| Max order size | 10% of average daily volume |
| Cooldown after 3 losses | 2 trading days |

Position size:

```text
riskAmount = equity * 0.01
stopDistance = entry - stop
shares = floor(riskAmount / stopDistance / 100) * 100
shares = min(shares, floor(equity * 0.20 / entry / 100) * 100)
```

If the result is zero lots, skip the trade. Never widen the stop to force a
position.

Kill switch:

- manual `alerts.sh` style command,
- automatic stop after daily loss or drawdown limits,
- no new entries while the switch is active,
- existing positions still get stop management.

## 7. Costs and market mechanics

All assumptions must be configurable and checked against the broker contract
note before live use.

| Item | Default assumption |
| --- | ---: |
| Buy commission | 0.15% |
| Sell commission | 0.25% |
| Slippage | 0.20% per side |
| Lot size | 100 shares |
| Settlement | T+2 |
| Tick size | IDX tiered tick table |

Tick table: `<200: 1`, `200-500: 2`, `500-2,000: 5`, `2,000-5,000: 10`,
`>=5,000: 25`. Round the order price to a valid tick.

Backtests must include commissions, sales tax, slippage, lot rounding, and
corporate actions. A strategy that only works with zero costs is rejected.

## 8. Backtest requirements

- Use at least five years of daily data, with a separate out-of-sample period.
- No lookahead: a signal from today's close can only fill at the next open or
  later.
- Handle splits, dividends, suspensions, and delistings.
- Exclude stocks below the liquidity floor.
- Walk-forward test the parameters; do not optimize on the final test period.
- Report CAGR, Sharpe, max drawdown, win rate, profit factor, expectancy,
  turnover, exposure, and number of trades.
- Compare against IHSG buy-and-hold.
- Record every rejected trade and the reason.

Acceptance before paper trading:

- positive expectancy after costs,
- max drawdown within the configured limit,
- no single trade or symbol dominating the result,
- stable results across parameter neighborhoods, not one lucky setting.

## 9. Paper trading

- Run on the same signal engine and risk rules as the backtest.
- Fill at the next available price, with the same costs and slippage.
- Publish entries, exits, stops, and daily equity to Telegram.
- Run for at least 8 to 12 weeks before considering live execution.
- Compare paper results with the backtest; a large divergence blocks live.

## 10. Live execution gates

Live is a separate project with a new approval:

1. Supported broker API and a funded securities account.
2. Read-only connection tested first; orders disabled.
3. Manual confirmation for every order in the first phase.
4. Order idempotency, max order value, and a kill switch.
5. Full audit log with request IDs.
6. Small initial capital and a written loss limit.
7. Explicit owner approval recorded in the repo.

Until then, the only executable mode is `paper`.

## 11. Phases

| Phase | Deliverable | Exit criteria |
| --- | --- | --- |
| 0 | This design | Approved by owner |
| 1 | Backtest engine | Reproducible report with costs |
| 2 | Paper runner | Telegram journal for 8-12 weeks |
| 3 | Broker adapter | Sandbox or read-only verification |
| 4 | Live pilot | Manual confirmation, small size |
| 5 | Review | Keep, change, or stop |

## 12. Open decisions

- Universe: liquid IDX only, or the full watchlist?
- Holding period: resolved, BSJP daily (buy close, sell next open).
- Data source: Yahoo daily plus Stockbit flow, or paid real-time feed?
- Broker: which API is actually available and what are its terms?
- Capital and maximum acceptable drawdown?

These are deliberately not guessed here.

## 13. Definition of done for phase 1

- deterministic signal and risk modules with unit tests,
- a backtest CLI that takes a date range and outputs a report,
- costs, slippage, lot, tick, and corporate actions included,
- no live order code,
- a saved report in `data/backtests/` and a short README on how to reproduce it.
