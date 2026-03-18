import { StyleSheet } from 'react-native';

export const colors = {
  aqua: '#82D8FF',
  border: 'rgba(173, 201, 223, 0.14)',
  borderStrong: 'rgba(173, 201, 223, 0.28)',
  coral: '#FF947E',
  glowAqua: 'rgba(130, 216, 255, 0.22)',
  glowSun: 'rgba(255, 184, 108, 0.20)',
  ink: '#07131D',
  midnight: '#123146',
  mint: '#7AD8B4',
  night: '#040C13',
  panel: 'rgba(8, 22, 32, 0.76)',
  panelRaised: 'rgba(11, 28, 40, 0.94)',
  steel: '#6E87A1',
  subtleText: '#9AB1C6',
  subtleTextStrong: '#BED1E0',
  sun: '#FFB86C',
  surface: 'rgba(15, 36, 51, 0.88)',
  surfaceSoft: 'rgba(255, 255, 255, 0.05)',
  text: '#F5FBFF',
  textOnLight: '#0B1E2C',
};

export const shadows = StyleSheet.create({
  card: {
    shadowColor: '#000000',
    shadowOffset: {
      height: 16,
      width: 0,
    },
    shadowOpacity: 0.24,
    shadowRadius: 28,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: {
      height: 24,
      width: 0,
    },
    shadowOpacity: 0.28,
    shadowRadius: 34,
  },
});
