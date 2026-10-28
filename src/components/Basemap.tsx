import 'maplibre-gl/dist/maplibre-gl.css';

import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

// OpenFreeMap "Positron": a light, flat vector style (no relief shading) made to let data stand
// out. Free, no key, no account. Rendered by MapLibre GL underneath Leaflet, so markers and
// interactions stay the same.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
// Used only when WebGL is unavailable (very old devices, some locked-down browsers).
const FALLBACK_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const FALLBACK_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const BASEMAP_BACKGROUND = 'rgb(242, 243, 240)';

export function Basemap() {
  const map = useMap();

  useEffect(() => {
    let layer: L.Layer | null = null;
    let isCancelled = false;

    loadVectorLayer()
      .catch(() => L.tileLayer(FALLBACK_TILES, { attribution: FALLBACK_ATTRIBUTION, className: 'ps-tiles', maxZoom: 19 }))
      .then((nextLayer) => {
        if (isCancelled) {
          return;
        }

        layer = nextLayer;
        layer.addTo(map);
      });

    return () => {
      isCancelled = true;
      layer?.remove();
    };
  }, [map]);

  return null;
}

async function loadVectorLayer() {
  if (!supportsWebGl()) {
    throw new Error('WebGL unavailable');
  }

  // Loaded on demand: MapLibre is the heaviest dependency and is not needed for the first paint.
  const [{ maplibreGL }, style] = await Promise.all([import('@maplibre/maplibre-gl-leaflet'), loadStyle()]);

  // The bridge forwards `customAttribution` to Leaflet's attribution control.
  return maplibreGL({ attributionControl: { customAttribution: ATTRIBUTION }, style });
}

async function loadStyle() {
  const response = await fetch(STYLE_URL);

  if (!response.ok) {
    throw new Error(`style ${response.status}`);
  }

  const style = await response.json();

  for (const layer of style.layers ?? []) {
    // French place names first: the default style prefers English.
    if (layer.layout?.['text-field'] && layer.source === 'openmaptiles' && layer['source-layer'] !== 'transportation_name') {
      layer.layout['text-field'] = ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name']];
    }
  }

  return style;
}

function supportsWebGl() {
  try {
    const canvas = document.createElement('canvas');

    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

