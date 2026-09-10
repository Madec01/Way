# WAY — Audit du ressenti, des animations et de l'identité visuelle

Audit mené sur le vrai rendu : 3 passes de captures Chromium (Playwright, `/opt/pw-browsers/chromium`), ~90 PNG dans
`audit_feel/shots/`, `shots2/`, `shots3/`, `flash/`, agrandissements dans `audit_feel/crops/`.
Scripts : `audit_feel/capture.js`, `capture2.js`, `capture3.js`, `flashtest.js`, `flashtest2.js`.
Deux mesures faites au pixel (différence d'images) : intensité réelle du flash blanc, taille réelle des sprites à l'écran.
Code lu : `00_core.js`, `15_sprites.js`, `30_entities.js`, `31_pets.js`, `32_enemies.js`, `33_anim.js`, `35_terrain.js`,
`39_tempo.js`, `40_room.js`, `50_ui.js`, `90_main.js`, `AudioEngine.js`, `style.css`, `content5.js`, `assets/music/tempo.json`.
**Aucun fichier du dépôt modifié, aucun commit.**

`AUDIT-HUD.md` a traité le HUD (cartouches, barres, toasts, bandeaux). Ce rapport traite **ce qui se passe dans le monde** :
impacts, morts, ramassages, rythme, caméra, sprites, compagnons. Il ne revient sur les Floaters et le rythme que
pour aller plus loin que le §2.6 et le §2.8 de l'audit HUD, qui les avaient signalés sans les refaire.

> **Note sur la version auditée.** Les captures ont été prises sur le build d'`index.html` de 08 h 17. Pendant la
> rédaction, une autre session a appliqué les recommandations de l'audit HUD (ancrage sur `Engine.view`, badge de
> compagnon élargi à 420 px, réorganisation de `renderHud`) dans `31_pets.js`, `38_challenges.js`, `39_tempo.js`,
> `40_room.js`, `50_ui.js`, `57_attract.js`, `60_meta.js` et `style.css`. **Aucun des fichiers dont traite ce rapport
> n'a changé** : `00_core.js`, `15_sprites.js`, `30_entities.js`, `32_enemies.js`, `33_anim.js`, `35_terrain.js`,
> `90_main.js` et `AudioEngine.js` sont intacts, et `39_tempo.js` n'a pas été touché sur `renderScore` ni sur les
> usages de `Beat`. Les numéros de ligne cités pour `31_pets.js`, `39_tempo.js`, `40_room.js` et `50_ui.js` peuvent
> avoir bougé de quelques dizaines de lignes ; les noms de fonctions restent valables.
> Une remarque au passage : les lignes ajoutées par cette session écrivent encore `ctx.font = '12px "Segoe UI"'`.
> C'est exactement le point §2.15 / §3-E de ce rapport, et il vaut mieux le régler maintenant que sur trois fois plus de code.

---

## 1. L'âme

### 1.1 Ce que ce jeu EST (et ce qu'il n'est pas)

WAY n'est pas un donjon. Ce n'est pas non plus l'ancien lore de laboratoire (`LORE.md`, « SUJET NEUF », le Bureau
d'Homologation, la Greffière) — `CLAUDE.md` dit d'ailleurs explicitement que ce lore est **rejeté** et qu'on lui
substitue *la Voie, route de montagne à Relais-machines*. Il faut aller au bout de ce constat, parce qu'il commande
tout le reste : **le jeu qui est effectivement là, dans le code, ce sont trois amis qui marchent avec leurs animaux,
en musique.**

Les faits, dans les fichiers :

- Les personnages jouables sont **Martin, Gabriel et Jean**, décrits par leur chemise rose et leur barbe, pas par un
  matricule (`content5.js`, `char_martin` : « Chemise rose, cravate verte, lunettes et barbe. Il ne se déplace jamais sans Uno. »).
- Les compagnons sont **de vrais animaux** : Uno le chien de Martin, Choupi et Tanuki les deux chats de Gabriel
  (« Inséparables »), ORI le chat de Jean qui « ne frappe pas : il désigne ».
- Les paires personnage/animal ont des noms de vie privée : **« Vieille complicité »**, **« La maisonnée »**.
- Douze des treize pistes sont **au même tempo, 129,2 BPM, en ré** (`tempo.json`). Un temps = 464 ms, une mesure = 1,857 s.
  Le jeu entier tient sur un seul pouls.
- Les compagnons agissent **une fois par mesure** (`every: 4`) : Uno « mord sur le temps fort ». Le rythme est
  déjà dans les règles.
- La bande son est de très loin la plus aboutie des couches du jeu : 39 sons synthétisés (bruit filtré, FM, saturation,
  réverbération à convolution), **accordés sur la tonalité de la piste** (`AudioEngine.setKey`), une cascade de gamme
  quand on ramasse plusieurs orbes d'affilée (`Pickups.streak`, jusqu'à 12 degrés), un ralentissement de bande à la
  mort (`Music.dying(2.2)`, effet *tape stop*).

Et en face de ça, le rendu réel, mesuré sur les captures :

- Le sol est un **canvas mis en cache par salle** (`Sprites.drawFloor`, `floorCache`) : il ne peut structurellement
  pas bouger. La seule chose animée au sol est le miroitement de l'eau.
- **36 des 37 appels `ctx.font` du jeu sont en « Segoe UI »**. Les trois polices pixel (Silkscreen, VT323, Pixelify Sans)
  sont téléchargées, créditées, déclarées en `@font-face`… et ne servent qu'aux menus HTML. Le jeu, lui, est écrit
  dans la police d'interface de Windows.
- `Beat` n'est lu par le monde qu'en salle du tempo. Ailleurs, le décor, le sol, les ennemis et le joueur ne battent pas.
- Le personnage fait **95 px de haut** à l'écran, l'ennemi de base **39 px**. Les amis sont dessinés grands et soignés,
  les ennemis sont des jouets de 16 px empruntés à un tileset.

**Diagnostic en une phrase :** WAY *sonne* comme un jeu musical entre amis et *ressemble* à un prototype de donjon générique.
L'écart entre la bande son et l'image est le vrai problème de ce jeu — plus que n'importe quel effet manquant pris isolément.

### 1.2 La direction que je propose (une seule)

**« La Voie bat. »**
Le jeu se regarde comme une marche en cadence sur une route de montagne, avec son chien. Pas comme un couloir de combat.
Tout ce qui suit en découle. Cinq principes, dans cet ordre de priorité :

**1. Ce qui vit bat ; ce qui est bâti ne bat pas.**
Le joueur, les compagnons, les ennemis, les lumières, les pièces au sol, les télégraphies : sur le temps.
Les murs, le sol, les obstacles, les chiffres de dégâts, la barre de PV, la caméra : immobiles.
C'est cette séparation qui rend un rythme *lisible* au lieu de donner le mal de mer — c'est exactement la règle de Hi-Fi Rush.

**2. L'impact se lit en lumière, pas en sang.**
WAY, ce sont des amis et leurs chats. Un coup fait de la **lumière blanche, de l'or, de la poussière et de l'écrasement**.
Jamais de gerbe rouge, jamais de gore. La violence du jeu est celle d'un dessin animé : franche et sans cruauté.

**3. Une couleur, une intention. Sans exception.**
Aujourd'hui `#ff5e7a` sert simultanément de barre de PV *pleine*, de barre de vie d'ennemi, de chiffre de dégât subi,
de croix de porte fermée et de couleur du nom de boss. Cinq sens pour une couleur, c'est zéro sens.
Le contrat : **cyan = toi et ce qui est à toi · or = le temps, la mesure, la récompense · corail = le danger qui vient
de l'extérieur · vert = la vie qui revient**. Et une seule couleur d'alerte pour toutes les télégraphies, jamais employée ailleurs.

**4. Le compagnon est le co-héros, pas un bonus passif.**
Chaque moment fort de la partie doit contenir l'animal : le level-up, l'arrivée du boss, la mort. Si un ami joue cinq
minutes et retient une image, il faut que ce soit **son chien**.

**5. Le calme existe pour que le fort porte.**
Une salle a une respiration : entrée silencieuse, combat, sortie. Aujourd'hui tout crie tout le temps (quatre textes
superposés au centre à chaque entrée de salle, capture `shots3/W_entree_1.png`) et donc rien ne porte.

### 1.3 Palette d'émotion

| Rôle | Couleur | Où |
|---|---|---|
| La route, le repos, le fond | `#07080d` fond · `#141826`/`#1b2333` sol · brume `#2b3350` | sol, murs, obstacles — **jamais lumineux** |
| Toi et ce qui est à toi | `#6ee7ff` cyan | joueur, dash, bouclier, XP, portée d'aimant |
| Le temps, la mesure, la récompense | `#ffd166` or | anneau de mesure, pièces, critiques, partition, coffre |
| Le danger extérieur | `#ff5e7a` corail (zones, dégâts subis) · `#ff3b3b` **réservé aux télégraphies** | jamais pour un état « plein » |
| La vie qui revient | `#7fff9a` vert | soins, porte ouverte, cœurs |
| Les animaux | Uno `#e08a4a` · Choupi `#f0c46a` · Tanuki `#a8784a` · ORI `#c9a3ff` | **la seule famille chaude et douce du jeu** : c'est ce qui les rend attachants au milieu du froid |

### 1.4 Ce qui doit battre / ce qui doit rester calme

**Bat (sur `Beat.phase()`)** : la respiration du joueur au repos · la respiration des ennemis · l'anneau de mesure au
sol sous le joueur · les lumières du décor · le halo des pièces et orbes posés · les télégraphies d'attaque · les
compagnons (ils battent déjà, `every: 4`) · une passe de lumière très faible sur toute la salle · le pouls de la
vignette rouge quand les PV sont bas.

**Reste calme** : le sol et les murs · les chiffres de dégâts (ils ont leur propre courbe) · la caméra (elle ne bouge
que sur impulsion) · les barres du HUD · les projectiles.

---

## 2. Inventaire du ressenti actuel

Notes sur 10. Chaque valeur citée est lue dans le code ou mesurée sur les captures.

### 2.1 Impact d'un coup donné — **3 / 10**

