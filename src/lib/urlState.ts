import type { MapView } from '../types/map';
import { FuelKey, isFuelKey } from './fuels';

// Shareable URLs: /?carburant=e10&station=75013024&lat=48.8566&lng=2.3522&z=13

export type UrlState = {
  fuel: FuelKey | null;
  stationId: number | null;
  view: MapView | null;
};

export function isMapView(value: unknown): value is MapView {
  const view = value as MapView | null;

  return (
    !!view &&
    Number.isFinite(view.latitude) &&
    Number.isFinite(view.longitude) &&
    Number.isFinite(view.zoom) &&
    Math.abs(view.latitude) <= 90 &&
    Math.abs(view.longitude) <= 180 &&
    view.zoom >= 3 &&
    view.zoom <= 19
  );
}

export function readUrlState(): UrlState {
  if (typeof window === 'undefined') {
    return { fuel: null, stationId: null, view: null };
  }

  const params = new URLSearchParams(window.location.search);
  const fuel = params.get('carburant');
  const stationId = Number(params.get('station'));
  const view = params.has('lat')
    ? { latitude: Number(params.get('lat')), longitude: Number(params.get('lng')), zoom: Number(params.get('z')) }
    : null;

  return {
    fuel: isFuelKey(fuel) ? fuel : null,
    stationId: Number.isInteger(stationId) && stationId > 0 ? stationId : null,
    view: isMapView(view) ? view : null,
  };
}

export function buildShareUrl({ fuel, stationId, view }: { fuel: FuelKey; stationId?: number; view?: MapView }) {
  const params = new URLSearchParams({ carburant: fuel });

  if (stationId) {
    params.set('station', String(stationId));
  }

  if (view) {
    params.set('lat', view.latitude.toFixed(4));
    params.set('lng', view.longitude.toFixed(4));
    params.set('z', String(Math.round(view.zoom * 100) / 100));
  }

  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  return `${origin}/?${params.toString()}`;
}

export function writeUrlState(state: { fuel: FuelKey; stationId: number | null; view: MapView }) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = buildShareUrl({ ...state, stationId: state.stationId ?? undefined });

  if (url !== window.location.href) {
    window.history.replaceState(null, '', url);
  }
}
