import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Clock3, MapPin, Navigation, ShieldCheck, X } from 'lucide-react-native';

import { Station } from '../lib/carburantsApi';
import { formatDistanceLabel, formatPrice, formatTimestamp, getDistanceInKm } from '../lib/format';
import { FuelFilter, FUEL_OPTIONS } from '../lib/fuels';
import { getDisplayPrice } from '../lib/stationDisplay';
import { colors, shadows } from '../theme';

type StationSheetProps = {
  activeFuel: FuelFilter;
  onClose: () => void;
  onOpenDirections: () => void;
  station: Station;
  userLocation: { latitude: number; longitude: number } | null;
};

export function StationSheet({
  activeFuel,
  onClose,
  onOpenDirections,
  station,
  userLocation,
}: StationSheetProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1080;
  const spotlightPrice = getDisplayPrice(station, activeFuel);
  const spotlightFuelLabel = spotlightPrice
    ? FUEL_OPTIONS.find((fuel) => fuel.key === spotlightPrice.fuelKey)?.label ?? spotlightPrice.fuelKey.toUpperCase()
    : 'Pas de prix pour ce filtre';
  const distance = userLocation
    ? formatDistanceLabel(getDistanceInKm(userLocation, station.coordinates))
    : null;

  return (
    <View style={[styles.stationSheet, shadows.floating, isDesktop && styles.stationSheetDesktop]}>
      <LinearGradient
        colors={['rgba(255, 184, 108, 0.12)', 'rgba(130, 216, 255, 0.10)', 'rgba(8, 22, 32, 0)']}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={styles.sheetGlow}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.sheetHandle} />

        <View style={styles.sheetHeader}>
          <View style={styles.sheetHeaderText}>
            <Text style={styles.sheetTitle}>
              {station.city} {station.postcode}
            </Text>
            <Text style={styles.sheetSubtitle}>{station.address}</Text>
          </View>

          <View style={styles.sheetActions}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X color={colors.text} size={18} />
            </Pressable>
            <Pressable onPress={onOpenDirections} style={styles.navigateButton}>
              <Navigation color={colors.textOnLight} size={18} />
              <Text style={styles.navigateButtonText}>Y aller</Text>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={onClose} style={styles.closeHint}>
          <Text style={styles.closeHintText}>Fermer la fiche</Text>
        </Pressable>

        <LinearGradient
          colors={['rgba(255, 255, 255, 0.07)', 'rgba(255, 255, 255, 0.03)']}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.spotlightCard}
        >
          <View style={styles.spotlightHeader}>
            <Text style={styles.spotlightEyebrow}>Prix mis en avant</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <MapPin color={colors.subtleTextStrong} size={14} />
                <Text style={styles.metaPillText}>{station.department}</Text>
              </View>
              {station.automate24h ? (
                <View style={[styles.metaPill, styles.metaPillAccent]}>
                  <ShieldCheck color={colors.mint} size={14} />
                  <Text style={[styles.metaPillText, styles.metaPillAccentText]}>24/24</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.spotlightBody}>
            <Text style={styles.spotlightPrice}>
              {spotlightPrice ? formatPrice(spotlightPrice.value) : 'Indispo'}
            </Text>
            <Text style={styles.spotlightCaption}>{spotlightFuelLabel}</Text>
          </View>

          <View style={styles.quickFacts}>
            <View style={styles.quickFactCard}>
              <Clock3 color={colors.sun} size={16} />
              <View>
                <Text style={styles.quickFactLabel}>Derniere maj</Text>
                <Text style={styles.quickFactValue}>
                  {spotlightPrice?.updatedAt ? formatTimestamp(spotlightPrice.updatedAt) : 'Inconnue'}
                </Text>
              </View>
            </View>

            {distance ? (
              <View style={styles.quickFactCard}>
                <Navigation color={colors.aqua} size={16} />
                <View>
                  <Text style={styles.quickFactLabel}>Distance</Text>
                  <Text style={styles.quickFactValue}>{distance}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tous les carburants</Text>
          <View style={styles.priceGrid}>
            {FUEL_OPTIONS.map((fuel) => {
              const price = station.prices[fuel.key];
              const highlight =
                (activeFuel !== 'all' && activeFuel === fuel.key) ||
                (activeFuel === 'all' && getDisplayPrice(station, activeFuel)?.fuelKey === fuel.key);

              return (
                <View
                  key={fuel.key}
                  style={[
                    styles.priceCard,
                    highlight && {
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderColor: fuel.accent,
                    },
                  ]}
                >
                  <View style={styles.priceLabelRow}>
                    <Text style={styles.priceFuelLabel}>{fuel.label}</Text>
                    {highlight ? <View style={[styles.priceDot, { backgroundColor: fuel.accent }]} /> : null}
                  </View>
                  <Text style={styles.priceValue}>{price ? formatPrice(price.value) : 'Indispo'}</Text>
                  <Text style={styles.priceMeta}>
                    {price?.updatedAt ? `Maj ${formatTimestamp(price.updatedAt)}` : 'Aucune remontee'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.tagCloud}>
            {station.services.length > 0 ? (
              station.services.map((service) => (
                <View key={service} style={styles.serviceTag}>
                  <Text style={styles.serviceTagText}>{service}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.sectionHint}>Aucun service renseigne.</Text>
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Horaires</Text>
          <Text style={styles.sectionBody}>{station.schedule || 'Horaires non renseignes.'}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Region</Text>
          <Text style={styles.sectionBody}>{station.region}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  stationSheet: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 32,
    borderWidth: 1,
    maxHeight: '68%',
    maxWidth: 720,
    overflow: 'hidden',
    paddingBottom: 8,
    paddingHorizontal: 18,
    paddingTop: 12,
    width: '100%',
  },
  stationSheetDesktop: {
    width: 640,
  },
  sheetGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 5,
    marginBottom: 18,
    width: 72,
  },
  sheetHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
  },
  sheetSubtitle: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  navigateButton: {
    alignItems: 'center',
    backgroundColor: colors.sun,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  navigateButtonText: {
    color: colors.textOnLight,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
  },
  closeHint: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  closeHintText: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
  },
  spotlightCard: {
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1,
    marginBottom: 18,
    overflow: 'hidden',
    padding: 18,
  },
  spotlightHeader: {
    gap: 14,
  },
  spotlightEyebrow: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillAccent: {
    backgroundColor: 'rgba(122, 216, 180, 0.12)',
  },
  metaPillText: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
  },
  metaPillAccentText: {
    color: colors.mint,
  },
  spotlightBody: {
    marginTop: 18,
  },
  spotlightPrice: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 32,
  },
  spotlightCaption: {
    color: colors.sun,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 13,
    marginTop: 6,
  },
  quickFacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  quickFactCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 180,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  quickFactLabel: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
  },
  quickFactValue: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    marginBottom: 18,
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    marginBottom: 12,
  },
  sectionBody: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  sectionHint: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 13,
  },
  priceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  priceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    minWidth: '47%',
    padding: 15,
  },
  priceLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceFuelLabel: {
    color: colors.subtleTextStrong,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
  },
  priceDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  priceValue: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    marginTop: 10,
  },
  priceMeta: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 11,
    marginTop: 8,
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  serviceTagText: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
  },
});
