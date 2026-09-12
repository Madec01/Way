> Note (septembre 2026) : les quatre pistes Kevin MacLeod listées ci-dessous ont été retirées du dépôt à la demande de l'auteur ; les musiques sont désormais celles déposées dans `assets/music/` (voir son README).

# SALLE ZÉRO — Inventaire des assets

Tous les fichiers sont dans `salle-zero/assets/`. **Poids total : 12,53 Mo** (musique 11,79 Mo · sprites 0,40 Mo · polices 0,26 Mo · icônes 0,09 Mo), 149 fichiers.


> **Septembre 2026 — retirés du dépôt.** `assets/icons/` (61 SVG) et les cinq packs `assets/sprites/kenney_*` n'étaient chargés par aucun fichier de `dev/` (748 Ko pour rien). Les tables ci-dessous les décrivent encore pour l'historique et les licences ; les fichiers eux-mêmes ne sont plus livrés. Ce qui est réellement chargé : `lab/`, `greenhouse/`, `western/`, `orient/`, `pets/`, `pixel/` et `music/`.

## Contexte réseau (important pour les prochaines récupérations)

La politique de sortie du proxy bloque **itch.io, kenney.nl, incompetech.com, opengameart.org, pixabay.com, freemusicarchive.org, game-icons.net, fonts.google.com, cdnjs, jsdelivr, unpkg, archive.org** (CONNECT refusé 403). Seuls passent : `raw.githubusercontent.com`, `media.githubusercontent.com` (objets Git LFS), `fonts.googleapis.com`/`fonts.gstatic.com`, `registry.npmjs.org`, `pypi.org`. Tous les assets ci-dessous ont donc été récupérés depuis des **dépôts GitHub publics qui rehébergent les packs d'origine** (chemin exact noté dans chaque table) ou depuis npm. Les zips Kenney/0x72 d'origine n'ont pas pu être téléchargés ; les fichiers utiles ont été pris un à un, les licences d'origine incluses quand elles existaient dans le miroir.

---

## 00. Chantier 13 (septembre 2026) — les corps des pièges

Huit PNG dans `assets/sprites/pixel/` (index refait par `node dev/index-pixel.js`), découpés par un script Pillow depuis des planches CC0 vérifiées (tuile recopiée puis rognée au contenu) : Kenney Pixel Platformer Industrial Expansion (`media.githubusercontent.com/media/series-ai/jam-ready-assets/main/kenney-pixel-platformer-industrial-expansion/2D/platformer/Tilemap/tilemap_packed.png`, 18 px) — `oxygen-tank` (8,5), `beacon-red` (0,4) ; Kenney Pixel Platformer (`raw.githubusercontent.com/teodoroooo/guardiao-dos-biomas/main/kenney_pixel-platformer/Tilemap/tilemap_packed.png`, 18 px) — `pressure-plate` (8,7), `pressure-plate-down` (9,7), `lever` (4,3) ; Kenney Tiny Dungeon (`media.githubusercontent.com/media/SAE-Geneve/UnityCourse---PCG/main/Assets/Packs/kenney_tiny-dungeon/Tilemap/tilemap_packed.png`, 16 px) — `oil-puddle` (7,3) ; Ninja Adventure `TilesetDungeon.png` (miroir `jackfruitgames/chickeeen`) — `seed-pod` (6,2) ; Kenney Roguelike Caves & Dungeons (local, pas 17) — `wire-post` (12,16). Les planches elles-mêmes ne sont pas dans le dépôt. Le rapport `dev/agents/pieges_assets.md` tient le tableau des 41 pièges historiques avec leur sprite candidat, pour la suite.

## 0. Chantier 12 (septembre 2026) — les planches de sol et de mur par palier

Récupérées depuis des miroirs GitHub publics (voir la politique réseau ci-dessous ; `raw.githubusercontent.com` renvoie un pointeur Git LFS pour les dépôts Kenney, il faut passer par `media.githubusercontent.com`). Toutes CC0, créditées dans CREDITS.md. Elles restent des fichiers dans `assets/` : `index.html` ne grossit pas.

