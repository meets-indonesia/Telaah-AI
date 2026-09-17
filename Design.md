# Design System & UI Specifications (Design.md) — Telaah 360
**Platform:** Google Stitch Design & UI Generation Specification  
**Version:** 3.0  
**Design Paradigm:** Cyber-Fintech Dark Mode (Linear / Vercel meets Bloomberg Professional Terminal)  
**Primary Language:** Bahasa Indonesia (Formal, Modern, Educative Fintech)

---

## 1. Design System Tokens & Foundations

### 1.1 Color Palette (HSL & Hex)

#### A. Background & Surface Scales (Deep Space Dark)
- `--bg-canvas`: `#070b13` (Warna dasar canvas paling gelap, 100% viewport)
- `--bg-subtle`: `#090d16` (Background utama page & body container)
- `--bg-card`: `#0f172a` / `rgba(15, 23, 42, 0.85)` (Permukaan kartu modul dengan efek glassmorphism)
- `--bg-card-hover`: `#1e293b` (State hover kartu modul)
- `--bg-elevated`: `#161f38` (Permukaan popover, modal, dan slide-out drawer)
- `--bg-input`: `#0a0f1d` (Field input, textarea, search bar)

#### B. Border & Divider Scales
- `--border-subtle`: `rgba(51, 65, 85, 0.4)` (`#334155` opacity 40%)
- `--border-default`: `rgba(51, 65, 85, 0.8)` (`#334155` opacity 80%)
- `--border-focus`: `#3b82f6` (Aksen border saat state focus aktif)
- `--border-glow`: `rgba(59, 130, 246, 0.35)` (Efek cahaya neon lembut di sekeliling kartu)

#### C. Primary Brand & Accent Colors
- `--brand-primary`: `#3b82f6` (Electric Blue - Aksi utama, link, tabs)
- `--brand-primary-hover`: `#2563eb`
- `--brand-cyan`: `#06b6d4` (Aksen sekunder untuk AI Copilot & streaming data)
- `--brand-indigo`: `#6366f1` (Aksen ungu-biru untuk Insider & Whale Radar)
- `--brand-amber`: `#f59e0b` (Aksen emas/oranye untuk Commodity & Mining Lens)

#### D. Semantic Financial Signals
- `--signal-bullish`: `#10b981` (Emerald Green - Kenaikan harga, profit, akumulasi broker, status VERIFIED)
- `--signal-bullish-bg`: `rgba(16, 185, 129, 0.12)`
- `--signal-bearish`: `#ef4444` (Coral Red - Penurunan harga, rugi, distribusi broker, status BERTENTANGAN)
- `--signal-bearish-bg`: `rgba(239, 68, 68, 0.12)`
- `--signal-warning`: `#f59e0b` (Amber - Status PERLU KONTEKS, UMA, suspensi sementara)
- `--signal-warning-bg`: `rgba(245, 158, 11, 0.12)`
- `--signal-neutral`: `#64748b` (Slate Gray - Netral, sideways, status TIDAK DAPAT DIVERIFIKASI)

#### E. Typography Scales (Text)
- `--text-primary`: `#f8fafc` (Slate 50 - Judul, angka utama, teks prioritas tinggi)
- `--text-secondary`: `#cbd5e1` (Slate 300 - Paragraf, deskripsi modul)
- `--text-muted`: `#64748b` (Slate 500 - Timestamp, label metrik, disclaimer)
- `--text-accent`: `#60a5fa` (Blue 400 - Ticker kode emiten, link aktif)

---

### 1.2 Typography System

- **Display & Interface Font:** `Plus Jakarta Sans`, `Inter`, sans-serif (Sleek, geometris, modern).
- **Numbers & Data Code Font:** `JetBrains Mono`, `Fira Code`, monospace (Angka finansial tabular, kode broker, ticker saham, tanggal).

