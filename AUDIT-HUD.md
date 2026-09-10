# WAY — Audit de l'interface en jeu (HUD / overlay pendant une partie)

Audit mené sur le vrai rendu : 40 captures Chromium (1280×720 et 900×420 tactile) dans `audit_hud/shots/`,
scripts `audit_hud/capture.js`, `capture_mobile.js`, `capture2.js`. Aucun fichier du dépôt modifié.
Code lu : `dev/50_ui.js`, `31_pets.js`, `39_tempo.js`, `38_challenges.js`, `30_entities.js`, `32_enemies.js`,
`55_touch.js`, `90_main.js`, `00_core.js`, `style.css`.

> **Note sur la version auditée.** Les captures ont été prises sur le build de `index.html` de 07 h 39. Pendant l'audit,
> une autre session a modifié `dev/39_tempo.js` (ajout d'une *jauge de série* `Tempo.renderStreak` et d'un Floater
> « fausse note ») et l'écran de préparation dans `dev/50_ui.js`. `renderHud` n'a pas été touché : toutes les
> observations ci-dessous restent valables. En revanche ces deux ajouts **aggravent** les points 2.5 (compteur de série)
> et 2.6 (rythme) : la jauge de série vient s'installer dans la même bande haute déjà occupée par le cartouche de salle,
> le métronome, la partition du boss et l'objectif de défi, et « fausse note » ouvre un treizième usage du canal Floater.
> Ce sont exactement les deux endroits où ce rapport recommande de **retirer**, pas d'ajouter.

---

## 1. Verdict global (5 lignes)

En une seconde de combat, un joueur lit trois choses : **son personnage**, **les halos d'attaque des ennemis** (bons)
et **un gros mot rouge ou doré au milieu de l'écran** qui lui masque la zone où il doit tirer.
Il rate tout le reste : ses PV (barre rouge, en haut à gauche, à 600 px de son regard, et *invisible* quand elle est
presque vide), sa compétence (un disque de 28 px), son combo, le tempo, la barre du mini-boss (posée en bas, hors du champ).
Le HUD ne hiérarchise rien : PV, XP, qualité, crédits, minuteur, stats d'arme et huit noms de greffes sont affichés
en permanence dans la **même** graisse de 11 px grise, et le texte du cartouche central **déborde littéralement de sa boîte**.
Ce n'est pas un problème de goût : c'est un HUD de tableur posé sur un jeu d'action. Note globale : **4 / 10** — le contenu
est là, la mise en scène n'existe pas.

---

## 2. Élément par élément

Rappel des coordonnées réelles (toutes en px logiques, repère 1280×720) : PV `(24,14) 260×18` · XP `(24,36) 260×8` ·
cartouche central `(440,8) 400×36` · jauge qualité `(460,42) 360×3` · crédits `(1030,8) 226×36` ·
arme+compétence `(18,658) 420×44` · badge compagnon `(16,612) 168×30` · barre de boss `(372,610) 536×44` ·
greffes : bandeau de droite sur la même ligne que l'arme · bandeaux `y = 216 + 62·i` · toasts `y = 610 − 30·i`.

### 2.1 Points de vie — **3 / 10**

**Ce qui marche.** La barre est grande (260 px), les chiffres sont dedans, le bouclier a sa bande cyan distincte.

**Ce qui ne marche pas.**
- **Le défaut le plus grave de tout le HUD** : à 16/203 PV (capture `Z6_pv_critiques.png`), le remplissage rouge fait
  **20 px sur 260** et la barre est quasiment noire. Rien ne clignote, rien ne vibre, aucune vignette rouge en périphérie.
  Le joueur découvre qu'il était à 8 % de vie au moment où il meurt. Pire : la barre d'XP cyan juste dessous est,
  elle, bien remplie — l'œil lit un gros trait lumineux et conclut « tout va bien ».
- **Le rouge est utilisé pour l'état plein** (`#ff5e7a` de 100 % à 50 %). La couleur d'alerte du jeu sert à dire
  « tout va bien ». Les trois paliers (`#ff5e7a` / `#ff8c42` / `#ff3b3b`) sont **codés uniquement par la teinte**, et
  `#ff5e7a` et `#ff3b3b` sont indiscernables en vision normale, a fortiori en protanopie.
- Position : coin haut-gauche, alors que le regard est verrouillé sur le personnage au centre. Dead Cells et Hades
  contournent ça par un **feedback périphérique** (flash rouge sur les bords, ralenti bref) ; ici, rien.
- Le libellé `PV 152 / 152` est en 12 px : sur un téléphone en 900 px de large, il fait 3 mm.

### 2.2 XP et niveau — **3 / 10**

- Un filet cyan de 8 px collé sous les PV. Deux barres horizontales empilées de couleurs proches, même longueur,
  même origine : à 3 mètres on ne sait pas laquelle est laquelle.
