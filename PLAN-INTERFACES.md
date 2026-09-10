# WAY — plan d'amélioration des interfaces

Ce plan répond aux deux audits d'interface (`AUDIT-MENUS.md`, `AUDIT-HUD.md`). Leurs constats sont numérotés ci-dessous — **M** pour les menus, **H** pour l'interface en jeu — et regroupés en **huit chantiers**, ordonnés par dépendance puis par valeur : chaque chantier laisse le jeu jouable et poussé sur `main`, et le suivant s'appuie sur lui. Les numéros entre crochets renvoient à cette liste.

Le fil conducteur des deux audits tient en une phrase : **le jeu fait lire au lieu de montrer**. Le hub demande 857 mots avant de jouer, le HUD affiche un tableur sur un jeu d'action, et la seule chose qu'un ami retiendra — le chien, les chats — est enterrée dans un onglet de boutique dont la moitié est hors écran. Le plan supprime avant d'ajouter, montre avant d'écrire, et met une règle là où il n'y en avait pas.

La taille est donnée en **séances** — une séance, c'est une session de travail avec moi, vérifiée par la batterie de tests et livrée. Total : **9 à 12 séances**. Les deux premiers chantiers, soit 2 séances, corrigent ce qui est cassé ou faux ; les cinq suivants refont les écrans ; le dernier est le téléphone.

Ce plan ne remplace pas le plan de chantiers (`PLAN-CHANTIERS.md`) : il s'y intercale. La fin du document dit où.

> **Décision du 10 septembre 2026** : l'interface passe en premier, parce que c'est ce qui se voit le plus. Les chantiers **8 à 11** du plan principal (atelier, biomes, téléphone, dette) sont **en pause** et reprennent après I-7 — à rappeler à l'auteur à chaque fin de chantier d'interface.

## Les constats des deux audits

Chaque ligne est un point d'un des deux rapports, réduit à ce qu'il faut corriger. Les notes par écran y sont : hub-compagnon 2/10, boutique 3/10, tactile 2/10, cartouche central du HUD 2/10, messages 2/10, moyenne **4,5/10** pour les menus et **4/10** pour le HUD.

### Menus (M)

