# SUJET NEUF — Rapport de l'Agent Test (phase 1, salles 1-5)

Date : 2026-09-05. Périmètre : équilibrage des données (`dev/content.js`), bugs moteur consignés sans correction.
Fichiers modifiés : `dev/content.js` (valeurs chiffrées uniquement), `index.html` (régénéré par `dev/build.js`), ce rapport.

---

## 1. Méthode

- **Harness** : `window.__autoplay(config)` piloté par Playwright/Chromium headless (`timeScale 40`, `render:false`, `maxSeconds 420`). Un run dure 1-2 s réel (10 s en cas de timeout). Aucune erreur JS, aucun warning console sur les ~330 runs.
- **Instrumentation ajoutée côté page (sans toucher au moteur)** : enveloppes sur `Combat.hitPlayer` (dégâts par salle et par source : contact/projectile/piège/explosion, identifiant du piège ou de l'ennemi), `Combat.hitEnemy` (dégâts au boss, coups dans le dos, coups pendant la faiblesse, durée réelle du combat), `Skills.use` (usages par compétence), `UI.showChoice` (raretés proposées, sous-titre du coffre, `G.run.scores`), `Run.checkpoint` (`coinsPending` → `coinsValidated`), `Run.onPlayerDeath` (salle, cause, pièces attendues vs `Meta.profile.coins`), `Run.endLevel`.
- **Plan de mesure** (bot aléatoire, `pickStrategy:'random'`, personnage `char_neuf`, compétence variée par run) :
  - A : mode normal, difficulté 1, 8 armes × 6 seeds (500-547) = 48 runs, **répété à l'identique avant et après chaque itération** (mêmes seeds) ;
  - B : mode normal, 4 armes (lame, arc, pistolet, boomerang) × 2 seeds, difficultés 0,75 et 1,5 ;
  - C : mode test (méta au max), difficultés 1 et 2, mêmes 4 armes × 2 seeds ;
  - baseline initiale supplémentaire : 8 armes × 3 seeds (200-223).
- **Métriques par run** : salle atteinte, salle de mort, temps et coups par salle, DPS observé (`damageDealt/durationSec`), durée du combat de boss (premier coup → mort), niveau atteint, dégâts subis par source.
- **Trois itérations** de réglage (≤ 30 % par valeur, une cause par levier), chacune re-mesurée sur le plan A ; le plan B/C n'a été rejoué qu'à l'état final.
- Scripts : `scratchpad/bench2.js` (balayage instrumenté), `analyze.js` (agrégats), `sources.js` (sources de dégâts, boss, coffre, morts), `diag_orb.js` (échantillonnage d'état), `patch_iter{1,2,3}.js` (modifications appliquées, rejouables).

Limites du bot à garder en tête (elles biaisent les chiffres, pas les conclusions) : il tire 100 % du temps quand une cible est à portée (uptime d'un humain ≈ 50-60 %), il se place à 40 px des ennemis avec une arme de mêlée (dans la portée de bond du Rôdeur, et **au contact du boss** : 40 px < 36 + 14), il ne charge pas l'arc volontairement, il traverse la salle 2 en 6 s sans ramasser les 3 derniers fragments.

---

## 2. Tableaux avant / après

### 2.1 Mode normal, difficulté 1, 48 runs (mêmes seeds avant/après)

| Global | Avant | Après (it. 3) | Cible |
|---|---|---|---|
| Runs atteignant la salle 4 | 50 % | **60 %** | 50-65 % |
| Runs battant le boss | 48 % | 52 % (toutes armes) · 78 % hors orbe/lame/marteau | 30-45 % |
| Morts par salle (S1/S2/S3/S5) | 6 / 7 / 11 / 1 | 7 / 1 / 11 / 4 | — |
| Boss : durée du combat (hors flamme) | 13,4 s (boomerang 6,6 · pistolet 10,7 · chaîne 15,5 · arc 18,6) | **27,8 s** (boomerang 19,2 · pistolet 30,9 · chaîne 30,8 · arc 30,7) | 30-70 s |
| Boss : coups reçus / dégâts subis par combat | 0,8 / 16 | 2,0 / 37 | — |
| Boss : tués par le boss / combats | 1 / 24 | 4 / 29 | ~25-40 % |
| Niveau moyen atteint | 4,7 | 5,0 | — |
| Dégâts subis par run | 103 | 95 | — |

Par arme (victoire = boss tué ; S4+ = coffre atteint ; « boss » = durée réelle premier coup → mort) :

| Arme | Avant : victoires / S4+ | Avant : morts | Avant : DPS obs. | Avant : boss | Après : victoires / S4+ | Après : morts | Après : DPS obs. | Après : boss |
|---|---|---|---|---|---|---|---|---|
| Lame d'essai | 0 % / 0 % | S1:1 S2:3 S3:2 | 25,8 | — | 0 % / 0 % | S2:1 S3:5 | 31,8 | — |
| Masse de pression | 0 % / 17 % | S3:5 S5:1 | 51,2 | 0/1 | 0 % / 33 % | S3:4 S5:2 | 55,0 | 0/2 |
| Arc tendeur | 83 % / 83 % | S3:1 | 31,7 | 18,6 s | 50 % / 67 % | S1:1 S3:1 S5:1 | 33,2 | 30,7 s |
| Pistolet à ricochet | 67 % / 67 % | S3:2 | 28,3 | 10,7 s | 83 % / 100 % | S5:1 | 37,6 | 30,9 s |
| Boomerang de rappel | 67 % / 67 % | S2:2 | 27,5 | 6,6 s | 83 % / 83 % | S3:1 | 38,0 | 19,2 s |
| Orbe orbitale | 0 % / 0 % | S1:5 S2:1 | 6,1 | — | 0 % / 0 % | S1:6 | 11,4 | — |
| Arc voltaïque | 100 % / 100 % | — | 36,7 | 15,5 s | 100 % / 100 % | — | 47,5 | 30,8 s |
| Brûleur court | 67 % / 67 % | S2:1 S3:1 | 37,0 | **0,6 s** (bug) | 100 % / 100 % | — | 74,4 | **1,4 s** (bug) |

Par salle (temps moyen / coups moyens sur les runs qui y sont passés ; refTime 45/60/75/20/120) :

| Salle | Avant | Après | Cible bot |
|---|---|---|---|
| S1 Préparation + combat | 15,8 s / 1,7 coup | 16,3 s / 1,7 | 25-50 s |
| S2 Pièges | 9,1 s / **3,3 coups** | 6,4 s / **1,4 coup** | 0-2 coups |
| S3 Combat + pièges | 17,7 s / 2,4 | 17,6 s / 2,6 | 40-80 s |
| S4 Coffre | 4,1 s / 0 | 4,0 s / 0 | — |
| S5 Mini-boss (salle entière) | 16,5 s / 0,8 | 25,6 s / 2,0 | boss 30-70 s |

Sources de dégâts par run (moyenne sur les runs qui visitent la salle), avant → après :
- S1 : Rôdeur contact 20,9 → 15,0 (lame seule : 55,8 → 45,3) ; Nuée 3,5 → 10,0 (elle survit plus longtemps à 10 PV) ; Sentinelle 1,4 → 1,0.
- S2 : dalles 23,2 (1,98 coup) → 9,9 (0,83) ; balayage 14,0 (1,02) → 0 (0) ; scie 9,8 → 9,2 ; tourniquet 1,9 → 3,5.
- S3 : tourniquet 9,9 → 7,3 ; Bloc 8,4 → 11,2 (175 PV, il vit plus longtemps) ; tourelles 6,9 → 8,8 ; dalles 6,3 → 2,0 ; Rôdeur 2,0 → 5,2.
- S5 : contact boss 8,2 → 16,7 (marteau : 89,6 dès l'avant) ; projectiles 7,7 → 15,2 ; slam 0 → 5,2.

### 2.2 Difficultés et mode test (4 armes × 2 seeds, avant = baseline initiale, après = it. 3)

| Config | Avant : victoires / S4+ | Avant : boss (salle) | Après : victoires / S4+ | Après : boss (salle) |
|---|---|---|---|---|
| Normal d0,75 | 75 % / 88 % | 11,9 s | 75 % / 100 % (lame 0/2, morte au boss) | 25,6 s |
| Normal d1,5 | 13 % / 13 % | 13,7 s | 13 % / 25 % | 43,7 s |
| Test d1 | 100 % / 100 % | 9,8 s | 88 % / 100 % (lame 1/2) | 24,5 s |
| Test d2 | 25 % / 38 % | 16,5 s | 50 % / 63 % | 30,3 s |

Note : en d1,5 et d2 les pièges frappent au carré de la difficulté (bug §4.3) : dalles 26,6/coup en d1,5 (attendu 15), balayage 52/coup en d2 (attendu 28), ce qui explique la falaise entre d1 et d1,5.

### 2.3 Trajectoire des itérations (plan A, 48 runs)

| | Baseline | It. 1 | It. 2 | It. 3 |
|---|---|---|---|---|
| S4+ | 50 % | 60 % | 63 % | 60 % |
| Victoires | 48 % | 54 % | 56 % | 52 % |
| Combat de boss (toutes armes, flamme incluse) | 10,9 s | 13,1 s | 18,5 s | 20,5 s |
| Coups en S2 | 3,3 | 1,6 | 1,3 | 1,4 |
| Boomerang : coups dans le dos / combat | 7-10 | 11-17 | 14-22 | 23-34 (×1,6, fenêtre 0,6 s) |

---

## 3. Changements appliqués à `dev/content.js`

Toutes les valeurs sont chiffrées, aucun id/champ/objet ajouté ou retiré. `index.html` régénéré, syntaxe vérifiée après chaque itération.

| It. | Objet | Champ | Avant → Après | Raison mesurée |
|---|---|---|---|---|
| 1 | boss_etalon_07 | hp | 900 → 1170 | boss tué en 10,9 s (cible 30-70) |
| 2 | boss_etalon_07 | hp | 1170 → 1500 | encore 13 s après it. 1 |
| 3 | boss_etalon_07 | hp | 1500 → **1900** | 18,5 s après it. 2 ; bot à 100 % d'uptime |
| 1 | boss_etalon_07 | weakness.damageMul | 2,0 → 1,6 | boomerang/ricochet : 7-10 coups dans le dos par combat, boss tué en 2-8 s |
| 1 | boss_etalon_07 | weakness.stunCooldown | 3,0 → 4,0 | idem (stun toutes les 3 s = boss passif) |
| 3 | boss_etalon_07 | weakness.window | 0,8 → 0,6 | boomerang toujours à 13-26 s avec 1500 PV |
| 1 | boss phase 1 | ring.cooldown / charge.cooldown / slam.cooldown | 3,5 → 2,6 / 5,0 → 3,8 / 6,0 → 4,5 | boss inoffensif : 16 dégâts par combat, 0,8 coup |
| 1 | boss phase 2 | fan / spiral / summon / charge cooldown | 2,5 → 1,9 / 6,0 → 4,5 / 9,0 → 7,0 / 5,0 → 3,8 | idem |
| 3 | boss phase 1 | ring.projDamage / charge.damage / slam.damage | 12 → 15 / 20 → 25 / 25 → 31 | 2 coups par combat ne menacent pas (25 dégâts) |
| 3 | boss phase 2 | fan.projDamage / spiral.projDamage / charge.damage | 12 → 15 / 10 → 13 / 22 → 27 | idem |
| 2 | boss_etalon_07 | damage (contact) | 18 → 14 | le bot mêlée reste au contact : 40-90 dégâts de contact par combat (marteau) ; le danger doit venir des patterns |
| 1 | enemy_rodeur | damage | 10 → 8 | contact Rôdeur = 56-77 dégâts/run en S1 pour lame/orbe |
| 1 | enemy_bloc | damage | 15 → 12 | contact Bloc = 43 dégâts/run en S3 pour le marteau (charge ×1,5 → 18) |
| 2 | enemy_rodeur / sentinelle / bloc / meche / nuee | hp | 30 → 38 / 26 → 32 / 140 → 175 / 18 → 22 / 8 → 10 | salles 1 et 3 trop courtes (16-18 s) ; effet nul sur la durée (voir §5.1), conservé car il ramène pistolet/chaîne/arc vers 80 % |
| 2 | weapon_blade | damage | 18 → 22 | compense les +25 % PV : Rôdeur toujours en 2 coups, Nuée en 1 |
| 1 | weapon_orb | range / size / special.radius / special.angularSpeed | 90 → 65 / 14 → 18 / 90 → 65 / 4,5 → 5,8 | anneau creux (§4.2) ; atténuation partielle, insuffisante sans correctif moteur |
| 1 | trap_dalles | period | 2,0 → 2,6 | 1,98 coup/run en S2 (cible 0-2 au total) |
| 1 | trap_balayage | period | 4,0 → 5,0 | 1,02 coup/run en S2 |

Descriptions désormais obsolètes (chaînes, non modifiées) : `weapon_blade.desc` « (54 DPS) » → 66 DPS ; `weapon_orb.desc` « 2 orbes… » rayon 90 ; `boss.weakness.desc` « ×2 … 0,8 s » → ×1,6 / 0,6 s ; `boss.revenge.desc` « 1440 PV » → 3040 PV (1900 × 1,6) ; CONTENT.md §13.8 (« 900 PV »).

---

## 4. Bugs moteur trouvés (non corrigés)

### 4.1 Brûleur court : 14× trop de projectiles (bloquant pour le boss)
- Fichier : `dev/30_entities.js`, `Weapons.flame` : `pl.flameAcc = (pl.flameAcc || 0) + dt * rate * 14;` puis chaque particule fait `Weapons.dmgOf(pl)` (6 dégâts pleins) avec `pierce: 2 + st.pierce`.
- Symptôme : 140 particules/s × 6 = 840 DPS nominal contre toute cible qui remplit le cône. Le boss (rayon 36) meurt en **0,6 s (900 PV) / 0,9-1,9 s (1900 PV)**, 159-318 impacts, quel que soit le niveau. Sur les petits ennemis la dispersion masque le problème (DPS observé 37-74, dans la norme).
- Reproduction : `await __autoplay({seed:507, weapon:'weapon_flame', skill:'skill_magnet', mode:'normal', difficulty:1, timeScale:40})` → `roomTimes[4].time ≈ 4,7 s` ; ou panneau debug → Aller salle 5 avec le Brûleur : le boss meurt avant la fin de son intro.
- Correctif proposé : `dt * rate` (10 ticks/s comme dans la desc) en gardant `damage: 6`, ou garder 14 particules par tick mais `damage / 14` par particule. Aucune valeur de contenu n'a été changée pour la flamme : après correctif, 60 DPS nominal est correct.

### 4.2 Orbe orbitale : anneau creux, dilaté quand on tire
- Fichier : `dev/30_entities.js`, `Weapons.orbital` : `targetR = range * st.range * (firing ? (w.special.expand || 1.35) : 1)` ; les orbes ne touchent que dans la couronne `orbR ± (size + e.r)`.
- Symptôme : la Nuée et le Rôdeur collent le joueur à 22-30 px (échantillonné : `nuee(chase,d23..31)` pendant 30 s), la Sentinelle reste à 300-400 px ; rien n'est jamais dans la couronne (62-114 px avec rayon 65 dilaté à 88). Résultat bot : **0/12 sorties de la salle 1, 1 timeout à 420 s**, 6-11 DPS observé (48 annoncé par orbe). Un humain ne peut pas non plus toucher un ennemi au contact.
- Reproduction : `await __autoplay({seed:213, weapon:'weapon_orb', skill:'skill_dash', mode:'normal', timeScale:40, maxSeconds:120})` → `outcome:'timeout'`, `roomReached:1`.
- Correctif proposé : contracter (0,75) au lieu de dilater l'anneau en tir, ou compter comme touché tout ennemi à distance ≤ orbR + size du joueur (disque plein) ; et dans `70_debug.js` `botControl`, `wantDist` pour `orbital` = `range * 0,9` maintient les cibles sur le bord de l'anneau.

### 4.3 Dégâts des pièges multipliés deux fois par la difficulté
- Fichiers : `dev/34_traps.js:18` `this.damage = Math.round(def.damage * d.damageMul)` (d = `G.difficulty`, déjà × `G.debug.difficulty`) **et** `dev/30_entities.js` `Combat.hitPlayer` : `if (info.type === 'trap') dmg *= pl.stats.trapDamageMul * G.debug.difficulty`.
- Symptôme mesuré : d0,75 → dalles 6,2/coup (attendu 7,5) ; d1,5 → dalles 26,6 et tourniquet 28,2/coup (attendus 15 et 18) ; d2 → balayage 52/coup (attendu 28). Avec le malus « Sol instable » (×2) une dalle fait 80 en d2. Le rayon `laser_sweep` du boss revanche passe par le même chemin (`type:'trap'`). Les projectiles de pièges (`proj:trap`) ne sont comptés qu'une fois (12,6/coup en d1,5) : incohérent avec les lasers/dalles.
- Reproduction : `await __autoplay({seed:301, weapon:'weapon_bow', skill:'skill_shockwave', mode:'normal', difficulty:1.5})` puis comparer les floaters « -27 » sur les dalles (10 × 1,5 attendu = 15).
- Correctif : supprimer le facteur `G.debug.difficulty` dans `hitPlayer` (garder `trapDamageMul`), ou ne pas multiplier dans le constructeur de `Trap`.

### 4.4 Cause de mort jamais renseignée
- `dev/40_room.js:250` : `r.stats.deathCause = Run.lastDamageSource || 'inconnu'` mais `Run.lastDamageSource` n'est assigné nulle part (`grep lastDamageSource dev/*.js` → une seule occurrence). Toutes les morts sont « inconnu » dans l'écran de fin et les stats. Correctif : renseigner `Run.lastDamageSource` dans `Combat.hitPlayer` à partir de `info` (`type`, `source`).

### 4.5 L'autoplay en mode normal écrit dans la vraie sauvegarde
- `dev/70_debug.js` `autoplay()` fait `Meta.setMode(c.mode)` ; en `'normal'`, `Meta.addCoins` / `Meta.recordRun` / `unlockLore` passent par `save()` → localStorage. Après 48 runs de test le profil réel affiche 4 181 crédits, 48 runs, fragments de lore débloqués. Reproduction : lancer `__autoplay({mode:'normal'})` puis recharger la page et ouvrir le hub. Correctif : profil jetable (`fresh()` sans passifs) pendant `G.autoplay`, ou inhiber `save()` tant que `G.autoplay` est non nul.

### 4.6 Divers (mineurs)
- `dev/32_enemies.js` : `contactDamage()` est défini deux fois (méthode de classe puis `Enemy.prototype.contactDamage = …`) ; le second gagne et code en dur ×1,5 pour la charge du Bloc : le champ de contenu `behavior.chargeDamageMul` est ignoré. `contactDamageTank()` est mort.
- `dev/40_room.js` `finishRoom` : la salle 2 vaut 1,0 (score « parfait ») dès que `hits === 0`, même en traversant en 6 s sans les fragments 3-5 ; le coffre affiche alors « Sans dégât : Colossal garanti » (run chaîne #506 : S2 en 8 s, 0 fragment, colossal). Note d'équilibrage CONTENT.md §13.7 confirmée : le score de S2 doit tenir compte des fragments.
- `dev/70_debug.js` bot : `wantDist = 40` pour la mêlée est inférieur à `boss.r + pl.r = 50` → contact permanent avec le boss (14 dégâts / 0,7 s) ; les morts de la Masse en S5 viennent de là, pas du contenu.
- Le résultat d'`__autoplay` n'expose pas `skillUses` ni `deathCause` (présents dans `G.run.stats`) ; ajoutés par enveloppe pour ce rapport.

---

## 5. Déséquilibres restants et recommandations

### 5.1 Salles 1 et 3 trop courtes : c'est structurel, pas une affaire de PV
+25 % de PV sur les cinq ennemis n'a changé ni S1 (15,8 → 16,3 s) ni S3 (17,7 → 17,6 s) : le temps de salle est dominé par les déplacements et les délais de vague (spawn 0,6 s + 0,5 s après « clear »), pas par le temps de kill (< 1 s par ennemi à 50 DPS). Pour atteindre 25-50 s en S1 et 40-80 s en S3 il faut plus d'ennemis par vague ou une 4e vague (champs `count`/`waves`, hors périmètre de ce passage), ou des vagues déclenchées au temps (`at: <s>`) plutôt qu'au « clear ». Recommandation : S1 +1 Rôdeur et +1 Sentinelle par vague 2/3, S3 une 4e vague (Éclipse ×2 + Nuée) ; puis reprendre les PV à 30/26/140/18/8 si la durée dépasse la cible.

### 5.2 Boss : encore sous la cible pour le bot, probablement bon pour un humain
1900 PV donnent 28 s de combat pour un bot à 100 % d'uptime (boomerang 19 s, arc/pistolet/chaîne 31 s). Un humain qui esquive (uptime 50-60 %) et exploite le dos (×1,6) devrait être vers 40-60 s : je recommande de **ne pas dépasser 1900** sans playtest humain ; s'il faut allonger, baisser le `cooldown` de charge (plus de charges dans les murs = plus d'occasions dans le dos) plutôt que les PV (CONTENT.md §13.8). Le boss ne tue encore que 14 % des arrivants (cible ~25-40 %) : le levier suivant est la télégraphie (`telegraph` 0,8 → 0,6 sur ring/fan) ou `projSpeed` du ring 260 → 320, à essayer un à la fois.

### 5.3 Boomerang de rappel : le passage retour est toujours un coup dans le dos
23-34 coups dans le dos par combat (chaque retour vient de derrière si le boss regarde le joueur). Avec ×1,6 et fenêtre 0,6 s le boss tombe encore en 13-26 s. Options : (a) moteur : ne pas compter le passage retour (`p.returning`) comme coup dans le dos, ou limiter la règle `back` aux projectiles dont l'origine est derrière le boss ; (b) contenu : `damage` 22 → 18 (le boomerang est déjà 100 % en normal avec le boss facile). Je recommande (a) : c'est une exploitation involontaire de la règle, pas un problème de chiffres.

### 5.4 Armes de mêlée : 0 % avec le bot, à valider en jeu humain
Lame, Masse et Orbe ne sortent pas de la salle 3 avec le bot (S1 : 5,8 coups de Rôdeur pour la lame). Les changements appliqués (Rôdeur 8, Bloc 12, contact boss 14, lame 22) réduisent la punition sans rendre le bot compétent. À rejouer à la main : si la Lame reste < 15 % chez un humain, monter `knockback` 1,0 → 1,3 (repousse hors de la portée de bond) avant de toucher aux dégâts. La Masse a le meilleur DPS observé (55) : son problème est uniquement l'exposition.

### 5.5 Pistolet, chaîne, arc entre 83 et 100 %
Après it. 3 : chaîne 100 %, pistolet 83 %, boomerang 83 % (arc 50 %). Ces armes bénéficient du bot qui esquive bien et tire sans arrêt ; la cible « aucune arme > 80 % » n'est pas atteinte. Ne pas les nerfer avant le correctif §4.1-4.3 et un playtest : la chaîne (48 DPS solo) est dans la norme, sa force vient des groupes (Nuée) et de la sécurité à 420 px.

### 5.6 Difficulté
d0,75 : 75 % de victoires, boss 26 s ; d1,5 : 13-25 % ; d2 (test) : 50 %. La marche d1 → d1,5 est trop raide **à cause du bug §4.3** (pièges ×2,25) ; à re-mesurer après correctif. La formule `speedMul = 0,7 + 0,3·d` est douce, la formule `hpMul = d` est raide : envisager `hpMul = 0,5 + 0,5·d` si la marche reste trop forte.

### 5.7 Méta et malus de niveau
« Fragile » (−25 % PV) apparaît dans 10 des 22 morts en S1-S3 après it. 3, « Protocole d'urgence » dans 8 (le contact répété du Bloc/boss profite de l'invulnérabilité à 0,3 s). « Sol instable » ×2 devient ×8 en d2 avec le bug §4.3. Rien à changer côté contenu tant que le bug est là ; plafonner ensuite `trapDamageMul` effectif à 3.

### 5.8 Vérifications fonctionnelles (toutes OK)
- **8 compétences utilisées** : dash 7, bouclier 16, onde 14, dilatation 12, tourelle 18, saut 10, aimant 14, surrégime 14 (105 usages / 48 runs).
- **4 raretés** vues dans 219 écrans de choix : commun 341, rare 177, épique 111, colossal 28 (≈ 52/27/17/4 %, cohérent avec luck 4).
- **Coffre S4** : sous-titre = fenêtre S1-3 · qualité · plancher ; vérifié sur 27 coffres : qualité 38-49 % → « Tirage normal », 54-79 % → « Rare garanti » (≥ 1 rare proposé), 81-91 % → « Épique garanti » (≥ 1 épique), 100 % → « Colossal garanti » (colossal proposé). `G.run.scores` cohérent avec les `roomTimes` (score 0,1 = 5 coups, 0,58 = 2 coups, 1 = 0 coup).
- **Checkpoint S4** : `coinsPending` 44-55 → 0, `coinsValidated` = montant, `lastCheckpoint` = 4 (27/27).
- **Mort** : pièces conservées = `floor(pending × 0,1 × (salle − checkpoint))` : S2 19 → 3, S3 39 → 11, S5 après checkpoint → 0 + 45-53 validés ; `Meta.profile.coins` augmente exactement du montant (48/48). **Victoire** : validés + pending + 60 (157-179).
- **Bonus S2 « Traversée parfaite »** (+30 XP) déclenché à 0 coup ; XP de S2 sans fragments : voir §4.6.

---

## 6. Ce qu'il reste pour la phase 2

- **Salles 6-9** : `Run.nextRoom` s'arrête à `maxPhase1 = 5` et `Room.load` refuse `ROOM_TYPES.phase > 1` ; les squelettes existent dans `content.js` (S6 combat modulaire avec Éclipse/Incubateur, S7 grille + nappe de gaz, S8 coffre final, S9 boss revanche). Aucun de ces ennemis (Éclipse, Incubateur) ni pièges (grille, nappe) n'a été mesuré : les valeurs sont brutes. Prévoir pour l'Incubateur le plafond `max 3` (CONTENT.md §13.11) et un test dédié de la Nuée × Fragile × Protocole d'urgence (§13.4).
- **Salles modulaires** : champ `modular: []` vide partout, crochet présent mais aucun module à tester.
- **Biome 2** : un seul biome ; `biomes[].difficulty` multiplicateurs jamais ≠ 1 en jeu.
- **Boss revanche** (`revenge`) : `hpMul 1,6` → 3040 PV avec le nouveau socle ; réviser (1,3 ?) après playtest humain de S5 ; `laser_sweep` passe par `type:'trap'` (bug §4.3) ; la plaque dorsale (6 impacts) et les patterns copiés de la compétence ne sont pas implémentés.
- **Manette / mobile** : `Input` clavier-souris uniquement (`Input.axis`, `Input.mouse`) ; pas de mapping gamepad ni de pointeur tactile / sticks virtuels (`grep gamepad|touch dev/*.js` : aucune occurrence) ; `shell.html` a bien un `meta viewport`, mais le rendu reste en 1280×720 logique.
- **Moteur, à corriger avant tout nouvel équilibrage** : §4.1 (flamme), §4.2 (orbe), §4.3 (pièges × difficulté²), §4.5 (autoplay et sauvegarde), puis rejouer `bench2.js plan_A6.json` pour ré-étalonner ; ensuite seulement revisiter le boomerang (§5.3) et les PV du boss (§5.2).
- **Harness** : exposer `skillUses`, `deathCause`, sources de dégâts et durée du combat de boss dans le résultat d'`__autoplay` (tout existe dans les enveloppes de `scratchpad/bench2.js`) ; bot mêlée : `wantDist` ≥ `e.r + pl.r + 10` ; bot S2 : ramasser les fragments jusqu'à 30 s.

---

## Résumé (10 lignes)

1. ~330 runs automatisés (8 armes, 3 difficultés, 2 modes), 0 erreur JS ; harness instrumenté pour les sources de dégâts, le boss, les compétences, les raretés, le coffre et les pièces.
2. Baseline : boss tué en 11 s (flamme 0,6 s, boomerang 7 s), inoffensif (16 dégâts/combat), 100 % de victoire dès la salle 4 ; salle 2 à 3,3 coups/run ; orbe incapable de sortir de la salle 1.
3. Trois itérations sur `content.js` : boss 900 → 1900 PV, faiblesse ×2/0,8 s → ×1,6/0,6 s, cooldowns −25 %, dégâts de patterns +25 %, contact 18 → 14 ; Rôdeur 10 → 8 et Bloc 15 → 12 de dégâts ; PV ennemis S1/S3 +25 % ; lame 18 → 22 ; orbe 90/14/4,5 → 65/18/5,8 ; dalles 2,0 → 2,6 s et balayage 4,0 → 5,0 s.
4. Résultat (normal d1) : 60 % des runs atteignent le coffre (cible 50-65 ✓), salle 2 à 1,4 coup ✓, combat de boss 13 → 28 s (arc/pistolet/chaîne ≈ 31 s, boomerang 19 s), boss 2× plus dangereux.
5. Non atteint : 52 % de victoires (cible 30-45) parce que les armes à distance restent à 83-100 % avec un bot qui tire en continu ; mêlée et orbe à 0 % (limite du bot + bug orbe).
6. Salles 1 et 3 restent à 16-18 s : +25 % de PV n'a rien changé, il faut plus d'ennemis/vagues (hors périmètre données).
7. Bugs moteur bloquants : flamme ×14 projectiles (boss en 1 s), orbe à anneau creux et dilaté au tir, pièges multipliés deux fois par la difficulté (×4 en d2).
8. Bugs mineurs : cause de mort jamais renseignée, autoplay normal qui écrit dans la sauvegarde réelle, `chargeDamageMul` ignoré, score parfait de S2 sans fragments.
9. Fonctionnel validé : 8 compétences, 4 raretés, plancher du coffre cohérent avec les scores, checkpoint et pourcentage de pièces à la mort exacts sur 48/48 runs.
10. Priorités : corriger §4.1-4.3 et 4.5, rejouer le plan A, playtest humain de la lame et du boss avant tout nouveau réglage ; phase 2 = salles 6-9, modules, biome 2, boss revanche, manette/mobile.

---

## 7. Suite donnée par l'agent principal (après le rapport)

Bugs moteur corrigés dans `dev/` et vérifiés par un nouveau balayage (8 armes × 8 compétences, mode normal, difficulté 1, 0 erreur JS) :

| Bug | Correctif |
|---|---|
| 4.1 Brûleur ×14 projectiles | 3 particules par tick à 1/3 des dégâts chacune, sans crit : DPS nominal = dégâts × cadence. Le boss n'est plus tué en 0,6 s (le bot Brûleur meurt en salle 3 à 44 s). |
| 4.2 Orbe à anneau creux | Tirer resserre l'anneau (×0,7) au lieu de le dilater ; le bot vise le bord de l'anneau. L'orbe atteint la salle 3 avec 26 kills (0 sortie de salle 1 auparavant). |
| 4.3 Pièges ×difficulté² | Le facteur `G.debug.difficulty` est retiré de `Combat.hitPlayer` ; seule la construction du piège applique la difficulté. |
| 4.4 Cause de mort | `Run.lastDamageSource` renseigné à chaque coup subi (type + nom de l'ennemi ou du piège), exposé dans `__autoplay` (`deathCause`, `skillUses`). |
| 4.5 Autoplay et sauvegarde | Le mode `normal` de l'autoplay utilise un profil jetable (`Meta.setMode('sandbox')`) ; la sauvegarde réelle n'est plus touchée. |
| 4.6 `chargeDamageMul` ignoré | Méthode unique `contactDamage()` qui lit `behavior.chargeDamageMul`. |
| 4.6 Score parfait de la salle 2 sans fragments | Le score d'une salle de pièges est pondéré par les fragments ramassés (sans dégât : 1,0 seulement si tous les fragments sont pris, sinon 0,8 → 0,99). |
| 4.6 Bot au contact du boss | Distance visée en mêlée = rayon du boss + rayon du joueur + 14 px. |
| 5.3 Boomerang | Le passage retour d'un projectile ne compte plus comme un coup dans le dos. |
| 5.1 Salles 1 et 3 courtes | Une 4e vague ajoutée à chaque salle (Éclipse, Nuée, Incubateur en renfort). Salle 1 dure désormais 25-50 s pour le bot. |

Balayage final (mode normal, difficulté 1, bot aléatoire, 1 seed par arme) : pistolet, boomerang et foudre battent le boss (82-121 s de run) ; lame, orbe, brûleur meurent en salle 3 ; masse en salle 2 ; arc meurt sur le boss. À confirmer par un playtest humain avant tout nouveau réglage.

---

## 8. Phase 2 — salles 6 à 9 (balayages de l'agent principal)

Balayage headless après implémentation (6 armes, 1 seed chacune, `maxRooms: 9`, 0 erreur JS) :

| Mode | Résultat |
|---|---|
| Test (passifs au max) | 6/6 atteignent la salle 9, 6/6 victoires après correctifs (avant : 1 blocage en salle 6). Combat de la revanche : 16-47 s. |
| Normal (profil vierge) | pistolet : victoire (201 s) ; boomerang et foudre : morts en salle 9 ; arc : mort en salle 5 ; lame et brûleur : morts en salle 3. |

Bugs trouvés et corrigés pendant la passe : ennemis ballottés entre les blocs carrés du rotor et inaccessibles (rotor réécrit en colliders segment, relocalisation automatique d'un ennemi immobile 6 s ou enfermé dans un mur 1,5 s, le bot resserre sa distance après 8 s sans dégât infligé) ; teinte d'alerte de la zone sûre qui effaçait le sol (tracé en règle `evenodd`) ; Éclipse qui n'attaquait jamais hors de portée (dash forcé après 3 temps d'attente).

À évaluer en playtest humain : durée des salles 6-7 avec le sol changeant, dégâts de l'impulsion de la salle 7 (15) cumulés à la grille laser, lisibilité de la plaque dorsale (compteur affiché à chaque coup), difficulté de la phase 3 de la revanche.

---

## 9. Rééquilibrage de la progression et biome 2 (balayages de l'agent principal)

Progression (mode test, biome 1, 4 armes, seeds fixes) avant → après : niveau après la salle 1 : 4-5 → 3-4 ; au mini-boss : 9-10 → 6-7 ; en salle 9 : 13 → 9-10. Détail des changements en CONTENT.md §17.

Biome 2 LA SERRE (mode test, 4 armes) : pistolet, arc, foudre et boomerang atteignent la salle 9 (2 victoires, 2 morts sur la revanche) ; la lame meurt en salle 3 (limite du bot mêlée, déjà observée en biome 1 en mode normal). Dégâts subis 2 à 3 fois plus élevés qu'en biome 1 : le cran de difficulté est net. Premier réglage appliqué : multiplicateurs 1,45/1,3/1,1 → 1,3/1,2/1,08, Ronce et Moucherons adoucis, salle 1 sans Moucherons.

Bug corrigé pendant la passe : `Projectiles.update` lisait un élément indéfini quand une onde de choc supprimait des projectiles pendant la boucle.

Musique : reprise à la position mémorisée vérifiée (biome1 reprend en salle 6 à 5,5 s après 4 s en salle 1 ; boss1 reprend en salle 9 à 4,4 s après 3 s en salle 5).

---

## 10. Rééquilibrage complet (passe 2)

Date : 2026-09-06. Agent Équilibrage. Retour joueur (humain, bon niveau) : jeu **beaucoup trop facile**, greffes rares/épiques/colossales trop fréquentes, foudre trop fréquente. Périmètre : données uniquement (`dev/05_balance.js`, `dev/content.js`, `dev/content2.js`), `index.html` régénéré par `dev/build.js`, aucun fichier moteur touché, rien commité.

### 10.1 Méthode

- **Harness** : `window.__autoplay(config)` piloté par Playwright/Chromium headless (`timeScale 40`, `render:false`, `maxRooms 9`, `maxSeconds 700`, difficulté 1, personnage `char_neuf`, `pickStrategy:'random'`, compétence tirée au sort par le harness selon la seed). Serveur `http://localhost:8766/`.
- **Plan de mesure**, identique avant et après chaque itération (mêmes seeds 100-105) : 3 configurations × 6 armes (pistolet, arc, lame, foudre, boomerang, marteau) × 6 seeds = **108 runs par itération, 540 runs au total**, 0 erreur JS.
  - Normal · biome 1 (profil vierge, chance 4 = Neuf + trait),
  - Test · biome 1 (tous les passifs méta au max, chance 14),
  - Test · biome 2.
- **Instrumentation côté page (sans toucher au moteur)** : enveloppe sur `Progression.drawUpgrades` (rareté de chaque carte proposée, distinction level-up / coffre via `opts.label`, chance passée), enveloppe sur `Combat.hitEnemy` (instant de la mort du boss). Le niveau par salle vient de `roomTimes[].level`, la cause de mort de `deathCause`.
- **Ordre des leviers** : rampPerRoom, PV/dégâts des ennemis et des boss, dégâts des pièges, poids de rareté et effet de la chance, courbe d'XP, greffes épiques/colossales, compétences de base, passifs méta. Quatre itérations, chacune re-mesurée intégralement. Scripts : `scratchpad/p2sweep.js` (balayage instrumenté), `p2analyze.js` (agrégats par arme et compétence), `p2table.js` (tableaux), `patch_p2_it{1,2,3,4}.js` (modifications appliquées, rejouables, échec si une chaîne cible est absente), originaux dans `scratchpad/p2_orig/`.
- **Rappel des limites du bot** (elles biaisent les chiffres, pas le sens des réglages) : il tire 100 % du temps à portée, se place **au contact** avec les armes de mêlée (lame, marteau, orbe), n'esquive un pattern que s'il est déjà télégraphié, ne charge pas l'arc volontairement, n'utilise pas les re-rolls et prend ses greffes au hasard. Un humain de bon niveau fera nettement mieux que le bot à données égales : les cibles ci-dessous en tiennent compte (elles sont volontairement basses pour le bot).

### 10.2 Résultats par cible (état final = it4)

| # | Cible | Avant | Après (it4) | Statut |
|---|---|---|---|---|
| 1 | Normal B1 : salle 4 atteinte 35-55 % | 47 % | **36 %** | atteint |
| 1 | Normal B1 : mini-boss tué ≤ 15 % | 22 % | **0 %** | atteint (13 arrivées en salle 5, 0 kill : voir §10.6) |
| 1 | Normal B1 : salle 9 gagnée ≤ 5 % | 3 % | **0 %** | atteint |
| 2 | Test B1 : mini-boss tué 40-60 % | 100 % | **64 %** | proche (au-dessus de 4 points, n=36 → ±16 points d'intervalle) |
| 2 | Test B1 : salle 9 gagnée 15-30 % | 69 % | **17 %** | atteint |
| 2 | Test B1 : niveau en salle 9 ≤ 8 | 8,4 | **6,8** | atteint |
| 3 | Test B2 : mini-boss tué 20-40 % | 50 % | **31 %** | atteint |
| 3 | Test B2 : salle 9 gagnée ≤ 15 % | 11 % | **0 %** | atteint (mais 0 : voir §10.6) |
| 4 | Level-up à chance 4 (normal) : épique ≤ 8 %, colossal ≤ 1,2 % | 6,9 % / 3,4 % | **6,9 % / 0,5 %** (n=189) | atteint |
| 4 | Level-up à chance 14 (test) : épique ≤ 14 %, colossal ≤ 3 % | 12,2 % / 3,6 % | **9,4 % / 2,9 %** (n=684) | atteint |
| 4 | Coffres = principale source d'épiques/colossales | — | théorie : coffre « Épique garanti » à chance 14 = 1 épique garantie + 22,8 % / 3,5 % sur les autres cartes | atteint par construction (le bot, souvent touché, tombe sur « Rare garanti ») |
| 5 | Foudre : Tempête every ≥ 2 s, Foudre ambiante ≥ 3,5 s | 0,7 s / 2,5 s | **2,2 s / 3,5 s**, aléa ×[0,8 ; 2,0] (moyenne ×1,4 → 3,1 s et 4,9 s réels) | atteint |
| 6 | Chaque arme ≥ 15 % de salle 4 en normal | lame 0 %, marteau 17 % | pistolet 83 %, foudre 67 %, boomerang 50 %, arc 17 %, **lame 0 %, marteau 0 %** | **non atteint pour la mêlée** (limite du bot, §10.6) |
| 6 | Aucune arme trivialisante | pistolet 100 % de victoires en test | meilleure arme en test : pistolet / lame 33 % de victoires | atteint |

### 10.3 Tableaux avant / après (mêmes seeds, 36 runs par colonne)

**Normal · biome 1** (base : n=36, it1 : n=36, it2 : n=36, it3 : n=36, it4 : n=36)

| Métrique | base | it1 | it2 | it3 | it4 |
|---|---|---|---|---|---|
| Salle 4 atteinte | 47 % | 28 % | 36 % | 36 % | 36 % |
| Mini-boss tué | 22 % | 3 % | 3 % | 0 % | 0 % |
| Salle 9 atteinte | 11 % | 0 % | 0 % | 0 % | 0 % |
| Salle 9 gagnée | 3 % | 0 % | 0 % | 0 % | 0 % |
| Niveau moyen en salle 9 (runs y arrivant) | 6,5 | - | - | - | - |
| Niveau moyen après la salle 4 | 3,9 | 3,6 | 3,5 | 3,5 | 3,5 |
| Durée du combat de mini-boss (s, si tué) | 37,9 | 49,4 | 41,9 | - | - |
| Dégâts subis / run | 170,7 | 145,9 | 141,2 | 142,0 | 142,8 |

| Arme | base S4 / boss / win | it1 S4 / boss / win | it2 S4 / boss / win | it3 S4 / boss / win | it4 S4 / boss / win |
|---|---|---|---|---|---|
| blade | 0 % / 0 % / 0 % | 0 % / 0 % / 0 % | 0 % / 0 % / 0 % | 0 % / 0 % / 0 % | 0 % / 0 % / 0 % |
| boomerang | 67 % / 50 % / 0 % | 33 % / 0 % / 0 % | 50 % / 0 % / 0 % | 50 % / 0 % / 0 % | 50 % / 0 % / 0 % |
| bow | 33 % / 0 % / 0 % | 33 % / 0 % / 0 % | 17 % / 0 % / 0 % | 17 % / 0 % / 0 % | 17 % / 0 % / 0 % |
| chain | 100 % / 33 % / 17 % | 33 % / 0 % / 0 % | 67 % / 0 % / 0 % | 67 % / 0 % / 0 % | 67 % / 0 % / 0 % |
| hammer | 17 % / 0 % / 0 % | 0 % / 0 % / 0 % | 0 % / 0 % / 0 % | 0 % / 0 % / 0 % | 0 % / 0 % / 0 % |
| pistol | 67 % / 50 % / 0 % | 67 % / 17 % / 0 % | 83 % / 17 % / 0 % | 83 % / 0 % / 0 % | 83 % / 0 % / 0 % |

| Raretés proposées | base | it1 | it2 | it3 | it4 |
|---|---|---|---|---|---|
| Level-up (commun / rare / épique / colossal) | n=321 : 64,5 % / 25,2 % / 6,9 % / 3,4 % | n=198 : 72,7 % / 18,7 % / 7,1 % / 1,5 % | n=192 : 72,9 % / 20,3 % / 6,3 % / 0,5 % | n=195 : 70,8 % / 22,1 % / 6,7 % / 0,5 % | n=189 : 72,0 % / 20,6 % / 6,9 % / 0,5 % |
| Coffres (commun / rare / épique / colossal) | n=63 : 41,3 % / 47,6 % / 9,5 % / 1,6 % | n=30 : 56,7 % / 36,7 % / 6,7 % / 0,0 % | n=39 : 51,3 % / 46,2 % / 2,6 % / 0,0 % | n=39 : 51,3 % / 46,2 % / 2,6 % / 0,0 % | n=39 : 46,2 % / 46,2 % / 7,7 % / 0,0 % |

**Test · biome 1** (base : n=36, it1 : n=36, it2 : n=36, it3 : n=36, it4 : n=36)

| Métrique | base | it1 | it2 | it3 | it4 |
|---|---|---|---|---|---|
| Salle 4 atteinte | 100 % | 94 % | 100 % | 100 % | 100 % |
| Mini-boss tué | 100 % | 81 % | 94 % | 78 % | 64 % |
| Salle 9 atteinte | 89 % | 53 % | 72 % | 58 % | 53 % |
| Salle 9 gagnée | 69 % | 8 % | 8 % | 8 % | 17 % |
| Niveau moyen en salle 9 (runs y arrivant) | 8,4 | 6,7 | 6,8 | 6,7 | 6,8 |
| Niveau moyen après la salle 4 | 5,0 | 4,1 | 4,1 | 4,1 | 4,1 |
| Durée du combat de mini-boss (s, si tué) | 32,9 | 53,4 | 45,8 | 54,6 | 58,9 |
| Dégâts subis / run | 329,9 | 407,5 | 432,9 | 404,8 | 406,6 |

| Arme | base S4 / boss / win | it1 S4 / boss / win | it2 S4 / boss / win | it3 S4 / boss / win | it4 S4 / boss / win |
|---|---|---|---|---|---|
| blade | 100 % / 100 % / 17 % | 83 % / 50 % / 0 % | 100 % / 83 % / 0 % | 100 % / 67 % / 0 % | 100 % / 67 % / 33 % |
| boomerang | 100 % / 100 % / 83 % | 100 % / 100 % / 33 % | 100 % / 100 % / 17 % | 100 % / 100 % / 0 % | 100 % / 83 % / 17 % |
| bow | 100 % / 100 % / 83 % | 100 % / 83 % / 0 % | 100 % / 100 % / 0 % | 100 % / 67 % / 0 % | 100 % / 50 % / 0 % |
| chain | 100 % / 100 % / 67 % | 100 % / 100 % / 0 % | 100 % / 100 % / 0 % | 100 % / 83 % / 33 % | 100 % / 67 % / 0 % |
| hammer | 100 % / 100 % / 67 % | 83 % / 50 % / 0 % | 100 % / 83 % / 17 % | 100 % / 50 % / 0 % | 100 % / 33 % / 17 % |
| pistol | 100 % / 100 % / 100 % | 100 % / 100 % / 17 % | 100 % / 100 % / 17 % | 100 % / 100 % / 17 % | 100 % / 83 % / 33 % |

| Raretés proposées | base | it1 | it2 | it3 | it4 |
|---|---|---|---|---|---|
| Level-up (commun / rare / épique / colossal) | n=1044 : 60,2 % / 23,9 % / 12,2 % / 3,6 % | n=716 : 67,2 % / 24,4 % / 6,6 % / 1,8 % | n=780 : 63,5 % / 25,1 % / 8,7 % / 2,7 % | n=716 : 64,9 % / 25,0 % / 8,5 % / 1,5 % | n=684 : 62,7 % / 25,0 % / 9,4 % / 2,9 % |
| Coffres (commun / rare / épique / colossal) | n=272 : 44,5 % / 29,8 % / 18,8 % / 7,0 % | n=212 : 55,2 % / 25,5 % / 13,7 % / 5,7 % | n=248 : 55,6 % / 26,6 % / 12,5 % / 5,2 % | n=228 : 58,3 % / 28,5 % / 10,1 % / 3,1 % | n=220 : 59,5 % / 29,5 % / 7,7 % / 3,2 % |

**Test · biome 2** (base : n=36, it1 : n=36, it2 : n=36, it3 : n=36, it4 : n=36)

| Métrique | base | it1 | it2 | it3 | it4 |
|---|---|---|---|---|---|
| Salle 4 atteinte | 69 % | 50 % | 58 % | 56 % | 53 % |
| Mini-boss tué | 50 % | 22 % | 33 % | 33 % | 31 % |
| Salle 9 atteinte | 31 % | 8 % | 11 % | 8 % | 11 % |
| Salle 9 gagnée | 11 % | 0 % | 3 % | 0 % | 0 % |
| Niveau moyen en salle 9 (runs y arrivant) | 9,5 | 8,0 | 8,3 | 8,0 | 8,0 |
| Niveau moyen après la salle 4 | 6,0 | 5,2 | 5,1 | 5,1 | 5,1 |
| Durée du combat de mini-boss (s, si tué) | 52,1 | 60,9 | 51,2 | 54,2 | 53,6 |
| Dégâts subis / run | 547,1 | 467,7 | 470,3 | 465,3 | 461,3 |

| Arme | base S4 / boss / win | it1 S4 / boss / win | it2 S4 / boss / win | it3 S4 / boss / win | it4 S4 / boss / win |
|---|---|---|---|---|---|
| blade | 17 % / 17 % / 0 % | 0 % / 0 % / 0 % | 33 % / 33 % / 0 % | 17 % / 17 % / 0 % | 0 % / 0 % / 0 % |
| boomerang | 83 % / 50 % / 17 % | 67 % / 33 % / 0 % | 67 % / 33 % / 17 % | 67 % / 33 % / 0 % | 67 % / 33 % / 0 % |
| bow | 67 % / 33 % / 0 % | 33 % / 0 % / 0 % | 33 % / 0 % / 0 % | 17 % / 0 % / 0 % | 17 % / 0 % / 0 % |
| chain | 100 % / 67 % / 33 % | 100 % / 50 % / 0 % | 100 % / 67 % / 0 % | 100 % / 67 % / 0 % | 100 % / 67 % / 0 % |
| hammer | 50 % / 33 % / 0 % | 0 % / 0 % / 0 % | 17 % / 17 % / 0 % | 33 % / 33 % / 0 % | 33 % / 33 % / 0 % |
| pistol | 100 % / 100 % / 17 % | 100 % / 50 % / 0 % | 100 % / 50 % / 0 % | 100 % / 50 % / 0 % | 100 % / 50 % / 0 % |

| Raretés proposées | base | it1 | it2 | it3 | it4 |
|---|---|---|---|---|---|
| Level-up (commun / rare / épique / colossal) | n=916 : 58,2 % / 24,9 % / 14,2 % / 2,7 % | n=660 : 69,4 % / 19,5 % / 8,8 % / 2,3 % | n=684 : 68,6 % / 20,5 % / 8,5 % / 2,5 % | n=676 : 67,6 % / 21,2 % / 9,0 % / 2,2 % | n=672 : 66,7 % / 22,0 % / 9,2 % / 2,1 % |
| Coffres (commun / rare / épique / colossal) | n=144 : 60,4 % / 27,8 % / 11,8 % / 0,0 % | n=84 : 72,6 % / 17,9 % / 9,5 % / 0,0 % | n=100 : 67,0 % / 21,0 % / 12,0 % / 0,0 % | n=92 : 66,3 % / 20,7 % / 13,0 % / 0,0 % | n=92 : 64,1 % / 19,6 % / 16,3 % / 0,0 % |
### 10.4 Table complète des changements (origine → état final)

Fichier `dev/05_balance.js` :

| It. | Objet | Champ | Avant → Après | Raison mesurée |
|---|---|---|---|---|
| 1 | BALANCE.xp | a / b / c | 30 / 20 / 3,4 → **34 / 25 / 4,4** | niveau 8,4 en salle 9 (test) ; +25 % d'XP cumulée pour le niveau 9 (1654 → 2070) |
| 1, 2 | BALANCE.rarity | common / rare / epic / colossal | 68 / 24 / 7 / 1 → **72 / 22,6 / 5 / 0,4** | colossal 3,4 % des cartes de level-up en normal, épique 12 % en test |
| 1 | BALANCE.luck | shift / epicShare | 0,6 / 0,7 → **0,45 / 0,72** | chance méta (14) : épique 12,2 %, colossal 3,6 % → théorie 9,5 % / 2,3 % |
| 1, 2 | BALANCE | rampPerRoom | 0,06 → 0,11 (it. 1) → **0,09** | salle 9 gagnée 69 % en test ; 0,11 faisait tomber la salle 4 à 28 % en normal (cible 35-55) |
| 1 | BALANCE.lightningJitter | min / max | 0,75 / 1,6 → **0,8 / 2,0** | la foudre frappe trop souvent : intervalle moyen ×1,18 → ×1,4 |

Fichier `dev/content.js` :

| It. | Objet | Champ | Avant → Après | Raison mesurée |
|---|---|---|---|---|
| 1-3 | weapon_blade | damage / fireRate / knockback / desc | 22 / 3,0 / 1,0 → **28 / 3,4 / 1,5** (66 → 95 DPS) | 0 % de salle 4 en normal pour le bot (mort au contact en S2-S3) |
| 1-3 | weapon_hammer | damage / knockback / special.stunTime / desc | 60 / 2,5 / 0,4 → **75 / 3,0 / 0,6** (48 → 60 DPS) | 17 % → 0 % de salle 4 en normal après le durcissement |
| 1 | skill_shield | effect.amount / desc | 55 → **45** | 100 % de victoires en test avec le bouclier (n=6) |
| 1 | skill_shockwave | effect.damage / desc | 60 → **50** | 83 % de victoires en test (n=6), compétence à la fois défensive et offensive |
| 1 | upg_foudre_ambiante | hooks.passive.every / damage / desc | 2,5 / 18 → **3,5 / 26** | cible ≥ 3,5 s ; dégâts par coup relevés pour garder l'intérêt |
| 1 | upg_tempete | hooks.passive.every / damage / desc | 0,7 / 26 → **2,2 / 48** | cible ≥ 2 s ; colossale toujours spectaculaire (48 + 3 sauts) mais 3× moins fréquente |
| 1 | upg_ceinture | hooks.passive.damage / desc | 18 → **15** | épique offensive au-dessus des rares équivalentes |
| 1 | upg_orbes_gardiennes | maxStacks | 2 → **1** | 4 orbes bloquant les projectiles rendaient les tirs du boss inoffensifs |
| 1 | meta_puissance | tiers[].mods damage | 1,05 ×3, 1,06 ×2 → **1,04 ×3, 1,05 ×2** (×1,30 → ×1,23) | test trop facile (mini-boss 100 %) |
| 1 | meta_etude | tiers[].mods xpGain | 1,1 ×3, 1,15 → **1,08 ×3, 1,1** (×1,53 → ×1,39) | niveau 8,4 en salle 9 en test |
| 1, 2 | enemy_rodeur | hp / damage | 38 / 8 → **43 / 9** | +20 % en it. 1 trop dur en normal (salle 4 : 28 %) → +12 % / +12 % |
| 1, 2 | enemy_sentinelle | hp / damage / behavior.projDamage / desc | 32 / 8 / 10 → **36 / 9 / 11** | idem |
| 1, 2, 4 | enemy_bloc | hp / damage / behavior.chargeDamageMul | 175 / 12 / 1,5 → **200 / 12 / 1,3** | contact en charge (18 → 21 avec la rampe) : 4-5 morts sur 6 du marteau en salle 3 ; dégâts revenus à 12, charge ×1,3 (15,6) |
| 1, 2 | enemy_meche | hp / damage / behavior.explosionDamage | 22 / 6 / 22 → **25 / 6 / 24** | idem |
| 1, 2 | enemy_incubateur | hp / damage | 80 / 8 → **90 / 9** | idem |
| 1, 2 | enemy_nuee | hp / damage | 10 / 5 → **11 / 5** | idem |
| 1, 2 | enemy_eclipse | hp / damage | 40 / 12 → **45 / 13** | idem |
| 1-4 | boss_etalon_07 | hp / damage (contact) | 1900 / 14 → **3300 / 22** | mini-boss tué 100 % → 81 % → 94 % en test : le bot survit à 47 s de combat, il faut allonger et rendre létal |
| 1-4 | boss phase 1 | ring projDamage / cooldown | 15 / 2,6 → **22 / 2,3** | idem ; en it. 4 la létalité est reportée du slam vers les projectiles (esquivables) |
| 1-3 | boss phase 1 | charge damage / cooldown | 25 / 3,8 → **34 / 3,4** | idem |
| 1-4 | boss phase 1 | slam damage / cooldown | 31 / 4,5 → 40 / 4,0 (it. 3) → **32 / 4,0** | le slam (×1,72 en salle 9 = 69 dégâts) causait 10 des 18 morts de la salle 9 en it. 3 |
| 1-4 | boss phase 2 | fan projDamage / cooldown | 15 / 1,9 → **22 / 1,7** | idem |
| 1-4 | boss phase 2 | spiral projDamage / cooldown | 13 / 4,5 → **19 / 4,0** | idem |
| 2 | boss phase 2 | summon cooldown | 7,0 → **6,0** | idem |
| 1-3 | boss phase 2 | charge damage / cooldown | 27 / 3,8 → **36 / 3,4** | idem |
| 2-4 | boss_etalon_07.revenge | hpMul / plateHits / desc | 1,6 / 6 → **0,9 / 5** (PV en salle 9 : 1900×1,6×1,48 = 4499 → 3300×0,9×1,72 = 5108) | revanche : 84-88 % de morts parmi les arrivants en salle 9 ; la rampe ×1,72 et les mécaniques (plaque, mimétisme, charges sans étourdissement) suffisent |
| 1-4 | revenge phase 3 | laser_sweep damage / ring projDamage / charge damage / charge stunTime | 20 / 14 / 26 / 0,6 → **17 / 13 / 24 / 1,0** | idem (ces valeurs sont multipliées par 1,72 en salle 9). Note : `revenge.wallStun` n'est lu nulle part dans le moteur, il est laissé tel quel |
| 1, 2 | trap_balayage | damage | 14 → **15** | +20 % en it. 1 trop dur en normal → +10 % |
| 1, 2 | trap_tourniquet | damage | 12 → **13** | idem |
| 1, 2 | trap_grille | damage | 10 → **11** | idem |
| 1, 2 | trap_bouche | damage | 12 → **13** | idem |
| 1, 2 | trap_dalles | damage | 10 → **11** | idem |
| 1, 2 | trap_nappe | damage / desc | 8 → **9** | idem |
| 1, 2 | trap_rail | damage | 18 → **20** | idem |
| 1, 2 | trap_tourelle | damage | 9 → **10** | idem |

Fichier `dev/content2.js` :

| It. | Objet | Champ | Avant → Après | Raison mesurée |
|---|---|---|---|---|
| 2 | boss_serriste.revenge | hpMul / desc | 1,5 → **1,35** | 0 victoire en biome 2 après it. 1 (cible ≤ 15 %, mais pas 0) |

Valeurs des ennemis, du boss et des pièges du biome 2 inchangées (multiplicateurs de biome 1,3 / 1,2 / 1,08 conservés) : après it. 1 le biome 2 était déjà dans la cible (mini-boss 22-33 %, salle 9 gagnée 0-3 %).

### 10.5 Distribution des raretés

Poids finaux `BALANCE.rarity = { common 72, rare 22,6, epic 5, colossal 0,4 }`, chance : `shift 0,45`, `epicShare 0,72` (chaque point de chance retire 0,45 au commun et le répartit 72 / 28 entre épique et colossal, plafond 20).

Théorie (part de chaque carte tirée) :

| Chance | Level-up (commun / rare / épique / colossal) | Coffre « Épique/Colossal garanti » (`shiftEpic`, hors carte garantie) |
|---|---|---|
| 0 | 72,0 % / 22,6 % / 5,0 % / 0,4 % | 52,9 % / 33,2 % / 13,2 % / 0,7 % |
| 4 (Neuf, profil vierge) | 70,2 % / 22,6 % / 6,3 % / 0,9 % | 50,1 % / 32,2 % / 16,2 % / 1,5 % |
| 14 (méta au max) | 65,7 % / 22,6 % / 9,5 % / 2,2 % | 43,7 % / 30,0 % / 22,8 % / 3,5 % |
| 20 (plafond : méta + 3 Trèfles) | 63,0 % / 22,6 % / 11,5 % / 2,9 % | 40,2 % / 28,9 % / 26,4 % / 4,5 % |

Mesuré (it4, cartes proposées au bot) : normal chance 4, level-up n=189 : 72,0 / 20,6 / 6,9 / 0,5 % ; test chance 14, level-up n=684 : 62,7 / 25,0 / 9,4 / 2,9 % ; test biome 2 n=672 : 66,7 / 22,0 / 9,2 / 2,1 %. Le colossal mesuré à chance 14 (2,9 %) est un peu au-dessus de la théorie (2,2 %) : quand la rareté tirée n'a plus de carte disponible le tirage redescend d'un cran, ce qui ne crée pas de colossales ; l'écart est du bruit d'échantillon (20 cartes sur 684) plus les Trèfles ramassés en cours de run (chance jusqu'à 20). Avant la passe : 12,2 % d'épiques et 3,6 % de colossales à chance 14, 3,4 % de colossales à chance 4.

Coffres : le bot est touché dans presque toutes les salles, donc ses coffres tombent sur « Rare garanti » (score moyen 0,6-0,85) ; ses coffres mesurés ne reflètent pas ceux d'un bon joueur. Pour un joueur qui passe les salles 1-3 avec ≤ 1 coup chacune (score ≥ 0,85), le coffre de la salle 4 garantit une épique et propose les autres cartes avec `shiftEpic` (22,8 % d'épiques à chance 14), et un sans-faute (score ≥ 0,999) garantit une colossale : les coffres restent la principale source d'épiques/colossales, les level-ups en donnent environ une épique tous les 3-4 niveaux (soit 1-2 par run à ~7 niveaux) et une colossale tous les 30-45 niveaux.

### 10.6 Déséquilibres restants et recommandations pour un playtest humain

1. **Lame et marteau en mode normal (bot) : 0 % de salle 4** malgré +27 % de dégâts sur la lame (22 → 28, cadence 3,4) et +25 % sur le marteau (60 → 75, étourdissement 0,6 s). Le bot se place au contact (`enemy.r + pl.r + 14 px`), donc dans la portée du bond du Rôdeur et de la charge du Bloc ; les morts sont à 80 % des contacts Rôdeur/Bloc en salle 3. Un humain recule entre deux coups et n'a pas ce problème. À vérifier en playtest : si la lame (arme de départ, 95 DPS théorique, la plus haute du jeu) paraît trop forte pour un humain, ramener `damage` à 25 et `fireRate` à 3,2 avant de toucher au reste. Le marteau à 75 dégâts one-shot désormais Rôdeur/Sentinelle/Mèche/Nuée en salle 1 : à surveiller.
2. **Mini-boss en test : 64 %** (cible 40-60). Le bot survit aux patterns par volume de PV (Vitalité +50, Résurrection à 60 %, 3 armures) plus que par esquive ; les leviers restants sans toucher au moteur seraient `hp` 3300 → 3600 ou `ring.count` 12 → 14, mais chaque durcissement du boss de base se répercute ×1,72 en salle 9 (même définition). Recommandation : laisser un humain juger le combat de la salle 5 (3300 × 1,36 = 4488 PV, ~60 s pour le bot, probablement 25-35 s pour un humain équipé) avant d'aller plus loin.
3. **Revanche (salle 9)** : la victoire du bot est passée de 8 % à 17 % en abaissant le slam (40 → 32, soit 55 dégâts en salle 9 au lieu de 69) et les PV de base (×0,9). La revanche reste le mur principal en test : 13 morts en salle 9 sur 19 arrivées. Les morts viennent d'abord des projectiles (anneau 22 × 1,72 = 38 par balle) et du slam. Pour un humain qui esquive, c'est probablement le bon niveau ; si le playtest montre des morts « injustes », baisser `revenge.extraPhases.ring.projDamage` (13) et `fan.projDamage` (22) plutôt que les PV.
4. **Biome 2 : 0 victoire sur 36 runs en test** (cible ≤ 15 % : atteinte mais peut-être trop). Racine (240 PV, charge 620) tue les armes de mêlée du bot en salle 3 (blade 0 %, marteau 33 %). Les valeurs du biome 2 n'ont pas été touchées (hors PV de la revanche 1,5 → 1,35) parce qu'il était déjà dans la cible après l'itération 1 ; le cran biome 1 → biome 2 reste net (mini-boss 64 % → 31 %). À rejouer en playtest après validation du biome 1.
5. **Progression** : niveau 6,8 en salle 9 en test (8,4 avant), 3,5 après la salle 4 en normal (3,9 avant). Un humain gagne la même XP que le bot (l'XP vient des vagues, fixes) plus les bonus de traversée parfaite (15 XP × xpGain) : compter 7-8 niveaux en fin de palier. Si le playtest trouve les level-ups trop rares, revenir sur `BALANCE.xp.c` (4,4 → 4,0) avant de toucher aux raretés.
6. **Compétences** : Bouclier 55 → 45 PV et Onde de choc 60 → 50 dégâts. En it4 test B1, le bouclier reste la compétence la plus performante (50 % de victoires, n=6) devant dash (17 %), aimant (8 %) et onde (0 %) ; n trop faible pour trancher, à vérifier en playtest (le bouclier absorbe 45 PV toutes les 12 s → 9,6 s avec Réactivité, soit ~4,7 PV/s de mitigation).
7. **Foudre** : Tempête 2,2 s × aléa [0,8 ; 2,0] = 3,1 s en moyenne (48 dégâts + 3 sauts), Foudre ambiante 3,5 s → 4,9 s (3,5 s avec 2 exemplaires, 26 dégâts). Non mesurable avec le bot (tirage aléatoire) : à valider à l'oreille et à l'œil en playtest, l'aléa ×2,0 peut donner des silences de 7 s sur la Foudre ambiante.
8. **Non modifié, à surveiller** : Cœur de verre (×2 dégâts, ×0,5 PV), Noyau (5 orbes 22 + aura 16/s), Mitraille (+3 projectiles guidés) restent volontairement spectaculaires ; à 0,4-0,9 % par carte de level-up et via les coffres sans faute ils sont rares. `revenge.wallStun` (content.js) n'est lu nulle part dans le moteur : la durée d'étourdissement des charges de phase 3 est `stunTime` du pattern (0,6 → 1,0 s).

### 10.7 Vérifications

`node dev/build.js` (index.html 398 Ko), évaluation de `content.js` + `content2.js` en Node (« ok »), `node --check dev/05_balance.js` après chaque itération ; 540 runs headless, 0 erreur JS, 0 timeout du harness. Fichier `dev/.balance_done` créé.

### Résumé (10 lignes)

1. 540 runs headless (3 configurations × 6 armes × 6 seeds × 5 états), mêmes seeds avant/après, 0 erreur JS.
2. Montée de difficulté par salle 0,06 → 0,09 (salle 5 ×1,36, salle 9 ×1,72), ennemis biome 1 +12 % PV / +10 % dégâts, pièges +10 %.
3. Mini-boss 1900 → 3300 PV, contact 14 → 22, projectiles +45 %, cadence des patterns +10-15 % ; revanche ×1,6 → ×0,9 de base, slam 40 → 32, phase 3 adoucie.
4. Courbe d'XP +25 % (niveau 8,4 → 6,8 en salle 9 en test), Étude ×1,53 → ×1,39, Puissance ×1,30 → ×1,23.
5. Raretés : épique 5 %, colossal 0,4 % de base ; chance 0,45/pt → à chance 14 : 9,4 % / 2,9 % mesurés (12,2 % / 3,6 % avant), à chance 4 : 6,9 % / 0,5 %.
6. Foudre : Tempête 0,7 → 2,2 s (48 dégâts), Foudre ambiante 2,5 → 3,5 s (26), aléa [0,8 ; 2,0].
7. Normal B1 : salle 4 atteinte 47 → 36 %, mini-boss 22 → 0 %, victoire 3 → 0 %. Test B1 : mini-boss 100 → 64 %, victoire 69 → 17 %. Test B2 : mini-boss 50 → 31 %, victoire 11 → 0 %.
8. Toutes les cibles atteintes sauf : mini-boss test 64 % (cible 40-60, à 4 points) et lame/marteau à 0 % de salle 4 en normal (bot au contact ; buffs lame 22 → 28 dégâts, marteau 60 → 75).
9. Descriptions mises à jour pour chaque chiffre modifié (armes, compétences, greffes, Sentinelle, Nappe de gaz, revanches).
10. À valider en playtest humain : sensation de la lame (95 DPS), combat de la salle 5, revanche, biome 2 (0 victoire bot), fréquence de la foudre à l'oreille.
