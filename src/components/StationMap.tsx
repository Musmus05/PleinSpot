import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMarker, MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { StyleSheet, View } from 'react-native';

import type { AppLanguage } from '../lib/copy';
import { splitPrice } from '../lib/format';
import type { FuelKey } from '../lib/fuels';
import { getPriceChange, getPriceTier, isPriceStale, PriceChanges, PriceTier } from '../lib/pricing';
import type { LatLng, PriceStats, Station } from '../types/station';
import type { MapRegion, MapView } from '../types/map';
import { colors, fonts, motion, radius, tierColors } from '../theme';
import { Basemap, BASEMAP_BACKGROUND } from './Basemap';

export type MapPadding = { bottom: number; left: number; right: number; top: number };

export type MapViewportRequest = {
  target:
    | { kind: 'region'; region: MapRegion }
    | { kind: 'point'; coordinates: LatLng }
    // The zoom buttons live with the other map controls, outside Leaflet.
    | { kind: 'zoom'; delta: 1 | -1 };
  token: number;
};

type StationMapProps = {
  /** Prices that just moved: their slats flash once, then keep an arrow. */
  changes: PriceChanges;
  /** Lowest price of the area: every station at that price gets the double rule. */
  bestPrice: number | null;
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

const WORLD_BOUNDS = L.latLngBounds([-85, -180], [85, 180]);

export function StationMap({
  bestPrice,
  changes,
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
        <Basemap />
        <MapBehaviour
          onMapPress={onMapPress}
          onRegionChange={onRegionChange}
          onUserDrag={onUserDrag}
          padding={padding}
          viewport={viewport}
        />
        <StationMarkers
          bestPrice={bestPrice}
          changes={changes}
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
  onMapPress,
  onRegionChange,
  onUserDrag,
  padding,
  viewport,
}: Pick<StationMapProps, 'onMapPress' | 'onRegionChange' | 'onUserDrag' | 'padding' | 'viewport'>) {
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
  }, [map]);

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

    if (viewport.target.kind === 'zoom') {
      map.setZoom(map.getZoom() + viewport.target.delta);
      return;
    }

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
  bestPrice,
  changes,
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
  | 'bestPrice'
  | 'changes'
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
            pathOptions={{ color: colors.white, fillColor: tierColors[tier].fill, fillOpacity: 1, opacity: 1, weight: 1.5 }}
            radius={compact ? 4.5 : 5}
          />
        );
      })}
      {layout.labeled.map((station) => {
        const price = station.prices[fuel] ?? null;
        const isSelected = station.id === selectedStation?.id;
        const isBest = bestPrice != null && price?.value === bestPrice;
        const change = getPriceChange(changes, station.id, fuel);

        return (
          <StationMarker
            handlers={getHandlers(station)}
            icon={getMarkerIcon({
              best: isBest,
              change: change ? (change.to < change.from ? 'down' : 'up') : null,
              flash: change != null && Date.now() - change.at < FLASH_MS,
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
            zIndexOffset={isSelected ? 2000 : station.id === highlightedStationId ? 1500 : isBest ? 1000 : 0}
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

const MARKER = { height: 24, width: 58 };
const COMPACT_MARKER = { height: 22, width: 52 };
const iconCache = new Map<string, L.DivIcon>();
// A price that just changed flashes for this long after the update arrives.
const FLASH_MS = 90 * 1000;
const CHANGE_ARROWS = {
  down: '<svg class="ps-slat__arrow" viewBox="0 0 8 8" aria-hidden="true"><path d="M4 7.5 0.5 1.5h7z" fill="currentColor"/></svg>',
  up: '<svg class="ps-slat__arrow" viewBox="0 0 8 8" aria-hidden="true"><path d="M4 0.5 7.5 6.5h-7z" fill="currentColor"/></svg>',
};
// White outline separating a slat from the map, and the lift under it.
const OUTLINE = '0 0 0 1.5px #fff';
const LIFT = '0 2px 5px rgba(22,24,27,.32)';

function getMarkerIcon(options: {
  best: boolean;
  change: 'down' | 'up' | null;
  flash: boolean;
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

  const { best, change, compact, flash, highlighted, language, price, selected, stale, tier } = options;
  const label = price == null ? '—' : (() => {
    const { head, tail } = splitPrice(price, language);

    return `${head}<small>${tail}</small>`;
  })();
  const classes = [
    'ps-slat',
    `ps-slat--${tier}`,
    compact && 'is-compact',
    best && !stale && 'is-best',
    selected && 'is-selected',
    highlighted && 'is-highlighted',
    stale && 'is-stale',
    flash && 'is-flash',
  ]
    .filter(Boolean)
    .join(' ');
  const icon = L.divIcon({
    className: 'ps-marker-host',
    html: `<div class="${classes}">${label}${change ? CHANGE_ARROWS[change] : ''}</div>`,
    iconAnchor: [0, 0],
    iconSize: [0, 0],
  });

  iconCache.set(key, icon);
  return icon;
}

const USER_ICON = L.divIcon({
  className: 'ps-marker-host',
  html: '<div class="ps-user"><span class="ps-user__halo"></span><span class="ps-user__dot"></span></div>',
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

  // One rule per tier: fill, ink, and the inner rule used by the lowest price.
  const tierRules = (Object.keys(tierColors) as PriceTier[])
    .map((tier) => {
      const { fill, ink, text } = tierColors[tier];

      return [
        `.ps-slat--${tier}{background:${fill};color:${ink}}`,
        `.ps-slat--${tier}.is-best{box-shadow:inset 0 0 0 2px ${fill},inset 0 0 0 3.5px ${ink},${OUTLINE},${LIFT}}`,
        `.ps-slat--${tier}.is-stale{background:#fff;color:${text};box-shadow:inset 0 0 0 1.5px ${fill},${OUTLINE},${LIFT}}`,
      ].join('');
    })
    .join('');
  const style = document.createElement('style');

  style.id = 'ps-map-styles';
  style.textContent = `
.leaflet-container{background:${BASEMAP_BACKGROUND};font-family:${fonts.regular},system-ui,sans-serif;outline:none}
.ps-tiles{filter:saturate(.55) brightness(1.04) contrast(.96)}
.ps-marker-host{background:none;border:0}
.ps-slat{position:absolute;left:0;bottom:0;transform:translate(-50%,-7px);display:flex;align-items:flex-start;padding:3px 6px 2px;border-radius:${radius.slat}px;font-family:${fonts.condensedBold},system-ui,sans-serif;font-size:16px;line-height:1.05;white-space:nowrap;font-variant-numeric:tabular-nums;box-shadow:${OUTLINE},${LIFT};cursor:pointer;transition:transform ${motion.duration} ${motion.easing};user-select:none}
.ps-slat small{font-size:10px;margin-left:1px;margin-top:1px}
.ps-slat::after{content:'';position:absolute;left:50%;bottom:-6px;margin-left:-5px;border-style:solid;border-width:6px 5px 0;border-color:#fff transparent transparent}
.ps-slat.is-compact{font-size:15px;padding:2px 5px 2px}
${tierRules}
.ps-slat:hover,.ps-slat.is-highlighted{transform:translate(-50%,-7px) scale(1.12)}
.ps-slat.is-selected{background:${colors.blue};color:#fff;transform:translate(-50%,-9px) scale(1.22);box-shadow:${OUTLINE},0 4px 14px rgba(22,24,27,.38)}
.ps-user{position:absolute;left:0;top:0}
.ps-user__dot{position:absolute;left:-7px;top:-7px;width:14px;height:14px;border-radius:50%;background:${colors.blue};box-shadow:0 0 0 3px #fff,0 1px 4px rgba(22,24,27,.4)}
.ps-user__halo{position:absolute;left:-20px;top:-20px;width:40px;height:40px;border-radius:50%;background:rgba(10,74,143,.14)}
.leaflet-control-attribution{font-family:${fonts.regular},system-ui,sans-serif;font-size:11px;background:rgba(255,255,255,.85)!important;padding:1px 6px!important}
.leaflet-control-attribution a{color:${colors.grey}!important}
.ps-slat__arrow{width:8px;height:8px;margin:4px 0 0 3px}
.ps-slat.is-flash{animation:ps-flash 1.1s ease-out 3}
@keyframes ps-flash{0%{box-shadow:${OUTLINE},0 0 0 0 rgba(10,74,143,.6),${LIFT}}100%{box-shadow:${OUTLINE},0 0 0 14px rgba(10,74,143,0),${LIFT}}}
@media (prefers-reduced-motion:reduce){.ps-slat{transition:none}.ps-slat.is-flash{animation:none}}
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
