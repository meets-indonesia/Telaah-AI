# Product Requirements Document (PRD) — Telaah 360
**Platform:** Google Stitch Design & UI Generation Specification  
**Version:** 3.0  
**Target Category:** Fintech, AI Copilot, Financial Research Terminal (IDX / Indonesia Stock Exchange)  
**Theme:** Ultra-Modern Dark Cyber-Fintech (Bloomberg Terminal meets Linear / Vercel design aesthetics)

---

## 1. Executive Summary & Vision

### 1.1 Problem Statement
Investor ritel di Bursa Efek Indonesia (IDX) sering dibanjiri rumor pasar di media sosial (Telegram, X, grup "pom-pom" saham), istilah teknikal yang membingungkan, dan laporan keuangan PDF ratusan halaman yang rumit. Tidak ada platform yang mampu secara instan memverifikasi rumor pasar, mengekstrak klaim angka, dan menyajikan audit intelijen emiten 360° yang objektif, bebas halusinasi, dan ramah pemula tanpa memberikan rekomendasi beli/jual ilegal (*anti-FOMO / non-financial advice*).

### 1.2 Product Vision
**Telaah 360** adalah *AI-powered Financial Research Copilot & Intelligence Terminal* untuk pasar modal Indonesia. Pengguna dapat memasukkan teks bebas, headline berita, rumor broker, atau sekadar kode saham (misal: "BBCA", "ADRO", "Apakah benar asing borong BREN?"). Sistem menguraikan kalimat menjadi klaim terisolasi, memverifikasinya ke sumber resmi **Sectors API v2** (data bursa real), dan menghasilkan laporan multi-dimensi interaktif lengkap dengan audit bukti data (*Evidence-backed*).

---

## 2. Target User Personas

| Persona | Profil | Kebutuhan Utama | Fitur Kunci yang Digunakan |
| :--- | :--- | :--- | :--- |
| **"Ritel Pemula" (Andi, 24)** | Baru belajar investasi saham, sering termakan info di medsos. | Penjelasan bahasa Indonesia santai, edukatif, analogi sederhana, peringatan risiko transparan. | *Direct Answer Summary, Claim Fact-Checker, Anti-FOMO Guard, Financial Health Bar.* |
| **"Swing / Value Investor" (Budi, 32)** | Fokus pada valuasi wajar, dividen, dan perbandingan kompetitor. | Komparasi peer sektor, historis dividen, rasio PER/PBV band, laporan laba rugi kuartalan. | *PeerLens, Valuation Matrix, Corporate Action Timeline, Dividend Yield Tracker.* |
| **"Momentum / Flow Trader" (Citra, 29)** | Mengandalkan bandarmologi, aksi insider direksi, dan teknikal. | Arus akumulasi/distribusi broker (FlowLens), foreign flow net, insider cluster buy, indikator RSI/MACD. | *Whale & Insider Radar, FlowLens Module, Technical Candlestick Terminal, Commodity Lens.* |

---

## 3. Core Information Architecture & Screen Sitemaps

Telaah 360 disusun dengan arsitektur navigasi responsif berbasis sidebar kiri dan main canvas:

```
Telaah 360 Terminal
├── 1. Global Header & Market Ticker Bar (IHSG, Kurs USD/IDR, Komoditas Global)
├── 2. Collapsible Left Navigation Sidebar
│   ├── Brand Identity & Quick Emiten Switcher
│   ├── Nav Item: Studio 360° (Overview Dashboard)
│   ├── Nav Item: Terminal Teknikal (Interactive Candlestick & Indicators)
│   ├── Nav Item: Whale & Insider Radar (OJK Filings & Director Buy)
│   ├── Nav Item: Commodity & Mining Lens (EBITDA Sensitivity Simulator)
│   ├── Watchlist & Recent History Tray
│   └── Trigger: Evidence Audit Drawer & System Status
├── 3. Screen Views (Main Content Canvas)
│   ├── Screen 1: Studio 360° (Ringkasan Komprehensif Emiten)
│   ├── Screen 2: Terminal Teknikal & Candlestick
│   ├── Screen 3: Whale & Insider Radar
│   ├── Screen 4: Commodity & Mining Lens
│   └── Screen 5: Head-to-Head Compare Modal (BBCA vs BBRI)
└── 4. Overlays & Slide-out Panels
    ├── Slide-out Drawer: Evidence & Audit Trail Drawer (Raw Data & Formulas)
    ├── Slide-out Drawer: Report Q&A Copilot Chat
    └── Modal: Share & Export Intelligence Report
```

