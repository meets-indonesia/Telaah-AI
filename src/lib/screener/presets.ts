export interface ScreenerPreset {
  id: string;
  name: string;
  sector: string;
  maxPe: string;
  maxPb: string;
  minRsi: string;
  trend: string;
  createdAt: number;
}

const KEY = "telaah_screener_presets_v1";
const MAX_PRESETS = 20;

function isPreset(value: unknown): value is ScreenerPreset {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ScreenerPreset>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.sector === "string" &&
    typeof item.maxPe === "string" &&
    typeof item.maxPb === "string" &&
    typeof item.minRsi === "string" &&
    typeof item.trend === "string"
  );
}

export function loadPresets(): ScreenerPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isPreset) : [];
  } catch {
    return [];
  }
}

function persist(presets: ScreenerPreset[]): ScreenerPreset[] {
  localStorage.setItem(KEY, JSON.stringify(presets.slice(0, MAX_PRESETS)));
  window.dispatchEvent(new Event("telaah:storage"));
  return presets.slice(0, MAX_PRESETS);
}

export function savePreset(
  input: Omit<ScreenerPreset, "id" | "createdAt">
): ScreenerPreset[] {
  if (typeof window === "undefined") return [];
  const current = loadPresets();
  const existing = current.find(
    (item) => item.name.toLowerCase() === input.name.toLowerCase()
  );
  const preset: ScreenerPreset = {
    ...input,
    id: existing?.id ?? `preset_${Date.now().toString(36)}`,
    createdAt: existing?.createdAt ?? Date.now(),
  };
  const next = existing
    ? current.map((item) => (item.id === existing.id ? preset : item))
    : [preset, ...current];
  return persist(next);
}

export function removePreset(id: string): ScreenerPreset[] {
  if (typeof window === "undefined") return [];
  return persist(loadPresets().filter((item) => item.id !== id));
}
