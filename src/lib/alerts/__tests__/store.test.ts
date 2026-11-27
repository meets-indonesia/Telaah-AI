import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_ALERT_RULES,
  addAlertSymbol,
  loadAlertWatchlist,
  removeAlertSymbol,
  saveAlertWatchlist,
} from "../store";

const folders: string[] = [];

async function tempFile(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), "telaah-alerts-"));
  folders.push(folder);
  return path.join(folder, "watchlist.json");
}

afterEach(async () => {
  await Promise.all(
    folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true }))
  );
});

describe("alert watchlist store", () => {
  it("returns an empty list with default rules when the file is missing", async () => {
    const file = await tempFile();
    const data = await loadAlertWatchlist(file);
    expect(data.symbols).toEqual([]);
    expect(data.rules).toEqual(DEFAULT_ALERT_RULES);
  });

  it("adds unique uppercase symbols and persists them", async () => {
    const file = await tempFile();
    await addAlertSymbol("bbri", file);
    await addAlertSymbol("BBRI", file);
    await addAlertSymbol("bbca", file);

    const data = await loadAlertWatchlist(file);
    expect(data.symbols).toEqual(["BBRI", "BBCA"]);

    const raw = JSON.parse(await readFile(file, "utf8"));
    expect(raw.symbols).toEqual(["BBRI", "BBCA"]);
  });

  it("rejects invalid symbols and unknown rules", async () => {
    const file = await tempFile();
    await expect(addAlertSymbol("BRK.B", file)).rejects.toThrow();
    await expect(
      saveAlertWatchlist(
        {
          symbols: ["BBCA"],
          rules: { ...DEFAULT_ALERT_RULES, priceMovePct: 0 },
          updatedAt: new Date().toISOString(),
        },
        file
      )
    ).rejects.toThrow();
  });

  it("removes a symbol without touching the rest", async () => {
    const file = await tempFile();
    await addAlertSymbol("BBRI", file);
    await addAlertSymbol("BBCA", file);
    const remaining = await removeAlertSymbol("bbri", file);
    expect(remaining).toEqual(["BBCA"]);
  });
});
