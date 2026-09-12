/* Chantier F-3 — le contrat de couleur. Ce test balaie les sources : le corail, le rouge d'alerte et l'ancien rouge de
   boss n'existent plus en dur hors de PAL (00_core.js) et de l'atelier ; toutes les télégraphies prennent PAL.alert et
   plus la couleur de l'ennemi ; la barre de vie ennemie est en blanc cassé ; les cœurs sont verts ; les trois ennemis
   rouge vif sont en rouges sourds ; les animaux ont leurs couleurs chaudes et leurs dégâts s'écrivent dans leur
   couleur ; la barre de PV du joueur est hachurée sous 25 %. */
const { test } = require('./lib');
const fs = require('fs');
const path = require('path');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  const dev = path.join(__dirname, '..');
  const fichiers = fs.readdirSync(dev).filter(f => /^\d\d_.*\.js$/.test(f) && !/^(00_core|80_atelier)/.test(f));
  const durs = fichiers.flatMap(f =>
    fs
      .readFileSync(path.join(dev, f), 'utf8')
      .split('\n')
      .map((l, i) => [f + ':' + (i + 1), l])
      .filter(([, l]) => /'#ff5e7a'|'#ff3b3b'|'#ff3b5c'|"#ff5e7a"|"#ff3b3b"/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l.trim()))
      .map(([ou]) => ou)
  );
  ok('plus de corail ni de rouge d’alerte écrit en dur hors de PAL', durs.length === 0, durs.join(', ') || 'aucun');

  await entrer('test');
  await sansPause();
  await salle(2);
  const src = await p.evaluate(() => ({
    pal: PAL.danger === '#ff5e7a' && PAL.alert === '#ff3b3b' && PAL.enemyBar === '#cfd6e6' && PAL.life === '#7fff9a',
    tele: !Enemy.prototype.render.toString().includes('telegraph.color') && Enemy.prototype.render.toString().includes('PAL.alert'),
    bar: Enemy.prototype.render.toString().includes('PAL.enemyBar'),
    coeur: Pickups.render.toString().includes('PAL.life'),
    bossTele: Boss.prototype.startPattern ? Boss.prototype.startPattern.toString().includes('PAL.alert') : true,
    boss: !!Content.boss('boss_etalon_07'),
  }));
  ok(
    'PAL est en place ; les télégraphies lisent PAL.alert, la barre ennemie PAL.enemyBar, les cœurs PAL.life',
    src.pal && src.tele && src.bar && src.coeur,
    JSON.stringify(src)
  );

  const boss = await p.evaluate(async () => {
    Debug.gotoRoom(5);
    await new Promise(r => setTimeout(r, 2200));
    const b = G.room.boss;
    return b && { tele: b.telegraph && b.telegraph.color, color: b.color };
  });
  ok(
    'le boss télégraphie dans la couleur d’alerte, pas dans la sienne',
    boss && boss.tele === '#ff3b3b' && boss.color !== '#ff3b3b',
    JSON.stringify(boss)
  );

  await salle(2);
  const contenu = await p.evaluate(() => ({
    rodeur: Content.enemy('enemy_rodeur').color,
    meche: Content.enemy('enemy_meche').color,
    baril: (Content.enemy('enemy_baril') || {}).color,
    vifs: Content.enemies()
      .filter(e => /^#(f[0-9a-f]|e[0-9a-f])[0-5][0-9a-f][0-5][0-9a-f]$/i.test(e.color))
      .map(e => e.id),
    pets: Content.pets().map(x => [x.id, x.color, PAL.pets[x.id]]),
  }));
  ok(
    'rôdeur, mèche et baril sont en rouges sourds ; aucun ennemi en rouge vif',
    contenu.rodeur === '#c0553f' && contenu.meche === '#d8613f' && contenu.baril === '#a8402e' && contenu.vifs.length === 0,
    contenu.vifs.join(', ') || 'aucun rouge vif'
  );
  ok(
    'les quatre animaux ont leurs couleurs chaudes (Uno orange, Choupi doré, Tanuki brun, ORI mauve)',
    contenu.pets.every(([, c, attendu]) => c === attendu),
    contenu.pets.map(x => x.join(' ')).join(' · ')
  );

  const uno = await p.evaluate(() => {
    G.enemies = [];
    const pl = G.player;
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, pl.x + 200, pl.y, {});
    e.hp = 9999;
    Floaters.list = [];
    Time.slowUntil = 0;
    Combat.hitEnemy(e, 14, { noCrit: true, silent: true, color: PAL.pets.pet_uno });
    const f = Floaters.list[0];
    const srcBite = (PET_ACTIONS.bite.toString() + Pet.prototype.update.toString()).includes('color: this.color'); // chantier 11 : la morsure vit dans la table
    return { color: f && f.color, kind: f && f.kind, srcBite };
  });
  ok(
    'un dégât d’Uno s’écrit en orange, dans sa couleur',
    uno.color === '#e08a4a' && uno.kind === 'dmg' && uno.srcBite,
    `${uno.color} · ${uno.kind}`
  );

  const hachures = await p.evaluate(() => {
    G.debug.hudProbe = true;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const pl = G.player;
    pl.hp = pl.stats.maxHp * 0.2;
    UI.renderHud(ctx);
    const bas = { hatch: !!UI.hudProbe.flags.hatch, col: UI.hudProbe.flags.hpColor };
    pl.hp = pl.stats.maxHp * 0.5;
    UI.renderHud(ctx);
    const milieu = { hatch: !!UI.hudProbe.flags.hatch, col: UI.hudProbe.flags.hpColor };
    pl.hp = pl.stats.maxHp;
    return { bas, milieu };
  });
  ok(
    'la barre de PV est hachurée sous 25 % (la couleur seule ne suffit pas), pas à 50 %',
    hachures.bas.hatch && hachures.bas.col === '#ff3b3b' && !hachures.milieu.hatch && hachures.milieu.col === '#ffd166',
    JSON.stringify(hachures)
  );
});
