import type { Station } from '../types/station';

// OpenStreetMap spells the same network many ways ("Total", "TOTAL ACCESS", "TotalEnergies"…).
const BRANDS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'E.Leclerc', pattern: /leclerc/i },
  { label: 'TotalEnergies Access', pattern: /total\s*(energies\s*)?access/i },
  { label: 'TotalEnergies', pattern: /total/i },
  { label: 'Intermarché', pattern: /intermarch/i },
  { label: 'Carrefour', pattern: /carrefour/i },
  { label: 'Auchan', pattern: /auchan/i },
  { label: 'Système U', pattern: /syst[eè]me\s*u|super\s*u|hyper\s*u|u\s*express|^u$/i },
  { label: 'Esso Express', pattern: /esso\s*express/i },
  { label: 'Esso', pattern: /esso/i },
  { label: 'BP', pattern: /^bp\b/i },
  { label: 'Shell', pattern: /shell/i },
  { label: 'Avia', pattern: /avia/i },
  { label: 'Casino', pattern: /casino|g[ée]ant/i },
  { label: 'Dyneff', pattern: /dyneff/i },
  { label: 'Netto', pattern: /netto/i },
  { label: 'Eni', pattern: /\beni\b|agip/i },
  { label: 'AS24', pattern: /as\s*24/i },
];

export function getBrandLabel(brand: string | null | undefined) {
  const trimmed = brand?.trim();

  if (!trimmed) {
    return null;
  }

  return BRANDS.find((entry) => entry.pattern.test(trimmed))?.label ?? trimmed;
}

/** The name people know the station by: its own name, else its network, else its town. */
export function getStationTitle(station: Station) {
  return formatStationName(station.name) ?? getBrandLabel(station.brand) ?? station.city;
}

const KEEP_UPPERCASE = new Set(['AS24', 'BP', 'DAC', 'EURL', 'RN', 'SA', 'SARL', 'SAS', 'SNC', 'ZA', 'ZAC', 'ZI']);
const LOWERCASE_PARTICLES = new Set(['au', 'aux', 'de', 'des', 'du', 'en', 'et', 'la', 'le', 'les', 'sur']);

/** "CENTRE E.LECLERC GENNEVILLIERS" → "Centre E.Leclerc Gennevilliers". */
export function formatStationName(name: string | null | undefined) {
  const trimmed = name?.replace(/\s+/g, ' ').trim();

  if (!trimmed) {
    return null;
  }

  // Only names typed in a single case ("CENTRE LECLERC", "relais de bavella") are reformatted.
  if (trimmed !== trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase()) {
    return trimmed;
  }

  return trimmed
    .split(' ')
    .map((word, index) => {
      if (KEEP_UPPERCASE.has(word.toUpperCase())) {
        return word.toUpperCase();
      }

      const lower = word.toLowerCase();

      if (index > 0 && LOWERCASE_PARTICLES.has(lower)) {
        return lower;
      }

      return lower.replace(/(^|[.\-'’])(\p{L})/gu, (_, separator: string, letter: string) => separator + letter.toUpperCase());
    })
    .join(' ');
}
