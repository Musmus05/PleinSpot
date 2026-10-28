export type MapRegion = {
  latitude: number;
  latitudeDelta: number;
  longitude: number;
  longitudeDelta: number;
};

/** Centre + zoom level: unlike a region, it does not depend on the screen's aspect ratio. */
export type MapView = {
  latitude: number;
  longitude: number;
  zoom: number;
};
