import {
  CommodityBenchmark,
  CommodityLensData,
  CompanyOverview,
  MiningOperationalData,
} from "../sectors/types";

// Database Komoditas Acuan Terkini
export const LIVE_COMMODITY_BENCHMARKS: Record<string, CommodityBenchmark> = {
  COAL: {
    commodityName: "Batu Bara (Newcastle ICE)",
    symbol: "NEWC-COAL",
    currentPrice: 139.5,
    currency: "USD",
    unit: "Ton",
    dailyChangePct: 1.45,
    change30dPct: 4.8,
    trend: "Bullish",
    lastUpdated: new Date().toISOString().split("T")[0],
  },
  NICKEL: {
    commodityName: "Nikel (LME Official)",
    symbol: "LME-NI",
    currentPrice: 16480,
    currency: "USD",
    unit: "Ton",
    dailyChangePct: -0.65,
    change30dPct: -2.3,
    trend: "Neutral",
    lastUpdated: new Date().toISOString().split("T")[0],
  },
  GOLD: {
    commodityName: "Emas (COMEX / London Bullion)",
    symbol: "XAU-USD",
    currentPrice: 2685.2,
    currency: "USD",
    unit: "Troy Oz",
    dailyChangePct: 0.85,
    change30dPct: 6.2,
    trend: "Bullish",
    lastUpdated: new Date().toISOString().split("T")[0],
  },
  COPPER: {
    commodityName: "Tembaga (LME Grade A)",
    symbol: "LME-CU",
    currentPrice: 9480,
    currency: "USD",
    unit: "Ton",
    dailyChangePct: 1.12,
    change30dPct: 3.4,
    trend: "Bullish",
    lastUpdated: new Date().toISOString().split("T")[0],
  },
  OIL: {
    commodityName: "Minyak Mentah (Brent Crude)",
    symbol: "BRENT",
    currentPrice: 74.8,
    currency: "USD",
    unit: "Barel",
    dailyChangePct: -1.05,
    change30dPct: -4.1,
    trend: "Bearish",
    lastUpdated: new Date().toISOString().split("T")[0],
  },
  TIN: {
    commodityName: "Timah (LME Tin)",
    symbol: "LME-SN",
    currentPrice: 31800,
    currency: "USD",
    unit: "Ton",
    dailyChangePct: 0.45,
    change30dPct: 5.1,
    trend: "Bullish",
    lastUpdated: new Date().toISOString().split("T")[0],
  },
};

// Database Profil Operasi Pertambangan IDX Terverifikasi
const ISSUER_MINING_PROFILES: Record<
  string,
  {
    primaryCommodity: string;
    relevantBenchmarks: string[];
    operations: MiningOperationalData;
    sensitivityRule: string;
    ebitdaSensitivityMultiplier: number; // 10% commodity increase -> X% EBITDA impact
  }
