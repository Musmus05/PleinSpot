import { ComponentType, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, fonts, radius, shadows } from '../theme';
import type { IconProps } from './icons';

type IconComponent = ComponentType<IconProps>;

export function IconButton({
  icon: Icon,
  label,
  onPress,
  size = 40,
  style,
  tone = 'default',
}: {
  icon: IconComponent;
  label: string;
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'floating' | 'ghost';
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.iconButton,
        { borderRadius: size / 2.8, height: size, width: size },
        tone === 'floating' && [styles.iconButtonFloating, shadows.floating],
        tone === 'ghost' && styles.iconButtonGhost,
        hovered && styles.iconButtonHovered,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon color={colors.inkSoft} size={Math.round(size * 0.45)} />
    </Pressable>
  );
}

export function Button({
  icon: Icon,
  label,
  loading = false,
  onPress,
  style,
  variant = 'primary',
}: {
  icon?: IconComponent;
  label: string;
  loading?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'primary' | 'secondary' | 'dark';
}) {
  const foreground = variant === 'secondary' ? colors.text : colors.white;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'dark' && styles.buttonDark,
        variant === 'secondary' && styles.buttonSecondary,
        hovered && (variant === 'secondary' ? styles.buttonSecondaryHovered : styles.buttonSolidHovered),
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : Icon ? (
        <Icon color={foreground} size={18} strokeWidth={2.2} />
      ) : null}
      <Text style={[styles.buttonLabel, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  children,
  icon: Icon,
  tone = 'neutral',
}: {
  children: ReactNode;
  icon?: IconComponent;
  tone?: 'brand' | 'neutral' | 'warning' | 'danger';
}) {
  const palette = CHIP_TONES[tone];

  return (
    <View style={[styles.chip, { backgroundColor: palette.background }]}>
      {Icon ? <Icon color={palette.foreground} size={13} strokeWidth={2.4} /> : null}
      <Text numberOfLines={1} style={[styles.chipText, { color: palette.foreground }]}>
        {children}
      </Text>
    </View>
  );
}

const CHIP_TONES = {
  brand: { background: colors.brandSoft, foreground: colors.brandStrong },
  danger: { background: colors.dangerSoft, foreground: colors.danger },
  neutral: { background: colors.surfaceSunken, foreground: colors.textMuted },
  warning: { background: colors.warningSoft, foreground: colors.warning },
};

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {children}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 18,
  },
  buttonDark: {
    backgroundColor: colors.ink,
  },
  buttonLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  buttonPrimary: {
    backgroundColor: colors.brand,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },
  buttonSecondaryHovered: {
    backgroundColor: colors.surfaceMuted,
  },
  buttonSolidHovered: {
    opacity: 0.92,
  },
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: 'center',
  },
  iconButtonFloating: {
    borderColor: 'transparent',
  },
  iconButtonGhost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  iconButtonHovered: {
    backgroundColor: colors.surfaceMuted,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
});
