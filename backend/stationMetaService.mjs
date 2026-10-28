import Bunzip from 'seek-bzip';

// Station names and brands are not in the official feed. OpenStreetMap carries the official
// station id in `ref:FR:prix-carburants` on ~99.6% of French stations, and the OSM QA tool
// Osmose publishes that join every night. Data © OpenStreetMap contributors, ODbL.
const OSMOSE_URL =
  'https://osmose.openstreetmap.fr/export/osm_opendata/Prix%20des%20carburants%20en%20France-Analyser_Merge_Fuel_FR.byOSM.csv.bz2';
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 60 * 1000;
const DELETED_VALUE = /^DELETE TAG/;
const GENERIC_NAMES = /^(station[\s-]*(service)?|stations?[\s-]*services?|carburants?|fuel|gas station|ind[ée]pendant.*|sans enseigne)$/i;
const GENERIC_BRANDS = /^(ind[ée]pendant.*|independent|sans enseigne|aucune|none|station[\s-]*service|autre)$/i;

let metaById = new Map();
let validators = { etag: null, lastModified: null };
let refreshTimer = null;

export function startStationMetaRefresh() {
  if (refreshTimer) {
    return;
  }

  refreshStationMeta();
  refreshTimer = setInterval(refreshStationMeta, REFRESH_INTERVAL_MS);
  refreshTimer.unref?.();
}

/** { brand, name } for an official station id, or nulls when OpenStreetMap does not know it. */
export function getStationMeta(stationId) {
  return metaById.get(stationId) ?? EMPTY_META;
}

export function getStationMetaStatus() {
  return { stationMetaCount: metaById.size };
}

const EMPTY_META = Object.freeze({ brand: null, name: null });

async function refreshStationMeta() {
  try {
    const headers = {};

    if (validators.etag) {
      headers['If-None-Match'] = validators.etag;
    }

    if (validators.lastModified) {
      headers['If-Modified-Since'] = validators.lastModified;
    }

    const response = await fetch(OSMOSE_URL, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

    if (response.status === 304) {
      return;
    }

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const compressed = Buffer.from(await response.arrayBuffer());
    const csv = Bunzip.decode(compressed).toString('utf8');
    const next = buildMeta(csv);

    if (next.size > 0) {
      metaById = next;
      validators = { etag: response.headers.get('etag'), lastModified: response.headers.get('last-modified') };
      console.log(`[meta] ${next.size} station names and brands loaded from OpenStreetMap`);
    }
  } catch (error) {
    console.error('[meta] refresh failed:', error.message);
  }
}

function buildMeta(csv) {
  const rows = parseCsv(csv);
  const header = rows.shift() ?? [];
  const column = (name) => header.indexOf(name);
  const columns = {
    brand: column('brand'),
    name: column('name'),
    origin: column('osmose'),
    ref: column('ref:FR:prix-carburants'),
  };

  if (Object.values(columns).some((index) => index < 0)) {
    throw new Error('unexpected Osmose CSV header');
  }

  const meta = new Map();

  for (const row of rows) {
    // "opendata" rows are official stations with no OSM object: nothing to learn from them.
    if (!row[columns.origin]?.startsWith('osm')) {
      continue;
    }

    const brand = cleanValue(row[columns.brand], GENERIC_BRANDS);
    const name = cleanValue(row[columns.name], GENERIC_NAMES);

    if (!brand && !name) {
      continue;
    }

    for (const ref of String(row[columns.ref] ?? '').split(';')) {
      const id = Number(ref.trim());

      if (!Number.isInteger(id) || id <= 0) {
        continue;
      }

      // Duplicated refs exist (two OSM objects for one station): keep the one with a brand.
      const existing = meta.get(id);

      if (!existing || (!existing.brand && brand)) {
        meta.set(id, {
          brand,
          // A name that only repeats the brand adds nothing.
          name: name && brand && name.toLowerCase() === brand.toLowerCase() ? null : name,
        });
      }
    }
  }

  return meta;
}

function cleanValue(value, genericPattern) {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text || DELETED_VALUE.test(text) || genericPattern.test(text)) {
    return null;
  }

  return text;
}

// Minimal RFC 4180 parser: quoted fields, doubled quotes, commas and newlines inside quotes.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.endsWith('\r') ? field.slice(0, -1) : field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
