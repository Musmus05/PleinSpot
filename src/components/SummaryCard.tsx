import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Station } from '../lib/carburantsApi';
import { AppLanguage, copy } from '../lib/copy';
import { formatDistanceLabel, formatPrice, getDistanceInKm } from '../lib/format';
import { FUEL_META } from '../lib/fuels';
import { DisplayPrice } from '../lib/stationDisplay';
import { colors, shadows } from '../theme';

type SummaryCardProps = {
  getStationDisplayPrice: (station: Station) => DisplayPrice | null;
  isCollapsed: boolean;
  isLoading: boolean;
  language: AppLanguage;
  onChangeCollapsed: (nextValue: boolean) => void;
  onFocusStation: (station: Station) => void;
  stations: Station[];
  userLocation: { latitude: number; longitude: number } | null;
};

export function SummaryCard({
  getStationDisplayPrice,
  isCollapsed,
  isLoading,
  language,
  onChangeCollapsed,
  onFocusStation,
  stations,
  userLocation,
}: SummaryCardProps) {
  const { height, width } = useWindowDimensions();
  const isDesktop = width >= 1080;
  const isPhone = width < 560;
  const t = copy[language];
  const listViewportHeight = isPhone ? Math.min(height * 0.34, 320) : undefined;
  const resultsToggleLabel = language === 'fr' ? 'Résultats' : 'Results';

  return (
    <View style={[styles.card, shadows.floating, isDesktop && styles.cardDesktop, isPhone && styles.cardPhone]}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t.summary.top3}</Text>
        </View>
        <View style={styles.headerActions}>
          {isLoading ? <ActivityIndicator color={colors.sun} /> : null}
          <Pressable onPress={() => onChangeCollapsed(!isCollapsed)} style={styles.collapseButton}>
            <Text style={styles.collapseButtonText}>{resultsToggleLabel}</Text>
            {isCollapsed ? (
              <ChevronUp color={colors.subtleTextStrong} size={14} />
            ) : (
              <ChevronDown color={colors.subtleTextStrong} size={14} />
            )}
          </Pressable>
        </View>
      </View>

      {!isCollapsed ? (
        <View style={[styles.expandedContent, isPhone && styles.expandedContentPhone]}>
          <Text style={styles.title}>{t.summary.title}</Text>
          <Text style={styles.subtitle}>{t.summary.subtitle}</Text>

          {stations.length > 0 ? (
            <ScrollView
              style={[styles.railViewport, isPhone && { maxHeight: listViewportHeight }]}
              contentContainerStyle={[styles.rail, isDesktop ? styles.railDesktop : styles.railMobile]}
              horizontal={isDesktop}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={isPhone}
            >
              {stations.map((station, index) => {
                const price = getStationDisplayPrice(station);
                const distance = userLocation ? formatDistanceLabel(getDistanceInKm(userLocation, station.coordinates)) : null;

                return (
                  <Pressable
                    key={station.id}
                    onPress={() => onFocusStation(station)}
                    style={[styles.stationCard, !isDesktop && styles.stationCardMobile, isPhone && styles.stationCardPhone]}
                  >
                    <View style={styles.stationTop}>
                      <View style={styles.rankBubble}>
                        <Text style={styles.rankText}>{index + 1}</Text>
                      </View>
                      {distance ? <Text style={styles.distance}>{distance}</Text> : null}
                    </View>
                    <Text style={[styles.price, isPhone && styles.pricePhone]}>{price ? formatPrice(price.value) : 'Indispo'}</Text>
                    <Text style={styles.fuel}>{price ? FUEL_META[price.fuelKey].label : 'Non disponible'}</Text>

                    <View style={styles.separator} />

                    <Text style={styles.city}>
                      {station.city} {station.postcode}
                    </Text>
                    <Text numberOfLines={2} style={styles.address}>
                      {station.address}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{t.summary.emptyTitle}</Text>
              <Text style={styles.emptyBody}>{t.summary.emptyBody}</Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    maxWidth: 900,
    padding: 18,
    width: '100%',
  },
  cardPhone: {
    borderRadius: 24,
    padding: 14,
  },
  cardDesktop: {
    width: 820,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 10,
    letterSpacing: 0.7,
  },
  collapseButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  collapseButtonText: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
  },
  title: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 18,
    marginTop: 14,
  },
  expandedContent: {
    minHeight: 0,
  },
  expandedContentPhone: {
    minHeight: 0,
  },
  subtitle: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    maxWidth: 420,
  },
  rail: {
    gap: 14,
    paddingTop: 18,
  },
  railViewport: {
    minHeight: 0,
  },
  railMobile: {
    paddingTop: 16,
  },
  railDesktop: {
    justifyContent: 'center',
  },
  stationCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    width: 238,
  },
  stationCardMobile: {
    width: '100%',
  },
  stationCardPhone: {
    padding: 16,
  },
  stationTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rankBubble: {
    alignItems: 'center',
    backgroundColor: '#FFF0CC',
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  rankText: {
    color: colors.textOnLight,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
  },
  distance: {
    color: colors.mint,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
  },
  price: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
    marginTop: 18,
  },
  pricePhone: {
    fontSize: 24,
  },
  fuel: {
    color: colors.sun,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 13,
    marginTop: 5,
  },
  separator: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: 16,
  },
  city: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
  },
  address: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  emptyState: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
  },
  emptyBody: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
});
