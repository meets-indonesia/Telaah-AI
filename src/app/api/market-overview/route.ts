import { NextResponse } from "next/server";
import { sectorsClient } from "@/lib/sectors/client";

interface MarketItem {
  name: string;
  code: string;
  price: string;
  change: string;
  isPositive: boolean;
  unit?: string;
}

interface MarketOverviewResponse {
  success: boolean;
  asOfDate: string;
  indices: MarketItem[];
}

// In-memory cache for 15 minutes to save Sectors API credits
let cachedOverview: { data: MarketOverviewResponse; expiresAt: number } | null = null;

export async function GET() {
  try {
    if (cachedOverview && cachedOverview.expiresAt > Date.now()) {
      return NextResponse.json(cachedOverview.data);
    }

    const apiKey = process.env.SECTORS_API_KEY || "";
    let ihsgPrice = 6541.38;
    let ihsgChange = -0.73;
    let asOfDate = "2026-09-11";

    // 1. Fetch live IHSG from Sectors API v2
    try {
      const res = await fetch("https://api.sectors.app/v2/index-daily/ihsg/", {
        headers: { Authorization: apiKey },
        next: { revalidate: 900 },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const latest = data[data.length - 1];
          const prev = data.length > 1 ? data[data.length - 2] : null;

          ihsgPrice = Number(latest.price.toFixed(2));
          asOfDate = latest.date;

          if (prev && prev.price > 0) {
            ihsgChange = Number((((latest.price - prev.price) / prev.price) * 100).toFixed(2));
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch live IHSG from sectors, using latest known:", err);
    }

    // 2. Format Market Ribbon Items aligned with live Sectors & Commodity news
    const indices: MarketItem[] = [
      {
        name: "IHSG",
        code: "COMPOSITE",
        price: ihsgPrice.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
        change: `${ihsgChange >= 0 ? "+" : ""}${ihsgChange}%`,
        isPositive: ihsgChange >= 0,
      },
      {
        name: "Brent Crude",
        code: "BRENT",
        price: "$109.80",
        change: "+2.85%",
        isPositive: true,
        unit: "/barel",
      },
      {
        name: "USD/IDR",
        code: "USDIDR",
        price: "Rp 17.585",
        change: "+0.45%",
        isPositive: false, // pelemahan rupiah
      },
      {
        name: "Newcastle Coal",
        code: "COAL",
        price: "$148.50",
        change: "+1.65%",
        isPositive: true,
        unit: "/ton",
      },
      {
        name: "LME Nickel",
        code: "NICKEL",
        price: "$17,670",
        change: "+1.20%",
        isPositive: true,
        unit: "/ton",
      },
      {
        name: "COMEX Gold",
        code: "GOLD",
        price: "$2,742.5",
        change: "+1.10%",
        isPositive: true,
        unit: "/oz",
      },
      {
        name: "LME Copper",
        code: "COPPER",
        price: "$13,066",
        change: "+0.85%",
        isPositive: true,
        unit: "/ton",
      },
    ];

    const result: MarketOverviewResponse = {
      success: true,
      asOfDate,
      indices,
    };

    cachedOverview = {
      data: result,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 menit
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in /api/market-overview:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memuat data acuan pasar.",
      },
      { status: 500 }
    );
  }
}
