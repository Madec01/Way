/* La mort se voit : le personnage joue sa chute, l'écran de fin attend la fin de la planche. Et le clip
   « ramasse » ne se joue que pour un vrai objet. */
const { test, out } = require('./lib');
test(async ({ page, ok, entrer, run }) => {
  await entrer('normal'); // en mode test toutes les calibrations sont achetées, seconde chance comprise : on ne mourrait pas
  await run({ character: 'char_martin', pet: null, petMode: 'none' });

  /* --- ramasser : un orbe d'XP ne courbe pas le personnage, un cœur si --- */
  const ram = await page.evaluate(() => {
    const pl = G.player;
    pl.pickT = 0;
    Combat.collect({ kind: 'xp', x: pl.x, y: pl.y, value: 1 });
    const orbe = pl.pickT;
    Combat.collect({ kind: 'coin', x: pl.x, y: pl.y, value: 1 });
    const piece = pl.pickT;
    Combat.collect({ kind: 'heart', x: pl.x, y: pl.y, value: 1 });
    const coeur = pl.pickT;
    return { orbe, piece, coeur };
  });
  ok("un orbe d'XP ou une pièce ne déclenche pas « ramasse »", ram.orbe === 0 && ram.piece === 0, `orbe ${ram.orbe} · pièce ${ram.piece}`);
  ok('un cœur déclenche « ramasse »', ram.coeur > 0, ram.coeur.toFixed(2) + ' s');

  /* --- mourir --- */
  await page.waitForTimeout(600); // le clip « ramasse » du cœur se termine
  const t0 = Date.now();
  const juste = await page.evaluate(() => {
    G.debug.invuln = false;
    G.player.hp = 1;
    Combat.hitPlayer(999, { type: 'contact' });
    for (let i = 0; i < 4; i++) G.player.animStep(1 / 60, false, false);
    /* le corps se dessine encore : on le rend sur un canvas à part et on compte les pixels */
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 720;
    const g = c.getContext('2d');
    G.player.render(g);
    const d = g.getImageData(0, 0, 1280, 720).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++;
    return { dead: G.player.dead, clip: G.player.clip, pixels: n, overlay: G.overlay, paused: G.paused };
  });
  ok('mort, le personnage joue sa chute', juste.dead && juste.clip === 'death', 'clip ' + juste.clip);
  ok('mort, le corps est encore dessiné', juste.pixels > 300, juste.pixels + ' pixels opaques');
  ok("l'écran de fin n'est pas encore là", juste.overlay !== 'end' && !juste.paused, 'overlay ' + juste.overlay);

  await page.waitForTimeout(1600);
  const apres = await page.evaluate(() => ({ overlay: G.overlay, paused: G.paused, clipT: G.player.clipT }));
  ok("l'écran de fin arrive après la chute", apres.overlay === 'end' && apres.paused, `après ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await page.screenshot({ path: out('mort.png') });
});
