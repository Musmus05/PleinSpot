import { Station } from './carburantsApi';
import { FuelFilter, FUEL_OPTIONS, FuelKey } from './fuels';

export type DisplayPrice = {
  fuelKey: FuelKey;
  updatedAt: string | null;
  value: number;
};

export function getDisplayPrice(station: Station, activeFuel: FuelFilter): DisplayPrice | null {
  if (activeFuel !== 'all') {
    const fuelPrice = station.prices[activeFuel];

    return fuelPrice
      ? {
          fuelKey: activeFuel,
          updatedAt: fuelPrice.updatedAt,
          value: fuelPrice.value,
        }
      : null;
  }

  let cheapest: DisplayPrice | null = null;

  for (const fuel of FUEL_OPTIONS) {
    const candidate = station.prices[fuel.key];

    if (!candidate) {
      continue;
    }

    if (!cheapest || candidate.value < cheapest.value) {
      cheapest = {
        fuelKey: fuel.key,
        updatedAt: candidate.updatedAt,
        value: candidate.value,
      };
    }
  }

  return cheapest;
}

export function getSortedStations(stations: Station[], activeFuel: FuelFilter): Station[] {
  return [...stations].sort((left, right) => {
    const leftPrice = getDisplayPrice(left, activeFuel);
    const rightPrice = getDisplayPrice(right, activeFuel);

    if (!leftPrice && !rightPrice) {
      return 0;
    }

    if (!leftPrice) {
      return 1;
    }

    if (!rightPrice) {
      return -1;
    }

    return leftPrice.value - rightPrice.value;
  });
}

export function getSearchResults(stations: Station[], query: string, activeFuel: FuelFilter): Station[] {
  if (!query) {
    return [];
  }

  return getSortedStations(
    stations.filter((station) =>
      `${station.city} ${station.address} ${station.postcode} ${station.department} ${station.region}`
        .toLowerCase()
        .includes(query),
    ),
    activeFuel,
  ).slice(0, 6);
}

export function getPriceRange(stations: Station[], activeFuel: FuelFilter) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const station of stations) {
    const price = getDisplayPrice(station, activeFuel)?.value;

    if (price == null) {
      continue;
    }

    min = Math.min(min, price);
    max = Math.max(max, price);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { max: null, min: null };
  }

  return { max, min };
}
