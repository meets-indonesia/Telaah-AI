import { NextRequest } from "next/server";
import {
  isValidSymbol,
  normalizeSymbol,
  normalizeTimeframe,
} from "@/lib/chart/data";
import {
  getChartSnapshot,
  subscribeChart,
  type ChartFrame,
} from "@/lib/chart/stream";
import { guardRateLimit, RATE_LIMIT_RULES } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 15_000;

export async function GET(req: NextRequest) {
  const limited = await guardRateLimit(
    req,
    "chartStream",
    RATE_LIMIT_RULES.chartStream
  );
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const symbol = normalizeSymbol(searchParams.get("symbol"));
  const timeframe = normalizeTimeframe(searchParams.get("timeframe"));

  if (!isValidSymbol(symbol)) {
    return new Response("Kode emiten harus 4 huruf.", { status: 400 });
  }

  const encoder = new TextEncoder();
  let cleanup = () => {};
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, frame: ChartFrame) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(frame)}\n\n`)
        );
      };
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // The browser closed the stream between beats.
        }
      }, HEARTBEAT_MS);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed by the runtime.
        }
      };

      let unsubscribe = () => {};
      cleanup = () => {
        unsubscribe();
        close();
      };

      const initial = await getChartSnapshot(symbol, timeframe).catch(() => null);
      if (!initial) {
        if (!closed) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({
                message: `Data chart ${symbol} tidak tersedia.`,
              })}\n\n`
            )
          );
        }
        close();
        return;
      }

      if (closed || req.signal.aborted) {
        close();
        return;
      }

      send("snapshot", initial);
      unsubscribe = subscribeChart(
        symbol,
        timeframe,
        (frame) => send("candles", frame),
        { replay: false }
      );

      req.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
