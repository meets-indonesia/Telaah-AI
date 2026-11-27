# Phase 2/3: IDX Scraper, Foreign Flow, Insider Filings, and Data-Source UI

**Status:** Implemented and live on 2026-11-24  
**Design:** `docs/superpowers/specs/2026-11-23-open-market-data-provider-design.md`

## What changed

Phase 2 adds real IDX data behind the existing `MarketDataProvider` interface. Phase 3 surfaces where each number came from and where coverage is partial.

### Phase 2A — IDX public data

A small FastAPI service in `scraper/` wraps IDX public endpoints:

| Endpoint | Data | Live source |
|---|---|---|
| `GET /v1/idx/foreign-flow/{symbol}` | daily foreign buy/sell, net shares and rupiah estimate | `GetTradingInfoSS` |
| `GET /v1/idx/profile/{symbol}` | sector, sub-sector, industry, board, address, website, directors, commissioners, major shareholders | `GetCompanyProfilesDetail` |
| `GET /v1/idx/insider/{symbol}` | parsed ownership reports (buy/sell, shares, price, percentages, holder) | `GetAnnouncement` + PDF |
| `GET /v1/idx/insider-feed` | market-wide recent ownership reports | `GetAnnouncement` + PDF |
| `GET /v1/idx/suspensions` | suspension announcements | `GetSuspendData` |
| `GET /v1/idx/calendar` | RUPS, dividends, corporate actions calendar | `GetCalendar` |

The service uses **Scrapling `Fetcher`** (curl_cffi TLS impersonation) first. If IDX answers with a Cloudflare challenge, it falls back to **`StealthySession`** (Patchright Chromium) automatically. PDF links get a second fallback: the browser opens the PDF viewer and the service captures the raw `application/pdf` response.

The scraper image includes Chromium and its shared libraries. Expect a larger image (~600 MB) and roughly 400–700 MB RAM while a stealth request is running. Requests are cached and the stealth browser is serialized, so this is not a permanently running browser.

### Phase 2B — Insider feed without Stockbit

The original design used Stockbit for structured insider movements. IDX ownership reports already contain the same fields in PDF form, so this build parses those PDFs with `pypdf` and exposes a market-wide feed. This avoids Stockbit's ToS/session risk.

Stockbit remains optional and is **not configured** in this build. The `/v1/stockbit/status` endpoint reports that honestly. IPOT broker summary is still returning 502, so FlowLens remains foreign-flow-only; no fake broker rows are produced.

### Phase 3 — UI truthfulness

- `ReportHeader` now shows a source strip: `Harga Yahoo`, `Flow IDX foreign flow`, `Insider IDX filings`, and `Broker N/A` when coverage is missing.
- The `/insider` page feed is labelled `IDX PDF`.
- FlowLens already renders `partial` when only foreign flow is available.
- The report's `dataLimitations` states that broker summary is unavailable.

## Architecture

```text
Next.js (telaah-app)
  └─ OpenMarketProvider
       ├─ YahooClient        prices, financials, valuation, peers
       └─ ScraperClient ───► telaah-scraper:8001
                              ├─ Scrapling Fetcher / StealthySession -> IDX JSON
                              ├─ pypdf -> ownership PDFs (browser fallback)
                              ├─ IPOT best-effort (currently unavailable)
                              └─ Stockbit status (not configured)
```

The scraper is inside the same Podman pod but in its own container. It binds only to `127.0.0.1:8001` on the host; Cloudflare never exposes it.

## Configuration

```dotenv
SCRAPER_URL=http://127.0.0.1:8001
SCRAPER_BROKER_SUMMARY_ENABLED=false
STOCKBIT_ENABLED=false
```

- `SCRAPER_URL` empty → app runs Yahoo-only and marks flow/insider unavailable.
- `IDX_STEALTH_ENABLED=true` (default) enables the browser fallback.
- `SCRAPER_BROKER_SUMMARY_ENABLED=true` only if a real broker-summary source is configured.
- `STOCKBIT_ENABLED` is reserved for the optional Stockbit client; it is not needed for the IDX feed.

## Podman

```bash
REBUILD=1 ./deploy/podman/up.sh
```

`up.sh` now:

1. builds `telaah-ai:local` and `telaah-scraper:local` (use `REBUILD_SCRAPER=1` to rebuild only the scraper);
2. publishes `127.0.0.1:8001` for the scraper;
3. waits for `http://127.0.0.1:8001/health`;
4. starts the app and tunnel.

Useful commands:

```bash
./deploy/podman/status.sh
./deploy/podman/logs.sh scraper
./deploy/podman/stop.sh
```

## Stockbit broker summary (optional)

Stockbit is the source for **full per-stock broker summary** — every broker, not only IPOT's top 10. It uses your own Stockbit session. It is unofficial and may conflict with Stockbit's Terms; use it personally and at your own risk.

The session is a rotating refresh token. **The scraper must be the only process that refreshes it.** Do not point the same session at another bot or keep using it in the Stockbit web app.

1. Open a private browser window and sign in at `https://stockbit.com/login`. Complete password/OTP yourself; never share the password or OTP.
2. DevTools → Application → Cookies → `https://stockbit.com` → copy the value of **`credentialStorage`**.
3. Save it to a temporary file, e.g. `data/stockbit_credential.txt`, then:
   ```bash
   podman cp data/stockbit_credential.txt telaah-scraper:/tmp/stockbit_cookie
   podman exec telaah-scraper python -m scraper.stockbit_login --file /tmp/stockbit_cookie
   rm -f data/stockbit_credential.txt
   ```
   The helper validates the session with Stockbit, writes `data/stockbit_session.json` with mode `0600`, and never prints the token.
