import { unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';

const API_URL = 'https://donnees.roulez-eco.fr/opendata/instantane';
const CACHE_TTL_MS = 5 * 60 * 1000;
const REGION_CACHE_TTL_MS = 20 * 1000;
const LAT_LON_SCALE = 100000;
const FUEL_OPTIONS = ['gazole', 'sp95', 'e10', 'sp98', 'e85', 'gplc'];

let cachedStations = null;
let cacheFetchedAt = null;
let inflightLoad = null;
const regionResponseCache = new Map();

const parser = new XMLParser({
  allowBooleanAttributes: true,
  attributeNamePrefix: '',
  ignoreAttributes: false,
});

export async function fetchStationsInRegion({
  forceRefresh = false,
  fuelFilter,
  limit = 220,
  region,
}) {
  if (forceRefresh) {
    regionResponseCache.clear();
  }

  const { fetchedAt, stations } = await getCachedStations(forceRefresh);
  const regionCacheKey = getRegionCacheKey({
    fetchedAt,
    fuelFilter,
    limit,
    region,
  });

  if (!forceRefresh) {
    const cachedRegionResponse = regionResponseCache.get(regionCacheKey);

    if (cachedRegionResponse && cachedRegionResponse.expiresAt > Date.now()) {
      return cachedRegionResponse.value;
    }
  }

  const visibleStations = stations.filter((station) => isStationVisible(station, region));
  const filteredByFuel =
    fuelFilter === 'all'
      ? visibleStations
      : visibleStations.filter((station) => station.prices[fuelFilter] != null);

  const response = {
    fetchedAt,
    stations: sortStationsByFuel(filteredByFuel, fuelFilter).slice(0, limit),
  };

  if (!forceRefresh) {
    regionResponseCache.set(regionCacheKey, {
      expiresAt: Date.now() + REGION_CACHE_TTL_MS,
      value: response,
    });
  }

  pruneExpiredRegionCache();

  return response;
}

async function getCachedStations(forceRefresh = false) {
  if (!forceRefresh && cachedStations && cacheFetchedAt && Date.now() - Date.parse(cacheFetchedAt) < CACHE_TTL_MS) {
    return {
      fetchedAt: cacheFetchedAt,
      stations: cachedStations,
    };
  }

  if (!inflightLoad) {
    inflightLoad = loadStationsFromZip().finally(() => {
      inflightLoad = null;
    });
  }

  const result = await inflightLoad;
  cachedStations = result.stations;
  cacheFetchedAt = result.fetchedAt;
  return result;
}

async function loadStationsFromZip() {
  const response = await fetch(API_URL, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Official fuel feed unavailable: ${response.status} ${response.statusText}`);
  }

  const zipBytes = new Uint8Array(await response.arrayBuffer());
  const files = unzipSync(zipBytes);
  const firstFileName = Object.keys(files)[0];

  if (!firstFileName) {
    throw new Error('Official fuel archive is empty.');
  }

  const xml = decodeLatin1(files[firstFileName]);
  const parsed = parser.parse(xml);
  const rawStations = ensureArray(parsed?.pdv_liste?.pdv);

  return {
    fetchedAt: new Date().toISOString(),
    stations: rawStations.map(mapStation).filter(Boolean),
  };
}

function mapStation(raw) {
  const latitude = Number(raw.latitude) / LAT_LON_SCALE;
  const longitude = Number(raw.longitude) / LAT_LON_SCALE;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const rawPrices = ensureArray(raw.prix);
  const rawRuptures = ensureArray(raw.rupture);
  const prices = {};

  for (const price of rawPrices) {
    const fuelKey = mapFuelNameToKey(price.nom);

    if (!fuelKey) {
      continue;
    }

    const value = Number(price.valeur);

    if (!Number.isFinite(value)) {
      continue;
    }

    prices[fuelKey] = {
      updatedAt: normalizeTimestamp(price.maj),
      value,
    };
  }

  return {
    address: normalizeText(raw.adresse) || 'Adresse non renseignee',
    automate24h: raw.horaires?.['automate-24-24'] === '1',
    availableFuelLabels: Object.keys(prices),
    city: normalizeCity(raw.ville),
    coordinates: {
      latitude,
      longitude,
    },
    department: getDepartmentLabel(raw.cp),
    id: Number(raw.id),
    postcode: raw.cp || '--',
    prices,
    region: 'France',
    schedule: formatSchedule(raw.horaires?.jour),
    services: ensureArray(raw.services?.service).map((service) => normalizeText(service)).filter(Boolean),
    unavailableFuelLabels: rawRuptures.map((rupture) => normalizeText(rupture.nom)).filter(Boolean),
  };
}

function isStationVisible(station, region) {
  const latitudeDelta = Math.max(region.latitudeDelta, 0.03);
  const longitudeDelta = Math.max(region.longitudeDelta, 0.03);
  const south = region.latitude - latitudeDelta / 2;
  const north = region.latitude + latitudeDelta / 2;
  const west = region.longitude - longitudeDelta / 2;
  const east = region.longitude + longitudeDelta / 2;

  return (
    station.coordinates.latitude >= south &&
    station.coordinates.latitude <= north &&
    station.coordinates.longitude >= west &&
    station.coordinates.longitude <= east
  );
}

function sortStationsByFuel(stations, fuelFilter) {
  return [...stations].sort((left, right) => {
    const leftPrice = getComparablePrice(left, fuelFilter);
    const rightPrice = getComparablePrice(right, fuelFilter);

    if (leftPrice == null && rightPrice == null) {
      return 0;
    }

    if (leftPrice == null) {
      return 1;
    }

    if (rightPrice == null) {
      return -1;
    }

    return leftPrice - rightPrice;
  });
}

function getComparablePrice(station, fuelFilter) {
  if (fuelFilter !== 'all') {
    return station.prices[fuelFilter]?.value ?? null;
  }

  let cheapest = null;

  for (const fuelKey of FUEL_OPTIONS) {
    const value = station.prices[fuelKey]?.value;

    if (value == null) {
      continue;
    }

    if (cheapest == null || value < cheapest) {
      cheapest = value;
    }
  }

  return cheapest;
}

function mapFuelNameToKey(name) {
  switch (name) {
    case 'Gazole':
      return 'gazole';
    case 'SP95':
      return 'sp95';
    case 'E10':
      return 'e10';
    case 'SP98':
      return 'sp98';
    case 'E85':
      return 'e85';
    case 'GPLc':
      return 'gplc';
    default:
      return null;
  }
}

function formatSchedule(value) {
  const days = ensureArray(value);

  if (days.length === 0) {
    return '';
  }

  return days
    .map((day) => {
      if (day.ferme === '1') {
        return `${normalizeText(day.nom)} ferme`;
      }

      const ranges = ensureArray(day.horaire)
        .map((slot) => `${slot.ouverture.replace('.', ':')}-${slot.fermeture.replace('.', ':')}`)
        .join(' et ');

      return ranges ? `${normalizeText(day.nom)} ${ranges}` : normalizeText(day.nom);
    })
    .join(', ');
}

function normalizeTimestamp(value) {
  if (!value) {
    return null;
  }

  return value.replace(' ', 'T');
}

function getDepartmentLabel(postcode) {
  const trimmed = String(postcode || '').trim();

  if (trimmed.length >= 2) {
    return `Dept. ${trimmed.slice(0, 2)}`;
  }

  return 'Dept. --';
}

function normalizeCity(value) {
  const text = normalizeText(value);

  if (!text) {
    return 'Ville inconnue';
  }

  return text
    .toLowerCase()
    .split(/[\s-]+/)
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function decodeLatin1(bytes) {
  let result = '';
  const chunkSize = 8192;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    result += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return result;
}

function getRegionCacheKey({ fetchedAt, fuelFilter, limit, region }) {
  return [
    fetchedAt,
    fuelFilter,
    limit,
    roundRegionValue(region.latitude, 3),
    roundRegionValue(region.longitude, 3),
    roundRegionValue(region.latitudeDelta, 3),
    roundRegionValue(region.longitudeDelta, 3),
  ].join(':');
}

function roundRegionValue(value, precision) {
  return Number(value).toFixed(precision);
}

function pruneExpiredRegionCache() {
  const now = Date.now();

  for (const [key, entry] of regionResponseCache) {
    if (entry.expiresAt <= now) {
      regionResponseCache.delete(key);
    }
  }
}
