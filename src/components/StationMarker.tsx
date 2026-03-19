import { StyleSheet, Text, View } from 'react-native';

import { colors, shadows } from '../theme';

type StationMarkerProps = {
  fuelLabel: string;
  priceLabel: string;
  selected: boolean;
  tone: string;
};

export function StationMarker({ fuelLabel, priceLabel, selected, tone }: StationMarkerProps) {
  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.bubble,
          shadows.card,
          {
            backgroundColor: selected ? tone : colors.white,
            borderColor: selected ? tone : colors.border,
          },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: tone }]} />
        <View>
          <Text style={[styles.price, selected && styles.priceSelected]}>{priceLabel}</Text>
          <Text style={[styles.fuel, selected && styles.fuelSelected]}>{fuelLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  bubble: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  price: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  priceSelected: {
    color: colors.textOnLight,
  },
  fuel: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  fuelSelected: {
    color: colors.textOnLight,
  },
});
