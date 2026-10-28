import type { AppLanguage } from './copy';

export type FuelKey = 'gazole' | 'e10' | 'sp95' | 'sp98' | 'e85' | 'gplc';

type FuelOption = {
  description: Record<AppLanguage, string>;
  /** EU fuel identifier (EN 16942) printed on nozzles and filler caps. */
  euCode: string;
  euShape: 'circle' | 'square' | 'diamond';
  key: FuelKey;
  label: Record<AppLanguage, string>;
};

// Same order as on French pump totems: the most common fuels first.
export const FUEL_OPTIONS: FuelOption[] = [
  {
    description: { en: 'Diesel', fr: 'Diesel' },
    euCode: 'B7',
    euShape: 'square',
    key: 'gazole',
    label: { en: 'Diesel', fr: 'Gazole' },
  },
  {
    description: { en: 'Unleaded 95, up to 10% ethanol', fr: "Sans plomb 95, jusqu'à 10 % d'éthanol" },
    euCode: 'E10',
    euShape: 'circle',
    key: 'e10',
    label: { en: 'SP95-E10', fr: 'SP95-E10' },
  },
  {
    description: { en: 'Unleaded 95', fr: 'Sans plomb 95' },
    euCode: 'E5',
    euShape: 'circle',
    key: 'sp95',
    label: { en: 'SP95', fr: 'SP95' },
  },
  {
    description: { en: 'Unleaded 98', fr: 'Sans plomb 98' },
    euCode: 'E5',
    euShape: 'circle',
    key: 'sp98',
    label: { en: 'SP98', fr: 'SP98' },
  },
  {
    description: { en: 'Bioethanol, for flex-fuel engines', fr: 'Superéthanol, pour moteurs flexfuel' },
    euCode: 'E85',
    euShape: 'circle',
    key: 'e85',
    label: { en: 'E85', fr: 'E85' },
  },
  {
    description: { en: 'Liquefied petroleum gas', fr: 'Gaz de pétrole liquéfié' },
    euCode: 'LPG',
    euShape: 'diamond',
    key: 'gplc',
    label: { en: 'LPG', fr: 'GPLc' },
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
