const GEO_API_URL = 'https://geo.api.gouv.fr/communes';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 1000;
const REQUEST_TIMEOUT_MS = 5000;
const RESULT_LIMIT = 6;

const cache = new Map();

export async function searchCities(rawQuery) {
  const query = rawQuery.trim().replace(/\s+/g, ' ').slice(0, 80);

  if (query.length < 2) {
    return [];
  }

  const cacheKey = query.toLowerCase();
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const url = new URL(GEO_API_URL);

  if (/^\d{2,5}$/.test(query)) {
    // Postcode search: "75011", "690" ...
    if (query.length < 5) {
      return [];
    }

    url.searchParams.set('codePostal', query);
  } else {
    url.searchParams.set('nom', query);
    url.searchParams.set('boost', 'population');
  }

  url.searchParams.set('limit', String(RESULT_LIMIT));
  url.searchParams.set('fields', 'nom,code,codesPostaux,centre,departement,population');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  const searchedPostcode = url.searchParams.get('codePostal');
  const results = Array.isArray(payload)
    ? payload.map((entry) => mapCityResult(entry, searchedPostcode)).filter(Boolean).slice(0, RESULT_LIMIT)
    : [];

  cache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: results,
  });

  while (cache.size > MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }

  return results;
}

function mapCityResult(entry, searchedPostcode) {
  const coordinates = entry.centre?.coordinates;
  const longitude = Array.isArray(coordinates) ? Number(coordinates[0]) : NaN;
  const latitude = Array.isArray(coordinates) ? Number(coordinates[1]) : NaN;
  const label = entry.nom?.trim();

  if (!label || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const postcode = searchedPostcode ?? (Array.isArray(entry.codesPostaux) ? entry.codesPostaux[0] : '');
  const department = entry.departement?.nom?.trim();
  const population = Number(entry.population) || 0;
  // Bigger cities get a wider initial view so the comparison covers the whole agglomeration.
  const delta = population > 300000 ? 0.16 : population > 50000 ? 0.1 : 0.07;

  return {
    id: entry.code ?? `${label}-${latitude}-${longitude}`,
    label,
    region: {
      latitude,
      latitudeDelta: delta,
      longitude,
      longitudeDelta: delta * 1.4,
    },
    subtitle: [postcode, department].filter(Boolean).join(' · '),
  };
}
