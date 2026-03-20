import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

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
        padding: [72, 72],
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
  const { width } = useWindowDimensions();
  const isPhone = width < 560;

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
              pathOptions={{ color: colors.aqua, fillColor: colors.aqua, fillOpacity: 0.12, weight: 2 }}
              radius={16}
            />
            <CircleMarker
              center={[userLocation.latitude, userLocation.longitude]}
              pathOptions={{ color: colors.white, fillColor: colors.aqua, fillOpacity: 1, weight: 3 }}
              radius={6}
            />
          </>
        ) : null}

        {stations.map((station) => {
          const marker = getMarkerPresentation(station);

          return (
            <Marker
              eventHandlers={{ click: () => onSelectStation(station.id) }}
              icon={createMarkerIcon({
                compact: isPhone,
                fuelLabel: marker.fuelLabel,
                priceLabel: marker.priceLabel,
                selected: selectedStationId === station.id,
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
  compact,
  fuelLabel,
  priceLabel,
  selected,
  tone,
}: {
  compact: boolean;
  fuelLabel: string;
  priceLabel: string;
  selected: boolean;
  tone: string;
}) {
  const background = selected ? '#FFF3D8' : 'rgba(255,255,255,0.96)';
  const border = selected ? tone : 'rgba(110, 86, 45, 0.12)';
  const glow = selected ? '0 16px 32px rgba(255,191,71,0.26)' : '0 12px 24px rgba(184,169,143,0.20)';
  const width = compact ? 68 : 92;
  const height = compact ? 32 : 40;
  const padding = compact ? '7px 9px' : '10px 12px';
  const gap = compact ? 7 : 10;
  const priceSize = compact ? 12 : 14;
  const fuelSize = compact ? 10 : 11;
  const dotSize = compact ? 8 : 10;
  const iconAnchorX = width / 2;
  const iconAnchorY = compact ? 18 : 24;
  const compactFuelRow = compact && !selected;

  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:${selected ? 'scale(1.04)' : 'scale(1)'};">
        <div style="display:flex;align-items:center;gap:${gap}px;min-width:${width}px;padding:${padding};border-radius:${compact ? 16 : 18}px;border:1px solid ${border};background:${background};box-shadow:${glow};">
          <div style="width:${dotSize}px;height:${dotSize}px;border-radius:999px;background:${tone};flex-shrink:0;"></div>
          <div style="display:flex;flex-direction:column;">
            <div style="font-family:'Space Grotesk',sans-serif;font-size:${priceSize}px;font-weight:700;color:#2E261F;line-height:1;">${priceLabel}</div>
            ${
              compactFuelRow
                ? ''
                : `<div style="font-family:'Space Grotesk',sans-serif;font-size:${fuelSize}px;font-weight:500;color:#857A6D;margin-top:${compact ? 3 : 4}px;line-height:1;">${fuelLabel}</div>`
            }
          </div>
        </div>
      </div>
    `,
    iconAnchor: [iconAnchorX, iconAnchorY],
    iconSize: [width, height],
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
