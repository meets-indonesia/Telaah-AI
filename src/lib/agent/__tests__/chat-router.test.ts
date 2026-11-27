import { describe, expect, it } from "vitest";
import { detectNewTargetSymbol, extractValidTickers } from "../chat-router";

describe("extractValidTickers", () => {
  it("does not turn a lowercase sector word into the BANK ticker", () => {
    expect(extractValidTickers("berikan rekomendasi emiten bank")).toEqual([]);
    expect(extractValidTickers("emiten bank yang lain")).toEqual([]);
  });

  it("still accepts an explicit uppercase ticker", () => {
    expect(extractValidTickers("Analisis BANK")).toEqual(["BANK"]);
    expect(extractValidTickers("saham BBRI")).toEqual(["BBRI"]);
    expect(extractValidTickers("saham bbri")).toEqual(["BBRI"]);
  });

  it("keeps genuine lowercase tickers after a tag", () => {
    expect(extractValidTickers("emiten bbca")).toEqual(["BBCA"]);
  });

  it("does not treat a sector word as a new target", () => {
    expect(detectNewTargetSymbol("emiten bank yang lain", "BANK")).toBeNull();
  });
});
