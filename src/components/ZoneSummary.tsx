import { StyleSheet, Text, View } from 'react-native';

import { AppLanguage, copy } from '../lib/copy';
import { formatCount, formatPrice, formatPriceDelta } from '../lib/format';
import { FUEL_META, FuelKey } from '../lib/fuels';
import type { PriceStats } from '../types/station';
import { colors, fonts, radius, tierColors } from '../theme';
import { Info, TrendingDown, TrendingUp } from './icons';

type ZoneSummaryProps = {
  fuel: FuelKey;
  language: AppLanguage;
  national: PriceStats | null;
  showTitle?: boolean;
  stats: PriceStats | null;
  total: number;
};

export function ZoneSummary({ fuel, language, national, showTitle = true, stats, total }: ZoneSummaryProps) {
  const t = copy[language].zone;
  const fuelLabel = FUEL_META[fuel].label[language];

  if (!stats) {
    return null;
  }

  const nationalDelta = national ? stats.average - national.average : null;
  const nationalTrend =
    nationalDelta == null || Math.abs(nationalDelta) < 0.0005 ? 'equal' : nationalDelta < 0 ? 'cheaper' : 'pricier';
  const trendColor =
    nationalTrend === 'cheaper' ? tierColors.cheap.text : nationalTrend === 'pricier' ? tierColors.high.text : colors.textMuted;
  const TrendIcon = nationalTrend === 'cheaper' ? TrendingDown : nationalTrend === 'pricier' ? TrendingUp : Info;

  return (
    <View>
      {showTitle ? (
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {t.title(fuelLabel)}
          </Text>
          <Text style={styles.count}>{t.stations(formatCount(total, language))}</Text>
        </View>
      ) : null}

      <View style={styles.tiles}>
        <Tile color={tierColors.cheap.text} label={t.cheapest} value={formatPrice(stats.min, language)} />
        <Tile label={t.average} value={formatPrice(stats.average, language)} />
        <Tile color={tierColors.high.text} label={t.highest} value={formatPrice(stats.max, language)} />
      </View>

      {national && nationalDelta != null ? (
        <View style={styles.national}>
          <TrendIcon color={trendColor} size={15} />
          <Text style={styles.nationalText}>
            {t.national} {formatPrice(national.average, language)}
            {' · '}
            <Text style={{ color: trendColor, fontFamily: fonts.semibold }}>
              {nationalTrend === 'equal' ? t.nationalEqual : t.areaDelta(formatPriceDelta(nationalDelta, language))}
            </Text>
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Tile({ color = colors.text, label, value }: { color?: string; label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  count: {
    color: colors.textSubtle,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  header: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  national: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  nationalText: {
    color: colors.textMuted,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12.5,
  },
  tile: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  tileLabel: {
    color: colors.textSubtle,
    fontFamily: fonts.semibold,
    fontSize: 11.5,
  },
  tileValue: {
    fontFamily: fonts.bold,
    fontSize: 15.5,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
    marginTop: 3,
  },
  tiles: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: -0.3,
  },
});
