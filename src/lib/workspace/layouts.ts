export const WORKSPACE_PANELS = [
  "chart",
  "harmonic",
  "watchlist",
  "screener",
] as const;

export type WorkspacePanel = (typeof WORKSPACE_PANELS)[number];

export interface WorkspaceLayout {
  id: string;
  name: string;
  panels: WorkspacePanel[];
  symbol: string;
}

const STORAGE_KEY = "telaah_workspace_layouts_v1";
const LAST_KEY = "telaah_workspace_last_v2";
const MAX_CUSTOM = 10;

export const DEFAULT_LAYOUTS: WorkspaceLayout[] = [
  {
    id: "swing",
    name: "Swing",
    panels: ["chart", "harmonic", "watchlist", "screener"],
    symbol: "IHSG",
  },
  {
    id: "monitor",
    name: "Monitor",
    panels: ["chart", "watchlist", "screener", "harmonic"],
    symbol: "IHSG",
  },
  {
    id: "research",
    name: "Research",
    panels: ["chart", "harmonic", "screener", "watchlist"],
    symbol: "IHSG",
  },
];

export function validatePanels(value: unknown): WorkspacePanel[] {
  if (!Array.isArray(value)) return [...DEFAULT_LAYOUTS[0].panels];
  const panels: WorkspacePanel[] = [];
  for (const item of value) {
    if (
      typeof item === "string" &&
      (WORKSPACE_PANELS as readonly string[]).includes(item) &&
      !panels.includes(item as WorkspacePanel)
    ) {
      panels.push(item as WorkspacePanel);
    }
  }
  if (!panels.includes("chart")) panels.unshift("chart");
  for (const panel of WORKSPACE_PANELS) {
    if (!panels.includes(panel)) panels.push(panel);
  }
  return panels.slice(0, WORKSPACE_PANELS.length);
}

function normalizeLayout(value: unknown): WorkspaceLayout | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<WorkspaceLayout>;
  if (
    typeof item.id !== "string" ||
    typeof item.name !== "string" ||
    !item.name.trim() ||
    typeof item.symbol !== "string" ||
    !/^[A-Z]{4}$/.test(item.symbol)
  ) {
    return null;
  }
  return {
    id: item.id,
    name: item.name.trim().slice(0, 30),
    panels: validatePanels(item.panels),
    symbol: item.symbol,
  };
}

export function loadWorkspaceLayouts(): WorkspaceLayout[] {
  if (typeof window === "undefined") return [...DEFAULT_LAYOUTS];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const custom = Array.isArray(parsed)
      ? parsed
          .map(normalizeLayout)
          .filter((item): item is WorkspaceLayout => item !== null)
      : [];
    return [...DEFAULT_LAYOUTS, ...custom].slice(
      0,
      DEFAULT_LAYOUTS.length + MAX_CUSTOM
    );
  } catch {
    return [...DEFAULT_LAYOUTS];
  }
}

function persistCustom(layouts: WorkspaceLayout[]): WorkspaceLayout[] {
  if (typeof window === "undefined") return layouts;
  const custom = layouts.filter(
    (layout) => !DEFAULT_LAYOUTS.some((item) => item.id === layout.id)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom.slice(0, MAX_CUSTOM)));
  window.dispatchEvent(new Event("telaah:storage"));
  return [...DEFAULT_LAYOUTS, ...custom.slice(0, MAX_CUSTOM)];
}

export function saveWorkspaceLayout(
  name: string,
  panels: WorkspacePanel[],
  symbol: string
): WorkspaceLayout[] {
  const cleanName = name.trim().slice(0, 30);
  if (!cleanName) return loadWorkspaceLayouts();
  const current = loadWorkspaceLayouts();
  const existing = current.find(
    (layout) =>
      !DEFAULT_LAYOUTS.some((item) => item.id === layout.id) &&
      layout.name.toLowerCase() === cleanName.toLowerCase()
  );
  const layout: WorkspaceLayout = {
    id: existing?.id ?? `custom_${Date.now().toString(36)}`,
    name: cleanName,
    panels: validatePanels(panels),
    symbol: /^[A-Z]{4}$/.test(symbol) ? symbol : "IHSG",
  };
  const next = existing
    ? current.map((item) => (item.id === existing.id ? layout : item))
    : [...current, layout];
  return persistCustom(next);
}

export function deleteWorkspaceLayout(id: string): WorkspaceLayout[] {
  if (typeof window === "undefined") return [...DEFAULT_LAYOUTS];
  const next = loadWorkspaceLayouts().filter((layout) => layout.id !== id);
  return persistCustom(next);
}

export function loadLastWorkspace(): { layoutId: string; symbol: string } {
  if (typeof window === "undefined") {
    return { layoutId: "swing", symbol: "IHSG" };
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_KEY) || "{}") as {
      layoutId?: string;
      symbol?: string;
    };
    return {
      layoutId:
        typeof parsed.layoutId === "string" ? parsed.layoutId : "swing",
      symbol:
        typeof parsed.symbol === "string" && /^[A-Z]{4}$/.test(parsed.symbol)
          ? parsed.symbol
          : "IHSG",
    };
  } catch {
    return { layoutId: "swing", symbol: "IHSG" };
  }
}

export function saveLastWorkspace(layoutId: string, symbol: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    LAST_KEY,
    JSON.stringify({
      layoutId,
      symbol: /^[A-Z]{4}$/.test(symbol) ? symbol : "IHSG",
    })
  );
}
