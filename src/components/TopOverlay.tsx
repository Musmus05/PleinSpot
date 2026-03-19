import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Clock3, LocateFixed, MapPinned, RefreshCcw, Search, Settings2 } from 'lucide-react-native';
import { useState } from 'react';

import { Station } from '../lib/carburantsApi';
import { AppLanguage, copy } from '../lib/copy';
import { formatPrice, formatTimestamp } from '../lib/format';
import { FuelFilter, FUEL_FILTER_OPTIONS } from '../lib/fuels';
import { DisplayPrice } from '../lib/stationDisplay';
import { colors, shadows } from '../theme';
import { BrandMark } from './BrandMark';

type TopOverlayProps = {
  activeFuel: FuelFilter;
  getStationDisplayPrice: (station: Station) => DisplayPrice | null;
  isRefreshing: boolean;
  language: AppLanguage;
  lastSyncAt: string | null;
  onCenterUser: () => void;
  onChangeFuel: (fuel: FuelFilter) => void;
  onChangeLanguage: (language: AppLanguage) => void;
  onChangeSearch: (value: string) => void;
  onFocusStation: (station: Station) => void;
  onRefresh: () => void;
  priceRange: { max: number | null; min: number | null };
  searchResults: Station[];
  searchText: string;
  stationsCount: number;
};

