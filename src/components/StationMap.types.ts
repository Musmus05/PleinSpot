import { Station } from '../lib/carburantsApi';
import { MapRegion } from '../types/map';

export type StationMapProps = {
  getMarkerPresentation: (station: Station) => {
    fuelLabel: string;
    priceLabel: string;
    tone: string;
  };
  onMapPress: () => void;
  onRegionChangeComplete: (region: MapRegion) => void;
  onSelectStation: (stationId: number) => void;
  region: MapRegion;
  selectedStationId: number | null;
  stations: Station[];
  userLocation: { latitude: number; longitude: number } | null;
  viewportToken: number;
};