| Skala Teks | Ukuran | Line Height | Weight | Kegunaan |
| :--- | :--- | :--- | :--- | :--- |
| `display-xl` | 32px (2rem) | 1.2 | Bold (700) | Hero Headline, Nama Emiten Utama di Header |
| `heading-lg` | 24px (1.5rem) | 1.3 | SemiBold (600) | Judul Modul (FlowLens, Technical Terminal) |
| `heading-md` | 18px (1.125rem)| 1.4 | SemiBold (600) | Sub-judul kartu, Direct Answer Heading |
| `body-base` | 14px (0.875rem)| 1.6 | Regular (400) | Paragraf analisis finansial, ringkasan klaim |
| `body-sm` | 12px (0.75rem) | 1.5 | Regular (400) | Deskripsi metrik, penjelasan indikator |
| `mono-data` | 13px (0.8125rem)| 1.4 | Medium (500) | Angka harga, P/E, volume lot, kode broker |
| `caption-xs`| 10px (0.625rem)| 1.2 | SemiBold (600) | Badge status, ticker pill, label status bursa |

---

### 1.3 Elevation & Shadows (Dark Glow Aesthetics)
- **Card Shadow:** `0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)`
- **Blue Glow:** `0 0 20px -3px rgba(59, 130, 246, 0.25)`
- **Green Glow:** `0 0 20px -3px rgba(16, 185, 129, 0.25)`
- **Red Glow:** `0 0 20px -3px rgba(239, 68, 68, 0.25)`
- **Backdrop Blur:** `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);`

---

## 2. Component Library & Specifications

### 2.1 Buttons & Quick Chips
1. **Primary AI Action Button:**
   - Visual: Gradien horizontal `from-blue-600 to-indigo-600`, teks putih tebal, icon `Sparkles` / `Search`.
   - Micro-interaction: Hover scale `1.02`, glow shadow `shadow-lg shadow-blue-500/25`. State loading memunculkan spinner berputar halus.
2. **Quick Ticker Chip:**
   - Visual: Background `#0f172a`, border `#1e293b`, font `JetBrains Mono` 11px tebal.
   - State Active: Background `#2563eb`, border `#3b82f6`, teks putih dengan shadow biru.
3. **Ghost Drawer Trigger Button:**
   - Tombol icon transparan dengan border halus untuk memicu *Evidence Drawer* atau *Q&A Copilot*.

### 2.2 Verdict Badges & Cohort Tags
- **VERIFIED:** Badge hijau neon `bg-emerald-500/15 border-emerald-500/30 text-emerald-400` dengan icon `CheckCircle2`.
- **CONTRADICTED:** Badge merah `bg-rose-500/15 border-rose-500/30 text-rose-400` dengan icon `XCircle`.
- **NEED CONTEXT:** Badge amber `bg-amber-500/15 border-amber-500/30 text-amber-300` dengan icon `AlertTriangle`.
- **UNVERIFIED:** Badge slate `bg-slate-800 border-slate-700 text-slate-400` dengan icon `HelpCircle`.
- **Broker Cohort:**
  - `[F]` Asing: Badge ungu `bg-purple-500/20 text-purple-300 border-purple-500/30`.
  - `[D]` Domestik: Badge biru `bg-blue-500/20 text-blue-300 border-blue-500/30`.
  - `[BUMN]` BUMN: Badge kuning `bg-amber-500/20 text-amber-300 border-amber-500/30`.

### 2.3 Financial Metric Cards (Stat Cards)
- Struktur:
  1. Label atas: Nama metrik kecil monospaced (misal: `PRICE TO EARNINGS (PER)`).
  2. Angka utama: Nilai monospaced tebal 24px (misal: `18.4x`).
  3. Badge delta: Persentase perubahan YoY (hijau `+12.4%` atau merah `-4.2%`).
  4. Deskripsi bawah: Penjelasan bahasa Indonesia santai untuk investor pemula.

---

## 3. Screen Layout Wireframes & Component Trees

