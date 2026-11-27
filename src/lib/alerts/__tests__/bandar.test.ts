import { describe, expect, it } from "vitest";
import {
  formatBandarAlert,
  scanBandarPhases,
  type BandarAlertSource,
} from "../bandar";
import type {
  BrokerRegistryItem,
  BrokerSummaryResponse,
  ForeignFlowResponse,
} from "@/lib/sectors/types";

const registry: BrokerRegistryItem[] = [
  {
    code: "YP",
    name: "Foreign Institutional",
    is_foreign: true,
    cohort: "institutional",
    license_type: "",
  },
  {
    code: "CC",
    name: "Retail",
    is_foreign: false,
    cohort: "retail",
    license_type: "",
  },
];

const brokerSummary: BrokerSummaryResponse = {
  symbol: "TEST",
  start: "2026-11-25",
  end: "2026-11-25",
  coverage: "full",
  data: [
    {
      date: "2026-11-25",
      summary: [
        {
          broker_code: "YP",
          bfreq: 10,
          blot: 1_000_000,
          bval: 50_000_000_000,
          bavg_per_share: 1000,
          sfreq: 0,
          slot: 0,
          sval: 0,
          savg_per_share: 0,
          nlot: 1_000_000,
          nval: 50_000_000_000,
          navg_per_share: 1000,
        },
        {
          broker_code: "CC",
          bfreq: 0,
          blot: 0,
          bval: 0,
          bavg_per_share: 0,
          sfreq: 10,
          slot: 1_000_000,
          sval: 50_000_000_000,
          savg_per_share: 1000,
          nlot: -1_000_000,
          nval: -50_000_000_000,
          navg_per_share: 1000,
        },
      ],
    },
  ],
};

const foreignFlow: ForeignFlowResponse = {
  symbol: "TEST",
  data: [{ date: "2026-11-25", net_foreign_inflow: 50_000_000_000 }],
};

const source: BandarAlertSource = {
  getBrokersRegistry: async () => registry,
  getBrokerSummary: async () => brokerSummary,
  getForeignFlow: async () => foreignFlow,
};

describe("bandar phase alerts", () => {
  it("detects a strong accumulation phase", async () => {
    const hits = await scanBandarPhases(["TEST"], source);
    expect(hits).toHaveLength(1);
    expect(hits[0].summary.phase).toBe("Akumulasi Kuat");
    expect(hits[0].summary.controllingCohort).toBe("Asing / Institusi");
  });

  it("formats the phase with the compliance disclaimer", async () => {
    const [hit] = await scanBandarPhases(["TEST"], source);
    const message = formatBandarAlert(hit.symbol, hit.summary);
    expect(message).toContain("TEST");
    expect(message).toContain("Akumulasi Kuat");
    expect(message).toContain("bukan rekomendasi");
  });

  it("ignores neutral flow", async () => {
    const hits = await scanBandarPhases(["TEST"], {
      ...source,
      getBrokerSummary: async () => null,
      getForeignFlow: async () => null,
    });
    expect(hits).toHaveLength(0);
  });
});
