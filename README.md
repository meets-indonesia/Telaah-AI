# Telaah 360

Telaah 360 adalah asisten riset saham Bursa Efek Indonesia (IDX) berbasis bukti. Aplikasi menggabungkan data pasar publik Yahoo Finance dan endpoint publik IDX, analisis kuantitatif lokal, model bahasa melalui OpenRouter, dan semantic cache Qdrant untuk menghasilkan riset emiten yang lengkap namun tetap mudah ditelusuri. Tidak perlu API key data pasar untuk jalur default.

> Telaah 360 adalah alat informasi dan edukasi, bukan rekomendasi beli atau jual dan bukan pengganti penasihat investasi berlisensi.

## Fitur Utama

- **Percakapan riset per sesi** — setiap chat room memiliki riwayat dan konteks terpisah, dapat dipin atau dihapus.
- **Kanvas emiten lengkap** — ringkasan, fundamental, valuasi, peer comparison, teknikal, broker/foreign flow, insider, komoditas, dan timeline aksi korporasi.
- **Copilot kontekstual** — panel Copilot pada kanvas hanya membahas emiten yang sedang aktif dan menggunakan laporan tersebut sebagai sumber jawaban.
- **Pencarian 962 emiten IDX** — cari menggunakan ticker atau nama perusahaan.
- **Watchlist** — daftar pantauan dengan harga, perubahan harian, kapitalisasi pasar, PER, PBV, RSI, foreign flow, dan tren teknikal.
- **Analisis teknikal** — candlestick, SMA20, SMA50, MACD, RSI, dan penilaian tren.
- **Broker & foreign flow** — ringkasan akumulasi/distribusi broker serta arus asing.
- **Insider intelligence** — deteksi aktivitas dan cluster transaksi pihak internal berdasarkan data yang tersedia.
- **Commodity lens** — konteks komoditas untuk emiten terkait pertambangan dan energi.
- **Semantic cache** — Qdrant menyimpan hasil analisis secara semantik untuk mengurangi pemakaian API dan token.
- **Lampiran gambar** — unggah gambar melalui pemilih file atau paste langsung dari clipboard, dengan preview sebelum dikirim.
- **Tema monokrom** — light/dark mode dengan palet soft white dan soft black.

## Arsitektur Ringkas

```text
Browser
  ├─ Percakapan & sesi chat (localStorage)
  ├─ Watchlist & riwayat lokal (localStorage)
  └─ Next.js App Router UI
       ├─ /api/analyze
       │    ├─ Semantic cache lookup (Qdrant)
       │    ├─ Yahoo Finance + IDX evidence collection
       │    ├─ Perhitungan kuantitatif lokal
       │    └─ OpenRouter synthesis
       ├─ /api/qa (Copilot emiten aktif)
       ├─ /api/compare
       ├─ /api/watchlist-metrics
       └─ Endpoint market, insider, dan komoditas
```

Alur analisis utama:

1. Pengguna mengirim pertanyaan atau memilih emiten.
2. Sistem memvalidasi ticker dan memeriksa semantic cache Qdrant.
3. Jika cache tidak cocok atau sudah kedaluwarsa, data diambil secara paralel dari Yahoo Finance dan endpoint publik IDX.
4. Indikator teknikal, financial health, flow, insider, dan commodity lens dihitung secara lokal.
5. OpenRouter menyintesis laporan terstruktur dari evidence tersebut.
6. Laporan disimpan kembali ke Qdrant untuk pertanyaan semantik serupa pada hari yang sama.

## Tech Stack