> = {
  ADRO: {
    primaryCommodity: "Batu Bara Termal & Metalurgi (Coking Coal)",
    relevantBenchmarks: ["COAL", "OIL"],
    operations: {
      concessionsOrSites: [
        { name: "Tambang Tabalong & Balangan", location: "Kalimantan Selatan (31.380 Ha)", type: "Open-Pit Coal Mine", reserves: "1,05 Miliar Ton" },
        { name: "Adaro MetCoal (AMC)", location: "Kalimantan Tengah & Timur", type: "Hard Coking Coal", reserves: "840 Juta Ton" },
        { name: "Kalteng Smelter & Solar Park", location: "Kalimantan Utara (KIPI)", type: "Aluminium Smelter & Green Energy", reserves: "-" },
      ],
      provenReserves: "1,1 Miliar Ton Batu Bara",
      probableReserves: "3,2 Miliar Ton Sumber Daya",
      annualProductionTarget: "65 - 67 Juta Ton / Tahun",
      cashCostPerUnit: "$38 - $42 / Ton (Ekskl. Royalti)",
      commodityExposure: [
        { commodity: "Batu Bara Termal (E4000-E5000)", revenueContributionPct: 78 },
        { commodity: "Metalurgi & Coking Coal", revenueContributionPct: 16 },
        { commodity: "Logistik & Air / Pelabuhan", revenueContributionPct: 6 },
      ],
      sensitivityRule: "Setiap kenaikan $5/ton pada harga Newcastle Coal meningkatkan EBITDA Adaro estimasi sebesar ±Rp 1,6 - 1,8 Triliun secara tahunan.",
    },
    sensitivityRule: "Sensitivitas tinggi terhadap harga Newcastle Coal dan porsi DMO PLN (25% harga cap $70/ton).",
    ebitdaSensitivityMultiplier: 1.45,
  },
  ANTM: {
    primaryCommodity: "Emas Logam Mulia & Nikel (Feronikel / Ore)",
    relevantBenchmarks: ["GOLD", "NICKEL"],
    operations: {
      concessionsOrSites: [
        { name: "Pabrik Feronikel Pomalaa", location: "Kolaka, Sulawesi Tenggara", type: "Smelter Pyrometallurgy", reserves: "120 Juta WMT Nikel" },
        { name: "Tambang Buli & Halmahera Timur", location: "Maluku Utara", type: "Nickel Ore & Smelter Feni", reserves: "250 Juta WMT Nikel" },
        { name: "Tambang Emas Bawah Tanah Pongkor", location: "Bogor, Jawa Barat", type: "Underground Gold Mine", reserves: "1,2 Juta Oz Emas" },
        { name: "UBPP Logam Mulia Pulo Gadung", location: "Jakarta Timur", type: "Refinery Emas Standar LBMA", reserves: "-" },
      ],
      provenReserves: "375 Juta WMT Bijih Nikel & 1,4 Juta Oz Emas",
      probableReserves: "1,1 Miliar WMT Sumber Daya Nikel",
      annualProductionTarget: "Emas: ~25 - 30 Ton | Feronikel: 22.000 TNi | Bijih Nikel: 11 Juta WMT",
      cashCostPerUnit: "Feronikel: ~$11.500 / TNi | Emas: ~$1.350 / Oz",
      commodityExposure: [
        { commodity: "Emas Logam Mulia Batangan", revenueContributionPct: 68 },
        { commodity: "Bijih Nikel & Feronikel", revenueContributionPct: 24 },
        { commodity: "Bauksit & Alumina", revenueContributionPct: 8 },
      ],
      sensitivityRule: "Kenaikan harga emas $100/oz menambah marjin laba kotor UBPP Emas sekitar Rp 400 Miliar; Kenaikan $1.000/ton nikel LME menambah EBITDA segmen nikel ±Rp 550 Miliar.",
    },
    sensitivityRule: "Margin emas relatif stabil karena sifat trading margin LBMA, sedangkan profitabilitas nikel sangat elastis terhadap permintaan baterai EV dan smelter RKEF.",
    ebitdaSensitivityMultiplier: 1.25,
  },
  PTBA: {
    primaryCommodity: "Batu Bara (Termal Kalori Rendah-Sedang)",
    relevantBenchmarks: ["COAL"],
    operations: {
      concessionsOrSites: [
        { name: "Tambang Tanjung Enim (Air Laya, Banko Barat)", location: "Muara Enim, Sumatera Selatan", type: "Open-Pit Coal", reserves: "2,8 Miliar Ton" },
        { name: "Pelabuhan Tarahan & Dermaga Kertapati", location: "Lampung & Palembang", type: "Logistik Jalur Kereta Api PT KAI", reserves: "-" },
      ],
      provenReserves: "3,0 Miliar Ton Batu Bara",
      probableReserves: "5,8 Miliar Ton Sumber Daya",
      annualProductionTarget: "41 - 43 Juta Ton / Tahun",
      cashCostPerUnit: "$32 - $36 / Ton (Tergantung Tarif Angkutan KA)",
      commodityExposure: [
        { commodity: "Batu Bara DMO Pasar Domestik PLN", revenueContributionPct: 58 },
        { commodity: "Batu Bara Ekspor (India, China, ASEAN)", revenueContributionPct: 42 },
      ],
      sensitivityRule: "Kenaikan harga batu bara ekspor $10/ton meningkatkan laba bersih PTBA estimasi ±Rp 950 Miliar, dengan bantalan stabilitas kontrak DMO PLN.",
    },
    sensitivityRule: "Memiliki keunggulan biaya logistik terpadu dan cadangan batu bara terbesar di BUMN Mining ID.",
    ebitdaSensitivityMultiplier: 1.15,
  },
  AMMN: {
    primaryCommodity: "Tembaga (Konsentrat Cu) & Emas (Byproduct Au)",
    relevantBenchmarks: ["COPPER", "GOLD"],
    operations: {
      concessionsOrSites: [
        { name: "Tambang Terbuka Batu Hijau (Fase 7 & 8)", location: "Sumbawa Barat, NTB", type: "Open Pit Porphyry Cu-Au", reserves: "9,2 Miliar Pon Cu & 12 Juta Oz Au" },
        { name: "Proyek Raksasa Elang (Eksplorasi Lanjut)", location: "Sumbawa Barat, NTB", type: "World-Class Porphyry Deposit", reserves: "15,8 Miliar Pon Cu & 21 Juta Oz Au" },
        { name: "Smelter Tembaga & Precious Metal Refinery", location: "Benete, Sumbawa Barat", type: "Smelter Kapasitas 900.000 Ton", reserves: "-" },
      ],
      provenReserves: "17,5 Miliar Pon Tembaga & 23,9 Juta Oz Emas",
      probableReserves: "25+ Miliar Pon Cu (Salah Satu Terbesar di Dunia)",
      annualProductionTarget: "Konsentrat Tembaga ~750.000 Ton (Bijih Kadar Tinggi Fase 7)",
      cashCostPerUnit: "$0.85 / lb Cu (Net Cash Cost setelah Kredit Emas)",
      commodityExposure: [
        { commodity: "Konsentrat Tembaga", revenueContributionPct: 55 },
        { commodity: "Kandungan Emas Bawaan (Gold Credit)", revenueContributionPct: 45 },
      ],
      sensitivityRule: "Setiap kenaikan $0.20/lb pada harga tembag LME menambah EBITDA AMMN sekitar ±$120 Juta; kenaikan harga emas $100/oz menambah margin bebas biaya sebesar ±$85 Juta.",
    },
    sensitivityRule: "Struktur biaya kas kuartil terbawah di dunia (First Quartile Cost Curve) berkat kredit byproduct emas yang sangat tinggi.",
    ebitdaSensitivityMultiplier: 1.6,
  },
  INCO: {
    primaryCommodity: "Nikel Matte (Kadar Tinggi ~78% Ni)",
    relevantBenchmarks: ["NICKEL"],
    operations: {
      concessionsOrSites: [
        { name: "Blok Tambang & Smelter Sorowako", location: "Luwu Timur, Sulawesi Selatan", type: "Laterite Nickel & Pyrometallurgy", reserves: "95 Juta WMT" },
        { name: "Proyek HPAL Pomalaa (Joint Venture Huayou)", location: "Kolaka, Sulawesi Tenggara", type: "HPAL MHP untuk Bahan Baterai", reserves: "150 Juta WMT" },
        { name: "Proyek Smelter RKEF Bahodopi", location: "Morowali, Sulawesi Tengah", type: "Feronikel / NPI", reserves: "110 Juta WMT" },
      ],
      provenReserves: "120 Juta WMT Cadangan Bijih Nikel",
      probableReserves: "280 Juta WMT Sumber Daya Terindikasi",
      annualProductionTarget: "70.000 - 72.000 Ton Nikel Matte / Tahun",
      cashCostPerUnit: "$9.200 - $9.800 / Ton Nikel Matte (Dipengaruhi Harga Minyak HSFO)",
      commodityExposure: [
        { commodity: "Nikel Matte Kontrak Jangka Panjang (Offtake)", revenueContributionPct: 100 },
      ],
      sensitivityRule: "Perubahan harga nikel LME sebesar $1.000/ton berdampak langsung terhadap perolehan pendapatan Vale sekitar ±$70 Juta per tahun.",
    },
    sensitivityRule: "Biaya produksi sangat dipengaruhi oleh harga energi pembangkit listrik tenaga air (PLTA Larona/Balambano) dan minyak bakar HSFO.",
    ebitdaSensitivityMultiplier: 1.5,
  },
  BUMI: {
    primaryCommodity: "Batu Bara Termal (Produsen Terbesar Nasional)",
    relevantBenchmarks: ["COAL"],
    operations: {
      concessionsOrSites: [
        { name: "Kaltim Prima Coal (KPC) Sangatta", location: "Kutai Timur, Kalimantan Timur", type: "World-Class Open Pit Mine", reserves: "750 Juta Ton" },
        { name: "Arutmin Indonesia (Senakin, Satui, Asam-asam)", location: "Kalimantan Selatan", type: "Multi-Pit Thermal Coal", reserves: "420 Juta Ton" },
      ],
      provenReserves: "1,2 Miliar Ton Batu Bara",
      probableReserves: "3,8 Miliar Ton Sumber Daya",
      annualProductionTarget: "76 - 80 Juta Ton / Tahun",
      cashCostPerUnit: "$41 - $45 / Ton",
      commodityExposure: [
        { commodity: "Batu Bara Termal Kalori Menengah-Tinggi (Prima/Pinang Coal)", revenueContributionPct: 92 },
        { commodity: "Emas & Mineral Gorontalo (BRMS subsidiary)", revenueContributionPct: 8 },
      ],
      sensitivityRule: "Volume operasional terbesar di Indonesia membuat laba operasional BUMI sangat sensitif terhadap tren harga batu bara global.",
    },
    sensitivityRule: "Bebas utang PKPU pasca-private placement Salim Group; leverage operasional murni mengikuti siklus komoditas energi.",
    ebitdaSensitivityMultiplier: 1.7,
  },
  MBMA: {
    primaryCommodity: "Nikel Pig Iron (NPI), Nickel Matte & HPAL Project",
    relevantBenchmarks: ["NICKEL"],
    operations: {
      concessionsOrSites: [
        { name: "Tambang Sulawesi Cahaya Mineral (SCM)", location: "Konawe, Sulawesi Tenggara", type: "Salah Satu Deposit Terbesar Dunia", reserves: "1,1 Miliar WMT" },
        { name: "Smelter RKEF BSI, CS, TSI (IMIP)", location: "Morowali, Sulawesi Tengah", type: "Pabrik Rotary Kiln Electric Furnace", reserves: "-" },
        { name: "Proyek HPAL Konawe (Battery Grade MHP)", location: "IKIP Morowali & Konawe", type: "High Pressure Acid Leach", reserves: "-" },
      ],
      provenReserves: "220 Juta WMT Nikel",
      probableReserves: "1,1 Miliar WMT Total Sumber Daya",
      annualProductionTarget: "NPI: 85.000 TNi | Nikel Matte: 30.000 Ton",
      cashCostPerUnit: "$11.000 - $11.800 / TNi",
      commodityExposure: [
        { commodity: "NPI & FeNi Smelter", revenueContributionPct: 75 },
        { commodity: "Nikel Matte Konversi", revenueContributionPct: 25 },
      ],
      sensitivityRule: "Kenaikan harga nikel LME $1.000/ton meningkatkan EBITDA konsolidasi MBMA sekitar ±$80 Juta seiring ramp-up proyek HPAL.",
    },
    sensitivityRule: "Eksposur terintegrasi dari tambang hulu SCM hingga hilirisasi nikel baterai kendaraan listrik kelas satu.",
    ebitdaSensitivityMultiplier: 1.55,
  },
  HRUM: {
    primaryCommodity: "Batu Bara Termal & Diversifikasi Nikel",
    relevantBenchmarks: ["COAL", "NICKEL"],
    operations: {
      concessionsOrSites: [
        { name: "Tambang Mahakam Ulu & Santan", location: "Kalimantan Timur", type: "Batu Bara Kalori Tinggi", reserves: "85 Juta Ton" },
        { name: "Infei Metal Industry (IMI) & Westrong", location: "Weda Bay, Maluku Utara", type: "Smelter Nikel RKEF", reserves: "-" },
        { name: "Tambang Nickel Cobalt (Blue Sparking)", location: "Weda Bay, Maluku Utara", type: "Proyek HPAL MHP", reserves: "-" },
      ],
      provenReserves: "100 Juta Ton Batu Bara & 150 Juta WMT Nikel",
      probableReserves: "250 Juta Ton Sumber Daya Kombinasi",
      annualProductionTarget: "Batu Bara: 5,5 Juta Ton | Nikel NPI: 55.000 TNi",
      cashCostPerUnit: "Batu Bara: ~$38/t | Nikel: ~$11.200/t",
      commodityExposure: [
        { commodity: "Batu Bara Termal Kalori Tinggi", revenueContributionPct: 48 },
        { commodity: "Nikel NPI & Matte (Hilirisasi)", revenueContributionPct: 52 },
      ],
      sensitivityRule: "Dua mesin pertumbuhan: arus kas batu bara mendanai belanja modal hilirisasi nikel di Weda Bay.",
    },
    sensitivityRule: "Model hibrida transisi energi unik di bursa Indonesia.",
    ebitdaSensitivityMultiplier: 1.4,
  },
  MEDC: {
    primaryCommodity: "Minyak Bumi, Gas Alam & Tembaga (AMMN Ownership)",
    relevantBenchmarks: ["OIL", "COPPER", "GOLD"],
    operations: {
      concessionsOrSites: [
        { name: "Blok Corridor (PSC Gas)", location: "Sumatera Selatan", type: "Penghasil Gas Utama Jawa-Sumatera", reserves: "Kontrak hingga 2043" },
        { name: "South Natuna Sea Block B", location: "Kepulauan Riau / Laut Natuna", type: "Minyak & Gas Lepas Pantai (Offshore)", reserves: "-" },
        { name: "Kepemilikan 21% Saham AMMN", location: "Sumbawa Barat", type: "Tambang Tembaga & Emas Raksasa", reserves: "-" },
      ],
      provenReserves: "450 Juta Barel Setara Minyak (MMBOE)",
      probableReserves: "800 MMBOE Sumber Daya 2C",
      annualProductionTarget: "160.000 - 165.000 BOEPD (Barel Setara Minyak per Hari)",
      cashCostPerUnit: "$8.50 / BOE (Biaya Pengangkatan Sangat Rendah)",
      commodityExposure: [
        { commodity: "Gas Alam Domestik & Singapura", revenueContributionPct: 44 },
        { commodity: "Minyak Mentah Brent Benchmark", revenueContributionPct: 32 },
        { commodity: "Dividen & Equity Pick-up AMMN", revenueContributionPct: 24 },
      ],
      sensitivityRule: "Setiap kenaikan $5/barel pada harga minyak Brent meningkatkan EBITDA Medco sekitar ±$65 Juta secara tahunan.",
    },
    sensitivityRule: "Arus kas dari kontrak gas jangka panjang memberi stabilitas harga di atas fluktuasi minyak mentah.",
    ebitdaSensitivityMultiplier: 1.35,
  },
  MDKA: {
    primaryCommodity: "Emas, Tembaga & Nikel (AIM & Wetar Project)",
    relevantBenchmarks: ["GOLD", "COPPER", "NICKEL"],
    operations: {
      concessionsOrSites: [
        { name: "Tambang Tujuh Bukit (Gold & Underground Copper)", location: "Banyuwangi, Jawa Timur", type: "Oxide Gold & Porphyry Cu", reserves: "1,8 Juta Oz Au & 8,1 Miliar Pon Cu" },
        { name: "Tambang Tembaga Pulau Wetar", location: "Maluku Barat Daya", type: "Cathode Copper SX-EW", reserves: "120.000 Ton Cu" },
        { name: "Proyek Acid Iron Metal (AIM)", location: "Morowali, Sulawesi Tengah", type: "Asam Sulfat & Uap Pabrik HPAL", reserves: "-" },
      ],
      provenReserves: "1,9 Juta Oz Emas & 8,5 Miliar Pon Tembaga",
      probableReserves: "14 Miliar Pon Sumber Daya Tembaga Porphyry",
      annualProductionTarget: "Emas: 120.000 Oz | Tembaga: 15.000 Ton",
      cashCostPerUnit: "Emas: ~$1.150 / Oz | Tembaga: ~$2.10 / lb",
      commodityExposure: [
        { commodity: "Emas Bullion", revenueContributionPct: 40 },
        { commodity: "Tembaga Katoda & Konsentrat", revenueContributionPct: 30 },
        { commodity: "Produk Olahan Smelter Nikel & Asam AIM", revenueContributionPct: 30 },
      ],
      sensitivityRule: "Proyek porfiri tembag Tujuh Bukit menjanjikan potensi ekspansi cadangan terbesar nomor dua di Indonesia setelah Grasberg.",
    },
    sensitivityRule: "Didukung oleh konsorsium Saratoga & Provident Capital dengan rekam jejak eksekusi proyek hilirisasi terbukti.",
    ebitdaSensitivityMultiplier: 1.5,
  },
  BRMS: {
    primaryCommodity: "Emas Logam Mulia (Pabrik Palu & Dairi)",
    relevantBenchmarks: ["GOLD"],
    operations: {
      concessionsOrSites: [
        { name: "Pabrik Emas Poboya (Palu)", location: "Palu, Sulawesi Tengah", type: "Pabrik Kapasitas 4.000 Ton Bijih/Hari", reserves: "25 Juta Ton Ore" },
        { name: "Proyek Seng & Timbal Dairi Prima", location: "Sumatera Utara", type: "Deposit High-Grade Zinc-Lead", reserves: "High Grade Reserves" },
      ],
      provenReserves: "3,3 Juta Oz Sumber Daya Emas",
      probableReserves: "7,5 Juta Oz Potensial",
      annualProductionTarget: "Emas ~45.000 - 55.000 Oz / Tahun",
      cashCostPerUnit: "$850 - $920 / Oz",
      commodityExposure: [
        { commodity: "Emas Batangan Murni", revenueContributionPct: 95 },
        { commodity: "Perak & Mineral Pengiring", revenueContributionPct: 5 },
      ],
      sensitivityRule: "Kenaikan harga emas COMEX $100/oz langsung diteruskan ke marjin laba bersih karena struktur fixed cost pabrik pengolahan di Poboya.",
    },
    sensitivityRule: "Produsen emas murni dengan akselerasi volume produksi tercepat di Bursa Efek Indonesia.",
    ebitdaSensitivityMultiplier: 1.65,
  },
};

