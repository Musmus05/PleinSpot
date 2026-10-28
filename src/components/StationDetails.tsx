import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { track } from '../lib/analytics';
import { formatStationName, getBrandStyle } from '../lib/brands';
import { AppLanguage, copy } from '../lib/copy';
import {
  formatCount,
  formatDistance,
  formatMoney,
  formatPrice,
  formatPriceDelta,
  formatRelativeTime,
} from '../lib/format';
import { FUEL_META, FUEL_OPTIONS, FuelKey } from '../lib/fuels';
import { getPriceTier, getTankSavings, isPriceStale, TANK_LITERS } from '../lib/pricing';
import { getOpeningState, getParisClock, getWeekRows, OpeningState } from '../lib/schedule';
import { buildShareUrl } from '../lib/urlState';
import type { PriceStats, Station, StationDetails as StationDetailsData } from '../types/station';
import { colors, fonts, radius, tierColors } from '../theme';
import { ArrowLeft, Check, Clock, ExternalLink, LinkIcon, Navigation, PiggyBank, Share, TriangleAlert, X } from './icons';
import { PumpPrice } from './PumpPrice';
import { BrandBadge } from './StationList';
import { Button, Chip, IconButton, SectionTitle } from './ui';

type StationDetailsProps = {
  details: StationDetailsData | null | undefined;
  distanceKm: number | null;
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
  details,
  distanceKm,
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
  const brand = getBrandStyle(details);
  const name = formatStationName(details?.name);
  const price = station.prices[fuel] ?? null;
  const tier = getPriceTier(price?.value, stats);
  const opening = getOpeningState(station, new Date(now));
  const fuelLabel = FUEL_META[fuel].label[language];
  const savings = price ? getTankSavings(price.value, stats?.average) : null;
  const nationalDelta = price && national ? price.value - national.average : null;
  const stale = isPriceStale(price, now);
  const rupture = station.ruptures.find((entry) => entry.fuel === fuel);

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
    const text = price
      ? t.details.shareText(name ?? `${station.city}`, formatPrice(price.value, language), fuelLabel)
      : name ?? station.city;

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

  return (
    <ScrollView contentContainerStyle={[styles.content, variant === 'sheet' && styles.contentSheet]} style={styles.scroll}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityLabel={t.details.back}
          accessibilityRole="button"
          onPress={onBack}
          style={({ hovered }) => [styles.backButton, hovered && styles.backButtonHovered]}
        >
          {variant === 'sheet' ? (
            <X color={colors.inkSoft} size={18} />
          ) : (
            <>
              <ArrowLeft color={colors.inkSoft} size={18} />
              <Text style={styles.backLabel}>{t.details.back}</Text>
            </>
          )}
        </Pressable>
        <IconButton icon={shareFeedback ? Check : variant === 'sheet' ? Share : LinkIcon} label={shareFeedback ? t.details.copied : t.details.share} onPress={share} />
      </View>

      <View style={styles.identity}>
        <BrandBadge brand={brand} size={52} />
        <View style={styles.identityCopy}>
          {brand ? <Text style={styles.brandLabel}>{brand.label}</Text> : null}
          <Text accessibilityRole="header" style={styles.name}>
            {name ?? station.city}
          </Text>
          <Text style={styles.address}>
            {station.address}, {station.postcode} {station.city}
          </Text>
        </View>
      </View>

      <OpeningLine language={language} now={now} state={opening} />

      <View style={styles.chips}>
        {distanceKm != null ? <Chip icon={Navigation}>{formatDistance(distanceKm, language)}</Chip> : null}
        {station.highway ? <Chip>{t.list.highway}</Chip> : null}
        {station.automate24h ? <Chip tone="brand">{t.details.automateNote}</Chip> : null}
        {shareFeedback ? <Chip icon={Check} tone="brand">{t.details.copied}</Chip> : null}
      </View>

      <View style={styles.actions}>
        <Button icon={Navigation} label={t.details.directions} onPress={() => openDirections('google')} style={styles.primaryAction} />
        <Button label={t.details.waze} onPress={() => openDirections('waze')} variant="secondary" />
      </View>

      <View style={[styles.hero, { backgroundColor: tierColors[tier].soft }]}>
        <View style={styles.heroHeader}>
          <Text style={[styles.heroFuel, { color: tierColors[tier].text }]}>{fuelLabel}</Text>
          {price?.updatedAt ? (
            <Text style={styles.heroUpdated}>{t.details.updated(formatRelativeTime(price.updatedAt, language, now) ?? '')}</Text>
          ) : null}
        </View>

        {price ? (
          <>
            <PumpPrice color={tierColors[tier].text} language={language} size={44} value={price.value} />
            {rank != null && total > 1 ? (
              <Text style={styles.heroRank}>
                {rank === 1
                  ? t.details.rankFirst(formatCount(total, language))
                  : t.details.rank(formatCount(rank, language), formatCount(total, language))}
              </Text>
            ) : null}
            {stats && stats.max > stats.min ? <RangeBar language={language} price={price.value} stats={stats} /> : null}
          </>
        ) : (
          <Text style={styles.heroUnavailable}>{rupture ? t.details.rupture : t.details.unavailable}</Text>
        )}

        {price && savings != null ? (
          <View style={styles.insight}>
            <PiggyBank color={savings >= 0 ? tierColors.cheap.text : tierColors.high.text} size={18} />
            <Text style={styles.insightText}>
              {Math.abs(savings) < 0.05
                ? t.details.savingsEqual
                : savings > 0
                  ? t.details.savingsCheaper(formatMoney(savings, language), TANK_LITERS)
                  : t.details.savingsPricier(formatMoney(-savings, language), TANK_LITERS)}
            </Text>
          </View>
        ) : null}

        {nationalDelta != null ? (
          <Text style={styles.heroNational}>
            <Text style={{ color: nationalDelta <= 0 ? tierColors.cheap.text : tierColors.high.text, fontFamily: fonts.bold }}>
              {formatPriceDelta(nationalDelta, language)}
            </Text>{' '}
            {t.details.vsNational}
          </Text>
        ) : null}

        {stale ? (
          <View style={styles.warning}>
            <TriangleAlert color={colors.warning} size={16} />
            <Text style={styles.warningText}>{t.details.stalePrice}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionTitle>{t.details.allPrices}</SectionTitle>
        <View style={styles.fuelGrid}>
          {FUEL_OPTIONS.map((option) => {
            const optionPrice = station.prices[option.key];
            const isActive = option.key === fuel;
            const inRupture = station.ruptures.some((entry) => entry.fuel === option.key);

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                disabled={!optionPrice}
                key={option.key}
                onPress={() => onChangeFuel(option.key)}
                style={({ hovered }) => [
                  styles.fuelCell,
                  isActive && styles.fuelCellActive,
                  hovered && optionPrice && !isActive && styles.fuelCellHovered,
                  !optionPrice && styles.fuelCellDisabled,
                ]}
              >
                <Text style={[styles.fuelCellLabel, isActive && styles.fuelCellLabelActive]}>{option.label[language]}</Text>
                {optionPrice ? (
                  <PumpPrice color={isActive ? colors.white : colors.text} language={language} size={17} value={optionPrice.value} />
                ) : (
                  <Text style={[styles.fuelCellMissing, inRupture && styles.fuelCellRupture]}>
                    {inRupture ? t.details.rupture : t.details.unavailable}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle>{t.details.hours}</SectionTitle>
        <WeekSchedule language={language} now={now} station={station} />
      </View>

      {station.services.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle>{t.details.services}</SectionTitle>
          <View style={styles.services}>
            {station.services.map((service) => (
              <Chip icon={Check} key={service}>
                {service}
              </Chip>
            ))}
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="link"
        onPress={() => Linking.openURL(`https://www.prix-carburants.gouv.fr/station/${station.id}`)}
        style={styles.officialLink}
      >
        <ExternalLink color={colors.textMuted} size={14} />
        <Text style={styles.officialLinkText}>{t.details.officialPage}</Text>
      </Pressable>
    </ScrollView>
  );
}

function OpeningLine({ language, now, state }: { language: AppLanguage; now: number; state: OpeningState }) {
  const t = copy[language].opening;
  let tone: 'open' | 'closed' | 'neutral' = 'neutral';
  let label: string = t.unknown;

  switch (state.kind) {
    case 'open':
      tone = 'open';
      label = `${t.open} · ${state.closingSoon ? t.closingSoon(state.closesAt) : t.closesAt(state.closesAt)}`;
      break;
    case 'open24':
      tone = 'open';
      label = t.open24;
      break;
    case 'automate':
      tone = 'open';
      label = t.automate;
      break;
    case 'closed': {
      tone = 'closed';
      const opensAt = state.opensAt;
      const next = !opensAt
        ? null
        : opensAt.dayOffset === 0
          ? t.opensToday(opensAt.time)
          : opensAt.dayOffset === 1
            ? t.opensTomorrow(opensAt.time)
            : t.opensOn(t.weekdays[(getParisClock(new Date(now)).day - 1 + opensAt.dayOffset) % 7], opensAt.time);

      label = [t.closed, next, state.automate ? t.automate : null].filter(Boolean).join(' · ');
      break;
    }
    default:
      break;
  }

  const dotColor = tone === 'open' ? colors.brand : tone === 'closed' ? colors.danger : colors.textSubtle;

  return (
    <View style={styles.opening}>
      <View style={[styles.openingDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.openingText, tone === 'closed' && { color: colors.danger }]}>{label}</Text>
    </View>
  );
}

function WeekSchedule({ language, now, station }: { language: AppLanguage; now: number; station: Station }) {
  const t = copy[language].opening;
  const rows = getWeekRows(station, new Date(now));
  const hasAnyHours = rows.some((row) => row.value.kind !== 'unknown');

  if (!hasAnyHours) {
    return (
      <View style={styles.opening}>
        <Clock color={colors.textSubtle} size={15} />
        <Text style={styles.openingText}>{station.automate24h ? copy[language].details.automateNote : t.unknown}</Text>
      </View>
    );
  }

  return (
    <View style={styles.week}>
      {rows.map((row) => {
        const value =
          row.value.kind === 'closed'
            ? t.closed
            : row.value.kind === 'allDay'
              ? t.allDay
              : row.value.kind === 'unknown'
                ? '—'
                : row.value.slots.map((slot) => `${slot.open} – ${slot.close}`).join(', ');

        return (
          <View key={row.day} style={[styles.weekRow, row.isToday && styles.weekRowToday]}>
            <Text style={[styles.weekDay, row.isToday && styles.weekToday]}>{capitalize(t.weekdays[row.day - 1])}</Text>
            <Text
              style={[
                styles.weekValue,
                row.isToday && styles.weekToday,
                row.value.kind === 'closed' && { color: colors.danger },
              ]}
            >
              {value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function RangeBar({ language, price, stats }: { language: AppLanguage; price: number; stats: PriceStats }) {
  const t = copy[language].zone;
  const span = stats.max - stats.min;
  const position = Math.min(1, Math.max(0, (price - stats.min) / span));
  const averagePosition = Math.min(1, Math.max(0, (stats.average - stats.min) / span));

  return (
    <View style={styles.range}>
      <View style={styles.rangeTrack}>
        <View style={[styles.rangeSegment, { backgroundColor: tierColors.cheap.solid }]} />
        <View style={[styles.rangeSegment, { backgroundColor: tierColors.mid.solid }]} />
        <View style={[styles.rangeSegment, { backgroundColor: tierColors.high.solid }]} />
        <View style={[styles.rangeAverage, { left: `${averagePosition * 100}%` }]} />
        <View style={[styles.rangeThumb, { left: `${position * 100}%` }]} />
      </View>
      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabel}>
          {t.cheapest} {formatPrice(stats.min, language)}
        </Text>
        <Text style={styles.rangeLabel}>
          {t.average} {formatPrice(stats.average, language)}
        </Text>
        <Text style={styles.rangeLabel}>
          {t.highest} {formatPrice(stats.max, language)}
        </Text>
      </View>
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
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 3,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 6,
    height: 40,
    marginLeft: -8,
    paddingHorizontal: 8,
  },
  backButtonHovered: {
    backgroundColor: colors.surfaceSunken,
  },
  backLabel: {
    color: colors.inkSoft,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  brandLabel: {
    color: colors.textSubtle,
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  content: {
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  contentSheet: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  fuelCell: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: '30%',
    flexGrow: 1,
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  fuelCellActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  fuelCellDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  fuelCellHovered: {
    borderColor: colors.borderStrong,
  },
  fuelCellLabel: {
    color: colors.textSubtle,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  fuelCellLabelActive: {
    color: 'rgba(255, 255, 255, 0.72)',
  },
  fuelCellMissing: {
    color: colors.textSubtle,
    fontFamily: fonts.regular,
    fontSize: 13,
    paddingVertical: 1,
  },
  fuelCellRupture: {
    color: colors.danger,
    fontFamily: fonts.semibold,
  },
  fuelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hero: {
    borderRadius: radius.lg,
    marginTop: 18,
    padding: 16,
  },
  heroFuel: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  heroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heroNational: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12.5,
    marginTop: 8,
  },
  heroRank: {
    color: colors.textMuted,
    fontFamily: fonts.semibold,
    fontSize: 13,
    marginTop: 2,
  },
  heroUnavailable: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 20,
    marginVertical: 8,
  },
  heroUpdated: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  identity: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  insight: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 10,
  },
  insightText: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
  },
  name: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 21,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  officialLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    marginTop: 22,
  },
  officialLinkText: {
    color: colors.textMuted,
    fontFamily: fonts.semibold,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  opening: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  openingDot: {
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  openingText: {
    color: colors.textMuted,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 13.5,
  },
  primaryAction: {
    flex: 1,
  },
  range: {
    marginTop: 14,
  },
  rangeAverage: {
    backgroundColor: colors.ink,
    borderRadius: 1,
    height: 14,
    marginLeft: -1,
    position: 'absolute',
    top: -4,
    width: 2,
  },
  rangeLabel: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rangeSegment: {
    flex: 1,
    height: '100%',
  },
  rangeThumb: {
    backgroundColor: colors.white,
    borderColor: colors.ink,
    borderRadius: radius.pill,
    borderWidth: 3,
    height: 16,
    marginLeft: -8,
    position: 'absolute',
    top: -5,
    width: 16,
  },
  rangeTrack: {
    borderRadius: radius.pill,
    flexDirection: 'row',
    height: 6,
    overflow: 'visible',
  },
  scroll: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  services: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  warning: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  warningText: {
    color: colors.warning,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    lineHeight: 17,
  },
  week: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 4,
  },
  weekDay: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  weekRowToday: {
    backgroundColor: colors.surface,
  },
  weekToday: {
    color: colors.text,
    fontFamily: fonts.bold,
  },
  weekValue: {
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
