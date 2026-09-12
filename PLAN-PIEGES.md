# WAY — les pièges (chantier 13)

Le 12 septembre 2026, l'auteur, après la variété des paliers : « on va refaire le même processus mais pour les pièges du jeu ». Trois agents ont regardé le sujet sous trois angles — le game design des pièges dans le genre, les sprites, presets et bibliothèques récupérables, et ce que le moteur de WAY sait déjà faire. Ce document garde le diagnostic, les règles, l'architecture et le détail piège par piège ; `PLAN-CHANTIERS.md` (chantier 13) tient le découpage en séances et l'avancement.

## 1. Le diagnostic — des pièges qu'on subit, jamais qu'on utilise

**WAY a déjà beaucoup.** Dix mécaniques moteur (`dev/34_traps.js` : balayage, tourniquet, grille, bouche de feu, dalles à pointes, nappe de gaz, scie sur rail, tourelle fixe, émetteur, rayon mural), quarante et un habillages avec un nom, une couleur et une phrase par palier, cent douze poses dans trente salles. Une télégraphie solide (annonce en pointillé qui bat à la croche, un son par famille, jamais deux fois le même avertissement), une partition musicale par piège (`beats`), une salle du tempo qui arme une famille par vague, des règles de justice codées (sas et couloir de la porte libres, damier à case sûre, grille annoncée trois temps, `dangerAt` pour le bot), un bonus d'expérience « sans dégât », des greffes qui parlent aux pièges (Isolant, Pied sûr, Sol instable, `traps_heal`).

**Ce qui manque, en une phrase :** un piège de WAY répond à « quand je passe », jamais à « à qui il sert » ni à « comment je l'éteins ». Dans le genre (Spelunky, Enter the Gungeon, Hades, Nuclear Throne, Noita, Dead Cells), la ligne de partage est *le piège blesse-t-il aussi les ennemis ?* Quand oui, un piège est un outil ; quand non, c'est un obstacle. Tous ceux de WAY sont des obstacles.

| Manque | Le constat dans le code | Poids |
|---|---|---|
| **Aucun piège ne blesse les ennemis** | `Trap.hit()` n'appelle que `Combat.hitPlayer` ; aucune ligne de `32_enemies.js` ne lit `room.traps` ; les balles de piège portent `trap: true` mais le drapeau n'est lu nulle part ; la règle « les ennemis subissent les pièges à 50 % » (CONTENT.md §13) n'a jamais été codée. Seule la zone sûre modulaire blesse les deux camps. | Le plus lourd |
| **Un seul déclencheur, le temps** | Trois horloges (`cycle`, `cycleHits`, `shotState`), rien d'autre : pas de plaque, pas de proximité, pas de « touché par une balle », pas d'interrupteur (le défi `switches` ne parle pas aux pièges). | Pas de choix « quand » |
| **Rien de destructible ni de désamorçable** | `disabled` existe (salle du tempo) mais rien ne le pose en jeu ; un piège n'a ni PV ni corps de collision ; les balles du joueur ne le voient pas. | Pas de choix « comment » |
| **Un seul effet, les dégâts** | Pas de poussée (`pl.kvx` n'est utilisé par aucun piège), pas de ralentissement paramétrable (le gaz pose un drapeau binaire ×0,7 : le « −35 % » de l'encens est faux), pas de feu qui reste, pas de tuile détruite, pas d'aveuglement. | Pas de combo |
| **Aucun trésor gardé** | Les coffres sont offerts en fin de salle 3 et 7, jamais derrière un piège. | Pas de risque choisi |
| **Rien ne parle à rien** | Un piège ne peut ni en déclencher un autre, ni enflammer une flaque, ni suivre un mur coulissant, ni être porté par un ennemi (le piège à loup du coyote est codé en dur dans `Combat.killEnemy`). | Peu de surprise |
| **Huit pièges définis, jamais posés** | balayage, nappe, rayon (Admission), treillis, lampe de culture, tondeuse (Serre), wagonnet (Concession), moucharabieh (Sérail) : ils ne vivent que dans la palette de l'atelier. Deux mécaniques portent le jeu : la tourelle (38 poses) et les dalles (23) ; balayage, grille et rayon sont quasi absents. | Contenu dormant |
| **Le chemin sûr est vérifié à la main** | `dangerAt` sert au bot, pas à prouver qu'un chemin sans danger relie le sas à la porte à tout instant. | Justice non testée |
| **Aucun test ne vérifie qu'un piège blesse** | `etape0`, `bat`, `perf`, `spawncheck`, `salles` couvrent l'horloge, les sources, les flous et la géométrie ; rien sur les dégâts, `hitCd`, les projectiles de piège, la cohérence `dangerAt` ↔ `hit`, le déterminisme. | Filet absent |