| Fichier local | Source (vérifiée le 12 septembre 2026) | Pas | Usage |
|---|---|---|---|
| `kenney_roguelike-dungeon/roguelikeDungeon_transparent.png` (15,7 Ko, 492×305) | `media.githubusercontent.com/media/series-ai/jam-ready-assets/main/kenney-roguelike-dungeon-pack/2D/top-down-rpg/Spritesheet/roguelikeDungeon_transparent.png` | 17 px (16 + 1 de gouttière) | Admission : dalles grises (col. 8-13, lig. 2-3) et murs de pierre (8, 0-1) ; Concession : sable beige (16-20, 14-16) et pierre brune (8, 7-8) ; Serre : briques brunes (17, 5-6) |
| `ninja_adventure/TilesetFloor.png` (30 Ko, 352×417) | `raw.githubusercontent.com/jackfruitgames/chickeeen/main/assets/Tilesets/TilesetFloor.png` | 16 px | Serre : terre brune (1, 8) et ses détails (1-4, 11) |
| `ninja_adventure/TilesetInteriorFloor.png` (13 Ko, 352×272) | `…/Tilesets/Interior/TilesetInteriorFloor.png` | 16 px | Sérail : pavés beiges arrondis (0-9, 12-15) et une mosaïque (12, 1) |
| `ninja_adventure/TilesetDesert.png` (19 Ko, 320×192) | `…/Tilesets/TilesetDesert.png` | 16 px | Sérail : mur de grès (15, 4-5) |

Les coordonnées sont en (colonne, ligne) de tuile ; le code (`TILESETS`, dev/15_sprites.js) les multiplie par le pas.

**Séance C — accessoires découpés** (non livrés en planche : seuls les PNG découpés sont dans `assets/sprites/pixel/`) : Kenney Roguelike Indoors (`media.githubusercontent.com/media/series-ai/jam-ready-assets/main/kenney-roguelike-interior-pack/2D/top-down-rpg/Tilesheets/roguelikeIndoor_transparent.png`, pas 17) — lit (13,4 1×2), comptoirs (1,12) (3,12), machines (10,14) (10,15), tabouret (0,8), tapis (3,9 1×2), tapis vert (9,9 2×2) ; Ninja Adventure `TilesetNature.png` — buissons (0-2,10), arbres (0,0 2×2) (13,0 2×2), rocher (16,8 2×2), petit rocher (18,9), souche (0,8 2×2), fleurs (0,11) (1,11) (3,11), champignons (0,14) (2,14), arbre mort (0,5 2×3) ; `TilesetVillageAbandoned.png` — pot moussu (4,4) ; `TilesetDesert.png` — palmiers (10,4 2×3) (12,4 2×3), sphinx (0,6 2×3), lion (0,9 2×3), puits (0,3 2×2), étals (2,10 2×2) (4,10 2×2), ossements (16,11) (18,11) (19,11), buissons secs (8,10) (8,11) ; `TilesetElement.png` — pot rond (2,1) ; `Pipes.png` — tuyauterie (6,0 3×1) ; `Interior/Elements.png` — chaudière (5,1 2×2) ; Kenney Roguelike Caves & Dungeons — saguaro (4,3 1×2), tas d'os (2,2). Découpe : tuiles recopiées sans gouttière puis rognées au contenu (script Pillow, chantier 12). La licence CC0 de Ninja Adventure est confirmée par le README du pack (« released under the Creative Commons Zero (CC0) license »).

## 1. Sprites

### 1.1 0x72 Dungeon Tileset II — `assets/sprites/0x72_dungeon_tileset_ii/` (93 Ko) — **spritesheet principale**

| Fichier local | Dimensions | Usage prévu |
|---|---|---|
| `0x72_DungeonTilesetII_v1.4.png` | 512×512 RGBA | Sheet de référence (coordonnées ci-dessous) : joueurs, ennemis, boss, sols, murs, portes, coffres, pièces, fioles, armes, UI cœurs |
| `tiles_list_v1.4.txt` | 190 lignes | Liste des frames : `nom x y w h [nb_frames]` (frames consécutives horizontalement, pas = w) |
| `0x72_DungeonTilesetII_v1.7.png` | 512×512 RGBA | Version étendue (nain, ange, doc, pumpkin, slugs, bombe, leviers, boutons, autotiles murs). **Layout différent de la v1.4** : utiliser exclusivement `tile_list_v1.7.txt` avec ce PNG |
| `tile_list_v1.7.txt` | 370 lignes | Liste des frames v1.7 : une ligne par frame `nom_fN x y w h` |
| `README_v1.7.txt` | — | Notes de l'auteur sur les autotiles |
| `LICENSE.txt` | — | Note de licence |

- Source : https://0x72.itch.io/dungeontileset-ii — Auteur : **0x72** (Robert Norenberg) — Licence : **CC0 1.0** (aucun crédit obligatoire ; crédit recommandé « Dungeon Tileset II by 0x72 »).
- Récupéré via : `raw.githubusercontent.com/etopuz/The-Prophecy/master/Assets/Sprites/0x72_DungeonTilesetII_v1.4/…` (v1.4) et `raw.githubusercontent.com/veroteknic/godot2d/main/map/0x72_DungeonTilesetII_v1.7/…` (v1.7).
- Vérifié : PNG valides, planche-contact générée et inspectée (les coordonnées de la section 4 correspondent bien aux sprites).

### 1.2 Kenney Tiny Dungeon — `assets/sprites/kenney_tiny-dungeon/` (12 Ko)

