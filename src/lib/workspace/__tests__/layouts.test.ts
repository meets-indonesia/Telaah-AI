import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUTS, validatePanels } from "../layouts";

describe("workspace layouts", () => {
  it("keeps the chart panel and removes duplicates", () => {
    expect(validatePanels(["harmonic", "harmonic"])).toEqual([
      "chart",
      "harmonic",
      "watchlist",
      "screener",
    ]);
  });

  it("adds missing panels to a saved layout", () => {
    expect(validatePanels(["chart", "watchlist"])).toEqual([
      "chart",
      "watchlist",
      "harmonic",
      "screener",
    ]);
  });

  it("provides terminal presets", () => {
    expect(DEFAULT_LAYOUTS.map((layout) => layout.id)).toEqual([
      "swing",
      "monitor",
      "research",
    ]);
    expect(DEFAULT_LAYOUTS.every((layout) => layout.panels.includes("chart"))).toBe(
      true
    );
  });
});
