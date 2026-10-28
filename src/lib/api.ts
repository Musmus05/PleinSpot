import type { CitySearchResult, Station, StationDetails, StationsResponse } from '../types/station';
import type { MapRegion } from '../types/map';
import type { FuelKey } from './fuels';

const STATIONS_CACHE_TTL_MS = 30 * 1000;
const stationsCache = new Map<string, { expiresAt: number; value: StationsResponse }>();
const detailsCache = new Map<number, StationDetails | null>();
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
}: {
  forceRefresh?: boolean;
  fuel: FuelKey;
  limit: number;
  region: MapRegion;
  signal?: AbortSignal;
}) {
  const params = new URLSearchParams({
    fuel,
    latitude: region.latitude.toFixed(4),
    latitudeDelta: region.latitudeDelta.toFixed(4),
    limit: String(limit),
    longitude: region.longitude.toFixed(4),
    longitudeDelta: region.longitudeDelta.toFixed(4),
  });
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

    const payload = (await response.json()) as { details: StationDetails | null; station: Station };

    detailsCache.set(stationId, payload.details);
    return payload;
  } catch {
    return null;
  }
}

export function getCachedStationDetails(stationId: number) {
  return detailsCache.get(stationId);
}

/** Names and brands come from the official station pages, fetched lazily by the backend. */
export async function fetchStationDetails(stationIds: number[]) {
  const missing = stationIds.filter((id) => !detailsCache.has(id));

  if (missing.length > 0) {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/stations/details?ids=${missing.join(',')}`);

      if (response.ok) {
        const payload = (await response.json()) as Record<string, StationDetails | null>;

        for (const id of missing) {
          detailsCache.set(id, payload[id] ?? null);
        }
      }
    } catch {
      // Names are a nice-to-have: the list falls back to the city.
    }
  }

  return Object.fromEntries(stationIds.map((id) => [id, detailsCache.get(id) ?? null])) as Record<
    number,
    StationDetails | null
  >;
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
