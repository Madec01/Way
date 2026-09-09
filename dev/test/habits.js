/* Plus de paliers de tenue : le personnage est habillé dès la salle 1 et ne change plus de la run. */
const { test, out } = require('./lib');
test(async ({ page: p, ok, entrer }) => {
  await entrer('normal');

  ok('plus de sélecteur de tenue au débogage', !(await p.$('#d-tier')));
  const api = await p.evaluate(() => ({ bodyTier: typeof Sprites.bodyTier, force: 'forceTier' in G.debug }));
  ok('bodyTier a disparu de l\'API', api.bodyTier === 'undefined' && !api.force, 'Sprites.bodyTier : ' + api.bodyTier);

  const portrait = await p.evaluate(() => {
    const c = [...document.querySelectorAll('canvas.portrait-canvas')].pop(); if (!c) return null;
    const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++;
    return { w: c.width, h: c.height, pix: n };
  });
  ok('le portrait du hub montre un corps', portrait && portrait.pix > 200, portrait ? portrait.pix + ' pixels opaques' : 'aucun canvas');
  await p.screenshot({ path: out('habits_hub.png') });

  await p.click('#hub-enter'); await p.waitForTimeout(900);
  await p.click('[data-s]'); await p.click('#prep-go'); await p.waitForTimeout(1500);
  const t0 = await p.evaluate(() => ({ greffes: G.run.upgrades.length, salle: G.room.index }));
  await p.screenshot({ path: out('habits_salle1.png') });
  ok('on entre en salle 1 sans aucune greffe', t0.greffes === 0 && t0.salle === 1, t0.greffes + ' greffe(s), salle ' + t0.salle);

  /* même silhouette après 9 greffes qu'à zéro : plus de progression de tenue */
  const meme = await p.evaluate(async () => {
    G.player.x = 640; G.player.y = 360; G.player.moveDir = { x: 0, y: 0 }; G.player.walkT = 0; G.player.aim = 0;
    await new Promise(r => setTimeout(r, 400));
    const u = Content.upgrades ? Content.upgrades()[0] : null;
    for (let i = 0; i < 9; i++) G.run.upgrades.push({ def: u || { id: 'x' }, stacks: 1 });
    await new Promise(r => setTimeout(r, 400));
    return { greffes: G.run.upgrades.length };
  });
  ok('la tenue ne change plus avec les greffes', meme.greffes === 9, '0 puis 9 greffes, même corps dessiné');
  await p.screenshot({ path: out('habits_9greffes.png') });
});