| # | Constat | Écran |
|---|---|---|
| M1 | Deux onglets de boutique sur cinq (« Personnages », « Fragments ») sont hors cadre et inatteignables : `.tabs` fait 555 px dans 390 px | boutique |
| M2 | L'onglet étiqueté « Personnages » liste en réalité les compétences | boutique |
| M3 | Le compagnon se choisit dans la boutique, et un profil neuf part sans compagnon (`pet = null`) | hub |
| M4 | Le hub fait 857 mots, 23 cartes, trois colonnes qui défilent séparément (la troisième : 1 893 px pour 606 visibles) | hub |
| M5 | Le mot « niveau » désigne à la fois le biome, la difficulté et le niveau d'XP ; « palier », « greffe », « calibration », « amélioration », « consigné », « réimpression », « outillage disponible » cohabitent sans glossaire | partout |
| M6 | Tutoiement dans les titres, vouvoiement dans les descriptions | partout |
| M7 | Unités et jargon de moteur : « 95 DPS », « 210 px », « 4 ticks/s », « Cooldown », « spam », familles d'armes en anglais et majuscules (BLADE, HAMMER…) | prépa, boutique |
| M8 | Catégories de greffes en anglais (`offense · max 3`, `defense`, `mobility`, `economy`, `special`) | montée de niveau, coffre |
| M9 | Sur téléphone, texte du hub à 6,8 px, étiquettes à 5,6 px, onglets de 121 × 29 px (minimum recommandé 44 × 44) | mobile |
| M10 | Le layout à trois colonnes est conservé sur 900 px : colonne 1 tronquée, colonne 2 à moitié vide, colonne 3 qui déborde de 1 388 px | mobile |
| M11 | Le fond animé passe à travers les colonnes à 62 % d'opacité : le grand X rouge d'un piège barre trois cartes | hub |
| M12 | Carte personnage : Martin décrit deux fois à 300 px d'écart ; les trois amis affichent les mêmes chiffres (PV 100, vit. 260) | hub |
| M13 | « Tenue : aucune… 3 pour des vêtements, 6 pour l'armure » — note de développement obsolète (les habits évolutifs sont abandonnés) ; « 0 calibration(s) » | hub |
| M14 | Onglet compagnon : le sélecteur de mode apparaît avant tout compagnon choisi, le bloc « Équipes » fait 90 mots ; 7 interactions sur 3 colonnes pour jouer Gabriel avec ses chats | hub |
| M15 | Les paires bonus/malus s'affichent comme deux listes, pas comme des paires, sans l'effet | hub |
| M16 | Les niveaux verrouillés occupent autant de place que le jouable ; la difficulté `★☆☆☆☆` est en 9,8 px gris | hub |
| M17 | Le compteur de crédits en police pixel 21 px est illisible à 0 (`◈ 0` = deux carrés) | boutique |
| M18 | Chaque carte d'amélioration détaille ses quatre paliers alors qu'un seul est achetable ; 487 mots dans 390 px | boutique |
| M19 | Onglet Fragments : cinq « Document scellé » identiques, statistiques avec « réimpressions » | boutique |
| M20 | Prépa : `.cards{justify-content:center}` laisse la moitié gauche vide sous le numéro d'étape | prépa |
| M21 | Prépa : « recharge 9 s » dans l'étiquette et « Cooldown 9 s. » dans la description ; aucune image d'arme ; le tirage aléatoire des compétences n'est pas annoncé | prépa |
| M22 | Le bandeau MODE TEST est entre le résumé et le bouton d'entrée | prépa |
| M23 | Montée de niveau : la rareté commune et rare sont indiscernables ; aucune icône ; rien ne dit « choix 1 sur 3 » quand plusieurs montées s'enchaînent ; rien ne rappelle les greffes déjà prises | montée de niveau |
| M24 | Coffre : « Réserve de greffes » et le sous-titre « SALLES 1-1 · QUALITÉ 100 % · SANS DÉGÂT : COLOSSAL GARANTI » sont incompréhensibles | coffre |
| M25 | Écran de fin : la ligne « Crédits en attente conservés (10 % de 0) ◈ 40 » est fausse (la prime forfaitaire du chantier 4 n'est pas dite) ; « Salles : — » ; aucun bouton « Rejouer » ; aucune progression | fin |
| M26 | Écran-titre : « PHASE 2 » et « 0 case(s) 9 cochée(s) » | titre |
| M27 | Tout en texte : sprites d'armes, de compagnons et icônes existent ou sont disponibles (game-icons.net, déjà crédité) et ne sont pas utilisés | partout |

### Interface en jeu (H)

| # | Constat | Élément |
|---|---|---|
| H1 | Le HUD est dessiné dans la boîte fixe 1280 × 720 au lieu de `Engine.view` : sur 900 × 420 la barre de PV flotte à 90 px du bord et le cartouche d'arme est au milieu du terrain | tout le HUD |
| H2 | Le texte du cartouche central déborde de sa boîte (537 px de texte dans 400 px) sur toutes les captures | cartouche |
| H3 | À 16/203 PV la barre est quasi noire et rien ne l'annonce ; le rouge sert à l'état plein ; les trois paliers de couleur sont indiscernables | PV |
| H4 | « Niveau 3 » est écrit hors du fond sombre, en gris sur le sol (contraste 2,4:1) ; la montée de niveau ne produit aucun effet dans le HUD | XP |
| H5 | Sept informations concaténées dans le cartouche : chrono, qualité de run, qualité de salle, coups, combo, prédiction de coffre — la plus lisible (« Salle 3/9 ») est la moins urgente | cartouche |
| H6 | Le cartouche crédits (« consignés », « en attente ») est de la méta-progression affichée en combat | crédits |
| H7 | `52 dmg · 3.4/s · crit 17 %` et le rappel de touches sont permanents ; le cercle de compétence fait 14 px de rayon, aucun événement quand elle redevient prête | arme, compétence |
| H8 | Trois compteurs de série simultanés avec des chiffres différents : `combo 4` (cartouche), `SÉRIE ×5` (bandeau), `TEMPO ×7` (deux fois) | combo |
| H9 | Le métronome, cœur du jeu, est quatre points de 4 px dans une boîte noire opaque ; « métronome interne » est un message de développeur ; le décor ne bat pas | tempo |
| H10 | Badge compagnon à x = 16 et 168 px de large sous un cartouche d'arme à x = 18 et 420 px ; sous-titre en 10 px ; pas de barre de vie d'Uno dans le HUD | compagnon |
| H11 | Chiffres flottants : critique à 16 px contre 12 (écart illisible), aucune dispersion verticale, douze usages dans un seul canal, dégâts subis traités comme des dégâts infligés | chiffres |
| H12 | Barres de vie ennemies du même rouge que celle du joueur, sans segmentation ; `✦` de l'étourdissement en police non spécifiée | ennemis |
| H13 | Télégraphie sur l'ennemi et non au sol ; couleur variable par ennemi ; pulsation indépendante du tempo | télégraphie |
| H14 | Barre du mini-boss en bas de l'écran, collée au cartouche d'arme, sans segmentation par phase ; « PRISE EXPOSÉE » écrit par-dessus le remplissage ; le nom du boss est dit deux fois (bandeau + barre) | boss |
| H15 | Bandeaux et toasts tous centrés, empilés sur l'axe joueur-ennemis ; bandeau de 30 px avec halo 24 pendant 2,2 s pour « Vague 2 » ; aucune priorité, aucune déduplication, aucune file (23 `banner`, 37 `toast`) ; deux bandeaux identiques possibles | messages |
| H16 | Objectif de salle : bon cartouche, mais « 51 % » en texte au lieu d'une jauge, et trois blocs (objectif, métronome, partition du boss) se disputent la même bande à y = 52-70 | objectifs |
| H17 | Pause : curseurs et menu natifs du navigateur, « Master », aucune information de partie, aucun rappel des commandes | pause |
| H18 | Montée de niveau en jeu : pas d'état actuel du joueur (« +6 % de crit » sans savoir qu'on est à 17 %) ; les bandeaux du HUD s'animent derrière le panneau | montée de niveau |
| H19 | Écran de mort : tableau comptable, crédits en 14 px, `99 999 / 1`, pas de « Rejouer », le HUD reste affiché derrière | mort |
| H20 | Tactile : aucune adaptation de taille ; bouton TIR par-dessus l'aire de jeu ; bouton E hors de l'arc du pouce ; pause et plein écran dans la zone de préhension ; pas de bouton d'esquive ; joystick invisible avant le premier toucher | tactile |
| H21 | HUD en Segoe UI 10-14 px, écrans HTML en Silkscreen / Pixelify : deux jeux à l'écran, alors que les polices pixel sont déjà chargées | style |
| H22 | Huit greffes en pastilles de texte 11 px en bas à droite, 660 px de place perdue | greffes |
| H23 | Les jauges de série ajoutées au chantier 6 s'installent dans la bande du haut déjà surchargée | tempo |

