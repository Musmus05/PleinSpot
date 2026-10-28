import { StyleSheet, Text, View } from 'react-native';

import { AppLanguage, copy } from '../lib/copy';
import { formatCents, formatCount, formatPrice } from '../lib/format';
import { FUEL_META, FuelKey } from '../lib/fuels';
import type { PriceDistribution, PriceStats } from '../types/station';
import { colors, fonts, type } from '../theme';
import { PriceStrip } from './PriceStrip';

type ZoneSummaryProps = {
  distribution: PriceDistribution | null;
  fuel: FuelKey;
  language: AppLanguage;
  national: PriceStats | null;
  showTitle?: boolean;
  stats: PriceStats | null;
  total: number;
};

export function ZoneSummary({ distribution, fuel, language, national, showTitle = true, stats, total }: ZoneSummaryProps) {
  const t = copy[language].zone;

  if (!stats || !distribution) {
    return null;
  }

  const average = formatPrice(stats.average, language);
  const delta = national ? stats.average - national.average : null;
  const nationalLine =
    delta == null
      ? null
      : Math.abs(delta) < 0.0005
        ? t.nationalEqual(average)
        : delta < 0
          ? t.nationalBelow(average, formatCents(delta, language))
          : t.nationalAbove(average, formatCents(delta, language));

  return (
    <View>
      {showTitle ? (
        <Text accessibilityRole="header" style={styles.title}>
          {FUEL_META[fuel].label[language]}
          <Text style={styles.count}>
            {'  '}
            {t.stations(formatCount(total, language))}
          </Text>
        </Text>
      ) : null}
      <PriceStrip distribution={distribution} language={language} stats={stats} />
      {nationalLine ? <Text style={styles.national}>{nationalLine}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  count: {
    color: colors.greyLight,
    fontFamily: fonts.regular,
    fontSize: type.small,
  },
  national: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.small,
    lineHeight: 20,
    marginTop: 10,
  },
  title: {
    color: colors.black,
    fontFamily: fonts.semibold,
    fontSize: type.heading,
    marginBottom: 12,
  },
});
