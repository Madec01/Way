# Sprites d'accessoires

Un PNG déposé ici **remplace** l'icône correspondante : il est repris tel quel, sans le traitement
(bords nets / contour / ombrage) appliqué aux icônes SVG. C'est ici qu'atterrissent les sprites dessinés
à la main ou générés.

## Nommage

Le nom de fichier doit être celui de l'accessoire, c'est-à-dire une clé de `PROP_DEFS` (`dev/15_sprites.js`) :
`cactus.png`, `amphora.png`, `ancient-columns.png`…

Plusieurs versions du même accessoire cohabitent : `cactus.png`, `cactus_v2.png`, `cactus_v3.png`.
**Toutes servent de variété** : chaque obstacle d'une salle tire la sienne à partir de sa position, donc deux
cactus côte à côte ne sont pas le même dessin. Le tirage est déterministe : la même salle est toujours
meublée pareil. Élaguer = supprimer les fichiers qu'on ne veut plus.

## Depuis PixelLab

Mettre **le nom du fichier visé au tout début du prompt**, suivi d'une tabulation :

```
cactus.png	tall saguaro cactus with two arms, dusty green, pale spines
```

PixelLab le recopie dans `metadata.json`, ce qui permet d'installer les exports sans les renommer :

```
node dev/install-sprites.js <dossier des .zip>   # range, numérote les variantes, reconstruit l'index
node dev/build.js
```

Le nom du zip ne sert à rien (PixelLab enlève les tirets : `wooden-crate` y devient `woodencrate`), c'est le
prompt qui décide. Un accessoire inconnu est signalé, jamais installé au hasard.

## Après un dépôt à la main

```
node dev/index-pixel.js   # reconstruit index.json et signale les noms inconnus
node dev/build.js
```

## Choisir entre les versions

En mode Test, **F1 → Accessoires** : les versions de chaque accessoire sont montrées côte à côte, à la
taille qu'elles ont en salle, le panneau en bas de l'écran pour que la salle reste visible. Un clic
**impose** cette version partout, le temps de la regarder (retenu dans `localStorage`, clé `way.props`).
Le bouton « Variété » rend la main au tirage aléatoire. « Copier la sélection » sort la liste des fichiers,
pratique pour dire lesquels garder.

## Contraintes

- Fond transparent, **pas d'ombre portée ni de socle** : le jeu dessine déjà une ombre elliptique sous
  chaque obstacle, une deuxième donnerait un double contact au sol.
- 32 × 32 recommandé (48 × 48 pour les pièces larges : chariot, colonnes, tentures, porte).
- Vue de face orthogonale, base de l'objet sur le bord bas de l'image.