---

## 4. Detailed Feature Specifications

### 4.1 Global Live Market Bar (Header Ticker)
- **Komponen:** Horizontal streaming ticker bar di bagian paling atas.
- **Elemen:**
  - IHSG (Composite Index) + persentase perubahan harian (hijau jika positif, merah jika negatif).
  - USD/IDR live exchange rate.
  - Acuan komoditas dunia: Newcastle Coal, LME Nickel, COMEX Gold, LME Copper, Brent Crude.
  - Indikator status pasar: `[MARKET OPEN / CLOSED]` dengan jam sesi bursa Jakarta (WIB).
  - Badge kuota kredit data: `API Credit Saver: ACTIVE (24h Cached)`.

### 4.2 Universal Input Station & Ticker Selector
- **Komponen:** Input card futuristik di puncak Studio 360°.
- **Fungsi:**
  - Textarea multibaris dengan placeholder kontekstual (misal: *"Tempel rumor Telegram, potongan berita, atau ketik kode emiten seperti BBCA..."*).
  - Mode Switcher: **Quick Check** (Cepat, 5-9 kredit) vs **Full Review 360°** (Audit mendalam, 14-22 kredit).
  - Quick Ticker Chips: Tombol instan emiten terpopuler (`BBCA`, `BBRI`, `ADRO`, `ANTM`, `TLKM`, `ASII`, `BREN`).
  - Action Button: Tombol *"Analisis dengan AI"* bergradasi ungu-biru dengan indikator loading animasi pulsing.

### 4.3 Direct Answer & Verdict Card
- **Komponen:** Kartu ringkasan eksekutif di bagian atas laporan hasil telaah.
- **Elemen:**
  - Sentimen Banner: Badge status (`SANGAT POSITIF`, `NETRAL`, `WASPADA RISIKO`).
  - Executive TL;DR: Penjelasan 2-3 paragraf ramah ritel dengan highlight istilah penting (CASA, PBV, Net Inflow).
  - Key Highlights vs Risk Factors: Grid 2 kolom perbandingan keunggulan fundamental vs risiko pasar.
  - Disclaimer Banner: *"Telaah 360 bukan ajakan membeli/menjual efek. Analisis disajikan secara independen berdasarkan data resmi bursa."*

### 4.4 Fact-Checker Claim Cards
- **Komponen:** Daftar kartu atomik hasil ekstraksi klaim rumor pasar.
- **Status Verdict:**
  1. `TERBUKTI / VALID` (Hijau neon) — Didukung bukti data laporan keuangan atau transaksi resmi.
  2. `BERTENTANGAN` (Merah cerah) — Bukti data menunjukkan fakta sebaliknya.
  3. `PERLU KONTEKS` (Kuning amber) — Angka benar namun kesimpulannya menyesatkan / tidak lengkap.
  4. `TIDAK DAPAT DIVERIFIKASI` (Abu-abu slate) — Data tidak tersedia di laporan publik.
- **Interaksi:** Setiap kartu memiliki tombol *"Lihat Bukti Data"* yang otomatis membuka *Evidence Drawer* ke baris data terkait.

### 4.5 Modul Finansial & Kesehatan Bisnis (FinancialModule)
- **Metrik Utama:** Revenue, Gross Profit, Operating Profit, Net Income, Operating Margin, ROE, DER (Debt-to-Equity), dan Current Ratio.
- **Visualisasi:**
  - Grafik batang perbandingan pertumbuhan kuartalan (YoY Growth).
  - Health Meter Solvabilitas (Aman / Waspada / Bahaya).

### 4.6 Modul Valuasi & Kompetitor (PeerLensModule)
- **Komparasi Peer:** Tabel interaktif membandingkan emiten terpilih dengan 4 kompetitor terdekat di subsektor yang sama.
- **Kolom Tabel:** Ticker, Nama Emiten, Market Cap, P/E Ratio, P/B Ratio, ROE (%), Dividend Yield (%).
- **Visual:** Highlight baris emiten aktif dengan background aksen biru neon.

