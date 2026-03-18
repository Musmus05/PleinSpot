import { useEffect, useRef } from 'react';
import MapView, { Marker } from 'react-native-maps';

import { StationMarker } from './StationMarker';
import { StationMapProps } from './StationMap.types';

export function StationMap({
  getMarkerPresentation,
  onMapPress,
  onRegionChangeComplete,
  onSelectStation,
  region,
  selectedStationId,
  stations,
  userLocation,
  viewportToken,
}: StationMapProps) {
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 450);
  }, [region, viewportToken]);

  return (
    <MapView
      initialRegion={region}
      onPress={onMapPress}
      onRegionChangeComplete={onRegionChangeComplete}
      ref={mapRef}
      showsBuildings={false}
      showsCompass={false}
      showsMyLocationButton={false}
      showsPointsOfInterests={false}
      showsScale={false}
      showsTraffic={false}
      showsUserLocation={Boolean(userLocation)}
      style={{ flex: 1 }}
    >
      {stations.map((station) => {
        const marker = getMarkerPresentation(station);

        return (
          <Marker
            coordinate={station.coordinates}
            key={station.id}
            onPress={() => onSelectStation(station.id)}
          >
            <StationMarker
              fuelLabel={marker.fuelLabel}
              priceLabel={marker.priceLabel}
              selected={selectedStationId === station.id}
              tone={marker.tone}
            />
          </Marker>
        );
      })}
    </MapView>
  );
}
