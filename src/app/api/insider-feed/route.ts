import { NextRequest, NextResponse } from "next/server";
import { SectorsClient } from "@/lib/sectors/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const type = searchParams.get("type"); // buy | sell | all
    const symbol = searchParams.get("symbol");

    const client = new SectorsClient();
    const res = await client.getFilings(
      symbol ? symbol.toUpperCase().replace(".JK", "") : undefined,
      {
        limit: Math.min(limit, 50),
        transaction_type: type && (type === "buy" || type === "sell") ? type : undefined,
      }
    );
    return NextResponse.json({
      success: true,
      filings: res?.results || [],
    });
  } catch (error: any) {
    console.error("Error in /api/insider-feed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat insider feed." },
      { status: 500 }
    );
  }
}
