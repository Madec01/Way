# WAY — Pièges : sprites libres, bibliothèques, rendu — rapport de prospection

Date : 12 septembre 2026. Contexte : `dev/34_traps.js` (877 lignes) dessine les 10 `kind` moteur en vecteurs Canvas (`Halo.line`, `createRadialGradient`, `setLineDash`, `shadowBlur`) ; 41 pièges déclarés dans `dev/content.js` (Admission, 11), `content2.js` (Serre, 10), `content3.js` (Concession, 10), `content4.js` (Sérail, 10) — `content5.js` n'en déclare aucun. `TILE = 48` (16 px × 3). Tout ce qui est cité ci-dessous a été téléchargé (ou testé en `curl`) depuis `raw.githubusercontent.com` / `media.githubusercontent.com` ; les images sont dans `scratchpad/pieges_packs/` (planches-contact annotées dans `pieges_packs/_view/`, coordonnées en **(colonne, ligne)** de tuile comme dans `TILESETS`).

---

## 1. Sprites de pièges existants et libres

### 1.1 Dans les packs déjà présents dans `assets/sprites/`

**0x72 Dungeon Tileset II** (local, CC0, `LICENSE.txt` présent) — le seul pack local qui a un vrai piège animé :

| Tuile | Fichier / coordonnées px | Images | Usage WAY |
|---|---|---|---|
| `floor_spikes_anim` | v1.4 : x 16, y 176, 16×16, **4 images** consécutives (pas 16) ; v1.7 : x 16, y 192 | 4 (dalle nue → pointes sorties, teinte cyan) | `spike_tiles` : Dalles à pointes (Admission), Dalles à pieux (Sérail). L'image 0 sert de dalle « repos », la 1 de télégraphe (pointes qui percent), 2-3 de phase active |
| `hole` | v1.4 x 96 y 144 | 1 | fosse / trou — pas de `kind` équivalent aujourd'hui, mais candidat pour une dalle « inerte » sous les scies ou une variante de dalle qui tombe |
| `bomb_f0..f2` | v1.7 x 288/304/320 y 320 | 3 (mèche qui crépite) | Dynamite (Concession) : projectile de `wall_fireball` remplacé par la bombe qui roule |
| `button_red/blue_up/down`, `lever_left/right` | v1.7 x 16→96 y 208 | 2 états chacun | plaques de pression / leviers de télégraphe (émetteurs, tourelle « armée ») |
| `wall_fountain` lave (rouge) | v1.4 x 64 y 16-48, 3 images en colonne (déjà utilisé par `TILESETS.fountain`) | 3 | Bouche de feu / Jarre de naphte : la gueule murale qui crache |

**Kenney Roguelike Caves & Dungeons** (`roguelikeDungeon_transparent.png`, local, CC0, pas 17) — pas de pointes ni de scie, mais :

