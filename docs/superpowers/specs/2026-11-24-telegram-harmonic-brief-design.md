# Telegram Research Companion + Multi-Timeframe Harmonic Brief

**Status:** Approved for implementation (personal use)  
**Date:** 2026-11-24  
**Builds on:** `2026-11-23-open-market-data-provider-design.md` (Phase 1, Yahoo-only provider)

---

## 1. Intent and Why

The owner wants to keep using Telaah 360 from Telegram instead of opening the web terminal every time, and wants one daily brief that answers a single question:

> Which liquid IDX stocks are closest to a harmonic buy area right now?

This is a **personal tool**, not a subscription product. There is no public sign-up, no payment, no multi-tenant account system, and no OAuth. The bot answers only the owner.

The brief is allowed to ship ahead of the Phase 2 scraper/Stockbit work and is designed to plug into it later: when foreign flow and insider data become available, the same brief can add those columns without changing its shape.

## 2. Goals

1. Owner-only Telegram bot. A message from anyone else is ignored.
2. Two channels:
   - **Chat** — private DM with the bot (or a private group). Two-way conversation, inline analysis, follow-up questions.
   - **Brief** — a Telegram channel (or the owner's DM if no channel is configured) that receives the daily harmonic brief.
3. `/brief` on demand, plus a daily scheduled brief at **08:00 WIB**.
4. Scan **4H, Daily, Weekly, Monthly** timeframes and shortlist the **5 liquid IDX tickers closest to a bullish harmonic buy zone (PRZ)**.
5. Every candidate states its pattern, timeframe, PRZ, distance to zone, invalidation level, targets, score, and data freshness.
6. No fabricated patterns or prices. Failures are skipped and counted, not filled with dummy data.
7. Same safety rails as the web chat: input sanitisation, prompt-injection refusal, owner allow-list, secret-protected webhook.
8. Easy to start and stop with the existing Podman pod; no permanent system service.
9. Warm, human Indonesian copy — not a wall of robotic disclaimers.

## 3. Non-Goals

- Public subscriber management, payments, or multi-user rate plans.
- Telegram OAuth / Login Widget. A bot token plus owner ID is the whole auth model.
- Reading messages from a broadcast channel. Telegram bots cannot do that; two-way chat happens in DM/group.
- Real-time alerts or tick-by-tick monitoring.
- Scanning all ~900 IDX tickers. The v1 universe is a curated liquid list (~80 names).
- Chart images in v1. The brief is text plus a TradingView deep link. Images can be added later.
- Guaranteeing harmonic patterns predict reversals. The brief is a screening aid, not a recommendation.

## 4. Anti-Goals

- Letting a stranger use the bot or burn the owner's OpenRouter credits.
- Treating a failed Yahoo request as "no pattern" without saying coverage was reduced.
- Presenting a "forming" pattern as if it were a confirmed reversal.
- Adding a Python service, queue, or database just for this. The existing Next.js process and `data/` volume are enough.

## 5. Constraints

- Yahoo Finance hourly data is limited (roughly two years) and can rate-limit. The scan must use concurrency limits, retries, and a daily cache.
- IDX trades in WIB (UTC+7); "today" and the 08:00 schedule use Asia/Jakarta.
- Cloudflare Tunnel has a ~100 s proxy limit. The scheduled brief must be triggered from the host via `127.0.0.1`, not through the public hostname. Telegram's webhook gets an immediate acknowledgement and runs long work asynchronously.
- The app runs in one container. In-memory state is acceptable for a single owner but must not be required for correctness; last symbol and brief cache are persisted to `data/`.
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_OWNER_ID` are secrets/identifiers and live only in `.env` (gitignored).
- Docker image already copies `data/`; the Podman run mounts `data/` read-write, so cache/state files persist.

## 6. Approaches Considered

### A — Webhook route inside the existing Next.js app + built-in scanner (chosen)
- Pros: one process, one Podman pod, reuses the analysis engine, conversation guard, and caching; no new runtime.
- Cons: long scans must run after the webhook acknowledgement; Next.js route code must be careful about background work in a self-hosted server.
- Verdict: **chosen**. Self-hosted Node keeps running after the response, so a fire-and-forget brief job is safe here.

### B — Separate Python bot + scanner service
- Pros: isolated long-running worker; easy cron.
- Cons: another container, another deployment path, duplicate market-data client and LLM plumbing.
- Verdict: rejected for a personal tool.

### C — n8n / Make / external automation
- Pros: no bot code.
- Cons: harmonic math still has to live somewhere; external dependency and credentials sprawl.
- Verdict: rejected.

### Within A

- **A1 — only confirmed XABCD pivots.** High precision, may miss a stock that is still approaching the zone.
- **A2 — confirmed patterns + projected (forming) patterns (chosen).** Both are labelled. Forming patterns are only included when price is already near the projected PRZ, and they score lower.
- **A3 — LLM decides patterns from raw candles.** Rejected: non-deterministic, cannot be tested, and hallucinates ratios.

## 7. Architecture

```text
Telegram
  ├─ DM chat ──► POST /api/telegram/webhook
  │                ├─ verify X-Telegram-Bot-Api-Secret-Token
  │                ├─ verify from.id == TELEGRAM_OWNER_ID
  │                ├─ command router (/start /help /brief /id /analisis)
  │                └─ chat handler ──► analysis service (classifier → coordinator → synthesizer)
  │                                      └─ reply via Bot API (HTML, chunked < 4096)
  └─ channel ◄── brief sender ◄── harmonic screener
                                     ├─ Yahoo 1h + 5y daily
                                     ├─ resample 4H / 1D / 1W / 1M
                                     ├─ ZigZag pivots → XABCD validation → PRZ
                                     ├─ rank by fit + proximity + timeframe + RSI
                                     └─ data/harmonic_cache.json (per WIB day)

Host cron (08:00 WIB) ──► deploy/podman/brief.sh ──► POST 127.0.0.1:3000/api/brief/harmonic
                                                        └─ send to TELEGRAM_BRIEF_CHAT_ID
```

## 8. Harmonic Engine

**Pivots.** Percentage ZigZag, threshold per timeframe: 4H 4%, 1D 7%, 1W 10%, 1M 15%. Pivots alternate high/low and are confirmed only after a reversal of at least the threshold. This removes noise without curve-fitting.

**Patterns.** Classic XABCD: Gartley, Bat, Butterfly, Crab. Each candidate is validated against Fibonacci ranges with tolerances:

| Pattern | AB/XA | BC/AB | CD/BC | AD/XA |
|---|---|---|---|---|
| Gartley | 0.618 ± 0.06 | 0.382–0.886 | 1.13–1.618 | 0.786 ± 0.06 |
| Bat | 0.382–0.50 | 0.382–0.886 | 1.618–2.618 | 0.886 ± 0.06 |
| Butterfly | 0.786 ± 0.06 | 0.382–0.886 | 1.618–2.24 | 1.27–1.618 |
| Crab | 0.382–0.618 | 0.382–0.886 | 2.24–3.618 | 1.618 ± 0.08 |

Bullish patterns end at a low D (X low, A high, B low, C high, D low); bearish patterns are the mirror. Only bullish candidates enter the buy-area shortlist; bearish detections are stored for diagnostics but not sent as buy ideas.

**PRZ.** Three projections are clustered:
- XA retracement at the pattern's AD ratio,
- BC projection at the midpoint of CD/BC,
- AB=CD projection.

The zone is `[min, max]` of the projections, widened by 0.5% on each side. A completed pattern's D must sit inside the zone; otherwise it is rejected.

**Status.**
- `completed`: five confirmed pivots; price is at or above the zone (bullish) and has not invalidated.
- `forming`: four confirmed pivots plus a projected D; included only when current price is within the timeframe's max distance (4H 6%, 1D 8%, 1W 12%, 1M 18%) of the zone. It scores lower.

**Invalidation.** Bullish completed: a close below D low × 0.995. Forming: a close below the projected PRZ low × 0.995. Bearish is the mirror.

**Targets.** T1 = C pivot, T2 = A pivot. Risk/reward is computed only when the current price is above invalidation.

**Score (0–100).**
- Pattern fit: 0–40 (average closeness of AB/XA, BC/AB, CD/BC, AD/XA to their valid bands).
- Proximity: 0–30 (`30 − distance% × 3`, clipped).
- Timeframe weight: 4H 5, 1D 12, 1W 17, 1M 20.
- Status: completed 10, forming 5.
- RSI confirmation: +5 if RSI ≤ 35, +3 if ≤ 45 (bullish).

The brief ranks by score, then by closer distance, then by higher timeframe.

## 9. Universe and Data

**Universe.** A curated TS list of ~80 liquid IDX names across banks, telco, consumer, energy, metals, property, and tech. It is intentionally not the full exchange. Tickers that fail both data requests are counted as `failed` and listed in limitations.

**Requests per ticker.**
- `1h` chart, range `6mo` → resampled to 4H session candles (morning/afternoon).
- `1d` chart, range `5y` → used directly and resampled to weekly/monthly.

Two requests × 80 tickers, concurrency 4, one retry with backoff. A full cold scan is expected to take 1–3 minutes.

**Cache.** `data/harmonic_cache.json`:
```json
{
  "generatedAt": "2026-11-24T01:00:00.000Z",
  "date": "2026-11-24",
  "universeSize": 80,
  "scanned": 74,
  "failed": 6,
  "results": [],
  "limitations": []
}
```
`/api/brief/harmonic` serves a cache younger than 12 hours by default; `refresh=1` forces a cold scan. `/brief refresh` does the same from Telegram.

## 10. Telegram Bot

**Auth.** Webhook secret header must match `TELEGRAM_WEBHOOK_SECRET`. The sender's `from.id` (fallback `chat.id`) must match `TELEGRAM_OWNER_ID`. Everyone else is ignored silently. No OAuth, no login widget, no public commands.

**Commands.**
- `/start` — warm welcome, explains chat vs brief, shows the user/chat ID.
- `/help` — command list and examples.
- `/id` — prints user ID and chat ID (useful to configure the brief channel).
- `/brief` — runs the harmonic brief now. `/brief refresh` forces a new scan.
- `/analisis BBCA` or `/ai BBCA ...` — runs the full analysis.
- Plain text — conversational reply, analysis if a ticker is present, or a follow-up on the last analysed ticker when the message looks like a follow-up.

**Follow-up context.** `data/telegram_state.json` stores `lastSymbol` per chat. It is used only when the message is short and contains follow-up markers (`nya`, `itu`, `tadi`, `risiko`, `valuasi`, `target`, `prospek`, `support`, `resistance`, `gimana`, `kenapa`). A new ticker always wins. This prevents "halo" from re-analysing the previous stock.

**Formatting.** HTML parse mode, escaped user/data text, messages split at 4096 characters. Reports are condensed: price/trend/RSI, valuation, flow, trading plan, direct answer, web deep link, disclaimer. Briefs are a numbered top-5 list with PRZ, distance, invalidation, targets, and score.

**Long work.** `/brief` replies "Sedang scan..." immediately, starts the job, and sends the result when done. Analysis is awaited (10–25 s) because Telegram's webhook timeout is 60 s.

## 11. Brief API and Scheduling

`POST /api/brief/harmonic`:
- Requires `x-brief-secret: BRIEF_SECRET` (or `Authorization: Bearer`).
- Query: `refresh=1` to bypass cache; `dry=1` to return JSON without sending to Telegram.
- Sends to `TELEGRAM_BRIEF_CHAT_ID` when set, otherwise to `TELEGRAM_OWNER_ID`.
- Returns the scan summary and delivery status.

`deploy/podman/brief.sh` calls the local endpoint with a 600 s timeout. A host cron line at 08:00 WIB is documented; no in-container scheduler is added, so stopping the pod stops all recurring work.

## 12. Configuration

```dotenv
TELEGRAM_BOT_TOKEN=
TELEGRAM_OWNER_ID=
TELEGRAM_BRIEF_CHAT_ID=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_PUBLIC_URL=https://telaah.hiiamanop.my.id
BRIEF_SECRET=
```

All are optional at build time. If the bot token is missing, the webhook returns 503 and the app still works. `scripts/setup_telegram.ts` calls `getMe`, `setWebhook`, and prints `getWebhookInfo`; it never prints the token.

## 13. Testing

- Harmonic ratio validation for one synthetic example of each pattern, plus rejection of an invalid ratio.
- Pivot alternation and threshold behaviour.
- PRZ contains D and distance/invalidation math.
- Aggregation: 1h → 4H sessions, daily → weekly/monthly OHLCV.
- Screener ranking, top-5 limit, failed-ticker accounting, and cache round-trip (injected fake data, no network).
- Telegram: owner allow-list, secret check, chunking, HTML escaping, brief/report formatting, command routing with injected sender.
- Brief route: wrong secret → 401, dry run → no send.
- Full `npm test`, `npm run lint`, `npm run build`.
- Live smoke: scan a 5-ticker subset, then the full universe; verify a real brief is delivered after the owner supplies the bot token.

## 14. Deployment and Operations

1. Add env values to `.env`.
2. `REBUILD=1 ./deploy/podman/up.sh`.
3. `npx tsx scripts/setup_telegram.ts` to register the webhook.
4. Owner sends `/start` to the bot.
5. Optional: add the bot as admin to the brief channel, send `/id` there to get the channel ID, put it in `TELEGRAM_BRIEF_CHAT_ID`, restart.
6. Cron: `0 8 * * * cd /home/ahmad/workspace/Telaah-AI && ./deploy/podman/brief.sh >> data/brief.log 2>&1`.
7. Stop everything with `./deploy/podman/stop.sh`; no service remains.

## 15. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Yahoo rate-limits a cold scan | concurrency 4, retry with backoff, daily cache, skip + count failures |
| Cloudflare 100 s limit | cron calls localhost; Telegram acknowledges before scanning |
| Webhook exposed to strangers | secret header + owner ID allow-list, ignore others |
| Prompt injection via Telegram | same sanitiser/refusal as web, plus owner-only access |
| Token leaked in logs | never log token; setup script prints only bot username and webhook URL |
| Telegram message too long | chunk at 4096 chars, condensed report |
| Stale brief presented as live | show generated-at WIB and data coverage/failed count |
| Yahoo hourly history changes | cap 4H analysis to available candles; skip patterns needing more data |
| False precision from patterns | show forming vs completed, invalidation, and "bukan rekomendasi" note |

## 16. Decisions Left to the Builder

- Exact retry count/backoff (start with 2 retries, 800 ms/1600 ms).
- Exact condensed report layout inside the 4096-char limit.
- Whether the brief also lists a "bearish watch" section (default: no, keep top-5 focused).
- Whether to persist a short brief history (default: only the latest cache).
- Exact universe membership; keep it liquid and editable in one file.
