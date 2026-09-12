# Les pièges dans les roguelites d'action — et ce que WAY peut en tirer

*Rapport de game design, septembre 2026. Base : `dev/34_traps.js`, `dev/39_tempo.js`, `dev/36_modular.js`, `dev/38_challenges.js`, les 41 définitions `trap_*` de `dev/content*.js`, CONTENT.md §9, §20, §67-70. Réseau : la recherche web répond, mais les wikis (fandom, wiki.gg, chaosforge) et gamedeveloper.com sont bloqués par le proxy ; les faits viennent des extraits de recherche et de ma mémoire des jeux (marqués « mémoire » quand aucun extrait ne les confirme).*

---

## 1. Typologie des pièges dans le genre

### 1.1 Par déclencheur

| Déclencheur | Exemples | Ce que ça demande au joueur |
|---|---|---|
| **Temps** (cycle) | Dalles rétractables d'Isaac, arbalètes d'Élysée (Hades), jets de flamme de Gungeon, lames d'ALttP en va-et-vient | Lire, compter, passer. C'est tout WAY aujourd'hui. |
| **Pression** (plaque) | Brogue (plaque + bouches de gaz), pointes de Tartare, boutons d'Isaac (qui *désarment*), « pizzas-pièges » de Vampire Survivors | Marcher dessus ou non ; y envoyer un objet ou un ennemi. |
| **Proximité** | Pièges à flèches de Spelunky (6 tuiles, déclenchés aussi par les trésors et les ennemis), statues à lance d'Élysée, totems de Spelunky 2, lames de Zelda 1 (ligne de vue) | Traverser vite, ou amorcer de loin. |
| **Coup / tir** | Barils de Nuclear Throne, tonneaux de Gungeon, TNT d'Isaac, œufs de phénix d'Élysée (amorcés par le joueur *ou par les projectiles des autres pièges*), cristaux d'Hyper Light Drifter (mémoire) | Décider *quand* le piège part. |
| **Ennemi** | Brogue et Spelunky : tout ce qui pèse déclenche ; DCSS : les monstres évitent les pièges connus ; Isaac : les volants ignorent les fosses | Attirer l'ennemi dessus. |

### 1.2 Par effet

| Effet | Exemples | Note |
|---|---|---|
| Dégâts | Pointes, flèches, lames | Le socle. |
| Zone / durée | Gaz caustique de Brogue, lave d'Asphodèle (dégâts croissants), pièges élémentaires de Shattered PD | Le plus lisible. |
| Statut | Filet de Brogue, paralysie / confusion / « grim » de Shattered PD, sable mouvant | Ce sont les ennemis qui punissent ensuite. |
| Déplacement | Totem de Spelunky 2 (repousse, étourdit), téléporteur de Shattered PD | Le plus riche en combos. |
| Obstruction | Fosses (Gungeon : demi-cœur, retour au bord, la roulade les saute), murs mobiles, tables retournées (couverture) | Dessine le chemin. |
| Dérivation | Alarme (Brogue, DCSS, Shattered PD), puits d'étage de DCSS, salle du sacrifice d'Isaac | Change les règles au lieu de blesser. |

### 1.3 Par lecture, durée de vie, camp

- **Télégraphé** (couleur, son, armement) : la norme en temps réel (Hades, Gungeon, Dead Cells, WAY). **Rythmique** : le cycle *est* le télégraphe (dalles d'Isaac, jets de Gungeon, salle du tempo). **Caché** : hérité du roguelike ; Brogue le garde (fouille), Shattered PD l'a réduit (sprites uniques, pièges cachés rares), DCSS l'a abandonné en 0.23 (les pièges cachés sont devenus des « événements d'exploration », les flèches retirées car « faciles à éviter, dangereuses seulement pour qui est déjà presque mort »). En temps réel, un piège caché n'a de place que s'il est *devinable* : la pépite-appât posée sur le piège à ours de Spelunky 2.
- **Permanent vs usage unique** : barils, TNT et œufs sont consommables — mais les œufs *repoussent* (Hades) pour rester une ressource de salle. Les boutons d'Isaac désarment pour toute la salle.
- **Blesse aussi les ennemis** : oui chez Spelunky, Nuclear Throne, Noita, Gungeon (« certains pièges blessent les ennemis et servent dans un échange de tirs »), Hades (« les pièges blessent Zagreus et les ennemis, mais les ennemis bien plus »), Dead Cells et Cult of the Lamb (mémoire). Non chez Isaac (hors sacrifice) et Zelda. C'est *la* ligne de partage : un piège qui ne blesse que le joueur est un obstacle ; un piège qui blesse tout le monde est un outil.
- **Retournable / déclenchable** : jeter un objet sur la plaque (Brogue, Shattered PD), tirer sur le baril, amorcer l'œuf, pousser dans les pointes (Tartare), emporter le piège pour le reposer (« Reclaim Trap », Shattered PD).
- **Destructible** : barils, TNT, pots, cristaux, feux d'Isaac ; presque jamais les mécanismes eux-mêmes (Gungeon non, WAY « Destructible ? Non »).
- **Lié au décor** : la lave *est* Asphodèle ; les égouts de Dead Cells sont étroits pour forcer la gestion de foule ; chaque donjon de Wizard of Legend, Moonlighter et Cult of the Lamb a son jeu de pièges. WAY le fait déjà (10 mécaniques × 4 habillages).

