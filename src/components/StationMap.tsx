import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { StyleSheet, View } from 'react-native';

import type { AppLanguage } from '../lib/copy';
import { splitPrice } from '../lib/format';
import type { FuelKey } from '../lib/fuels';
import { getPriceTier, isPriceStale, PriceTier } from '../lib/pricing';
import type { LatLng, PriceStats, Station } from '../types/station';
import type { MapRegion, MapView } from '../types/map';
import { colors, fonts, tierColors } from '../theme';

export type MapPadding = { bottom: number; left: number; right: number; top: number };

export type MapViewportRequest = {
  target: { kind: 'region'; region: MapRegion } | { kind: 'point'; coordinates: LatLng };
  token: number;
};

type StationMapProps = {
  bestStationId: number | null;
  compact: boolean;
  fuel: FuelKey;
  highlightedStationId: number | null;
  initialView: { region: MapRegion } | { view: MapView };
  language: AppLanguage;
  onMapPress: () => void;
  onRegionChange: (region: MapRegion, view: MapView) => void;
  onSelectStation: (station: Station) => void;
  onUserDrag?: () => void;
  padding: MapPadding;
  selectedStation: Station | null;
  stations: Station[];
  stats: PriceStats | null;
  userLocation: LatLng | null;
  viewport: MapViewportRequest | null;
};

// Plan IGN v2 from the French Géoplateforme: open licence, no API key, made for France.
const TILE_URL =
  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.ign.fr/">IGN</a> &middot; <a href="https://geoservices.ign.fr/">Géoplateforme</a>';
const WORLD_BOUNDS = L.latLngBounds([-85, -180], [85, 180]);

export function StationMap({
  bestStationId,
  compact,
  fuel,
  highlightedStationId,
  initialView,
  language,
  onMapPress,
  onRegionChange,
  onSelectStation,
  onUserDrag,
  padding,
  selectedStation,
  stations,
  stats,
  userLocation,
  viewport,
}: StationMapProps) {
  const [initialProps] = useState(() =>
    'view' in initialView
      ? { center: L.latLng(initialView.view.latitude, initialView.view.longitude), zoom: initialView.view.zoom }
      : { bounds: regionToBounds(initialView.region) },
  );

  return (
    <View style={styles.wrapper}>
      <MapContainer
        {...initialProps}
        maxBounds={WORLD_BOUNDS}
        maxBoundsViscosity={1}
        minZoom={5}
        attributionControl={!compact}
        preferCanvas
        style={styles.map}
        zoomControl={false}
      >
        <TileLayer attribution={TILE_ATTRIBUTION} className="ps-tiles" maxNativeZoom={19} maxZoom={19} noWrap url={TILE_URL} />
        <MapBehaviour
          compact={compact}
          onMapPress={onMapPress}
          onRegionChange={onRegionChange}
          onUserDrag={onUserDrag}
          padding={padding}
          viewport={viewport}
        />
        <StationMarkers
          bestStationId={bestStationId}
          compact={compact}
          fuel={fuel}
          highlightedStationId={highlightedStationId}
          language={language}
          onSelectStation={onSelectStation}
          selectedStation={selectedStation}
          stations={stations}
          stats={stats}
        />
        {userLocation ? (
          <Marker
            icon={USER_ICON}
            interactive={false}
            keyboard={false}
            position={[userLocation.latitude, userLocation.longitude]}
            zIndexOffset={-500}
          />
        ) : null}
      </MapContainer>
    </View>
  );
}

