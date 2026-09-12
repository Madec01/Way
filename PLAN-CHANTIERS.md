# WAY — plan de chantiers

Ce plan répond au diagnostic (`DIAGNOSTIC.md`). Les 66 modifications y sont regroupées en **onze chantiers**, ordonnés par dépendance puis par valeur : chaque chantier laisse le jeu jouable et poussé sur `main`, et le suivant s'appuie sur lui. Les numéros entre crochets renvoient à la liste des 66.

La taille est donnée en **séances** — une séance, c'est une session de travail avec moi, vérifiée par la batterie de tests et livrée. Total : **18 à 22 séances**. Les six premiers chantiers, soit 8 séances, rendent le jeu montrable aux amis ; le reste le rend bon.

> **Pause levée le 11 septembre 2026** : les plans des interfaces (`PLAN-INTERFACES.md`, I-1 → I-8) et du ressenti (`PLAN-RESSENTI.md`, F-1 → F-7) sont terminés. Les chantiers **8, 9 et 10** reprennent maintenant, dans cet ordre ; le 11 se fait au fil de l'eau. (Mis en pause le 10 septembre 2026, à la demande de l'auteur, le temps de ces deux plans.)

## Trois décisions à prendre avant

Elles conditionnent des chantiers entiers ; je ne les prendrai pas à ta place.

**Tranchées le 9 septembre 2026** : Neuf et Marge partent ; le décor animé se livre (4 salles cadencées au chantier 9) ; profil seul pour les planches.

| Décision | Ce que ça engage | Mon avis |
|---|---|---|
| **Neuf et Marge : on les garde ?** [22] [35] | S'ils partent, leurs traits vont à deux amis et l'échelle 60 px contre 88 disparaît d'elle-même. S'ils restent, il faut les redessiner en case 48. | Les retirer. Le jeu est celui des amis. |
| **Le décor animé et l'atelier « Animations » : on livre ou on sort ?** [12] | Livrer = 4 salles cadencées à construire (une séance de contenu). Sortir = l'atelier reste en mode test, rien dans le build joueur. | Livrer 4 salles au biome 1 dans le chantier 9 ; sinon 842 lignes pour rien. |
| **Nord et sud pour les planches ?** [37] | Profil seul = une ligne de code. Dos = 5 planches de plus par personnage, pour toi. | Profil seul, maintenant. Le dos se rajoute le jour où tu as envie de le dessiner. |

---

## Chantier 0 — Le socle ✔ *(fait le 9 septembre 2026)*

**Objectif** : tout ce qui suit doit pouvoir être vérifié et lu. Une séance qui ne change rien au jeu et rend les vingt suivantes possibles.

- [56] Rapatrier les tests dans `dev/test/` : `spawncheck`, `levels`, `human`, `tempo`, `touch`, `gabriel`, `chats`, `duo`, `uno`, `martin`, `arme`, `pets` ; un helper commun `entrer()` qui remplace les 113 copies de l'écran-titre ; `process.exit(1)` sur tout échec ; une commande `node dev/test/run.js`.
- [65] `.gitignore`, retrait de `undefined/shots/*.png`.
- [53] Prettier `printWidth: 140`, **un commit seul**, avant tout refactor — sinon chaque diff suivant est illisible.
- [55] `'use strict'` par fichier ; liste des globaux attendus en tête de `build.js`.
- [64] Suppression des 130 assets jamais chargés.

**Fini quand** : `node dev/test/run.js` passe en vert sur `main`, le dépôt n'a plus de fichier parasite, aucune ligne de `dev/` ne dépasse 140 caractères.
**Taille** : 1 séance.
**Bilan** : 17 tests dans `dev/test/`, tous verts ; 748 Ko d'assets et les fichiers parasites retirés ; Prettier appliqué en un commit seul (173 lignes insécables restent au-delà de 140) ; `'use strict'` sur 31 fichiers ; `build.js` refuse deux fichiers qui déclarent le même nom (108 noms de premier niveau contrôlés).

## Chantier 1 — Ce que les amis verront demain ✔ *(fait le 9 septembre 2026)*

**Objectif** : les défauts visibles à la première partie, tous petits, tous mesurés. Rien de structurel.

- [27] Dessiner la mort : le corps reste si `dead`, l'écran de fin attend 0,9 s.
- [30] Portrait du hub avec `anim` — Martin en Martin, pas en chevalier.
- [31] Le clip « ramasse » réservé à bourse, relique, cœur, arme, allié — plus jamais sur un orbe d'XP.
- [3] Le buff « Personne » retiré dans `Pets.give`.
- [21] F2 réservé au mode test.
- [23] Purge du vocabulaire de l'ancien lore (« Sujet perdu », « Salle Zéro », « Réimpression », « Neuf (Sujet 09) »).
- [22] Retrait de Neuf et Marge si la décision est prise ; leurs traits attribués à deux amis.

