import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { FUEL_META, FuelKey } from '../lib/fuels';
import { colors, fonts } from '../theme';

type FuelBadgeProps = {
  active?: boolean;
  fuel: FuelKey;
  size?: number;
};

/**
 * EU fuel identifier (EN 16942), as printed on pump nozzles and fuel filler caps:
 * circle for petrol, square for diesel, diamond for gas.
 */
export function FuelBadge({ active = false, fuel, size = 34 }: FuelBadgeProps) {
  const { euCode, euShape } = FUEL_META[fuel];
  const stroke = active ? colors.blue : colors.black;
  const fill = active ? colors.blue : colors.white;
  const ink = active ? colors.white : colors.black;
  const strokeWidth = 2.2;
  const half = size / 2;
  const fontSize = euCode.length > 2 ? size * 0.32 : size * 0.38;

  return (
    <View accessibilityElementsHidden importantForAccessibility="no" style={{ height: size, width: size }}>
      <Svg height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
        {euShape === 'circle' ? (
          <Circle cx={half} cy={half} fill={fill} r={half - strokeWidth} stroke={stroke} strokeWidth={strokeWidth} />
        ) : euShape === 'square' ? (
          <Rect
            fill={fill}
            height={size - strokeWidth * 2 - 2}
            rx={2}
            stroke={stroke}
            strokeWidth={strokeWidth}
            width={size - strokeWidth * 2 - 2}
            x={strokeWidth + 1}
            y={strokeWidth + 1}
          />
        ) : (
          <Path
            d={`M${half} ${strokeWidth}L${size - strokeWidth} ${half}L${half} ${size - strokeWidth}L${strokeWidth} ${half}Z`}
            fill={fill}
            stroke={stroke}
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.code, { color: ink, fontSize, lineHeight: fontSize * 1.1 }]}>{euCode}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  code: {
    fontFamily: fonts.condensedBold,
    letterSpacing: 0.2,
  },
});
