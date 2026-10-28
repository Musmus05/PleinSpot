import type { StationDetails } from '../types/station';

export type BrandStyle = {
  background: string;
  foreground: string;
  initials: string;
  label: string;
};

// Monogram colours loosely inspired by each network's identity, so a station can be recognised
// at a glance in the list without using any logo artwork.
const BRANDS: Array<{ pattern: RegExp } & BrandStyle> = [
  { background: '#0057A6', foreground: '#FFFFFF', initials: 'L', label: 'E.Leclerc', pattern: /leclerc/i },
  { background: '#E4002B', foreground: '#FFFFFF', initials: 'TA', label: 'TotalEnergies Access', pattern: /total\s*access/i },
  { background: '#E4002B', foreground: '#FFFFFF', initials: 'T', label: 'TotalEnergies', pattern: /total/i },
  { background: '#E2001A', foreground: '#FFFFFF', initials: 'I', label: 'Intermarché', pattern: /intermarch/i },
  { background: '#004E9E', foreground: '#FFFFFF', initials: 'C', label: 'Carrefour', pattern: /carrefour/i },
  { background: '#E1001A', foreground: '#FFFFFF', initials: 'A', label: 'Auchan', pattern: /auchan/i },
  { background: '#1F3B8C', foreground: '#FFFFFF', initials: 'U', label: 'Système U', pattern: /syst[eè]me\s*u|super\s*u|hyper\s*u|u\s*express/i },
  { background: '#D52B1E', foreground: '#FFFFFF', initials: 'E', label: 'Esso', pattern: /esso/i },
  { background: '#007A33', foreground: '#FFFFFF', initials: 'BP', label: 'BP', pattern: /^bp\b/i },
  { background: '#FBCE07', foreground: '#7A1712', initials: 'S', label: 'Shell', pattern: /shell/i },
  { background: '#D2001F', foreground: '#FFFFFF', initials: 'A', label: 'Avia', pattern: /avia/i },
  { background: '#00843D', foreground: '#FFFFFF', initials: 'C', label: 'Casino', pattern: /casino|g[ée]ant/i },
  { background: '#E30613', foreground: '#FFFFFF', initials: 'C', label: 'Cora', pattern: /^cora\b/i },
  { background: '#00539F', foreground: '#FFFFFF', initials: 'D', label: 'Dyneff', pattern: /dyneff/i },
  { background: '#FFD500', foreground: '#1D2939', initials: 'N', label: 'Netto', pattern: /netto/i },
  { background: '#FFD100', foreground: '#1D2939', initials: 'E', label: 'Eni', pattern: /\beni\b|agip/i },
  { background: '#C8102E', foreground: '#FFFFFF', initials: 'E', label: 'Elan', pattern: /^elan\b/i },
  { background: '#D60B52', foreground: '#FFFFFF', initials: 'AS', label: 'AS24', pattern: /as\s*24/i },
  { background: '#3E8E41', foreground: '#FFFFFF', initials: 'S', label: 'Sigma', pattern: /^sigma\b/i },
];

const INDEPENDENT_PATTERN = /ind[ée]pendant|sans enseigne|^autre/i;

export function getBrandStyle(details: StationDetails | null | undefined): BrandStyle | null {
  const brand = details?.brand?.trim();

  if (!brand || INDEPENDENT_PATTERN.test(brand)) {
    return null;
  }

  const known = BRANDS.find((entry) => entry.pattern.test(brand));

  if (known) {
    return { background: known.background, foreground: known.foreground, initials: known.initials, label: known.label };
  }

  return {
    background: '#344054',
    foreground: '#FFFFFF',
    initials: brand.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 1).toUpperCase() || '•',
    label: brand,
  };
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
