import { NextRequest, NextResponse } from "next/server";
import {
  addAlertSymbol,
  cleanSymbol,
  loadAlertWatchlist,
  removeAlertSymbol,
  saveAlertWatchlist,
  type AlertRules,
} from "@/lib/alerts/store";
import {
  RATE_LIMIT_RULES,
  guardRateLimit,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const data = await loadAlertWatchlist();
  return NextResponse.json({ success: true, ...data });
}

export async function POST(req: NextRequest) {
  const limited = await guardRateLimit(req, "alerts", RATE_LIMIT_RULES.alerts);
  if (limited) return limited;

  try {
    const body = (await req.json()) as {
      action?: string;
      symbol?: string;
      rules?: Partial<AlertRules>;
    };

    if (body.action === "add") {
      const symbols = await addAlertSymbol(body.symbol ?? "");
      return NextResponse.json({ success: true, symbols });
    }
    if (body.action === "remove") {
      const symbols = await removeAlertSymbol(body.symbol ?? "");
      return NextResponse.json({ success: true, symbols });
    }
    if (body.action === "rules") {
      const current = await loadAlertWatchlist();
      const saved = await saveAlertWatchlist({
        ...current,
        rules: { ...current.rules, ...(body.rules ?? {}) },
      });
      return NextResponse.json({ success: true, ...saved });
    }

    return NextResponse.json(
      { success: false, error: "Action harus add, remove, atau rules." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Gagal memperbarui alert.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await guardRateLimit(req, "alerts", RATE_LIMIT_RULES.alerts);
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const symbol = cleanSymbol(searchParams.get("symbol"));
    const symbols = await removeAlertSymbol(symbol);
    return NextResponse.json({ success: true, symbols });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Gagal menghapus alert.",
      },
      { status: 400 }
    );
  }
}
