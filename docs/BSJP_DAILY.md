# BSJP daily strategy (v1)

BSJP means **beli sore, jual pagi**: buy near the close, hold overnight, sell
in the next morning session. This is a strategy specification, not a clone of
any particular paid course or trader's private system.

## 1. Scope

- Long only, no leverage, no short selling.
- One overnight hold, no multi-day swing.
- Entry near the close of trading day T.
- Exit at the open or first morning window of T+1.
- Paper trading first. Live orders are blocked until broker access is approved.

## 2. Timing assumptions

| Step | Default | Backtest proxy |
| --- | --- | --- |
| Scan candidates | 15:45 WIB | daily close data |
| Entry | 15:50-15:59 WIB | close T plus slippage |
| Exit | 09:00-09:15 WIB | open T+1 minus slippage |
| Forced exit | next trading day | next available open |

The backtest cannot see the 15:50 tape. Using close T is an optimistic
market-on-close assumption. Paper trading must confirm that the real 15:50
price and fill are close enough.

## 3. Universe filter

- IDX regular board only.
- Minimum average daily value: Rp 5 billion over 20 days.
- Minimum price: Rp 100.
- Exclude suspension, delisting, ARA/ARB, and same-day corporate actions.
- Exclude stocks with a spread wider than 1% at the planned entry.

## 4. Syariah filter

The default scanner keeps only JII70 constituents. The snapshot lives in
`src/lib/bsjp/syariah.ts` and is checked 2026-11-26; it is a conservative
liquid syariah subset, not the complete OJK DES list. Use `all` in the scanner
script only for research, never to present a non-syariah result as syariah.

## 5. Entry signal

Market regime:

- IHSG close above EMA20.

Stock conditions:

- close above EMA20 and EMA20 above EMA50,
- close location value `(close - low) / (high - low) >= 0.7`,
- volume at least 1.5x the 20-day average,
- daily return between +1% and +7%,
- RSI(14) between 50 and 72,
- optional confirmation: positive foreign net flow or bandar accumulation.

Score candidates and take the top 1-2. Do not chase a stock that is already
limit-up or has a large unexplained gap.

## 6. Position and risk

| Rule | Default |
| --- | ---: |
| Max positions | 2 |
| Capital per position | 25% of equity |
| Max exposure | 50% of equity |
| Daily loss stop | 2% of equity |
| Weekly loss stop | 5% of equity |
| Pause after 3 losing trades | 2 trading days |
| Overnight gap stop | exit at open, no averaging |

BSJP risk is dominated by the overnight gap. A stop loss cannot protect a
position between the close and the next open. Position size must assume the
gap can be worse than the planned stop.

## 7. Exit

- Sell at the next open or within 09:00-09:15 WIB.
- If the open gaps up strongly, still sell; do not turn a day trade into a
  swing trade.
- If the stock is suspended or has no opening trade, exit at the next
  tradable price and record the exception.
- No holding through a second night in v1.

## 8. Costs

Defaults, to be verified against the broker contract:

- buy commission 0.15%,
- sell commission 0.25%,
- slippage 0.15% per side,
- round-trip cost approximately 0.70%.

A candidate needs an expected gross move above roughly 0.8% just to break
even. The scanner must rank net expectancy, not raw momentum.

The first 5-year backtest is documented in
[BSJP_BACKTEST_2026-11-26.md](BSJP_BACKTEST_2026-11-26.md). It did not pass
the acceptance criteria; the rules need work before paper trading is promoted.

## 9. Backtest specification

- Use at least five years of daily OHLCV.
- Signal uses data through close T.
- Entry at close T plus slippage.
- Exit at open T+1 minus slippage.
- Include commissions, sales tax, lot rounding, splits, dividends,
  suspensions, and delistings.
- Exclude a trade when the stock is not tradable at the entry or exit.
- Walk-forward: tune on the first 70%, validate on the last 30%.
- Compare with IHSG buy-and-hold and with a random-liquid-stock baseline.
- Report hit rate, average gross gap, average net return, expectancy, profit
  factor, Sharpe, max drawdown, turnover, exposure, and worst overnight gap.
- Reject a strategy whose edge disappears after costs or depends on one stock.

## 10. Paper trading

The forward paper journal is documented in
[BSJP_PAPER.md](BSJP_PAPER.md). It records actual 15:50 entries and 09:00 exits
for JII70 syariah candidates. Historical 15:50/09:00 snapshots are not
available from the current data sources.


- Generate the candidate list at 15:45 WIB.
- Record the intended entry and the actual 15:50 price.
- Record the next-open exit and the actual fill.
- Send a Telegram journal for entries, exits, gaps, and daily equity.
- Run for at least 4-8 weeks before considering live execution.
- Compare paper expectancy with the backtest; a large divergence blocks live.

## 11. Acceptance before live

1. Positive out-of-sample expectancy after all costs.
2. Profit factor above 1.2, with no single symbol dominating.
3. Max drawdown inside the agreed limit.
4. Paper results consistent with the backtest.
5. Broker API access, manual confirmation, kill switch, and audit logging.

## 12. Scheduler

The pre-close scan runs at 15:45 WIB on weekdays:

```cron
45 15 * * 1-5 cd /home/ahmad/workspace/Telaah-AI && ./deploy/podman/bsjp-scan.sh >> data/bsjp.log 2>&1
```

It uses the existing Stockbit session for real-time quotes through
`/v1/stockbit/quote/{symbol}` and Yahoo daily candles for EMA, RSI, and volume
context. It never submits an order.

Preview without sending Telegram:

```bash
./deploy/podman/bsjp-scan.sh dry
```

To inspect candidates even when IHSG is below EMA20, use a dry research scan:

```bash
./deploy/podman/bsjp-scan.sh force
```

The force flag only works with `dry=1` and never sends Telegram.

The endpoint is `POST /api/bsjp/scan` and requires `ALERT_SECRET`.

## 13. Open decisions

- Universe: watchlist only, liquid IDX, or a fixed index such as IDX80?
- Exit window: exactly at open, 09:15, or 09:30?
- Capital per position and maximum portfolio exposure.
- Broker and order type for the live phase.

Until these are answered, only backtest and paper trading are allowed.
