import { FuelSelection, getFuelSelectionQueryValue } from './fuels';
import { Station } from './carburantsApi';

type FetchStationsOptions = {
  forceRefresh?: boolean;
  fuelFilter: FuelSelection;
  limit?: number;
  region: {
    latitude: number;
    latitudeDelta: number;
    longitude: number;
    longitudeDelta: number;
  };
};

type BackendStationsResponse = {
  fetchedAt: string;
  stations: Station[];
};

type CacheEntry = {
  expiresAt: number;
  value: BackendStationsResponse;
};

const CLIENT_CACHE_TTL_MS = 20 * 1000;
const responseCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<BackendStationsResponse>>();

export async function fetchStationsInRegionWeb({
  forceRefresh = false,
  fuelFilter,
  limit = 220,
  region,
}: FetchStationsOptions) {
  const fuelFilterValue = getFuelSelectionQueryValue(fuelFilter);
  const cacheKey = getStationsCacheKey({
    fuelFilter: fuelFilterValue,
    limit,
    region,
  });

  if (!forceRefresh) {
    const cached = responseCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const inflight = inflightRequests.get(cacheKey);

    if (inflight) {
      return inflight;
    }
  }

  const searchParams = new URLSearchParams({
    forceRefresh: forceRefresh ? '1' : '0',
    fuelFilter: fuelFilterValue,
    latitude: String(region.latitude),
    latitudeDelta: String(region.latitudeDelta),
    limit: String(limit),
    longitude: String(region.longitude),
    longitudeDelta: String(region.longitudeDelta),
  });
  const request = loadStationsResponse(searchParams, cacheKey, forceRefresh);

  if (!forceRefresh) {
    inflightRequests.set(cacheKey, request);
  }

  try {
    return await request;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

function getApiBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4000';
    }

    return window.location.origin;
  }

  return 'http://localhost:4000';
}

async function loadStationsResponse(
  searchParams: URLSearchParams,
  cacheKey: string,
  forceRefresh: boolean,
) {
  const response = await fetch(`${getApiBaseUrl()}/api/stations?${searchParams.toString()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    let backendMessage = 'Le backend PleinSpot est indisponible.';

    try {
      const payload = (await response.json()) as { error?: string };

      if (payload.error) {
        backendMessage = payload.error;
      }
    } catch {
      // Ignore JSON parsing failures and keep generic message.
    }

    throw new Error(backendMessage);
  }

  const payload = (await response.json()) as BackendStationsResponse;

  if (!forceRefresh) {
    responseCache.set(cacheKey, {
      expiresAt: Date.now() + CLIENT_CACHE_TTL_MS,
      value: payload,
    });
  }

  pruneExpiredClientCache();

  return payload;
}

function getStationsCacheKey({
  fuelFilter,
  limit,
  region,
}: Omit<FetchStationsOptions, 'forceRefresh'>) {
  return [
    fuelFilter,
    limit,
    roundRegionValue(region.latitude, 3),
    roundRegionValue(region.longitude, 3),
    roundRegionValue(region.latitudeDelta, 3),
    roundRegionValue(region.longitudeDelta, 3),
  ].join(':');
}

function roundRegionValue(value: number, precision: number) {
  return value.toFixed(precision);
}

function pruneExpiredClientCache() {
  const now = Date.now();

  for (const [key, entry] of responseCache) {
    if (entry.expiresAt <= now) {
      responseCache.delete(key);
    }
  }
}