### 3.1 Global Navigation & Header (Desktop Layout)
```
+---------------------------------------------------------------------------------------------------------------+
| [IHSG 7,310.2 +0.45%] | [USD/IDR Rp 15,850] | [COAL $148.5 +1.6%] | [NICKEL $17,670] | [CREDIT SAVER: 24H OK] |
+---------------------------------------------------------------------------------------------------------------+
| SIDEBAR (w-64)   | TOP APP HEADER: Active Emiten (BBCA) | Price: Rp 10,250 (+1.2%) | [Evidence] [Copilot] [Share]   |
|                  |--------------------------------------------------------------------------------------------|
| [Logo] Telaah360 | MAIN CANVAS VIEW AREA                                                                      |
|                  |                                                                                            |
| Nav Items:       |                                                                                            |
| * Ringkasan 360  |                                                                                            |
| * Terminal Chart |                                                                                            |
| * Whale Radar    |                                                                                            |
| * Commodity Lens |                                                                                            |
|                  |                                                                                            |
| Watchlist:       |                                                                                            |
| [BBCA] Rp 10.250 |                                                                                            |
| [BBRI] Rp  5.200 |                                                                                            |
| [ADRO] Rp  3.800 |                                                                                            |
+------------------+--------------------------------------------------------------------------------------------+
```

---

### 3.2 Screen 1: Studio 360° (Main Research Dashboard)

```
+---------------------------------------------------------------------------------------------------------------+
| UNIVERSAL INPUT STATION                                                                                       |
| [ Textarea: "Tempel postingan rumor pasar, analisa sentimen, atau ketik kode emiten BBCA..."                ] |
| Mode: [(*) Full 360 Review]  [( ) Quick Check]        Quick Tickers: [BBCA] [BBRI] [ADRO] [ANTM] [TLKM]       |
|                                                                                [ Sparkles: Analisis dengan AI]|
+---------------------------------------------------------------------------------------------------------------+
| DIRECT ANSWER & EXECUTIVE VERDICT CARD                                                                        |
| Status: [ SANGAT POSITIF / BULLISH ]   Key Signal: Akumulasi Asing & Kinerja Kuartalan Solid                  |
| TL;DR: BBCA mencatat pertumbuhan laba bersih +12.8% YoY didorong pertumbuhan kredit konsumer dan CASA 82%... |
| ------------------------------------------------------------------------------------------------------------- |
| KEUNGGULAN (KIRI)                                | RISIKO & PERHATIAN (KANAN)                                 |
| + NPL sangat rendah (1.8%)                       | - Valuasi PBV 4.8x tergolong premium di ASEAN              |
| + Net Foreign Buy Rp 480 Miliar 5 hari bursa     | - Potensi margin squeeze jika suku bunga acuan turun       |
| Disclaimer: Bukan ajakan membeli/menjual efek. Analisis independen berdasarkan data resmi IDX.               |
+---------------------------------------------------------------------------------------------------------------+
| CLAIM FACT-CHECKER (RUMOR VS REALITA)                                                                         |
| Card 1: [TERBUKTI] "Laba kuartal 2 tumbuh di atas 10%" -> Realita: Tumbuh +12.8% YoY [Lihat Bukti Data]       |
| Card 2: [BERTENTANGAN] "Asing mulai keluar dari BBCA" -> Realita: Net Foreign Buy Rp 480 Miliar 5 hari        |
+---------------------------------------------------------------------------------------------------------------+
| GRID 2 KOLOM:                                                                                                 |
| [ MODUL FINANSIAL & KESEHATAN ]                   | [ VALUASI & PEER LENS ]                                   |
| * Revenue: Rp 54.2 Triliun (+9.2% YoY)            | Tabel Komparasi Peer Subsektor Perbankan:                 |
| * Net Income: Rp 26.8 Triliun (+12.8% YoY)        | Emiten | Price  | P/E    | P/B   | ROE   | Div Yield      |
| * Solvabilitas: SANGAT KUAT (Tier-1 CAR: 28%)     | BBCA*  | 10.250 | 22.4x  | 4.8x  | 21.2% | 2.8%           |
| * Grafik Batang Pertumbuhan Laba Kuartalan        | BBRI   |  5.200 | 11.8x  | 2.2x  | 18.5% | 6.2%           |
|                                                   | BMRI   |  7.100 | 11.2x  | 2.1x  | 19.8% | 5.5%           |
+---------------------------------------------------+-----------------------------------------------------------+
| [ FLOWLENS: BANDARMOLOGI & ASING ]                | [ EVENTS & DISCLOSURE TIMELINE ]                          |
| Indikator: AKUMULASI MASIF OLEH BROKER ASING      | * [15 Agu] Jadwal Pembayaran Dividen Interim Rp 50/lembar |
| Foreign Flow 5D: +Rp 480.200.000.000 (Hijau)      | * [02 Agu] Keterbukaan Informasi: Pembelian Direktur      |
| Top 5 Buyer       | Top 5 Seller                  | * [28 Jul] Laporan Keuangan Kuartal II Resmi Dirilis      |
| YP [D] 450.000 lot| PD [D] 210.000 lot            | * [10 Jun] Publikasi Hasil RUPS Tahunan                   |
| CC [F] 380.000 lot| NI [D] 190.000 lot            |                                                           |
+---------------------------------------------------+-----------------------------------------------------------+
```

