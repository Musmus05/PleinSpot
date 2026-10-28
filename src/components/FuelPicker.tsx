import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppLanguage, copy } from '../lib/copy';
import { formatPrice } from '../lib/format';
import { FUEL_OPTIONS, FuelKey } from '../lib/fuels';
import type { StationsResponse } from '../types/station';
import { colors, fonts, radius, shadows } from '../theme';

type FuelPickerProps = {
  fuel: FuelKey;
  language: AppLanguage;
  layout: 'grid' | 'scroll';
  onChange: (fuel: FuelKey) => void;
  overview: StationsResponse['overview'] | null;
};

export function FuelPicker({ fuel, language, layout, onChange, overview }: FuelPickerProps) {
  const t = copy[language].fuel;
  const chips = FUEL_OPTIONS.map((option) => {
    const isActive = option.key === fuel;
    const summary = overview?.[option.key] ?? null;

    return (
      <Pressable
        accessibilityHint={option.description[language]}
        accessibilityLabel={option.label[language]}
        accessibilityRole="radio"
        accessibilityState={{ checked: isActive }}
        key={option.key}
        onPress={() => onChange(option.key)}
        style={({ hovered }) => [
          styles.chip,
          layout === 'grid' ? styles.chipGrid : [styles.chipScroll, shadows.card],
          hovered && !isActive && styles.chipHovered,
          isActive && styles.chipActive,
        ]}
      >
        <Text style={[styles.label, isActive && styles.labelActive]}>{option.label[language]}</Text>
        <Text numberOfLines={1} style={[styles.meta, isActive && styles.metaActive]}>
          {overview == null ? ' ' : summary ? `${t.from} ${formatPrice(summary.min, language)}` : t.none}
        </Text>
      </Pressable>
    );
  });

  if (layout === 'scroll') {
    return (
      <ScrollView
        accessibilityLabel={t.label}
        accessibilityRole="radiogroup"
        contentContainerStyle={styles.scrollContent}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {chips}
      </ScrollView>
    );
  }

  return (
    <View accessibilityLabel={t.label} accessibilityRole="radiogroup" style={styles.grid}>
      {chips}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipGrid: {
    flexBasis: '30%',
    flexGrow: 1,
  },
  chipHovered: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
  },
  chipScroll: {
    borderColor: 'transparent',
    minWidth: 86,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  label: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  labelActive: {
    color: colors.white,
  },
  meta: {
    color: colors.textSubtle,
    fontFamily: fonts.regular,
    fontSize: 11.5,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  metaActive: {
    color: 'rgba(255, 255, 255, 0.72)',
  },
  scrollContent: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
