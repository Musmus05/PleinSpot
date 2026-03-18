# PleinSpot

Application mobile Expo / React Native pour visualiser les stations-service autour de soi sur une carte et consulter les prix carburants remontés par le flux officiel français.

## Fonctionnalités

- Carte mobile avec stations visibles selon la zone affichée
- Géolocalisation pour se recentrer autour de soi
- Filtres par carburant: Gazole, SP95, E10, SP98, E85, GPLc
- Marqueurs avec prix directement sur la carte
- Fiche station détaillée: prix, horaires, services, distance, ouverture dans Google Maps
- Rafraîchissement manuel et mise à jour automatique toutes les 90 secondes
- Identité visuelle dédiée `PleinSpot`

## Source de données

- API officielle du ministère de l'Économie:
  [prix-des-carburants-en-france-flux-instantane-v2](https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/)

L'application interroge directement l'endpoint Explore v2.1 de `data.economie.gouv.fr` en filtrant les stations dans la zone actuellement visible.

## Lancer le projet

```bash
npm install
npm run android
```

Ou:

```bash
npm start
```

Puis scanner le QR code avec Expo Go.

Version web:

```bash
npm run web
```

La version web utilise Leaflet sur navigateur, tandis que la version mobile conserve `react-native-maps`.

## Stack

- Expo SDK 55
- React Native
- react-native-maps
- react-leaflet
- leaflet
- expo-location
- react-native-svg
- Space Grotesk
