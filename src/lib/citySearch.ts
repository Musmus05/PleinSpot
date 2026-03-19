import { MapRegion } from '../types/map';

export type CitySearchResult = {
  id: string;
  label: string;
  region: MapRegion;
  subtitle: string;
};

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
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

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '0');
  url.searchParams.set('countrycodes', 'fr');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as NominatimResult[];
    const results = payload
      .map((entry, index) => mapCityResult(entry, index))
      .filter((entry): entry is CitySearchResult => entry != null);

    cityCache.set(normalizedQuery, results);
    return results;
  } catch {
    return [];
  }
}

function mapCityResult(entry: NominatimResult, index: number): CitySearchResult | null {
  const latitude = Number(entry.lat);
  const longitude = Number(entry.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const label = entry.name?.trim() || entry.display_name.split(',')[0]?.trim();
  const subtitle = entry.display_name
    .split(',')
    .slice(1, 3)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');

  if (!label) {
    return null;
  }

  return {
    id: `${label}-${latitude}-${longitude}-${index}`,
    label,
    region: {
      latitude,
      latitudeDelta: 0.18,
      longitude,
      longitudeDelta: 0.18,
    },
    subtitle,
  };
}
