import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { searchCities } from '../lib/api';
import { formatStationName } from '../lib/brands';
import { AppLanguage, copy } from '../lib/copy';
import type { FuelKey } from '../lib/fuels';
import { getPriceTier } from '../lib/pricing';
import type { CitySearchResult, PriceStats, Station, StationDetails } from '../types/station';
import { colors, fonts, radius, shadows, tierColors } from '../theme';
import { Fuel, LocateFixed, MapPin, Search, X } from './icons';
import { PumpPrice } from './PumpPrice';

type SearchBoxProps = {
  details: Record<number, StationDetails | null>;
  fuel: FuelKey;
  language: AppLanguage;
  onSelectCity: (city: CitySearchResult) => void;
  onSelectStation: (station: Station) => void;
  onUseLocation: () => void;
  stations: Station[];
  stats: PriceStats | null;
};

type ResultItem =
  | { key: string; kind: 'location' }
  | { city: CitySearchResult; key: string; kind: 'city' }
  | { key: string; kind: 'station'; station: Station };

const MIN_QUERY_LENGTH = 2;
const CITY_SEARCH_DEBOUNCE_MS = 220;

export function SearchBox({
  details,
  fuel,
  language,
  onSelectCity,
  onSelectStation,
  onUseLocation,
  stations,
  stats,
}: SearchBoxProps) {
  const t = copy[language].search;
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [cities, setCities] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!hasQuery) {
      setCities([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      setIsSearching(true);
      searchCities(trimmedQuery, controller.signal)
        .then((results) => setCities(results))
        .catch(() => {
          if (!controller.signal.aborted) {
            setCities([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    }, CITY_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [hasQuery, trimmedQuery]);

  const stationMatches = useMemo(() => {
    if (!hasQuery) {
      return [];
    }

    const needle = normalize(trimmedQuery);

    return stations
      .filter((station) => {
        const stationDetails = details[station.id];
        const haystack = normalize(
          `${stationDetails?.name ?? ''} ${stationDetails?.brand ?? ''} ${station.address} ${station.city} ${station.postcode}`,
        );

        return haystack.includes(needle);
      })
      .slice(0, 4);
  }, [details, hasQuery, stations, trimmedQuery]);

  const items: ResultItem[] = hasQuery
    ? [
        ...cities.map((city) => ({ city, key: `city-${city.id}`, kind: 'city' as const })),
        ...stationMatches.map((station) => ({ key: `station-${station.id}`, kind: 'station' as const, station })),
      ]
    : [{ key: 'location', kind: 'location' }];

  const isOpen = isFocused && (hasQuery || trimmedQuery.length === 0);

  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedQuery]);

  useEffect(
    () => () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    },
    [],
  );

  function choose(item: ResultItem | undefined) {
    if (!item) {
      return;
    }

    if (item.kind === 'location') {
      onUseLocation();
    } else if (item.kind === 'city') {
      onSelectCity(item.city);
    } else {
      onSelectStation(item.station);
    }

    setQuery('');
    setIsFocused(false);
    inputRef.current?.blur();
  }

  function handleKeyPress(key: string) {
    if (key === 'ArrowDown') {
      setActiveIndex((index) => Math.min(items.length - 1, index + 1));
    } else if (key === 'ArrowUp') {
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (key === 'Escape') {
      setQuery('');
      inputRef.current?.blur();
    }
  }

  const firstStationIndex = items.findIndex((item) => item.kind === 'station');

  return (
    <View style={styles.container}>
      <View style={[styles.inputShell, isFocused && styles.inputShellFocused]}>
        <Search color={isFocused ? colors.brand : colors.textSubtle} size={18} />
        <TextInput
          accessibilityLabel={t.placeholder}
          autoComplete="off"
          autoCorrect={false}
          enterKeyHint="search"
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => setIsFocused(false), 220);
          }}
          onChangeText={setQuery}
          onFocus={() => {
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
            }

            setIsFocused(true);
          }}
          onKeyPress={(event) => handleKeyPress(event.nativeEvent.key)}
          onSubmitEditing={() => choose(items[activeIndex])}
          placeholder={t.placeholder}
          placeholderTextColor={colors.textSubtle}
          ref={inputRef}
          selectionColor={colors.brand}
          style={styles.input}
          value={query}
        />
        {isSearching ? <ActivityIndicator color={colors.textSubtle} size="small" /> : null}
        {query ? (
          <Pressable
            accessibilityLabel={t.clear}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            style={styles.clearButton}
          >
            <X color={colors.textMuted} size={14} strokeWidth={2.6} />
          </Pressable>
        ) : null}
      </View>

      {isOpen ? (
        <View style={[styles.dropdown, shadows.floating]}>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
            {items.length === 0 && !isSearching ? <Text style={styles.empty}>{t.noResults}</Text> : null}
            {items.map((item, index) => {
              const isActive = index === activeIndex;
              const header =
                item.kind === 'city' && index === 0 ? t.cities : index === firstStationIndex ? t.stations : null;

              return (
                <View key={item.key}>
                  {header ? <Text style={styles.sectionHeader}>{header}</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    onHoverIn={() => setActiveIndex(index)}
                    onPress={() => choose(item)}
                    style={[styles.row, isActive && styles.rowActive]}
                  >
                    <ResultRow details={details} fuel={fuel} item={item} language={language} stats={stats} />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function ResultRow({
  details,
  fuel,
  item,
  language,
  stats,
}: {
  details: Record<number, StationDetails | null>;
  fuel: FuelKey;
  item: ResultItem;
  language: AppLanguage;
  stats: PriceStats | null;
}) {
  const t = copy[language].search;

  if (item.kind === 'location') {
    return (
      <>
        <View style={[styles.rowIcon, styles.rowIconBrand]}>
          <LocateFixed color={colors.brand} size={16} />
        </View>
        <Text style={[styles.rowTitle, styles.rowTitleBrand]}>{t.useMyLocation}</Text>
      </>
    );
  }

  if (item.kind === 'city') {
    return (
      <>
        <View style={styles.rowIcon}>
          <MapPin color={colors.textMuted} size={16} />
        </View>
        <View style={styles.rowCopy}>
          <Text numberOfLines={1} style={styles.rowTitle}>
            {item.city.label}
          </Text>
          {item.city.subtitle ? (
            <Text numberOfLines={1} style={styles.rowSubtitle}>
              {item.city.subtitle}
            </Text>
          ) : null}
        </View>
      </>
    );
  }

  const { station } = item;
  const price = station.prices[fuel];
  const name = formatStationName(details[station.id]?.name);

  return (
    <>
      <View style={styles.rowIcon}>
        <Fuel color={colors.textMuted} size={16} />
      </View>
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {name ?? station.city}
        </Text>
        <Text numberOfLines={1} style={styles.rowSubtitle}>
          {station.address} · {station.city}
        </Text>
      </View>
      {price ? (
        <PumpPrice color={tierColors[getPriceTier(price.value, stats)].text} language={language} size={15} value={price.value} />
      ) : null}
    </>
  );
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const styles = StyleSheet.create({
  clearButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.pill,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  container: {
    position: 'relative',
    zIndex: 20,
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 56,
  },
  dropdownScroll: {
    maxHeight: 380,
    paddingVertical: 6,
  },
  empty: {
    color: colors.textSubtle,
    fontFamily: fonts.regular,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.semibold,
    // 16px keeps iOS Safari from zooming in on focus.
    fontSize: 16,
    height: '100%',
    minWidth: 0,
    outlineStyle: 'none',
    paddingVertical: 0,
  } as never,
  inputShell: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 50,
    paddingHorizontal: 14,
  },
  inputShellFocused: {
    borderColor: colors.brand,
    boxShadow: '0 0 0 4px rgba(5, 150, 105, 0.14)',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 6,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  rowActive: {
    backgroundColor: colors.surfaceSunken,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  rowIconBrand: {
    backgroundColor: colors.brandSoft,
  },
  rowSubtitle: {
    color: colors.textSubtle,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 1,
  },
  rowTitle: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  rowTitleBrand: {
    color: colors.brandStrong,
  },
  sectionHeader: {
    color: colors.textSubtle,
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    paddingBottom: 4,
    paddingHorizontal: 16,
    paddingTop: 10,
    textTransform: 'uppercase',
  },
});
