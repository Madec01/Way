/* Chantier F-5 — le monde bat. Ce test mesure : le battement (Beat.pulse, 1 sur le temps, retombée en outCubic) ; la
   passe de lumière du sol (alpha 0,09 au temps fort, luminance mesurée au pixel entre battement plein et nul) ; la
   respiration du joueur au repos en salle 1 (échelle et écrasement qui suivent le battement) et celle des ennemis ;
   l'anneau de mesure sous le joueur (sonde ellipse, doré, 26 à 40 px) ; la télégraphie d'un ennemi et les annonces des
   pièges qui ne lisent plus l'horloge mais le tempo ; la partition au sol sans or (alerte et gris) ; la porte qui
   s'ouvre à moins de 30 ms d'un temps fort avec une onde verte ; les drops posés qui sautillent avec un déphasage ;
   deux à quatre lumières par salle. */
const { test } = require('./lib');
const fs = require('fs');
const path = require('path');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();
  await salle(1);

  const beat = await p.evaluate(() => {
    const ph = Beat.phase();
    return {
      pulse: Beat.pulse(),
      attendu: 1 - Ease.outCubic(ph),
      fns: ['pulse', 'pulseBar', 'phaseDiv'].every(k => typeof Beat[k] === 'function'),
      div: Beat.phaseDiv(2) >= 0 && Beat.phaseDiv(2) < 1,
    };
  });
  ok(
    'Beat.pulse bat en outCubic de la phase, avec pulseBar et phaseDiv',
    beat.fns && Math.abs(beat.pulse - beat.attendu) < 0.02 && beat.div,
    `pulse ${beat.pulse.toFixed(3)}`
  );

  /* --- la passe de lumière : luminance du sol, battement plein contre battement nul --- */
  const lumiere = await p.evaluate(() => {
    G.paused = true;
    G.enemies = [];
    const orig = Beat.pulse;
    const mesure = k => {
      Beat.pulse = () => k;
      const c = document.createElement('canvas');
      c.width = 1280;
      c.height = 720;
      const g = c.getContext('2d');
      Room.render(g);
      const d = g.getImageData(ROOM_X + 40, ROOM_Y + 40, 200, 120).data;
      let l = 0;
      for (let i = 0; i < d.length; i += 4) l += (d[i] + d[i + 1] + d[i + 2]) / 3;
      return { lum: l / (d.length / 4), alpha: G.room.lightAlpha };
    };
    const plein = mesure(1);
    const nul = mesure(0);
    Beat.pulse = orig;
    G.paused = false;
    return { plein, nul, bib: Beat.beatInBar() };
  });
  ok(
    'la passe de lumière bat : le sol est plus clair au battement plein qu’au battement nul (alpha 0,09 ou 0,045)',
    lumiere.plein.lum > lumiere.nul.lum + 2 &&
      (Math.abs(lumiere.plein.alpha - 0.09) < 0.001 || Math.abs(lumiere.plein.alpha - 0.045) < 0.001) &&
      lumiere.nul.alpha === 0,
    `luminance ${lumiere.nul.lum.toFixed(1)} → ${lumiere.plein.lum.toFixed(1)}, alpha ${lumiere.plein.alpha}`
  );

  /* --- la respiration du joueur au repos, l'anneau de mesure, la respiration des ennemis --- */
  const corps = await p.evaluate(() => {
    G.paused = true;
    const pl = G.player;
    pl.movingNow = false;
    const orig = Sprites.drawBody;
    let opts = null;
    Sprites.drawBody = function (ctx, key, x, y, o) {
      opts = o;
      return orig.call(Sprites, ctx, key, x, y, o);
    };
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 720;
    const g = c.getContext('2d');
    const ellipses = [];
    const oe = g.ellipse;
    g.ellipse = function (x, y, rx, ry, rot, a0, a1) {
      ellipses.push({ rx, ry, stroke: g.strokeStyle, x, y });
      return oe.apply(g, arguments);
    };
    const kb = Beat.pulse();
    pl.render(g);
    Sprites.drawBody = orig;
    const anneau = ellipses.filter(e => e.stroke === PAL.gold && e.rx >= 26 && e.rx <= 40 && Math.abs(e.ry - e.rx * 0.4) < 0.01);
    /* l'ennemi */
    const od = Sprites.draw;
    let eo = null;
    Sprites.draw = function (ctx, name, x, y, o) {
      eo = o;
      return od.call(Sprites, ctx, name, x, y, o);
    };
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, pl.x + 200, pl.y, {});
    e.spawnT = 0;
    const kb2 = Beat.pulse();
    e.render(g);
    Sprites.draw = od;
    const base = Math.min(1.5, Math.max(0.6, e.r / 14));
    e.dead = true;
    G.enemies = [];
    G.paused = false;
    return {
      kb,
      scale: opts && opts.scale,
      sx: opts && opts.sx,
      sy: opts && opts.sy,
      anneau: anneau.length,
      anneauR: anneau.map(a => a.rx.toFixed(1)).join('/'),
      enemyScale: eo && eo.scale,
      enemyBase: base,
      kb2,
      tempo: !!G.room.tempo,
    };
  });
  ok(
    'en salle 1 (pas de tempo), le joueur au repos respire avec le battement : échelle 1 + 0,04 k, écrasement −3 % / +3,5 %',
    !corps.tempo &&
      Math.abs(corps.scale - (1 + 0.04 * corps.kb)) < 0.01 &&
      Math.abs(corps.sx - (1 - 0.03 * corps.kb)) < 0.01 &&
      Math.abs(corps.sy - (1 + 0.035 * corps.kb)) < 0.01,
    `k ${corps.kb.toFixed(2)} : scale ${corps.scale && corps.scale.toFixed(3)}, sx ${corps.sx && corps.sx.toFixed(3)}, sy ${corps.sy && corps.sy.toFixed(3)}`
  );
  ok(
    'l’anneau de mesure doré est dessiné sous le joueur (ellipse de 26 à 40 px, ratio 0,4)',
    corps.anneau >= 2,
    `${corps.anneau} ellipses (${corps.anneauR})`
  );
  ok(
    'un ennemi respire aussi : échelle × (1 + 0,06 k)',
    Math.abs(corps.enemyScale - corps.enemyBase * (1 + 0.06 * corps.kb2)) < 0.01,
    `${corps.enemyScale && corps.enemyScale.toFixed(3)} pour base ${corps.enemyBase.toFixed(3)}, k ${corps.kb2.toFixed(2)}`
  );

  /* --- les sources : la télégraphie, les annonces des pièges, la partition --- */
  const src = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const en = src('32_enemies.js');
  const tele = en.slice(en.indexOf('if (this.tele) {'), en.indexOf('if (this.tele) {') + 900);
  const traps = src('34_traps.js');
  const tempo = src('39_tempo.js');
  const score = tempo.slice(tempo.indexOf('renderScore(ctx, room) {'), tempo.indexOf('renderFloor(ctx, room) {'));
  ok(
    'la télégraphie d’un ennemi ne lit plus l’horloge : elle bat à la croche (Beat.pulse(2))',
    !/Time\.now/.test(tele) && /Beat\.pulse\(2\)/.test(tele)
  );
  ok(
    'les annonces des pièges clignotent sur la double-croche, plus sur Math.sin(Time.now × 25)',
    !/Math\.sin\(Time\.now \* 25\)/.test(traps) && (traps.match(/Beat\.pulse\(4\)/g) || []).length >= 4,
    `${(traps.match(/Beat\.pulse\(4\)/g) || []).length} annonces`
  );
  ok(
    'la partition au sol ne peint plus d’or : gris pour l’annoncé, rouge d’alerte pour l’imminent, sans remplissage',
    !/#ffd166|PAL\.gold/.test(score) && /PAL\.alert/.test(score) && /PAL\.muted/.test(score) && !/fillRect\(x \+ 5/.test(score)
  );

  /* --- les drops posés sautillent, les lumières de salle --- */
  const reste = await p.evaluate(() => {
    G.paused = true;
    Pickups.spawn(G.player.x + 200, G.player.y, 'coin', 1);
    const q = Pickups.list[Pickups.list.length - 1];
    const lights = (G.room.anims || []).filter(a => a.kind === 'light');
    /* le halo se voit : sur un fond uni, le centre d'une lumière est plus clair que le fond, même au repos */
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 720;
    const g = c.getContext('2d');
    g.fillStyle = '#1a1c26';
    g.fillRect(0, 0, 1280, 720);
    Anim.renderOver(g, G.room);
    const lum = (x, y) => {
      const d = g.getImageData(x - 6, y - 6, 12, 12).data;
      let t = 0;
      for (let i = 0; i < d.length; i += 4) t += (d[i] + d[i + 1] + d[i + 2]) / 3;
      return t / (d.length / 4);
    };
    const l0 = lights[0];
    const halo = l0 ? lum(l0.cx, l0.cy) - lum(ROOM_X + ROOM_W / 2, ROOM_Y + ROOM_H / 2 + 60) : 0;
    G.paused = false;
    return { ph: q.ph, lights: lights.length, colors: lights.map(l => l.color), rayon: lights[0] && lights[0].p.radius, halo };
  });
  ok(
    'un drop naît avec un déphasage tiré (0 à 0,25 temps) pour sautiller en cadence sans être en rang',
    reste.ph >= 0 && reste.ph <= 0.25,
    `ph ${reste.ph.toFixed(2)}`
  );
  ok(
    'deux à quatre lumières néon battent dans la salle 1, et leur halo se voit même au repos',
    reste.lights >= 2 && reste.lights <= 4 && reste.colors.every(c => /^#/.test(c)) && reste.halo > 8,
    `${reste.lights} lumières ${reste.colors.join(' ')}, halo +${reste.halo.toFixed(1)}`
  );

  /* --- la porte s'ouvre sur le temps fort --- */
  await p.evaluate(() => {
    G.enemies = [];
    for (const w of G.room.waves) w.done = true;
    G.room.wavesStarted = true;
    G.room.state = 'fight';
    G.room.doorOpen = false;
    G.room.blasts = [];
    Room.clear();
  });
  const t0 = await p.evaluate(() => ({
    pending: G.room.pendingDoor,
    open: G.room.doorOpen,
    attente: +(G.room.doorAt - Beat.t).toFixed(3),
  }));
  const porte = await p.evaluate(async () => {
    for (let i = 0; i < 80 && !G.room.doorOpen; i++) await new Promise(r => setTimeout(r, 50));
    const r = G.room;
    return {
      open: r.doorOpen,
      at: r.doorOpenedAt,
      ms: r.doorOpenedAt ? Math.round(r.doorOpenedAt.phase * Beat.beatLen() * 1000) : null,
      onde: r.blasts.filter(b => b.r === 60 && b.color === PAL.life).length,
    };
  });
  ok(
    'la salle vidée n’ouvre pas la porte tout de suite : elle attend le temps fort suivant',
    t0.pending && !t0.open && t0.attente > 0.1,
    `dans ${t0.attente} s`
  );
  ok(
    'la porte s’ouvre sur le temps fort, à moins de 30 ms, avec une onde verte de 60 px',
    porte.open && porte.at && porte.at.bib === 0 && porte.ms < 30 && porte.onde === 1,
    `temps ${porte.at && porte.at.bib}, ${porte.ms} ms après le temps fort, ${porte.onde} onde`
  );
});
