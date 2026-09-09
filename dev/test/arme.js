const { test, out } = require('./lib');
test(async ({ page: p, context, ok, entrer, salle, run, sansPause, erreurs: errs }) => {
  const persos = ['char_martin', 'char_gabriel', 'char_jean', 'char_neuf'];
  const s = await p.$('.menuscreen.splash');
  if (s) {
    await s.click();
    await p.waitForTimeout(2700);
  }
  await entrer('test');
  await p.evaluate(async () => {
    document.getElementById('hub-enter').click();
    await new Promise(r => setTimeout(r, 1600));
  });
  if (await p.$('[data-s]')) {
    await p.click('[data-s]');
    await p.click('#prep-go');
    await p.waitForTimeout(1600);
  }
  await p.evaluate(() => {
    G.debug.invuln = true;
    G.enemies = [];
  });

  const r = await p.evaluate(ids => {
    const out = [];
    for (const id of ids) {
      const ch = Content.character(id);
      G.player.char = ch;
      G.player.clip = 'idle';
      G.player.clipT = 0;
      G.player.aim = 0;
      G.player.moveDir = { x: 0, y: 0 };
      const c = document.createElement('canvas');
      c.width = 240;
      c.height = 260;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      const dv = { dir: 'e', flip: false };
      const y = 160;
      Sprites.drawBody(g, ch.sprite || 'player', 120, y, {
        anim: ch.anim,
        body: ch.body,
        face: ch.face,
        size: ch.size,
        clip: 'idle',
        clipT: 0,
        dir: 'e',
        walk: 0,
      });
      const hMain = Sprites.handY(ch.sprite || 'player', y, {
        anim: ch.anim,
        clip: 'idle',
        body: ch.body,
        face: ch.face,
        size: ch.size,
        dir: 'e',
      });
      /* boîte du corps */
      const d = g.getImageData(0, 0, 240, 260).data;
      let top = 999,
        bot = -1;
      for (let yy = 0; yy < 260; yy++)
        for (let xx = 0; xx < 240; xx++)
          if (d[(yy * 240 + xx) * 4 + 3] > 40) {
            if (yy < top) top = yy;
            if (yy > bot) bot = yy;
          }
      const part = (bot - hMain) / (bot - top); // 0 = tête, 1 = pieds
      out.push({ id, corps: bot - top + 1, main: Math.round(hMain), part: +part.toFixed(2) });
    }
    return out;
  }, persos);
  for (const x of r)
    console.log(`   ${x.id.padEnd(14)} corps ${x.corps} px · arme à ${(x.part * 100).toFixed(0)} % de hauteur depuis les pieds`);
  ok(
    "l'arme est à hauteur de main pour tous",
    r.every(x => x.part >= 0.38 && x.part <= 0.58),
    r.map(x => `${x.id.replace('char_', '')} ${(x.part * 100).toFixed(0)} %`).join(' · ')
  );

  /* image témoin : les quatre, arme tendue */
  const url = await p.evaluate(ids => {
    const c = document.createElement('canvas');
    c.width = 240 * ids.length;
    c.height = 240;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#171a26';
    g.fillRect(0, 0, c.width, c.height);
    ids.forEach((id, i) => {
      const ch = Content.character(id);
      G.player.char = ch;
      G.player.clip = 'idle';
      G.player.clipT = 0;
      G.player.aim = 0;
      G.player.x = 120 + i * 240;
      G.player.y = 150;
      g.save();
      G.player.render(g);
      g.restore();
      g.fillStyle = '#8a93ad';
      g.font = '13px system-ui';
      g.textAlign = 'center';
      g.fillText(ch.name, 120 + i * 240, 225);
      g.strokeStyle = '#2a3048';
      g.beginPath();
      g.moveTo(i * 240, 175.5);
      g.lineTo((i + 1) * 240, 175.5);
      g.stroke();
    });
    return c.toDataURL();
  }, persos);
  require('fs').writeFileSync(out('arme.png'), Buffer.from(url.split(',')[1], 'base64'));
});