4. Set `SCRAPER_BROKER_SUMMARY_ENABLED=true` in `.env`, then restart the pod:
   ```bash
   ./deploy/podman/up.sh
   ```
5. Check:
   ```bash
   podman exec telaah-scraper python -m scraper.stockbit_login --status
   curl -s "http://127.0.0.1:8001/v1/broker-summary/BBRI?days=14" | python3 -m json.tool
   ```
6. After that, a full report should show `flowLens.status: available`, `coverage: full`, `source: stockbit`, and real top buyers/sellers.

If the refresh token expires (roughly weekly), repeat the login with the host helper. It reads the cookie from stdin and never writes it to the host:

```bash
./deploy/podman/stockbit-login.sh
```

The script asks for the `credentialStorage` value, pipes it into the scraper, and clears the shell variable afterwards. It also supports:

```bash
./deploy/podman/stockbit-login.sh FILE.txt   # read the cookie from a file
./deploy/podman/stockbit-login.sh --status   # inspect expiry only
./deploy/podman/stockbit-login.sh --clear    # remove the stored session
```

The alert center checks the session every hour:

```bash
./deploy/podman/stockbit-session-check.sh dry   # preview, no Telegram
./deploy/podman/stockbit-session-check.sh       # send if within 72h/24h
```

It sends one Telegram warning at 72 hours before the refresh token expires, another at 24 hours, and a critical message when the session is expired or missing. Dedupe keys use the token expiry so the hourly cron does not spam.

If Stockbit is unavailable, `/v1/broker-summary` falls back to IPOT; if IPOT is also down, it returns `available: false` and the UI stays honest with foreign-flow-only FlowLens.

## Stockbit chart and live stream (optional)

`/chart` in the app reads candles from the scraper:

```bash
curl -s "http://127.0.0.1:8001/v1/stockbit/chart/BBCA?timeframe=1D"
curl -s "http://127.0.0.1:3000/api/chart?symbol=BBCA&timeframe=1Y"
```

- `1D` / `1W` map to Stockbit's hourly window and keep the latest session for `1D`.
- `1Y` / `5Y` map to daily and weekly candles.
- Stockbit's `1d` window currently returns zero rows, so `1D` is the latest session of the hourly series, not one-minute bars. The UI says so when bars are sparse.
- If the Stockbit session is missing, `/api/chart` falls back to Yahoo (delayed) and marks `delayed: true`.
- The scraper caches charts for 4 seconds for `1D`/`1W`, 15 seconds for `1Y`, and 60 seconds for `5Y`.

### Live updates over Redis + SSE

The chart page does **not** poll from the browser. It opens one `/api/chart/stream` SSE connection; the server pushes full frames:

```bash
curl -N "http://127.0.0.1:3000/api/chart/stream?symbol=BBCA&timeframe=1W"
```

- Redis runs inside the same pod (`telaah-redis`) and caches each symbol/timeframe under `telaah:chart:{SYMBOL}:{TF}`.
- The stream hub keeps one refresher per watched symbol, publishes frames on `telaah:chart:live`, and fans them out to every connected browser.
- Refresh is server-side only while at least one browser is watching: 5 seconds during the IDX session, paused outside it. Stockbit exposes chart candles over REST only, so this upstream refresh is the source limit; the browser still receives push frames, never polling.
- `CHART_STREAM_REFRESH_MS` changes the server refresh interval (default `5000`, minimum `2000`). Do not set it below Stockbit's 1 request/second pacing.
- If Redis is unavailable, the single app process still streams locally; Redis is needed for cache sharing and multi-instance fan-out.
- SSE sends a heartbeat every 15 seconds so Cloudflare does not close an idle connection.

Check the live path:

```bash
podman exec telaah-redis redis-cli ping
podman exec telaah-redis redis-cli PUBSUB CHANNELS 'telaah:*'
curl -N "http://127.0.0.1:3000/api/chart/stream?symbol=BBCA&timeframe=1D"
```

## Verification

```bash
# Python parsers (use a venv with scraper/requirements.txt installed)
python -m unittest discover -s scraper/tests -v

# TypeScript
npm test
npm run build

# Live
curl -s http://127.0.0.1:8001/health
curl -s http://127.0.0.1:8001/v1/idx/foreign-flow/BBCA?length=5
curl -s http://127.0.0.1:8001/v1/idx/insider/BBCA?days=730&limit=5
curl -s http://127.0.0.1:3000/api/insider-feed?limit=5
```

A full BBCA report now returns `flowLens.status = "partial"` with 90 foreign-flow days, and `insiderRadar.status = "available"` with parsed ownership transactions.

## Limitations

- IDX PDFs can be scanned images; those filings are marked `unparsed: true` and never given invented numbers.
- Foreign-flow rupiah is an estimate: IDX reports shares, multiplied by the daily close.
- The IDX feed covers ownership reports, not every announcement type.
- IPOT broker summary is unavailable when Stockbit is down; FlowLens then stays partial instead of showing fake rows.
- Stockbit intraday coverage is limited to its hourly window; minute bars are not available.
- The browser is push-only, but the server still refreshes Stockbit while a chart is watched because Stockbit does not expose a chart WebSocket to this account.
- Yahoo remains the fallback price/fundamental source and can lag or change fields.
- IDX endpoints are unofficial and can block; the service degrades to unavailable rather than fabricating data.

## Next optional work

1. IPOT parser once the endpoint returns a stable page.
2. Chart image attachments for the Telegram brief.
3. Nightly disk cache/SQLite for the insider feed across restarts.
4. Minute-bar chart source if Stockbit exposes one again.
