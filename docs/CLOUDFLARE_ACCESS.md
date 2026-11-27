# Cloudflare Access and API rate limits

Telaah is a personal research app. The public hostname must not serve
`/api/analyze` or `/api/qa` to anonymous visitors: those routes spend
OpenRouter credit, and chart requests use the Stockbit session.

Do not start the pod with the public tunnel until the Access application
below exists. The rate limits in the app are a second layer, not a
replacement for authentication.

## 1. Protect the app with Cloudflare Access

1. Open Cloudflare Zero Trust, then **Access -> Applications -> Add an application -> Self-hosted**.
2. Application name: `Telaah`.
3. Domain: `telaah.hiiamanop.my.id`, path `/*`.
4. Session duration: 24 hours or one week, depending on your preference.
5. Add a policy named `Owner`:
   - Action: **Allow**
   - Include: **Emails** -> your own email address.
6. Login method: **One-time PIN**. Cloudflare emails a code; no password is stored by Telaah.
7. Save the application.

Open the site in a private window. It should ask for an email code before
the Next.js page loads. The SSE chart connection uses the same Access cookie.

## 2. Keep the Telegram webhook reachable

Create a second Access application with a **Bypass** policy:

- Domain: `telaah.hiiamanop.my.id`
- Path: `api/telegram/webhook` (without a leading slash)
- Policy: **Bypass**, Include **Everyone**

Cloudflare gives the more specific path precedence over the `/*` application,
so every other route stays protected. This is safe only because the route validates
`X-Telegram-Bot-Api-Secret-Token` against `TELEGRAM_WEBHOOK_SECRET`. Do not
remove that check. Test it:

```bash
curl -i -X POST https://telaah.hiiamanop.my.id/api/telegram/webhook \
  -H 'content-type: application/json' -d '{}'
```

The response must be `401` JSON from the app, not `302` to
`cloudflareaccess.com`. A `302` means the bypass path does not match yet, and
the Telegram bot will not receive updates.

`/api/brief/harmonic` is called by the local cron through
`http://127.0.0.1:3000`, so it does not pass through Cloudflare. If you ever
call it from outside the host, add a Bypass application for its path and keep
the `x-brief-secret` check.

## 3. Service tokens for automation

If a script must call the public hostname, create a service token in
**Access -> Service Auth -> Service Tokens**, add a **Service Auth** policy to
the Telaah application, and send:

```bash
curl -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" \
     -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" \
     https://telaah.hiiamanop.my.id/api/chart?symbol=BBCA&timeframe=1W
```

Keep the local cron on `127.0.0.1`; it does not need a service token.

## 4. App-level rate limits

The routes below call `guardRateLimit` from `src/lib/security/rate-limit.ts`:

| Route | Limit | Window |
| --- | ---: | --- |
| `/api/analyze` | 12 | 10 minutes |
| `/api/qa` | 60 | 10 minutes |
| `/api/compare` | 30 | 10 minutes |
| `/api/chart` | 120 | 1 minute |
| `/api/chart/stream` | 30 | 1 minute |
| `/api/translate` | 120 | 1 minute |

- Identity is `CF-Connecting-IP`, falling back to the first
  `X-Forwarded-For`, then to `local`.
- Counters live in Redis (`telaah:rl:*`). If Redis is down, an in-process
  window keeps working for the current app process.
- A blocked request returns `429` with `Retry-After`,
  `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.
- `RATE_LIMIT_ENABLED=false` disables the guard for local debugging only.

After the pod is running locally:

```bash
for i in $(seq 1 13); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://127.0.0.1:3000/api/analyze \
    -H 'content-type: application/json' \
    -d '{"prompt":"Analisis BBCA","mode":"quick","confirmedSymbol":"BBCA"}'
done
```

The final requests should return `429`. Do not use this loop against the
public hostname.

## 5. Start order

1. Configure Cloudflare Access and the webhook Bypass.
2. Start the pod with `./deploy/podman/start.sh`.
3. Verify the private window shows the Access login.
4. Verify the Telegram bot still replies.
5. Verify a chart loads and streams.
