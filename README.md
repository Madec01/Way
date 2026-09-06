# WAY — roguelite à salles

Un roguelite d'action 2D vue de dessus, dans le navigateur. Trois niveaux : ADMISSION, LA SERRE (débloquée après la salle 9 d'ADMISSION) et LA CONCESSION, un western minier (débloqué après LA SERRE), 9 salles chacun (préparation, pièges, combats, coffres, mini-boss, salles modulaires, boss revanche), en un seul fichier `index.html` (Canvas 2D, JS vanilla, Web Audio, localStorage) + un dossier `assets/` (sprites CC0, vos musiques).

## Jouer
Servir le dossier du dépôt (ex. `python3 -m http.server`) et ouvrir `index.html`. Ouvrir directement le fichier fonctionne aussi, mais certains navigateurs bloquent alors les musiques.

- ZQSD / WASD / flèches : déplacement · souris : visée · clic gauche : attaque (maintenir pour l'arc : charge)
- clic droit / Espace / Maj : compétence active (dash, bouclier…) · E : interagir (coffre) · Échap / P : pause · F1 : panneau debug (mode Test)
- **Tactile** (téléphone, tablette) : joystick à gauche pour se déplacer, visée automatique sur l'ennemi le plus proche ; à droite, TIR (maintenir), COMP. (compétence), E (coffre), II (pause). Option « tir automatique » dans le menu pause. Bouton ⛶ pour le plein écran.
- **Zoom caméra** : la caméra suit le joueur ; zoom réglable dans le menu pause (1× à 2×, 1,5× par défaut en tactile). Plein écran depuis le menu principal, la pause ou le bouton tactile.

## Musiques
Déposez dans `assets/music/` les fichiers `menu.mp3`, `hub.mp3`, `biome1-1.mp3` (salles 1-4), `biome1-2.mp3` (salles 6-8 ; sans lui `biome1-1.mp3` reprend là où elle s'était arrêtée) et `boss1.mp3` (salles 5 et 9), puis `biome2-1.mp3` / `biome2-2.mp3` / `boss2.mp3` pour le biome suivant, etc. Noms en minuscules (GitHub Pages distingue la casse). Fichier absent : musique générative. Détails dans `assets/music/README.md`.

Après un changement de piste, lancer `python3 dev/analyze_music.py` (dépend de `librosa`) : il écrit `assets/music/tempo.json` (BPM, premier temps, tonalité) que le jeu lit pour caler la **salle du tempo** sur la musique. Sans ce fichier, la salle bat sur un métronome interne à 120 BPM.

## Objets au sol et apparence
Bourses, arme d'essai (une par palier), allié temporaire et reliques d'une salle tombent des élites ou sont posés au sol. Le Passeur commence nu et s'habille avec ses greffes jusqu'au chevalier complet. Détails dans `CONTENT.md` §19.

## Défis de salle
Salle 2 : salle aléatoire avec un défi garanti ; salle 6 : un défi peut s'ajouter (capture de zone, sol qui s'effondre, séquence d'interrupteurs, lumières coupées, chrono). Détails dans `CONTENT.md` §18.

## Salle du tempo
La salle 7 de chaque palier joue en rythme : compte à rebours sur une mesure, pièges qui frappent sur les temps, ennemis qui n'attaquent que sur les temps (noires en vague 1, croches ensuite) avec un voyant qui bat, vagues qui entrent sur le premier temps d'une mesure, porte qui s'ouvre sur la mesure. Tirer ou lancer sa compétence sur un temps donne +25 % (jusqu'à +50 % en série), une note de la gamme du morceau et un combo affiché ; jamais de malus hors rythme. Bonus d'XP à la fin selon le nombre d'actions en rythme, et « sans fausse note » si aucun coup reçu. Détails dans `CONTENT.md` §20.

## La musique respire
Sons accordés sur la tonalité de la piste en cours (ramassages, interface, coffre, fin de salle, level-up, compétences), cascade de ramassage qui monte le long de la gamme. Vie sous 30 % : la musique s'étouffe et un cœur bat de plus en plus vite. Ralenti du temps : la bande freine. Frénésie : légère accélération. Entrée de boss : la musique coupe à la fin de la mesure, un souffle, puis le morceau de boss part sur son premier temps. Changement de piste sur la mesure, reprise calée sur un temps. Salle vidée : filtre fermé qui se rouvre en 4 s. Mort : la bande ralentit et descend, puis le hub. « Tape stop » sur les paliers de combo ≥ 10, les changements de phase de boss et ses grosses attaques sous 30 % de vie.

## Boss en rythme
Les boss (salles 5 et 9) jouent par phrases de 4 mesures : petites attaques sur les temps forts (puis sur les temps 1 et 3 sous 60 % de PV, chaque temps sous 30 %), une mesure d'annonce, la grosse attaque sur le temps fort de la dernière mesure, puis le boss « souffle » (faiblesse active) jusqu'à la phrase suivante. Sous 30 % les phrases passent à 2 mesures. La revanche de la salle 9 joue décalée d'un demi-temps. Une attaque libre hors rythme : un coup de pied si on colle le boss. Partition de la phrase dans le HUD, anneau de phrase autour du boss, bonus « en rythme » du joueur actif.

## Menu, hub et histoire
Le menu principal et le hub sont joués sur une scène d'attraction : le sujet, piloté par le bot, combat des ennemis des deux paliers derrière l'interface. Le menu se navigue au clavier (flèches, Entrée) ou à la souris. Les deux écrans battent avec `menu.mp3` : titre, cartouche, bouton principal, portrait et crédits pulsent sur chaque temps (temps fort plus marqué), et une onde part du centre de la scène à chaque mesure. Sans musique, ils battent à 120 BPM.

## Modes
- **Normal** : sauvegarde locale, 1 sujet et 2 armes débloqués, économie normale.
- **Test** : tout débloqué, passifs au maximum, choix de la salle (1 à 9) et du niveau de départ sur l'écran de préparation, panneau debug (difficulté 0,5× → 3×, saut de salle, multiplicateurs XP/crédits, rareté forcée, invulnérabilité, spawn d'ennemi/piège, hitboxes, scores en direct, écran de test audio, autoplay).

## Harness de test
Dans la console : `await __autoplay({ seed: 42, timeScale: 20, render: false, weapon: 'weapon_pistol', skill: 'skill_dash', difficulty: 1 })`
renvoie les stats de la run (salle atteinte, niveau, kills, dégâts subis, temps par salle, cause de fin).

## Développement
Les sources sont dans `dev/` (un fichier par module) et assemblées par `node dev/build.js` en `index.html`. Contenu déclaratif : `dev/content.js` (schéma dans `SCHEMA.md`). Documents : `PLAN.md`, `LORE.md`, `CONTENT.md`, `ASSETS.md`, `CREDITS.md`, `TEST-REPORT.md`.
