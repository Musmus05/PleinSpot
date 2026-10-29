import { ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppLanguage, copy } from '../lib/copy';
import { formatCents, formatPrice, formatPriceValue } from '../lib/format';
import { FUEL_META, FuelKey } from '../lib/fuels';
import {
  alignTo,
  averageGap,
  dayAt,
  formatDay,
  groupByPeriod,
  HistoryLoad,
  HistoryRange,
  listPriceChanges,
  SeriesSummary,
  summarize,
  takeRange,
} from '../lib/history';
import type { StationHistory, ZoneHistory } from '../types/station';
import { colors, fonts, type } from '../theme';
import { TrendingDown, TrendingUp } from './icons';
import { PriceHistoryChart } from './PriceHistoryChart';

const CHANGES_PREVIEW = 8;
// Plot, axis and legend: the placeholder keeps the same room so nothing jumps when data arrives.
const CHART_BLOCK_HEIGHT = 226;

/** The area's average and lowest price over the period, against the national average. */
export function ZoneHistoryView({ language, load, range }: { language: AppLanguage; load: HistoryLoad<ZoneHistory>; range: HistoryRange }) {
  const t = copy[language].history;
  const [showTable, setShowTable] = useState(false);
  const history = load.data;

  if (!history) {
    return <HistoryPlaceholder language={language} status={load.status} />;
  }

  const { start, values: mean } = takeRange(history.mean, history.from, range);
  const min = takeRange(history.min, history.from, range).values;
  const national = takeRange(history.national, history.from, range).values;
  const summary = summarize(mean);

  if (!summary) {
    return <HistoryPlaceholder language={language} message={t.noZoneData} />;
  }

  const lowest = summarize(min);
  const gap = averageGap(mean, national);
  const headline = `${t.zoneSubject} ${describeTrend(summary, start, range, language)}`;
  const insights = [
    lowest ? t.zoneLowest(formatPrice(lowest.min, language), formatDay(dayAt(isoDay(start), lowest.minIndex), language, 'short')) : null,
    gap == null ? null : Math.abs(gap) < 0.0005 ? t.vsNationalEqual : gap < 0 ? t.vsNationalBelow(formatCents(gap, language)) : t.vsNationalAbove(formatCents(gap, language)),
  ].filter((line): line is string => Boolean(line));

  return (
    <View>
      <Headline language={language} summary={summary} text={headline} />
      <PriceHistoryChart
        accessibilityLabel={t.chartLabel(headline)}
        dimmed={load.isRefreshing}
        language={language}
        lines={[
          { color: colors.blue, key: 'mean', label: t.zoneAverage, values: mean },
          // The highest price is left out: a few motorway stations would flatten everything else.
          { color: colors.blueLight, key: 'min', label: t.zoneLowestLine, values: min },
          { color: colors.greyLight, key: 'national', label: t.nationalAverage, values: national },
        ]}
        range={range}
        start={start}
      />
      <Insights lines={insights} />
      <TableToggle isOpen={showTable} language={language} onToggle={() => setShowTable((value) => !value)} />
      {showTable ? (
        <View role="table" style={styles.table}>
          <TableRow cells={[t.columns.period, t.columns.average, t.columns.lowest, t.columns.national]} isHeader />
          {groupByPeriod([mean, min, national], start, range)
            .reverse()
            .map((row) => (
              <TableRow
                cells={[
                  describePeriod(start, row.startIndex, range, language),
                  ...row.averages.map((value) => (value == null ? '—' : formatPriceValue(value, language))),
                ]}
                key={row.startIndex}
              />
            ))}
        </View>
      ) : null}
    </View>
  );
}

