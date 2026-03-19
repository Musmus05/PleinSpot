import { createServer } from 'node:http';

import { fetchStationsInRegion } from './fuelDataService.mjs';

const PORT = Number(process.env.PORT || 4000);
const cityCache = new Map();

const server = createServer(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url || '/', `http://${request.headers.host || `localhost:${PORT}`}`);

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
});

server.listen(PORT, () => {
  console.log(`PleinSpot backend listening on http://localhost:${PORT}`);
});

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