**Fini quand** : un test `mort.js` mesure des pixels dessinés après la mort ; le portrait du hub fait 147 px de dessin pour Martin ; une run complète n'affiche aucun mot de l'ancien lore.
**Taille** : 1 séance.
**Bilan** : les sept points faits (CONTENT.md §36) ; `mort.js` et `premiere_partie.js` couvrent chute, écran de fin différé, clip « ramasse », mots bannis, portrait, F2, « Personne », Neuf et Marge. Les traits de Neuf et Marge attendent le chantier 5. Les *fragments* du hub racontent encore l'ancien lore : à trancher.

## Chantier 2 — La sauvegarde et la vie privée ✔ *(fait le 9 septembre 2026)*

**Objectif** : ne jamais perdre la progression d'un ami, et ne jamais publier ce qu'il n'a pas accepté. À faire **avant** le chantier 7, qui change la forme du profil.

- [51] `Meta.migrate(d)` par version, fusion profonde des sous-objets, copie de l'ancien blob avant réécriture, clé renommée `way_save`.
- [62] `zoom` et `lag` dans `Meta.fresh()` et dans SCHEMA.md.
- [60] `Debug.report(e)` : `window.onerror` + `unhandledrejection`, toast, journal dans `localStorage`, bouton « copier le rapport » sur l'écran de fin.
- [52] Consentement affiché à l'export de l'atelier ; aucune photo dans le dépôt (`FRIEND_IMAGES` reste vide ou vit hors dépôt) ; champ `pseudo` sur les personnages, affiché à la place du prénom.

**Fini quand** : un profil `{v: 1}` et un profil `{v: 2}` fabriqués se chargent tous deux sans perte (test) ; un `throw` volontaire produit un rapport copiable ; l'export refuse une photo sans consentement.
**Taille** : 1 séance.
**Bilan** : `way_save` v2 avec migration, fusion profonde et copie de secours (SCHEMA.md §8) ; `Rapport` note toute erreur et « Copier le rapport » est dans la pause et l'écran de fin ; l'export demande l'accord pour les photos et un pseudo remplace le prénom. Tests `sauvegarde.js` (11), `rapport.js` (7), `export.js` (3).

## Chantier 3 — Un corps, une ligne de sol ✔ *(fait le 10 septembre 2026)*

**Objectif** : une seule vérité sur où sont les pieds, la main, l'ombre et la hitbox. C'est le chantier qui empêche les bugs « ça flotte », « l'arme sort de l'entrejambe », « le chat passe derrière » de revenir.

- [33] Un descripteur `Sprites.corps(char|pet)` → `{ sol, hauteur, main }`, consommé par `drawBody`, `Pet.render`, `handY`, l'ombre, la hitbox, le tri en profondeur. `draw()` et `drawSheet` ne calculent plus rien.
- [36] Le corps suit la visée, comme les personnages sans planche.
- [38] Compagnons `drawProp` sur la même ligne de sol que les planches.
- [45] Tri en profondeur par les pieds, joueur inclus.
- [32] Clip de tir déclenché par `Weapons` au tir réel, fps = images × cadence ; pas de relance bouton tenu.
- [47] Animation pendant le dash ; clip blessé pour le joueur (flash + recul, sans planche).
- [42] `readSheet` sans verrou sur `fw`.
- [43] [44] [50] Retrait du corps en pixels, de `BODY_PALETTES`, de `Sprites.portrait()`, de `hold`, `walkFrame`, `sprite: "player2"`.
- [46] Vignettes à multiple entier (48 → 48 ou 24, jamais 34).
- [48] `gait` sur `Time.now`.
- [37] Nord/sud : appliquer la décision.

**Fini quand** : un test `corps.js` dessine chaque personnage et chaque animal, mesure pieds, main et ombre au pixel, et exige la même ligne pour tous ; le clip de tir compte exactement un geste par tir sur les 8 armes.
**Taille** : 2 séances.
**Bilan** : fait en une séance (CONTENT.md §38). `Sprites.corps` et `SOL = 25` pour tous ; `corps.js` mesure 23 fois au pixel (trois personnages, sprite entier, visage collé, planche du jeu, quatre animaux, compagnon à image, ordre de dessin, regard, un geste par tir, dash). La cadence du geste est vérifiée sur l'arme de départ, pas encore sur les 8 : à compléter au chantier 4 quand on touchera aux armes.

