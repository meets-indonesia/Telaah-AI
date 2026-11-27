import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkStockbitSession } from "@/lib/market/stockbit-session";
import {
  RATE_LIMIT_RULES,
  guardRateLimit,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function secretMatches(received: string | null, expected: string): boolean {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export async function POST(req: NextRequest) {
  const expected = process.env.ALERT_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "ALERT_SECRET belum diatur." },
      { status: 503 }
    );
  }
  if (!secretMatches(req.headers.get("x-alert-secret"), expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const limited = await guardRateLimit(req, "alertsRun", RATE_LIMIT_RULES.alertsRun);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dry") === "1";
  try {
    const result = await checkStockbitSession({ dryRun });
    return NextResponse.json({ ok: true, dryRun, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Gagal mengecek sesi.",
      },
      { status: 500 }
    );
  }
}
