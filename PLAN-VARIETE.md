# WAY — la variété des paliers (chantier 12)

Le 12 septembre 2026, l'auteur : « j'ai beaucoup aimé la variété du biome désert et j'aimerais que ce soit pareil pour les autres ». Trois agents ont analysé le jeu sous trois angles — le game design des salles, les sprites et bibliothèques récupérables, la fabrication des salles par le moteur. Ce document en garde le diagnostic et le détail salle par salle ; `PLAN-CHANTIERS.md` (chantier 12) en garde le découpage en séances.

## 1. Le diagnostic — pourquoi la Concession « sent » plus que les autres

**Les quatre paliers partagent les mêmes gabarits de salles.** Les salles de même type ont été copiées d'un palier à l'autre avec les mêmes coordonnées d'obstacles : préparation (4 piliers + 1 bloc central), salle aléatoire (4 blocs), combat + pièges (4 blocs aux coins, tourniquet au centre, deux damiers, tourelles, une nappe), mini-boss et revanche (4 blocs 2×2), modulaire (1 bloc 2×3), tempo (4 blocs **et la même partition**), combat + pièges + modulaire (4 blocs aux coins). Le sol est le même tileset partout (`Sprites.drawFloor`, `TILES.floor`), seule la **teinte** change ; `biome_1` n'a même pas de `palette` (il tombe sur le défaut codé) et le drapeau `palette.sand` du palier 3 n'est lu nulle part.

