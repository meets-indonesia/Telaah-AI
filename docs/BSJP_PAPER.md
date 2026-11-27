# BSJP paper journal

The paper journal records actual pre-close and next-morning snapshots. It does
not submit orders.

## Schedule

- 15:45 WIB: the BSJP scanner sends candidates.
- 15:50 WIB: the paper entry job records the candidate price.
- 09:00 WIB next trading day: the paper exit job records the exit price.
- Only JII70 syariah names are used by default.

Cron:

```cron
50 15 * * 1-5 cd /home/ahmad/workspace/Telaah-AI && ./deploy/podman/bsjp-paper-entry.sh >> data/bsjp-paper.log 2>&1
0 9 * * 1-5 cd /home/ahmad/workspace/Telaah-AI && ./deploy/podman/bsjp-paper-exit.sh >> data/bsjp-paper.log 2>&1
```

## Store

`data/bsjp_paper.json` holds every position:

- entry date, symbol, score, entry price, entry timestamp,
- exit date, exit price, exit timestamp,
- gross and net return,
- open or closed status.

The file is gitignored. It is paper data, not a brokerage record.

## Commands

```bash
./deploy/podman/bsjp-paper-entry.sh dry
./deploy/podman/bsjp-paper-entry.sh
./deploy/podman/bsjp-paper-exit.sh dry
./deploy/podman/bsjp-paper-exit.sh
```

API:

```text
POST /api/bsjp/paper/entry?dry=1
POST /api/bsjp/paper/exit?dry=1
```

Both require `ALERT_SECRET`.

## Limitations

- The 15:50 price is the last Stockbit quote at scan time, not a confirmed
  exchange fill.
- Exit uses the quote near 09:00. A real fill can differ by spread and queue.
- Missing quotes leave a position open; it is retried on the next run.
- The journal is forward-looking. Yahoo and Stockbit do not provide historical
  15:50/09:00 snapshots for this universe.
- The journal does not prove profitability. It validates the backtest
  assumptions.

## Weekly review

```bash
./deploy/podman/bsjp-paper-report.sh dry
./deploy/podman/bsjp-paper-report.sh notify
```

The report shows entries, exits, win rate, total net, average net per trade,
profit factor, average entry slippage versus the previous close, and average
exit slippage versus the next open. A weekly cron sends it on Friday at 16:10
WIB.
