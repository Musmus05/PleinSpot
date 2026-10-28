import { memo, ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandStyle, formatStationName, getBrandStyle } from '../lib/brands';
import { AppLanguage, copy } from '../lib/copy';
import { formatDistance, formatPriceDelta, formatRelativeTime } from '../lib/format';
import type { FuelKey } from '../lib/fuels';
import { getPriceTier, isPriceStale } from '../lib/pricing';
import { getOpeningState, OpeningState } from '../lib/schedule';
import type { PriceStats, Station, StationDetails } from '../types/station';
import { colors, fonts, radius, tierColors } from '../theme';
import { Fuel, Star } from './icons';
import { PumpPrice } from './PumpPrice';

export type ListEntry = {
  distanceKm: number | null;
  station: Station;
};

type StationListProps = {
  bestStationId: number | null;
  details: Record<number, StationDetails | null>;
  entries: ListEntry[];
  fuel: FuelKey;
  header?: ReactElement;
  highlightedStationId: number | null;
  language: AppLanguage;
  now: number;
  onHover: (stationId: number | null) => void;
  onSelect: (station: Station) => void;
  stats: PriceStats | null;
};

export function StationList({
  bestStationId,
  details,
  entries,
  fuel,
  header,
  highlightedStationId,
  language,
  now,
  onHover,
  onSelect,
  stats,
}: StationListProps) {
  return (
    <FlatList
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      contentContainerStyle={styles.content}
      data={entries}
      extraData={`${highlightedStationId}-${now}-${Object.keys(details).length}`}
      initialNumToRender={14}
      keyExtractor={(entry) => String(entry.station.id)}
      renderItem={({ item }) => (
        <StationRow
          details={details[item.station.id]}
          distanceKm={item.distanceKm}
          fuel={fuel}
          isBest={item.station.id === bestStationId}
          isHighlighted={item.station.id === highlightedStationId}
          language={language}
          now={now}
          onHover={onHover}
          onSelect={onSelect}
          station={item.station}
          stats={stats}
        />
      )}
      style={styles.list}
      windowSize={7}
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const StationRow = memo(function StationRow({
  details,
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
  details: StationDetails | null | undefined;
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
  const tier = getPriceTier(price?.value, stats);
  const brand = getBrandStyle(details);
  const name = formatStationName(details?.name);
  const opening = getOpeningState(station, new Date(now));
  const stale = isPriceStale(price ?? null, now);
  const delta = price && stats ? price.value - stats.average : null;
  const meta = [
    distanceKm != null ? formatDistance(distanceKm, language) : null,
    formatOpeningShort(opening, language),
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityLabel={`${name ?? station.city}, ${station.address}`}
      accessibilityRole="button"
      onHoverIn={() => onHover(station.id)}
      onHoverOut={() => onHover(null)}
      onPress={() => onSelect(station)}
      style={({ hovered, pressed }) => [
        styles.row,
        (hovered || isHighlighted) && styles.rowHovered,
        pressed && styles.rowPressed,
      ]}
    >
      <BrandBadge brand={brand} />

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>
            {name ?? station.city}
          </Text>
          {isBest ? (
            <View accessibilityLabel={copy[language].legend.best} style={styles.bestBadge}>
              <Star color="#713F12" size={11} strokeWidth={2.6} />
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={styles.subtitle}>
          {station.address}
          {name ? ` · ${station.city}` : ''}
        </Text>
        <View style={styles.metaRow}>
          {meta.length > 0 ? (
            <Text numberOfLines={1} style={[styles.meta, opening.kind === 'closed' && styles.metaClosed]}>
              {meta.join(' · ')}
            </Text>
          ) : null}
          {station.highway ? <Text style={styles.tag}>{t.list.highway}</Text> : null}
        </View>
      </View>

      {price ? (
        <View style={styles.priceColumn}>
          <PumpPrice color={tierColors[tier].text} language={language} size={19} value={price.value} />
          {stale ? (
            <Text style={styles.stale}>{t.list.stale}</Text>
          ) : delta != null && Math.abs(delta) >= 0.0005 ? (
            <Text style={[styles.delta, { color: delta < 0 ? tierColors.cheap.text : tierColors.high.text }]}>
              {formatPriceDelta(delta, language)}
            </Text>
          ) : (
            <Text style={styles.updated}>{formatRelativeTime(price.updatedAt, language, now) ?? ''}</Text>
          )}
        </View>
      ) : null}
    </Pressable>
  );
});

export function BrandBadge({ brand, size = 40 }: { brand: BrandStyle | null; size?: number }) {
  if (!brand) {
    return (
      <View style={[styles.badge, styles.badgeNeutral, { borderRadius: size * 0.3, height: size, width: size }]}>
        <Fuel color={colors.textSubtle} size={size * 0.45} />
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={brand.label}
      style={[styles.badge, { backgroundColor: brand.background, borderRadius: size * 0.3, height: size, width: size }]}
    >
      <Text style={[styles.badgeText, { color: brand.foreground, fontSize: brand.initials.length > 1 ? size * 0.32 : size * 0.42 }]}>
        {brand.initials}
      </Text>
    </View>
  );
}

function formatOpeningShort(state: OpeningState, language: AppLanguage) {
  const t = copy[language].opening;

  switch (state.kind) {
    case 'open':
      return state.closingSoon ? t.closingSoon(state.closesAt) : `${t.open} · ${t.closesAt(state.closesAt)}`;
    case 'open24':
      return t.open24;
    case 'automate':
      return t.automate;
    case 'closed':
      return state.automate ? `${t.closed} · ${t.automate}` : t.closed;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNeutral: {
    backgroundColor: colors.surfaceSunken,
  },
  badgeText: {
    fontFamily: fonts.bold,
    letterSpacing: -0.4,
  },
  bestBadge: {
    alignItems: 'center',
    backgroundColor: colors.star,
    borderRadius: radius.pill,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  content: {
    paddingBottom: 16,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  delta: {
    fontFamily: fonts.semibold,
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
    marginTop: 3,
  },
  list: {
    flex: 1,
  },
  meta: {
    color: colors.textMuted,
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  metaClosed: {
    color: colors.danger,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  priceColumn: {
    alignItems: 'flex-end',
  },
  row: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 8,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  rowHovered: {
    backgroundColor: colors.surfaceMuted,
  },
  rowPressed: {
    backgroundColor: colors.surfaceSunken,
  },
  separator: {
    backgroundColor: colors.border,
    height: 1,
    marginHorizontal: 18,
  },
  stale: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.sm,
    color: colors.warning,
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    marginTop: 3,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  subtitle: {
    color: colors.textSubtle,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    marginTop: 1,
  },
  tag: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.sm,
    color: colors.textMuted,
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  title: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fonts.semibold,
    fontSize: 14.5,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  updated: {
    color: colors.textSubtle,
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 3,
  },
});
