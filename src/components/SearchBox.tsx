import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { searchCities } from '../lib/api';
import { getBrandLabel, getStationTitle } from '../lib/brands';
import { AppLanguage, copy } from '../lib/copy';
import type { FuelKey } from '../lib/fuels';
import { getPriceTier } from '../lib/pricing';
import type { CitySearchResult, PriceStats, Station } from '../types/station';
import { colors, fonts, radius, shadows, type } from '../theme';
import { Fuel, LocateFixed, MapPin, Search, X } from './icons';
import { PriceSlat } from './PriceSlat';

type SearchBoxProps = {
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
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(400);
  const { height: windowHeight } = useWindowDimensions();
  const containerRef = useRef<View>(null);
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
        const haystack = normalize(
          `${station.name ?? ''} ${getBrandLabel(station.brand) ?? ''} ${station.address} ${station.city} ${station.postcode}`,
        );

        return haystack.includes(needle);
      })
      .slice(0, 4);
  }, [hasQuery, stations, trimmedQuery]);

  const items: ResultItem[] = hasQuery
    ? [
        ...cities.map((city) => ({ city, key: `city-${city.id}`, kind: 'city' as const })),
        ...stationMatches.map((station) => ({ key: `station-${station.id}`, kind: 'station' as const, station })),
      ]
    : [{ key: 'location', kind: 'location' }];

  const isOpen = isFocused && (hasQuery || trimmedQuery.length === 0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Mobile keyboards resize the visual viewport, which can be smaller than
    // the layout viewport used by React Native Web.
    const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
    const updateDropdownHeight = () => {
      containerRef.current?.measureInWindow((_x, y, _width, height) => {
        const viewportBottom = viewport ? viewport.offsetTop + viewport.height : windowHeight;
        setDropdownMaxHeight(Math.max(0, Math.min(400, viewportBottom - y - height - 6 - 12)));
      });
    };

    updateDropdownHeight();
    viewport?.addEventListener('resize', updateDropdownHeight);
    viewport?.addEventListener('scroll', updateDropdownHeight);

    return () => {
      viewport?.removeEventListener('resize', updateDropdownHeight);
      viewport?.removeEventListener('scroll', updateDropdownHeight);
    };
  }, [isOpen, windowHeight]);

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
    <View ref={containerRef} style={styles.container}>
      <View style={[styles.inputShell, isFocused && styles.inputShellFocused]}>
        <Search color={isFocused ? colors.blue : colors.grey} size={18} />
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
          placeholderTextColor={colors.greyLight}
          ref={inputRef}
          selectionColor={colors.blue}
          style={styles.input}
          value={query}
        />
        {isSearching ? <ActivityIndicator color={colors.grey} size="small" /> : null}
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
            <X color={colors.grey} size={16} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>

      {isOpen ? (
        <View style={[styles.dropdown, shadows.floating]}>
          <ScrollView
            contentContainerStyle={styles.dropdownContent}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: dropdownMaxHeight }}
          >
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
                    <ResultRow fuel={fuel} item={item} language={language} stats={stats} />
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
  fuel,
  item,
  language,
  stats,
}: {
  fuel: FuelKey;
  item: ResultItem;
  language: AppLanguage;
  stats: PriceStats | null;
}) {
  const t = copy[language].search;

  if (item.kind === 'location') {
    return (
      <>
        <LocateFixed color={colors.blue} size={18} />
        <Text style={[styles.rowTitle, styles.rowTitleAction]}>{t.useMyLocation}</Text>
      </>
    );
  }

  if (item.kind === 'city') {
    return (
      <>
        <MapPin color={colors.grey} size={18} />
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
  const name = getStationTitle(station);

  return (
    <>
      <Fuel color={colors.grey} size={18} />
      <View style={styles.rowCopy}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {name}
        </Text>
        <Text numberOfLines={1} style={styles.rowSubtitle}>
          {station.address} · {station.city}
        </Text>
      </View>
      {price ? (
        <PriceSlat language={language} size="sm" tier={getPriceTier(price.value, stats)} value={price.value} />
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
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  container: {
    position: 'relative',
    zIndex: 20,
  },
  dropdown: {
    backgroundColor: colors.white,
    borderRadius: radius.control,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 52,
  },
  dropdownContent: {
    paddingVertical: 6,
  },
  empty: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.small,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    color: colors.black,
    flex: 1,
    fontFamily: fonts.medium,
    // 16px keeps iOS Safari from zooming in on focus.
    fontSize: type.body,
    height: '100%',
    minWidth: 0,
    outlineStyle: 'none',
    paddingVertical: 0,
  } as never,
  inputShell: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: 10,
    height: 46,
    paddingLeft: 12,
    paddingRight: 6,
  },
  inputShellFocused: {
    boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.45)',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  rowActive: {
    backgroundColor: colors.blueTint,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  rowSubtitle: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.meta,
    marginTop: 1,
  },
  rowTitle: {
    color: colors.black,
    fontFamily: fonts.semibold,
    fontSize: type.small,
  },
  rowTitleAction: {
    color: colors.blue,
  },
  sectionHeader: {
    color: colors.greyLight,
    fontFamily: fonts.semibold,
    fontSize: type.meta,
    paddingBottom: 2,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
});
