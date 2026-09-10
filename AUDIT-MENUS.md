# WAY — audit des menus

Direction artistique / UX, sans complaisance.
Audit fait sur le **rendu réel** (Chromium via `dev/test/lib.js`), en 1280×720 et en 900×420 tactile,
en mode Normal (profil neuf, 0 crédit) **et** en mode Test (tout débloqué).
Captures : `audit_menus/shots/` · dumps texte : `audit_menus/texte_*.txt` · scripts : `capture.js`, `menu.js`, `coffre.js`, `probe.js`, `probe2.js`.
Aucun fichier du dépôt n'a été modifié. État audité : commit `3fe6604` + modifications de travail en cours (un « chantier 6 » touchait la prépa pendant l'audit ; les chiffres ci-dessous valent pour ce que j'ai vu à l'écran).

---

## 1. Verdict global (5 lignes)

1. **L'écran-titre est excellent** — un ami comprend immédiatement quoi faire : cinq lignes numérotées, une seule mise en avant. C'est le seul écran du jeu qui applique une hiérarchie. Le reste devrait lui ressembler.
2. **Le hub, lui, submerge** : 857 mots, 23 cartes, 3 colonnes qui défilent séparément (la 3ᵉ fait 1 893 px pour 606 px visibles) et **deux onglets sur cinq sont physiquement hors cadre** en 1280×720. Un ami trouve « JOUER » et clique dessus — tant mieux, c'est la bonne action — mais il ne comprend ni ce qu'il achète, ni ce qu'il choisit.
3. **Le compagnon — le cœur affectif du jeu (Uno, Choupi & Tanuki, ORI) — est invisible.** Il est caché dans le 3ᵉ onglet d'une **boutique**, un profil neuf démarre sans compagnon, et le hub affiche froidement « Compagnon : aucun ». Le meilleur argument du jeu est enterré sous un magasin.
4. **Le vocabulaire trahit le joueur** : « niveau » désigne à la fois le biome, la difficulté et le niveau d'XP ; « palier », « greffe », « calibration », « amélioration », « consigné », « réimpression », « sujet », « outillage disponible » cohabitent sans glossaire ; le jeu tutoie dans les titres et vouvoie dans les descriptions ; et on lit « 95 DPS », « 210 px », « 4 ticks/s », « Cooldown », « offense · max 3 » en anglais dans un jeu français.
5. **Sur téléphone c'est illisible, littéralement** : le texte courant du hub est calculé à **6,8 px** et les étiquettes à **5,6 px** ; les onglets font 121×29 px de zone tactile (le minimum recommandé est 44×44). La prépa, elle, est presque bonne — c'est le seul écran à sauver tel quel dans son principe.

**Ce qu'un ami comprend en 30 secondes** : qu'il joue un personnage, qu'il y a des salles, et qu'un gros bouton orange lance la partie.
**Ce qu'il ne comprend pas** : qu'il peut prendre un chien, que « niveau 1 » n'est pas son niveau d'XP, que les crédits sont perdus s'il meurt avant la salle 4, que « greffe » = amélioration, et pourquoi la boutique lui propose 16 lignes de chiffres alors qu'il a ◈ 0.

---

## 2. Écran par écran

### 2.1 Hub — colonne 1 « Personnage » — **5/10**

![](shots/desk_01_hub_passifs.png)

**Ce qui marche**
- La pastille numérotée `1` + titre + sous-titre (« Qui tu envoies dans les salles ») : bon principe, à généraliser.
- Le portrait animé du personnage est la meilleure image de tout le menu. Il est trop petit (≈ 96 px de côté).
- Le liseré vert en haut de colonne code la couleur du personnage. Cohérent avec `.card.char.selected`.

**Ce qui ne marche pas**
- **Redondance** : la carte du haut décrit Martin, puis « Changer de personnage » redécrit Martin en dessous (« Martin ✓ Actif · Bonne constitution · PV 100 · vit. 260 »). On lit deux fois la même chose à 300 px d'écart.
- **Les trois personnages ont les mêmes chiffres visibles** : « PV 100 · vit. 260 » pour Martin, Gabriel et Jean. La seule différence lisible est le nom du trait. Le comparateur ne compare rien.
- **La ligne « Tenue »** — « Tenue : aucune. "Vous êtes venu comme ça ?" Elle viendra avec les greffes : 3 pour des vêtements, 6 pour l'armure, 9 pour le casque » — est une note de développement dans une interface de choix. 30 mots pour une info non actionnable, en 10,9 px.
- **« 0 calibration(s) »** : mot inventé, chiffre nul, parenthèses de pluriel. Trois fautes d'UX en trois mots.
- **La ligne « Compagnon : aucun »** est le seul endroit où le compagnon existe dans cette colonne — en gris, en 10,9 px, non cliquable. C'est un cul-de-sac : l'information est là, l'action est trois colonnes plus loin.
- **Vouvoiement/tutoiement mélangés** : « Qui **tu** envoies » (colonne) vs « **Il** encaisse et repart » vs, dans la boutique, « Comment **vous** l'emmenez ».
- Colonne non défilante en 1280×720 (606/606) : Jean tombe pile en bas de fenêtre. En 1366×768 ou sur un portable 13", ça bascule.

### 2.2 Hub — compagnon — **2/10** (le point noir de tout le jeu)

![](shots/desk_02_hub_animaux.png)

**Ce qui marche**
- Les vignettes de sprite (`.peticon`) en haut à droite des cartes animaux : c'est la seule iconographie du hub, et ça fonctionne.
- Le bloc « Équipes » dit une vraie chose intéressante (Martin + Uno = « Vieille complicité »).

