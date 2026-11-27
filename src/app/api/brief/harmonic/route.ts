import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { scanHarmonicUniverse } from "@/lib/screener/harmonic-screener";
import { sendHarmonicBrief } from "@/lib/telegram/brief";
import { formatBriefMessage } from "@/lib/telegram/format";

export const dynamic = "force-dynamic";

function secretMatches(received: string | null, expected: string): boolean {
  if (!received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function receivedSecret(req: NextRequest): string | null {
  const header = req.headers.get("x-brief-secret");
  if (header) return header;
  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  const briefSecret = process.env.BRIEF_SECRET?.trim();
  if (!briefSecret) {
    return NextResponse.json(
      { ok: false, error: "BRIEF_SECRET belum diatur." },
      { status: 503 }
    );
  }
  if (!secretMatches(receivedSecret(req), briefSecret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const searchParams = new URL(req.url).searchParams;
  const refresh = searchParams.get("refresh") === "1";
  const dry = searchParams.get("dry") === "1";

  try {
    if (dry) {
      const scan = await scanHarmonicUniverse({ refresh });
      return NextResponse.json({
        ok: true,
        dry: true,
        generatedAt: scan.generatedAt,
        date: scan.date,
        universeSize: scan.universeSize,
        scanned: scan.scanned,
        failed: scan.failed,
        results: scan.results,
        preview: formatBriefMessage(scan),
      });
    }

    const delivery = await sendHarmonicBrief({ refresh });
    return NextResponse.json({
      ok: true,
      generatedAt: delivery.scan.generatedAt,
      date: delivery.scan.date,
      universeSize: delivery.scan.universeSize,
      scanned: delivery.scan.scanned,
      failed: delivery.scan.failed,
      deliveredTo: delivery.chatId,
      sent: true,
      results: delivery.scan.results,
    });
  } catch (error) {
    console.error("Harmonic brief failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: (error as Error)?.message || "Brief harmonic gagal dibuat.",
      },
      { status: 500 }
    );
  }
}
