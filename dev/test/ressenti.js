/* Chantier F-1 — le vocabulaire et l'impact. Ce test mesure : le vocabulaire d'animation (Ease, Feel) ; l'arrêt sur
   image à chaque coup (30 ms, 70 sur un critique, 60 à la mort, jamais par-dessus un ralenti de compétence, un petit
   arrêt par 250 ms au plus) ; les étincelles d'impact qui partent du corps de l'ennemi et dans le sens du coup ;
   l'étincelle de contact ; l'écrasement de l'ennemi ; la secousse de caméra avec une direction, une rotation, et la
   même amplitude quel que soit le zoom ; le recul de l'arme (2 px pistolet, 6 masse) ; les polices pixel dans le
   monde ; le squash & stretch appliqué aux planches d'animation en marche. */
const { test } = require('./lib');
const fs = require('fs');
const path = require('path');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();
  await salle(2);

  const vocab = await p.evaluate(() => ({
    ease: [Ease.outCubic(0), Ease.outCubic(1), +Ease.outBack(0.5).toFixed(3), Ease.outBack(1)],
    feel: ['stop', 'slow', 'shake', 'pop', 'squash', 'tick'].every(k => typeof Feel[k] === 'function'),
    fonts: [FONT_PIXEL.includes('Silkscreen'), FONT_TEXT.includes('VT323')],
  }));
  ok(
    'Ease et Feel existent et Ease.outBack dépasse 1 à mi-course',
    vocab.ease[0] === 0 && vocab.ease[1] === 1 && vocab.ease[2] > 1 && vocab.ease[3] === 1 && vocab.feel && vocab.fonts.every(Boolean),
    vocab.ease.join(' ')
  );

  /* --- arrêt sur image --- */
  const stop = await p.evaluate(() => {
    G.paused = true;
    G.enemies = [];
    const pl = G.player;
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const mk = () => {
      const e = Room.spawnEnemy(def, pl.x + 200, pl.y, {});
      e.hp = 9999;
      return e;
    };
    const mesure = (crit, tue) => {
      Time.slowUntil = 0;
      Time.slow = 1;
      Feel.lastStop = -9;
      const e = mk();
      if (tue) e.hp = 1;
      Combat.hitEnemy(e, 5, { noCrit: !crit, crit: crit || undefined });
      return +(Time.slowUntil - Time.now).toFixed(3);
    };
    const coup = mesure(false, false);
    const critique = mesure(true, false);
    const mort = mesure(false, true);
    /* un second coup dans les 250 ms n'arrête plus rien */
    Time.slowUntil = 0;
    Feel.lastStop = Time.now;
    Combat.hitEnemy(mk(), 5, { noCrit: true });
    const rafale = Time.slowUntil - Time.now;
    /* un ralenti de compétence en cours n'est pas écrasé */
    Time.slow = 0.35;
    Time.slowUntil = Time.now + 3;
    Feel.lastStop = -9;
    Combat.hitEnemy(mk(), 5, { noCrit: true });
    const pendantRalenti = [Time.slow, +(Time.slowUntil - Time.now).toFixed(2)];
    Time.slowUntil = 0;
    Time.slow = 1;
    return { coup, critique, mort, rafale, pendantRalenti, scale: Time.slow };
  });
  ok(
    'un coup fige 30 ms, un critique 70, une mort 60',
    stop.coup === 0.03 && stop.critique === 0.07 && stop.mort >= 0.06,
    `${stop.coup} / ${stop.critique} / ${stop.mort} s`
  );
  ok('pas plus d’un petit arrêt par 250 ms', stop.rafale <= 0, 'second coup : ' + stop.rafale);
  ok(
    'un ralenti de compétence n’est pas écrasé par un arrêt',
    stop.pendantRalenti[0] === 0.35 && stop.pendantRalenti[1] >= 2.9,
    stop.pendantRalenti.join(' · ')
  );

  /* --- étincelles au corps, dans le sens du coup ; étincelle de contact ; écrasement --- */
  const impact = await p.evaluate(() => {
    G.enemies = [];
    const pl = G.player;
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, pl.x + 200, pl.y, {});
    e.hp = 9999;
    Particles.list = [];
    G.room.slashes = [];
    Time.slowUntil = 0;
    Combat.hitEnemy(e, 5, { noCrit: true, vx: 1, vy: 0 });
    const h = Combat.bodyH(e);
    const ys = Particles.list.map(q => q.y);
    const vers = Particles.list.filter(q => q.vx > 0).length;
    const spark = G.room.slashes.find(s => s.spark);
    return {
      n: Particles.list.length,
      h: Math.round(h),
      ey: e.y,
      yMin: Math.min(...ys),
      yMax: Math.max(...ys),
      vers,
      spark: spark && Math.round(e.y - spark.y),
      sq: Feel.squashK(e),
      pieds: Particles.list.filter(q => Math.abs(q.y - e.y) < 3).length,
    };
  });
  ok(
    'les étincelles partent du corps de l’ennemi, pas de ses pieds',
    impact.n >= 7 && impact.pieds === 0 && impact.yMax < impact.ey - 5,
    `corps ${impact.h} px, étincelles entre y−${Math.round(impact.ey - impact.yMax)} et y−${Math.round(impact.ey - impact.yMin)}, aucune aux pieds`
  );
  ok('elles partent dans le sens du coup', impact.vers === impact.n, `${impact.vers}/${impact.n} vers la droite`);
  ok(
    'une étincelle de contact et un écrasement accompagnent le coup',
    impact.spark > 5 && impact.sq > 0.5,
    `contact à y−${impact.spark}, écrasement ${impact.sq.toFixed(2)}`
  );

  /* --- la secousse : direction, rotation, même amplitude à zoom 1 et 1,5 --- */
  const secousse = await p.evaluate(() => {
    const sonde = zoom => {
      Camera.zoom = zoom;
      Camera.k = null;
      Camera.kick(9, 0, 200);
      Camera.k.t = 0.02;
      const calls = [];
      const ctx = {
        translate: (x, y) => calls.push(['t', x, y]),
        rotate: a => calls.push(['r', a]),
      };
      const osc = Camera.shake(ctx);
      const rot = calls.find(c => c[0] === 'r');
      const dep = calls[calls.length - 1];
      return { osc: +osc.toFixed(3), rot: rot && +rot[1].toFixed(5), dx: +dep[1].toFixed(3), dy: +dep[2].toFixed(3) };
    };
    const a = sonde(1),
      b = sonde(1.5);
    Camera.zoom = 1;
    Camera.k = null;
    return { a, b, gshake: typeof G.shake === 'number' ? G.shake : 'absent' };
  });
  ok(
    'la secousse a une direction (x seulement pour un angle 0) et une rotation',
    secousse.a.dx !== 0 && secousse.a.dy === 0 && secousse.a.rot !== 0,
    JSON.stringify(secousse.a)
  );
  ok(
    'elle a la même amplitude à zoom 1 et à zoom 1,5',
    secousse.a.dx === secousse.b.dx && secousse.a.rot === secousse.b.rot,
    `${secousse.a.dx} contre ${secousse.b.dx}`
  );
  const shakeSrc = fs
    .readdirSync(path.join(__dirname, '..'))
    .filter(f => /^\d\d_.*\.js$/.test(f))
    .filter(f => /G\.shake\s*=/.test(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')));
  ok('plus aucun G.shake = … dans le code (tout passe par Feel.shake)', shakeSrc.length === 0, shakeSrc.join(', ') || 'aucun');

  /* --- recul de l'arme --- */
  const recul = await p.evaluate(() => {
    const pl = G.player;
    const out = {};
    for (const [id, attendu] of [
      ['weapon_pistol', 2],
      ['weapon_hammer', 6],
      ['weapon_blade', 3],
    ]) {
      Run.equip(id, pl.skill.id);
      pl.kickT = 1;
      Weapons.kick(pl, 0);
      out[id] = [pl.kickT, pl.kickMag, attendu];
    }
    return out;
  });
  ok(
    'le recul de l’arme : 2 px pistolet, 3 lame, 6 masse',
    Object.values(recul).every(([t, m, a]) => t === 0 && m === a),
    JSON.stringify(recul)
  );

  /* --- polices du monde --- */
  const fontes = await p.evaluate(() => ({
    floaters: Floaters.render.toString().includes('FONT_PIXEL'),
    porte: Room.render.toString().includes('FONT_PIXEL'),
  }));
  const segoe = ['30_entities.js', '32_enemies.js', '36_modular.js', '40_room.js'].filter(f =>
    /Segoe/.test(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'))
  );
  ok(
    'les chiffres, la porte, l’étoile et les dalles sont en police pixel ; plus de Segoe UI dans le monde',
    fontes.floaters && fontes.porte && segoe.length === 0,
    segoe.join(', ') || 'aucun Segoe UI dans le monde'
  );

  /* --- squash & stretch sur les planches en marche --- */
  const planche = await p.evaluate(() => {
    const pl = G.player;
    const scales = [];
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const orig = ctx.scale.bind(ctx);
    ctx.scale = (a, b) => {
      scales.push([+a.toFixed(3), +b.toFixed(3)]);
      return orig(a, b);
    };
    pl.clip = 'walk';
    pl.walkT = 0.157; // sin(1,57) ≈ 1 : plein pas
    pl.render(ctx);
    /* un scale non uniforme (hors le retournement −1/1) = le squash & stretch de la démarche */
    const sq = scales.find(([a, b]) => a > 0 && a !== b);
    return sq && { sx: sq[0], sy: sq[1] };
  });
  ok('la planche de marche de Martin est écrasée/étirée et inclinée', planche && planche.sx < 1 && planche.sy > 1, JSON.stringify(planche));
});