**Ce qui ne marche pas — et c'est structurel**
- **Le choix du compagnon est dans la boutique.** Ce n'est pas un achat, c'est un choix d'équipement. Le mettre là dit au joueur : « ceci est optionnel et payant ». Faux dans les deux cas — les trois compagnons sont déjà débloqués sur un profil neuf.
- **Aucun compagnon par défaut** (`Meta.profile.pet = null`, `60_meta.js:23`). Le premier ami qui lance WAY joue seul, ne verra jamais Uno, et ne saura pas qu'il existe. C'est le contraire de ce que le jeu raconte.
- **Ordre de lecture absurde** dans l'onglet : (1) une note technique sur les élites, (2) le sélecteur de **mode** — alors qu'aucun compagnon n'est choisi, donc le sélecteur ne pilote rien, (3) le catalogue des paires, (4) « Aucun animal » (actif), (5) enfin les compagnons. Le joueur doit défiler pour arriver au seul choix qui compte.
- **« Comment vous l'emmenez »** : titre obscur. Et les trois modes sont trois boutons `.btn.small` de 5,6–8 px sans état visuel autre que la couleur de fond — impossible de dire d'un coup d'œil lequel est actif à cette taille.
- **Le mode « Personne » est un piège** : c'est le seul choix qui donne un bonus chiffré (+35 % PV, +20 % dégâts d'après `31_pets.js`, +25/+15 % d'après le test `compagnons`). Un joueur qui optimise abandonne le chien. Un joueur qui n'optimise pas ne comprend pas pourquoi il y a un bouton « Personne ». Aucun des deux n'est content.
- **Le bloc « Équipes » est un pavé de 90 mots** en `muted small` sur fond semi-transparent traversé par les explosions de l'écran d'attraction (voir 2.7). C'est le texte le moins lisible du jeu.
- Coût réel pour « jouer Gabriel avec ses chats » : **7 interactions** réparties sur 3 colonnes et 2 zones de défilement (carte Gabriel → onglet Compagnons → défiler → carte Choupi & Tanuki → mode → niveau → JOUER). Dans Hades on choisit une arme en 2 clics ; dans Vampire Survivors un personnage en 1.

### 2.3 Hub — colonne 2 « Mission » / biome — **6/10**

**Ce qui marche**
- La carte de niveau sélectionnée est la meilleure carte du jeu : `NIVEAU 1 · ADMISSION`, étiquettes difficulté/état, pitch en une phrase, liste bonus/malus. Le repli des détails sur les cartes non sélectionnées (`.card.level:not(.selected) .pairs{display:none}`) est une bonne idée de divulgation progressive.
- Le CTA collant en bas (`position:sticky`) avec le nom du niveau dedans : très bien.