**Ce que la Concession a de plus**, posé à la main par-dessus le gabarit (`dev/content3.js`) :
1. un `kind` sur presque tous les obstacles (cactus, wagon, rocher, tonneau, caisse) dans 7 salles sur 9 — ailleurs `Room.dress` tire un accessoire **au hasard** par obstacle, deux piliers symétriques peuvent être une cuve et une poubelle, la scène ne se lit pas ;
2. du décor posé à la main (crânes, rails en ligne, affiche wanted à l'entrée du boss) dans 6 salles — ailleurs semé au hasard ;
3. une salle unique spectaculaire et précoce, le train (le seul module habillé du jeu, `look: 'wagon'`) ;
4. du terrain (l'entonnoir de roche, salle 3) ;
5. des ennemis « accessoires » : le baril qui roule, le scorpion, le crotale, et des teintes sable sur les autres — ADMISSION et LA SERRE n'ont **ni teinte ni accessoire** ;
6. des pièges à identité propre (ids, noms, **couleurs** western) — ADMISSION n'a pas de `color` (tout en rouge), LA SERRE **n'a pas un seul piège à elle** : elle pose des tourniquets et tourelles d'hôpital, en rouge, dans une serre ;
7. quatre vagues avec élite dès la salle 1, des apparitions des deux côtés.

**Ce qui manque à chacun** (✔ employé · ◐ partiel · ✗ absent) :

| Levier | ADMISSION | SERRE | CONCESSION | SÉRAIL |
|---|---|---|---|---|
| Kinds posés en scènes | ✗ | ✗ | ✔ | ◐ (le bazar est nu) |
| Déco à la main | ✗ | ✗ | ✔ | ◐ |
| Terrain (eau, boue, muret, claustra) | ✗ | ◐ (eau, pont) | ◐ (roche) | ◐ (muret, claustra) |
| Salle unique habillée | ◐ | ◐ | ✔ | ◐ |
| Pièges propres (ids, couleurs) | ◐ | ✗ | ✔ | ✔ |
| Pièges posés / définis | 5 / 11 | 5 / 11 | 5 / 10 | 5 / 10 |
| Ennemis teintés ou accessoires | ✗ | ✗ | ✔ | ✔ |
| Décor animé (`anims`) | ✔ (4 salles) | ✗ | ✗ | ✗ |
| Objet sur trajet (`mover`) | ✗ | ✗ | ✗ | ✗ |
| Partition de tempo propre | ◐ | ✗ | ✗ | ✗ |

La boue `,` du terrain n'est utilisée nulle part ; le muret `n` et le claustra `:` seulement au Sérail ; le lore d'ADMISSION (« guichets devenus couverts, rails de brancards, sols humides ») décrit trois choses que le moteur sait faire et que le palier ne pose pas.

**Côté sprites** (`dev/15_sprites.js`, `assets/`) : un seul sol et une seule brique de mur pour les quatre paliers ; la planche 0x72 v1.7 est livrée mais jamais chargée (docteur en blouse, leviers, boutons, limaces, escaliers) ; des frames de la v1.4 jamais dessinées (fontaines murales animées, cuve qui coule `goo`, tentures, bouches d'aération, fioles, caisse, crâne, mimic) ; 10 SVG western absents de `PROP_DEFS` ; 4 accessoires orientaux définis mais jamais posés ; 11 animaux de `pets/` orphelins (rat, papillon, corbeau, crabe…). Des packs CC0 sont atteignables par des miroirs GitHub (Ninja Adventure ; Kenney Roguelike Caves & Dungeons, Indoors, Tiny Town ; 0x72 16×16 v4 ; tuiles DCSS), avec pour chacun un chemin vérifié.

**Côté moteur** (`dev/40_room.js`, `35_terrain.js`) : la géométrie d'une salle est fixe par index (le `floorSeed` ne dépend pas de la graine) ; l'atelier a un établi Niveau mais ne sait pas charger une salle existante ni poser un `kind` ou une déco ; `check-terrain.js` ne vérifie que les plans de terrain, pas les obstacles ; le bot n'a pas de pathfinding (pas de poches concaves, couloir de la porte libre, brèches de 3 tuiles). Une génération procédurale à la rot.js n'est pas adaptée à une arène de 24×13 (verdict des agents : un générateur maison de 200 lignes suffit, et seulement si on veut de la variation d'une partie à l'autre).

## 2. Les règles pour écrire une salle

Une idée par salle, qu'on pourrait écrire dans le bandeau d'entrée. Le couloir de la porte (x ≥ 21, y 5-7) et l'entrée (1,6) libres ; jamais de tourelle en (23,6) ; les apparitions fixes sur du sol praticable ; des brèches de 3 tuiles dans les murets (le bot n'a pas de pathfinding) ; la couleur d'un piège est celle de son corps, la télégraphie reste `PAL.alert` ; pas plus de 7 flous par image (`perf.js`) ; `spawncheck.js`, `biomes.js`, `cadence.js` et `node dev/check-terrain.js` gardent les salles.

Courbe de tension d'un palier : 1 apprendre · 2 une surprise · 3 pression + récompense · 4 respiration ou changement de nature · 5 boss · 6-8 montée avec un pic visuel · 9 revanche.

## 3. Salle par salle

### ADMISSION (`dev/content.js`, `room_b1_*`) — bleu froid / orange sodium

Pièges à colorer (`color` sur chaque définition) : dalles gris acier, nappe vert hôpital pâle, balayage et rayon bleu néon, tourelle et bouche orange.

1. **L'accueil** — deux guichets en travers (murets `n` x 8-13 y 3 et x 10-15 y 9) : on ne les enjambe pas, les balles oui. Kinds `locker` ×4, `bin` au centre ; déco `cross`, `hazard`, `pack`. Le damier central et les 4 `light` restent (`cadence.js`).
2. **La salle d'attente** — quatre bancs en muret `n` de 4 tuiles (x 4-7 et 16-19, y 3 et 9) : on tourne autour, les Rôdeurs s'y cassent le bond. Kinds `bin` ×4.
3. **Le bloc opératoire** (coffre) — deux scies sur rail (`trap_rail` (7,3) w 8 et (7,9) w 8, phase 1,6) encadrent la table, le scialytique tourne au centre ; une zone de dalles en moins. Kinds `drip` ×2, `tank` ×2.
4. **Le sous-sol** — des flaques d'eau `~` (2×2, 3×2) entre les piliers qui brillent dans les faisceaux du défi. Kinds `pipe` sur les 10 piliers, `tank` sur les 2×3 ; déco `valve`, `cog`, `battery`.
5. **Les cuves** — 4 × `tank`, déco `hazard` ×2, rien d'autre (une salle de boss reste lisible).
6. **La ventilation** — déjà la salle la plus vivante ; kind `fuel` sur le bloc central, rien de plus.
7. **Le gyrophare** (tempo, coffre) — `trap_gyrophare` en (11,6) sur le temps fort (`beats: { every: 4 }`) à la place du damier central, une bouche remplacée par `trap_diffuseur`. Kinds `bin` ×4.
8. **Le couloir des brancards** — deux brancards fous (`trap_rail` (4,2) w 8 et (12,10) w 8) remplacent les damiers, le rotor entre les deux. Kinds `locker` ×4.
9. **Éclairage de secours** — les néons sont morts, seul l'orange bat (4 `light` `#ff9a3c`, `base: 0.25`). Kinds `tank` ×4.

### LA SERRE (`dev/content2.js`, `room_b2_*`) — vert / ambre

Préalable : dix pièges à elle (mêmes kinds, ids, noms et couleurs neufs) : `trap_lianes` (rotor 3 bras, vert), `trap_epines` (dalles `#b7ff7a`), `trap_spores` (nappe mauve), `trap_seve` (bouche ambre), `trap_arroseur` (balayage `#9fd8ff`), `trap_treillis` (grille vert sombre), `trap_cracheuse` (tourelle « Plante cracheuse »), `trap_brumisateur` (diffuseur `#8fd8d0`), `trap_lampe_uv` (rayon mauve), `trap_tondeuse` (scie sur rail). Noms courts (le bandeau du tempo les cite), sans mot banni (`vocabulaire.js`).

1. **La rivière** (existe) — kinds `planter` ×4, `fountain` au centre ; déco `flower`, `mushrooms` ; un `mover` `sprite: 'butterfly'` sur six points au-dessus de l'eau, un par temps fort — le premier objet mobile du jeu ; deux `light` vertes.
2. **Les rangs de culture** — deux rangées de `bush` (x 5, 8, 11, 14, 17 sur y 3 et y 9), l'arroseur (`trap_arroseur` vertical, période 5 s) balaie les allées, deux cracheuses aux murs. On se met à l'abri du jet derrière les buissons.
3. **La pépinière** (coffre) — quatre carrés de terreau en boue `,` (4×2 aux coins), déco `seedling`/`sprout` dedans, kinds `flask` ×4. Premier emploi de la boue ; les Ronces qui bondissent l'ignorent.
4. **Les cuves** (modulaire) — de l'eau `~` en disque autour de chaque pivot de rotor : dans l'eau on est lent, sous le bras on est frappé. `fountain` au centre, deux `bouncer` `bubbling-flask`.
5. **Les souches** — kinds `roots` ×4, `trap_plant` au centre, spores.
6. **Tempo — la brume** — `trap_brumisateur` au centre sur le 2, lianes qui tournent en mesure, épines aux coins. Kinds `planter` ×4.
7. **Le sas de brumisation** (coffre) — deux rideaux de vapeur en claustra `:` (x 8-9 et 14-15, centre ouvert) : on ne voit pas ce qui arrive, rien n'arrête les balles ; active la ligne de vue du Pollinisateur. Mur coulissant, spores, cracheuses.
8. **Le pont** (existe) — trois grenouilles (`bouncer` `frog`) qui sautent sur le temps fort ; `fountain` sur le bloc central.
9. **Serre chaude** — 4 `light` ambre lentes, kinds `roots` ×4.

### LE SÉRAIL (`dev/content4.js`, `room_b4_*`) — or / violet

Cinq pièges orphelins à poser : braséro, lanterne à braises, derviche de lames, rai de soleil, moucharabieh.

1. **La cour au tapis** — un tapis (`carpet` ×4) de l'entrée à la porte entre les colonnes, `lantern` ×2, 4 `light` or/violet.
2. **La lanterne** — une seule lanterne au centre (`trap_braises` (11,6)) qui crache une couronne de braises toutes les 3 s ; déco `lantern`, `spices`.
3. **Le hammam** (modulaire, coffre) — quatre bassins d'eau `~` 3×2 aux coins, les tentures glissent entre eux ; déco `teapot`, `chalice`.
4. **Les terrasses** (existe) — `trap_rai` vertical le long des claustras (11,0) : le terrain moucharabieh et le piège du même nom enfin réunis ; l'encens retiré.
5. **La salle du trône** — 4 `brazier` à la place des colonnes, 4 `light` orange qui battent.
6. **Le bazar** — un kind par allée sur les 23 étals nus (y 2 `drapes`, y 4 `basket`, y 8 `jar`, y 10 `vase`), déco dans les allées (`spices`, `teapot`, `gems`, `lamp`, `chalice`, `incense`). Le coffre caché reste à x ≤ 15 (`biomes.js`).
7. **Tempo — le sablier** — `trap_derviche` au centre, deux `spinner` `sands-of-time` qui se retournent à chaque mesure (`step: π`). Kinds `brazier` ×4.
8. **Le chemin de braises** — deux braseros roulants (`trap_brasero` (3,2) w 8 et (13,10) w 8), la zone sûre entre les deux. Kinds `brazier` ×4.
9. **Les meurtrières** — deux rais de soleil en y 3 et y 9 (à vérifier au banc qu'un piège ne blesse pas le boss), lumières violettes.

### LA CONCESSION (`dev/content3.js`) — pousser plus loin

- **Salle 7, le moulin** (modulaire, coffre) — un `spinner` `windmill` (×2,2) au mur du haut qui tourne d'un quart de tour par temps, un `mover` `vulture` qui traverse sur la mesure.
- **Salle 6, la poudrière** — kinds `barrels` ×4, `trap_barbeles` au sol (6,3) w 12 h 7, `trap_detente` en travers ; sol cyclique gardé.
- **Salle 4, le saloon** — un duel : deux `trap_revolver` muraux ; déco `saloon`, `wanted` ; des sables mouvants en boue `,` (la paire de passifs s'appelle déjà « Sable mouvant »).
- **Salle 8, tempo** — `trap_gatling` au centre sur le temps fort (le piège emblème, jamais posé).
- **Train** — kinds `crate`/`barrel` sur les 4 blocs, déco `wanted`.
- Les 10 SVG western absents de `PROP_DEFS` (mine d'or, lasso, revolver, rails, mine, tête de cheval, botte, wagon de charbon, caisse, désert) : une ligne chacun pour les rendre posables.

## 4. Les sprites et les sources

**Sols et murs par palier** (16 px → 48 px = une tuile, la grille 24×13 ne change pas) : hôpital = carrelage pâle (Ninja Adventure `Interior/TilesetInteriorFloor.png`) et murs métal (DCSS `lab-metal0`, ou briques grises Kenney Roguelike Caves & Dungeons) ; serre = terre et bordure d'herbe (NA `TilesetFloor.png`), mousse (DCSS `moss`), briques brunes à lianes ; sérail = mosaïque (NA InteriorFloor, DCSS `mosaic`), grès (NA `TilesetDesert.png`) ; Concession = sable uni 3 tons (Kenney). Branchement : `TILESETS[biomeId]` à la place du `TILES` unique, `tile()` multi-planche, et enfin dessiner `goo`, `banner`, les fontaines murales animées, `wall_hole` sur le mur du haut selon le palier. Coût : ≈ 80 Ko d'assets, `index.html` inchangé.

**Miroirs vérifiés** (CC0, `curl` + signature PNG) : Ninja Adventure (pixel-boy & AAA) `raw.githubusercontent.com/jackfruitgames/chickeeen/main/assets/Tilesets/…` (Desert, Nature, VillageAbandoned, Element, Interior, InteriorFloor, Floor, FloorDetail, Field, Pipes…) et monstres/FX `raw.githubusercontent.com/wojciech-bilicki/ZeldaCourse/main/Assets/Sprites/…` ; Kenney Roguelike Caves & Dungeons, Roguelike Indoors (`media.githubusercontent.com/media/series-ai/jam-ready-assets/main/…`, **passer par `media.` : `raw.` renvoie un pointeur LFS**), Tiny Town, Tiny Dungeon (le miroir d'ASSETS.md est mort) ; 0x72 16×16 Dungeon Tileset v4 (torches animées, coffres, caisses, sols humides) ; DCSS `crawl/crawl/master/crawl-ref/source/rltiles/dngn/…` (32 px, à réduire, CC0 pour la majorité). Écartés : rot.js (donjons multi-salles, 100 Ko), Cainos / Mystic Woods / Sprout Lands (pas CC0), les tuiles « industrial » trouvées (Craftpix, non libre).

**Accessoires par palier** (E = existe, R = à récupérer, F = à fabriquer) — hôpital : lit (R Kenney Indoors), brancard à roulettes (F, l'ennemi « baril » du palier), paillasse et armoire (R), potence (E `medical-drip`), tuyauterie (R NA `Pipes`), cuve (R/E), leviers et boutons (E 0x72 v1.7), fioles (E v1.4), caisse (E), bouche d'aération (E), rat (E `pets/rat`) et œil volant (R NA `Eye`) comme ennemis, docteur en blouse (E v1.7). Serre : buissons et touffes (R NA Nature), ruines moussues (R VillageAbandoned), rochers moussus, bacs de culture (R `Field`), champignons, lianes, cuve qui coule (E `goo`), conduit d'eau animé (E), grenouille (E), tonneau moussu, herbes au sol, plante marcheuse (R `Bamboo`), limace (E v1.7 / R `Larva`), papillon (E). Sérail : palmiers (R Desert), statue de lion, puits, étals à auvent, jarres, kilims (R Indoors), colonne brisée (R Caves), ossements, buisson sec, tentures (E `banner`), brasero animé (R 0x72 v4), oasis (R), esprit (R `Spirit`), serpent (R `Snake`), taupe (R `Mole`), mimic (E). Ne pas charger les planches entières : découper chaque objet en `assets/sprites/pixel/<clé>.png` (16, 32 ou 48 px) puis `node dev/index-pixel.js` ; le mécanisme existant (`_v2` = variété, F1 → Accessoires) fait le reste.

**Bibliothèques** : `fast-simplex-noise` 2D (Unlicense, 2,9 Ko, à convertir en IIFE `dev/12_noise.js`) pour varier le sol par plaques (mousse, sable en coulées, taches d'humidité) semées par `floorSeed` ; en option `wavefunctioncollapse` (MIT, 16 Ko) pour des mosaïques du sérail. Rien pour l'animation ni les particules : `Particles` et l'établi Animations suffisent ; des presets de FX en planches (fumée, feuilles) se branchent par `addSheet`.

Crédits à ajouter : Ninja Adventure Asset Pack — Pixel-boy & AAA — CC0 ; Kenney — Roguelike Caves & Dungeons, Roguelike Indoors, Tiny Town — CC0 ; 0x72 — 16×16 Dungeon Tileset v4 — CC0 ; Dungeon Crawl Stone Soup — tuiles — CC0 (si retenues) ; fast-simplex-noise — Unlicense.

## 5. Le moteur : gabarits, validation, et plus tard des pièces

- **Un plan ASCII par salle** (13 lignes × 24, majuscule = obstacle typé, minuscule = déco, caractères du terrain inchangés) avec une légende par palier : une salle s'écrit et se lit d'un coup d'œil, comme les plans de terrain. Compilateur dans un nouveau `dev/37_layouts.js` (`compilePlan`, `validate`, `resolve`), appelé depuis `Room.create` à côté de `Terrain.compile` ; `check-terrain.js` étendu aux obstacles et à la règle « chemin de largeur 2 » (le bison fait 28 px).
- **Un test `salles.js`** : pour chaque salle de chaque palier, la porte est atteignable depuis le départ avec un chemin de largeur 2, aucune apparition dans un obstacle, rien dans le couloir de la porte ni sur l'entrée, un carré 5×5 libre autour du boss, ≤ 40 rectangles ; plus une **galerie** (`galerie.js`, hors batterie) qui capture chaque salle de chaque palier pour que l'auteur regarde tout d'un coup.
- **L'atelier** : charger une salle existante dans l'établi Niveau, palette des `kind` du palier, brosse de déco, export du plan complet.
- **Plus tard, si on veut de la variation d'une partie à l'autre** : des pièces composables (un coin de cuves, une allée de rails, un bassin) assemblées selon la graine, par bande gauche/centre/droite, validées par les mêmes règles, avec repli sur la version à la main ; RNG dérivé de la graine sans toucher aux tirages existants (les graines des meilleures parties rejouent pareil) ; `Debug.gotoRoom` avec une graine fixe pour les tests. Pas de rot.js.
