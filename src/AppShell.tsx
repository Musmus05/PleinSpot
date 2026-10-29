import { Barlow_400Regular } from '@expo-google-fonts/barlow/400Regular';
import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_600SemiBold } from '@expo-google-fonts/barlow/600SemiBold';
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { useFonts } from 'expo-font';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AboutModal } from './components/AboutModal';
import { BrandMark, Wordmark } from './components/BrandMark';
import { FuelPicker } from './components/FuelPicker';
import { ChevronDown, ChevronUp, CircleAlert, LocateFixed, RefreshCw } from './components/icons';
import { SearchBox } from './components/SearchBox';
import { StationDetails } from './components/StationDetails';
import { ListEntry, StationList } from './components/StationList';
import { MapPadding, MapViewportRequest, StationMap } from './components/StationMap';
import { Button, IconButton } from './components/ui';
import { ZoneSummary } from './components/ZoneSummary';
import { openConsentSettings, track } from './lib/analytics';
import { fetchStation, fetchStations, subscribeToPriceUpdates } from './lib/api';
import { getStationTitle } from './lib/brands';
import { AppLanguage, copy } from './lib/copy';
import { formatCount, formatPrice, formatPriceValue, formatRelativeTime, getDistanceInKm } from './lib/format';
import { DEFAULT_FUEL, FUEL_META, FuelKey, isFuelKey } from './lib/fuels';
import { readPreference, writePreference } from './lib/storage';
import { isMapView, readUrlState, writeUrlState } from './lib/urlState';
import { breakpoints, colors, fonts, motion, radius, shadows, tierColors, type } from './theme';
import type { MapRegion, MapView } from './types/map';
import type { PriceChange, PriceChanges } from './lib/pricing';
import type { CitySearchResult, LatLng, Station, StationsResponse } from './types/station';

const FRANCE_REGION: MapRegion = {
  latitude: 46.6,
  latitudeDelta: 9.4,
  longitude: 2.45,
  longitudeDelta: 11,
};
const LOAD_DEBOUNCE_MS = 260;
const NOTICE_DURATION_MS = 6000;
const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
// A price that moved stays marked as "just changed" for this long.
const RECENT_CHANGE_MS = 30 * 60 * 1000;
const CLOCK_TICK_MS = 30 * 1000;

type SortMode = 'price' | 'distance';
type LoadState = 'loading' | 'ready' | 'error';

export function AppShell() {
  return (
    <SafeAreaProvider>
      <FontGate>
        <PleinSpot />
      </FontGate>
    </SafeAreaProvider>
  );
}

function FontGate({ children }: { children: ReactNode }) {
  const [loaded, error] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
  });

  if (!loaded && !error) {
    return (
      <View style={styles.splash}>
        <BrandMark size={72} />
        <ActivityIndicator color={colors.blue} style={styles.splashSpinner} />
      </View>
    );
  }

  return children;
}

function isLanguage(value: unknown): value is AppLanguage {
  return value === 'fr' || value === 'en';
}

function getInitialState() {
  const url = readUrlState();
  const navigatorLanguage = typeof navigator === 'undefined' ? 'fr' : navigator.language;

  return {
    fuel: url.fuel ?? readPreference('fuel', isFuelKey) ?? DEFAULT_FUEL,
    hasUrlPosition: url.view != null || url.stationId != null,
    language: readPreference('language', isLanguage) ?? (navigatorLanguage.toLowerCase().startsWith('fr') ? 'fr' : 'en'),
    mapView: (() => {
      const view = url.view ?? readPreference('view', isMapView);

      return view ? { view } : { region: FRANCE_REGION };
    })(),
    stationId: url.stationId,
  };
}

