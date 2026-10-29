import { mkdir, readFile, rename, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setImmediate as yieldToEventLoop } from 'node:timers/promises';
import { Unzip, UnzipInflate } from 'fflate';

import { FUEL_KEYS, FUEL_NAME_TO_KEY, parsePriceValue } from './fuels.mjs';

// One archive per year with every price each station declared, rebuilt every night by the ministry.
const ARCHIVE_URL = 'https://donnees.roulez-eco.fr/opendata/annee';
// Archives are kept on disk: a restart on the same day, or the previous year's file, costs a
// HEAD request instead of 30 MB.
const CACHE_DIR = process.env.HISTORY_CACHE_DIR || join(tmpdir(), 'pleinspot-history');
const DAY_MS = 24 * 60 * 60 * 1000;
// Today and the 365 days before.
const HISTORY_DAYS = 366;
// A declared price stays in force until the next declaration, for at most 30 days: the same
// cut-off as the live prices. The days stored before the window carry prices into its first day.
const MAX_CARRY_DAYS = 30;
const LEAD_DAYS = MAX_CARRY_DAYS + 1;
// Room for the days that pass before the next nightly reload.
const SPARE_DAYS = 7;
// A price this far from the national average of its day is a typing error ("1.250" for
// "2.250"): it would show up as the cheapest price of its area for weeks.
const MAX_DEVIATION_FROM_NATIONAL = 0.3;
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;
const HEAD_TIMEOUT_MS = 15 * 1000;
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const RETRY_DELAY_MS = 30 * 60 * 1000;
// Compressed bytes inflated between two yields to the event loop (about 5 MB of XML, ~40 ms).
const INFLATE_CHUNK_BYTES = 512 * 1024;

const FUEL_INDEX = Object.fromEntries(Object.entries(FUEL_NAME_TO_KEY).map(([name, key]) => [name, FUEL_KEYS.indexOf(key)]));

/**
 * Daily prices: for each station and fuel, the price in force at the end of each day, in
 * thousandths of a euro (0 = no price that day). Index 0 is `origin`, a day number since 1970.
 */
let history = null;
let inflightLoad = null;
let lastAttemptAt = 0;
let checkTimer = null;
let latestSnapshot = null;

const parisDateFormatter = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Paris',
  year: 'numeric',
});

export function startPriceHistory() {
  if (checkTimer) {
    return;
  }

  loadHistory();

  // Reloads once a day for the archive rebuilt overnight, and retries after a failed load.
  checkTimer = setInterval(() => {
    const isOutdated = !history || parisDay(Date.now()) > history.loadedDay;

    if (isOutdated && Date.now() - lastAttemptAt > RETRY_DELAY_MS) {
      loadHistory();
    }
  }, CHECK_INTERVAL_MS);
  checkTimer.unref?.();
}

/** Called with every new snapshot of the live feed: its prices become today's. */
export function recordSnapshot(snapshot) {
  latestSnapshot = snapshot;

  if (history) {
    writeToday(history, snapshot);
  }
}

export function getHistoryStatus() {
  return {
    historyFrom: history ? isoDay(history.origin + getWindow(history).start) : null,
    historyLoadedAt: history?.loadedAt ?? null,
    historySeries: history?.seriesCount ?? 0,
  };
}

/** Daily prices of one station over the last year, per fuel. Null while the archives load. */
export function getStationHistory(stationId) {
  if (!history) {
    return null;
  }

  const { size, start } = getWindow(history);
  const series = history.series.get(stationId);
  const fuels = {};

  FUEL_KEYS.forEach((key, fuelIndex) => {
    const values = series?.[fuelIndex];

    if (values?.subarray(start, start + size).some(Boolean)) {
      fuels[key] = toList(values, start, size);
    }
  });

  return { from: isoDay(history.origin + start), fuels };
}

/** Day by day, the average and lowest price of a set of stations, and the national average. */
export function getZoneHistory(stationIds, fuel) {
  if (!history) {
    return null;
  }

  const fuelIndex = FUEL_KEYS.indexOf(fuel);
  const { size, start } = getWindow(history);
  const count = new Array(size).fill(0);
  const sum = new Array(size).fill(0);
  const min = new Array(size).fill(null);

  for (const stationId of stationIds) {
    const values = history.series.get(stationId)?.[fuelIndex];

    if (!values) {
      continue;
    }

    for (let day = 0; day < size; day += 1) {
      const value = values[start + day];

      if (!value) {
        continue;
      }

      count[day] += 1;
      sum[day] += value;
      min[day] = min[day] == null ? value : Math.min(min[day], value);
    }
  }

  return {
    count,
    from: isoDay(history.origin + start),
    fuel,
    mean: sum.map((total, day) => (count[day] ? Math.round(total / count[day]) : null)),
    min,
    national: toList(history.national[fuelIndex], start, size),
  };
}

