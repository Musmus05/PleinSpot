# PleinSpot

PleinSpot est une application web qui aide à repérer les stations-service autour de soi et à comparer rapidement les prix des carburants.

Le projet a été réalisé comme prototype fonctionnel dans le cadre d’un projet citoyen : l’objectif est de rendre une information publique plus lisible et plus utile pour les personnes qui surveillent leur budget carburant au quotidien.

## Fonctionnalités

- Carte interactive (fond Plan IGN) avec un marqueur de prix par station, coloré selon le tiers de prix de la zone affichée (vert / orange / rouge) et une étoile sur la station la moins chère.
- Choix du carburant : Gazole, SP95-E10, SP95, SP98, E85 et GPLc, avec le prix minimum de la zone pour chacun.
- Statistiques de la zone (mini, moyenne, maxi, nombre de stations) et comparaison avec la moyenne nationale.
- Liste triable par prix ou par distance, avec nom et enseigne des stations, statut d’ouverture et ancienneté du prix.
- Fiche station : prix façon totem, rang dans la zone, jauge mini/moyenne/maxi, économie estimée sur un plein de 50 L, tous les carburants, ruptures, horaires de la semaine (ouvert/fermé en temps réel, heure de Paris), services, itinéraire Google Maps ou Waze, partage.
- Recherche par ville, code postal ou adresse, avec navigation au clavier.
- Liens partageables (`?carburant=e10&lat=…&lng=…&z=…` ou `?station=…`), préférences mémorisées (carburant, langue, dernière zone).
- Interface en français et en anglais, mise en page dédiée desktop et mobile.
- Prix non mis à jour depuis plus de 30 jours écartés, prix de plus de 7 jours signalés « à vérifier ».
- Google Analytics chargé uniquement après consentement (bandeau conforme aux recommandations de la CNIL).

## Technologies utilisées

- **React**, **Expo Web** et **React Native Web** pour l’interface.
- **TypeScript** pour le frontend, **Node.js** (ES Modules, sans framework) pour le backend.
- **Leaflet** et **React-Leaflet** pour la carte, avec le **Plan IGN** de la Géoplateforme (sans clé d’API).
- Police **Plus Jakarta Sans**, icônes issues de **Lucide** (intégrées une à une dans `src/components/icons.tsx`).
- **fast-xml-parser** et **fflate** pour lire le flux officiel (côté serveur uniquement).
- **Heroku** compatible via `Procfile` et `heroku-postbuild`.

## Sources de données

Le jeu de données officiel est **Prix des carburants en France - Flux instantané - v2**, publié sur la plateforme du ministère de l’Économie :

- Documentation / console API : <https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/api/?flg=fr-fr>
- Endpoint Explore API 2.1 associé : <https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records/>

Dans le code, PleinSpot consomme directement le flux instantané officiel utilisé comme source brute :

- `https://donnees.roulez-eco.fr/opendata/instantane`

Ce flux fournit une archive contenant les informations des stations et les prix déclarés. Le backend la télécharge, la décompresse, lit le XML, normalise les stations, puis renvoie seulement les résultats utiles à la zone affichée.

Le nom et l’enseigne des stations, absents du flux, sont lus à la demande sur la fiche officielle `https://www.prix-carburants.gouv.fr/station/{id}` (cache 24 h, 3 requêtes simultanées au maximum, pause automatique si le site refuse les requêtes).

La recherche de communes utilise l’API publique `https://geo.api.gouv.fr/communes` et le fond de carte provient du Plan IGN (`https://data.geopf.fr/wmts`).

## Architecture

```text
.
|-- backend/
|   |-- server.mjs                # Serveur HTTP : API, fichiers statiques, compression, en-têtes de sécurité
|   |-- fuelDataService.mjs       # Flux officiel : téléchargement, cache, rafraîchissement, statistiques
|   |-- stationDetailsService.mjs # Nom et enseigne des stations (fiche officielle)
|   `-- citySearchService.mjs     # Recherche de communes et codes postaux
|-- src/
|   |-- components/               # Carte, liste, fiche station, recherche, sélecteur de carburant…
|   |-- lib/                      # API, horaires, prix, enseignes, traductions, URL, préférences
|   |-- types/                    # Types partagés
|   |-- theme.ts                  # Couleurs, typographie, rayons, ombres
|   `-- AppShell.tsx              # État de l’application et mise en page desktop / mobile
|-- assets/                       # Logo source et favicon
|-- public/                       # index.html (SEO, consentement), manifeste PWA, icônes, image de partage
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
- `GET /api/stations?latitude=48.85&longitude=2.35&latitudeDelta=0.1&longitudeDelta=0.14&fuel=gazole&limit=200` : stations de la zone triées par prix, statistiques de la zone, moyenne nationale et prix minimum par carburant
- `GET /api/stations/{id}` : une station et ses détails (nom, enseigne)
- `GET /api/stations/details?ids=1,2,3` : noms et enseignes de plusieurs stations (20 au maximum)
- `GET /api/cities?q=lyon` ou `?q=69003`

Le flux officiel est chargé au démarrage puis rafraîchi toutes les 10 minutes en arrière-plan : les requêtes n’attendent jamais le téléchargement, sauf au tout premier démarrage.

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
- Le site est une application monopage : les moteurs de recherche n’indexent que la page d’accueil (pas de pages par ville).