- `Niveau 3` est écrit **en dehors** du fond sombre du cartouche (`bx + bw + 8 = 292`, alors que le fond s'arrête à 290) :
  du gris `#9aa4c4` sur un sol de donjon (`#3a3f4f`), soit ~2,4:1 de contraste. Illisible dès qu'on passe sur une tuile claire.
  Visible sur toutes les captures, par exemple `01_salle1_debut.png`.
- La montée de niveau n'est annoncée par **aucun effet dans le HUD** : la barre se vide, point. C'est le seul moment
  gratifiant de la boucle et il ne produit aucune lumière à l'écran.
- *Référence :* Vampire Survivors met la barre d'XP **en bande pleine largeur tout en haut de l'écran**, sans un mot de texte.
  On ne peut pas la rater, elle ne coûte aucune place, et elle ne ressemble à rien d'autre.

### 2.3 Arme et compétence — **5 / 10**

**Ce qui marche.** C'est le bloc le mieux construit du HUD : pastille de couleur par famille d'arme, cercle de recharge
pour la compétence, rappel des touches.

**Ce qui ne marche pas.**
- `52 dmg · 3.4/s · crit 17 %` : personne ne lit ça en combat. C'est une info d'écran de préparation, pas de HUD.
  Brotato assume exactement l'inverse : rien pendant la vague, tout le détail entre les vagues.
- Le cercle de compétence fait **14 px de rayon** et l'anneau de recharge est bleu `#4fb3ff` sur fond `#1a2036` :
  sur la capture `ZA_skill_recharge.png` on ne distingue pas où en est la recharge.
- Aucun événement visuel quand la compétence redevient prête. Juste le mot « Prêt » qui change de couleur.
  Dans Hades, la recharge du Cast produit un flash + un son ; c'est ce qui fait qu'on la relance au bon moment.
- Le rappel de touche `clic droit / Espace / Maj` est permanent : utile 30 secondes, bruit visuel pendant 20 minutes.
- `dmg` est un mot anglais dans un jeu intégralement en français.
- Une pastille de couleur unie ne dit pas quelle arme on tient. Risk of Rain 2 et Hades utilisent des **icônes** ;
  ici, on a le nom en texte parce qu'il n'existe pas de jeu d'icônes.

### 2.4 Minuteur, salle, qualité, crédits — **2 / 10**

C'est le pire bloc du HUD, et il occupe le tiers le plus précieux de l'écran.

- **Le texte déborde de sa boîte.** Le cartouche fait 400 px ; la ligne
  `4 s · Qualité run 100 % · salle 100 % · 0 coup(s) · combo 3 · coffre : Sans dégât : Colossal garanti`
  mesure ~537 px. Elle sort des deux côtés et se poursuit sur le sol nu, en gris 11 px. C'est visible sur
  **toutes** les captures ; gros plan dans `Z2_haut_centre.png`. Ce n'est pas une nuance esthétique, c'est un bug de mise en page permanent.
- Sept informations de nature différente sont concaténées avec des points médians, dans la même graisse et la même
  couleur : un chronomètre (temps réel), deux pourcentages de scoring, un compteur de coups, un combo (temps réel),
  et une prédiction de coffre. Le combo — qui est un feedback nerveux — est noyé dans un relevé comptable.
- `Salle 3/9 — Combat + Pièges` est en gras 14 px blanc : c'est le seul élément vraiment lisible du cartouche, et
  c'est l'information la moins urgente.
- La jauge de qualité (3 px de haut, 360 px de large) est un trait quasi invisible sous le texte ; sa couleur change
  (orange/violet/bleu/gris) sans aucune légende. Personne ne peut deviner ce qu'elle mesure.
- Le cartouche crédits (haut droite) affiche `◈ 33 consignés` + `+ 55 en attente (0 % si perte)`. C'est de la
  méta-progression : elle n'influence aucune décision pendant un combat. Elle mérite l'écran de fin de salle, pas le HUD.
- **Aucun de ces cartouches n'est ancré à l'écran.** `renderHud` dessine en coordonnées logiques fixes (0…1280),
  alors que `Engine.view` expose `ox/oy/w/h` pour les écrans plus larges — et que `renderFade`/`renderAttractVeil`,
  eux, s'en servent. Résultat en 900×420 (`M3_salle1_combat.png`) : le HUD flotte dans une boîte 1280×720 centrée,
  la barre de PV ne touche pas le bord gauche, et le cartouche d'arme est posé **au milieu de l'aire de jeu**.

### 2.5 Combo — **2 / 10**

Il existe **trois** représentations concurrentes du même concept, parfois simultanées et **avec des chiffres différents** :
1. `combo 4` en gris 11 px dans la ligne du cartouche central (`50_ui.js:1040`) ;
2. `SÉRIE ×5` en bandeau doré de 30 px au centre de l'écran (`39_tempo.js:406`) ;
3. `TEMPO ×7` deux fois : sous la partition en haut (`39_tempo.js:723/751`) **et** en chiffre flottant au-dessus de
   la tête du joueur (`39_tempo.js:415`).

La capture `10_salle5_boss_combat.png` montre `TEMPO ×7` (haut), `TEMPO ×7` (au-dessus du joueur) et `SÉRIE ×5`
(bandeau) **en même temps**. Un joueur ne peut pas comprendre qu'il s'agit de deux compteurs distincts, ni lequel
compte pour quoi. C'est le symptôme le plus net de l'absence de règle d'affichage.

### 2.6 Rythme / musique — **4 / 10**

**Ce qui marche.** La partition du boss (un point par temps, blanc → orange → rouge → vert) est une **très bonne idée**,
directement dans l'esprit de la partition de Crypt of the NecroDancer. Le pouls CSS (`--beat`, `--down`) sur les menus
est élégant.

**Ce qui ne marche pas.**
- La barre de mesure ordinaire, ce sont **quatre points de 4 px** dans une boîte noire de 176×28 collée sous le
  cartouche central (`14_salle7.png`). Le tempo est censé être le cœur du jeu ; il est représenté par l'élément le
  plus petit de tout l'écran, à 600 px du personnage.
- La boîte noire de fond découpe un rectangle opaque au milieu de la première rangée de tuiles : ça se voit comme
  un trou dans le décor.
- Le pouls musical existe dans le CSS des menus mais **pas dans le jeu** : le décor, les tuiles, les ennemis ne
  battent pas. Hi-Fi Rush fait exactement l'inverse — le rythme est d'abord porté par le monde (décor et ennemis qui
  bougent en cadence), le HUD n'étant qu'un renfort optionnel (« Rhythm Assist », une barre en bas d'écran).
  Ici, on n'a que le renfort, et il est minuscule.
- Le message `métronome interne` (`39_tempo.js:754`) est un message de développeur affiché au joueur.

### 2.7 Badge du compagnon — **4 / 10**

- Il est à `x=16` alors que le cartouche d'arme est à `x=18`, et fait 168 px contre 420 : **deux blocs mal alignés
  et de largeurs incohérentes**, l'un au-dessus de l'autre (`22_pet_uno.png`, `24_pet_appel.png`). C'est le genre de
  détail qui fait « fait maison » en une seconde.
- Le sous-titre (`mord et attire les coups`, `désigne une cible`) est en **10 px gris** : jamais lu.
- La jauge du mode « à l'appel » (2 px de haut) est correcte dans l'idée mais invisible en pratique.
- L'anneau de Choupi et la marque d'ORI (losange + anneau au sol, `31_pets.js:529`) sont **bons** : lisibles, colorés,
  au bon endroit — dans le monde, pas dans le HUD. C'est le modèle à suivre.
- Aucune barre de vie du compagnon dans le HUD alors qu'Uno peut tomber ; on l'apprend par un toast.

### 2.8 Chiffres flottants (Floaters) — **4 / 10**

- Durée de vie **0,8 s**, montée verticale de 40 px/s, ombre portée de 1 px : c'est propre et lisible individuellement.
- Mais : dégâts normaux `12 px blanc`, critiques `16 px doré`. **Un écart de 33 % en taille ne se lit pas** au milieu
  d'un combat ; la littérature de game feel recommande 150-200 % pour un critique, avec un *pop* d'échelle à l'apparition.
- Aucune dispersion : `x + range(-8,8)` seulement en horizontal. Sur une arme rapide ou une zone d'effet, les nombres
  s'empilent en bouillie sur le même pixel (visible sur `M4_boss.png`, un `88` illisible chevauche le sprite).
- Les Floaters servent à **tout** : dégâts, XP, crédits, « esquive », « greffe ! », « DÉBRANCHÉ », « EXÉCUTION »,
  `TEMPO ×n`, `RÉIMPRESSION`, et les dégâts subis par le joueur. Douze usages, un seul canal. Un joueur ne peut pas
  distinguer un texte d'événement important d'un chiffre de dégâts.
- Les **dégâts subis** (`-24` en rouge, `30_entities.js:1016`) utilisent le même canal que les dégâts infligés :
  la seule différence est la couleur et la position. C'est l'information la plus vitale du jeu, elle est traitée
  comme la moins importante.

### 2.9 Barres de vie des ennemis — **5 / 10**

- 4 px de haut, largeur `r × 2,2`, apparaît uniquement une fois l'ennemi entamé : le principe est sain (Enter the
  Gungeon fait pareil) et évite d'encombrer.
- Mais le rouge `#ff5e7a` est **le même que la barre de PV du joueur** : rien ne distingue « moi » de « eux ».
- Pas de segmentation, donc à partir de 3-4 ennemis on ne sait plus lequel est presque mort — or c'est la seule
  décision qui compte quand on doit finir un ennemi avant qu'il ne charge.
- Les élites ont un anneau orange `#ffb347` : bien.
- L'étoile de stun `✦` est dessinée en `sans-serif 12px` — la seule fois de tout le code où la police n'est pas
  spécifiée. Elle rendra différemment selon les navigateurs.

### 2.10 Télégraphie des attaques — **6 / 10**

**La meilleure partie du jeu, et de loin.** L'anneau pulsant + le halo `shadowBlur 12` + la ligne d'intention en
pointillés (`32_enemies.js:460-500`) sont lisibles, et le cercle plein du kamikaze montre la zone de souffle.
Sur `10_salle5_boss_combat.png`, l'anneau orange du boss se lit instantanément.

**Ce qui manque.**
- La télégraphie est **sur l'ennemi**, pas **au sol**. Le joueur veut savoir *où il ne faut pas être*, pas *qui va
  attaquer*. Hades, Enter the Gungeon et Risk of Rain 2 dessinent tous la **zone d'impact au sol** (cône, ligne, disque),
  ce qui rend la lecture indépendante du nombre d'ennemis. Ici, la ligne d'intention de 160 px ne dit ni la portée
  réelle ni la largeur.
- La couleur est celle de l'ennemi (`telegraph.color`), donc elle varie : le joueur ne peut pas apprendre
  « jaune = évite ». Il faudrait **une** couleur d'alerte réservée, jamais utilisée ailleurs.
- Aucune distinction de forme entre une charge, un tir et une invocation.
- La pulsation utilise `Math.sin(Time.now * 30)`, indépendante du tempo — dans un jeu bâti sur `Beat`,
  c'est une occasion manquée : caler la pulsation sur les temps rendrait la parade *apprenable*.

### 2.11 Barre du mini-boss — **4 / 10**

- **Elle est en bas de l'écran** (`y = 610`), à l'opposé du regard, et **collée au cartouche d'arme** (qui commence à
  `y = 636`, x 18→438, la barre boss allant de x 372 à 908) : les deux blocs se touchent (`10_salle5_boss_combat.png`).
