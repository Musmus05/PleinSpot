import { useEffect, useState } from 'react';

import type { DailyPrices } from '../types/station';
import type { AppLanguage } from './copy';
import { getLocale, keepWordsTogether } from './format';

export type HistoryRange = 30 | 90 | 365;

export const HISTORY_RANGES: HistoryRange[] = [30, 90, 365];
export const DEFAULT_HISTORY_RANGE: HistoryRange = 90;

const DAY_MS = 24 * 60 * 60 * 1000;
// The server is still reading the yearly archives for a few seconds after it starts.
const RETRY_DELAY_MS = 8 * 1000;
const MAX_RETRIES = 4;

export function isHistoryRange(value: unknown): value is HistoryRange {
  return HISTORY_RANGES.includes(value as HistoryRange);
}

export type HistoryLoad<T> = {
  data: T | null;
  /** True while newer data is loading: `data` is the previous one, shown dimmed. */
  isRefreshing: boolean;
  status: 'loading' | 'ready' | 'error';
};

/**
 * Loads history data for `key`, retrying while the server warms up. While the next data loads,
 * the previous one stays on screen if it has the same `scope` (the same station with fresher
 * prices, or the zone while the map moves), so the chart does not flash.
 */
export function useHistoryData<T>({
  debounceMs = 0,
  key,
  load,
  scope,
}: {
  debounceMs?: number;
  key: string | null;
  load: () => Promise<T>;
  scope: string;
}): HistoryLoad<T> {
  const [state, setState] = useState<{ data: T | null; scope: string; status: HistoryLoad<T>['status'] }>({
    data: null,
    scope,
    status: 'loading',
  });

  useEffect(() => {
    if (!key) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const attempt = (retry: number) => {
      load().then(
        (data) => {
          if (!cancelled) {
            setState({ data, scope, status: 'ready' });
          }
        },
        () => {
          if (cancelled) {
            return;
          }

          if (retry < MAX_RETRIES) {
            timeoutId = setTimeout(() => attempt(retry + 1), RETRY_DELAY_MS);
          } else {
            // The previous data belongs to another area or station: never show it as this one's.
            setState({ data: null, scope, status: 'error' });
          }
        },
      );
    };

    setState((current) => ({ data: current.scope === scope ? current.data : null, scope, status: 'loading' }));
    timeoutId = setTimeout(() => attempt(0), debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // `load` is rebuilt on every render; `key` identifies what it loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Until the effect runs, a new scope must not render the previous scope's data.
  const data = state.scope === scope ? state.data : null;
  const status = state.scope === scope ? state.status : 'loading';

  return {
    data,
    isRefreshing: status === 'loading' && data != null,
    status: data && status === 'loading' ? 'ready' : status,
  };
}

/** Calendar day `index` days after `from` ("2025-10-29"), at midnight UTC. */
export function dayAt(from: string, index: number) {
  return new Date(Date.parse(`${from}T00:00:00Z`) + index * DAY_MS);
}

/** Number of days from `from` to `to`, both "YYYY-MM-DD". */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** The last `range` days of a series that starts on `from`. */
export function takeRange(values: DailyPrices, from: string, range: HistoryRange) {
  const start = Math.max(0, values.length - range);

  return { start: dayAt(from, start), values: values.slice(start) };
}

/** `values` (starting on `from`) re-indexed to start on `target`, padded with nulls. */
export function alignTo(values: DailyPrices, from: string, target: string, length: number): DailyPrices {
  const offset = daysBetween(from, target);

  return Array.from({ length }, (_, index) => values[index + offset] ?? null);
}

export type SeriesSummary = {
  first: number;
  firstIndex: number;
  last: number;
  lastIndex: number;
  max: number;
  maxIndex: number;
  min: number;
  minIndex: number;
};

export function summarize(values: DailyPrices): SeriesSummary | null {
  let summary: SeriesSummary | null = null;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value == null) {
      continue;
    }

    if (!summary) {
      summary = { first: value, firstIndex: index, last: value, lastIndex: index, max: value, maxIndex: index, min: value, minIndex: index };
      continue;
    }

    summary.last = value;
    summary.lastIndex = index;

    // Ties keep the most recent day: "au plus bas le 12 oct." is the useful date.
    if (value <= summary.min) {
      summary.min = value;
      summary.minIndex = index;
    }

    if (value >= summary.max) {
      summary.max = value;
      summary.maxIndex = index;
    }
  }

  return summary;
}

/** Average of `values - reference` over the days both have a price. */
export function averageGap(values: DailyPrices, reference: DailyPrices) {
  let total = 0;
  let count = 0;

  values.forEach((value, index) => {
    const other = reference[index];

    if (value != null && other != null) {
      total += value - other;
      count += 1;
    }
  });

  return count > 0 ? total / count : null;
}

export type PriceChangeEntry = { delta: number; index: number; value: number };

/** Every day the price differs from the day before, oldest first. */
export function listPriceChanges(values: DailyPrices): PriceChangeEntry[] {
  const changes: PriceChangeEntry[] = [];
  let previous: number | null = null;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value == null) {
      continue;
    }

    if (previous != null && Math.abs(value - previous) >= 0.0005) {
      changes.push({ delta: value - previous, index, value });
    }

    previous = value;
  }

  return changes;
}

export type PeriodRow = { averages: Array<number | null>; endIndex: number; startIndex: number };

/**
 * Splits the period into weeks (1 and 3 months) or calendar months (1 year) and averages each
 * series over them: the table view of a chart.
 */
export function groupByPeriod(series: DailyPrices[], start: Date, range: HistoryRange): PeriodRow[] {
  const length = series[0]?.length ?? 0;
  const rows: PeriodRow[] = [];
  let rowStart = 0;

  for (let index = 1; index <= length; index += 1) {
    const day = new Date(start.getTime() + index * DAY_MS);
    const isBoundary = index === length || (range === 365 ? day.getUTCDate() === 1 : day.getUTCDay() === 1);

    if (isBoundary) {
      rows.push({
        averages: series.map((values) => average(values.slice(rowStart, index))),
        endIndex: index - 1,
        startIndex: rowStart,
      });
      rowStart = index;
    }
  }

  return rows;
}

function average(values: DailyPrices) {
  const present = values.filter((value): value is number => value != null);

  return present.length > 0 ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
}

/** "14 oct.", "mar. 14 oct. 2026", "oct. 2026", "oct." — history dates are calendar days in UTC. */
export function formatDay(date: Date, language: AppLanguage, style: 'short' | 'long' | 'month' | 'monthYear') {
  const options: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { day: 'numeric', month: 'short', weekday: 'short', year: 'numeric' }
      : style === 'month'
        ? { month: 'short' }
        : style === 'monthYear'
          ? { month: 'short', year: 'numeric' }
          : { day: 'numeric', month: 'short' };

  return keepWordsTogether(new Intl.DateTimeFormat(getLocale(language), { ...options, timeZone: 'UTC' }).format(date));
}
