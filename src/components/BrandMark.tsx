import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors, fonts } from '../theme';

// Keep in sync with assets/pleinspot-logo.svg.
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <Svg aria-hidden height={size} viewBox="0 0 64 64" width={size}>
      <Defs>
        <LinearGradient gradientUnits="userSpaceOnUse" id="ps-bg" x1="6" x2="58" y1="2" y2="62">
          <Stop offset="0" stopColor={colors.brandBright} />
          <Stop offset="1" stopColor={colors.brandStrong} />
        </LinearGradient>
      </Defs>
      <Rect fill="url(#ps-bg)" height="64" rx="16" width="64" />
      <Path d="M32 54C26 47 17 37 17 25a15 15 0 0 1 30 0c0 12-9 22-15 29Z" fill={colors.white} />
      <Path d="M32 15c-2 3-6.5 8.5-6.5 13.5a6.5 6.5 0 0 0 13 0C38.5 23.5 34 18 32 15Z" fill={colors.brand} />
    </Svg>
  );
}

export function Wordmark({ size = 22, tagline }: { size?: number; tagline?: string }) {
  return (
    <View accessibilityLabel="PleinSpot" accessibilityRole="header" style={styles.row}>
      <BrandMark size={Math.round(size * 1.55)} />
      <View>
        <Text style={[styles.word, { fontSize: size, lineHeight: size * 1.15 }]}>
          Plein<Text style={styles.accent}>Spot</Text>
        </Text>
        {tagline ? <Text style={styles.tagline}>{tagline}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  accent: {
    color: colors.brand,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  tagline: {
    color: colors.textSubtle,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 1,
  },
  word: {
    color: colors.ink,
    fontFamily: fonts.bold,
    letterSpacing: -0.6,
  },
});
