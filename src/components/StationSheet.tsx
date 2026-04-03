import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Clock3, Coffee, MapPin, Navigation, ShieldCheck, ShoppingBag, Sparkles, Waves, X } from 'lucide-react-native';

import { Station } from '../lib/carburantsApi';
import { AppLanguage, copy } from '../lib/copy';
import { formatDistanceLabel, formatPrice, formatTimestamp, getDistanceInKm } from '../lib/format';
import { FuelSelection, FUEL_OPTIONS } from '../lib/fuels';
import { getStationBrand } from '../lib/stationBrand';
import { fetchStationOfficialDetails, StationOfficialDetails } from '../lib/stationOfficialDetails';
import { getDisplayPrice } from '../lib/stationDisplay';
import { colors, shadows } from '../theme';

type StationSheetProps = {
  activeFuel: FuelSelection;
  language: AppLanguage;
  onClose: () => void;
  onOpenDirections: () => void;
  station: Station;
  userLocation: { latitude: number; longitude: number } | null;
  visibleStations: Station[];
};

type ComparisonCardData = {
  averageDelta: number | null;
  averagePrice: number | null;
  bestPrice: number;
  fuel: (typeof FUEL_OPTIONS)[number];
  priceValue: number;
  rank: number;
  stationCount: number;
  worstPrice: number;
};

const quickServiceIcons = [ShoppingBag, Waves, Sparkles, Coffee];

