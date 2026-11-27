import { describe, expect, it } from "vitest";
import { parseTerminalQuery, terminalCommands } from "../commands";

describe("terminal commands", () => {
  it("parses Bloomberg-style symbol commands", () => {
    expect(parseTerminalQuery("bbca go")?.href).toBe("/chart?symbol=BBCA");
    expect(parseTerminalQuery("BBCA HP")?.href).toBe("/chart?symbol=BBCA&tf=1Y");
    expect(parseTerminalQuery("BBCA HARM")?.href).toBe(
      "/chart?symbol=BBCA&tf=1Y&htf=1M"
    );
  });

  it("parses function commands and ignores empty input", () => {
    expect(parseTerminalQuery("harmonic")?.href).toBe("/harmonic");
    expect(parseTerminalQuery("  ")).toBeNull();
  });

  it("builds suggestions with symbols and functions", () => {
    const commands = terminalCommands("BBCA", [
      { symbol: "BBCA", name: "Bank Central Asia" },
      { symbol: "BBRI", name: "Bank Rakyat Indonesia" },
    ]);
    expect(commands[0].href).toBe("/chart?symbol=BBCA");
    expect(commands.some((item) => item.href === "/chart?symbol=BBRI")).toBe(true);
    expect(terminalCommands("harm", []).some((item) => item.href === "/harmonic")).toBe(true);
  });
});
