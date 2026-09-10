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
| `amis` | l'établi Amis : créer un animal et un copain, export de `content5.js`, rechargement |
| `arme` | l'arme part de la main, à 45 % du corps, pour chaque type de corps |
| `chats` | Choupi, Tanuki et ORI : planches, tailles, ligne de sol, clips, équipes |
| `compagnons` | chantier 5 : « Personne » à +25 % PV / +15 % dégâts, l'onde d'arrivée d'« À l'appel », Choupi qui court chercher, ORI qui rend critique, les trois caractères, reliques hors élites, `Run.reset` |
| `duo` | l'attelage inséparable, les trois équipes, les modes de compagnon |
| `etape0` | le socle rythmique : horloge musicale, pièges cadencés, tourniquet |
| `gabriel` | Gabriel et Jean : planches, cases vides de fin, clips, pieds sur la ligne de sol |
| `habits` | plus de palier de tenue : habillé dès la salle 1, même corps après 9 greffes |
| `human` | une partie au clavier et à la souris en mode Normal : bouger, tirer, compétence, pause, mort, crédits, achat |
| `levels` | le bot joue 4 armes sur 9 salles (mode test) — équilibrage, pas de plantage |
| `martin` | Martin : cinq clips, boucle de marche, mort figée, retournement, pieds |
| `pets` | les neuf comportements du moteur des compagnons, un par un |
| `spawncheck` | chaque salle des quatre biomes : spawns et pièges sur des tuiles libres, porte atteignable |
| `sprites32` | une image 32×32 importée reste nette, un visage photo est réduit |
| `touch` | la couche tactile : joystick, tir, compétence sur un écran de téléphone simulé |
| `uno` | Uno : planches, équipe avec Martin, morsure, mode « à l'appel », mode « personne » |
| `vues` | trois images (sud, est, nord) pour quatre directions, retournement ouest |
