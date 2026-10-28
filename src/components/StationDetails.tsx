import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { track } from '../lib/analytics';
import { getBrandLabel, getStationTitle } from '../lib/brands';
import { AppLanguage, copy } from '../lib/copy';
import { formatCents, formatCount, formatDistance, formatMoney, formatPrice, formatRelativeTime } from '../lib/format';
import { FUEL_META, FUEL_OPTIONS, FuelKey } from '../lib/fuels';
import { getPriceChange, getPriceTier, getTankSavings, isPriceStale, PriceChanges, TANK_LITERS } from '../lib/pricing';
import { getOpeningState, getParisClock, getWeekRows, OpeningState } from '../lib/schedule';
import { buildShareUrl } from '../lib/urlState';
import type { PriceDistribution, PriceStats, Station } from '../types/station';
import { colors, fonts, motion, type } from '../theme';
import { FuelBadge } from './FuelBadge';
import { ArrowLeft, Check, ExternalLink, LinkIcon, Navigation, Share, TriangleAlert } from './icons';
import { PriceChangeTag, PriceSlat } from './PriceSlat';
import { PriceStrip } from './PriceStrip';
import { describeOpening } from './StationList';
import { Button, IconButton, SectionTitle } from './ui';

type StationDetailsProps = {
  changes: PriceChanges;
  distanceKm: number | null;
  distribution: PriceDistribution | null;
  fuel: FuelKey;
  language: AppLanguage;
  national: PriceStats | null;
  now: number;
  onBack: () => void;
  onChangeFuel: (fuel: FuelKey) => void;
  rank: number | null;
  station: Station;
  stats: PriceStats | null;
  total: number;
  variant: 'panel' | 'sheet';
};

