# Telegram Research Companion + Harmonic Brief

Panduan operasional untuk bot Telegram pribadi Telaah 360 dan brief harmonic harian.

## Apa ini

- **Chat**: DM dengan bot (atau grup pribadi) untuk tanya-jawab emiten IDX memakai pipeline analisis yang sama dengan web.
- **Brief**: pesan broadcast berisi 5 emiten likuid yang paling dekat ke area buy harmonic pada timeframe **4H, 1D, 1W, 1M**.
- **Owner-only**: hanya `TELEGRAM_OWNER_ID` yang dilayani. Pesan dari orang lain diabaikan.
- **Tanpa OAuth**: autentikasi memakai bot token + owner ID + secret webhook.

## 1. Buat bot

1. Buka [@BotFather](https://t.me/BotFather) di Telegram.
2. Kirim `/newbot`, pilih nama dan username.
3. Simpan token `123456:ABC...` — jangan dibagikan.
4. (Opsional) `/setcommands`:

```text
start - Mulai dan lihat status
help - Daftar perintah
brief - Harmonic brief sekarang
brief refresh - Scan baru
id - Lihat user ID dan chat ID
analisis - Telaah emiten, contoh: /analisis BBCA
```

## 2. Isi `.env`

```dotenv
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_OWNER_ID=123456789
TELEGRAM_BRIEF_CHAT_ID=
TELEGRAM_WEBHOOK_SECRET=<openssl rand -hex 24>
TELEGRAM_PUBLIC_URL=https://telaah.hiiamanop.my.id
BRIEF_SECRET=<openssl rand -hex 24>
```

Cara mendapatkan `TELEGRAM_OWNER_ID`:

- kirim pesan ke [@userinfobot](https://t.me/userinfobot), atau
- isi token dulu, jalankan bot, kirim `/id` ke bot (setelah webhook aktif).

`TELEGRAM_BRIEF_CHAT_ID` boleh dikosongkan: brief akan dikirim ke DM owner. Untuk channel:

1. Buat channel, tambahkan bot sebagai **admin** dengan izin posting.
2. Kirim `/id` di channel (bot harus bisa melihat pesan; jika tidak, kirim `/id` di DM lalu gunakan chat ID channel dari `getUpdates`/log).
3. Isi `TELEGRAM_BRIEF_CHAT_ID=-100...` lalu restart pod.

## 3. Jalankan dan daftarkan webhook

```bash
REBUILD=1 ./deploy/podman/up.sh
npx tsx scripts/setup_telegram.ts
```

Script akan memanggil `getMe`, `setWebhook`, dan menampilkan `getWebhookInfo`. Token tidak pernah dicetak.

Perintah lain:

```bash
npx tsx scripts/setup_telegram.ts --info
npx tsx scripts/setup_telegram.ts --delete
```

Lalu buka `https://t.me/<username_bot>` dan kirim `/start`.

## 4. Brief harian

Manual:

```bash
./deploy/podman/brief.sh          # pakai cache hari ini jika masih segar
./deploy/podman/brief.sh refresh  # paksa scan baru
./deploy/podman/brief.sh dry      # JSON pratinjau, tidak mengirim
```

Cron host pada 08:00 WIB:

```cron
0 8 * * * cd /home/ahmad/workspace/Telaah-AI && ./deploy/podman/brief.sh refresh >> data/brief.log 2>&1
```

Cron memanggil `127.0.0.1:3000` langsung, jadi tidak terkena batas timeout Cloudflare. Hentikan semuanya dengan `./deploy/podman/stop.sh`; tidak ada service yang tertinggal.

## 5. Perintah bot

| Perintah | Fungsi |
|---|---|
| `/start` | Sambutan, ID user/chat, penjelasan chat vs brief |
| `/help` | Daftar perintah |
| `/id` | User ID dan chat ID |
| `/brief` | Jalankan brief harmonic (cache jika segar) |
| `/brief refresh` | Paksa scan baru |
| `/analisis BBCA` | Analisis lengkap |
| `/ai TLKM risikonya apa?` | Analisis dengan pertanyaan spesifik |
| teks biasa | Chat; jika ada ticker langsung analisis |

Setelah satu analisis, pertanyaan lanjutan pendek seperti `risiko utamanya apa?` memakai emiten terakhir. Emiten baru selalu menang.

## 6. API brief

```bash
curl -X POST "http://127.0.0.1:3000/api/brief/harmonic?refresh=1" \
  -H "x-brief-secret: $BRIEF_SECRET"
```

Query:

- `refresh=1` — abaikan cache dan scan ulang.
- `dry=1` — kembalikan JSON + preview teks, tidak mengirim ke Telegram.

Respons berisi `generatedAt`, `date`, `universeSize`, `scanned`, `failed`, `results`, dan `deliveredTo` (jika dikirim).

## 7. Cara scan bekerja

- Universe: 88 emiten likuid di `src/lib/screener/universe.ts`, bukan seluruh bursa.
- Data: Yahoo 1 jam (6 bulan) untuk 4H; Yahoo harian (5 tahun) untuk 1D/1W/1M.
- Pivot: ZigZag beberapa skala per timeframe; pivot dikonfirmasi setelah reversal melewati ambang.
- Pola: Gartley, Bat, Butterfly, Crab dengan validasi rasio Fibonacci.
- PRZ: irisan proyeksi XA dan BC; invalidasi di bawah D (bullish).
- Ranking: kecocokan rasio, jarak ke PRZ, bobot timeframe, status completed/forming, dan RSI.
- Cache: `data/harmonic_cache.json`, segar 12 jam. Scan dingin bisa 1–3 menit.

## 8. Batasan yang harus dibaca

- Harmonic bukan ramalan. PRZ bisa ditembus; invalidasi wajib dipakai.
- Data Yahoo bukan real-time dan bisa tertunda atau rate-limited.
- Emiten yang gagal diambil datanya dilewati dan dihitung di `failed`; tidak ada data palsu.
- Brief bukan rekomendasi beli/jual.
- Bot tidak bisa membaca pesan di channel broadcast. Chat dua arah hanya di DM/grup.
- Untuk grup, matikan privacy mode bot lewat BotFather (`/setprivacy` → Disable) agar pesan biasa terbaca; DM lebih sederhana.

## 9. Troubleshooting

| Gejala | Cek |
|---|---|
| Bot diam | `TELEGRAM_OWNER_ID` benar? Webhook `getWebhookInfo` aktif? |
| Webhook 401 | `TELEGRAM_WEBHOOK_SECRET` sama dengan yang dipakai `setWebhook`? |
| Webhook 503 | Token/secret belum masuk container; restart pod setelah edit `.env`. |
| Brief tidak masuk channel | Bot admin channel? `TELEGRAM_BRIEF_CHAT_ID` benar? |
| Brief lambat | Scan dingin 1–3 menit; pakai cache atau kurangi universe. |
| Scan banyak gagal | Yahoo rate-limit; coba lagi beberapa menit atau turunkan concurrency. |
