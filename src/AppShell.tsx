import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { useFonts } from 'expo-font';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AboutModal } from './components/AboutModal';
import { BrandMark, Wordmark } from './components/BrandMark';
import { FuelPicker } from './components/FuelPicker';
import { ChevronDown, ChevronUp, CircleAlert, LocateFixed, RefreshCw, Star } from './components/icons';
import { SearchBox } from './components/SearchBox';
import { StationDetails } from './components/StationDetails';
import { ListEntry, StationList } from './components/StationList';
import { MapPadding, MapViewportRequest, StationMap } from './components/StationMap';
import { IconButton } from './components/ui';
import { ZoneSummary } from './components/ZoneSummary';
import { openConsentSettings, track } from './lib/analytics';
import { fetchStation, fetchStationDetails, fetchStations } from './lib/api';
import { formatStationName } from './lib/brands';
import { AppLanguage, copy } from './lib/copy';
import { formatCount, formatPrice, formatRelativeTime, getDistanceInKm } from './lib/format';
import { DEFAULT_FUEL, FUEL_META, FuelKey, isFuelKey } from './lib/fuels';
import { readPreference, writePreference } from './lib/storage';
import { isMapView, readUrlState, writeUrlState } from './lib/urlState';
import { breakpoints, colors, fonts, radius, shadows, tierColors } from './theme';
import type { MapRegion, MapView } from './types/map';
import type { CitySearchResult, LatLng, Station, StationDetails as StationDetailsData, StationsResponse } from './types/station';