/** One station's price over the period, against the average of the area on the map. */
export function StationHistoryView({
  fuel,
  language,
  load,
  range,
  zone,
}: {
  fuel: FuelKey;
  language: AppLanguage;
  load: HistoryLoad<StationHistory>;
  range: HistoryRange;
  zone: ZoneHistory | null;
}) {
  const t = copy[language].history;
  const [showTable, setShowTable] = useState(false);
  const [showAllChanges, setShowAllChanges] = useState(false);
  const history = load.data;

  if (!history) {
    return <HistoryPlaceholder language={language} status={load.status} />;
  }

  const series = history.fuels[fuel];
  const { start, values } = series ? takeRange(series, history.from, range) : { start: new Date(), values: [] };
  const summary = summarize(values);

  if (!summary) {
    return <HistoryPlaceholder language={language} message={t.noData(FUEL_META[fuel].label[language])} />;
  }

  // The zone history can still be loading another fuel, or date from the day before.
  const zoneMean = zone && zone.fuel === fuel ? alignTo(zone.mean, zone.from, isoDay(start), values.length) : null;
  const gap = zoneMean ? averageGap(values, zoneMean) : null;
  const changes = listPriceChanges(values);
  const headline = `${t.stationSubject} ${describeTrend(summary, start, range, language)}`;
  const insights = [
    summary.max - summary.min >= 0.0005
      ? t.highLow(
          formatPrice(summary.min, language),
          formatDay(dayAt(isoDay(start), summary.minIndex), language, 'short'),
          formatPrice(summary.max, language),
          formatDay(dayAt(isoDay(start), summary.maxIndex), language, 'short'),
        )
      : null,
    gap == null ? null : Math.abs(gap) < 0.0005 ? t.vsZoneEqual : gap < 0 ? t.vsZoneBelow(formatCents(gap, language)) : t.vsZoneAbove(formatCents(gap, language)),
    t.changeCount(changes.length),
  ].filter((line): line is string => Boolean(line));
  const latestChanges = [...changes].reverse();
  const shownChanges = showAllChanges ? latestChanges : latestChanges.slice(0, CHANGES_PREVIEW);

  return (
    <View>
      <Headline language={language} summary={summary} text={headline} />
      <PriceHistoryChart
        accessibilityLabel={t.chartLabel(headline)}
        dimmed={load.isRefreshing}
        language={language}
        lines={[
          { color: colors.blue, key: 'station', label: t.station, step: true, values },
          ...(zoneMean ? [{ color: colors.greyLight, key: 'zone', label: t.zoneAverage, values: zoneMean }] : []),
        ]}
        range={range}
        start={start}
      />
      <Insights lines={insights} />
      {changes.length > 0 ? <TableToggle isOpen={showTable} language={language} onToggle={() => setShowTable((value) => !value)} /> : null}
      {showTable && changes.length > 0 ? (
        <View role="table" style={styles.table}>
          <TableRow cells={[t.columns.date, t.columns.price, t.columns.change]} isHeader />
          {shownChanges.map((change) => (
            <TableRow
              cells={[
                formatDay(dayAt(isoDay(start), change.index), language, 'long'),
                formatPriceValue(change.value, language),
                <ChangeCell delta={change.delta} key="change" language={language} />,
              ]}
              key={change.index}
            />
          ))}
          {latestChanges.length > CHANGES_PREVIEW && !showAllChanges ? (
            <Pressable accessibilityRole="button" onPress={() => setShowAllChanges(true)} style={styles.tableMore}>
              <Text style={styles.link}>{t.allChanges(String(latestChanges.length))}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** "en hausse de 12,4 ct en 3 mois, de 2,249 € à 2,373 €." — from the first day with a price. */
function describeTrend(summary: SeriesSummary, start: Date, range: HistoryRange, language: AppLanguage) {
  const t = copy[language].history;
  const startsLater = summary.firstIndex > 0;
  const firstDay = formatDay(dayAt(isoDay(start), summary.firstIndex), language, 'short');
  const sinceDate = t.sinceDate(firstDay);
  const delta = summary.last - summary.first;

  if (Math.abs(delta) < 0.0005) {
    // Same price at both ends: "stable" only if it never moved in between.
    return summary.max - summary.min < 0.0005
      ? t.flat(startsLater ? sinceDate : t.periodSince[range], formatPrice(summary.last, language))
      : t.same(startsLater ? t.sameAsDate(firstDay) : t.sameAsAgo[range], formatPrice(summary.last, language));
  }

  const period = startsLater ? sinceDate : t.periodIn[range];
  const from = formatPrice(summary.first, language);
  const to = formatPrice(summary.last, language);
  const cents = formatCents(delta, language);

  return delta < 0 ? t.down(cents, period, from, to) : t.up(cents, period, from, to);
}

function Headline({ language, summary, text }: { language: AppLanguage; summary: SeriesSummary; text: string }) {
  const delta = summary.last - summary.first;
  const Icon = delta <= -0.0005 ? TrendingDown : delta >= 0.0005 ? TrendingUp : null;
  const t = copy[language].live;

  return (
    <View style={styles.headline}>
      {Icon ? (
        <View accessibilityLabel={delta < 0 ? t.down(formatCents(delta, language)) : t.up(formatCents(delta, language))} style={styles.headlineIcon}>
          <Icon color={delta < 0 ? colors.green : colors.red} size={18} strokeWidth={2.4} />
        </View>
      ) : null}
      <Text style={styles.headlineText}>{text}</Text>
    </View>
  );
}

function Insights({ lines }: { lines: string[] }) {
  return (
    <View style={styles.insights}>
      {lines.map((line) => (
        <Text key={line} style={styles.insight}>
          {line}
        </Text>
      ))}
    </View>
  );
}

function TableToggle({ isOpen, language, onToggle }: { isOpen: boolean; language: AppLanguage; onToggle: () => void }) {
  const t = copy[language].history;

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={onToggle} style={styles.toggle}>
      <Text style={styles.link}>{isOpen ? t.hideTable : t.showTable}</Text>
    </Pressable>
  );
}

function TableRow({ cells, isHeader = false }: { cells: ReactNode[]; isHeader?: boolean }) {
  return (
    <View role="row" style={[styles.row, !isHeader && styles.rowRule]}>
      {cells.map((cell, index) => (
        <View key={index} role={isHeader ? 'columnheader' : 'cell'} style={[styles.cell, index === 0 ? styles.cellFirst : styles.cellNumber]}>
          {typeof cell === 'string' ? (
            <Text numberOfLines={1} style={[isHeader ? styles.headerText : styles.cellText, index > 0 && styles.numberText]}>
              {cell}
            </Text>
          ) : (
            cell
          )}
        </View>
      ))}
    </View>
  );
}

function ChangeCell({ delta, language }: { delta: number; language: AppLanguage }) {
  const isDown = delta < 0;
  const color = isDown ? colors.green : colors.red;
  const Icon = isDown ? TrendingDown : TrendingUp;
  const t = copy[language].live;
  const cents = formatCents(delta, language);

  return (
    <View accessibilityLabel={isDown ? t.down(cents) : t.up(cents)} style={styles.change}>
      <Icon color={color} size={14} strokeWidth={2.4} />
      <Text style={[styles.cellText, styles.numberText, { color }]}>{cents}</Text>
    </View>
  );
}

function HistoryPlaceholder({
  language,
  message,
  status = 'ready',
}: {
  language: AppLanguage;
  message?: string;
  status?: HistoryLoad<unknown>['status'];
}) {
  const t = copy[language].history;
  const text = message ?? (status === 'error' ? t.error : t.loading);

  return (
    <View style={styles.placeholder}>
      {status === 'loading' && !message ? <ActivityIndicator color={colors.blue} size="small" /> : null}
      <Text style={styles.placeholderText}>{text}</Text>
    </View>
  );
}

/** "Semaine du 6 oct." or "oct. 2026", for the table rows. */
function describePeriod(start: Date, startIndex: number, range: HistoryRange, language: AppLanguage) {
  const day = dayAt(isoDay(start), startIndex);

  return range === 365 ? formatDay(day, language, 'monthYear') : copy[language].history.weekOf(formatDay(day, language, 'short'));
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
  },
  cellFirst: {
    flex: 2,
  },
  cellNumber: {
    alignItems: 'flex-end',
  },
  cellText: {
    color: colors.black,
    fontFamily: fonts.regular,
    fontSize: type.small,
  },
  change: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  headerText: {
    color: colors.greyLight,
    fontFamily: fonts.medium,
    fontSize: type.meta,
  },
  headline: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  headlineIcon: {
    marginTop: 2,
  },
  headlineText: {
    color: colors.black,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: type.body,
    lineHeight: 22,
  },
  insight: {
    color: colors.black,
    fontFamily: fonts.regular,
    fontSize: type.small,
    lineHeight: 20,
  },
  insights: {
    gap: 6,
    marginTop: 16,
  },
  link: {
    color: colors.blue,
    fontFamily: fonts.medium,
    fontSize: type.small,
    textDecorationLine: 'underline',
  },
  numberText: {
    fontVariant: ['tabular-nums'],
  },
  placeholder: {
    alignItems: 'center',
    gap: 8,
    height: CHART_BLOCK_HEIGHT,
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.small,
    textAlign: 'center',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 36,
    paddingVertical: 6,
  },
  rowRule: {
    borderTopColor: colors.rule,
    borderTopWidth: 1,
  },
  table: {
    marginTop: 8,
  },
  tableMore: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  toggle: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 4,
  },
});