function PleinSpot() {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [initial] = useState(getInitialState);
  const [language, setLanguage] = useState<AppLanguage>(initial.language);
  const [fuel, setFuel] = useState<FuelKey>(initial.fuel);
  const [region, setRegion] = useState<MapRegion | null>(null);
  const [mapView, setMapView] = useState<MapView | null>(null);
  const [viewport, setViewport] = useState<MapViewportRequest | null>(null);
  const [response, setResponse] = useState<StationsResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isFetching, setIsFetching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<Station | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('price');
  const [notice, setNotice] = useState<string | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [topOverlayHeight, setTopOverlayHeight] = useState(128);
  const [now, setNow] = useState(() => Date.now());
  const [liveVersion, setLiveVersion] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [recentChanges, setRecentChanges] = useState<PriceChanges>({});
  const [liveMessage, setLiveMessage] = useState<string | null>(null);
  const forceRefreshRef = useRef(false);
  const responseRef = useRef<StationsResponse | null>(null);

  const t = copy[language];
  const languageRef = useRef(language);

  languageRef.current = language;
  const isDesktop = width >= breakpoints.desktop;
  const sidebarWidth = width >= breakpoints.wide ? 440 : 400;
  const limit = isDesktop ? 200 : 120;
  // While a new fuel is loading, keep rendering the previous response with its own fuel so
  // prices, colours and stats always stay consistent with each other.
  const displayFuel = response?.fuel ?? fuel;
  const stats = response?.stats ?? null;
  const stations = response?.stations ?? [];
  const bestPrice = stats && stats.count > 1 ? stats.min : null;

  const tokenRef = useRef(0);

  const moveTo = useCallback((target: MapViewportRequest['target']) => {
    tokenRef.current += 1;
    setViewport({ target, token: tokenRef.current });
  }, []);

  // ----- Data loading -------------------------------------------------------------------------

  useEffect(() => {
    if (!region) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsFetching(true);

      try {
        const result = await fetchStations({
          forceRefresh: forceRefreshRef.current,
          fuel,
          limit,
          region,
          signal: controller.signal,
          version: liveVersion,
        });
        const previous = responseRef.current;

        forceRefreshRef.current = false;
        responseRef.current = result;
        setResponse(result);
        setLoadState('ready');

        // New official data for the same fuel: every price that differs really moved.
        if (previous && previous.fuel === result.fuel && previous.fetchedAt !== result.fetchedAt) {
          const changes = diffPrices(previous, result);
          const count = Object.keys(changes).length;

          if (count > 0) {
            setRecentChanges((current) => ({ ...current, ...changes }));
            setLiveMessage(copy[languageRef.current].live.changed(count));
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setLoadState('error');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsFetching(false);
        }
      }
    }, LOAD_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [fuel, limit, liveVersion, refreshKey, region]);

  // Keep the selected station in sync with fresh prices.
  useEffect(() => {
    if (!selected || !response) {
      return;
    }

    const fresh = response.stations.find((station) => station.id === selected.id);

    if (fresh && fresh !== selected) {
      setSelected(fresh);
    }
  }, [response, selected]);

  // Live prices: reload the visible area as soon as the server has a new official file.
  useEffect(
    () =>
      subscribeToPriceUpdates({
        onConnectionChange: setIsLive,
        onUpdate: (update) => {
          if (responseRef.current && update.fetchedAt && update.fetchedAt !== responseRef.current.fetchedAt) {
            setLiveVersion(update.fetchedAt);
          }
        },
      }),
    [],
  );

  // Deep link: /?station=123
  useEffect(() => {
    if (!initial.stationId) {
      return;
    }

    fetchStation(initial.stationId).then((result) => {
      if (!result) {
        return;
      }

      setSelected(result.station);
      moveTo({ kind: 'region', region: regionAround(result.station.coordinates, 0.04) });
    });
  }, [initial.stationId, moveTo]);

  // ----- Side effects: clock, persistence, URL, title -----------------------------------------

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);

    return () => clearInterval(intervalId);
  }, []);

  // Forget changes once they are no longer news.
  useEffect(() => {
    setRecentChanges((current) => {
      const kept = Object.entries(current).filter(([, change]) => now - change.at < RECENT_CHANGE_MS);

      return kept.length === Object.keys(current).length ? current : Object.fromEntries(kept);
    });
  }, [now]);

  useEffect(() => {
    if (!liveMessage) {
      return;
    }

    const timeoutId = setTimeout(() => setLiveMessage(null), NOTICE_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, [liveMessage]);

  useEffect(() => {
    writePreference('fuel', fuel);
  }, [fuel]);

  useEffect(() => {
    writePreference('language', language);

    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  useEffect(() => {
    if (!mapView) {
      return;
    }

    const timeoutId = setTimeout(() => {
      writePreference('view', mapView);
      writeUrlState({ fuel, stationId: selected?.id ?? null, view: mapView });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [fuel, mapView, selected?.id]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const price = selected?.prices[displayFuel];
    const name = selected ? getStationTitle(selected) : null;

    document.title =
      selected && price
        ? `${name} · ${FUEL_META[displayFuel].label[language]} ${formatPrice(price.value, language)} — PleinSpot`
        : language === 'fr'
          ? 'PleinSpot — Prix des carburants les moins chers autour de vous'
          : 'PleinSpot — The cheapest fuel prices near you';
  }, [displayFuel, language, selected]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);

    return () => clearTimeout(timeoutId);
  }, [notice]);

  // ----- Actions ------------------------------------------------------------------------------

  const locateUser = useCallback(
    (options: { silent?: boolean } = {}) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        if (!options.silent) {
          setNotice(copy[language].app.locationUnavailable);
        }
        return;
      }

      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = { latitude: position.coords.latitude, longitude: position.coords.longitude };

          setIsLocating(false);
          setUserLocation(location);
          setSelected(null);
          moveTo({ kind: 'region', region: regionAround(location, 0.09) });
          track('locate');
        },
        (error) => {
          setIsLocating(false);

          if (!options.silent) {
            setNotice(error.code === 1 ? copy[language].app.locationDenied : copy[language].app.locationUnavailable);
          }
        },
        { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 12000 },
      );
    },
    [language, moveTo],
  );

  // Returning visitors who already allowed geolocation land directly around them.
  useEffect(() => {
    if (initial.hasUrlPosition || typeof navigator === 'undefined' || !navigator.permissions?.query) {
      return;
    }

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (status.state === 'granted') {
          locateUser({ silent: true });
        }
      })
      .catch(() => undefined);
  }, []);

  const selectStation = useCallback(
    (station: Station, options: { focus?: 'point' | 'region' } = {}) => {
      setSelected(station);
      setHighlightedId(null);
      track('select_station', { fuel: displayFuel, station_id: station.id });

      if (options.focus === 'region') {
        moveTo({ kind: 'region', region: regionAround(station.coordinates, 0.03) });
      } else if (options.focus === 'point') {
        moveTo({ coordinates: station.coordinates, kind: 'point' });
      }
    },
    [displayFuel, moveTo],
  );

  const handleMapSelect = useCallback(
    (station: Station) => {
      selectStation(station, { focus: isDesktop ? undefined : 'point' });
    },
    [isDesktop, selectStation],
  );

  const handleListSelect = useCallback(
    (station: Station) => {
      selectStation(station, { focus: 'point' });
    },
    [selectStation],
  );

  const handleRegionChange = useCallback((nextRegion: MapRegion, nextView: MapView) => {
    setRegion(nextRegion);
    setMapView(nextView);
  }, []);

  function selectCity(city: CitySearchResult) {
    setSelected(null);
    moveTo({ kind: 'region', region: city.region });
    track('search_city', { city: city.label });
  }

  function changeFuel(nextFuel: FuelKey) {
    if (nextFuel !== fuel) {
      setFuel(nextFuel);
      track('select_fuel', { fuel: nextFuel });
    }
  }

  function changeSort(mode: SortMode) {
    setSortMode(mode);

    if (mode === 'distance' && !userLocation) {
      locateUser();
    }
  }

  function retry() {
    forceRefreshRef.current = true;
    setLoadState('loading');
    setRefreshKey((value) => value + 1);
  }

  // Escape closes the station panel.
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && selected && !isAboutOpen) {
        setSelected(null);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isAboutOpen, selected]);

  // ----- Derived data -------------------------------------------------------------------------

  const entries = useMemo<ListEntry[]>(() => {
    const list = stations.map((station) => ({
      distanceKm: userLocation ? getDistanceInKm(userLocation, station.coordinates) : null,
      station,
    }));

    if (sortMode === 'distance' && userLocation) {
      list.sort((left, right) => (left.distanceKm ?? 0) - (right.distanceKm ?? 0));
    }

    return list;
  }, [sortMode, stations, userLocation]);

  const selectedRank = getRank(selected, stations, displayFuel);
  const selectedDistance = selected && userLocation ? getDistanceInKm(userLocation, selected.coordinates) : null;
  const dataUpdated = response ? formatRelativeTime(response.publishedAt, language, now) : null;
  const fuelLabel = FUEL_META[displayFuel].label[language];

  // ----- Rendering ----------------------------------------------------------------------------

  const listHeader = (
    <View style={styles.listHeader}>
      {response && stats ? (
        <ZoneSummary
          distribution={response.distribution}
          fuel={displayFuel}
          language={language}
          national={response.national}
          showTitle={isDesktop}
          stats={stats}
          total={response.total}
        />
      ) : null}

      {loadState === 'error' && !response ? (
        <ErrorMessage language={language} onRetry={retry} />
      ) : response && stations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t.zone.emptyTitle(fuelLabel)}</Text>
          <Text style={styles.emptyBody}>{t.zone.emptyBody}</Text>
        </View>
      ) : null}

      {stations.length > 1 ? (
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>{t.list.sortLabel}</Text>
          <Segmented
            onChange={changeSort}
            options={[
              { label: t.list.sortPrice, value: 'price' },
              { label: t.list.sortDistance, value: 'distance' },
            ]}
            value={sortMode === 'distance' && userLocation ? 'distance' : 'price'}
          />
        </View>
      ) : null}

      {!response && loadState === 'loading' ? <ListSkeleton /> : null}
    </View>
  );

  const stationList = (
    <StationList
      bestPrice={bestPrice}
      changes={recentChanges}
      entries={entries}
      fuel={displayFuel}
      header={listHeader}
      highlightedStationId={highlightedId}
      language={language}
      now={now}
      onHover={setHighlightedId}
      onSelect={handleListSelect}
      stats={stats}
    />
  );

  const stationDetails = selected ? (
    <StationDetails
      changes={recentChanges}
      distanceKm={selectedDistance}
      distribution={response?.distribution ?? null}
      fuel={displayFuel}
      language={language}
      national={response?.national ?? null}
      now={now}
      onBack={() => setSelected(null)}
      onChangeFuel={changeFuel}
      rank={selectedRank}
      station={selected}
      stats={stats}
      total={response?.total ?? 0}
      variant={isDesktop ? 'panel' : 'sheet'}
    />
  ) : null;

  const searchBox = (
    <SearchBox
      fuel={displayFuel}
      language={language}
      onSelectCity={selectCity}
      onSelectStation={(station) => selectStation(station, { focus: 'region' })}
      onUseLocation={() => locateUser()}
      stations={stations}
      stats={stats}
    />
  );

  const fuelPicker = (layout: 'row' | 'scroll') => (
    <FuelPicker fuel={fuel} language={language} layout={layout} onChange={changeFuel} overview={response?.overview ?? null} />
  );

  const status =
    loadState === 'error' && response ? (
      <Pressable accessibilityRole="button" onPress={retry} style={[styles.status, shadows.floating]}>
        <CircleAlert color={colors.red} size={16} />
        <Text style={[styles.statusText, { color: colors.red }]}>{t.app.errorTitle}</Text>
        <Text style={styles.statusAction}>{t.app.retry}</Text>
      </Pressable>
    ) : isFetching || (!response && loadState === 'loading') ? (
      <View style={[styles.status, shadows.floating]}>
        <ActivityIndicator color={colors.blue} size="small" />
        <Text style={styles.statusText}>{response ? t.app.updating : t.app.loading}</Text>
      </View>
    ) : null;

  const liveToast = liveMessage ? (
    <Pressable onPress={() => setLiveMessage(null)} style={[styles.status, styles.notice, shadows.floating]}>
      <RefreshCw color={colors.blue} size={16} />
      <Text style={styles.noticeText}>{liveMessage}</Text>
    </Pressable>
  ) : null;

  const noticeMessage = notice ? (
    <Pressable onPress={() => setNotice(null)} style={[styles.status, styles.notice, shadows.floating]}>
      <CircleAlert color={colors.yellowText} size={16} />
      <Text style={styles.noticeText}>{notice}</Text>
    </Pressable>
  ) : null;

  const map = (padding: MapPadding) => (
    <StationMap
      bestPrice={bestPrice}
      changes={recentChanges}
      compact={!isDesktop}
      fuel={displayFuel}
      highlightedStationId={highlightedId}
      initialView={initial.mapView}
      language={language}
      onMapPress={() => {
        setSelected(null);
        setIsSheetExpanded(false);
      }}
      onRegionChange={handleRegionChange}
      onSelectStation={handleMapSelect}
      onUserDrag={() => setIsSheetExpanded(false)}
      padding={padding}
      selectedStation={selected}
      stations={stations}
      stats={stats}
      userLocation={userLocation}
      viewport={viewport}
    />
  );

  const about = <AboutModal language={language} onClose={() => setIsAboutOpen(false)} visible={isAboutOpen} />;

  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <View style={[styles.sidebar, { width: sidebarWidth }]}>
          <View style={styles.sign}>
            <View pointerEvents="none" style={styles.signRule} />
            <View style={styles.signTop}>
              <Wordmark size={26} />
              <LanguageToggle language={language} onChange={setLanguage} />
            </View>
            <View style={styles.signSearch}>{searchBox}</View>
          </View>

          {selected ? (
            stationDetails
          ) : (
            <>
              <View style={styles.fuelBar}>{fuelPicker('row')}</View>
              {stationList}
            </>
          )}

          <View style={styles.footer}>
            <View style={styles.footerCopy}>
              <LiveLine isLive={isLive} label={dataUpdated ? t.app.dataUpdated(dataUpdated) : t.app.loading} language={language} />
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL(OSM_COPYRIGHT_URL)}>
                <Text numberOfLines={1} style={styles.footerText}>
                  {t.app.osmCredit}
                </Text>
              </Pressable>
            </View>
            <FooterLink label={t.app.about} onPress={() => setIsAboutOpen(true)} />
            <FooterLink label={t.app.cookies} onPress={openConsentSettings} />
          </View>
        </View>

        <View style={styles.mapArea}>
          {map({ bottom: 64, left: 48, right: 72, top: 72 })}
          <View pointerEvents="box-none" style={styles.mapTop}>
            {status}
            {liveToast}
            {noticeMessage}
          </View>
          <MapLegend language={language} />
          <View style={styles.desktopLocate}>
            <LocateButton isLocating={isLocating} label={t.app.locate} onPress={() => locateUser()} />
          </View>
        </View>
        {about}
      </View>
    );
  }

  // ----- Mobile -------------------------------------------------------------------------------

  const collapsedSheetHeight = (stations.length > 0 ? 168 : 84) + insets.bottom;
  const sheetHeight = selected ? Math.round(height * 0.72) : isSheetExpanded ? Math.round(height * 0.64) : collapsedSheetHeight;

  return (
    <View style={styles.mobileRoot}>
      {map({ bottom: sheetHeight + 24, left: 32, right: 32, top: topOverlayHeight + 24 })}

      <View
        onLayout={(event) => setTopOverlayHeight(Math.round(event.nativeEvent.layout.height))}
        style={[styles.mobileTop, shadows.floating]}
      >
        <View style={[styles.mobileBand, { paddingTop: insets.top + 8 }]}>
          <Pressable accessibilityLabel={t.app.about} accessibilityRole="button" onPress={() => setIsAboutOpen(true)}>
            <BrandMark size={40} />
          </Pressable>
          <View style={styles.mobileSearch}>{searchBox}</View>
        </View>
        <View style={styles.mobileFuel}>{fuelPicker('scroll')}</View>
      </View>

      <View pointerEvents="box-none" style={[styles.mobileStatus, { top: topOverlayHeight + 10 }]}>
        {status}
        {liveToast}
        {noticeMessage}
      </View>

      <View pointerEvents="box-none" style={[styles.mobileFloating, { bottom: sheetHeight + 12 }]}>
        <Text style={styles.mobileAttribution}>© OpenFreeMap · © OpenStreetMap</Text>
        <LocateButton compact isLocating={isLocating} label={t.app.locate} onPress={() => locateUser()} />
      </View>

      <View style={[styles.sheet, shadows.floating, { height: sheetHeight, paddingBottom: insets.bottom }]}>
        {selected ? (
          <>
            <View style={styles.sheetHandleArea}>
              <View style={styles.sheetHandle} />
            </View>
            {stationDetails}
          </>
        ) : (
          <>
            <Pressable
              accessibilityLabel={isSheetExpanded ? t.sheet.collapse : t.sheet.expand}
              accessibilityRole="button"
              onPress={() => setIsSheetExpanded((value) => !value)}
              style={styles.sheetHeader}
            >
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeaderRow}>
                <View style={styles.sheetHeaderCopy}>
                  <Text numberOfLines={1} style={styles.sheetTitle}>
                    {response ? `${fuelLabel}  ` : t.app.loading}
                    {response ? <Text style={styles.sheetCount}>{t.zone.stations(formatCount(response.total, language))}</Text> : null}
                  </Text>
                  {stats ? (
                    <Text numberOfLines={1} style={styles.sheetSubtitle}>
                      {formatPriceValue(stats.min, language)} {t.zone.lowest}
                      {dataUpdated ? ` · ${t.app.dataUpdated(dataUpdated)}` : ''}
                    </Text>
                  ) : null}
                </View>
                {stations.length > 0 ? (
                  isSheetExpanded ? (
                    <ChevronDown color={colors.grey} size={24} />
                  ) : (
                    <ChevronUp color={colors.grey} size={24} />
                  )
                ) : null}
              </View>
            </Pressable>

            {isSheetExpanded ? (
              stationList
            ) : loadState === 'error' && !response ? (
              <View style={styles.sheetError}>
                <ErrorMessage language={language} onRetry={retry} />
              </View>
            ) : (
              <StationList
                bestPrice={bestPrice}
                changes={recentChanges}
                entries={entries.slice(0, 1)}
                fuel={displayFuel}
                highlightedStationId={null}
                language={language}
                now={now}
                onHover={setHighlightedId}
                onSelect={handleListSelect}
                scrollEnabled={false}
                stats={stats}
              />
            )}
          </>
        )}
      </View>
      {about}
    </View>
  );
}