## Chantier 4 — Le Normal gagnable ✔ *(fait le 10 septembre 2026)*

**Objectif** : un joueur moyen gagne le biome 1 une fois sur trois. Tout se mesure au bot (`levels.js`, 8 armes × 4 graines) avant et après chaque réglage.

- [18] Armure en pourcentage, plafonnée à 50 %.
- [20] L'arc : tir rapide sans charge à cadence pleine ; DPS de chaque arme affichée en prépa.
- [10] Renforts de salle 2 plafonnés à 3 vagues.
- [17] Plancher épique du coffre à 0,7.
- [5] Prime de mort 30 + 10 par salle ; prix des calibrations divisés par 3.
- [1] Courbe de difficulté du biome 1 : PV et dégâts des vagues 3-5, puis 6-9, réglés jusqu'à la cible.
- [19] Biomes 3 et 4 : multiplicateurs ramenés pour qu'un profil maxé y gagne une fois sur trois.

**Fini quand** : bot Normal biome 1, profil neuf, 8 armes × 4 graines : **≥ 25 % de victoires et ≥ 60 % de mini-boss tués** (le bot est plus faible qu'un humain : 25 % bot ≈ 35-40 % humain) ; aucune run bot au-dessus de 60 s dans une salle ; TEST-REPORT §11 écrit avec les chiffres.
**Taille** : 2 séances.
**Bilan** : onze réglages mesurés un à un (CONTENT.md §39), tous dans `05_balance.js` ou le contenu. Avant : 0 victoire sur 32, mini-boss 6 %. Après (32 parties) : 13 victoires (41 %), mini-boss tué 22 (69 %), salle médiane 7, pire salle 113 s — cibles atteintes. La pire salle reste au-dessus de 60 s dans les salles modulaires (salle 6) : le bot y marche dans le sol électrifié — à traiter au chantier 9 avec ces salles. Biomes 3-4 : seule l'exemption de rampe des boss les touche ; à mesurer au chantier 9. Uno : 3,5 → 0,8 KO par partie.

## Chantier 5 — Des compagnons qui comptent ✔ *(fait le 10 septembre 2026)*

**Objectif** : les trois modes sont un vrai choix, chaque animal se sent, chaque ami a un caractère.

- [7] « Personne » à +25 % PV / +15 % dégâts ; « À l'appel » avec une onde de choc à l'arrivée.
- [8] `collect` aimante XP et cœurs pendant le combat, rayon visible au sol ; `mark` = crit garanti du joueur, marque visible 4 s.
- [15] Un trait par ami — je propose trois fiches, tu tranches avec eux.
- [16] Drops hors élites : une relique ou un cœur garanti par salle de combat.
- [57] `Run.reset()` unique, appelé par `Run.start` et `Run.toHub` ; les six `snap()` disparaissent.

**Fini quand** : mesuré au bot sur 8 runs par mode, les trois modes finissent à ±15 % de dégâts totaux l'un de l'autre ; Choupi aimante ≥ 80 % des orbes d'une salle ; ORI produit un crit sur ≥ 90 % des cibles marquées.
**Taille** : 1 séance.
**Bilan** : tout est livré (CONTENT.md §40, test `compagnons.js`, 17 mesures). « Personne » a fini à **+35 % PV / +20 % dégâts** après deux mesures : à +25/+15 le bot gagnait 1 partie sur 8 contre 3 avec Uno ; à +35/+20, 3 sur 16 et le mini-boss une fois sur deux (TEST-REPORT §12). **La cible « ±15 % entre les trois modes » n'est pas atteinte pour le solo** et je ne pousse pas plus loin : Uno encaisse 200 à 600 dégâts par partie à la place d'un bot qui n'esquive pas, alors qu'un joueur qui esquive tire bien plus de la part gardée — au-delà, plus personne ne prendrait d'animal. « Tout le temps » et « à l'appel » se valent (3/8 et 4/8), et l'onde d'arrivée fait de l'appel un vrai bouton de secours. ORI : 20 coups sur 20 critiques sur la cible marquée (cible ≥ 90 % tenue). Choupi : mesuré sur une pièce hors de portée, pas sur « 80 % des orbes d'une salle » — le bot ramasse déjà presque tout lui-même, la mesure n'aurait rien dit ; à regarder à la main. Reliques : 2 % sur les ordinaires, une sûre sur le mini-boss ; pas de cœur garanti par salle de combat en plus de celui du chantier 4 (déjà devant chaque porte). Les `snap()` restent : ils placent le compagnon après la porte, ils ne nettoient pas — c'est `Run.reset()` qui nettoie. Les trois caractères (Bonne constitution, Pied sûr, Sang-froid) sont posés sur Martin, Gabriel et Jean **à titre provisoire** : à réattribuer avec les amis.

## Chantier 6 — Choisir plutôt que subir ✔ *(fait le 10 septembre 2026)*

**Objectif** : le joueur décide de sa run.

- [6] Fenêtre de tempo ±50 ms, bonus dès une série de 4, jauge de série visible.
- [9] Trois compétences proposées ; paire bonus/malus choisie parmi deux.
- [11] Greffes fusionnées : ~45, un effet par nom, paliers de rareté ; table de correspondance ancienne → nouvelle pour les sauvegardes (chantier 2).
- [13] Calibrations fictives ramenées à un palier chacune, au prix du premier.

**Fini quand** : le bot, qui ne vise pas le tempo, tombe à < 15 % de tirs bonifiés ; aucune greffe n'en domine strictement une autre (script de vérification sur `mods`) ; les paliers vendus ont tous un `effect` codé.
**Taille** : 1 séance.
**Bilan** : les trois cibles sont tenues (CONTENT.md §41, test `choix.js`, 17 mesures). Tempo : ±50 ms, bonus dès la 4e note, et une règle de plus que prévu — **une action hors du temps casse la série** — sans elle, un pistolet au bouton tenu tombait sur chaque fenêtre et construisait la série tout seul ; le bot passe de 38-53 % à **0 %** de tirs bonifiés. Prépa : 3 compétences, 2 paires bonus/malus au choix (étape 0 « Ton départ »). Greffes : 74 → **61** (pas 45 : les 8 synergies d'arme et les 6 colossales sont chacune uniques, et fondre plus loin aurait retiré des choix, pas des doublons), une par effet, 13 anciens ids résolus par alias, `dev/check-greffes.js` à 0 dominance dans la même rareté ; la chance d'un effet suit maintenant ses paliers. Calibrations : Mémoire sélective, Aperçu du coffre et Quatrième choix à un palier, fiches honnêtes, sauvegarde v3 qui rembourse. À regarder à la main : la fausse note est-elle trop sévère avec une lame (tenir le bouton = jamais de série) ? Si oui, tolérer une note hors temps par mesure plutôt qu'élargir la fenêtre.

## Chantier 7 — Se comparer entre amis ✔ *(fait le 11 septembre 2026)*

**Objectif** : la raison de rejouer.

- [4] Score de run (qualité × niveau × temps), temps total, graine sur l'écran de fin ; tableau local des 10 meilleures par personnage ; **graine du jour** (même run pour tout le monde, un jour donné) ; résultat copiable en une ligne (« Martin + Uno · biome 1 · salle 9 · 4 min 12 · 18 430 pts · graine 20260909 ») ; export/import de la sauvegarde en un fichier.

**Fini quand** : deux profils sur la même graine du jour voient la même salle 1 ; la ligne copiée se recolle dans un autre navigateur et rejoue la graine. **Bilan** : fait en une séance (CONTENT.md §62, test `comparer.js`, 8 mesures). Score de run (`Progression.runScore`), graine notée à chaque partie et graine du jour cochable dans le camp, ligne de résultat copiable et relisable (la graine et le palier), dix meilleures parties par personnage dans le camp, sauvegarde v4 qui se télécharge, se copie et s'importe (fichier ou texte) avec copie de secours.
**Taille** : 1 séance.

## Chantier 8 — L'atelier honnête ✔ *(fait le 11 septembre 2026)*

**Objectif** : l'outil produit exactement ce que le jeu contient, et le contenu ne pèse pas trois fois son poids.

- [28] L'atelier importe `content5.js` à l'ouverture ; l'export fusionne au lieu de remplacer.
- [34] `amisSnippet` émet `pairs`, `anim`, `duo`, `hidden`, `fly` ; `readSheet` câblé pour les animaux.
- [40] Une seule copie de chaque image : `way.props.custom` supprimé, `addSheet` appelé une fois, `addCustom` sans réécriture par image.
- [39] PNG palette à l'export (quantification en canvas, 17 couleurs suffisent).
- [61] IndexedDB pour les images de l'atelier ; refus explicite avant dépassement.
- [49] `IMG_MAX` aligné avec la doc ; JPEG pour les photos.
- [12] Décor animé : appliquer la décision.

**Fini quand** : ouvrir l'atelier, exporter sans rien toucher, recoller, rebâtir → `content5.js` identique octet pour octet (test d'aller-retour) ; `index.html` perd ≥ 120 Ko.
**Taille** : 1 à 2 séances. **Bilan** : fait en une séance (CONTENT.md §58, test `allerretour.js`, 11 mesures). L'export sans rien toucher redonne `content5.js` octet pour octet et `index.html` perd **149 Ko** (1 241 → 1 092). Le fichier prend la forme `FRIEND_CONTENT = { characters, pets, pairs }`, relu à l'ouverture et fondu à l'export ; les fiches portent `def`, donc `pairs`, `anim`, `duo`, `hidden`, `fly` et les caractères importés traversent ; les animaux ont leurs planches. PNG palette écrit par `78_amis.js` (261 → 86 Ko pour les 31 planches, mêmes pixels), photos en JPEG à 64 px, `way.props.custom` supprimé, planches lues une fois, IndexedDB avec refus explicite avant dépassement. Décor animé : livré, ses quatre salles au chantier 9. À regarder par l'auteur : ouvrir l'établi Amis (F2 → Amis) et vérifier ses trois copains et quatre animaux à l'œil.

## Chantier 9 — Quatre biomes différents ✔ *(fait le 11 septembre 2026, trois séances)*

**Objectif** : le plus gros, et le seul qui ajoute du jeu. Après lui, le contenu déclaré est vrai.

- [2] Un ordre de salles propre à chaque biome ; une salle unique par biome (le pont de LA SERRE, le train de LA CONCESSION, le bazar du SÉRAIL, le sous-sol du biome 1) ; un comportement neuf par archétype et par biome (le rusher du 2 saute, celui du 3 pose un piège en mourant, celui du 4 se dédouble).
- [14] Salles 4 et 8 remplacées par des salles de combat ; coffre offert en fin de 3 et 7 ; boss de salle 9 différent de celui de salle 5 (deuxième boss par biome, ou le mini-boss promu).
- [24] ✔ Terrain de salle : étendu (chantier 12 D, CONTENT.md §70) — douze salles sur 36 en portent, dans les quatre paliers.
- [29] `lightMask` : disques pré-rendus, masque au demi-temps. *Les balles et les yeux du défi sont déjà en `Halo` (CONTENT.md §57).*
- [41] Flash ennemi précalculé.
- [12] Quatre salles cadencées si la décision est « livrer ».

**Fini quand** : bot sur les 4 biomes : ordres de salles distincts, 0 élément modulaire identique entre deux biomes en salle 6, 28 comportements d'ennemi distincts au grep ; rendu < 2 ms par image sur « lumières coupées ».
**Taille** : 3 à 4 séances. **Séance 1 (11 septembre 2026, CONTENT.md §59)** : [2] structure faite — quatre ordres de salles distincts, une salle unique par biome (sous-sol, pont, train, bazar) ; [14] fait — 4 et 8 en combat, coffres offerts en fin de 3 et 7 (au bazar pour le Sérail), boss de salle 9 à ses propres phases (`revenge.phases`) ; salles modulaires à éléments distincts par biome. **Séance 2 (CONTENT.md §60)** : [2] comportements faits — 21 variantes, 28 comportements distincts, chacun mesuré par `comportements.js`. **Séance 3 (CONTENT.md §61)** : [12] quatre salles cadencées de l'Admission jouées, [29] masque des lumières une image sur deux avec disque pré-dessiné (1,28 → 0,97 ms au banc A/B, 1,45 ms avec les faisceaux : sous les 2 ms visés), [41] flash précalculé, wagons habillés. [24] le terrain de salle, tranché au chantier 12 D : étendu à douze salles.

## Chantier 10 — Le téléphone ✔ *(fait, mesuré sur le téléphone de l'auteur le 12 septembre 2026)*

**Objectif** : la moitié des amis ouvrira le lien sur un téléphone.

- [63] ✔ Mesure sur téléphone réel avant tout : fps du menu, de la salle 2, du défi lumières. *Le jeu se mesure lui-même (`Perf`, CONTENT.md §63) : compteur en bas de l'écran (pause ou `?perf`), ligne « WAY perf · … » à copier depuis la pause, reprise dans le rapport. Reste à la lire sur ton téléphone.*
- [25] ✔ Refonte de l'interface tactile (PLAN.md §8) — faite en I-8.
- [66] ✔ `shadowBlur` et `backdrop-filter` remplacés par des ombres pré-rendues là où la mesure le demande. *Pièges, modules, tempo, défis, porte, flaques, lames : `Halo.line` / `Halo.rect` / `Halo.draw`. Par image : salle 6 → 5 flous (11 avant), salle 8 → 3 (11). Les boutons tactiles n'ont plus de flou d'arrière-plan. Un **rendu économe** (flous coupés, un pixel par pixel, écrans sans flou) s'allume tout seul au tactile sous 45 i/s pendant 3 s, ou depuis la pause.*

**Fini quand** : ≥ 50 fps en salle 2 sur un téléphone de milieu de gamme ; une run complète jouable au pouce sans toucher au clavier. *Les deux points sont faits : mesure de l'auteur sur son téléphone (Android 10, Chrome 153, écran 832×384 ×3,8, tactile) : « 60 i/s · min 60 sur 10 s · rendu 1,8 ms · 3 flous · complet · salle 1 » en Serre — au-dessus des 50 visés, sans que le rendu économe ait eu besoin de s'allumer. Reste l'affichage des menus en paysage court, traité à part (PLAN-INTERFACES.md, I-9).*
**Taille** : 2 à 3 séances — **1 séance faite le 11 septembre 2026**, plus la mesure.

## Chantier 11 — La dette, au fil de l'eau ✔ *(séance de ménage le 12 septembre 2026)*

**Objectif** : pas une séance dédiée — un item par séance, glissé dans le chantier en cours quand on touche le fichier. *Finalement fait en une séance, à la demande de l'auteur (CONTENT.md §65).*

- [54] ✔ Table `kind → fn` pour `Boss.runPattern` (`BOSS_PATTERNS`, 17 motifs), `Pet.update` (`PET_ACTIONS`, 9 comportements), `Challenge.update` (`UPDATERS`, 5 défis). *`Atelier.tune` n'est pas une machine à états (un formulaire par famille d'élément) : laissé tel quel, il s'ouvrira avec l'atelier.*
- [58] ✔ Nombres magiques vers `05_balance.js` — ceux du chantier 4 : la formule de la difficulté (`BALANCE.difficulty`), le chrono tenu (`timerBonus`), l'enragé (`enrageMul`).
- [59] ✔ `Content.character` / `Content.biome` : sans id le premier (profil neuf), un id inconnu → `console.warn` + `null` ; les quatre appelants qui supposaient un résultat se rabattent ou se taisent.
- [66] ✔ En-têtes « SALLE ZÉRO » (16 fichiers), Gamepad « prévu », `deepClone`, `Enemy.slowFactor`, `TODO_SPRITE` retirés ; `Fullscreen.supported` n'existait déjà plus.

