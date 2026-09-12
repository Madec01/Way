# WAY — densité de l'écran et hiérarchie visuelle

Rapport en lecture seule (aucun fichier du dépôt modifié ; script de capture créé puis supprimé de `dev/`).
Méthode : bot aux commandes (`Debug.botControl`) au **pistolet à ricochet**, PV des ennemis ×5 pour que les vagues restent
à l'écran, trois captures par salle à 9, 15 et 21 s, avec un relevé des listes du moteur à chaque capture
(`ecran/journal.json`, `ecran/log.txt`). 1280 × 720, zoom 1, mode test, Uno en compagnon.

## 1. Les captures et ce qui gêne

Fichiers dans `scratchpad/ecran/` : `serre6_1..3.png` (Serre, salle 6, tempo), `serre7_1..3.png` (Serre, salle 7,
défi « sol qui s'effondre » + modules), `concession8_1..3.png` (Concession, salle 8, tempo), `serail7_1..3.png`
(Sérail, salle 7, tempo), `admission7_1..3.png` (Admission, salle 7, tempo). Les plus chargées : `serre6_2`,
`serre7_3`, `concession8_1`, `serail7_3`, `admission7_3`.

**Même taille qu'un ennemi.** Le décor au sol est dessiné à `TILE × 0,9 = 43 px` (62 px en `big`) ; un ennemi fait
48 px × `clamp(r/14, 0,6, 1,5)`, soit 29 à 72 px, et la plupart tournent autour de 40 px. Dans `serre6_2`, les
pots, cactus, tournesols et la « fleur-flamme » orange sont exactement de la taille des crânes ennemis, posés au
même rythme sur la même grille : à 40 px il faut *lire* la salle pour trier. Le sablier (piège) et la bonbonne sont
dans la même gamme. Dans `admission7` le triangle jaune « hazard » (décor `deco: 'hazard'`) ressemble à un vrai
avertisseur, et les croix roses sont les dalles à pointes au repos, dans une teinte voisine du corail `PAL.danger`.

**Même couleur qu'un ennemi.** Serre : quatre ennemis sur sept sont verts (`enemy_ronce #7ed957`, `enemy_spore
#b7ff7a`, `enemy_moucherons #9cff57`, `enemy_racine #5aa06a`) sur un sol à dalles d'herbe verte, entre des plantes
vertes ; le `bourgeon` est rose comme la fleur de décor rose. Sérail : les braseros (décor) sont or/orange comme le
`derviche #ffd166` et la `jarre #ff8c42`, et **or comme `PAL.gold`** (anneau de mesure, métronome, critiques) ; les
lampes ennemies (`archer #5ad6cc`) sont dans le cyan de `PAL.self` — la couleur du joueur, de l'XP et des modules.
Concession : lisible (décor beige sur sable, ennemis verts et bruns) — c'est le biome témoin.

**Même taille que des tirs ennemis.** Une balle ennemie fait `r` 5–7 px avec un cœur blanc et un halo de 12 ; une
orbe d'XP fait 4–7 px cyan avec un halo de 8 et sautille sur le temps ; une particule 2–4 px avec halo de 10. Dans
`admission7_3` et `serre7_3` les orbes cyan, les points rouges ennemis, les balles violettes du pollinisateur et les
étincelles blanches sont le même vocabulaire : des points lumineux de 4 à 8 px.

**Ce qui bouge sans être un danger.** Dans une salle du tempo : 24 colonnes d'égaliseur en haut **et** en bas de la
salle (`Tempo.renderEq`, 6 à 50 px, alpha 0,16–0,5, or/cyan, sur le spectre audio), 2 à 4 lumières additives qui
battent (`placeLights`, rayon 96 px), le voile or plein écran à chaque temps fort (`Tempo.renderHud`, 0,16),
la passe de lumière du sol (0,09), un point or qui pulse au-dessus de **chaque** ennemi (`beatLock`), le sautillement
des orbes, l'anneau de mesure et l'anneau cyan du joueur qui claquent, les dalles animées. Rien de tout ça ne blesse,
tout bat à 129 BPM.

**Ce qui clignote.** Le voyant `beatLock` (3→6 px), les quatre disques du métronome, le pointillé défilant de la
zone de capture, le tremblement des dalles qui s'effondrent (`sin(40t)`), les flammes de brûlure (4 dégradés
retirés au hasard **par image**, donc scintillants), le joueur invulnérable à 6 Hz, la barre de PV sous 30 %.

