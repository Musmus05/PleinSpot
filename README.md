# PleinSpot

PleinSpot est une application web qui aide à repérer les stations-service autour de soi et à comparer rapidement les prix des carburants.

Le projet a été réalisé comme prototype fonctionnel dans le cadre d’un projet citoyen : l’objectif est de rendre une information publique plus lisible et plus utile pour les personnes qui surveillent leur budget carburant au quotidien.

## Fonctionnalités

- Carte interactive des stations-service.
- Recherche par ville ou par station.
- Filtrage par carburant : Gazole, SP95, E10, SP98, E85 et GPLc.
- Comparaison des prix dans la zone visible.
- Mise en avant des stations les moins chères.
- Fiche détaillée d’une station : adresse, carburants, prix, services, horaires si disponibles et itinéraire.
- Géolocalisation côté utilisateur, avec autorisation du navigateur.
- Backend local qui récupère et prépare les données publiques officielles.

## Technologies utilisées

- **React** et **Expo Web** pour l’interface.
- **React Native Web** pour partager une logique d’interface compatible web.
- **Node.js** pour le backend.
- **TypeScript** pour le frontend.
- **JavaScript ES Modules** pour le backend.
- **Leaflet** et **React-Leaflet** pour la carte.
- **Expo Location** pour la géolocalisation.
- **fast-xml-parser** pour lire le flux XML des carburants.
- **fflate** pour décompresser les données officielles.
- **Heroku** compatible via `Procfile` et `heroku-postbuild`.

## Sources de données

Le jeu de données officiel est **Prix des carburants en France - Flux instantané - v2**, publié sur la plateforme du ministère de l’Économie :

- Documentation / console API : <https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/api/?flg=fr-fr>
- Endpoint Explore API 2.1 associé : <https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records/>

Dans le code, PleinSpot consomme directement le flux instantané officiel utilisé comme source brute :

- `https://donnees.roulez-eco.fr/opendata/instantane`

Ce flux fournit une archive contenant les informations des stations et les prix déclarés. Le backend la télécharge, la décompresse, lit le XML, normalise les stations, puis renvoie seulement les résultats utiles à la zone affichée.

La recherche de communes utilise aussi l’API publique suivante :

- `https://geo.api.gouv.fr/communes`

## Architecture

```text
.
|-- backend/
|   |-- server.mjs           # Serveur HTTP, routes API et fichiers statiques
|   `-- fuelDataService.mjs  # Récupération, cache et filtrage des données carburant
|-- src/
|   |-- components/          # Carte, fiche station, résumé et interface
|   |-- lib/                 # API, formatage, recherche, carburants, affichage
|   |-- types/               # Types partagés
|   `-- AppShell.tsx         # Logique principale de l’application
|-- assets/                  # Logo et ressources graphiques
|-- public/                  # Fichiers publics web
|-- scripts/                 # Scripts de build
|-- App.tsx
|-- index.ts
|-- package.json
`-- Procfile
```

## Prérequis

- Node.js 20 ou supérieur.
- npm.

## Installation

```bash
npm install
```

## Lancement en développement

Pour lancer le frontend Expo Web et le backend en même temps :

```bash
npm run dev
```

Par défaut :

- frontend Expo Web : <http://localhost:8081>
- backend Node.js : <http://localhost:4000>

Pour lancer seulement le backend :

```bash
npm run backend
```

Pour lancer seulement le frontend :

```bash
npm run web
```

## Build web

```bash
npm run build:web
```

Le build web est généré dans `dist/`.

## Lancement en production locale

Après un build web :

```bash
npm start
```

Le serveur Node.js sert :

- les fichiers statiques de `dist/`
- les routes API sous `/api/*`

Routes principales :

- `GET /api/health`
- `GET /api/stations`
- `GET /api/cities?q=paris`

## Variables d’environnement

Le projet fonctionne sans clé API.

Optionnellement, le frontend peut pointer vers un backend précis :

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
```

En production, les secrets ou variables sensibles doivent être configurés côté hébergeur, jamais ajoutés dans le code.

## Déploiement Heroku

Le dépôt est prêt pour un déploiement Heroku simple :

- `Procfile` lance `npm start`.
- `heroku-postbuild` génère le frontend web.
- le serveur sert ensuite le build statique et les routes API.

Exemple :

```bash
heroku create
git push heroku main
```

## Sécurité et confidentialité

- Aucune clé API n’est nécessaire pour les sources utilisées actuellement.
- Les données consommées sont publiques.
- Les fichiers `.env` sont ignorés par Git.
- La géolocalisation dépend de l’autorisation du navigateur et n’est pas stockée par l’application.
- Le backend applique un cache pour limiter les appels répétés au flux officiel.

Avant de rendre le dépôt public, il reste conseillé de vérifier :

```bash
git status
git diff
```

et de s’assurer qu’aucun fichier personnel, rapport, capture privée ou fichier `.env` n’est ajouté au commit.

## Limites connues

- Les prix dépendent de la fraîcheur des données déclarées par les stations.
- Certaines stations peuvent ne pas renseigner tous les carburants, horaires ou services.
- Le prototype doit encore être testé plus largement sur mobile.
- Une page d’information utilisateur pourrait être ajoutée pour expliquer la source des données et leurs limites.
