import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';

const API_URL = 'https://donnees.roulez-eco.fr/opendata/instantane';
const OUTPUT_FILE = join(process.cwd(), 'public', 'fuel-stations.json');
const LAT_LON_SCALE = 100000;

const parser = new XMLParser({
  allowBooleanAttributes: true,
  attributeNamePrefix: '',
  ignoreAttributes: false,
});

const response = await fetch(API_URL);

if (!response.ok) {
  throw new Error(`Failed to download official fuel data: ${response.status} ${response.statusText}`);
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
const stations = rawStations.map(mapStation).filter(Boolean);

await mkdir(join(process.cwd(), 'public'), { recursive: true });
await writeFile(
  OUTPUT_FILE,
  JSON.stringify(
    {
      fetchedAt: new Date().toISOString(),
      stations,
    },
    null,
    2,
  ),
  'utf8',
);

console.log(`Synced ${stations.length} stations to ${OUTPUT_FILE}`);

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