| Fichier local | Dimensions | Usage prévu |
|---|---|---|
| `tilemap_packed.png` | 192×176 (12×11 tuiles de 16 px, sans espacement) | Variante de style « propre » : sols/murs gris-bleu (bunker), portes, coffres, persos, monstres, potions, armes |
| `tilemap.png` | 203×186 (mêmes tuiles avec 1 px d'espacement) | Idem, version anti-bleeding |
| `Tilesheet.txt` | — | Infos de grille |
| `License.txt` | — | Licence d'origine Kenney |

- Source : https://kenney.nl/assets/tiny-dungeon — Auteur : **Kenney** (www.kenney.nl) — Licence : **CC0**.
- Récupéré via : `raw.githubusercontent.com/excaliburjs/sample-multiplayer-massive-realm/main/img/kenney_tiny-dungeon/…`.
- Index tuile `i` → `x = (i % 12) * 16`, `y = floor(i / 12) * 16` dans `tilemap_packed.png` (ou pas de 17 dans `tilemap.png`). Index utiles (vérifiés visuellement) : 0-3 sol brun uni, 12/24 sol brun détail, 36-39 dalles grises (sol bunker), 40 mur brique gris, 57-59 mur pierre, 5-7/16-17 murs bord, 9-11/21-23 encadrements de porte, 33-35/45-47 portes, 60 viseur, 88 coffre fermé, 89-90 coffre ouvert (vide / plein), 91 coffre doré, 92 mimic, 84-87 & 96-100 personnages, 108-112 & 120-124 monstres (slime, œil, crabe, spectre, chauve-souris, fantôme, araignée, scarabée, scorpion), 101-102 anneau/gemme, 113-116 potions, 103-107 & 117-119 armes, 125-131 fioles/sceptres.

### 1.3 Kenney Particle Pack — `assets/sprites/kenney_particle-pack/` (235 Ko)

22 textures sélectionnées, **réduites de 512×512 à 128×128** (Pillow, LANCZOS) pour limiter le poids ; RGBA blanc sur transparent → à teinter par `globalCompositeOperation`/`filter` dans le canvas.

| Fichiers | Usage prévu |
|---|---|
| `circle_01.png`, `circle_05.png`, `light_01.png`, `flare_01.png`, `window_01.png` | Halos de néon, lueur des lampes froides, glow des projectiles |
| `flame_01.png`, `flame_04.png`, `fire_01.png` | Flammes, brûlure |
| `muzzle_01.png`, `muzzle_03.png` | Flash de bouche d'arme (tireur, pistolet) |
| `smoke_01.png`, `smoke_04.png`, `scorch_01.png` | Fumée, traces au sol après explosion |
| `spark_01.png`, `spark_04.png`, `star_01.png`, `star_07.png`, `trace_01.png`, `twirl_01.png`, `magic_01.png`, `symbol_02.png` | Étincelles, impacts, dash, invocation, pièces ramassées |
| `slash_01.png` | Arc de coup d'épée/marteau |
| `License.txt` | Licence d'origine Kenney (Particle Pack 1.1, CC0) |

- Source : https://kenney.nl/assets/particle-pack — Auteur : **Kenney** — Licence : **CC0**.
- Récupéré via : `media.githubusercontent.com/media/clemetayer/TechnoBlastArena/main/Misc/Particles/kenney_particle-pack/…` (objets LFS).

### 1.4 Kenney UI Pack (v1, sheets) — `assets/sprites/kenney_ui-pack/` (38 Ko)

| Fichier local | Dimensions | Usage prévu |
|---|---|---|
| `greySheet.png` + `greySheet.xml` | 512×512, 39 sous-textures (`<SubTexture name x y width height>`) | Panneaux, boutons 9-slice, sliders, cases à cocher, flèches — thème gris = HUD clinique |
| `blueSheet.png` + `blueSheet.xml` | 512×256 | Variante bleue (surbrillance/sélection) |
| `License.txt` | — | Licence Kenney (UI Pack 2.0, CC0) |

- Source : https://kenney.nl/assets/ui-pack — Auteur : **Kenney** — Licence : **CC0**.
- Récupéré via : `raw.githubusercontent.com/NandaRiziq/Padang-Rush/main/Assets/kenney_ui-pack/Spritesheet/…` ; licence via `nahathaiw/final_nthu`.
- Noms utiles dans le XML : `grey_panel.png` (9-slice), `grey_button00…15.png`, `grey_box*.png`, `grey_slider*.png`, `grey_checkmarkWhite.png`, `grey_crossWhite.png`, `grey_arrowUp/DownWhite.png`.

### 1.5 Kenney Pixel Shmup — `assets/sprites/kenney_pixel-shmup/` (7 Ko) — **projectiles 16 px**

Remplace « Top-down Shooter » (voir Manques) : ce pack est en vrai pixel-art 16×16, cohérent avec 0x72.

| Fichier local | Dimensions | Usage prévu |
|---|---|---|
| `tiles.png` | 203×169 (12×10 tuiles de 16 px, espacement 1 px) | Projectiles, impacts, chiffres, power-ups |
| `ships.png` | 131×197 | Vaisseaux/drones (ennemi « essaim » volant ou tourelle, à recolorer) |
| `Tilesheet_Tiles.txt`, `Tilesheet_Ships.txt`, `License.txt` | — | Infos de grille et licence |

- Source : https://kenney.nl/assets/pixel-shmup — Auteur : **Kenney** — Licence : **CC0**.
- Récupéré via : `raw.githubusercontent.com/Sammy-T/Aero-Fight/master/assets/kenney_pixel-shmup/…`.
- Index `i` → `x = (i % 12) * 17`, `y = floor(i / 12) * 17`, taille 16×16. Index vérifiés : **0** laser jaune, **1** double laser, **2** laser blanc, **3** projectile goutte, **4-5** impacts jaunes, **6** éclat, **7-8** explosion/étincelles (anim 2 frames), **9** point (balle d'ennemi), **10-11** impacts croix, **12-15** salves de balles (anim), **16** shuriken/mine, **17-18** missiles, **19-23** et **31-35** chiffres 0-9, **24** croix soin, **25** bonus P, **26** bouclier, **27** viseur, **28-29** batteries, **30** puce.

### 1.6 Kenney Game Icons — `assets/sprites/kenney_game-icons/` (12 Ko)

32 icônes blanches 50×50 (`PNG/White/1x`) pour menus et HUD : `gear, pause, audioOn/Off, musicOn/Off, home, return, checkmark, cross, star, trophy, locked, unlocked, warning, information, question, power, save, gamepad, singleplayer, multiplayer, target, wrench, fastForward, larger, smaller, arrowUp/Down/Left/Right`. PNG ré-optimisés (Pillow).

- Source : https://kenney.nl/assets/game-icons — Auteur : **Kenney** — Licence : **CC0** (`License.txt` reconstitué : le miroir ne contenait pas l'original ; la page Kenney et le `SOURCE.txt` du miroir confirment CC0).
- Récupéré via : `raw.githubusercontent.com/pakeke-constructor/footy/main/addons/kenney_game-icons/PNG/White/1x/…`.

---

## 2. Icônes d'améliorations / compétences — `assets/icons/game-icons/` (90 Ko, 60 SVG)

- Source : **game-icons.net** via le paquet npm `@iconify-json/game-icons@1.2.4` (données Iconify, corps SVG viewBox 512×512).
- Auteurs : Lorc, Delapouite, Skoll, sbed, Carl Olsen, Willdabeast, Andy Meneely et autres contributeurs.
- Licence : **CC BY 3.0** — **crédit obligatoire** (texte exact dans `LICENSE.txt`) : *« Icons by Lorc, Delapouite, Skoll, sbed, Carl Olsen, Willdabeast, Andy Meneely and other contributors — game-icons.net — CC BY 3.0 »*.
- Modification : remplissage `currentColor` → `#F2F5FA` (blanc froid) pour usage direct en `<img>`/`drawImage` sur fond sombre.
- Nommage : `<catégorie>_<usage>__<nom-game-icons>.svg`.

| Catégorie | Fichiers (usage → icône) |
|---|---|
| Armes | épée `broadsword`, marteau `warhammer`, arc `bow-arrow`, pistolet `pistol-gun`, boomerang `boomerang`, orbe `concentration-orb`, dague `plain-dagger`, lance `spears`, laser `laser-blast`, scie `circular-sawblade`, mitrailleuse `chaingun` |
| Éléments | éclair `lightning-arc`, flamme `flame`, glace `ice-bolt`, poison `poison-gas`, explosion `mine-explosion` |
| Stats | bouclier `shield`, cœur `hearts`, cœur+ `health-increase`, vitesse `sprint`, esquive `dodging`, dégâts `pointy-sword`, cadence `bullets`, portée `crosshair`, critique `star-struck` |
| Économie | pièce `two-coins`, étoile `flat-star`, clé `key-card`, coffre `locked-chest`, coffre ouvert `open-treasure-chest`, porte `exit-door` |
| Thème labo / UI | crâne `skull-crossed-bones`, engrenage `gears`, seringue `syringe`, ADN `dna1`, biohazard `biohazard`, fiole `vial`, flasque `bubbling-flask`, virus `virus`, œil `cyber-eye`, cerveau `brain`, sablier `hourglass`, batterie `battery-100`, aimant `magnet`, radar `radar-sweep`, caméra `cctv-camera`, robot `robot-golem`, drone `delivery-drone`, cadenas `padlock`, tourbillon `whirlwind`, orbite `orbital`, écran `computing`, microscope `microscope`, essaim `insect-jaws`, kamikaze `unlit-bomb`, invocation `portal`, tank `armor-vest`, dash `fire-dash`, maison `house`, croix `cancel` |

---

## 3. Musiques — `assets/music/` (11,79 Mo)

Toutes de **Kevin MacLeod (incompetech.com)**, licence **CC BY 4.0**. Le crédit exact (formulation Incompetech, une ligne par piste, à afficher dans les crédits du jeu) est dans `CREDITS.txt` :
`"Titre" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/`

| Fichier local | Piste | Durée / débit / poids | Rôle | Vérification | Récupéré via |
|---|---|---|---|---|---|
| `hub_basement_floor.mp3` | *Basement Floor* | 1:44 · 192 kb/s · 2,50 Mo | **Hub** : drone sombre, ambient inquiétant | Pas de tag ID3 ; identification par le nom de fichier du dépôt, durée cohérente avec le catalogue | `media.githubusercontent.com/media/luiszwy6/H.A.Z.A.R.D.S-cs179n_project/master/Assets/Prefabs/Basement Floor - Kevin Macleod.mp3` |
| `biome1_latin_industries.mp3` | *Latin Industries* | 3:20 · 128 kb/s · 3,21 Mo | **Biome 1** : électronique industrielle tendue (album « Hard Electronic ») | Tags ID3 : TIT2/TPE1/℗ Kevin MacLeod | `media.githubusercontent.com/media/gabo0802/MachineMinds/main/MachineMindsUnity/Assets/Audio/Music/Levels/Latin Industries - Kevin MacLeod.mp3` |
| `boss_in_a_heartbeat.mp3` | *In a Heartbeat* | 3:37 · 128 kb/s · 3,49 Mo | **Boss** : hard electronic intense, rythmique martelée | Tags ID3 OK | `…/MachineMinds/main/MachineMindsUnity/Assets/Audio/Music/Boss Battle/In a Heartbeat - Kevin MacLeod.mp3` |
| `alt_ouroboros.mp3` | *Ouroboros* | 2:41 · 128 kb/s · 2,59 Mo | Alternative biome 1 / mini-boss : électro sombre, basses lourdes | Tags ID3 OK | `…/MachineMinds/main/MachineMindsUnity/Assets/Audio/Music/Levels/Ouroboros - Kevin MacLeod.mp3` |

Boucle : les pistes ne sont pas des boucles parfaites ; prévoir un cross-fade de ~1 s au rebouclage (`audio.currentTime = 0` avec double `<audio>` ou Web Audio). Pas de ffmpeg dans l'environnement → aucun ré-encodage possible ; les fichiers 320 kb/s trop lourds (*Accralate* 5:05/12 Mo, *Heart of the Beast* 4:57/11,9 Mo, *Aitech* 2:30/6 Mo) ont été écartés.

---

## 4. Polices — `assets/fonts/` (0,26 Mo)

| Fichier local | Police | Licence | Usage prévu | Récupéré via |
|---|---|---|---|---|
| `Silkscreen-Regular.ttf`, `silkscreen-latin-400-normal.woff2`, `silkscreen-latin-700-normal.woff2` | Silkscreen (Jason Kottke) | **OFL 1.1** (`OFL_Silkscreen.txt`) | Titres, HUD pixel (taille multiple de 8 px) | `fonts.gstatic.com` (TTF) + npm `@fontsource/silkscreen@5.3.0` (woff2) |
| `VT323-Regular.ttf` | VT323 (Peter Hull) | **OFL 1.1** (`OFL_VT323.txt`) | Texte « terminal » du labo, logs, dialogues | `fonts.gstatic.com/s/vt323/v18/pxiKyp0ihIEF2hsY.ttf` |
| `PixelifySans-Regular.ttf` | Pixelify Sans (Stefie Justprince) | **OFL 1.1** (`OFL_PixelifySans.txt`) | Corps de texte lisible (menus, descriptions d'améliorations) | `fonts.gstatic.com/s/pixelifysans/v3/…ttf` |

(Textes OFL récupérés depuis `raw.githubusercontent.com/google/fonts/main/ofl/<police>/OFL.txt`.)

---

## 5. Comment les utiliser

### 5.1 Chargement

```js
const sheet = new Image(); sheet.src = 'assets/sprites/0x72_dungeon_tileset_ii/0x72_DungeonTilesetII_v1.4.png';
ctx.imageSmoothingEnabled = false;                     // rendu ×3 net
// frame f d'une anim : ctx.drawImage(sheet, x + f*w, y, w, h, dx, dy, w*3, h*3)
```

Parser `tiles_list_v1.4.txt` : `nom x y w h [n]` (n = nombre de frames, frames côte à côte à droite ; 1 si absent). Attention : pour `muddy`, `swampy`, `zombie`, `ice_zombie`, `necromancer`, idle et run pointent sur la même anim (l'auteur n'en a dessiné qu'une).

### 5.2 Sprites recommandés (sheet v1.4, coordonnées `x y w h`, nb de frames, pas horizontal = w)

Les personnages 16×28 doivent être ancrés au pied (les 12 px du haut débordent au-dessus de la case 16×16). Les hit-frames `_hit_anim` sont à x=256 (1 frame). Les sprites regardent à droite : `scale(-1,1)` pour la gauche.

| Rôle | Sprite | Idle (x y w h) | n | Run (x y w h) | n | Remarque |
|---|---|---|---|---|---|---|
| **Joueur 1** | `knight_m` (chevalier, casque bleu) | 128 100 16 28 | 4 | 192 100 16 28 | 4 | hit : 256 100 16 28. Recolorer en gris/bleu néon = « sujet d'essai en combinaison » |
| **Joueur 2** | `elf_m` (blond, tunique verte) | 128 36 16 28 | 4 | 192 36 16 28 | 4 | hit : 256 36 16 28. Alternatives : `elf_f` 128 4, `knight_f` 128 68, `wizzard_f` 128 132, `lizard_m` 128 228 |
| **Rusher** | `imp` (petit démon rouge, rapide) | 368 48 16 16 | 4 | 432 48 16 16 | 4 | |
| **Tireur** | `orc_shaman` (bâton) | 368 236 16 20 | 4 | 432 236 16 20 | 4 | projectile : Pixel Shmup index 9 ou 3 |
| **Tank** | `masked_orc` (masque, costaud) | 368 172 16 20 | 4 | 432 172 16 20 | 4 | ou `orc_warrior` 368 204 16 20 |
| **Kamikaze** | `tiny_zombie` (petit, vert pâle) | 368 16 16 16 | 4 | 432 16 16 16 | 4 | flash rouge avant explosion ; explosion = Particle `fire_01`/`smoke_04` |
| **Invocateur** | `necromancer` (capuche violette) | 368 268 16 20 | 4 | 368 268 16 20 | 4 | (une seule anim) invoque des `skelet` 368 80 16 16 (run 432 80) |
| **Essaim** | `swampy` (petits blobs verts) | 432 112 16 16 | 4 | 432 112 16 16 | 4 | (une seule anim) ou `muddy` 368 112 ; unités 8×8 possibles en découpant |
| **Dasher** | `goblin` (vert, dague) | 368 32 16 16 | 4 | 432 32 16 16 | 4 | traînée : Particle `trace_01`/`twirl_01` |
| **Ennemis bonus** | `zombie` 368 144 · `ice_zombie` 432 144 · `wogol` 368 300 16 20 · `chort` 368 328 16 24 | | | | | |
| **Mini-boss** | `big_demon` (32×36, rouge, mâchoire) | 16 364 32 36 | 4 | 144 364 32 36 | 4 | alternatives : `ogre` 16 320 32 32 (run 144 320), `big_zombie` 16 270 32 34 (run 144 270) |

| Tuile | x y w h | n | Remarque |
|---|---|---|---|
| Sol variante 1 | 16 64 16 16 | | `floor_1` (uni) |
| Sol variante 2 | 32 64 16 16 | | `floor_2` (fissuré) |
| Sol variante 3 | 48 64 16 16 | | `floor_3` ; aussi `floor_4-8` : 16 80 / 32 80 / 48 80 / 16 96 / 32 96 |
| Sol trappe/piques | 48 96 16 16 · 16 176 16 16 | 4 | `floor_ladder`, `floor_spikes_anim` (danger) |
| Mur haut (frise) gauche/milieu/droite | 16 0 · 32 0 · 48 0 (16×16) | | `wall_top_*` (dessiner sur la rangée au-dessus du mur) |
| Mur face (briques) gauche/milieu/droite | 16 16 · 32 16 · 48 16 (16×16) | | `wall_*` (face visible, sous la frise) |
| Mur côté gauche haut/milieu/bas | 0 112 · 0 128 · 0 144 (16×16) | | `wall_side_*_left` |
| Mur côté droit haut/milieu/bas | 16 112 · 16 128 · 16 144 (16×16) | | `wall_side_*_right` |
| Coins extérieurs | haut-G 32 112 · haut-D 48 112 · G 32 128 · D 48 128 · bas-G 32 144 · bas-D 48 144 · front-G 32 160 · front-D 48 160 | | `wall_corner_*` |
| Coins intérieurs | L haut-G 80 128 · L haut-D 64 128 · milieu G 80 144 · milieu D 64 144 · T haut-G 80 160 · T haut-D 64 160 | | `wall_inner_corner_*` |
| Bord de vide / trou | 96 128 · 96 144 (16×16) | | `edge`, `hole` |
| Colonne haut/milieu/base | 80 80 · 80 96 · 80 112 ; contre mur 96 80 · 96 96 · 96 112 | | tubes/piliers du labo |
| Décor mural | trous 48 32 · 48 48 ; bannières 16 32 (rouge) 32 32 (bleu) 16 48 (vert) 32 48 (jaune) ; goo 64 80 / 64 96 ; fontaine 64 0 + anim rouge 64 16 (3) bassin 64 32 (3) / bleue 64 48 (3) bassin 64 64 (3) | | fontaine bleue animée = « conduit de fluide » du labo |
| Porte (bloc complet) | 16 221 64 35 | | `doors_all` ; détail : cadre G 16 224 16 32, cadre haut 32 221 32 3, cadre D 63 224 16 32, **battant fermé 32 224 32 32**, **battant ouvert 80 224 32 32** |
| Coffre fermé → ouvert (plein) | 304 304 16 16 | 3 | `chest_full_open_anim` : frame 0 = fermé, frame 2 = ouvert |
| Coffre vide / mimic | 304 288 16 16 · 304 320 16 16 | 3 | |
| Pièce | 288 272 8 8 | 4 | `coin_anim` (8×8) |
| Cœurs HUD plein/demi/vide | 288 256 · 304 256 · 320 256 (16×16) | | |
| Fioles grandes R/B/V/J | 288 224 · 304 224 · 320 224 · 336 224 | | petites : même x, y=240 |
| Crâne, caisse | 288 320 16 16 · 288 298 16 22 | | |
| Armes (icônes posées au sol / dans la main) | voir `tiles_list_v1.4.txt` lignes `weapon_*` (x 288-352, y 16-216) : `weapon_knife` 293 18 6 13, `weapon_regular_sword` 323 26 10 21, `weapon_hammer` 307 55 10 24, `weapon_big_hammer` 291 42 10 37, `weapon_bow` 325 180 7 25, `weapon_arrow` 308 186 7 21, `weapon_spear` 293 177 6 30, `weapon_red_magic_staff` 324 145 8 30 | | |

Extras v1.7 (avec `0x72_DungeonTilesetII_v1.7.png` + `tile_list_v1.7.txt` uniquement) : `doc_idle/run_anim` (**personnage en blouse blanche** — idéal PNJ scientifique du hub), `dwarf_m/f`, `angel`, `pumpkin_dude`, `slug`/`tiny_slug` (essaim), `bomb_f0-2` (kamikaze/explosif), `lever_left/right`, `button_red/blue_up/down` (interrupteurs de labo), `floor_stairs`, `wall_edge_*`/`wall_outer_*` (autotiles).

### 5.3 Projectiles, particules, UI

- Projectile joueur pistolet : Pixel Shmup `tiles.png` index 2 (laser blanc) ou 0 (jaune) ; ennemi tireur : index 9 (point) / 3 ; missile : 17-18 ; impact : 4-5, 10-11 ; explosion : 7-8.
- Boomerang / orbe : dessiner en code (cercle/arc) ou `star_01.png` du Particle Pack en rotation.
- Particules : `drawImage` d'un PNG 128×128 réduit à 8-24 px, avec `globalCompositeOperation = 'lighter'` pour les néons/lasers.
- HUD : `greySheet.png` via XML (`grey_panel.png` en 9-slice), icônes Kenney 50×50 réduites à 16-24 px, icônes game-icons SVG (chargées en `Image`, 32-48 px) pour l'écran d'améliorations.
- Polices : `@font-face` sur les TTF/woff2 locaux ; Silkscreen à 8/16/24 px, VT323 à 16/20 px, Pixelify Sans à 12-16 px.

---

## 6. Manques (le moteur dessinera des placeholders)

- **Kenney « Top-down Shooter »** : non récupéré volontairement — style vectoriel 64 px incohérent avec le pixel-art 16 px ; remplacé par Pixel Shmup (projectiles 16 px). Pas de sprite d'arme tenue vue de dessus « réaliste » (pistolet/mitrailleuse) : utiliser `weapon_*` de 0x72 ou dessiner en code.
- **Boomerang, orbe, éclair, rayon laser continu** : aucun sprite dédié ; placeholders code (formes + particules).
- **Tuiles « laboratoire » spécifiques** (tables de labo, cuves, écrans, câbles, grilles métalliques, tubes lumineux) : absentes. 0x72 = donjon de pierre ; Tiny Dungeon = pierre grise. Recommandation : recoloriser (teinte froide bleu-gris, saturation réduite) les murs/sols 0x72 dans le canvas au chargement, ajouter des néons via `light_01`/`window_01`.
- **Boss final / boss de biome distinct du mini-boss** : seuls `big_demon`, `ogre`, `big_zombie` (32 px) existent ; pas de boss 48-64 px. Placeholder : `big_demon` ×2 recoloré ou composition.
- **Animations d'attaque/mort** : 0x72 n'a que idle/run/hit (1 frame) ; pas de death anim → fondu + particules.
- **Bruitages (SFX)** : hors périmètre demandé, non récupérés (Kenney « Impact Sounds »/« Sci-fi Sounds » sont CC0 mais kenney.nl est bloqué ; possible via miroirs GitHub dans un second temps).
- **Musique en OGG / boucles parfaites** : uniquement MP3 (pas d'outil d'encodage disponible) ; pas de piste taguée « loop ».
- **Police Pixel Operator / m5x7** : hébergées sur itch.io/dafont (bloqués) ; Silkscreen/VT323/Pixelify Sans (OFL) en remplacement.
- **Zips d'origine et fichiers de licence** : les licences UI Pack, Particle Pack, Tiny Dungeon, Pixel Shmup sont les originaux Kenney ; celles de 0x72 et de Kenney Game Icons sont reconstituées (texte de la page + `SOURCE.txt` du miroir).

---

## 7. Crédits à afficher dans le jeu (récapitulatif)

```
Graphismes : Dungeon Tileset II — 0x72 (CC0) · Tiny Dungeon, Particle Pack, UI Pack, Pixel Shmup, Game Icons — Kenney.nl (CC0)
Icônes : game-icons.net — Lorc, Delapouite, Skoll, sbed, Carl Olsen, Willdabeast, Andy Meneely et contributeurs (CC BY 3.0)
Musique : "Basement Floor", "Latin Industries", "In a Heartbeat", "Ouroboros" Kevin MacLeod (incompetech.com)
          Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/
Polices : Silkscreen, VT323, Pixelify Sans (SIL Open Font License 1.1)
```

### 1.8 Accessoires de décor — `assets/sprites/western/`, `lab/`, `greenhouse/`, `orient/` (364 Ko, 87 SVG)
- Source : **game-icons.net** via le paquet npm `@iconify-json/game-icons@1.2.4` (corps SVG, viewBox 512). Auteurs : Lorc, Delapouite, Skoll et contributeurs — Licence : **CC BY 3.0** (attribution dans `CREDITS.md`).
- Fichiers : cactus, cactus-pot, tumbleweed, barrel, wooden-crate, cargo-crate, old-wagon, mine-wagon, coal-wagon, windmill, dynamite, rail-road, railway, desert-skull, animal-skull, rock, saloon-doors, wanted-reward, land-mine, rattlesnake, scorpion, vulture, bull, horse-head, revolver, lasso, cowboy-boot, cellar-barrels, gold-mine, desert.
- Fichiers `orient/` (biome 4) : ancient-columns, amphora, porcelain-vase, fountain, palm-tree, basket, fire-bowl, arabic-door, theater-curtains, covered-jar, magic-lamp, paper-lantern, hot-spices, teapot, gems, scarab-beetle, all-seeing-eye, samara-mosque, oasis, jeweled-chalice, sands-of-time, red-carpet, cobra, djinn, crescent-blade, incense, snake-jar, turban.
- Usage : `Sprites.loadProps()` remplace `currentColor` par la couleur du décor (`PROP_DEFS`), rastérise chaque icône dans un canvas de 16 à 26 px et l'agrandit sans lissage → rendu pixel art. Obstacles `kind`, décor `deco`, sprites des ennemis « accessoires » (baril, scorpions, crotale, jarre, cobras, djinn) et lampe du Vizir.
- Traitement : `Sprites.pixelize()` rastérise l'icône ×4, seuille l'alpha (bords nets), pose un contour sombre d'un pixel et un ombrage de 3 tons (lumière en haut à gauche). Sans ça, le lissage du navigateur agrandi ensuite donnait une frange floue et un aplat d'une seule couleur — le rendu « icône de menu » que l'auteur a jugé trop moche.
- Remplacement par de vrais sprites : `assets/sprites/pixel/` (voir le README du dossier). Un PNG y prend le pas sur l'icône, repris tel quel sans traitement ; `node dev/index-pixel.js` reconstruit l'index. Plusieurs versions du même accessoire cohabitent (`cactus.png`, `cactus_v2.png`…) et se comparent en jeu par F1 → Accessoires. Fond transparent, pas d'ombre portée (le jeu dessine la sienne), 32×32 recommandé.
- Extraction : script Python qui lit `package/icons.json` du paquet npm et écrit un SVG par icône (`<svg viewBox="0 0 512 512">` + corps tel quel).
