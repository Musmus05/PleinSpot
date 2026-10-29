import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib';

import { searchCities } from './citySearchService.mjs';
import {
  fetchStationsInRegion,
  fetchZoneHistory,
  getDataStatus,
  getStationById,
  onPricesUpdate,
  startFuelDataRefresh,
} from './fuelDataService.mjs';
import { FUEL_KEYS } from './fuels.mjs';
import { getHistoryStatus, getStationHistory, startPriceHistory } from './priceHistoryService.mjs';
import { getStationMetaStatus, startStationMetaRefresh } from './stationMetaService.mjs';

const PORT = Number(process.env.PORT || 4000);
const DIST_DIR = resolve(process.cwd(), 'dist');
const INDEX_FILE = resolve(DIST_DIR, 'index.html');
const HAS_STATIC_BUILD = existsSync(INDEX_FILE);
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 400;
const COMPRESSIBLE_TYPES = /^(text\/|application\/(javascript|json|manifest\+json|xml)|image\/svg\+xml)/;
const compressedFileCache = new Map();
// Open "live" connections (Server-Sent Events) told when new official prices arrive.
const liveClients = new Set();
const MAX_LIVE_CLIENTS = 5000;
// Heroku's router closes connections idle for 55 s.
const LIVE_HEARTBEAT_MS = 25 * 1000;
// The yearly archives take a few seconds to download and read after each start.
const HISTORY_LOADING_MESSAGE = "L'historique des prix est en cours de chargement.";

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

const SECURITY_HEADERS = {
  'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
};

const indexTemplate = HAS_STATIC_BUILD ? await readFile(INDEX_FILE, 'utf8') : null;
const contentSecurityPolicy = indexTemplate ? buildContentSecurityPolicy(indexTemplate) : null;

const server = createServer(async (request, response) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.setHeader(name, value);
  }

  let url;

  try {
    url = new URL(request.url || '/', 'http://localhost');
  } catch {
    sendText(response, 400, 'Bad request.');
    return;
  }

  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApiRequest(request, response, url);
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      sendText(response, 405, 'Method not allowed.');
      return;
    }

    const wasServed = await serveStaticAsset(request, response, url.pathname);

    if (!wasServed) {
      sendText(response, 404, 'Not found.');
    }
  } catch (error) {
    console.error('[server] unexpected error:', error);

    if (!response.headersSent) {
      sendJson(request, response, 500, { error: 'Unexpected server error.' });
    } else {
      response.end();
    }
  }
});

async function handleApiRequest(request, response, url) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(request, response, 405, { error: 'Method not allowed.' });
    return;
  }

  const { pathname, searchParams } = url;

  if (pathname === '/api/health') {
    sendJson(
      request,
      response,
      200,
      { ok: true, service: 'pleinspot-backend', ...getDataStatus(), ...getStationMetaStatus(), ...getHistoryStatus() },
      'no-store',
    );
    return;
  }

  if (pathname === '/api/live') {
    openLiveStream(request, response);
    return;
  }

  if (pathname === '/api/stations') {
    const region = readRegion(searchParams);

    if (!isValidRegion(region)) {
      sendJson(request, response, 400, { error: 'Missing or invalid region query parameters.' });
      return;
    }

    const fuel = parseFuel(searchParams.get('fuel'));

    if (!fuel) {
      sendJson(request, response, 400, { error: `Unknown fuel. Expected one of: ${FUEL_KEYS.join(', ')}.` });
      return;
    }

    try {
      const result = await fetchStationsInRegion({
        forceRefresh: searchParams.get('forceRefresh') === '1',
        fuel,
        limit: clamp(Number(searchParams.get('limit')) || DEFAULT_LIMIT, 1, MAX_LIMIT),
        region,
      });

      sendJson(request, response, 200, result, 'public, max-age=60');
    } catch (error) {
      console.error('[api] stations failed:', error.message);
      sendJson(request, response, 503, { error: 'Les données officielles sont momentanément indisponibles.' });
    }
    return;
  }

  if (pathname === '/api/history') {
    const region = readRegion(searchParams);
    const fuel = parseFuel(searchParams.get('fuel'));

    if (!isValidRegion(region) || !fuel) {
      sendJson(request, response, 400, { error: 'Missing or invalid region or fuel query parameters.' });
      return;
    }

    try {
      const result = await fetchZoneHistory({ fuel, region });

      if (!result) {
        sendJson(request, response, 503, { error: HISTORY_LOADING_MESSAGE }, 'no-store');
        return;
      }

      sendJson(request, response, 200, result, 'public, max-age=300');
    } catch (error) {
      console.error('[api] history failed:', error.message);
      sendJson(request, response, 503, { error: 'Les données officielles sont momentanément indisponibles.' });
    }
    return;
  }

  const stationHistoryMatch = /^\/api\/stations\/(\d{1,12})\/history$/.exec(pathname);

  if (stationHistoryMatch) {
    const result = getStationHistory(Number(stationHistoryMatch[1]));

    if (!result) {
      sendJson(request, response, 503, { error: HISTORY_LOADING_MESSAGE }, 'no-store');
      return;
    }

    sendJson(request, response, 200, result, 'public, max-age=300');
    return;
  }

  const stationMatch = /^\/api\/stations\/(\d{1,12})$/.exec(pathname);

  if (stationMatch) {
    const result = await getStationById(Number(stationMatch[1]));

    if (!result) {
      sendJson(request, response, 404, { error: 'Station not found.' });
      return;
    }

    sendJson(request, response, 200, result, 'public, max-age=60');
    return;
  }

  if (pathname === '/api/cities') {
    try {
      sendJson(request, response, 200, await searchCities(searchParams.get('q') ?? ''), 'public, max-age=86400');
    } catch {
      sendJson(request, response, 200, [], 'no-store');
    }
    return;
  }

  sendJson(request, response, 404, { error: 'Not found.' });
}

