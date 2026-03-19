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
import { CitySearchResult, searchCities } from './lib/citySearch';
import { AppLanguage, copy } from './lib/copy';
import { formatMarkerPrice } from './lib/format';
import { FUEL_META, FuelFilter } from './lib/fuels';
import { SearchResultItem } from './lib/searchTypes';
import { getDisplayPrice, getPriceRange, getSearchResults, getSortedStations } from './lib/stationDisplay';
import { colors } from './theme';
import { MapRegion } from './types/map';

const DEFAULT_REGION: MapRegion = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.22,
  longitudeDelta: 0.22,
};

type RefreshMode = 'initial' | 'manual' | 'filter';

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
  const [language, setLanguage] = useState<AppLanguage>('fr');
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSnapshotAt, setLastSnapshotAt] = useState<string | null>(null);
  const [lastCheckAt, setLastCheckAt] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [viewportToken, setViewportToken] = useState(0);
  const hasLoadedOnceRef = useRef(false);
  const requestIdRef = useRef(0);
  const deferredSearch = useDeferredValue(searchText.trim().toLowerCase());

  const selectedStation = stations.find((station) => station.id === selectedStationId) ?? null;
  const priceRange = getPriceRange(stations, activeFuel);
  const topStations = getSortedStations(stations, activeFuel).slice(0, 3);
  const isDesktop = width >= 1080;
  const t = copy[language];

  const loadStations = useEffectEvent(async (nextRegion: MapRegion, fuelFilter: FuelFilter, mode: RefreshMode) => {
    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;

    if (mode === 'initial') {
      setIsLoading(true);
    } else if (mode === 'manual') {
      setIsRefreshing(true);
    }

    try {
      const response = await fetchStations({
        forceRefresh: mode === 'manual',
        region: nextRegion,
        fuelFilter,
        limit: 220,
      });

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      startTransition(() => {
        setStations(response.stations);
        setLastSnapshotAt(response.fetchedAt);
        setSelectedStationId((currentId) =>
          response.stations.some((station) => station.id === currentId) ? currentId : null,
        );
      });
      if (mode === 'manual') {
        setLastCheckAt(new Date().toISOString());
      }
      hasLoadedOnceRef.current = true;
      setErrorMessage(null);
    } catch (error) {
      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de récupérer les stations pour l'instant.",
      );
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  });

  const centerOnLocation = useEffectEvent(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setErrorMessage("La géolocalisation est refusée. L'app reste centrée sur Paris.");
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
      setErrorMessage("Impossible d'accéder à votre position pour le moment.");
    }
  });

  useEffect(() => {
    if (autoLocateOnMount) {
      centerOnLocation();
    }
  }, [autoLocateOnMount, centerOnLocation]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadStations(region, activeFuel, hasLoadedOnceRef.current ? 'filter' : 'initial');
    }, 320);

    return () => clearTimeout(timeoutId);
  }, [activeFuel, loadStations, region]);

  useEffect(() => {
    let isMounted = true;

    if (!deferredSearch) {
      setSearchResults([]);
      return () => {
        isMounted = false;
      };
    }

    const stationMatches = getSearchResults(stations, deferredSearch, activeFuel).map((station) => ({
      kind: 'station' as const,
      station,
    }));

    searchCities(deferredSearch).then((cityMatches) => {
      if (!isMounted) {
        return;
      }

      setSearchResults([
        ...cityMatches.map((city) => ({
          city,
          kind: 'city' as const,
        })),
        ...stationMatches,
      ]);
    });

    return () => {
      isMounted = false;
    };
  }, [activeFuel, deferredSearch, stations]);

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

  function focusCity(city: CitySearchResult) {
    setSelectedStationId(null);
    setRegion(city.region);
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
          <Text style={styles.loadingTitle}>{t.app.loadingTitle}</Text>
          <Text style={styles.loadingSubtitle}>{t.app.loadingSubtitle}</Text>
          <ActivityIndicator color={colors.sun} style={styles.loadingSpinner} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
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
            colors={['rgba(243, 239, 232, 0.94)', 'rgba(243, 239, 232, 0.52)', 'rgba(243, 239, 232, 0)']}
            pointerEvents="none"
            style={styles.topShade}
          />
          <LinearGradient
            colors={['rgba(243, 239, 232, 0)', 'rgba(243, 239, 232, 0.36)', 'rgba(243, 239, 232, 0.94)']}
            pointerEvents="none"
            style={styles.bottomShade}
          />

          <View pointerEvents="box-none" style={styles.overlay}>
            <TopOverlay
              activeFuel={activeFuel}
              getStationDisplayPrice={(station) => getDisplayPrice(station, activeFuel)}
              isRefreshing={isRefreshing}
              language={language}
              lastSyncAt={lastCheckAt ?? lastSnapshotAt}
              onCenterUser={centerOnLocation}
              onChangeFuel={setActiveFuel}
              onChangeLanguage={setLanguage}
              onChangeSearch={setSearchText}
              onFocusCity={focusCity}
              onFocusStation={focusStation}
              onRefresh={() => loadStations(region, activeFuel, 'manual')}
              priceRange={priceRange}
              searchResults={searchResults}
              searchText={searchText}
              stationsCount={stations.length}
            />

            {selectedStation && isDesktop ? (
              <View pointerEvents="box-none" style={styles.desktopSheetRail}>
                <StationSheet
                  activeFuel={activeFuel}
                  language={language}
                  onClose={() => setSelectedStationId(null)}
                  onOpenDirections={() => openDirections(selectedStation)}
                  station={selectedStation}
                  userLocation={userLocation}
                  visibleStations={stations}
                />
              </View>
            ) : null}

            <View pointerEvents="box-none" style={[styles.bottomPanel, isDesktop && styles.bottomPanelDesktop]}>
              {errorMessage ? (
                <View style={styles.alertCard}>
                  <Text style={styles.alertTitle}>{t.app.networkTitle}</Text>
                  <Text style={styles.alertBody}>{errorMessage}</Text>
                </View>
              ) : null}

              <View
                pointerEvents="box-none"
                style={[
                  styles.bottomPanelContent,
                  selectedStation && !isDesktop ? styles.bottomPanelContentStart : styles.bottomPanelContentCenter,
                ]}
              >
                {selectedStation && !isDesktop ? (
                  <StationSheet
                    activeFuel={activeFuel}
                    language={language}
                    onClose={() => setSelectedStationId(null)}
                    onOpenDirections={() => openDirections(selectedStation)}
                    station={selectedStation}
                    userLocation={userLocation}
                    visibleStations={stations}
                  />
                ) : !selectedStation ? (
                  <SummaryCard
                    getStationDisplayPrice={(station) => getDisplayPrice(station, activeFuel)}
                    isLoading={isLoading}
                    language={language}
                    onFocusStation={focusStation}
                    stations={topStations}
                    userLocation={userLocation}
                  />
                ) : null}
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
    backgroundColor: colors.background,
    flex: 1,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topShade: {
    ...StyleSheet.absoluteFillObject,
    height: 220,
  },
  bottomShade: {
    bottom: 0,
    height: 280,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  desktopSheetRail: {
    bottom: 24,
    position: 'absolute',
    right: 20,
    top: 200,
    width: 376,
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
    backgroundColor: '#FFF3F0',
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
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    marginTop: 6,
  },
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: colors.background,
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