function MapBehaviour({
  compact,
  onMapPress,
  onRegionChange,
  onUserDrag,
  padding,
  viewport,
}: Pick<StationMapProps, 'compact' | 'onMapPress' | 'onRegionChange' | 'onUserDrag' | 'padding' | 'viewport'>) {
  const map = useMap();
  const paddingRef = useRef(padding);

  paddingRef.current = padding;

  useMapEvents({
    click: onMapPress,
    dragstart: () => onUserDrag?.(),
    moveend() {
      reportViewport(map, onRegionChange);
    },
  });

  useEffect(() => {
    map.attributionControl?.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');

    if (!compact) {
      const zoom = L.control.zoom({ position: 'bottomright', zoomInTitle: 'Zoom +', zoomOutTitle: 'Zoom −' });

      zoom.addTo(map);
      return () => {
        zoom.remove();
      };
    }

    return undefined;
  }, [compact, map]);

  useEffect(() => {
    // Report the initial viewport once Leaflet has measured the container.
    reportViewport(map, onRegionChange);
  }, [map]);

  useEffect(() => {
    if (!viewport) {
      return;
    }

    const { bottom, left, right, top } = paddingRef.current;
    const options = {
      paddingBottomRight: L.point(right, bottom),
      paddingTopLeft: L.point(left, top),
    };

    if (viewport.target.kind === 'point') {
      const { latitude, longitude } = viewport.target.coordinates;

      map.panInside([latitude, longitude], { ...options, animate: true });
      return;
    }

    map.flyToBounds(regionToBounds(viewport.target.region), { ...options, duration: 0.6, maxZoom: 15 });
  }, [map, viewport]);

  return null;
}

type MarkerLayout = { dots: Station[]; labeled: Station[] };

function StationMarkers({
  bestStationId,
  compact,
  fuel,
  highlightedStationId,
  language,
  onSelectStation,
  selectedStation,
  stations,
  stats,
}: Pick<
  StationMapProps,
  | 'bestStationId'
  | 'compact'
  | 'fuel'
  | 'highlightedStationId'
  | 'language'
  | 'onSelectStation'
  | 'selectedStation'
  | 'stations'
  | 'stats'
>) {
  const map = useMap();
  const [layoutVersion, setLayoutVersion] = useState(0);
  const onSelectRef = useRef(onSelectStation);

  onSelectRef.current = onSelectStation;

  useMapEvents({
    resize: () => setLayoutVersion((value) => value + 1),
    zoomend: () => setLayoutVersion((value) => value + 1),
  });

  const layout = useMemo<MarkerLayout>(() => {
    const selectedId = selectedStation?.id ?? null;
    const ordered = selectedStation
      ? [selectedStation, ...stations.filter((station) => station.id !== selectedId)]
      : stations;
    const { height, width } = compact ? COMPACT_MARKER : MARKER;
    const occupied: Array<{ bottom: number; left: number; right: number; top: number }> = [];
    const labeled: Station[] = [];
    const dots: Station[] = [];

    // `stations` is sorted by price: the cheapest ones claim their spot first, the others
    // collapse into small dots instead of piling up on top of each other.
    for (const station of ordered) {
      const point = map.latLngToContainerPoint([station.coordinates.latitude, station.coordinates.longitude]);
      const rect = {
        bottom: point.y + 2,
        left: point.x - width / 2 - 2,
        right: point.x + width / 2 + 2,
        top: point.y - height - 8,
      };
      const overlaps = occupied.some(
        (other) => rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top,
      );

      if (overlaps && station.id !== selectedId) {
        dots.push(station);
      } else {
        occupied.push(rect);
        labeled.push(station);
      }
    }

    return { dots, labeled };
  }, [compact, layoutVersion, map, selectedStation, stations]);

  const handlers = useMemo(() => new WeakMap<Station, { click: () => void }>(), []);

  function getHandlers(station: Station) {
    let entry = handlers.get(station);

    if (!entry) {
      entry = { click: () => onSelectRef.current(station) };
      handlers.set(station, entry);
    }

    return entry;
  }

  return (
    <>
      {layout.dots.map((station) => {
        const tier = getPriceTier(station.prices[fuel]?.value, stats);

        return (
          <CircleMarker
            center={[station.coordinates.latitude, station.coordinates.longitude]}
            eventHandlers={getHandlers(station)}
            key={`dot-${station.id}`}
            pathOptions={{ color: colors.white, fillColor: tierColors[tier].solid, fillOpacity: 1, opacity: 1, weight: 1.5 }}
            radius={compact ? 4.5 : 5}
          />
        );
      })}
      {layout.labeled.map((station) => {
        const price = station.prices[fuel] ?? null;
        const isSelected = station.id === selectedStation?.id;

        return (
          <StationMarker
            handlers={getHandlers(station)}
            icon={getMarkerIcon({
              best: station.id === bestStationId,
              compact,
              highlighted: station.id === highlightedStationId,
              language,
              price: price?.value ?? null,
              selected: isSelected,
              stale: isPriceStale(price),
              tier: getPriceTier(price?.value, stats),
            })}
            key={station.id}
            position={station.coordinates}
            zIndexOffset={isSelected ? 2000 : station.id === highlightedStationId ? 1500 : station.id === bestStationId ? 1000 : 0}
          />
        );
      })}
    </>
  );
}