function diffPrices(previous: StationsResponse, next: StationsResponse): PriceChanges {
  const before = new Map(previous.stations.map((station) => [station.id, station]));
  const changes: PriceChanges = {};
  const at = Date.now();

  for (const station of next.stations) {
    const from = before.get(station.id)?.prices[next.fuel]?.value;
    const to = station.prices[next.fuel]?.value;

    if (from != null && to != null && Math.abs(from - to) >= 0.0005) {
      changes[`${station.id}:${next.fuel}`] = { at, from, to } satisfies PriceChange;
    }
  }

  return changes;
}

function LiveLine({ isLive, label, language }: { isLive: boolean; label: string; language: AppLanguage }) {
  const t = copy[language].live;

  return (
    <View style={styles.liveLine}>
      <View style={[styles.liveDot, { backgroundColor: isLive ? colors.green : colors.greyLight }]} />
      <Text numberOfLines={1} style={styles.footerText}>
        <Text style={[styles.liveLabel, { color: isLive ? colors.green : colors.grey }]}>{isLive ? t.live : t.offline}</Text>
        {'  '}
        {label}
      </Text>
    </View>
  );
}

// Stations sharing the same price share the same rank.
function getRank(station: Station | null, stations: Station[], fuel: FuelKey) {
  const price = station?.prices[fuel]?.value;

  if (price == null || !stations.some((candidate) => candidate.id === station?.id)) {
    return null;
  }

  return 1 + stations.filter((candidate) => (candidate.prices[fuel]?.value ?? Infinity) < price).length;
}

