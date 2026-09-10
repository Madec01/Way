# WAY — plan du ressenti (game feel)

Ce plan répond à l'audit du ressenti (`AUDIT-FEEL.md`) : ce qui se passe **dans le monde** quand on frappe, quand on est frappé, quand un ennemi meurt, quand on ramasse, quand on monte de niveau, quand le boss arrive, quand on meurt — et comment donner au jeu une âme qui lui corresponde. Les constats de l'audit sont numérotés ci-dessous (**R**) et ses propositions (**A** à **S**) sont toutes reprises, regroupées en **sept chantiers** ordonnés par dépendance puis par valeur : chaque chantier laisse le jeu jouable et poussé sur `main`, et le suivant s'appuie sur lui. Les numéros entre crochets renvoient à cette liste.

Le diagnostic de l'audit tient en une phrase : **WAY sonne comme un jeu de musique entre amis et ressemble à un prototype de donjon générique.** La bande son vaut 8 sur 10 (39 sons synthétisés accordés sur la tonalité de la piste, une cascade de gamme au ramassage, un ralenti de bande à la mort) ; l'image vaut 3 sur 10 : un ennemi qui meurt disparaît en une image, un coup n'arrête rien, un chiffre de dégât apparaît sans naître, le sol ne bat pas, et 36 des 37 textes du jeu sont écrits dans la police d'interface de Windows alors que trois polices pixel sont chargées et inutilisées. L'écart entre le son et l'image est le vrai problème ; le plan le referme.

La taille est donnée en **séances** — une séance, c'est une session de travail avec moi, vérifiée par la batterie de tests et livrée. Total : **8 à 10 séances**. Les trois premiers chantiers, soit 3 séances, changent le plus le jeu par heure passée ; les quatre suivants lui donnent sa signature.

Ce plan s'intercale dans les deux autres (`PLAN-CHANTIERS.md`, `PLAN-INTERFACES.md`). La fin du document dit où, et ce que chaque plan cède à l'autre.

> **Rappel** : les chantiers **8 à 11** du plan principal (atelier, biomes, téléphone, dette) sont en pause depuis le 10 septembre 2026 et reprennent après les plans d'interface et de ressenti.

## La direction : « La Voie bat »

L'audit propose une seule direction, et je la reprends telle quelle parce qu'elle sort des faits du code : trois amis qui marchent avec leurs animaux, en musique, sur une route de montagne. Douze pistes sur treize sont au même tempo (129,2 BPM, un temps = 464 ms) et dans la même tonalité : **le jeu entier peut battre d'un seul pouls**, du menu au boss, sans rien coordonner. Cinq principes, dans cet ordre de priorité, que chaque chantier applique :

1. **Ce qui vit bat ; ce qui est bâti ne bat pas.** Joueur, compagnons, ennemis, lumières, pièces au sol, télégraphies : sur le temps. Murs, sol, obstacles, chiffres de dégâts, barres du HUD, caméra : immobiles. C'est cette séparation qui rend un rythme lisible au lieu de donner le mal de mer.
2. **L'impact se lit en lumière, pas en sang.** Blanc, or, poussière, écrasement. Jamais de gerbe rouge. La violence d'un dessin animé : franche et sans cruauté.
3. **Une couleur, une intention, sans exception.** Cyan = toi et ce qui est à toi · or = le temps, la mesure, la récompense · corail = le danger qui vient de l'extérieur · vert = la vie qui revient · une seule couleur d'alerte pour toutes les télégraphies, jamais employée ailleurs · les animaux dans la seule famille chaude et douce du jeu.
4. **Le compagnon est le co-héros.** Chaque moment fort (montée de niveau, arrivée du boss, mort) contient l'animal. Si un ami joue cinq minutes et retient une image, ce doit être son chien.
5. **Le calme existe pour que le fort porte.** Une salle respire : entrée silencieuse, combat, sortie. Aujourd'hui tout crie tout le temps, donc rien ne porte.

**Ce qui bat** (sur `Beat.phase()`) : la respiration du joueur au repos, celle des ennemis, l'anneau de mesure au sol sous le joueur, les lumières du décor, le halo des pièces et orbes posés, les télégraphies, les compagnons (déjà le cas), une passe de lumière très faible sur la salle, la vignette rouge quand les PV sont bas. **Ce qui reste calme** : sol, murs, chiffres, caméra (impulsions seulement), barres du HUD, projectiles.

## Les constats de l'audit