---

## Cinq décisions à prendre avant

Elles conditionnent des chantiers entiers ; je ne les prendrai pas à ta place.

| Décision | Ce que ça engage | Mon avis |
|---|---|---|
| **Un seul mot par notion** [M5] | Il faut choisir, une fois, le mot du jeu pour : le biome (« palier » ou « niveau »), l'amélioration permanente (« calibration » ou « amélioration »), l'amélioration de run (« greffe » ou « trouvaille »), l'argent (« crédits »). Tout le reste du plan réécrit les textes avec ces mots. | **Palier** pour le biome (« niveau » reste au niveau d'XP), **amélioration** au hub, **greffe** en run (le mot est installé, et il est à toi), **crédits**. Tutoiement partout. |
| **Uno par défaut** [M3] | Un profil neuf part avec Martin et Uno. Le mode « Personne » reste, comme une carte « Seul » à côté des animaux. | Oui. Le premier ami qui ouvre le jeu doit voir le chien. |
| **La planche d'icônes** [M27] | Copier une soixantaine d'icônes de game-icons.net (déjà crédité) dans une planche PNG au build : armes, compétences, catégories de greffes, compagnons, états. Sans elle, les chantiers 4, 5 et 7 restent en texte. | Oui, en assets, pas en bibliothèque. 15 à 30 Ko. |
| **Les polices du HUD** [H21] | Passer le HUD en Silkscreen / Pixelify Sans, déjà chargées. Ça impose d'attendre `document.fonts.ready` avant le premier rendu. | Oui : c'est ce qui fera un seul jeu au lieu de deux. |
| **Le compteur de série** [H8] [H23] | Garder un seul compteur : le tempo (l'identité du jeu) ou le combo de dégâts. La jauge du chantier 6 suit ce choix et descend près du personnage. | **Le tempo.** Le combo de dégâts ne reste que dans le score de salle. |

Un point de plus, déjà en attente : l'onglet **Fragments** du hub [M19] raconte encore l'ancienne histoire. Le chantier 3 le sort du hub ; ce qu'on en fait (le supprimer, ou le réécrire avec l'histoire de WAY) reste à toi.

---

## Chantier I-1 — Ce qui est cassé ou faux ✔ *(fait le 10 septembre 2026)*

**Objectif** : plus rien d'inatteignable, de faux ou de débordant. Que des suppressions, des corrections de coordonnées et des chaînes ; aucune logique de jeu ne bouge.