async function serveStaticAsset(request, response, pathname) {
  if (!HAS_STATIC_BUILD) {
    return false;
  }

  const filePath = resolveStaticPath(pathname);

  if (filePath && filePath !== INDEX_FILE && (await isFile(filePath))) {
    await sendFile(request, response, filePath);
    return true;
  }

  // Single-page app: every route without a file extension renders the app shell.
  if (pathname === '/' || pathname === '/index.html' || !extname(pathname)) {
    sendIndex(request, response);
    return true;
  }

  return false;
}

function openLiveStream(request, response) {
  if (liveClients.size >= MAX_LIVE_CLIENTS) {
    // EventSource retries on its own; the client also falls back to polling.
    sendJson(request, response, 503, { error: 'Too many live connections.' });
    return;
  }

  response.writeHead(200, {
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream; charset=utf-8',
    'X-Accel-Buffering': 'no',
  });
  response.write('retry: 5000\n\n');
  writeLiveEvent(response, 'status', getDataStatus());
  liveClients.add(response);
  request.on('close', () => liveClients.delete(response));
}

function writeLiveEvent(response, event, payload) {
  response.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

onPricesUpdate((update) => {
  for (const client of liveClients) {
    writeLiveEvent(client, 'prices', update);
  }
});

setInterval(() => {
  for (const client of liveClients) {
    client.write(': ping\n\n');
  }
}, LIVE_HEARTBEAT_MS).unref();

function sendIndex(request, response) {
  const origin = getPublicOrigin(request);
  const html = indexTemplate.replaceAll('__ORIGIN__', origin);

  response.setHeader('Content-Security-Policy', contentSecurityPolicy);
  sendBody(request, response, 200, Buffer.from(html), CONTENT_TYPES['.html'], 'no-cache');
}

function resolveStaticPath(pathname) {
  try {
    const decodedPath = decodeURIComponent(pathname);
    const candidatePath = resolve(DIST_DIR, `.${decodedPath}`);

    if (candidatePath !== DIST_DIR && !candidatePath.startsWith(`${DIST_DIR}${sep}`)) {
      return null;
    }

    return candidatePath;
  } catch {
    return null;
  }
}

async function isFile(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function sendFile(request, response, filePath) {
  const contentType = CONTENT_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  const body = await readFile(filePath);

  sendBody(request, response, 200, body, contentType, getCacheControl(filePath), filePath);
}

function sendJson(request, response, statusCode, payload, cacheControl = 'no-store') {
  sendBody(request, response, statusCode, Buffer.from(JSON.stringify(payload)), CONTENT_TYPES['.json'], cacheControl);
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(message);
}

function sendBody(request, response, statusCode, body, contentType, cacheControl, cacheKey) {
  const encoding = COMPRESSIBLE_TYPES.test(contentType) && body.length > 1024 ? pickEncoding(request) : null;
  const payload = encoding ? compress(body, encoding, cacheKey) : body;
  const headers = {
    'Cache-Control': cacheControl,
    'Content-Length': payload.length,
    'Content-Type': contentType,
    Vary: 'Accept-Encoding',
  };

  if (encoding) {
    headers['Content-Encoding'] = encoding;
  }

  response.writeHead(statusCode, headers);
  response.end(request.method === 'HEAD' ? undefined : payload);
}

function pickEncoding(request) {
  const accepted = String(request.headers['accept-encoding'] ?? '');

  if (/\bbr\b/.test(accepted)) {
    return 'br';
  }

  if (/\bgzip\b/.test(accepted)) {
    return 'gzip';
  }

  return null;
}

function compress(body, encoding, cacheKey) {
  const key = cacheKey ? `${encoding}:${cacheKey}` : null;

  if (key && compressedFileCache.has(key)) {
    return compressedFileCache.get(key);
  }

  const compressed =
    encoding === 'br'
      ? brotliCompressSync(body, {
          params: {
            [zlibConstants.BROTLI_PARAM_QUALITY]: key ? 9 : 5,
            [zlibConstants.BROTLI_PARAM_SIZE_HINT]: body.length,
          },
        })
      : gzipSync(body, { level: key ? 9 : 6 });

  if (key) {
    compressedFileCache.set(key, compressed);
  }

  return compressed;
}

function getCacheControl(filePath) {
  const relativePath = filePath.slice(DIST_DIR.length).replaceAll('\\', '/');

  // Expo fingerprints everything under /_expo and /assets: those can be cached forever.
  if (relativePath.startsWith('/_expo/') || relativePath.startsWith('/assets/')) {
    return 'public, max-age=31536000, immutable';
  }

  return 'public, max-age=3600';
}

function getPublicOrigin(request) {
  const forwardedProto = String(request.headers['x-forwarded-proto'] ?? '').split(',')[0].trim();
  const protocol = forwardedProto || (request.socket.encrypted ? 'https' : 'http');
  const host = String(request.headers['x-forwarded-host'] ?? request.headers.host ?? `localhost:${PORT}`)
    .split(',')[0]
    .trim();

  return /^[a-z0-9.\-:[\]]+$/i.test(host) ? `${protocol}://${host}` : '';
}

function buildContentSecurityPolicy(html) {
  const inlineScriptHashes = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/gi)]
    // HTML parsers normalize CRLF and CR before checking inline script hashes.
    .map((match) => `'sha256-${createHash('sha256').update(match[1].replace(/\r\n?/g, '\n')).digest('base64')}'`)
    .join(' ');
  const apiOrigin = getOrigin(process.env.EXPO_PUBLIC_API_BASE_URL);
  const analytics = 'https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com';

  return [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHashes} https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    // Basemap: OpenFreeMap vector tiles, OpenStreetMap raster tiles as the no-WebGL fallback.
    `img-src 'self' data: blob: https://tiles.openfreemap.org https://tile.openstreetmap.org ${analytics}`,
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} https://tiles.openfreemap.org ${analytics}`.replace(/\s+/g, ' '),
    // MapLibre parses tiles in workers created from blob: URLs.
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "manifest-src 'self'",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

function getOrigin(value) {
  try {
    return value ? new URL(value).origin : '';
  } catch {
    return '';
  }
}

function readRegion(searchParams) {
  return {
    latitude: Number(searchParams.get('latitude')),
    latitudeDelta: Number(searchParams.get('latitudeDelta')),
    longitude: Number(searchParams.get('longitude')),
    longitudeDelta: Number(searchParams.get('longitudeDelta')),
  };
}

function isValidRegion(region) {
  return (
    Object.values(region).every(Number.isFinite) &&
    Math.abs(region.latitude) <= 90 &&
    Math.abs(region.longitude) <= 180 &&
    region.latitudeDelta > 0 &&
    region.longitudeDelta > 0 &&
    region.latitudeDelta <= 60 &&
    region.longitudeDelta <= 120
  );
}

function parseFuel(value) {
  const key = String(value ?? '').trim();

  return FUEL_KEYS.includes(key) ? key : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

server.listen(PORT, () => {
  console.log(
    HAS_STATIC_BUILD
      ? `PleinSpot listening on http://localhost:${PORT} with static web build`
      : `PleinSpot backend listening on http://localhost:${PORT}`,
  );
  startFuelDataRefresh();
  startStationMetaRefresh();
  startPriceHistory();
});

export { server };