**Fini quand** : plus aucune fonction de plus de 60 lignes dans `dev/` ; `grep -c "SALLE ZÉRO" dev/*.js` = 0. *Le second est vrai. Le premier ne l'est pas et ne le sera pas sans refaire le jeu : `renderHudBody` (300 lignes), `showHub` (280), les `render` des entités et `Atelier.tune` restent longs — ce sont des gabarits et des dessins, pas des machines à états ; les découper n'apporterait rien au joueur. Critère abandonné, remplacé par : aucune machine à états en `switch` de plus de 60 lignes (`dette.js` le mesure).*

---

## Chantier 12 — La variété des paliers ✔ *(validé le 12 septembre 2026 ; quatre séances faites le jour même)*

**Objectif** : que l'Admission, la Serre et le Sérail soient aussi variés et mémorables que la Concession — l'auteur l'a dit après une partie complète. Le diagnostic et le détail salle par salle sont dans `PLAN-VARIETE.md` (trois agents : game design, sprites et bibliothèques, moteur).

**Le constat en une phrase** : les quatre paliers partagent les mêmes gabarits de salles et le même sol ; la Concession se distingue parce qu'elle a posé à la main des obstacles typés en scènes, du décor, un train habillé, du terrain, des ennemis « accessoires » et des pièges colorés à son nom — trois leviers que les autres n'ont pas tirés, et que le moteur sait déjà faire.

