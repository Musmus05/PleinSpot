export const FUEL_KEYS = ['gazole', 'e10', 'sp95', 'sp98', 'e85', 'gplc'];

export const FUEL_NAME_TO_KEY = {
  E10: 'e10',
  E85: 'e85',
  GPLc: 'gplc',
  Gazole: 'gazole',
  SP95: 'sp95',
  SP98: 'sp98',
};

const MIN_VALID_PRICE = 0.3;
const MAX_VALID_PRICE = 5;

/** A `valeur` attribute of the official files as euros per litre, or null when it is not a plausible price. */
export function parsePriceValue(raw) {
  let value = Number(raw);

  // Older versions of the feed expressed prices in thousandths of a euro.
  if (value > 100) {
    value /= 1000;
  }

  if (!Number.isFinite(value) || value < MIN_VALID_PRICE || value > MAX_VALID_PRICE) {
    return null;
  }

  return Math.round(value * 1000) / 1000;
}