const StationMarker = memo(function StationMarker({
  handlers,
  icon,
  position,
  zIndexOffset,
}: {
  handlers: { click: () => void };
  icon: L.DivIcon;
  position: LatLng;
  zIndexOffset: number;
}) {
  return (
    <Marker
      eventHandlers={handlers}
      icon={icon}
      keyboard={false}
      position={[position.latitude, position.longitude]}
      riseOnHover
      zIndexOffset={zIndexOffset}
    />
  );
});

const MARKER = { height: 28, width: 70 };
const COMPACT_MARKER = { height: 26, width: 62 };
const iconCache = new Map<string, L.DivIcon>();

function getMarkerIcon(options: {
  best: boolean;
  compact: boolean;
  highlighted: boolean;
  language: AppLanguage;
  price: number | null;
  selected: boolean;
  stale: boolean;
  tier: PriceTier;
}) {
  const key = JSON.stringify(options);
  const cached = iconCache.get(key);

  if (cached) {
    return cached;
  }

  const { best, compact, highlighted, language, price, selected, stale, tier } = options;
  const label = price == null ? '—' : (() => {
    const { head, tail } = splitPrice(price, language);

    return `${head}<small>${tail}</small>`;
  })();
  const classes = [
    'ps-marker',
    `ps-marker--${tier}`,
    compact && 'is-compact',
    selected && 'is-selected',
    highlighted && 'is-highlighted',
    stale && 'is-stale',
  ]
    .filter(Boolean)
    .join(' ');
  const icon = L.divIcon({
    className: 'ps-marker-host',
    html: `<div class="${classes}">${label}${best ? '<span class="ps-marker__star" aria-hidden="true">★</span>' : ''}</div>`,
    iconAnchor: [0, 0],
    iconSize: [0, 0],
  });

  iconCache.set(key, icon);
  return icon;
}

const USER_ICON = L.divIcon({
  className: 'ps-marker-host',
  html: '<div class="ps-user"><span class="ps-user__pulse"></span><span class="ps-user__dot"></span></div>',
  iconAnchor: [0, 0],
  iconSize: [0, 0],
});

function regionToBounds(region: MapRegion) {
  return L.latLngBounds(
    [region.latitude - region.latitudeDelta / 2, region.longitude - region.longitudeDelta / 2],
    [region.latitude + region.latitudeDelta / 2, region.longitude + region.longitudeDelta / 2],
  );
}

function reportViewport(map: L.Map, onRegionChange: StationMapProps['onRegionChange']) {
  const center = map.getCenter();

  onRegionChange(boundsToRegion(map.getBounds()), { latitude: center.lat, longitude: center.lng, zoom: map.getZoom() });
}

function boundsToRegion(bounds: L.LatLngBounds): MapRegion {
  const center = bounds.getCenter();

  return {
    latitude: center.lat,
    latitudeDelta: Math.abs(bounds.getNorth() - bounds.getSouth()),
    longitude: center.lng,
    longitudeDelta: Math.abs(bounds.getEast() - bounds.getWest()),
  };
}

