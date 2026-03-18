import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Station } from '../lib/carburantsApi';
import { formatDistanceLabel, formatPrice, getDistanceInKm } from '../lib/format';
import { FUEL_META } from '../lib/fuels';
import { DisplayPrice } from '../lib/stationDisplay';
import { colors, shadows } from '../theme';

type SummaryCardProps = {
  getStationDisplayPrice: (station: Station) => DisplayPrice | null;
  isLoading: boolean;
  onFocusStation: (station: Station) => void;
  stations: Station[];
  userLocation: { latitude: number; longitude: number } | null;
};

export function SummaryCard({
  getStationDisplayPrice,
  isLoading,
  onFocusStation,
  stations,
  userLocation,
}: SummaryCardProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1080;

  return (
    <View style={[styles.summaryCard, shadows.floating, isDesktop && styles.summaryCardDesktop]}>
      <LinearGradient
        colors={['rgba(130, 216, 255, 0.12)', 'rgba(255, 184, 108, 0.06)', 'rgba(8, 22, 32, 0)']}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={styles.summaryGlow}
      />

      <View style={styles.summaryHeader}>
        <View style={styles.summaryHeaderCopy}>
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeText}>Top 3</Text>
          </View>
          <Text style={styles.summaryTitle}>Les meilleurs prix autour de toi</Text>
          <Text style={styles.summarySubtitle}>
            Deplace la carte ou change le carburant pour recalculer les stations les plus competitives.
          </Text>
        </View>
        {isLoading ? <ActivityIndicator color={colors.sun} /> : null}
      </View>

      {stations.length > 0 ? (
        <ScrollView
          contentContainerStyle={[styles.summaryRail, isDesktop && styles.summaryRailDesktop]}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {stations.map((station, index) => {
            const price = getStationDisplayPrice(station);
            const distance = userLocation
              ? formatDistanceLabel(getDistanceInKm(userLocation, station.coordinates))
              : null;

            return (
              <Pressable
                key={station.id}
                onPress={() => onFocusStation(station)}
                style={styles.summaryStationCard}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
                  end={{ x: 1, y: 1 }}
                  start={{ x: 0, y: 0 }}
                  style={styles.summaryStationInner}
                >
                  <View style={styles.summaryStationTop}>
                    <View style={styles.summaryRankBadge}>
                      <Text style={styles.summaryRankText}>{index + 1}</Text>
                    </View>
                    {distance ? <Text style={styles.summaryStationDistance}>{distance}</Text> : null}
                  </View>

                  <Text style={styles.summaryStationPrice}>
                    {price ? formatPrice(price.value) : 'Indispo'}
                  </Text>
                  <Text style={styles.summaryStationFuel}>
                    {price ? FUEL_META[price.fuelKey].label : 'Non disponible'}
                  </Text>

                  <View style={styles.summarySeparator} />

                  <Text style={styles.summaryStationCity}>
                    {station.city} {station.postcode}
                  </Text>
                  <Text numberOfLines={2} style={styles.summaryStationAddress}>
                    {station.address}
                  </Text>
                </LinearGradient>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptySummary}>
          <Text style={styles.emptySummaryTitle}>Aucune station exploitable</Text>
          <Text style={styles.emptySummaryBody}>
            Eloigne un peu le zoom ou deplace la carte vers une zone plus dense.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 32,
    borderWidth: 1,
    maxWidth: 920,
    overflow: 'hidden',
    padding: 20,
    width: '100%',
  },
  summaryCardDesktop: {
    width: 880,
  },
  summaryGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  summaryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  summaryHeaderCopy: {
    flex: 1,
    gap: 6,
    paddingRight: 12,
  },
  summaryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(130, 216, 255, 0.12)',
    borderColor: 'rgba(130, 216, 255, 0.28)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  summaryBadgeText: {
    color: colors.aqua,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  summaryTitle: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
  },
  summarySubtitle: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 420,
  },
  summaryRail: {
    flexGrow: 1,
    gap: 14,
    paddingRight: 2,
  },
  summaryRailDesktop: {
    justifyContent: 'center',
  },
  summaryStationCard: {
    width: 248,
  },
  summaryStationInner: {
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1,
    minHeight: 226,
    overflow: 'hidden',
    padding: 18,
  },
  summaryStationTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryRankBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 108, 0.12)',
    borderColor: 'rgba(255, 184, 108, 0.24)',
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  summaryRankText: {
    color: colors.sun,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
  },
  summaryStationDistance: {
    color: colors.mint,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
  },
  summaryStationPrice: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 30,
    marginTop: 18,
  },
  summaryStationFuel: {
    color: colors.sun,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 13,
    marginTop: 6,
  },
  summarySeparator: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: 16,
    width: '100%',
  },
  summaryStationCity: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
  summaryStationAddress: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  emptySummary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  emptySummaryTitle: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
  },
  emptySummaryBody: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
});