- Elle apparaît instantanément, pleine, sans animation d'entrée — alors que le nom du boss est **déjà** affiché en
  bandeau géant au centre au même instant (`09_salle5_boss_arrivee.png`) : la même information deux fois, en même temps,
  à deux endroits.
- Pas de segmentation par phase, alors que le boss a des phases et que le HUD affiche `— phase 1`.
  Hollow Knight, Hades et Dead Cells segmentent tous la barre : on voit venir le changement de phase.
- `PRISE EXPOSÉE ×2` est écrit **par-dessus le remplissage de la barre** (`by2 + 8` tombe dans la zone `by2+2 … by2+14`) :
  du doré sur du rouge vif, illisible.
- Rien ne pulse quand le boss encaisse un gros coup.

### 2.12 Toasts et bandeaux — **2 / 10**

C'est le système qui coûte le plus cher au jeu.

- **Tout est centré horizontalement.** Les bandeaux à `x = W/2`, les toasts à `x = W/2`, l'objectif de salle à `x = W/2`.
  La capture `18_bandeaux_toasts.png` montre le cas réel : cinq messages empilés sur l'axe vertical central,
  pile entre le joueur (à gauche) et les ennemis (à droite). Le HUD masque exactement la ligne de tir.
- Le bandeau fait **30 px gras avec `shadowBlur 24`** : c'est plus gros et plus lumineux que n'importe quel élément
  du jeu, pour dire « Vague 2 ». Il reste 2,2 s, soit une éternité en combat.
- **Aucune priorité, aucune déduplication, aucune file.** `banner()` empile jusqu'à 3 messages à 62 px d'écart ;
  un bandeau avec sous-titre occupe déjà 28 px, donc le suivant se colle dessus. Sur `06_salle3.png`, le sous-titre
  de « Bottes de facteur » et « Vague 2 » sont pratiquement superposés. Et sur `01_salle1_debut.png`, deux bandeaux
  **identiques** (`Salle 1/9 — Préparation + Combat`) s'affichent l'un sous l'autre (ici via le mode debug, mais
  rien dans le code n'empêche un doublon en jeu normal).
- 23 appels à `UI.banner` et 37 à `UI.toast` dans le code, sans aucune notion d'importance : « Choupi se repose »
  a exactement le même poids visuel que « ENRAGÉS ».
- Les toasts (13 px, boîte cyan) sont à `y = 610 − 30·i`, c'est-à-dire **là où se trouve la barre de boss**.
- Bonne idée mal exploitée : `banner(text, color, sub)` a déjà un champ couleur et un sous-titre — il ne manque
  qu'un champ `priorité`.

### 2.13 Objectifs de salle (défis) — **6 / 10**

- Le cartouche `(470,52) 340×30` avec liseré à la couleur du défi est **le bloc le mieux conçu du HUD** :
  contrasté, court, bien placé, cohérent. `CAPTURE DE ZONE · Zone 1/3 · 51 %` se lit d'un coup d'œil.
- Les marqueurs au sol (cercle vert pointillé de capture, dalles I/II/III des interrupteurs, tuiles jaunes de piège)
  sont excellents : `24_pet_appel.png` et `20_pet_ori_marque.png` sont les deux captures les plus lisibles de la série.
- Reproches : le `51 %` est du texte, pas une jauge — une barre de progression sous le cartouche se lirait sans lire.
  Le cartouche est à `y=52`, soit **8 px sous** le cartouche central, et se retrouve en concurrence directe avec la
  barre de mesure du tempo (`y=66`) et la partition du boss (`y=70`), qui occupent la même zone. Les trois peuvent
  coexister et se marchent dessus.
- Le nom en `MAJUSCULES` non espacées perd en lisibilité ; les capitales sans letter-spacing, c'est ~15 % de vitesse
  de lecture en moins.

### 2.14 Pause — **5 / 10**

- Sobre, hiérarchie correcte, `Reprendre` bien mis en avant.
- Mais les curseurs de volume et le menu déroulant de zoom sont les **contrôles natifs du navigateur** (bleu Chrome,
  select gris système, `16_pause.png`). Rupture totale avec l'esthétique pixel/néon du reste et avec les boutons stylés
  juste en dessous. Dans un jeu, la pause est un moment où l'on juge la finition.
- `Master` est en anglais. Dire « Général ».
- L'écran n'affiche **aucune information de partie** : ni le temps écoulé, ni la salle, ni les PV, ni les crédits en
  jeu, ni les stats de l'arme. C'est pourtant le seul moment où le joueur a le temps de lire — et le seul endroit
  où les stats détaillées de l'arme (aujourd'hui dans le HUD de combat) auraient un sens.
- Aucun rappel des commandes. Un ami qui reprend le jeu après trois semaines ne trouve pas comment on esquive.
- Le HUD de combat reste visible derrière, à peine assombri.

### 2.15 Montée de niveau et coffre pendant la partie — **6 / 10**

- Bonne base : panneau centré, quatre cartes, numéros de touche `1-4`, re-roll, rareté en éponyme + couleur + liseré.
  `17_montee_niveau.png` et `08_salle4_pieges_tard.png` sont propres.
