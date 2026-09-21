"use client";

import React, { useState } from "react";
import { BookOpen, Search, X, Sparkles, Lightbulb, Tag, ChevronRight } from "lucide-react";

interface JargonBusterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSearch?: string;
}

interface JargonItem {
  term: string;
  fullName: string;
  category: "Valuasi" | "Bandarmologi" | "Kinerja" | "Aksi Korporasi" | "Pasar";
  definition: string;
  analogy: string;
  example: string;
}

const JARGON_LIST: JargonItem[] = [
  {
    term: "PBV",
    fullName: "Price to Book Value",
    category: "Valuasi",
    definition: "Rasio perbandingan antara harga pasar saham dengan nilai buku (ekuitas bersih) per lembar saham.",
    analogy: "Ibarat membeli rumah seharga Rp 500 juta, padahal nilai fisik tanah dan material bangunannya bernilai Rp 250 juta (maka PBV = 2.0x). Kalau PBV di bawah 1x, berarti beli rumah diskon di bawah biaya materialnya.",
    example: "PBV BBCA ~4.5x (karena merek & profitabilitas tinggi), sedangkan bank daerah sering memiliki PBV ~0.8x.",
  },
  {
    term: "PER",
    fullName: "Price to Earnings Ratio",
    category: "Valuasi",
    definition: "Berapa kali lipat harga saham dibanding laba bersih tahunan per lembar saham.",
    analogy: "Ibarat membeli warung kopi seharga Rp 100 juta yang menghasilkan laba bersih Rp 10 juta per tahun. Butuh waktu 10 tahun agar uang modal Anda balik modal (PER = 10x).",
    example: "PER TLKM 14x berarti investor rela membayar 14 kali laba tahunan Telkom.",
  },
  {
    term: "Net Foreign Flow",
    fullName: "Arus Bersih Investor Asing",
    category: "Bandarmologi",
    definition: "Selisih total nilai beli dikurangi total nilai jual oleh investor berkode asing di bursa dalam periode tertentu.",
    analogy: "Ibarat rombongan turis kaya raya datang ke pasar tradisional dan memborong dagangan pedagang lokal dalam jumlah raksasa.",
    example: "Jika asing mencatat net buy Rp 200 Miliar di BBRI dalam 3 hari, biasanya menandakan minat institusi global sedang tinggi.",
  },
  {
    term: "Free Float",
    fullName: "Saham Beredar Publik",
    category: "Pasar",
    definition: "Porsi persentase saham yang dimiliki oleh masyarakat/publik di luar pengendali utama dan direksi.",
    analogy: "Ibarat tiket konser yang dijual bebas ke umum vs tiket yang dipegang erat oleh keluarga panitia penyelenggara.",
    example: "BBCA memiliki free float di atas 45%, sementara saham konglomerasi tertentu ada yang free float-nya hanya 10-15%.",
  },
  {
    term: "HAKA vs HAKI",
    fullName: "Hajar Kanan & Hajar Kiri",
    category: "Pasar",
    definition: "HAKA = langsung membeli di kolom tawaran (Offer/Ask). HAKI = langsung menjual di kolom antrean beli (Bid).",
    analogy: "HAKA ibarat pembeli lapar yang tidak mau menawar dan langsung bayar harga pas. HAKI ibarat pedagang yang butuh uang cepat dan langsung obral ke pembeli yang antre.",
    example: "Dominasi transaksi HAKA yang masif biasanya mendorong harga saham naik dengan cepat.",
  },
  {
    term: "Right Issue",
    fullName: "Hak Memesan Efek Terlebih Dahulu (HMETD)",
    category: "Aksi Korporasi",
    definition: "Emiten menerbitkan saham baru untuk mengumpulkan modal segar dengan memberi hak prioritas kepada pemegang saham lama.",
    analogy: "Ibarat kafe Anda butuh renovasi, sehingga Anda mengajak partner pemilik saham lama menyuntik modal tambahan agar porsi kepemilikan tidak menciut (terdilusi).",
    example: "BBRI pernah melakukan rights issue raksasa untuk pembentukan Holding Ultra Mikro.",
  },
  {
    term: "Dividend Yield",
    fullName: "Imbal Hasil Dividen",
    category: "Kinerja",
    definition: "Persentase dividen tunai tahunan per lembar dibanding harga beli saham saat ini.",
    analogy: "Ibarat uang sewa tahunan yang Anda terima dari rumah kontrakan dibanding harga beli rumah tersebut.",
    example: "Saham batubara seperti PTBA atau ADRO sering membagikan dividend yield 8% - 15%, jauh di atas bunga deposito bank.",
  },
  {
    term: "WAP",
    fullName: "Volume Weighted Average Price",
    category: "Bandarmologi",
    definition: "Rata-rata harga transaksi tertimbang volume pada suatu hari bursa.",
    analogy: "Ibarat menghitung rata-rata modal modal belanja pedagang grosir yang membeli barang di harga naik-turun sepanjang hari.",
    example: "Jika harga penutupan di atas WAP broker pembeli, berarti broker tersebut sedang dalam posisi untung (floating profit).",
  },
  {
    term: "Cluster Buy Direksi",
    fullName: "Insider Buying Borongan",
    category: "Bandarmologi",
    definition: "Ketika beberapa direktur dan komisaris secara kompak membeli saham perusahaan mereka sendiri dari pasar reguler.",
    analogy: "Ibarat juru masak restoran yang ikut menyantap masakan buatannya sendiri dengan lahap—menandakan bisnisnya sedang sehat dan aman.",
    example: "Direksi BBCA rutin melakukan cluster-buy saham di pasar reguler saat harga terkoreksi.",
  },
];

export const JargonBusterModal: React.FC<JargonBusterModalProps> = ({
  isOpen,
  onClose,
  initialSearch = "",
}) => {
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");

  if (!isOpen) return null;

  const categories = ["Semua", "Valuasi", "Bandarmologi", "Kinerja", "Aksi Korporasi", "Pasar"];

  const filtered = JARGON_LIST.filter((item) => {
    const matchCat = selectedCategory === "Semua" || item.category === selectedCategory;
    const matchSearch =
      item.term.toLowerCase().includes(search.toLowerCase()) ||
      item.fullName.toLowerCase().includes(search.toLowerCase()) ||
      item.definition.toLowerCase().includes(search.toLowerCase()) ||
      item.analogy.toLowerCase().includes(search.toLowerCase());
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
                <span>Kamus Pintar Saham Ritel</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                  Jargon Buster
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pahami istilah rumit pasar modal dengan analogi sehari-hari yang gampang dimengerti
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
              placeholder="Cari istilah saham (misal: PBV, Foreign Flow, HAKA, Dividen)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-zinc-700/20 focus:border-zinc-700 transition"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition shrink-0 ${
                  selectedCategory === cat
                    ? "bg-zinc-900 text-white font-semibold shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List of Jargon Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className="text-sm font-semibold text-slate-500">Istilah tidak ditemukan.</p>
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
                    <span>Analogi Sehari-hari:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-100/90">
                    {item.analogy}
                  </p>
                </div>

                {/* Example in IDX */}
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <strong className="text-slate-700 dark:text-slate-300">Contoh di IDX:</strong> {item.example}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
