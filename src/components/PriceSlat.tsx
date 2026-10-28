import { StyleSheet, Text, View } from 'react-native';

import { AppLanguage, copy } from '../lib/copy';
import { formatCents, splitPrice } from '../lib/format';
import type { PriceChange, PriceTier } from '../lib/pricing';
import { colors, fonts, radius, tierColors } from '../theme';
import { TrendingDown, TrendingUp } from './icons';

type PriceSlatProps = {
  /** Double inner rule: the lowest price of the area. */
  best?: boolean;
  language: AppLanguage;
  size?: 'sm' | 'md' | 'lg';
  tier: PriceTier;
  value: number;
  /** `neutral` = another fuel than the selected one, `stale` = price older than 7 days. */
  variant?: 'tier' | 'neutral' | 'stale';
};

const SIZES = {
  lg: { font: 44, minWidth: 128, paddingH: 12, paddingV: 4 },
  md: { font: 23, minWidth: 70, paddingH: 8, paddingV: 3 },
  sm: { font: 19, minWidth: 60, paddingH: 7, paddingV: 2 },
};

/** A price set like a slat of a station's price totem: the thousandth digit smaller and raised. */
export function PriceSlat({ best = false, language, size = 'md', tier, value, variant = 'tier' }: PriceSlatProps) {
  const { head, tail } = splitPrice(value, language);
  const metrics = SIZES[size];
  const palette = tierColors[tier];
  const background = variant === 'neutral' ? colors.black : variant === 'stale' ? colors.white : palette.fill;
  const ink = variant === 'neutral' ? colors.white : variant === 'stale' ? palette.text : palette.ink;
  const tailSize = Math.round(metrics.font * 0.6);

  return (
    <View
      accessibilityLabel={`${head}${tail} €`}
      style={[
        styles.slat,
        {
          backgroundColor: background,
          minWidth: metrics.minWidth,
          paddingHorizontal: metrics.paddingH,
          paddingVertical: metrics.paddingV,
        },
        variant === 'stale' && { borderColor: palette.fill, borderWidth: 1.5 },
      ]}
    >
      {best && variant !== 'stale' ? <View pointerEvents="none" style={[styles.innerRule, { borderColor: ink }]} /> : null}
      <Text style={[styles.head, { color: ink, fontSize: metrics.font, lineHeight: metrics.font * 1.08 }]}>{head}</Text>
      <Text style={[styles.tail, { color: ink, fontSize: tailSize, lineHeight: tailSize * 1.1, marginTop: metrics.font * 0.06 }]}>
        {tail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    fontFamily: fonts.condensedBold,
    fontVariant: ['tabular-nums'],
  },
  innerRule: {
    borderRadius: 1.5,
    borderWidth: 1.5,
    bottom: 2,
    left: 2,
    position: 'absolute',
    right: 2,
    top: 2,
  },
  slat: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    borderRadius: radius.slat,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tail: {
    fontFamily: fonts.condensedBold,
    fontVariant: ['tabular-nums'],
    marginLeft: 1,
  },
});

/** "↓ 1,2 ct": how a price that just changed moved. */
export function PriceChangeTag({ change, language }: { change: PriceChange; language: AppLanguage }) {
  const isDown = change.to < change.from;
  const color = isDown ? colors.green : colors.red;
  const Icon = isDown ? TrendingDown : TrendingUp;
  const cents = formatCents(change.to - change.from, language);
  const t = copy[language].live;

  return (
    <View accessibilityLabel={isDown ? t.down(cents) : t.up(cents)} style={changeStyles.row}>
      <Icon color={color} size={14} strokeWidth={2.4} />
      <Text style={[changeStyles.text, { color }]}>{cents}</Text>
    </View>
  );
}

const changeStyles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  text: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
