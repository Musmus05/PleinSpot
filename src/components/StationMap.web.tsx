import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';
import { StationMapProps } from './StationMap.types';

function MapController({
  onMapPress,
  onRegionChangeComplete,
  region,
  viewportToken,
}: Pick<StationMapProps, 'onMapPress' | 'onRegionChangeComplete' | 'region' | 'viewportToken'>) {
  const map = useMap();

  useMapEvents({
    click: onMapPress,
    moveend() {
      const center = map.getCenter();
      const bounds = map.getBounds();

      onRegionChangeComplete({
        latitude: center.lat,
        latitudeDelta: Math.abs(bounds.getNorth() - bounds.getSouth()),
        longitude: center.lng,
        longitudeDelta: Math.abs(bounds.getEast() - bounds.getWest()),
      });
    },
  });

  useEffect(() => {
    const south = region.latitude - region.latitudeDelta / 2;
    const north = region.latitude + region.latitudeDelta / 2;
    const west = region.longitude - region.longitudeDelta / 2;
    const east = region.longitude + region.longitudeDelta / 2;

    map.fitBounds(
      [
        [south, west],
        [north, east],
      ],
      {
        animate: true,
        duration: 0.35,
        padding: [88, 88],
      },
    );
  }, [map, viewportToken]);

  return null;
}

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
  return (
    <View style={styles.wrapper}>
      <MapContainer
        center={[region.latitude, region.longitude]}
        preferCanvas
        scrollWheelZoom
        style={styles.map}
        zoom={11}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <MapController
          onMapPress={onMapPress}
          onRegionChangeComplete={onRegionChangeComplete}
          region={region}
          viewportToken={viewportToken}
        />

        {userLocation ? (
          <>
            <CircleMarker
              center={[userLocation.latitude, userLocation.longitude]}
              pathOptions={{ color: colors.aqua, fillColor: colors.aqua, fillOpacity: 0.14, weight: 2 }}
              radius={16}
            />
            <CircleMarker
              center={[userLocation.latitude, userLocation.longitude]}
              pathOptions={{ color: colors.text, fillColor: colors.aqua, fillOpacity: 0.95, weight: 3 }}
              radius={6}
            />
          </>
        ) : null}

        {stations.map((station) => {
          const marker = getMarkerPresentation(station);
          const isSelected = selectedStationId === station.id;

          return (
            <Marker
              eventHandlers={{ click: () => onSelectStation(station.id) }}
              icon={createMarkerIcon({
                fuelLabel: marker.fuelLabel,
                priceLabel: marker.priceLabel,
                selected: isSelected,
                tone: marker.tone,
              })}
              key={station.id}
              position={[station.coordinates.latitude, station.coordinates.longitude]}
            />
          );
        })}
      </MapContainer>
    </View>
  );
}

function createMarkerIcon({
  fuelLabel,
  priceLabel,
  selected,
  tone,
}: {
  fuelLabel: string;
  priceLabel: string;
  selected: boolean;
  tone: string;
}) {
  const background = selected ? tone : 'rgba(248, 251, 255, 0.94)';
  const border = selected ? tone : 'rgba(7, 19, 29, 0.08)';
  const text = colors.textOnLight;
  const subtext = selected ? 'rgba(7, 19, 29, 0.78)' : '#5C7287';
  const glow = selected ? `0 20px 40px ${tone}44` : '0 16px 28px rgba(7, 19, 29, 0.18)';

  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:${selected ? 'translateY(-2px) scale(1.06)' : 'scale(1)'};transition:transform 120ms ease;">
        <div style="display:flex;align-items:center;gap:10px;min-width:88px;padding:10px 12px;border-radius:20px;border:1px solid ${border};background:${background};box-shadow:${glow};backdrop-filter:blur(12px);">
          <div style="width:10px;height:10px;border-radius:999px;background:${tone};flex-shrink:0;"></div>
          <div style="display:flex;flex-direction:column;align-items:flex-start;">
            <div style="font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:700;color:${text};line-height:1;">${priceLabel}</div>
            <div style="font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:500;color:${subtext};margin-top:4px;line-height:1;">${fuelLabel}</div>
          </div>
        </div>
        <div style="width:14px;height:14px;border-radius:999px;border:3px solid rgba(255,255,255,0.88);background:${tone};margin-top:7px;box-shadow:0 8px 18px rgba(7,19,29,0.18);"></div>
      </div>
    `,
    iconAnchor: [50, 60],
    iconSize: [100, 60],
  });
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    height: '100%',
    width: '100%',
  },
});
