import { StyleSheet, Text, View } from 'react-native';

import { AppLanguage, copy } from '../lib/copy';
import { formatPriceValue } from '../lib/format';
import { getPriceTier } from '../lib/pricing';
import type { PriceDistribution, PriceStats } from '../types/station';
import { colors, fonts, tierColors, type } from '../theme';

type PriceStripProps = {
  distribution: PriceDistribution;
  language: AppLanguage;
  /** Price to pin on the strip, e.g. the selected station. */
  marker?: number | null;
  stats: PriceStats;
};

const STRIP_HEIGHT = 34;

/** Histogram of the area's prices, coloured with the same thirds as the map. */
export function PriceStrip({ distribution, language, marker, stats }: PriceStripProps) {
  const t = copy[language].zone;
  const { bins, max, min } = distribution;
  const tallest = Math.max(...bins, 1);
  const span = max - min;
  const binWidth = span / bins.length;
  const markerRatio = marker == null || span < 0.001 ? null : Math.min(1, Math.max(0, (marker - min) / span));

  return (
    <View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.strip}>
        {bins.map((count, index) => {
          // A bin takes the tier of its lowest price, so the bin holding the minimum is always "cheap".
          const tier = getPriceTier(min + binWidth * index, stats);

          return (
            <View key={index} style={styles.column}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: count === 0 ? colors.rule : tierColors[tier].fill,
                    // Square-root scale: one crowded price (a capped 1,990 €) must not flatten the rest.
                    height: count === 0 ? 2 : Math.max(4, Math.sqrt(count / tallest) * STRIP_HEIGHT),
                  },
                ]}
              />
            </View>
          );
        })}
        {markerRatio != null ? <View style={[styles.marker, { left: `${markerRatio * 100}%` }]} /> : null}
      </View>
      <View style={styles.scale}>
        <ScaleLabel align="left" label={t.lowest} value={formatPriceValue(min, language)} />
        <ScaleLabel align="center" label={t.median} value={formatPriceValue(stats.median, language)} />
        <ScaleLabel align="right" label={t.highest} value={formatPriceValue(max, language)} />
      </View>
    </View>
  );
}

function ScaleLabel({ align, label, value }: { align: 'left' | 'center' | 'right'; label: string; value: string }) {
  const alignItems = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  return (
    <View style={[styles.scaleItem, { alignItems }]}>
      <Text style={styles.scaleValue}>{value}</Text>
      <Text style={styles.scaleLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopLeftRadius: 1.5,
    borderTopRightRadius: 1.5,
    width: '100%',
  },
  column: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  marker: {
    backgroundColor: colors.black,
    bottom: -4,
    marginLeft: -1,
    position: 'absolute',
    top: -4,
    width: 2,
  },
  scale: {
    flexDirection: 'row',
    marginTop: 6,
  },
  scaleItem: {
    flex: 1,
  },
  scaleLabel: {
    color: colors.greyLight,
    fontFamily: fonts.regular,
    fontSize: type.meta,
  },
  scaleValue: {
    color: colors.black,
    fontFamily: fonts.condensedBold,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
  },
  strip: {
    alignItems: 'flex-end',
    borderBottomColor: colors.ruleStrong,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 2,
    height: STRIP_HEIGHT + 1,
    position: 'relative',
  },
});