- [M1] `.tabs` repliable ou défilable : les cinq onglets deviennent atteignables.
- [M2] L'onglet « Personnages » devient « Compétences ».
- [M20] `.prepstep .cards{justify-content:flex-start}`.
- [M11] Colonnes du hub à 93 % d'opacité et scène d'attraction en pause derrière le hub (elle reste derrière l'écran-titre).
- [M9] Planchers de taille de police : rien sous 12 px, quelle que soit l'échelle ; onglets, cartes et petits boutons à 44 px de haut sous `body.touch`.
- [M13] Les lignes « Tenue » et « 0 calibration(s) » disparaissent.
- [M25] La ligne fausse de l'écran de fin devient « Butin ramené : prime + part des crédits en attente » avec les vrais chiffres ; « Salles : — » disparaît.
- [M26] « PHASE 2 » et « 0 case(s) 9 cochée(s) » disparaissent de l'écran-titre.
- [M3] Uno par défaut sur un profil neuf (si la décision est prise).
- [H1] Le HUD s'ancre sur `Engine.view` : dans `renderHud` de `50_ui.js`, `31_pets.js`, `39_tempo.js`, `38_challenges.js` et `renderToasts`, les `24`, `W/2`, `W-24`, `H-40` deviennent `-V.ox+24`, `-V.ox+V.w/2`… C'est le correctif le plus rentable des deux audits : une dizaine de lignes et le HUD est juste sur tous les formats.
- [H2] Largeur du cartouche calculée sur `ctx.measureText`, jamais fixée.
- [H5] [H6] [H7] [H22] Suppression : qualité de run et de salle, coups, prédiction de coffre, jauge de qualité, cartouche crédits, stats d'arme, rappel de touches après la salle 3, bandeau des huit greffes. Tout ça revient à la fin de salle, à la pause ou à la prépa (chantiers I-5 et I-7). Environ 60 % des pixels de texte du HUD.
- [H3] Couleurs de PV inversées (vert au-dessus de 60 %, doré entre 30 et 60, rouge sous 30), pulsation sous 30 %, vignette rouge en périphérie.
- [H8] Un seul compteur de série : `combo n` sort du cartouche, le bandeau « SÉRIE ×n » disparaît, le « TEMPO ×n » du haut aussi ; reste celui près du joueur.
- [H14] Le bandeau du nom du boss disparaît (la barre le dit) ; la barre remonte au haut-centre ; « PRISE EXPOSÉE » sous la barre.
- [H15] Bandeaux au tiers supérieur, toasts en bas à droite — sans encore de file, ça vient au chantier I-6.
- [H9] Métronome à 12 px, sans boîte opaque ; « métronome interne » disparaît.
- [H10] Badge compagnon aligné sur le cartouche d'arme.
- [H17] « Master » → « Général ».
- [M25] [H19] Un bouton « Rejouer » sur l'écran de fin, qui relance la même équipe sur le même palier.

**Fini quand** : un test `interface.js` mesure sur capture que les cinq onglets sont dans le cadre, qu'aucun texte du HUD ne sort de sa boîte, que le HUD tient dans `Engine.view` en 900 × 420, et qu'aucune police calculée n'est sous 12 px ; la batterie reste verte.
**Taille** : 1 séance.
**Bilan** : les 22 points sont faits, avec les décisions prises telles que je les recommandais (Uno par défaut, le tempo comme seul compteur) — à renverser d'un mot si tu veux. Le HUD est réécrit autour de deux aides, `panel` et `label`, ancrées sur `Engine.view` et sondées (`UI.hudProbe`) : le test `interface.js` (18 mesures) vérifie que chaque texte tient dans un panneau, que tout tient dans la vue, que la boîte du cartouche suit son texte, les couleurs de PV, la vignette, le toast en bas à droite, le badge aligné, l'absence de bandeau « SÉRIE » et du nom du boss, Uno sur un profil neuf, l'écran de fin vrai et « Rejouer » ; `interface_mobile.js` (7 mesures) vérifie l'ancrage en 900 × 420, les onglets dans l'écran, les polices ≥ 12 px et le toast au-dessus des boutons tactiles. Ce qui reste du constat H15 (bandeaux qui s'empilent) attend I-6, et la bande du haut reste dense (cartouche, défi, métronome) jusqu'à I-5. Le rappel des touches ne s'affiche plus après la salle 3. Effet de bord accepté : les planchers de police (12 px) rendent le hub mobile plus grand qu'avant, donc plus long à faire défiler — c'est I-8 qui le remet en une colonne.

## Chantier I-2 — Un seul vocabulaire

**Objectif** : un mot par notion, une voix, aucune unité de moteur à l'écran.

