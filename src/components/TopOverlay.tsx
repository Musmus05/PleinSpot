import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Clock3, LocateFixed, MapPinned, RefreshCcw, Search, Sparkles } from 'lucide-react-native';

import { Station } from '../lib/carburantsApi';
import { formatPrice, formatTimestamp } from '../lib/format';
import { FuelFilter, FUEL_FILTER_OPTIONS } from '../lib/fuels';
import { DisplayPrice } from '../lib/stationDisplay';
import { colors, shadows } from '../theme';
import { BrandMark } from './BrandMark';

type TopOverlayProps = {
  activeFuel: FuelFilter;
  isRefreshing: boolean;
  lastSyncAt: string | null;
  onChangeFuel: (fuel: FuelFilter) => void;
  onChangeSearch: (value: string) => void;
  onCenterUser: () => void;
  onFocusStation: (station: Station) => void;
  onRefresh: () => void;
  priceRange: { max: number | null; min: number | null };
  searchResults: Station[];
  searchText: string;
  stationsCount: number;
  getStationDisplayPrice: (station: Station) => DisplayPrice | null;
};

export function TopOverlay({
  activeFuel,
  getStationDisplayPrice,
  isRefreshing,
  lastSyncAt,
  onCenterUser,
  onChangeFuel,
  onChangeSearch,
  onFocusStation,
  onRefresh,
  priceRange,
  searchResults,
  searchText,
  stationsCount,
}: TopOverlayProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1080;
  const activeFuelLabel = FUEL_FILTER_OPTIONS.find((option) => option.key === activeFuel)?.label ?? 'Tout voir';

  return (
    <View style={styles.topPanel}>
      <View style={[styles.heroCard, shadows.floating]}>
        <LinearGradient
          colors={['rgba(130, 216, 255, 0.14)', 'rgba(255, 184, 108, 0.06)', 'rgba(8, 22, 32, 0)']}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          style={styles.heroGlow}
        />

        <View style={[styles.heroHeader, isDesktop && styles.heroHeaderDesktop]}>
          <View style={styles.brandRow}>
            <BrandMark size={60} />
            <View style={styles.brandCopy}>
              <View style={styles.liveRow}>
                <View style={styles.liveBadge}>
                  <Sparkles color={colors.sun} size={12} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
                <Text style={styles.liveHint}>Radar prix carburants</Text>
              </View>
              <Text style={styles.brandTitle}>PleinSpot</Text>
              <Text style={styles.brandSubtitle}>
                Compare les prix a vue, repere le meilleur plein et ouvre directement un itineraire.
              </Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <Pressable onPress={onCenterUser} style={styles.iconButton}>
              <LocateFixed color={colors.text} size={18} />
            </Pressable>
            <Pressable onPress={onRefresh} style={styles.iconButton}>
              {isRefreshing ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <RefreshCcw color={colors.text} size={18} />
              )}
            </Pressable>
          </View>
        </View>

        <View style={[styles.utilityRow, isDesktop && styles.utilityRowDesktop]}>
          <View style={styles.searchColumn}>
            <View style={styles.searchShell}>
              <Search color={colors.subtleText} size={18} />
              <TextInput
                onChangeText={onChangeSearch}
                placeholder="Rechercher dans la zone affichee"
                placeholderTextColor={colors.subtleText}
                selectionColor={colors.sun}
                style={styles.searchInput}
                value={searchText}
              />
            </View>

            {searchText.length > 0 && (
              <View style={[styles.searchResults, shadows.card]}>
                {searchResults.length > 0 ? (
                  searchResults.map((station, index) => {
                    const displayPrice = getStationDisplayPrice(station);

                    return (
                      <Pressable
                        key={station.id}
                        onPress={() => onFocusStation(station)}
                        style={[
                          styles.searchResultRow,
                          index === searchResults.length - 1 && styles.searchResultRowLast,
                        ]}
                      >
                        <View style={styles.searchResultCopy}>
                          <Text style={styles.searchResultTitle}>
                            {station.city} {station.postcode}
                          </Text>
                          <Text style={styles.searchResultSubtitle}>{station.address}</Text>
                        </View>
                        <View style={styles.searchResultPriceWrap}>
                          <Text style={styles.searchResultPrice}>
                            {displayPrice ? formatPrice(displayPrice.value) : 'Indispo'}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={styles.emptySearchState}>
                    <Text style={styles.emptySearchText}>Aucune station trouvee dans la zone affichee.</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <LinearGradient
            colors={['rgba(255, 184, 108, 0.24)', 'rgba(130, 216, 255, 0.10)']}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={[styles.signalCard, isDesktop && styles.signalCardDesktop]}
          >
            <Text style={styles.signalEyebrow}>Meilleur prix repere</Text>
            <Text style={styles.signalPrice}>
              {priceRange.min != null ? formatPrice(priceRange.min) : '--'}
            </Text>
            <Text style={styles.signalCaption}>{activeFuelLabel} dans la zone visible</Text>
          </LinearGradient>
        </View>

        <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
          {FUEL_FILTER_OPTIONS.map((option) => {
            const isActive = option.key === activeFuel;

            return (
              <Pressable key={option.key} onPress={() => onChangeFuel(option.key)} style={styles.filterChipWrap}>
                <LinearGradient
                  colors={
                    isActive
                      ? [option.accent, `${option.accent}CC`]
                      : [colors.surfaceSoft, 'rgba(255, 255, 255, 0.02)']
                  }
                  end={{ x: 1, y: 1 }}
                  start={{ x: 0, y: 0 }}
                  style={[
                    styles.filterChip,
                    isActive && { borderColor: option.accent },
                  ]}
                >
                  <Text style={[styles.filterChipText, isActive && { color: colors.textOnLight }]}>
                    {option.label}
                  </Text>
                </LinearGradient>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.heroStats}>
          <View style={styles.statPill}>
            <MapPinned color={colors.aqua} size={16} />
            <View>
              <Text style={styles.statLabel}>Stations</Text>
              <Text style={styles.statValue}>{stationsCount} visibles</Text>
            </View>
          </View>

          <View style={styles.statPill}>
            <Clock3 color={colors.sun} size={16} />
            <View>
              <Text style={styles.statLabel}>Sync</Text>
              <Text style={styles.statValue}>
                {lastSyncAt ? formatTimestamp(lastSyncAt) : 'Synchronisation'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topPanel: {
    alignSelf: 'center',
    maxWidth: 1380,
    paddingHorizontal: 16,
    paddingTop: 10,
    width: '100%',
  },
  heroCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 20,
  },
  heroGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  heroHeader: {
    gap: 16,
    marginBottom: 18,
  },
  heroHeaderDesktop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    gap: 14,
  },
  brandCopy: {
    flex: 1,
    gap: 4,
  },
  liveRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  liveBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 108, 0.10)',
    borderColor: 'rgba(255, 184, 108, 0.28)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveBadgeText: {
    color: colors.sun,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  liveHint: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
  },
  brandTitle: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 28,
  },
  brandSubtitle: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 560,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  utilityRow: {
    gap: 14,
  },
  utilityRowDesktop: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  searchColumn: {
    flex: 1,
    zIndex: 2,
  },
  searchShell: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: colors.borderStrong,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 15,
    padding: 0,
  },
  signalCard: {
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 116,
    padding: 18,
  },
  signalCardDesktop: {
    maxWidth: 260,
    width: 260,
  },
  signalEyebrow: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
  },
  signalPrice: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 30,
    marginTop: 8,
  },
  signalCaption: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  searchResults: {
    backgroundColor: colors.panelRaised,
    borderColor: colors.borderStrong,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 12,
    overflow: 'hidden',
  },
  searchResultRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchResultRowLast: {
    borderBottomWidth: 0,
  },
  searchResultCopy: {
    flex: 1,
    gap: 4,
  },
  searchResultTitle: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  searchResultSubtitle: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
  },
  searchResultPriceWrap: {
    backgroundColor: 'rgba(255, 184, 108, 0.10)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchResultPrice: {
    color: colors.sun,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
  },
  emptySearchState: {
    padding: 18,
  },
  emptySearchText: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
  },
  filterRow: {
    gap: 10,
    paddingTop: 16,
  },
  filterChipWrap: {
    borderRadius: 999,
  },
  filterChip: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  filterChipText: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 13,
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  statPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 180,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statLabel: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
  },
  statValue: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    marginTop: 2,
  },
});
