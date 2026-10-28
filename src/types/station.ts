import type { FuelKey } from '../lib/fuels';

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type StationPrice = {
  updatedAt: string | null;
  value: number;
};

export type ScheduleDay = {
  closed: boolean;
  /** 1 = Monday … 7 = Sunday, as in the official feed. */
  day: number;
  slots: Array<{ close: string; open: string }>;
};

export type StationRupture = {
  fuel: FuelKey | null;
  label: string;
  since: string | null;
  type: 'temporaire';
};

export type Station = {
  address: string;
  automate24h: boolean;
  /** Network name from OpenStreetMap (raw spelling), when known. */
  brand: string | null;
  city: string;
  coordinates: LatLng;
  department: string;
  highway: boolean;
  id: number;
  /** Station's own name from OpenStreetMap, when it is more than the brand. */
  name: string | null;
  postcode: string;
  prices: Partial<Record<FuelKey, StationPrice>>;
  ruptures: StationRupture[];
  schedule: ScheduleDay[];
  services: string[];
};

export type PriceStats = {
  average: number;
  count: number;
  max: number;
  median: number;
  min: number;
  p33: number;
  p66: number;
};

export type PriceDistribution = {
  bins: number[];
  max: number;
  min: number;
};

export type StationsResponse = {
  distribution: PriceDistribution | null;
  fetchedAt: string;
  fuel: FuelKey;
  national: PriceStats | null;
  overview: Record<FuelKey, { count: number; min: number } | null>;
  /** When the ministry published the file these prices come from. */
  publishedAt: string;
  stations: Station[];
  stats: PriceStats | null;
  total: number;
};

export type PriceUpdate = {
  changedPrices: number;
  fetchedAt: string;
  publishedAt: string;
};

export type CitySearchResult = {
  id: string;
  label: string;
  region: {
    latitude: number;
    latitudeDelta: number;
    longitude: number;
    longitudeDelta: number;
  };
  subtitle: string;
};
