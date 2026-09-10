/* Chantier 6 — choisir plutôt que subir. Ce test mesure :
   le tempo (fenêtre ±50 ms, bonus dès une série de 4, fausse note qui casse la série, jauge au HUD, et le bot qui
   ne vise rien reste sous 15 % de tirs bonifiés), la prépa (3 compétences, 2 paires bonus/malus au choix, la paire
   choisie s'applique), les greffes fondues (61, anciens ids résolus, aucune dominance dans la même rareté, la chance
   d'un effet suit ses paliers), et les calibrations à un seul palier avec remboursement à la migration v2 → v3. */
const { test } = require('./lib');
const { spawnSync } = require('child_process');
const path = require('path');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();

  /* --- tempo : fenêtre, série minimale, fausse note --- */
  await salle(7);
  const tempo = await p.evaluate(() => {
    const tp = G.room.tempo;
    tp.started = true;
    tp.combo = 0;
    G.paused = true;
    const orig = Beat.distToBeat;
    Beat.distToBeat = () => 0;
    const muls = [];
    for (let i = 1; i <= 6; i++) {
      tp.lastIdx = -10 - i;
      muls.push(+Tempo.playerAction(G.player, 'shot').toFixed(3));
    }
    const combo6 = tp.combo;
    Beat.distToBeat = () => 0.06;
    tp.lastIdx = -99;
    const hors = Tempo.playerAction(G.player, 'shot');
    const comboApres = tp.combo;
    Beat.distToBeat = () => 0.04;
    tp.lastIdx = -98;
    const dedans = Tempo.playerAction(G.player, 'shot');
    const comboDedans = tp.combo;
    Beat.distToBeat = orig;
    /* la jauge : quatre pastilles */
    let arcs = 0;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const a = ctx.arc.bind(ctx);
    ctx.arc = (...x) => {
      arcs++;
      return a(...x);
    };
    tp.combo = 2;
    Tempo.renderStreak(ctx, 100, 100, tp);
    G.paused = false;
    return { fenetre: Tempo.WINDOW, muls, combo6, hors, comboApres, dedans, comboDedans, arcs };
  });
  ok('la fenêtre est à ±50 ms', tempo.fenetre === 0.05, tempo.fenetre + ' s');
  ok(
    'les trois premières notes ne donnent rien, la quatrième déclenche le bonus',
    tempo.muls.slice(0, 3).every(m => m === 1) && tempo.muls.slice(3).every(m => m > 1) && tempo.combo6 === 6,
    tempo.muls.join(' ')
  );
  ok('une note à 60 ms du temps est une fausse note : série à zéro', tempo.hors === 1 && tempo.comboApres === 0);
  ok('une note à 40 ms compte', tempo.comboDedans === 1 && tempo.dedans === 1, 'série ' + tempo.comboDedans);
  ok('la jauge dessine 4 pastilles', tempo.arcs === 4, tempo.arcs + ' arcs');

  /* --- le bot, qui ne vise pas le tempo, reste sous 15 % de tirs bonifiés --- */
  const bot = await p.evaluate(async () => {
    let total = 0,
      bonifies = 0;
    const orig = Tempo.playerAction;
    Tempo.playerAction = function (pl, kind) {
      const r = orig.call(Tempo, pl, kind);
      if (G.room && G.room.tempo && G.room.tempo.started && kind === 'shot') {
        total++;
        if (r > 1) bonifies++;
      }
      return r;
    };
    UI.hideAll();
    const res = await window.__autoplay({
      seed: 41,
      timeScale: 40,
      render: false,
      weapon: 'weapon_pistol',
      skill: 'skill_dash',
      mode: 'test',
      maxRooms: 9,
      maxSeconds: 400,
      difficulty: 1,
      biome: 'biome_1',
      character: 'char_martin',
      pet: 'pet_uno',
    });
    Tempo.playerAction = orig;
    return { total, bonifies, salle: res.roomReached, outcome: res.outcome };
  });
  ok(
    'le bot au pistolet a moins de 15 % de tirs bonifiés dans les salles à tempo',
    bot.total > 50 && bot.bonifies / bot.total < 0.15,
    `${bot.bonifies}/${bot.total} (${Math.round((100 * bot.bonifies) / Math.max(1, bot.total))} %), salle ${bot.salle}, ${bot.outcome}`
  );

  /* --- prépa : 3 compétences, 2 paires, la paire choisie s'applique --- */
  await entrer('test');
  await p.evaluate(() => {
    Meta.profile.character = 'char_martin';
    Meta.profile.pet = 'pet_uno';
    Meta.profile.petMode = 'always';
    Meta.save();
    document.getElementById('hub-enter').click();
  });
  await p.waitForTimeout(1500);
  const prepa = await p.evaluate(() => {
    const r = G.run;
    const nS = document.querySelectorAll('[data-s]').length;
    const nP = document.querySelectorAll('[data-p]').length;
    const avant = r.levelPassive.bonus.name;
    const st0 = JSON.stringify(G.player.stats);
    document.querySelector('[data-p="1"]').click();
    const apres = r.levelPassive.bonus.name;
    const st1 = JSON.stringify(G.player.stats);
    const coche = document.querySelector('[data-p="1"] .pickmark') !== null;
    return { nS, nP, avant, apres, attendu: r.pairChoices[1].bonus.name, change: st0 !== st1, coche, distinctes: avant !== apres };
  });
  ok('trois compétences sont proposées', prepa.nS === 3, prepa.nS + ' compétences');
  ok('deux paires bonus/malus sont proposées', prepa.nP === 2, prepa.nP + ' paires');
  ok(
    'cliquer la seconde paire la pose sur la run et change les stats',
    prepa.apres === prepa.attendu && prepa.distinctes && prepa.change && prepa.coche,
    `${prepa.avant} → ${prepa.apres}`
  );
  await p.click('[data-s]');
  await p.click('#prep-go');
  await p.waitForTimeout(1200);
  const enSalle = await p.evaluate(() => ({ etat: G.state, salle: G.room && G.room.index, paire: G.run.levelPassive.bonus.name }));
  ok('la run part avec la paire choisie', enSalle.etat === 'run' && enSalle.salle === 1 && enSalle.paire === prepa.apres, enSalle.paire);

  /* --- greffes fondues --- */
  const greffes = await p.evaluate(() => {
    const U = Content.upgrades();
    const anciens = ['upg_balles_incendiaires', 'upg_double_canon', 'upg_satellite', 'upg_tempete', 'upg_munitions'];
    const resolus = anciens.map(id => Content.upgrade(id) && Content.upgrade(id).id);
    const presents = anciens.filter(id => U.some(u => u.id === id));
    const noms = U.map(u => u.name);
    const doublonsNoms = noms.filter((n, i) => noms.indexOf(n) !== i);
    /* paliers : reprendre Étincelle trois fois = 45 % de chance de brûler */
    G.debug.invuln = true;
    G.enemies = [];
    const def = Content.upgrade('upg_etincelle');
    for (let i = 0; i < 3; i++) Run.takeUpgrade(def);
    const h = G.player.hooks.onHit.find(x => x.effect === 'burn');
    const ed = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    let brules = 0;
    for (let i = 0; i < 300; i++) {
      const e = Room.spawnEnemy(ed, G.player.x + 300, G.player.y, {});
      e.hp = 9999;
      Combat.hitEnemy(e, 1, { silent: true, noCrit: true });
      if (e.status && e.status.burn) brules++;
      G.enemies = [];
    }
    return {
      n: U.length,
      resolus,
      presents,
      doublonsNoms,
      stacks: h && h.stacks,
      brules,
      sangFroid: Content.upgrade('upg_sang_froid').name,
    };
  });
  ok('61 greffes, une par effet', greffes.n === 61 && greffes.doublonsNoms.length === 0, greffes.n + ' greffes');
  ok(
    'les anciens ids se résolvent vers la greffe qui les a absorbées',
    greffes.presents.length === 0 &&
      greffes.resolus.join() === 'upg_etincelle,upg_second_canon,upg_orbes_gardiennes,upg_foudre_ambiante,upg_tranchant',
    greffes.resolus.join(' ')
  );
  ok('Étincelle ×3 brûle bien plus souvent que ×1 (15 %)', greffes.stacks === 3 && greffes.brules > 90, `${greffes.brules}/300 brûlés`);
  ok('la greffe « Sang-froid » a laissé son nom au caractère de Jean', greffes.sangFroid === "Nerfs d'acier", greffes.sangFroid);
  const check = spawnSync(process.execPath, [path.join(__dirname, '..', 'check-greffes.js')], { encoding: 'utf8' });
  ok(
    'aucune greffe n’en domine une autre de la même rareté (dev/check-greffes.js)',
    check.status === 0,
    (check.stdout || '').trim().split('\n')[0]
  );

  /* --- calibrations : un seul palier, remboursement à la migration --- */
  const calib = await p.evaluate(() => {
    const ids = ['meta_memoire_selective', 'meta_apercu_coffre', 'meta_quatrieme_choix'];
    return ids.map(id => Content.metaPassive(id).tiers.length);
  });
  ok('les trois calibrations fictives n’ont plus qu’un palier', calib.join() === '1,1,1', calib.join(' '));
  await p
    .evaluate(() => {
      localStorage.clear();
      localStorage.setItem(
        'way_save',
        JSON.stringify({
          v: 2,
          coins: 100,
          metaTiers: { meta_memoire_selective: 3, meta_apercu_coffre: 2, meta_quatrieme_choix: 3, meta_vitalite: 2 },
        })
      );
      location.reload();
    })
    .catch(() => {});
  await p.waitForTimeout(2500);
  const migre = await p.evaluate(() => ({ v: Meta.profile.v, coins: Meta.profile.coins, tiers: Meta.profile.metaTiers }));
  ok(
    'v2 → v3 : les paliers fantômes sont remboursés (80+150 + 70 + 100+170) et ramenés à 1',
    migre.v === 3 &&
      migre.coins === 100 + 230 + 70 + 270 &&
      migre.tiers.meta_memoire_selective === 1 &&
      migre.tiers.meta_apercu_coffre === 1 &&
      migre.tiers.meta_quatrieme_choix === 1 &&
      migre.tiers.meta_vitalite === 2,
    `v${migre.v}, ${migre.coins} crédits, ${JSON.stringify(migre.tiers)}`
  );
});
