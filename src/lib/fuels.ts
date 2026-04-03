export type FuelKey = 'gazole' | 'sp95' | 'e10' | 'sp98' | 'e85' | 'gplc';
export type FuelFilter = FuelKey;
export type FuelSelection = FuelKey[];
export type FuelFilterOptionKey = 'all' | FuelKey;

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

export const FUEL_FILTER_OPTIONS: Array<{ accent: string; key: FuelFilterOptionKey; label: string }> = [
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

export function matchesFuelSelection(selection: FuelSelection, fuelKey: FuelKey) {
  return selection.length === 0 || selection.includes(fuelKey);
}

export function toggleFuelSelection(selection: FuelSelection, optionKey: FuelFilterOptionKey): FuelSelection {
  if (optionKey === 'all') {
    return [];
  }

  const nextSelection = selection.includes(optionKey)
    ? selection.filter((fuelKey) => fuelKey !== optionKey)
    : [...selection, optionKey];

  return nextSelection.length === FUEL_OPTIONS.length ? [] : nextSelection;
}

export function isFuelOptionActive(selection: FuelSelection, optionKey: FuelFilterOptionKey) {
  return optionKey === 'all' ? selection.length === 0 : selection.includes(optionKey);
}

export function getFuelSelectionLabel(selection: FuelSelection) {
  if (selection.length === 0 || selection.length === FUEL_OPTIONS.length) {
    return 'Tout voir';
  }

  return selection.map((fuelKey) => FUEL_META[fuelKey].label).join(', ');
}

export function getFuelSelectionQueryValue(selection: FuelSelection) {
  return selection.length === 0 ? 'all' : selection.join(',');
}
