import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/alerts/run", () => ({
  runAlertScan: vi.fn(async () => ({
    generatedAt: "2026-11-24T10:00:00.000Z",
    scanned: 1,
    signals: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
    messages: [],
  })),
}));

import { GET, POST, DELETE } from "../route";
import { POST as RUN } from "../run/route";
import { resetRateLimitStateForTests } from "@/lib/security/rate-limit";

const folders: string[] = [];
let originalFile: string | undefined;

beforeEach(async () => {
  resetRateLimitStateForTests();
  const folder = await mkdtemp(path.join(tmpdir(), "telaah-alert-api-"));
  folders.push(folder);
  originalFile = process.env.ALERT_WATCHLIST_FILE;
  process.env.ALERT_WATCHLIST_FILE = path.join(folder, "watchlist.json");
});

afterEach(async () => {
  if (originalFile === undefined) delete process.env.ALERT_WATCHLIST_FILE;
  else process.env.ALERT_WATCHLIST_FILE = originalFile;
  await Promise.all(
    folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true }))
  );
});

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/alerts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/alerts", () => {
  it("adds, lists, and removes symbols", async () => {
    const added = await POST(request({ action: "add", symbol: "bbri" }));
    expect(added.status).toBe(200);
    expect(await added.json()).toMatchObject({ symbols: ["BBRI"] });

    const listed = await GET();
    expect(await listed.json()).toMatchObject({ symbols: ["BBRI"] });

    const removed = await DELETE(
      new NextRequest("http://localhost/api/alerts?symbol=BBRI", {
        method: "DELETE",
      })
    );
    expect(await removed.json()).toMatchObject({ symbols: [] });
  });

  it("rejects an invalid symbol", async () => {
    const response = await POST(request({ action: "add", symbol: "BRK.B" }));
    expect(response.status).toBe(400);
  });
});

describe("/api/alerts/run", () => {
  it("requires ALERT_SECRET", async () => {
    const previous = process.env.ALERT_SECRET;
    delete process.env.ALERT_SECRET;
    const response = await RUN(
      new NextRequest("http://localhost/api/alerts/run", { method: "POST" })
    );
    expect(response.status).toBe(503);
    if (previous === undefined) delete process.env.ALERT_SECRET;
    else process.env.ALERT_SECRET = previous;
  });

  it("rejects a wrong secret and accepts the configured one", async () => {
    const previous = process.env.ALERT_SECRET;
    process.env.ALERT_SECRET = "test-alert-secret";
    const wrong = await RUN(
      new NextRequest("http://localhost/api/alerts/run", {
        method: "POST",
        headers: { "x-alert-secret": "nope" },
      })
    );
    expect(wrong.status).toBe(401);

    const ok = await RUN(
      new NextRequest("http://localhost/api/alerts/run?dry=1", {
        method: "POST",
        headers: { "x-alert-secret": "test-alert-secret" },
      })
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, dryRun: true });

    if (previous === undefined) delete process.env.ALERT_SECRET;
    else process.env.ALERT_SECRET = previous;
  });
});