- **Aucune icône** : quatre pavés de texte à lire en pleine partie. Hades donne à chaque boon l'icône du dieu qui
  l'offre ; Risk of Rain 2 donne une icône par objet. Ici, il faut *lire* pour choisir, ce qui casse le rythme.
- Les catégories sont **en anglais** dans un jeu français : `offense`, `defense`, `mobility`, `special`.
  Et une carte affiche `-6 % de cooldown de compétence` : mot anglais + signe négatif sur un bonus (ambigu :
  est-ce une pénalité ?).
- Aucun état actuel du joueur affiché : on choisit `+6 % de chance de critique` sans savoir qu'on est à 17 %.
- La différence visuelle commun / rare est trop faible (gris vs bleu clair) ; épique et colossal ne sont visibles
  que si on tombe dessus.
- Le fond assombri laisse passer les bandeaux du HUD, qui continuent de s'animer derrière le panneau (`17_montee_niveau.png` :
  « DÉFI : Sol qui s'effondre » clignote derrière la carte). Le temps est en pause, l'interface non.

### 2.16 Écran de mort / fin — **3 / 10**

- C'est **un relevé bancaire** (`28_mort_ecran.png`). Sept lignes de tableau, aucune image, aucun effet, aucune
  emphase sur ce qu'on ramène. La mort est le battement de cœur d'un roguelite : ici, elle ne raconte rien.
- **Il n'y a pas de bouton « Rejouer ».** Le seul chemin est `Retour au hub`. Dans Hades, Dead Cells, Brotato,
  relancer est à un bouton. Ici, on doit refaire le tour du hub. C'est ce qui fait qu'un ami s'arrête après deux parties.
- Le total de crédits — l'unique récompense — est en 14 px gras dans une ligne de tableau, moins visible que
  le titre « Vaincu ».
- `Dégâts subis / coups : 99 999 / 1` montre le chiffre brut sans plafonnement.
- Le HUD de combat reste affiché derrière, barre de PV rouge comprise.
- Bon point : la phrase de mort tirée du contenu (`Le compagnon est rentré seul. Il t'attend au camp.`) — c'est
  exactement le bon registre, mais elle est en `muted` 14 px, écrasée par le tableau.

### 2.17 Tactile — **4 / 10**