- [Next.js 14](https://nextjs.org/) App Router
- React 18 + TypeScript
- Tailwind CSS
- Recharts
- Lucide React
- Zod
- [Yahoo Finance](https://finance.yahoo.com/) (data publik, tidak resmi)
- [OpenRouter](https://openrouter.ai/)
- [Qdrant](https://qdrant.tech/) via Docker/OrbStack

## Prasyarat

- Node.js 20+ (Node.js 24 juga didukung)
- npm
- Docker Desktop atau OrbStack untuk semantic cache Qdrant
- Tidak perlu API key data pasar (Yahoo Finance + IDX)
- OpenRouter API key

## Instalasi

```bash
git clone <repository-url>
cd Telaah-AI
npm install
cp .env.example .env
```

Isi nilai environment yang diperlukan di `.env`:

```env
MARKET_DATA_PROVIDER=open
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Opsional; default http://localhost:6333
QDRANT_URL=http://localhost:6333

# Opsional; default qwen/qwen3.5-397b-a17b
OPENROUTER_MODEL=qwen/qwen3.5-397b-a17b
```

Jangan commit `.env` atau API key ke repository.

## Menjalankan Qdrant

Dengan Docker atau OrbStack:

```bash
mkdir -p data/qdrant_storage

docker run -d \
  --name telaah-qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v "$(pwd)/data/qdrant_storage:/qdrant/storage" \
  qdrant/qdrant
```

Periksa status Qdrant:

```bash
curl http://localhost:6333/healthz
```

Aplikasi membuat collection `telaah_intelligence_cache` secara otomatis. Collection menggunakan cosine similarity, embedding 1536 dimensi, dan indeks payload untuk `symbol` serta `mode`.

Qdrant bersifat opsional. Jika tidak tersedia, aplikasi tetap dapat melakukan analisis langsung tanpa semantic cache.

## Menjalankan Redis (Docker)

Untuk cache terjemahan global (Multilingual AI Translation Cache) dan sesi berkecepatan tinggi:

```bash
mkdir -p data/redis_storage

docker run -d \
  --name telaah-redis \
  -p 6379:6379 \
  -v "$(pwd)/data/redis_storage:/data" \
  redis:alpine redis-server --appendonly yes
```

Periksa status Redis:

```bash
docker exec -it telaah-redis redis-cli ping
# Respon: PONG
```

Redis bersifat opsional; jika Redis tidak aktif, sistem otomatis beralih ke cache memori lokal aman.

## Menjalankan Aplikasi

Development:

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

Production build:

```bash
npm run build
npm start
```

Lint:

```bash
npm run lint
```

## Route Utama

| Route | Kegunaan |
|---|---|
| `/` | Percakapan riset dan kanvas analisis emiten |
| `/watchlist` | Matriks emiten yang dipantau |
| `/technical` | Screener dan stasiun teknikal |
| `/insider` | Aktivitas insider dan whale radar |
| `/commodity` | Harga komoditas dan sensitivitas emiten |

## API Internal

| Endpoint | Fungsi |
|---|---|
| `POST /api/analyze` | Klasifikasi, evidence collection, synthesis, dan cache laporan |
| `POST /api/qa` | Tanya-jawab yang dikunci pada laporan emiten aktif |
| `POST /api/compare` | Perbandingan dua emiten |
| `POST /api/watchlist-metrics` | Metrik batch untuk tabel watchlist |
| `GET /api/market-overview` | Indeks dan komoditas untuk ticker tape |
| `GET /api/commodity-prices` | Harga komoditas global |
| `GET /api/insider-feed` | Feed filing/aktivitas insider |
| `POST /api/telegram/webhook` | Webhook bot Telegram (owner-only, secret-protected) |
| `POST /api/brief/harmonic` | Harmonic brief 4H/1D/1W/1M, lokal untuk cron |

## Telegram dan Harmonic Brief

Telaah 360 bisa dipakai lewat bot Telegram pribadi:

- **Chat** di DM bot untuk tanya-jawab emiten dengan pipeline yang sama seperti web.
- **Brief** harian berisi 5 emiten likuid yang paling dekat ke area buy harmonic pada 4H, 1D, 1W, dan 1M.
- Hanya `TELEGRAM_OWNER_ID` yang dilayani; tidak ada OAuth atau pendaftaran publik.
- Brief dijadwalkan dari cron host (08:00 WIB) dan memanggil endpoint lokal, jadi aman dari timeout Cloudflare.

Panduan lengkap: [`docs/TELEGRAM_HARMONIC_BRIEF.md`](./docs/TELEGRAM_HARMONIC_BRIEF.md).

## Phase 2: IDX Public Data

Sejak Phase 2, Telaah 360 juga memakai data publik IDX melalui service scraper lokal:

- **Foreign flow** harian per emiten (net asing dalam lembar dan estimasi rupiah).
- **Profil emiten** IDX: sektor, subsektor, papan pencatatan, direksi, komisaris, pemegang saham besar.
- **Insider/ownership filings** dari PDF keterbukaan IDX, termasuk market-wide insider feed di `/insider`.
- **Suspensi dan kalender aksi korporasi** sebagai data pendukung.

Service berjalan di container `telaah-scraper` dalam pod yang sama dan hanya listen di `127.0.0.1:8001`. Jika `SCRAPER_URL` kosong atau service mati, aplikasi tetap berjalan dengan data Yahoo dan menandai flow/insider sebagai tidak tersedia.

Broker summary penuh belum aktif karena IPOT sedang 502 dan Stockbit belum dikonfigurasi; FlowLens akan menampilkan status `partial` dengan foreign flow saja. Panduan lengkap: [`docs/PHASE2_IDX_SCRAPER.md`](./docs/PHASE2_IDX_SCRAPER.md).

## Struktur Folder

```text
src/
├── app/
│   ├── api/                 # Route handlers server-side
│   ├── commodity/           # Commodity station
│   ├── insider/             # Insider station
│   ├── technical/           # Technical station
│   ├── watchlist/           # Watchlist matrix
│   └── page.tsx             # Percakapan dan kanvas utama
├── components/
│   ├── chat/                # Feed, input, sidebar, inline artifacts
│   └── retail/              # Kalkulator, jargon, dan share card
├── data/                    # Direktori statis emiten IDX
└── lib/
    ├── agent/               # Classifier, coordinator, router, synthesizer
    ├── quant/               # Financial, technical, flow, insider calculations
    ├── market/              # Yahoo/IDX provider, FX, berita, komoditas
    ├── sectors/             # Legacy Sectors client (opsional)
    ├── storage/             # Browser/server cache helpers
    └── vector/              # Embedding dan Qdrant semantic cache
```

## Cache dan Freshness

Telaah 360 memiliki beberapa lapisan cache:

1. **Browser report cache** untuk membuka kembali laporan tanpa request tambahan.
2. **In-memory Yahoo/IDX response cache** dengan TTL sesuai jenis endpoint.
3. **Qdrant semantic cache** untuk prompt yang semantically similar.

Aturan freshness semantic cache menggunakan hari kalender WIB (`Asia/Jakarta`):

```text
capturedDate === todayWIB
```

Laporan dari hari sebelumnya dianggap stale dan tidak digunakan sebagai data pasar hari ini. Semantic match memakai cosine similarity minimal `0.88`. Request mode `full` tidak akan dilayani oleh cache mode `quick`.

## Model AI

Model default synthesis:

```text
qwen/qwen3.5-397b-a17b
```

Deep reasoning dinonaktifkan melalui OpenRouter (`reasoning.effort = none`) untuk menekan latensi dan token. Fallback model adalah `openai/gpt-4o-mini`.

Embedding semantic cache menggunakan:

```text
openai/text-embedding-3-small
```

Output model melewati parser dan sanitizer untuk mencegah malformed JSON serta repetition loop sebelum ditampilkan atau disimpan.

## Penyimpanan Lokal

Data berikut disimpan di `localStorage` browser:

- sesi dan riwayat chat;
- status pin chat;
- watchlist;
- laporan yang terakhir dibuka;
- tema pilihan pengguna.

Data belum disinkronkan lintas browser atau akun pengguna.

## Catatan Data dan Keamanan

- API key hanya digunakan pada server route dan tidak boleh dikirim ke browser.
- Validasi simbol dan parameter dilakukan sebelum request ke provider.
- Broker summary adalah data agregat; bukan identitas pemilik manfaat dan bukan bukti koordinasi bandar.
- Technical indicators bersifat lagging dan harus dibaca bersama fundamental serta kondisi pasar.
- Ketersediaan field dapat berbeda menurut emiten, sektor, periode laporan, dan sumber data publik. Yahoo Finance bukan API resmi dan dapat berubah sewaktu-waktu.
- Lampiran gambar saat ini dipreview dan disimpan bersama sesi chat sebagai data URL di browser. Hindari gambar sensitif atau berukuran sangat besar.

## Dokumentasi Proyek

- [`PRD-Telaah-360.md`](./PRD-Telaah-360.md) — product requirements utama
- [`Design.md`](./Design.md) — rancangan tampilan dan pengalaman pengguna
- [`API-MAP-Telaah-360.md`](./API-MAP-Telaah-360.md) — pemetaan endpoint
- [`Sectors-API-v2-Audit.md`](./Sectors-API-v2-Audit.md) — catatan historis audit Sectors API v2 (legacy)
- [`docs/superpowers/specs/`](./docs/superpowers/specs/) — spesifikasi perubahan besar
- [`docs/superpowers/plans/`](./docs/superpowers/plans/) — implementation plans
- [`docs/TELEGRAM_HARMONIC_BRIEF.md`](./docs/TELEGRAM_HARMONIC_BRIEF.md) — operasional bot Telegram dan brief harmonic
- [`docs/PHASE2_IDX_SCRAPER.md`](./docs/PHASE2_IDX_SCRAPER.md) — scraper IDX, foreign flow, insider PDF, dan batasan data

## Disclaimer

Telaah 360 menyajikan informasi dan analisis edukatif berdasarkan data yang tersedia. Hasil analisis tidak merupakan ajakan, rekomendasi, atau nasihat investasi. Selalu lakukan verifikasi independen dan pertimbangkan profil risiko sebelum mengambil keputusan finansial.