function regionAround(coordinates: LatLng, delta: number): MapRegion {
  return {
    latitude: coordinates.latitude,
    latitudeDelta: delta,
    longitude: coordinates.longitude,
    longitudeDelta: delta * 1.4,
  };
}

function LocateButton({
  compact = false,
  isLocating,
  label,
  onPress,
}: {
  compact?: boolean;
  isLocating: boolean;
  label: string;
  onPress: () => void;
}) {
  if (compact) {
    return isLocating ? (
      <View style={[styles.locateCompact, shadows.floating]}>
        <ActivityIndicator color={colors.blue} size="small" />
      </View>
    ) : (
      <IconButton icon={LocateFixed} label={label} onPress={onPress} size={46} tone="floating" />
    );
  }

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ hovered }) => [styles.locate, shadows.floating, hovered && styles.locateHovered]}
    >
      {isLocating ? <ActivityIndicator color={colors.blue} size="small" /> : <LocateFixed color={colors.blue} size={18} />}
      <Text style={styles.locateText}>{label}</Text>
    </Pressable>
  );
}

function LanguageToggle({ language, onChange }: { language: AppLanguage; onChange: (language: AppLanguage) => void }) {
  const t = copy[language].app;

  return (
    <Pressable
      accessibilityLabel={t.language}
      accessibilityRole="button"
      onPress={() => onChange(language === 'fr' ? 'en' : 'fr')}
      style={({ hovered }) => [styles.languageToggle, hovered && styles.languageToggleHovered]}
    >
      <Text style={styles.languageToggleText}>{t.languageShort}</Text>
    </Pressable>
  );
}