**Dettes repérées au passage** : `syncBeat` recalculé trois fois par piège et par image ; `slow` et `lifetime` déclarés mais pas lus (sauf l'émetteur) ; `hitOnce`, `alternate`, `groups`, `tickRate`, `dps`, `thickness` jamais lus ; la télégraphie des dalles et du gaz n'est pas en `PAL.alert` (corail codé en dur, `#9f6`) ; `Room.finishRoom` et le bot testent un type de salle `TRAP` qui n'existe plus ; `gridLines()` recalculé trois fois par image ; les dalles dessinent neuf triangles par tuile par image.

## 2. Ce que le genre nous apprend

**Une typologie.** Par déclencheur : temps (les dalles d'Isaac, les arbalètes d'Élysée, tout WAY), plaque (Brogue, le Tartare d'Hades, les boutons d'Isaac qui *désarment*), proximité (les flèches de Spelunky, déclenchées aussi par les trésors et les ennemis), coup ou tir (les barils de Nuclear Throne, les tonneaux de Gungeon, les œufs d'Élysée amorcés par le joueur *ou par les autres pièges*), ennemi (tout ce qui pèse déclenche chez Brogue et Spelunky). Par effet : dégâts, zone qui dure, statut (filet, sommeil, sable mouvant), déplacement (le totem de Spelunky 2 repousse), obstruction (fosses que la roulade saute), dérivation (alarme qui appelle du monde). Par lecture : télégraphé (la norme en temps réel), rythmique (le cycle *est* le télégraphe), caché (abandonné par DCSS en 0.23 : « faciles à éviter, dangereux seulement pour qui est déjà presque mort »).

**Les règles de justice communes** : jamais sans avertissement (une couleur d'alerte réservée, un son par famille, un armement de 0,5 à 1 s) ; toujours un chemin sûr ; jamais dans le sas ; une lecture par piège (Shattered Pixel Dungeon a donné un sprite unique à chaque piège *pour ça*) ; respecter la mobilité (la roulade de Gungeon franchit fosses et pièges, la ruée de WAY est invulnérable et saute les murets) ; une famille nouvelle par étage ; deux ou trois familles actives par salle au plus.

**Comment ils s'intègrent** : en couloir (coûte du temps, pas de la vie, si on lit), aux coins (le centre reste libre, le piège punit qui se réfugie — WAY), en gardien de trésor (le coffre posé sur les pointes, la pépite sur le piège à ours), en salle dédiée pour apprendre seul, puis combiné avec des ennemis — et le combo n'a d'intérêt que si le piège touche les deux camps ou coupe le déplacement. Hades majore les dégâts des pièges sur les ennemis ; Brogue les rend proportionnels aux PV max, donc utiles contre les gros.

**Pourquoi Vampire Survivors n'en a pas** : tout son budget d'attention va sur un seul verbe, « où se tenir » ; un piège volerait la seule décision du joueur. Leçon : peu de pièges dans les vagues denses (salles 7 et 9), mais des gros.

**Les erreurs classiques** : injuste (sans télégraphe, dans le sas, pendant une animation forcée) ; bruit (trop de familles, des couleurs qui recouvrent l'alerte) ; ignoré (trop lent, trop faible — test : si le bot ne perd jamais de vie dessus et ne dévie jamais, le piège ne joue pas) ; caché et punitif ; gratuit (ne garde rien, ne change pas le combat : un impôt sur le temps).

**Le fil rouge retenu** : un bon piège pose trois questions — *quand je passe*, *à qui il sert*, *comment je l'éteins*. WAY répond superbement à la première.

## 3. Les règles pour écrire un piège

- **Un piège appartient à un palier** : id, nom, `color`, phrase ; sa couleur est celle de son corps, la télégraphie est en `PAL.alert` et jamais dans la couleur d'un ennemi ; l'or dit la mesure et jamais « ça va frapper » ; ce qui vit bat en `Beat.pulse`, ce qui est bâti ne bat pas.
- **Télégraphie avant tout dégât** (`telegraph > 0` obligatoire pour un effet qui blesse), un `warn()` sonore par coup, une forme lisible en une image.
- **Un chemin sûr à tout instant** entre le sas et la porte ; jamais de piège dans le sas (colonnes 0-2) ni dans le couloir de la porte (21-23) ; jamais de tourelle en (23,6) ; un piège n'est jamais un obstacle (le bot n'a pas de pathfinding).
- **Il touche les deux camps** : par défaut un piège nouveau blesse les ennemis (×1,5, boss ×0,25) ; un piège qui n'épargne les ennemis ne le fait que pour une raison écrite dans sa phrase.
- **Il répond à une question** : passer maintenant ou attendre, y attirer un ennemi, le déclencher ou l'éteindre. Un piège à réponse unique (« évite ») ne se pose plus.
- **Un par salle en salle 2, combiné ensuite** ; deux ou trois familles actives par salle au plus ; la salle du tempo les récapitule une par une.
- **Perf** : pas plus de 7 flous par image, aucun `shadowBlur` dans un rendu de piège (`Halo` seulement), pas de repeinte du sol par image.
- **Rythme** : l'horloge est choisie par piège (`beats` → temps musical), l'ancien format `{ period, active }` reste supporté, un coup est un instant comparé à `lastShot`, tout tirage passe par `RNG`, un état persistant est daté (`firedAt`, `brokenAt`) pour survivre au retour en arrière de l'atelier.
- **Données** : un nombre d'équilibrage a un nom dans `05_balance.js`, une mécanique nouvelle est une entrée de table et jamais un `case`, pas de logique dans `content*.js`, un mot par notion en français (`vocabulaire.js` balaie `CONTENT.traps`).
- **Compagnons** : un compagnon ne meurt jamais ; si un piège le touche un jour, c'est par `Pets.hurt`, et jamais le compagnon « personne ».

## 4. Les sprites, les packs, les presets et les bibliothèques

**Le constat** : depuis le chantier 12, sols, murs, accessoires et ennemis sont des sprites 16 px ; les pièges sont le seul élément entièrement vectoriel (disques unis, rectangles pointillés, lignes floues). Ils ressemblent à des calques de mise au point posés sur un décor pixel art, et les lignes floues longues (tourniquet, grille 20×11, rayon de 26 tuiles) ne se mettent pas en cache.

**L'avis retenu : le vecteur pour ce qui frappe, le sprite pour ce qui est posé.** La télégraphie reste vecteur (une ligne pointillée qui devient pleine, une couleur qui pulse à la croche, un cercle qui grandit : net à toute taille, calé au tempo, sans équivalent en sprite pour un rayon de 26 tuiles). Le corps de l'objet passe en sprite : un disque uni ne dit pas « scie », une roue crantée tournée par `ctx.rotate` le dit.

| Mécanique | Choix | Détail |
|---|---|---|
| dalles à pointes | **sprite** | quatre images `floor_spikes_anim` de 0x72 (dalle nue → pointes qui percent → sorties) ; un liseré d'alerte 1 px en annonce |
| scie sur rail | hybride | rail en sprite peint une fois dans le cache du sol, corps en sprite tourné (roue, wagonnet, braséro), halo cacheable sur le corps |
| tourelle | hybride | socle sprite, canon vecteur tourné vers la visée, trait pointillé (déjà là) |
| émetteur | hybride | socle sprite (lanterne, orbe, buse), le cadran de charge reste vecteur : c'est la meilleure télégraphie du jeu |
| bouche de feu | **sprite** | gargouille murale à deux états (sèche, crachant), projectile sprite (bombe à mèche, jet de flamme) |
| nappe de gaz | hybride | source sprite (vasque, flaque, brûle-encens) ; la nappe reste vecteur mais le dégradé est pré-rendu une fois par rayon, jamais recalculé par image |
| balayage | vecteur | deux sprites d'ancrage aux extrémités (buses, geyser) |
| tourniquet | hybride | moyeu sprite (ventilateur, souche, roue de chariot, orbe), bras vecteur |
| grille | hybride | au repos des barreaux, barbelés ou claustras en sprites répétés ; en phase active les lignes lumineuses actuelles |
| rayon mural | hybride | source sprite (torche, lampe, meurtrière), rayon vecteur |

Règle perf associée : aucun `shadowBlur` sur une géométrie qui change à chaque image ; les lignes longues passent par un dégradé pré-rendu ou par deux traits (large à 25 %, fin à 100 %).

**Les sprites trouvés, tous CC0, accès et licence vérifiés** (planches téléchargées et regardées ; coordonnées en colonne, ligne de tuile) :

- **Déjà dans nos packs** : 0x72 Dungeon Tileset II — `floor_spikes_anim` (v1.4 x 16, y 176, 4 images de 16 px : le seul vrai piège animé qu'on possède), la bombe à mèche 3 images (v1.7 x 288-320, y 320), boutons et leviers 2 états (v1.7 y 208), le trou (v1.4 x 96, y 144), les trous de mur `wall_hole` (48, 32) et (48, 48) ; Kenney Roguelike Caves & Dungeons — barreaux (0-3, 7-9), braséros à trois états (12-14, 17), trous au sol (19, 4) et (19, 9), poteaux et piquets (12, 16) et (6-7, 3) ; nos accessoires PNG (machine, souche, champignons, caisse, tonneau, pot rond, plante carnivore, ventilateur) pour les socles.
- **Kenney Tiny Dungeon** (16 px, sans gouttière, sur `media.githubusercontent.com/media/SAE-Geneve/UnityCourse---PCG/main/Assets/Packs/kenney_tiny-dungeon/Tilemap/tilemap_packed.png`, licence CC0 dans le même dépôt) : la gargouille murale sèche et crachant (7-8, 0-1), vasque et flaque (7-8, 2-3), torche murale (5, 2), **les wagonnets (6-7, 4) et la boucle de rails (8-11, 5-7)**, barreaux (5-6, 6), crochets de visée (0, 5).
- **Kenney Pixel Platformer Industrial Expansion** (18 px, à rogner d'un pixel ou à dessiner à 54 px, sur `media.githubusercontent.com/media/series-ai/jam-ready-assets/main/kenney-pixel-platformer-industrial-expansion/2D/platformer/Tilemap/tilemap_packed.png`, CC0) : la planche d'usine qui manquait à l'Admission — **gyrophares rouge et bleu (0-1, 4)**, roues crantées (4, 5-6) pour les scies, tête de presse (3, 4), bacs d'acide (12-13, 3), cuves à bandes jaunes (8-11, 5-6), tuyaux et buses (11, 0-4), panneaux de danger (2, 4) et (10, 2), chaînes et crochets (7-8, 0-4).
- **Kenney Pixel Platformer** (18 px, `raw.githubusercontent.com/teodoroooo/guardiao-dos-biomas/main/kenney_pixel-platformer/Tilemap/tilemap_packed.png`, CC0) : double pointe (8, 3), **bouton-plaque relevé et enfoncé (8-9, 7)**, levier à trois positions (4-6, 3), piquets et drapeaux (5-6, 5), (13-14, 5).
- **Ninja Adventure** (CC0) : `TilesetDungeon.png` — bloc à pointes blanches (4, 1), **gros bouton-plaque (0-1, 1)**, trappe fermée et ouverte (2-3, 1), grille d'évacuation (5, 1), orbes sur socle (2-7, 2), interrupteurs à bascule (3-6, 3) ; et les bandes d'effets `FX/Elemental/` (miroir `Tim-olr/a-mindfull`, branche master) — **RockSpike** (9 images de 60 px : des pieux de roche qui jaillissent du sol, l'animation rêvée des Épines), Flam (jet de flamme), Explosion (9 × 40), Plant (fouets de ronce pour les lianes), WaterPillar (geyser pour l'arroseur), Thunder (arcs pour le défibrillateur).
- **Écartés** : DCSS `dngn/traps/` (17 fichiers CC0 vérifiés mais peints en 32 px : bons seulement pour des icônes de carnet), Kenney 1-Bit (monochrome), 0x72 v1 (pas de licence dans le miroir), Pixel Dungeon (GPL), Tuxemon (CC-BY-SA).
- **Sans source libre en 16 px** : la mâchoire du piège à ours, la lame de pendule, la herse, la boule roulante, la dalle qui tombe animée — à produire avec PixelLab (`PROMPTS-SPRITES.md`, 32×32, fond transparent, sans ombre).

**Bibliothèques : rien à embarquer.** Le jeu est vanilla et sans build ; une bibliothèque n'entre que si c'est un seul fichier. Vérifié sur npm : bezier-easing (1,4 Ko, MIT) se recopie en une fonction dans `00_core.js` si on veut des courbes de télégraphie « montée lente, coup sec » ; proton-engine (64 Ko, MIT) est la seule vraie bibliothèque de particules Canvas sans build mais ferait doublon avec `Particles` et le compteur de flous ; l'émetteur de particules de LittleJS (300 lignes, MIT) est copiable pour des étincelles par tuile (scie, braséro). kontra, rot-js, tween.js, SAT.js, Phaser, Excalibur : hors sujet.

**Presets de pièges dans les jeux open source** : à **copier** (licence permissive) — Barony (BSD-2) : la courbe des pieux « sortie sèche en cinq pas, 1,2 s dehors, retour mou avec gravité » (`actspeartrap.cpp`), la tourelle à flèches qui se vide après dix tirs (`actarrowtrap.cpp`), la boule roulante (`actboulder.cpp`). À **s'inspirer seulement** (copyleft) — Brogue : la plaque de pression *câblée* qui déclenche un autre mécanisme de la salle (notre déclencheur `link`) et ses tourelles ; DCSS : des pièges à effet d'état plutôt qu'à dégâts (filet, alarme, téléport) ; Shattered Pixel Dungeon : la taxonomie visuelle neuf couleurs × sept formes pour lire un piège au sol d'un coup d'œil, et son catalogue de trente pièges.

**Pièce par pièce** (les 41 pièges, avec le sprite candidat, sa source et le coût S / M / L) : le tableau complet est dans le rapport de l'agent, gardé dans `dev/agents/pieges_assets.md`. L'ordre de bataille : les dalles à pointes avec 0x72 (quatre pièges, S) ; puis gyrophare, dynamite, braséro, wagonnet, les quatre où le sprite change tout ; puis rails et roue pour toutes les scies ; puis la gargouille, la bombe et la flamme pour les bouches ; puis les socles des émetteurs et les sources des gaz ; enfin les barreaux au repos des grilles. Les lasers restent en vecteur avec la passe perf sur `Halo.line`.

## 5. Le moteur : déclencheur × effet × corps

Le principe du chantier 11 (« une entrée de table, jamais un `case` de plus ») appliqué aux pièges. Un piège devient l'assemblage de trois choses, chacune une table de données :

```js
const TRAP_TRIGGERS = {
  timer:   { … },  // cycle / partition / tireur : tout l'existant
  press:   { … },  // plaque : joueur ou ennemi sur le corps → armé (firedAt = rt), un cycle, réarmement ou jamais
  near:    { … },  // proximité : dist < radius → annonce puis coup
  shot:    { … },  // une balle du joueur le touche (Projectiles.update, branche joueur) → part ou casse
  link:    { … },  // un autre piège ou un interrupteur l'arme
  carried: { … },  // posé à la mort d'un ennemi (le coyote passe par la table)
};
const TRAP_EFFECTS = {
  zone:   { … },  // segment, rectangle, cercle : Combat.hitPlayer / hitEnemy × enemyMul (l'existant)
  shoot:  { … },  // Projectiles.spawn({ trap: true, hitsEnemies })
  push:   { … },  // kvx/kvy : 3 tuiles, sans dégât
  status: { … },  // slow (valeur lue), stun, root, blind
  burn:   { … },  // room.hazards (déjà géré pour les boss) : un feu qui reste
  hole:   { … },  // Challenge collapse : une tuile qui tombe
};
const TRAP_BODIES = { line, arc, grid, tiles, disc, rail, mount, beam, prop };  // prop = sprite PNG + halo
```

- **`TRAP_LEGACY`** traduit les dix `kind` actuels en triplets : les 41 définitions et 112 poses ne bougent pas, `etape0.js` (l'horloge par piège, le tourniquet sur la mesure) reste vrai à la lettre.
- **`Trap.update`** : `stage = TRIGGER.stage(this, rt)` → si `warn` : `warn(idx)` ; si `on` : pour chaque cible (le joueur, puis les ennemis si `enemyMul > 0`, puis les compagnons si `petsMul > 0`) `if (BODY.hits(this, target)) EFFECT.apply(this, target)`. Une `Map` de recharge par cible (0,5 s, comme `hazards.cd`), `!e.isBoss` ou `bossMul`.
- **`dangerAt`** = `TRIGGER.danger × EFFECT.weight` (1 pour un dégât, 0,4 pour une gêne : le bot n'a plus à se ruer devant une poussée). Une plaque qu'on déclenche soi-même n'a pas d'avenir lisible : elle renvoie le danger de l'effet *armé*, comme un tireur.
- **Blesser les ennemis** coûte `N_pièges × N_ennemis` tests de distance par image (10 × 60 = 600, négligeable devant `pointBlocked`). Les balles : `p.hitsEnemies` lu dans la branche ennemie de `Projectiles.update`, quinze lignes.
- **Casser** : `def.hp` + `Trap.body()` (cercle ou rectangle) + une boucle sur `room.traps` dans la branche joueur des projectiles → `break()` pose `disabled`, `brokenAt`, un voyant, un `Floaters 'event'` « désamorcé » ; réarmement après `rearm` s ou jamais. Un piège cassé n'est jamais un obstacle.
- **Parenté** : un `parent: { modular, dx, dy }` recalculé avant l'effet (un mur coulissant qui porte des pointes) ; **terrain temporaire** : un calque `room.gridFx` dessiné par `Terrain.render` comme le miroitement, jamais une repeinte du sol.
- **Déterminisme** : tous les déclencheurs lisent `rt` (temps de salle ou `Beat.t`), jamais `Time.now` sauf les rafales ; deux parties de même graine donnent les mêmes coups.
- **Le test `pieges.js`** : pour chaque mécanique, poser via `new Trap`, placer le joueur au point frappé à l'instant `on`, vérifier les PV et `hitCd` ; `dangerAt ≥ 0,5` sur ce point 0,25 s avant ; un ennemi dans la zone prend `× enemyMul`, un boss `× bossMul` ; une plaque non foulée ne frappe pas ; un piège cassé ne rend plus rien ; deux parties de même graine donnent le même nombre de coups reçus. Et **le chemin sûr prouvé** : pour chaque salle et chaque instant de 0 à 60 s par pas de 0,1 s, un parcours sur la grille avec `dangerAt() === 0` doit relier le sas à la porte — la garantie d'Isaac et de DCSS, automatisée dans `salles.js`.
- **L'atelier** : `KIND` étendu (dégâts, vitesse, rayon, motif, phase, déclencheur, effet), l'export reste un point fixe, un aller-retour atelier → contenu testé.

## 6. Les pièges nouveaux, palier par palier

Vingt-deux idées sont sorties de la recherche ; seize sont retenues ici, choisies pour qu'un piège au moins par palier réponde à chacune des trois questions. Colonnes : déclencheur · effet · ce que le joueur en fait · où · coût.

**ADMISSION — apprendre que les pièges se retournent**

| Piège | Déclencheur | Effet | Le joueur | Où | Coût |
|---|---|---|---|---|---|
| **Bonbonne d'oxygène** | tir, ou explosion voisine | explosion 110 px, deux camps, en chaîne (`Combat.explosion` existe) | la faire sauter au bon moment, ou la garder en réserve | 2-3 par salle de combat, jamais à moins de 3 tuiles d'une apparition | faible |
| **Défibrillateur** | plaque (joueur ou ennemi) | arc 0,6 s entre deux électrodes murales, blesse tout, étourdit les ennemis 1 s | attirer la Nuée sur la ligne et sauter sur la plaque | salle 3, l'arc coupe la salle entre les apparitions | moyen |
| **Brancard fou** | tir sur le brancard | un aller sur le rail, écrase ce qu'il croise, revient | une arme de couloir : le lancer quand la vague s'aligne | salle 8, le couloir des brancards | moyen |
| **Rideau de désinfection** | temps | nuage sans dégât : ennemis ×0,5 vitesse, joueur ×0,8 ; les rats y meurent | traîner la vague à travers | salle 6, sur le trajet du mur coulissant | faible |
| **Néon à bascule** | tir sur le boîtier, réarmable | inverse la parité de la grille | choisir ses lignes ; un ennemi mal placé s'y retrouve | salle 7, le boîtier est *derrière* la grille | faible |

**LA SERRE — le vivant mord des deux côtés**

| Piège | Déclencheur | Effet | Le joueur | Où | Coût |
|---|---|---|---|---|---|
| **Dionée** (la `trap_plant` existe déjà en obstacle) | proximité 1 tuile, joueur ou ennemi | claque 0,4 s après : 18 dégâts + entrave 0,6 s ; un petit ennemi est avalé, un gros retenu 2 s | passer en ruée ; faire courir les Ronces dedans | près du terreau (salle 3) où l'on est déjà lent | moyen |
| **Gousses éclatantes** | tir, ou maturité à 8 s | couronne de 8 graines, deux camps, repousse en 10 s | un émetteur qu'on déclenche *quand on veut* | trois aux angles de la rivière (salle 4) | moyen |
| **Vanne d'arrosage** | tir sur la vanne | un jet balaie la zone et **pousse** tout de 2 tuiles, sans dégât | envoyer les ennemis dans les épines ; casser un encerclement | salle 2, le jet pousse vers les épines | moyen |
| **Pollen soporifique** | temps musical | endort les ennemis 2 s (×2 dégâts reçus), ralentit le joueur ×0,7 | le meilleur moment pour frapper est le plus lent pour fuir | salle 7 (tempo), sur le 3 | faible |

**LA CONCESSION — la poudre, les rails, le duel**

| Piège | Déclencheur | Effet | Le joueur | Où | Coût |
|---|---|---|---|---|---|
| **Tonneaux en file** | tir, ou explosion voisine | chaîne d'explosions à 0,15 s, deux camps (`link`) | sacrifier la file pour une vague, ou la garder | salle 6 (poudrière), entre les fils | faible |
| **Fil de détente armé** | franchissement, joueur ou ennemi | déclenche les dynamites murales liées (éventail de 3) sur le fil | faire franchir le fil par le Baril ou le Coyote | salles 6 et 9 | moyen |
| **Aiguillage** | tir sur le levier | le wagonnet (jamais posé aujourd'hui) change de voie au prochain passage | choisir qui le wagonnet écrase | salle 7 (train) : une voie traverse les apparitions, l'autre le centre | moyen |
| **Cloche du saloon** | plaque, usage unique | appelle 4 ennemis **et** ouvre un coffre annexe | le trésor gardé : une vague contre une greffe | salle 4, la cloche garde un coffre visible | faible |

**LE SÉRAIL — lumière, huile, cages**

| Piège | Déclencheur | Effet | Le joueur | Où | Coût |
|---|---|---|---|---|---|
| **Dalles du Vizir** | plaque par case, ennemis compris | les pieux sortent sous qui marche, 0,3 s après (0,5 s pour le joueur) | mener la poursuite à travers : les poursuivants déclenchent | salles 6 et 8, le long des allées du bazar | moyen |
| **Flaque d'huile** | contact d'une jarre de naphte, d'un braséro, d'une braise | inerte (glisse ×1,15) puis **brûle 3 s**, deux camps | pousser la vague sur l'huile et attendre le braséro | salle 5, entre les braséros roulants | moyen |
| **Cage à oiseaux** | proximité, joueur ou ennemi | une cage tombe : entrave 0,8 s (joueur) ou 3 s (ennemi, cible fixe) | le filet de Brogue : capturer un Derviche | salles 2 et 7, trois cages sur le chemin large | moyen |

**Deux mécaniques de salle, tous paliers** : le **boîtier de désamorçage** (chaque piège fixe — grille, rayon, tourelle — a un boîtier à trois coups : touché, il se coupe 8 s puis revient ; on *paie* des tirs pour du calme) et le **sablier de salle** (un par salle de combat + pièges : le retourner d'un tir décale toutes les phases d'une demi-période ; on choisit la *phase* de la salle au lieu de la subir).

**Écartées pour l'instant** : le miroir de cuivre (rai réfléchi, fort), le puits de mine (terrain qui avale, fort), la gatling à retourner (tourelle qui change de camp, moyen mais peu lisible), la souche à lianes physique (le rotor existe, à voir en finition), l'encensoir à contretemps (à voir avec la salle du tempo).

**Et les huit pièges dormants** : le balayage, la nappe et le rayon de l'Admission, le treillis, la lampe de culture et la tondeuse de la Serre, le wagonnet de la Concession, le moucharabieh du Sérail sont posés à la séance B (le wagonnet à la séance C avec l'aiguillage), avec `enemyMul` : leur nature change avant leur pose.

## 7. Le plan — chantier 13 en quatre séances

Une séance = une session de travail, la batterie verte (52 tests, puis 53 avec `pieges.js`) et livrée sur `main`. Du moins risqué au plus risqué :

- **Séance A — le socle** : les tables déclencheur / effet / corps avec `TRAP_LEGACY` (comportement identique), les dettes payées (`syncBeat` en cache, `slow` et `lifetime` lus, télégraphie en `PAL.alert`, le type `TRAP` mort retiré, `gridLines` en cache), le test `pieges.js` écrit d'abord sur l'ancien code puis rejoué sur le nouveau, le chemin sûr prouvé dans `salles.js`. Le joueur ne voit rien changer, sauf l'annonce des dalles et du gaz enfin dans la couleur d'alerte. ≈ 300 lignes déplacées, 150 nouvelles.
- **Séance B — les deux camps** : `enemyMul` (1,5) et `bossMul` (0,25) dans `05_balance.js`, les balles de piège qui touchent les ennemis, les compagnons touchés à travers `Pets.hurt` (jamais le compagnon « personne »), le banc `normal.js` avant et après, `comportements.js` remesuré ; les huit pièges dormants posés. Le joueur voit : une Nuée qui traverse un tourniquet meurt, une tourelle abat ce qui passe devant. ≈ 100 lignes + contenu.
- **Séance C — le joueur décide** : les déclencheurs `press`, `near`, `shot`, `link`, les effets `push`, `status`, `burn`, un `dangerAt` par déclencheur, `hp` et le boîtier de désamorçage, `KIND` de l'atelier étendu ; les seize pièges de la section 6 écrits et posés, sprites des packs pour les corps (section 4). ≈ 300 lignes + contenu + assets.
- **Séance D — ce qui bouge et ce qui reste** : `carried` (le coyote passe par la table), `parent` sur module mobile, `room.gridFx` (l'huile qui brûle, la flaque qui gèle), le sablier de salle, la cloche et le coffre gardé, `check-terrain.js` et `salles.js` adaptés, la galerie des salles à pièges. ≈ 200 lignes.

**Fini quand** : chaque palier a au moins un piège par question (quand, à qui, comment) ; `pieges.js` et le chemin sûr prouvé sont verts ; le bot traverse chaque palier (`levels.js`) sans se coincer sur un piège ; le banc `normal.js` ne bouge pas de plus de 10 % ; l'auteur joue et dit qu'un piège lui a servi.
**Décisions à prendre** : les valeurs `enemyMul` / `bossMul` (1,5 / 0,25 proposés, mesurés au banc en B) ; garder ou non le bonus « sans dégât » quand une poussée compte comme un coup ; le sprite ou le vecteur par famille (section 4).
