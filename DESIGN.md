# PleinSpot — système visuel

Mode : **outil** (on vient faire une tâche : trouver le carburant le moins cher près d'un point).
Scène : un conducteur en France, téléphone en main avant de partir ou garé, souvent en plein jour ; ou à son bureau pour préparer un trajet. → Thème clair, contrastes forts.

Monde : **la signalisation routière française**. Il prête quatre choses, et seulement celles-ci : la typo, la palette, la densité et un geste signature. La mise en page, la navigation et les contrôles restent ceux qu'on connaît (panneau + carte sur desktop, carte + tiroir sur mobile, champs, boutons, onglets standards).

## Geste signature : les lattes du totem

Partout où un prix apparaît, il est composé comme une latte de totem de station : rectangle à petits rayons, chiffres Barlow Condensed, dernier chiffre (le millième) plus petit et surélevé.

- Couleur de la latte = position du prix dans la zone affichée, pour le carburant choisi : vert (tiers bas), jaune (tiers moyen), rouge (tiers haut).
- Latte noire = un autre carburant que celui choisi (comme sur les vrais totems).
- Latte au contour seul = prix de plus de 7 jours, à vérifier.
- Double filet blanc intérieur = prix le plus bas de la zone (le filet intérieur des panneaux).
- Les carburants portent leur identifiant européen (norme EN 16942), celui du pistolet et de la trappe : rond = essence (E5, E10, E85), carré = gazole (B7), losange = gaz (LPG).

## Palette (couleurs RAL de signalisation, ajustées écran)

| Rôle | Valeur | Usage |
|---|---|---|
| `blue` | `#0A4A8F` (RAL 5017) | bandeau du panneau, action principale, sélection, focus |
| `blueDeep` | `#073A72` | survol / appui de `blue` |
| `blueTint` | `#E7EEF7` | ligne sélectionnée, survol de liste |
| `blueLight` | `#5C8FD6` | seconde série d'un graphique, à côté de `blue` (plus bas de la zone) |
| `green` | `#008351` (RAL 6024) | prix bas, « ouvert » |
| `yellow` | `#F7B500` (RAL 1023), texte noir | prix moyen |
| `red` | `#CC0605` (RAL 3020) | prix élevé, « fermé », erreurs |
| `black` | `#16181B` (RAL 9017) | texte principal, lattes neutres |
| `grey` | `#4E5452` (RAL 7043) | texte secondaire |
| `greyLight` | `#6B716F` | métadonnées (contraste ≥ 4,5) |
| `rule` | `#D9DCDB` | filets |
| `ground` | `#F4F5F4` | fond de page, seconde couche neutre |
| `white` | `#FFFFFF` | surfaces |

Le jaune ne porte jamais de texte blanc. Le rouge est réservé aux prix élevés, au fermé et aux erreurs.

## Typographie

- **Barlow** (400, 500, 600) : toute l'interface. Corps 16 px, contrôles ≥ 14 px, métadonnées 13 px minimum.
- **Barlow Condensed** (600, 700) : prix, identifiants carburant et marque. Rien d'autre.
- Échelle fixe : 13 · 14 · 16 · 19 · 23 · 28 · 44. Chiffres tabulaires pour toute donnée.
- Casse normale partout. Pas d'étiquette au-dessus d'un titre.

## Formes, espace, profondeur

- Rayons : 3 (lattes), 6 (champs, boutons, panneaux flottants), 10 (haut du tiroir mobile). Pas de pilules, sauf le rond de l'identifiant essence.
- Espacements : 4 · 8 · 12 · 16 · 24 · 32. Groupes serrés, séparations généreuses.
- Surfaces posées sur le panneau : filets, pas d'ombre. Surfaces flottantes au-dessus de la carte : ombre décalée et floue, pas de filet.
- Pas de cartes dans des cartes, pas de tuiles « gros chiffre + petit label », pas d'emoji ni de glyphes à la place d'icônes.

## Mouvement

150 à 220 ms, sortie exponentielle, uniquement pour un changement d'état (tiroir, sélection, survol). Rien au chargement.

Un seul moment animé, parce qu'il porte une vraie nouvelle : quand un prix change en direct, sa latte clignote trois fois (halo bleu), puis garde une petite flèche ▲/▼ pendant 30 minutes ; la liste affiche l'écart en centimes. Rien ne bouge quand rien n'a changé.

## Usage quotidien

On ouvre, on voit le prix le moins cher autour de soi, à jour, et on y va : c'est ce que montre le premier écran. L'historique est la deuxième couche, à un geste : le sélecteur de période du résumé de zone (« Aujourd'hui » par défaut) et la section « Historique » de la fiche station.

## Graphiques

Un seul type : l'évolution d'un prix jour par jour, sur 1 mois, 3 mois ou 1 an.

- La série qui compte en `blue`, ses points de comparaison après elle : `blueLight` (plus bas de la zone), `greyLight` (moyenne de la zone, moyenne nationale). Trois séries au plus.
- Le prix d'une station en marches (il tient jusqu'au changement suivant), les moyennes en lignes. Traits de 2 px, point de fin de 8 px cerclé de blanc, valeur du dernier jour à droite en Barlow Condensed.
- Grille horizontale en filets `rule` de 1 px, pleins. Repères au premier du mois (au lundi sur 1 mois), l'année à la place de janvier. Jamais de second axe.
- Une phrase au-dessus du graphique dit ce qu'il montre (« Prix en hausse de 12 ct en 3 mois, de 2,249 € à 2,373 € »), des phrases en dessous donnent les repères (plus bas, plus haut, écart avec la zone). Pas de tuile « gros chiffre ».
- Réticule à la souris, au doigt et aux flèches du clavier ; l'infobulle flotte (ombre, pas de filet) et lit toutes les séries du jour, valeur d'abord. Légende toujours visible, tableau des valeurs à la demande.
- Pendant un rechargement, le graphique précédent reste à l'écran, atténué. Rien ne s'anime à l'arrivée des données.
- Le prix le plus haut de la zone n'est pas tracé : quelques stations d'autoroute écraseraient l'échelle.

## Écarts de prix

Exprimés en centimes (« 4,6 ct de moins que la moyenne »), l'économie sur un plein en euros (« 2,30 € sur 50 L »).
