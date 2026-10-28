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
  type: 'definitive' | 'temporaire' | null;
};

export type Station = {
  address: string;
  automate24h: boolean;
  city: string;
  coordinates: LatLng;
  department: string;
  highway: boolean;
  id: number;
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

export type StationsResponse = {
  fetchedAt: string;
  fuel: FuelKey;
  national: PriceStats | null;
  overview: Record<FuelKey, { count: number; min: number } | null>;
  stations: Station[];
  stats: PriceStats | null;
  total: number;
};

export type StationDetails = {
  brand: string | null;
  name: string | null;
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
