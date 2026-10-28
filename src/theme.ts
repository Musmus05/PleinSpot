import type { PriceTier } from './lib/pricing';

// See DESIGN.md: French road-signage world, RAL traffic colours adjusted for screens.
export const colors = {
  black: '#16181B',
  blue: '#0A4A8F',
  blueDeep: '#073A72',
  blueTint: '#E7EEF7',
  green: '#008351',
  grey: '#4E5452',
  greyLight: '#6B716F',
  ground: '#F4F5F4',
  overlay: 'rgba(22, 24, 27, 0.5)',
  red: '#CC0605',
  rule: '#D9DCDB',
  ruleStrong: '#B9BEBC',
  white: '#FFFFFF',
  yellow: '#F7B500',
  yellowText: '#7A5600',
};

export const tierColors: Record<PriceTier, { fill: string; ink: string; text: string }> = {
  cheap: { fill: colors.green, ink: colors.white, text: colors.green },
  high: { fill: colors.red, ink: colors.white, text: colors.red },
  mid: { fill: colors.yellow, ink: colors.black, text: colors.yellowText },
  unknown: { fill: colors.grey, ink: colors.white, text: colors.grey },
};

export const fonts = {
  condensed: 'BarlowCondensed_600SemiBold',
  condensedBold: 'BarlowCondensed_700Bold',
  medium: 'Barlow_500Medium',
  regular: 'Barlow_400Regular',
  semibold: 'Barlow_600SemiBold',
};

export const type = {
  meta: 13,
  small: 14,
  body: 16,
  heading: 19,
  title: 23,
  price: 28,
  hero: 44,
};

export const radius = {
  slat: 3,
  control: 6,
  sheet: 10,
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Floating surfaces over the map carry a shadow and no border; surfaces on the panel use rules.
export const shadows = {
  floating: { boxShadow: '0 2px 6px rgba(22, 24, 27, 0.14), 0 10px 28px rgba(22, 24, 27, 0.14)' },
};

export const motion = {
  duration: '180ms',
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
};

export const breakpoints = {
  desktop: 900,
  wide: 1280,
};
