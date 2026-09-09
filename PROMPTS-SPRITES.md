# Prompts PixelLab — personnages et compagnons

Ce fichier sert à commander les planches d'animation. Il suit la règle des autres prompts du projet :
**un prompt global de style**, puis **un prompt court par animation**. Le global se recolle tel quel à
chaque fois, le court change seul.

---

## 0. Ta question d'abord : le 32×32, ça va ?

**Pour les animaux : oui, parfait.** Uno est en 32×32 et il tombe juste.

**Pour les humains : non, reste en 48×48.** Ce n'est pas une question de qualité mais de cohabitation.
Mesuré sur ce que tu as déjà livré :

| | case | dessin dans la case | à l'écran (×2) |
|---|---|---|---|
| **Martin** | 48×48 | 19 × 44 px | **88 px de haut** |
| **Uno** | 32×32 | 30 × 26 px | **52 px de haut** |
| personnage standard du jeu | — | — | 75 px de haut |

Un humain dessiné dans une boîte de 32 fait au mieux ~28 px de haut, soit **56 px à l'écran** : il serait
plus petit qu'Uno n'est long, et nettement plus petit que Martin. Deux corrections possibles, aucune bonne :

- l'afficher en ×3 (96 px) — la taille redevient juste, mais ses pixels font 3×3 quand ceux de Martin font
  2×2. Deux grains différents dans la même salle, ça se voit immédiatement ;
- l'afficher en ×2,75 — taille juste, grain juste, mais échelle non entière : le dessin devient flou.

Donc : **48×48 pour tout ce qui est humain, 32×32 pour tout ce qui est animal.** C'est exactement ce que tu
as fait spontanément pour Martin et Uno, il n'y a rien à changer.

Un chat sera plus petit qu'un chien dans la même boîte de 32 : c'est le dessin qui porte la différence de
taille, pas la case. Ne réduis pas la case pour un petit animal.

---

## 1. Contraintes techniques (les mêmes pour tout)

- **Fond transparent.** Pas de damier, pas de sol, pas d'ombre portée — le jeu dessine l'ombre lui-même.
- **Cases carrées et identiques**, lues de gauche à droite puis de haut en bas. 3×3, 2×2, 4×4 ou une
  simple bande horizontale : je devine la grille tout seul, tu n'as rien à déclarer.
- **Même case et même position des pieds entre toutes les animations d'un même personnage.** C'est la seule
  règle qui casse quelque chose si elle n'est pas tenue : le personnage sauterait d'un clip à l'autre.
- **Le personnage occupe toute la hauteur de la case**, sauf une marge de 1 à 3 px sous les pieds. Je mesure
  cette marge et je pose les pieds au sol tout seul, mais moins il y a de vide, plus le dessin est grand.
- **Vue de profil (est).** L'ouest est l'est retourné, je m'en occupe. Le nord et le sud sont facultatifs.

**Nombre d'images conseillé** — tu as fait 9 partout, c'est bien, mais tu peux descendre :

| Animation | Images | Ce que ça donne à l'écran |
|---|---|---|
| repos | 4 à 9 | boucle de 0,7 à 1,5 s |
| marche | 6 à 9 | boucle de 0,5 à 0,75 s |
| tir | 4 à 6 | 0,3 à 0,4 s, joué une fois |
| ramasse | 4 à 6 | 0,3 à 0,5 s, joué une fois |
| mort | 6 à 9 | 0,75 à 1,1 s, se fige sur la dernière |
| attaque (animal) | 3 à 5 | 0,2 à 0,35 s, joué une fois |
| blessé (animal) | 2 à 4 | 0,2 à 0,4 s, joué une fois |

**Nommage** : `<nom><stade>_<clip>.png`, par exemple `martin1_walk.png`, `uno_attack.png`. Le nom n'a aucune
importance pour le jeu (c'est l'emplacement où tu déposes le fichier qui décide du clip), mais ça m'évite de
te demander lequel est lequel quand tu m'envoies un zip.

---

## 2. Personnages — prompt global

À coller en tête à chaque fois, en remplaçant seulement la ligne `Character:` :

```
32-bit pixel art game sprite, 48x48 pixel canvas, side view facing right,
full body from head to feet, transparent background, no ground shadow,
no outline, soft cel shading with 3 to 4 tones per material,
warm natural palette, readable silhouette at small size,
character fills the full height of the canvas with 2 pixels of empty space below the feet,
consistent height and foot position across every frame.

Character: <une phrase — qui c'est, sa carrure, ses cheveux, ses vêtements>
```

Exemple de la ligne `Character:` pour Martin premier stade :
`bearded man with messy brown curly hair, glasses, bare chest, blue boxer shorts, barefoot`

### Un prompt court par animation

| Clip | Prompt à ajouter sous le global |
|---|---|
| **repos** | `Animation: idle. 9 frames. Subtle breathing, chest rising and falling, slight head bob, weight on both feet. Feet stay planted in the exact same spot in every frame.` |
| **marche** | `Animation: walking cycle. 9 frames. Full stride loop moving right, arms swinging opposite to legs, slight vertical bob. Body stays centered in the canvas, the character walks in place.` |
| **tir** | `Animation: attack. 6 frames. Wind-up, strike forward to the right, recovery back to neutral. Last frame matches the idle pose.` |
| **ramasse** | `Animation: pick up. 5 frames. Crouch down, reach toward the ground in front, stand back up. Last frame matches the idle pose.` |
| **mort** | `Animation: death. 9 frames. Stagger backward, fall to the ground, come to rest lying down. The last frame is the final resting pose and must read clearly on its own.` |