| Tuile (col, lig) | Usage |
|---|---|
| Barreaux de fer (0-3, 7-9), barreaux cassés (1-3, 8-9) | Grille (Admission) / Barbelés / Moucharabieh : rails visuels d'une `laser_grid` au repos, les lignes lumineuses ne s'allumant qu'en phase active |
| Trous dans le sol (19, 4) gris et (19, 9) brun | fosse, base d'un émetteur enterré |
| Braséros (12, 17) allumé grande flamme, (13, 17) petite flamme, (14, 17) éteint | Braséro roulant (Sérail) — 3 états = idle / warn / on ; Lanterne à braises (`emitter`) |
| Piquets et cactus (4-7, 3-4), planches (10-11, 16-17), poteau (12, 16) | décor des Pièges à ours et du Fil de détente (poteaux d'ancrage) |
| Débris / étincelles (10-15, 10-14) | particules d'impact (déjà quasi-identiques aux `Particles` du jeu) |

**Ninja Adventure** (CC0 confirmé par le README du pack, cf. ASSETS.md § 0). Deux planches non encore importées, récupérées sur le miroir `jackfruitgames/chickeeen` et `Tim-olr/a-mindfull` (branche `master`, chemin `assets/world/blocks/set/Ninja Adventure - Asset Pack/…`) :

- `Backgrounds/Tilesets/TilesetDungeon.png` (192×64, 16 px, `raw.githubusercontent.com/jackfruitgames/chickeeen/main/assets/Tilesets/TilesetDungeon.png`, 200) : **(4, 1) bloc à pointes blanches** (1 image, pointes sorties, style Sérail/pierre claire), **(0, 1) et (1, 1) gros bouton rouge encadré** = plaque de pression, (0-1, 0) dalles à serrure, (2, 1)/(3, 1) trappe fermée / ouverte (dalle qui tombe !), (5, 1) grille d'évacuation, (2-7, 2) orbes sur socle (rouge (6, 2), orange (7, 2), lumineux (2, 2) : cœur d'un `emitter`), (3-6, 3) interrupteurs à bascule 2 états, (7, 3) cristal.
- `FX/Elemental/*/SpriteSheet.png` (bandes horizontales, hauteur 28-48 px, images de largeur non uniforme, à découper à la main) : `RockSpike` 540×48 (**9 images de 60 px : pieux de roche qui jaillissent du sol puis s'effritent** — exactement l'animation d'une dalle à pieux / d'Épines), `Flam` 200×30 (≈ 8 images de flamme qui monte et s'éteint), `Explosion` 360×40 (9 × 40, éclair blanc → boule orange → fumée), `Plant` 240×28 (fouets de ronce verts : Lianes, Tondeuse), `WaterPillar` 270×41 (geyser, 6 images de ≈ 45 px : Arroseur), `Thunder` 160×28 (arcs), `Water` 440×33, `Ice` 320×32, `Rock` 420×30. Vues dans `_view/na_fx.png`.

### 1.2 Packs CC0 récupérables sur GitHub (accès et licence vérifiés)

**Kenney Tiny Dungeon** (`media.githubusercontent.com/media/SAE-Geneve/UnityCourse---PCG/main/Assets/Packs/kenney_tiny-dungeon/Tilemap/tilemap_packed.png`, 200, 192×176, 16 px sans gouttière, 12 colonnes ; `License.txt` du même dépôt : CC0, Tiny Dungeon 1.0). Le pack retiré en septembre revient ici pour de bonnes raisons :

| (col, lig) → index | Contenu | Usage |
|---|---|---|
| (7-8, 0-1) → 7, 8, 19, 20 | gargouille murale 2 tuiles de haut, version sèche (col 7) et **crachant une coulée verte** (col 8) | Plante cracheuse (Serre), Bouche de feu / Sève brûlante : émetteur mural en 2 états, à reteinter (vert → orange / jaune) |
| (7-8, 2) et (7-8, 3) → 31, 32, 43, 44 | vasque vide / flaque verte, sur pierre puis sur sable | Nappe de gaz / Spores / Encens : la source au sol, remplaçant le disque `#2f3a2a` de `r_gas_zone` |
| (5, 2) → 29 | torche murale rouge encadrée | Rai de soleil / Lampe de culture : la source d'un `laser_beam` |
| (6, 4), (7, 4) → 54, 55 | **wagonnets** (2 formes) | Wagonnet fou (Concession) : remplace le disque de la scie sur rail |
| (8, 5)-(8, 6), (9-11, 5-7) → 68, 80, 69-71, 81, 83, 93-95 | rails droits et boucle de rails (4 coins + 2 droits) | rail du Wagonnet ; tracé de tout `saw_rail` |
| (5-6, 6) → 77, 78 | barreaux | Barbelés / Grille |
| (0, 5) → 60 | crochets de visée | télégraphe de Tourelle / Tireur embusqué |

**Kenney Pixel Platformer** (`raw.githubusercontent.com/teodoroooo/guardiao-dos-biomas/main/kenney_pixel-platformer/Tilemap/tilemap_packed.png`, 200, 360×162, **18 px** sans gouttière, 20 colonnes ; `License.txt` : CC0, Pixel Platformer 1.2). Attention : 18 px, à rogner de 1 px de chaque côté ou à dessiner à 54 px (×3). Utile : **(8, 3) double pointe grise** (1 image), **(8, 7) / (9, 7) bouton-plaque bleu relevé / enfoncé** (plaque de pression 2 états), (4-6, 3) levier 3 positions, (7, 3) gemme, (13-14, 5) drapeaux rouges (le Fil de détente peut être un fil entre deux piquets (5, 5)/(6, 5)).

**Kenney Pixel Platformer Industrial Expansion** (`media.githubusercontent.com/media/series-ai/jam-ready-assets/main/kenney-pixel-platformer-industrial-expansion/2D/platformer/Tilemap/tilemap_packed.png`, 200, 288×126, 18 px, 16 colonnes ; licence CC0 vérifiée dans `adhan-razzaque/one-button-game-jam-2023/…/License.txt`) — la planche « hôpital/usine » qui manquait à l'Admission :

| (col, lig) | Contenu | Usage |
|---|---|---|
| (0, 4) rouge, (1, 4) bleu | **gyrophares** sur socle | Gyrophare (Admission) : enfin un vrai gyrophare, alterner les deux teintes = clignotement |
| (2, 4) | panneau triangulaire de danger | télégraphe générique au sol (idle) |
| (4, 5), (4, 6) | roues dentées / disques crantés | **Scie sur rail** (Admission), Roue à sabres (rotation par `ctx.rotate`) |
| (3, 4), (3, 5)-(4, 5) | tête de presse hydraulique | dalle qui écrase (nouveau `kind` éventuel) |
| (7, 0-4), (8, 0-4) | corde à crochet, chaîne | pendule / suspension de lame |
| (8-11, 5) et (8-11, 6) | cuves à bandes jaunes, lave orange | Rayon mural (source), nappe brûlante |
| (12-13, 3), (13-15, 0-2) | bacs d'acide, colonnes de liquide vert | Diffuseur, Nappe de gaz (Admission) |
| (10, 2), (9, 2-4) | panneau « ! », panneaux hachurés | avertissement de Tourelle |
| (11, 0-4), (12-15, 6) | tuyaux | Diffuseur : la buse |

**DCSS — Dungeon Crawl Stone Soup, `rltiles/dngn/traps/`** (`raw.githubusercontent.com/crawl/crawl/master/crawl-ref/source/rltiles/dngn/traps/<nom>.png`, 32×32). Licence : le `LICENSE` du dépôt dit « most of tiles : Public Domain|CC0 » et renvoie à `github.com/crawl/tiles` dont le README confirme CC0 pour les tuiles listées ; **aucun de ces fichiers n'apparaît dans `TILES_UNDER_UNKNOWN_LICENSE.md`** (seules les icônes `gui/zotdef/*_trap.png` y sont) → CC0 utilisable. Fichiers existants (200) : `pressure_plate`, `bolt` (plaque + carreau), `spear` (plaque + pointe), `shaft` (fosse), `net`, `alarm`, `teleport`, `teleport_permanent`, `dispersal`, `dispersal_inactive`, `zot`, `tyrant`, `archmage`, `harlequin0`, `devourer`, `passage_of_golubria`, `cobweb_none_0` ; `arrow`, `blade`, `dart`, `needle`, `web` n'existent plus (404). **Verdict : style peint 32 px, 1 image chacun, incompatible avec le 16 px de WAY en salle** ; à garder seulement pour des icônes 32 px (compendium/carnet de pièges) — `pressure_plate`, `bolt`, `spear`, `shaft`, `net` sont les seules mécaniques.

**Kenney 1-Bit Pack** (`raw.githubusercontent.com/fritzy/godot-7drl-starter-2024/main/resources/kenney_1-bit-pack/Tilesheet/colored_packed.png` et `colored-transparent_packed.png`, 200, 784×352, pas 17 ; `License.txt` : CC0, 1-Bit Pack 1.2). Monochrome à deux couleurs : toile d'araignée (2, 14), torche (3, 14), flammes (4-5, 14), éclats (26-28, 11) et (33-34, 11), chariot (14, 12), engrenage (14, 10), chaînes/crochet (10-11, 13). Pas de dalle à pointes trouvée. **Verdict : inutilisable tel quel (style 1-bit), sauf comme masques à teinter** ; classé faible.

**0x72 16×16 Dungeon Tileset v1 (v4)** (`raw.githubusercontent.com/rafski/zelda-style/master/sprites/0x72_16x16DungeonTileset.v4.png`, 200, 256×256) : torches murales animées (8-15, 10), bombe (15, 3), mimique. **Pas de piège, et le miroir ne contient pas de fichier de licence** (CC0 selon la page itch, non vérifiable ici) → écarté.

Non joignables / non vérifiés, donc non cités : buch (pas de miroir trouvé par recherche de code), Tuxemon (CC-BY-SA de toute façon), Pixel Dungeon (GPL, écarté par principe).

---

## 2. Presets et bibliothèques

### 2.1 Bibliothèques JS un seul fichier, sans build (toutes téléchargées depuis `registry.npmjs.org`, tarballs dans `pieges_packs/libs/`)

| Lib | Fichier autonome | Taille | Licence | Verdict pour WAY |
|---|---|---|---|---|
| **bezier-easing 3.1.0** | `dist/bezier-easing.min.js` (UMD) | 1,4 Ko | MIT | **à copier** si on veut des courbes CSS-like pour les télégraphes (montée lente, coup sec) ; 100 lignes, autant recopier la fonction dans `00_core.js` |
| **proton-engine 7.1.5** | `build/proton.web.min.js` (UMD, `Proton.CanvasRenderer`) | 64 Ko | MIT | seule vraie lib de particules qui tourne sur Canvas 2D sans build. Mais `dev/30_entities.js` a déjà `Particles`, et le profiler compte les « flous » : un second système ajouterait du poids sans gain. **à s'inspirer** (ses `Zone`, `Alpha/Scale/Color` behaviours) plutôt qu'à embarquer |
| @tweenjs/tween.js 25 | `dist/tween.umd.js` | 50 Ko | MIT | inutile : `Beat.pulse`/`lerp` couvrent le besoin |
| kontra 10 | `kontra.min.js` | 33 Ko | MIT | moteur complet (Sprite, Pool, TileEngine) ; rien de spécifique aux pièges |
| LittleJS 1.18 | `dist/littlejs.min.js` | 190 Ko | MIT | moteur complet qui prend la boucle et le canvas ; pas embarquable par morceaux. Son `ParticleEmitter` (≈ 300 lignes, MIT) est **copiable** si on veut des émetteurs par tuile (pluie d'étincelles d'une scie, fumée d'un braséro) |
| rot-js 2.2 | `dist/rot.min.js` | 69 Ko | BSD-3 | générateurs de donjon / FOV / A* ; aucun rapport avec les pièges, et `dangerAt()` du bot existe déjà |
| SAT.js 0.9 | `SAT.js` | 18 Ko | MIT | collisions polygone/cercle : utile seulement si on donne aux lames tournantes une hitbox rectangulaire au lieu du `segCircle` actuel — non prioritaire |
| Phaser 4, Excalibur 0.32, tsparticles, planck | — | 1 à 100 Mo | MIT/BSD | hors sujet pour un jeu vanilla sans build |

Bilan honnête : **rien à embarquer**. Le seul apport possible est de copier deux fonctions (bezier-easing, un émetteur de particules par tuile) dans le code maison.

### 2.2 Jeux open source dont reprendre les définitions ou le code

**À copier (licence permissive)**

- **Barony** (BSD-2, `TurningWheel/Barony/LICENSE.txt` vérifié) — `src/actarrowtrap.cpp` (piège à flèches mural : tire quand le joueur est aligné, `ARROWTRAP_REFIRE`, se vide après 10 tirs → idée pour une Meurtrière à munitions limitées), `src/actspeartrap.cpp` (pieux : sortent de 20 unités en 5 ticks à 4 unités/tick, restent 60 ticks = 1,2 s à 50 ticks/s, redescendent avec gravité `VELZ += .25` → courbe « sortie sèche, retour mou » à reprendre pour `spike_tiles`), `src/actboulder.cpp` (boule roulante : 64 Ko, la logique de roulement/écrasement/mur), `src/actmagictrap.cpp`. Le code est en C++ 3D mais les tables de timing sont directement transposables. Téléchargés dans `pieges_packs/src/`.

**À s'inspirer seulement (licence incompatible avec un jeu propriétaire, ou copyleft)**

- **Brogue CE** (AGPL-3, `tmewett/BrogueCE/src/brogue/Globals.c`, 200) — `tileCatalog` lignes 375-403 : gaz caustique, trappe, paralysie, confusion, lance-flammes, inondation, filet, alarme, plaque de pression (exposée ou cachée, `TM_IS_WIRED` = déclenche d'autres mécanismes) ; tourelles (arrow / spark / dart / flame turrets, lignes 1217-1311). La grande idée transposable : **la plaque de pression « câblée »** qui active un autre piège de la salle (un `beats.hits` déclenché par le joueur plutôt que par l'horloge).
- **DCSS** (GPL-2, `crawl-ref/source/traps.cc`, 36 Ko, 200) — traps : net, alarm, shaft, teleport, dispersal, zot, tyrant, archmage, harlequin, devourer ; presque tous « à effet d'état » (téléport, alarme) plutôt que des dégâts → idées de pièges non létaux : un Diffuseur qui téléporte, une Nappe qui appelle des ennemis.
- **Shattered Pixel Dungeon** (GPL-3, `levels/traps/Trap.java`, 200) — la taxonomie visuelle **9 couleurs × 7 formes** (`DOTS, WAVES, GRILL, STARS, DIAMOND, CROSSHAIR, LARGE_DOT`) pour qu'un joueur lise le type de piège au sol d'un coup d'œil ; ses ~30 pièges (Blazing, Chilling, Corrosion, Explosive, Flock, Geyser, Gripping, Ooze, Pitfall, Poison Dart, Rockfall, Shocking, Storm, Summoning…) = catalogue d'idées pour de futurs `kind`.

---

## 3. Vecteurs Canvas vs sprites : avis

**État des lieux.** Depuis le chantier 12, sols, murs, accessoires, ennemis et coffres sont des sprites 16 px rendus ×3 avec `imageSmoothingEnabled = false`. Les pièges restent le seul élément entièrement vectoriel : disques `#333a4e` à bord lumineux pour les émetteurs, disque `#2f3a2a` pour le gaz, rectangles pointillés pour les zones de balayage, `Halo.line` (une passe `shadowBlur` mise en cache pour les disques, mais pas pour les lignes continues — 51 `shadowBlur` dans `dev/`, et le profiler affiche « N flous »). Résultat : les pièges ressemblent à des overlays de debug posés sur un décor pixel-art ; et le coût de rendu est dans les lignes floues longues (Tourniquet, Grille 20×11, Rayon 26 tuiles) qui ne sont pas cachables.

**Ce que le vecteur fait mieux.** La télégraphie : une ligne pointillée qui devient pleine, une couleur qui pulse sur `Beat.pulse(4)`, un cercle qui grandit pendant `warn`. C'est net à toute taille, ça suit le tempo au pixel près, et un rayon qui traverse 26 tuiles n'a pas d'équivalent en sprite sans étirement. Le lecteur d'écran du joueur, c'est la couleur et le clignotement, pas la forme.

**Ce que le sprite fait mieux.** Le corps de l'objet : la scie, le wagonnet, le braséro, la gargouille, la tourelle. Un disque uni ne dit pas « scie » ; la roue crantée (4, 5) de l'Industrial Expansion, tournée par `ctx.rotate`, le dit. Idem pour les dalles : la 4-images `floor_spikes_anim` de 0x72 raconte le cycle (dalle nue → pointes qui percent → sorties) sans une seule ligne de télégraphe, et se dessine avec un `drawImage` par tuile, sans flou.

**Recommandation par mécanique.**

| `kind` | Recommandation | Détail |
|---|---|---|
| `spike_tiles` | **sprite** | 4 images 0x72 (Admission, Sérail) ou RockSpike Ninja (Serre) ; garder seulement un liseré coloré 1 px de la tuile en `warn` |
| `saw_rail` | **hybride** | rail en sprite Tiny Dungeon (posé une fois dans le cache du sol) + corps en sprite tourné (roue, wagonnet, braséro) + halo disque cacheable `Halo.draw` sur le corps |
| `turret_fixed` | **hybride** | socle sprite + canon vecteur tourné vers `aimA` + trait de visée pointillé (déjà là) |
| `emitter` | **hybride** | socle/lanterne/orbe sprite, le cadran de charge (`arc … TAU*warm`) reste vecteur : c'est la meilleure télégraphie du jeu |
| `wall_fireball` | **sprite** | gargouille Tiny Dungeon 2 états (sec / crachant) dans le mur, projectile sprite (bombe 0x72 pour Dynamite, jet Flam pour Naphte) |
| `gas_zone` | **hybride** | source sprite (vasque, flaque, brûle-encens) ; la nappe reste vecteur mais **sans `createRadialGradient` par image** : pré-rendre le dégradé une fois par rayon (`Halo.disc` le fait déjà pour les disques) et n'animer que l'alpha et 5 bulles |
| `laser_sweep` | **vecteur** | la barre qui balaie n'a pas de forme ; ajouter deux sprites d'ancrage (buses, arroseur) aux extrémités |
| `laser_rotate` | **hybride** | moyeu sprite (moulin, roue à sabres, lianes) + bras vecteur ; pour Roue à sabres/Moulin, un bras = sprite étiré ? non : rester en `Halo.line` mais cacher la ligne par longueur |
| `laser_grid` | **hybride** | au repos : barreaux / barbelés / moucharabieh en sprites répétés (cache sol) ; en `on` : les lignes lumineuses actuelles |
| `laser_beam` | **hybride** | source sprite murale (torche, lampe UV, meurtrière) ; rayon vecteur |

Principe général : **le vecteur pour ce qui frappe, le sprite pour ce qui est posé.** Et une règle perf : aucun `shadowBlur` sur une géométrie qui change à chaque image ; les lignes longues passent par un dégradé linéaire pré-rendu (bande de 1×N px étirée) ou par deux traits (large alpha 0,25 + fin alpha 1).

---

## 4. Pièce par pièce — les 41 pièges

Travail : **S** = découpe + `drawImage` (< 1 h), **M** = découpe + états/rotation + retouche couleur (2-3 h), **L** = animation à découper à la main ou nouveau `kind` (½ journée+). Sources : 0x72 = `assets/sprites/0x72_dungeon_tileset_ii/…` (local) ; KRD = Kenney Roguelike Caves & Dungeons (local) ; KTD = Kenney Tiny Dungeon ; KPP = Kenney Pixel Platformer ; KIND = Kenney Industrial Expansion ; NA = Ninja Adventure ; toutes CC0.

### Admission (`content.js`)

| id | kind | Candidat visuel | Source (coordonnées) | Travail |
|---|---|---|---|---|
| trap_balayage | laser_sweep | buses aux deux bouts + barre vecteur | KIND tuyaux (11, 0)/(12, 6) | S |
| trap_tourniquet | laser_rotate | moyeu = ventilateur `computer-fan` déjà dans `PROP_DEFS` (spinner) ; bras vecteur | maison | S |
| trap_grille | laser_grid | barreaux au repos, lignes cyan en `on` | KRD (0-3, 7-9) | M |
| trap_bouche | wall_fireball | gargouille murale 2 états, reteintée orange ; projectile Flam | KTD (7-8, 0-1) ; NA FX Flam | M |
| trap_dalles | spike_tiles | `floor_spikes_anim` 4 images | 0x72 v1.4 (16, 176) ×4 | S |
| trap_nappe | gas_zone | bac d'acide comme source, nappe vecteur pré-rendue | KIND (12, 3) | M |
| trap_rail | saw_rail | roue crantée tournée + rails | KIND (4, 5) ; KTD rails (8-11, 5-7) | M |
| trap_diffuseur | emitter | buse/cuve à bandes, cadran vecteur | KIND (8, 5) ou (9, 1) | S |
| trap_gyrophare | emitter | **gyrophare rouge/bleu alternés** | KIND (0, 4)/(1, 4) | S |
| trap_rayon | laser_beam | lampe murale rouge comme source | KTD (5, 2) reteinté | S |
| trap_tourelle | turret_fixed | socle = machine `machine.png` (pixel/), canon vecteur ; crochets de visée | maison + KTD (0, 5) | M |

### La Serre (`content2.js`)

| id | kind | Candidat visuel | Source | Travail |
|---|---|---|---|---|
| trap_lianes | laser_rotate | moyeu = souche `stump.png` (pixel/) ; bras = fouets Plant | NA FX Plant 240×28 | M |
| trap_epines | spike_tiles | pieux de roche qui jaillissent, reteintés vert | NA FX RockSpike 540×48 (9 × 60) | L |
| trap_spores | gas_zone | source = champignons `shroom-cluster.png` (pixel/) ; nappe violette | maison | S |
| trap_seve | wall_fireball | gargouille crachant (col 8) reteintée jaune ; projectile goutte | KTD (8, 0-1) | M |
| trap_arroseur | laser_sweep | geyser d'eau aux bouts, barre bleue | NA FX WaterPillar 270×41 | M |
| trap_treillis | laser_grid | clôture au repos (pixel/ `dry-bush` ? non) → barreaux KTD reteintés bois | KTD (5-6, 6) | M |
| trap_cracheuse | turret_fixed | plante carnivore `carnivorous-plant.svg` (greenhouse/) déjà présente ; bouche vecteur | maison | S |
| trap_brumisateur | emitter | buse KIND + cadran ; ou vasque KTD (7, 2) | KIND (11, 0) | S |
| trap_lampe_uv | laser_beam | lampe murale (torche KTD reteintée violet) | KTD (5, 2) | S |
| trap_tondeuse | saw_rail | roue crantée verte + rails KTD ; ou fouet Plant tournant | KIND (4, 6) | M |

### La Concession (`content3.js`)

| id | kind | Candidat visuel | Source | Travail |
|---|---|---|---|---|
| trap_moulin | laser_rotate | moyeu = roue de chariot (NA `TilesetHouse` (1-2, 3-4), chariot) ; pales bois vecteur | NA House | M |
| trap_wagonnet | saw_rail | **wagonnet sur rails** | KTD (6, 4)/(7, 4) + rails (8-11, 5-7) | M |
| trap_embuscade | turret_fixed | caisse `wooden-crate.png` (pixel/) + éclair de tir | maison | S |
| trap_poudre | gas_zone | tonneau `barrel.png` (pixel/) ouvert comme source | maison | S |
| trap_ours | spike_tiles | pas de piège à ours en 16 px dans les sources vérifiées ; solution : `floor_spikes_anim` reteinté acier + piquets KRD (6-7, 3) ; ou dessin maison 16 px (mâchoire 2 états) | 0x72 + KRD ; maison | M/L |
| trap_dynamite | wall_fireball | **bombe à mèche 3 images** comme projectile ; source = tonneau | 0x72 v1.7 (288, 320) ×3 | S |
| trap_gatling | emitter | tambour = roue crantée KIND (4, 5) ; cadran vecteur | KIND | S |
| trap_revolver | emitter | crochets de visée KTD (0, 5) + cadran | KTD | S |
| trap_detente | laser_beam | **fil entre deux piquets** ; poteau KRD (12, 16) aux bouts, fil vecteur 1 px brun | KRD | S |
| trap_barbeles | laser_grid | clôture bois KPP (5, 5)/(6, 5) ou planches KRD (10-11, 16-17) au repos | KPP / KRD | M |

### Le Sérail (`content4.js`)

| id | kind | Candidat visuel | Source | Travail |
|---|---|---|---|---|
| trap_sabres | laser_rotate | moyeu = orbe sur socle ; lames = sprites d'épée 0x72 (`weapon_*`, liste v1.4) tournés | NA Dungeon (2, 2) ; 0x72 armes | M |
| trap_brasero | saw_rail | **braséro 3 états** (éteint / petit / grand feu) qui roule sur rails | KRD (12-14, 17) | M |
| trap_meurtriere | turret_fixed | fente murale = trou de mur `wall_hole_1/2` 0x72 (48, 32)/(48, 48) | 0x72 | S |
| trap_encens | gas_zone | source = pot rond `pot-round.png` (pixel/) ; nappe violette | maison | S |
| trap_pieux | spike_tiles | bloc à pointes blanches NA (1 image) pour l'état sorti + `floor_spikes_anim` pour les transitions | NA Dungeon (4, 1) + 0x72 | M |
| trap_naphte | wall_fireball | jarre (`pot-round`) + jet de flamme Flam comme projectile | NA FX Flam | M |
| trap_braises | emitter | braséro KRD allumé + cadran | KRD (12, 17) | S |
| trap_derviche | emitter | orbe rouge sur socle + lames 0x72 en rotation | NA Dungeon (6, 2) | M |
| trap_rai | laser_beam | source = trou de mur lumineux / torche | 0x72 wall_hole ; KTD (5, 2) | S |
| trap_moucharabieh | laser_grid | grille d'évacuation NA (5, 1) répétée au repos | NA Dungeon (5, 1) | M |

**Manques constatés** (rien de libre en 16 px, accès vérifié) : piège à ours, lame de pendule, herse, boule roulante, dalle qui tombe animée (seule la trappe NA (2-3, 1) existe, 2 images). Ce sont des candidats pour PixelLab (`PROMPTS-SPRITES.md`) — 32×32, fond transparent, sans ombre, comme les accessoires.

**Ordre de bataille suggéré** : (1) `spike_tiles` avec 0x72 (4 pièges, S) ; (2) gyrophare, dynamite, braséro, wagonnet — les quatre où le sprite change tout (S/M) ; (3) rails et roue pour tous les `saw_rail` ; (4) gargouille + bombe/flamme pour `wall_fireball` ; (5) socles des émetteurs et sources des gaz ; (6) barreaux au repos des grilles. Les lasers restent en vecteur, avec la passe perf sur `Halo.line`.
