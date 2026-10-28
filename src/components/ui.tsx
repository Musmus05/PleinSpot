import { ComponentType, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, fonts, motion, radius, shadows, type } from '../theme';
import type { IconProps } from './icons';

type IconComponent = ComponentType<IconProps>;

const transition = {
  transitionDuration: motion.duration,
  transitionProperty: 'background-color, border-color, color',
  transitionTimingFunction: motion.easing,
} as never;

export function IconButton({
  icon: Icon,
  label,
  onPress,
  size = 40,
  style,
  tone = 'plain',
}: {
  icon: IconComponent;
  label: string;
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** `plain` on the panel, `band` on the blue sign band, `floating` over the map. */
  tone?: 'plain' | 'band' | 'floating';
}) {
  const iconColor = tone === 'band' ? colors.white : colors.black;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.iconButton,
        transition,
        { height: size, width: size },
        tone === 'plain' && styles.iconButtonPlain,
        tone === 'band' && styles.iconButtonBand,
        tone === 'floating' && [styles.iconButtonFloating, shadows.floating],
        hovered && (tone === 'band' ? styles.iconButtonBandHovered : styles.iconButtonHovered),
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon color={iconColor} size={Math.round(size * 0.48)} strokeWidth={2} />
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
  variant?: 'primary' | 'secondary';
}) {
  const foreground = variant === 'primary' ? colors.white : colors.black;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.button,
        transition,
        variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary,
        hovered && (variant === 'primary' ? styles.buttonPrimaryHovered : styles.buttonSecondaryHovered),
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
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  buttonLabel: {
    fontFamily: fonts.semibold,
    fontSize: type.body,
  },
  buttonPrimary: {
    backgroundColor: colors.blue,
  },
  buttonPrimaryHovered: {
    backgroundColor: colors.blueDeep,
  },
  buttonSecondary: {
    backgroundColor: colors.white,
    borderColor: colors.ruleStrong,
    borderWidth: 1,
  },
  buttonSecondaryHovered: {
    backgroundColor: colors.ground,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.control,
    justifyContent: 'center',
  },
  iconButtonBand: {
    borderColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
  },
  iconButtonBandHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  iconButtonFloating: {
    backgroundColor: colors.white,
  },
  iconButtonHovered: {
    backgroundColor: colors.ground,
  },
  iconButtonPlain: {
    backgroundColor: colors.white,
    borderColor: colors.rule,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  sectionTitle: {
    color: colors.black,
    fontFamily: fonts.semibold,
    fontSize: type.heading,
  },
  sectionTitleRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});
