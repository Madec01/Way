const { test, out } = require('./lib');
test(async ({ page: p, context, ok, entrer, salle, run, sansPause, erreurs: errs }) => {
  await entrer('test');
  const m = await p.evaluate(() => {
    const c = Content.character('char_martin');
    return {
      existe: c && c.id === 'char_martin',
      nom: c && c.name,
      clips: c && Object.keys(c.anim || {}),
      debloque: Meta.characterUnlocked('char_martin'),
    };
  });
  ok('Martin est dans le jeu, débloqué', m.existe && m.debloque, m.nom + ' · clips : ' + (m.clips || []).join(', '));

  const pl = await p.evaluate(() => {
    const inf = {};
    for (const k of ['idle', 'walk', 'fire', 'pick', 'death']) {
      const s = Sprites.sheetInfo('char_martin_' + k);
      inf[k] = s ? `${s.cols}×${s.rows} de ${s.fw}px (${s.n} images)` : 'ABSENTE';
    }
    return inf;
  });
  ok(
    'les cinq planches sont lues en 3×3 de 48 px, 7 images pleines',
    Object.values(pl).every(v => v === '3×3 de 48px (7 images)'),
    Object.entries(pl)
      .map(([k, v]) => k + ' ' + v)
      .join(' · ')
  );

  const jouer = await p.evaluate(async () => {
    Meta.profile.character = 'char_martin';
    Meta.save();
    document.getElementById('hub-enter').click();
    await new Promise(r => setTimeout(r, 1800));
    return { nom: G.player.char.name, clip: G.player.clip, anim: !!G.player.char.anim };
  });
  ok('on entre en salle avec lui', jouer.nom === 'Martin' && jouer.anim, 'clip au repos : ' + jouer.clip);

  /* les clips s'enchaînent selon ce que fait le joueur */
  const clips = await p.evaluate(async () => {
    const out = {};
    const pl2 = G.player;
    G.debug.invuln = true;
    pl2.animStep(0.016, false, false);
    out.repos = pl2.clip;
    for (let i = 0; i < 5; i++) pl2.animStep(0.016, true, false);
    out.marche = pl2.clip;
    pl2.tir(0.3); // le geste de tir part d'un tir réel, plus du bouton tenu
    for (let i = 0; i < 5; i++) pl2.animStep(0.016, false, true);
    out.tir = pl2.clip;
    pl2.pickT = 0.5;
    for (let i = 0; i < 3; i++) pl2.animStep(0.016, true, false);
    out.ramasse = pl2.clip;
    pl2.pickT = 0;
    pl2.fireT = 0;
    pl2.dead = true;
    pl2.animStep(0.016, false, false);
    out.mort = pl2.clip;
    pl2.dead = false;
    return out;
  });
  ok(
    "les cinq clips s'enchaînent selon l'action",
    clips.repos === 'idle' && clips.marche === 'walk' && clips.tir === 'fire' && clips.ramasse === 'pick' && clips.mort === 'death',
    Object.entries(clips)
      .map(([k, v]) => k + '→' + v)
      .join(' · ')
  );

  /* les images défilent vraiment, et la mort se fige sur la dernière */
  const defile = await p.evaluate(() => {
    /* empreinte des pixels dessinés : deux images différentes de la planche donnent deux empreintes différentes */
    const lire = (clip, t) => {
      const c = document.createElement('canvas');
      c.width = c.height = 120;
      const g = c.getContext('2d');
      Sprites.drawBody(g, 'player', 60, 50, { anim: G.player.char.anim, clip, clipT: t, size: 64 });
      const d = g.getImageData(0, 0, 120, 120).data;
      let h = 2166136261;
      for (let i = 0; i < d.length; i += 4) {
        h ^= d[i] + d[i + 1] * 3 + d[i + 3] * 7 + i;
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };
    /* 7 images à 12 im/s : une image dure 1/12 s, la boucle fait 7/12 s */
    const marche = [0, 1, 2, 3, 4, 5, 6].map(i => lire('walk', i / 12 + 0.004));
    const boucle = lire('walk', 7 / 12 + 0.004) === marche[0];
    const mort = [1.2, 2.5, 8].map(t => lire('death', t));
    return { distincts: new Set(marche).size, boucle, mortFigee: mort[0] === mort[1] && mort[1] === mort[2] };
  });
  ok('les sept images de marche défilent', defile.distincts === 7, defile.distincts + ' images distinctes sur 7');
  ok('la marche boucle sur la première image', defile.boucle, 'après 7 images, retour au début');
  ok('la mort se fige sur la dernière image', defile.mortFigee, 'pas de retour au début');

  const dir = await p.evaluate(() => {
    const lire = flip => {
      const c = document.createElement('canvas');
      c.width = c.height = 120;
      const g = c.getContext('2d');
      Sprites.drawBody(g, 'player', 60, 50, { anim: G.player.char.anim, clip: 'walk', clipT: 0.1, size: 64, flip });
      const d = g.getImageData(0, 0, 120, 120).data;
      let n = 0,
        sx = 0;
      for (let i = 0; i < d.length; i += 4)
        if (d[i + 3] > 128) {
          n++;
          sx += (i / 4) % 120;
        }
      return n ? Math.round(sx / n) : -1;
    };
    return { est: lire(false), ouest: lire(true) };
  });
  ok(
    "vers l'ouest le sprite est retourné",
    Math.abs(dir.est - 60 + (dir.ouest - 60)) < 6,
    `centre de masse ${dir.est} à l'est, ${dir.ouest} à l'ouest`
  );

  /* les pieds tombent sur la ligne de sol, et la silhouette fait la hauteur du joueur standard */
  const pieds = await p.evaluate(() => {
    const mesure = opts => {
      const c = document.createElement('canvas');
      c.width = 200;
      c.height = 240;
      const g = c.getContext('2d');
      Sprites.drawBody(g, 'player', 100, 120, opts);
      const d = g.getImageData(0, 0, 200, 240).data;
      let top = 999,
        bot = -1,
        l = 999,
        r = -1;
      for (let y = 0; y < 240; y++)
        for (let x = 0; x < 200; x++)
          if (d[(y * 200 + x) * 4 + 3] > 128) {
            if (y < top) top = y;
            if (y > bot) bot = y;
            if (x < l) l = x;
            if (x > r) r = x;
          }
      return { top, bot, h: bot - top + 1, w: r - l + 1 };
    };
    const martin = mesure({ anim: G.player.char.anim, clip: 'idle', clipT: 0, size: 96 });
    const g = Content.character('char_gabriel');
    const standard = mesure({ anim: g.anim, size: g.size, clip: 'idle', clipT: 0 });
    return { martin, standard, solMartin: martin.bot, solStandard: standard.bot, info: Sprites.sheetInfo('char_martin_idle').foot };
  });
  ok(
    'ses pieds tombent sur la ligne de sol du jeu',
    Math.abs(pieds.solMartin - pieds.solStandard) <= 4,
    `bas du dessin : Martin ${pieds.solMartin}, Gabriel ${pieds.solStandard} (marge sous les pieds détectée : ${(1 - pieds.info) * 48} px de la case)`
  );
  ok(
    'il fait la même taille que Gabriel',
    Math.abs(pieds.martin.h - pieds.standard.h) <= 12,
    `${pieds.martin.w}×${pieds.martin.h} contre ${pieds.standard.w}×${pieds.standard.h}`
  );

  await p.evaluate(() => {
    G.player.x = 300;
    G.player.y = 360;
    G.player.clip = 'walk';
    G.player.clipT = 0.1;
  });
  await p.waitForTimeout(500);
  await p.screenshot({ path: out('martin_jeu.png') });
});
