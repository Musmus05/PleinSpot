import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppLanguage, copy } from '../lib/copy';
import { formatPriceValue } from '../lib/format';
import { FUEL_OPTIONS, FuelKey } from '../lib/fuels';
import type { StationsResponse } from '../types/station';
import { colors, fonts, motion, radius, type } from '../theme';
import { FuelBadge } from './FuelBadge';

type FuelPickerProps = {
  fuel: FuelKey;
  language: AppLanguage;
  layout: 'row' | 'scroll';
  onChange: (fuel: FuelKey) => void;
  overview: StationsResponse['overview'] | null;
};

export function FuelPicker({ fuel, language, layout, onChange, overview }: FuelPickerProps) {
  const t = copy[language].fuel;
  const items = FUEL_OPTIONS.map((option) => {
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
          styles.item,
          layout === 'row' ? styles.itemRow : styles.itemScroll,
          hovered && !isActive && styles.itemHovered,
          isActive && styles.itemActive,
        ]}
      >
        <FuelBadge active={isActive} fuel={option.key} size={36} />
        <Text numberOfLines={1} style={[styles.label, isActive && styles.labelActive]}>
          {option.label[language]}
        </Text>
        <Text numberOfLines={1} style={styles.meta}>
          {overview == null ? ' ' : summary ? t.from(formatPriceValue(summary.min, language)) : t.none}
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
        {items}
      </ScrollView>
    );
  }

  return (
    <View accessibilityLabel={t.label} accessibilityRole="radiogroup" style={styles.row}>
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: radius.control,
    borderWidth: 1,
    gap: 3,
    paddingBottom: 6,
    paddingTop: 8,
    transitionDuration: motion.duration,
    transitionProperty: 'background-color, border-color',
  } as never,
  itemActive: {
    backgroundColor: colors.blueTint,
    borderColor: colors.blue,
  },
  itemHovered: {
    backgroundColor: colors.ground,
  },
  itemRow: {
    flex: 1,
    minWidth: 0,
  },
  itemScroll: {
    minWidth: 74,
    paddingHorizontal: 6,
  },
  label: {
    color: colors.black,
    fontFamily: fonts.semibold,
    fontSize: type.small,
    marginTop: 2,
  },
  labelActive: {
    color: colors.blue,
  },
  meta: {
    color: colors.greyLight,
    fontFamily: fonts.regular,
    fontSize: type.meta,
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    gap: 2,
  },
  scrollContent: {
    gap: 2,
    paddingHorizontal: 8,
  },
});
