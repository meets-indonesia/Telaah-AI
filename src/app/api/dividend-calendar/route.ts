import { NextRequest, NextResponse } from "next/server";
import { ScraperClient } from "@/lib/market/scraper-client";
import { normalizeDividendCalendar, type DividendCalendarItem } from "@/lib/market/dividend-calendar";
import { cacheGet, cacheSet } from "@/lib/storage/json-cache";
import { guardRateLimit, RATE_LIMIT_RULES } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const limited = await guardRateLimit(req, "chart", RATE_LIMIT_RULES.chart);
  if (limited) return limited;

  const month = new URL(req.url).searchParams.get("month") ?? undefined;
  const client = new ScraperClient();
  if (!client.isConfigured) {
    return NextResponse.json({
      success: true,
      items: [],
      source: "idx",
      limited: true,
      error: "Scraper IDX belum aktif.",
    });
  }

  const monthKey = month ?? new Date().toISOString().slice(0, 7);
  const cacheKey = `dividend-calendar:${monthKey}:v1`;
  const cachedItems = await cacheGet<DividendCalendarItem[]>(cacheKey);
  if (cachedItems) {
    return NextResponse.json({
      success: true,
      month: month ?? null,
      items: cachedItems,
      source: "idx",
      limited: false,
      cached: true,
    });
  }

  const calendar = await client.getCalendar(month);
  const items = normalizeDividendCalendar(calendar);
  await cacheSet(cacheKey, items, 6 * 3600);
  return NextResponse.json({
    success: true,
    month: month ?? null,
    items,
    source: "idx",
    limited: calendar === null,
    cached: false,
  });
}
