# PleinSpot

PleinSpot est une application web qui aide à repérer les stations-service autour de soi et à comparer rapidement les prix des carburants.

Le projet a été réalisé comme prototype fonctionnel dans le cadre d’un projet citoyen : l’objectif est de rendre une information publique plus lisible et plus utile pour les personnes qui surveillent leur budget carburant au quotidien.

## Pourquoi PleinSpot plutôt qu’un autre comparateur

Tous les comparateurs partent des mêmes données publiques. PleinSpot se distingue par ce qu’il en fait :

- **Les prix les plus frais possibles.** Le flux officiel est reconstruit toutes les 10 minutes ; PleinSpot le vérifie chaque minute et envoie chaque nouvelle publication aux écrans ouverts, sans rechargement. Les API qui recopient ce flux ont 15 à 30 minutes de retard.
- **Le prix d’aujourd’hui, et son histoire.** Pour chaque station et chaque zone, l’évolution jour par jour sur 1 mois, 3 mois ou 1 an, face à la moyenne de la zone et à la moyenne nationale. On voit si une station est moins chère depuis des mois ou seulement depuis ce matin, et de combien.
- **Les stations au bon endroit.** Les coordonnées officielles sont déclarées par les stations : environ 2 800 sont à plus de 100 m de leurs pompes, 390 à plus d’un kilomètre. PleinSpot les replace grâce à OpenStreetMap ; les distances et l’itinéraire mènent à la station, pas à côté.
- **Des données nettoyées.** Les prix abandonnés depuis plus de 30 jours sont écartés, ceux de plus de 7 jours signalés « à vérifier », les fautes de saisie (« 1,250 » pour « 2,250 ») retirées de l’historique. Les ruptures de stock déclarées sont affichées : le flux officiel courant n’en contient aucune, PleinSpot lit la variante qui les inclut.
- **Lisible d’un coup d’œil.** Chaque prix prend la couleur de son tiers dans la zone affichée, et les carburants portent l’identifiant européen imprimé sur le pistolet et la trappe du réservoir.
- **Sans compte, sans installation, sans publicité.** Rien à télécharger, aucune inscription. La position reste dans le navigateur, et la mesure d’audience ne se charge qu’avec votre accord.
- **Pour tout le monde.** Bureau et mobile, français et anglais, pensé pour le clavier et les lecteurs d’écran, contrastes vérifiés.

## Fonctionnalités

- **Prix en direct** : le serveur vérifie le flux officiel chaque minute et pousse chaque nouvelle publication aux applis ouvertes (Server-Sent Events). Les prix qui changent clignotent sur la carte et affichent leur écart (« ↓ 1,2 ct ») sans rechargement.
- Carte interactive (fond vectoriel épuré OpenFreeMap « Positron », sans relief) avec un prix par station présenté comme une latte de totem, coloré selon le tiers de prix de la zone affichée (vert / jaune / rouge), double filet sur le prix le plus bas.
- Choix du carburant par son identifiant européen (carré B7, rond E10/E5/E85, losange LPG), avec le prix minimum de la zone pour chacun.
- Statistiques de la zone (mini, moyenne, maxi, nombre de stations) et comparaison avec la moyenne nationale.
- Liste triable par prix ou par distance, avec nom et enseigne des stations (OpenStreetMap), statut d’ouverture et ancienneté du prix.
- Fiche station : totem de tous les carburants, rang dans la zone, économie estimée sur un plein de 50 L, ruptures en cours, horaires de la semaine (ouvert/fermé en temps réel, heure de Paris), services, itinéraire Google Maps ou Waze, partage.
- **Historique des prix sur 1 mois, 3 mois ou 1 an** : pour la zone affichée (moyenne, prix le plus bas, moyenne nationale) et pour chaque station (comparée à la moyenne de la zone). Graphique lisible à la souris, au doigt et au clavier, phrase de synthèse, repères (plus bas, plus haut, écart), tableau des valeurs ou des changements de prix.
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

