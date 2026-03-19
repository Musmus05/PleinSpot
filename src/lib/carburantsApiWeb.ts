import { FuelFilter } from './fuels';
import { Station } from './carburantsApi';

type FetchStationsOptions = {
  forceRefresh?: boolean;
  fuelFilter: FuelFilter;
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

export async function fetchStationsInRegionWeb({
  forceRefresh = false,
  fuelFilter,
  limit = 220,
  region,
}: FetchStationsOptions) {
  const searchParams = new URLSearchParams({
    forceRefresh: forceRefresh ? '1' : '0',
    fuelFilter,
    latitude: String(region.latitude),
    latitudeDelta: String(region.latitudeDelta),
    limit: String(limit),
    longitude: String(region.longitude),
    longitudeDelta: String(region.longitudeDelta),
  });
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

  return (await response.json()) as BackendStationsResponse;
}

function getApiBaseUrl() {
  const configuredBaseUrl = getEnv('EXPO_PUBLIC_API_BASE_URL');

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

function getEnv(name: string) {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };

  return globalWithProcess.process?.env?.[name]?.trim();
}
