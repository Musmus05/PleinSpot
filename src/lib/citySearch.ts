import { MapRegion } from '../types/map';

export type CitySearchResult = {
  id: string;
  label: string;
  region: MapRegion;
  subtitle: string;
};

const cityCache = new Map<string, CitySearchResult[]>();

export async function searchCities(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const cached = cityCache.get(normalizedQuery);

  if (cached) {
    return cached;
  }

  const url = new URL(`${getApiBaseUrl()}/api/cities`);
  url.searchParams.set('q', query);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const results = (await response.json()) as CitySearchResult[];

    cityCache.set(normalizedQuery, results);
    return results;
  } catch {
    return [];
  }
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