function Segmented<T extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <View accessibilityRole="radiogroup" style={styles.segmented}>
      {options.map((option, index) => {
        const isActive = option.value === value;

        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ hovered }) => [
              styles.segment,
              index > 0 && styles.segmentRule,
              hovered && !isActive && styles.segmentHovered,
              isActive && styles.segmentActive,
            ]}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MapLegend({ language }: { language: AppLanguage }) {
  const t = copy[language].legend;

  return (
    <View style={[styles.legend, shadows.floating]}>
      <Text style={styles.legendTitle}>{t.title}</Text>
      <LegendItem label={t.cheap} swatch={{ backgroundColor: tierColors.cheap.fill }} />
      <LegendItem label={t.mid} swatch={{ backgroundColor: tierColors.mid.fill }} />
      <LegendItem label={t.high} swatch={{ backgroundColor: tierColors.high.fill }} />
      <LegendItem inner label={t.best} swatch={{ backgroundColor: tierColors.cheap.fill }} />
      <LegendItem label={t.stale} swatch={{ backgroundColor: colors.white, borderColor: colors.grey, borderWidth: 1.5 }} />
    </View>
  );
}

function LegendItem({ inner = false, label, swatch }: { inner?: boolean; label: string; swatch: object }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, swatch]}>{inner ? <View style={styles.legendInner} /> : null}</View>
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress}>
      {({ hovered }) => <Text style={[styles.footerLink, hovered && styles.footerLinkHovered]}>{label}</Text>}
    </Pressable>
  );
}

