import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { HARMONIC_KNOWLEDGE } from "@/lib/harmonic/knowledge";
import {
  ingestHarmonicKnowledge,
  searchHarmonicKnowledge,
} from "@/lib/vector/harmonic-knowledge";
import { guardRateLimit, RATE_LIMIT_RULES } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function secretMatches(received: string | null, expected: string): boolean {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export async function GET(req: NextRequest) {
  const limited = await guardRateLimit(req, "harmonic", RATE_LIMIT_RULES.harmonic);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") ?? "").trim();
  const pattern = searchParams.get("pattern") ?? undefined;
  if (!query) {
    return NextResponse.json({
      success: true,
      items: HARMONIC_KNOWLEDGE.map((doc) => ({ score: 1, doc })),
      source: "seed",
    });
  }
  const items = await searchHarmonicKnowledge(query, {
    pattern,
    limit: 6,
  });
  return NextResponse.json({
    success: true,
    items,
    source: items.length ? "qdrant" : "none",
  });
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
  try {
    const count = await ingestHarmonicKnowledge();
    return NextResponse.json({ ok: count > 0, count });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Ingest knowledge gagal.",
      },
      { status: 500 }
    );
  }
}
