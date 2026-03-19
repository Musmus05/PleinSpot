import { Station } from './carburantsApi';

const BRAND_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'TotalEnergies', pattern: /\bTOTAL(?:ENERGIES)?\b|\bTOTAL ACCESS\b|\bRELAIS TOTAL\b/i },
  { label: 'Carrefour', pattern: /\bCARREFOUR\b(?:\s+(?:MARKET|CONTACT|CITY|EXPRESS))?/i },
  { label: 'E.Leclerc', pattern: /\bE\.?\s*LECLERC\b/i },
  { label: 'Intermarche', pattern: /\bINTERMARCHE\b/i },
  { label: 'Super U', pattern: /\bSUPER U\b|\bHYPER U\b|\bU EXPRESS\b|\bUTILE\b/i },
  { label: 'Auchan', pattern: /\bAUCHAN\b/i },
  { label: 'Casino', pattern: /\bCASINO\b|\bGEANT CASINO\b/i },
  { label: 'Cora', pattern: /\bCORA\b/i },
  { label: 'BP', pattern: /\bBP\b(?!\s+\d)/i },
  { label: 'Esso', pattern: /\bESSO\b|\bEXPRESS ESSO\b/i },
  { label: 'Shell', pattern: /\bSHELL\b/i },
  { label: 'Avia', pattern: /\bAVIA\b/i },
  { label: 'Dyneff', pattern: /\bDYNEFF\b/i },
  { label: 'Netto', pattern: /\bNETTO\b/i },
];

export function getStationBrand(station: Station) {
  const haystack = normalizeForMatch(`${station.address} ${station.city}`);

  for (const entry of BRAND_PATTERNS) {
    if (entry.pattern.test(haystack)) {
      return entry.label;
    }
  }

  return null;
}

function normalizeForMatch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
