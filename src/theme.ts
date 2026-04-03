import { StyleSheet } from 'react-native';

export const colors = {
  aqua: '#18B7E0',
  aquaSoft: '#E6F8FD',
  background: '#F3EFE8',
  border: 'rgba(110, 86, 45, 0.12)',
  borderStrong: 'rgba(110, 86, 45, 0.20)',
  coral: '#E57B61',
  glowAqua: 'rgba(24, 183, 224, 0.14)',
  glowSun: 'rgba(255, 191, 71, 0.18)',
  ink: '#F3EFE8',
  midnight: '#EFE8DB',
  mint: '#2CB67D',
  mist: '#FBF8F2',
  night: '#E5DECF',
  panel: '#FFFBF5',
  panelRaised: '#FFFDF9',
  steel: '#8C8375',
  subtleText: '#857A6D',
  subtleTextStrong: '#5E5448',
  sun: '#FFBF47',
  surface: '#FFFCF7',
  surfaceRaised: '#FFFFFF',
  surfaceSoft: '#FFFDF9',
  text: '#2E261F',
  textOnLight: '#2E261F',
  white: '#FFFFFF',
};

export const shadows = StyleSheet.create({
  card: {
    shadowColor: '#B8A98F',
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  floating: {
    shadowColor: '#B8A98F',
    shadowOffset: {
      height: 18,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
});