export function StationSheet({
  activeFuel,
  language,
  onClose,
  onOpenDirections,
  station,
  userLocation,
  visibleStations,
}: StationSheetProps) {
  const { height, width } = useWindowDimensions();
  const isDesktop = width >= 1080;
  const isNarrow = width < 480;
  const spotlightPrice = getDisplayPrice(station, activeFuel);
  const distance = userLocation ? formatDistanceLabel(getDistanceInKm(userLocation, station.coordinates)) : null;
  const t = copy[language];
  const [officialDetails, setOfficialDetails] = useState<StationOfficialDetails | null>(null);
  const brand = officialDetails?.brand ?? getStationBrand(station);
  const stationName = officialDetails?.name;
  const cardWidth = isDesktop ? 376 : Math.min(width - 32, 440);
  const cardMaxHeight = isDesktop ? Math.max(height - 232, 420) : Math.min(height * 0.72, 620);
  const comparisonCards = getComparisonCardData(station, visibleStations, activeFuel);

  useEffect(() => {
    let isMounted = true;

    setOfficialDetails(null);

    fetchStationOfficialDetails(station.id).then((details) => {
      if (isMounted) {
        setOfficialDetails(details);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [station.id]);

  return (
    <View
      style={[
        styles.sheet,
        shadows.floating,
        { maxHeight: cardMaxHeight, width: cardWidth },
        isDesktop && styles.sheetDesktop,
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={isDesktop ? [0] : undefined}
      >
        <View style={styles.stickyHeader}>
          <View style={styles.topRow}>
            <View style={styles.topMeta}>
              <View style={styles.openBadge}>
                <Text style={styles.openBadgeText}>{t.stationSheet.open}</Text>
              </View>
              {brand ? (
                <View style={styles.brandBadge}>
                  <Text style={styles.brandBadgeText}>{brand}</Text>
                </View>
              ) : null}
            </View>
            <Pressable onPress={onClose} style={styles.iconButton}>
              <X color={colors.subtleTextStrong} size={18} />
            </Pressable>
          </View>

          <Text style={styles.title}>
            {station.city} {station.postcode}
          </Text>
          {stationName ? <Text style={styles.stationName}>{stationName}</Text> : null}
          <Text style={styles.subtitle}>{station.address}</Text>

          <Pressable onPress={onOpenDirections} style={styles.navigateButton}>
            <Navigation color={colors.textOnLight} size={18} />
            <Text style={styles.navigateText}>{t.stationSheet.navigate}</Text>
          </Pressable>

          <View style={styles.metaStrip}>
            <View style={styles.metaPill}>
              <MapPin color={colors.subtleTextStrong} size={13} />
              <Text style={styles.metaText}>{station.department}</Text>
            </View>
            {station.automate24h ? (
              <View style={[styles.metaPill, styles.metaPillMint]}>
                <ShieldCheck color={colors.mint} size={13} />
                <Text style={[styles.metaText, styles.metaMintText]}>24/24</Text>
              </View>
            ) : null}
            {distance ? (
              <View style={styles.metaPill}>
                <Navigation color={colors.aqua} size={13} />
                <Text style={styles.metaText}>{distance}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.stationSheet.compareTitle}</Text>
          <Text style={styles.sectionMeta}>{t.stationSheet.compareMeta}</Text>
        </View>

        <View style={styles.dynamicsList}>
          {comparisonCards.map((card) => (
            <View key={card.fuel.key} style={styles.dynamicCard}>
              <View style={styles.compareTopRow}>
                <View style={styles.compareTitleBlock}>
                  <View style={styles.compareFuelRow}>
                    <View style={[styles.compareFuelDot, { backgroundColor: card.fuel.accent }]} />
                    <Text style={styles.dynamicLabel}>{card.fuel.label}</Text>
                    {activeFuel.length > 0 && activeFuel.includes(card.fuel.key) ? (
                      <View style={styles.compareActiveBadge}>
                        <Text style={styles.compareActiveBadgeText}>{t.stationSheet.currentFuel}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.dynamicValue}>{formatPrice(card.priceValue)}</Text>
                </View>

                <View style={styles.compareRankBadge}>
                  <Text style={styles.compareRankLabel}>{t.stationSheet.ranking}</Text>
                  <Text style={styles.compareRankValue}>{formatRank(card.rank, card.stationCount)}</Text>
                </View>
              </View>

              <Text
                style={[
                  styles.compareMessage,
                  card.averageDelta == null
                    ? styles.compareMessageNeutral
                    : card.averageDelta >= 0
                      ? styles.compareMessagePositive
                      : styles.compareMessageNegative,
                ]}
              >
                {formatComparisonMessage(card.averageDelta, language)}
              </Text>

              <ComparisonBar
                accent={card.fuel.accent}
                averagePrice={card.averagePrice}
                bestPrice={card.bestPrice}
                priceValue={card.priceValue}
                worstPrice={card.worstPrice}
              />

              <View style={styles.compareMetricsRow}>
                <Metric label={t.stationSheet.zoneBest} value={formatPrice(card.bestPrice)} />
                <Metric
                  label={t.stationSheet.zoneAverage}
                  value={card.averagePrice != null ? formatPrice(card.averagePrice) : '--'}
                />
                <Metric label={t.stationSheet.zoneWorst} value={formatPrice(card.worstPrice)} />
              </View>
            </View>
          ))}

          {comparisonCards.length === 0 ? (
            <View style={styles.dynamicCard}>
              <Text style={styles.dynamicLabel}>{t.stationSheet.noPrice}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.stationSheet.onSiteServices}</Text>
        </View>

        <View style={styles.servicesGrid}>
          {station.services.slice(0, 4).map((service, index) => {
            const Icon = quickServiceIcons[index % quickServiceIcons.length];

            return (
              <View key={service} style={[styles.serviceCard, isNarrow && styles.serviceCardCompact]}>
                <View style={styles.serviceIconWrap}>
                  <Icon color={colors.subtleTextStrong} size={16} />
                </View>
                <Text numberOfLines={2} style={styles.serviceName}>
                  {service}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.stationSheet.allFuels}</Text>
        </View>

        <View style={styles.fuelGrid}>
          {FUEL_OPTIONS.map((fuel) => {
            const price = station.prices[fuel.key];
            const highlight =
              (activeFuel.length > 0 && activeFuel.includes(fuel.key)) ||
              (activeFuel.length === 0 && getDisplayPrice(station, activeFuel)?.fuelKey === fuel.key);

            return (
              <View
                key={fuel.key}
                style={[
                  styles.fuelCard,
                  isNarrow && styles.fuelCardCompact,
                  highlight && { backgroundColor: '#FFF7EA', borderColor: fuel.accent },
                ]}
              >
                <View style={styles.fuelRow}>
                  <Text style={styles.fuelLabel}>{fuel.label}</Text>
                  <View style={[styles.fuelDot, { backgroundColor: fuel.accent }]} />
                </View>
                <Text style={styles.fuelValue}>{price ? formatPrice(price.value) : 'Indispo'}</Text>
                <Text style={styles.fuelMeta}>
                  {price?.updatedAt ? formatTimestamp(price.updatedAt) : t.stationSheet.noUpdate}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.bottomMeta}>
          <View style={styles.infoRow}>
            <Clock3 color={colors.sun} size={16} />
            <View>
              <Text style={styles.infoLabel}>{t.stationSheet.lastUpdate}</Text>
              <Text style={styles.infoValue}>
                {spotlightPrice?.updatedAt ? formatTimestamp(spotlightPrice.updatedAt) : t.stationSheet.noUpdate}
              </Text>
            </View>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.sectionTitle}>{t.stationSheet.openingHours}</Text>
            <Text style={styles.infoSchedule}>{station.schedule || t.stationSheet.noSchedule}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.compareMetric}>
      <Text style={styles.compareMetricLabel}>{label}</Text>
      <Text style={styles.compareMetricValue}>{value}</Text>
    </View>
  );
}

function ComparisonBar({
  accent,
  averagePrice,
  bestPrice,
  priceValue,
  worstPrice,
}: {
  accent: string;
  averagePrice: number | null;
  bestPrice: number;
  priceValue: number;
  worstPrice: number;
}) {
  const span = worstPrice - bestPrice || 1;
  const stationRatio = clampRatio((priceValue - bestPrice) / span);
  const averageRatio = averagePrice == null ? stationRatio : clampRatio((averagePrice - bestPrice) / span);

  return (
    <View style={styles.compareBarBlock}>
      <View style={styles.compareBarTrack}>
        <View style={[styles.compareBarFill, { backgroundColor: accent, width: `${Math.max(stationRatio * 100, 3)}%` }]} />
        <View style={[styles.compareBarAverageMarker, { left: `${averageRatio * 100}%` }]} />
        <View style={[styles.compareBarStationMarker, { borderColor: accent, left: `${stationRatio * 100}%` }]} />
      </View>
    </View>
  );
}

function getComparisonCardData(
  station: Station,
  visibleStations: Station[],
  activeFuel: FuelSelection,
): ComparisonCardData[] {
  const orderedFuels = FUEL_OPTIONS.filter((fuel) => station.prices[fuel.key]).sort((left, right) => {
    if (activeFuel.length > 0) {
      if (activeFuel.includes(left.key) && !activeFuel.includes(right.key)) {
        return -1;
      }

      if (activeFuel.includes(right.key) && !activeFuel.includes(left.key)) {
        return 1;
      }
    }

    return (station.prices[left.key]?.value ?? Number.POSITIVE_INFINITY) - (station.prices[right.key]?.value ?? Number.POSITIVE_INFINITY);
  });

  return orderedFuels.map((fuel) => {
    const priceValue = station.prices[fuel.key]?.value ?? 0;
    const marketStations = visibleStations
      .filter((candidate) => candidate.prices[fuel.key] != null)
      .sort((left, right) => {
        const leftPrice = left.prices[fuel.key]?.value ?? Number.POSITIVE_INFINITY;
        const rightPrice = right.prices[fuel.key]?.value ?? Number.POSITIVE_INFINITY;

        if (leftPrice === rightPrice) {
          return left.id - right.id;
        }

        return leftPrice - rightPrice;
      });
    const marketPrices = marketStations.map((candidate) => candidate.prices[fuel.key]?.value ?? 0);
    const averagePrice =
      marketPrices.length > 0
        ? marketPrices.reduce((total, value) => total + value, 0) / marketPrices.length
        : null;
    const rank = Math.max(
      1,
      marketStations.findIndex((candidate) => candidate.id === station.id) + 1,
    );

    return {
      averageDelta: averagePrice == null ? null : Number((averagePrice - priceValue).toFixed(3)),
      averagePrice: averagePrice == null ? null : Number(averagePrice.toFixed(3)),
      bestPrice: marketPrices[0] ?? priceValue,
      fuel,
      priceValue,
      rank,
      stationCount: marketPrices.length,
      worstPrice: marketPrices[marketPrices.length - 1] ?? priceValue,
    };
  });
}

function formatComparisonMessage(delta: number | null, language: AppLanguage) {
  const t = copy[language].stationSheet;

  if (delta == null) {
    return t.noPrice;
  }

  if (Math.abs(delta) < 0.005) {
    return t.equalToAverage;
  }

  if (delta > 0) {
    return `${formatDeltaValue(delta)} ${t.cheaperThanAverage}`;
  }

  return `${formatDeltaValue(Math.abs(delta))} ${t.moreExpensiveThanAverage}`;
}

function formatDeltaValue(value: number) {
  return `${value.toFixed(3).replace('.', ',')} €`;
}

function formatRank(rank: number, stationCount: number) {
  return `#${rank}/${stationCount}`;
}

function clampRatio(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.panelRaised,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    maxHeight: '100%',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  sheetDesktop: {
    alignSelf: 'flex-end',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  stickyHeader: {
    backgroundColor: colors.panelRaised,
    marginHorizontal: -18,
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 18,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  openBadge: {
    backgroundColor: '#75D96E',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  openBadgeText: {
    color: '#11401C',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
  },
  brandBadge: {
    backgroundColor: '#FFF4DD',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  brandBadgeText: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  title: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    marginTop: 14,
  },
  subtitle: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  stationName: {
    color: colors.sun,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    letterSpacing: 0.4,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  navigateButton: {
    alignItems: 'center',
    backgroundColor: '#D7A400',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  navigateText: {
    color: colors.textOnLight,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  metaStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  metaPill: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaPillMint: {
    backgroundColor: '#EBFAF2',
  },
  metaText: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
  },
  metaMintText: {
    color: colors.mint,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 24,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
  sectionMeta: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  dynamicsList: {
    gap: 12,
  },
  dynamicCard: {
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  compareTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  compareTitleBlock: {
    flex: 1,
    gap: 8,
  },
  compareFuelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compareFuelDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  compareActiveBadge: {
    backgroundColor: '#FFF4DD',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  compareActiveBadgeText: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
  },
  compareRankBadge: {
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 78,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  compareRankLabel: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 10,
  },
  compareRankValue: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
    marginTop: 2,
  },
  dynamicLabel: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dynamicValue: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
  },
  compareMessage: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
    lineHeight: 18,
  },
  compareMessagePositive: {
    color: colors.mint,
  },
  compareMessageNegative: {
    color: colors.coral,
  },
  compareMessageNeutral: {
    color: colors.subtleTextStrong,
  },
  compareBarBlock: {
    paddingTop: 2,
  },
  compareBarTrack: {
    backgroundColor: colors.mist,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  compareBarFill: {
    borderRadius: 999,
    height: '100%',
  },
  compareBarAverageMarker: {
    backgroundColor: colors.subtleText,
    height: 20,
    position: 'absolute',
    top: -3,
    transform: [{ translateX: -1 }],
    width: 2,
  },
  compareBarStationMarker: {
    backgroundColor: colors.white,
    borderRadius: 999,
    borderWidth: 3,
    height: 14,
    position: 'absolute',
    top: -1,
    transform: [{ translateX: -7 }],
    width: 14,
  },
  compareMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  compareMetric: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 92,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  compareMetricLabel: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 10,
  },
  compareMetricValue: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    marginTop: 6,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceCard: {
    alignItems: 'center',
    flexBasis: '22%',
    flexGrow: 1,
  },
  serviceCardCompact: {
    flexBasis: '46%',
  },
  serviceIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  serviceName: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
  },
  fuelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fuelCard: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
  },
  fuelCardCompact: {
    flexBasis: '100%',
  },
  fuelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fuelLabel: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
  },
  fuelDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  fuelValue: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    marginTop: 10,
  },
  fuelMeta: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    marginTop: 8,
  },
  bottomMeta: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  infoLabel: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
  },
  infoValue: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    marginTop: 2,
  },
  infoBlock: {
    marginTop: 18,
  },
  infoSchedule: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
});
