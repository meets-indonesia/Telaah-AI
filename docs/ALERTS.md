# Watchlist alerts

The alert center watches a server-side list and sends Telegram messages when
one of the rules fires. It is separate from the browser watchlist, because the
browser list lives in `localStorage` and the server cannot read it.

## Manage from Telegram

- `/watch BBCA` adds a symbol.
- `/unwatch BBCA` removes it.
- `/watchlist` shows the current list.

The bot is owner-only, so only the configured `TELEGRAM_OWNER_ID` can change
the list.

## Rules

Defaults are stored in `data/alert_watchlist.json` and can be changed through
`POST /api/alerts` with `{"action":"rules","rules":{...}}`.

| Rule | Default | Meaning |
| --- | ---: | --- |
| `priceMovePct` | 5 | Close move versus the previous day |
| `volumeSpikeMultiplier` | 2 | Volume versus the 20-day average |
| `foreignFlowIdr` | 50,000,000,000 | Absolute foreign net flow |
| `breakoutLookback` | 20 | Days used for high/low breakout |

Signals:

- price up or down beyond `priceMovePct`
- volume at least `volumeSpikeMultiplier` times the lookback average
- close above the previous high or below the previous low
- foreign net buy or sell beyond `foreignFlowIdr`

One message per symbol, signal, and date. Redis key
`telaah:alert:{date}:{symbol}:{kind}` prevents duplicates for two days.

## Run manually

```bash
./deploy/podman/alerts.sh dry   # preview JSON, no Telegram
./deploy/podman/alerts.sh       # send new signals
```

Direct endpoint:

```bash
curl -X POST "http://127.0.0.1:3000/api/alerts/run?dry=1" \
  -H "x-alert-secret: $ALERT_SECRET"
```

`ALERT_SECRET` must be set in `.env`. The route is local-cron protected; the
public hostname is still protected by Cloudflare Access.

## Schedule

Add this line to the host crontab for every 15 minutes during IDX hours:

```cron
*/15 9-15 * * 1-5 cd /home/ahmad/workspace/Telaah-AI && ./deploy/podman/alerts.sh >> data/alerts.log 2>&1
```

The first run after adding a symbol may be quiet if the data source has no new
daily candle yet.

## Current scope

Version 1 covers price, volume, breakout, and foreign flow. Bandar phase and
harmonic PRZ alerts are the next step; they need a separate broker/harmonic
scan and are not sent by this scheduler yet.

Alerts are research notifications, not buy or sell recommendations.