**Ce qui se superpose.** `serre7_3` : bandeau « Vague 2 » (30 px, rouge `#ff6b6b`, flou 24) au tiers inférieur —
donc dans l'aire de jeu — parce que le joueur était en haut ; trois toasts empilés « Uno est sonné / de retour /
sonné » alors que le badge du compagnon dit déjà « sonné — 3 s » ; l'étiquette « Arc tendeur » + losange de l'arme
d'essai au milieu ; les chiffres « 17 » d'Uno loin de sa cible. `serail7_3` : un « 17 » posé sur le cartouche du
compagnon (bas gauche) ; Uno en bas à droite à cheval sur le mur. `serre6_3` : l'annonce des pièges (« Piège en
place : Sablier de salle ») sous le métronome, le cartouche « Salle 6/9 » au-dessus, la barre d'XP au-dessus encore.

## 2. Ce qui se dessine par image dans une salle

Chiffres relevés à la capture (journal) et lus dans le code. « Typique » = combat de vague ordinaire, « pic » = ce
que le code autorise.

| Élément | Combien (typique / pic) | Taille | Couleur | Bouge / clignote | Info ou décor |
|---|---|---|---|---|---|
| Sol + murs (`Sprites.drawFloor`, cache) | 1 image + passe de lumière additive | plein | teinte du palier, néon ≤ 0,09 | bat sur le temps | décor |
| Néons du mur du haut (dans le cache) | 5 | 60 × 3 px + flou 16 | `pal.neon` (cyan/orange) | non | décor |
| Décor au sol (`Sprites.drawDeco`) | 12–15 / 19 (médiane 15 sur 36 salles) | 43 px, `big` 62 px, alpha 0,8 | couleur de l'accessoire (vert, orange, or, rose…) | non | décor |
| Obstacles (`drawBlock`) | 10–25 / 40 | 1–2 tuiles + ombre + socle + trait néon 50 % | accessoire + `pal.neon[0]` | non | obstacle |
| Terrain (eau) | 0–1 nappe | tuiles | bleu | miroitement | décor |
| Décor animé (`33_anim.js`) | 2–4 / 6 par salle (14 lumières, 15 rotatifs/sauteurs/mobiles, 15 dalles/ondes déclarés dans tout le contenu) | lumière r 96 px ; dalle 46 px ; objet 38 px | `#c9a3ff`, `#6ee7ff`, `#ffd166`, `#7fff9a` (⚠ = `PAL.life`) | pulse à chaque coup, flou 10–14 en repli sans sprite | décor |
| Pièges (`Trap.render`) | 5–10 / 13 | 1 tuile par cellule, nuage r 90, bras, rails | couleur du piège + `PAL.alert` en annonce | annonce `warm` 0→1, corps animé | **danger** |
| Partition au sol (`Tempo.renderScore`) | 0–20 tuiles / 312 | coins gris 7 px, voile d'alerte 42 px | `PAL.muted`, `PAL.alert` 0,1–0,26 | recalcul 8×/s | **danger** |
| Modules (`Modular.render`) | 0–1 / 3 | 1–4 tuiles + rail pointillé | `#3a4260` + cadre cyan 0,45 / orange `#ffb347` | glisse, tourne | obstacle mobile |
| Défis (`Challenge.renderFloor/Overlay`) | 1 | trous 48 px, zone r ≈ 120, masque plein écran | noir, vert `#7fff9a`, orange | pointillé défilant, tremblement | objectif |
| Ennemis (`Enemy.render`) | 3–5 / 8–10 (renforts) | 29–72 px + ombre + anneau au sol | couleur du contenu, télégraphie `PAL.alert` | respiration, `beatLock` pulsant, statuts | **danger** |
| Barres de vie ennemies | seulement entamées, 0–5 | `r × 2,2` × 4 px, 4 segments | `PAL.enemyBar` | non | info |
| Projectiles joueur (`Projectiles.render`) | 1–4 / 12 (arc, chaîne) | r 4–9 + halo 12 | famille d'arme | file | tir |
| Projectiles ennemis | 2–4 / 9 (Serre 6 à 15 s) | r 5–7 + cœur blanc + halo 12 | couleur ennemi | file | **danger** |
| Particules (`Particles`) | 12–30 / 63 mesuré, plafond 600 | 2–4 px, halo 10 si `glow` | blanc, or, couleur ennemi | 0,2–0,6 s | retour |
| — par coup | 7 (14 crit) + un arc « spark » 0,09 s | 2–3 px | blanc / `#fff3c4` | 0,28 s | retour |
| — par mort | 22 + 6 + 8 = 36, + onde à plat + tache | 2–3 px | blanc, or, couleur | 0,45–0,6 s | retour |
| — explosion, ramassage, statuts | 18 + 8 ; série ; brûlure 0,5/img/ennemi | 2–4 px | orange, or | — | retour |
| Traces (`room.decals`) | 0–9 / 60 | 9 × 3,5 px × k | noir 0,55 + couleur 0,28 | non | décor |
| Chiffres flottants (`Floaters`) | 1–6 / 40 | dmg 18, crit 30, taken 34, event 22+ | blanc, or, corail, couleur du compagnon | 0,7–1,1 s, sursaut | retour |
| Ramassables (`Pickups.render`) | 0–5 / 19 (fin de vague) | XP r 4–7, pièce 5, cœur, arme 24 px + nom | cyan `#7ef0ff`, or, vert | sautillent sur le temps, halo 8–16 | ressource |
| Lueurs (`Halo.draw/ring`) | une par projectile, particule `glow`, orbe, zone, télégraphie | +8 à +24 px | idem | — | — |
| Ombres | 1 par entité (0,35), par obstacle (0,5), par objet en l'air | ellipse | noir | non | lecture du sol |
| Anneaux du joueur | mesure (or, 26→40 px) partout ; en tempo + anneau cyan/or (r+8→16) + éclairs blancs (→ +50) + 4 pastilles | — | `PAL.gold`, `Tempo.COLOR` | claquent à chaque temps | info |
| Égaliseur (`Tempo.renderEq`, salles tempo) | 24 colonnes × 2 | 36 × 6–50 px | or / cyan, alpha 0,16–0,5 | spectre audio | décor |
| Voile de temps fort (`Tempo.renderHud`) | 1 plein écran | — | or 0,16 (boss : corail 0,22) | chaque mesure | décor |
| HUD permanent (`renderHudBody`) | pastille + PV 282 × 50, XP 4 px pleine largeur, « Salle n/9 » 26 px, arme 420 × 44 + anneau 34 px, compagnon 420 × 30, greffes 28 px/cell, défi 340 × 30, métronome 4 disques + curseur + 300 × 22 d'annonce | ≈ 10 % de la vue | — | métronome, anneau de compétence | info ; les blocs secondaires à 45 % après 4 s de calme |
| Bandeaux / toasts (`UI.notify`) | 1 bandeau (30 px, flou 24, 1,4 s) ; ≤ 3 toasts (13 px, 3,5 s) | — | rouge `#ff6b6b` pour « Vague » | fondu | info |
| Vignettes | PV < 30 %, coup reçu (0,45 corail, 0,35 s), scènes | plein écran | corail/alerte | pulsent | **danger** |

