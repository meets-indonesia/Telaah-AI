import type { HarmonicCandle, HarmonicTimeframe } from "@/lib/quant/harmonic";
import type { DailyTransaction } from "@/lib/sectors/types";

function toCandle(row: DailyTransaction): HarmonicCandle {
  return {
    date: row.date,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
  };
}

function aggregateByKey(
  rows: DailyTransaction[],
  keyFor: (row: DailyTransaction) => string
): HarmonicCandle[] {
  const groups = new Map<string, HarmonicCandle>();

  for (const row of rows) {
    const key = keyFor(row);
    const current = groups.get(key);
    if (!current) {
      groups.set(key, toCandle(row));
      continue;
    }
    current.high = Math.max(current.high, row.high);
    current.low = Math.min(current.low, row.low);
    current.close = row.close;
    current.volume += row.volume;
    current.date = row.date;
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, candle]) => candle);
}

function weeklyKey(date: string): string {
  const day = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  const offset = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - offset);
  return day.toISOString().slice(0, 10);
}

export function aggregateToWeekly(rows: DailyTransaction[]): HarmonicCandle[] {
  return aggregateByKey(rows, (row) => weeklyKey(row.date));
}

export function aggregateToMonthly(rows: DailyTransaction[]): HarmonicCandle[] {
  return aggregateByKey(rows, (row) => row.date.slice(0, 7));
}

const JAKARTA_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
});

function jakartaParts(date: string): { day: string; hour: number } {
  const parts = JAKARTA_PARTS.formatToParts(new Date(date));
  const pick = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: `${pick("year")}-${pick("month")}-${pick("day")}`,
    hour: Number(pick("hour")),
  };
}

function jakartaSessionKey(date: string): string {
  const { day, hour } = jakartaParts(date);
  return `${day}-${hour < 12 ? "AM" : "PM"}`;
}

/**
 * Yahoo returns 1-hour bars. IDX has a midday break, so grouping by Jakarta
 * calendar date plus morning/afternoon gives two usable 4H session candles
 * per trading day instead of a misleading rolling window.
 */
export function aggregateToFourHour(rows: DailyTransaction[]): HarmonicCandle[] {
  return aggregateByKey(rows, (row) => jakartaSessionKey(row.date));
}

/**
 * Yahoo's daily chart can lag the hourly feed by one session. Aggregating the
 * hourly bars gives a daily candle for that missing session, so the brief's
 * price and the chart agree.
 */
export function aggregateHourlyToDaily(
  rows: DailyTransaction[]
): DailyTransaction[] {
  const groups = new Map<string, DailyTransaction>();

  for (const row of rows) {
    const date = jakartaParts(row.date).day;
    const current = groups.get(date);
    if (!current) {
      groups.set(date, { ...row, date });
      continue;
    }
    current.high = Math.max(current.high, row.high);
    current.low = Math.min(current.low, row.low);
    current.close = row.close;
    current.volume += row.volume;
  }

  return [...groups.values()].sort((left, right) =>
    left.date.localeCompare(right.date)
  );
}

/**
 * Only newer sessions are appended. An existing daily candle is kept because
 * it is the more complete/authoritative bar for that date.
 */
export function mergeHourlyIntoDaily(
  daily: DailyTransaction[],
  hourly: DailyTransaction[]
): DailyTransaction[] {
  const sortedDaily = [...daily].sort((left, right) =>
    left.date.localeCompare(right.date)
  );
  if (sortedDaily.length === 0) return aggregateHourlyToDaily(hourly);

  const lastDate = sortedDaily[sortedDaily.length - 1].date;
  const newer = aggregateHourlyToDaily(hourly).filter(
    (row) => row.date > lastDate
  );
  return [...sortedDaily, ...newer];
}

export function buildTimeframeCandles(
  rows: DailyTransaction[],
  timeframe: HarmonicTimeframe
): HarmonicCandle[] {
  if (timeframe === "4H") return aggregateToFourHour(rows);
  if (timeframe === "1W") return aggregateToWeekly(rows);
  if (timeframe === "1M") return aggregateToMonthly(rows);
  return rows.map(toCandle);
}