export function StationDetails({
  changes,
  distanceKm,
  distribution,
  fuel,
  language,
  national,
  now,
  onBack,
  onChangeFuel,
  rank,
  station,
  stats,
  total,
  variant,
}: StationDetailsProps) {
  const t = copy[language];
  const [shareFeedback, setShareFeedback] = useState(false);
  const name = getStationTitle(station);
  const brand = getBrandLabel(station.brand);
  const price = station.prices[fuel] ?? null;
  const opening = describeOpening(getOpeningState(station, new Date(now)), language);
  const fuelLabel = FUEL_META[fuel].label[language];
  const savings = price ? getTankSavings(price.value, stats?.average) : null;
  const nationalDelta = price && national ? price.value - national.average : null;
  const stale = isPriceStale(price, now);

  useEffect(() => {
    setShareFeedback(false);
  }, [station.id]);

  function openDirections(provider: 'google' | 'waze') {
    const { latitude, longitude } = station.coordinates;
    const url =
      provider === 'waze'
        ? `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`
        : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    track('directions', { fuel, provider, station_id: station.id });
    Linking.openURL(url);
  }

  async function share() {
    const url = buildShareUrl({ fuel, stationId: station.id });
    const text = price ? t.details.shareText(name, formatPrice(price.value, language), fuelLabel) : name;

    track('share', { station_id: station.id });

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ text, title: 'PleinSpot', url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2200);
    } catch {
      // Share sheet dismissed or clipboard refused: nothing to do.
    }
  }

  const insights = price
    ? [
        rank != null && total > 1
          ? rank === 1
            ? t.details.rankFirst(formatCount(total, language))
            : t.details.rank(formatCount(rank, language), formatCount(total, language))
          : null,
        savings == null
          ? null
          : Math.abs(savings) < 0.05
            ? t.details.savingsEqual
            : savings > 0
              ? t.details.savingsCheaper(formatMoney(savings, language), TANK_LITERS)
              : t.details.savingsPricier(formatMoney(-savings, language), TANK_LITERS),
        nationalDelta == null || Math.abs(nationalDelta) < 0.0005
          ? null
          : nationalDelta < 0
            ? t.details.vsNationalBelow(formatCents(nationalDelta, language))
            : t.details.vsNationalAbove(formatCents(nationalDelta, language)),
      ].filter((line): line is string => Boolean(line))
    : [];

  return (
    <ScrollView contentContainerStyle={[styles.content, variant === 'sheet' && styles.contentSheet]} style={styles.scroll}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" onPress={onBack} style={({ hovered }) => [styles.back, hovered && styles.backHovered]}>
          <ArrowLeft color={colors.blue} size={18} strokeWidth={2.2} />
          <Text style={styles.backLabel}>{t.details.back}</Text>
        </Pressable>
        <IconButton
          icon={shareFeedback ? Check : variant === 'sheet' ? Share : LinkIcon}
          label={shareFeedback ? t.details.copied : t.details.share}
          onPress={share}
          size={38}
        />
      </View>

      <Text accessibilityRole="header" style={styles.name}>
        {name}
      </Text>
      <Text style={styles.address}>
        {[brand === name ? null : brand, `${station.address}, ${station.postcode} ${station.city}`].filter(Boolean).join(' · ')}
      </Text>
      <Text style={styles.facts}>
        <OpeningText language={language} now={now} opening={opening} state={getOpeningState(station, new Date(now))} />
        {distanceKm != null ? ` · ${formatDistance(distanceKm, language)}` : ''}
        {station.highway ? ` · ${t.list.highway}` : ''}
        {shareFeedback ? <Text style={styles.copied}>{` · ${t.details.copied}`}</Text> : null}
      </Text>

      <View style={styles.actions}>
        <Button icon={Navigation} label={t.details.directions} onPress={() => openDirections('google')} style={styles.primaryAction} />
        <Button label={t.details.waze} onPress={() => openDirections('waze')} variant="secondary" />
      </View>

      <View style={styles.section}>
        <SectionTitle>{t.details.prices}</SectionTitle>
        <View style={styles.totem}>
          {FUEL_OPTIONS.map((option, index) => {
            const optionPrice = station.prices[option.key];
            const isActive = option.key === fuel;
            const inRupture = station.ruptures.some((entry) => entry.fuel === option.key);
            const optionStale = isPriceStale(optionPrice ?? null, now);

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                disabled={!optionPrice || isActive}
                key={option.key}
                onPress={() => onChangeFuel(option.key)}
                style={({ hovered }) => [
                  styles.totemRow,
                  index > 0 && styles.totemRowRule,
                  isActive && styles.totemRowActive,
                  hovered && optionPrice && !isActive && styles.totemRowHovered,
                ]}
              >
                <FuelBadge active={isActive} fuel={option.key} size={32} />
                <Text style={[styles.totemLabel, !optionPrice && styles.totemMuted]}>{option.label[language]}</Text>
                {optionPrice ? (
                  <>
                    {getPriceChange(changes, station.id, option.key) ? (
                      <PriceChangeTag change={getPriceChange(changes, station.id, option.key)!} language={language} />
                    ) : (
                      <Text style={styles.totemUpdated}>{formatRelativeTime(optionPrice.updatedAt, language, now) ?? ''}</Text>
                    )}
                    <PriceSlat
                      language={language}
                      tier={getPriceTier(optionPrice.value, isActive ? stats : null)}
                      value={optionPrice.value}
                      variant={optionStale ? 'stale' : isActive ? 'tier' : 'neutral'}
                    />
                  </>
                ) : (
                  <Text style={[styles.totemMissing, inRupture && styles.totemRupture]}>
                    {inRupture ? t.details.rupture : t.details.unavailable}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {price && stats && distribution ? (
          <View style={styles.comparison}>
            <PriceStrip distribution={distribution} language={language} marker={price.value} stats={stats} />
            {insights.map((line) => (
              <Text key={line} style={styles.insight}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}

        {stale ? (
          <View style={styles.warning}>
            <TriangleAlert color={colors.yellowText} size={16} />
            <Text style={styles.warningText}>{t.details.stalePrice}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionTitle>{t.details.hours}</SectionTitle>
        <WeekSchedule language={language} now={now} station={station} />
        {station.automate24h ? <Text style={styles.note}>{t.details.automate}</Text> : null}
      </View>

      {station.services.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle>{t.details.services}</SectionTitle>
          <View style={styles.services}>
            {station.services.map((service) => (
              <View key={service} style={styles.service}>
                <Check color={colors.green} size={15} strokeWidth={2.4} />
                <Text style={styles.serviceText}>{service}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="link"
        onPress={() => Linking.openURL(`https://www.prix-carburants.gouv.fr/station/${station.id}`)}
        style={styles.officialLink}
      >
        <ExternalLink color={colors.blue} size={14} />
        <Text style={styles.officialLinkText}>{t.details.officialPage}</Text>
      </Pressable>
    </ScrollView>
  );
}

function OpeningText({
  language,
  now,
  opening,
  state,
}: {
  language: AppLanguage;
  now: number;
  opening: ReturnType<typeof describeOpening>;
  state: OpeningState;
}) {
  const t = copy[language].opening;

  if (state.kind === 'closed' && state.opensAt) {
    const { dayOffset, time } = state.opensAt;
    const next =
      dayOffset === 0
        ? t.opensToday(time)
        : dayOffset === 1
          ? t.opensTomorrow(time)
          : t.opensOn(t.weekdays[(getParisClock(new Date(now)).day - 1 + dayOffset) % 7], time);

    return (
      <Text style={{ color: colors.red }}>
        {t.closed}, {next}
        {state.automate ? ` · ${t.automate}` : ''}
      </Text>
    );
  }

  return opening ? <Text style={{ color: opening.color }}>{opening.label}</Text> : <Text>{t.unknown}</Text>;
}

function WeekSchedule({ language, now, station }: { language: AppLanguage; now: number; station: Station }) {
  const t = copy[language].opening;
  const rows = getWeekRows(station, new Date(now));

  if (!rows.some((row) => row.value.kind !== 'unknown')) {
    return <Text style={styles.note}>{t.unknown}</Text>;
  }

  return (
    <View>
      {rows.map((row, index) => {
        const value =
          row.value.kind === 'closed'
            ? t.closed
            : row.value.kind === 'allDay'
              ? t.allDay
              : row.value.kind === 'unknown'
                ? '—'
                : row.value.slots.map((slot) => `${slot.open}–${slot.close}`).join(', ');

        return (
          <View key={row.day} style={[styles.weekRow, index > 0 && styles.weekRowRule]}>
            <Text style={[styles.weekDay, row.isToday && styles.weekToday]}>{capitalize(t.weekdays[row.day - 1])}</Text>
            <Text style={[styles.weekValue, row.isToday && styles.weekToday, row.value.kind === 'closed' && { color: colors.red }]}>
              {value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  address: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.small,
    lineHeight: 20,
    marginTop: 4,
  },
  back: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 6,
    marginLeft: -8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backHovered: {
    backgroundColor: colors.blueTint,
  },
  backLabel: {
    color: colors.blue,
    fontFamily: fonts.semibold,
    fontSize: type.small,
  },
  comparison: {
    gap: 6,
    marginTop: 20,
  },
  content: {
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  contentSheet: {
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  copied: {
    color: colors.green,
  },
  facts: {
    color: colors.grey,
    fontFamily: fonts.medium,
    fontSize: type.small,
    marginTop: 8,
  },
  insight: {
    color: colors.black,
    fontFamily: fonts.regular,
    fontSize: type.small,
    lineHeight: 20,
  },
  name: {
    color: colors.black,
    fontFamily: fonts.semibold,
    fontSize: type.title,
    lineHeight: 28,
    marginTop: 8,
  },
  note: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.small,
    marginTop: 8,
  },
  officialLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    marginTop: 28,
  },
  officialLinkText: {
    color: colors.blue,
    fontFamily: fonts.medium,
    fontSize: type.small,
    textDecorationLine: 'underline',
  },
  primaryAction: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  section: {
    marginTop: 32,
  },
  service: {
    alignItems: 'center',
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: 8,
  },
  serviceText: {
    color: colors.black,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: type.small,
  },
  services: {
    columnGap: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totem: {
    borderColor: colors.rule,
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  totemLabel: {
    color: colors.black,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: type.body,
  },
  totemMissing: {
    color: colors.greyLight,
    fontFamily: fonts.regular,
    fontSize: type.small,
  },
  totemMuted: {
    color: colors.greyLight,
  },
  totemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    transitionDuration: motion.duration,
    transitionProperty: 'background-color',
  } as never,
  totemRowActive: {
    backgroundColor: colors.blueTint,
  },
  totemRowHovered: {
    backgroundColor: colors.ground,
  },
  totemRowRule: {
    borderTopColor: colors.rule,
    borderTopWidth: 1,
  },
  totemRupture: {
    color: colors.red,
    fontFamily: fonts.semibold,
  },
  totemUpdated: {
    color: colors.greyLight,
    fontFamily: fonts.regular,
    fontSize: type.meta,
  },
  warning: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  warningText: {
    color: colors.yellowText,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: type.small,
    lineHeight: 20,
  },
  weekDay: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.small,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  weekRowRule: {
    borderTopColor: colors.rule,
    borderTopWidth: 1,
  },
  weekToday: {
    color: colors.black,
    fontFamily: fonts.semibold,
  },
  weekValue: {
    color: colors.black,
    fontFamily: fonts.regular,
    fontSize: type.small,
    fontVariant: ['tabular-nums'],
  },
});
