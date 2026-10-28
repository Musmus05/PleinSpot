import { unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';

import { getStationMeta } from './stationMetaService.mjs';

// Same feed as `instantane`, plus the <rupture> elements (the plain feed ships none).
// FUEL_FEED_URL lets a staging server or a test point at a copy of the feed.
const API_URL = process.env.FUEL_FEED_URL || 'https://donnees.roulez-eco.fr/opendata/instantane_ruptures';
// The ministry rebuilds the feed every 10 minutes. Checking every minute with a conditional
// request (an unchanged feed answers 304, a few hundred bytes) picks each build up within a minute.
const POLL_INTERVAL_MS = 60 * 1000;
const STALE_AFTER_MS = 15 * 60 * 1000;
const MIN_FORCED_REFRESH_GAP_MS = 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 45 * 1000;
const LAT_LON_SCALE = 100000;
const DAY_MS = 24 * 60 * 60 * 1000;
// Prices older than this are almost always stations that stopped declaring: showing them
// would push misleading "cheap" prices to the top of the comparison.
const MAX_PRICE_AGE_MS = 30 * DAY_MS;
// "Temporary" shortages declared months ago are, in practice, fuels the station no longer sells.
const MAX_RUPTURE_AGE_MS = 30 * DAY_MS;
const MIN_VALID_PRICE = 0.3;
const MAX_VALID_PRICE = 5;
const MIN_REGION_DELTA = 0.01;
const DISTRIBUTION_BINS = 24;
// Beyond this distance an OSM position may belong to a mis-tagged object: the official one stays.
const MAX_POSITION_CORRECTION_M = 3000;

export const FUEL_KEYS = ['gazole', 'e10', 'sp95', 'sp98', 'e85', 'gplc'];

const FUEL_NAME_TO_KEY = {
  E10: 'e10',
  E85: 'e85',
  GPLc: 'gplc',
  Gazole: 'gazole',
  SP95: 'sp95',
  SP98: 'sp98',
};

const LOWERCASE_PARTICLES = new Set(['au', 'aux', 'de', 'des', 'du', 'en', 'et', 'la', 'le', 'les', 'sous', 'sur']);
const UPPERCASE_WORDS = new Set(['bp', 'cc', 'cd', 'chu', 'rd', 'rn', 'za', 'zac', 'zae', 'zi']);

let snapshot = null;
let inflightLoad = null;
let lastLoadStartedAt = 0;
let refreshTimer = null;
const updateListeners = new Set();
// Validators of the last downloaded archive: an unchanged feed answers 304 and costs nothing.
let feedValidators = { etag: null, lastModified: null };

const parser = new XMLParser({
  allowBooleanAttributes: true,
  attributeNamePrefix: '',
  ignoreAttributes: false,
  parseAttributeValue: false,
  parseTagValue: false,
});

export function startFuelDataRefresh() {
  if (refreshTimer) {
    return;
  }

  loadSnapshot().catch((error) => {
    console.error('[fuel] initial load failed:', error.message);
  });

  refreshTimer = setInterval(() => {
    loadSnapshot().catch((error) => {
      console.error('[fuel] background refresh failed:', error.message);
    });
  }, POLL_INTERVAL_MS);
  refreshTimer.unref?.();
}

/** Called with { fetchedAt, publishedAt, changedPrices } every time new official data arrives. */
export function onPricesUpdate(listener) {
  updateListeners.add(listener);

  return () => updateListeners.delete(listener);
}

export function getDataStatus() {
  return {
    fetchedAt: snapshot?.fetchedAt ?? null,
    publishedAt: snapshot?.publishedAt ?? null,
    stationCount: snapshot?.stations.length ?? 0,
  };
}

export async function fetchStationsInRegion({ forceRefresh = false, fuel, limit, region }) {
  const { fetchedAt, national, publishedAt, stations } = await getSnapshot({ forceRefresh });
  const bounds = getRegionBounds(region);
  const inBounds = [];
  const overviewValues = Object.fromEntries(FUEL_KEYS.map((key) => [key, []]));

  for (const station of stations) {
    if (!isInBounds(getPosition(station), bounds)) {
      continue;
    }

    inBounds.push(station);

    for (const key of FUEL_KEYS) {
      const price = station.prices[key];

      if (price) {
        overviewValues[key].push(price.value);
      }
    }
  }

  const matching = inBounds
    .filter((station) => station.prices[fuel] != null)
    .sort((left, right) => compareByPrice(left, right, fuel));
  const stats = computeStats(overviewValues[fuel]);
  const overview = Object.fromEntries(
    FUEL_KEYS.map((key) => {
      const values = overviewValues[key];

      if (values.length === 0) {
        return [key, null];
      }

      return [key, { count: values.length, min: Math.min(...values) }];
    }),
  );

  return {
    distribution: computeDistribution(overviewValues[fuel], DISTRIBUTION_BINS),
    fetchedAt,
    fuel,
    national: national[fuel] ?? null,
    overview,
    publishedAt,
    stations: matching.slice(0, limit).map(withMeta),
    stats,
    total: matching.length,
  };
}

export async function getStationById(id) {
  const { byId, fetchedAt } = await getSnapshot();
  const station = byId.get(id) ?? null;

  return station ? { fetchedAt, station: withMeta(station) } : null;
}

function withMeta(station) {
  const { brand, name } = getStationMeta(station.id);

  return { ...station, brand, coordinates: getPosition(station), name };
}

/** The OpenStreetMap position when it plausibly is the same station, else the official one. */
function getPosition(station) {
  let best = station.coordinates;
  let bestDistance = MAX_POSITION_CORRECTION_M;

  for (const position of getStationMeta(station.id).positions) {
    const distance = distanceInMeters(station.coordinates, position);

    if (distance <= bestDistance) {
      best = position;
      bestDistance = distance;
    }
  }

  return best;
}

function distanceInMeters(from, to) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;

  return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

async function getSnapshot({ forceRefresh = false } = {}) {
  if (!snapshot) {
    return loadSnapshot();
  }

  const age = Date.now() - snapshot.loadedAt;
  const canForce = Date.now() - lastLoadStartedAt > MIN_FORCED_REFRESH_GAP_MS;

  if (forceRefresh && canForce) {
    return loadSnapshot().catch(() => snapshot);
  }

  if (age > STALE_AFTER_MS) {
    // Serve the current data right away and refresh in the background.
    loadSnapshot().catch((error) => {
      console.error('[fuel] stale refresh failed:', error.message);
    });
  }

  return snapshot;
}

function loadSnapshot() {
  if (!inflightLoad) {
    lastLoadStartedAt = Date.now();
    inflightLoad = downloadSnapshot()
      .then((nextSnapshot) => {
        if (nextSnapshot) {
          const previous = snapshot;
          const changedPrices = previous ? countChangedPrices(previous, nextSnapshot) : 0;

          snapshot = nextSnapshot;
          console.log(`[fuel] ${nextSnapshot.stations.length} stations loaded, ${changedPrices} prices changed`);

          if (previous) {
            notifyUpdate({ changedPrices, fetchedAt: snapshot.fetchedAt, publishedAt: snapshot.publishedAt });
          }
        } else {
          snapshot.loadedAt = Date.now();
        }

        return snapshot;
      })
      .finally(() => {
        inflightLoad = null;
      });
  }

  return inflightLoad;
}

/** Resolves to null when the feed has not changed since the current snapshot. */
async function downloadSnapshot() {
  const headers = {};

  if (snapshot && feedValidators.etag) {
    headers['If-None-Match'] = feedValidators.etag;
  }

  if (snapshot && feedValidators.lastModified) {
    headers['If-Modified-Since'] = feedValidators.lastModified;
  }

  const response = await fetch(API_URL, {
    cache: 'no-store',
    headers,
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  if (response.status === 304) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Official fuel feed unavailable: ${response.status} ${response.statusText}`);
  }

  feedValidators = {
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
  };

  const zipBytes = new Uint8Array(await response.arrayBuffer());
  const files = unzipSync(zipBytes);
  const firstFileName = Object.keys(files)[0];

  if (!firstFileName) {
    throw new Error('Official fuel archive is empty.');
  }

  const xml = new TextDecoder('latin1').decode(files[firstFileName]);
  const parsed = parser.parse(xml);
  const now = Date.now();
  const stations = [];

  for (const raw of ensureArray(parsed?.pdv_liste?.pdv)) {
    const station = mapStation(raw, now);

    if (station) {
      stations.push(station);
    }
  }

  const national = Object.fromEntries(
    FUEL_KEYS.map((key) => [
      key,
      computeStats(stations.map((station) => station.prices[key]?.value).filter((value) => value != null)),
    ]),
  );

  const lastModified = Date.parse(feedValidators.lastModified ?? '');

  return {
    byId: new Map(stations.map((station) => [station.id, station])),
    fetchedAt: new Date(now).toISOString(),
    loadedAt: now,
    national,
    // When the ministry built this file: what visitors care about, rather than our download time.
    publishedAt: new Date(Number.isFinite(lastModified) ? lastModified : now).toISOString(),
    stations,
  };
}

function countChangedPrices(previous, next) {
  let changed = 0;

  for (const station of next.stations) {
    const before = previous.byId.get(station.id);

    for (const key of FUEL_KEYS) {
      if (station.prices[key]?.value !== before?.prices[key]?.value) {
        changed += 1;
      }
    }
  }

  return changed;
}

function notifyUpdate(update) {
  for (const listener of updateListeners) {
    try {
      listener(update);
    } catch (error) {
      console.error('[fuel] update listener failed:', error.message);
    }
  }
}

function mapStation(raw, now) {
  const latitude = Number(raw.latitude) / LAT_LON_SCALE;
  const longitude = Number(raw.longitude) / LAT_LON_SCALE;
  const id = Number(raw.id);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(id)) {
    return null;
  }

  if (latitude === 0 && longitude === 0) {
    return null;
  }

  const prices = {};

  for (const price of ensureArray(raw.prix)) {
    const fuelKey = FUEL_NAME_TO_KEY[price.nom];

    if (!fuelKey) {
      continue;
    }

    let value = Number(price.valeur);

    // Older versions of the feed expressed prices in thousandths of a euro.
    if (value > 100) {
      value /= 1000;
    }

    if (!Number.isFinite(value) || value < MIN_VALID_PRICE || value > MAX_VALID_PRICE) {
      continue;
    }

    const updatedAt = parisLocalToIso(price.maj);

    if (updatedAt && now - Date.parse(updatedAt) > MAX_PRICE_AGE_MS) {
      continue;
    }

    prices[fuelKey] = {
      updatedAt,
      value: Math.round(value * 1000) / 1000,
    };
  }

  const postcode = String(raw.cp ?? '').trim();

  return {
    address: toDisplayCase(normalizeText(raw.adresse)) || 'Adresse non renseignée',
    automate24h: raw.horaires?.['automate-24-24'] === '1',
    city: toDisplayCase(normalizeText(raw.ville)) || 'Ville inconnue',
    coordinates: {
      latitude,
      longitude,
    },
    department: getDepartmentCode(postcode),
    highway: raw.pop === 'A',
    id,
    postcode: postcode || '—',
    prices,
    // A "définitive" rupture only means the station stopped selling that fuel (often years
    // ago): it is shown as "not sold". Only recent, ongoing temporary shortages are flagged.
    ruptures: ensureArray(raw.rupture)
      .map((rupture) => ({
        fuel: FUEL_NAME_TO_KEY[rupture.nom] ?? null,
        isOngoing: rupture.type === 'temporaire' && !rupture.fin,
        label: normalizeText(rupture.nom),
        since: parisLocalToIso(rupture.debut),
      }))
      .filter(
        (rupture) =>
          rupture.isOngoing &&
          rupture.label &&
          !(rupture.fuel && prices[rupture.fuel]) &&
          rupture.since &&
          now - Date.parse(rupture.since) < MAX_RUPTURE_AGE_MS,
      )
      .map(({ fuel, label, since }) => ({ fuel, label, since, type: 'temporaire' })),
    schedule: parseSchedule(raw.horaires?.jour),
    services: ensureArray(raw.services?.service).map(normalizeText).filter(Boolean),
  };
}

function parseSchedule(value) {
  return ensureArray(value)
    .map((day) => {
      const closed = day.ferme === '1';

      return {
        closed,
        day: Number(day.id),
        slots: closed
          ? []
          : ensureArray(day.horaire)
              .map((slot) => ({
                close: toClockTime(slot.fermeture),
                open: toClockTime(slot.ouverture),
              }))
              .filter((slot) => slot.open && slot.close),
      };
    })
    .filter((day) => day.day >= 1 && day.day <= 7)
    .sort((left, right) => left.day - right.day);
}

function toClockTime(value) {
  const match = /^(\d{1,2})[.:h](\d{2})$/.exec(String(value ?? '').trim());

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 24 || minutes > 59) {
    return null;
  }

  return `${String(hours).padStart(2, '0')}:${match[2]}`;
}

function compareByPrice(left, right, fuel) {
  const difference = left.prices[fuel].value - right.prices[fuel].value;

  if (difference !== 0) {
    return difference;
  }

  // Same price: favour the most recently confirmed one.
  return (Date.parse(right.prices[fuel].updatedAt ?? 0) || 0) - (Date.parse(left.prices[fuel].updatedAt ?? 0) || 0);
}

function computeStats(values) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const total = sorted.reduce((sum, value) => sum + value, 0);

  return {
    average: round3(total / sorted.length),
    count: sorted.length,
    max: sorted[sorted.length - 1],
    median: round3(quantile(sorted, 0.5)),
    min: sorted[0],
    p33: round3(quantile(sorted, 1 / 3)),
    p66: round3(quantile(sorted, 2 / 3)),
  };
}

// Price histogram of the area, drawn as the strip under the area summary.
function computeDistribution(values, binCount) {
  if (values.length === 0) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const bins = new Array(span < 0.001 ? 1 : binCount).fill(0);

  for (const value of values) {
    const index = span < 0.001 ? 0 : Math.min(bins.length - 1, Math.floor(((value - min) / span) * bins.length));

    bins[index] += 1;
  }

  return { bins, max, min };
}

function quantile(sorted, ratio) {
  const position = (sorted.length - 1) * ratio;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function getRegionBounds(region) {
  const latitudeDelta = Math.max(region.latitudeDelta, MIN_REGION_DELTA);
  const longitudeDelta = Math.max(region.longitudeDelta, MIN_REGION_DELTA);

  return {
    east: region.longitude + longitudeDelta / 2,
    north: region.latitude + latitudeDelta / 2,
    south: region.latitude - latitudeDelta / 2,
    west: region.longitude - longitudeDelta / 2,
  };
}

function isInBounds(coordinates, bounds) {
  return (
    coordinates.latitude >= bounds.south &&
    coordinates.latitude <= bounds.north &&
    coordinates.longitude >= bounds.west &&
    coordinates.longitude <= bounds.east
  );
}

const parisOffsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Paris',
  timeZoneName: 'longOffset',
});
const parisOffsetCache = new Map();

// The feed uses Paris wall-clock times without offset ("2026-10-28 08:27:46").
function parisLocalToIso(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(String(value ?? '').trim());

  if (!match) {
    return null;
  }

  const [, year, month, day, hours, minutes, seconds] = match;
  const hourKey = `${year}-${month}-${day}T${hours}`;
  let offset = parisOffsetCache.get(hourKey);

  if (!offset) {
    const instant = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes)));
    const zoneName = parisOffsetFormatter.formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value;

    offset = !zoneName || zoneName === 'GMT' ? '+00:00' : zoneName.replace('GMT', '');
    parisOffsetCache.set(hourKey, offset);
  }

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
}

function getDepartmentCode(postcode) {
  if (postcode.length < 2) {
    return '';
  }

  if (postcode.startsWith('97') || postcode.startsWith('98')) {
    return postcode.slice(0, 3);
  }

  return postcode.slice(0, 2);
}

// Turns "192 AVENUE LOUIS ROCHE" or "SAINT-SEVER" into "192 Avenue Louis Roche" / "Saint-Sever".
// Mixed-case values are left untouched: they were typed carefully by the station.
function toDisplayCase(value) {
  if (!value || value !== value.toUpperCase()) {
    return value;
  }

  let wordIndex = 0;

  return value.toLowerCase().replace(/[\p{L}\p{N}]+/gu, (word, offset, full) => {
    const isFirst = wordIndex === 0;
    const previous = full[offset - 1];

    wordIndex += 1;

    if (previous === "'" || previous === '’') {
      return word.length === 1 ? word : capitalize(word);
    }

    if (!isFirst && LOWERCASE_PARTICLES.has(word)) {
      return word;
    }

    if (UPPERCASE_WORDS.has(word)) {
      return word.toUpperCase();
    }

    if (word.length === 1 && /\p{L}/u.test(word) && (full[offset + 1] === "'" || full[offset + 1] === '’')) {
      return isFirst ? word.toUpperCase() : word;
    }

    return capitalize(word);
  });
}

function capitalize(word) {
  return `${word[0].toUpperCase()}${word.slice(1)}`;
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureArray(value) {
  if (value == null || value === '') {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}
