/* Banc A/B du rendu : la même scène dessinée par le build courant (A) et par une copie d'un build précédent
   `index_ancien.html` à la racine (B), en alternance dans le même navigateur, min de 6 lots de 10 images, avec un
   `getImageData` après chaque image pour forcer le rendu (sans lui, le canvas ne fait qu'enregistrer les ordres).
   Usage :  git stash && node dev/build.js && cp index.html index_ancien.html && git stash pop && node dev/build.js
            node dev/perf-ab.js            (puis rm index_ancien.html)
   Lire les écarts « scène − vide » par page plutôt que les valeurs brutes : la première page ouverte est toujours
   environ 1 ms plus lente que la seconde, quel que soit le build. ZZ_SWAP=1 inverse les rôles. */
const { test } = require('./test/lib');
test(async ({ page, context, ok, url }) => {
  const ouvrir = async p => {
    const urlA = process.env.ZZ_SWAP ? url.replace('index.html', 'index_ancien.html') : url;
    const urlB = process.env.ZZ_SWAP ? url : url.replace('index.html', process.env.ZZ_B || 'index_ancien.html');
    await p.goto(p === page ? urlA : urlB);
    await p.waitForTimeout(600);
    await p
      .waitForFunction(() => window.G && (G.state === 'menu' || G.state === 'title' || document.querySelector('.menuscreen')), null, {
        timeout: 15000,
      })
      .catch(() => {});
    const splash = await p.$('.menuscreen.splash');
    if (splash) {
      await splash.click();
      await p.waitForTimeout(2700);
    }
    await p.click('#btn-test');
    await p.waitForTimeout(500);
    if (await p.$('#intro-skip')) {
      await p.click('#intro-skip');
      await p.waitForTimeout(300);
    }
    await p.waitForFunction(() => window.G && G.state === 'hub', null, { timeout: 10000 }).catch(() => {});
    await p.evaluate(() => {
      setInterval(() => {
        if (G.paused && G.state === 'run') {
          if (UI.hideChoice) UI.hideChoice();
          G.paused = false;
        }
      }, 50);
    });
    await p.evaluate(() => {
      Debug.gotoRoom(2);
      Debug.hide();
      G.debug.invuln = true;
    });
    await p.waitForTimeout(1200);
    await p.evaluate(() => {
      Engine.stop && Engine.stop();
      G.paused = true;
    });
  };
  const B = await context.newPage();
  await ouvrir(page);
  await ouvrir(B);
  const scenes = {
    vide: `vider()`,
    pieces100: `vider(); for (let i = 0; i < 60; i++) Pickups.spawn(pl.x - 300 + (i % 12) * 50, pl.y - 150 + Math.floor(i / 12) * 60, 'coin', 1);
      for (let i = 0; i < 40; i++) Pickups.spawn(pl.x - 300 + (i % 10) * 60, pl.y + 180 + Math.floor(i / 10) * 40, 'xp', 3);
      for (const p of Pickups.list) { p.z = 0; p.vz = 0; p.magnet = false; }`,
    particules288: `vider(); for (let k = 0; k < 8; k++) { Particles.spawn(pl.x - 200 + k * 60, pl.y, { count: 36, color: '#ffffff', size: 3, speedMax: 1, glow: true }); }
      for (const p of Particles.list) { p.life = 50; p.t = 0.1; }`,
    projectiles40: `vider(); for (let i = 0; i < 40; i++) Projectiles.list.push({ x: pl.x - 300 + i * 15, y: pl.y - 100, vx: 1, vy: 0, r: 4, color: '#9ff', kind: 'bullet', owner: 'player', t: 0, life: 50, dmg: 1 });`,
    ennemis12tele: `vider(); ennemis(12); for (const e of G.enemies) e.tele = 1;`,
    ennemis12blancs: `vider(); ennemis(12); for (const e of G.enemies) { e.dead = true; e.deathT = 0.02; }`,
    ondes40: `vider(); for (let i = 0; i < 40; i++) G.room.blasts.push({ x: pl.x - 300 + i * 15, y: pl.y, r: 14, t: 0.05, life: 50, color: '#ffd166' });`,
    pireCas: `vider(); ennemis(12, (e, i) => { if (i < 4) { e.dead = true; e.deathT = 0.02; } });
      for (let i = 0; i < 60; i++) Pickups.spawn(pl.x - 300 + (i % 12) * 50, pl.y - 150 + Math.floor(i / 12) * 60, 'coin', 1);
      for (let i = 0; i < 40; i++) Pickups.spawn(pl.x - 300 + (i % 10) * 60, pl.y + 180 + Math.floor(i / 10) * 40, 'xp', 3);
      for (const p of Pickups.list) { p.z = 0; p.vz = 0; p.magnet = false; }
      for (let k = 0; k < 3; k++) Particles.spawn(pl.x - 100 + k * 100, pl.y, { count: 36, color: '#ffffff', size: 3, speedMax: 1, glow: true });
      for (const p of Particles.list) { p.life = 50; p.t = 0.1; }
      for (let i = 0; i < 20; i++) Projectiles.list.push({ x: pl.x - 300 + i * 30, y: pl.y - 100, vx: 1, vy: 0, r: 4, color: '#9ff', kind: 'bullet', owner: 'player', t: 0, life: 50, dmg: 1 });
      for (let i = 0; i < 20; i++) G.room.blasts.push({ x: pl.x - 300 + i * 30, y: pl.y, r: 14, t: 0.05, life: 50, color: '#ffd166' });`,
  };
  const prelude = `const ctx = Engine.ctx; const pl = G.player; const pool = Content.biome('biome_1').enemyPool;
    const flush = () => ctx.getImageData(0, 0, 1, 1);
    const vider = () => { G.enemies = []; Pickups.list = []; Particles.list = []; Projectiles.list = []; Floaters.list = []; G.room.blasts = []; };
    const ennemis = (n, f) => { for (let i = 0; i < n; i++) { const e = Room.spawnEnemy(Content.enemy(pool[i % pool.length]), pl.x - 300 + (i % 6) * 100, pl.y - 120 + Math.floor(i / 6) * 120, {}); if (e && f) f(e, i); } };`;
  const mesure = `render(ctx); flush(); const t0 = performance.now(); for (let i = 0; i < 10; i++) { render(ctx); flush(); } return (performance.now() - t0) / 10;`;
  const res = {};
  for (const [nom, scene] of Object.entries(scenes)) {
    const best = { A: 1e9, B: 1e9 };
    for (let lot = 0; lot < 6; lot++) {
      for (const [k, p] of [
        ['A', page],
        ['B', B],
      ]) {
        const ms = await p.evaluate(`(() => { ${prelude} ${scene}; ${mesure} })()`);
        best[k] = Math.min(best[k], ms);
      }
    }
    res[nom] = `A ${best.A.toFixed(2)} / B ${best.B.toFixed(2)}`;
  }
  ok('A = nouveau, B = ancien (ms par image, min de 6 lots de 10)', true, JSON.stringify(res, null, 1));
});