### 1.4 Pourquoi Vampire Survivors n'a (presque) pas de pièges

Tout le budget d'attention va sur un seul verbe : *où se tenir*. La horde est le danger, les armes tirent seules ; un piège au sol volerait la seule décision du joueur sur un écran déjà saturé. Les « pizzas-pièges » tardives déclenchent des événements de carte, pas des dégâts. Leçon pour WAY : un piège se justifie quand il reste de l'attention libre ; dans les vagues denses (salles 7 et 9), peu de pièges, mais gros.

---

## 2. Intégration dans les niveaux

### 2.1 Placement

| Motif | Qui | Règle implicite |
|---|---|---|
| Couloir / étranglement | Zelda, Dead Cells (pointes dans les puits), Gungeon (rails de wagonnets) | Coûte du temps, pas de la vie, si on lit. |
| Coin / bord | WAY (damiers de coin), Gungeon (flammes aux coins du Rat) | Le centre reste libre ; le piège punit qui se réfugie. |
| Gardien de trésor | Gungeon (coffres posés sur des pièges), Shattered PD (salles « pièges + trésor »), Spelunky 2 (pépite sur le piège à ours) | Le piège est un prix qu'on choisit de payer. |
| Salle dédiée | Isaac, Gungeon (« trap rooms »), WAY (`TRAP`, bonus XP « sans dégât ») | On apprend seul avant de combiner. |
| Piège + ennemi | Nuclear Throne (bandits *près* des barils), Wizard of Legend (« aligner les tonneaux »), Hades (pousser dans les pointes), Brogue (le monstre déclenche) | Le piège en combat n'a d'intérêt que s'il touche les deux camps ou coupe le déplacement. |

### 2.2 Densité et progression

- **Une famille neuve par étage** : Gungeon (feux et pointes au Gungeon Proper, wagonnets au Hollow — mémoire) ; Hades va des plaques (Tartare) à la lave (Asphodèle) puis aux pièges *offensifs* (Élysée) — du subi vers l'utilisable. Dead Cells ne réutilise aucune salle d'un biome à l'autre.
- **Le combo après la lecture** : Isaac pose les dalles seules, puis avec ennemis ; WAY fait pareil (salle 2 → 3 → 7).
- **Densité** : deux ou trois familles actives par salle au plus ; Spelunky et Gungeon dépassent rarement deux pièges différents par écran. La salle du tempo de WAY va jusqu'à quatre, mais *une par une*, à 6 mesures d'écart.

### 2.3 Télégraphie et fairness

Règles communes (Hades, Gungeon, Dead Cells, « Enemy Attacks and Telegraphing ») :
1. **Jamais sans avertissement** : une couleur d'alerte réservée (`PAL.alert`), un son par famille (`trapLaser`, `trapSpike`, `trapGas`, `trapSaw`), un armement de 0,5 à 1 s.
2. **Toujours un chemin sûr** : Isaac et Gungeon garantissent le passage ; le damier de WAY (« toujours une case sûre à côté ») et la grille annoncée 3 temps, c'est ça.
3. **Jamais dans le couloir d'entrée** : codé dans `salles.js` (sas, couloir de porte, rien en (23,6)).
4. **Une lecture par piège** : Shattered PD a donné un sprite unique à chaque piège *pour ça* ; DCSS a retiré ceux qui n'étaient que du bruit.
5. **Respecter la mobilité** : la roulade de Gungeon franchit fosses et pièges, le Roc's Feather saute la lame ; la ruée de WAY est invulnérable (`dashInvuln`) et saute les murets (`dashOver`). Dead Cells et Gungeon calibrent la largeur des pointes sur la longueur de la roulade.

