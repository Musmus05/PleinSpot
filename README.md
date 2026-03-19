# PleinSpot

PleinSpot est une application web de comparaison de prix des carburants avec un vrai backend Node.

Le frontend affiche la carte, la recherche, les filtres et les fiches station. Le backend récupère le flux officiel des prix des carburants, le met en cache, filtre les stations selon la zone demandée et permet une vraie synchronisation au clic sur le bouton refresh.

## Documentation Utilisateur

### Fonctions principales

- visualiser les stations visibles sur la carte
- filtrer par carburant
- rechercher une ville ou une station
- ouvrir une fiche station détaillée
- comparer les prix dans la zone affichée
- lancer un itinéraire Google Maps

### Ce que fait le bouton refresh

Le bouton refresh appelle maintenant le backend.

Concrètement, il :

- force un nouveau téléchargement du flux officiel
- reconstruit les données côté serveur
- recharge les stations visibles dans l'application
- met à jour l'heure de dernière vérification dans l'interface

### Mobile / responsive

Sur petit écran :

- le bloc du haut peut être replié avec `Filtres` et `Infos`
- le bloc du bas peut être replié avec `Résultats`
- la carte reste plus visible quand les panneaux sont fermés

## Documentation Technique

### Stack

- Expo Web
- React 19
- React Native Web
- Leaflet / React Leaflet
- Node.js
- fflate
- fast-xml-parser

### Architecture

#### Frontend

- [App.tsx](/C:/Users/musta/OneDrive/Documents/Projets/Projet-station-essence/App.tsx)
- [AppShell.tsx](/C:/Users/musta/OneDrive/Documents/Projets/Projet-station-essence/src/AppShell.tsx)
- [TopOverlay.tsx](/C:/Users/musta/OneDrive/Documents/Projets/Projet-station-essence/src/components/TopOverlay.tsx)
- [SummaryCard.tsx](/C:/Users/musta/OneDrive/Documents/Projets/Projet-station-essence/src/components/SummaryCard.tsx)
- [StationSheet.tsx](/C:/Users/musta/OneDrive/Documents/Projets/Projet-station-essence/src/components/StationSheet.tsx)
- [StationMap.web.tsx](/C:/Users/musta/OneDrive/Documents/Projets/Projet-station-essence/src/components/StationMap.web.tsx)

Le frontend parle au backend via :

- [carburantsApiWeb.ts](/C:/Users/musta/OneDrive/Documents/Projets/Projet-station-essence/src/lib/carburantsApiWeb.ts)

#### Backend

- [server.mjs](/C:/Users/musta/OneDrive/Documents/Projets/Projet-station-essence/backend/server.mjs)
- [fuelDataService.mjs](/C:/Users/musta/OneDrive/Documents/Projets/Projet-station-essence/backend/fuelDataService.mjs)

Responsabilités du backend :

- exposer `GET /api/health`
- exposer `GET /api/stations`
- récupérer le flux officiel `https://donnees.roulez-eco.fr/opendata/instantane`
- parser l'archive ZIP et le XML
- mettre les stations en cache mémoire
- forcer une resynchronisation quand `forceRefresh=1`

### Scripts

- `npm start` : lance frontend + backend
- `npm run dev` : lance frontend + backend
- `npm run backend` : lance uniquement le backend
- `npm run web` : lance uniquement le frontend

### Lancement local

Installation :

```bash
npm install
```

Lancement complet :

```bash
npm start
```

Le frontend tourne via Expo Web et le backend via Node sur `http://localhost:4000`.

Si besoin, le frontend peut viser une autre URL backend avec :

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
```

### Endpoint principal

Le frontend utilise :

```text
GET /api/stations?latitude=...&longitude=...&latitudeDelta=...&longitudeDelta=...&fuelFilter=...&limit=...&forceRefresh=0|1
```


