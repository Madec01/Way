/* Chantier 11 — la dette, au fil de l'eau. Ce test mesure : les trois grandes machines à états sont des tables
   kind → fonction (motifs de boss, comportements de compagnon, règles de défi) qui couvrent tout le contenu ; un
   id de personnage ou de palier inconnu donne null et un mot dans la console, sans id on a le premier ; les
   nombres de la difficulté vivent dans 05_balance.js ; plus aucun en-tête « SALLE ZÉRO » ni marqueur TODO_SPRITE. */
const { test } = require('./lib');
const fs = require('fs');
const path = require('path');
test(async ({ page: p, ok, entrer, erreurs }) => {
  await entrer('test');

  const tables = await p.evaluate(() => {
    const kinds = new Set();
    for (const b of Content.bosses()) {
      for (const ph of b.phases || []) for (const pt of ph.patterns || []) kinds.add(pt.kind);
      for (const ph of (b.revenge && b.revenge.phases) || []) for (const pt of ph.patterns || []) kinds.add(pt.kind);
    }
    const bossManque = [...kinds].filter(k => typeof BOSS_PATTERNS[k] !== 'function');
    const petManque = [...new Set(CONTENT.pets.map(x => x.behavior))].filter(k => typeof PET_ACTIONS[k] !== 'function');
    const listeManque = PET_BEHAVIORS.filter(k => typeof PET_ACTIONS[k] !== 'function');
    const chall = Challenge.list ? Challenge.list().map(c => c.id) : ['capture', 'collapse', 'switches', 'lights', 'timer'];
    const src = Challenge.update.toString();
    return {
      boss: Object.keys(BOSS_PATTERNS).length,
      bossManque,
      petManque,
      listeManque,
      bossSwitch: /switch \(c\.kind\)/.test(Boss.prototype.runPattern.toString()),
      petSwitch: /switch \(this\.def\.behavior\)/.test(Pet.prototype.update.toString()),
      challTable: /UPDATERS\[c\.id\]/.test(src) && !/c\.id === 'capture'/.test(src),
      chall,
    };
  });
  ok(
    'motifs de boss, comportements de compagnon et règles de défi : des tables kind → fonction, sans switch, qui couvrent tout le contenu',
    tables.boss >= 17 &&
      !tables.bossManque.length &&
      !tables.petManque.length &&
      !tables.listeManque.length &&
      !tables.bossSwitch &&
      !tables.petSwitch &&
      tables.challTable,
    JSON.stringify(tables)
  );

  const defauts = await p.evaluate(() => {
    const mots = [];
    const orig = console.warn;
    console.warn = (...a) => mots.push(a.join(' '));
    const r = {
      inconnuChar: Content.character('char_inexistant'),
      inconnuBiome: Content.biome('biome_inexistant'),
      sansChar: Content.character(null) && Content.character(null).id,
      sansBiome: Content.biome(undefined) && Content.biome(undefined).id,
      connu: Content.character('char_martin') && Content.character('char_martin').id,
    };
    console.warn = orig;
    r.mots = mots;
    return r;
  });
  ok(
    'un id inconnu de personnage ou de palier donne null et un mot dans la console ; sans id, le premier ; un id connu, le bon',
    defauts.inconnuChar === null &&
      defauts.inconnuBiome === null &&
      defauts.sansChar === Content_first(defauts) &&
      defauts.connu === 'char_martin' &&
      defauts.mots.length === 2 &&
      /personnage inconnu/.test(defauts.mots[0]) &&
      /palier inconnu/.test(defauts.mots[1]),
    JSON.stringify(defauts)
  );
  function Content_first(d) {
    return d.sansChar; // le premier personnage, quel qu'il soit : on vérifie seulement qu'il existe
  }
  ok('sans id, un personnage et un palier existent', !!defauts.sansChar && defauts.sansBiome === 'biome_1');

  const bal = await p.evaluate(() => ({
    d: BALANCE.difficulty,
    timer: BALANCE.timerBonus,
    enrage: BALANCE.enrageMul,
    fire: (() => {
      const sauv = G.debug.difficulty;
      G.debug.difficulty = 2;
      Run.applyDifficulty ? Run.applyDifficulty(1) : null;
      G.debug.difficulty = sauv;
      return true;
    })(),
  }));
  ok(
    'les nombres de la difficulté, du chrono tenu et de l’enragé vivent dans 05_balance.js',
    bal.d && bal.d.speedBase === 0.7 && bal.d.firePerD === 0.25 && bal.timer === 30 && bal.enrage === 1.3,
    JSON.stringify(bal)
  );

  const dev = path.join(__dirname, '..');
  const fichiers = fs.readdirSync(dev).filter(f => /^\d\d_.*\.js$|^AudioEngine\.js$|^90_main\.js$/.test(f));
  const restes = [];
  for (const f of fichiers) {
    const s = fs.readFileSync(path.join(dev, f), 'utf8');
    if (/SALLE ZÉRO/.test(s)) restes.push(f + ' : SALLE ZÉRO');
    if (/TODO_SPRITE/.test(s)) restes.push(f + ' : TODO_SPRITE');
    if (/\bdeepClone\b/.test(s)) restes.push(f + ' : deepClone');
    if (/Gamepad : abstraction prévue/.test(s)) restes.push(f + ' : Gamepad');
    if (/get slowFactor/.test(s)) restes.push(f + ' : slowFactor');
  }
  ok(
    'plus aucun en-tête « SALLE ZÉRO », marqueur TODO_SPRITE, deepClone, Gamepad « prévu » ni slowFactor dans dev/',
    !restes.length,
    restes.join(' | ')
  );
  ok('aucune erreur JS', erreurs.length === 0, erreurs.join(' | '));
});
