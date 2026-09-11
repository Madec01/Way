/* Chantier F-2 — les chiffres et le coup reçu. Ce test mesure : les cinq genres de chiffres flottants (tailles,
   couleurs, trajectoires), la police pixel à contour noir, le sursaut de naissance, la fusion des chiffres proches,
   la naissance au corps de l'ennemi, la dispersion, la sortie du « +n XP » ; et au coup reçu : le recul en courbe à
   l'opposé de la source, la vignette corail, le ralenti bref, le flash d'une image sur un gros coup, le clignotement
   d'invulnérabilité à 6 Hz, la vignette de PV bas qui bat avec la musique. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();
  await salle(2);

  const genres = await p.evaluate(() => {
    Floaters.list = [];
    const d = Floaters.add(100, 100, 12, null, null, 'dmg');
    const c = Floaters.add(300, 100, 90, null, null, 'crit');
    const t = Floaters.add(500, 100, '-24', null, null, 'taken');
    const h = Floaters.add(700, 100, '+15', null, null, 'heal');
    const e = Floaters.add(900, 100, 'SONNÉ', '#ffd166', 18);
    const auto = Floaters.add(1100, 100, '-9', '#ff5e7a', 16); // ancien appel sans genre : deviné
    return {
      dmg: [d.size, d.color, d.vy < 0],
      crit: [c.size, c.color],
      taken: [t.size, t.color, t.vy > 0, t.g < 0],
      heal: [h.size, h.color],
      event: [e.kind, e.color, e.size],
      auto: auto.kind,
    };
  });
  ok(
    'dégât 18 px blanc, critique 30 doré, dégât subi 34 corail qui part vers le bas',
    genres.dmg[0] === 18 &&
      genres.dmg[2] &&
      genres.crit[0] === 30 &&
      genres.crit[1] === '#ffd166' &&
      genres.taken[0] === 34 &&
      genres.taken[2] &&
      genres.taken[3],
    JSON.stringify(genres)
  );
  ok(
    'soin 20 vert, événement dans sa couleur, un ancien appel devine son genre',
    genres.heal[0] === 20 &&
      genres.heal[1] === '#7fff9a' &&
      genres.event[0] === 'event' &&
      genres.event[1] === '#ffd166' &&
      genres.auto === 'taken',
    `${genres.event.join(' ')} · ${genres.auto}`
  );

  const rendu = await p.evaluate(() => {
    Floaters.list = [];
    const f = Floaters.add(100, 100, 12, null, null, 'dmg');
    f.t = 0.06; // à mi-sursaut
    const calls = [];
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    let font = '',
      lw = 0;
    for (const m of ['strokeText', 'fillText', 'scale']) {
      const o = ctx[m].bind(ctx);
      ctx[m] = (...a) => {
        calls.push([m, a]);
        if (m === 'strokeText') {
          font = ctx.font;
          lw = ctx.lineWidth;
        }
        return o(...a);
      };
    }
    Floaters.render(ctx);
    const stroke = calls.findIndex(x => x[0] === 'strokeText');
    const fill = calls.findIndex(x => x[0] === 'fillText');
    const sc = calls.find(x => x[0] === 'scale');
    return { font, lw, stroke, fill, pop: sc && +sc[1][0].toFixed(3) };
  });
  ok(
    'Silkscreen, contour noir de 4 px dessiné avant le chiffre, sursaut à la naissance',
    /Silkscreen/.test(rendu.font) && rendu.lw === 4 && rendu.stroke >= 0 && rendu.stroke < rendu.fill && rendu.pop > 1,
    `${rendu.font} · contour ${rendu.lw} · pop ×${rendu.pop}`
  );

  const fusion = await p.evaluate(() => {
    Floaters.list = [];
    Floaters.add(200, 200, 12, null, null, 'dmg');
    Floaters.list[0].t = 0.05;
    Floaters.add(206, 198, 30, null, null, 'dmg');
    const un = { n: Floaters.list.length, text: Floaters.list[0].text, size: Floaters.list[0].size, t: Floaters.list[0].t };
    Floaters.add(400, 200, 5, null, null, 'dmg'); // loin : un nouveau
    return { un, deux: Floaters.list.length };
  });
  ok(
    'deux chiffres à 6 px et 50 ms d’écart fusionnent (12 + 30 = 42, plus gros), un chiffre loin reste à part',
    fusion.un.n === 1 && fusion.un.text === '42' && fusion.un.size === 20 && fusion.un.t === 0 && fusion.deux === 2,
    JSON.stringify(fusion.un)
  );

  const corps = await p.evaluate(() => {
    G.enemies = [];
    const pl = G.player;
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, pl.x + 200, pl.y, {});
    e.hp = 9999;
    Floaters.list = [];
    Time.slowUntil = 0;
    Feel.lastStop = -9;
    const xs = [];
    for (let i = 0; i < 6; i++) {
      Floaters.list = [];
      Combat.hitEnemy(e, 5, { noCrit: true, silent: true });
      xs.push([Math.round(Floaters.list[0].x), Math.round(Floaters.list[0].y)]);
    }
    return { ey: e.y, h: Combat.bodyH(e), xs, distinct: new Set(xs.map(String)).size };
  });
  ok(
    'le chiffre naît au corps de l’ennemi, dispersé',
    corps.xs.every(([, y]) => y < corps.ey - corps.h * 0.3) && corps.distinct >= 4,
    `${corps.distinct} positions distinctes sur 6, toutes au-dessus de y−${Math.round(corps.h * 0.3)}`
  );

  const xp = await p.evaluate(() => {
    Floaters.list = [];
    Pickups.list = [];
    Pickups.spawn(G.player.x, G.player.y, 'xp', 5);
    Combat.collect(Pickups.list.pop());
    return Floaters.list.map(f => f.text);
  });
  ok('ramasser de l’XP n’écrit plus « +n XP » (la barre le dit)', !xp.some(t => /XP/.test(t)), xp.join(' | ') || 'aucun chiffre');

  /* --- le coup reçu --- */
  const recu = await p.evaluate(() => {
    const pl = G.player;
    G.debug.invuln = false;
    pl.hp = pl.stats.maxHp;
    pl.invulnUntil = 0;
    Time.slowUntil = 0;
    Time.slow = 1;
    G.debug.hudProbe = true;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    /* petit coup depuis la droite */
    Combat.hitPlayer(5, { type: 'contact', x: pl.x + 40, y: pl.y });
    const petit = {
      vig: +pl.hurtVig.toFixed(2),
      a: +pl.hurtA.toFixed(2),
      slow: Time.slow,
      slowMs: Math.round((Time.slowUntil - Time.now) * 1000),
    };
    UI.renderHud(ctx);
    petit.flash = !!UI.hudProbe.flags.flash;
    petit.vigDessinee = UI.hudProbe.flags.hurtVig;
    /* le recul : Player.render translate de 7 px vers la gauche (source à droite) au premier instant */
    const tr = [];
    const o = ctx.translate.bind(ctx);
    ctx.translate = (x, y) => {
      tr.push([+x.toFixed(2), +y.toFixed(2)]);
      return o(x, y);
    };
    pl.render(ctx);
    ctx.translate = o;
    petit.recul = tr.find(([x, y]) => Math.abs(Math.hypot(x, y) - 7) < 0.05);
    /* gros coup : flash */
    pl.invulnUntil = 0;
    Combat.hitPlayer(Math.round(pl.stats.maxHp * 0.3), { type: 'contact', x: pl.x - 40, y: pl.y });
    UI.renderHud(ctx);
    const gros = { flash: !!UI.hudProbe.flags.flash, a: +pl.hurtA.toFixed(2) };
    G.debug.invuln = true;
    pl.hp = pl.stats.maxHp;
    return {
      petit,
      gros,
      blink6: pl.render.toString().includes('Time.now * 12'),
      bat: (UI.renderHudBody || UI.renderHud).toString().includes('Beat.phase()'),
    };
  });
  ok(
    'un petit coup : vignette corail, recul de 7 px à l’opposé de la source, ralenti à 35 % pendant 120 ms, pas de flash',
    recu.petit.vig === 0.35 &&
      recu.petit.vigDessinee === 1 &&
      recu.petit.recul &&
      recu.petit.recul[0] < -6.9 &&
      recu.petit.slow === 0.35 &&
      recu.petit.slowMs === 120 &&
      !recu.petit.flash,
    JSON.stringify(recu.petit)
  );
  ok(
    'un gros coup (30 % des PV) ajoute un flash blanc d’une image, et le recul change de sens avec la source',
    recu.gros.flash && Math.abs(recu.gros.a) < 0.01 && Math.abs(Math.abs(recu.petit.a) - Math.PI) < 0.01,
    `angles ${recu.petit.a} / ${recu.gros.a}`
  );
  ok('clignotement d’invulnérabilité à 6 Hz, vignette de PV bas qui bat avec la musique', recu.blink6 && recu.bat);
});
