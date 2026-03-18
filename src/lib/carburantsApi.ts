import { unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';

import { FuelFilter, FuelKey, FUEL_OPTIONS } from './fuels';

const API_URL = 'https://donnees.roulez-eco.fr/opendata/instantane';
const CACHE_TTL_MS = 60 * 1000;
const LAT_LON_SCALE = 100000;

type RawPrice = {
  id: string;
  maj: string;
  nom: string;
  valeur: string;
};

type RawRupture = {
  id: string;
  nom: string;
  type?: string;
};

type RawHour = {
  fermeture: string;
  ouverture: string;
};

type RawDay = {
  ferme?: string;
  horaire?: RawHour | RawHour[];
  id: string;
  nom: string;
};

type RawStation = {
  adresse?: string;
  cp: string;
  horaires?: {
    'automate-24-24'?: string;
    jour?: RawDay | RawDay[];
  };
  id: string;
  latitude: string;
  longitude: string;
  pop?: string;
  prix?: RawPrice | RawPrice[];
  rupture?: RawRupture | RawRupture[];
  services?: {
    service?: string | string[];
  };
  ville?: string;
};

type ParsedZip = {
  pdv_liste?: {
    pdv?: RawStation | RawStation[];
  };
};

export type Station = {
  address: string;
  automate24h: boolean;
  availableFuelLabels: string[];
  city: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  department: string;
  id: number;
  postcode: string;
  prices: Partial<Record<FuelKey, { updatedAt: string | null; value: number }>>;
  region: string;
  schedule: string;
  services: string[];
  unavailableFuelLabels: string[];
};

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

let cachedStations: Station[] | null = null;
let cacheFetchedAt: string | null = null;
let inflightLoad: Promise<{ fetchedAt: string; stations: Station[] }> | null = null;

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
}: FetchStationsOptions) {
  const { fetchedAt, stations } = await getCachedStations(forceRefresh);
  const visibleStations = stations.filter((station) => isStationVisible(station, region));
  const filteredByFuel =
    fuelFilter === 'all'
      ? visibleStations
      : visibleStations.filter((station) => station.prices[fuelFilter] != null);

  return {
    checkedAt: new Date().toISOString(),
    fetchedAt,
    stations: sortStationsByFuel(filteredByFuel, fuelFilter).slice(0, limit),
  };
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
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error("Le flux officiel des carburants n'est pas accessible.");
  }

  const zipBytes = new Uint8Array(await response.arrayBuffer());
  const files = unzipSync(zipBytes);
  const firstFileName = Object.keys(files)[0];

  if (!firstFileName) {
    throw new Error('Le flux officiel ne contient aucune donnee exploitable.');
  }

  const xml = decodeLatin1(files[firstFileName]);
  const parsed = parser.parse(xml) as ParsedZip;
  const rawStations = ensureArray(parsed.pdv_liste?.pdv);

  return {
    fetchedAt: new Date().toISOString(),
    stations: rawStations.map(mapStation).filter(Boolean) as Station[],
  };
}

function mapStation(raw: RawStation): Station | null {
  const latitude = Number(raw.latitude) / LAT_LON_SCALE;
  const longitude = Number(raw.longitude) / LAT_LON_SCALE;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const rawPrices = ensureArray(raw.prix);
  const rawRuptures = ensureArray(raw.rupture);
  const prices: Station['prices'] = {};

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

  const unavailableFuelLabels = rawRuptures
    .map((rupture) => rupture.nom?.trim())
    .filter(Boolean) as string[];

  return {
    address: normalizeText(raw.adresse) || 'Adresse non renseignee',
    automate24h: raw.horaires?.['automate-24-24'] === '1',
    availableFuelLabels: FUEL_OPTIONS.filter((fuel) => prices[fuel.key]).map((fuel) => fuel.label),
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
    services: ensureArray(raw.services?.service).map((service) => normalizeText(service)).filter(Boolean) as string[],
    unavailableFuelLabels,
  };
}

function isStationVisible(
  station: Station,
  region: FetchStationsOptions['region'],
) {
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

function mapFuelNameToKey(name: string): FuelKey | null {
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

function sortStationsByFuel(stations: Station[], fuelFilter: FuelFilter) {
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

function getComparablePrice(station: Station, fuelFilter: FuelFilter) {
  if (fuelFilter !== 'all') {
    return station.prices[fuelFilter]?.value ?? null;
  }

  let cheapest: number | null = null;

  for (const fuel of FUEL_OPTIONS) {
    const value = station.prices[fuel.key]?.value;

    if (value == null) {
      continue;
    }

    if (cheapest == null || value < cheapest) {
      cheapest = value;
    }
  }

  return cheapest;
}

function formatSchedule(value: RawDay | RawDay[] | undefined) {
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

function normalizeTimestamp(value: string | undefined) {
  if (!value) {
    return null;
  }

  return value.replace(' ', 'T');
}

function getDepartmentLabel(postcode: string) {
  const trimmed = postcode.trim();

  if (trimmed.length >= 2) {
    return `Dept. ${trimmed.slice(0, 2)}`;
  }

  return 'Dept. --';
}

function normalizeCity(value: string | undefined) {
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

function normalizeText(value: string | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function decodeLatin1(bytes: Uint8Array) {
  let result = '';
  const chunkSize = 8192;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    result += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return result;
}
