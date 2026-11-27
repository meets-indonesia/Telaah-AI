import { describe, expect, it } from "vitest";
import { przBandRect } from "../prz-band";

describe("przBandRect", () => {
  it("maps the PRZ bounds to a top-down rectangle", () => {
    expect(przBandRect(120, 220, 2)).toEqual({ top: 240, height: 200 });
  });

  it("keeps the rectangle valid when coordinates are inverted", () => {
    expect(przBandRect(220, 120, 1)).toEqual({ top: 120, height: 100 });
  });
});