- [M5] Le glossaire : palier / niveau / amélioration / greffe / crédits, appliqué dans `STR` (`00_core.js`), les écrans (`50_ui.js`) et tout le contenu. « Consigné » → « en banque », « en attente » → « non ramené », « réimpressions » → « morts », « outillage disponible » → « déjà à toi », « Palier scellé » → « Finis d'abord le palier 1 », « Réserve de greffes » → « Coffre ».
- [M6] Tutoiement partout, y compris les descriptions d'armes, de compétences, de greffes et de compagnons.
- [M7] [M8] [H7] Les anglicismes sortent : « Cooldown » → « recharge », « dash » → « ruée », « pickups » → « ramassables », « DPS » supprimé, « ticks/s » → « coups/s », « spam » → « en continu », `dmg` → « dég. », catégories de greffes en français (Attaque, Défense, Mobilité, Butin, Spécial), familles d'armes en français et en minuscules (lame, masse, arc, pistolet, boomerang, orbe, chaîne, flamme).
- [M7] Les pixels deviennent des repères humains : « à bout portant », « une demi-salle », « toute la pièce » — une table de conversion unique (`Content.portee(px)`), pas une réécriture à la main.
- [M21] La redondance « recharge 9 s » / « Cooldown 9 s. » disparaît : la recharge n'est dite que dans l'étiquette.
- Les 61 greffes, 8 armes, 8 compétences, 16 améliorations et 4 compagnons relus une fois, à voix haute, pour la longueur (≤ 90 caractères) et le ton.

**Fini quand** : un test `vocabulaire.js` balaie tous les textes du contenu et des écrans avec la liste des mots bannis (anglicismes, « px », « DPS », « Sujet », « Salle Zéro », doublons de notion) et n'en trouve aucun ; le glossaire est dans `CONTENT.md` et `CLAUDE.md`.
**Taille** : 1 séance.

## Chantier I-3 — Le hub en trois questions

**Objectif** : « Qui part ? Avec qui ? Où ? Partir. » Un ami joue Gabriel avec ses chats en trois clics au lieu de sept, et voit le chien avant de voir un prix.

