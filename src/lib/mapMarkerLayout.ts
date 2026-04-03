import { Station } from './carburantsApi';
import { MapRegion } from '../types/map';

type LayoutOptions = {
  compact: boolean;
  mapHeight: number;
  mapWidth: number;
  region: MapRegion;
  selectedStationId: number | null;
  stations: Station[];
};

export function getRenderableStations({
  compact,
  mapHeight,
  mapWidth,
  region,
  selectedStationId,
  stations,
}: LayoutOptions) {
  const markerWidth = compact ? 76 : 100;
  const markerHeight = compact ? 40 : 48;
  const halfWidth = markerWidth / 2;
  const halfHeight = markerHeight / 2;
  const left = region.longitude - region.longitudeDelta / 2;
  const top = region.latitude + region.latitudeDelta / 2;
  const safeWidth = Math.max(mapWidth, markerWidth * 2);
  const safeHeight = Math.max(mapHeight, markerHeight * 2);
  const occupiedRects: Array<{
    bottom: number;
    left: number;
    right: number;
    top: number;
  }> = [];

  const prioritizedStations = [...stations].sort((leftStation, rightStation) => {
    if (leftStation.id === selectedStationId) {
      return -1;
    }

    if (rightStation.id === selectedStationId) {
      return 1;
    }

    const leftPrice = getComparableMarkerValue(leftStation);
    const rightPrice = getComparableMarkerValue(rightStation);

    if (leftPrice == null && rightPrice == null) {
      return leftStation.id - rightStation.id;
    }

    if (leftPrice == null) {
      return 1;
    }

    if (rightPrice == null) {
      return -1;
    }

    if (leftPrice !== rightPrice) {
      return leftPrice - rightPrice;
    }

    return leftStation.id - rightStation.id;
  });

  return prioritizedStations.filter((station) => {
    const x = ((station.coordinates.longitude - left) / region.longitudeDelta) * safeWidth;
    const y = ((top - station.coordinates.latitude) / region.latitudeDelta) * safeHeight;
    const rect = {
      bottom: y + halfHeight,
      left: x - halfWidth,
      right: x + halfWidth,
      top: y - halfHeight,
    };

    const overlaps = occupiedRects.some((occupiedRect) => {
      return !(
        rect.right < occupiedRect.left ||
        rect.left > occupiedRect.right ||
        rect.bottom < occupiedRect.top ||
        rect.top > occupiedRect.bottom
      );
    });

    if (overlaps) {
      return false;
    }

    occupiedRects.push(rect);
    return true;
  });
}

function getComparableMarkerValue(station: Station) {
  const values = Object.values(station.prices)
    .map((price) => price?.value)
    .filter((value): value is number => value != null && Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  return Math.min(...values);
}
