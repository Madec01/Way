# WAY — roguelite à salles

Un roguelite d'action 2D vue de dessus, dans le navigateur. Deux paliers : ADMISSION et LA SERRE (débloquée après la case 9 d'ADMISSION), 9 salles chacun (préparation, pièges, combats, coffres, mini-boss, salles modulaires, boss revanche), en un seul fichier `index.html` (Canvas 2D, JS vanilla, Web Audio, localStorage) + un dossier `assets/` (sprites CC0, vos musiques).

## Jouer
Servir le dossier du dépôt (ex. `python3 -m http.server`) et ouvrir `index.html`. Ouvrir directement le fichier fonctionne aussi, mais certains navigateurs bloquent alors les musiques.

- ZQSD / WASD / flèches : déplacement · souris : visée · clic gauche : attaque (maintenir pour l'arc : charge)
- clic droit / Espace / Maj : compétence active (dash, bouclier…) · E : interagir (coffre) · Échap / P : pause · F1 : panneau debug (mode Test)
- **Tactile** (téléphone, tablette) : joystick à gauche pour se déplacer, visée automatique sur l'ennemi le plus proche ; à droite, TIR (maintenir), COMP. (compétence), E (coffre), II (pause). Option « tir automatique » dans le menu pause. Bouton ⛶ pour le plein écran.
- **Zoom caméra** : la caméra suit le joueur ; zoom réglable dans le menu pause (1× à 2×, 1,5× par défaut en tactile). Plein écran depuis le menu principal, la pause ou le bouton tactile.

## Musiques
Déposez dans `assets/music/` les fichiers `menu.mp3`, `hub.mp3`, `biome1.mp3` (salles 1-4 et 6-8) et `boss1.mp3` (salles 5 et 9), puis `biome2.mp3` / `boss2.mp3` pour le biome suivant, etc. Fichier absent : musique générative. Détails dans `assets/music/README.md`.

## Objets au sol et apparence
Bourses, arme d'essai (une par palier), allié temporaire et reliques d'une salle tombent des élites ou sont posés au sol. Le Passeur commence nu et s'habille avec ses greffes jusqu'au chevalier complet. Détails dans `CONTENT.md` §19.

## Défis de salle
Salles 2, 3, 6 et 7 : un défi peut s'ajouter à la salle (capture de zone, sol qui s'effondre, séquence d'interrupteurs, lumières coupées, chrono). Détails dans `CONTENT.md` §18.

## Menu, hub et histoire
Le menu principal et le hub sont joués sur une scène d'attraction : le sujet, piloté par le bot, combat des ennemis des deux paliers derrière l'interface. Le menu se navigue au clavier (flèches, Entrée) ou à la souris.

## Modes
- **Normal** : sauvegarde locale, 1 sujet et 2 armes débloqués, économie normale.
- **Test** : tout débloqué, passifs au maximum, panneau debug (difficulté 0,5× → 3×, saut de salle, multiplicateurs XP/crédits, rareté forcée, invulnérabilité, spawn d'ennemi/piège, hitboxes, scores en direct, écran de test audio, autoplay).

## Harness de test
Dans la console : `await __autoplay({ seed: 42, timeScale: 20, render: false, weapon: 'weapon_pistol', skill: 'skill_dash', difficulty: 1 })`
renvoie les stats de la run (salle atteinte, niveau, kills, dégâts subis, temps par salle, cause de fin).

## Développement
Les sources sont dans `dev/` (un fichier par module) et assemblées par `node dev/build.js` en `index.html`. Contenu déclaratif : `dev/content.js` (schéma dans `SCHEMA.md`). Documents : `PLAN.md`, `LORE.md`, `CONTENT.md`, `ASSETS.md`, `CREDITS.md`, `TEST-REPORT.md`.
