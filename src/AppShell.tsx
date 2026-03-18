import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { ComponentType, startTransition, useDeferredValue, useEffect, useEffectEvent, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from './components/BrandMark';
import { StationMapProps } from './components/StationMap.types';
import { StationSheet } from './components/StationSheet';
import { SummaryCard } from './components/SummaryCard';
import { TopOverlay } from './components/TopOverlay';
import { fetchStationsInRegion, Station } from './lib/carburantsApi';
import { formatMarkerPrice } from './lib/format';
import { FUEL_META, FuelFilter } from './lib/fuels';
import { getDisplayPrice, getPriceRange, getSearchResults, getSortedStations } from './lib/stationDisplay';
import { colors } from './theme';
import { MapRegion } from './types/map';

const DEFAULT_REGION: MapRegion = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.22,
  longitudeDelta: 0.22,
};

type RefreshMode = 'initial' | 'manual' | 'background';

type AppShellProps = {
  autoLocateOnMount?: boolean;
  fetchStations: typeof fetchStationsInRegion;
  StationMapComponent: ComponentType<StationMapProps>;
};

export function AppShell({ autoLocateOnMount = true, fetchStations, StationMapComponent }: AppShellProps) {
  const { width } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [activeFuel, setActiveFuel] = useState<FuelFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [viewportToken, setViewportToken] = useState(0);
  const hasLoadedOnceRef = useRef(false);
  const requestIdRef = useRef(0);
  const deferredSearch = useDeferredValue(searchText.trim().toLowerCase());

  const selectedStation = stations.find((station) => station.id === selectedStationId) ?? null;
  const priceRange = getPriceRange(stations, activeFuel);
  const topStations = getSortedStations(stations, activeFuel).slice(0, 3);
  const searchResults = getSearchResults(stations, deferredSearch, activeFuel);
  const isDesktop = width >= 1080;

  const loadStations = useEffectEvent(async (nextRegion: MapRegion, fuelFilter: FuelFilter, mode: RefreshMode) => {
    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;

    if (mode === 'initial') {
      setIsLoading(true);
    } else if (mode === 'manual') {
      setIsRefreshing(true);
    } else {
      setIsBackgroundRefreshing(true);
    }

    try {
      const response = await fetchStations({
        region: nextRegion,
        fuelFilter,
        limit: 220,
      });

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      startTransition(() => {
        setStations(response.stations);
        setLastSyncAt(response.fetchedAt);
        setSelectedStationId((currentId) =>
          response.stations.some((station) => station.id === currentId) ? currentId : null,
        );
      });
      hasLoadedOnceRef.current = true;
      setErrorMessage(null);
    } catch (error) {
      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de recuperer les stations pour l'instant.",
      );
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsBackgroundRefreshing(false);
      }
    }
  });

  const centerOnLocation = useEffectEvent(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setErrorMessage("La geolocalisation est refusee. L'app reste centree sur Paris.");
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextRegion = {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      };

      setUserLocation({
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      });
      setRegion(nextRegion);
      setViewportToken((value) => value + 1);
    } catch {
      setErrorMessage("Impossible d'acceder a votre position pour le moment.");
    }
  });

  useEffect(() => {
    if (autoLocateOnMount) {
      centerOnLocation();
    }
  }, [autoLocateOnMount, centerOnLocation]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadStations(region, activeFuel, hasLoadedOnceRef.current ? 'manual' : 'initial');
    }, 320);

    return () => clearTimeout(timeoutId);
  }, [activeFuel, loadStations, region]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadStations(region, activeFuel, 'background');
    }, 90000);

    return () => clearInterval(intervalId);
  }, [activeFuel, loadStations, region]);

  function focusStation(station: Station) {
    setSelectedStationId(station.id);
    const nextRegion = {
      latitude: station.coordinates.latitude,
      longitude: station.coordinates.longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    };

    setRegion(nextRegion);
    setViewportToken((value) => value + 1);
    setSearchText('');
  }

  async function openDirections(station: Station) {
    const destination = `${station.coordinates.latitude},${station.coordinates.longitude}`;
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destination}`);
  }

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingScreen}>
          <LinearGradient colors={[colors.ink, colors.midnight, colors.night]} style={StyleSheet.absoluteFill} />
          <BrandMark size={88} />
          <Text style={styles.loadingTitle}>PleinSpot</Text>
          <Text style={styles.loadingSubtitle}>Chargement de la carte carburants</Text>
          <ActivityIndicator color={colors.sun} style={styles.loadingSpinner} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.container}>
          <StationMapComponent
            getMarkerPresentation={(station) => {
              const displayPrice = getDisplayPrice(station, activeFuel);
              const tone = getMarkerTone(displayPrice?.value ?? null, priceRange.min, priceRange.max);

              return {
                fuelLabel: displayPrice ? FUEL_META[displayPrice.fuelKey].shortLabel : 'N/A',
                priceLabel: displayPrice ? formatMarkerPrice(displayPrice.value) : 'Indispo',
                tone,
              };
            }}
            onMapPress={() => setSelectedStationId(null)}
            onRegionChangeComplete={setRegion}
            onSelectStation={setSelectedStationId}
            region={region}
            selectedStationId={selectedStationId}
            stations={stations}
            userLocation={userLocation}
            viewportToken={viewportToken}
          />

          <LinearGradient
            colors={['rgba(7, 19, 29, 0.84)', 'rgba(7, 19, 29, 0.34)', 'rgba(7, 19, 29, 0)']}
            pointerEvents="none"
            style={styles.topShade}
          />
          <LinearGradient
            colors={['rgba(7, 19, 29, 0)', 'rgba(7, 19, 29, 0.48)', 'rgba(7, 19, 29, 0.86)']}
            pointerEvents="none"
            style={styles.bottomShade}
          />
          <View pointerEvents="none" style={styles.topGlow} />
          <View pointerEvents="none" style={styles.bottomGlow} />

          <View pointerEvents="box-none" style={styles.overlay}>
            <TopOverlay
              activeFuel={activeFuel}
              getStationDisplayPrice={(station) => getDisplayPrice(station, activeFuel)}
              isRefreshing={isRefreshing || isBackgroundRefreshing}
              lastSyncAt={lastSyncAt}
              onCenterUser={centerOnLocation}
              onChangeFuel={setActiveFuel}
              onChangeSearch={setSearchText}
              onFocusStation={focusStation}
              onRefresh={() => loadStations(region, activeFuel, 'manual')}
              priceRange={priceRange}
              searchResults={searchResults}
              searchText={searchText}
              stationsCount={stations.length}
            />

            <View pointerEvents="box-none" style={[styles.bottomPanel, isDesktop && styles.bottomPanelDesktop]}>
              {errorMessage ? (
                <View style={styles.alertCard}>
                  <Text style={styles.alertTitle}>Reseau indisponible</Text>
                  <Text style={styles.alertBody}>{errorMessage}</Text>
                </View>
              ) : null}

              <View
                pointerEvents="box-none"
                style={[
                  styles.bottomPanelContent,
                  selectedStation ? styles.bottomPanelContentStart : styles.bottomPanelContentCenter,
                ]}
              >
                {selectedStation ? (
                  <StationSheet
                    activeFuel={activeFuel}
                    onClose={() => setSelectedStationId(null)}
                    onOpenDirections={() => openDirections(selectedStation)}
                    station={selectedStation}
                    userLocation={userLocation}
                  />
                ) : (
                  <SummaryCard
                    getStationDisplayPrice={(station) => getDisplayPrice(station, activeFuel)}
                    isLoading={isLoading}
                    onFocusStation={focusStation}
                    stations={topStations}
                    userLocation={userLocation}
                  />
                )}
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function getMarkerTone(price: number | null, min: number | null, max: number | null) {
  if (price == null || min == null || max == null) {
    return colors.steel;
  }

  if (min === max) {
    return colors.mint;
  }

  const ratio = (price - min) / (max - min);

  if (ratio <= 0.33) {
    return colors.mint;
  }

  if (ratio <= 0.66) {
    return colors.sun;
  }

  return colors.coral;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.ink,
    flex: 1,
  },
  container: {
    backgroundColor: colors.ink,
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topShade: {
    ...StyleSheet.absoluteFillObject,
    height: 240,
  },
  bottomShade: {
    bottom: 0,
    height: 360,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  topGlow: {
    backgroundColor: colors.glowAqua,
    borderRadius: 240,
    height: 240,
    left: -80,
    position: 'absolute',
    top: -70,
    width: 240,
  },
  bottomGlow: {
    backgroundColor: colors.glowSun,
    borderRadius: 260,
    bottom: -120,
    height: 260,
    position: 'absolute',
    right: -70,
    width: 260,
  },
  bottomPanel: {
    alignItems: 'flex-start',
    alignSelf: 'center',
    maxWidth: 1380,
    paddingBottom: 18,
    paddingHorizontal: 16,
    width: '100%',
  },
  bottomPanelDesktop: {
    paddingBottom: 26,
    paddingHorizontal: 20,
  },
  bottomPanelContent: {
    width: '100%',
  },
  bottomPanelContentCenter: {
    alignItems: 'center',
  },
  bottomPanelContentStart: {
    alignItems: 'flex-start',
  },
  alertCard: {
    backgroundColor: 'rgba(127, 29, 29, 0.88)',
    borderColor: colors.coral,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    width: '100%',
  },
  alertTitle: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
  },
  alertBody: {
    color: '#FCE7E7',
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    marginTop: 6,
  },
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    flex: 1,
    justifyContent: 'center',
  },
  loadingTitle: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 30,
    marginTop: 22,
  },
  loadingSubtitle: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    marginTop: 8,
  },
  loadingSpinner: {
    marginTop: 22,
  },
});
