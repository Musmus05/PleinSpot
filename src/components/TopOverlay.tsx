import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Clock3, LocateFixed, MapPinned, MapPin, Menu, RefreshCcw, Search, Settings2, X } from 'lucide-react-native';
import { useState } from 'react';

import { Station } from '../lib/carburantsApi';
import { CitySearchResult } from '../lib/citySearch';
import { AppLanguage, copy } from '../lib/copy';
import { formatTimestamp } from '../lib/format';
import { FuelFilterOptionKey, FuelSelection, FUEL_FILTER_OPTIONS, isFuelOptionActive } from '../lib/fuels';
import { SearchResultItem } from '../lib/searchTypes';
import { DisplayPrice } from '../lib/stationDisplay';
import { colors, shadows } from '../theme';
import { BrandMark } from './BrandMark';

type TopOverlayProps = {
  activeFuel: FuelSelection;
  getStationDisplayPrice: (station: Station) => DisplayPrice | null;
  isRefreshing: boolean;
  language: AppLanguage;
  lastSyncAt: string | null;
  onCenterUser: () => void;
  onChangeFuel: (fuel: FuelFilterOptionKey) => void;
  onChangeLanguage: (language: AppLanguage) => void;
  onChangeSearch: (value: string) => void;
  onFocusCity: (city: CitySearchResult) => void;
  onFocusStation: (station: Station) => void;
  onRefresh: () => void;
  searchResults: SearchResultItem[];
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
  onFocusCity,
  onFocusStation,
  onRefresh,
  searchResults,
  searchText,
  stationsCount,
}: TopOverlayProps) {
  const { width } = useWindowDimensions();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isDesktop = width >= 1080;
  const isTablet = width < 900;
  const isPhone = width < 560;
  const t = copy[language];
  const normalizedSearchText = searchText.trim();
  const searchPlaceholder = isPhone
    ? language === 'fr'
      ? 'Rechercher une station ou une ville'
      : 'Search a station'
    : t.topOverlay.searchPlaceholder;
  const showMobileMenu = !isPhone || isMobileMenuOpen;
  const showFilters = !isPhone || isMobileMenuOpen;
  const showInfo = !isPhone || isMobileMenuOpen;
  const showSearchResults = normalizedSearchText.length >= 2 && (!isPhone || showMobileMenu);

  function toggleMobileMenu() {
    setIsMobileMenuOpen((currentValue) => {
      const nextValue = !currentValue;

      if (!nextValue) {
        setIsSettingsOpen(false);
      }

      return nextValue;
    });
  }

  return (
    <View style={[styles.topPanel, isPhone && styles.topPanelPhone]}>
      <View style={[styles.heroCard, shadows.floating, isPhone && styles.heroCardPhone]}>
        <View style={[styles.navRow, isDesktop && styles.navRowDesktop, isPhone && styles.navRowPhone]}>
          {!isPhone ? (
            <View style={styles.brandRow}>
              <BrandMark size={38} />
              <Text style={styles.brandName}>PleinSpot</Text>
            </View>
          ) : null}

          {isPhone ? (
            <>
              <View style={[styles.searchShell, styles.searchShellDesktop, styles.searchShellPhone]}>
                <Search color={colors.subtleText} size={16} />
                <TextInput
                  autoCorrect={false}
                  onChangeText={onChangeSearch}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.subtleText}
                  selectionColor={colors.sun}
                  style={styles.searchInput}
                  value={searchText}
                />
              </View>

              <Pressable onPress={toggleMobileMenu} style={styles.iconButton}>
                {isMobileMenuOpen ? (
                  <X color={colors.subtleTextStrong} size={18} />
                ) : (
                  <Menu color={colors.subtleTextStrong} size={18} />
                )}
              </Pressable>
            </>
          ) : (
            <>
              <View style={[styles.searchShell, isDesktop && styles.searchShellDesktop]}>
                <Search color={colors.subtleText} size={16} />
                <TextInput
                  autoCorrect={false}
                  onChangeText={onChangeSearch}
                  placeholder={searchPlaceholder}
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
            </>
          )}
        </View>

        {isPhone && isMobileMenuOpen ? (
          <View style={styles.mobileMenuContent}>
            <View style={[styles.navActions, styles.navActionsPhone, styles.mobileMenuActions]}>
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
        ) : null}

        {isSettingsOpen && showMobileMenu ? (
          <View style={[styles.settingsCard, shadows.card, isPhone && styles.settingsCardPhone]}>
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

        {showSearchResults ? (
          <View style={[styles.searchResults, shadows.card]}>
            {searchResults.length > 0 ? (
              searchResults.map((result, index) => {
                if (result.kind === 'city') {
                  return (
                    <Pressable
                      key={result.city.id}
                      onPress={() => onFocusCity(result.city)}
                      style={[styles.searchResultRow, index === searchResults.length - 1 && styles.searchResultLast]}
                    >
                      <View style={styles.searchResultCopy}>
                        <Text style={styles.searchResultTitle}>{result.city.label}</Text>
                        <Text style={styles.searchResultSubtitle}>{result.city.subtitle || t.topOverlay.cityResult}</Text>
                      </View>
                      <View style={styles.searchResultTag}>
                        <MapPin color={colors.aqua} size={14} />
                        <Text style={styles.searchResultTagText}>{t.topOverlay.cityResult}</Text>
                      </View>
                    </Pressable>
                  );
                }

                const displayPrice = getStationDisplayPrice(result.station);

                return (
                  <Pressable
                    key={result.station.id}
                    onPress={() => onFocusStation(result.station)}
                    style={[styles.searchResultRow, index === searchResults.length - 1 && styles.searchResultLast]}
                  >
                    <View style={styles.searchResultCopy}>
                      <Text style={styles.searchResultTitle}>
                        {result.station.city} {result.station.postcode}
                      </Text>
                      <Text style={styles.searchResultSubtitle}>{result.station.address}</Text>
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

        {showMobileMenu && (showFilters || showInfo) ? (
          <View style={styles.heroBody}>
            <View style={styles.heroMain}>
              {showFilters ? (
                <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
                  {FUEL_FILTER_OPTIONS.map((option) => {
                    const isActive = isFuelOptionActive(activeFuel, option.key);

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
              ) : null}

              {showInfo ? (
                <View style={styles.heroStats}>
                  <View style={[styles.statCard, isTablet && styles.statCardResponsive, isPhone && styles.statCardPhone]}>
                    <MapPinned color={colors.aqua} size={15} />
                    <View>
                      <Text style={styles.statLabel}>{t.topOverlay.stations}</Text>
                      <Text style={styles.statValue}>
                        {stationsCount} {t.topOverlay.visible}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statCard, isTablet && styles.statCardResponsive, isPhone && styles.statCardPhone]}>
                    <Clock3 color={colors.sun} size={15} />
                    <View>
                      <Text style={styles.statLabel}>{t.topOverlay.syncLabel}</Text>
                      <Text style={styles.statValue}>
                        {lastSyncAt ? formatTimestamp(lastSyncAt) : t.topOverlay.syncing}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
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
  topPanelPhone: {
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  heroCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1,
    padding: 16,
  },
  heroCardPhone: {
    borderRadius: 22,
    padding: 12,
  },
  navRow: {
    gap: 14,
  },
  navRowDesktop: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  navRowPhone: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  brandName: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
  },
  searchShellPhone: {
    flex: 1,
    minWidth: 0,
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
  navActionsPhone: {
    justifyContent: 'flex-start',
  },
  mobileMenuContent: {
    marginTop: 12,
  },
  mobileMenuActions: {
    gap: 10,
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
  settingsCardPhone: {
    alignSelf: 'stretch',
    width: '100%',
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
  searchResultTag: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchResultTagText: {
    color: colors.aqua,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 11,
  },
  emptySearchText: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
    padding: 14,
  },
  mobileToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  mobileToggleChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mobileToggleText: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
  },
  heroBody: {
    marginTop: 14,
  },
  heroMain: {
    width: '100%',
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
  statCardResponsive: {
    flex: 1,
    minWidth: 0,
  },
  statCardPhone: {
    width: '100%',
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
});
