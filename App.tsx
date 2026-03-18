import { AppShell } from './src/AppShell';
import { StationMap } from './src/components/StationMap.native';
import { fetchStationsInRegion } from './src/lib/carburantsApi';

export default function App() {
  return <AppShell StationMapComponent={StationMap} fetchStations={fetchStationsInRegion} />;
}
