import { useEffect, useRef } from 'react';
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
  /** `row`: the six fuels side by side (desktop). `scroll`: compact chips in one line that scrolls (mobile). */
  layout: 'row' | 'scroll';
  onChange: (fuel: FuelKey) => void;
  overview: StationsResponse['overview'] | null;
};

export function FuelPicker({ fuel, language, layout, onChange, overview }: FuelPickerProps) {
  const t = copy[language].fuel;
  const isCompact = layout === 'scroll';
  const scrollRef = useRef<ScrollView>(null);
  const itemOffsets = useRef<Partial<Record<FuelKey, number>>>({});

  // On a phone only three or four chips fit: the selected one is scrolled into view, so a
  // remembered LPG or E85 is not hidden past the right edge.
  useEffect(() => {
    const offset = itemOffsets.current[fuel];

    if (isCompact && offset != null) {
      scrollRef.current?.scrollTo({ animated: true, x: Math.max(0, offset - 8), y: 0 });
    }
  }, [fuel, isCompact]);

  const items = FUEL_OPTIONS.map((option) => {
    const isActive = option.key === fuel;
    const summary = overview?.[option.key] ?? null;
    const meta = overview == null ? ' ' : summary ? t.from(formatPriceValue(summary.min, language)) : t.none;

    return (
      <Pressable
        accessibilityHint={option.description[language]}
        accessibilityLabel={option.label[language]}
        accessibilityRole="radio"
        // react-native-web reads aria-checked, not accessibilityState.checked.
        aria-checked={isActive}
        key={option.key}
        onLayout={(event) => {
          itemOffsets.current[option.key] = event.nativeEvent.layout.x;

          if (isCompact && isActive && event.nativeEvent.layout.x > 0) {
            scrollRef.current?.scrollTo({ animated: false, x: Math.max(0, event.nativeEvent.layout.x - 8), y: 0 });
          }
        }}
        onPress={() => onChange(option.key)}
        style={({ hovered }) => [
          styles.item,
          isCompact ? styles.itemCompact : styles.itemRow,
          hovered && !isActive && styles.itemHovered,
          isActive && styles.itemActive,
        ]}
      >
        <FuelBadge active={isActive} fuel={option.key} size={isCompact ? 28 : 36} />
        <View style={isCompact ? styles.copyCompact : styles.copy}>
          <Text numberOfLines={1} style={[styles.label, isCompact && styles.labelCompact, isActive && styles.labelActive]}>
            {option.label[language]}
          </Text>
          <Text numberOfLines={1} style={[styles.meta, isActive && styles.metaActive]}>
            {meta}
          </Text>
        </View>
      </Pressable>
    );
  });

  if (isCompact) {
    return (
      <ScrollView
        accessibilityLabel={t.label}
        accessibilityRole="radiogroup"
        contentContainerStyle={styles.scrollContent}
        horizontal
        ref={scrollRef}
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
  copy: {
    alignItems: 'center',
    gap: 3,
  },
  copyCompact: {
    alignItems: 'flex-start',
  },
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
  // Badge beside the name: half the height of the desktop column, so the map keeps the room.
  itemCompact: {
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingBottom: 4,
    paddingLeft: 8,
    paddingRight: 12,
    paddingTop: 4,
  },
  itemHovered: {
    backgroundColor: colors.ground,
  },
  itemRow: {
    flex: 1,
    minWidth: 0,
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
  labelCompact: {
    marginTop: 0,
  },
  meta: {
    color: colors.greyLight,
    fontFamily: fonts.regular,
    fontSize: type.meta,
    fontVariant: ['tabular-nums'],
  },
  // Grey reads washed out on the blue tint (4.3:1): secondary text takes the surface's own hue.
  metaActive: {
    color: colors.blue,
  },
  row: {
    flexDirection: 'row',
    gap: 2,
  },
  scrollContent: {
    gap: 4,
    paddingHorizontal: 8,
  },
});
