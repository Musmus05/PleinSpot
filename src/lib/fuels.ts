import type { AppLanguage } from './copy';

export type FuelKey = 'gazole' | 'e10' | 'sp95' | 'sp98' | 'e85' | 'gplc';

type FuelOption = {
  description: Record<AppLanguage, string>;
  key: FuelKey;
  label: Record<AppLanguage, string>;
  shortLabel: string;
};

// Same order as on French pump totems: the most common fuels first.
export const FUEL_OPTIONS: FuelOption[] = [
  {
    description: { en: 'Diesel (B7)', fr: 'Diesel (B7)' },
    key: 'gazole',
    label: { en: 'Diesel', fr: 'Gazole' },
    shortLabel: 'Gazole',
  },
  {
    description: { en: 'Unleaded 95, up to 10% ethanol', fr: "Sans plomb 95, jusqu'à 10 % d'éthanol" },
    key: 'e10',
    label: { en: 'SP95-E10', fr: 'SP95-E10' },
    shortLabel: 'E10',
  },
  {
    description: { en: 'Unleaded 95', fr: 'Sans plomb 95' },
    key: 'sp95',
    label: { en: 'SP95', fr: 'SP95' },
    shortLabel: 'SP95',
  },
  {
    description: { en: 'Unleaded 98', fr: 'Sans plomb 98' },
    key: 'sp98',
    label: { en: 'SP98', fr: 'SP98' },
    shortLabel: 'SP98',
  },
  {
    description: { en: 'Bioethanol (flex-fuel engines)', fr: 'Superéthanol (moteurs flexfuel)' },
    key: 'e85',
    label: { en: 'E85', fr: 'E85' },
    shortLabel: 'E85',
  },
  {
    description: { en: 'Liquefied petroleum gas', fr: 'Gaz de pétrole liquéfié' },
    key: 'gplc',
    label: { en: 'LPG', fr: 'GPLc' },
    shortLabel: 'GPL',
  },
];

export const DEFAULT_FUEL: FuelKey = 'gazole';

export const FUEL_META = Object.fromEntries(FUEL_OPTIONS.map((fuel) => [fuel.key, fuel])) as Record<
  FuelKey,
  FuelOption
>;

export function isFuelKey(value: unknown): value is FuelKey {
  return typeof value === 'string' && value in FUEL_META;
}
