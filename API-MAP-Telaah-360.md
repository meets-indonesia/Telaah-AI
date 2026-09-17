# Peta dan Spesifikasi Lengkap API Telaah 360 (Telaah-AI)

Dokumen ini merangkum pemetaan arsitektur, spesifikasi endpoint, alokasi kredit, payload request/response, serta mekanisme optimasi cache untuk seluruh API yang digunakan dalam aplikasi **Telaah 360**.

---

## Daftar Isi
1. [Arsitektur Aliran Data (Data Flow Architecture)](#1-arsitektur-aliran-data-data-flow-architecture)
2. [Internal API Routes (Next.js App Router)](#2-internal-api-routes-nextjs-app-router)
   - [2.1 POST /api/analyze](#21-post-apianalyze)
   - [2.2 POST /api/compare](#22-post-apicompare)
   - [2.3 GET /api/market-overview](#23-get-apimarket-overview)
   - [2.4 POST /api/qa](#24-post-apiqa)
3. [External Financial Data API: Sectors API v2](#3-external-financial-data-api-sectors-api-v2)
   - [3.1 Profil, Valuasi & Laporan Keuangan Kuartalan](#31-profil-valuasi--laporan-keuangan-kuartalan)
   - [3.2 Data Transaksi Pasar, OHLCV & Teknikal](#32-data-transaksi-pasar-ohlcv--teknikal)
   - [3.3 Bandarmologi, Broker Summary & Foreign Flow](#33-bandarmologi-broker-summary--foreign-flow)
   - [3.4 Keterbukaan Informasi, Insider & Corporate Actions](#34-keterbukaan-informasi-insider--corporate-actions)
   - [3.5 Komoditas Acuan & Sektor Tambang (Mining Extension)](#35-komoditas-acuan--sektor-tambang-mining-extension)
4. [AI & LLM Inference API: OpenRouter](#4-ai--llm-inference-api-openrouter)
   - [4.1 Konfigurasi Model & Reasoning Fallback](#41-konfigurasi-model--reasoning-fallback)
   - [4.2 Pipeline Klasifikasi & Ekstraksi Klaim](#42-pipeline-klasifikasi--ekstraksi-klaim)
   - [4.3 Synthesis Guard & Output JSON Repair](#43-synthesis-guard--output-json-repair)
5. [Auxiliary Public API (Gratis / 0 Kredit)](#5-auxiliary-public-api-gratis--0-kredit)
6. [Strategi Optimasi Kuota & Caching Layer](#6-strategi-optimasi-kuota--caching-layer)
7. [Daftar Environment Variables](#7-daftar-environment-variables)

---

## 1. Arsitektur Aliran Data (Data Flow Architecture)

```mermaid
flowchart TD
    User([Pengguna / Browser]) -->|Request UI / Chat| Frontend[Next.js Frontend Client]
    
    Frontend -->|POST /api/analyze| API_Analyze[Route: /api/analyze]
    Frontend -->|POST /api/compare| API_Compare[Route: /api/compare]
    Frontend -->|GET /api/market-overview| API_Market[Route: /api/market-overview]
    Frontend -->|POST /api/qa| API_QA[Route: /api/qa]

    subgraph Backend Orchestration
        API_Analyze --> Classifier[Agent: Input Classifier]
        Classifier --> Coordinator[Agent: Evidence Coordinator]
        Coordinator --> QuantEngine[Local Quant Engine\n(RSI, MACD, Solvency, Flow)]
        Coordinator --> SectorsAdapter[Sectors API v2 Adapter]
        Coordinator --> LocalCache[(Local Disk/Memory Cache\nBrokers & Reports)]
        Coordinator --> Synthesizer[Agent: Synthesis Guard]
    end

    SectorsAdapter -->|HTTPS GET Auth Header| SectorsAPI[(api.sectors.app v2)]
    Classifier & Synthesizer & API_QA -->|Prompt + Context| OpenRouter[(OpenRouter AI API)]
    API_Market -->|USD/IDR Free FX| FreeFX[(open.er-api.com)]
```

---

## 2. Internal API Routes (Next.js App Router)

### 2.1 POST `/api/analyze`
Endpoint sentral untuk menjalankan riset emiten 360 derajat. Menerima query teks bebas atau simbol saham, melakukan ekstraksi klaim rumor, menarik bukti data resmi, dan menyusun laporan terverifikasi.

- **URL:** `http://localhost:3000/api/analyze`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

#### Request Payload:
```json
{
  "prompt": "Bagaimana prospek valuasi dan akumulasi broker BBCA setelah laporan keuangan terbaru?",
  "mode": "full", // "quick" (5-9 kredit) | "full" (14-22 kredit)
  "confirmedSymbol": "BBCA" // Opsional jika sudah memilih emiten pasti
}
```

#### Response Success (`200 OK`):
```json
{
  "success": true,
  "report": {
    "symbol": "BBCA",
    "companyName": "PT Bank Central Asia Tbk",
    "directAnswer": "BBCA menunjukkan fundamental solid dengan pertumbuhan laba YoY +12.8%...",
    "mode": "full",
    "verdict": {
      "label": "Bullish",
      "confidence": 88,
      "summary": "Valuasi premium terjustifikasi oleh ROE tinggi dan net foreign buy konsisten."
    },
    "claims": [
      {
        "id": "claim_01",
        "statement": "Laba bersih BBCA tumbuh di atas 10%",
        "verdict": "VERIFIED",
        "evidenceRef": "ev_financials_01"
      }
    ],
    "financials": { /* Metrik kuartalan, YoY, solvabilitas, margin */ },
    "flowLens": { /* Top buyer, top seller, foreign flow 5D, bandarmologi */ },
    "technical": { /* OHLC, SMA20/50, RSI 14, MACD, support/resistance */ },
    "peerLens": { /* Perbandingan PE, PBV, ROE dengan peer group */ },
    "insiderRadar": { /* Filings direksi, kepemilikan >5%, transaksi cluster buy */ },
    "commodityLens": { /* Sensitivitas harga komoditas acuan (bila sektor terkait) */ },
    "events": { /* Timeline dividen, RUPS, berita, dan suspensi */ },
    "evidenceRecords": [ /* Daftar sitasi bukti data mentah Sectors API */ ],
    "creditsConsumed": 14
  }
}
```

#### Response Butuh Konfirmasi Simbol (`200 OK`):
```json
{
  "needsConfirmation": true,
  "candidateSymbol": "BBCA",
  "message": "Tidak dapat mendeteksi kode saham IDX 4 huruf secara pasti. Silakan konfirmasi kode saham.",
  "classification": { "intent": "thesis_review" }
}
```

---

### 2.2 POST `/api/compare`
Membandingkan 2 saham secara *head-to-head* pada metrik valuasi, kinerja harga, arus dana asing, dan teknikal.

- **URL:** `/api/compare`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

#### Request Payload:
```json
{
  "symbolA": "BBCA",
  "symbolB": "BBRI",
  "prompt": "Bandingkan valuasi dividen BBCA vs BBRI" // Opsional jika simbol kosong
}
```

#### Response Success (`200 OK`):
```json
{
  "success": true,
  "result": {
    "symbolA": "BBCA",
    "nameA": "PT Bank Central Asia Tbk",
    "priceA": 10250,
    "sectorA": "Financials",
    "symbolB": "BBRI",
    "nameB": "PT Bank Rakyat Indonesia (Persero) Tbk",
    "priceB": 5200,
    "sectorB": "Financials",
    "metrics": [
      {
        "category": "Valuasi",
        "name": "Price to Earnings (PER)",
        "valueA": "22.4x",
        "valueB": "11.8x",
        "winner": "B",
        "explanation": "PER BBRI lebih rendah sehingga secara relatif lebih murah terhadap laba bersih."
      }
    ],
    "verdictA": "Unggul di stabilitas CASA dan kualitas aset (NPL rendah).",
    "verdictB": "Unggul di dividend yield dan valuasi PE relatif murah.",
    "retailSummary": "Untuk investor defensif jangka panjang BBCA lebih stabil..."
  }
}
```

---

### 2.3 GET `/api/market-overview`
Menyediakan data indeks pasar (IHSG), kurs valuta asing (USD/IDR), dan harga komoditas acuan dunia untuk *top bar*. Menggunakan disk-cache 24 jam untuk menekan biaya kredit Sectors API ke 0.

- **URL:** `/api/market-overview`
- **Method:** `GET`
- **Query Params:** `?refresh=true` *(Opsional, untuk bypass cache disk)*

#### Response Success (`200 OK`):
```json
{
  "success": true,
  "lastFetchedAt": 1726549200000,
  "fetchedDate": "2026-09-17T05:00:00.000Z",
  "asOfDate": "2026-09-16",
  "ttlHours": 24,
  "indices": [
    { "name": "IHSG", "code": "COMPOSITE", "price": "7,310.25", "change": "+0.45%", "isPositive": true },
    { "name": "USD/IDR", "code": "USDIDR", "price": "Rp 15,850", "change": "-0.20%", "isPositive": false },
    { "name": "Newcastle Coal", "code": "COAL", "price": "$148.50", "change": "+1.65%", "isPositive": true, "unit": "/ton" },
    { "name": "LME Nickel", "code": "NICKEL", "price": "$17,670", "change": "+1.20%", "isPositive": true, "unit": "/ton" },
    { "name": "COMEX Gold", "code": "GOLD", "price": "$2,742.50", "change": "+1.10%", "isPositive": true, "unit": "/oz" }
  ]
}
```

---

### 2.4 POST `/api/qa`
Asisten chat interaktif yang beroperasi secara *grounded* (hanya menjawab berdasarkan bukti laporan emiten yang sedang dibuka, anti-halusinasi).

- **URL:** `/api/qa`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`

#### Request Payload:
```json
{
  "question": "Apakah asing sedang buang barang di saham ini 5 hari terakhir?",
  "report": { /* Object CompanyIntelligenceReport saat ini */ }
}
```

#### Response Success (`200 OK`):
```json
{
  "success": true,
  "answer": "Berdasarkan data FlowLens pada laporan BBCA, investor asing mencatatkan akumulasi bersih (Net Buy) sebesar Rp 245 Miliar dalam 5 hari bursa terakhir..."
}
```

---

## 3. External Financial Data API: Sectors API v2

Semua pemanggilan dilakukan melalui adapter server-side `src/lib/sectors/client.ts` dengan menyertakan header otentikasi:
```http
Authorization: <SECTORS_API_KEY>
Accept: application/json
```

### 3.1 Profil, Valuasi & Laporan Keuangan Kuartalan
| Endpoint | Parameter | Biaya Kredit | Deskripsi & Kegunaan |
| :--- | :--- | :---: | :--- |
| `GET /v2/company/report/{symbol}/` | `sections=overview,valuation,financials,peers,ownership,management` | 1 kredit / section | **Inti Data Fundamental**: Menarik ringkasan emiten, rasio PE/PBV historical, ringkasan kinerja keuangan, daftar emiten kompetitor (*peer group*), dan profil manajemen. |
| `GET /v2/company/get_quarterly_financial_dates/{symbol}/` | `{symbol}` | 1 kredit | **Preflight Date Guard**: Mengambil daftar tanggal rilis laporan keuangan resmi yang tersedia di bursa agar tidak salah request kuartal. |
| `GET /v2/financials/quarterly/{symbol}/` | `n_quarters=4` | 1 kredit / kuartal | Mengambil laporan keuangan kuartalan detail (Revenue, Net Income, Total Asset, Total Debt, Operating Cashflow). |
| `GET /v2/company/get-segments/{symbol}/` | `{symbol}` | 1 kredit | Membaca breakdown lini pendapatan perusahaan per segmen bisnis & geografis. |
| `GET /v2/company/shareholders-composition/{symbol}/` | `{symbol}` | 1 kredit | Komposisi persentase kepemilikan saham publik vs institusi pengendali vs asing. |
| `GET /v2/free-float/` | `symbol={symbol}` | 1 kredit | Persentase saham *free-float* di pasar reguler. |

---

### 3.2 Data Transaksi Pasar, OHLCV & Teknikal
| Endpoint | Parameter | Biaya Kredit | Deskripsi & Kegunaan |
| :--- | :--- | :---: | :--- |
| `GET /v2/daily/{symbol}/` | `start=YYYY-MM-DD&end=YYYY-MM-DD` | 1 kredit | **Terminal Teknikal & Candlestick**: Data historis 90 hari harga pembukaan, tertinggi, terendah, penutupan, dan volume harian (*OHLCV*). |
| `GET /v2/index-daily/{index_code}/` | `index_code=ihsg` | 1 kredit | Data historis pergerakan Indeks Harga Saham Gabungan (IHSG). |
| `GET /v2/idx-total/` | - | 1 kredit | Total kapitalisasi pasar bursa efek Indonesia. |

---

### 3.3 Bandarmologi, Broker Summary & Foreign Flow
| Endpoint | Parameter | Biaya Kredit | Deskripsi & Kegunaan |
| :--- | :--- | :---: | :--- |
| `GET /v2/broker-summary/{symbol}/` | `start`, `end` | 1 kredit | **Engine FlowLens**: Rincian transaksi per broker (Net Volume, Net Lot, Nilai Beli/Jual, Average Execution Price) selama periode 14 hari bursa. |
| `GET /v2/broker-summary/{symbol}/top/` | `{symbol}` | 2 kredit | Menghasilkan daftar 5 broker pembeli terbesar (*Top Buyer*) dan 5 broker penjual terbesar (*Top Seller*). |
| `GET /v2/foreign-flow/{symbol}/` | `start`, `end` | 1 kredit | Arus transaksi investor asing (*Net Foreign Buy/Sell*) harian hingga 90 hari bursa. |
| `GET /v2/brokers/` | - | 1 kredit *(Gratis via disk cache)* | Master data registri broker: Nama lengkap sekuritas, kode broker, status lisensi, dan klasifikasi (*Asing, Domestik, BUMN*). |
| `GET /v2/broker-activity/{broker_code}/` | `{broker_code}` | 1 kredit | *(Opsional)* Memantau portofolio transaksi saham apa saja yang ditransaksikan oleh broker tertentu. |

---

### 3.4 Keterbukaan Informasi, Insider & Corporate Actions
| Endpoint | Parameter | Biaya Kredit | Deskripsi & Kegunaan |
| :--- | :--- | :---: | :--- |
| `GET /v2/company/corporate-actions/{symbol}/` | `{symbol}` | 1 kredit | **Events & Dividend Module**: Riwayat dan jadwal aksi korporasi emiten (Dividen Tunai, Rights Issue, Stock Split, RUPS Tahunan). |
| `GET /v2/filings/` | `symbol={symbol}` | 1 kredit | **Whale & Insider Radar**: Pelaporan kepemilikan saham oleh Direksi, Komisaris, dan kepemilikan investor di atas 5% yang wajib lapor ke OJK. |
| `GET /v2/news/` | `symbols={symbol}&limit=5` | 1 kredit | Berita terverifikasi seputar emiten terkait dari media terpercaya. |
| `GET /v2/suspensions/` | `symbol={symbol}` | 1 kredit | Data suspensi perdagangan atau pengumuman Unusual Market Activity (UMA) oleh BEI. |

---

### 3.5 Komoditas Acuan & Sektor Tambang (Mining Extension)
| Endpoint | Parameter | Biaya Kredit | Deskripsi & Kegunaan |
| :--- | :--- | :---: | :--- |
| `GET /v2/mining/commodities/price/` | `commodity={code}` | 1 kredit | Harga komoditas acuan resmi (Thermal Coal, LME Nickel, COMEX Gold, LME Copper). |
| `GET /v2/mining/sites-production/` | `symbol={symbol}` | 1 kredit | Estimasi cadangan tambang terbukti & terkira (*2P Reserves*) dan target volume produksi tambang. |

---

## 4. AI & LLM Inference API: OpenRouter

Pipeline AI Telaah 360 terintegrasi via OpenRouter untuk komputasi bahasa alami finansial berbiaya rendah dan berkecepatan tinggi.

- **Base URL:** `https://openrouter.ai/api/v1/chat/completions`
- **Method:** `POST`
- **Headers:**
  ```http
  Authorization: Bearer <OPENROUTER_API_KEY>
  Content-Type: application/json
  HTTP-Referer: https://telaah360.local
  X-Title: Telaah 360
  ```

### 4.1 Konfigurasi Model & Reasoning Fallback
1. **Model Utama (Primary):** `inclusionai/ling-3.0-flash-fin`
   - Model penalaran finansial ringan dengan kemampuan analisis kuantitatif dan deduksi laporan keuangan yang tajam.
2. **Model Cadangan (Fallback):** `openai/gpt-4o-mini`
   - Otomatis dipicu oleh `src/lib/agent/openrouter.ts` jika model utama mengalami *rate limit*, *timeout*, atau kegagalan parsing format JSON.

### 4.2 Pipeline Klasifikasi & Ekstraksi Klaim
Menganalisis kalimat input pengguna menjadi struktur JSON:
- `intent`: `"thesis_review"` | `"claim_check"` | `"market_technical"` | `"news_event"` | `"company_overview"`
- `symbol`: Ticker 4 huruf (misal `BBRI`)
- `claims`: Array poin-poin klaim kuantitatif atau rumor pasar untuk diverifikasi terhadap data Sectors API.

### 4.3 Synthesis Guard & Output JSON Repair
Modul `src/lib/agent/openrouter.ts` dilengkapi fungsi sanitasi otomatis:
- Membersihkan tag reasoning model `<think>...</think>`.
- Membersihkan artifak tanda baca Chinese/Fullwidth tokenizer (`，` `：` `“` `【` `】`).
- Membersihkan karakter kontrol non-escaped (newline/tab di dalam string JSON).
- Mengoreksi penutupan kurung kurawal yang terputus (*JSON self-healing parser*).

---

## 5. Auxiliary Public API (Gratis / 0 Kredit)

Digunakan untuk melengkapi data non-IDX tanpa mengurangi kuota API berbayar:

| Layanan | Endpoint | Method | Fungsi di Telaah 360 |
| :--- | :--- | :---: | :--- |
| **Open Exchange Rates (Free FX)** | `https://open.er-api.com/v6/latest/USD` | `GET` | Memperbarui kurs valuta harian USD terhadap IDR secara otomatis di market ticker bar. |

---

## 6. Strategi Optimasi Kuota & Caching Layer

Agar penggunaan kredit efisien dan hemat biaya:

1. **Broker Registry Static Cache (0 Kredit):**
   - File data `data/brokers_registry.json` disimpan di disk lokal. Pengecekan nama broker tidak lagi memanggil API Sectors kecuali cache kedaluwarsa (> 24 jam).
2. **Daily Market Overview Cache 24 Jam (0 Kredit Pengulangan):**
   - File `data/market_cache.json` mencatat data IHSG, komoditas, dan kurs selama 24 jam. Kunjungan berulang pengguna tidak mengonsumsi kredit Sectors API.
3. **Credit-Aware Section Planner:**
   - Permintaan `/v2/company/report/` dibatasi hanya meminta *section* yang relevan (`sections=overview,valuation,financials`), bukan memanggil default 8 section (hemat 5 kredit per request).
4. **Kalkulasi Indikator Lokal (Quant Engine):**
   - SMA20, SMA50, RSI 14 Wilder, dan MACD dihitung secara lokal di server Node.js (`src/lib/quant/indicators.ts`) dari data raw transaksi harian, menghemat biaya endpoint indikator pihak ketiga.
5. **Browser LocalStorage Report Cache:**
   - Laporan emiten yang pernah dianalisis disimpan di `localStorage` peramban klien. Pengguna dapat membuka kembali riwayat tanpa perlu fetch ulang ke server.

---

## 7. Daftar Environment Variables

Konfigurasi kunci API yang diperlukan di file `.env` atau `.env.local`:

```env
# Kunci Otentikasi Sectors API v2 (https://sectors.app)
SECTORS_API_KEY=your_sectors_api_key_here

# Kunci Otentikasi OpenRouter API (https://openrouter.ai)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# (Opsional) Override Model LLM Finansial
OPENROUTER_MODEL=inclusionai/ling-3.0-flash-fin
```
