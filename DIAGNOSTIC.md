# WAY — diagnostic

Trois audits indépendants (gameplay, sprites, code), chacun ayant lu le dépôt, fait jouer des bots par script et mesuré lui-même. Consolidé en quatre listes. Chaque ligne porte son niveau — **Critique** (bloque le jeu ou trompe le joueur), **Haute** (se voit à chaque partie), **Moyenne** (se voit souvent), **Basse** (dette) — et son axe : `[Jeu]`, `[Sprites]`, `[Code]`. Tous les chiffres ont été mesurés sur le build du jour.

## Par où commencer

Huit choses, dans l'ordre. Les quatre premières sont des jours, pas des semaines.

1. **Rendre le mode Normal gagnable** au biome 1 (aujourd'hui 0 victoire sur 16 runs bot, mort en salle 1-5). Sans ça, personne ne voit la moitié du contenu.
2. **Dessiner la mort** : le clip existe pour trois personnages, et `Player.render` s'arrête dès `dead`. Une ligne et un délai de 0,9 s avant l'écran de fin.
3. **Portrait du hub** : passer `anim` — Martin s'y affiche en chevalier orange.
4. **Retirer le buff « Personne » quand un compagnon est ramassé** ; **exclure les orbes d'XP** du clip « ramasse » ; **garder F2 en mode test**. Trois lignes.
5. **Un score, un temps, une graine partagée** sur l'écran de fin. C'est un jeu entre amis qui ne permet pas de se comparer.
6. **Un `Run.reset()` unique** et un **descripteur de corps** `{sol, hauteur}` — deux familles de bugs (compagnon mal placé, arme/pieds/ombre décalés) sont rustinées à six endroits chacune.
7. **Migration de sauvegarde** avant tout changement de `v` : aujourd'hui un profil d'une autre version repart à zéro sans un mot.
8. **Rapatrier les tests** dans `dev/test/` : 161 scripts vivent dans un dossier de session que l'auteur ne peut pas relancer.

---

## À garder

- **[Haute] [Jeu]** Les quatre boss à signature — `quake` (Portier), `roots` (Serriste), `mines`+`duel` (Marshal), `sandstorm`+`mirage` (Vizir) dans `Boss.runPattern`, grosse attaque télégraphiée sur 2 mesures puis « À BOUT DE SOUFFLE » avec faiblesse ×1,6-1,8. C'est la seule chose qui distingue vraiment les quatre biomes et le seul endroit où le rythme se lit.
- **[Haute] [Jeu]** Le pipeline « Amis » — planches de Martin, Gabriel, Jean, des chats et du chien, équipes nommées (`CONTENT.pairs`). C'est l'argument du jeu ; tout le reste du contenu est remplaçable, pas ça.
- **[Haute] [Jeu]** Le compagnon qui attire les coups — Uno (`taunt: 230`, `hp: 90`, sonné 6 s, jamais mort) : dégâts subis 163-187 avec lui contre 247-465 sans (pistolet, seeds 41-42). Le seul bonus de compagnon qui se sent.
- **[Haute] [Sprites]** `framesOf` + `footOf` + affichage ×2 entier — 27 planches sur 31 sont à 7/9 images ; pieds de Martin, Gabriel, Jean au même pixel à ±2 px sur les 5 clips, hauteurs 88/86/88, grain uniforme. La seule partie de l'ancrage qui marche partout où elle est appliquée.
- **[Haute] [Sprites]** Coût du chemin planche — `drawBody`→`drawSheet` 5,5 µs par appel, 0 `getImageData` et 0 canvas créé en 2 s de jeu, un seul `flashCanvas`. Rien à optimiser ici.
- **[Haute] [Code]** Boucle à pas fixe et bot d'autoplay headless — 2 296 pas/s en headless (ratio sim/mur 38, 9 salles en 10,7 s), 0 global fuité pendant une run. C'est ce qui rend l'équilibrage testable ; ne pas y toucher.
- **[Haute] [Code]** Contenu déclaratif validé au boot — `Content.validate()` couvre armes, spawns, archétypes, kinds, raretés ; les 36 `effect:` déclarés ont tous une occurrence moteur.
- **[Moyenne] [Jeu]** Crédits à checkpoint (10 % par salle, consignation salles 4 et 8) — lisible sur l'écran de fin, punit sans annuler.
- **[Moyenne] [Jeu]** « Lumières coupées » et « Sol qui s'effondre » — les deux seuls défis qui changent la lecture de la salle ; les autres ne sont que des conditions de porte.
- **[Moyenne] [Jeu]** Le harness `__autoplay` et `levels.js` — 540 runs mesurées pour la passe 2, reproductibles par graine. Rare pour un jeu perso.
- **[Moyenne] [Code]** Caches de rendu — `floorCache` borné à 12, `Tempo.scoreAt` au demi-temps, `hitAround` en dichotomie. Rendu 0,23-0,71 ms, update 0,05-0,18 ms par pas hors défi.
- **[Moyenne] [Code]** `CLAUDE.md` comme journal des pièges et `dev/check-terrain.js` qui casse le build — seule protection contre les régressions ; à compléter, pas à élaguer.
- **[Basse] [Code]** Zéro dépendance, `build.js` de 10 lignes, index.html gzippé à 418 Ko, GitHub Pages en `max-age=600` — pas de problème réel de livraison.

## À revoir

- **[Critique] [Jeu]** Le mode Normal est injouable pour un profil neuf — 16 runs bot (8 armes × 2 graines) : 0 victoire, 0 mini-boss tué, mort en salle 1-5, durée médiane 67 s. TEST-REPORT §10.2 fixait pourtant « salle 9 gagnée ≤ 5 % » comme cible. Un ami qui découvre ne verra jamais les salles 6-9. Remède : 30-40 % de victoire au biome 1 pour un joueur moyen, la difficulté logée dans les biomes 2-4.
- **[Critique] [Jeu]** Les quatre biomes sont le même niveau reskinné — 36 salles = 4 × la même séquence avec les mêmes comptes de vagues, la salle 6 avec exactement les 4 mêmes éléments modulaires dans les 4 fichiers, 28 ennemis = 7 archétypes × 4 avec +5-10 % par palier. La variété déclarée (28 ennemis, 31 pièges, 36 salles) est en réalité 7 ennemis, 10 kinds, 9 salles. Remède : un ordre et une salle propres par biome, un comportement neuf (pas un chiffre) par archétype et par biome.
- **[Haute] [Jeu]** Le bonus de tempo est automatique — fenêtre ±100 ms sur un temps de 465 ms = 43 % du temps ; le bot, qui ne vise rien, a 38-53 % de tirs bonifiés et une série de 28 sans le vouloir. Remède : ±50 ms, bonus à partir d'une série de 4.
- **[Haute] [Jeu]** Le triangle des modes de compagnon n'est pas un choix — Uno = 12-17 % des dégâts, « Personne » = +12 % : à apport égal, « Tout le temps » gagne par le taunt ; « À l'appel » donne 10-16 %, la même chose avec une touche en plus. Remède : « Personne » à +25 % PV / +15 % dégâts, « À l'appel » avec un effet d'entrée qui justifie le timing.
- **[Haute] [Jeu]** `collect` et `mark` ne font rien de sensible — Choupi aimante ce que `Room.clear()` aimante déjà ; ORI = 0 dégât, +30 % sur une cible 4 s, 0 coup mesuré ; l'attelage vaut 9-26 % des dégâts par Tanuki seul. Remède : `collect` aimante XP et cœurs **pendant** le combat avec un rayon visible ; `mark` = crit garanti du joueur.
- **[Haute] [Jeu]** Compétence et paire bonus/malus tirées au sort — 2 compétences sur 8 proposées, paire de palier en `RNG.pick`. Le seul vrai choix avant la salle 1 est l'arme. Remède : 3 compétences, choix de la paire parmi 2.
- **[Haute] [Jeu]** La salle 2 peut s'éterniser — bot bloqué 194, 332 et 378 s (autres salles : 15-35 s) : capture et séquence tiennent la porte avec des renforts sans plafond. Remède : renforts plafonnés à 3 vagues, porte ouverte ensuite, récompense perdue.
- **[Haute] [Sprites]** Six chemins de rendu pour un corps, cinq lignes de sol — planche auteur (`y+25`), sprite entier (`y+25`), visage sur planche coupée (bas mesuré à `y+33`), corps pixel, planche du jeu (`y+20` via `dh/2−14`, `×0,5`, `−8`), compagnons (`sol = planche ? 25 : s×0,34`). `handY` recopie ces nombres une quatrième fois. Remède : un descripteur `{sol, hauteur}` par type de corps, consommé par `drawBody`, `handY`, l'ombre, la hitbox et le tri.
- **[Haute] [Sprites]** Échelle incohérente — Neuf 60 px / Marge 57 contre Martin 88 / Gabriel 86 / Jean 88, tous avec `r = 14` ; Uno 52 < Choupi et Tanuki 68, larges de 80 px (2× Martin). « ×2 de la case » garantit le grain, pas la taille : une case de 48 pour un chat, c'est un chat à l'échelle d'un humain. L'auteur a tranché pour la taille naturelle ; le point reste visible.
- **[Haute] [Sprites]** L'atelier ne sait pas produire ce que `content5.js` contient — `amisSnippet` n'émet ni `CONTENT.pairs`, ni `anim`/`duo`/`hidden`/`fly` des animaux ; les planches des 4 animaux ont été écrites par script. Voir « Exporter vide le fichier » plus bas.
- **[Haute] [Code]** Lignes de 500 à 1 200 caractères — 611 lignes > 200 caractères, 46 > 500 ; `Player.render` tient en 15 lignes pour 3 893 caractères. Illisible et non diffable. Remède : Prettier `printWidth: 140` en un commit dédié.
- **[Haute] [Code]** Fonctions monolithiques — 35 fonctions > 3 000 caractères : `Boss.runPattern` (103 lignes, un `switch` sur ~15 kinds), `Pet.update` (144 lignes), `Atelier.tune` (9,3 Ko), `Challenge.update` (8 Ko). Remède : table `kind → fn`, comme le font déjà `u_/r_/d_` dans 34_traps.js.
- **[Haute] [Code]** L'ordre de concaténation comme seul contrat — 108 déclarations top-level partagées entre 28 blocs `<script>`, `'use strict'` sur 2 blocs seulement. Remède : un `'use strict'` par fichier et une liste des globaux attendus.
- **[Haute] [Code]** Sauvegarde sans schéma ni migration — `Meta.load` accepte `v === 1` seulement, `Object.assign` superficiel : un profil `{v:2, coins:999}` devient `coins: 0` sans avertissement, un `volume: {master}` perd `sfx`/`music`. Clé encore nommée `sujet_neuf_save_v1`.
- **[Moyenne] [Jeu]** Deux salles sur neuf sont des couloirs — salles 4 et 8 : marcher au coffre, 3,6-4,3 s ; salles 5 et 9 : le même boss deux fois. Une run de 9 salles n'en a que 5 qui se jouent. Remède : coffre offert en fin de salle 3 et 7, une salle de combat neuve à leur place.
- **[Moyenne] [Jeu]** Les amis n'ont pas de trait — Martin, Gabriel, Jean : « Tel quel », `mods: []`. Seule l'équipe les distingue, et seulement si l'animal est pris. Remède : un trait par personne, choisi par elle.
- **[Moyenne] [Jeu]** Les objets au sol n'existent presque pas — drops sur élites seulement, biome 1 = 0 élite, biomes 2-4 ≈ 1 drop par run. Cinq reliques, l'allié et le remplacement de compagnon sont des mécaniques que le joueur ne rencontrera pas.
- **[Moyenne] [Jeu]** Le coffre note sur les coups reçus, colossal à 0,999 — un ami moyen ne verra jamais un coffre épique. Remède : plancher épique dès 0,7.
- **[Moyenne] [Sprites]** Nord/sud absents pour les planches — `dirFrom` renvoie `n` dès que |dy| > 1,2 |dx| mais le chemin planche ignore `dir` : rendu nord = rendu est octet pour octet. Le joueur monte de profil. Trancher : profil seul, ou une planche « dos » par clip.
- **[Moyenne] [Sprites]** Poids et format — 31 planches = 262 Ko base64 = 25 % d'`index.html` pour 7 entités, en PNG RGBA pour des cases à 17 couleurs (un PNG palette diviserait par 2-3). Projection : 10 copains à planches = +463 Ko ; 3 vues photo 128 px = +2,6 Mo, au-delà du quota localStorage avant même l'export.
- **[Moyenne] [Sprites]** Chaque image vit en quatre exemplaires — `content5.js`, `way_amis_v1`, `way.props.custom` (`addCustom` réécrit tout le JSON **à chaque image** au boot : O(n²)), plus les canvases ; `addSheet` appelé deux fois par planche à l'ouverture de F2.
- **[Moyenne] [Sprites]** Flash ennemi 54× plus cher — `draw()` avec `flash` 157 µs contre 2,9 sans ; vingt ennemis touchés par une onde = 3 ms. Remède : version blanchie précalculée par sprite.
- **[Moyenne] [Sprites]** `readSheet` verrouille `fw` sur la première planche — une planche suivante d'une autre case est découpée faux sans avertissement.
- **[Moyenne] [Code]** Nombres magiques malgré `05_balance.js` (20 lignes) — 390 littéraux dans 30_entities.js, 389 dans 32_enemies.js, 279 dans 50_ui.js. Le rééquilibrage passe par le moteur, contrairement à ce qu'annonce BALANCE.
- **[Moyenne] [Code]** Fallbacks silencieux `|| CONTENT.x[0]` — 6 occurrences ; CLAUDE.md documente déjà un bug invisible qu'ils ont causé. Remède : `console.warn` + `null`.
- **[Moyenne] [Code]** Tests hors dépôt et fragiles — 161 scripts dans un dossier de session, 684 `waitForTimeout`, l'écran-titre réimplémenté dans 113 d'entre eux, 3 seulement avec `process.exit(1)`. Rien ne couvre la mort, le portrait du hub, le timing tir/ramasse, le nord/sud, l'aller-retour export. Priorité de rapatriement : `spawncheck`, `levels`, `human`, `tempo`, `touch`, `gabriel`, `chats`.
- **[Moyenne] [Code]** Menu à 41 fps sous swiftshader pour 0,56 ms de `render()` — l'attract mode simule une run entière derrière un DOM à 7 `backdrop-filter` et 29 `box-shadow`. À mesurer sur téléphone avant la refonte mobile.
- **[Moyenne] [Code]** `Run.toHub` ne vide ni `G.pets` ni `Particles` ni `Floaters` — même famille que les bugs « compagnon resté à l'ancienne place », réglée par six `snap()` plutôt qu'un `Run.reset()`.
- **[Basse] [Jeu]** Vocabulaire de l'ancien lore partout — « Sujet perdu », « Protocole terminé », « Réimpression », « Salle Zéro · Ton camp de base », « Neuf (Sujet 09) » — alors que le jeu s'appelle WAY. Pour des amis, c'est illisible.
- **[Basse] [Sprites]** Tri en profondeur par le centre, pas les pieds, joueur toujours dessiné après — un chat devant le joueur passe derrière lui.
- **[Basse] [Sprites]** Vignettes non entières — case 48 réduite à 34 px (×0,71) pour les cartes du hub, 24 px pour le badge. Lignes perdues.
- **[Basse] [Code]** Docs à mettre en cohérence — 16 fichiers en-tête « SALLE ZÉRO », 3 « SUJET NEUF », Gamepad « prévu phase 1 », CLAUDE.md §Modules qui ne cite pas content3-5 ni 31/33/35, CONTENT.md à 1 131 lignes et 35 sections.

## À supprimer

- **[Haute] [Jeu]** Les doublons de greffes — `second_canon` domine strictement `double_canon` ; `balles_incendiaires` ⊃ `etincelle`, `balles_givrantes` ⊃ `givre`, `balles_electriques` ≈ `chaine_eclair` ; quatre `orbit_shield` ; 31 des 74 greffes sont des +X % purs. Remède : ~45 greffes, un effet par nom avec paliers de rareté.
- **[Haute] [Jeu]** Le décor animé et les partitions libres ne sont dans aucune salle livrée — `def.anims` : 0 salle sur 36 ; `beats.hits` : 0 occurrence dans content*.js ; l'établi « Animations » (842 lignes, le plus gros module) ne produit rien de joué. Soit l'atelier sort du build joueur, soit il livre 4 salles cadencées et il reste.
- **[Haute] [Jeu]** Les paliers de calibration fictifs — `memoire_selective` vend « commencer avec une greffe de la run précédente » (3 paliers, 800 crédits) mais ne fait que choisir les scores du coffre 8 ; `apercu_coffre` T2/T3 et `quatrieme_choix` T2/T3 ne sont pas codés : 2 080 crédits de paliers sans effet. Remède : un seul palier chacun, au prix du premier.
- **[Moyenne] [Jeu]** F2 en mode Normal — `90_main.js:53` ouvre l'atelier sans garde : un ami qui tâtonne tombe dans un éditeur de niveau. Une ligne.
- **[Moyenne] [Jeu]** Marge et Neuf — personnages de l'ancien lore à côté des amis ; Marge coûte 400 crédits (12-20 runs) pour un trait pièges que personne ne vise ; à 60 px ils font deux têtes de moins que les amis. Remède : donner leurs traits à deux amis et les retirer.
- **[Moyenne] [Sprites]** Le corps dessiné en pixels et `BODY_PALETTES` — atteints seulement si le tileset n'est pas chargé, ce qui n'arrive pas en http. Le visage peut attendre `ready`.
- **[Moyenne] [Sprites]** `Sprites.portrait()` — zéro appelant.
- **[Moyenne] [Code]** 130 fichiers d'assets jamais chargés — `assets/icons/` (61 SVG) et `assets/sprites/kenney_*` (69 fichiers), 748 Ko, aucun chemin référencé.
- **[Moyenne] [Code]** `undefined/shots/end.png` et `pause.png` versionnés — artefacts d'un test lancé sans variable d'environnement. Pas de `.gitignore` dans le dépôt.
- **[Basse] [Jeu]** Le terrain de salle sur 3 salles sur 36 — murets, eau, boue, moucharabieh, trois masques : utilisé par LA SERRE 1, LA CONCESSION 3, LE SÉRAIL 3 ; biome 1 : aucune. Soit on l'étend à toutes les salles de combat, soit il ne vaut pas sa complexité.
- **[Basse] [Sprites]** `hold: true` sur `death` (lu nulle part), option `walkFrame` de `draw()` (jamais passée), `sprite: "player2"` sur Gabriel (inatteignable avec `anim`).
- **[Basse] [Code]** Code mort confirmé — `deepClone`, `Fullscreen.supported`, getter `Enemy.slowFactor` (0 appel chacun) ; marqueurs `TODO_SPRITE` décrivant un fallback devenu permanent.

## À corriger

- **[Critique] [Sprites] — corrigé dans `7dbfcf5`** Les compagnons flottaient une demi-case au-dessus de leur ombre — un `−dh/2` de trop dans l'option `foot` de `drawSheet` : pattes d'Uno à y−8, des chats à y−24, ombres à y+31, pieds du joueur à y+24 ; le cercle de collision du chat était entièrement sous son dessin. Le test validait l'ombre. Remesuré : tous à y+24.
- **[Critique] [Sprites]** Le clip de mort n'est jamais dessiné — `Player.render:685` `if (this.dead) return;` : 0 pixel rendu mort, `Run.onPlayerDeath` affiche l'écran de fin immédiatement. 15 planches de mort (~23 Ko) mortes. Remède : dessiner le corps si `dead`, retarder `showEnd` de 0,9 s.
- **[Critique] [Sprites]** « Exporter » vide `content5.js` — `way_amis_v1` est à 0 caractère : les 3 personnages et 4 animaux n'existent pas dans l'atelier, et le fichier annonce « remplacé en entier ». Un export honnête produit `FRIEND_SHEETS = {}` et aucun `push`. Remède : importer `content5` dans l'atelier à l'ouverture, ou fusionner à l'export.
- **[Critique] [Code]** Défi « lumières coupées » à 6-34 ms par image (contre 0,23-0,71 ailleurs) — `lightMask` refait chaque image un `fillRect` plein écran + un gradient **par faisceau** en `destination-out`, puis une passe `lighter`. Remède : un disque pré-rendu par rayon en cache, masque reconstruit au demi-temps comme `scoreAt`.
- **[Haute] [Jeu]** « Personne » cumule avec un compagnon ramassé — `Pets.give` ne retire pas le buff `solo` : run « none » avec 3 442 dégâts de compagnon mesurés. Retirer le buff dans `Pets.give`.
- **[Haute] [Jeu]** Rien pour se comparer entre amis — le profil ne garde que `runs/wins/deaths/bestLevel` ; l'écran de fin n'a ni score, ni temps, ni record, ni graine ; `Run.start` accepte `seed` mais le hub n'en passe jamais ; pas d'export de sauvegarde. Remède : score de run, tableau des 10 meilleures par personnage, graine du jour, résultat copiable en une ligne.
- **[Haute] [Jeu]** L'économie méta est hors d'échelle — une mort en salle 3 garde 18-42 crédits ; total des calibrations 12 670 (« 45-60 runs réussies » selon CONTENT.md §5) ; à 0 % de victoire, c'est 300 runs d'une minute. Remède : prime de mort fixe (30 + 10 par salle) et prix divisés par 3.
- **[Haute] [Sprites]** Chaque orbe d'XP déclenche « ramasse » — `Combat.collect:396` n'exclut que `coin` : un orbe → clip `pick` 0,57 s, prioritaire sur tir et marche ; chaque mort d'ennemi lâche n orbes, donc le personnage cesse de tirer à chaque kill. Remède : bourse, relique, cœur, arme, allié seulement.
- **[Haute] [Sprites]** Portrait du hub = chevalier orange — `50_ui.js:235` appelle `portraitBody` sans `anim` : Martin s'affiche en knight 0x72. Remède : passer `anim` et `clip: 'idle'`.
- **[Haute] [Sprites]** Clip de tir décorrélé de la cadence — 0,50 s fixe pour des armes de 0,10 s (flamme) à 1,25 s (marteau) : deux balles de pistolet par geste, 2,5 gestes par coup de marteau ; `fireT` se relance bouton tenu même si `attackCd > 0`. Remède : déclencher le clip depuis `Weapons` au tir réel, fps = images × cadence.
- **[Haute] [Code]** Perte silencieuse de progression à tout changement de version de sauvegarde — à corriger avant tout bump de `v`, sinon les amis perdent leurs crédits au prochain déploiement.
- **[Haute] [Code]** Vie privée — `content5.js` embarque en clair dans un index.html public les prénoms réels, une description physique, les noms des animaux et 31 planches. `FRIEND_IMAGES` est vide, mais l'établi est conçu pour y coller des **photos** de visage : le jour où l'export en contient une, elle est indexable et irrévocable sur GitHub Pages. Remède : consentement explicite affiché à l'export, aucune photo dans le dépôt, prénoms remplaçables par un pseudo.
- **[Moyenne] [Jeu]** L'armure plate annule le biome 1 — `max(1, dmg − armor)` ; Carapace 3 + Peau dure ×4 + Sang-froid 2 = 9 contre des contacts de 5-13 : tout tombe à 1. Remède : armure en pourcentage plafonné à 50 %.
- **[Moyenne] [Jeu]** Biomes 3 et 4 hors de portée même profil maxé — mode test, 4 armes : mort salle 2-6 au biome 3, 2-5 au biome 4 ; boss revanche ≈ 12 500 PV pour 60-100 DPS.
- **[Moyenne] [Jeu]** L'arc tue en salle 1 — mort en 27-36 s dans 3 runs : le tir non chargé n'a pas de cadence de secours, et ni le bot ni le débutant ne chargent. Remède : tir rapide sans charge, ou DPS affichée dans la prépa.
- **[Moyenne] [Sprites]** Le corps regarde où il marche, l'arme où il vise — `flip = true` en marchant à gauche visée à droite, arme pointant à droite ; les personnages sans `anim` suivent la visée. Choisir la visée pour tous.
- **[Moyenne] [Sprites]** Compagnons `drawProp` posés sous leur ombre — chien 64 : bas à y+29, ombre y+22 ; faucon 32 : bas y−2, ombre y+8. Deux conventions, aucune juste.
- **[Moyenne] [Code]** 27 `catch` vides sur 43 et aucun `window.onerror` — un ami qui plante ne peut rien rapporter. Remède : un `Debug.report(e)` central en toast et journalisé.
- **[Moyenne] [Code]** Quota localStorage — `way_amis_v1` en data URI, simple toast à l'échec mais `amisRegister()` quand même appelé : l'état mémoire diverge de l'état sauvé sans que l'utilisateur sache ce qu'il perdra. Remède : IndexedDB pour les images, ou refuser l'ajout avant dépassement.
- **[Moyenne] [Code]** `Meta.profile.zoom` et `.lag` écrits mais absents de `fresh()` — ne survivent pas à un `reset()`, non documentés dans SCHEMA.md.
- **[Basse] [Jeu]** Mobile déclaré illisible et laissé tel quel — PLAN.md §8 priorité Haute, `55_touch.js` fait 63 lignes. Pour un jeu partagé par lien, c'est le premier écran que la moitié des amis verront.
- **[Basse] [Sprites]** Le dash gèle l'animation 0,18 s ; pas de clip dash ni blessé pour le joueur ; `gait` à l'arrêt lit `Date.now()` et respire en pause ; `IMG_MAX = 128` contre « 64 px » dans CLAUDE.md, en PNG (88 Ko) là où un JPEG ferait 14 Ko.
- **[Basse] [Code]** `G.enemies.slice()` + `sort` chaque image et 57 `shadowBlur` dans les chemins de rendu — < 1 ms aujourd'hui, premier suspect sur mobile.