Ordre de dessin (`90_main.js render`) : sol → traces → lumière → décor → animés → sol de défi/tempo → partition →
obstacles → modules → porte → zones → pièges → ramassables → entités triées par pieds → projectiles → effets
(lumières additives, arcs, rayons, ondes) → particules → masque de défi → anneaux du tempo → chiffres → HUD → toasts.
Les flous par image restent à 1–2 (`Perf.blurs`), 60 i/s : le problème n'est pas le coût, c'est le nombre de
choses qui parlent.

## 3. Hiérarchie visuelle en quatre niveaux

Principe : chaque niveau a **une** famille de couleurs, une taille, une cadence. Ce qui descend d'un niveau perd en
saturation, en taille, en durée et en nombre. Priorité P1 = à faire d'abord (gain le plus grand pour le moins de
risque), P2 ensuite, P3 quand on y est.

### Niveau 1 — ce qui peut te tuer et ce que tu contrôles

- **Ennemis contre décor : la taille.** `Sprites.drawDeco` (15_sprites.js) : `TILE × 0,9` → `TILE × 0,7` (34 px),
  `big` `1,3` → `0,95` (46 px), alpha `0,8` → `0,6`. Un décor doit être **plus petit** qu'un ennemi, jamais égal.
  Risque : aucun test ne mesure la taille du décor (`salles.js` vérifie « décor sur sol nu », `sols.js` le cache du
  sol) — vérifier que `cadence.js` ne sonde pas un pixel de décor. **P1.**