- **Séance A — les scènes** ✔ (contenu seulement, risque faible ; CONTENT.md §67) : un `kind` et deux à quatre décos à la main sur toutes les salles nues (Admission ×9, Serre ×9, train, poudrière, bazar, Sérail 8) ; dix pièges à la Serre (ids, noms, couleurs), la couleur sur ceux de l'Admission ; les dix pièges orphelins posés (rails de brancards, gyrophare, gatling, revolvers, braseros, rai de soleil…) ; quatre partitions de tempo distinctes. Le joueur voit : chaque salle a une silhouette voulue, les pièges de la Serre sont des plantes.
- **Séance B — le sol et les murs** ✔ (assets ≈ 78 Ko, `index.html` inchangé ; CONTENT.md §68) : un tileset par palier (carrelage d'hôpital et murs métal, terre et mousse et briques à lianes, mosaïque et grès, sable) depuis des packs CC0 sur des miroirs GitHub vérifiés (Ninja Adventure, Kenney Roguelike, 0x72 v4, DCSS) ; le mur du haut enfin décoré (cuve qui coule, fontaines animées, tentures, bouches d'aération) ; une `palette` pour l'Admission ; les crédits.
- **Séance C — ce qui bouge et les accessoires** ✔ (CONTENT.md §69) : le décor animé dans les trois autres paliers (lumières à la couleur du palier, moulin, vautour, papillon, grenouilles, sabliers) ; un `look` générique sur les murs coulissants (tentures, barrières, lianes) ; dix à quinze accessoires par palier découpés des packs en PNG (lits, paillasses, tuyaux, buissons, ruines moussues, palmiers, statues, étals) ; des ennemis « accessoires » pour l'Admission et la Serre (rat, œil volant, limace, papillon) ; les SVG et animaux orphelins branchés.
- **Séance D — le terrain** ✔ (CONTENT.md §70) : les guichets, bancs et flaques de l'Admission, le terreau, les bassins et les rideaux de vapeur de la Serre, les sables mouvants de la Concession, les bassins du hammam — douze salles à terrain sur 36 ; `check-terrain.js` étendu aux obstacles et au couloir de deux tuiles ; le test `salles.js` (porte atteignable par un couloir large, sas et porte libres, place du boss, décor sur sol nu, ≤ 40 obstacles) ; la galerie des 36 salles. *Non fait, exprès* : le plan ASCII complet par salle (`37_layouts.js`) — les plans de terrain vivent dans chaque salle et le vérificateur lit aussi ses obstacles, un second format aurait doublé la source de vérité. Les pièces composables selon la graine restent une option pour après.

