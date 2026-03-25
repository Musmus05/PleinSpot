import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, normalize, resolve } from 'node:path';

import { fetchStationsInRegion } from './fuelDataService.mjs';

const PORT = Number(process.env.PORT || 4000);
const DIST_DIR = resolve(process.cwd(), 'dist');
const INDEX_FILE = resolve(DIST_DIR, 'index.html');
const HAS_STATIC_BUILD = existsSync(INDEX_FILE);
const cityCache = new Map();

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || `localhost:${PORT}`}`);

  if (url.pathname.startsWith('/api/')) {
    setCorsHeaders(response);

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, {
        ok: true,
        service: 'pleinspot-backend',
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/stations') {
      try {
        const latitude = Number(url.searchParams.get('latitude'));
        const longitude = Number(url.searchParams.get('longitude'));
        const latitudeDelta = Number(url.searchParams.get('latitudeDelta'));
        const longitudeDelta = Number(url.searchParams.get('longitudeDelta'));
        const fuelFilter = url.searchParams.get('fuelFilter') || 'all';
        const limit = Number(url.searchParams.get('limit') || 220);
        const forceRefresh = url.searchParams.get('forceRefresh') === '1';

        if (![latitude, longitude, latitudeDelta, longitudeDelta].every(Number.isFinite)) {
          sendJson(response, 400, {
            error: 'Missing or invalid region query parameters.',
          });
          return;
        }

        const result = await fetchStationsInRegion({
          forceRefresh,
          fuelFilter,
          limit,
          region: {
            latitude,
            latitudeDelta,
            longitude,
            longitudeDelta,
          },
        });

        sendJson(response, 200, result);
      } catch (error) {
        sendJson(response, 500, {
          error: error instanceof Error ? error.message : 'Unexpected backend error.',
        });
      }
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/cities') {
      try {
        const query = url.searchParams.get('q')?.trim() ?? '';

        if (query.length < 2) {
          sendJson(response, 200, []);
          return;
        }

        const cacheKey = query.toLowerCase();

        if (cityCache.has(cacheKey)) {
          sendJson(response, 200, cityCache.get(cacheKey));
          return;
        }

        const apiUrl = new URL('https://geo.api.gouv.fr/communes');
        apiUrl.searchParams.set('nom', query);
        apiUrl.searchParams.set('limit', '5');
        apiUrl.searchParams.set('boost', 'population');
        apiUrl.searchParams.set('fields', 'nom,code,codesPostaux,centre,departement,region');

        const cityResponse = await fetch(apiUrl, {
          headers: {
            Accept: 'application/json',
          },
        });

        if (!cityResponse.ok) {
          sendJson(response, 200, []);
          return;
        }

        const payload = await cityResponse.json();
        const results = payload
          .map((entry, index) => mapCityResult(entry, index))
          .filter(Boolean);

        cityCache.set(cacheKey, results);
        sendJson(response, 200, results);
      } catch {
        sendJson(response, 200, []);
      }
      return;
    }

    sendJson(response, 404, {
      error: 'Not found.',
    });
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, {
      Allow: 'GET, HEAD, OPTIONS',
      'Content-Type': 'text/plain; charset=utf-8',
    });
    response.end('Method not allowed.');
    return;
  }

  const wasServed = await serveStaticAsset(url.pathname, response, request.method === 'HEAD');

  if (wasServed) {
    return;
  }

  response.writeHead(404, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end('Not found.');
});

server.listen(PORT, () => {
  console.log(
    HAS_STATIC_BUILD
      ? `PleinSpot listening on http://localhost:${PORT} with static web build`
      : `PleinSpot backend listening on http://localhost:${PORT}`,
  );
});

export { server };

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(payload));
}

async function serveStaticAsset(pathname, response, headOnly) {
  if (!HAS_STATIC_BUILD) {
    return false;
  }

  const filePath = resolveStaticPath(pathname);

  if (filePath && (await isFile(filePath))) {
    await sendFile(response, filePath, headOnly);
    return true;
  }

  if (pathname === '/' || !extname(pathname)) {
    await sendFile(response, INDEX_FILE, headOnly);
    return true;
  }

  return false;
}

function resolveStaticPath(pathname) {
  try {
    const decodedPath = decodeURIComponent(pathname);
    const relativePath = decodedPath === '/' ? '/index.html' : decodedPath;
    const normalizedPath = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const candidatePath = resolve(DIST_DIR, `.${normalizedPath}`);

    if (!candidatePath.startsWith(DIST_DIR)) {
      return null;
    }

    return candidatePath;
  } catch {
    return null;
  }
}

async function isFile(filePath) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function sendFile(response, filePath, headOnly) {
  const fileStat = await stat(filePath);
  const contentType = getContentType(filePath);

  response.writeHead(200, {
    'Cache-Control': getCacheControl(filePath),
    'Content-Length': fileStat.size,
    'Content-Type': contentType,
  });

  if (headOnly) {
    response.end();
    return;
  }

  await new Promise((resolvePromise, rejectPromise) => {
    const stream = createReadStream(filePath);
    stream.on('error', rejectPromise);
    stream.on('end', resolvePromise);
    stream.pipe(response);
  });
}

function getCacheControl(filePath) {
  return filePath === INDEX_FILE ? 'no-cache' : 'public, max-age=31536000, immutable';
}

function getContentType(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case '.css':
      return 'text/css; charset=utf-8';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.ico':
      return 'image/x-icon';
    case '.jpeg':
    case '.jpg':
      return 'image/jpeg';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.map':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml';
    case '.txt':
      return 'text/plain; charset=utf-8';
    case '.webp':
      return 'image/webp';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

function mapCityResult(entry, index) {
  const coordinates = entry.centre?.coordinates;
  const longitude = Array.isArray(coordinates) ? Number(coordinates[0]) : NaN;
  const latitude = Array.isArray(coordinates) ? Number(coordinates[1]) : NaN;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const label = entry.nom?.trim();
  const postcode = Array.isArray(entry.codesPostaux) ? entry.codesPostaux[0] : '';
  const department = entry.departement?.nom?.trim();
  const region = entry.region?.nom?.trim();
  const subtitle = [postcode, department, region].filter(Boolean).join(', ');

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