**Ce qui marche.** Le joystick flottant qui se recentre là où le pouce se pose est la bonne décision (c'est le
standard recommandé pour l'action mobile : le joueur n'a pas à chercher le centre, et ça réduit les coups d'œil
vers l'écran). Les boutons ont un état `.on` visible. La zone de joystick fait 55 % de l'écran.

**Ce qui ne marche pas.**
- **Le HUD n'est pas ancré à l'écran** (voir 2.4) : en 900×420, la barre de PV flotte à 90 px du bord gauche et le
  cartouche d'arme est posé au milieu du terrain (`M3_salle1_combat.png`).
- **Aucune adaptation de taille** : 10, 11, 12 px logiques restent 10, 11, 12 px logiques. Sur un téléphone réel
  (et non le simulateur en DPR 2), `mord et attire les coups` en 10 px est illisible.
- Le bouton TIR (120 px doré, en bas à droite) **recouvre le coin bas-droit de l'aire de jeu**, exactement là où
  le joueur se trouvait dans deux de mes captures. Rien n'est prévu pour décaler la caméra ou rendre le bouton
  translucide au contact.
- Le bouton `E` (interagir) est à `bottom: 180px, right: 70px` : hors de l'arc naturel du pouce droit.
  Les boutons `pause` et `plein écran` sont à `top: 56px, right: 16/68px` — soit dans la zone où l'on tient
  physiquement le téléphone en paysage : touches accidentelles garanties.
- **Pas de bouton d'esquive/dash dédié.** Le dash passe par la compétence uniquement si la compétence *est* un dash.
- Aucune indication au premier lancement qu'il faut poser le pouce à gauche : le joystick est invisible tant qu'on
  ne touche pas.
- Le bouton `II` pour la pause n'est pas un pictogramme reconnaissable.

### 2.18 Cohérence de style Canvas ↔ HTML — **3 / 10**

Deux jeux cohabitent à l'écran :
- **Les écrans HTML** utilisent `Silkscreen`, `Pixelify Sans` et `VT323` (polices bitmap chargées localement),
  des majuscules espacées, des panneaux à liseré cyan, un `--ui-scale` responsive.
- **Le HUD Canvas** utilise `"Segoe UI", system-ui` en 10-14 px, sans letter-spacing, dans des boîtes noires à
  75 % d'opacité, sans facteur d'échelle.

Résultat : dès qu'un panneau HTML s'ouvre par-dessus le HUD (captures `08`, `17`, `28`), on voit deux interfaces de
deux jeux différents. **Les polices pixel sont déjà dans le dépôt et déjà chargées** — le HUD ne s'en sert pas.
Les boutons tactiles sont eux aussi en Segoe UI.

### 2.19 Greffes affichées en jeu — **2 / 10**

Huit pastilles de texte 11 px alignées en bas à droite (`Z9_greffes_bas.png`), sur la même ligne que le cartouche
d'arme, occupant 660 px. Aucune icône, aucun compteur lisible, rareté codée par une couleur de liseré de 1 px.
Personne ne lit huit noms d'objets pendant un combat. C'est de la place perdue à 100 %.
Risk of Rain 2 résout exactement ce problème avec une **grille d'icônes empilées avec un compteur `×n`**, le texte
n'apparaissant qu'au survol.

---

### Récapitulatif des notes

| Élément | Note |
|---|---|
| Points de vie | 3 / 10 |
| XP et niveau | 3 / 10 |
| Arme et compétence | 5 / 10 |
| Minuteur / salle / qualité / crédits | 2 / 10 |
| Combo | 2 / 10 |
| Rythme / musique | 4 / 10 |
| Badge du compagnon | 4 / 10 |
| Chiffres flottants | 4 / 10 |
| Barres de vie ennemis | 5 / 10 |
| Télégraphie des attaques | 6 / 10 |
| Barre du mini-boss | 4 / 10 |
| Toasts et bandeaux | 2 / 10 |
| Objectifs de salle | 6 / 10 |
| Pause | 5 / 10 |
| Montée de niveau / coffre | 6 / 10 |
| Écran de mort | 3 / 10 |
| Tactile | 4 / 10 |
| Cohérence Canvas ↔ HTML | 3 / 10 |
| Greffes en jeu | 2 / 10 |
| **Global** | **4 / 10** |

---

## 3. Propositions, classées par impact / effort

### 3.1 Ce qu'on SUPPRIME du HUD de combat (impact énorme, effort quasi nul)

Ces six suppressions se font en effaçant des lignes dans `renderHud` :

| À supprimer | Où | Pourquoi | Où ça va |
|---|---|---|---|
| `Qualité run x % · salle y %` | `50_ui.js:1040` | scoring, aucune décision en combat | fin de salle + pause |
| `n coup(s)` | idem | idem | fin de salle |
| `coffre : … garanti` | idem | prédiction méta | écran de coffre |
| Cartouche crédits entier | `50_ui.js:1046-1058` | méta-progression | fin de salle + pause |
| `52 dmg · 3.4/s · crit 17 %` | `50_ui.js:1075` | stats de préparation | pause + prépa |
| `clic droit / Espace / Maj` | `50_ui.js:1097` | tutoriel permanent | 3 premières salles seulement, puis masqué |
| Bandeau de 8 greffes en texte | `50_ui.js:1103-1119` | illisible en combat | pause (déjà présent) + icônes plus tard |
| Jauge de qualité 3 px | `50_ui.js:1043-1045` | sans légende, invisible | fin de salle |
| `métronome interne` | `39_tempo.js:754` | message de développeur | panneau debug |

À elles seules, ces suppressions retirent **environ 60 % des pixels de texte** du HUD et libèrent tout le haut de l'écran.

### 3.2 Ce qu'on REGROUPE (impact fort, effort moyen)

1. **Un seul compteur de série.** Choisir `combo` (dégâts enchaînés) **ou** `tempo` (notes en rythme), et n'afficher
   qu'un seul chiffre, au **même endroit**, toujours. Ma recommandation : garder `TEMPO ×n` — c'est l'identité du jeu —
   et supprimer les deux autres canaux (`banner('SÉRIE ×n')` en `39_tempo.js:406` et `combo n` dans le cartouche central).
   Le compteur retenu s'affiche **près du personnage**, pas en haut : c'est là que l'œil est.
2. **Bloc « moi »** : PV + bouclier + XP + niveau + compétence dans un seul groupe visuel, en haut à gauche,
   avec un fond commun. Objectif explicite de l'équipe de Hades : *minimiser la distance de parcours de l'œil* et
   regrouper les ressources de combat.
3. **Une seule ligne de message.** Un unique canal (voir 3.5) au lieu de bandeaux + toasts + Floaters d'événements.

### 3.3 Ce qu'on DÉPLACE (impact fort, effort faible)

- **Barre de boss : du bas vers le haut-centre**, à la place du cartouche « Salle x/9 » qu'on aura amaigri.
  C'est là que le joueur regarde quand il combat un boss (comme dans Hades, Hollow Knight, Dead Cells).
- **Barre d'XP : bande pleine largeur tout en haut de l'écran**, 4 px, `#c8ff5a`, avec le niveau en pastille à gauche.
  Modèle Vampire Survivors : impossible à rater, coûte zéro place, ne ressemble à rien d'autre.
- **Bandeaux : du centre vers le tiers supérieur** (`y ≈ 0,18·H`), au-dessus de la zone de combat utile.
- **Toasts : du centre-bas vers le coin bas-droit**, empilés vers le haut, format court.
- **Badge compagnon : aligné exactement sur le cartouche d'arme** (même `x`, même largeur ou moitié exacte).
- **HUD ancré à `Engine.view`** et non à la boîte 1280×720 : remplacer `24`, `W/2`, `W-24`, `H-40` par
  `-V.ox + 24`, `-V.ox + V.w/2`, `-V.ox + V.w - 24`, `-V.oy + V.h - 40`. **C'est le correctif le plus rentable
  de tout le rapport** : une dizaine de lignes, et le HUD devient correct sur tous les formats, mobile compris.

### 3.4 Maquette du HUD cible

```
┌────────────────────────────────────────────────────────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ← XP, 4px, pleine largeur
│ ┌──────────────────────┐          ┌─────────────────────┐                      │
│ │ N7  ███████████░░░░  │          │  SALLE 5/9 · 1:24   │                      │  haut-centre : 1 ligne
│ │     124/203     ◈+30 │          │ ▓▓▓▓▓▓▓▓▓▓░░░░  ×3  │                      │  (ou barre de boss)
│ └──────────────────────┘          └─────────────────────┘                      │
│                                    ┌───────────────────┐                       │
│                                    │ ● ● ○ ○   TEMPO   │                       │  métronome, 12px de dia.
│                                    └───────────────────┘                       │
│                                                                                │
│                       ┌──────────────────────────────┐                         │
│                       │      DÉFI · ZONE 1/3         │                         │  objectif de salle
│                       │ ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░  51 %   │                         │  + jauge
│                       └──────────────────────────────┘                         │
│                                                                                │
│                              V A G U E   3                                     │  ← bandeaux : y = 0,18·H
│                                                                                │
│                                                                                │
│                             ★ personnage ★                                     │
│                                 ×7  ← compteur de série, sous les pieds        │
│                                                                                │
│                                                                                │
│ ┌───────────────────────┐                              ┌─────────────────────┐ │
│ │ ⚔  Lame d'essai       │                              │ Choupi arrive       │ │  toasts bas-droite
│ │ ◐  Dash        1,4 s  │                              │ +240 crédits        │ │
│ ├───────────────────────┤                              └─────────────────────┘ │
│ │ 🐕 Uno  ▓▓▓▓▓░░       │                                                      │
│ └───────────────────────┘                                                      │
│                                            ▲ boss : ici seulement en secours   │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Spécifications précises.**

*Bloc « moi »* (haut-gauche, ancré `-V.ox + 20, -V.oy + 20`) :
- Fond `rgba(8,10,18,.82)`, rayon 10, **liseré 1 px `rgba(110,231,255,.22)`** (le `--line` du CSS : le HUD reprend
  enfin la palette des écrans HTML).
- Barre de PV **220 × 22**, chiffres `Silkscreen 14px` centrés dedans, ombre `1px 1px #0008`.
- **Couleurs par palier, inversées** : `>60 % → #7fff9a` (vert), `30-60 % → #ffd166` (doré), `<30 % → #ff3b3b` (rouge).
  Le rouge redevient le signal d'alerte.
- **Sous 30 % de PV** : la barre pulse (`alpha 0,7 + 0,3·sin(Time.now·6)`) **et** une vignette rouge apparaît sur les
  bords de l'écran (dégradé radial, `rgba(255,40,60,0.05 → 0.22)` selon le déficit), dessinée dans `renderHud` en
  coordonnées de vue. C'est le mécanisme de Dead Cells : le danger se lit en périphérie, sans quitter le personnage des yeux.
- **Segments** : un trait vertical `rgba(0,0,0,.35)` tous les 25 PV. Une barre segmentée se lit en valeur absolue
  (« il me reste 4 crans »), pas en proportion.
- Bouclier : bande cyan **au-dessus** de la barre, pas dans les 5 derniers pixels du bas.
- Niveau : pastille ronde de 26 px à gauche de la barre, `Silkscreen 13px`, fond `#12203a`, texte `#6ee7ff`.
  **Animation de montée de niveau** : la pastille grossit à ×1,6 puis revient en 0,35 s (`easeOutBack`) + un anneau
  cyan qui se dilate et s'efface.
- Compétence : **anneau de 34 px de diamètre** collé au bloc, épaisseur 5 px, `#4fb3ff` qui se remplit dans le sens
  horaire ; à `k = 1` : flash blanc de 0,15 s + l'anneau passe `#7fff9a` et pulse doucement. Le nom de la compétence
  n'est affiché que les trois premières salles.

*Haut-centre* (une seule ligne, `Pixelify Sans 15px`, letter-spacing `.06em`) :
`SALLE 5/9 · 1:24`. Rien d'autre. Largeur de boîte **calculée sur `ctx.measureText`**, jamais fixée à 400 px —
c'est ce qui corrige le débordement actuel.

*Barre de boss* (remplace le cartouche ci-dessus quand un boss est vivant, même position) :
- 480 × 16, **segmentée par phase** (un trait blanc de 2 px à chaque seuil de phase).
- Nom du boss au-dessus en `Silkscreen 15px #ff3b5c`. `PRISE EXPOSÉE ×2` **sous** la barre, jamais dessus.
- Animation d'entrée : la barre se remplit de 0 à 100 % en 0,6 s pendant que le nom apparaît en fondu —
  et **on supprime le bandeau central du nom du boss**, qui fait doublon.
- Un flash blanc sur la barre à chaque coup encaissé ; un « dégât retardé » en rouge sombre qui rattrape le
  remplissage en 0,4 s (technique classique : on *voit* combien on vient d'enlever).

*Métronome* (sous le cartouche central, ou en bas-centre si l'objectif de salle est actif) :
- Quatre disques de **12 px** au lieu de 4 px, espacés de 34, le temps fort deux fois plus gros.
- Pas de boîte noire opaque : un fond `rgba(8,10,18,.5)` avec un flou de bord, ou aucun fond du tout et un halo
  sur chaque disque.
- **Le décor doit battre aussi.** Une pulsation de 2 % sur l'échelle des tuiles au temps fort (ou un léger
  éclaircissement de la lumière ambiante) fait plus pour le rythme que n'importe quel indicateur — c'est le principe
  de Hi-Fi Rush, où le rythme est porté par le monde et le HUD n'est qu'un renfort. Et c'est trois lignes dans `Room.render`.

*Compteur de série* : `TEMPO ×7` en `Silkscreen 20px`, doré, **sous les pieds du joueur** (`pl.y + pl.r + 18`),
avec un *pop* d'échelle à chaque incrément, et qui s'efface après 1,5 s sans nouvelle note.

*Objectif de salle* : garder le cartouche actuel (c'est le meilleur bloc du HUD), **ajouter une jauge de 4 px** sous
le texte pour la progression, et le descendre sous le métronome pour qu'ils ne se disputent plus la même bande.

*Bandeaux* : `Silkscreen 26px` (au lieu de 30 Segoe UI), `shadowBlur 12` (au lieu de 24), `y = 0,18·H`,
**un seul à la fois**, apparition en `translateY(-12px)` + fondu en 0,18 s, sortie en 0,25 s.

*Toasts* : coin bas-droite, empilés vers le haut, 12 px, boîte de 22 px de haut, alignés à droite,
max 3 visibles, durée 2,5 s.

*Chiffres flottants* : normal `Silkscreen 13px #fff` ; **critique `20px #ffd166` avec un pop d'échelle
de ×1,6 → ×1,0 en 0,12 s** (le seuil de lisibilité d'un critique est autour de 150-200 % de la taille normale,
pas 130 %) ; dispersion `range(-14,14)` sur X **et** `range(-10,10)` sur Y ; dégâts subis en `22px #ff3b3b`
avec un tremblement horizontal — ils doivent être le plus gros texte du jeu.

*Greffes* : à terme, une grille d'icônes 24×24 en bas à droite avec `×n`, liseré à la couleur de rareté
(modèle Risk of Rain 2). En attendant, **on les retire du HUD** : elles sont déjà listées dans la pause.

*Typographie* : le HUD passe intégralement à `Silkscreen` (chiffres, libellés courts) et `Pixelify Sans`
(titres) — **déjà présentes dans `assets/fonts/` et déjà chargées par le CSS**. Coût : zéro octet supplémentaire.
Attention : `ctx.font` avec une police `@font-face` exige que la police soit chargée avant le premier rendu
(`document.fonts.ready` dans `boot()`), sinon Canvas retombe silencieusement sur la police par défaut.

*Palette du HUD* (réutiliser les variables CSS existantes, pas en inventer) :
`--text #e8ecf7` · `--muted #9aa4c4` · `--accent #6ee7ff` · `--gold #ffd166` · `--danger #ff5e7a` · `--good #7fff9a`
· fond `rgba(8,10,18,.82)` · liseré `rgba(110,231,255,.22)`.
**Règle d'accessibilité** : aucun état ne doit être signalé par la seule couleur. PV bas = couleur **+** pulsation
**+** vignette. Compétence prête = couleur **+** flash. Rareté = couleur **+** libellé texte (déjà le cas).

### 3.5 Règles de priorité : qui a le droit de parler pendant un combat

Le système actuel n'a aucune règle. Voici celle que je propose — quatre niveaux, un seul canal par niveau :

| Niveau | Canal | Qui | Règle |
|---|---|---|---|
| **0 — Vital** | Écran (vignette, secousse, ralenti) | PV < 30 %, coup encaissé, mort imminente | Toujours. Ne peut être masqué par rien. |
| **1 — Danger** | Monde (au sol, sur l'ennemi) | Télégraphie, zone de piège, changement de phase de boss | Toujours. Jamais recouvert par un élément de HUD. |
| **2 — Événement** | **Un** bandeau, tiers supérieur | Vague N, DÉFI, nom du boss, salle sécurisée, ENRAGÉS | **Un seul à la fois.** File d'attente, pas d'empilement. Durée 1,4 s. Un nouveau message de priorité supérieure interrompt le courant. Déduplication par texte pendant 3 s. |
| **3 — Info** | Toast, coin bas-droite | Compagnon, crédits, arme d'essai, fragment | Max 3 visibles. **Supprimé pendant un combat actif** (`Room.alive() > 0` et un ennemi à moins de 400 px) → mis en file et affiché quand la salle est sécurisée. |

Trois règles supplémentaires :
1. **Rien ne s'affiche dans le rectangle central** (40 % de la largeur × 40 % de la hauteur, centré sur le joueur).
   C'est la zone de jeu. Les bandeaux vont au-dessus, les toasts en bas-droite.
2. **Un événement ne se dit qu'une fois.** Le nom du boss est soit un bandeau, soit une barre de vie — pas les deux.
   Le nom de la salle est soit le cartouche du haut, soit un bandeau — pas les deux.
3. **Le HUD s'estompe quand il ne se passe rien.** Après 4 s sans dégât ni ennemi vivant, les blocs secondaires
   (arme, compagnon, objectif) passent à `alpha 0.45` et remontent à 1 en 0,15 s dès qu'un ennemi apparaît.
   Celeste et Hollow Knight le font ; ça rend l'écran respirable sans rien perdre.

### 3.6 Sur les bibliothèques externes

J'ai regardé sérieusement, et **ma recommandation est de n'en ajouter aucune**. Voici pourquoi, poste par poste :

| Besoin | Bibliothèque candidate | Poids / coût | Alternative sans lib | Verdict |
|---|---|---|---|---|
| Easing (pop, rebond) | `bezier-easing` ~1 Ko, `popmotion` ~12 Ko | faible mais une dépendance de plus dans le build mono-fichier | 8 lignes : `easeOutCubic = t => 1-(1-t)**3`, `easeOutBack = t => 1+2.7*(t-1)**3+1.7*(t-1)**2` | **Sans lib.** Le gain est nul. |
| Animation du HUD | GSAP ~70 Ko gz, licence commerciale pour certains plugins ; `anime.js` ~17 Ko | lourd, et inutile sur du Canvas déjà piloté par un tick `dt` fixe | interpoler dans `UI.update(dt)` comme le fait déjà `banners[i].t` | **Sans lib.** |
| Animation des écrans HTML | idem | idem | `@keyframes` + `transition` en CSS (le fichier en contient déjà) | **Sans lib.** |
| Particules | `proton`, `tsParticles` ~40-90 Ko | régression : le module `Particles` du jeu est plus simple et déjà intégré | rien à faire | **Sans lib.** |
| Polices | Google Fonts en CDN | dépendance réseau, le jeu doit tourner en un seul fichier | **`Silkscreen`, `VT323`, `Pixelify Sans` sont déjà dans `assets/fonts/`** et déjà déclarées en `@font-face` | **Déjà là.** Coût zéro. |
| Icônes (armes, compétences, greffes) | `game-icons.net` (CC BY 3.0, **déjà crédité dans `CREDITS.md`**), Kenney Game Icons (CC0, déjà utilisé) | ce sont des **assets**, pas une bibliothèque : on télécharge une fois, on assemble une planche PNG au build | une planche 512×512 de 60 icônes 24×24 en niveaux de gris teintés au rendu (`globalCompositeOperation`) pèse ~15-30 Ko et s'ajoute au pipeline `Sprites.load()` existant | **Oui, mais en assets.** C'est le seul « ajout externe » que je recommande, et il ne coûte aucun runtime. |

Autrement dit : tout ce que ce rapport demande se fait avec les 300 lignes de `renderHud` déjà écrites,
les polices déjà présentes et le `Sprites` déjà en place.

---

## 4. Plan en trois séances pour un développeur

### Séance 1 — Quick wins (2-3 h, aucun risque, énorme différence)

Uniquement des suppressions et des corrections de coordonnées. Rien de nouveau à concevoir.

| # | Action | Fichier / fonction |
|---|---|---|
| 1 | **Ancrer le HUD sur `Engine.view`** : `const V = Engine.view;` en tête, puis remplacer `24 → -V.ox+24`, `W/2 → -V.ox+V.w/2`, `W-24 → -V.ox+V.w-24`, `H-40 → -V.oy+V.h-40`, etc. | `50_ui.js` `renderHud` (l. 980-1147) ; idem `31_pets.js` `renderHud`/`renderCall` (l. 665, 700), `39_tempo.js` `renderHud` (l. 639), `38_challenges.js` `renderHud` (l. 896), `50_ui.js` `renderToasts` (l. 1169) |
| 2 | **Supprimer** qualité, coups, prédiction de coffre, jauge de qualité, cartouche crédits, stats d'arme, bandeau des 8 greffes | `50_ui.js:1035-1058`, `1075`, `1103-1119` |
| 3 | **Largeur de boîte calculée** (`ctx.measureText(t).width + 24`) au lieu de `400` fixe → fin du débordement | `50_ui.js:1021` |
| 4 | **Inverser les couleurs de PV** (`>60 % vert`, `30-60 % doré`, `<30 % rouge`) + pulsation sous 30 % + vignette rouge en périphérie | `50_ui.js:997-1000` |
| 5 | **Supprimer les doublons de combo** : retirer `combo n` du cartouche central et `UI.banner('SÉRIE ×'+combo)` ; ne garder que le Floater `TEMPO ×n` | `50_ui.js:1040`, `39_tempo.js:406` |
| 6 | **Supprimer le bandeau du nom de boss** (la barre de vie le dit déjà) | `40_room.js:266` |
| 7 | **Remonter la barre de boss** de `H-88` au haut-centre + `PRISE EXPOSÉE` sous la barre, pas dessus | `50_ui.js:1120-1146` |
| 8 | **Déplacer les toasts** en bas-droite et les bandeaux à `y = 0,18·H` | `50_ui.js:1169-1190`, `1148-1167` |
| 9 | **Grossir le métronome** (disques 12 px, espacement 34) et retirer le message `métronome interne` | `39_tempo.js:730-756` |
| 10 | **Aligner le badge compagnon** sur le cartouche d'arme (même `x`, largeur 210) | `31_pets.js:700-730` |
| 11 | **Franciser** : `dmg → dég.`, `Master → Général`, `offense/defense/mobility/special → offensif/défensif/mobilité/spécial`, `cooldown → recharge` | `50_ui.js` `cardHtml` + `togglePause`, `00_core.js` `STR`, données de greffes |
| 12 | **Ajouter un bouton « Rejouer »** sur l'écran de fin | `50_ui.js` `showEnd` |

### Séance 2 — Réorganisation du HUD (une journée)

1. **Charger les polices avant le premier rendu** : `await document.fonts.ready` dans `boot()` (`90_main.js`),
   puis passer tout `renderHud` en `Silkscreen` / `Pixelify Sans`.
2. **Extraire un mini-vocabulaire de dessin** en haut de `50_ui.js` :
   `panel(ctx,x,y,w,h)` (fond + liseré aux couleurs du CSS), `gauge(ctx,x,y,w,h,k,col,{segments})`,
   `label(ctx,t,x,y,{size,weight,align,color})`. Ensuite tous les modules (`31_pets`, `39_tempo`, `38_challenges`)
   les appellent : c'est ce qui garantit la cohérence entre les cinq `renderHud` du jeu.
3. **Construire le bloc « moi »** : PV segmentés + bouclier + pastille de niveau animée + anneau de compétence 34 px
   avec flash de disponibilité (`50_ui.js` `renderHud`).
4. **Barre d'XP pleine largeur** en haut de l'écran (`50_ui.js` `renderHud`, 6 lignes).
5. **Barre de boss segmentée par phase** + animation d'entrée + dégât retardé (`50_ui.js` `renderHud`, section boss ;
   les seuils de phase sont dans `32_enemies.js`, classe `Boss`).
6. **Floaters** : ajouter un champ `kind` (`'dmg' | 'crit' | 'taken' | 'event'`), un pop d'échelle et une dispersion
   sur X et Y (`30_entities.js:63-88`) ; router les appels existants (`30_entities.js:873, 895, 961, 979, 991, 1016, 1076, 1084`,
   `39_tempo.js:415`).
7. **Le décor bat avec la musique** : une pulsation de 2 % au temps fort dans `Room.render` (`40_room.js`),
   pilotée par `Beat.phase()` / `Beat.beatInBar()`.
8. **Estompage du HUD** hors combat : un `hudAlpha` interpolé dans `UI.update(dt)` (`50_ui.js:944`).
9. **Tactile** : agrandir les tailles de police du HUD d'un facteur `Input.touch.active ? 1.35 : 1` ;
   descendre `#touch .tbtn.pause` / `.fs` hors de la zone de préhension ; ajouter un bouton d'esquive ;
   rendre le bouton TIR translucide (`opacity .55`) tant qu'il n'est pas pressé (`55_touch.js` `build()`, `style.css:85-100`).

### Séance 3 — Système de priorité des messages (une demi-journée)

1. **Un seul point d'entrée** dans `50_ui.js` :
   `notify({ text, sub, color, level, key, secs })` où `level ∈ {0,1,2,3}` et `key` sert à la déduplication.
   `banner()` et `toast()` deviennent des enveloppes de compatibilité qui appellent `notify` avec un niveau par défaut.
2. **Une file, pas une pile** : `queue = []` + `current = null`. `UI.update(dt)` fait défiler la file ;
   un message de niveau plus urgent interrompt le courant (fondu de sortie de 0,15 s) ; un `key` déjà vu dans les
   3 dernières secondes est ignoré.
3. **Silence en combat** : les messages de niveau 3 sont retenus tant que `Room.alive() > 0` **et** qu'un ennemi est
   à moins de 400 px du joueur ; ils se vident d'un coup quand la salle est sécurisée (`40_room.js:506`).
4. **Zone interdite** : une fonction `zoneLibre()` qui renvoie les rectangles disponibles selon la position du
   joueur à l'écran (via `Camera`), pour que rien ne s'affiche dans le rectangle central de jeu.
5. **Attribuer un niveau aux 60 appels existants** — c'est le gros du travail, mais c'est mécanique :
   - niveau 2 (bandeau) : `40_room.js:181, 266, 311, 506` · `38_challenges.js:202, 224, 233, 235, 283, 306, 320, 406, 422`
     · `39_tempo.js:161, 307, 378` · `32_enemies.js:1015` · `31_pets.js:595` · `30_entities.js:1096, 1105`
   - niveau 3 (toast) : tout le reste — `31_pets.js:106, 138, 175, 188, 634` · `40_room.js:891, 910` ·
     `38_challenges.js:401` · `39_tempo.js:376` · `60_meta.js:237` · `30_entities.js:602, 1095`
   - `00_core.js:169` (erreur JS) : niveau 2, il ne doit jamais être silencieux.
6. **Test de non-régression** : ajouter au banc d'essai un test qui déclenche dix messages en une frame et vérifie
   qu'au plus un bandeau et trois toasts sont vivants — c'est exactement le scénario de `18_bandeaux_toasts.png`.

---

## Annexe — Références citées

- **Hades** (Supergiant Games) — objectifs de refonte du HUD énoncés par l'équipe : *minimiser la distance de parcours
  de l'œil*, *regrouper les ressources de combat*, *masquer dynamiquement les boons en surnombre pour réduire la
  charge cognitive*. Boons = icônes, jamais du texte. Recharge de Cast = anneau près du portrait.
- **Dead Cells** (Motion Twin) — PV en haut-gauche avec les chiffres dans la barre ; danger signalé en **périphérie**
  (flash rouge), pas seulement dans le coin ; objets en icônes avec la touche gravée dessus.
- **Enter the Gungeon** (Dodge Roll) — barres de vie ennemies qui n'apparaissent qu'une fois l'ennemi entamé ;
  télégraphie **au sol** et non sur l'ennemi.
- **Vampire Survivors** (poncle) — barre d'XP en bande pleine largeur tout en haut, sans texte ; minuteur en gros au centre-haut.
- **Brotato** (Blobfish) — HUD minimal pendant la vague, tout le détail chiffré renvoyé entre les vagues.
- **Risk of Rain 2** (Hopoo Games) — inventaire en grille d'icônes empilées avec compteur `×n`, texte au survol seulement.
- **Crypt of the NecroDancer** (Brace Yourself Games) — le métronome est un élément **majeur** de l'écran, pas un détail.
- **Hi-Fi Rush** (Tango Gameworks) — le rythme est porté par le **monde** (décor, ennemis, personnage qui bougent en
  cadence) ; le HUD n'est qu'un renfort, et l'option *Rhythm Assist* ajoute une barre de battement en bas d'écran
  pour ceux qui en ont besoin. Modèle exemplaire d'accessibilité rythmique.
- **Celeste / Hollow Knight** — HUD qui s'estompe quand il ne se passe rien.

Sources consultées :
[Game UI Database — Hades](https://www.gameuidatabase.com/gameData.php?id=534) ·
[HUD Redesign for Supergiant's Hades](https://medium.com/@bramhadalvi/hud-redesign-fdc332d05291) ·
[How Hades Creates a Responsive Underworld](https://medium.com/@Nat.Rowley/how-hades-creates-a-responsive-underworld-915715a7c2a) ·
[Damage Number Readability UI Design Guide](https://gameengine.7colorsgame.com/en/articles/game-engine-damage-number-readability-guide/) ·
[Damage Numbers: Turning Abstract Stats into Satisfying Feedback](https://www.gamejuice.co.uk/articles/damage-numbers-satisfying-feedback) ·
[Lessons from Suzy Cube: Mobile Controls That Feel Great](https://www.gamedeveloper.com/design/lessons-from-suzy-cube-mobile-controls-that-feel-great) ·
[A designer's guide to building touch controls (Microsoft GDK)](https://learn.microsoft.com/en-us/gaming/gdk/docs/features/common/game-streaming/building-touch-layouts/game-streaming-tak-designers-guide) ·
[The ingenious accessibility of Hi-Fi RUSH](https://thetacomaledger.com/2023/02/27/the-ingenious-accessibility-of-hi-fi-rush/) ·
[Hi-Fi Rush drops the beat, and an accessibility guide!](https://caniplaythat.com/2023/01/25/hi-fi-rush-drops-the-beat-and-an-accessibility-guide/)

## Annexe — Captures de référence

| Capture | Ce qu'elle démontre |
|---|---|
| `01_salle1_debut.png` | deux bandeaux identiques superposés ; débordement du cartouche central ; « Niveau 1 » hors de sa boîte |
| `Z2_haut_centre.png` | gros plan du débordement de texte (537 px de texte dans une boîte de 400 px) |
| `Z6_pv_critiques.png` | 16/203 PV : la barre est quasi vide et **rien** ne l'annonce ; la barre d'XP est plus remplie |
| `06_salle3.png` | deux bandeaux qui se chevauchent (« Bottes de facteur » + « Vague 2 ») |
| `10_salle5_boss_combat.png` | `TEMPO ×7` deux fois **et** `SÉRIE ×5` en même temps ; barre de boss collée au cartouche d'arme |
| `18_bandeaux_toasts.png` | le pire cas : 5 messages sur l'axe central, entre le joueur et les ennemis |
| `14_salle7.png` | le métronome, cœur du jeu, réduit à 4 points de 4 px |
| `Z9_greffes_bas.png` | 8 pastilles de texte 11 px illisibles en bas à droite |
| `ZA_skill_recharge.png` | l'anneau de recharge de compétence, indiscernable du fond |
| `M3_salle1_combat.png` | mobile : HUD non ancré à l'écran, bouton TIR par-dessus l'aire de jeu |
| `M4_boss.png` | mobile : les trois compteurs de série simultanés + chiffre de dégât illisible sur le sprite |
| `16_pause.png` | curseurs et menu natifs du navigateur au milieu d'un jeu pixel-art |
| `28_mort_ecran.png` | l'écran de mort en tableau comptable, sans bouton « Rejouer » |
| `17_montee_niveau.png` | quatre pavés de texte sans icône, catégories en anglais |