### 2.4 Récompense et interaction

Trésor gardé (coffre sur pointes, appât, salle de pièges) ; pièges contre ennemis (Hades majore les dégâts sur ennemis, Brogue les rend proportionnels aux PV max, donc utiles contre les gros) ; knockback vers le danger (Hades, Dead Cells) ; déclenchement à distance (objet jeté sur la plaque, tir sur l'œuf).

---

## 3. Principes et erreurs

**Principes.** (1) Lisibilité : un piège = une forme, une couleur, un son, lisibles en une image. (2) Rythme : le cycle est le télégraphe ; bien lu, il devient de la musique. (3) Choix : un bon piège pose une question — passer maintenant ou attendre, y attirer l'ennemi, le faire sauter ; un piège à réponse unique (« évite ») est un obstacle. (4) Apprentissage : seul → avec ennemis → combiné ; une famille par palier, récapitulée dans la salle du tempo. (5) Symétrie : quand les pièges touchent tout le monde, « subir » devient « jouer ».

**Erreurs.** Injuste (sans télégraphe, dans le sas, pendant une animation forcée) ; bruit (trop de familles, couleurs qui recouvrent l'alerte — WAY a corrigé « plus de rouge partout » au chantier 12) ; ignoré (trop lent, trop faible, contournable par le même chemin — test : si le bot ne perd jamais de vie dessus et ne dévie jamais, le piège ne joue pas) ; caché et punitif (n'apprend rien) ; gratuit (ne garde rien, ne change pas le combat : un impôt sur le temps).

---

## 4. WAY : acquis, manques, idées

### 4.1 Ce que WAY a déjà

- **10 mécaniques, toutes temporelles** (`cycle()` / `shotState()` sur `room.time` ou `Beat.t`), **41 habillages** avec nom, couleur et phrase par palier.
- **Télégraphe solide** : `idle | warn | on`, pulsation à la croche (`Beat.pulse(4)`), son par famille, avertissement unique par coup (`warned`).
- **Partition** (`beats` : `period/active/telegraph/on`, `turn`, `trip`, `hits` libres) et **armement progressif** en salle du tempo (une famille par vague, annoncée 2 mesures avant).
- **Fairness codée** : sas et porte libres, damier à case sûre, grille annoncée, `dangerAt()` pour le bot, bonus XP « sans dégât », greffes `trapDamageMul` et `traps_heal`.
- **Autour** : modulaire (`slide_wall`, `rotor` *physique* qui pousse, `floor_cycle`, `safe_zone` — le seul élément qui blesse aussi les ennemis, `enemyMul 0.5`), défis (`collapse`, `switches`, `lights`, `timer`), terrain (`n` muret sauté en ruée, `~`, `,`, `:`), piège à loup du coyote (`hazards` `trap: true`), mines et ronces des boss, baril ennemi qui éclate via `Combat.explosion` (qui blesse déjà les deux camps).
- **Briques disponibles** : ruée invulnérable, knockback ennemi (`e.kvx`), `stunUntil` / `slowUntil` ennemis, `gasSlowUntil` joueur.

### 4.2 Ce qui manque

| Manque | Constat | Poids |
|---|---|---|
| **Aucun piège ne blesse les ennemis** | `Trap.hit()` n'appelle que `Combat.hitPlayer` ; les projectiles `trap: true` ont `owner: 'enemy'` ; PLAN-VARIETE : « vérifier qu'un piège ne blesse pas le boss ». | Le plus lourd : tous les pièges sont des obstacles, aucun n'est un outil. |
| **Un seul déclencheur** (le temps) | Ni plaque, ni proximité, ni tir, ni ennemi. | Pas de choix « quand ». |
| **Rien de destructible ni désamorçable** | `switches` est un défi, pas un piège. | Pas de choix « comment ». |
| **Aucun déplacement** (hors rotor modulaire) | Rien ne pousse, ne retient, ne téléporte. | Pas de combo ennemi. |
| **Aucun trésor gardé** | Coffres offerts en fin de 3 et 7, jamais derrière un piège. | Pas de risque choisi. |
| **Aucune interaction piège ↔ piège / terrain** | La bouche de feu n'enflamme rien, l'eau n'éteint rien. | Peu de surprise. |
| **Chemin sûr vérifié à la main** | `dangerAt()` n'est pas utilisé pour le prouver. | Fairness non testée. |

### 4.3 Trois ajouts moteur transversaux

| Ajout | Quoi | Coût |
|---|---|---|
| **A. `hurtsEnemies`** | `hitEntities(forme)` sur `[G.player, ...G.enemies]` avec un `cd` par entité (comme `hazards`) ; ×1,5 sur ennemis (règle Hades), ×0,25 sur boss. Les projectiles de piège gagnent `friendly: true` et testent les ennemis dans `Projectiles.update`. | Moyen (~10 endroits) |
| **B. `trigger`** | `'time'` (défaut) \| `'plate'` \| `'near'` \| `'shot'` \| `'cross'` ; le piège dort (`armed`) puis joue **un** cycle (`fireOnce(rt)` pose `phase = rt - (period - active - telegraph)`), se réarme après `rearm` s ou jamais. `plate/near/cross` écoutent joueur *et* ennemis. | Moyen |
| **C. `hp` et `link`** | `hp` : le piège encaisse les tirs du joueur et se coupe 8 s (`disabled`, voyant) ou explose ; `link: id` : un piège déclenché en déclenche un autre. | Faible à moyen |

Avec A, B et C, presque toutes les idées ci-dessous sont des *paramètres* de kinds existants.

### 4.4 Idées par palier

Colonnes : déclencheur · effet · télégraphe · intégration · ce que le joueur en fait · coût · moteur.

#### ADMISSION — apprendre que les pièges se retournent

| # | Nom | Déclencheur | Effet | Télégraphe | Intégration | Le joueur | Coût | Moteur |
|---|---|---|---|---|---|---|---|---|
| 1 | **Défibrillateur** | Plaque (joueur ou ennemi) | Arc 0,6 s entre deux électrodes murales, blesse tout, étourdit les ennemis 1 s | Plaque qui clignote, bourdonnement 0,5 s | Salle 3 : l'arc coupe la salle entre les apparitions | Attirer la Nuée sur la ligne et sauter sur la plaque | Moyen | `laser_beam` + B + A + `stunUntil` |
| 2 | **Brancard fou** | Tir sur le brancard | Un aller sur le rail, écrase ce qu'il croise, revient à la main | Roues qui grincent, flèche de sens | Salle 8 (couloir des brancards) | Une arme de couloir : le lancer quand la vague s'aligne | Moyen | `saw_rail` + B(`shot`) + A |
| 3 | **Bonbonne d'oxygène** | Tir ou explosion voisine | Explosion 110 px, deux camps, en chaîne | Jauge qui rougit au premier coup, sifflement | 2-3 par salle de combat, jamais à moins de 3 tuiles d'une apparition | Tirer au bon moment ; ou la garder en réserve | Faible | Obstacle `hp` + `Combat.explosion` + C |
| 4 | **Rideau de désinfection** | Temps | Nuage : ennemis ×0,5 vitesse, joueur ×0,8 sans dégât ; les rats y meurent | Sifflement, anneau pointillé, vert plus clair | Salle 6, sur le trajet du mur coulissant | Kiter la vague à travers | Faible | `gas_zone` + A (`slow` par camp) |
| 5 | **Néon à bascule** | Tir sur le boîtier, réarmable | Inverse la parité de la grille | Voyant, clic, les lignes clignotent une croche | Salle 2 `TRAP` : le boîtier est *derrière* la grille | Choisir ses lignes ; un ennemi mal placé s'y retrouve | Faible | `laser_grid` (`par ^= 1`) + C |

#### LA SERRE — le vivant mord des deux côtés

| # | Nom | Déclencheur | Effet | Télégraphe | Intégration | Le joueur | Coût | Moteur |
|---|---|---|---|---|---|---|---|---|
| 6 | **Dionée** (la `trap_plant` existe déjà en obstacle) | Proximité 1 tuile, joueur ou ennemi | Claque 0,4 s après : 18 dégâts + entrave 0,6 s ; un petit ennemi est avalé, un gros retenu 2 s | Mâchoires ouvertes, sécrétion brillante, « clac » | Près du terreau (salle 3) où l'on est déjà lent | Passer en ruée ; faire courir les Ronces dedans | Moyen | `spike_tiles` 1×1 + B(`near`) + A + `rootUntil` joueur (à ajouter) |
| 7 | **Pollen soporifique** | Temps | Endort les ennemis 2 s (×2 dégâts reçus), ralentit le joueur ×0,7 | Pistils qui gonflent, poussière dorée | Salle 7 tempo, sur le 3 | Le meilleur moment pour frapper est le plus lent pour fuir | Faible | `gas_zone` + A + `stunUntil` |
| 8 | **Vanne d'arrosage** | Tir sur la vanne | Un jet balaie la zone et **pousse** tout de 2 tuiles, sans dégât | Vanne qui tourne, tuyau qui gonfle | Salle 2 : le jet pousse vers les épines | Envoyer les ennemis dans les épines ; casser un encerclement | Moyen | `laser_sweep` + B + knockback (`e.kvx` + poussée joueur) |
| 9 | **Gousses éclatantes** | Tir, ou maturité à 8 s | Couronne de 8 graines, deux camps, repousse en 10 s | Gousse qui gonfle et rougit | Trois aux angles de la rivière (salle 4) | Un émetteur qu'on déclenche *quand on veut* | Moyen | `emitter` + B + A + `rearm` |
| 10 | **Souche à lianes** | Temps | Les lianes du rotor deviennent physiques : elles entraînent tout, les épines de coin font le reste | Rotor déjà télégraphié, lianes sans halo | Salle 6 tempo | Se laisser porter pour traverser ; les ennemis finissent dans les épines | Faible | `modular.rotor` (existe) + épines avec A |

#### LA CONCESSION — la poudre, les rails, le duel

| # | Nom | Déclencheur | Effet | Télégraphe | Intégration | Le joueur | Coût | Moteur |
|---|---|---|---|---|---|---|---|---|
| 11 | **Tonneaux en file** | Tir ou explosion voisine | Chaîne d'explosions à 0,15 s, deux camps | Mèche qui court de tonneau en tonneau | Salle 6 (poudrière), entre les fils | Sacrifier la file pour une vague, ou la garder | Faible | Obstacle `hp` + `Combat.explosion` + `link` |
| 12 | **Fil de détente armé** | Franchissement, joueur ou ennemi | Déclenche les dynamites murales liées (éventail de 3) sur le fil | Fil brillant, clochettes, bouches qui rougissent 0,6 s | Salles 6 et 9 | Faire franchir le fil par le Baril ou le Coyote | Moyen | `laser_beam` + B(`cross`) + `link` → `wall_fireball` + A |
| 13 | **Aiguillage** | Tir sur le levier | Le wagonnet change de voie au prochain passage | Levier qui bascule, voie active surlignée | Salle 7 (train) : une voie traverse les apparitions, l'autre le centre | Choisir qui le wagonnet écrase | Moyen | `saw_rail` (`points` alternatifs) + C + A |
| 14 | **Gatling à retourner** | Tenir 1 s la plaque derrière la tourelle | Passe au joueur 6 s et vise l'ennemi le plus proche | Jauge circulaire, canon qui prend la couleur du joueur | Salle 4 : la plaque est à découvert | Tenir sous le feu pour gagner un allié | Moyen | `turret_fixed` + `owner` basculable + `friendly` |
| 15 | **Puits de mine** | Terrain (nouveau `o`) | On y tombe : 8 dégâts, retour au bord ; un ennemi poussé dedans meurt (boss exclus) ; la ruée le saute | Trou bordé de planches, poussière | Salles 3 et 9, jamais sur le chemin large | Le knockback des armes devient une arme | Fort | Terrain `pit` (`dashOver`) + respawn + `e.kvx` |
| 16 | **Cloche du saloon** | Plaque, usage unique | Appelle 4 ennemis **et** ouvre un coffre annexe | Cloche, plaque dorée, tintement | Salle 4 : la cloche garde un coffre visible | Le trésor gardé : une vague contre une greffe | Faible | B + `Waves.spawn` + coffre |

#### LE SÉRAIL — lumière, huile, cages

| # | Nom | Déclencheur | Effet | Télégraphe | Intégration | Le joueur | Coût | Moteur |
|---|---|---|---|---|---|---|---|---|
| 17 | **Miroir de cuivre** | Tir : tourne d'un huitième | Réfléchit le rai de soleil, qui blesse tout | Rai pointillé du trajet futur pendant l'annonce | Salles 4 et 9 : un rai, deux miroirs | Diriger le rai sur la vague ; se tromper, c'est se couper le chemin | Fort | `laser_beam` + segment réfléchi + C + A |
| 18 | **Flaque d'huile** | Contact d'une naphte, d'un brasero, d'une braise | Inerte (glisse ×1,15) puis **brûle 3 s**, deux camps | Reflets, puis mèche et fumée noire | Salle 5, entre les braseros roulants | Pousser la vague sur l'huile et attendre le brasero | Moyen | `gas_zone` à deux états + ignition par projectile `fireball` + A |
| 19 | **Dalles du Vizir** | Plaque par case, ennemis compris | Les pieux sortent sous qui marche, 0,3 s après (0,5 s pour le joueur) | Mosaïque qui s'enfonce, cliquetis | Salles 6 et 8, le long des allées du bazar | Mener la poursuite à travers : les poursuivants déclenchent | Moyen | `spike_tiles` + B(`plate`) + A |
| 20 | **Cage à oiseaux** | Proximité, joueur ou ennemi | Une cage tombe : entrave 0,8 s (joueur) ou 3 s (ennemi, cible fixe) | Chaîne qui tremble, ombre qui grandit 0,6 s | Salles 2 et 7, trois cages sur le chemin large | Le filet de Brogue : capturer un Derviche | Moyen | Nouveau `drop` (cercle + délai) + `rootUntil` + `stunUntil` |
| 21 | **Encensoir à contretemps** | Temps musical | Nuage sur le contretemps ; un tir **en rythme** dedans l'enflamme (×2 sur les ennemis, joueur épargné) | Encens gris → pointillé or sur la croche | Salle 7 tempo, avec le derviche | Le combo « en rythme » devient une arme de zone | Faible | `gas_zone` + `Tempo.playerAction` + A |
| 22 | **Sablier de salle** (tous paliers) | Tir | Le retourner décale toutes les phases d'une demi-période | Sable qui coule, tous les pièges clignotent une fois | Un par salle `COMBAT_TRAP` | Choisir la *phase* de la salle au lieu de la subir | Faible | `room.trapOffset` dans `Room.trapTime` |

#### Deux mécaniques de salle

| # | Nom | Quoi | Coût | Moteur |
|---|---|---|---|---|
| 23 | **Boîtier de désamorçage** | Chaque piège fixe (grille, rayon, tourelle) a un boîtier à 3 coups : touché, il se coupe 8 s puis revient (voyant orange → gris → orange). On *paie* des tirs pour du calme. | Faible | C (`hp`, `disabled`, `rearm`) |
| 24 | **Chemin sûr prouvé** | Test de batterie : pour chaque salle et chaque `t` de 0 à 60 s par pas de 0,1 s, un flot sur la grille avec `dangerAt() === 0` doit relier le sas à la porte. La garantie Isaac/DCSS, automatisée. | Faible | `dangerAt` + `salles.js` |

### 4.5 Ordre conseillé

1. **A** sur nappe, dalles, rayon et projectiles : les 41 pièges changent de nature sans toucher au contenu (×1,5 ennemis, ×0,25 boss, jamais le joueur en ruée).
2. **C** avec la bonbonne (3) et les tonneaux (11) : le baril et `Combat.explosion` existent déjà.
3. **B** avec le défibrillateur (1), le fil armé (12), les dalles du Vizir (19) : un piège par palier, seul en salle 2, combiné en salle 3.
4. **Déplacement** : vanne (8), souche (10), puis les puits (15) si le budget suit.
5. Le **test de chemin sûr** (24) d'abord, pour que chaque ajout reste prouvé.

Fil rouge : un piège doit répondre à trois questions — *quand je passe*, *à qui il sert*, *comment je l'éteins*. WAY répond superbement à la première, pas encore aux deux autres.

---

**Sources** (extraits de recherche ; pages complètes bloquées par le proxy) : wikis Enter the Gungeon (Traps, Pit, Gungeon Proper), Hades (Gameplay mechanics, Elysium, Asphodel), Brogue (Caustic gas trap, Net Trap), Pixel Dungeon (Shattered PD – Traps), Spelunky (Arrow/Spear/Bear/Totem Trap (2)), Isaac (Spikes, Buttons, TNT), Dead Cells (Hazards) et Deepnight « The Level Design of Dead Cells », CrawlWiki (Trap, notes 0.23), Nuclear Throne (Weapons) et Ctrl500 « Explosions in Nuclear Throne », Noita (Toxic Sludge, GDC « Exploring the Tech and Design of Noita »), Zelda Wiki (Blade Trap), Wikipédia (Wizard of Legend, Cult of the Lamb, Hyper Light Drifter), teemo.dev (Vampire Survivors), Game Developer « Enemy Attacks and Telegraphing ».
