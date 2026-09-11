/* Chantier 9, troisième séance — les salles cadencées et la performance. Ce test mesure : quatre salles de combat du
   biome 1 portent une partition de décor animé (dalles, ondes, ventilateurs, néons) qui joue en mesure ; les néons de
   ces salles suivent la partition, pas le tirage automatique ; les wagons du train sont habillés ; le masque du défi
   « lumières coupées » n'est refait qu'une image sur deux et son disque est pré-dessiné ; le flash blanc des ennemis
   vient d'un cache ; et le coût de l'un et de l'autre est mesuré. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();

  const part = await p.evaluate(() => {
    const rooms = Content.roomsOf('biome_1');
    const out = {};
    for (const r of rooms) {
      const a = r.anims || [];
      out[r.index] = {
        n: a.length,
        kinds: [...new Set(a.map(x => x.kind))].join('+'),
        hits: a.every(x => x.beats && x.beats.hits && x.beats.hits.length),
      };
    }
    return out;
  });
  const cadencees = Object.keys(part).filter(i => part[i].n && part[i].kinds !== 'light');
  ok(
    'quatre salles de combat du biome 1 portent une partition de décor animé, chaque élément avec ses coups',
    cadencees.length >= 4 && cadencees.every(i => part[i].hits),
    cadencees.map(i => 'salle ' + i + ' : ' + part[i].kinds).join(' · ')
  );

  /* la partition joue : le pouls d'une dalle avance avec le temps, et revient au coup suivant */
  await salle(1, 'biome_1');
  const joue = await p.evaluate(async () => {
    const a = G.room.anims.find(x => x.kind === 'tile_color');
    const auto = G.room.anims.filter(x => x.kind === 'light').length;
    const ks = [];
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 60));
      ks.push(+a.pulse(Room.trapTime(G.room, a)).k.toFixed(2));
    }
    const montes = ks.filter((k, i) => i && k > ks[i - 1]).length;
    const retombes = ks.filter((k, i) => i && k < ks[i - 1]).length;
    return { kinds: [...new Set(G.room.anims.map(x => x.kind))].join('+'), auto, ks, montes, retombes };
  });
  ok(
    'en salle 1, le damier bat : son pouls monte entre deux coups et retombe au coup suivant ; les néons sont ceux de la partition (quatre)',
    joue.montes >= 4 && joue.retombes >= 1 && joue.auto === 4,
    JSON.stringify(joue)
  );
  /* les dalles dessinent : des pixels colorés apparaissent au centre juste après un coup */
  const dessine = await p.evaluate(async () => {
    const a = G.room.anims.find(x => x.kind === 'tile_color');
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 16));
      if (a.pulse(Room.trapTime(G.room, a)).k < 0.15) break;
    }
    const c = document.createElement('canvas');
    c.width = c.height = 300;
    const g = c.getContext('2d');
    g.translate(-tileX(9) + 30, -tileY(4) + 30);
    a.render(g, Room.trapTime(G.room, a));
    const d = g.getImageData(0, 0, 300, 300).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
    return n;
  });
  ok('juste après un coup, les dalles colorées couvrent une vraie surface (plus de 5 000 pixels)', dessine > 5000, dessine + ' pixels');

  /* les wagons du train */
  await salle(2, 'biome_3');
  const wagons = await p.evaluate(() => {
    const w = G.room.modular.filter(m => m.look === 'wagon');
    const c = document.createElement('canvas');
    c.width = 1400;
    c.height = 800;
    const g = c.getContext('2d');
    Modular.render(g, G.room);
    const d = g.getImageData(0, 0, 1400, 800).data;
    let gris = 0,
      n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) (n++, Math.abs(d[i] - d[i + 1]) < 12 && d[i] > 60 ? gris++ : 0);
    return { n: w.length, pixels: n, gris };
  });
  ok(
    'les trois wagons du train sont habillés en wagonnets (dessin gris, pas de cadre bleu)',
    wagons.n === 3 && wagons.pixels > 2000 && wagons.gris > wagons.pixels * 0.4,
    JSON.stringify(wagons)
  );

  /* le masque des lumières : une image sur deux, disque pré-dessiné, et la mesure */
  await p.evaluate(() => (G.debug.forceChallenge = 'lights'));
  await salle(2, 'biome_1');
  await p.waitForTimeout(2200);
  const lum = await p.evaluate(() => {
    const ctx = Engine.ctx;
    const flush = () => ctx.getImageData(0, 0, 1, 1);
    const mesure = (n = 12, lots = 4) => {
      render(ctx);
      flush();
      let best = 1e9;
      for (let l = 0; l < lots; l++) {
        const t0 = performance.now();
        for (let i = 0; i < n; i++) {
          render(ctx);
          flush();
        }
        best = Math.min(best, (performance.now() - t0) / n);
      }
      return +best.toFixed(2);
    };
    const c = G.room.challenge;
    c.maskBuilds = 0;
    c.maskTick = 0;
    for (let i = 0; i < 20; i++) render(ctx);
    const builds = c.maskBuilds;
    const avec = mesure();
    G.room.challenge = null;
    const sans = mesure();
    G.room.challenge = c;
    return { defi: c.id, builds, avec, sans, delta: +(avec - sans).toFixed(2) };
  });
  ok(
    'lumières coupées : le masque est refait 10 fois pour 20 images, et le défi coûte moins de 2 ms par image dans le banc',
    lum.defi === 'lights' && lum.builds === 10 && lum.delta < 2,
    JSON.stringify(lum)
  );
  await p.evaluate(() => (G.debug.forceChallenge = null));

  /* le flash précalculé */
  const flash = await p.evaluate(() => {
    const ctx = Engine.ctx;
    const pl = G.player,
      pool = Content.biome('biome_1').enemyPool;
    G.enemies = [];
    for (let i = 0; i < 12; i++) {
      const e = Room.spawnEnemy(Content.enemy(pool[i % pool.length]), pl.x - 300 + (i % 6) * 100, pl.y - 120 + Math.floor(i / 6) * 120, {});
      if (e) ((e.spawnT = 0), (e.flash = 5));
    }
    const avant = Sprites.flashCacheSize();
    render(ctx);
    const apres = Sprites.flashCacheSize();
    render(ctx);
    const stable = Sprites.flashCacheSize();
    G.enemies = [];
    return { avant, apres, stable };
  });
  ok(
    'le flash blanc de douze ennemis remplit le cache une fois (au moins 7 images blanchies) et ne le regrossit plus',
    flash.apres - flash.avant >= 7 && flash.stable === flash.apres,
    JSON.stringify(flash)
  );
});