function loadHistory() {
  if (!inflightLoad) {
    lastAttemptAt = Date.now();
    inflightLoad = buildHistory()
      .then((next) => {
        history = next;

        if (latestSnapshot) {
          writeToday(history, latestSnapshot);
        }

        console.log(
          `[history] ${next.seriesCount} price series since ${isoDay(next.origin + LEAD_DAYS)}, loaded in ${Math.round((Date.now() - lastAttemptAt) / 1000)} s`,
        );
      })
      .catch((error) => {
        console.error('[history] load failed:', error.message);
      })
      .finally(() => {
        inflightLoad = null;
      });
  }

  return inflightLoad;
}

async function buildHistory() {
  const today = parisDay(Date.now());
  const origin = today - (HISTORY_DAYS - 1) - LEAD_DAYS;
  const store = {
    length: LEAD_DAYS + HISTORY_DAYS + SPARE_DAYS,
    loadedAt: new Date().toISOString(),
    loadedDay: today,
    national: [],
    origin,
    series: new Map(),
    seriesCount: 0,
  };

  for (let year = yearOf(origin); year <= yearOf(today); year += 1) {
    await readArchive(await downloadArchive(year), store);
  }

  fillForward(store, today - origin);
  discardOutliers(store, computeNational(store, today - origin), today - origin);
  store.national = computeNational(store, today - origin);

  return store;
}