`Combat.hitEnemy` (`30_entities.js:820-900`) fait, dans l'ordre : `e.flash = 0.12` · recul `kb = knockback × stats.knockback ×
(boss ? 0,1 : 1) × 160 / masse` · un son (`hitEnemy` / `hitCrit`) · `Particles.spawn(e.x, e.y, {count: crit ? 8 : 4, size: 2,
speedMax: 120})` · un Floater.

Ce qui marche : le son est excellent (`layerClick` 1500 Hz + `layerThump` 130→58 Hz saturé + bruit brun filtré) et le
recul physique existe.

Ce qui ne marche pas :
- **Aucun hitstop.** Rien ne s'arrête, jamais, nulle part dans le jeu. C'est l'absence la plus coûteuse : c'est
  l'arrêt sur image qui dit « ça a compté ». L'infrastructure est pourtant **déjà là** — `Engine` fait
  `updateFn(FIXED_DT * slow, FIXED_DT)` avec `Time.slow` / `Time.slowUntil` (`00_core.js:470`), et ce mécanisme n'est
  utilisé aujourd'hui que par deux greffes.
- **Le flash blanc fonctionne mais on ne le voit pas.** Mesure au pixel (`flash/b_sans.png` vs `b_avec.png`) :
  la luminance du sprite passe de 72,3 à 170,7, soit **+136 %**. Le flash est donc bien appliqué et bien dosé.
  Il dure 0,12 s, soit un quart de temps à 129 BPM, et il n'est accompagné d'aucun arrêt, d'aucun changement de
  silhouette, d'aucun sursaut d'échelle : sur un sprite de 39 px au milieu d'un écran de 1280, il passe inaperçu.
  Un flash sans hitstop est un flash gaspillé.
- **Les particules d'impact sortent des pieds de l'ennemi, pas de son corps.** `Particles.spawn(e.x, e.y, …)` alors
  que le sprite est ancré au pied (`Sprites.draw`, `oy = dh/2 − 14×scale`) et donc **dessiné au-dessus de `e.y`**.
  Visible nettement sur `crops/planche_flash.png` : les étincelles apparaissent dans l'ombre, décalées d'environ 25 px
  sous le corps rouge. C'est un défaut de ressenti pur : le coup ne sort pas d'où on a frappé.
- **Il n'y a pas d'étincelle au point de contact.** L'arc de mêlée (`Weapons.melee`, `r.slashes`) est dessiné centré
  sur le joueur (`pl.x, pl.y`), largeur 4 px, durée 0,16 s. Sur les captures, c'est un mince croissant gris autour des
  jambes du personnage. Rien ne se passe là où la lame touche.
- Pas de secousse sur un coup normal ni sur un critique : `G.shake` n'est touché que par les explosions, les dégâts subis
  et les slams.
- Pas de recul du joueur (le « gun kickback » de Vlambeer), donc les armes lourdes et légères se tiennent pareil.

### 2.2 Coup reçu — **3 / 10**

`Combat.hitPlayer` : `hurtFlash = 0.25` · recul de **3 px** tant que `hurtFlash > 0.13` · `G.shake = min(12, shake + 4 + dmg×0,2)`
· 8 particules `#ff5e7a` · un Floater `-24` en 16 px · le son `playerHurt`.

- **Il n'y a aucun retour périphérique.** Pas de vignette rouge, pas de flash plein écran, pas de ralenti. Le seul
  signal est au centre (un petit chiffre rouge sur le personnage) et dans le coin haut-gauche (une barre à 600 px du
  regard). C'est exactement ce que l'audit HUD a relevé au §2.1, et c'est encore plus grave côté monde : Dead Cells et
  Hades signalent le danger **au bord de l'écran** précisément parce que le regard est verrouillé sur le personnage.
- Le recul de 3 px est un **saut carré** : `translate(-facing × 3, 0)` pendant 120 ms puis retour brutal. Il n'a ni
  courbe ni direction (il ne dépend pas de l'origine du coup).
- Le clignotement d'invulnérabilité (`Math.floor(Time.now × 20) % 2`) clignote à **10 Hz** : c'est trop rapide, ça se
  lit comme un scintillement d'erreur, et sur les captures on n'arrive pas à dire si le personnage est vivant.
- La secousse est indistinguable de celle d'une explosion : même bruit, même forme.

### 2.3 Chiffres flottants — **3 / 10**

`Floaters` (`30_entities.js:63-85`) : durée **0,8 s**, `vy = -40 px/s` (donc 32 px de montée **linéaire**), alpha
linéaire 1→0, `bold Npx "Segoe UI"`, ombre portée d'**1 px** `#000a`, dispersion **horizontale seulement** `±8 px`,
file plafonnée à 80.
Tailles : dégât normal **12 px** blanc · critique **16 px** `#ffd166` · dégât subi **16 px** `#ff5e7a` · XP `+n XP` 16 px `#c8ff5a`.

- L'écart critique/normal est de **+33 %**. Il en faut 150 à 200 % pour qu'un critique se lise en combat. Sur
  `crops/planche_flash.png`, un critique de 90 et un coup normal de 52 sont **indiscernables**.
- **Aucun pop d'apparition.** Le chiffre naît à sa taille finale et monte à vitesse constante. C'est précisément ce
  que toute la littérature de *game feel* appelle « plat » : sans courbe d'échelle à l'apparition, un chiffre ne
  « sort » pas de l'ennemi, il apparaît dessus.
- **Aucune dispersion verticale et aucune fusion.** Sur `shots2/C_mort_1.png`, trois « 52 » se superposent au même
  endroit et forment une bouillie illisible. Sur une arme rapide, c'est permanent.
- **L'ombre d'1 px ne suffit pas.** Sur le sol clair de la salle du tempo (`shots2/I_tempo_2.png`), le blanc sur ocre
  devient illisible. Il faut un contour, pas une ombre.
- **La position est fausse pour la même raison que les particules** : `e.y - e.r - 4` est calculé sur le rayon de
  collision, pas sur le corps dessiné. Le chiffre atterrit à mi-hauteur du sprite ou sur le décor derrière.
- Le chiffre est en **Segoe UI**, dans un jeu en pixel art. C'est le détail qui, seul, fait « fait maison » sur une capture.
- Les dégâts subis passent par le **même canal** que les dégâts infligés : même trajectoire, même durée, même graisse.
  L'information la plus vitale du jeu est traitée comme la moins importante.

### 2.4 Mort d'un ennemi — **1 / 10**

C'est le point le plus faible de tout le jeu.

`Combat.killEnemy` : `e.dead = true` (et `Enemy.render` retourne **immédiatement** dès la première image), un son,
`Particles.spawn(count: 12, size: 3, speedMax: 200, glow: true)`, puis les drops.

J'ai capturé une mort en **ralenti 8×** (`Time.scale = 0.12`, planche `crops/planche_mort.png`) pour être sûr : le
sprite **disparaît en une image**. Pas de flash de mort, pas de silhouette blanche, pas d'écrasement, pas de cadavre,
pas de tache au sol, pas d'onde. Ce qui reste à l'écran, c'est une poignée de points orange de 3 px qui s'effacent en
0,2 à 0,5 s. À vitesse normale, tuer un ennemi **ne produit aucune image**.

Or, tuer est l'action que le joueur répète le plus. Un ami qui joue cinq minutes tue peut-être deux cents ennemis et
n'a rien vu deux cents fois. C'est là qu'est le plus gros gain de ressenti du jeu, et de loin.

Corollaire : il n'y a **aucune permanence**. Rien ne reste d'un combat. Le point n°4 de « The Art of Screenshake »
(les corps qui restent) est absent, et avec lui la sensation d'avoir agi sur le monde.

### 2.5 Mort du joueur — **2 / 10**

`Player.die()` → `AudioEngine.playerDie()` → `Run.onPlayerDeath()` → la planche de mort du personnage est jouée si
elle existe, puis l'écran de fin s'ouvre, et `Music.dying(2.2)` ralentit la bande (*tape stop*).

Le son de cette scène est très bien. **L'image est vide** : pas de ralenti, pas de désaturation, pas de zoom, pas de
vignette, pas de figement des ennemis. Dans un roguelite, la mort est la moitié de l'expérience : c'est le moment où
le joueur relit sa partie. Ici il n'y a rien à relire.
Et le compagnon, qui est censé être le cœur affectif du jeu, ne fait rien du tout à ce moment-là.

La « réimpression » (seconde chance) est mieux traitée que la mort elle-même : onde de choc, Floater `RÉIMPRESSION`
20 px, son de level-up.

### 2.6 Ramassage (pièces, XP, cœur, relique) — **4 / 10**

Rendu : orbe d'XP = un cercle cyan de 4 à 7 px · pièce = un disque or de 5 px avec une barre sombre de 2×6 px ·
fragment = un carré de 14 px qui tourne · bobbing `sin(Time.now × 6 + p.x) × 2`.
Aimantation dès `stats.pickupRadius`.

- **À la collecte, il ne se passe rien.** Pas de pop, pas de flash, pas d'étincelle, pas de trace. L'objet disparaît.
- **Le son, lui, est remarquable** : `Pickups.streak` monte d'un degré de gamme par orbe pris dans la demi-seconde,
  jusqu'à 12. On a une **cascade musicale** magnifique qui n'a strictement aucune contrepartie visuelle. C'est le
  résumé du problème de ce jeu.
- Les pièces et orbes sont éjectés **à plat** depuis le cadavre, sans arc, sans rebond, donc sans gourmandise.
- Le bobbing est en `Time.now`, pas en `Beat` : les pièces posées au sol ne battent pas.
- Un `+n XP` en Floater vert par fragment (§2.3) ajoute du bruit là où le HUD dit déjà la même chose.

### 2.7 Montée de niveau — **2 / 10**

`Run.levelUp()` : un son (`AudioEngine.levelUp`, très bon : souffle qui monte + coup grave qui pose l'accord) puis
l'ouverture d'un **écran de choix plein écran qui met le jeu en pause**.

Dans le monde : **rien**. Capture `shots2/G_levelup_1.png`, niveau 2 → 3 : aucun anneau, aucune particule, aucun zoom,
aucun changement de couleur du personnage. La barre d'XP se vide, point (l'audit HUD le note aussi au §2.2).

C'est le seul moment purement gratifiant de la boucle, et il ne produit pas un photon.
Deuxième défaut : l'écran s'ouvre **immédiatement**, donc en plein milieu d'une mesure — dans un jeu bâti sur `Beat`,
alors que `Beat.timeToNextBar()` existe et est déjà utilisée par `UI` (`50_ui.js:135`).

### 2.8 Coffre — **5 / 10**

Le coffre est un sprite dessiné (`Sprites.drawChest`), il a un état `near`, il ouvre un écran de choix, le son
`chestOpen` est bon. Il manque : l'anticipation (un halo qui grossit à l'approche), l'ouverture elle-même (couvercle,
gerbe de lumière, pièces qui jaillissent en arc), et une raison de s'en souvenir. Aujourd'hui il se comporte comme un
bouton.

### 2.9 Entrée et sortie de salle, porte — **2 / 10**

`Room.load` puis un état `intro` de **0,8 s** qui ne fait **rien** (`Room.update` : `if (r.stateT >= 0.8) Room.begin()`),
puis le combat. Le joueur est téléporté, la caméra saute, `Camera.pulse` est remis à zéro.

Sur `shots3/W_entree_1.png`, à l'entrée de la salle 2, **quatre messages sont superposés au centre de l'écran** :
le cartouche « SÉQUENCE · Ordre : II → III → I », le titre magenta « ORDRE : II → III → I », « Vague 2 » en rouge, et
« Salle 2/9 — Salle aléatoire » en cyan. Le personnage, lui, est déjà à sa place, immobile.