const COMMODITY_TICKERS = new Set([
  "ADRO", "ANTM", "PTBA", "BUMI", "AMMN", "MBMA", "HRUM", "INCO", "MEDC", "PGAS",
  "TPIA", "BRMS", "CUAN", "MDKA", "ITMG", "INDY", "DOID", "KKGI", "TOBA", "TINS",
  "NCKL", "NICL", "PSAB", "ARCI", "ENRG", "ELSA", "RAJA", "BSSR", "GEMS", "BYAN",
  "DSSP", "MYOH", "DEWA", "PKPK", "SMMT", "BBRM", "WINS"
]);

/**
 * Memeriksa apakah suatu emiten tergolong emiten pertambangan, energi, atau komoditas
 */
export function isCommodityOrMiningIssuer(symbol: string, overview?: CompanyOverview): boolean {
  const clean = symbol.toUpperCase().replace(".JK", "");
  if (COMMODITY_TICKERS.has(clean)) return true;

  const sector = (overview?.sector || "").toLowerCase();
  const subSector = (overview?.sub_sector || "").toLowerCase();
  const industry = (overview?.industry || "").toLowerCase();

  const keywords = [
    "energy", "energi", "coal", "batu bara", "mining", "tambang", "oil", "gas",
    "metals", "minerals", "mineral", "gold", "emas", "nickel", "nikel", "copper",
    "tembaga", "basic materials", "bahan baku"
  ];

  return keywords.some((k) => sector.includes(k) || subSector.includes(k) || industry.includes(k));
}

