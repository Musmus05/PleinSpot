import { PriceTier } from './lib/pricing';

export const colors = {
  background: '#F2F4F7',
  border: '#EAECF0',
  borderStrong: '#D0D5DD',
  brand: '#059669',
  brandBright: '#14C98E',
  brandSoft: '#ECFDF3',
  brandStrong: '#047857',
  danger: '#D92D20',
  dangerSoft: '#FEF3F2',
  ink: '#0B1220',
  inkSoft: '#1D2939',
  overlay: 'rgba(11, 18, 32, 0.48)',
  star: '#FACC15',
  surface: '#FFFFFF',
  surfaceMuted: '#F9FAFB',
  surfaceSunken: '#F2F4F7',
  text: '#101828',
  textMuted: '#475467',
  textSubtle: '#667085',
  user: '#2563EB',
  warning: '#B54708',
  warningSoft: '#FFFAEB',
  white: '#FFFFFF',
};

export const tierColors: Record<PriceTier, { soft: string; solid: string; text: string }> = {
  cheap: { soft: '#ECFDF3', solid: '#047857', text: '#05603A' },
  high: { soft: '#FEF3F2', solid: '#D92D20', text: '#B42318' },
  mid: { soft: '#FFFAEB', solid: '#B45309', text: '#93370D' },
  unknown: { soft: '#F2F4F7', solid: '#475467', text: '#344054' },
};

export const fonts = {
  bold: 'PlusJakartaSans_800ExtraBold',
  regular: 'PlusJakartaSans_400Regular',
  semibold: 'PlusJakartaSans_600SemiBold',
};

export const radius = {
  lg: 16,
  md: 12,
  pill: 999,
  sm: 8,
  xl: 22,
};

export const shadows = {
  card: { boxShadow: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.08)' },
  floating: { boxShadow: '0 12px 32px -8px rgba(16, 24, 40, 0.22), 0 4px 8px -4px rgba(16, 24, 40, 0.08)' },
  panel: { boxShadow: '0 0 0 1px rgba(16, 24, 40, 0.04), 0 8px 24px -6px rgba(16, 24, 40, 0.14)' },
};

export const breakpoints = {
  desktop: 900,
  wide: 1280,
};
