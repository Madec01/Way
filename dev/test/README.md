# Banc d'essai

Les tests pilotent le vrai jeu dans un Chromium invisible : ils entrent en salle, font jouer le personnage, mesurent des pixels, comptent des dégâts. Aucun n'est une simulation à côté du jeu.

## Lancer

```
cd dev/test
npm install                 # une fois : Playwright
npx playwright install chromium   # une fois : le navigateur (inutile si /opt/pw-browsers/chromium existe)
node run.js                 # toute la batterie, ~15 min
node run.js duo uno         # seulement ceux-là
node duo.js                 # un seul, en détail
```

`run.js` sort en erreur (code 1) si un seul test échoue ou si le jeu a levé une erreur JavaScript. Captures et journaux vont dans `out/`, ignoré par git.

## Écrire un test

```js
const { test } = require('./lib');
test(async ({ page, ok, entrer, salle, run }) => {
  await entrer('test');                   // écran-titre passé, mode test (tout débloqué)
  await salle(2);                         // saute en salle 2 du biome 1, invulnérable
  const pv = await page.evaluate(() => G.player.hp);
  ok('le joueur a des PV', pv > 0, pv + ' PV');
});
```

Ce que `lib.js` fournit : `entrer(mode)`, `salle(n, biome)`, `run({ character, pet, petMode })` pour partir du hub avec une équipe, `sansPause()` pour refermer les écrans de choix pendant qu'on observe, `out(nom)` pour un chemin de capture, `erreurs` (les erreurs JS collectées). Le libellé d'un `ok` dit **ce qui est mesuré** — pas « ça marche ».

## Les tests

