import { NextResponse } from "next/server";
import { getCommodityPrices } from "@/lib/market/commodities";

export const dynamic = "force-dynamic";

export interface CommodityHistoryPoint {
  date: string;
  price: number;
}

export interface CommodityData {
  name: string;
  code: string;
  unit: string;
  latestPrice: number;
  changePct: number;
  history: CommodityHistoryPoint[];
}

export async function GET() {
  try {
    const commodities = await getCommodityPrices();
    return NextResponse.json({
      success: true,
      commodities,
    });
  } catch (error: any) {
    console.error("Error fetching commodity prices:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat harga komoditas." },
      { status: 500 }
    );
  }
}
