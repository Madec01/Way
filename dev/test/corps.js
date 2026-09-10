/* Un corps, une ligne de sol : tout ce qui se dessine debout pose ses pieds à y + Sprites.SOL — joueur à planche,
   visage collé, sprite entier, planche du jeu, compagnon à planche ou à image. Et le descripteur dit la vérité. */
const { test, out } = require('./lib');
test(async ({ page, ok, entrer, run }) => {
  await entrer('test');
  await run({ character: 'char_martin', pet: 'pet_uno' });

  const r = await page.evaluate(async () => {
    const SOL = Sprites.SOL;
    const Y = 150;
    /* mesure le bas du dessin (alpha > 200 : l'ombre à 0,32 ne compte pas) et sa hauteur */
    const boite = dessin => {
      const c = document.createElement('canvas');
      c.width = 240;
      c.height = 300;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      dessin(g);
      const d = g.getImageData(0, 0, 240, 300).data;
      let t = 1e9,
        b = -1;
      for (let y = 0; y < 300; y++)
        for (let x = 0; x < 240; x++)
          if (d[(y * 240 + x) * 4 + 3] > 200) {
            t = Math.min(t, y);
            b = Math.max(b, y);
          }
      return b < 0 ? null : { bas: b - Y, h: b - t + 1 };
    };
    /* une image carrée opaque, pour un sprite entier et un compagnon à image */
    const carre = document.createElement('canvas');
    carre.width = carre.height = 32;
    const cg = carre.getContext('2d');
    cg.fillStyle = '#ff00aa';
    cg.fillRect(0, 0, 32, 32);
    await Sprites.addCustom('corps_test_carre', carre.toDataURL());
    const visage = document.createElement('canvas');
    visage.width = visage.height = 32;
    const vg = visage.getContext('2d');
    vg.fillStyle = '#e8b58f';
    vg.fillRect(0, 0, 32, 32);
    await Sprites.addCustom('corps_test_visage', visage.toDataURL());
    await new Promise(r => setTimeout(r, 300));

    const out = {};
    for (const id of ['char_martin', 'char_gabriel', 'char_jean']) {
      const ch = Content.character(id);
      const opts = { anim: ch.anim, size: ch.size, clip: 'idle', clipT: 0, dir: 'e', walk: 0 };
      const m = boite(g => Sprites.drawBody(g, ch.sprite, 120, Y, opts));
      const c = Sprites.corps(ch.sprite, opts);
      out[ch.name] = { bas: m.bas, h: m.h, decl: Math.round(c.hauteur), sol: c.sol };
    }
    const optsBody = { body: 'corps_test_carre', size: 64, walk: 0 };
    let m = boite(g => Sprites.drawBody(g, 'player', 120, Y, optsBody));
    out['sprite entier'] = { bas: m.bas, h: m.h, decl: Math.round(Sprites.corps('player', optsBody).hauteur), sol: SOL };
    const optsFace = { face: 'corps_test_visage', walk: 0 };
    m = boite(g => Sprites.drawBody(g, 'player', 120, Y, optsFace));
    out['visage collé'] = { bas: m.bas, h: m.h, decl: Math.round(Sprites.corps('player', optsFace).hauteur), sol: SOL };
    m = boite(g => Sprites.drawBody(g, 'player', 120, Y, { walk: 0 }));
    out['planche du jeu'] = { bas: m.bas, h: m.h, decl: Math.round(Sprites.corps('player', {}).hauteur), sol: SOL };
    for (const d of Content.pets()) {
      const q = new Pet(d);
      q.x = 120;
      q.y = Y;
      q.clip = 'idle';
      q.clipT = 0;
      q.dx = 1;
      q.dy = 0;
      q.t = 0;
      q.moving = false;
      m = boite(g => q.render(g));
      out[d.name] = { bas: m.bas + (q.airborne ? 15 : 0), h: m.h, decl: null, sol: SOL };
    }
    const qi = new Pet(Object.assign({}, Content.pet('pet_uno'), { id: 'pet_image', anim: null, sprite: 'corps_test_carre', size: 48 }));
    qi.x = 120;
    qi.y = Y;
    qi.dx = 1;
    qi.dy = 0;
    qi.t = 0;
    qi.moving = false;
    m = boite(g => qi.render(g));
    out['compagnon à image'] = { bas: m.bas, h: m.h, decl: null, sol: SOL };
    return { SOL, out };
  });
  for (const [nom, v] of Object.entries(r.out)) {
    ok(`${nom} pose ses pieds à y + ${r.SOL}`, Math.abs(v.bas - r.SOL) <= 2, `bas mesuré à y + ${v.bas}, ${v.h} px de haut`);
    if (v.decl != null) ok(`${nom} : le descripteur dit sa hauteur`, Math.abs(v.decl - v.h) <= 6, `déclaré ${v.decl}, mesuré ${v.h}`);
  }

  /* --- l'ordre de dessin suit les pieds, joueur compris --- */
  const ordre = await page.evaluate(() => {
    const pl = G.player,
      q = G.pets[0];
    window.__ordre = [];
    const pr = pl.render,
      qr = q.render;
    pl.render = function (c) {
      window.__ordre.push('joueur');
      return pr.call(this, c);
    };
    q.render = function (c) {
      window.__ordre.push('animal');
      return qr.call(this, c);
    };
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 720;
    const g = c.getContext('2d');
    const rendu = () => {
      window.__ordre = [];
      render(g);
      return window.__ordre.filter(x => x === 'joueur' || x === 'animal').join(' puis ');
    };
    q.x = pl.x + 20;
    q.y = pl.y + 30;
    const devant = rendu();
    q.y = pl.y - 30;
    const derriere = rendu();
    pl.render = pr;
    q.render = qr;
    return { devant, derriere };
  });
  ok('un animal plus bas que le joueur est dessiné après lui', ordre.devant === 'joueur puis animal', ordre.devant);
  ok('un animal plus haut est dessiné avant lui', ordre.derriere === 'animal puis joueur', ordre.derriere);

  /* --- le corps regarde où il vise --- */
  const regard = await page.evaluate(() => {
    const pl = G.player;
    const masse = () => {
      const c = document.createElement('canvas');
      c.width = 1280;
      c.height = 720;
      const g = c.getContext('2d');
      pl.render(g);
      const d = g.getImageData(0, 0, 1280, 720).data;
      let n = 0,
        sx = 0;
      for (let i = 0; i < d.length; i += 4)
        if (d[i + 3] > 200) {
          n++;
          sx += (i / 4) % 1280;
        }
      return sx / n - pl.x;
    };
    pl.moveDir = { x: -1, y: 0 };
    pl.aim = 0;
    pl.facing = 1;
    const viseDroite = masse();
    pl.aim = Math.PI;
    pl.facing = -1;
    const viseGauche = masse();
    return { viseDroite: +viseDroite.toFixed(1), viseGauche: +viseGauche.toFixed(1) };
  });
  ok(
    'en marchant à gauche et visant à droite, le corps regarde à droite',
    regard.viseDroite > 0 && regard.viseGauche < 0,
    `centre de masse ${regard.viseDroite} visée droite, ${regard.viseGauche} visée gauche`
  );

  /* --- un geste de tir par tir réel, à la cadence de l'arme --- */
  const tirs = await page.evaluate(async () => {
    const pl = G.player;
    let gestes = 0;
    const t0 = pl.tir;
    pl.tir = function (i) {
      gestes++;
      return t0.call(this, i);
    };
    G.enemies = [];
    const avant = G.run.stats.shots;
    pl.bot = () => ({ move: { x: 0, y: 0 }, aim: 0, fire: true, skill: false });
    await new Promise(r => setTimeout(r, 2000));
    pl.bot = null;
    pl.tir = t0;
    return {
      tirs: G.run.stats.shots - avant,
      gestes,
      fps: pl.fireFps && +pl.fireFps.toFixed(1),
      arme: G.run.weapon,
      cadence: +pl.attackCd.toFixed(3),
    };
  });
  ok(
    'bouton tenu 2 s : autant de gestes que de tirs',
    tirs.tirs > 1 && tirs.gestes === tirs.tirs,
    `${tirs.tirs} tirs, ${tirs.gestes} gestes (${tirs.arme})`
  );
  ok("le geste est réparti sur la cadence de l'arme", tirs.fps > 0, `${tirs.fps} images/s`);

  /* --- le dash s'anime --- */
  const dash = await page.evaluate(() => {
    const pl = G.player;
    pl.clip = 'idle';
    pl.clipT = 0;
    pl.fireT = 0;
    pl.dashing = true;
    pl.dashT = 0;
    pl.dashVx = 300;
    pl.dashVy = 0;
    pl.dashDur = 1;
    for (let i = 0; i < 6; i++) pl.update(1 / 60);
    const r = { clip: pl.clip, clipT: +pl.clipT.toFixed(3) };
    pl.dashing = false;
    return r;
  });
  ok('pendant le dash, le personnage court', dash.clip === 'walk' && dash.clipT > 0, `clip ${dash.clip}, ${dash.clipT} s`);
  await page.screenshot({ path: out('corps.png') });
});
