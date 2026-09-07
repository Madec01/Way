# Sprites d'accessoires

Un PNG déposé ici **remplace** l'icône correspondante : il est repris tel quel, sans le traitement
(bords nets / contour / ombrage) appliqué aux icônes SVG. C'est ici qu'atterrissent les sprites dessinés
à la main ou générés.

## Nommage

Le nom de fichier doit être celui de l'accessoire, c'est-à-dire une clé de `PROP_DEFS` (`dev/15_sprites.js`) :
`cactus.png`, `amphora.png`, `ancient-columns.png`…

Plusieurs essais du même accessoire cohabitent : `cactus.png`, `cactus_v2.png`, `cactus_v3.png`.
Tous sont chargés ; le jeu affiche celui retenu dans le comparateur.

## Après chaque dépôt

```
node dev/index-pixel.js   # reconstruit index.json et signale les noms inconnus
node dev/build.js
```

## Choisir entre les versions

En mode Test, **F1 → Accessoires** : les versions de chaque accessoire sont montrées côte à côte, à la
taille qu'elles ont en salle, le panneau en bas de l'écran pour que la salle reste visible. Un clic
choisit ; le choix est retenu dans le navigateur (`localStorage`, clé `way.props`) et s'applique tout de
suite. « Copier la sélection » sort la liste des fichiers retenus — ensuite on ne garde que ceux-là dans
le dépôt et on renomme en version 1.

## Contraintes

- Fond transparent, **pas d'ombre portée ni de socle** : le jeu dessine déjà une ombre elliptique sous
  chaque obstacle, une deuxième donnerait un double contact au sol.
- 32 × 32 recommandé (48 × 48 pour les pièces larges : chariot, colonnes, tentures, porte).
- Vue de face orthogonale, base de l'objet sur le bord bas de l'image.
