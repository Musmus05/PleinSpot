import { StyleSheet, Text, View } from 'react-native';

import { colors, shadows } from '../theme';

type ClusterMarkerProps = {
  count: number;
};

export function ClusterMarker({ count }: ClusterMarkerProps) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.badge, shadows.card]}>
        <Text style={styles.count}>{count}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.sun,
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 48,
    justifyContent: 'center',
    minWidth: 48,
    paddingHorizontal: 14,
  },
  count: {
    color: colors.textOnLight,
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
});