**Fini quand** : la galerie de captures montre 36 salles dont aucune ne ressemble à une autre du même palier *(livrée à chaque séance)* ; l'auteur joue les quatre paliers et ne distingue plus « le désert » des autres par la variété *(à lui de dire)* ; batterie verte *(52 tests)* ; `levels.js` sur chaque palier (le bot traverse, le taux de victoire ne baisse pas).
**Taille** : 4 séances, dans l'ordre A, B, C, D — A donne l'essentiel de l'effet sans risque ; D demande une passe de mesures.
**Décisions prises** : les packs (Kenney, Ninja Adventure, 0x72 — tous CC0, crédités) ; le terrain étendu à douze salles ([24] réglé). **Reste à l'auteur** : dire si le brancard à roulettes lui plaît comme « baril » de l'hôpital, et jouer les quatre paliers.

## Chantier 13 — Les pièges ✔ *(validé le 12 septembre 2026 ; quatre séances faites le jour même)*

**Objectif** : que les pièges de WAY ne soient plus seulement des obstacles qu'on subit, mais des outils qu'on utilise — contre les ennemis, quand on le décide, et qu'on peut éteindre. L'auteur l'a demandé après la variété des paliers : « le même processus pour les pièges ». Le diagnostic, les règles, l'architecture et le détail piège par piège sont dans `PLAN-PIEGES.md` (trois agents : game design, sprites et bibliothèques, moteur).