**Ce qui ne marche pas**
- **« Niveau » veut dire trois choses** : le biome (« Niveau 1 · Admission »), le niveau d'XP (« Niveau 38 » à la montée de niveau, « avec le personnage au niveau » en prépa), et la difficulté. Et le jeu utilise ailleurs **« palier »** pour la même chose que « niveau-biome » (« Palier terminé », « Prime de fin de palier », « Neuf salles par palier »). C'est le problème de vocabulaire numéro un.
- **Les paires bonus/malus ne sont pas lisibles comme des paires** : colonne gauche alignée à gauche, colonne droite alignée à droite, drapeau ragged au milieu → on lit deux listes, pas trois paires. Et on n'a que les **noms** (« + Stimulant / − Sol instable »), jamais l'effet. Information inutilisable au moment du choix.
- **La difficulté en `★☆☆☆☆` dans une `.tag` de 9,8 px gris** : le signal le plus important de l'écran est le plus petit et le moins contrasté.
- **Les niveaux verrouillés occupent autant de place que le niveau jouable.** Trois cartes complètes (description + condition) pour du contenu inaccessible. Résultat : la colonne défile (759 px pour 606 px) et le seul niveau jouable partage l'affiche avec trois refus.
- Défilement sans indicateur : quand on descend, l'en-tête `2 MISSION` disparaît et on se retrouve devant un paragraphe orphelin (`shots/desk_04_hub_niveaux_bas.png`).
- Le CTA porte deux niveaux de texte (`JOUER — Niveau 1 · ADMISSION` + « Ensuite : choix de l'arme et de la compétence, puis salle 1 »). La ligne du dessous est bonne, mais elle est en `#0b0d14` à 80 % d'opacité sur un dégradé or — le seul texte du jeu qui souffre vraiment du contraste.

### 2.4 Hub — boutique — **3/10**

**Ce qui marche**
- Les paliers en pastilles `●●○○` : lisible d'un coup d'œil, bon choix.
- Les boutons d'achat désactivés quand on n'a pas les crédits : correct.

**Ce qui ne marche pas**
- **Bug bloquant : deux onglets sur cinq sont hors cadre.** `.tabs{display:flex}` sans `overflow-x` dans un conteneur de 390 px alors que la barre en fait 555. Mesuré : « Personnages » (bord droit à 462 px) et « Fragments » (569 px) sont invisibles et inatteignables en 1280×720 comme en 900×420. **Une partie du contenu du jeu est inaccessible à la souris.**
- **Bug d'étiquette : l'onglet « Personnages » affiche les compétences.** `50_ui.js` mappe `sujets: 'Personnages'` mais `renderShop` remplit cet onglet avec `Content.skills()`. Les personnages, eux, s'achètent dans la colonne 1. Deux mensonges pour le prix d'un.
- **Le compteur de crédits est illisible à 0.** En Silkscreen 21 px doré sur fond quasi noir, `◈ 0` se lit comme deux petits carrés (`shots/crop_coins.png`). Le premier écran de boutique que voit un ami lui annonce une somme qu'il ne sait pas lire.
- **La densité est indéfendable** : 487 mots dans une colonne de 390 px, 1 893 px de hauteur de défilement, sans barre visible ni indicateur de fin. Chaque carte « Amélioration » empile nom + pastilles + description + **les quatre paliers détaillés en 10,9 px** (`1: PV max +10 · 2: PV max +10 · 3: PV max +15 · 4: PV max +15`) alors qu'un seul palier est achetable.
- **Vocabulaire** : l'onglet dit « Améliorations », les cartes disent « Calibration maximale », la colonne 1 dit « calibration(s) », le level-up dit « greffe ». Quatre mots, une notion.
- **Onglet Armes** : « Outillage disponible » pour dire « tu l'as déjà ». Et les descriptions sont des fiches techniques : « 3,4 coups/s, recul renforcé. Sûre, sans portée. (95 DPS) », « 10 ticks/s de 6 dégâts », « 48 DPS spam, 72 DPS chargé ». DPS, ticks, spam : trois anglicismes de développeur dans un jeu francophone destiné à des amis.
- **Onglet Fragments** : cinq « Document scellé » identiques, et la seule ligne de statistiques du jeu (« Runs : 0 · victoires : 0 · **réimpressions** : 0 ») utilise un mot que personne ne peut décoder (= morts).

### 2.5 Prépa — arme — **7/10** · compétence — **6/10**

![](shots/test_05_prep.png)

**Ce qui marche** (c'est le meilleur écran de jeu du lot)
- **Structure en étapes numérotées avec liseré de couleur** (cyan pour l'arme, violet pour la compétence), état `done`/`todo`, halo sur l'étape à faire : exactement la bonne idée.
- **Le bouton final porte le résumé de la décision** : « Entrer en salle 1 avec Lame d'essai et Dilatation ». Excellent. Et il est désactivé avec un libellé qui dit pourquoi (« Choisis une compétence pour entrer »).
- La ligne de synthèse « Lame d'essai + Dilatation », les puces bonus/malus en haut, le `<details>` replié pour le trait et les calibrations : bonne divulgation progressive.

**Ce qui ne marche pas**
- **Le trou à gauche.** `.cards{justify-content:center}` : avec 2 cartes dans une bande large, la moitié gauche de chaque étape est vide, sous le numéro. Visuellement, l'écran a l'air cassé (voir `desk_05_prep.png` et `mob_05_prep.png`). Correctif d'une ligne : `justify-content:flex-start` (ou `display:grid` en colonnes fixes).
- **Redondance systématique** : l'étiquette dit « recharge 9 s », la description finit par « Cooldown 9 s. » L'information est donnée deux fois, dont une en anglais.
- **Unités moteur exposées** : « 250 px », « 210 px », « 280 px », « portée 170 px ». Un joueur ne sait pas ce qu'est un pixel de jeu. Il faut des repères humains : « une demi-salle », « à bout portant », « toute la pièce ».
- **Zéro image.** Huit armes, huit pavés de texte gris identiques. Aucun sprite, aucune silhouette, aucun pictogramme de portée. Or les sprites d'armes **existent** dans le jeu.
- **Asymétrie 8 armes / 2 compétences** : la grille d'armes fait 2 rangées de 4, la compétence 2 cartes centrées. Le déséquilibre visuel suggère que l'arme compte 4× plus que la compétence.
- **Le tirage aléatoire n'est pas annoncé.** `r.skillChoices` propose 2 compétences sur 8 ; rien ne dit au joueur que le tirage change à chaque run, ni qu'il existe 8 compétences (il faut aller dans l'onglet mal nommé « Personnages » de la boutique pour le savoir). Un joueur croit qu'il n'y a que deux compétences dans le jeu.
- L'étiquette de famille est en **anglais et en majuscules** : `BLADE`, `HAMMER`, `BOW`, `PISTOL`, `BOOMERANG`, `ORB`, `CHAIN`, `FLAME`.
- Le bandeau `MODE TEST` avec ses deux `<select>` est au milieu du chemin entre le résumé et le bouton d'entrée. À reléguer au bord de l'écran.

### 2.6 Montée de niveau — **6/10** · Coffre — **5/10**

![](shots/desk_09_levelup.png) ![](shots/13_coffre_reel.png)

**Ce qui marche**
- Le format « 3 cartes, un raccourci clavier par carte » est le standard du genre et il est correctement implémenté (chiffre 1-3 en haut à droite, sélection au clavier).
- Le halo de rareté par variable CSS (`--rc`/`--rg`) est propre, et l'animation `pulse` sur `r-colossal` est une bonne récompense.
- Le panneau est petit et centré : le jeu reste visible derrière. Bon choix.

**Ce qui ne marche pas**
- **Les catégories sont en anglais et en minuscules** : `offense · max 3`, `defense · max 4`, `mobility`, `economy`, `special`. Dans un jeu entièrement français. C'est la sortie de `u.category` telle quelle.
- **« Cooldown », « dash », « pickups »** dans les descriptions de greffes (« -6 % de cooldown de compétence », « Chaque dash laisse une traînée », « Tous les pickups viennent à vous »).
- **La rareté ne se voit pas assez.** COMMUN gris et RARE bleu sont à 90 % identiques à 1 m d'écran : même taille de carte, même épaisseur de bordure, même typo. Seul COLOSSAL se distingue. Chez Hades, la rareté change la couleur **du fond** de la carte et ajoute un ruban ; chez Slay the Spire, la rareté change le cadre entier de la carte.
- **Le sous-titre du coffre est du charabia** : « SALLES 1-1 · QUALITÉ 100 % · SANS DÉGÂT : COLOSSAL GARANTI ». Trois notions non expliquées (fenêtre de salles, score de qualité, garantie) en 11 px capitales espacées.
- **« Réserve de greffes »** : personne ne devine que c'est un coffre à améliorations.
- **Aucun feedback de file d'attente.** J'ai déclenché plusieurs montées de niveau d'affilée : rien n'indique « 2 choix restants ». Le joueur clique et un nouveau panneau identique réapparaît — on croit à un bug.
- **Aucune icône.** Là encore : que du texte. Vampire Survivors et Brotato posent une icône 32×32 par choix et rendent l'écran lisible en 300 ms.
- **Rien ne rappelle ce qu'on a déjà.** Le code sait afficher « possédé ×N » mais la liste des greffes en cours n'est visible que dans le menu Pause. Au moment de choisir une synergie, c'est là qu'il la faut.

### 2.7 Fond animé du hub (`57_attract.js`) — **3/10** en tant que choix d'UI

L'idée est sympathique (le vrai moteur qui joue tout seul derrière le menu, comme les écrans d'attraction d'arcade). L'exécution sabote la lisibilité :
- Les colonnes sont à **62 % d'opacité** (`.hubcol{background:rgba(8,10,18,.62)}`). Une explosion, un flash de tir ou le grand « X » rouge d'un piège passent **à travers le texte** : c'est visible sur `desk_02_hub_armes.png` et `desk_02_hub_animaux.png`, où le X rouge barre trois cartes de boutique.
- Le contraste calculé sur fond fixe est bon (texte gris `#9aa4c4` sur `#0d1018` = 7,7:1), mais il **tombe sous 4,5:1** dès qu'un effet clair passe derrière. Un contraste qui varie dans le temps est pire qu'un contraste faible : l'œil se refixe en permanence.
- Verdict : garder l'attraction **derrière l'écran-titre** (où elle est superbe et où il n'y a presque pas de texte), la figer ou la voiler à 90 % derrière le hub.

### 2.8 Écran de fin — **4/10**

![](shots/desk_12_fin.png)

**Ce qui marche**
- Un tableau à deux colonnes, un bouton primaire évident, une phrase d'ambiance.
- « Copier le rapport » : très bonne idée pour un jeu distribué à des amis.

**Ce qui ne marche pas**
- **Une ligne fausse.** « Crédits en attente conservés (**10 % de 0**) ◈ **40** ». Le libellé calcule un pourcentage d'un montant, mais `Progression.coinsKeptOnDeath` (`20_progression.js:257`) renvoie `deathBonus.base + deathBonus.perRoom * salle + pending × frac` — une prime forfaitaire que le libellé n'évoque pas. Résultat affiché : 10 % de 0 = 40. Le joueur qui lit attentivement conclut que le jeu compte mal.
- **« Salles : — »** : la ligne la plus intéressante (temps et coups par salle) est vide à la mort et, quand elle est remplie, elle affiche `S1 12s 3 coup(s) q87` — du log, pas un bilan.
- **Aucune progression visible.** Rien ne dit « tu es allé plus loin que la dernière fois », rien ne dit ce que les 40 crédits permettent d'acheter, rien ne propose de **rejouer immédiatement**. Le seul bouton primaire renvoie au hub, c'est-à-dire au mur de texte. C'est exactement l'inverse de la boucle de Hades (« mort → une phrase → une amélioration → relance immédiate ») et de Dead Cells.
- « Ennemis neutralisés », « Crédits consignés (salle 4) », « Dégâts subis / coups » : administratif. Un écran de mort doit donner envie, pas rendre des comptes.

### 2.9 Tactile / mobile (900×420) — **2/10**

![](shots/mob_01_hub_passifs.png)

- **Tailles de texte mesurées** (`--ui-scale = 0,583`) : base d'écran **8,7 px**, texte `muted tiny` **6,8 px**, `.tag` **5,6 px**, état de carte **6,4 px**. C'est en dessous de tout seuil de lisibilité (le plancher habituel est 12 px, la recommandation mobile 16 px).
- **Cibles tactiles** : onglets 121×29 px, la plupart des lignes cliquables à 20 px de haut. Minimum Apple HIG : 44×44 pt ; Material : 48×48 dp.
- **Le layout à 3 colonnes est conservé sur 900 px.** La carte de niveau tombe à ~230 px : « NIVEAU 1 » passe à la ligne, « LA SERRE » se coupe en deux, la colonne 1 est tronquée (Jean hors écran), et la moitié droite de la colonne centrale est **vide** pendant que la colonne 3 déborde de 1 388 px.
- **Les onglets 4 et 5 restent inatteignables**, sans même la possibilité d'un défilement horizontal au doigt fiable.
- La prépa, elle, tient : c'est le seul écran utilisable au doigt (mais avec le même trou à gauche).

### 2.10 Écran-titre — **9/10** (référence interne)

![](shots/00_menu.png)

Numérotation `01…04`, une seule entrée dorée, sous-titres d'une ligne, pied de page avec les commandes, fond animé qui respire avec la musique. **C'est la grammaire visuelle que le hub devrait reprendre telle quelle.** Deux détails : « PHASE 2 » dans le bandeau est du jargon de développement, et le pied affiche « 0 case(s) 9 cochée(s) » — chaîne mal formée.

---

## 3. Propositions, classées par impact / effort

Notation : **I** = impact perçu (1-5), **E** = effort (1-5).

### 3.A — Correctifs à faire ce soir (I 4-5 / E 1)

| # | Correctif | Fichier |
|---|---|---|
| 1 | `.tabs{flex-wrap:wrap}` **ou** `overflow-x:auto;scrollbar-width:none` + `flex:0 0 auto` sur `.tab` → les 5 onglets deviennent atteignables. | `dev/style.css:53` |
| 2 | Renommer l'onglet `sujets` en **« Compétences »** (il liste `Content.skills()`). | `dev/50_ui.js:456` |
| 3 | `.prepstep .cards{justify-content:flex-start}` → le trou à gauche de la prépa disparaît. | `dev/style.css` |
| 4 | Corriger le libellé de fin : « Crédits en attente conservés (10 % de 0) » → **« Butin ramené (prime + part des crédits en attente) »**. | `dev/50_ui.js` (`showEnd`) |
| 5 | Opacité des colonnes du hub `.62` → **`.93`** et `Attract` en pause pendant le hub (ou son alpha global à 0,25). | `dev/style.css:179`, `dev/57_attract.js` |
| 6 | Planchers de taille : `#ui .screen{font-size:max(13px, calc(14px*var(--ui-scale)))}`, `.tiny{font-size:max(11px,.78em)}`, `.tag{font-size:max(11px,.7em)}`. Rend le mobile lisible sans rien redessiner. | `dev/style.css:1,7` |
| 7 | Traduire les catégories de greffes : `offense→Attaque`, `defense→Défense`, `mobility→Mobilité`, `economy→Butin`, `special→Spécial`, et capitaliser. | `dev/50_ui.js` (`cardHtml`) |
| 8 | Chercher-remplacer dans les contenus : `Cooldown`→`Recharge`, `dash`→`ruée`, `pickups`→`ramassables`, `DPS`→supprimer, `ticks/s`→`coups/s`, `spam`→`en continu`, `X px`→repère verbal. | `dev/content*.js` |
| 9 | Supprimer la ligne « Tenue : aucune… » et « 0 calibration(s) » de la colonne 1. | `dev/50_ui.js:432` |
| 10 | `Meta.profile.pet` par défaut = le compagnon du personnage par défaut (Uno pour Martin) au lieu de `null`. | `dev/60_meta.js:23` |

À eux seuls, ces dix points font passer le hub de 4/10 à ~6,5/10 sans toucher à l'architecture.

### 3.B — Refonte du hub : « QUI ? → AVEC QUI ? → OÙ ? → PARTIR » (I 5 / E 3)

Le hub d'aujourd'hui mélange **trois activités** dans trois colonnes de même poids : équiper (personnage), décider (niveau), acheter (boutique). Or ce sont trois moments différents. La boutique n'est pas un choix de run : c'est de la méta-progression, on y va **entre** deux runs, et une seule fois sur trois.

**Principe : une seule carte d'équipe, plein cadre, et la boutique devient un écran séparé accessible par un bouton.**
C'est le modèle de la sélection de Hades II (le miroir est un écran à part, la salle de départ n'affiche que l'arme et l'objet du jour), de Dead Cells (l'antre du Collecteur est séparé du départ de run), et de Slay the Spire (personnage → ascension → carte, un écran par question).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  WAY · CAMP DE BASE                       ◈ 1 240 crédits      [Boutique] [☰] │  56 px
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ①  QUI PART ?                     ②  AVEC QUI ?                            │
│   ┌───────┐┌───────┐┌───────┐       ┌───────┐┌───────┐┌───────┐┌───────┐     │
│   │ ▓▓▓▓▓ ││ ▓▓▓▓▓ ││ ▓▓▓▓▓ │       │  🐕   ││ 🐈🐈  ││  ◉    ││   —   │     │
│   │MARTIN ││GABRIEL││ JEAN  │       │  UNO  ││CHOUPI ││  ORI  ││ SEUL  │     │
│   │ ✓     ││       ││       │       │  ✓    ││&TANUKI││       ││ +35%PV│     │
│   └───────┘└───────┘└───────┘       └───────┘└───────┘└───────┘└───────┘     │
│    ↑ 160×200, portrait animé 128px   ↑ 140×170, sprite animé 64px             │
│                                                                              │
│   ┌────────────────────────────────────────────────────────────────────┐     │
│   │  MARTIN + UNO  ·  « VIEILLE COMPLICITÉ »              ★ ÉQUIPE      │     │  bandeau
│   │  Uno mord 30 % plus fort · Martin court 8 % plus vite               │     │  doré,
│   │  Bonne constitution : +10 % PV en début de salle, +15 % d'XP        │     │  72 px
│   │  PV 100   ██████████░░  Vitesse 260  ████████░░░░  Chance 2  ██░░   │     │
│   │  Uno reste avec vous  [ Tout le temps ▾ ]                           │     │
│   └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│   ③  OÙ ?                                                                    │
│   ┌──────────────┐┌──────────────┐┌── 🔒 ─────────┐┌── 🔒 ─────────┐         │
│   │ 1 ADMISSION  ││ 2 LA SERRE   ││ 3 LA CONCESS. ││ 4 LE SÉRAIL   │         │
│   │ ★☆☆☆☆  ✓×3   ││ ★★☆☆☆  neuf  ││ finis le 2    ││ finis le 3    │         │
│   │ Un hôpital…  ││ Une serre…   ││               ││               │         │
│   └──────────────┘└──────────────┘└──────────────┘└──────────────┘           │
│                                                                              │
│              ┌──────────────────────────────────────────┐                    │
│              │  ▶  PARTIR — ADMISSION, 9 SALLES         │  ← 420×72, or       │
│              │     Martin + Uno · arme et compétence    │                    │
│              └──────────────────────────────────────────┘                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Spécifications précises**

- **Grille** : `grid-template-rows: 56px auto auto 1fr auto`, largeur max 1120 px centrée, gouttière 24 px. Une seule zone défilante (le corps), jamais trois.
- **Cartes personnage** : 160×200 px, portrait animé 128 px (au lieu de 96), nom en Pixelify Sans 20 px, **rien d'autre**. Le détail va dans le bandeau du dessous, qui change à la sélection.
- **Cartes compagnon** : 140×170 px, sprite animé 64 px sur fond vignetté. La 4ᵉ carte est **« SEUL »** — même taille, même traitement, avec son bonus écrit dessus. Le mode « aucun compagnon » devient un choix d'équipe assumé, pas un bouton caché.
- **Bandeau d'équipe** (le cœur de la refonte) : c'est la « carte d'équipe » unique. Il fusionne ce qui est aujourd'hui éparpillé sur trois colonnes — trait du personnage, stats, nom de l'attelage, mode du compagnon. Fond `linear-gradient(90deg, rgba(255,209,102,.10), transparent)`, bordure or 1 px quand l'attelage est reconnu (« Vieille complicité »), bordure `--line` sinon. Le sélecteur de mode devient un `<select>` **dans** ce bandeau : il n'apparaît que si un compagnon est choisi, et il est enfin à côté de ce qu'il pilote.
- **Barres de stats** au lieu de nombres : `PV 100 ██████████░░`. Trois personnages à « PV 100 · vit. 260 » ne se comparent pas ; trois barres, si — et ça rend les différences futures visibles gratuitement.
- **Cartes niveau** : 4 en ligne, 250×150 px. Les verrouillées passent à **50 % de largeur, grisées, une seule ligne de condition**. On ne consacre pas la même surface à ce qu'on ne peut pas jouer (principe repris de la sélection d'armes de Hades : les armes non débloquées sont des silhouettes minuscules).
- **Bonus/malus** : sortis de la carte, affichés en une ligne sous la sélection : `Au départ : 1 bonus + 1 malus tirés au sort` + une rangée de 3 puces `Stimulant ⇄ Sol instable`, avec l'effet **au survol / au toucher long**. Un tiret cadratin `⇄` entre les deux membres rend la paire lisible comme paire.
- **CTA** : 420×72 px, or, deux lignes, avec le récapitulatif complet de l'équipe. Le libellé change avec la sélection.
- **Boutique** : bouton en en-tête, ouvre un **écran plein** (overlay `#screen-shop`), avec pastille `●` sur le bouton quand quelque chose est achetable maintenant. Le hub perd 487 mots d'un coup.

**Textes à réécrire** (proposition ferme)

| Actuel | Proposé |
|---|---|
| `Ton camp de base` | `Camp de base` |
| `1 Personnage / Qui tu envoies dans les salles` | `① Qui part ?` |
| `Changer de personnage` | *(supprimé — les cartes suffisent)* |
| `Comment vous l'emmenez` | `Uno reste avec vous : [Tout le temps / Sur appel (C) / Il reste au camp]` |
| `Aucun animal — La case reste vide.` | `Partir seul — vous gardez sa part : +35 % PV, +20 % dégâts` |
| `2 Mission / Où tu vas : choisis un niveau, puis JOUER` | `③ Où ?` |
| `Niveau 1 · ADMISSION` | `Palier 1 — Admission` *(et « niveau » réservé au niveau d'XP, partout)* |
| `Difficulté ★☆☆☆☆` | `Difficulté ★☆☆☆☆` en 14 px, couleur `--gold`, hors `.tag` |
| `Jamais terminé` / `Terminé 3×` | `Jamais fini` / `Fini 3 fois` |
| `Boutique / Dépense tes crédits entre deux runs` | `Boutique — améliore ton camp` |
| `Améliorations` / `calibration(s)` / `greffe` | **un seul mot** : `amélioration` (permanente, boutique) vs `trouvaille` (dans la run) |
| `Outillage disponible` | `Déjà à toi` |
| `Réimpressions` | `Morts` |
| `Palier scellé.` (toast) | `Finis d'abord le palier 1.` |
| `Crédits consignés` | `Crédits en banque` |
| `Crédits en attente` | `Crédits non ramenés` |

### 3.C — Refonte de la prépa (I 4 / E 2)

La prépa est déjà bonne : ne la refais pas, **rends-la visuelle et symétrique**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PALIER 1 · ADMISSION            MARTIN + UNO            [ Retour ]      │
│  Départ : ⊕ Surcharge +25 % dégâts    ⊖ Fragile −25 % PV max            │
├─────────────────────────────────────────────────────────────────────────┤
│ ①  TON ARME            clic gauche, en continu                          │
│ ┌─────────┐┌─────────┐┌─────────┐┌─────────┐                            │
│ │  ⚔ 64px ││  🔨     ││  🏹     ││  🔫     │  ← grille 4 col, 190×150   │
│ │ Lame    ││ Masse   ││ Arc     ││ Pistolet│    sprite d'arme 64 px     │
│ │ ▰▰▰▰░ ⚡ ││ ▰▰░░░ 💥││ ▰▰▰░░ ⌖ ││ ▰▰▰░░ ↺│    3 jauges + 1 icône      │
│ └─────────┘└─────────┘└─────────┘└─────────┘                            │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ LAME D'ESSAI — mêlée · arc de 125° devant toi                     │  │  panneau
│  │ Dégâts ▰▰▰▱▱   Cadence ▰▰▰▰▱   Portée ▰▱▱▱▱                       │  │  de détail
│  │ Sûre et rapide, mais il faut être au contact.                     │  │  (survol/
│  └───────────────────────────────────────────────────────────────────┘  │  sélection)
├─────────────────────────────────────────────────────────────────────────┤
│ ②  TA COMPÉTENCE       clic droit / Espace   ·  2 tirées au sort sur 8  │
│ ┌───────────────────────┐┌───────────────────────┐                      │
│ │ ⏱ ONDE DE CHOC   9 s  ││ ⏳ DILATATION   16 s   │  ← 300×110, centrées│
│ │ Repousse et étourdit  ││ Le monde ralentit…    │                      │
│ └───────────────────────┘└───────────────────────┘                      │
├─────────────────────────────────────────────────────────────────────────┤
│        ┌────────────────────────────────────────────────┐               │
│        │ ▶ ENTRER — Lame d'essai + Onde de choc         │               │
│        └────────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Sprites d'armes** : `Sprites.propCanvas(w.sprite, 64)` existe déjà (il est utilisé pour `.peticon`). Zéro nouvel asset.
- **Trois jauges** (dégâts / cadence / portée) normalisées sur le catalogue, calculées depuis `w.damage`, `w.fireRate`, `w.range`. Elles remplacent « 3,4 coups/s · 95 DPS » : on compare huit armes d'un coup d'œil au lieu de lire huit paragraphes. C'est exactement ce que fait la fiche d'arme de *Enter the Gungeon* (Ammonomicon) et la fiche d'objet de *Risk of Rain 2*.
- **Le texte long descend dans un panneau de détail** sous la grille, qui ne montre **qu'une** arme à la fois. Divulgation progressive : 8 cartes courtes + 1 description longue, au lieu de 8 descriptions longues.
- **Dire le tirage** : « 2 compétences tirées au sort sur 8 » à côté du titre d'étape. Une phrase qui transforme une frustration en règle du jeu.
- **Symétrie** : `justify-content:flex-start` + `display:grid;grid-template-columns:repeat(auto-fill,190px)` pour les armes, et les 2 compétences en cartes larges centrées — la différence de forme devient volontaire au lieu d'accidentelle.
- **Mobile** : grille `repeat(auto-fill, minmax(140px,1fr))`, panneau de détail au-dessus du bouton, boutons ≥ 48 px.

### 3.D — Level-up et coffre (I 3 / E 2)

- **Une icône par carte** (48 px). Rien à dessiner : réutiliser une lettre/symbole par catégorie dans un rond coloré (`⚔ Attaque`, `🛡 Défense`, `👟 Mobilité`, `◈ Butin`, `✦ Spécial`) suffit à rendre l'écran lisible en un coup d'œil.
- **La rareté doit se voir de loin** : fond de carte teinté (`color-mix(in srgb, var(--rc) 12%, #0a0d18)`), bordure 2 px, et **ruban de rareté en haut de carte** pleine largeur au lieu d'un mot de 11 px. Modèle : les bénédictions de Hades (couleur du dieu + cadre de rareté), les cartes de Slay the Spire (le cadre change du bronze au doré).
- **Compteur de file** : « Montée de niveau — **choix 1 sur 3** ». Trois mots, et le joueur cesse de croire à un bug.
- **Rappel de l'existant** : une bande de pastilles en bas du panneau avec les greffes déjà prises (le code existe déjà dans le menu Pause : `.upglist .pill`). C'est là qu'on décide d'une synergie.
- **Titres** : `Réserve de greffes` → **« Coffre »**. Sous-titre du coffre → une seule phrase : « Traversée sans dégât : une trouvaille garantie de haut niveau. »

### 3.E — Écran de fin (I 3 / E 1)

- Deux chiffres, gros : **le palier atteint** et **les crédits ramenés**. Le reste dans un `<details>` « Détail de la partie ».
- Une ligne de progression : « Meilleure tentative : salle 6 · celle-ci : salle 4 ».
- **Deux boutons** : `▶ Repartir tout de suite (Martin + Uno, Admission)` en primaire, `Camp de base` en secondaire. C'est la relance immédiate de Hades / Dead Cells ; elle vaut plus que n'importe quel tableau de statistiques.
- Si un achat devient possible avec le butin : « Avec ◈ 240 tu peux enfin prendre **Vitalité 2** » + un bouton qui ouvre la boutique dessus.

### 3.F — Ce qu'on supprime, ce qu'on regroupe

**Supprimer** : la ligne « Tenue », « 0 calibration(s) », le bloc « Changer de personnage » (redondant), les 4 paliers détaillés sur chaque carte d'amélioration (ne montrer que le prochain), la description complète des niveaux verrouillés, l'onglet « Fragments » dans le hub (à déplacer dans le menu principal), les mentions `(95 DPS)`, la répétition « recharge 9 s » / « Cooldown 9 s. »
**Regrouper** : personnage + compagnon + mode + attelage dans **une** carte d'équipe ; boutique (5 onglets) dans **un** écran séparé ; toutes les statistiques de profil dans **un** encart du menu principal.
**Renommer** : voir le tableau en 3.B — un mot, une notion. C'est le chantier qui coûte le moins et rapporte le plus.

---

## 4. Plan en trois étapes pour un développeur

### Étape 1 — Une séance (2-3 h) : les correctifs CSS et de texte
**Fichiers** : `dev/style.css`, `dev/50_ui.js`, `dev/00_core.js` (STR), `dev/content*.js`, `dev/60_meta.js`, `dev/57_attract.js`.
1. `.tabs` défilables ou repliables (règle 3.A-1) — débloque deux onglets inaccessibles.
2. Onglet `sujets` renommé « Compétences ».
3. `.prepstep .cards{justify-content:flex-start}`.
4. Opacité des colonnes `.62 → .93` ; `Attract` mis en pause dans `showHub()`.
5. Planchers de taille de police (`max(13px, …)`) + `.tab`, `.card.mini`, `.btn.small` à `min-height:44px` sous `body.touch`.
6. Compteur de crédits : passer de Silkscreen à la police d'interface, 24 px, et écrire `1 240 crédits` en toutes lettres plutôt que `◈ 1 240`.
7. Passe de vocabulaire : `Cooldown/dash/pickups/DPS/ticks/spam/px`, catégories de greffes en français, `outillage disponible`, `réimpressions`, tutoiement partout.
8. Corriger le libellé « (10 % de 0) » de `showEnd`.
9. Supprimer « Tenue » et « calibration(s) ».
10. Compagnon par défaut non nul dans `60_meta.js`.
**Résultat attendu** : hub 4→6,5 ; prépa 7→8 ; mobile 2→5. Aucune régression de logique de jeu — ce sont des chaînes et du CSS.
**Vérification** : relancer `node dev/test/run.js` (les tests pilotent `#hub-enter`, `[data-s]`, `#prep-go` — aucun de ces sélecteurs ne bouge).

### Étape 2 — Refonte du hub (1 à 2 jours)
**Fichiers** : `dev/50_ui.js` (`showHub`, `renderShop` extraite dans un `showShop()` plein écran), `dev/style.css` (nouvelle grille `.hub3`), `dev/55_touch.js` (points d'arrêt), `dev/57_attract.js` (voile).
1. Extraire la boutique dans son propre écran (`screens.shop`), bouton dans l'en-tête + pastille « achetable ».
2. Réécrire `showHub` en trois blocs verticaux : cartes personnage / cartes compagnon (avec la carte « Seul ») / cartes palier, plus le **bandeau d'équipe** entre les deux premiers.
3. Déplacer le sélecteur de mode dans le bandeau d'équipe (visible seulement si un compagnon est choisi).
4. Barres de stats à la place des nombres bruts ; niveaux verrouillés en cartes réduites.
5. Points d'arrêt : `@media (max-width:900px)` → une colonne, cartes en rangées défilables horizontalement, CTA collant en bas.
6. Ne garder **qu'une** zone de défilement.
**Piège à éviter** : `showHub()` se ré-appelle à chaque clic et reconstruit tout l'`innerHTML` — la position de défilement est perdue à chaque sélection. Avec une seule zone de défilement, mémoriser et restaurer `scrollTop`, ou mieux : ne rafraîchir que les classes `selected` et le bandeau d'équipe au lieu de tout réécrire.

### Étape 3 — Refonte de la prépa et des écrans de choix (1 jour)
**Fichiers** : `dev/50_ui.js` (`showPrep`, `showChoice`, `cardHtml`, `showEnd`), `dev/style.css`, `dev/15_sprites.js` (réutilisation de `propCanvas`).
1. Grille d'armes avec sprite 64 px + trois jauges normalisées ; panneau de détail unique en dessous.
2. Mention du tirage aléatoire des compétences ; bandeau `MODE TEST` déplacé en pied d'écran.
3. `showChoice` : icône de catégorie, ruban de rareté, compteur « choix 1 sur 3 », bande des greffes déjà prises.
4. `showEnd` : deux chiffres, un `<details>`, bouton « Repartir tout de suite ».
5. Passe tactile finale : tout élément cliquable ≥ 44 px, test réel en 900×420 et en 390×844.

---

## 5. Références (ce que je reprends, et à qui)

- **Hades / Hades II** — la salle de départ ne pose **qu'une** question à la fois (quelle arme), et le miroir de la Nuit (méta-progression) est un **écran séparé** : c'est le modèle de 3.B, sortir la boutique du hub. Les bénédictions codent la rareté par la **couleur de fond et un cadre**, pas par un mot : modèle de 3.D. Écrans visibles sur [Game UI Database — Hades](https://www.gameuidatabase.com/gameData.php?id=534), [Hades II](https://www.gameuidatabase.com/gameData.php?id=2192) et [Interface In Game — Hades](https://interfaceingame.com/games/hades/).
- **Slay the Spire** — un écran = une question (personnage, puis ascension, puis carte). L'écran de récompense de cartes ne montre jamais tout : le détail vient au survol. Sa lisibilité tient au fait que « la lecture des cartes est immédiate » et que le détail est différé ([analyse UX](https://medium.com/@n01578837/final-deliverable-632cfc09e673), [Card Rewards](https://slay-the-spire.fandom.com/wiki/Card_Rewards)). C'est le principe du panneau de détail unique en 3.C.
- **Dead Cells** — l'écran de départ n'affiche que l'arme de départ et une mutation ; tout le reste (Collecteur) est ailleurs. Et la mort renvoie **directement** au départ suivant : modèle du bouton « Repartir tout de suite » en 3.E.
- **Vampire Survivors** — la sélection de personnage est une **grille d'icônes** : portrait + arme de départ + nom, rien d'autre ; les personnages non débloqués sont des **silhouettes** minuscules ([Characters](https://vampire.survivors.wiki/w/Characters)). C'est exactement le traitement proposé pour les paliers verrouillés et les cartes personnage/compagnon.
- **Brotato** — la sélection de personnage tient sur un écran, chaque personnage est une carte avec **son bonus et son malus écrits en deux lignes colorées** (vert/rouge, avec signe). Modèle du bandeau d'équipe et de la ligne bonus/malus des paliers ([comparatif](https://videochums.com/article/brotato-vs-vampire-survivors)).
- **Enter the Gungeon (Ammonomicon)** et **Risk of Rain 2** — la fiche d'arme/objet donne des **jauges relatives** (dégâts, cadence, portée) plutôt que des chiffres absolus. Modèle direct des trois jauges de 3.C.
- **Game UI Database** ([Character Select](https://www.gameuidatabase.com/index.php?scrn=41), [Item/Ability Selection](https://gameuidatabase.com/index.php?scrn=169)) — utile pour comparer une trentaine d'écrans de sélection avant de trancher.
- Un point où le genre entier est d'accord et où WAY s'écarte : **les menus de roguelite montrent des images et cachent le texte** ; WAY montre le texte et cache les images. Or les sprites existent déjà dans le dépôt.

---

## 6. Bibliothèques externes : ce que je recommande (et ce que je déconseille)

| Besoin | Bibliothèque | Poids / coût | Alternative sans bibliothèque | Mon avis |
|---|---|---|---|---|
| **Icônes** (catégories de greffes, armes, compétences) | [Lucide](https://lucide.dev) en SVG inline, ou les **Game Icons** de game-icons.net (déjà crédités dans `CREDITS.md`, CC BY 3.0) | 0 ko si on copie 15 SVG dans `dev/style.css` en `background-image:url("data:image/svg+xml,…")` ; ~40 ko si on prend le paquet | Un caractère Unicode dans un rond coloré (`⚔ 🛡 👟 ◈ ✦`) — 0 ko, rendu variable selon l'OS | **Copier 10-15 SVG à la main.** Pas de dépendance, cohérence garantie, et game-icons est déjà dans les crédits. |
| **Polices** | Les trois polices actuelles (Silkscreen, VT323, Pixelify Sans) sont déjà là | — | — | **N'en ajoute pas.** Le problème n'est pas le choix des polices, c'est que Silkscreen sert à afficher des **chiffres** (`◈ 0` illisible). Règle : Pixelify Sans pour les titres, Segoe UI/system pour tout ce qui se lit, **jamais de police pixel pour un nombre ou un texte < 16 px**. |
| **Animations** | [Motion One](https://motion.dev) (~5 ko gzip) ou GSAP (~25 ko) | 5-25 ko + une API à apprendre | `@keyframes` + `transition` — le jeu en a déjà (`fadeUp`, `sheen`, `pulse`) et elles sont bonnes | **Non.** Le hub n'a pas un problème d'animation, il a un problème de hiérarchie. Ajouter du mouvement aggraverait la lisibilité. |
| **Composants / CSS utilitaire** | Tailwind, Pico.css, Open Props | 10-300 ko, et une réécriture complète du CSS | Le fichier `style.css` fait 33 ko et est parfaitement structuré | **Non.** Aucun gain, gros risque de régression sur un CSS maison qui marche. |
| **Info-bulles** (détail d'une greffe au survol) | Floating UI (~10 ko) | 10 ko + du JS de positionnement | Le panneau de détail fixe proposé en 3.C : pas de positionnement flottant, pas de problème tactile | **Non — et c'est mieux ainsi** : une info-bulle au survol est inutilisable au doigt. Le panneau fixe marche partout. |
| **Barres / jauges** | — | — | `<div class="jauge"><i style="width:62%"></i></div>` : 4 lignes de CSS | **Sans bibliothèque.** |

**Conclusion sur les bibliothèques** : la seule qui vaille le détour est un **jeu d'icônes SVG copié à la main** (Lucide ou game-icons.net). Tout le reste du problème est un problème de mise en page, de vocabulaire et de tailles — aucune bibliothèque ne le résout.

---

## 7. Tableau de bord des notes

| Écran | Note | Verrou principal |
|---|---:|---|
| Écran-titre | 9/10 | rien (référence interne) |
| Prépa — arme | 7/10 | pas d'images, jargon DPS/px, trou à gauche |
| Hub — biome | 6/10 | « niveau » polysémique, verrouillés trop lourds |
| Level-up | 6/10 | catégories en anglais, rareté peu visible, pas de compteur de file |
| Prépa — compétence | 6/10 | tirage aléatoire non annoncé, redondance recharge/Cooldown |
| Hub — personnage | 5/10 | redondance, stats identiques, bruit textuel |
| Coffre | 5/10 | sous-titre incompréhensible, nom obscur |
| Écran de fin | 4/10 | une ligne fausse, aucune relance |
| Hub — boutique | 3/10 | **2 onglets sur 5 inaccessibles**, onglet mal nommé, 487 mots |
| Fond animé du hub | 3/10 | 62 % d'opacité : le jeu passe à travers le texte |
| Hub — compagnon | 2/10 | **le cœur du jeu enterré dans un magasin**, aucun par défaut |
| Tactile / mobile | 2/10 | texte à 6,8 px, cibles à 29 px, 3 colonnes sur 900 px |
| **Moyenne pondérée** | **≈ 4,5/10** | — |

**Une phrase pour finir** : WAY n'a pas un problème d'art, il a un problème de **quantité**. Le jeu est joli, l'écran-titre est excellent, les sprites sont là — mais les menus demandent au joueur de lire 857 mots avant de jouer, et enterrent la seule chose qu'un ami retiendra (le chien) derrière un onglet de boutique dont la moitié est hors écran. Supprime la moitié du texte, sors la boutique du hub, montre les compagnons en grand, et le jeu passe de « compliqué » à « évident » sans qu'une seule ligne de gameplay ne change.