function ErrorMessage({ language, onRetry }: { language: AppLanguage; onRetry: () => void }) {
  const t = copy[language].app;

  return (
    <View style={styles.error}>
      <CircleAlert color={colors.red} size={20} />
      <View style={styles.errorCopy}>
        <Text style={styles.errorTitle}>{t.errorTitle}</Text>
        <Text style={styles.errorBody}>{t.errorBody}</Text>
      </View>
      <Button label={t.retry} onPress={onRetry} variant="secondary" />
    </View>
  );
}

function ListSkeleton() {
  return (
    <View style={styles.skeleton}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonSlat} />
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonLine, { width: '62%' }]} />
            <View style={[styles.skeletonLine, { width: '88%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  desktopLocate: {
    bottom: 108,
    position: 'absolute',
    right: 16,
  },
  desktopRoot: {
    backgroundColor: colors.ground,
    flex: 1,
    flexDirection: 'row',
  },
  empty: {
    gap: 4,
    paddingVertical: 16,
  },
  emptyBody: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.small,
    lineHeight: 20,
  },
  emptyTitle: {
    color: colors.black,
    fontFamily: fonts.semibold,
    fontSize: type.body,
  },
  error: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 16,
  },
  errorBody: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.small,
  },
  errorCopy: {
    flex: 1,
  },
  errorTitle: {
    color: colors.black,
    fontFamily: fonts.semibold,
    fontSize: type.body,
  },
  footer: {
    alignItems: 'center',
    borderTopColor: colors.rule,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  footerLink: {
    color: colors.grey,
    fontFamily: fonts.medium,
    fontSize: type.meta,
  },
  footerLinkHovered: {
    color: colors.blue,
    textDecorationLine: 'underline',
  },
  liveDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  liveLabel: {
    fontFamily: fonts.semibold,
  },
  liveLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  footerCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  footerText: {
    color: colors.greyLight,
    fontFamily: fonts.regular,
    fontSize: type.meta,
  },
  fuelBar: {
    borderBottomColor: colors.rule,
    borderBottomWidth: 1,
    paddingBottom: 8,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  languageToggle: {
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: radius.control,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 40,
  },
  languageToggleHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  languageToggleText: {
    color: colors.white,
    fontFamily: fonts.semibold,
    fontSize: type.meta,
  },
  legend: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.control,
    bottom: 16,
    flexDirection: 'row',
    gap: 14,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    position: 'absolute',
  },
  legendInner: {
    borderColor: colors.white,
    borderRadius: 1,
    borderWidth: 1.5,
    bottom: 2,
    left: 2,
    position: 'absolute',
    right: 2,
    top: 2,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendSwatch: {
    borderRadius: radius.slat,
    height: 14,
    width: 22,
  },
  legendText: {
    color: colors.black,
    fontFamily: fonts.regular,
    fontSize: type.meta,
  },
  legendTitle: {
    color: colors.black,
    fontFamily: fonts.semibold,
    fontSize: type.meta,
  },
  listHeader: {
    paddingBottom: 4,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  locate: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: 8,
    height: 42,
    paddingHorizontal: 14,
  },
  locateCompact: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.control,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  locateHovered: {
    backgroundColor: colors.ground,
  },
  locateText: {
    color: colors.black,
    fontFamily: fonts.semibold,
    fontSize: type.small,
  },
  mapArea: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  mapTop: {
    alignItems: 'center',
    gap: 8,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 16,
  },
  mobileAttribution: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mobileBand: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 10,
    paddingHorizontal: 12,
    // Keep the search dropdown above the following fuel scroll view.
    zIndex: 1,
  },
  mobileFloating: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 12,
    position: 'absolute',
    right: 12,
  },
  mobileFuel: {
    backgroundColor: colors.white,
    paddingVertical: 4,
  },
  mobileRoot: {
    backgroundColor: colors.ground,
    flex: 1,
    overflow: 'hidden',
  },
  mobileSearch: {
    flex: 1,
    minWidth: 0,
  },
  mobileStatus: {
    alignItems: 'center',
    gap: 8,
    left: 12,
    position: 'absolute',
    right: 12,
  },
  mobileTop: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  notice: {
    maxWidth: 460,
  },
  noticeText: {
    color: colors.black,
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: type.small,
    lineHeight: 20,
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  segmentActive: {
    backgroundColor: colors.blueTint,
  },
  segmentHovered: {
    backgroundColor: colors.ground,
  },
  segmentRule: {
    borderLeftColor: colors.ruleStrong,
    borderLeftWidth: 1,
  },
  segmentText: {
    color: colors.grey,
    fontFamily: fonts.medium,
    fontSize: type.small,
  },
  segmentTextActive: {
    color: colors.blue,
    fontFamily: fonts.semibold,
  },
  segmented: {
    borderColor: colors.ruleStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    transitionDuration: motion.duration,
    transitionProperty: 'height',
    transitionTimingFunction: motion.easing,
    zIndex: 20,
  } as never,
  sheetCount: {
    color: colors.greyLight,
    fontFamily: fonts.regular,
    fontSize: type.small,
  },
  sheetError: {
    paddingHorizontal: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: colors.ruleStrong,
    borderRadius: 2,
    height: 4,
    width: 36,
  },
  sheetHandleArea: {
    paddingBottom: 4,
    paddingTop: 8,
  },
  sheetHeader: {
    borderBottomColor: colors.rule,
    borderBottomWidth: 1,
    paddingBottom: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sheetHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  sheetHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  sheetSubtitle: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.small,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  sheetTitle: {
    color: colors.black,
    fontFamily: fonts.semibold,
    fontSize: type.heading,
  },
  sidebar: {
    backgroundColor: colors.white,
    borderRightColor: colors.rule,
    borderRightWidth: 1,
    zIndex: 10,
  },
  sign: {
    backgroundColor: colors.blue,
    borderRadius: radius.sheet,
    margin: 10,
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 16,
    position: 'relative',
    zIndex: 30,
  },
  signRule: {
    borderColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: radius.control,
    borderWidth: 2,
    bottom: 5,
    left: 5,
    position: 'absolute',
    right: 5,
    top: 5,
  },
  signSearch: {
    marginTop: 14,
  },
  signTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeleton: {
    gap: 20,
    marginTop: 16,
  },
  skeletonLine: {
    backgroundColor: colors.ground,
    borderRadius: 3,
    height: 12,
  },
  skeletonLines: {
    flex: 1,
    gap: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonSlat: {
    backgroundColor: colors.ground,
    borderRadius: radius.slat,
    height: 24,
    width: 58,
  },
  sortLabel: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.small,
  },
  sortRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingBottom: 4,
  },
  splash: {
    alignItems: 'center',
    backgroundColor: colors.white,
    flex: 1,
    justifyContent: 'center',
  },
  splashSpinner: {
    marginTop: 20,
  },
  status: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  statusAction: {
    color: colors.blue,
    fontFamily: fonts.semibold,
    fontSize: type.small,
    textDecorationLine: 'underline',
  },
  statusText: {
    color: colors.black,
    fontFamily: fonts.medium,
    fontSize: type.small,
  },
});