La porte : fermée = deux traits rouges en croix ; ouverte = un cadre vert `#7fff9a` avec `shadowBlur = 16 + sin(Time.now × 4) × 6`
et un `▶` en **`bold 22px sans-serif`** (le seul endroit du jeu où aucune police n'est spécifiée). Elle ne s'ouvre pas :
elle change d'état. Aucune onde, aucun son de cadence, aucun rapport au tempo.

### 2.10 Boss — **5 / 10 (arrivée 2/10, combat 7/10, mort 3/10)**

**L'arrivée** : `Room.spawnBoss` fait `G.enemies.push(b)` — le boss **apparaît** simplement dans la liste — plus un
bandeau au centre et `AudioEngine.bossRoar`. Sur `shots2/J_boss_arrivee_1.png`, on voit le titre de salle et pas encore
de boss ; il est là à l'image suivante. Pas de mise en scène, pas de mouvement de caméra, pas de rideau, pas de zoom.

**Le combat est la meilleure partie du jeu.** L'anneau de télégraphie blanc puis orange puis rouge, le halo
`shadowBlur 12`, l'ornement de crête, la partition en haut : sur `shots2/K_boss_3.png` et `L_bossphase_*.png`, tout se
lit instantanément. C'est le seul endroit où WAY ressemble à un jeu fini.

**Les phases** : le texte du HUD passe de « phase 1 » à « phase 2 » et une pluie de cœurs tombe. Aucun flash, aucun
arrêt, aucun changement d'ambiance. Un changement de phase doit être un événement, pas un incrément.

**La mort** : `G.shake = 14`, un bandeau, `roomClear`, 12 pièces, une relique. Une secousse de 14 px de bruit blanc et
c'est fini. Pour le climax d'une partie de neuf salles, c'est très peu.

Détail technique : la pulsation de télégraphie utilise `Math.sin(Time.now × 30)`, **indépendante du tempo**. Dans un
jeu bâti sur `Beat`, caler la télégraphie sur les temps rendrait la parade *apprenable* — c'est une occasion manquée
que l'audit HUD avait déjà relevée et qui vaut encore plus dans le monde.

### 2.11 Compagnons — **6 / 10** (le meilleur du jeu après la télégraphie)

Ce qui marche, et qu'il faut prendre comme modèle pour tout le reste :
- `Pet.render` contient **le seul « pop » du jeu** : `const pop = 1 + this.act * 0.22`, appliqué à l'échelle du sprite
  pendant l'action. C'est exactement le bon geste, et il n'existe nulle part ailleurs.
- `renderMark` (la marque d'ORI, `31_pets.js:529`) : anneau au sol + losange au-dessus de la tête, dans la couleur du
  compagnon, avec une barre de temps restant sous le losange. Lisible, coloré, **dans le monde et pas dans le HUD**.
  C'est le modèle. Visible sur `shots2/G_levelup_1.png`.
- `renderReach` (l'anneau pointillé de Choupi) : élégant, discret, informatif.
- Les compagnons agissent **une fois par mesure** (`every: 4`, `beatTick()` sur `Beat.index()`).

Ce qui manque :
- **Personne ne peut voir qu'ils jouent en rythme.** Il n'y a aucune anticipation : Uno ne s'accroupit pas avant de
  mordre, Tanuki ne se ramasse pas avant de charger. L'action tombe sur le temps sans que rien ne l'annonce, donc le
  joueur ne fait pas le lien.
- Les caractères ne sont pas différenciés en animation. Uno (qui mord au contact), Choupi (qui court chercher),
  Tanuki (qui traverse la salle **en boule**, `rollSpeed: 560`) et ORI (qui **vole** et désigne) se déplacent tous de
  la même façon : un bob sinusoïdal et un `pop` d'action. Un chat qui roule à 560 px/s ne tourne même pas sur lui-même,
  alors que `Sprites.draw` sait déjà le faire (`d.roll` → `rot = t * 7`).
- La morsure d'Uno : un simple `pop` et un Floater. Pas de mâchoire, pas d'étincelle, pas d'arrêt.
- L'appel (`Pet.call`) fait une onde de choc et un **toast textuel**. Le compagnon ne « déboule » pas : il est
  téléporté (`snap()` le pose à `pl.x - 34`).
- Aucun comportement au repos : quand rien ne se passe, le compagnon ne regarde pas le joueur, ne s'assoit pas.

### 2.12 Dash — **3 / 10**

`Skills.use`, cas `'dash'` : durée 0,18 s, distance 200 px × puissance, invulnérable, `AudioEngine.dash()`, et pendant
le mouvement **2 particules cyan par image** (`count: 2, size: 3, speedMax: 30`).

Pas de traînée de fantômes, pas d'étirement du sprite, pas de poussière à l'arrivée, pas de déformation de caméra.
Sur les captures `shots2/F_dash_*.png`, le personnage se téléporte visuellement. Un dash de 200 px en 180 ms *doit*
laisser une trace, sinon le cerveau ne l'enregistre pas comme un mouvement.

Et surtout : **le dash n'a aucun rapport avec le tempo**, alors que c'est l'action la plus naturelle à caler sur un temps.

### 2.13 Le rythme dans le monde — **2 / 10**

C'est la promesse centrale du jeu, et elle n'est tenue que dans une salle sur neuf.

Recensement exhaustif des lectures de `Beat` hors `39_tempo.js` et hors HUD :
- `30_entities.js:2006` — pulsation d'échelle du joueur `1 + 0,07 × max(0, 1 − phase × 3)`, **conditionnée à
  `G.room.tempo && G.room.tempo.started`** : elle n'existe qu'en salle 7.
- `32_enemies.js:520` — pulsation d'échelle de l'ennemi `1 + 0,12 × …`, **conditionnée à `this.beatLock`**, qui n'est
  posé que par `Room.spawnEnemy` **si `G.room.tempo`** : idem, salle 7 seulement.
- `32_enemies.js:449` — le voyant doré au-dessus de la tête : même condition.
- `33_anim.js` — le décor animé (`tile_color`, `tile_lift`, `light`, `ring`…) bat correctement, mais il faut que le
  contenu de la salle en pose ; il n'y en a quasiment pas dans les salles ordinaires.
- `34_traps.js` — les pièges à partition, très bien faits.
- `39_tempo.js:472` `Tempo.renderScore` — la partition au sol (coins dorés pour « annoncé », cadre pour « imminent »)
  est une **excellente** idée, dessinée dans toutes les salles… mais court-circuitée dès la première ligne par
  `if (!room.traps.some(t => t.beats && !t.disabled)) return;`. Sans piège rythmé, aucune partition.

Résultat : **le sol ne bat pas, les murs ne battent pas, la lumière ne bat pas, le joueur ne bat pas, les ennemis ne
battent pas.** Le seul témoin du tempo dans une salle ordinaire est un carré noir de 176×28 px collé sous le cartouche
central, contenant quatre points de 4 px (audit HUD §2.6). Et `UI.renderBackdrop` fait *déjà*, pour les menus, la
passe de lumière qu'il faudrait dans le jeu (`ctx.globalAlpha = 0.04 * kb; fillStyle = '#6ee7ff'; fillRect(…)`,
`50_ui.js:1303`).

Le paradoxe : douze pistes sur treize sont au **même** tempo (129,2 BPM) et dans la **même** tonalité (ré). Le jeu
entier peut battre d'un seul pouls, du menu au boss, sans aucune coordination à écrire.

### 2.14 Idle et marche des sprites — **5 / 10**

`Sprites.gait(walk)` fait déjà du **squash & stretch** correct :
- au repos : `bob = sin(Time.now × 1,43) × 0,6` — une respiration lente, hors tempo ;
- en marche : `bob = |sin(t)| × 2,5`, `tilt = sin(t) × 0,05`, `sx = 1 − |sin(t)| × 0,04`, `sy = 1 + |sin(t)| × 0,05`.

Mais dans `drawBody`, le chemin des **planches d'animation** (celui des personnages soignés : Martin, Gabriel, Jean,
les compagnons) ne reprend que `g2.bob` et **jette `sx`, `sy` et `tilt`**. Autrement dit, le squash & stretch existe
uniquement pour les personnages dessinés en image fixe — c'est-à-dire pas pour les héros du jeu.

Les clips sont bien découpés (`idle` 6 fps, `walk` 12, `fire` 14, `pick` 12, `death` 8, `attack` 14, `hurt` 10) et le
geste de tir est calé sur la cadence réelle de l'arme (`Player.tir(intervalle)`) : c'est du bon travail.

### 2.15 Couleurs et palette — **4 / 10**

`--bg #07080d` · `--accent #6ee7ff` · `--gold #ffd166` · `--danger #ff5e7a` · `--good #7fff9a` · `--text #e8ecf7` ·
`--muted #9aa4c4`. La palette est **bonne dans le principe** (froide, contrastée, cohérente avec le pixel art) mais
elle n'est pas *tenue* :

- `#ff5e7a` a cinq emplois contradictoires (cf. §1.2, principe 3).
- La couleur de télégraphie est celle de l'ennemi (`telegraph.color`), donc variable : le joueur ne peut jamais
  apprendre « cette couleur = évite ».
- Le sol est un damier `#141826` / `#161b2b` avec une teinte de biome et une vignette. Sur les captures, la salle 1
  lit comme un **tableur** : une grille régulière, un fond uni, zéro variation de lumière.
- Les ennemis sont rouge vif `#e33` sur fond bleu-gris : lisible, mais ils lisent comme des jouets de 16 px posés sur
  une grille (`shots2/A_combat_2.png`), pas comme des menaces.

### 2.16 Caméra — **2 / 10**

`Camera` (`00_core.js:226`) : suivi par `lerp(k = min(1, 6 × dt))`, zoom fixe (1 au clavier, 1,5 en tactile), et un
champ **`pulse`** (impulsion de zoom) qui existe, est remis à 0 à chaque salle, et **n'est utilisé que par la salle du
tempo**. C'est un zoom d'événement gratuit, déjà câblé, jamais employé.

La secousse (`90_main.js:25`) :
```js
if (G.shake > 0) ctx.translate(VFX_RNG.range(-G.shake, G.shake), VFX_RNG.range(-G.shake, G.shake));
```
Trois défauts :
1. **C'est du bruit blanc isotrope** : aucune direction, donc une explosion et un coup reçu par la gauche secouent
   pareil. Aucune rotation, alors que c'est la rotation qui fait lire « force » plutôt que « bug d'affichage ».
2. **La décroissance est linéaire** (`G.shake -= dt × 30`), donc la secousse traîne au lieu de claquer.
3. **Elle est appliquée à l'intérieur de la transformation caméra**, donc **multipliée par le zoom** : 12 px de
   secousse deviennent 18 px en tactile (zoom 1,5). Et elle est appliquée *avant* le dessin du sol, donc le décor
   entier bouge — ce qui est correct, mais amplifie le mal des transports au lieu de l'impact.

### Récapitulatif

| Élément | Note |
|---|---|
| Mort d'un ennemi | **1 / 10** |
| Montée de niveau | **2 / 10** |
| Mort du joueur | **2 / 10** |
| Entrée / sortie de salle, porte | **2 / 10** |
| Rythme dans le monde | **2 / 10** |
| Caméra (secousse, zoom) | **2 / 10** |
| Impact d'un coup donné | **3 / 10** |
| Coup reçu | **3 / 10** |
| Chiffres flottants | **3 / 10** |
| Dash | **3 / 10** |
| Ramassage | **4 / 10** |
| Couleurs et palette | **4 / 10** |
| Boss (arrivée 2 · combat 7 · mort 3) | **5 / 10** |
| Coffre | **5 / 10** |
| Idle et marche des sprites | **5 / 10** |
| Compagnons | **6 / 10** |
| **Ressenti global en jeu** | **3 / 10** |
| *(pour mémoire : bande son)* | *8 / 10* |

---

## 3. Propositions

Classées par rapport impact / effort. « Effort » est estimé pour un développeur qui connaît le code.

### 3.0 Vue d'ensemble

| # | Proposition | Impact | Effort | Fichier |
|---|---|---|---|---|
| A | Vocabulaire d'animation commun (`Ease` + `Feel`) | fondation | 1 h | `00_core.js` |
| B | Hitstop sur coup / crit / mort | **énorme** | 20 min | `30_entities.js` |
| C | Chiffres flottants refaits (pop, arc, contour, Silkscreen, fusion) | **énorme** | 2 h | `30_entities.js:63` |
| D | Mort d'ennemi : silhouette blanche, écrasement, onde, tache | **énorme** | 2 h | `30_entities.js`, `32_enemies.js` |
| E | Toutes les polices du canvas en Silkscreen / VT323 | **énorme** | 30 min | tous les `ctx.font` |
| F | Impact : particules au corps, cône directionnel, étincelle de contact | fort | 1 h | `30_entities.js:873` |
| G | Secousse directionnelle avec rotation et décroissance | fort | 45 min | `00_core.js`, `90_main.js` |
| H | Vignette de dégât + ralenti au coup reçu | fort | 1 h | `50_ui.js`, `30_entities.js` |
| I | Le monde bat : passe de lumière + respirations sur `Beat` | **signature** | 2 h | `40_room.js`, `15_sprites.js`, `32_enemies.js` |
| J | L'anneau de mesure au sol sous le joueur | **signature** | 45 min | `30_entities.js` `Player.render` |
| K | Level-up mis en scène, calé sur la mesure | fort | 1 h 30 | `40_room.js:822` |
| L | Ramassage : pop, arc, aimantation visible, halo sur le temps | fort | 1 h | `30_entities.js` `Pickups` |
| M | Dash : fantômes, étirement, poussière, bonus en rythme | moyen | 1 h 30 | `30_entities.js` |
| N | Caractère des compagnons en animation | **affectif** | 3 h | `31_pets.js` |
| O | Arrivée et mort du boss mises en scène | fort | 3 h | `40_room.js`, `32_enemies.js` |
| P | Mort du joueur mise en scène | fort | 2 h | `40_room.js`, `50_ui.js` |
| Q | Entrée de salle : une marche, un seul texte | moyen | 2 h | `40_room.js`, `50_ui.js` |
| R | Contrat de couleur tenu | moyen | 1 h 30 | partout |
| S | Squash & stretch sur les planches d'animation | moyen | 15 min | `15_sprites.js:1170` |

### A — Vocabulaire d'animation commun

Tout ce qui suit s'appuie dessus. À poser en fin de `00_core.js`, environ 60 lignes, aucune dépendance.

```js
const Ease = {
  outCubic:  t => 1 - Math.pow(1 - t, 3),
  outQuad:   t => 1 - (1 - t) * (1 - t),
  inQuad:    t => t * t,
  outBack:   t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2), // dépasse à 1,10 : le « pop »
  outElastic: t => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * 2.094) + 1,
};
```

Les cinq mots du vocabulaire, à employer **partout** avec les mêmes valeurs :

| Mot | Définition | Valeurs canoniques |
|---|---|---|
| **pop** | sursaut d'échelle à l'apparition | `Ease.outBack`, 120 ms, amplitude 1 → 1,25 → 1 |
| **squash & stretch** | déformation opposée sur les deux axes, volume conservé | à l'impact `sx +30 % / sy −22 %`, 110 ms `outCubic` ; en course `sx +18 % / sy −14 %` |
| **flash** | silhouette blanche pleine | 60 ms à alpha **1,0**, puis 70 ms à alpha 0,35 (deux temps, pas un) |
| **hitstop** | arrêt du temps de simulation | coup 45 ms · critique 90 ms · mort d'ennemi 70 ms · phase de boss 180 ms |
| **trail** | fantômes du sprite aux positions passées | 5 copies, alphas 0,35 / 0,28 / 0,20 / 0,13 / 0,07, une par image |

```js
const Feel = {
  stop(ms)         { Time.slow = 0.02; Time.slowUntil = Math.max(Time.slowUntil, Time.now + ms / 1000); },
  slow(scale, ms)  { Time.slow = scale; Time.slowUntil = Time.now + ms / 1000; },
  shake(mag, angle, ms) { Camera.kick(mag, angle, ms); },
  pop(e, amount = 0.25, ms = 120) { e.popA = amount; e.popT = 0; e.popD = ms / 1000; },
  squash(e, angle, ms = 110)      { e.sqA = angle; e.sqT = 0; e.sqD = ms / 1000; },
};
```

`Feel.stop` n'a **rien à écrire dans le moteur** : `Engine` applique déjà `updateFn(FIXED_DT * slow, FIXED_DT)`
(`00_core.js:470`) et `Time.slow`/`Time.slowUntil` existent. Le hitstop coûte donc **une ligne par site d'appel**.

### B — Hitstop (l'effet le plus rentable du rapport)

Dans `Combat.hitEnemy` (`30_entities.js:873`, bloc `if (!info.dot)`) :

```js
Feel.stop(info.crit ? 90 : 45);
```

Dans `Combat.killEnemy` : `Feel.stop(70);`
Dans `Combat.hitPlayer`, après le calcul des dégâts : `Feel.slow(0.35, 120);`
Au changement de phase d'un boss (`32_enemies.js`, autour des `G.shake = 8/10/12`) : `Feel.stop(180);`

Précaution : plafonner les cumuls sur une arme rapide — n'appliquer le hitstop que si `Time.now > lastStopT + 0.08`.
Référence : Dead Cells fige **une image** sur un critique puis ralentit quelques dixièmes ; Vlambeer cite 60-80 ms
pour un coup destructeur.

### C — Chiffres flottants refaits

Réécriture complète de `Floaters` (`30_entities.js:63-85`). Cahier des charges chiffré :

| Type | Taille | Couleur | Trajectoire | Durée |
|---|---|---|---|---|
| dégât normal | **18 px** | `#f4f7ff` | `vy₀ = −90`, `vx₀ = ±40`, gravité `+180 px/s²` | 0,70 s |
| **critique** | **30 px** (+67 %) | `#ffd166` | `vy₀ = −130`, gravité `+180` | 0,85 s |
| **dégât subi** | **34 px** | `#ff5e7a` | part **vers le bas** (`vy₀ = +40`) puis remonte, `vx₀ = 0` | 0,90 s |
| soin | 20 px | `#7fff9a` | `vy₀ = −70`, pas de gravité | 0,70 s |
| événement (`ESQUIVE`, `EXÉCUTION`, `DÉBRANCHÉ`) | 22 px | selon l'événement | montée linéaire lente | 1,10 s |
| XP, pièces, `TEMPO ×n`, `SÉRIE ×n` | — | — | **supprimés du canal Floater** (cf. audit HUD §2.5 et §2.8) | — |

Détails d'implémentation :

- **Police** : `bold ${size}px "Silkscreen", "Segoe UI", sans-serif`. Silkscreen est déjà dans `assets/fonts/` et déjà
  déclarée en `@font-face`. Coût : zéro.
- **Contour, pas ombre** : `ctx.lineWidth = 4; ctx.strokeStyle = '#0b0d14'; ctx.lineJoin = 'round'; ctx.strokeText(...);`
  puis `ctx.fillText(...)`. Lisible sur n'importe quel sol.
- **Pop** : `const s = Ease.outBack(Math.min(1, f.t / 0.12));` puis `ctx.scale(s, s)` autour du point. 120 ms.
- **Alpha** : plein jusqu'à 65 % de la durée, puis `1 − (t − 0,65·life) / (0,35·life)`. Pas de fondu linéaire dès l'image 1.
- **Dispersion** : `x + range(−14, 14)`, `y + range(−10, +4)`.
- **Position corrigée** : `y = e.y − hauteurCorps × 0,6` au lieu de `e.y − e.r − 4`. La hauteur du corps est déjà
  disponible via `Sprites.corps(key, opts).hauteur` (`15_sprites.js:1133`).
- **Fusion anti-empilement** : à l'ajout, chercher un floater du même type à moins de **14 px** et de moins de **0,12 s**.
  S'il existe : `f.text = String(+f.text + d); f.t = 0; f.size = Math.min(f.size + 2, 40);`. C'est ce que fait Path of
  Exile pour les dégâts sur la durée, et ça supprime d'un coup la bouillie visible sur `shots2/C_mort_1.png`.
- **Plafond** : 40 (au lieu de 80). Au-delà, le premier est supprimé.

### D — Mort d'un ennemi (le plus gros gain du jeu)

`Enemy.render` (`32_enemies.js:435`) commence par `if (this.dead) return;`. Le remplacer par une phase de mort de 220 ms.

Dans `Combat.killEnemy` :
```js
e.dead = true;
e.deathT = 0;                       // 0 → 0,22 s
e.deathA = info.vx != null ? Math.atan2(info.vy, info.vx) : angleTo(pl.x, pl.y, e.x, e.y);
Feel.stop(70);
Feel.shake(4, e.deathA, 160);
```

Dans `Enemy.render`, avant tout le reste :
```js
if (this.dead) {
  if (this.deathT == null || this.deathT > 0.22) return;
  const k = this.deathT / 0.22;
  // 0 → 60 ms : silhouette blanche pleine, agrandie
  // 60 → 220 ms : écrasement au sol et effacement
  const sx = 1 + 0.55 * Ease.outCubic(k), sy = 1 - 0.80 * Ease.outCubic(k);
  const alpha = k < 0.27 ? 1 : 1 - (k - 0.27) / 0.73;
  Sprites.draw(ctx, sprite, this.x, this.y, { flash: true, alpha, scale: … });
  return;
}
```

Autour, dans `killEnemy` :
- **couronne de particules** : `Particles.spawn(e.x, e.y − hCorps * 0.55, { count: 22, color: '#ffffff', size: 2,
  speedMin: 120, speedMax: 340, life: 0.35, glow: true })` + `{ count: 6, color: '#ffd166', size: 4, speedMax: 180, life: 0.5 }`.
  **Noter le `− hCorps × 0,55`** : c'est la correction du bug de position (§2.1).
- **onde plate au sol** : `G.room.blasts.push({ x: e.x, y: e.y, r: 34, t: 0, life: 0.22, color: '#ffffff' })`.
- **permanence** : une liste `G.room.decals` (nouvelle, ~15 lignes), dessinée dans `Room.render` juste après
  `Sprites.drawFloor` : une ellipse `rgba(8,10,18,0.35)` de 18×7 px, plafonnée à 60, effacée au changement de salle.
  C'est le point n°4 de « The Art of Screenshake » : les traces qui restent sont ce qui fait qu'on sent qu'on a agi.
- **drops en arc** : dans `Pickups.spawn`, donner aux pièces et orbes `vy₀ = range(−180, −90)` et une gravité de
  `+520 px/s²` jusqu'à `y ≥ y₀`, puis l'aimantation habituelle. 8 lignes, effet immédiat sur la gourmandise.

### E — Toutes les polices du canvas en pixel (30 minutes, effet maximal)

36 des 37 `ctx.font` du jeu sont en `"Segoe UI"`. Remplacement systématique :

- **chiffres, noms, titres, compteurs** → `"Silkscreen", "Segoe UI", sans-serif` ;
- **phrases et descriptions** → `"VT323", monospace` (déjà employé une fois, `50_ui.js:370`) ;
- corriger au passage les deux `sans-serif` nus : le `▶` de la porte (`40_room.js`) et l'étoile de stun `✦`
  (`32_enemies.js`), qui rendent différemment d'un navigateur à l'autre.

Attention : Silkscreen est très étroit en hauteur ; prévoir +10 à 15 % de taille par rapport aux valeurs Segoe UI
actuelles, et appeler `document.fonts.ready` avant le premier rendu pour éviter un premier affichage en police de repli.

### F — Impact d'un coup donné

Dans `Combat.hitEnemy`, bloc `if (!info.dot)`, en remplacement des lignes actuelles de particules :

```js
const a  = info.vx != null ? Math.atan2(info.vy, info.vx) : angleTo(pl.x, pl.y, e.x, e.y);
const hy = e.y - Sprites.corps(e.def.sprite).hauteur * 0.55;   // le corps, pas les pieds
Particles.spawn(e.x, hy, { count: info.crit ? 14 : 7, angle: a, spread: 0.7,
  speedMin: 90, speedMax: info.crit ? 320 : 220, size: info.crit ? 3 : 2,
  color: info.crit ? '#fff3c4' : '#ffffff', life: 0.28, glow: true });
G.room.slashes.push({ x: e.x, y: hy, cx: e.x, cy: hy, a, range: 20, arc: 2.6, t: 0, life: 0.09, color: '#ffffff' });
Feel.stop(info.crit ? 90 : 45);
Feel.shake(info.crit ? 3.5 : 1.6, a, 120);
Feel.squash(e, a, 110);
e.flash = 0.09;      // + la double enveloppe (§A) : 60 ms pleine, 70 ms à 0,35
```

Et pour le **recul du joueur** (le « gun kickback » de Vlambeer, point n°8 de sa liste), dans `Weapons.melee` et
`Weapons.shoot` : `pl.kickA = aim; pl.kickT = 0;` puis dans `Player.render`, `translate(−cos(kickA) × 4 × (1 − Ease.outCubic(kickT / 0.09)), …)`.
Sur un marteau, 6 px ; sur un pistolet, 2 px. C'est cette différence qui donne du poids aux armes.

Enfin, l'arc de mêlée : le passer de `lineWidth 4` à `lineWidth 7 × (1 − k)` (il s'affine en s'effaçant) et l'ancrer
à mi-corps (`pl.y − 12`) plutôt qu'aux pieds.

### G — Caméra : secousse directionnelle

Remplacer `G.shake` (un scalaire) par une impulsion dans `Camera` :

```js
Camera.kick = function (mag, angle, ms) {
  this.k = { ax: Math.cos(angle), ay: Math.sin(angle), mag, t: 0, life: ms / 1000 };
};
// dans render, HORS de la transformation de zoom :
const k = Camera.k;
if (k && k.t < k.life) {
  const d = 1 - Ease.outCubic(k.t / k.life);           // décroissance en courbe, pas linéaire
  const osc = Math.sin(k.t * 70) * d * k.mag;
  ctx.translate(k.ax * osc, k.ay * osc);
  ctx.rotate(osc * 0.0012);                             // la rotation fait lire « force », pas « bug »
}
```

Trois amplitudes seulement, jamais d'autres valeurs dans le code :
- **1,6 px** — un tir, un coup normal ;
- **4 px** — un critique, une mort d'ennemi, un coup reçu ;
- **9 px** — une explosion, un slam, un changement de phase de boss, la mort d'un boss.

Et sortir la secousse de `Camera.apply` (`90_main.js:25`) pour qu'elle ne soit plus multipliée par le zoom.

### H — Coup reçu

Dans `Combat.hitPlayer` :
```js
pl.hurtVig = 0.35;                                    // vignette
Feel.slow(0.35, 120);                                 // ralenti bref
Feel.shake(3 + dmg * 0.12, angleTo(info.x ?? pl.x, info.y ?? pl.y, pl.x, pl.y), 200);
if (dmg > pl.stats.maxHp * 0.15) UI.flashScreen(0.5, 60);   // flash blanc d'une image sur gros coup
```

Deux ajouts dans `50_ui.js`, dessinés **après** `renderHud` :

1. **Vignette de dégât** — un dégradé radial des bords vers le centre,
   `rgba(255,60,90, 0.45 × (pl.hurtVig / 0.35))`, décroissance 350 ms.
2. **Vignette de PV bas** — permanente sous 25 % de PV, `alpha = 0.10 + 0.06 × (1 − Beat.phase())` :
   **elle pulse sur la musique**. C'est le lien le plus direct entre le tempo et la tension, et ça répare en même temps
   le défaut le plus grave relevé par l'audit HUD (§2.1 : à 16/203 PV, rien ne prévient).

Corriger aussi le recul : de `translate(−facing × 3, 0)` en créneau à `−cos(angleSource) × 7 × (1 − Ease.outCubic(t / 0.14))`.
Et passer le clignotement d'invulnérabilité de 10 Hz à **6 Hz**, alpha 0,35 / 1.

### I — Le monde bat (la signature)

**1. Passe de lumière sur la salle.** Dans `Room.render`, juste après `Sprites.drawFloor` :
```js
const kb = Ease.outCubic(1 - Math.min(1, Beat.phase() * 2.5));
ctx.save();
ctx.globalCompositeOperation = 'lighter';
ctx.globalAlpha = (Beat.beatInBar() === 0 ? 0.09 : 0.045) * kb;
ctx.fillStyle = pal.neon[0] || '#6ee7ff';
ctx.fillRect(ROOM_X, ROOM_Y, ROOM_W, ROOM_H);
ctx.restore();
```
Un `fillRect` par image. C'est **exactement** ce que `UI.renderBackdrop` fait déjà pour les menus (`50_ui.js:1303`) :
on ne fait que le porter dans le jeu. Le sol reste en cache, il ne bouge pas — c'est la lumière qui bat.

**2. Respiration du joueur, partout.** Dans `Sprites.gait`, au repos :
```js
if (!(walk > 0)) {
  const k = Ease.outCubic(1 - Math.min(1, Beat.phase() * 1.6));
  return { bob: -2.2 * k, tilt: 0, sx: 1 - 0.030 * k, sy: 1 + 0.035 * k };
}
```
Et supprimer la condition `G.room.tempo && G.room.tempo.started` de `30_entities.js:2006` : la pulsation d'échelle du
joueur devient permanente, mais **réduite à 0,04** (au lieu de 0,07) pour que ce soit une respiration et pas un sautillement.

**3. Respiration des ennemis, partout.** `32_enemies.js:520` : sortir le `beatLock` de la condition, et donner
`1 + 0.06 × k` à tous les ennemis, `1 + 0.10 × k` aux boss **sur le temps fort seulement**.
Garder le voyant doré au-dessus de la tête pour les seuls ennemis à `beatLock` : il devient le signe distinctif
« celui-ci frappe sur le temps » au lieu d'être un décor de salle 7.

**4. Télégraphies sur le tempo.** `32_enemies.js:459` : remplacer `0.5 + 0.5 × Math.sin(Time.now × 30)` par
`Ease.outCubic(1 − min(1, Beat.phase(2) × 2))` (deux pulsations par temps). La parade devient apprenable.

**5. Les pièces au sol sautillent en cadence.** Dans `Pickups.render`, remplacer
`bob = sin(Time.now × 6 + p.x) × 2` par :
```js
const ph = ((Beat.phase() + p.phase) % 1);            // p.phase tiré une fois au spawn
const bob = -3.5 * Ease.outCubic(1 - Math.min(1, ph * 2));
```
Quatre lignes. C'est le détail qui fait dire « oh » à quelqu'un qui regarde par-dessus l'épaule.

**6. La porte.** `shadowBlur = 12 + 10 × kb` au lieu de `16 + sin(Time.now × 4) × 6`, et **elle s'ouvre sur le temps
fort suivant** (`Beat.timeToNextBar()`), avec une onde verte `blasts` de 60 px. Une porte qui s'ouvre en mesure, c'est
gratuit et c'est mémorable.

**7. La partition au sol.** Retirer `if (!room.traps.some(t => t.beats && !t.disabled)) return;` de `Tempo.renderScore`
et lui donner une seconde source : les **ennemis à `beatLock`** annoncent leur tuile de frappe. Sinon cette très bonne
idée reste invisible huit salles sur neuf.

**8. Des lumières dans les salles.** `ANIM_DEFS.light` existe déjà et bat déjà (`33_anim.js`). Il suffit d'en poser
dans les définitions de salles : deux à quatre par salle, halo de 90 px, `alpha = 0.10 + 0.10 × kb`, couleur `pal.neon`.
Coût : du contenu, pas du code.

### J — L'anneau de mesure (la marque de fabrique)

C'est la proposition à laquelle je tiens le plus. Dans `Player.render`, avant le sprite, ~15 lignes :

```js
const bib = Beat.beatInBar(), ph = Beat.phase();
const a0 = -Math.PI / 2, aEnd = a0 + TAU * ((bib + ph) / 4);
ctx.save();
ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.globalAlpha = 0.30;
ctx.beginPath(); ctx.ellipse(this.x, this.y + Sprites.SOL - 2, 26, 10, 0, a0, aEnd); ctx.stroke();
// le claquement du temps fort
const kb = Ease.outCubic(1 - Math.min(1, ph * 3));
if (bib === 0 && kb > 0) {
  ctx.globalAlpha = 0.7 * kb; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(this.x, this.y + Sprites.SOL - 2, 26 + 14 * (1 - kb), (26 + 14 * (1 - kb)) * 0.38, 0, 0, TAU); ctx.stroke();
}
ctx.restore();
```

Un arc doré au sol sous le personnage qui se remplit sur les quatre temps de la mesure et **claque** au temps fort.
Il dit trois choses en même temps : où est le joueur, où en est la mesure, et que ce jeu est un jeu de rythme.
Sur une capture d'écran figée, c'est **la** chose qui distingue WAY de n'importe quel roguelite Canvas.

### K — Montée de niveau

Dans `Run.levelUp()` (`40_room.js:822`), avant l'ouverture de l'écran, 700 ms de scène :

```js
const pl = G.player;
Feel.stop(120);
Camera.pulse = 0.06;                                        // ce champ existe et n'a jamais servi hors salle 7
G.room.blasts.push({ x: pl.x, y: pl.y + 10, r: 170, t: 0, life: 0.55, color: '#ffd166', fill: true });
Particles.spawn(pl.x, pl.y, { count: 40, color: '#ffd166', size: 3, speedMin: 60, speedMax: 220,
  angle: -Math.PI / 2, spread: 1.1, life: 0.8, glow: true });
pl.levelFlash = 0.20;                                        // silhouette blanche 200 ms
Floaters.add(pl.x, pl.y - 46, 'NIVEAU ' + G.run.level, '#ffd166', 40);
setTimeout(ouvreLEcran, Beat.timeToNextBar() * 1000);        // l'écran s'ouvre sur le temps fort
```

Il faut aussi amortir `Camera.pulse` (aujourd'hui il n'est remis à zéro qu'au changement de salle) :
`Camera.pulse += (0 - Camera.pulse) * Math.min(1, 6 * dt)` dans `update`.

Et **le compagnon** : `pet.act = 1` (il fait son animation d'action) et un petit saut. Le level-up doit contenir l'animal.

### L — Ramassage

- **Pop à la collecte** : dans `Combat.collect`, `Particles.spawn(p.x, p.y, { count: 5, color: couleurDuType, size: 2,
  speedMax: 90, life: 0.22, glow: true })` + un anneau de 12 px, `life: 0.16`.
- **Aimantation visible** : quand `p.magnet` est vrai, dessiner une traînée de 3 fantômes de l'orbe, alpha 0,3 / 0,18 / 0,08.
- **Halo sur le temps** pour les objets posés (cf. §I.5).
- **Cœur** : `Feel.pop(pl, 0.18)` et un anneau vert de 40 px. Un soin doit se sentir.
- **Relique / arme** : ces objets-là méritent un vrai arrêt — `Feel.stop(140)`, un rayon vertical de lumière depuis
  l'objet pendant 400 ms, et le bandeau. Ce sont les seuls ramassages qui doivent interrompre le combat.
- **Et surtout : caler la cascade sonore sur l'image.** Le son monte déjà d'un degré de gamme par orbe
  (`Pickups.streak`). Faire monter la **taille de l'étincelle** de la même façon : `size = 2 + streak × 0.25`,
  `count = 5 + streak`. En 3 lignes, la meilleure idée sonore du jeu devient enfin visible.

### M — Dash

```js
// pendant le dash, dans Player.update
this.ghosts.unshift({ x: this.x, y: this.y, flip: this.facing < 0, t: Time.now });
if (this.ghosts.length > 5) this.ghosts.pop();
```
et dans `Player.render`, avant le corps, redessiner `Sprites.drawBody` aux 5 positions avec
`alpha: [0.35, 0.28, 0.20, 0.13, 0.07][i]`.
Étirement pendant le dash : `sx = 1.22, sy = 0.90` orientés sur `dashVx/dashVy`.
Au départ : une onde blanche de 26 px (`blasts`). À l'arrivée : 8 particules `#9aa4c4` de 2 px en cône **opposé**, `speedMax: 90`.
Pendant les 180 ms : `Camera.pulse = -0.015` (léger dézoom, la sensation de vitesse).

**Le bonus de rythme** : si le dash part à moins de **90 ms** d'un temps (`Beat.distToBeat() < 0.09`), les fantômes
passent en `#ffd166` et le son monte d'une quinte. Rien d'autre ne change — pas de bonus mécanique. C'est ce qui fait
que les gens se mettent à jouer en rythme sans qu'on le leur demande.

### N — Les compagnons, chacun son caractère

C'est le poste qui produira le plus de souvenirs pour cinq minutes de jeu entre amis.

**Uno (chien de Martin, `bite`, mord sur le temps fort).** Il doit **anticiper**.
Un temps avant (`Beat.timeToBeat(1) < 0.46 × 0.5` et prochaine action au temps fort) : accroupissement,
`sx = 1.14, sy = 0.86`, 200 ms `outCubic`. Sur le temps : bond, `Feel.pop(uno, 0.35, 140)`, un `slash` blanc de
16 px au point de morsure, `Feel.stop(40)`, `Feel.shake(2, angle, 90)`, et 3 particules `#e08a4a` en cône.
Le chiffre de dégât d'Uno en `#e08a4a` — sa couleur, pas du blanc générique.

**Choupi (chatte de Gabriel, `collect`).** Basse et rapide. En course : `sx = 1.18, sy = 0.86` (le chat s'allonge),
traînée de 4 fantômes alpha 0,25. À la collecte, faire **deux temps** : l'objet vole vers Choupi en arc (250 ms),
puis de Choupi vers le joueur (250 ms). Aujourd'hui il se téléporte dans la poche.

**Tanuki (chat de Gabriel, `charge`, `rollSpeed: 560`).** C'est une boule : `rot = t × 14` pendant le roulement
(`Sprites.draw` sait déjà tourner, `d.roll`), 6 fantômes, une onde au sol au point de départ, et **un flash
d'anticipation d'un demi-temps** avant de partir. Une charge à 560 px/s sans rotation ni traînée est aujourd'hui
invisible.

**ORI (chat de Jean, `mark`, vole).** La marque est déjà bonne. Deux ajouts :
un **trait pointillé** `#c9a3ff` entre ORI et sa cible, dessiné en 150 ms avec `lineDashOffset -= 60 × dt` (il file
vers la cible) ; et la pulsation de la marque passe de `sin(this.t × 9)` à `Beat` — la marque **clignote sur le temps**.
ORI vole : lui donner un flottement propre (`bob = sin(t × 2.2) × 5` + une ombre plus petite et plus floue) plutôt que
le bob de marche commun.

**L'appel (`Pet.call`).** Aujourd'hui : `snap()` le téléporte à `pl.x − 34` et un toast s'affiche.
Proposer : il entre **par le bord de l'écran** en 250 ms avec 8 fantômes, `Combat.playerShockwave` (déjà là) à
l'arrivée, et son nom en Floater dans **sa couleur**, en Silkscreen 26 px — pas un toast en gris.

**Le repos.** Quand il ne se passe rien pendant 3 s : le compagnon se tourne vers le joueur (`flip` vers lui) et joue
son idle ; Uno s'assied. Six lignes dans `Pet.animStep`. C'est le genre de détail qui fait qu'un ami envoie une capture
d'écran à un autre.

### O — Le boss

**Arrivée** (`Room.spawnBoss`, `40_room.js:255`) : lui donner `b.entranceT = 1.4` et, pendant ce temps :
la caméra se déplace sur lui puis revient (`Camera.follow` vers `b`, retour au joueur), zoom 1 → 1,12 → 1,
deux bandes noires de 40 px en haut et en bas (rideau), le boss qui descend depuis 120 px au-dessus avec une ombre
qui grossit, et **trois impacts de secousse espacés d'un temps exact** (464 ms) : c'est le pas d'un colosse en mesure.
Le nom du boss en Silkscreen sur la bande du bas, pas au milieu de l'écran (l'audit HUD §2.11 relevait déjà la double
annonce simultanée).

**Changement de phase** : `UI.flashScreen(0.7, 60)` + `Feel.stop(180)` + `Camera.pulse = 0.05` + l'anneau du boss qui
change de couleur en 300 ms + la partition du HUD qui se remplit en une passe.

**Mort du boss** (`Room.onBossDefeated`) : remplacer `G.shake = 14` par une séquence de 1,6 s —
`Feel.slow(0.25, 1200)` · cinq explosions échelonnées de 200 ms sur le corps (`Combat.explosion` sans dégâts) ·
le corps qui blanchit puis s'écrase · `Camera.pulse` 0 → 0,10 → 0 · la pluie de 12 pièces **en arc** ·
et le compagnon qui court vers le corps.

### P — La mort du joueur

Le son fait déjà tout le travail (`Music.dying(2.2)`, tape stop). Il faut que l'image tombe dessus :

- `Feel.slow(0.18, 1400)` dès `Player.die()` — la simulation se traîne pendant que la bande ralentit ;
- **tout se fige sauf le joueur** : `G.enemies.forEach(e => e.frozen = true)` pendant la chute ;
- un voile `rgba(11,15,26, α)` qui monte à 0,55 en 1,2 s + une vignette corail ;
- `Camera` : zoom 1 → 1,3 sur le corps en 1,2 s (`Camera.pulse` + `setZoom`) ;
- **le compagnon vient s'asseoir à côté du corps** : Uno se couche, ORI se pose, Choupi tourne autour.
  C'est là que le jeu dit ce qu'il est. C'est l'image que les amis retiendront.
- L'écran de fin s'ouvre ensuite, sur le temps fort.

**La victoire** doit être la même image, à l'envers : le personnage debout, l'animal qui saute, un voile doré, l'anneau
de mesure qui s'ouvre en grand.

### Q — Entrée de salle

L'état `intro` de 0,8 s existe déjà et ne sert à rien (`Room.update` : `if (r.stateT >= 0.8) Room.begin()`). Le remplir :
- fondu au noir de 180 ms (le `fade` de `UI` existe) ;
- le joueur **entre par la gauche en marchant** (clip `walk`) sur 500 ms ;
- la caméra part 40 px à gauche et rejoint le joueur en 400 ms `outCubic` ;
- la porte de sortie s'allume au premier temps fort ;
- **un seul texte** : le nom de la salle, en Silkscreen, en bas de l'écran, en petit. Les trois autres bandeaux
  (`Vague 2`, l'objectif de défi, le doublon du titre) doivent être décalés ou supprimés — c'est exactement le sujet
  du §3.5 de l'audit HUD (« qui a le droit de parler pendant un combat »).

### R — Le contrat de couleur

- `#ff5e7a` **uniquement** pour le danger extérieur : dégâts subis, zones dangereuses, vignette.
- Barre de PV du joueur : vert `#7fff9a` → or `#ffd166` → corail `#ff5e7a`, avec **un motif** en plus de la teinte
  (hachures sous 25 %) pour rester lisible en protanopie.
- Ennemis : passer leur teinte de `#e33` à des rouges sourds (`#c0553f`, `#8a3b52`), pour laisser le rouge vif au danger.
- **Une seule couleur d'alerte** pour toutes les télégraphies : `#ff3b3b`, jamais employée ailleurs — au lieu de
  `telegraph.color` qui varie d'un ennemi à l'autre.
- Barre de vie des ennemis : ni rouge ni cyan — blanc cassé `#cfd6e6`, pour qu'on ne la confonde ni avec les PV du
  joueur ni avec l'XP.

### S — Squash & stretch sur les planches

`15_sprites.js:1162`, chemin `clip` de `drawBody` : `gait()` calcule `sx`, `sy` et `tilt` et **ils sont jetés**.
Les appliquer, comme le fait le chemin `body` juste en dessous (3 lignes : `ctx.rotate(g2.tilt)`, `ctx.scale(g2.sx, g2.sy)`).
Effet immédiat sur Martin, Gabriel, Jean et les quatre animaux, c'est-à-dire sur tout ce que le joueur regarde.

### Ce qui donne au jeu une signature reconnaissable en une capture d'écran

Cinq choses, dans cet ordre :

1. **L'anneau de mesure doré au sol sous le joueur** (§J). Personne d'autre n'a ça.
2. **Les chiffres en Silkscreen à contour noir**, gros, avec un critique deux fois plus grand (§C, §E).
3. **Le compagnon toujours dans le cadre**, dans sa couleur chaude, au milieu d'une palette froide (§N).
4. **Le sol qui a une lumière** — la passe de battement (§I.1) suffit à faire respirer une salle qui, aujourd'hui,
   ressemble à un tableur.
5. **Une seule couleur d'alerte** (§R) : sur une capture, on voit immédiatement ce qui est dangereux.

---

## 4. Références

### Ce que je reprends, de qui, et pourquoi

| Jeu | L'effet précis que je reprends | Où dans mes propositions |
|---|---|---|
| **Dead Cells** (Motion Twin) | Un critique **fige une image**, puis ralentit quelques dixièmes de seconde, avec une gerbe et un son d'impact dédié. Les développeurs citent explicitement Street Fighter IV et Garou : particules + *stop frames* + ralentis. | §B (hitstop 45/90 ms), §H (ralenti 120 ms au coup reçu) |
| **Dead Cells** | Le danger signalé **en périphérie** de l'écran, pas seulement dans le coin des PV. | §H (vignette de dégât et vignette de PV bas) |
| **Nuclear Throne / Vlambeer** — *The Art of Screenshake* (Jan Willem Nijman, 2013) | Trois amplitudes de secousse, une **impulsion directionnelle** avec une fraction de degré de **rotation** (sans rotation, ça lit comme un bug d'affichage), le recul de l'arme, les **cadavres qui restent** (permanence). Hitstop de 60-80 ms sur un coup destructeur. | §G (secousse), §F (recul d'arme), §D (les `decals`), §B |
| **Vlambeer** | La règle « ajouter des effets ne coûte rien, en enlever coûte cher » : chaque effet doit avoir un rôle. | §Q, §R (ce qu'on retire du monde) |
| **Martin Jonasson & Petri Purho** — *Juice it or lose it* (GDC Europe 2012) | La démonstration canonique : un casse-briques identique devient jouable par l'ajout progressif de squash & stretch, de tweens, de particules et de secousse. La liste des couches est exactement mon §A. | §A (le vocabulaire commun) |
| **Hi-Fi Rush** (Tango Gameworks) | Le rythme est porté par **le monde** — décor, machines, lumières, ennemis — le HUD n'étant qu'un renfort. Le jeu est animé pour 120 BPM à 60 fps, les poses-clés tombant sur le temps. | §I en entier — c'est ma référence n°1, et WAY a l'avantage inespéré d'avoir **toutes ses pistes au même BPM** |
| **Crypt of the NecroDancer** (Brace Yourself Games) | Le métronome est un élément **majeur** de l'écran, et le personnage respire visiblement sur le temps. | §I.2, §J |
| **Hades** (Supergiant) | La secousse alignée sur l'axe du coup, les particules qui jaillissent **le long du vecteur du coup**, la recharge de compétence qui produit un flash et un son. | §F, §G |
| **Enter the Gungeon** (Dodge Roll) | La télégraphie **au sol** (là où il ne faut pas être), et les barres de vie ennemies qui n'apparaissent qu'une fois l'ennemi entamé (déjà fait dans WAY). | §I.4, §I.7 |
| **Celeste** (Extremely OK Games) | Le dash : étirement du sprite, traînée de fantômes, poussière à l'arrivée, micro-arrêt. Le dash de Celeste dure 0,15 s et laisse une trace parfaitement lisible. | §M |
| **Downwell** (Moppin) | Une palette de **quatre couleurs** (fond, primaire, secondaire, tertiaire) qui rend chaque élément instantanément lisible et donne au jeu une signature immédiate. | §R (le contrat de couleur) |
| **Katana ZERO** (Askiisoft) | Le ralenti comme **récit**, pas comme mécanique : la mort et les moments forts changent la vitesse du monde. | §P (la mort du joueur) |
| **Vampire Survivors** (poncle) | La cascade de ramassages : un son qui monte, une nuée d'orbes aimantés. WAY a déjà le son, pas l'image. | §L |
| **Hollow Knight** (Team Cherry) | La barre de boss segmentée par phase, et le changement de phase traité comme un **événement** (arrêt, flash, changement de musique). | §O |
| **Path of Exile** (GGG) | La **fusion** des chiffres de dégâts rapprochés en un seul chiffre plus gros, plutôt que d'en empiler dix. | §C |
| **Brotato** (Blobfish) | HUD minimal pendant l'action, tout le détail entre les vagues. | §Q |

### Sources consultées

- [The Art of Screenshake — Jan Willem Nijman, Vlambeer (transcription et liste des points)](https://theengineeringofconsciousexperience.com/jan-willem-nijman-vlambeer-the-art-of-screenshake/)
- [The Art of Screenshake + code source commenté](https://gamedesignerkid.blogspot.com/2016/01/the-art-of-screenshake-source-code.html)
- [Squeezing more juice out of your game design (Game Developer)](https://www.gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-)
- [Game feel on the web: squash, shake, and the art of juice](https://valdemird.com/blog/game-feel-on-the-web/)
- [Interview with the developers of Dead Cells (80.lv) — le hitstop d'une image sur un critique](https://80.lv/articles/interview-with-the-developers-of-dead-cells)
- [Art Design Deep Dive: Using a 3D pipeline for 2D animation in Dead Cells](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)
- [Hi-Fi Rush Music-Synced Animation (Game Anim) — animé pour 120 BPM, poses-clés sur le temps](https://www.gameanim.com/2023/09/08/hi-fi-rush-music-synced-animation/)
- [In Hi-Fi Rush, Style is Substance (Unwinnable)](https://unwinnable.com/2023/07/21/in-hi-fi-rush-style-is-substance-165/)
- [Damage Numbers: Turning Abstract Stats into Satisfying Feedback (GameJuice)](https://www.gamejuice.co.uk/articles/damage-numbers-satisfying-feedback)
- [How to Build a Damage Number System (Bugnet)](https://bugnet.io/blog/how-to-build-a-damage-number-system)
- [Damage Numbers in RPGs (Shweep)](https://shweep.medium.com/damage-numbers-in-rpgs-1f0e3b1bc23a)
- [Juice It: Adding Camera Shake To Your Game](https://gt3000.medium.com/juice-it-adding-camera-shake-to-your-game-e63e1a16f0a6)
- [Maximizing Game Feel in Action Game Development — secousse directionnelle, décroissance exponentielle](https://salivity.github.io/game-development/article/maximizing-game-feel-in-action-game-development)
- [Downwell — palettes limitées (fond / primaire / secondaire / tertiaire)](https://downwell.fandom.com/wiki/Palettes)
- [Less is Lethal: How Limiting Your Color Palette Elevates Your Indie Game](https://www.wayline.io/blog/limiting-color-palette-indie-game)

---

## 5. Bibliothèques externes

J'ai regardé sérieusement chaque poste. **Ma recommandation est de n'ajouter aucune bibliothèque de runtime.**
Ce n'est pas de la coquetterie : WAY est un `index.html` unique assemblé par `dev/build.js`, et chaque dépendance
externe casse cette propriété (ou l'oblige à inliner du code qu'on ne relira jamais). Le détail, poste par poste :

| Besoin | Candidate | Poids / coût réel | Ce qu'elle apporte vraiment ici | Sans bibliothèque | Verdict |
|---|---|---|---|---|---|
| **Easing** | `bezier-easing` (~1 Ko), `eases` (~2 Ko) | négligeable, mais une dépendance de plus | rien : j'ai besoin de **cinq** courbes | les 6 lignes du §A (`outCubic`, `outQuad`, `inQuad`, `outBack`, `outElastic`) | **Sans lib.** Le gain est nul. |
| **Tweening** | `@tweenjs/tween.js` (~7 Ko gz), `anime.js` v4 (~17 Ko gz), GSAP core (~23-25 Ko gz, +7 Ko ScrollTrigger) | GSAP a en plus une licence commerciale sur certains plugins ; Popmotion n'est plus développé depuis 2022 | ces bibliothèques animent des **propriétés d'objets dans le temps réel du navigateur**. Or WAY tourne sur un pas fixe (`FIXED_DT`) avec un `Time.slow` : un tween GSAP **ignorerait le hitstop et le ralenti**, et se désynchroniserait à chaque pause. C'est une incompatibilité de fond, pas une question de poids. | interpoler dans les `update(dt)` existants, comme le fait déjà `UI` (`banners[i].t`) et `Pet` (`this.act`) | **Sans lib**, et pas seulement pour le poids. |
| **Particules** | `tsParticles` (~40-90 Ko selon les modules), `proton-engine` (~30 Ko) | lourdes, orientées « fond de page web » (réseaux de points, interactions souris) | **une régression** : le module `Particles` de WAY (55 lignes) est plus simple, déjà intégré au pas fixe, déjà plafonné à 600, et rendu dans la bonne couche. tsParticles ne sait pas dessiner dans un canvas de jeu déjà transformé par une caméra. | rien à faire — sauf ajouter `angle`/`spread`/`gravity`, qui existent déjà pour deux d'entre eux | **Sans lib.** |
| **Secousse d'écran** | `screen-shake` npm, `Kontra.js` | quelques Ko | 15 lignes de code trivial | le §G | **Sans lib.** |
| **Post-traitement 2D** (bloom, aberration, grain, désaturation) | `PixiJS` + `pixi-filters` (~120 Ko gz + WebGL), `glfx.js` (~15 Ko, WebGL) | **très cher** : cela impose de passer tout le rendu en WebGL, c'est-à-dire de réécrire le jeu | un vrai bloom et une vraie désaturation | Canvas 2D sait faire l'essentiel : `globalCompositeOperation = 'lighter'` pour le bloom (déjà employé dans `Room.renderFx`), `ctx.filter = 'saturate(0.3)'` pour la désaturation de la mort (supporté partout sauf sur de très vieux Safari — prévoir un voile en repli), un canvas hors écran flouté pour un halo. `shadowBlur` est déjà employé partout. | **Sans lib.** Le seul cas qui vaudrait WebGL serait un bloom généralisé, et ce n'est pas ce dont ce jeu a besoin. |
| **Polices** | Google Fonts en CDN | dépendance réseau incompatible avec le fichier unique | rien | **Silkscreen, VT323 et Pixelify Sans sont déjà dans `assets/fonts/`**, déjà en `@font-face`, déjà créditées — et **inutilisées dans le canvas** (§E) | **Déjà là.** C'est le meilleur rapport effet/effort du rapport et ça ne coûte pas un octet de plus. |
| **Icônes** | game-icons.net (CC BY 3.0, déjà crédité), Kenney (CC0) | ce sont des **assets**, pas une bibliothèque : on rastérise une planche au build | des icônes d'armes, de compétences et de statuts, qui manquent réellement | une planche de 60 icônes 24×24 en niveaux de gris teintés au rendu (`globalCompositeOperation`) pèse 15-30 Ko et s'ajoute au pipeline `Sprites.load()` existant | **Oui, mais en assets, pas en dépendance.** (Recommandation déjà faite par l'audit HUD, je la confirme.) |
| **Son** | Howler.js (~9 Ko gz), Tone.js (~200 Ko) | — | **rien du tout** : `AudioEngine.js` fait déjà mieux que Howler (bus, ducking, priorités de voix, réverbération par convolution, accordage sur la tonalité de la piste). Tone.js serait une régression de contrôle. | — | **Surtout pas.** |

**Conclusion :** tout ce que demande ce rapport s'écrit avec environ **400 lignes** ajoutées aux modules existants,
les trois polices déjà présentes, et les mécanismes déjà câblés mais inutilisés (`Time.slow`, `Camera.pulse`,
`Beat.timeToNextBar`, `Sprites.gait`, `G.room.blasts`, `Pet.act`). Le seul ajout externe que je recommande est un jeu
d'icônes, et c'est un asset.

---

## 6. Plan en trois séances

### Séance 1 — Le vocabulaire, les chiffres, l'impact (une journée)

*Objectif : que frapper et être frappé produisent une image. C'est la séance qui change le plus le jeu par heure passée.*

| # | Action | Fichier / fonction |
|---|---|---|
| 1 | Ajouter `Ease` et `Feel` (§A) | `00_core.js`, fin de fichier |
| 2 | Hitstop : 45 ms coup, 90 ms crit, 70 ms mort, 120 ms coup reçu (§B) | `30_entities.js` `Combat.hitEnemy`, `killEnemy`, `hitPlayer` |
| 3 | Réécrire `Floaters` : pop `outBack` 120 ms, arc balistique, contour 4 px, Silkscreen, 18/30/34 px, fusion à 14 px, cap 40 (§C) | `30_entities.js:63-85` + les 11 sites d'appel |
| 4 | Remplacer les 36 `ctx.font` « Segoe UI » par Silkscreen / VT323 (§E) | tous les modules, plus `40_room.js` (`▶`) et `32_enemies.js` (`✦`) |
| 5 | Particules d'impact **au corps** (`− hauteurCorps × 0,55`), en cône directionnel, + étincelle de contact (§F) | `30_entities.js:873` |
| 6 | Flash à deux temps (60 ms pleine, 70 ms à 0,35) + squash directionnel des ennemis (§A, §F) | `32_enemies.js:506-522` |
| 7 | Secousse directionnelle avec rotation, décroissance `outCubic`, hors du zoom, 3 amplitudes (§G) | `00_core.js` `Camera`, `90_main.js:25`, tous les `G.shake =` |
| 8 | Vignette de dégât + vignette de PV bas qui pulse sur `Beat` (§H) | `50_ui.js` (nouvelle `renderHurt`), appelée depuis `render` |
| 9 | Squash & stretch sur les planches d'animation (§S) | `15_sprites.js:1162`, chemin `clip` |

**À la fin de la séance 1**, un coup donné produit : arrêt, flash, écrasement, étincelles orientées, chiffre qui pop,
secousse dirigée. Un coup reçu produit : ralenti, vignette, recul en courbe. C'est déjà un autre jeu.

### Séance 2 — Le rythme dans le monde et les moments forts (une journée et demie)

*Objectif : qu'on comprenne en dix secondes, sans qu'on le dise, que ce jeu est un jeu de musique.*

| # | Action | Fichier / fonction |
|---|---|---|
| 1 | Mort d'ennemi : silhouette blanche 60 ms, écrasement 160 ms, couronne de 22 particules, onde au sol, tache persistante (§D) | `30_entities.js` `Combat.killEnemy`, `32_enemies.js` `Enemy.render` |
| 2 | Liste `G.room.decals` + rendu après `drawFloor`, cap 60, purge au changement de salle (§D) | `40_room.js` `Room.render`, `Room.load` |
| 3 | Drops en arc (`vy₀` négative + gravité) (§D) | `30_entities.js` `Pickups.spawn` / `update` |
| 4 | **Passe de lumière sur le temps** dans `Room.render` (§I.1) | `40_room.js:538`, juste après `Sprites.drawFloor` |
| 5 | **Anneau de mesure au sol** sous le joueur (§J) | `30_entities.js` `Player.render` |
| 6 | Respiration du joueur et des ennemis sur `Beat`, **partout** — retirer les conditions `G.room.tempo` / `beatLock` (§I.2, §I.3) | `15_sprites.js` `gait`, `30_entities.js:2006`, `32_enemies.js:520` |
| 7 | Télégraphies calées sur `Beat` au lieu de `sin(Time.now × 30)` (§I.4) | `32_enemies.js:449` |
| 8 | Pièces et orbes qui sautillent en cadence, avec déphasage par objet (§I.5) | `30_entities.js` `Pickups.render` / `spawn` |
| 9 | Porte : pouls sur `Beat`, ouverture au temps fort, onde verte (§I.6) | `40_room.js` `Room.render` |
| 10 | `Tempo.renderScore` : retirer la condition sur les pièges (§I.7) | `39_tempo.js:474` |
| 11 | Level-up mis en scène + écran ouvert sur le temps fort + `Camera.pulse` amorti (§K) | `40_room.js:822`, `00_core.js` `Camera.update` |
| 12 | Ramassage : pop, traînée d'aimantation, cascade **visible** indexée sur `Pickups.streak` (§L) | `30_entities.js` `Combat.collect`, `Pickups.render` |
| 13 | Boss : arrivée mise en scène (rideau, zoom, trois pas en mesure), phases (flash + arrêt), mort (séquence de 1,6 s) (§O) | `40_room.js:255`, `269`, `32_enemies.js` |
| 14 | Mort du joueur : ralenti 1,4 s, voile, zoom, ennemis figés, **le compagnon qui vient s'asseoir** (§P) | `40_room.js:943`, `50_ui.js`, `31_pets.js` |

### Séance 3 — Les compagnons et la signature (une journée)

*Objectif : qu'un ami qui a joué cinq minutes se souvienne de son animal, et qu'une capture d'écran soit reconnaissable.*

| # | Action | Fichier / fonction |
|---|---|---|
| 1 | Uno : accroupissement un temps avant, bond, `slash` de morsure, arrêt 40 ms, chiffre dans sa couleur (§N) | `31_pets.js` `Pet.render`, cas `'bite'` |
| 2 | Choupi : étirement en course, traînée, collecte en **deux temps** (objet → Choupi → joueur) (§N) | `31_pets.js`, cas `'collect'` |
| 3 | Tanuki : rotation pendant le roulement, 6 fantômes, onde au départ, flash d'anticipation (§N) | `31_pets.js`, cas `'charge'` |
| 4 | ORI : trait pointillé animé vers la cible, marque qui clignote sur `Beat`, flottement propre (§N) | `31_pets.js` `renderMark`, `render` |
| 5 | L'appel : arrivée depuis le bord avec fantômes, nom en Floater dans sa couleur (§N) | `31_pets.js` `Pet.call`, `snap` |
| 6 | Repos : le compagnon se tourne vers le joueur au bout de 3 s ; Uno s'assied (§N) | `31_pets.js` `animStep` |
| 7 | Dash : 5 fantômes, étirement, onde au départ, poussière à l'arrivée, dézoom léger (§M) | `30_entities.js` `Player.update` / `render`, `Skills.use` |
| 8 | **Bonus visuel de dash en rythme** (`Beat.distToBeat() < 0.09` → fantômes dorés, son plus haut) (§M) | `30_entities.js`, `AudioEngine.dash` |
| 9 | Entrée de salle : marche d'entrée, caméra qui rejoint, **un seul texte** en bas (§Q) | `40_room.js` `Room.update` état `intro`, `50_ui.js` |
| 10 | Contrat de couleur : `#ff5e7a` réservé, une seule couleur d'alerte, barre de PV tricolore + hachures, ennemis en rouges sourds (§R) | `32_enemies.js`, `50_ui.js`, `style.css`, définitions de contenu |
| 11 | Poser 2 à 4 `light` par salle dans le contenu (§I.8) | `content*.js`, définitions de salles |

---

## Annexe — Captures de référence

| Capture | Ce qu'elle démontre |
|---|---|
| `shots2/A_combat_2.png` | le combat réel : ennemis de 39 px, arc de mêlée de 4 px gris autour des jambes, chiffres de 12 px illisibles, sol en damier inerte |
| `crops/planche_flash.png` | 4 images à 13 ms de jeu d'intervalle après un critique : **les étincelles sortent des pieds de l'ennemi**, le chiffre « 90 » chevauche le décor, aucun arrêt |
| `crops/planche_mort.png` | une mort en **ralenti 8×** : le sprite disparaît en une image, il ne reste que des points orange de 3 px |
| `crops/flash_compare2.png` | mesure du flash blanc : +136 % de luminance. Le flash marche — il dure 0,12 s et personne ne le voit faute de hitstop |
| `shots2/C_mort_1.png` | trois « 52 » empilés au même endroit : la bouillie de chiffres |
| `shots2/G_levelup_1.png` | passage niveau 2 → 3 : **aucun effet dans le monde**. Et, à côté, la marque d'ORI, qui est le meilleur élément visuel du jeu |
| `shots2/K_boss_3.png`, `L_bossphase_5.png` | la télégraphie du boss, seul endroit où WAY ressemble à un jeu fini |
| `shots2/I_tempo_2.png` | la salle du tempo : le damier au sol et l'anneau du joueur — le seul endroit où le rythme est visible, et c'est une salle sur neuf |
| `shots3/W_entree_1.png` | entrée de salle : **quatre textes superposés au centre**, personnage déjà en place, aucune mise en scène |
| `shots/01_salle1.png` | le titre de salle affiché **deux fois** l'un sur l'autre (défaut déjà relevé par l'audit HUD) |