async function downloadArchive(year) {
  const url = `${ARCHIVE_URL}/${year}`;
  const cachePath = join(CACHE_DIR, `PrixCarburants_annuel_${year}.zip`);
  const cached = await stat(cachePath).catch(() => null);

  // The server ignores If-Modified-Since: its Last-Modified, compared with the date given to
  // the cached copy, tells whether that copy is current. Unreachable server: the copy will do.
  if (cached) {
    const head = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(HEAD_TIMEOUT_MS) }).catch(() => null);
    const lastModified = Date.parse(head?.headers.get('last-modified') ?? '');

    if (!head?.ok || Math.abs(lastModified - cached.mtime.getTime()) < 1000) {
      return new Uint8Array(await readFile(cachePath));
    }
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(`Price archive ${year} unavailable: ${response.status} ${response.statusText}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  try {
    const partialPath = `${cachePath}.part`;
    const lastModified = Date.parse(response.headers.get('last-modified') ?? '');

    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(partialPath, bytes);

    // The copy takes the server's date, which the next load compares.
    if (Number.isFinite(lastModified)) {
      await utimes(partialPath, new Date(), new Date(lastModified));
    }

    // Renamed once complete, so an interrupted write never leaves a truncated archive behind.
    await rename(partialPath, cachePath);
  } catch (error) {
    console.error(`[history] could not cache the ${year} archive:`, error.message);
  }

  return bytes;
}

/**
 * Streams the XML out of the zip line by line: a year is about 350 MB of XML, far more than
 * the server should hold in memory at once. Records come in chronological order per station
 * and fuel, so the last one of a day is the price in force at the end of that day.
 */
async function readArchive(zipBytes, store) {
  const decoder = new TextDecoder('latin1');
  let carry = '';
  let fuels = null;
  let isComplete = false;

  const readLine = (text, start, end) => {
    let index = start;

    while (text.charCodeAt(index) === 32) {
      index += 1;
    }

    if (text.startsWith('<prix ', index)) {
      if (!fuels) {
        return;
      }

      const nameAt = text.indexOf('nom="', index) + 5;
      const fuelIndex = FUEL_INDEX[text.slice(nameAt, text.indexOf('"', nameAt))];
      const dateAt = text.indexOf('maj="', nameAt) + 5;
      const valueAt = text.indexOf('valeur="', dateAt) + 8;

      if (fuelIndex === undefined || dateAt < 5 || valueAt < 8 || valueAt > end) {
        return;
      }

      const day = dayNumber(text.slice(dateAt, dateAt + 10)) - store.origin;
      const price = parsePriceValue(text.slice(valueAt, text.indexOf('"', valueAt)));

      if (day < 0 || day >= store.length || price == null) {
        return;
      }

      if (!fuels[fuelIndex]) {
        fuels[fuelIndex] = new Uint16Array(store.length);
        store.seriesCount += 1;
      }

      fuels[fuelIndex][day] = Math.round(price * 1000);
    } else if (text.startsWith('<pdv ', index)) {
      const idAt = text.indexOf('id="', index) + 4;
      const stationId = Number(text.slice(idAt, text.indexOf('"', idAt)));

      fuels = null;

      if (Number.isFinite(stationId) && stationId > 0) {
        fuels = store.series.get(stationId) ?? new Array(FUEL_KEYS.length).fill(null);
        store.series.set(stationId, fuels);
      }
    }
  };

  const unzip = new Unzip((file) => {
    file.ondata = (error, data, final) => {
      if (error) {
        throw error;
      }

      const text = carry + decoder.decode(data, { stream: !final });
      let start = 0;
      let end;

      while ((end = text.indexOf('\n', start)) !== -1) {
        readLine(text, start, end);
        start = end + 1;
      }

      carry = text.slice(start);

      if (final) {
        readLine(carry, 0, carry.length);
        carry = '';
        isComplete = true;
      }
    };
    file.start();
  });

  unzip.register(UnzipInflate);

  for (let offset = 0; offset < zipBytes.length; offset += INFLATE_CHUNK_BYTES) {
    const chunkEnd = Math.min(offset + INFLATE_CHUNK_BYTES, zipBytes.length);

    unzip.push(zipBytes.subarray(offset, chunkEnd), chunkEnd === zipBytes.length);
    await yieldToEventLoop();
  }

  if (!isComplete) {
    throw new Error('Price archive is empty or truncated.');
  }
}

/** Days without a declaration keep the last declared price, for at most MAX_CARRY_DAYS days. */
function fillForward(store, lastDay) {
  for (const fuels of store.series.values()) {
    for (const values of fuels) {
      if (!values) {
        continue;
      }

      let carried = 0;
      let age = 0;

      for (let day = 0; day <= lastDay; day += 1) {
        if (values[day]) {
          carried = values[day];
          age = 0;
        } else if (carried && age < MAX_CARRY_DAYS) {
          values[day] = carried;
          age += 1;
        } else {
          carried = 0;
        }
      }
    }
  }
}

function discardOutliers(store, national, lastDay) {
  for (const fuels of store.series.values()) {
    fuels.forEach((values, fuelIndex) => {
      if (!values) {
        return;
      }

      for (let day = 0; day <= lastDay; day += 1) {
        if (values[day] && isOutlier(values[day], national[fuelIndex][day])) {
          values[day] = 0;
        }
      }
    });
  }
}

function isOutlier(value, nationalAverage) {
  return nationalAverage > 0 && Math.abs(value - nationalAverage) > nationalAverage * MAX_DEVIATION_FROM_NATIONAL;
}

function computeNational(store, lastDay) {
  return FUEL_KEYS.map((key, fuelIndex) => {
    const sum = new Float64Array(store.length);
    const count = new Uint32Array(store.length);
    const average = new Uint16Array(store.length);

    for (const fuels of store.series.values()) {
      const values = fuels[fuelIndex];

      if (!values) {
        continue;
      }

      for (let day = 0; day <= lastDay; day += 1) {
        if (values[day]) {
          sum[day] += values[day];
          count[day] += 1;
        }
      }
    }

    for (let day = 0; day <= lastDay; day += 1) {
      average[day] = count[day] ? Math.round(sum[day] / count[day]) : 0;
    }

    return average;
  });
}

function writeToday(store, snapshot) {
  const day = parisDay(Date.now()) - store.origin;

  if (day >= store.length) {
    return;
  }

  for (const station of snapshot.stations) {
    let fuels = store.series.get(station.id);

    FUEL_KEYS.forEach((key, fuelIndex) => {
      const price = station.prices[key];
      const nationalAverage = snapshot.national[key]?.average;

      if (!price || (nationalAverage && isOutlier(price.value, nationalAverage))) {
        return;
      }

      if (!fuels) {
        fuels = new Array(FUEL_KEYS.length).fill(null);
        store.series.set(station.id, fuels);
      }

      if (!fuels[fuelIndex]) {
        fuels[fuelIndex] = new Uint16Array(store.length);
        store.seriesCount += 1;
      }

      fuels[fuelIndex][day] = Math.round(price.value * 1000);
    });
  }

  FUEL_KEYS.forEach((key, fuelIndex) => {
    const average = snapshot.national[key]?.average;

    if (average != null) {
      store.national[fuelIndex][day] = Math.round(average * 1000);
    }
  });
}

/** The last HISTORY_DAYS days, today included, as indexes into the store. */
function getWindow(store) {
  const end = Math.min(parisDay(Date.now()) - store.origin, store.length - 1);

  return { size: HISTORY_DAYS, start: end - HISTORY_DAYS + 1 };
}

function toList(values, start, size) {
  return Array.from(values.subarray(start, start + size), (value) => value || null);
}

function parisDay(time) {
  return dayNumber(parisDateFormatter.format(time));
}

/** "2026-10-28" → days since 1970-01-01. */
function dayNumber(date) {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) / DAY_MS;
}

function isoDay(day) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function yearOf(day) {
  return new Date(day * DAY_MS).getUTCFullYear();
}