> Le détail qui compte : « **Last frame matches the idle pose** » sur le tir et le ramassage. Ces deux clips
> se jouent une fois puis rendent la main au repos ; si la dernière image ne ressemble pas au repos, on voit
> un saut à chaque coup.
>
> Et sur la mort : « **the last frame is the final resting pose** », parce que le jeu s'y fige. Une dernière
> image à mi-chute donnerait un corps arrêté en l'air.

---

## 3. Compagnons — prompt global

```
32-bit pixel art game sprite, 32x32 pixel canvas, side view facing right,
full body from head to paws, transparent background, no ground shadow,
no outline, soft cel shading with 3 to 4 tones,
warm natural palette, readable silhouette at small size,
animal stands on the bottom of the canvas with 1 pixel of empty space below the paws,
consistent size and foot position across every frame.

Animal: <une phrase — l'espèce, la robe, la taille, un signe distinctif>
```

Exemple pour Uno : `medium short-haired dog, orange and white coat, floppy ears, standing on all fours`

### Un prompt court par animation

| Clip | Prompt à ajouter sous le global |
|---|---|
| **repos** | `Animation: idle. 9 frames. Standing, breathing, tail moving slightly, occasional ear twitch. Paws stay planted in the exact same spot in every frame.` |
| **marche** | `Animation: walking cycle. 9 frames. Four-legged trot moving right, tail up, slight vertical bob. Body stays centered in the canvas, the animal walks in place.` |
| **attaque** | `Animation: attack. 5 frames. Lunge forward to the right, bite or strike, return to standing. Last frame matches the idle pose.` |
| **blessé** | `Animation: hurt. 4 frames. Flinch backward, ears flat, recover. Last frame matches the idle pose.` |

Pour un animal qui vole (chouette, abeille), remplace dans le global
`animal stands on the bottom of the canvas with 1 pixel of empty space below the paws`
par `animal hovers in the middle of the canvas, wings spread`, et dans la marche
`Four-legged trot` par `Hovering flight cycle, wings beating`.

---

## 4. Ce que je ferais à ta place, dans l'ordre

**Le plus rentable d'abord.** Chaque ligne suppose la précédente faite.

1. **Repos + marche** pour chaque nouveau personnage et chaque nouvel animal. C'est le minimum pour exister
   en jeu, et 90 % du temps d'écran. Un personnage qui n'a que ça est déjà parfaitement jouable.
2. **Tir** pour les personnages. C'est ce qu'on fait le plus souvent après marcher, et sans lui rien ne
   montre qu'on frappe.
3. **Attaque** pour les animaux qui se battent (Uno, Tanuki). Uno mord toutes les mesures sans que ça se
   voie pour l'instant — c'est le manque le plus visible de ce qui est déjà en jeu.
4. **Mort** pour les personnages. Ça se voit rarement, mais c'est le moment qui marque.
5. **Ramasse** et **blessé**. Du confort. À faire en dernier, ou jamais.

**Ce que je ne ferais pas tout de suite** : le nord et le sud. Trois vues par personnage, c'est trois fois le
travail pour un gain qu'on ne remarque qu'en s'arrêtant pour regarder. Si tu t'y mets un jour, commence par
le **repos de dos** — c'est la vue qu'on a le plus souvent sous les yeux, puisqu'on monte beaucoup.

**Un conseil de fabrication** : génère le **repos en premier**, garde-le, et donne-le comme référence pour
les autres clips. C'est ce qui tient la promesse « même taille, mêmes pieds, même silhouette » d'un clip à
l'autre — et c'est cette cohérence-là, bien plus que le nombre d'images, qui fait qu'une animation a l'air
juste en jeu.

---

## 5. Ce qui est déjà en jeu

Martin, Gabriel et Jean ont leurs cinq planches ; Uno, Choupi, Tanuki et ORI leurs quatre. Tout le monde est en jeu.

Deux choses apprises en les intégrant, qui valent pour la suite :

- **PixelLab rend 7 images dans une grille 3 × 3**, quel que soit le nombre demandé : les deux dernières cases sont vides. Le jeu les ignore maintenant tout seul, tu n'as rien à faire — mais c'est pour ça que « 9 frames » dans le prompt ne donne pas 9 images.
- **Les trois silhouettes tombent à 86-88 px de haut** sans qu'on ait eu à les retoucher, et les pieds au même pixel. C'est le prompt global qui tient ça (« character fills the full height of the canvas with 2 pixels of empty space below the feet ») : garde-le tel quel pour les chats, en changeant seulement la ligne `Animal:`.

## 6. Les trois chats

Leurs rôles sont écrits et leurs fiches posées dans le contenu ; je n'ai pas encore vérifié qu'ils tournent
en jeu (le duo Choupi + Tanuki demande une mécanique à deux animaux, que je finis). Pour les prompts, la
ligne `Animal:` à mettre dans le global :

| | ligne `Animal:` | son rôle en jeu |
|---|---|---|
| **Choupi** | `small round cat, cream and ginger fur, big eyes, short legs` | ramasse à ta place |
| **Tanuki** | `stocky cat with raccoon-like markings, dark mask around the eyes, thick striped tail` | charge en ligne droite |
| **ORI** | `slender elegant cat, dark grey fur, bright piercing eyes, long tail` | désigne une cible |

Choupi et Tanuki sont inséparables en jeu : ils arrivent et repartent ensemble, et comptent pour un seul
choix. Pense-les côte à côte quand tu les dessines — ils seront toujours vus ensemble.
