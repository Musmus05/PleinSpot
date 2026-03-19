export type StationOfficialDetails = {
  brand: string | null;
  name: string | null;
};

const detailsCache = new Map<number, StationOfficialDetails | null>();
const inflightCache = new Map<number, Promise<StationOfficialDetails | null>>();

export async function fetchStationOfficialDetails(stationId: number) {
  const cached = detailsCache.get(stationId);

  if (cached !== undefined) {
    return cached;
  }

  const inflight = inflightCache.get(stationId);

  if (inflight) {
    return inflight;
  }

  const request = loadStationOfficialDetails(stationId)
    .then((details) => {
      detailsCache.set(stationId, details);
      return details;
    })
    .finally(() => {
      inflightCache.delete(stationId);
    });

  inflightCache.set(stationId, request);
  return request;
}

async function loadStationOfficialDetails(stationId: number) {
  try {
    const response = await fetch(`https://www.prix-carburants.gouv.fr/station/${stationId}`);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const name = extractStationName(html);
    const brand = extractStationBrand(html);

    if (!name && !brand) {
      return null;
    }

    return { brand, name };
  } catch {
    return null;
  }
}

function extractStationName(html: string) {
  const match = html.match(/<p class="fr-h2[^"]*">([\s\S]*?)<\/p>/i);
  return normalizeHtmlText(match?.[1]);
}

function extractStationBrand(html: string) {
  const match = html.match(/<strong>\s*Marque\s*:\s*<\/strong>\s*([\s\S]*?)<br\s*\/?>/i);
  return normalizeHtmlText(match?.[1]);
}

function normalizeHtmlText(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = decodeHtmlEntities(value.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

  return normalized || null;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&eacute;/gi, 'e')
    .replace(/&egrave;/gi, 'e')
    .replace(/&ecirc;/gi, 'e')
    .replace(/&agrave;/gi, 'a')
    .replace(/&ccedil;/gi, 'c')
    .replace(/&uuml;/gi, 'u')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}