---

### 3.3 Screen 2: Terminal Teknikal & Candlestick (`/technical`)

- **Header Terminal:** Ticker BBCA, Last Price: Rp 10.250, Open: 10.150, High: 10.300, Low: 10.125, Vol: 820.000 lot.
- **Main Chart Viewport:**
  - Candlestick interaktif (Warna hijau `#10b981` dan merah `#ef4444`).
  - Overlay Moving Average: SMA 20 (garis amber) dan SMA 50 (garis cyan).
  - Indikator Support (Rp 9.950) dan Resistance (Rp 10.450) dengan garis putus-putus (*dashed lines*).
- **Sub-chart 1: Histogram Volume:**
  - Bar volume harian dengan warna sesuai candle hari bersangkutan.
- **Sub-chart 2: RSI 14 Wilder:**
  - Nilai RSI saat ini: `62.4` (Zona Bullish Netral).
  - Garis batas Overbought (70) dan Oversold (30) berwarna ungu transparan.
- **Sub-chart 3: MACD (12, 26, 9):**
  - Garis MACD (Biru), Garis Signal (Oranye), dan Bar Histogram hijau/merah.
- **Technical Verdict Box:**
  - Sinyal: `BULLISH TREND CONTINUATION`.
  - Rekomendasi Ritel: *"Harga bergerak di atas SMA20 dengan momentum RSI positif. Waspadai area resistance di 10.450."*

---

### 3.4 Screen 3: Whale & Insider Radar (`/insider`)

- **Top Stat Banner:**
  - Total Transaksi Insider (90 Hari Terakhir): `14 Transaksi` (12 Pembelian, 2 Penjualan).
  - Net Value Insider: `+Rp 42.8 Miliar (Net Buy)`.
  - Alert: `[ CLUSTER BUY TERDETEKSI: 3 Direksi Membeli Saham di Bulan Ini ]` beranimasi pulsing indigo.
- **Tabel OJK Filings:**
  - Kolom: Tanggal Lapor, Nama Pejabat / Pemegang Saham, Jabatan, Aksi (Beli/Jual), Jumlah Lembar, Harga Rata-rata, Kepemilikan Setelah Transaksi (%).
  - Badge Status Kepemilikan: Pengendali `[PSP]`, Direksi `[DIR]`, Komisaris `[KOM]`.

---

### 3.5 Screen 4: Commodity & Mining Lens (`/commodity`)

- **Top Feature Bar:** Pemilih emiten tambang cepat (`ADRO`, `ANTM`, `AMMN`, `PTBA`, `DSSA`, `HRUM`).
- **Benchmark Price Grid:**
  - Card 1: Newcastle Coal: `$148.50/ton` (+1.65%)
  - Card 2: LME Nickel: `$17,670/ton` (+1.20%)
  - Card 3: COMEX Gold: `$2,742.50/oz` (+1.10%)
- **Mining Operational Profile:**
  - Cadangan Terbukti (Proved 1P): `480 Juta Ton`.
  - Cadangan Terkira (Probable 2P): `1.120 Juta Ton`.
  - Estimasi Usia Tambang: `22 Tahun`.