- **Ennemis contre décor : la couleur.** `Room.DRESS` (40_room.js) et les `deco` des salles (`content*.js`) : retirer
  `hazard` (triangle jaune = faux avertisseur), les fleurs oranges/roses de la Serre, les braseros du Sérail des
  listes de décor de combat, ou les passer par `drawProp(..., { tint })` avec une teinte sourde (`rgba(30,34,50,.35)`)
  qui désature de ~30 % ; règle : jamais de vert `PAL.life`, de rouge/corail, d'or `PAL.gold`, de cyan `PAL.self`
  dans un accessoire de décor. Le test du budget (§4, B5) le mesure hors ligne à partir de `PROP_DEFS[k].color`.
  Risque : `palette.js` ne regarde que les couleurs en dur du code, pas `PROP_DEFS` ; `sols.js` « couleurs distinctes »
  par palier vise le sol. **P1.**
- **Ennemis verts sur Serre verte.** Quatre ennemis verts sur sept dans `content2.js` : garder le vert à deux (ronce,
  moucherons) et déplacer spore vers `#e0d060` (jaune soufre) et racine vers `#a06a3a` (brun-rouge). Risque :
  `palette.js` interdit seulement le rouge vif ; `comportements.js` ne lit pas la couleur. **P2.**
- **Balles ennemies ≠ orbes.** `enemyProjectile` (32_enemies.js) : `r` minimum 7, et dans `Projectiles.render` un
  liseré de 2 px `PAL.danger` autour de toute balle `owner === 'enemy'` (le cœur blanc devient un anneau corail :
  « ça vient de l'extérieur »). En miroir, XP `rr = 4 + min(3, v/6)` → `3 + min(2, v/8)` et halo `8` → `4`
  (`Pickups.render`). Risque : `lueurs.js` exige `Halo.draw` dans `Projectiles.render` et `Pickups.render` — on le
  garde ; `bat.js` mesure le déphasage du sautillement, pas sa taille. **P1.**
- **Télégraphies : rien d'autre en rouge.** Le bandeau « Vague n » (40_room.js ~l. 348, `color: '#ff6b6b'`) passe en
  `PAL.text` et en taille 22 sans `shadowBlur` (dans `renderHudBody`, bannières : flou 24 → `Halo`/aucun). Une vague
  est un événement, pas un danger qui vient de l'extérieur. Risque : `messages.js` compte les `banners.push` et
  teste `notify` — la couleur n'est pas testée ; `perf.js` ne compte que les flous en salle (≤ 7). **P2.**
- **Voyant `beatLock`** (Enemy.render) : ne le dessiner que quand `this.tele` (l'attaque arrive), sinon alpha 0,25
  fixe et 3 px sans pulsation. Cinq points or qui battent au-dessus de cinq têtes, c'est cinq fausses annonces.
  Risque : `tempo.js` mesure les attaques en phase (logique), pas le voyant. **P2.**
- **Le joueur en salle du tempo** : quatre anneaux (mesure, anneau cyan, éclairs, pastilles). `Tempo.renderOverlay` :
  alpha de l'anneau `0,25 + 0,55·k` → `0,12 + 0,35·k`, rayon `r + 8 + 8(1−ph)` → `r + 6 + 4(1−ph)`. Ne pas toucher
  `renderRing` (mesuré par `bat.js`, ellipse dorée 26→40 px). **P3.**

### Niveau 2 — tes tirs et tes alliés

- **Halos des projectiles du joueur** : `Projectiles.render`, `Halo.draw(..., 12)` → blur `6` et rayon `r` → `r − 1`
  pour `owner === 'player'` ; les ennemis gardent 12. Risque : `lueurs.js` cherche la chaîne `Halo.draw` — ok. **P2.**
- **Étincelles de coup** (`Combat.hitEnemy`) : `count 7 / 14` → `5 / 10`, `glow: true` seulement sur un critique,
  `life 0,28` → `0,22`. Risque : `ressenti.js` mesure l'origine (corps) et la direction des étincelles — lire le
  test avant de baisser en dessous de 5, il peut compter un minimum. **P2.**
- **Mort** (`Combat.killEnemy`) : `22 + 6 + 8` → `12 + 4 + 6` (≈ 22 au lieu de 36), onde à plat et tache inchangées.
  Risque : `butin.js` vérifie « couronne, onde à plat, tache plafonnée » — présence, pas nombre ; à confirmer.
  **P2.**
- **Compagnon** : ses dégâts restent dans sa couleur (contrat F-3) mais suivent la même fusion que ceux du joueur
  (niveau 3) ; supprimer les toasts « X est sonné » / « X est de retour » (31_pets.js l. 466 et 534) — le badge
  dit déjà « sonné — 3 s », et le toast se réaffiche toutes les 3 s tant qu'il tombe. Risque : `pets.js` /
  `compagnons.js` peuvent lire ce texte ; `vocabulaire.js` balaie les `toast(` — en retirer un ne casse rien. **P1.**
- **Anneau et marque d'Uno** (`renderReach`, `renderMark`) : inchangés, ils sont rares et informatifs.

### Niveau 3 — ressources et retours

- **Chiffres de dégâts** (`Floaters.KINDS` et `Floaters.add`) : `dmg` 18 → 14 px, vie 0,7 → 0,5 s ; fusion `14 px /
  120 ms` → `28 px / 300 ms` : au pistolet (4 balles/s) on passe de 4 chiffres par seconde et par cible à **un chiffre
  par 0,3 s et par ennemi**, qui grossit. `crit` 30 → 26, `taken` 34 inchangé (le plus gros texte du jeu, c'est la
  règle). Risque : `coup.js` mesure « cinq genres, trois tailles, sursaut, fusion » et `hud.js` « trois tailles de
  chiffres » — garder l'ordre dmg < crit < taken ; `coup.js` peut tester la fenêtre de fusion à 14 px/120 ms
  exactement (deux coups à 10 px/50 ms fusionnent toujours avec 28/300, donc un test « fusionne » passe ; un test
  « ne fusionne pas à 20 px » casserait). Lire le test avant. **P1.**
- **Ramassables** : halo des pièces `8` → `4`, sautillement `−3 px` → `−2 px` (garder le déphasage `p.ph`, mesuré
  par `bat.js`), étiquette de nom d'arme au sol seulement quand le joueur est à moins de 120 px. **P2.**
- **HUD** : rien à retirer (chantier I-5 l'a déjà fait) ; juste `hudAlpha` à 0,45 aussi pour le cartouche du
  compagnon **pendant** le combat quand il n'a rien à dire (`Pets.renderHud` lit déjà `UI.hudAlpha()`). **P3.**

### Niveau 4 — décor et ambiance

- **Lumières animées** (`AnimProp.o_light`, 33_anim.js) : multiplier `gain` par 0,6 quand `Room.alive() > 0`
  (`placeLights` : `gain 0,2` → 0,12 en combat, `base 0,5` inchangé). Risque : `bat.js` compte « deux à quatre
  lumières par salle » ; `cadence.js` mesure le « pouls » des dalles cadencées — vérifier qu'il ne sonde pas une
  lumière. **P1.**
- **Égaliseur** (`Tempo.renderEq`) : alpha `0,16 + 0,34·sp` → `0,08 + 0,18·sp`, hauteur `6 + 44·sp` → `4 + 26·sp`,
  et seulement en bas de salle quand un ennemi est vivant (en haut il se bat avec le cartouche et les annonces).
  Risque : `perf.js` vérifie l'absence de flou dans le tempo, pas l'égaliseur. **P2.**
- **Voile de temps fort** (`Tempo.renderHud`) : `0,16` → `0,08` (boss `0,22` → `0,14`). Risque : `bat.js` mesure la
  passe de lumière du sol (`Room.render`, 0,09), pas ce voile. **P2.**
- **Décor au sol** : saturation −30 % via `tint`, jamais de rouge/corail, ni de vert vie, ni d'or, ni de cyan (voir
  niveau 1) ; alpha 0,6 ; les kinds « qui ressemblent à un objet du jeu » (triangle, sablier, bonbonne, flamme) sortent
  des listes de décor. **P1** (même chantier que le niveau 1).
- **Trait néon sous chaque obstacle** (`drawBlock`, `pal.neon[0]` à 0,5) : `0,5` → `0,25`, ou `PAL.muted`. Quarante
  obstacles, c'est quarante traits cyan — la couleur de l'XP et du joueur. **P3.**
- **Repli des animés sans sprite** (`r_spinner`, `r_bouncer`, `r_mover`, `r_ring` : `shadowBlur` 10–14) : passer par
  `Halo.draw`/`Halo.ring` ; ce sont les seuls flous par image qui restent dans une salle cadencée. **P3.**
- **Flammes de brûlure** (`Enemy.render`, 4 dégradés tirés au hasard par image) : tirer la position sur `Beat.phase`
  ou une graine par ennemi pour qu'elles ondulent au lieu de scintiller. **P3.**
- **Traces** : alpha `0,55` → `0,4` ; plafond 60 inchangé. **P3.**

## 4. Un budget d'écran mesurable

Toutes les mesures se font depuis la page (`page.evaluate`) en salle de combat, avec le bot et les PV ennemis
gonflés comme dans le script de capture, échantillonnées 10 fois sur 6 s ; « en combat » = `Room.alive() > 0`.

| Budget | Seuil proposé | Comment mesurer |
|---|---|---|
| B1 Particules | ≤ 120 typique, ≤ 250 pic (plafond `Particles.update` 600 → 300) | `Particles.list.length`, `filter(p => p.glow).length` |
| B2 Chiffres flottants | ≤ 8 à la fois ; ≤ 1 `dmg` par ennemi et par 0,3 s | `Floaters.list.length` ; envelopper `Floaters.add` pour compter les appels par `(x0, y0)` arrondi à 30 px |
| B3 Objets animés hors ennemis dans la vue | ≤ 12 en combat | `r.anims.length + r.modular.filter(m => !m.disabled).length + r.traps.filter(t => t.stage(Room.trapTime(r,t)).stage !== 'idle').length + r.hazards.length + r.blasts.length + r.beams.length + r.slashes.length + Pickups.list.filter(p => p.z === 0).length` |
| B4 Flous | ≤ 3 par image en combat (7 aujourd'hui dans `perf.js`) | `Perf.blurs` |
| B5 Couleurs du décor | distance RVB ≥ 60 entre `PROP_DEFS[k].color` et `PAL.danger`, `PAL.alert`, `PAL.life`, `PAL.self`, `PAL.gold` ; ≥ 50 avec chaque `color` d'ennemi du palier | hors ligne comme `palette.js` : `Room.DRESS[b].deco` ∪ `deco[].kind` des salles → `Sprites.PROP_DEFS` |
| B6 Saturation du sol | saturation HSL moyenne du sol ≤ 0,35 ; luminance moyenne entre 0,25 et 0,55 ; contraste sprite ennemi / sol ≥ 0,25 en luminance | `G.enemies = []`, `Room.render` sur un canvas hors écran (recette de `hud.js`/`bat.js`), `getImageData` de la zone `ROOM_X..ROOM_W`, échantillon 1 px sur 4 |
| B7 Tailles | décor ≤ 0,75 × TILE ; balle ennemie `r ≥ 7` ; orbe XP `r ≤ 5` ; ennemi ≥ 28 px | lire `drawDeco.toString()` pour le facteur, `Projectiles.list` et `Pickups.list` pour les rayons |
| B8 Messages | ≤ 2 toasts en combat, aucun texte répété à moins de 10 s | `UI.messages().toasts`, journal des `text` |
| B9 Surface du HUD | somme des `hudProbe.rects` ≤ 12 % de la vue ; rien au centre (déjà dans `hud.js`) | `G.debug.hudProbe = true`, `UI.renderHud(ctx)`, `UI.hudProbe.rects` |
| B10 Rouge hors danger | aucun pixel rouge saturé (H ∈ [340°, 10°], S > 0,6) hors des ennemis en télégraphie, des balles ennemies, des pièges armés et de la vignette | capture avec `G.enemies = []` et pièges au repos : compter les pixels rouges de la vue — doit être ≈ 0 |

Le test vivrait dans `dev/test/ecran.js` (règle : un test hors de `dev/test/` n'existe pas) et reprendrait l'entrée
de `hud.js` (salle 2 puis salle 7 du biome 2 avec bot), les quatre biomes pour B5, et `perf.js` pour B4. B1, B2, B3 et
B8 se mesurent sans capture, B6 et B10 avec `getImageData` sur le canvas du jeu (même origine, pas de capture
disque).

## 5. Ordre de marche

1. Décor plus petit, plus pâle, sans couleur de danger/vie/or/cyan ; sortir `hazard`, sablier, flammes, braseros
   des listes (P1, niveau 1 et 4) — c'est ce qui rend les ennemis reconnaissables.
2. Fusion des chiffres de dégâts à 0,3 s / 28 px et taille 14 (P1, niveau 3) — c'est ce qui vide l'écran.
3. Balles ennemies ≥ 7 px cerclées de corail, orbes ≤ 5 px sans gros halo (P1, niveau 1).
4. Toasts du compagnon supprimés, lumières ×0,6 en combat (P1).
5. Particules de coup et de mort, halos des tirs du joueur, `beatLock`, égaliseur, voile, bandeau de vague (P2).
6. Traits néon des obstacles, anneaux du joueur, flammes, traces, replis flous (P3).
7. `dev/test/ecran.js` avec les budgets B1–B10 pour que ça ne revienne pas.