- [M3] [M14] Les compagnons sortent de la boutique : une rangée de cartes 140 × 170 avec le sprite animé 64 px, plus une carte « Seul » de même taille qui porte son bonus (+35 % PV, +20 % dégâts). Le sélecteur de mode (tout le temps / à l'appel / il reste au camp) n'apparaît que dans la carte d'équipe, une fois un compagnon choisi.
- [M4] [M12] Une seule zone de défilement. Cartes personnage 160 × 200 avec le portrait animé à 128 px et le nom, rien d'autre ; le détail va dans **la carte d'équipe** sous les rangées : nom de l'attelage (« Vieille complicité »), caractère, stats en barres et non en chiffres, mode du compagnon.
- [M16] Cartes de palier en ligne, les verrouillées à moitié largeur, grisées, une ligne de condition ; la difficulté en 14 px doré hors étiquette.
- [M15] Sous le palier choisi, une ligne « Au départ : deux paires bonus ⇄ malus te sont proposées, tu en choisis une », effet au survol ou au toucher long.
- [M4] [M18] [M17] [M19] La boutique devient un écran séparé (`screens.shop`), ouvert par un bouton d'en-tête avec une pastille quand quelque chose est achetable ; une carte d'amélioration ne montre que le palier suivant ; le compteur de crédits passe en police d'interface, 24 px, « 1 240 crédits » en toutes lettres ; l'onglet Fragments quitte le hub (décision à part).
- Le bouton « Partir » en 420 × 72, or, avec le récapitulatif complet : « Partir — Admission, 9 salles · Martin + Uno ».
- [M10] Sous 900 px : une colonne, rangées de cartes défilables au doigt, bouton collant en bas.
- Piège connu : `showHub()` reconstruit tout le HTML à chaque clic et perd la position de défilement ; ne rafraîchir que les classes `selected` et la carte d'équipe.

**Fini quand** : le hub fait moins de 250 mots (857 aujourd'hui) ; « Gabriel avec ses chats » se fait en 3 interactions mesurées par un test `hub.js` ; les tests existants (`acces`, `premiere_partie`, `human`) passent sans changer de sélecteur ou avec leurs sélecteurs mis à jour dans le même commit.
**Taille** : 2 séances.

## Chantier I-4 — La prépa qui montre

**Objectif** : choisir une arme en la voyant, comparer huit armes d'un coup d'œil, savoir que les compétences sont tirées au sort.

- [M27] La planche d'icônes (décision) : une soixantaine d'icônes game-icons.net assemblées au build en une PNG 512 × 512, teintées au rendu ; chargée par `Sprites.load()`.
- [M21] [M27] Cartes d'armes 190 × 150 avec le sprite d'arme 64 px (`Sprites.propCanvas` existe déjà) et **trois jauges** dégâts / cadence / portée normalisées sur le catalogue, à la place de « 3,4 coups/s · 95 DPS » ; un **panneau de détail unique** sous la grille qui ne décrit que l'arme sélectionnée.
- [M21] « 3 compétences tirées au sort sur 8 » écrit dans le titre de l'étape ; cartes de compétence 300 × 110 avec icône et recharge.
- L'étape 0 « Ton départ » (chantier 6) garde ses deux paires, avec le `⇄` entre bonus et malus et l'effet écrit.
- [M22] Le bandeau MODE TEST descend en pied d'écran.
- Symétrie : `justify-content:flex-start` et `grid-template-columns:repeat(auto-fill,190px)` ; sous 900 px, `minmax(140px,1fr)` et panneau de détail au-dessus du bouton.

**Fini quand** : chaque arme a une image et trois jauges ; un test `prepa.js` vérifie que le panneau de détail suit la sélection, que la mention du tirage est là, et que le bouton d'entrée porte toujours le récapitulatif.
**Taille** : 1 séance.

## Chantier I-5 — Le HUD refait

**Objectif** : en une seconde de combat, le joueur lit ses PV, sa compétence, le tempo et le danger — et rien d'autre.

- [H21] `document.fonts.ready` dans `boot()` (`90_main.js`), puis tout le HUD en Silkscreen (chiffres, libellés) et Pixelify Sans (titres). Palette du HUD prise dans les variables CSS existantes, pas inventée.
- Un mini-vocabulaire de dessin en tête de `50_ui.js` : `panel(ctx,x,y,w,h)`, `gauge(ctx,x,y,w,h,k,col,{segments})`, `label(ctx,t,x,y,{size,weight,align,color})`, utilisé par les cinq `renderHud` du jeu (`50_ui`, `31_pets`, `39_tempo`, `38_challenges`, boss). C'est ce qui garantit qu'ils se ressemblent.
- [H3] [H4] Le bloc « moi » en haut à gauche : barre de PV 220 × 22 segmentée tous les 25 PV, chiffres dedans, bouclier au-dessus ; pastille de niveau 26 px qui grossit à ×1,6 et revient en 0,35 s à la montée de niveau, avec un anneau qui se dilate ; barre d'XP **pleine largeur** de 4 px tout en haut de l'écran (modèle Vampire Survivors).
- [H7] Anneau de compétence de 34 px, épaisseur 5, qui se remplit dans le sens horaire ; flash blanc de 0,15 s et anneau vert quand elle est prête ; le nom n'est écrit que les trois premières salles.
- [H5] Haut-centre : une seule ligne, « SALLE 5/9 · 1:24 », largeur mesurée.
- [H14] Barre de boss 480 × 16 au haut-centre, segmentée par phase (seuils dans `32_enemies.js`), nom au-dessus, entrée animée de 0 à 100 % en 0,6 s, flash à chaque coup, dégât retardé en rouge sombre qui rattrape en 0,4 s.
- [H9] [H23] Métronome en quatre disques de 12 px, le temps fort deux fois plus gros, sans fond opaque ; le compteur de série « TEMPO ×n » en Silkscreen 20 px doré **sous les pieds du joueur**, avec un pop à chaque note, effacé après 1,5 s sans note ; la jauge de série du chantier 6 s'y fond (les pastilles remplacent le chiffre tant que la série est sous 4). Une pulsation de 2 % du décor au temps fort dans `Room.render` — trois lignes, et le rythme est dans le monde (modèle Hi-Fi Rush).
- [H16] Objectif de salle : la jauge de 4 px sous le texte, et le cartouche descend sous le métronome.
- [H10] Badge compagnon : même x et même largeur que le cartouche d'arme, barre de vie d'Uno dedans, jauge d'appel de 4 px.
- [H11] Chiffres flottants avec un champ `kind` (`dmg`, `crit`, `taken`, `event`) : normal 13 px blanc, critique 20 px doré avec pop ×1,6 → ×1 en 0,12 s, dégâts subis 22 px rouge avec tremblement — le plus gros texte du jeu ; dispersion sur X et Y.
- [H12] Barres ennemies dans une autre couleur que celle du joueur, segmentées à 25 %, `✦` dans la police du jeu.
- [H13] Télégraphie : une couleur d'alerte réservée, jamais utilisée ailleurs ; la pulsation calée sur `Beat` ; zone d'impact au sol (cône, ligne, disque) pour charge, tir et invocation — la partie la plus longue, à faire ennemi par ennemi.
- [H22] Les greffes en jeu : grille d'icônes 24 × 24 avec `×n` en bas à droite (modèle Risk of Rain 2), texte au survol seulement — dépend de la planche d'icônes du chantier I-4.
- Le HUD s'estompe : après 4 s sans dégât ni ennemi vivant, les blocs secondaires passent à 45 % et remontent en 0,15 s dès qu'un ennemi apparaît.
- Règle d'accessibilité : aucun état signalé par la seule couleur (PV bas = couleur + pulsation + vignette ; compétence prête = couleur + flash ; rareté = couleur + mot).

**Fini quand** : un test `hud.js` mesure sur capture que rien n'est dessiné dans le rectangle central (40 % × 40 % autour du joueur) hors le compteur de série, que la barre de boss est dans le tiers supérieur, que les polices du HUD sont celles du CSS, et que les chiffres flottants de trois sortes ont trois tailles ; le bot joue 9 salles sans erreur JS.
**Taille** : 2 séances.

## Chantier I-6 — Une seule voix

**Objectif** : une règle pour qui a le droit de parler pendant un combat.

- [H15] Un seul point d'entrée : `notify({ text, sub, color, level, key, secs })`, quatre niveaux — 0 vital (écran : vignette, secousse, ralenti), 1 danger (dans le monde : télégraphie, pièges, phase de boss), 2 événement (un bandeau au tiers supérieur, **un seul à la fois**, 1,4 s, file d'attente, un niveau supérieur interrompt), 3 info (toast en bas à droite, 3 au plus, **retenu tant qu'un ennemi est à moins de 400 px**, vidé quand la salle est sécurisée). `banner()` et `toast()` deviennent des enveloppes de compatibilité.
- Déduplication par clé pendant 3 s ; un événement ne se dit qu'une fois (nom du boss = la barre, nom de la salle = le cartouche).
- Zone interdite : rien ne s'affiche dans le rectangle central de jeu ; `zoneLibre()` rend les rectangles disponibles selon la position du joueur à l'écran.
- Les 60 appels existants reçoivent un niveau : niveau 2 pour vagues, défis, boss, salle sécurisée, enragés, erreur JS ; niveau 3 pour compagnons, crédits, arme d'essai, fragments, bonus d'XP.
- [H18] Les bandeaux se figent quand un panneau HTML est ouvert (montée de niveau, coffre, pause).

**Fini quand** : un test `messages.js` déclenche dix messages en une image et vérifie qu'au plus un bandeau et trois toasts sont vivants, que deux messages identiques n'en font qu'un, et qu'aucun toast ne s'affiche pendant qu'un ennemi est à moins de 400 px ; le bot joue 9 salles sans erreur.
**Taille** : 1 séance.

## Chantier I-7 — Choisir et finir en un coup d'œil

**Objectif** : les écrans qui interrompent la partie disent l'essentiel en une image, et la mort donne envie de repartir.

- [M23] [H18] Montée de niveau : icône de catégorie 48 px dans un rond coloré ; ruban de rareté pleine largeur en haut de carte, fond teinté (`color-mix` 12 %), bordure 2 px ; « choix 1 sur 3 » dans le titre ; la bande des greffes déjà prises (les pastilles de la pause) ; l'état actuel du joueur à côté de chaque bonus (« +6 % de crit — tu es à 17 % »).
- [M24] Coffre : titre « Coffre », sous-titre en une phrase (« Traversée sans dégât : une trouvaille garantie de haut niveau »).
- [M25] [H19] Écran de fin : deux gros chiffres (le palier atteint, les crédits ramenés), une ligne de progression (« Meilleure tentative : salle 6 · celle-ci : salle 4 »), le détail sous un `<details>`, la phrase du compagnon en grand, deux boutons — « Repartir tout de suite (Martin + Uno, Admission) » en primaire, « Camp de base » en secondaire — et, si un achat devient possible, « Avec 240 crédits tu peux prendre Vitalité 2 » qui ouvre la boutique dessus ; le HUD de combat disparaît derrière.
- [H17] Pause : curseurs et menu stylés comme le reste (pas les contrôles natifs), les informations de partie (temps, salle, PV, crédits en jeu, stats de l'arme — c'est ici qu'elles ont leur place), le rappel des commandes, le HUD assombri à 30 %.

**Fini quand** : les tests `mort.js` et `human.js` sont mis à jour et verts ; un test `fin.js` vérifie que « Repartir » relance la même équipe sur le même palier sans passer par le hub, et que les deux chiffres sont les plus grands textes de l'écran.
**Taille** : 1 séance.

## Chantier I-8 — Le pouce

**Objectif** : une run complète jouable au pouce, lisible sur un écran de 900 px. Ce chantier **remplace** le point [25] du chantier 10 du plan principal ; la mesure de performance [63] [66] y reste.

- [H20] Le HUD grossit d'un facteur 1,35 sous `Input.touch.active` ; joystick visible dès le premier lancement avec un « pose ton pouce ici » qui disparaît au premier toucher ; bouton TIR translucide à 55 % tant qu'il n'est pas pressé, ou tir automatique par défaut ; bouton d'esquive dédié ; bouton E dans l'arc du pouce droit ; pause et plein écran hors de la zone de préhension.
- [M9] [M10] Hub et prépa en une colonne, cartes en rangées défilables au doigt, tout élément cliquable à 48 px au moins ; boutique en écran plein.
- Test sur téléphone réel (le tien ou celui d'un ami) avant et après : lisibilité à bout de bras, touches accidentelles, fps.

**Fini quand** : `touch.js` étendu vérifie les tailles de cibles (≥ 44 px) et l'échelle du HUD ; une run complète au pouce sans toucher au clavier, sur un téléphone réel.
**Taille** : 1 à 2 séances.

---

## L'ordre, et pourquoi

```
I-1 cassé/faux ── I-2 vocabulaire ─┬─ I-3 hub ──── I-4 prépa ──── I-7 choisir/finir ─┐
                                   │                                                  ├─ I-8 le pouce
                                   └─ I-5 HUD ──── I-6 une voix ──────────────────────┘
```

- **I-1 avant tout** : deux onglets inatteignables et une ligne fausse sur l'écran de fin, ça se corrige avant de redessiner quoi que ce soit. Et l'ancrage du HUD sur la vue est le correctif le plus rentable des deux audits.
- **I-2 juste après** : chaque refonte réécrit des textes ; les réécrire avec le mauvais mot, c'est les réécrire deux fois.
- **I-3 avant I-4** : la prépa hérite du hub (la carte d'équipe, la boutique séparée) ; on ne refait pas la prépa sur un hub qui va bouger.
- **I-4 avant I-5 et I-7** : la planche d'icônes se fabrique une fois, au premier écran qui en a besoin ; le HUD et la montée de niveau la réutilisent.
- **I-5 avant I-6** : la file de messages se pose sur un HUD dont les zones sont fixées, pas l'inverse.
- **I-8 en dernier** : le tactile touche tous les écrans ; on le fait sur des écrans finis, et c'est le chantier 10 du plan principal.

Deux fils peuvent avancer en parallèle : **I-3 → I-4 → I-7** (les menus, du HTML) et **I-5 → I-6** (le HUD, du Canvas) ne se touchent presque pas.

## Où ça s'intercale dans le plan principal

> **Mise à jour du 10 septembre 2026** : un troisième plan existe, celui du ressenti (`PLAN-RESSENTI.md`). C'est lui qui donne l'ordre d'enchaînement des trois plans (section « Où ça s'intercale ») et qui prend les chiffres flottants (H11) et les polices du monde ; I-5 garde le HUD. Le tableau ci-dessous est l'ordre d'avant ce plan.

Le plan principal en est au chantier 8 (l'atelier). Ma proposition :

| Quand | Quoi |
|---|---|
| Maintenant | I-1 et I-2 (2 séances) : ce qui est cassé ou faux ne devrait pas attendre. |
| Puis | Chantier 8 (atelier), tel que prévu. |
| Puis | I-3 → I-7 (7 séances), avant le chantier 9 : ajouter quatre biomes de contenu sur des écrans qu'on va refaire, c'est les refaire deux fois. |
| Puis | Chantier 9 (biomes). |
| Enfin | I-8, qui **est** le chantier 10 (téléphone), avec sa mesure de performance. |

Le chantier 11 (la dette) continue au fil de l'eau : `showHub` et `renderHud` sont les deux plus grosses fonctions du jeu, et I-3 et I-5 sont l'occasion de les découper.

## Ce que j'attends de toi

- Les **cinq décisions** du haut, et ce qu'on fait de l'onglet **Fragments**.
- Pour I-3 : une **partie de toi sur le nouveau hub** avant que je passe à la prépa — c'est là que l'audit a le plus à dire, et c'est là que ton œil compte le plus.
- Pour I-5 : ton avis sur **ce qui doit battre** avec la musique (le décor, les ennemis, le joueur) — l'agent « âme du jeu » va proposer, tu tranches.
- Pour I-8 : un **téléphone** pour mesurer, le tien ou celui d'un ami.
- À chaque fin de chantier : **une partie** de toi, en Normal, profil neuf. Le bot ne voit pas une interface.
