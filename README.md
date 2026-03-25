# PleinSpot

PleinSpot est une application web de comparaison de prix des carburants.
Le projet contient :

- un frontend Expo Web / React
- un backend Node.js qui recupere les donnees publiques officielles

## Demarrage local

Installation :

```bash
npm install
```

Mode developpement complet :

```bash
npm run dev
```

- frontend Expo Web : `http://localhost:8081`
- backend Node : `http://localhost:4000`

Si tu veux seulement le backend :

```bash
npm start
```

Si tu veux seulement exporter le frontend web :

```bash
npm run build:web
```

## Deploiement Heroku

Le projet est maintenant adapte a un deploiement Heroku simple :

- Heroku lance `npm start`
- le backend ecoute automatiquement sur `process.env.PORT`
- Heroku lance `heroku-postbuild`, qui genere le frontend dans `dist/`
- le serveur Node sert ensuite les fichiers statiques de `dist/` et les routes API `/api/*`

Fichiers utiles :

- [package.json](/C:/Users/musta/OneDrive/Documents/Projets/Projet-station-essence/package.json)
- [Procfile](/C:/Users/musta/OneDrive/Documents/Projets/Projet-station-essence/Procfile)
- [backend/server.mjs](/C:/Users/musta/OneDrive/Documents/Projets/Projet-station-essence/backend/server.mjs)

Commande typique :

```bash
heroku create
git push heroku main
```

Optionnel en local, si le frontend doit viser un autre backend :

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
```

## Securite

Controle effectue sur le depot :

- aucune reference projet a Render n'a ete trouvee
- aucune cle API, secret, token ou mot de passe n'a ete trouve dans les fichiers du projet
- les fichiers `.env` sont ignores par Git via `.gitignore`
- le backend consomme seulement des donnees publiques :
  - `https://donnees.roulez-eco.fr/opendata/instantane`
  - `https://geo.api.gouv.fr/communes`

Points a connaitre :

- publier le site ne diffuse pas d'information personnelle te concernant dans ce depot, d'apres les fichiers verifies
- si tu ajoutes plus tard des variables sensibles, il faudra les stocker dans les Config Vars Heroku et pas dans le code
- le site charge aussi certaines donnees publiques externes, donc les visiteurs peuvent contacter ces services publics directement depuis leur navigateur
