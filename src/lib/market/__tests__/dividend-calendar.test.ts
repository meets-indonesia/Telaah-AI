import { describe, expect, it } from "vitest";
import { normalizeDividendCalendar } from "../dividend-calendar";

describe("normalizeDividendCalendar", () => {
  it("keeps dividend events and drops other calendar items", () => {
    const items = normalizeDividendCalendar([
      {
        title: "EAST",
        date: "2026-11-30",
        description: "tanggal Pembayaran Dividen Tunai Interim PT Eastparc Hotel Tbk",
      },
      {
        title: "AGRS",
        date: "2026-11-30",
        description: "Pemberitahuan RUPS Rencana PT Bank IBK Indonesia Tbk",
      },
      {
        title: "bad",
        date: "2026-11-30",
        description: "Dividen Tunai",
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      symbol: "EAST",
      date: "2026-11-30",
      description: "tanggal Pembayaran Dividen Tunai Interim PT Eastparc Hotel Tbk",
      kind: "Interim",
    });
  });

  it("sorts by date and detects annual dividends", () => {
    const items = normalizeDividendCalendar([
      { title: "BBRI", date: "2026-12-02", description: "Dividen Tunai Tahunan" },
      { title: "BBCA", date: "2026-11-28", description: "Dividen Tunai" },
    ]);
    expect(items.map((item) => item.symbol)).toEqual(["BBCA", "BBRI"]);
    expect(items[1].kind).toBe("Tahunan");
  });
});