export function TopOverlay({
  activeFuel,
  getStationDisplayPrice,
  isRefreshing,
  language,
  lastSyncAt,
  onCenterUser,
  onChangeFuel,
  onChangeLanguage,
  onChangeSearch,
  onFocusStation,
  onRefresh,
  priceRange,
  searchResults,
  searchText,
  stationsCount,
}: TopOverlayProps) {
  const { width } = useWindowDimensions();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isDesktop = width >= 1080;
  const t = copy[language];
  const activeFuelLabel = FUEL_FILTER_OPTIONS.find((option) => option.key === activeFuel)?.label ?? 'Tout voir';

  return (
    <View style={styles.topPanel}>
      <View style={[styles.heroCard, shadows.floating]}>
        <View style={[styles.navRow, isDesktop && styles.navRowDesktop]}>
          <View style={styles.brandRow}>
            <BrandMark size={38} />
            <View style={styles.brandMeta}>
              <Text style={styles.brandName}>PleinSpot</Text>
              <Text style={styles.brandHint}>{t.topOverlay.brandHint}</Text>
            </View>
          </View>

          <View style={[styles.searchShell, isDesktop && styles.searchShellDesktop]}>
            <Search color={colors.subtleText} size={16} />
            <TextInput
              onChangeText={onChangeSearch}
              placeholder={t.topOverlay.searchPlaceholder}
              placeholderTextColor={colors.subtleText}
              selectionColor={colors.sun}
              style={styles.searchInput}
              value={searchText}
            />
          </View>

          <View style={styles.navActions}>
            <Pressable onPress={() => setIsSettingsOpen((value) => !value)} style={styles.iconButton}>
              <Settings2 color={colors.subtleTextStrong} size={16} />
            </Pressable>
            <Pressable onPress={onRefresh} style={styles.iconButton}>
              {isRefreshing ? (
                <ActivityIndicator color={colors.subtleTextStrong} size="small" />
              ) : (
                <RefreshCcw color={colors.subtleTextStrong} size={16} />
              )}
            </Pressable>
            <Pressable onPress={onCenterUser} style={styles.iconButton}>
              <LocateFixed color={colors.subtleTextStrong} size={16} />
            </Pressable>
          </View>
        </View>

        {isSettingsOpen ? (
          <View style={[styles.settingsCard, shadows.card]}>
            <Text style={styles.settingsTitle}>{t.settings.title}</Text>
            <Text style={styles.settingsLabel}>{t.settings.language}</Text>
            <View style={styles.languageRow}>
              <Pressable
                onPress={() => onChangeLanguage('fr')}
                style={[styles.languageChip, language === 'fr' && styles.languageChipActive]}
              >
                <Text style={[styles.languageChipText, language === 'fr' && styles.languageChipTextActive]}>
                  {t.settings.french}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => onChangeLanguage('en')}
                style={[styles.languageChip, language === 'en' && styles.languageChipActive]}
              >
                <Text style={[styles.languageChipText, language === 'en' && styles.languageChipTextActive]}>
                  {t.settings.english}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.settingsHint}>{t.settings.comingSoon}</Text>
          </View>
        ) : null}

        {searchText.length > 0 ? (
          <View style={[styles.searchResults, shadows.card]}>
            {searchResults.length > 0 ? (
              searchResults.map((station, index) => {
                const displayPrice = getStationDisplayPrice(station);

                return (
                  <Pressable
                    key={station.id}
                    onPress={() => onFocusStation(station)}
                    style={[styles.searchResultRow, index === searchResults.length - 1 && styles.searchResultLast]}
                  >
                    <View style={styles.searchResultCopy}>
                      <Text style={styles.searchResultTitle}>
                        {station.city} {station.postcode}
                      </Text>
                      <Text style={styles.searchResultSubtitle}>{station.address}</Text>
                    </View>
                    <Text style={styles.searchResultPrice}>
                      {displayPrice ? formatPrice(displayPrice.value) : 'Indispo'}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <Text style={styles.emptySearchText}>{t.topOverlay.noStation}</Text>
            )}
          </View>
        ) : null}

        <View style={[styles.heroBody, isDesktop && styles.heroBodyDesktop]}>
          <View style={styles.heroMain}>
            <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
              {FUEL_FILTER_OPTIONS.map((option) => {
                const isActive = option.key === activeFuel;

                return (
                  <Pressable
                    key={option.key}
                    onPress={() => onChangeFuel(option.key)}
                    style={[styles.filterChip, isActive && { backgroundColor: option.accent, borderColor: option.accent }]}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.heroStats}>
              <View style={styles.statCard}>
                <MapPinned color={colors.aqua} size={15} />
                <View>
                  <Text style={styles.statLabel}>{t.topOverlay.stations}</Text>
                  <Text style={styles.statValue}>
                    {stationsCount} {t.topOverlay.visible}
                  </Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <Clock3 color={colors.sun} size={15} />
                <View>
                  <Text style={styles.statLabel}>{t.topOverlay.sync}</Text>
                  <Text style={styles.statValue}>
                    {lastSyncAt ? formatTimestamp(lastSyncAt) : t.topOverlay.syncing}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.signalCard}>
            <Text style={styles.signalLabel}>{t.topOverlay.bestPrice}</Text>
            <Text style={styles.signalPrice}>{priceRange.min != null ? formatPrice(priceRange.min) : '--'}</Text>
            <Text style={styles.signalCaption}>{activeFuelLabel} dans la zone visible</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topPanel: {
    alignSelf: 'center',
    maxWidth: 1220,
    paddingHorizontal: 16,
    paddingTop: 14,
    width: '100%',
  },
  heroCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
  },
  navRow: {
    gap: 14,
  },
  navRowDesktop: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  brandMeta: {
    gap: 2,
  },
  brandName: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
  },
  brandHint: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  searchShell: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  searchShellDesktop: {
    flex: 1,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 14,
    padding: 0,
  },
  navActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  settingsCard: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
    width: 220,
  },
  settingsTitle: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 15,
  },
  settingsLabel: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
    marginTop: 10,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  languageChip: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  languageChipActive: {
    backgroundColor: colors.sun,
    borderColor: colors.sun,
  },
  languageChipText: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
  },
  languageChipTextActive: {
    color: colors.textOnLight,
  },
  settingsHint: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
  },
  searchResults: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    overflow: 'hidden',
  },
  searchResultRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchResultLast: {
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
    fontSize: 12,
  },
  searchResultPrice: {
    color: colors.sun,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
  },
  emptySearchText: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    padding: 14,
  },
  heroBody: {
    gap: 16,
    marginTop: 14,
  },
  heroBodyDesktop: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  heroMain: {
    flex: 1,
  },
  filterRow: {
    gap: 10,
  },
  filterChip: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterChipText: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 13,
  },
  filterChipTextActive: {
    color: colors.textOnLight,
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 174,
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
  signalCard: {
    backgroundColor: '#F5E7C6',
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    minHeight: 126,
    padding: 18,
    width: 250,
  },
  signalLabel: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
  },
  signalPrice: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 34,
    marginTop: 10,
  },
  signalCaption: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
});
