# PleinSpot

PleinSpot est une application web qui aide à repérer les stations-service autour de soi et à comparer rapidement les prix des carburants.

Le projet a été réalisé comme prototype fonctionnel dans le cadre d’un projet citoyen : l’objectif est de rendre une information publique plus lisible et plus utile pour les personnes qui surveillent leur budget carburant au quotidien.

## Fonctionnalités

- **Prix en direct** : le serveur vérifie le flux officiel chaque minute et pousse chaque nouvelle publication aux applis ouvertes (Server-Sent Events). Les prix qui changent clignotent sur la carte et affichent leur écart (« ↓ 1,2 ct ») sans rechargement.
- Carte interactive (fond vectoriel épuré OpenFreeMap « Positron », sans relief) avec un prix par station présenté comme une latte de totem, coloré selon le tiers de prix de la zone affichée (vert / jaune / rouge), double filet sur le prix le plus bas.
- Choix du carburant par son identifiant européen (carré B7, rond E10/E5/E85, losange LPG), avec le prix minimum de la zone pour chacun.
- Statistiques de la zone (mini, moyenne, maxi, nombre de stations) et comparaison avec la moyenne nationale.
- Liste triable par prix ou par distance, avec nom et enseigne des stations (OpenStreetMap), statut d’ouverture et ancienneté du prix.
- Fiche station : totem de tous les carburants, rang dans la zone, économie estimée sur un plein de 50 L, ruptures en cours, horaires de la semaine (ouvert/fermé en temps réel, heure de Paris), services, itinéraire Google Maps ou Waze, partage.
- Recherche par ville, code postal ou adresse, avec navigation au clavier.
- Liens partageables (`?carburant=e10&lat=…&lng=…&z=…` ou `?station=…`), préférences mémorisées (carburant, langue, dernière zone).
- Interface en français et en anglais, mise en page dédiée desktop et mobile.
- Prix non mis à jour depuis plus de 30 jours écartés, prix de plus de 7 jours signalés « à vérifier ».
- Google Analytics chargé uniquement après consentement (bandeau conforme aux recommandations de la CNIL).

## Technologies utilisées

- **React**, **Expo Web** et **React Native Web** pour l’interface.
- **TypeScript** pour le frontend, **Node.js** (ES Modules, sans framework) pour le backend.
- **Leaflet** et **React-Leaflet** pour la carte, avec un fond vectoriel **OpenFreeMap** rendu par **MapLibre GL** (gratuit, sans clé ni compte), chargé après le premier affichage.
- Police **Plus Jakarta Sans**, icônes issues de **Lucide** (intégrées une à une dans `src/components/icons.tsx`).
- **fast-xml-parser** et **fflate** pour lire le flux officiel (côté serveur uniquement).
- **Heroku** compatible via `Procfile` et `heroku-postbuild`.

## Sources de données

Le jeu de données officiel est **Prix des carburants en France - Flux instantané - v2**, publié sur la plateforme du ministère de l’Économie :

- Documentation / console API : <https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/api/?flg=fr-fr>
- Endpoint Explore API 2.1 associé : <https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records/>

Dans le code, PleinSpot consomme directement le flux instantané officiel, dans sa variante qui inclut les ruptures de stock :

- `https://donnees.roulez-eco.fr/opendata/instantane_ruptures`

C'est la source la plus fraîche disponible : le ministère la reconstruit toutes les 10 minutes, et toutes les autres API (Explore v2.1, API communautaires) la recopient avec 15 à 30 minutes de retard. Le serveur l'interroge chaque minute avec des requêtes conditionnelles (`If-None-Match`) : un fichier inchangé répond 304 et ne coûte rien.

Ce flux fournit une archive contenant les informations des stations et les prix déclarés. Le backend la télécharge, la décompresse, lit le XML, normalise les stations, puis renvoie seulement les résultats utiles à la zone affichée.

Le nom, l’enseigne et la **position exacte** des stations viennent d’OpenStreetMap. Les coordonnées du flux officiel sont déclarées par les stations et souvent approximatives (plus de 100 m d’écart pour environ 2 800 stations, plus d’1 km pour environ 390) ; les contributeurs OpenStreetMap placent la station sur ses pompes. PleinSpot utilise cette position dès qu’elle est à moins de 3 km de la position officielle, sinon il garde l’officielle. Ces données viennent d’OpenStreetMap, qui porte l’identifiant officiel de 99,6 % des stations dans le tag `ref:FR:prix-carburants`. Le serveur télécharge chaque jour l’export de l’outil Osmose (497 Ko compressé) et fait la jointure sur cet identifiant. Données © contributeurs OpenStreetMap, licence ODbL : l’attribution est affichée dans l’application.

La recherche de communes utilise l’API publique `https://geo.api.gouv.fr/communes` et le fond de carte provient d’OpenFreeMap (`https://tiles.openfreemap.org/styles/positron`, données © OpenMapTiles, © OpenStreetMap).

## Architecture

```text
.
|-- backend/
|   |-- server.mjs                # Serveur HTTP : API, fichiers statiques, compression, en-têtes de sécurité
|   |-- fuelDataService.mjs       # Flux officiel : téléchargement, cache, rafraîchissement, statistiques
|   |-- stationMetaService.mjs    # Nom et enseigne des stations (OpenStreetMap via Osmose)
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
- `GET /api/stations/{id}` : une station (avec nom et enseigne)
- `GET /api/live` : flux Server-Sent Events, un événement `prices` à chaque nouvelle publication officielle
- `GET /api/cities?q=lyon` ou `?q=69003`

Le flux officiel est chargé au démarrage puis vérifié chaque minute en arrière-plan : les requêtes n’attendent jamais le téléchargement, sauf au tout premier démarrage.

## Variables d’environnement

Le projet fonctionne sans clé API.

Optionnellement, le frontend peut pointer vers un backend précis :

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
```

Côté serveur, `FUEL_FEED_URL` remplace l’adresse du flux officiel (serveur de recette, tests du temps réel avec un fichier modifié).

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
