import {
  FilingItem,
  InsiderClusterAnalysis,
  InsiderTransaction,
  ManagementData,
  OwnershipData,
} from "../sectors/types";

/**
 * Helper untuk membersihkan teks dan mengekstrak nominal lembar saham
 */
function extractSharesFromText(text: string): number | null {
  // Pola: "2.800.000 lembar" atau "2,8 juta" atau "2800000 saham" atau "100.000"
  const jutaMatch = text.match(/([\d.,]+)\s*(?:juta|jt|million)/i);
  if (jutaMatch) {
    const num = parseFloat(jutaMatch[1].replace(/\./g, "").replace(",", "."));
    if (!isNaN(num)) return Math.round(num * 1_000_000);
  }

  const lembarMatch = text.match(/([\d]{1,3}(?:\.[\d]{3})+(?:,\d+)?)\s*(?:lembar|saham|shares)?/i);
  if (lembarMatch) {
    const num = parseInt(lembarMatch[1].replace(/\./g, "").replace(/,/g, ""), 10);
    if (!isNaN(num)) return num;
  }

  const rawNumMatch = text.match(/\b([1-9]\d{4,9})\b/);
  if (rawNumMatch) {
    const num = parseInt(rawNumMatch[1], 10);
    if (!isNaN(num)) return num;
  }

  return null;
}

/**
 * Mencari nama eksekutif/insider dari teks
 */
function matchExecutiveName(text: string, knownExecutives: Array<{ name: string; title: string }>): { name: string; title: string } | null {
  const lowerText = text.toLowerCase();
  for (const exec of knownExecutives) {
    const execLower = exec.name.toLowerCase();
    // Match full name or first+last name
    const parts = execLower.split(" ").filter((p) => p.length > 2);
    if (lowerText.includes(execLower) || (parts.length >= 2 && parts.every((p) => lowerText.includes(p)))) {
      return exec;
    }
  }
  return null;
}

/**
 * Analisis mendalam keterbukaan informasi insider (Filings) untuk mendeteksi Cluster Buy / Sell
 */
