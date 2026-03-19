import { AppShell } from './src/AppShell';
import { StationMap } from './src/components/StationMap.web';
import { fetchStationsInRegionWeb } from './src/lib/carburantsApiWeb';

export default function App() {
  return (
    <AppShell
      autoLocateOnMount={false}
      StationMapComponent={StationMap}
      fetchStations={fetchStationsInRegionWeb}
    />
  );
}