const FRANCE_REGION: MapRegion = {
  latitude: 46.6,
  latitudeDelta: 9.4,
  longitude: 2.45,
  longitudeDelta: 11,
};
const LOAD_DEBOUNCE_MS = 260;
const DETAILS_PREFETCH_COUNT = 12;
const NOTICE_DURATION_MS = 6000;

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
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!loaded && !error) {
    return (
      <View style={styles.splash}>
        <BrandMark size={72} />
        <ActivityIndicator color={colors.brand} style={styles.splashSpinner} />
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
  const [details, setDetails] = useState<Record<number, StationDetailsData | null>>({});
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('price');
  const [notice, setNotice] = useState<string | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [topOverlayHeight, setTopOverlayHeight] = useState(128);
  const [now, setNow] = useState(() => Date.now());
  const forceRefreshRef = useRef(false);

  const t = copy[language];
  const isDesktop = width >= breakpoints.desktop;
  const sidebarWidth = width >= breakpoints.wide ? 440 : 400;
  const limit = isDesktop ? 200 : 120;
  // While a new fuel is loading, keep rendering the previous response with its own fuel so
  // prices, colours and stats always stay consistent with each other.
  const displayFuel = response?.fuel ?? fuel;
  const stats = response?.stats ?? null;
  const stations = response?.stations ?? [];
  const bestStationId = stations.length > 1 ? stations[0].id : null;

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
        });

        forceRefreshRef.current = false;
        setResponse(result);
        setLoadState('ready');
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
  }, [fuel, limit, refreshKey, region]);

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
      setDetails((current) => ({ ...current, [result.station.id]: result.details }));
      moveTo({ kind: 'region', region: regionAround(result.station.coordinates, 0.04) });
    });
  }, [initial.stationId, moveTo]);

  // Names and brands for the first rows of the list.
  const detailIds = useMemo(() => {
    const ids = stations.slice(0, DETAILS_PREFETCH_COUNT).map((station) => station.id);

    if (selected && !ids.includes(selected.id)) {
      ids.push(selected.id);
    }

    return ids.filter((id) => !(id in details));
  }, [details, selected, stations]);

  useEffect(() => {
    if (detailIds.length === 0) {
      return;
    }

    let isCurrent = true;
    const timeoutId = setTimeout(() => {
      fetchStationDetails(detailIds).then((result) => {
        if (isCurrent) {
          setDetails((current) => ({ ...current, ...result }));
        }
      });
    }, 350);

    return () => {
      isCurrent = false;
      clearTimeout(timeoutId);
    };
  }, [detailIds]);

  // ----- Side effects: clock, persistence, URL, title -----------------------------------------

  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

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
    const name = selected ? formatStationName(details[selected.id]?.name) ?? selected.city : null;

    document.title =
      selected && price
        ? `${name} · ${FUEL_META[displayFuel].label[language]} ${formatPrice(price.value, language)} — PleinSpot`
        : language === 'fr'
          ? 'PleinSpot — Prix des carburants les moins chers autour de vous'
          : 'PleinSpot — The cheapest fuel prices near you';
  }, [details, displayFuel, language, selected]);

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
  const dataUpdated = response ? formatRelativeTime(response.fetchedAt, language, now) : null;

  // ----- Rendering ----------------------------------------------------------------------------

  const listHeader = (
    <View style={styles.listHeader}>
      {response && stats ? (
        <ZoneSummary
          fuel={displayFuel}
          language={language}
          national={response.national}
          showTitle={isDesktop}
          stats={stats}
          total={response.total}
        />
      ) : null}

      {loadState === 'error' && !response ? (
        <ErrorCard language={language} onRetry={retry} />
      ) : response && stations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t.zone.emptyTitle(FUEL_META[displayFuel].label[language])}</Text>
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
      bestStationId={bestStationId}
      details={details}
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
      details={details[selected.id]}
      distanceKm={selectedDistance}
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
      details={details}
      fuel={displayFuel}
      language={language}
      onSelectCity={selectCity}
      onSelectStation={(station) => selectStation(station, { focus: 'region' })}
      onUseLocation={() => locateUser()}
      stations={stations}
      stats={stats}
    />
  );

  const statusPill =
    loadState === 'error' && response ? (
      <Pressable accessibilityRole="button" onPress={retry} style={[styles.statusPill, styles.statusPillError, shadows.floating]}>
        <CircleAlert color={colors.danger} size={15} />
        <Text style={[styles.statusText, { color: colors.danger }]}>{t.app.errorTitle}</Text>
        <RefreshCw color={colors.danger} size={14} />
      </Pressable>
    ) : isFetching || (!response && loadState === 'loading') ? (
      <View style={[styles.statusPill, shadows.floating]}>
        <ActivityIndicator color={colors.brand} size="small" />
        <Text style={styles.statusText}>{response ? t.app.updating : t.app.loading}</Text>
      </View>
    ) : null;

  const noticePill = notice ? (
    <Pressable onPress={() => setNotice(null)} style={[styles.notice, shadows.floating]}>
      <CircleAlert color={colors.warning} size={16} />
      <Text style={styles.noticeText}>{notice}</Text>
    </Pressable>
  ) : null;

  const map = (padding: MapPadding) => (
    <StationMap
      bestStationId={bestStationId}
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
          <View style={styles.sidebarHeader}>
            <Wordmark size={21} tagline={t.app.tagline} />
            <LanguageToggle language={language} onChange={setLanguage} />
          </View>

          <View style={styles.sidebarSearch}>{searchBox}</View>

          {selected ? (
            stationDetails
          ) : (
            <>
              <View style={styles.sidebarFuel}>
                <FuelPicker fuel={fuel} language={language} layout="grid" onChange={changeFuel} overview={response?.overview ?? null} />
              </View>
              {stationList}
            </>
          )}

          <View style={styles.sidebarFooter}>
            <Text numberOfLines={1} style={styles.footerText}>
              {dataUpdated ? t.app.dataUpdated(dataUpdated) : t.app.source}
            </Text>
            <View style={styles.footerLinks}>
              <FooterLink label={t.app.about} onPress={() => setIsAboutOpen(true)} />
              <FooterLink label={t.app.cookies} onPress={openConsentSettings} />
            </View>
          </View>
        </View>

        <View style={styles.mapArea}>
          {map({ bottom: 40, left: 40, right: 80, top: 80 })}
          <View pointerEvents="box-none" style={styles.mapTopOverlay}>
            {statusPill}
            {noticePill}
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

  const collapsedSheetHeight = (stations.length > 0 ? 156 : 96) + insets.bottom;
  const sheetHeight = selected
    ? Math.round(height * 0.7)
    : isSheetExpanded
      ? Math.round(height * 0.62)
      : collapsedSheetHeight;

  return (
    <View style={styles.mobileRoot}>
      {map({ bottom: sheetHeight + 16, left: 24, right: 24, top: topOverlayHeight + 16 })}

      <View
        onLayout={(event) => setTopOverlayHeight(Math.round(event.nativeEvent.layout.height))}
        pointerEvents="box-none"
        style={[styles.mobileTop, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.mobileSearchRow}>
          <Pressable accessibilityLabel={t.app.about} accessibilityRole="button" onPress={() => setIsAboutOpen(true)}>
            <BrandMark size={50} />
          </Pressable>
          <View style={styles.mobileSearch}>{searchBox}</View>
        </View>
        <View style={styles.mobileFuel}>
          <FuelPicker fuel={fuel} language={language} layout="scroll" onChange={changeFuel} overview={response?.overview ?? null} />
        </View>
        <View pointerEvents="box-none" style={styles.mobileStatus}>
          {statusPill}
          {noticePill}
        </View>
      </View>

      <View pointerEvents="box-none" style={[styles.mobileFloating, { bottom: sheetHeight + 12 }]}>
        <Text style={styles.mobileAttribution}>© IGN · Géoplateforme</Text>
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
                    {response
                      ? `${t.zone.stations(formatCount(response.total, language))} · ${FUEL_META[displayFuel].label[language]}`
                      : t.app.loading}
                  </Text>
                  {stats ? (
                    <Text numberOfLines={1} style={styles.sheetSubtitle}>
                      {t.zone.cheapest} <Text style={{ color: tierColors.cheap.text }}>{formatPrice(stats.min, language)}</Text>
                      {'  ·  '}
                      {t.zone.average} {formatPrice(stats.average, language)}
                    </Text>
                  ) : null}
                </View>
                {stations.length > 0 ? (
                  isSheetExpanded ? (
                    <ChevronDown color={colors.textMuted} size={22} />
                  ) : (
                    <ChevronUp color={colors.textMuted} size={22} />
                  )
                ) : null}
              </View>
            </Pressable>

            {isSheetExpanded ? (
              stationList
            ) : loadState === 'error' && !response ? (
              <View style={styles.sheetCollapsedError}>
                <ErrorCard language={language} onRetry={retry} />
              </View>
            ) : (
              <StationList
                bestStationId={bestStationId}
                details={details}
                entries={entries.slice(0, 1)}
                fuel={displayFuel}
                highlightedStationId={null}
                language={language}
                now={now}
                onHover={setHighlightedId}
                onSelect={handleListSelect}
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
        <ActivityIndicator color={colors.brand} size="small" />
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
      {isLocating ? <ActivityIndicator color={colors.brand} size="small" /> : <LocateFixed color={colors.brand} size={18} />}
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
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, isActive && [styles.segmentActive, shadows.card]]}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MapLegend({ language }: { language: AppLanguage }) {
  const t = copy[language];

  return (
    <View style={[styles.legend, shadows.panel]}>
      <LegendItem color={tierColors.cheap.solid} label={t.legend.cheap} />
      <LegendItem color={tierColors.mid.solid} label={t.legend.mid} />
      <LegendItem color={tierColors.high.solid} label={t.legend.high} />
      <View style={styles.legendItem}>
        <View style={styles.legendStar}>
          <Star color="#713F12" size={9} strokeWidth={3} />
        </View>
        <Text style={styles.legendText}>{t.legend.best}</Text>
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress}>
      {({ hovered }) => (
        <Text style={[styles.footerLink, hovered && styles.footerLinkHovered]}>{label}</Text>
      )}
    </Pressable>
  );
}

function ErrorCard({ language, onRetry }: { language: AppLanguage; onRetry: () => void }) {
  const t = copy[language].app;

  return (
    <View style={styles.errorCard}>
      <CircleAlert color={colors.danger} size={20} />
      <View style={styles.errorCopy}>
        <Text style={styles.errorTitle}>{t.errorTitle}</Text>
        <Text style={styles.errorBody}>{t.errorBody}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.errorButton}>
        <Text style={styles.errorButtonText}>{t.retry}</Text>
      </Pressable>
    </View>
  );
}

function ListSkeleton() {
  return (
    <View style={styles.skeleton}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={styles.skeletonBadge} />
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonLine, { width: '60%' }]} />
            <View style={[styles.skeletonLine, { width: '85%' }]} />
          </View>
          <View style={[styles.skeletonLine, { height: 18, width: 58 }]} />
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
    backgroundColor: colors.background,
    flex: 1,
    flexDirection: 'row',
  },
  emptyBody: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 4,
  },
  emptyState: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 14,
    padding: 16,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  errorBody: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
  errorButton: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorButtonText: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  errorCard: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    padding: 14,
  },
  errorCopy: {
    flex: 1,
  },
  errorTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  footerLink: {
    color: colors.textMuted,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  footerLinkHovered: {
    color: colors.text,
    textDecorationLine: 'underline',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 14,
  },
  footerText: {
    color: colors.textSubtle,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  languageToggle: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 40,
  },
  languageToggleHovered: {
    backgroundColor: colors.surfaceMuted,
  },
  languageToggleText: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  legend: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: radius.pill,
    bottom: 16,
    flexDirection: 'row',
    gap: 14,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
  },
  legendDot: {
    borderColor: colors.white,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    height: 12,
    width: 12,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendStar: {
    alignItems: 'center',
    backgroundColor: colors.star,
    borderRadius: radius.pill,
    height: 14,
    justifyContent: 'center',
    width: 14,
  },
  legendText: {
    color: colors.textMuted,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  listHeader: {
    paddingBottom: 6,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  locate: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 8,
    height: 42,
    paddingHorizontal: 16,
  },
  locateCompact: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  locateHovered: {
    backgroundColor: colors.surfaceMuted,
  },
  locateText: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  mapArea: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  mapTopOverlay: {
    alignItems: 'center',
    gap: 8,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 16,
  },
  mobileAttribution: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: radius.sm,
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
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
    marginHorizontal: -12,
    marginTop: 10,
  },
  mobileRoot: {
    backgroundColor: colors.background,
    flex: 1,
    overflow: 'hidden',
  },
  mobileSearch: {
    flex: 1,
    minWidth: 0,
  },
  mobileSearchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  mobileStatus: {
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  mobileTop: {
    left: 0,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  notice: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 10,
    maxWidth: 460,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noticeText: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  segment: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.textMuted,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  segmentTextActive: {
    color: colors.text,
  },
  segmented: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: 10,
    flexDirection: 'row',
    padding: 3,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    transitionDuration: '220ms',
    transitionProperty: 'height',
    transitionTimingFunction: 'ease-out',
    zIndex: 20,
  } as never,
  sheetCollapsedError: {
    paddingHorizontal: 16,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: radius.pill,
    height: 4,
    width: 40,
  },
  sheetHandleArea: {
    paddingBottom: 2,
    paddingTop: 8,
  },
  sheetHeader: {
    paddingBottom: 6,
    paddingHorizontal: 18,
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
    marginTop: 10,
  },
  sheetSubtitle: {
    color: colors.textMuted,
    fontFamily: fonts.semibold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  sidebar: {
    backgroundColor: colors.surface,
    borderRightColor: colors.border,
    borderRightWidth: 1,
    boxShadow: '4px 0 24px -12px rgba(16, 24, 40, 0.18)',
    zIndex: 10,
  },
  sidebarFooter: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sidebarFuel: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  sidebarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  sidebarSearch: {
    paddingHorizontal: 20,
    paddingTop: 16,
    zIndex: 30,
  },
  skeleton: {
    gap: 18,
    marginTop: 18,
  },
  skeletonBadge: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: 12,
    height: 40,
    width: 40,
  },
  skeletonLine: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: 6,
    height: 11,
  },
  skeletonLines: {
    flex: 1,
    gap: 8,
  },
  skeletonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  sortLabel: {
    color: colors.textSubtle,
    fontFamily: fonts.semibold,
    fontSize: 12.5,
  },
  sortRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  splash: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    flex: 1,
    justifyContent: 'center',
  },
  splashSpinner: {
    marginTop: 20,
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusPillError: {
    backgroundColor: colors.dangerSoft,
  },
  statusText: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
});
