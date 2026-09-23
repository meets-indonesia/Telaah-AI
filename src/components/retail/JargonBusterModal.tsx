"use client";

import React, { useState } from "react";
import { BookOpen, Search, X, Lightbulb } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { MULTILINGUAL_JARGON } from "@/lib/i18n/jargon-dict";

interface JargonBusterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSearch?: string;
}

export type JargonCategory =
  | "Valuasi"
  | "Bandarmologi"
  | "Kinerja & Neraca"
  | "Teknikal"
  | "Aksi Korporasi"
  | "Sistem & Audit"
  | "Pasar";

export interface JargonItem {
  term: string;
  fullName: string;
  category: JargonCategory;
  definition: string;
  analogy: string;
  example: string;
}

export const COMPLETE_JARGON_LIST: JargonItem[] = [
  // 1. VALUASI
  {
    term: "PER",
    fullName: "Price to Earnings Ratio",
    category: "Valuasi",
    definition: "Berapa kali lipat harga saham dibanding laba bersih tahunan per lembar saham.",
    analogy: "Ibarat membeli warung kopi seharga Rp 100 juta yang menghasilkan laba bersih Rp 10 juta per tahun. Butuh waktu 10 tahun agar uang modal Anda balik modal (PER = 10x).",
    example: "PER TLKM 14x berarti investor rela membayar 14 kali laba tahunan Telkom.",
  },
  {
    term: "PBV",
    fullName: "Price to Book Value",
    category: "Valuasi",
    definition: "Rasio perbandingan antara harga pasar saham dengan nilai buku (ekuitas bersih) per lembar saham.",
    analogy: "Ibarat membeli rumah seharga Rp 500 juta, padahal nilai fisik tanah dan material bangunannya bernilai Rp 250 juta (maka PBV = 2.0x). Kalau PBV di bawah 1x, berarti beli rumah diskon di bawah biaya materialnya.",
    example: "PBV BBCA ~4.5x (karena merek & profitabilitas tinggi), sedangkan bank daerah sering memiliki PBV ~0.8x.",
  },
  {
    term: "Market Cap",
    fullName: "Kapitalisasi Pasar",
    category: "Valuasi",
    definition: "Total nilai pasar seluruh saham beredar emiten (Harga Saham dikali Jumlah Lembar Saham).",
    analogy: "Berapa total uang tunai yang harus Anda siapkan jika ingin memborong seluruh mal beserta isinya hari ini juga.",
    example: "BBCA memiliki Market Cap di atas Rp 1.200 Triliun, menjadikannya emiten paling bernilai di IDX.",
  },
  {
    term: "Dividend Yield",
    fullName: "Imbal Hasil Dividen Tunai",
    category: "Valuasi",
    definition: "Persentase dividen tunai tahunan per lembar dibanding harga beli saham saat ini.",
    analogy: "Ibarat uang sewa tahunan yang Anda terima dari rumah kontrakan dibanding harga beli rumah tersebut.",
    example: "Saham batubara seperti PTBA atau ADRO sering membagikan dividend yield 8% - 15%, jauh di atas bunga deposito bank.",
  },

  // 2. KINERJA & NERACA
  {
    term: "DER",
    fullName: "Debt to Equity Ratio (Solvabilitas)",
    category: "Kinerja & Neraca",
    definition: "Rasio perbandingan total utang berbunga terhadap modal bersih (ekuitas).",
    analogy: "Ibarat pedagang yang punya modal sendiri Rp 100 juta tapi berutang ke rentenir Rp 300 juta (DER 3x). Jika dagangan sepi, risiko bangkrut sangat tinggi.",
    example: "Emiten dengan DER < 1.0x dinilai sehat karena modalnya lebih besar daripada beban kewajibannya.",
  },
  {
    term: "NPM",
    fullName: "Net Profit Margin (Margin Laba Bersih)",
    category: "Kinerja & Neraca",
    definition: "Persentase sisa uang laba bersih yang benar-benar masuk kantong setelah seluruh beban, bunga, dan pajak dibayar dari omzet.",
    analogy: "Warung menjual nasi goreng senilai Rp 100 juta sebulan, setelah bayar beras, sewa tempat, dan gaji karyawan sisa bersih Rp 15 juta. Maka NPM = 15%.",
    example: "Emiten tambang saat boom komoditas bisa mencatat NPM > 25%, sementara retail minimarket biasanya di kisaran 3%-5%.",
  },
  {
    term: "OPM",
    fullName: "Operating Profit Margin (Margin Operasional)",
    category: "Kinerja & Neraca",
    definition: "Tingkat efisiensi bisnis inti perusahaan menghasilkan laba sebelum potongan bunga utang dan pajak negara.",
    analogy: "Kemampuan toko menghasilkan untung murni dari jualan barang sehari-hari sebelum memikirkan cicilan pinjaman bank.",
    example: "OPM yang stabil naik menandakan perusahaan mampu menekan beban operasional meski bahan baku naik.",
  },
  {
    term: "ROE",
    fullName: "Return on Equity",
    category: "Kinerja & Neraca",
    definition: "Tingkat pengembalian laba bersih atas setiap rupiah modal bersih yang ditanamkan pemegang saham.",
    analogy: "Anda taruh modal Rp 100 juta, akhir tahun menghasilkan laba Rp 20 juta (ROE = 20%). Jauh lebih gurih dari reksadana pendapatan tetap.",
    example: "BBCA dan BBRI konsisten mencatatkan ROE di atas 18%-20% per tahun.",
  },
  {
    term: "YoY & QoQ",
    fullName: "Year-on-Year & Quarter-on-Quarter",
    category: "Kinerja & Neraca",
    definition: "YoY = pertumbuhan dibandingkan kuartal yang sama tahun lalu. QoQ = pertumbuhan dibanding kuartal sebelumnya pada tahun berjalan.",
    analogy: "YoY ibarat membandingkan omzet baju lebaran tahun ini vs lebaran tahun lalu. QoQ ibarat membandingkan bulan ini vs bulan kemarin.",
    example: "Laba DEWA naik YoY 163.9%, menandakan perputaran bisnis jauh lebih kencang dibanding tahun sebelumnya.",
  },
  {
    term: "Operating Cash Flow",
    fullName: "Arus Kas Operasi (CFO)",
    category: "Kinerja & Neraca",
    definition: "Arus kas riil yang benar-benar diterima tunai dari transaksi operasional, bukan sekadar angka akuntansi di atas kertas.",
    analogy: "Buku kas mencatat warung untung Rp 10 juta, tapi semua pembeli bayar pakai bon ngutang (kas riil kosong). CFO positif memastikan ada uang fisik di laci kasir.",
    example: "Laba tinggi tapi arus kas operasi minus berturut-turut adalah red flag kualitas laba semu.",
  },

  // 3. BANDARMOLOGI & ALIRAN DANA
  {
    term: "Net Foreign Flow",
    fullName: "Arus Bersih Asing (Inflow / Outflow)",
    category: "Bandarmologi",
    definition: "Selisih total akumulasi beli dikurangi jual oleh broker/investor asing di bursa selama rentang waktu tertentu.",
    analogy: "Ibarat rombongan investor kakap dari luar negeri datang membawa koper uang memborong saham lokal di pasar reguler.",
    example: "Net Foreign Inflow 5 hari berturut-turut di saham perbankan seringkali menjadi bahan bakar penguatan IHSG.",
  },
  {
    term: "WAP Top Buyer",
    fullName: "Weighted Average Price (Modal Borongan Broker)",
    category: "Bandarmologi",
    definition: "Estimasi rata-rata harga modal broker pembeli terbesar saat melakukan akumulasi saham.",
    analogy: "Rata-rata modal kulakan pedagang grosir besar sebelum mereka memajang dan menjual barang ke pembeli eceran di harga lebih tinggi.",
    example: "Jika harga DEWA saat ini Rp 348 dan WAP top buyer di Rp 391, bandar/whale sementara sedang floating loss di atas harga saat ini.",
  },
  {
    term: "Akumulasi vs Distribusi",
    fullName: "Fase Pengumpulan vs Pembongkaran Barang",
    category: "Bandarmologi",
    definition: "Akumulasi = pemain besar diam-diam menampung barang tanpa menaikkan harga terlalu dini. Distribusi = pemain besar perlahan menjual jatah barang ke investor ritel.",
    analogy: "Akumulasi seperti tengkulak yang memborong panen gabah petani saat harga murah. Distribusi seperti tengkulak menjual gabah mahal-mahal ke konsumen saat rumor kelangkaan menyebar.",
    example: "Divergensi harga turun tapi volume akumulasi asing membesar sering menandakan akumulasi senyap.",
  },
  {
    term: "Cluster Buy / Sell Direksi",
    fullName: "Aktivitas Insider Trading Bersama",
    category: "Bandarmologi",
    definition: "Ketika beberapa direktur dan komisaris secara kompak membeli atau menjual saham perusahaan mereka sendiri.",
    analogy: "Ibarat kapten kapal dan teknisi mesin yang tiba-tiba kompak memborong saham tiket kapalnya sendiri (percaya diri) atau malah kompak melompat keluar (sinyal bahaya).",
    example: "Cluster sell direksi hingga miliaran lembar saham adalah peringatan distribusi internal yang perlu diwaspadai.",
  },

  // 4. TEKNIKAL & EKSEKUSI
  {
    term: "RSI 14",
    fullName: "Relative Strength Index (Periode 14 Hari)",
    category: "Teknikal",
    definition: "Indikator momentum untuk mengukur kecepatan dan perubahan pergerakan harga saham dalam skala 0 sampai 100.",
    analogy: "Speedometer mobil: di atas 70 (Overbought/Jenuh Beli) mesin sudah kepanasan rawan rem mendadak. Di bawah 30 (Oversold/Jenuh Jual) mobil sudah kehabisan bensin rawan mantul balik naik.",
    example: "RSI DEWA di level 28.3 menandakan tekanan jual sudah sangat jenuh dan mendekati area pantulan teknikal.",
  },
  {
    term: "SMA 20 & SMA 50",
    fullName: "Simple Moving Average (Rata-rata 20 & 50 Hari)",
    category: "Teknikal",
    definition: "Garis tren harga rata-rata penutupan selama 20 hari (jangka pendek) dan 50 hari (jangka menengah).",
    analogy: "Jalan tol rata-rata harga: jika mobil berada di atas garis SMA, tren sedang menanjak (Bullish). Jika jebol ke bawah garis, tren sedang tergelincir (Bearish).",
    example: "Golden Cross terjadi ketika garis SMA 20 menembus ke atas garis SMA 50 dari bawah.",
  },
  {
    term: "RRR",
    fullName: "Risk to Reward Ratio",
    category: "Teknikal",
    definition: "Perbandingan antara potensi kerugian (jarak ke Cut Loss) dengan potensi keuntungan (jarak ke Target Profit).",
    analogy: "Mempertaruhkan uang taruhan Rp 1.000 untuk peluang memenangkan hadiah Rp 3.000 (RRR 1:3). Jika di bawah 1:1, transaksi tidak layak secara hitungan probabilitas.",
    example: "Trading Plan yang baik umumnya mensyaratkan RRR minimal 1:1.5 atau 1:2.",
  },
  {
    term: "Stop Loss & Target Profit (SL & TP)",
    fullName: "Batas Pengaman Potong Rugi & Titik Ambil Untung",
    category: "Teknikal",
    definition: "Batas disiplin di mana posisi harus ditutup jika analisis salah (SL) atau target apresiasi telah tercapai (TP1/TP2).",
    analogy: "SL adalah sabuk pengaman dan rem darurat agar mobil tidak jatuh ke jurang saat hilang kendali. TP adalah pintu keluar terminal di mana Anda turun menikmati laba.",
    example: "Disiplin eksekusi Cut Loss saat harga menembus level support teknikal mencegah modal terkunci bertahun-tahun.",
  },

  // 5. AKSI KORPORASI & PASAR
  {
    term: "Right Issue (HMETD)",
    fullName: "Hak Memesan Efek Terlebih Dahulu",
    category: "Aksi Korporasi",
    definition: "Emiten menerbitkan saham baru untuk menambah modal dengan memberi hak prioritas beli kepada investor lama.",
    analogy: "Kafe Anda butuh cabang baru, jadi Anda mengajak teman pemilik saham lama setor modal tambahan. Kalau teman tidak mau setor, porsi kepemilikannya akan terdilusi (mengecil).",
    example: "BBRI pernah rights issue besar-besaran untuk menyerap Pegadaian dan PNM ke dalam Holding Ultra Mikro.",
  },
  {
    term: "Free Float",
    fullName: "Porsi Saham Publik Beredar",
    category: "Pasar",
    definition: "Persentase saham yang dimiliki oleh masyarakat umum di luar pemegang saham pengendali, direksi, dan afiliasi internal.",
    analogy: "Jumlah tiket konser yang dilepas bebas di loket publik vs tiket VIP yang disimpan untuk keluarga promotor.",
    example: "IDX mensyaratkan batas minimal free float 7.5% agar saham tetap likuid diperdagangkan.",
  },
  {
    term: "HAKA vs HAKI",
    fullName: "Hajar Kanan (Offer) vs Hajar Kiri (Bid)",
    category: "Pasar",
    definition: "HAKA = langsung membeli di harga antrean offer tanpa menawar. HAKI = langsung melepas saham di harga antrean bid yang ada.",
    analogy: "HAKA ibarat pembeli lapar yang langsung bayar harga pas menu restoran. HAKI ibarat orang yang buru-buru jual barang bekas ke tukang loak yang sudah antre di depan pintu.",
    example: "Dominasi transaksi HAKA bervolume jumbo sering memicu lonjakan harga instan.",
  },

  // 6. SISTEM & AUDIT TELAAH
  {
    term: "Skor Kejujuran Fundamental",
    fullName: "Fundamental Integrity & Forensic Score",
    category: "Sistem & Audit",
    definition: "Pemeriksaan forensik algoritma Telaah 360 atas 6 pos risiko (kualitas arus kas, lonjakan piutang, solvabilitas, transaksi afiliasi, dan cluster insider).",
    analogy: "Medical check-up menyeluruh tubuh pasien: memastikan organ dalam memang sehat, bukan sekadar kelihatan segar karena polesan kosmetik.",
    example: "Skor 85/100 (Fakta Solid) memberi keyakinan bahwa pertumbuhan laba didukung uang kas riil dan bukan manipulasi akuntansi.",
  },
  {
    term: "Stop Condition Kuota Kredit",
    fullName: "Pencegahan Over-call API Bursa",
    category: "Sistem & Audit",
    definition: "Protokol keamanan sistem yang membatasi pemanggilan API resmi Sectors maksimal 25-30 kali per emiten agar biaya kredit efisien.",
    analogy: "Membawa uang saku dengan anggaran pasti saat belanja di pasar grosir, sehingga tidak kalap dan pulang tepat waktu.",
    example: "Telaah 360 memanfaatkan cache vektor dan ringkasan audit untuk menyajikan data akurat dengan konsumsi kredit minimal.",
  },
  {
    term: "ELIR (Bahasa Ritel Unyu)",
    fullName: "Explain Like I'm Retail",
    category: "Sistem & Audit",
    definition: "Mode terjemahan pintar yang merangkum hasil riset institusi yang kaku menjadi bahasa obrolan warung kopi yang jenaka dan mudah dipahami.",
    analogy: "Dokter spesialis yang menerangkan penyakit rumit dengan perumpamaan sederhana tanpa jargon medis membingungkan.",
    example: "Mengubah penjelasan 'kontraksi likuiditas neto antar-kuartal' menjadi 'lagi sepi pembeli dan uang kas lagi seret'.",
  },
];