### 4.7 Modul Arus Dana & Bandarmologi (FlowLensModule)
- **Indikator Akumulasi/Distribusi:** Status deteksi (`AKUMULASI MASIF`, `NETRAL`, `DISTRIBUSI HALUS`).
- **Foreign Flow Tracker:** Akumulasi modal asing 5 hari bursa terakhir (Rp Miliar).
- **Top Broker Split:** Tabel 2 kolom (Top 5 Buyer vs Top 5 Seller) dengan kode broker (YP, CC, PD, dsb.), tipe entitas (Asing `[F]`, Domestik `[D]`, BUMN), volume lot, dan rata-rata harga beli/jual (*Average Price*).

### 4.8 Terminal Teknikal & Candlestick (TechnicalModule)
- **Grafik Interaktif:** Candlestick interaktif harian (Green/Red candles) dengan volume bar di bawahnya.
- **Indikator:** Overlay SMA 20 (garis oranye) dan SMA 50 (garis biru).
- **Sub-chart:**
  - Relative Strength Index (RSI 14 Wilder) dengan batas Overbought (70) dan Oversold (30).
  - MACD Histogram (12, 26, 9) dengan sinyal crossover bullish/bearish.
- **Support & Resistance:** Garis horizontal dinamis penanda level pantulan harga.

### 4.9 Whale & Insider Radar (InsiderWhaleRadar)
- **Deteksi Transaksi Direksi:** Tabel kronologis transaksi pembelian/penjualan saham oleh komisaris dan direktur (*OJK Filings*).
- **Cluster Buy Alert:** Badge khusus jika terdeteksi $\ge 2$ direksi membeli saham dalam rentang 14 hari.
- **Kepemilikan $\ge 5\%$:** Ringkasan perubahan porsi kepemilikan pemegang saham utama.

### 4.10 Modul Komoditas & Tambang (CommodityLensModule)
- **Harga Acuan Terkini:** Kartu harga komoditas terkait (misal: Batubara Newcastle jika ADRO/PTBA, Nikel jika ANTM/INCO).
- **Cadangan Tambang:** Tampilan estimasi cadangan terbukti & terkira (*2P Reserves*) dan umur tambang (*Mine Life*).
- **EBITDA Simulator:** Slider interaktif untuk mensimulasikan dampak naik-turun harga komoditas $\pm 10\%$ terhadap EBITDA emiten.

### 4.11 Evidence & Audit Trail Drawer
- **Drawer Slide-out Kanan:** Panel transparan (*glassmorphic*) yang menampilkan rekaman audit forensik:
  - Timestamp penarikan data & URL Endpoint resmi Sectors API v2.
  - Raw JSON payload viewer dengan syntax highlighting dan tombol *Copy*.
  - Formula perhitungan kuantitatif lokal yang digunakan.

### 4.12 Report Q&A Copilot Drawer
- **Drawer Slide-out Kanan:** Chatbot interaktif ramah ritel.
- **Aturan Sistem:** Hanya menjawab pertanyaan berdasarkan laporan emiten yang sedang aktif (*grounded strictly on report evidence*), menolak memberi ajakan spekulasi harga atau target investasi ilegal.

---

## 5. Non-Functional Requirements (NFR)

1. **Kecepatan & Responsivitas:** Quick Check selesai dalam $<15$ detik; Full 360 Review selesai dalam $<40$ detik dengan *progressive rendering*.
2. **Keamanan Kunci API:** Seluruh API Key (`SECTORS_API_KEY`, `OPENROUTER_API_KEY`) berada 100% di sisi server (`Next.js Server Actions / API Routes`) dan tidak boleh bocor ke client-side JavaScript.
3. **Optimasi Kuota Kredit:** Penggunaan sistem in-memory & disk caching 24 jam untuk data statis/harian demi mencegah pemborosan kredit API.
4. **Desain Aksesibilitas:** Kontras warna teks terhadap background gelap memenuhi standar WCAG AA (rasio $\ge 4.5:1$).
5. **Responsif Multi-Device:** Optimal pada resolusi Desktop Terminal (1920x1080), Laptop (1366x768), Tablet iPad (768x1024), dan Smartphone (375x812).

---

## 6. Success Metrics & KPIs

- **Verifiability Rate:** 100% angka finansial pada laporan memiliki referensi `evidence_id` yang dapat diaudit di drawer bukti.
- **Zero-Hallucination Guard:** 0% klaim fiktif yang tidak bersumber dari data bursa.
- **User Engagement:** Rata-rata waktu telaah per emiten $\ge 3$ menit dengan eksplorasi tab teknikal dan broker flow.
- **Credit Efficiency:** Konsumsi rata-rata per telaah tidak melebihi 18 kredit Sectors.
