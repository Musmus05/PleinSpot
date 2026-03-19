# PleinSpot

Application web Expo / React pour visualiser les stations-service sur une carte et consulter les prix carburants remontés par le flux officiel français.

## Fonctionnalités

- Carte web Leaflet avec stations visibles selon la zone affichée
- Recherche de stations et de villes
- Filtres par carburant: Gazole, SP95, E10, SP98, E85, GPLc
- Marqueurs avec prix directement sur la carte
- Fiche station détaillée: prix, horaires, services, distance, ouverture dans Google Maps
- Rafraîchissement manuel et mise à jour automatique

## Source de données

- API officielle du ministère de l'Économie:
  [prix-des-carburants-en-france-flux-instantane-v2](https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/)

Le projet utilise un snapshot web local généré dans `public/fuel-stations.json`.

## Lancer le projet

```bash
npm install
npm run web
```

Ou simplement:

```bash
npm start
```

## Stack

- Expo SDK 55
- React
- react-leaflet
- leaflet
- expo-location
- react-native-web
- react-native-svg
- Space Grotesk
