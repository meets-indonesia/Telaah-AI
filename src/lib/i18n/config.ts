export type SupportedLocale = "id" | "en" | "zh";

export interface LocaleInfo {
  code: SupportedLocale;
  name: string;
  flag: string;
  label: string;
}

export const LOCALES: Record<SupportedLocale, LocaleInfo> = {
  id: {
    code: "id",
    name: "Bahasa Indonesia",
    flag: "🇮🇩",
    label: "ID",
  },
  en: {
    code: "en",
    name: "English",
    flag: "🇬🇧",
    label: "EN",
  },
  zh: {
    code: "zh",
    name: "简体中文",
    flag: "🇨🇳",
    label: "ZH",
  },
};

export const UI_DICTIONARY: Record<SupportedLocale, Record<string, string>> = {
  id: {
    // Nav & Header
    "nav.terminal": "Terminal",
    "nav.watchlist": "Watchlist",
    "search.placeholder": "Cari emiten...",
    "btn.dividend": "Kalkulator Dividen",
    "btn.jargon": "Kamus Jargon Saham",
    "btn.dividendShort": "Dividen",
    "btn.jargonShort": "Jargon",
    "ticker.status": "IDX TERKINI",

    // Sidebar
    "sidebar.newChat": "Obrolan Baru",
    "sidebar.chats": "Riwayat Chat",
    "sidebar.watchlist": "Watchlist",
    "sidebar.clearAll": "Bersihkan Seluruh Chat",
    "sidebar.emptyChat": "Belum ada riwayat chat.",
    "sidebar.emptyWatchlist": "Belum ada emiten di watchlist.",
    "sidebar.pin": "Pin Chat Ini",
    "sidebar.unpin": "Lepas Pin",
    "sidebar.delete": "Hapus Chat",

    // Terminal Tabs
    "tab.overview": "Ringkasan Cepat",
    "tab.financials": "Fundamental & Laba",
    "tab.flow": "Bandar & Whale Flow",
    "tab.technical": "Teknikal & Chart",
    "tab.peers": "Rekan Sektor",
    "tab.claims": "Validasi Klaim",
    "tab.commodity": "Commodity Lens",
    "tab.all": "Semua Modul",
    "tab.terminalWorkstation": "Kanvas Workstation Terminal",
    "tab.backToChat": "Kembali ke Percakapan Utama",

    // Quick Prompts Strip
    "quick.title": "Tanya Cepat:",
    "quick.dividend": "Dividen Yield",
    "quick.broker": "Broker Flow 5H",
    "quick.risk": "Risiko Utama",
    "quick.openModule": "Lihat Modul Lengkap ↗",

    // Chat Input
    "chat.inputPlaceholder": "Tanyakan analisis emiten, broker flow, atau valuasi... (Bisa paste gambar)",
    "chat.empty": "Mulai riset mendalam dengan memasukkan kode saham IDX atau topik finansial.",
    "chat.modeQuick": "Cepat (~6 cr)",
    "chat.modeFull": "Lengkap (~16 cr)",

    // Report Header & Strip
    "metric.marketCap": "Kapitalisasi Pasar",
    "metric.pe": "P/E Ratio (Valuasi Laba)",
    "metric.pbv": "PBV (Nilai Buku Aset)",
    "metric.rsi": "RSI 14 (Momentum Harga)",
    "metric.foreignFlow": "Arus Asing 5 Hari",
    "metric.actionAudit": "Aksi & Audit",
    "pillar.health": "1. Kesehatan Bisnis",
    "pillar.valuation": "2. Kewajaran Valuasi",
    "pillar.bandar": "3. Bandar & Asing",
    "pillar.plan": "4. Trading Plan",
    "thesis.title": "Executive Thesis & Kesimpulan Riset",
    "thesis.retailTitle": "Intisari Bahasa Ritel Unyu (ELIR)",
    "thesis.switchRetail": "Ganti: Mode Ritel",
    "thesis.switchFormal": "Mode: Formal Riset",
    "thesis.openModules": "Buka Modul Riset Lengkap",
    "thesis.explore": "Eksplorasi Modul Finansial, Bandar & Teknikal",

    // Executive Summary
    "summary.readyTitle": "Siap Eksekusi? Gunakan Trading Plan & Kalkulator",
    "summary.readySubtitle": "Dapatkan area beli ideal, batas cut loss, target profit multi-horizon, dan simulasi alokasi lot otomatis.",
    "summary.openTradingPlan": "Buka Trading Plan",
    "summary.openDividend": "Kalkulator Dividen",

    // Jargon Buster Modal
    "jargon.title": "Kamus Pintar Saham Ritel",
    "jargon.subtitle": "Pahami istilah rumit pasar modal dengan analogi sehari-hari yang gampang dimengerti",
    "jargon.search": "Cari istilah saham (misal: PBV, PER, DER, Foreign Flow, HAKA, Dividen)...",
    "jargon.notFound": "Istilah tidak ditemukan.",
    "jargon.analogy": "Analogi Sehari-hari:",
    "jargon.example": "Contoh di IDX:",
    "category.all": "Semua",
    "category.valuation": "Valuasi",
    "category.bandar": "Bandarmologi",
    "category.financial": "Kinerja & Neraca",
    "category.technical": "Teknikal",
    "category.corporate": "Aksi Korporasi",
    "category.system": "Sistem & Audit",
  },
  en: {
    // Nav & Header
    "nav.terminal": "Terminal",
    "nav.watchlist": "Watchlist",
    "search.placeholder": "Search ticker...",
    "btn.dividend": "Dividend Calculator",
    "btn.jargon": "Stock Jargon Buster",
    "btn.dividendShort": "Dividends",
    "btn.jargonShort": "Jargon",
    "ticker.status": "IDX LATEST",

    // Sidebar
    "sidebar.newChat": "New Chat",
    "sidebar.chats": "Chat History",
    "sidebar.watchlist": "Watchlist",
    "sidebar.clearAll": "Clear All Chats",
    "sidebar.emptyChat": "No chat history yet.",
    "sidebar.emptyWatchlist": "No tickers in watchlist.",
    "sidebar.pin": "Pin This Chat",
    "sidebar.unpin": "Unpin Chat",
    "sidebar.delete": "Delete Chat",

    // Terminal Tabs
    "tab.overview": "Quick Summary",
    "tab.financials": "Fundamentals & Income",
    "tab.flow": "Whale & FlowLens",
    "tab.technical": "Technical & Chart",
    "tab.peers": "Sector Peers",
    "tab.claims": "Claim Verification",
    "tab.commodity": "Commodity Lens",
    "tab.all": "All Modules",
    "tab.terminalWorkstation": "Terminal Workstation Canvas",
    "tab.backToChat": "Back to Main Conversation",

    // Quick Prompts Strip
    "quick.title": "Quick Ask:",
    "quick.dividend": "Dividend Yield",
    "quick.broker": "Broker Flow 5D",
    "quick.risk": "Key Risks",
    "quick.openModule": "View Full Modules ↗",

    // Chat Input
    "chat.inputPlaceholder": "Ask stock analysis, broker flow, or valuation... (Images supported)",
    "chat.empty": "Start deep research by entering an IDX ticker or financial query.",
    "chat.modeQuick": "Quick (~6 cr)",
    "chat.modeFull": "Full (~16 cr)",

    // Report Header & Strip
    "metric.marketCap": "Market Cap",
    "metric.pe": "P/E Ratio (Earnings Valuation)",
    "metric.pbv": "PBV (Book Value Multiplier)",
    "metric.rsi": "RSI 14 (Price Momentum)",
    "metric.foreignFlow": "5-Day Foreign Flow",
    "metric.actionAudit": "Action & Audit",
    "pillar.health": "1. Business Health",
    "pillar.valuation": "2. Valuation Fair Value",
    "pillar.bandar": "3. Whale & Foreign Flow",
    "pillar.plan": "4. Trading Plan",
    "thesis.title": "Executive Thesis & Research Summary",
    "thesis.retailTitle": "Retail Casual Digest (ELIR)",
    "thesis.switchRetail": "Switch: Retail Casual",
    "thesis.switchFormal": "Mode: Formal Research",
    "thesis.openModules": "Open Full Research Modules",
    "thesis.explore": "Explore Financials, Whale Flow & Technical Modules",

    // Executive Summary
    "summary.readyTitle": "Ready to Execute? Use Trading Plan & Calculator",
    "summary.readySubtitle": "Get ideal entry zones, cut-loss limits, multi-horizon take-profit targets, and automated lot sizing.",
    "summary.openTradingPlan": "Open Trading Plan",
    "summary.openDividend": "Dividend Calculator",

    // Jargon Buster Modal
    "jargon.title": "Retail Stock Jargon Buster",
    "jargon.subtitle": "Understand complex stock market terms through simple, everyday analogies",
    "jargon.search": "Search market terms (e.g., PBV, PER, DER, Foreign Flow, HAKA, Dividend)...",
    "jargon.notFound": "No terms found.",
    "jargon.analogy": "Everyday Analogy:",
    "jargon.example": "Example on IDX:",
    "category.all": "All",
    "category.valuation": "Valuation",
    "category.bandar": "Bandarmology",
    "category.financial": "Performance & Balance Sheet",
    "category.technical": "Technical",
    "category.corporate": "Corporate Actions",
    "category.system": "System & Audit",
  },
  zh: {
    // Nav & Header
    "nav.terminal": "终端工作台",
    "nav.watchlist": "自选股清单",
    "search.placeholder": "搜索印尼股票代码...",
    "btn.dividend": "股息计算器",
    "btn.jargon": "股市术语白话词典",
    "btn.dividendShort": "分红股息",
    "btn.jargonShort": "专业术语",
    "ticker.status": "IDX最新行情",

    // Sidebar
    "sidebar.newChat": "开启新对话",
    "sidebar.chats": "历史会话",
    "sidebar.watchlist": "自选股清单",
    "sidebar.clearAll": "清除所有记录",
    "sidebar.emptyChat": "暂无历史对话记录。",
    "sidebar.emptyWatchlist": "自选股清单为空。",
    "sidebar.pin": "置顶此对话",
    "sidebar.unpin": "取消置顶",
    "sidebar.delete": "删除对话",

    // Terminal Tabs
    "tab.overview": "核心速览",
    "tab.financials": "基本面与财报",
    "tab.flow": "庄家与外资流向",
    "tab.technical": "技术面与K线",
    "tab.peers": "行业竞品对标",
    "tab.claims": "传闻与事实核验",
    "tab.commodity": "大宗商品联动",
    "tab.all": "全景完整研报",
    "tab.terminalWorkstation": "终端工作台研判大屏",
    "tab.backToChat": "返回主对话界面",

    // Quick Prompts Strip
    "quick.title": "快捷研判:",
    "quick.dividend": "股息收益率",
    "quick.broker": "5日主力席位流向",
    "quick.risk": "核心风险提示",
    "quick.openModule": "查看全景模块 ↗",

    // Chat Input
    "chat.inputPlaceholder": "询问个股基本面、庄家资金流向或估值分析... (支持图片识别)",
    "chat.empty": "输入印尼IDX股票代码或财务问题，开启深入研报解读。",
    "chat.modeQuick": "快速研判 (~6 积分)",
    "chat.modeFull": "深度全景 (~16 积分)",

    // Report Header & Strip
    "metric.marketCap": "总市值",
    "metric.pe": "市盈率 P/E (估值)",
    "metric.pbv": "市净率 PBV (资产净值比)",
    "metric.rsi": "RSI 14 (价格动能指标)",
    "metric.foreignFlow": "5日外资净流向",
    "metric.actionAudit": "操作与审计",
    "pillar.health": "1. 业务健康与利润",
    "pillar.valuation": "2. 估值合理性",
    "pillar.bandar": "3. 庄家与外资流向",
    "pillar.plan": "4. 交易与风控计划",
    "thesis.title": "投研核心论点与结论",
    "thesis.retailTitle": "散户通俗大白话版 (ELIR)",
    "thesis.switchRetail": "切换: 散户白话",
    "thesis.switchFormal": "模式: 正式投研",
    "thesis.openModules": "展开深度分析模块",
    "thesis.explore": "探索财务指标、庄家主力与技术面分析大屏",

    // Executive Summary
    "summary.readyTitle": "准备建仓？使用交易计划与计算器",
    "summary.readySubtitle": "获取理想建仓区间、止损价位、多周期目标止盈价与自动手数推算。",
    "summary.openTradingPlan": "打开交易计划",
    "summary.openDividend": "股息收益计算器",

    // Jargon Buster Modal
    "jargon.title": "散户股市术语白话词典",
    "jargon.subtitle": "通过通俗易懂的日常生活比喻，轻松理解复杂的资本市场专业词汇",
    "jargon.search": "搜索股市专业术语 (如：PBV、PER、DER、外资流向、分红)...",
    "jargon.notFound": "未找到相关术语。",
    "jargon.analogy": "生活通俗比喻:",
    "jargon.example": "IDX实战案例:",
    "category.all": "全部",
    "category.valuation": "估值指标",
    "category.bandar": "庄家资金学",
    "category.financial": "财务与基本面",
    "category.technical": "技术面",
    "category.corporate": "公司重大行动",
    "category.system": "系统与审计",
  },
};
