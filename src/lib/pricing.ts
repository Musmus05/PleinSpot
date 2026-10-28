import type { PriceStats, StationPrice } from '../types/station';
import { getAgeInMs } from './format';
import type { FuelKey } from './fuels';

export type PriceTier = 'cheap' | 'mid' | 'high' | 'unknown';

/** Tank size used for the "you save X € on a full tank" estimate. */
export const TANK_LITERS = 50;

/** Past this age a declared price is flagged as possibly outdated. */
export const STALE_PRICE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Tiers are relative to the stations of the visible area, split in thirds. Using quantiles
 * instead of min/max keeps a single very cheap (or very expensive) outlier from turning every
 * other marker the same colour.
 */
export function getPriceTier(value: number | null | undefined, stats: PriceStats | null): PriceTier {
  if (value == null || !stats) {
    return 'unknown';
  }

  if (stats.max - stats.min < 0.001) {
    return 'cheap';
  }

  if (value <= stats.p33) {
    return 'cheap';
  }

  if (value <= stats.p66) {
    return 'mid';
  }

  return 'high';
}

export function isPriceStale(price: StationPrice | null, now = Date.now()) {
  const age = getAgeInMs(price?.updatedAt ?? null, now);

  return age != null && age > STALE_PRICE_MS;
}

/** Positive when the station is cheaper than the reference, for a full tank. */
export function getTankSavings(price: number, reference: number | null | undefined) {
  if (reference == null) {
    return null;
  }

  return (reference - price) * TANK_LITERS;
}

/** A price that moved between two versions of the official data. */
export type PriceChange = {
  at: number;
  from: number;
  to: number;
};

/** Keyed by `${stationId}:${fuel}`. */
export type PriceChanges = Record<string, PriceChange>;

export function getPriceChange(changes: PriceChanges, stationId: number, fuel: FuelKey) {
  return changes[`${stationId}:${fuel}`] ?? null;
}