export function analyzeInsiderCluster(
  filings: FilingItem[] = [],
  management?: ManagementData,
  ownership?: OwnershipData,
  symbol: string = "",
  lastPrice: number = 0,
  filingsAvailable: boolean = true
): InsiderClusterAnalysis {
  const cleanSymbol = symbol.toUpperCase().replace(".JK", "");
  const transactions: InsiderTransaction[] = [];

  // 1. Kumpulkan nama-nama eksekutif resmi dari Management & Ownership data
  const knownExecutives: Array<{ name: string; title: string }> = [];
  
  if (management?.key_executives) {
    for (const exec of management.key_executives) {
      if (exec.name) {
        knownExecutives.push({ name: exec.name, title: exec.title || "Direksi/Komisaris" });
      }
    }
  }

  if (management?.executives_shareholdings) {
    for (const exec of management.executives_shareholdings) {
      if (exec.name && !knownExecutives.some((k) => k.name.toLowerCase() === exec.name.toLowerCase())) {
        knownExecutives.push({ name: exec.name, title: exec.title || "Direksi Pemegang Saham" });
      }
    }
  }

  if (ownership?.whale_investors) {
    for (const w of ownership.whale_investors) {
      if (w.name && !knownExecutives.some((k) => k.name.toLowerCase() === w.name.toLowerCase())) {
        knownExecutives.push({ name: w.name, title: "Whale / Pemegang Saham Signifikan" });
      }
    }
  }

  // 2. Parse setiap filing untuk mendeteksi transaksi insider
  filings.forEach((f: any, idx) => {
    // A scanned/unparseable PDF has no verified shares; do not invent a
    // neutral transaction or let it pad the cluster counts.
    if (f.unparsed === true) return;

    const title = f.title || "";
    const body = f.body || "";
    const combined = `${title} ${body}`.toLowerCase();

    // Deteksi aksi: BUY, SELL, TRANSFER (utamakan data terstruktur dari filings)
    let action: "BUY" | "SELL" | "TRANSFER" | "NEUTRAL" = "NEUTRAL";
    if (f.transaction_type) {
      const tt = String(f.transaction_type).toLowerCase();
      if (tt === "buy" || tt.includes("beli")) action = "BUY";
      else if (tt === "sell" || tt.includes("jual")) action = "SELL";
      else if (tt.includes("transfer") || tt.includes("hibah")) action = "TRANSFER";
    }

    if (action === "NEUTRAL") {
      if (
        combined.includes("membeli") ||
        combined.includes("pembelian") ||
        combined.includes("tambah") ||
        combined.includes("penambahan") ||
        combined.includes("akumulasi") ||
        combined.includes("perolehan") ||
        combined.includes("buy")
      ) {
        action = "BUY";
      } else if (
        combined.includes("menjual") ||
        combined.includes("penjualan") ||
        combined.includes("pelepasan") ||
        combined.includes("pengurangan") ||
        combined.includes("sell") ||
        combined.includes("divestasi")
      ) {
        action = "SELL";
      } else if (combined.includes("pengalihan") || combined.includes("hibah") || combined.includes("waris")) {
        action = "TRANSFER";
      }
    }

    // Cari nama orang / institusi yang melakukan aksi
    let matchedExec = matchExecutiveName(combined, knownExecutives);
    let actorName = f.holder_name || matchedExec?.name;
    let actorTitle = matchedExec?.title || (f.holder_type === "insider" ? "Direksi / Manajemen Kunci" : "Manajemen / Pemegang Saham");

    if (!actorName) {
      // Coba ekstrak nama setelah "oleh" atau "milik" atau "saham"
      const nameMatch = title.match(/(?:oleh|mengenai|saham)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
      if (nameMatch) {
        actorName = nameMatch[1];
        actorTitle = "Pengurus / Pemegang Saham";
      } else {
        actorName = "Direksi / Manajemen Emiten";
      }
    }

    // Cari volume lembar saham
    let shares = Number(f.amount_transaction) || extractSharesFromText(combined) || 0;

    // Hitung estimasi nilai rupiah
    const txPrice = Number(f.price) || (lastPrice > 0 ? lastPrice : 5000);
    const estimatedValue = Number(f.transaction_value) || (shares * txPrice);

    // Tanggal transaksi
    const txDate = f.date || (f.timestamp ? String(f.timestamp).split("T")[0] : new Date().toISOString().split("T")[0]);

    transactions.push({
      id: `insider_${f.id || idx}_${Date.now()}`,
      date: txDate,
      insiderName: actorName,
      position: actorTitle,
      action,
      shares,
      price: txPrice,
      value: estimatedValue,
      percentageBefore: f.share_percentage_before !== undefined ? Number(f.share_percentage_before) : undefined,
      percentageAfter: f.share_percentage_after !== undefined ? Number(f.share_percentage_after) : undefined,
      filingTitle: title,
      filingId: f.id,
    });
  });

  if (!filingsAvailable) {
    return {
      status: "unavailable",
      signal: "Netral",
      score: 0,
      summary: "Data keterbukaan informasi insider tidak tersedia dari provider ini.",
      totalBuyShares: 0,
      totalSellShares: 0,
      netShares: 0,
      totalBuyValue: 0,
      totalSellValue: 0,
      netValue: 0,
      uniqueInsiders: 0,
      clusterBuyDetected: false,
      clusterSellDetected: false,
      insiderActors: [],
      transactions: [],
    };
  }

  // 4. Hitung Agregat & Deteksi Cluster Buy / Sell
  let totalBuyShares = 0;
  let totalSellShares = 0;
  let totalBuyValue = 0;
  let totalSellValue = 0;

  const actorMap = new Map<
    string,
    {
      name: string;
      position: string;
      netShares: number;
      totalBuyShares: number;
      totalSellShares: number;
      actionCount: number;
      lastDate: string;
    }
  >();

  for (const t of transactions) {
    if (t.action === "BUY") {
      totalBuyShares += t.shares;
      totalBuyValue += t.value || t.shares * (lastPrice || 1000);
    } else if (t.action === "SELL") {
      totalSellShares += t.shares;
      totalSellValue += t.value || t.shares * (lastPrice || 1000);
    }

    const currentActor = actorMap.get(t.insiderName) || {
      name: t.insiderName,
      position: t.position,
      netShares: 0,
      totalBuyShares: 0,
      totalSellShares: 0,
      actionCount: 0,
      lastDate: t.date,
    };

    if (t.action === "BUY") {
      currentActor.totalBuyShares += t.shares;
      currentActor.netShares += t.shares;
    } else if (t.action === "SELL") {
      currentActor.totalSellShares += t.shares;
      currentActor.netShares -= t.shares;
    }

    currentActor.actionCount += 1;
    if (new Date(t.date).getTime() > new Date(currentActor.lastDate).getTime()) {
      currentActor.lastDate = t.date;
    }

    actorMap.set(t.insiderName, currentActor);
  }

  const insiderActors = Array.from(actorMap.values()).sort((a, b) => Math.abs(b.netShares) - Math.abs(a.netShares));
  const uniqueInsiders = insiderActors.length;
  const netShares = totalBuyShares - totalSellShares;
  const netValue = totalBuyValue - totalSellValue;

  // Aturan Cluster Buy: minimal 2 direksi/komisaris berbeda membeli secara akumulatif
  const buyingActorsCount = insiderActors.filter((a) => a.totalBuyShares > 0).length;
  const sellingActorsCount = insiderActors.filter((a) => a.totalSellShares > 0).length;

  const clusterBuyDetected = buyingActorsCount >= 2 && netShares > 0;
  const clusterSellDetected = sellingActorsCount >= 2 && netShares < 0;

  // Signal & Score determination
  let signal: InsiderClusterAnalysis["signal"] = "Netral";
  let score = 0;

  if (clusterBuyDetected) {
    signal = "Cluster Buy (Akumulasi Agresif)";
    score = Math.min(100, 75 + buyingActorsCount * 5);
  } else if (netShares > 0 && totalBuyShares > 0) {
    signal = "Moderate Buy";
    score = 50;
  } else if (clusterSellDetected) {
    signal = "Cluster Sell (Distribusi Agresif)";
    score = -Math.min(100, 75 + sellingActorsCount * 5);
  } else if (netShares < 0 && totalSellShares > 0) {
    signal = "Moderate Sell";
    score = -50;
  } else {
    signal = "Netral";
    score = 0;
  }

  // Summary narrative
  let summary = "";
  if (clusterBuyDetected) {
    const actorNames = insiderActors
      .filter((a) => a.totalBuyShares > 0)
      .slice(0, 3)
      .map((a) => a.name)
      .join(", ");
    summary = `Cluster-Buy Terdeteksi: ${buyingActorsCount} figur kunci manajemen (${actorNames}) melakukan pembelian terkoordinasi/serentak secara akumulatif ${(
      totalBuyShares / 1e6
    ).toFixed(2)} juta lembar saham (estimasi Rp ${(totalBuyValue / 1e9).toFixed(1)} Miliar).`;
  } else if (clusterSellDetected) {
    const actorNames = insiderActors
      .filter((a) => a.totalSellShares > 0)
      .slice(0, 3)
      .map((a) => a.name)
      .join(", ");
    summary = `Cluster-Sell Terdeteksi: ${sellingActorsCount} pejabat emiten (${actorNames}) melakukan pelepasan saham sebesar ${(
      totalSellShares / 1e6
    ).toFixed(2)} juta lembar saham.`;
  } else if (totalBuyShares > 0) {
    summary = `Terdeteksi aksi akumulasi insider oleh ${insiderActors[0]?.name || "manajemen"} sejumlah ${(
      totalBuyShares / 1e6
    ).toFixed(2)} juta lembar saham.`;
  } else if (totalSellShares > 0) {
    summary = `Terdeteksi pelepasan saham insider oleh ${insiderActors[0]?.name || "manajemen"} sejumlah ${(
      totalSellShares / 1e6
    ).toFixed(2)} juta lembar saham.`;
  } else {
    summary = `Filings tersedia, tetapi tidak ada transaksi insider yang dapat diverifikasi dari data yang tersedia.`;
  }

  const status = transactions.length > 0 ? "available" : "partial";

  return {
    status,
    signal,
    score,
    summary,
    totalBuyShares,
    totalSellShares,
    netShares,
    totalBuyValue,
    totalSellValue,
    netValue,
    uniqueInsiders,
    clusterBuyDetected,
    clusterSellDetected,
    insiderActors,
    transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  };
}
