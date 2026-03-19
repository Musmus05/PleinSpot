import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Clock3, Coffee, MapPin, Navigation, ShieldCheck, ShoppingBag, Sparkles, Waves, X } from 'lucide-react-native';

import { Station } from '../lib/carburantsApi';
import { AppLanguage, copy } from '../lib/copy';
import { formatDistanceLabel, formatPrice, formatTimestamp, getDistanceInKm } from '../lib/format';
import { FuelFilter, FUEL_OPTIONS } from '../lib/fuels';
import { getStationBrand } from '../lib/stationBrand';
import { fetchStationOfficialDetails, StationOfficialDetails } from '../lib/stationOfficialDetails';
import { getDisplayPrice } from '../lib/stationDisplay';
import { colors, shadows } from '../theme';

type StationSheetProps = {
  activeFuel: FuelFilter;
  language: AppLanguage;
  onClose: () => void;
  onOpenDirections: () => void;
  station: Station;
  userLocation: { latitude: number; longitude: number } | null;
  visibleStations: Station[];
};

type DynamicCardData = {
  delta: number | null;
  fuel: (typeof FUEL_OPTIONS)[number];
  priceValue: number;
  sampleCount: number;
  series: number[];
};

const quickServiceIcons = [ShoppingBag, Waves, Sparkles, Coffee];
const MAX_GRAPH_POINTS = 10;

export function StationSheet({
  activeFuel,
  language,
  onClose,
  onOpenDirections,
  station,
  userLocation,
  visibleStations,
}: StationSheetProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1080;
  const isCompact = width < 720;
  const isNarrow = width < 480;
  const spotlightPrice = getDisplayPrice(station, activeFuel);
  const distance = userLocation ? formatDistanceLabel(getDistanceInKm(userLocation, station.coordinates)) : null;
  const t = copy[language];
  const [officialDetails, setOfficialDetails] = useState<StationOfficialDetails | null>(null);
  const brand = officialDetails?.brand ?? getStationBrand(station);
  const stationName = officialDetails?.name;
  const cardWidth = isDesktop ? 376 : Math.min(width - 32, 440);
  const dynamicCards = getDynamicCardData(station, visibleStations).slice(0, 2);

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
    <View style={[styles.sheet, shadows.floating, { width: cardWidth }, isDesktop && styles.sheetDesktop]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!isDesktop ? <View style={styles.handle} /> : null}

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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.stationSheet.dynamics}</Text>
          <Text style={styles.sectionMeta}>{t.stationSheet.lastThirtyDays}</Text>
        </View>

        <View style={styles.dynamicsList}>
          {dynamicCards.map((card) => (
            <View
              key={card.fuel.key}
              style={[styles.dynamicCard, isCompact && styles.dynamicCardCompact]}
            >
              <View style={styles.dynamicCopy}>
                <View style={styles.dynamicLabelRow}>
                  <Text style={styles.dynamicLabel}>{card.fuel.label}</Text>
                  <Text style={styles.dynamicSamples}>{card.sampleCount} stations</Text>
                </View>
                <View style={styles.dynamicValueRow}>
                  <Text style={styles.dynamicValue}>{formatPrice(card.priceValue)}</Text>
                  {card.delta != null ? (
                    <Text style={[styles.dynamicDelta, card.delta >= 0 ? styles.dynamicDeltaUp : styles.dynamicDeltaDown]}>
                      {formatDelta(card.delta)}
                    </Text>
                  ) : null}
                </View>
              </View>

              <MiniMarketChart
                accent={card.fuel.accent}
                compact={isCompact}
                focusValue={card.priceValue}
                series={card.series}
              />
            </View>
          ))}

          {dynamicCards.length === 0 ? (
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
              (activeFuel !== 'all' && activeFuel === fuel.key) ||
              (activeFuel === 'all' && getDisplayPrice(station, activeFuel)?.fuelKey === fuel.key);

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

function MiniMarketChart({
  accent,
  compact,
  focusValue,
  series,
}: {
  accent: string;
  compact: boolean;
  focusValue: number;
  series: number[];
}) {
  const width = compact ? 124 : 108;
  const height = compact ? 56 : 48;
  const chartSeries = series.length === 1 ? [series[0], series[0]] : series;
  const chartWidth = width - 8;
  const chartHeight = height - 12;
  const min = Math.min(...chartSeries);
  const max = Math.max(...chartSeries);
  const valueRange = max - min || 1;
  const points = chartSeries.map((entry, index) => {
    const x = 4 + (chartWidth * index) / Math.max(chartSeries.length - 1, 1);
    const y = 6 + chartHeight - ((entry - min) / valueRange) * chartHeight;

    return { x, y, value: entry };
  });
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - 6} L ${points[0].x} ${height - 6} Z`;
  const focusPoint = points.reduce((closest, point) =>
    Math.abs(point.value - focusValue) < Math.abs(closest.value - focusValue) ? point : closest,
  );

  return (
    <Svg height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
      <Path d={areaPath} fill={accent} opacity={0.12} />
      <Path d={linePath} fill="none" stroke={accent} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
      <Circle cx={focusPoint.x} cy={focusPoint.y} fill={colors.white} r={5} stroke={accent} strokeWidth={2.5} />
    </Svg>
  );
}

function getDynamicCardData(station: Station, visibleStations: Station[]): DynamicCardData[] {
  return FUEL_OPTIONS.filter((fuel) => station.prices[fuel.key]).map((fuel) => {
    const priceValue = station.prices[fuel.key]?.value ?? 0;
    const marketSeries = visibleStations
      .map((candidate) => candidate.prices[fuel.key]?.value)
      .filter((value): value is number => value != null)
      .sort((left, right) => left - right);
    const averagePrice =
      marketSeries.length > 0
        ? marketSeries.reduce((total, value) => total + value, 0) / marketSeries.length
        : null;

    return {
      delta: averagePrice == null ? null : Number((averagePrice - priceValue).toFixed(2)),
      fuel,
      priceValue,
      sampleCount: marketSeries.length,
      series: pickSeriesPoints(marketSeries, priceValue),
    };
  });
}

function pickSeriesPoints(values: number[], priceValue: number) {
  if (values.length === 0) {
    return [priceValue];
  }

  if (values.length <= MAX_GRAPH_POINTS) {
    return values;
  }

  return Array.from({ length: MAX_GRAPH_POINTS }, (_, index) => {
    const sourceIndex = Math.round((index * (values.length - 1)) / (MAX_GRAPH_POINTS - 1));
    return values[sourceIndex];
  });
}

function formatDelta(value: number) {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2).replace('.', ',')}`;
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
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 5,
    marginBottom: 16,
    width: 72,
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
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dynamicCardCompact: {
    alignItems: 'flex-start',
    flexDirection: 'column',
  },
  dynamicCopy: {
    flex: 1,
  },
  dynamicLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dynamicLabel: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dynamicSamples: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 10,
  },
  dynamicValueRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dynamicValue: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
  },
  dynamicDelta: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
  },
  dynamicDeltaUp: {
    color: colors.mint,
  },
  dynamicDeltaDown: {
    color: colors.coral,
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