injectMapStyles();

function injectMapStyles() {
  if (typeof document === 'undefined' || document.getElementById('ps-map-styles')) {
    return;
  }

  const tierRules = (Object.keys(tierColors) as PriceTier[])
    .map((tier) => `.ps-marker--${tier}{background:${tierColors[tier].solid}}`)
    .join('');
  const style = document.createElement('style');

  style.id = 'ps-map-styles';
  style.textContent = `
.leaflet-container{background:#EEF0EC;font-family:${fonts.regular},system-ui,sans-serif;outline:none}
.ps-tiles{filter:saturate(.55) brightness(1.04) contrast(.96)}
.ps-marker-host{background:none;border:0}
.ps-marker{position:absolute;left:0;bottom:0;transform:translate(-50%,-8px);display:flex;align-items:flex-start;padding:6px 9px 6px 10px;border-radius:999px;color:#fff;font-family:${fonts.bold},system-ui,sans-serif;font-size:13px;line-height:1;letter-spacing:-.2px;white-space:nowrap;font-variant-numeric:tabular-nums;box-shadow:0 0 0 2px #fff,0 3px 10px rgba(16,24,40,.28);cursor:pointer;transition:transform .14s ease,background-color .14s ease;user-select:none}
.ps-marker small{font-size:9px;margin-left:.5px;margin-top:-.5px}
.ps-marker::after{content:'';position:absolute;left:50%;bottom:-4px;width:9px;height:9px;background:inherit;transform:translateX(-50%) rotate(45deg);border-radius:0 0 3px 0;box-shadow:2px 2px 0 0 #fff;z-index:-1}
.ps-marker.is-compact{padding:5px 8px 5px 9px;font-size:12px}
${tierRules}
.ps-marker:hover,.ps-marker.is-highlighted{transform:translate(-50%,-8px) scale(1.12)}
.ps-marker.is-selected{background:${colors.ink};transform:translate(-50%,-10px) scale(1.2);box-shadow:0 0 0 2.5px #fff,0 6px 18px rgba(16,24,40,.4)}
.ps-marker.is-stale{opacity:.78}
.ps-marker__star{position:absolute;top:-9px;right:-9px;width:18px;height:18px;border-radius:999px;background:${colors.star};color:#713F12;font-size:11px;line-height:18px;text-align:center;box-shadow:0 0 0 2px #fff}
.ps-user{position:absolute;left:0;top:0}
.ps-user__dot{position:absolute;left:-8px;top:-8px;width:16px;height:16px;border-radius:999px;background:${colors.user};box-shadow:0 0 0 3px #fff,0 2px 8px rgba(37,99,235,.5)}
.ps-user__pulse{position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:999px;background:rgba(37,99,235,.18);animation:ps-pulse 2s ease-out infinite}
@keyframes ps-pulse{0%{transform:scale(.4);opacity:1}100%{transform:scale(1.4);opacity:0}}
.leaflet-control-zoom{border:0!important;border-radius:12px!important;overflow:hidden;box-shadow:0 8px 24px -6px rgba(16,24,40,.22),0 0 0 1px rgba(16,24,40,.06)!important;margin:0 16px 16px 0!important}
.leaflet-control-zoom a{width:40px!important;height:40px!important;line-height:40px!important;font-size:20px!important;color:${colors.inkSoft}!important;border-bottom-color:${colors.border}!important}
.leaflet-control-attribution{font-size:10px;background:rgba(255,255,255,.78)!important;border-radius:8px 0 0 0;padding:1px 6px!important}
.leaflet-control-attribution a{color:${colors.textMuted}!important}
@media (prefers-reduced-motion:reduce){.ps-marker{transition:none}.ps-user__pulse{animation:none}}
`;
  document.head.appendChild(style);
}

const styles = StyleSheet.create({
  map: {
    height: '100%',
    width: '100%',
  },
  wrapper: {
    ...StyleSheet.absoluteFillObject,
  },
});
