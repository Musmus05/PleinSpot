import { memo, ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getBrandLabel, getStationTitle } from '../lib/brands';
import { AppLanguage, copy } from '../lib/copy';
import { formatDistance } from '../lib/format';
import type { FuelKey } from '../lib/fuels';
import { getPriceChange, getPriceTier, isPriceStale, PriceChange, PriceChanges } from '../lib/pricing';
import { getOpeningState, OpeningState } from '../lib/schedule';
import type { PriceStats, Station } from '../types/station';
import { colors, fonts, motion, type } from '../theme';
import { PriceChangeTag, PriceSlat } from './PriceSlat';

export type ListEntry = {
  distanceKm: number | null;
  station: Station;
};

type StationListProps = {
  bestPrice: number | null;
  changes: PriceChanges;
  entries: ListEntry[];
  fuel: FuelKey;
  header?: ReactElement;
  highlightedStationId: number | null;
  language: AppLanguage;
  now: number;
  onHover: (stationId: number | null) => void;
  onSelect: (station: Station) => void;
  scrollEnabled?: boolean;
  stats: PriceStats | null;
};

export function StationList({
  bestPrice,
  changes,
  entries,
  fuel,
  header,
  highlightedStationId,
  language,
  now,
  onHover,
  onSelect,
  scrollEnabled = true,
  stats,
}: StationListProps) {
  return (
    <FlatList
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      contentContainerStyle={styles.content}
      data={entries}
      extraData={`${highlightedStationId}-${now}-${bestPrice}-${Object.keys(changes).length}`}
      initialNumToRender={14}
      keyExtractor={(entry) => String(entry.station.id)}
      renderItem={({ item }) => (
        <StationRow
          change={getPriceChange(changes, item.station.id, fuel)}
          distanceKm={item.distanceKm}
          fuel={fuel}
          isBest={bestPrice != null && item.station.prices[fuel]?.value === bestPrice}
          isHighlighted={item.station.id === highlightedStationId}
          language={language}
          now={now}
          onHover={onHover}
          onSelect={onSelect}
          station={item.station}
          stats={stats}
        />
      )}
      scrollEnabled={scrollEnabled}
      style={styles.list}
      windowSize={7}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const StationRow = memo(function StationRow({
  change,
  distanceKm,
  fuel,
  isBest,
  isHighlighted,
  language,
  now,
  onHover,
  onSelect,
  station,
  stats,
}: {
  change: PriceChange | null;
  distanceKm: number | null;
  fuel: FuelKey;
  isBest: boolean;
  isHighlighted: boolean;
  language: AppLanguage;
  now: number;
  onHover: (stationId: number | null) => void;
  onSelect: (station: Station) => void;
  station: Station;
  stats: PriceStats | null;
}) {
  const t = copy[language];
  const price = station.prices[fuel];
  const name = getStationTitle(station);
  const brand = getBrandLabel(station.brand);
  const opening = describeOpening(getOpeningState(station, new Date(now)), language);
  const stale = isPriceStale(price ?? null, now);
  const place = [brand === name ? null : brand, station.address, name === station.city ? null : station.city]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityLabel={`${name}, ${station.address}`}
      accessibilityRole="button"
      onHoverIn={() => onHover(station.id)}
      onHoverOut={() => onHover(null)}
      onPress={() => onSelect(station)}
      style={({ hovered, pressed }) => [styles.row, (hovered || isHighlighted) && styles.rowHovered, pressed && styles.rowPressed]}
    >
      <View style={styles.priceColumn}>
        {price ? (
          <PriceSlat
            best={isBest}
            language={language}
            size="sm"
            tier={getPriceTier(price.value, stats)}
            value={price.value}
            variant={stale ? 'stale' : 'tier'}
          />
        ) : null}
        {change ? <PriceChangeTag change={change} language={language} /> : null}
      </View>

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>
            {name}
          </Text>
          {distanceKm != null ? <Text style={styles.distance}>{formatDistance(distanceKm, language)}</Text> : null}
        </View>
        <Text numberOfLines={1} style={styles.place}>
          {place}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {opening ? <Text style={{ color: opening.color }}>{opening.label}</Text> : null}
          {opening && (station.highway || stale) ? ' · ' : ''}
          {station.highway ? t.list.highway : ''}
          {station.highway && stale ? ' · ' : ''}
          {stale ? <Text style={styles.stale}>{t.list.stale}</Text> : null}
        </Text>
      </View>
    </Pressable>
  );
});

export function describeOpening(state: OpeningState, language: AppLanguage) {
  const t = copy[language].opening;

  switch (state.kind) {
    case 'open':
      return {
        color: state.closingSoon ? colors.yellowText : colors.green,
        label: state.closingSoon ? t.closingSoon(state.closesAt) : `${t.open} ${t.closesAt(state.closesAt)}`,
      };
    case 'open24':
      return { color: colors.green, label: t.open24 };
    case 'automate':
      return { color: colors.green, label: t.automate };
    case 'closed':
      return { color: colors.red, label: state.automate ? `${t.closed} · ${t.automate}` : t.closed };
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 16,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  distance: {
    color: colors.grey,
    fontFamily: fonts.medium,
    fontSize: type.meta,
    fontVariant: ['tabular-nums'],
  },
  list: {
    flex: 1,
  },
  meta: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.meta,
  },
  place: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.small,
  },
  priceColumn: {
    paddingTop: 1,
    width: 66,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    transitionDuration: motion.duration,
    transitionProperty: 'background-color',
  } as never,
  rowHovered: {
    backgroundColor: colors.blueTint,
  },
  rowPressed: {
    backgroundColor: colors.ground,
  },
  separator: {
    backgroundColor: colors.rule,
    height: 1,
    marginLeft: 98,
  },
  stale: {
    color: colors.yellowText,
    fontFamily: fonts.medium,
  },
  title: {
    color: colors.black,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: type.body,
  },
  titleRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
  },
});