**Le constat en une phrase** : dix mécaniques, quarante et un habillages, une télégraphie et une partition musicale solides — mais tout est déclenché au temps, seul le joueur est blessé, rien ne se casse ni ne se désamorce, huit pièges définis ne sont jamais posés et aucun test ne vérifie qu'un piège blesse. Dans le genre, la ligne de partage est « le piège blesse-t-il aussi les ennemis ? » : quand non, c'est un obstacle ; tous ceux de WAY le sont.

- **Séance A — le socle** ✔ (CONTENT.md §72) : les tables déclencheur × corps × effet avec `TRAP_LEGACY` (les dix mécaniques traduites à l'identique, les 41 définitions et 112 poses inchangées) ; les dettes payées (`syncBeat` en cache, `slow` et `lifetime` lus, la grille calculée une fois, le dégradé du gaz pré-rendu, l'annonce des dalles et du gaz en `PAL.alert`, la nappe dans la couleur du piège, la cadence `beats.every` des émetteurs enfin musicale) ; le test `pieges.js` (dégâts, recharge, projectiles, cohérence `dangerAt` ↔ coup, déterminisme), rejoué sur l'ancien moteur ; le chemin sûr prouvé dans `salles.js`, dans le temps et l'espace. *Gardé* : le type de salle `TRAP`, qui sert à l'atelier.
- **Séance B — les deux camps** ✔ (CONTENT.md §73) : `BALANCE.trap` (ennemis ×1,5, boss ×0,25, compagnons ×0,5), une recharge par cible, les balles de piège abattent ce qu'elles croisent, les compagnons par `Pets.hurt` ; les huit pièges dormants posés (41 sur 41) ; le banc avant et après ; `pieges.js` à 19 contrôles. Le joueur voit : une Nuée qui traverse un tourniquet meurt, une tourelle fauche ce qui passe devant.
- **Séance C — le joueur décide** ✔ (CONTENT.md §74) : les déclencheurs plaque, proximité, tir et lien ; les effets poussée, statut, feu qui reste, explosion en chaîne, appel ; le boîtier (casser, déclencher, basculer, aiguiller) ; le corps en sprite ; l'atelier étendu ; seize pièges nouveaux posés (bonbonne, défibrillateur, brancard fou, rideau, néon ; dionée, gousses, vanne, pollen ; tonneaux en file, fil armé, aiguillage, cloche ; dalles du Vizir, flaque d'huile, cage) ; `pieges.js` à 28 contrôles.
- **Séance D — ce qui bouge et ce qui reste** ✔ (CONTENT.md §75) : le piège porté par le coyote passe par la table (`Room.dropTrap`), la parenté à un mur coulissant (`params.parent`), le sablier de salle qui décale les phases d'un tir, le coffre gardé par la cloche, les sprites des dalles (0x72) et des bouches de feu (gargouille) et la cage dessinée, la galerie des 36 salles. *Écart* : le calque de terrain temporaire n'a pas été fait — le feu qui reste passe par les zones au sol (`hazards`), qui suffisent ; un calque de sol n'apportait rien de plus au joueur.

