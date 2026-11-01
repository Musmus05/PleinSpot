import { StyleSheet, Text, View } from 'react-native';

import { AppLanguage, copy } from '../lib/copy';
import { formatCents, formatCount, formatPrice } from '../lib/format';
import { FUEL_META, FuelKey } from '../lib/fuels';
import { HISTORY_RANGES, HistoryLoad, HistoryRange } from '../lib/history';
import type { PriceDistribution, PriceStats, ZoneHistory } from '../types/station';
import { colors, fonts, type } from '../theme';
import { ZoneHistoryView } from './PriceHistory';
import { PriceStrip } from './PriceStrip';
import { Segmented } from './ui';

/** Today's spread of prices, or their evolution over one of the history ranges. */
export type ZonePeriod = 'today' | HistoryRange;

type ZoneSummaryProps = {
  distribution: PriceDistribution | null;
  fuel: FuelKey;
  history: HistoryLoad<ZoneHistory>;
  language: AppLanguage;
  national: PriceStats | null;
  onChangePeriod: (period: ZonePeriod) => void;
  period: ZonePeriod;
  showTitle?: boolean;
  stats: PriceStats | null;
  total: number;
};

export function ZoneSummary({
  distribution,
  fuel,
  history,
  language,
  national,
  onChangePeriod,
  period,
  showTitle = true,
  stats,
  total,
}: ZoneSummaryProps) {
  const t = copy[language].zone;
  const th = copy[language].history;

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
      <View style={styles.periods}>
        <Segmented<ZonePeriod>
          accessibilityLabel={th.periodLabel}
          fill
          onChange={onChangePeriod}
          options={[
            { label: th.today, value: 'today' },
            ...HISTORY_RANGES.map((range) => ({ label: th.periods[range], value: range })),
          ]}
          value={period}
        />
      </View>
      {period === 'today' ? (
        <>
          <PriceStrip distribution={distribution} language={language} stats={stats} />
          {nationalLine ? <Text style={styles.national}>{nationalLine}</Text> : null}
        </>
      ) : (
        <ZoneHistoryView language={language} load={history} range={period} />
      )}
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
  periods: {
    marginBottom: 16,
  },
  title: {
    color: colors.black,
    fontFamily: fonts.semibold,
    fontSize: type.heading,
    marginBottom: 12,
  },
});
