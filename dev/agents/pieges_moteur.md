# WAY — audit moteur du système de pièges

Lecture seule, 12 septembre 2026. Sources : `dev/34_traps.js` (877 lignes), `39_tempo.js`, `40_room.js`, `30_entities.js`, `32_enemies.js`, `31_pets.js`, `36_modular.js`, `38_challenges.js`, `33_anim.js`, `35_terrain.js`, `80_atelier.js`, `70_debug.js`, `content*.js`, `dev/test/*.js`, CONTENT.md §9, §13, §26-§30, §63, §67, PLAN-VARIETE.md.

## 1. Le modèle actuel

### Cycle de vie

1. **Déclaration** (`content*.js`, `CONTENT.traps[]`) : `{ id, name, desc, kind, color, damage, telegraph, period, active, params }`. `Content.trap(id)` (10_content_api.js) indexe par id ; `Content.validate` vérifie que chaque `kind` est dans `TRAP_KINDS` et que chaque pose et chaque `trapPool` nomment un piège existant.
2. **Pose** dans une salle : `def.traps: [{ trap, x, y, w?, h?, phase?, params? }]`. `x, y` en tuiles (coin haut-gauche), `w/h` = zone couverte (1×1 par défaut), `phase` = décalage en secondes, `params` **fusionné par-dessus** `def.params` (`Object.assign({}, def.params, inst.params)` dans le constructeur) — c'est ainsi qu'une pose reteinte (`params.color`), réoriente (`dir`, `angle`) ou cadence (`params.beats`) un piège sans toucher à la définition.
3. **Instanciation** : `Room.create(def)` (40_room.js l. 105-112) fait `new Trap(td, t)` pour chaque pose, après `Terrain.compile`, `Anim.compile` et `placeLights`. Le constructeur convertit les unités de contenu en unités moteur (`lengthTiles → length`, `radiusTiles → radius`, `orientation → axis`, `dir: 'down' → π/2`, `mode: 'aim' → aim: 'player'`, `every ← period`), fixe `damage = round(def.damage × G.difficulty.damageMul)`, `period = def.period / fireRateMul`, `speedMul = d.speedMul`. `applyDifficulty()` donne `damageMul = d × biome.damageMul × rampe` (rampe 1 + 0,09 × (salle − 1), 0,06 au biome 1 ; pas de rampe en salle de boss) — un piège à 13 en Sérail salle 8 frappe donc `13 × 1,34 × 1,63 ≈ 28`. Le panneau F1 (`#d-spawntrap`) peut aussi poser un piège 3×3 à chaud ; un défi `replacesTraps` (effondrement) vide `room.traps` au chargement.
4. **Phases** : `Trap.cycle(rt)` renvoie `{ stage: 'idle' | 'warn' | 'on', k, idx }` sur `lt(rt) = max(0, rt − phase)` : la fenêtre active est en **fin** de période (`on0 = period − active`), la télégraphie juste avant. Trois horloges possibles :
   - `cycle` : période fixe (le format historique `{ period, active, telegraph }`, « une quarantaine de déclarations ») ;
   - `cycleHits` : partition libre `beats.hits` (liste de temps dans une boucle de `bars` mesures), lue par dichotomie (`hitAround`, 33_anim.js) ;
   - `shotState` : pour les **tireurs** (`wall_fireball`, `turret_fixed`, `emitter`), un coup est un instant sur `p.every`, comparé à `lastShot` (jamais un compteur croissant, à cause du retour en arrière de l'atelier).
5. **Temps** : `Room.trapTime(r, t)` (l. 630) choisit **par piège** : `Beat.t` si `params.beats`, sinon `r.time`. `Trap.syncBeat()` reconvertit `beats` en secondes à **chaque** `update`, `render` et `dangerAt` (trois fois par piège et par image ; c'est bon marché mais ce n'est pas mis en cache, contrairement à `beatPulse` qui garde `__sec/__L`). Il convertit aussi `turn` → `angularSpeed` et `trip` → `speed` du rail, hors `speedMul` (sinon la difficulté 3 sort du tempo). La salle du tempo (`Tempo.create`) désactive tout (`disabled = true`), regroupe par `trap.id` (`tp.groups`), arme une famille par vague (`onWave → tryAnnounce → armGroup`, 8 temps d'avertisseur, jamais moins de 6 mesures, filet à 10 mesures). `Tempo.scoreAt` (8 fois/s) interroge `dangerAt(x, y, Beat.t + L)` et `+ L/2` sur les 312 tuiles pour les pièges cadencés non-laser ; `renderScore` peint coins gris / voile `PAL.alert`.
6. **Dégâts** : `Trap.hit(pl)` → `Combat.hitPlayer(damage, { type: 'trap', trapName })` avec `hitCd = 0,5 s` par piège ; le gaz tique à part (`acc ≥ 0,5 s`, `damage × 0,5`). Dans `Combat.hitPlayer` (30_entities.js l. 1183) : refus si `invulnUntil`, dash invulnérable ou `G.debug.invuln` ; pour `type === 'trap'` : `× pl.stats.trapDamageMul` (Isolant ×0,6, Pied sûr ÷2, Sol instable ×2), passif `traps_heal` (soigne et sort), hooks `onTrapDamage` (`shockwave`, `speed_burst`) ; puis esquive, armure en %, bouclier, PV, `invulnUntil = now + invulnTime` (0,6 s). `Run.lastDamageSource` note « trap : Nom ». Fin de salle : `xpPerfectTrapRoom` (15) si `r.hits === 0` — mais seulement pour `type === 'TRAP'` (n'existe plus dans le contenu) ou `COMBAT_TEMPO`.
7. **Projectiles de piège** : `Projectiles.spawn({ owner: 'enemy', trap: true, bounce, life })`. Le drapeau `trap` **n'est lu nulle part** ; ils suivent la branche « ennemi » : rebond sur les colliders si `bounce`, collision joueur seulement, blocage par `orbitShield`. `wall_fireball` ignore `lifetime` (`life: 6` fixe), l'emitter le lit.

### Ce qui n'est pas touché

- **Ennemis** : aucune ligne de `32_enemies.js` ne lit `room.traps` ni `Room.dangerAt`. Un ennemi traverse un laser, un gaz, une scie sans rien sentir ; les balles de tourelle le traversent. La seule exception est hors piège : la zone sûre modulaire (`safe_zone`, 36_modular.js l. 207) frappe les ennemis non-boss à `enemyMul` (0,5) ; l'effondrement les tue. CONTENT.md §13 note 6 propose « les ennemis subissent les pièges à 50 % » depuis le biome 1 : **jamais implémenté**.
- **Compagnons** : `Pets.hurt` n'est appelé que par le contact ennemi (`32_enemies.js` l. 204). Un compagnon est intangible aux pièges.
- **Boss** : `Boss` pose des `hazards` (`mines`, `roots`) et le coyote laisse un « piège à loup » (`hazards` avec `trap: true`) : ce sont des zones de `room.hazards`, gérées dans `Room.update`, pas des `Trap`.

### Le bot

`Room.dangerAt(x, y)` = max des `t.dangerAt` (chaque `d_kind` regarde **en avance** de 0,2 à 0,4 s avec une marge de 30-44 px ; les tireurs renvoient 0,5-0,6 en permanence à 60-80 px), de `Modular.dangerAt` et de `Challenge.dangerAt`. Dans `botControl` (70_debug.js l. 436-460) : 17 directions à 34 px, `s −= danger × 40`, plus une pénalité aux projectiles ennemis prolongés de 0,35 s (les balles de piège y passent, sans distinction). `dash/blink` si `dangerAt(pl) > 0,5`. Les gaz (0,8) et les dalles (1) sont bien évités ; une tourelle en (23,6) bloque le bot sous la porte (règle CLAUDE.md). La branche `rm.type === 'TRAP'` (fragments, porte ouverte) est morte dans le contenu actuel.

### Rendu et perf

`Room.render` : sol → murs → terrain → décor animé → partition au sol (`Tempo.renderScore`) → traces → obstacles → porte → `hazards` → **pièges** (`t.render`) → coffre → tourelles ; les entités viennent après (90_main). Tout en vecteurs, aucun sprite (`PROP_DEFS` n'a que `trap_plant`, un obstacle). Les lueurs passent par `Halo.line/draw` (perf.js vérifie qu'aucun `r_*` ne pose `shadowBlur`) ; mesuré : salle 3 → 1 flou, salle 6 → 5, salle 8 → 3, plafond 7 (perf.js). Points coûteux restants : `r_spike_tiles` dessine 9 triangles par tuile par image (une zone 4×3 = 108 `fill`) ; `r_gas_zone` crée un `createRadialGradient` par image et 5 disques en `Time.now` (pas `Beat.pulse` : « ce qui est bâti ne bat pas », toléré) ; `laser_grid` recalcule `gridLines()` trois fois par image.

### Télégraphie et sons

Corps du piège en `this.color` (`params.color` > `def.color` > `PAL.danger`) ; l'annonce est le même trait en pointillé battant à `Beat.pulse(4)` (bat.js compte ≥ 4 occurrences). **Écart à la règle F-3** : l'alerte n'est pas en `PAL.alert` mais dans la couleur du piège ; `r_spike_tiles` code `rgba(255,94,122,…)` en dur (corail `PAL.danger` en rgba, invisible pour palette.js qui ne cherche que l'hexa) et le gaz annonce en `#9f6`. Seule la partition au sol respecte `PAL.alert`. Sons : `trapWarn` (900 Hz accordé), `trapLaser`, `trapSpike`, `trapGas`, `trapSaw` (grince sur le temps), `trapFire`, `trapShot` (non accordé) ; `LEVELS` 0,25-0,7, `GAPS` 0,2-0,23 s. `Trap.warn(idx, snd)` sonne une fois par `idx`.

### L'atelier (F2, onglet « Pièges »)

Palette = `biome.trapPool` (donc les 8 pièges jamais posés y sont). Table `KIND` (80_atelier.js l. 17-27) dit ce que `tune()` expose : taille `w/h`, annonce, durée (0 = toute la boucle), couleur, orientation (`dir`/`angle`), sens (`axis`), `turn`, `trip`, bras, projectiles, ouverture, rotation/coup, rafale, longueur. Rythme = préréglages `RHYTHMS` ou coups cliqués → `beats.hits`. Export `compileTrap` → snippet `content*.js`. **Non éditables** : dégâts, vitesse, taille de projectile, rayon du gaz, `pattern` (damier / éventail / visé), `bounce`, `spacing`, `inner`, `thickness`, `phase`.

## 2. Mécaniques × pièges

Kinds moteur : 10. Définitions : 41 (11 + 10 + 10 + 10). Poses : 112 dans 30 salles. « Salles » = nombre de salles distinctes qui posent le piège ; « beats » = poses cadencées.

| Kind (moteur) | Piège | Palier | Params notables (def) | Salles (poses) | beats |
|---|---|---|---|---|---|
| **laser_sweep** | trap_balayage | 1 | 15 dmg, période 5, actif 1,6, vertical, pingpong | **0** | — |
| | trap_arroseur | 2 | 14 dmg, mêmes réglages | 1 (1) b2_2 zone 16×13 | 0 |
| **laser_rotate** | trap_tourniquet | 1 | 2 bras × 5 tuiles, 1,2 rad/s, actif 5/6 | 1 (1) b1_3 | 1 (turn 4) |
| | trap_lianes | 2 | 3 bras | 1 (1) b2_6 | 1 (turn 8) |
| | trap_moulin | 3 | 3 bras, 1,3 rad/s | 1 (1) b3_3 | 1 |
| | trap_sabres | 4 | 4 bras, 1,28 rad/s, a0 0,4 | 1 (1) b4_4 | 1 |
| **laser_grid** | trap_grille | 1 | espacement 4, 1 s/3 s | 1 (1) b1_7 zone 20×11 | 1 (période 16) |
| | trap_treillis | 2 | idem, vert sombre | **0** | — |
| | trap_barbeles | 3 | idem | 1 (1) b3_6 zone 12×7 | 0 |
| | trap_moucharabieh | 4 | idem, or | **0** | — |
| **wall_fireball** | trap_bouche | 1 | dir down, 320 px/s, r 12 | 1 (2) b1_7 | 2 (every 8) |
| | trap_seve | 2 | + pose `pattern: 'fan', count: 3` | 1 (2) b2_6 | 2 |
| | trap_dynamite | 3 | 15 dmg, éventail en pose | 1 (2) b3_8 | 2 |
| | trap_naphte | 4 | 16 dmg, éventail en pose | 1 (2) b4_7 | 2 |
| **spike_tiles** | trap_dalles | 1 | damier, 0,8/2,6 s | 2 (5) b1_3, b1_7 | 4 |
| | trap_epines | 2 | idem | 1 (4) b2_6 | 4 |
| | trap_ours | 3 | 12 dmg | 3 (8) b3_3, b3_6, b3_8 | 4 |
| | trap_pieux | 4 | 13 dmg, période 2,5 | 2 (6) b4_4, b4_7 | 4 |
| **gas_zone** | trap_nappe | 1 | r 2,5 tuiles, 3 s/7 s, slow | **0** | — |
| | trap_spores | 2 | idem | 4 (7) b2_5/6/7/9 | 1 |
| | trap_poudre | 3 | 10 dmg | 4 (7) b3_3/5/8/9 | 2 |
| | trap_encens | 4 | 11 dmg, slow 0,35 (non lu) | 2 (4) b4_5, b4_7 | 2 |
| **saw_rail** | trap_rail | 1 | 20 dmg, 8 tuiles, 6 t/s | 2 (4) b1_3, b1_8 | 0 |
| | trap_tondeuse | 2 | idem | **0** | — |
| | trap_wagonnet | 3 | 22 dmg, r 0,65 | **0** | — |
| | trap_brasero | 4 | 23 dmg | 1 (2) b4_8 | 0 |
| **turret_fixed** | trap_tourelle | 1 | visée, 380 px/s, 2,4 s | 4 (6) b1_3/7/8/9 | 1 |
| | trap_cracheuse | 2 | idem | 6 (12) b2_2/4/6/7/8/9 | 2 |
| | trap_embuscade | 3 | 400 px/s, 2,2 s | 5 (10) b3_3/6/7/8/9 | 2 |
| | trap_meurtriere | 4 | 430 px/s, 2 s | 5 (10) b4_3/4/7/8/9 | 2 |
| **emitter** | trap_diffuseur | 1 | couronne 8, 210 px/s | 1 (1) b1_7 | 1 |
| | trap_gyrophare | 1 | spirale 3 bras, spin π/4 | 1 (1) b1_7 | 1 |
| | trap_brumisateur | 2 | couronne 8 | 1 (1) b2_6 | 1 |
| | trap_gatling | 3 | spirale 3, 250 px/s | 1 (1) b3_8 | 1 |
| | trap_revolver | 3 | visé, rafale 3 × 0,25 t, 420 px/s | 1 (2) b3_4 | 0 |
| | trap_braises | 4 | couronne 8, 200 px/s | 1 (1) b4_2 | 0 |
| | trap_derviche | 4 | spirale 4, spin π/8 | 1 (1) b4_7 | 1 |
| **laser_beam** | trap_rayon | 1 | angle 0, 26 tuiles, 1 s/3 s | **0** | — |
| | trap_lampe_uv | 2 | idem | **0** | — |
| | trap_detente | 3 | 15 dmg | 1 (1) b3_6 | 0 |
| | trap_rai | 4 | 16 dmg, une pose `angle: π/2` | 2 (3) b4_4, b4_9 | 0 |

Vérification du chantier 12 A : CONTENT.md §67 annonce « les dix pièges jamais posés entrent en jeu » ; le compte réel est de **quatorze** poses nouvelles (rail, gyrophare, diffuseur, arroseur, brumisateur, lianes, revolver, barbelés, détente, gatling, braises, rai, derviche, braséro). Il reste **8 pièges définis mais jamais posés** : `trap_balayage`, `trap_nappe`, `trap_rayon` (Admission), `trap_treillis`, `trap_lampe_uv`, `trap_tondeuse` (Serre), `trap_wagonnet` (Concession), `trap_moucharabieh` (Sérail, que PLAN-VARIETE listait à poser). Ils ne vivent que dans `trapPool`, donc dans la palette de l'atelier. Deux kinds portent le jeu : `turret_fixed` (38 poses, 20 salles) et `spike_tiles` (23 poses) ; `laser_sweep`, `laser_grid` et `laser_beam` sont quasi absents en jeu réel.

Params déclarés mais **jamais lus** par le moteur : `hitOnce`, `alternate`, `groups`, `tickRate`, `dps`, `thickness` (sauf `laser_beam`), `lifetime` (sauf `emitter`), la **valeur** de `slow` (Player applique ×0,7 fixe quand `gasSlowUntil` est posé, donc « −35 % » de l'encens est faux).

## 3. Limites et manques

**Déclencheurs : tout est au temps.** Les trois horloges (`cycle`, `cycleHits`, `shotState`) sont les seuls déclencheurs. Pas de plaque de pression, pas de proximité, pas de « touché par une balle du joueur », pas d'interrupteur (le défi `switches` a des interrupteurs, mais ils ne parlent pas aux pièges). Changement : extraire l'appel `this.cycle(rt)` de chaque `u_kind` derrière une méthode `stage(rt, pl)` choisie par `def.trigger` (≈ 60 lignes dans 34_traps.js + un `dangerAt` par déclencheur). Risque : le bot — `d_kind` suppose une phase prévisible 0,3 s à l'avance ; une plaque qu'on déclenche soi-même n'a pas d'avenir lisible, il faut renvoyer le danger de l'effet **armé** (comme un tireur) ; la partition au sol (`scoreAt`) ne sait montrer que du temps musical.

**Effets : dégâts seulement.** Une seule sortie, `Combat.hitPlayer`. Pas de ralentissement paramétrable (le gaz pose un drapeau binaire), pas de poussée (alors que `pl.kvx/kvy` existe depuis le chantier rythmique, « la monnaie des pièges qui gênent au lieu de blesser », et n'est utilisée par aucun piège), pas d'aveuglement (le défi lumières a le masque `darkC`), pas de feu qui reste (les `hazards` `dps` des boss font exactement ça), pas de tuile détruite (le défi effondrement a `holes`/`warn`). Changement : une table `TRAP_EFFECTS` `{ damage, push, slow, burn, blind, hole }` appelée avec `(target, trap, k)` là où `this.hit(pl)` est appelé (8 sites), ≈ 120 lignes ; `burn` pousse dans `room.hazards` (déjà géré), `hole` réutilise `Challenge` collapse. Risque : équilibrage (un effet non-dégât n'incrémente pas `r.hits` : définir si une poussée casse la « traversée parfaite ») ; `dangerAt` doit distinguer « blesse » et « gêne » (aujourd'hui 0-1 sans sémantique).

**Ennemis ↔ pièges : rien.** Ni dégâts, ni évitement, ni ciblage. Changement minimal : dans chaque `u_kind`, un second balayage `for (const e of G.enemies)` avec le même test géométrique, `Combat.hitEnemy(e, damage × def.enemyMul, { dot: true })`, une `Map` de recharge par ennemi comme `hazards.cd` ; `enemyMul` par défaut 0 pour ne rien changer au banc, 0,5 opt-in (règle §13). Pour les balles de piège : lire `p.trap` dans la branche ennemie de `Projectiles.update` et boucler sur `G.enemies` (≈ 20 lignes). Coût : `N_pièges × N_ennemis` tests de distance par image (10 × 60 = 600, négligeable devant `pointBlocked`). Risque : les boss (`!e.isBoss`, comme `safe_zone` ; PLAN-VARIETE salle 9 du Sérail « à vérifier qu'un rai ne blesse pas le boss »), le banc `normal.js` à refaire, `comportements.js` (28 comportements mesurés) si les ennemis se mettent à mourir dans les gaz.

**Ni destructible, ni désamorçable, ni état persistant.** `disabled` existe (tempo) mais rien ne le pose en jeu. Un piège n'a pas de PV, pas de corps de collision (les balles du joueur ne le voient pas : la branche joueur de `Projectiles.update` ne boucle que sur `G.enemies`), pas de « déjà déclenché ». Changement : `def.hp` + `Trap.body()` (cercle ou rect) + boucle sur `room.traps` dans la branche joueur (≈ 40 lignes), `Trap.break()` → `disabled = true`, particules, `Floaters 'event'`. Risque : `salles.js`/`spawncheck.js` ne connaissent pas de corps solide de piège ; ne **pas** en faire un obstacle (le sas et le couloir de la porte doivent rester libres, et le bot n'a pas de pathfinding).

**Pas de piège lié au terrain ni aux modules.** Un piège est en coordonnées absolues ; un `slide_wall` ou un `rotor` ne peut pas en porter. Le terrain (`room.grid`) est statique et peint une fois (`Terrain.paint` → `floorCache`) : « une eau qui gèle » ou « une boue qui apparaît » oblige à `Sprites.clearFloor()` — interdit par image. Changement : un `parent` optionnel (`{ modular: idx, dx, dy }`) recalculé dans `Trap.update` avant `u_kind` (≈ 25 lignes dans 34_traps + lecture de `m.obs[0].px/py` dans 36_modular) ; pour le terrain, un calque `room.gridFx` (Uint8Array, dessiné par `Terrain.render` comme le miroitement) plutôt qu'une repeinte. Risque : perf (un calque de plus par image) et `check-terrain.js`, qui lit le plan statique.

**Pas de piège porté par un ennemi.** Le coyote (`variant: 'piege'`) pousse un `hazard` à sa mort : c'est le bon canal, mais il est codé en dur dans `Combat.killEnemy` (l. 1154). Changement : `behavior.drop: 'trap_x'` → `new Trap(def, { x, y })` dans `room.traps` avec `once: true`. Risque : un piège ajouté après `Room.create` n'est pas dans `tp.groups` (tempo) ni dans la partition ; `spawncheck.js` ne le voit pas.

**Ce que le bot ne sait pas éviter.** Les balles de piège ne sont vues qu'à 40 px et 0,35 s ; un `emitter` en couronne à 210 px/s est esquivé par chance. Une plaque, une proximité, un piège porté : `dangerAt` n'en saura rien tant que chaque déclencheur n'a pas son `d_`. Le bot ne cherche jamais à casser ni à contourner un piège durable (une scie sans pause : `d_saw_rail` seulement).

**Ce que l'atelier ne sait pas éditer.** Dégâts, vitesse, rayon, motif, rebond, `phase` (il impose `beats`), `inner`, `spacing` ; il ne connaît pas `params.cells` pour les dalles (seul `AnimProp` les a) ; rien pour un déclencheur ou un effet. Changement : étendre `KIND` (une clé par champ) + `tune()`/`bind()` (≈ 10 lignes par champ) ; le format export doit rester un point fixe (`allerretour.js` ne couvre que les amis, il n'y a **pas** d'aller-retour pour les pièges).

**Tests manquants.** Aucun test ne vérifie qu'un piège **blesse** : `etape0.js` (horloge par piège, tourniquet sur la mesure, familles, `kvx`), `bat.js` (sources `Beat.pulse(4)`), `perf.js` (pas de `shadowBlur`, ≤ 7 flous), `spawncheck.js`/`salles.js` (géométrie), `vocabulaire.js` (textes), `comportements.js` (piège à loup), `cadence.js` (décor animé). `tempo.js`/`tempo_dmg.js` cités dans CLAUDE.md sont des scripts de session, pas dans `dev/test/`. Manquent : dégâts et `hitCd` par kind, cohérence `dangerAt` ↔ `hit` (tout point frappé doit avoir été ≥ 0,5 juste avant), projectiles de piège, `syncBeat` (`on`/`every`/`phase`), gaz + ralentissement, déterminisme (deux parties de même graine → mêmes coups), aller-retour atelier → contenu.

**Dettes de code repérées.** `Room.finishRoom` et `botControl` testent `r.type === 'TRAP'`, type absent des 36 salles (seul `room_atelier`) ; `syncBeat` recalculé trois fois par image ; `slow` non lu ; `lifetime` ignoré par `wall_fireball` ; `p.trap` posé et jamais lu ; `gridLines()` recalculé ; télégraphie hors `PAL.alert` (`spike_tiles`, `gas_zone`).

## 4. Architecture proposée

Le principe du chantier 11 (« une entrée de table, jamais un `case` de plus ») appliqué aux pièges : un piège = **déclencheur** × **effet** × **corps**, trois tables de données, et la classe `Trap` devient l'assembleur. Les 10 `kind` actuels restent des raccourcis : une table `TRAP_LEGACY` les traduit en triplets, les 41 définitions et 112 poses ne bougent pas.

```js
const TRAP_TRIGGERS = {
  timer:     { stage(t, rt) { return t.cycle(rt); }, danger(t, x, y, rt) { … 0,3 s d'avance … } },   // cycle / cycleHits / shotState
  press:     { stage(t, rt, who) { /* joueur ou ennemi sur le corps → armé, `t.firedAt = rt` */ } },
  near:      { stage(t, rt) { /* dist(pl) < p.radius → warn puis on */ } },
  shot:      { /* Projectiles.update (branche joueur) appelle Trap.onShot(t, p) */ },
  switch:    { /* Challenge 'switches' ou un autre piège pose t.armed */ },
  carried:   { /* posé par Combat.killEnemy via behavior.drop, once: true */ },
};
const TRAP_EFFECTS = {
  zone:  { apply(t, target, k) { Combat.hitPlayer / hitEnemy × enemyMul } },   // segment, rect, cercle (l'existant)
  shoot: { apply(t) { Projectiles.spawn({ trap: true, hitsEnemies }) } },
  push:  { apply(t, target) { target.kvx += cos(a) × p.force … } },            // 1440 px/s = 3 tuiles
  status:{ apply(t, target) { target.status.slow = { mul, until } / blind / burn } },
  burn:  { apply(t) { room.hazards.push({ dps, until, owner: 'trap' }) } },
  hole:  { apply(t, cells) { Challenge.holes … } },
};
const TRAP_BODIES = { line, arc, grid, tiles, disc, rail, mount, beam, prop /* drawProp / look */ };
```

- `Trap.update(dt, rt)` devient : `stage = TRIGGER.stage(this, rt)` → si `warn` : `warn(idx)` ; si `on` : pour chaque cible (`G.player`, puis `G.enemies` si `enemyMul > 0`, puis `G.pets` si `petsMul > 0`) `if (BODY.hits(this, target)) EFFECT.apply(this, target, k)`. `dangerAt` = `TRIGGER.danger` × `EFFECT.weight` (1 pour un dégât, 0,4 pour une gêne : le bot n'a plus à dasher devant une poussée).
- **Blesser les ennemis** : même géométrie que le joueur (`segCircle`, `circleRect`, `dist`), une `Map` de recharge par ennemi (0,5 s), `!e.isBoss`, `enemyMul` dans `05_balance.js` (`BALANCE.trapEnemyMul`, défaut 0,5 une fois mesuré au banc, 0 avant). Les balles : `p.hitsEnemies` lu dans la branche ennemie de `Projectiles.update` — 15 lignes.
- **Le joueur s'en sert** : attirer (les ennemis ne l'évitent pas : un joueur qui traverse un tourniquet en tirant un Bloc derrière lui le fait blesser ; rien à coder de plus), déclencher (`press` avec `who: 'any'`, ou `shot` : tirer sur une jarre de naphte pour la faire partir maintenant), casser (`def.hp`, `Trap.onShot`, `break()` → `disabled`, et un `Floaters 'event'` « désamorcé »).
- **Déterminisme** : tous les déclencheurs lisent `rt` (`room.time` ou `Beat.t`), jamais `Time.now` sauf pour les rafales (règle existante) ; tout tirage passe par `RNG` ; l'état persistant est daté (`firedAt`, `brokenAt`) pour survivre au retour en arrière de l'atelier (même logique que `lastShot`). Un `enemyMul > 0` change les morts, donc le score : le banc (`normal.js`) est la mesure, pas le ressenti.
- **Tests** : un `pieges.js` dans `dev/test/` : pour chaque kind, poser via `new Trap`, placer le joueur au point frappé à l'instant `on`, vérifier PV et `hitCd` ; vérifier `dangerAt ≥ 0,5` sur ce point 0,25 s avant ; un ennemi dans la zone prend `× enemyMul` ; une plaque non foulée ne frappe pas ; un piège cassé ne rend plus rien ; deux `__autoplay` de même graine donnent le même `hitsTaken`. Les 52 tests existants ne changent pas tant que `TRAP_LEGACY` reproduit les phases à l'identique (`etape0.js` compare `Room.trapTime` et le tourniquet sur la mesure : à garder tel quel).

**Coût et découpage** (une séance = quelques heures, batterie verte à chaque fin) :

1. **Séance A — refonte à iso-comportement + dettes** (risque faible). Tables `TRIGGERS/EFFECTS/BODIES`, `TRAP_LEGACY`, `syncBeat` mis en cache, `slow`/`lifetime` lus, télégraphie en `PAL.alert`, `TRAP` mort retiré, `pieges.js` écrit d'abord sur l'ancien code puis rejoué sur le nouveau. ≈ 300 lignes déplacées, 100 nouvelles.
2. **Séance B — les ennemis et les compagnons subissent** (risque moyen : équilibrage). `enemyMul`/`petsMul`, balles `hitsEnemies`, `!isBoss`, banc avant/après, `comportements.js` remesuré, CONTENT.md §13 note 6 fermée. ≈ 80 lignes.
3. **Séance C — nouveaux déclencheurs et effets** (risque moyen : bot et atelier). `press`, `near`, `shot`/cassable, `push`, `status`, `burn` ; un `dangerAt` par déclencheur ; `KIND` de l'atelier étendu ; 5-6 pièges de contenu neufs qui les emploient (un par palier, écrits dans PLAN-VARIETE.md avant la pose). ≈ 250 lignes + contenu.
4. **Séance D — pièges portés, parentés et terrain temporaire** (risque élevé : collision, perf, tests de géométrie). `carried` (le coyote passe par la table), `parent` sur module mobile, `room.gridFx`, corps `prop` (sprite PixelLab). ≈ 200 lignes, `check-terrain.js` et `salles.js` à adapter.

## 5. Les règles à garder

- **Géométrie de salle** : sas d'entrée (colonnes 0-2, lignes 5-7) et couloir de la porte (21-23) libres de tout piège (`salles.js`), pièges sur tuile praticable sauf montés au mur (`spawncheck.js`), jamais de tourelle en (23,6), un piège n'est jamais un obstacle (le bot n'a pas de pathfinding, brèches de 3 tuiles), `node dev/check-terrain.js` à 0.
- **Perf** : ≤ 7 flous par image en salle (`perf.js`), aucun `shadowBlur` dans un `r_*` — `Halo.draw/line/ring/rect` ; pas de repeinte du sol par image ; la partition au sol reste recalculée au demi-temps (`scoreAt`), jamais par image.
- **Lisibilité** : télégraphie **avant** tout dégât (`telegraph > 0` obligatoire pour un effet qui blesse, `warn()` sonore une fois par coup, sons calés via `delay`), annonce en `PAL.alert` et jamais dans la couleur de l'ennemi, l'or dit la mesure et jamais « ça va frapper », ce qui vit bat en `Beat.pulse`, ce qui est bâti ne bat pas.
- **Rythme** : l'horloge est choisie par piège (`params.beats` → `Beat.t`), l'ancien format `{ period, on }` reste supporté, `turn`/`trip` hors `speedMul`, un coup est un instant comparé à `lastShot`, epsilon 10⁻⁹ sur les bornes de boucle, rafales en `Time.now`. La salle du tempo démarre sans piège et arme une famille par vague (filet 10 mesures) : ne pas toucher à `wavesStarted`.
- **Données** : un piège appartient à un palier (id, nom, `color`), pas de logique dans `content*.js`, un nombre d'équilibrage a un nom dans `05_balance.js`, une mécanique nouvelle est une entrée de table et jamais un `case`, tout tirage par `RNG`.
- **Vocabulaire** : un mot par notion, tutoiement, pas de mot banni dans `name`/`desc` (`vocabulaire.js` balaie `CONTENT.traps`) ; les identifiants du code ne changent pas.
- **Compagnons** : un compagnon ne meurt jamais ; si les pièges le touchent un jour, c'est par `Pets.hurt` seulement, et jamais le compagnon `away`.
- **Batterie** : `spawncheck.js`, `salles.js`, `etape0.js`, `bat.js`, `perf.js`, `vocabulaire.js`, `comportements.js` restent verts à chaque séance ; un test nouveau vit dans `dev/test/`, jamais dans un dossier de session.
