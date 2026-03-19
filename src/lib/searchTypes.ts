import { Station } from './carburantsApi';
import { CitySearchResult } from './citySearch';

export type SearchResultItem =
  | {
      kind: 'station';
      station: Station;
    }
  | {
      city: CitySearchResult;
      kind: 'city';
    };
