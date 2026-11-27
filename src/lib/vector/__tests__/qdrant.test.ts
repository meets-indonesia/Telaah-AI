import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../embeddings", () => ({
  getEmbedding: async () => [0.1, 0.2],
}));

import {
  CACHE_DATA_SOURCE,
  CACHE_DATA_VERSION,
  searchSemanticReportCache,
  upsertReportToVectorCache,
} from "../qdrant";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("semantic cache versioning", () => {
  it("filters search results by data source and version", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: [] }), { status: 200 })
      );
    vi.stubGlobal("fetch", fetchMock);

    await searchSemanticReportCache("BBCA prospek", "BBCA", 0.88, "full");

    const searchCall = fetchMock.mock.calls.find((call) =>
      String(call[0]).includes("/points/search")
    );
    const body = JSON.parse(String(searchCall?.[1]?.body));
    expect(body.filter.must).toEqual(
      expect.arrayContaining([
        { key: "dataSource", match: { value: CACHE_DATA_SOURCE } },
        { key: "dataVersion", match: { value: CACHE_DATA_VERSION } },
      ])
    );
  });

  it("does not cache a fallback report whose synthesis failed", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const ok = await upsertReportToVectorCache(
      "BBCA prospek",
      "BBCA",
      { symbol: "BBCA", synthesisFailed: true } as any,
      "full"
    );

    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("writes the version into the cached report payload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await upsertReportToVectorCache(
      "BBCA prospek",
      "BBCA",
      { symbol: "BBCA" } as any,
      "full"
    );

    const upsertCall = fetchMock.mock.calls.find(
      (call) => String(call[0]).includes("/collections/") && String(call[0]).endsWith("/points")
    );
    const body = JSON.parse(String(upsertCall?.[1]?.body));
    expect(body.points[0].payload.dataSource).toBe(CACHE_DATA_SOURCE);
    expect(body.points[0].payload.dataVersion).toBe(CACHE_DATA_VERSION);
  });
});
