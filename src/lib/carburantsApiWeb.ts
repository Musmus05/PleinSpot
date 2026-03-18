import { FuelFilter, FUEL_OPTIONS } from './fuels';
import { Station } from './carburantsApi';

type FetchStationsOptions = {
  forceRefresh?: boolean;
  fuelFilter: FuelFilter;
  limit?: number;
  region: {
    latitude: number;
    latitudeDelta: number;
    longitude: number;
    longitudeDelta: number;
  };
};

type WebFuelData = {
  fetchedAt: string;
  stations: Station[];
};

let cachedData: WebFuelData | null = null;

export async function fetchStationsInRegionWeb({
  forceRefresh = false,
  fuelFilter,
  limit = 220,
  region,
}: FetchStationsOptions) {
  const data = await getFuelData(forceRefresh);
  const visibleStations = data.stations.filter((station) => isStationVisible(station, region));
  const filteredByFuel =
    fuelFilter === 'all'
      ? visibleStations
      : visibleStations.filter((station) => station.prices[fuelFilter] != null);

  return {
    checkedAt: new Date().toISOString(),
    fetchedAt: data.fetchedAt,
    stations: sortStationsByFuel(filteredByFuel, fuelFilter).slice(0, limit),
  };
}

async function getFuelData(forceRefresh = false) {
  if (!forceRefresh && cachedData) {
    return cachedData;
  }

  const snapshotUrl = forceRefresh ? `/fuel-stations.json?ts=${Date.now()}` : '/fuel-stations.json';
  const response = await fetch(snapshotUrl, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error("Le snapshot local des carburants est introuvable.");
  }

  cachedData = (await response.json()) as WebFuelData;
  return cachedData;
}

function isStationVisible(
  station: Station,
  region: FetchStationsOptions['region'],
) {
  const latitudeDelta = Math.max(region.latitudeDelta, 0.03);
  const longitudeDelta = Math.max(region.longitudeDelta, 0.03);
  const south = region.latitude - latitudeDelta / 2;
  const north = region.latitude + latitudeDelta / 2;
  const west = region.longitude - longitudeDelta / 2;
  const east = region.longitude + longitudeDelta / 2;

  return (
    station.coordinates.latitude >= south &&
    station.coordinates.latitude <= north &&
    station.coordinates.longitude >= west &&
    station.coordinates.longitude <= east
  );
}

function sortStationsByFuel(stations: Station[], fuelFilter: FuelFilter) {
  return [...stations].sort((left, right) => {
    const leftPrice = getComparablePrice(left, fuelFilter);
    const rightPrice = getComparablePrice(right, fuelFilter);

    if (leftPrice == null && rightPrice == null) {
      return 0;
    }

    if (leftPrice == null) {
      return 1;
    }

    if (rightPrice == null) {
      return -1;
    }

    return leftPrice - rightPrice;
  });
}

function getComparablePrice(station: Station, fuelFilter: FuelFilter) {
  if (fuelFilter !== 'all') {
    return station.prices[fuelFilter]?.value ?? null;
  }

  let cheapest: number | null = null;

  for (const fuel of FUEL_OPTIONS) {
    const value = station.prices[fuel.key]?.value;

    if (value == null) {
      continue;
    }

    if (cheapest == null || value < cheapest) {
      cheapest = value;
    }
  }

  return cheapest;
}
