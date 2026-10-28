import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors, fonts } from '../theme';

// The "station-service" road sign, whose pump screen is a green price slat.
// Keep in sync with assets/pleinspot-logo.svg.
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <Svg aria-hidden fill="none" height={size} viewBox="0 0 64 64" width={size}>
      <Rect fill={colors.blue} height="64" rx="10" width="64" />
      <Rect height="55" rx="6.5" stroke={colors.white} strokeWidth="3" width="55" x="4.5" y="4.5" />
      <Path d="M17 49V18.5A3.5 3.5 0 0 1 20.5 15h13A3.5 3.5 0 0 1 37 18.5V49Z" fill={colors.white} />
      <Rect fill={colors.white} height="4.5" rx="1.5" width="26" x="14" y="46" />
      <Rect fill={colors.green} height="8.5" rx="1.5" width="13" x="20.5" y="19.5" />
      <Path
        d="M37 27h3.5a3 3 0 0 1 3 3v9.5a2.75 2.75 0 0 0 5.5 0V25.5l-4.5-5"
        stroke={colors.white}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.2"
      />
    </Svg>
  );
}

/** White wordmark set on the blue sign band. */
export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <View accessibilityLabel="PleinSpot" accessibilityRole="header" style={styles.row}>
      <BrandMark size={Math.round(size * 1.35)} />
      <Text style={[styles.word, { fontSize: size, lineHeight: size * 1.05 }]}>PleinSpot</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  word: {
    color: colors.white,
    fontFamily: fonts.condensedBold,
    letterSpacing: 0.2,
  },
});
