// Icon outlines from Lucide (https://lucide.dev, ISC license), inlined so the bundle only ships
// the handful of icons PleinSpot uses instead of the whole library.
import Svg, { Circle, Line, Path, Polygon } from 'react-native-svg';

type IconNode = [string, Record<string, string>];

export type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

const ELEMENTS = { circle: Circle, line: Line, path: Path, polygon: Polygon } as const;

function createIcon(nodes: IconNode[]) {
  return function Icon({ color = '#101828', size = 20, strokeWidth = 2 }: IconProps) {
    return (
      <Svg
        fill="none"
        height={size}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        viewBox="0 0 24 24"
        width={size}
      >
        {nodes.map(([tag, attributes], index) => {
          const Element = ELEMENTS[tag as keyof typeof ELEMENTS];

          return <Element key={index} {...attributes} />;
        })}
      </Svg>
    );
  };
}

export const ArrowLeft = createIcon([["path",{"d":"m12 19-7-7 7-7"}],["path",{"d":"M19 12H5"}]]);
export const Check = createIcon([["path",{"d":"M20 6 9 17l-5-5"}]]);
export const ChevronDown = createIcon([["path",{"d":"m6 9 6 6 6-6"}]]);
export const ChevronUp = createIcon([["path",{"d":"m18 15-6-6-6 6"}]]);
export const CircleAlert = createIcon([["circle",{"cx":"12","cy":"12","r":"10"}],["line",{"x1":"12","x2":"12","y1":"8","y2":"12"}],["line",{"x1":"12","x2":"12.01","y1":"16","y2":"16"}]]);
export const Clock = createIcon([["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"M12 6v6l4 2"}]]);
export const ExternalLink = createIcon([["path",{"d":"M15 3h6v6"}],["path",{"d":"M10 14 21 3"}],["path",{"d":"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"}]]);
export const Fuel = createIcon([["path",{"d":"M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5"}],["path",{"d":"M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16"}],["path",{"d":"M2 21h13"}],["path",{"d":"M3 9h11"}]]);
export const Info = createIcon([["circle",{"cx":"12","cy":"12","r":"10"}],["path",{"d":"M12 16v-4"}],["path",{"d":"M12 8h.01"}]]);
export const LinkIcon = createIcon([["path",{"d":"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"}],["path",{"d":"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"}]]);
export const ListIcon = createIcon([["path",{"d":"M3 5h.01"}],["path",{"d":"M3 12h.01"}],["path",{"d":"M3 19h.01"}],["path",{"d":"M8 5h13"}],["path",{"d":"M8 12h13"}],["path",{"d":"M8 19h13"}]]);
export const LocateFixed = createIcon([["line",{"x1":"2","x2":"5","y1":"12","y2":"12"}],["line",{"x1":"19","x2":"22","y1":"12","y2":"12"}],["line",{"x1":"12","x2":"12","y1":"2","y2":"5"}],["line",{"x1":"12","x2":"12","y1":"19","y2":"22"}],["circle",{"cx":"12","cy":"12","r":"7"}],["circle",{"cx":"12","cy":"12","r":"3"}]]);
export const MapIcon = createIcon([["path",{"d":"M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"}],["path",{"d":"M15 5.764v15"}],["path",{"d":"M9 3.236v15"}]]);
export const MapPin = createIcon([["path",{"d":"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"}],["circle",{"cx":"12","cy":"10","r":"3"}]]);
export const Navigation = createIcon([["polygon",{"points":"3 11 22 2 13 21 11 13 3 11"}]]);
export const PiggyBank = createIcon([["path",{"d":"M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z"}],["path",{"d":"M16 10h.01"}],["path",{"d":"M2 8v1a2 2 0 0 0 2 2h1"}]]);
export const RefreshCw = createIcon([["path",{"d":"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"}],["path",{"d":"M21 3v5h-5"}],["path",{"d":"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"}],["path",{"d":"M8 16H3v5"}]]);
export const Route = createIcon([["circle",{"cx":"6","cy":"19","r":"3"}],["path",{"d":"M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"}],["circle",{"cx":"18","cy":"5","r":"3"}]]);
export const Search = createIcon([["path",{"d":"m21 21-4.34-4.34"}],["circle",{"cx":"11","cy":"11","r":"8"}]]);
export const Share = createIcon([["circle",{"cx":"18","cy":"5","r":"3"}],["circle",{"cx":"6","cy":"12","r":"3"}],["circle",{"cx":"18","cy":"19","r":"3"}],["line",{"x1":"8.59","x2":"15.42","y1":"13.51","y2":"17.49"}],["line",{"x1":"15.41","x2":"8.59","y1":"6.51","y2":"10.49"}]]);
export const Star = createIcon([["path",{"d":"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"}]]);
export const TrendingDown = createIcon([["path",{"d":"M16 17h6v-6"}],["path",{"d":"m22 17-8.5-8.5-5 5L2 7"}]]);
export const TrendingUp = createIcon([["path",{"d":"M16 7h6v6"}],["path",{"d":"m22 7-8.5 8.5-5-5L2 17"}]]);
export const TriangleAlert = createIcon([["path",{"d":"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"}],["path",{"d":"M12 9v4"}],["path",{"d":"M12 17h.01"}]]);
export const X = createIcon([["path",{"d":"M18 6 6 18"}],["path",{"d":"m6 6 12 12"}]]);