- **EBITDA Sensitivity Simulator:**
  - Slider interaktif: `Asumsi Perubahan Harga Komoditas Acuan (-30% s/d +30%)`.
  - Output Dinamis: Nilai estimasi dampak terhadap EBITDA tahunan emiten (misal: *"+10% harga batubara Newcastle berpotensi meningkatkan EBITDA ADRO sebesar ~Rp 3.4 Triliun"*).

---

### 3.6 Slide-out Drawer: Evidence & Audit Trail

- **Posisi:** Slide-in dari sisi kanan layar (lebar 480px) dengan efek backdrop blur gelap.
- **Komponen:**
  1. Header: *"Bukti Forensik & Rekaman Data"* dengan tombol close `X`.
  2. Snapshot Metadata: `Retrieved At: 2026-09-17 12:20 WIB`, `Mode: Full 360`, `Credits Consumed: 14`.
  3. Evidence Item Accordion:
     - Endpoint resmi: `GET /v2/company/report/BBCA/?sections=financials`
     - Status: `200 OK (Verified Source: IDX / Sectors API)`
     - JSON Inspector: Tampilan payload mentah dengan tombol *"Copy JSON"*.
     - Formula Audit: Penjelasan matematika (misal: `ROE = Net Income / Total Equity * 100%`).

---

### 3.7 Slide-out Drawer: Report Q&A Copilot

- **Posisi:** Slide-in dari sisi kanan layar (lebar 440px).
- **Komponen:**
  1. Header: *"Financial Copilot Chat (BBCA)"* + Status online icon hijau.
  2. Quick Prompt Suggestions (Pills):
     - *"Kenapa laba BBCA bisa naik di kuartal ini?"*
     - *"Siapa saja broker yang paling banyak borong?"*
     - *"Kapan dividen berikutnya cair?"*
  3. Message Bubbles:
     - User Message: Bubble abu-abu gelap rata kanan.
     - Copilot Message: Bubble transparan bergaris biru di sisi kiri, dilengkapi sitasi sumber data.
  4. Input Field: Textbox dengan tombol kirim bergradasi dan disclaimer di bawahnya (*"Hanya menjawab berdasarkan fakta laporan emiten saat ini"*).

---

## 4. Responsive Breakpoints & Adaptive Layouts

- **Desktop Ultrawide / Large (>= 1440px):**
  - Sidebar: Terbuka penuh (lebar 256px / `w-64`).
  - Main Container: Maksimal 1280px (`max-w-7xl`), grid 2 atau 3 kolom.
- **Laptop Standard (1024px - 1439px):**
  - Sidebar: Terbuka penuh atau collapsible (lebar 64px / `w-16`).
  - Modul tersusun dalam grid 2 kolom yang fleksibel.
- **Tablet (768px - 1023px):**
  - Sidebar: Mode ikon saja (64px).
  - Modul berubah menjadi stack vertikal 1 kolom.
- **Mobile Smartphone (< 768px):**
  - Sidebar berpindah menjadi off-canvas drawer (hamburger menu) atau bottom navigation bar.
  - Ticker horizontal dapat di-swipe secara horizontal (*scroll snap*).
  - Tabel teknikal dan peer memiliki horizontal scrollbar halus.

---

## 5. Micro-interactions & Visual Effects

1. **AI Synthesis Pulse:** Saat proses analisis berjalan, border kartu memancarkan animasi *glowing pulse* bergradasi biru-cyan dengan teks edukatif berganti-ganti (*"Mengekstrak klaim rumor..." -> "Menarik data neraca kuartalan..." -> "Mengaudit akumulasi broker..."*).
2. **Smooth Transitions:** Semua state hover kartu, expand drawer, dan pergantian tab menggunakan easing kurva `cubic-bezier(0.16, 1, 0.3, 1)` dengan durasi 250ms - 300ms.
3. **Copy to Clipboard Feedback:** Tombol copy pada drawer bukti menampilkan animasi ceklis hijau dengan tooltip *"Tersalin ke clipboard"* selama 2 detik.