export const JargonBusterModal: React.FC<JargonBusterModalProps> = ({
  isOpen,
  onClose,
  initialSearch = "",
}) => {
  const { t, locale } = useI18n();
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");

  if (!isOpen) return null;

  // Resolusi data jargon multibahasa instan (ID, EN, ZH)
  const localizedJargonList: JargonItem[] = COMPLETE_JARGON_LIST.map((item) => {
    const override = MULTILINGUAL_JARGON[locale]?.[item.term];
    if (!override) return item;
    return {
      ...item,
      fullName: override.fullName || item.fullName,
      definition: override.definition || item.definition,
      analogy: override.analogy || item.analogy,
      example: override.example || item.example,
    };
  });

  const categories: Array<{ id: string; label: string }> = [
    { id: "Semua", label: t("category.all", "Semua") },
    { id: "Valuasi", label: t("category.valuation", "Valuasi") },
    { id: "Bandarmologi", label: t("category.bandar", "Bandarmologi") },
    { id: "Kinerja & Neraca", label: t("category.financial", "Kinerja & Neraca") },
    { id: "Teknikal", label: t("category.technical", "Teknikal") },
    { id: "Aksi Korporasi", label: t("category.corporate", "Aksi Korporasi") },
    { id: "Sistem & Audit", label: t("category.system", "Sistem & Audit") },
  ];

  const filtered = localizedJargonList.filter((item) => {
    const matchCat = selectedCategory === "Semua" || item.category === selectedCategory;
    const matchSearch =
      item.term.toLowerCase().includes(search.toLowerCase()) ||
      item.fullName.toLowerCase().includes(search.toLowerCase()) ||
      item.definition.toLowerCase().includes(search.toLowerCase()) ||
      item.analogy.toLowerCase().includes(search.toLowerCase()) ||
      item.example.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t("jargon.title", "Kamus Pintar Saham Ritel")}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                  {COMPLETE_JARGON_LIST.length} Istilah
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("jargon.subtitle", "Pahami istilah rumit pasar modal dengan analogi sehari-hari yang gampang dimengerti")}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-3 bg-white dark:bg-[#0c1424]">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("jargon.search", "Cari istilah saham (misal: PBV, PER, DER, Foreign Flow, HAKA, Dividen)...")}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-700/20 focus:border-zinc-700 transition"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition shrink-0 ${
                  selectedCategory === cat.id
                    ? "bg-zinc-900 text-white font-semibold shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* List of Jargon Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm font-semibold text-slate-500">{t("jargon.notFound", "Istilah tidak ditemukan.")}</p>
              <p className="text-xs text-slate-400">Coba kata kunci lain atau pilih kategori &quot;Semua&quot;.</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.term}
                className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#0f172a] shadow-xs space-y-2.5 hover:border-zinc-300 dark:hover:border-zinc-800 transition"
              >
                {/* Title and Category */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {item.term}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      ({item.fullName})
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {item.category}
                  </span>
                </div>

                {/* Definition */}
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.definition}
                </p>

                {/* Everyday Analogy */}
                <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-zinc-950/30 border border-amber-200/80 dark:border-amber-800/50 text-xs text-zinc-950 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-zinc-300 text-[11px]">
                    <Lightbulb className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{t("jargon.analogy", "Analogi Sehari-hari:")}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-100/90">
                    {item.analogy}
                  </p>
                </div>

                {/* Example in IDX */}
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <strong className="text-slate-700 dark:text-slate-300">{t("jargon.example", "Contoh di IDX:")} </strong>
                  <span>{item.example}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
