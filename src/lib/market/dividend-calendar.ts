export interface DividendCalendarItem {
  symbol: string;
  date: string;
  description: string;
  kind: "Interim" | "Tahunan" | "Dividen";
}

const DIVIDEND_PATTERN = /dividen|dividend/i;

function kindFor(description: string): DividendCalendarItem["kind"] {
  if (/interim/i.test(description)) return "Interim";
  if (/tahunan|final/i.test(description)) return "Tahunan";
  return "Dividen";
}

export function normalizeDividendCalendar(
  items: Array<Record<string, unknown>> | null | undefined
): DividendCalendarItem[] {
  return (items ?? [])
    .filter((item) =>
      DIVIDEND_PATTERN.test(
        `${item.description ?? ""} ${item.title ?? ""}`
      )
    )
    .map((item) => {
      const description = String(item.description ?? "").trim();
      return {
        symbol: String(item.title ?? "").trim().toUpperCase(),
        date: String(item.date ?? "").trim(),
        description,
        kind: kindFor(description),
      };
    })
    .filter(
      (item) =>
        /^[A-Z]{4}$/.test(item.symbol) &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date)
    )
    .sort((left, right) => left.date.localeCompare(right.date));
}
