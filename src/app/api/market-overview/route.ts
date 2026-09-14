import { NextRequest, NextResponse } from "next/server";
import { getOrFetchDailyMarketData } from "@/lib/storage/market-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    // Panggil engine cache 1x24 jam
    const marketData = await getOrFetchDailyMarketData(forceRefresh);

    return NextResponse.json({
      success: true,
      ...marketData,
    });
  } catch (error: any) {
    console.error("Error in /api/market-overview:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memuat data pasar 24 jam.",
      },
      { status: 500 }
    );
  }
}
