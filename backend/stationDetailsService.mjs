// Station names and brands are not part of the open-data feed: they are only published on the
// official prix-carburants.gouv.fr station page. We read them on demand, politely: small
// concurrency, long cache, and a cooldown as soon as the site starts refusing requests.

const DETAILS_URL = 'https://www.prix-carburants.gouv.fr/station/';
const SUCCESS_TTL_MS = 24 * 60 * 60 * 1000;
const FAILURE_TTL_MS = 30 * 60 * 1000;
const COOLDOWN_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_CONCURRENT_REQUESTS = 3;
const MAX_CACHE_ENTRIES = 8000;

const cache = new Map();
const inflight = new Map();
const waitingQueue = [];
let activeRequests = 0;
let pausedUntil = 0;

const NAMED_ENTITIES = {
  agrave: 'à',
  amp: '&',
  apos: "'",
  acirc: 'â',
  ccedil: 'ç',
  eacute: 'é',
  ecirc: 'ê',
  egrave: 'è',
  euml: 'ë',
  gt: '>',
  icirc: 'î',
  iuml: 'ï',
  lt: '<',
  nbsp: ' ',
  ocirc: 'ô',
  quot: '"',
  rsquo: '’',
  ucirc: 'û',
  ugrave: 'ù',
  uuml: 'ü',
};

export async function getStationDetails(stationId) {
  const cached = readCache(stationId);

  if (cached !== undefined) {
    return cached;
  }

  if (Date.now() < pausedUntil) {
    return null;
  }

  const pending = inflight.get(stationId);

  if (pending) {
    return pending;
  }

  const request = withConcurrencyLimit(() => loadStationDetails(stationId))
    .then((details) => {
      writeCache(stationId, details, details ? SUCCESS_TTL_MS : FAILURE_TTL_MS);
      return details;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(stationId);
    });

  inflight.set(stationId, request);
  return request;
}

export async function getStationDetailsBatch(stationIds) {
  const entries = await Promise.all(stationIds.map(async (id) => [id, await getStationDetails(id)]));

  return Object.fromEntries(entries);
}

async function loadStationDetails(stationId) {
  if (Date.now() < pausedUntil) {
    return null;
  }

  const response = await fetch(`${DETAILS_URL}${stationId}`, {
    headers: {
      Accept: 'text/html',
      'Accept-Language': 'fr-FR,fr;q=0.9',
      'User-Agent': 'PleinSpot/1.0 (+comparateur de prix des carburants)',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 403 || response.status === 429 || response.status >= 500) {
    pausedUntil = Date.now() + COOLDOWN_MS;
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const name = extractText(html, /<p class="fr-h2[^"]*">([\s\S]*?)<\/p>/i);
  const brand = extractText(html, /<strong>\s*Marque\s*:\s*<\/strong>\s*([\s\S]*?)<br\s*\/?>/i);

  if (!name && !brand) {
    // Probably an anti-bot challenge page rather than a real station page.
    if (/incapsula|imperva|captcha/i.test(html)) {
      pausedUntil = Date.now() + COOLDOWN_MS;
    }

    return null;
  }

  return {
    brand,
    name,
  };
}

function withConcurrencyLimit(task) {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeRequests += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          activeRequests -= 1;
          waitingQueue.shift()?.();
        });
    };

    if (activeRequests < MAX_CONCURRENT_REQUESTS) {
      run();
    } else {
      waitingQueue.push(run);
    }
  });
}

function readCache(stationId) {
  const entry = cache.get(stationId);

  if (!entry) {
    return undefined;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(stationId);
    return undefined;
  }

  // Refresh LRU position.
  cache.delete(stationId);
  cache.set(stationId, entry);
  return entry.value;
}

function writeCache(stationId, value, ttl) {
  cache.set(stationId, {
    expiresAt: Date.now() + ttl,
    value,
  });

  while (cache.size > MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

function extractText(html, pattern) {
  const match = html.match(pattern);

  if (!match?.[1]) {
    return null;
  }

  const text = decodeHtmlEntities(match[1].replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

  return text || null;
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (entity, name) => NAMED_ENTITIES[name.toLowerCase()] ?? entity);
}