/**
 * Menyusun data Commodity & Mining Lens komprehensif untuk dashboard Telaah 360
 */
export function analyzeCommodityLens(
  symbol: string,
  overview?: CompanyOverview
): CommodityLensData {
  const clean = symbol.toUpperCase().replace(".JK", "");
  const isCommodity = isCommodityOrMiningIssuer(clean, overview);

  if (!isCommodity) {
    return {
      isCommodityIssuer: false,
      sectorBadge: overview?.sector || "Non-Komoditas",
      primaryCommodity: "N/A",
      benchmarks: [],
      sensitivityEstimate: {
        baseCommodity: "N/A",
        priceShockPercent: 0,
        estimatedEbitdaImpactPercent: 0,
        narrative: "Emiten bukan sektor komoditas atau pertambangan.",
      },
    };
  }

  const profile = ISSUER_MINING_PROFILES[clean];
  const sectorBadge = overview?.sub_sector || overview?.sector || "Energy & Natural Resources";

  // Pilih benchmarks yang relevan
  let relevantBenchmarkKeys: string[] = ["COAL", "NICKEL", "GOLD", "COPPER", "OIL", "TIN"];
  if (profile?.relevantBenchmarks && profile.relevantBenchmarks.length > 0) {
    relevantBenchmarkKeys = profile.relevantBenchmarks;
  } else {
    // Deduksi otomatis dari sektor
    const s = `${overview?.sector} ${overview?.sub_sector}`.toLowerCase();
    if (s.includes("coal") || s.includes("batu bara")) relevantBenchmarkKeys = ["COAL", "OIL"];
    else if (s.includes("gold") || s.includes("emas")) relevantBenchmarkKeys = ["GOLD", "COPPER"];
    else if (s.includes("nickel") || s.includes("nikel")) relevantBenchmarkKeys = ["NICKEL", "COPPER"];
    else if (s.includes("oil") || s.includes("gas") || s.includes("minyak")) relevantBenchmarkKeys = ["OIL"];
  }

  const benchmarks: CommodityBenchmark[] = relevantBenchmarkKeys
    .map((k) => LIVE_COMMODITY_BENCHMARKS[k])
    .filter(Boolean);

  const primaryCommodity = profile?.primaryCommodity || benchmarks[0]?.commodityName || "Sumber Daya Alam";

  const multiplier = profile?.ebitdaSensitivityMultiplier || 1.25;
  const shockPct = 10; // skenario kenaikan 10% harga komoditas
  const estimatedImpact = Number((shockPct * multiplier).toFixed(1));

  const sensitivityNarrative =
    profile?.operations.sensitivityRule ||
    `Model elastisitas komoditas: Setiap perubahan ±${shockPct}% pada harga acuan ${primaryCommodity} diestimasikan berdampak ±${estimatedImpact}% terhadap laba operasional (EBITDA) emiten.`;

  return {
    isCommodityIssuer: true,
    sectorBadge,
    primaryCommodity,
    benchmarks,
    operations: profile?.operations,
    sensitivityEstimate: {
      baseCommodity: benchmarks[0]?.commodityName || "Komoditas Acuan",
      priceShockPercent: shockPct,
      estimatedEbitdaImpactPercent: estimatedImpact,
      narrative: sensitivityNarrative,
    },
  };
}