| # | Constat | Note |
|---|---|---|
| R1 | Un coup donné : aucun hitstop nulle part dans le jeu, alors que `Time.slow` / `Time.slowUntil` existent déjà dans le moteur ; le flash blanc marche (+136 % de luminance mesurés) mais dure 0,12 s sans arrêt et passe inaperçu ; les particules d'impact sortent **des pieds** de l'ennemi (`e.y`) et non de son corps, dessiné 25 px plus haut ; l'arc de mêlée est un croissant gris de 4 px autour des jambes ; pas de recul de l'arme, pas de secousse sur un coup ni un critique | 3/10 |
| R2 | Un coup reçu : aucun retour périphérique (ni vignette, ni flash, ni ralenti) ; recul de 3 px en créneau sans courbe ni direction ; clignotement d'invulnérabilité à 10 Hz qui se lit comme une erreur ; secousse identique à celle d'une explosion | 3/10 |
| R3 | Chiffres flottants : critique à 16 px contre 12 (+33 %, il faut +150 à 200 %) ; aucun pop d'apparition, montée linéaire, fondu dès la première image ; aucune dispersion verticale ni fusion (trois « 52 » empilés) ; ombre d'1 px illisible sur un sol clair ; position calculée sur le rayon de collision et non sur le corps ; en Segoe UI ; les dégâts subis passent par le même canal que les dégâts infligés | 3/10 |
| R4 | Mort d'un ennemi : le sprite **disparaît en une image** (mesuré en ralenti 8×), sans flash, silhouette, écrasement, onde ni trace ; aucune permanence, rien ne reste d'un combat. Tuer est l'action la plus répétée et ne produit aucune image | **1/10** |
| R5 | Mort du joueur : le son est très bien (ralenti de bande), l'image est vide — pas de ralenti, de désaturation, de zoom, de figement des ennemis ; le compagnon ne fait rien. La seconde chance est mieux traitée que la mort | 2/10 |
| R6 | Ramassage : rien ne se passe à la collecte ; la cascade sonore (un degré de gamme par orbe, jusqu'à 12) n'a aucune contrepartie visuelle ; pièces et orbes éjectés à plat, sans arc ; le bobbing est en `Time.now`, pas en `Beat` ; un `+n XP` flottant par fragment ajoute du bruit | 4/10 |
| R7 | Montée de niveau : rien dans le monde (aucun anneau, aucune particule, aucun zoom) ; l'écran s'ouvre immédiatement, au milieu d'une mesure, alors que `Beat.timeToNextBar()` existe | 2/10 |
| R8 | Coffre : un bouton — pas d'anticipation à l'approche, pas d'ouverture, pas de gerbe | 5/10 |
| R9 | Entrée de salle : un état `intro` de 0,8 s qui ne fait rien, le joueur téléporté, la caméra qui saute, **quatre textes superposés au centre** ; la porte change d'état au lieu de s'ouvrir, son `▶` est le seul texte du jeu sans police | 2/10 |
| R10 | Boss : l'arrivée est un `push` dans une liste (pas de mise en scène, pas de caméra) ; le combat est le meilleur moment du jeu (télégraphie blanc → orange → rouge, partition) ; les phases sont un incrément de texte ; la mort est une secousse de 14 px ; la pulsation de télégraphie est en `sin(Time.now × 30)`, indépendante du tempo | arrivée 2, combat 7, mort 3 |
| R11 | Compagnons : le seul « pop » du jeu (`1 + act × 0,22`), la marque d'ORI et l'anneau de Choupi sont les modèles à suivre ; mais aucune anticipation avant l'action sur le temps, quatre caractères animés pareil (Tanuki roule à 560 px/s sans tourner), l'appel téléporte, aucun comportement au repos | 6/10 |
| R12 | Dash : 200 px en 180 ms sans traînée, sans étirement, sans poussière — une téléportation ; aucun rapport avec le tempo | 3/10 |
| R13 | Le rythme dans le monde : toutes les lectures de `Beat` hors HUD sont conditionnées à la salle du tempo (`G.room.tempo`, `beatLock`) ; le sol, les murs, la lumière, le joueur et les ennemis ne battent pas huit salles sur neuf ; la partition au sol (`Tempo.renderScore`) est court-circuitée sans piège rythmé ; `UI.renderBackdrop` fait déjà pour les menus la passe de lumière qu'il faudrait dans le jeu | 2/10 |
| R14 | Sprites : `Sprites.gait` calcule un squash & stretch correct, mais le chemin des planches d'animation (celui de Martin, Gabriel, Jean et des animaux) **jette `sx`, `sy` et `tilt`** ; les clips et le geste de tir calé sur la cadence sont du bon travail | 5/10 |
| R15 | Couleurs : palette bonne dans le principe, pas tenue — `#ff5e7a` a cinq emplois contradictoires ; la couleur de télégraphie varie par ennemi ; le sol lit comme un tableur ; les ennemis sont rouge vif sur bleu-gris comme des jouets de 16 px | 4/10 |
| R16 | Caméra : `Camera.pulse` existe et n'est utilisé qu'en salle 7 ; la secousse est un bruit blanc isotrope sans rotation, à décroissance linéaire, **multipliée par le zoom** (18 px en tactile pour 12 demandés) | 2/10 |
| R17 | Polices : 36 des 37 `ctx.font` du jeu sont en « Segoe UI » ; Silkscreen, VT323 et Pixelify Sans sont chargées, créditées et inutilisées dans le canvas | — |
| R18 | Bibliothèques externes : aucune ne vaut le coup (tween et GSAP ignoreraient le hitstop et le pas fixe du moteur ; les moteurs de particules seraient une régression ; le post-traitement imposerait WebGL) — seul un jeu d'icônes en assets est recommandé, déjà prévu au plan des interfaces | — |

---

## Quatre décisions à prendre avant

Elles conditionnent des chantiers entiers ; je ne les prendrai pas à ta place.

| Décision | Ce que ça engage | Mon avis |
|---|---|---|
| **La direction « La Voie bat »** | Les cinq principes ci-dessus deviennent la règle de tout effet ajouté au jeu. En particulier : pas de sang, pas de gore, une seule couleur d'alerte, et le décor qui bat partout — pas seulement en salle 7. | Oui, telle quelle. C'est la seule direction qui colle à ce qu'il y a dans le code : tes amis, leurs animaux, ta musique. |
| **Le contrat de couleur** [R15] | Le corail `#ff5e7a` ne sert plus qu'au danger extérieur ; les ennemis passent de rouge vif à des rouges sourds ; les barres de vie ennemies en blanc cassé ; les animaux gardent leurs teintes chaudes (Uno orange, Choupi doré, Tanuki brun, ORI mauve). Ça touche le contenu (`color` des ennemis) et pas seulement le code. | Oui. Sur une capture, on doit voir immédiatement ce qui est dangereux. |
| **Le compagnon dans la mort et la victoire** [R5] [R11] | À la mort, l'animal vient s'asseoir près du corps ; à la victoire, il saute. C'est la scène que les amis retiendront — et c'est une scène de 1,5 s qu'il faudra regarder deux cents fois. | Oui, et courte : 1,4 s de ralenti, l'écran de fin sur le temps fort suivant. |
| **Le dash en rythme reste purement visuel** [R12] | Un dash parti à moins de 90 ms d'un temps a des fantômes dorés et un son plus haut, **sans bonus mécanique**. L'alternative serait un vrai bonus (invulnérabilité plus longue), qui ferait du dash une note obligatoire. | Visuel seulement. Le tempo des tirs (chantier 6) est déjà la mécanique ; le dash doit rester libre. |

Un point déjà tranché par le plan des interfaces et partagé ici : **les polices pixel dans le canvas** [R17]. Ce plan les met dans le monde (chiffres, noms, porte, étoile d'étourdissement) ; le plan des interfaces les met dans le HUD (I-5). Même helper, mêmes tailles.

---

## Chantier F-1 — Le vocabulaire et l'impact ✔ *(fait le 10 septembre 2026)*

**Objectif** : un coup donné produit une image. C'est le chantier qui change le plus le jeu par heure passée.

- [A] Le vocabulaire d'animation commun, en fin de `00_core.js` : `Ease` (`outCubic`, `outQuad`, `inQuad`, `outBack`, `outElastic`) et `Feel` (`stop`, `slow`, `shake`, `pop`, `squash`). Cinq mots à employer partout avec les mêmes valeurs : **pop** (`outBack`, 120 ms, 1 → 1,25 → 1), **squash & stretch** (à l'impact `sx +30 % / sy −22 %` en 110 ms), **flash** (60 ms à alpha 1 puis 70 ms à 0,35 — deux temps, pas un), **hitstop** (coup 45 ms · critique 90 · mort 70 · phase de boss 180), **trail** (5 fantômes, alphas 0,35 → 0,07). `Feel.stop` n'écrit rien dans le moteur : `Engine` applique déjà `Time.slow`.
- [B] [R1] Hitstop : `Feel.stop(crit ? 90 : 45)` dans `Combat.hitEnemy`, `Feel.stop(70)` dans `killEnemy`, `Feel.slow(0.35, 120)` dans `hitPlayer`, `Feel.stop(180)` au changement de phase d'un boss ; plafonné à un arrêt par 80 ms pour les armes rapides.
- [F] [R1] L'impact : particules **au corps** (`e.y − hauteur × 0,55`, via `Sprites.corps`) en cône orienté sur le vecteur du coup (7 blanches, 14 dorées sur un critique), une étincelle de contact (`slashes` de 20 px, 90 ms), squash directionnel de l'ennemi, flash à deux temps, secousse de 1,6 px (3,5 sur un critique). Recul de l'arme (**gun kickback**) : 2 px pour un pistolet, 6 pour un marteau, en `outCubic` sur 90 ms — c'est ce qui donne du poids aux armes. Arc de mêlée à mi-corps, `lineWidth 7 × (1 − k)`.
- [G] [R16] La caméra : `Camera.kick(mag, angle, ms)` remplace `G.shake` — impulsion **directionnelle** avec une fraction de degré de **rotation**, décroissance `outCubic`, appliquée **hors** du zoom. Trois amplitudes seulement, jamais d'autres : 1,6 px (tir, coup), 4 px (critique, mort, coup reçu), 9 px (explosion, slam, phase et mort de boss). `Camera.pulse` amorti dans `update` pour pouvoir servir partout.
- [E] [R17] Toutes les polices du canvas du monde en pixel : chiffres, noms, compteurs → Silkscreen ; phrases → VT323 ; le `▶` de la porte et le `✦` d'étourdissement, qui n'avaient pas de police, avec. `document.fonts.ready` avant le premier rendu. Le HUD suit au chantier I-5 avec le même helper.
- [S] [R14] Squash & stretch sur les planches d'animation : appliquer `sx`, `sy`, `tilt` de `gait()` dans le chemin `clip` de `drawBody` — trois lignes, effet immédiat sur tout ce que le joueur regarde.

**Fini quand** : un test `ressenti.js` mesure qu'un coup pose `Time.slowUntil` (45 ms, 90 sur un critique, 70 à la mort), que les particules d'impact naissent au-dessus de `e.y − hauteur × 0,4`, que la secousse a un angle et n'est plus multipliée par le zoom (même amplitude à zoom 1 et 1,5), qu'aucun `ctx.font` du monde n'est en Segoe UI (balayage des sources), que les planches de Martin sont dessinées avec un `scale` non uniforme en marche ; le bot joue 9 salles sans erreur.
**Taille** : 1 séance.
**Bilan** : fait (CONTENT.md §44, test `ressenti.js`, 13 mesures). Les durées d'arrêt sont **plus courtes que prévu** : 30 ms sur un coup, 70 sur un critique, 60 à la mort (au lieu de 45 / 90 / 70), avec **un petit arrêt par 250 ms au plus** — parce que `Time.now` et la musique continuent pendant que la simulation se fige : un pistolet tenu aurait figé le jeu la moitié du temps et décalé chaque tir de sa note. Un ralenti de compétence n'est jamais écrasé par un arrêt. La secousse est directionnelle, avec rotation, en pixels d'écran (même amplitude à zoom 1 et 1,5) et à trois amplitudes ; les seize `G.shake` du code sont passés par `Feel.shake`. Les étincelles partent du corps (`Combat.bodyH`, lu dans `Sprites.corps`), dans le sens du coup, avec une étincelle de contact et un écrasement de l'ennemi ancré aux pieds ; le flash est en deux temps. Le recul de l'arme est là (2 / 3 / 6 px). Les polices du monde sont en pixel (chiffres, noms d'objets au sol, porte, étoile d'étourdissement, dalles, compte à rebours), `boot()` attend les polices ; le HUD garde sa police jusqu'à I-5. Le squash & stretch de la démarche s'applique aux planches à moitié de son amplitude (la planche de marche anime déjà les pas). `Camera.pulse` est amorti et prêt pour F-6. À regarder à la main : l'arrêt de 30 ms se sent-il avec une lame ? Sinon, monter à 45 en gardant le plafond.

## Chantier F-2 — Les chiffres et le coup reçu ✔ *(fait le 10 septembre 2026)*

**Objectif** : un chiffre naît, un critique se voit de loin, un coup reçu se sent sans quitter le personnage des yeux.

- [C] [R3] `Floaters` réécrit : un champ `kind` (`dmg`, `crit`, `taken`, `heal`, `event`), **Silkscreen à contour noir de 4 px** (pas une ombre), pop `outBack` de 120 ms, trajectoire balistique (`vy₀ = −90`, gravité +180) ; dégât normal **18 px** blanc, **critique 30 px** doré, **dégât subi 34 px** corail qui part vers le bas puis remonte — le plus gros texte du jeu ; soin 20 px vert ; événements 22 px ; XP, pièces et « TEMPO ×n » **sortent** du canal (le HUD les dit déjà — sauf « TEMPO », qui reste le seul compteur de série et garde sa place près du joueur, décision I-1). Alpha plein jusqu'à 65 % de la durée. Dispersion sur X (±14) **et** Y (−10, +4). Position sur le corps (`Sprites.corps`), pas sur le rayon. **Fusion** : un chiffre du même genre à moins de 14 px et 120 ms s'additionne et grossit au lieu de s'empiler (modèle Path of Exile). Plafond 40.
- [H] [R2] Le coup reçu : vignette de dégât (dégradé des bords, corail, décroissance 350 ms) ; ralenti `Feel.slow(0.35, 120)` ; secousse de 4 px orientée depuis la source ; flash blanc d'une image sur un coup de plus de 15 % des PV ; recul en courbe (`7 px × (1 − outCubic)`, 140 ms, dans la direction opposée à la source) au lieu du créneau de 3 px ; clignotement d'invulnérabilité à **6 Hz** (alpha 0,35 / 1) au lieu de 10. La vignette de PV bas du chantier I-1 se met à **pulser sur `Beat`** : `alpha = 0,10 + 0,06 × (1 − phase)`.
- Le `+n XP` par fragment et les autres chiffres verts disparaissent : la barre d'XP le dit.

**Fini quand** : `ressenti.js` vérifie trois tailles pour trois genres, la police, le contour, la fusion (deux coups à 10 px d'écart en 50 ms → un seul chiffre), la position au-dessus du corps, le ralenti et la vignette au coup reçu, le clignotement à 6 Hz ; une capture de dix coups rapides ne montre aucun chiffre superposé (mesuré sur la liste, pas à l'œil).
**Taille** : 1 séance.
**Bilan** : fait (CONTENT.md §45, test `coup.js`, 9 mesures — un fichier à part plutôt que dans `ressenti.js`, pour rester lisible). `Floaters` est réécrit avec cinq genres (`dmg` 18 px, `crit` 30, `taken` 34 qui part vers le bas, `heal` 20, `event` dans sa couleur), Silkscreen à contour noir de 4 px, sursaut `outBack` de 120 ms, trajectoire balistique, plein jusqu'à 65 % de la durée, dispersion sur X et Y, fusion à 14 px et 120 ms (12 + 30 → 42, plus gros), plafond 40, naissance au corps. Un ancien appel sans genre devine le sien (un nombre corail = dégât subi, un « + » = soin, un mot = événement) : les vingt-quatre appels du code marchent sans être tous réécrits. Le « +n XP » est sorti ; « TEMPO ×n » et « +n ◈ » (bourse) restent, décision I-1 et seul retour d'une bourse depuis que le HUD ne montre plus les crédits. Coup reçu : recul de 7 px en courbe à l'opposé de la source (`pl.hurtA`), vignette corail 350 ms, ralenti 35 % pendant 120 ms, flash blanc d'une image au-dessus de 15 % des PV (`UI.flashScreen`), clignotement à 6 Hz à 35 %, vignette de PV bas qui bat avec `Beat`. À regarder à la main : 34 px pour un dégât subi, est-ce trop gros sur un téléphone ? Le HUD grossira de 1,35 en I-8, pas le monde.

## Chantier F-3 — Le contrat de couleur ✔ *(fait le 10 septembre 2026)*

**Objectif** : une couleur, une intention. Sur une capture, on voit ce qui est dangereux.

- [R] [R15] `#ff5e7a` réservé au danger extérieur (dégâts subis, zones, vignette). Une seule couleur d'alerte `#ff3b3b` pour **toutes** les télégraphies, à la place de `telegraph.color` qui varie par ennemi. Barre de PV vert → or → corail (fait en I-1) avec **des hachures** sous 25 % pour rester lisible en protanopie. Barres de vie ennemies en blanc cassé `#cfd6e6`, ni rouge ni cyan. Ennemis en rouges sourds (`#c0553f`, `#8a3b52`) dans le contenu, pour laisser le rouge vif au danger. Compagnons dans leurs teintes chaudes, et **leurs chiffres de dégâts dans leur couleur** (Uno mord en orange).
- Un tableau de la palette dans `CONTENT.md` et une constante `PAL` dans `00_core.js` : plus aucune couleur écrite en dur dans un effet — elle vient de `PAL.danger`, `PAL.gold`, `PAL.self`, `PAL.life`, `PAL.alert`.
- Le sol : une teinte de biome plus marquée et une vignette plus douce, pour que la salle 1 ne lise plus comme une grille (le vrai remède est la lumière, chantier F-5).

**Fini quand** : un test `palette.js` balaie les sources : `#ff5e7a` n'apparaît que dans `PAL.danger` et ses usages autorisés ; aucune télégraphie ne lit `e.color` ; les ennemis du contenu n'ont plus de `#e33` ; la barre ennemie n'est ni `PAL.danger` ni `PAL.self`.
**Taille** : 1 séance (courte : elle peut se faire dans la même que F-2).
**Bilan** : fait (CONTENT.md §46, test `palette.js`, 7 mesures). `PAL` est dans `00_core.js` et plus aucun corail, rouge d'alerte ou rouge de boss n'est écrit en dur hors de lui (le test balaie les sources, l'atelier et le CSS exceptés). Toutes les télégraphies — ennemis, patterns de boss, rayons — sont dans `PAL.alert`, plus dans la couleur de l'ennemi ; la barre de vie ennemie est en blanc cassé ; la barre du boss et son nom en corail (le boss est le danger extérieur) ; les cœurs sont **verts** (la vie qui revient, comme les soins) ; la porte fermée est une croix grise, plus un danger ; « ENRAGÉS » et « Mauvais ordre » sont des alertes. Les trois seuls ennemis rouge vif (rôdeur, mèche, baril) sont passés en rouges sourds — les autres avaient déjà leurs teintes ; les couleurs des quatre animaux étaient déjà celles que je proposais, et **un dégât de compagnon s'écrit dans sa couleur** (Uno mord en orange). La barre de PV est hachurée sous 25 %. Pas fait, à dessein : la teinte du sol — le vrai remède est la lumière de F-5, et une retouche sans mesure aurait été du goût, pas une règle. À vérifier à la main : un cœur vert, ça se lit ?

## Chantier F-4 — La mort d'un ennemi et le ramassage ✔ *(fait le 10 septembre 2026)*

**Objectif** : tuer produit une image, et ce qu'on ramasse a de la gourmandise.

- [D] [R4] La mort en 220 ms : `Enemy.render` ne retourne plus dès `dead` — silhouette **blanche pleine** agrandie pendant 60 ms, puis écrasement au sol (`sx +55 % / sy −80 %` en `outCubic`) et effacement ; `Feel.stop(70)` ; secousse de 4 px dans la direction du coup ; couronne de 22 particules blanches + 6 dorées **au corps** ; une onde plate au sol (`blasts`, 34 px, 220 ms) ; une **tache persistante** (`G.room.decals`, ellipse sombre de 18 × 7, plafond 60, effacée au changement de salle) — les traces qui restent sont ce qui fait sentir qu'on a agi.
- [D] [R6] Les drops en arc : pièces et orbes partent avec `vy₀` négative et une gravité de +520 px/s², puis l'aimantation habituelle.
- [L] [R6] Le ramassage : 5 particules de la couleur du type et un anneau de 12 px à la collecte ; traînée de 3 fantômes quand l'orbe est aimanté ; **cœur** : pop du joueur et anneau vert de 40 px ; **relique et arme** : `Feel.stop(140)` et un rayon de lumière vertical de 400 ms — les seuls ramassages qui interrompent le combat. Et surtout **la cascade sonore devient visible** : la taille et le nombre d'étincelles suivent `Pickups.streak` (`size = 2 + streak × 0,25`, `count = 5 + streak`) — trois lignes pour que la meilleure idée sonore du jeu ait une image.
- [R8] Le coffre : halo qui grossit à l'approche (sur `near`), ouverture en 300 ms (couvercle, gerbe dorée, pièces en arc), l'écran de choix ensuite.

**Fini quand** : `ressenti.js` vérifie qu'un ennemi tué reste dessiné 220 ms (`deathT`), qu'une tache est posée et purgée au changement de salle, que les drops ont une vitesse verticale négative au départ, que la taille des étincelles suit la série ; une capture 60 ms après une mort montre la silhouette blanche (luminance mesurée au pixel, comme dans l'audit).
**Taille** : 1 séance.
**Bilan** : fait (CONTENT.md §49, test `butin.js`, 13 mesures — un fichier à part plutôt que `ressenti.js`, qui reste celui de F-1). Tout ce qui était écrit : la mort en 220 ms avec la silhouette blanche (luminance 237 mesurée au pixel à 30 ms) puis l'écrasement, l'arrêt de 70 ms, la couronne au corps, l'onde à plat, la tache plafonnée à 60 et effacée avec la salle ; les drops qui partent en arc avec une ombre au sol et rebondissent ; les étincelles du ramassage à la taille de la série (2 px × 5 seul, 4 px × 13 au huitième), l'anneau, le cœur qui fait sursauter, la relique et l'arme qui arrêtent le combat sous un rayon de lumière ; le coffre dont le halo grossit à l'approche et qui s'ouvre en 300 ms — couvercle, gerbe, sept éclats en arc — avant l'écran de choix. En plus : les trois fantômes derrière un orbe aimanté. Pas fait, à dessein : la couleur de la tache reste celle de l'ennemi (pas de sang), et le sursaut du coffre est de 6 px — à voir à la main si c'est trop discret.

## Chantier F-5 — Le monde bat

**Objectif** : qu'on comprenne en dix secondes, sans qu'on le dise, que ce jeu est un jeu de musique. C'est la signature.

- [I.1] [R13] La passe de lumière : après `Sprites.drawFloor`, un `fillRect` en `lighter` de la couleur néon du biome, alpha 0,09 au temps fort et 0,045 sinon, en `outCubic` de la phase — exactement ce que `UI.renderBackdrop` fait déjà pour les menus. Le sol reste en cache : c'est la lumière qui bat.
- [J] [R13] **L'anneau de mesure** au sol sous le joueur : un arc doré qui se remplit sur les quatre temps de la mesure et **claque** au temps fort (anneau de 26 → 40 px en 0,3 temps). Il dit où est le joueur, où en est la mesure, et que ce jeu est un jeu de rythme. Sur une capture figée, c'est la chose qui distingue WAY. Les pastilles de série du chantier I-1 s'y fondent (elles se posent sur l'anneau).
- [I.2] [I.3] [R13] La respiration du joueur et des ennemis **partout** : retirer les conditions `G.room.tempo` et `beatLock` ; joueur `1 + 0,04 × k` au repos (bob −2,2 px, `sx −3 % / sy +3,5 %`), ennemis `1 + 0,06 × k`, boss `1 + 0,10 × k` sur le temps fort seulement ; le voyant doré reste réservé aux ennemis à `beatLock` — il signifie « celui-ci frappe sur le temps ».
- [I.4] [R10] Télégraphies sur le tempo : `outCubic(1 − phase(2) × 2)` à la place de `sin(Time.now × 30)` — la parade devient apprenable.
- [I.5] [R6] Pièces et orbes posés sautillent en cadence, avec un déphasage tiré par objet.
- [I.6] [R9] La porte bat (`shadowBlur 12 + 10 × k`) et **s'ouvre sur le temps fort suivant** (`Beat.timeToNextBar()`), avec une onde verte de 60 px.
- [I.7] [R13] La partition au sol dans toutes les salles : retirer la condition sur les pièges, et donner aux ennemis à `beatLock` une tuile de frappe annoncée.
- [I.8] [R13] Des lumières dans les salles : `ANIM_DEFS.light` existe et bat déjà ; en poser 2 à 4 par salle du biome 1 (halo 90 px, alpha 0,10 + 0,10 × k, couleur néon). C'est du contenu — la partie « décor animé » du chantier 9 commence ici.
- **Correction demandée le 10 septembre 2026** (vu sur les captures de F-4) : les pièges laser **peignent en jaune les cases où le rayon passe**. Une case de piège ne doit pas s'éclairer comme une récompense : la zone se marque d'un trait discret, la case qui va être frappée s'annonce en `PAL.alert` (le contrat de couleur, F-3), et rien n'est rempli en or hors de la partition. À faire dans ce chantier, avec la passe de lumière, puisque c'est la même question : qu'est-ce qui a le droit d'éclairer le sol.

**Fini quand** : `ressenti.js` vérifie que le bob du joueur au repos suit `Beat.phase()` en salle 1 (pas seulement en salle 7), que l'anneau de mesure est dessiné sous le joueur (sonde `ellipse`), que la télégraphie d'un ennemi ne lit plus `Time.now`, que la porte s'ouvre à moins de 30 ms d'un temps fort, que la passe de lumière change l'alpha du sol entre phase 0 et phase 0,5 (luminance mesurée) ; le bot joue 9 salles sans erreur et sans perte de fps mesurable (`levels.js` reste sous 60 s par salle).
**Taille** : 1 à 2 séances.

## Chantier F-6 — Les moments forts

**Objectif** : la montée de niveau, le boss, la mort et l'entrée de salle sont des scènes, pas des incréments.

- [K] [R7] Montée de niveau : `Feel.stop(120)`, `Camera.pulse 0,06`, un anneau doré plein de 170 px (550 ms), 40 particules vers le haut, silhouette blanche 200 ms, « NIVEAU n » en 40 px, **le compagnon fait son action et saute**, et l'écran de choix s'ouvre **sur le temps fort suivant**.
- [O] [R10] Le boss — arrivée : 1,4 s de rideau (deux bandes noires de 40 px), caméra qui va sur lui et revient, zoom 1 → 1,12 → 1, le boss qui descend de 120 px avec une ombre qui grossit, **trois pas de secousse espacés d'un temps exact** (464 ms) ; son nom sur la bande du bas, en Silkscreen. Phases : flash plein écran, `Feel.stop(180)`, `pulse 0,05`, l'anneau change de couleur en 300 ms, la partition se remplit. Mort : 1,6 s — ralenti à 0,25, cinq explosions échelonnées, le corps qui blanchit puis s'écrase, zoom, pièces en arc, **le compagnon qui court vers le corps**.
- [P] [R5] La mort du joueur : `Feel.slow(0.18, 1400)` dès `die()`, ennemis figés, voile sombre à 0,55 en 1,2 s + vignette corail, zoom 1 → 1,3 sur le corps, **le compagnon vient s'asseoir à côté** (Uno se couche, ORI se pose, Choupi tourne autour), l'écran de fin sur le temps fort. La victoire, même image à l'envers : debout, l'animal qui saute, voile doré, l'anneau de mesure qui s'ouvre en grand.
- [Q] [R9] L'entrée de salle : l'état `intro` de 0,8 s enfin rempli — fondu de 180 ms, le joueur **entre par la gauche en marchant** (500 ms), la caméra le rejoint en `outCubic`, la porte de sortie s'allume au premier temps fort, **un seul texte** (le nom de la salle, en bas, en petit) ; les trois autres bandeaux attendent la file de messages du chantier I-6.

**Fini quand** : `ressenti.js` vérifie que la montée de niveau retarde l'écran jusqu'au temps fort (à 30 ms près) et pose `Camera.pulse`, que le boss a `entranceT` et que trois `Camera.kick` tombent à 464 ms d'écart, que la mort pose `Time.slow` et fige les ennemis, que le compagnon a un état `mourn` près du corps, que l'entrée de salle joue le clip `walk` avant `Room.begin` ; `mort.js` et `human.js` mis à jour (le délai de l'écran de fin change).
**Taille** : 2 séances.

## Chantier F-7 — Les compagnons et le dash

**Objectif** : qu'un ami qui a joué cinq minutes se souvienne de son animal.

- [N] [R11] **Uno** anticipe : accroupissement (`sx +14 % / sy −14 %`, 200 ms) un temps avant la morsure, bond avec pop de 0,35, étincelle blanche de 16 px au point de morsure, `Feel.stop(40)`, 3 particules orange en cône, son chiffre en orange. **Choupi** s'allonge en course (`sx +18 % / sy −14 %`), traînée de 4 fantômes, et la collecte se fait **en deux temps** (l'objet vole vers elle en arc, puis d'elle vers le joueur). **Tanuki** tourne pendant le roulement (`rot = t × 14`, `Sprites.draw` sait déjà), 6 fantômes, onde au départ, flash d'anticipation d'un demi-temps. **ORI** : un trait pointillé animé vers sa cible (150 ms, `lineDashOffset`), une marque qui clignote sur `Beat`, un flottement propre (`bob = sin(t × 2,2) × 5`, ombre plus petite et plus floue).
- [N] L'appel : le compagnon **entre par le bord de l'écran** en 250 ms avec 8 fantômes, l'onde de choc à l'arrivée (déjà là), son nom en Silkscreen 26 px dans sa couleur — pas un toast gris.
- [N] Le repos : après 3 s sans rien, le compagnon se tourne vers le joueur et joue son idle ; Uno s'assied. Six lignes dans `Pet.animStep`, et le détail qui fait qu'un ami envoie une capture à un autre.
- [M] [R12] Le dash : 5 fantômes du sprite, étirement `sx 1,22 / sy 0,90` orienté, onde blanche de 26 px au départ, 8 particules de poussière en cône opposé à l'arrivée, `Camera.pulse −0,015` pendant les 180 ms. **En rythme** (à moins de 90 ms d'un temps) : fantômes dorés et son une quinte plus haut, rien de plus — c'est ce qui fait qu'on se met à jouer en rythme sans qu'on le demande.

**Fini quand** : `ressenti.js` vérifie qu'Uno pose un état `crouch` avant sa morsure et que sa morsure tombe à moins de 30 ms d'un temps fort, que Tanuki a une rotation non nulle pendant `roll`, que Choupi passe par deux étapes de collecte, qu'ORI dessine son trait, que l'appel fait entrer le compagnon depuis le bord (position initiale hors de la vue), que le dash laisse 5 fantômes et que ses fantômes sont dorés quand il part sur le temps ; `pets.js`, `uno.js`, `chats.js`, `compagnons.js` mis à jour et verts.
**Taille** : 1 à 2 séances.

---

## L'ordre, et pourquoi

```
F-1 vocabulaire/impact ── F-2 chiffres/coup reçu ── F-3 couleur ─┬─ F-4 mort/ramassage ── F-6 moments forts ── F-7 compagnons/dash
                                                                  └─ F-5 le monde bat ─────────┘
```

- **F-1 avant tout** : `Ease`, `Feel` et la caméra sont le vocabulaire de tous les autres ; le hitstop seul change déjà le jeu.
- **F-2 juste après** : les chiffres et le coup reçu sont ce qu'on voit le plus souvent après un coup donné.
- **F-3 avant F-4 et F-5** : la couleur d'alerte et les rouges sourds doivent être fixés avant de dessiner les morts et les télégraphies.
- **F-4 et F-5 peuvent se faire dans l'ordre qu'on veut** : la mort d'ennemi ne dépend pas du rythme dans le monde, et inversement.
- **F-6 après les deux** : les scènes (niveau, boss, mort) réutilisent la mort d'ennemi, la passe de lumière et l'anneau.
- **F-7 en dernier** : les compagnons empruntent tout le vocabulaire, et c'est ce qu'on voudra montrer en dernier, quand le reste est en place.

## Où ça s'intercale, et ce que chaque plan cède à l'autre

Trois plans coexistent maintenant. Voici l'ordre que je propose, et ce qu'il faut lire ensemble :

| Quand | Quoi | Pourquoi là |
|---|---|---|
| Maintenant | **I-2** (vocabulaire) | une séance, tout le texte, avant qu'on n'en réécrive dans les chantiers suivants |
| Puis | **F-1, F-2, F-3** (3 séances) | ce qui change le plus le jeu par heure ; ils donnent aussi les polices pixel et la palette dont I-3 à I-5 ont besoin |
| Puis | **I-3, I-4** (hub, prépa) | les écrans que tes amis voient en premier |
| Puis | **F-4, F-5** (mort, le monde bat) | la signature, avant de refaire le HUD par-dessus |
| Puis | **I-5, I-6** (HUD, une seule voix) | le HUD se pose sur un monde qui bat, et la file de messages libère l'entrée de salle de F-6 |
| Puis | **F-6, F-7** (moments forts, compagnons) | les scènes réutilisent tout |
| Puis | **I-7, I-8** (choisir et finir, le pouce) | |
| Enfin | **chantiers 8 à 11** du plan principal | atelier, biomes (dont les lumières de F-5 et le décor animé), téléphone, dette |

Ce que les plans se cèdent, pour ne rien faire deux fois :

- Les **chiffres flottants** (H11 du plan des interfaces) sont faits en **F-2**, pas en I-5.
- Les **polices pixel** : le monde en **F-1**, le HUD en **I-5**, même helper.
- Le **métronome et le compteur de série** du HUD (I-5) se posent sur l'**anneau de mesure** de **F-5** — I-5 ne les redessine pas de son côté.
- La **vignette de PV bas** (faite en I-1) se met à pulser sur `Beat` en **F-2**.
- **L'entrée de salle** (F-6) ne garde qu'un texte : elle a besoin de la **file de messages** de **I-6** pour ranger les autres.
- Les **télégraphies au sol** (H13, I-5) suivent la **couleur d'alerte** de **F-3** et le **tempo** de **F-5**.
- Les **lumières dans les salles** (F-5) sont le début du **décor animé** du chantier 9.

## Ce que j'attends de toi

- Les **quatre décisions** du haut : la direction, la palette, le compagnon dans la mort et la victoire, le dash visuel.
- Pour F-3 : les **couleurs des quatre animaux** — je propose Uno orange `#e08a4a`, Choupi doré `#f0c46a`, Tanuki brun `#a8784a`, ORI mauve `#c9a3ff` ; ce sont leurs vraies couleurs ?
- Pour F-6 : une **partie de toi jusqu'à la mort et jusqu'au boss**, avant et après — c'est là que ton œil compte le plus.
- Pour F-7 : ce que **chaque animal fait au repos** dans la vraie vie (Uno s'assied ? Choupi se lèche ? ORI dort ?) — je le mettrai tel quel.
- À chaque fin de chantier : **une partie** de toi, en Normal, profil neuf. Le bot ne sent rien.
