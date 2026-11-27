import { describe, expect, it } from "vitest";
import { JII70_SYARIAH, filterSyariah, isSyariah } from "../syariah";

describe("BSJP syariah filter", () => {
  it("recognizes JII70 constituents", () => {
    expect(JII70_SYARIAH.size).toBe(70);
    expect(isSyariah("bris")).toBe(true);
    expect(isSyariah("TLKM")).toBe(true);
  });

  it("rejects conventional banks and non-constituents", () => {
    expect(isSyariah("BBCA")).toBe(false);
    expect(isSyariah("BBRI")).toBe(false);
  });

  it("filters a universe without changing ticker order", () => {
    expect(filterSyariah(["BBCA", "BRIS", "TLKM", "GOTO"])).toEqual([
      "BRIS",
      "TLKM",
    ]);
  });
});
