import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type BrandMarkProps = {
  size?: number;
};

export function BrandMark({ size = 42 }: BrandMarkProps) {
  return (
    <Svg height={size} viewBox="0 0 64 64" width={size}>
      <Defs>
        <LinearGradient id="badge" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#FFF8EB" />
          <Stop offset="1" stopColor="#F4E5C4" />
        </LinearGradient>
        <LinearGradient id="pin" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#FFBF47" />
          <Stop offset="1" stopColor="#FF9F1C" />
        </LinearGradient>
        <LinearGradient id="drop" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#3AC7EA" />
          <Stop offset="1" stopColor="#0F9FC8" />
        </LinearGradient>
      </Defs>

      <Rect fill="url(#badge)" height="64" rx="18" width="64" />
      <Circle cx="32" cy="20" fill="rgba(255,191,71,0.16)" r="16" />
      <Path
        d="M22 27C22 19.82 27.82 14 35 14C42.18 14 48 19.82 48 27C48 35.94 38.26 47.59 35.93 50.23C35.42 50.8 34.58 50.8 34.07 50.23C31.74 47.59 22 35.94 22 27Z"
        fill="url(#pin)"
      />
      <Circle cx="35" cy="26" fill="#2E261F" r="5" />
      <Path
        d="M17 42.5C18.9 38.1 22.6 35.2 26.8 35.2C28.2 35.2 29.1 36.55 28.55 37.7C28.02 38.79 27.75 40.03 27.75 41.35C27.75 46.21 31.47 50.26 36.23 50.75C37.51 50.88 38.2 52.34 37.38 53.29C35.58 55.37 33.05 56.8 30.16 56.8C22.9 56.8 17 50.59 17 42.5Z"
        fill="url(#drop)"
      />
    </Svg>
  );
}
