import { NextRequest, NextResponse } from "next/server";
import { getMarketProvider } from "@/lib/market";
import type { CorporateActionItem } from "@/lib/sectors/types";
import { cacheGet, cacheSet } from "@/lib/storage/json-cache";
import { guardRateLimit, RATE_LIMIT_RULES } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const limited = await guardRateLimit(req, "chart", RATE_LIMIT_RULES.chart);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "")
    .trim()
    .toUpperCase()
    .replace(".JK", "");

  if (!/^[A-Z]{4}$/.test(symbol)) {
    return NextResponse.json(
      { success: false, error: "Kode emiten harus 4 huruf." },
      { status: 400 }
    );
  }

  try {
    const cacheKey = `corporate-actions:${symbol}:v1`;
    const cachedActions = await cacheGet<CorporateActionItem[]>(cacheKey);
    if (cachedActions) {
      return NextResponse.json({
        success: true,
        symbol,
        actions: cachedActions,
        cached: true,
      });
    }
    const response = await getMarketProvider().getCorporateActions(symbol);
    const actions = response?.corporate_actions ?? [];
    await cacheSet(cacheKey, actions, actions.length ? 6 * 3600 : 30 * 60);
    return NextResponse.json({
      success: true,
      symbol,
      actions,
      cached: false,
    });
  } catch {
    return NextResponse.json({
      success: true,
      symbol,
      actions: [],
      limited: true,
    });
  }
}
