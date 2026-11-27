import { NextRequest, NextResponse } from "next/server";
import {
  enrichNewsItems,
  fetchGoogleNews,
} from "@/lib/market/news";
import { guardRateLimit, RATE_LIMIT_RULES } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const limited = await guardRateLimit(req, "chart", RATE_LIMIT_RULES.chart);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get("symbol") ?? "IHSG")
    .trim()
    .toUpperCase()
    .replace(".JK", "");
  const symbol = /^[A-Z]{4}$/.test(raw) ? raw : "IHSG";
  const pageSize = Math.max(
    1,
    Math.min(
      Number(searchParams.get("pageSize")) ||
        Number(searchParams.get("limit")) ||
        9,
      20
    )
  );
  const requestedPage = Math.max(1, Number(searchParams.get("page")) || 1);

  const all = await fetchGoogleNews(symbol, 100).catch(() => []);
  const pages = Math.max(1, Math.ceil(all.length / pageSize));
  const page = Math.min(requestedPage, pages);
  const start = (page - 1) * pageSize;
  const slice = all.slice(start, start + pageSize);
  const items = await enrichNewsItems(slice).catch(() => slice);

  return NextResponse.json({
    success: true,
    symbol,
    items,
    page,
    pageSize,
    total: all.length,
    pages,
    hasMore: page < pages,
    source: "Google News RSS",
    delayed: true,
  });
}
