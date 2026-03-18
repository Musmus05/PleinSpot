import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type BrandMarkProps = {
  size?: number;
};

export function BrandMark({ size = 48 }: BrandMarkProps) {
  return (
    <Svg height={size} viewBox="0 0 64 64" width={size}>
      <Defs>
        <LinearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#12344B" />
          <Stop offset="1" stopColor="#08151F" />
        </LinearGradient>
        <LinearGradient id="pin" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#FFD166" />
          <Stop offset="1" stopColor="#F4A261" />
        </LinearGradient>
        <LinearGradient id="drop" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#74C9FF" />
          <Stop offset="1" stopColor="#4CC9F0" />
        </LinearGradient>
      </Defs>

      <Rect fill="url(#bg)" height="64" rx="18" width="64" />
      <Circle cx="32" cy="24" fill="rgba(76, 201, 240, 0.18)" r="18" />

      <G>
        <Path
          d="M20 27C20 19.82 25.82 14 33 14C40.18 14 46 19.82 46 27C46 35.94 36.26 47.59 33.93 50.23C33.42 50.8 32.58 50.8 32.07 50.23C29.74 47.59 20 35.94 20 27Z"
          fill="url(#pin)"
        />
        <Path
          d="M33 21.5C30.38 21.5 28.25 23.63 28.25 26.25C28.25 28.87 30.38 31 33 31C35.62 31 37.75 28.87 37.75 26.25C37.75 23.63 35.62 21.5 33 21.5Z"
          fill="#08151F"
        />
      </G>

      <Path
        d="M18.5 43.5C20.19 38.72 23.78 36 28 36C29.16 36 29.94 37.18 29.47 38.25C28.96 39.42 28.69 40.75 28.69 42.15C28.69 47.11 32.48 51.25 37.36 51.79C38.58 51.93 39.23 53.33 38.43 54.25C36.74 56.19 34.37 57.5 31.68 57.5C24.7 57.5 18.5 51.45 18.5 43.5Z"
        fill="url(#drop)"
      />
    </Svg>
  );
}
