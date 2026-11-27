import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearFxCache, getUsdIdrRate } from "../fx";

beforeEach(() => clearFxCache());

describe("getUsdIdrRate", () => {
  it("returns the IDR rate and caches it for the TTL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ rates: { IDR: 16250 } }), { status: 200 })
    );
    expect(await getUsdIdrRate(fetchMock)).toBe(16250);
    expect(await getUsdIdrRate(fetchMock)).toBe(16250);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when the provider fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("boom", { status: 503 }));
    expect(await getUsdIdrRate(fetchMock)).toBeNull();
  });
});