| Fichier | Ce qu'il vérifie |
|---|---|
| `acces` | un profil neuf a bien les personnages et les animaux de l'auteur, et entre en salle 1 avec son équipe |
| `allerretour` | chantier 8 : l'export de l'établi Amis sans rien toucher est `dev/content5.js` octet pour octet et un point fixe de Prettier ; planches en PNG palette découpées comme avant ; encodeur pixel-exact ; fiche modifiée dans le jeu, IndexedDB, l'export ; survie au rechargement ; photo → JPEG 64 px ; refus quand le navigateur est plein ; suppression avec son duo |
| `amis` | l'établi Amis : les amis du fichier d'abord, créer un animal et un copain, export de `content5.js`, rechargement |
| `arme` | l'arme part de la main, à 45 % du corps, pour chaque type de corps |
| `animaux` | chantier F-7 : Uno accroupi puis sa morsure sur le temps, le repos assis, l'appel depuis le bord, la ruée et ses fantômes (dorés en rythme), Choupi allongée et la collecte en deux temps, Tanuki qui tourne, le trait d'ORI |
| `bat` | chantier F-5 : Beat.pulse, la passe de lumière mesurée au pixel, la respiration du joueur et des ennemis, l'anneau de mesure, les télégraphies et annonces sur le tempo, la partition sans or, la porte sur le temps fort, les drops déphasés, les lumières de salle |
| `biomes` | chantier 9 : quatre ordres de salles, 4 et 8 en combat, une salle unique par biome (sous-sol, pont, train, bazar), deux coffres offerts, salles modulaires distinctes, sous-sol dans le noir, défi par type, wagons en boucle, coffre devant la porte et caché au bazar, boss de salle 9 à ses propres phases |
| `butin` | chantier F-4 : la mort en 220 ms (blanc puis écrasé, mesuré au pixel), couronne, onde à plat, tache plafonnée et purgée, drops en arc, étincelles à la taille de la série, cœur, relique, coffre qui s'ouvre en 300 ms |
| `chats` | Choupi, Tanuki et ORI : planches, tailles, ligne de sol, clips, équipes |
| `choix` | chantier 6 : tempo ±50 ms, série de 4, fausse note, bot à < 15 % ; 3 compétences et 2 paires en prépa ; 61 greffes sans dominance (`dev/check-greffes.js`), paliers à chance ; calibrations à un palier, migration v3 |
| `comportements` | chantier 9 : 28 comportements distincts, puis chaque variante de biome en action (bond, rebond, ronces, nuage, soin, vol, fouet, piège à loup, replis, secousse, baril qui roule, relève, venin, feinte, dédoublement, tir en cloche, bouclier frontal, nappe de feu, charme, crachat, dans le dos) et le bot dans les trois biomes |
| `compagnons` | chantier 5 : « Personne » à +25 % PV / +15 % dégâts, l'onde d'arrivée d'« À l'appel », Choupi qui court chercher, ORI qui rend critique, les trois caractères, reliques hors élites, `Run.reset` |
| `coup` | chantier F-2 : cinq genres de chiffres flottants, Silkscreen à contour, sursaut, fusion, naissance au corps, plus de « +n XP » ; coup reçu : recul en courbe, vignette, ralenti, flash sur un gros coup, clignotement 6 Hz |
| `duo` | l'attelage inséparable, les trois équipes, les modes de compagnon |
| `etape0` | le socle rythmique : horloge musicale, pièges cadencés, tourniquet |
| `fin` | chantier I-7 : la montée de niveau (ruban, icône, « choix 1 sur n », « tu es à … », greffes prises), le coffre en une phrase, la pause (infos de partie, stats d'arme, commandes, curseurs, fond), l'écran de fin (deux gros chiffres, progression, détail replié, suggestion d'achat, « Repartir » sans hub, HUD éteint) |
| `gabriel` | Gabriel et Jean : planches, cases vides de fin, clips, pieds sur la ligne de sol |
| `habits` | plus de palier de tenue : habillé dès la salle 1, même corps après 9 greffes |
| `interface` | chantier I-1 : onglets dans le cadre, textes obsolètes partis, attraction figée, Uno par défaut, HUD sondé (textes dans leurs panneaux, tout dans la vue), PV vert/doré/rouge + vignette, un seul compteur de série, boss en haut sans bandeau, toasts en bas à droite, badge aligné, écran de fin vrai et « Rejouer » |
| `interface_mobile` | le même HUD en 900 × 420 tactile : ancré aux bords de la vue, onglets dans l'écran, polices ≥ 12 px, toast au-dessus des boutons |
| `hud` | chantier I-5 : le centre de la vue libre, les trois polices du CSS, la barre de PV segmentée, l'XP en bande, la pastille de niveau, l'anneau de compétence, la ligne du haut, la barre du boss par phases, les trois tailles de chiffres, la grille des greffes, le fondu du HUD, les barres ennemies et les zones d'impact |
| `hub` | chantier I-3 : le camp en trois questions, moins de 250 mots, une seule zone de défilement, Gabriel avec ses chats en deux clics, la carte d'équipe, la carte « Seul », les paliers verrouillés à moitié largeur, la boutique et les fragments hors du camp, le défilement gardé |
| `human` | une partie au clavier et à la souris en mode Normal : bouger, tirer, compétence, pause, mort, crédits, achat |
| `levels` | le bot joue 4 armes sur 9 salles (mode test) — équilibrage, pas de plantage |
| `lueurs` | les lueurs pré-dessinées (`Halo`) : le canvas du halo, plus de `shadowBlur` sur particules, projectiles, objets au sol et ondes, cache borné, et la planche « hurt » du compagnon sonné qui défile |
| `martin` | Martin : cinq clips, boucle de marche, mort figée, retournement, pieds |
| `messages` | chantier I-6 : notify et ses quatre niveaux, un bandeau à la fois, trois toasts retenus près d'un ennemi, doublons, interruption, gel sous un panneau, zone libre |
| `palette` | chantier F-3 : plus de rouge en dur hors de PAL, télégraphies en PAL.alert, barre ennemie en blanc cassé, cœurs verts, ennemis en rouges sourds, couleurs des animaux, dégât d'Uno en orange, PV hachurés sous 25 % |
| `pets` | les neuf comportements du moteur des compagnons, un par un |
| `prepa` | chantier I-4 : la planche d'icônes sur chaque arme et compétence, trois jauges par arme, un seul panneau de détail qui suit le clic et le survol, « 3 tirées au sort sur 8 », le ⇄ des paires, MODE TEST en pied, le récapitulatif du bouton, la grille sous 900 px |
| `ressenti` | chantier F-1 : Ease et Feel, arrêt sur image (30 / 70 / 60 ms, plafonné, jamais sur un ralenti), étincelles au corps dans le sens du coup, étincelle de contact, écrasement, secousse directionnelle indépendante du zoom, plus de `G.shake`, recul de l'arme, polices pixel dans le monde, squash & stretch des planches |
| `scenes` | chantier F-6 : l'entrée de salle en marchant, la montée de niveau mise en scène et son écran sur le temps fort, l'arrivée du boss (rideau, caméra, descente, trois secousses au temps), sa mort en 1,6 s, la mort du joueur (ralenti, ennemis figés, voile, compagnon couché), l'écran de fin après 1,4 s |
| `spawncheck` | chaque salle des quatre biomes : spawns et pièges sur des tuiles libres, porte atteignable |
| `sprites32` | une image 32×32 importée reste nette, une photo est réduite à 64 px |
| `touch` | la couche tactile sur un téléphone simulé : joystick, tir maintenu, compétence, pause — et le pouce (I-8) : esquive, cibles ≥ 44 px, HUD ×1,35, joystick au repos et indication, tir automatique et bouton en pointillé, pause hors de la prise, camp en rangées défilables |
| `vocabulaire` | chantier I-2 : le contenu, les écrans rendus et les messages du code passés à la liste des mots bannis ; un mot par notion ; descriptions ≤ 90 caractères |
| `uno` | Uno : planches, équipe avec Martin, morsure, mode « à l'appel », mode « personne » |
| `vues` | trois images (sud, est, nord) pour quatre directions, retournement ouest |

Hors batterie : `node dev/perf-ab.js` compare le rendu du build courant à une copie `index_ancien.html` (mode d'emploi en tête du fichier).
