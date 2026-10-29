import type {
  CitySearchResult,
  DailyPrices,
  PriceUpdate,
  Station,
  StationHistory,
  StationsResponse,
  ZoneHistory,
} from '../types/station';
import type { MapRegion } from '../types/map';
import type { FuelKey } from './fuels';

const STATIONS_CACHE_TTL_MS = 30 * 1000;
const HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;
const stationsCache = new Map<string, { expiresAt: number; value: StationsResponse }>();
// Requests rather than results: the zone summary and the station panel ask for the same zone
// history at the same time, and share one request.
const historyCache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();
const citiesCache = new Map<string, CitySearchResult[]>();

export function getApiBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  // `npm run dev`: Expo serves the app on :8081 and the API runs on :4000. A production build
  // is always served by the backend itself, so the API lives on the same origin.
  if (__DEV__ || typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  return window.location.origin;
}

export async function fetchStations({
  forceRefresh = false,
  fuel,
  limit,
  region,
  signal,
  version,
}: {
  forceRefresh?: boolean;
  fuel: FuelKey;
  limit: number;
  region: MapRegion;
  signal?: AbortSignal;
  /** Version of the official data the caller expects; a new one bypasses the local cache. */
  version?: string | null;
}) {
  const params = new URLSearchParams({
    fuel,
    latitude: region.latitude.toFixed(4),
    latitudeDelta: region.latitudeDelta.toFixed(4),
    limit: String(limit),
    longitude: region.longitude.toFixed(4),
    longitudeDelta: region.longitudeDelta.toFixed(4),
  });
  // The version is part of the URL so neither this cache nor the browser's HTTP cache can
  // serve prices older than the data the server announced.
  if (version) {
    params.set('v', version);
  }

  const cacheKey = params.toString();
  const cached = stationsCache.get(cacheKey);

  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (forceRefresh) {
    params.set('forceRefresh', '1');
  }

  const response = await fetch(`${getApiBaseUrl()}/api/stations?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const value = (await response.json()) as StationsResponse;

  stationsCache.set(cacheKey, { expiresAt: Date.now() + STATIONS_CACHE_TTL_MS, value });

  for (const [key, entry] of stationsCache) {
    if (entry.expiresAt <= Date.now()) {
      stationsCache.delete(key);
    }
  }

  return value;
}

export async function fetchStation(stationId: number) {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/stations/${stationId}`);

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as { fetchedAt: string; station: Station };
  } catch {
    return null;
  }
}

/** Daily prices of the stations in the area over the last year. */
export function fetchZoneHistory({
  fuel,
  region,
  version,
}: {
  fuel: FuelKey;
  region: MapRegion;
  version?: string | null;
}): Promise<ZoneHistory> {
  const params = new URLSearchParams({
    fuel,
    latitude: region.latitude.toFixed(4),
    latitudeDelta: region.latitudeDelta.toFixed(4),
    longitude: region.longitude.toFixed(4),
    longitudeDelta: region.longitudeDelta.toFixed(4),
  });

  if (version) {
    params.set('v', version);
  }

  return fetchHistory(`/api/history?${params.toString()}`, (raw: ZoneHistory) => ({
    ...raw,
    mean: toEuros(raw.mean),
    min: toEuros(raw.min),
    national: toEuros(raw.national),
  }));
}

/** Daily prices of one station over the last year, for each fuel it sold. */
export function fetchStationHistory(stationId: number, version?: string | null): Promise<StationHistory> {
  return fetchHistory(`/api/stations/${stationId}/history${version ? `?v=${encodeURIComponent(version)}` : ''}`, (raw: StationHistory) => ({
    ...raw,
    fuels: Object.fromEntries(Object.entries(raw.fuels).map(([fuel, values]) => [fuel, toEuros(values)])),
  }));
}

function fetchHistory<Raw, Value>(path: string, convert: (raw: Raw) => Value): Promise<Value> {
  const cached = historyCache.get(path);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as Promise<Value>;
  }

  const value = fetch(`${getApiBaseUrl()}${path}`).then(async (response) => {
    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    return convert((await response.json()) as Raw);
  });

  historyCache.set(path, { expiresAt: Date.now() + HISTORY_CACHE_TTL_MS, value });
  // A failed request (the server is still reading the archives) must be retried, not cached.
  value.catch(() => historyCache.delete(path));

  for (const [key, entry] of historyCache) {
    if (entry.expiresAt <= Date.now()) {
      historyCache.delete(key);
    }
  }

  return value;
}

/** The API sends thousandths of a euro, which keeps a year of prices small. */
function toEuros(values: DailyPrices) {
  return values.map((value) => (value == null ? null : value / 1000));
}

const LIVE_FALLBACK_POLL_MS = 60 * 1000;

/**
 * Tells the caller whenever the server loads a new version of the official prices. Uses a
 * Server-Sent Events stream, and falls back to polling /api/health when it is unavailable.
 */
export function subscribeToPriceUpdates({
  onConnectionChange,
  onUpdate,
}: {
  onConnectionChange: (isLive: boolean) => void;
  onUpdate: (update: PriceUpdate) => void;
}) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let source: EventSource | null = null;

  const poll = async () => {
    try {
      const health = (await fetch(`${getApiBaseUrl()}/api/health`).then((response) => response.json())) as PriceUpdate;

      onUpdate({ ...health, changedPrices: 0 });
    } catch {
      // Offline: the next tick tries again.
    }
  };

  const startPolling = () => {
    if (!pollTimer) {
      pollTimer = setInterval(poll, LIVE_FALLBACK_POLL_MS);
    }
  };

  if (typeof EventSource === 'function') {
    source = new EventSource(`${getApiBaseUrl()}/api/live`);
    source.addEventListener('open', () => {
      onConnectionChange(true);

      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    });
    source.addEventListener('error', () => {
      onConnectionChange(false);
      startPolling();
    });
    // "status" arrives on every (re)connection: it catches up on updates missed while offline.
    source.addEventListener('status', (event) => onUpdate({ ...JSON.parse((event as MessageEvent).data), changedPrices: 0 }));
    source.addEventListener('prices', (event) => onUpdate(JSON.parse((event as MessageEvent).data)));
  } else {
    startPolling();
  }

  return () => {
    source?.close();

    if (pollTimer) {
      clearInterval(pollTimer);
    }
  };
}

export async function searchCities(query: string, signal?: AbortSignal) {
  const key = query.trim().toLowerCase();

  if (key.length < 2) {
    return [];
  }

  const cached = citiesCache.get(key);

  if (cached) {
    return cached;
  }

  const response = await fetch(`${getApiBaseUrl()}/api/cities?q=${encodeURIComponent(query.trim())}`, { signal });

  if (!response.ok) {
    return [];
  }

  const results = (await response.json()) as CitySearchResult[];

  citiesCache.set(key, results);
  return results;
}

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string };

    if (payload.error) {
      return payload.error;
    }
  } catch {
    // Not JSON: keep the generic message.
  }

  return `Erreur ${response.status}`;
}
