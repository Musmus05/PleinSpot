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
          selected && styles.bubbleSelected,
          {
            backgroundColor: selected ? tone : colors.panel,
            borderColor: selected ? tone : colors.border,
          },
        ]}
      >
        <Text style={[styles.price, selected && styles.priceSelected]}>{priceLabel}</Text>
        <Text style={[styles.fuel, selected && styles.fuelSelected]}>{fuelLabel}</Text>
      </View>
      <View style={[styles.tail, { backgroundColor: tone }]} />
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
    minWidth: 78,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleSelected: {
    transform: [{ scale: 1.05 }],
  },
  price: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  priceSelected: {
    color: colors.night,
  },
  fuel: {
    color: colors.subtleText,
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
  fuelSelected: {
    color: colors.night,
  },
  tail: {
    borderRadius: 999,
    height: 10,
    marginTop: 6,
    width: 10,
  },
});