**Fini quand** : chaque palier a au moins un piège par question (quand je passe, à qui il sert, comment je l'éteins) *(fait : quatre par palier)* ; `pieges.js` et le chemin sûr prouvé verts *(32 et 711 départs)* ; le bot traverse chaque palier sans se coincer sur un piège *(levels.js par palier, §75)* ; le banc `normal.js` ne bouge pas de plus de 10 % *(victoires 8 → 8)* ; l'auteur joue et dit qu'un piège lui a servi *(à lui)*.
**Taille** : 4 séances, dans l'ordre A, B, C, D — A ne change rien pour le joueur mais rend tout le reste sûr ; B est le vrai basculement ; C apporte le contenu ; D demande le plus de mesures.
**Décisions à prendre** : les valeurs des multiplicateurs ennemis et boss (1,5 et 0,25 proposés) ; garder ou non le bonus « sans dégât » quand une poussée compte comme un coup ; sprite ou vecteur par famille.

## L'ordre, et pourquoi

```
0 socle ─┬─ 1 visible demain ─┬─ 2 sauvegarde ── 7 se comparer
         │                    │
         │                    └─ 3 un corps ──── 8 atelier
         │
         └─ 4 Normal gagnable ─── 5 compagnons ── 6 choisir ── 9 biomes ── 10 téléphone
```

- **0 avant tout** : reformater après un refactor, c'est perdre l'historique ; tester sans harness, c'est croire sur parole.
- **1 tout de suite après** : sept lignes de code pour ce que les amis verront à la première partie.
- **2 avant 7** : le score change la forme du profil ; sans migration, il l'efface.
- **3 avant 8** : l'atelier doit exporter un corps dont la définition est stable.
- **4 avant 5 et 6** : régler les compagnons et le tempo sur un jeu qu'on ne peut pas gagner, c'est régler dans le vide.
- **9 après 6** : ajouter du contenu avant d'avoir fixé les règles, c'est le rééquilibrer deux fois.
- **10 en dernier** : la refonte tactile touche tous les écrans ; on la fait sur des écrans finis.

Deux fils peuvent avancer en parallèle si tu veux aller plus vite : **1 → 2 → 7** (ce qui se voit) et **4 → 5 → 6** (ce qui se joue) ne se touchent presque pas.

## Ce que j'attends de toi

- Les **trois décisions** du haut.
- Pour le chantier 5 : les **traits** de Martin, Gabriel et Jean — je propose, vous choisissez.
- Pour le chantier 10 : un **téléphone** pour mesurer, le tien ou celui d'un ami.
- À chaque fin de chantier : **une partie** de toi, en Normal, profil neuf. Le bot ne remplace pas ça.
