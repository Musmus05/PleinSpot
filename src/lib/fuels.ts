export type FuelKey = 'gazole' | 'sp95' | 'e10' | 'sp98' | 'e85' | 'gplc';
export type FuelFilter = 'all' | FuelKey;

type FuelOption = {
  accent: string;
  key: FuelKey;
  label: string;
  priceField: `${FuelKey}_prix`;
  shortLabel: string;
};

export const FUEL_OPTIONS: FuelOption[] = [
  { accent: '#78C6A3', key: 'gazole', label: 'Gazole', priceField: 'gazole_prix', shortLabel: 'Diesel' },
  { accent: '#FFD166', key: 'sp95', label: 'SP95', priceField: 'sp95_prix', shortLabel: 'SP95' },
  { accent: '#4CC9F0', key: 'e10', label: 'E10', priceField: 'e10_prix', shortLabel: 'E10' },
  { accent: '#F4978E', key: 'sp98', label: 'SP98', priceField: 'sp98_prix', shortLabel: 'SP98' },
  { accent: '#C9F27B', key: 'e85', label: 'E85', priceField: 'e85_prix', shortLabel: 'E85' },
  { accent: '#A78BFA', key: 'gplc', label: 'GPLc', priceField: 'gplc_prix', shortLabel: 'GPL' },
];

export const FUEL_FILTER_OPTIONS: Array<{ accent: string; key: FuelFilter; label: string }> = [
  { accent: '#F4A261', key: 'all', label: 'Tout voir' },
  ...FUEL_OPTIONS.map((fuel) => ({
    accent: fuel.accent,
    key: fuel.key,
    label: fuel.label,
  })),
];

export const FUEL_META = FUEL_OPTIONS.reduce(
  (accumulator, fuel) => {
    accumulator[fuel.key] = fuel;
    return accumulator;
  },
  {} as Record<FuelKey, FuelOption>,
);
