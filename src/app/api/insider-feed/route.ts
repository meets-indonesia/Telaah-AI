import { NextRequest, NextResponse } from "next/server";
import { getMarketProvider } from "@/lib/market";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "5", 10);
    const typeParam = searchParams.get("type");
    const type =
      typeParam === "buy" || typeParam === "sell" ? typeParam : ("all" as const);

    const provider = getMarketProvider();
    const feed = await provider.getInsiderFeed({
      limit: Math.min(limit, 10),
      type,
    });

    return NextResponse.json({
      success: true,
      filings: feed.results,
      unavailable: feed.unavailable === true,
      stale: feed.stale === true,
      source: feed.source,
      limitations: feed.limitations,
    });
  } catch (error: any) {
    console.error("Error in /api/insider-feed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat insider feed." },
      { status: 500 }
    );
  }
}
