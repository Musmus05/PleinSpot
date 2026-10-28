import { StyleSheet, Text, View } from 'react-native';

import type { AppLanguage } from '../lib/copy';
import { splitPrice } from '../lib/format';
import { colors, fonts } from '../theme';

type PumpPriceProps = {
  color?: string;
  language: AppLanguage;
  size?: number;
  value: number;
};

/** "2,39⁸ €" — the last digit is smaller, as on French pump totems. */
export function PumpPrice({ color = colors.text, language, size = 20, value }: PumpPriceProps) {
  const { head, tail } = splitPrice(value, language);
  const tailSize = Math.round(size * 0.62);

  return (
    <View accessibilityLabel={`${head}${tail} €`} style={styles.row}>
      <Text style={[styles.head, { color, fontSize: size, lineHeight: size * 1.1 }]}>{head}</Text>
      <Text style={[styles.tail, { color, fontSize: tailSize, lineHeight: tailSize * 1.1, marginTop: size * 0.04 }]}>
        {tail}
      </Text>
      <Text style={[styles.unit, { color, fontSize: tailSize, lineHeight: size * 1.1 }]}> €</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    fontFamily: fonts.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  tail: {
    fontFamily: fonts.bold,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: fonts.semibold,
    opacity: 0.8,
  },
});