L'**historique** vient des archives annuelles du même système, qui contiennent chaque prix déclaré par chaque station (`https://donnees.roulez-eco.fr/opendata/annee/{année}`, environ 30 Mo compressés et 350 Mo de XML par an, reconstruites chaque nuit). Au démarrage, le serveur lit l'année en cours et la précédente en flux, sans jamais tenir le XML en mémoire, et garde pour chaque station et carburant le prix en vigueur à la fin de chaque jour sur les 366 derniers jours (environ 30 Mo de tableaux d'entiers). Un prix reste en vigueur jusqu'à la déclaration suivante, au plus 30 jours, comme pour les prix en direct. Les prix à plus de 30 % de la moyenne nationale du jour (erreurs de saisie du type « 1,250 » pour « 2,250 ») sont écartés. Les prix du flux en direct deviennent ceux du jour, et l'historique est rechargé une fois par jour. Les archives sont gardées sur disque et revalidées par une requête HEAD : un redémarrage le même jour ne retélécharge rien.

Le nom, l’enseigne et la **position exacte** des stations viennent d’OpenStreetMap. Les coordonnées du flux officiel sont déclarées par les stations et souvent approximatives (plus de 100 m d’écart pour environ 2 800 stations, plus d’1 km pour environ 390) ; les contributeurs OpenStreetMap placent la station sur ses pompes. PleinSpot utilise cette position dès qu’elle est à moins de 3 km de la position officielle, sinon il garde l’officielle. Ces données viennent d’OpenStreetMap, qui porte l’identifiant officiel de 99,6 % des stations dans le tag `ref:FR:prix-carburants`. Le serveur télécharge chaque jour l’export de l’outil Osmose (497 Ko compressé) et fait la jointure sur cet identifiant. Données © contributeurs OpenStreetMap, licence ODbL : l’attribution est affichée dans l’application.

La recherche de communes utilise l’API publique `https://geo.api.gouv.fr/communes` et le fond de carte provient d’OpenFreeMap (`https://tiles.openfreemap.org/styles/positron`, données © OpenMapTiles, © OpenStreetMap).

## Architecture

```text
.
|-- backend/
|   |-- server.mjs                # Serveur HTTP : API, fichiers statiques, compression, en-têtes de sécurité
|   |-- fuelDataService.mjs       # Flux officiel : téléchargement, cache, rafraîchissement, statistiques
|   |-- priceHistoryService.mjs   # Historique : archives annuelles lues en flux, prix par jour sur un an
|   |-- fuels.mjs                 # Carburants et lecture des prix, partagés par les deux services
|   |-- stationMetaService.mjs    # Nom et enseigne des stations (OpenStreetMap via Osmose)
|   `-- citySearchService.mjs     # Recherche de communes et codes postaux
|-- src/
|   |-- components/               # Carte, liste, fiche station, recherche, sélecteur de carburant…
|   |-- lib/                      # API, horaires, prix, enseignes, traductions, URL, préférences
|   |-- types/                    # Types partagés
|   |-- theme.ts                  # Couleurs, typographie, rayons, ombres
|   `-- AppShell.tsx              # État de l’application et mise en page desktop / mobile
|-- assets/                       # Logo source et favicon
|-- public/                       # index.html (SEO, consentement), robots.txt, sitemap.xml, manifeste PWA, icônes, image de partage
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
- `GET /api/stations/{id}/history` : prix par jour de la station sur un an, pour chaque carburant (en millièmes d'euro, `null` les jours sans prix)
- `GET /api/history?latitude=…&longitude=…&latitudeDelta=…&longitudeDelta=…&fuel=gazole` : moyenne et prix le plus bas des stations de la zone, jour par jour sur un an, et moyenne nationale. Ces deux routes répondent 503 pendant les quelques secondes de chargement des archives après un démarrage.
- `GET /api/live` : flux Server-Sent Events, un événement `prices` à chaque nouvelle publication officielle
- `GET /api/cities?q=lyon` ou `?q=69003`

Le flux officiel est chargé au démarrage puis vérifié chaque minute en arrière-plan : les requêtes n’attendent jamais le téléchargement, sauf au tout premier démarrage.

## Variables d’environnement

Le projet fonctionne sans clé API.

Optionnellement, le frontend peut pointer vers un backend précis :

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
```

Côté serveur, `FUEL_FEED_URL` remplace l’adresse du flux officiel (serveur de recette, tests du temps réel avec un fichier modifié), et `HISTORY_CACHE_DIR` le dossier où sont gardées les archives annuelles (par défaut `pleinspot-history` dans le dossier temporaire du système).

`PUBLIC_ORIGIN` est l’adresse officielle du site, `https://pleinspot.app` par défaut quand `NODE_ENV=production` (aucune en local). Toute requête de page arrivée par une autre adresse (`http://`, `www.`, `*.herokuapp.com`) reçoit une redirection 301 vers celle-ci, chemin et paramètres compris ; les routes `/api/*` ne sont jamais redirigées. La balise canonique, `og:url`, `robots.txt` et `sitemap.xml` donnent cette adresse : sans elle, chaque variante se déclarait canonique et Google indexait `http://pleinspot.app/`. Une autre instance du projet doit définir sa propre `PUBLIC_ORIGIN`.

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
