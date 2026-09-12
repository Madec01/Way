/* Chantier 13 A — le socle des pièges. Ce test mesure ce qu'aucun autre ne mesurait : qu'un piège blesse.
   Pour chaque mécanique (les dix `kind`, donc les trois tables déclencheur × corps × effet) : un piège posé à la main,
   le joueur placé au point frappé à l'instant de la fenêtre active perd des points de vie et le piège se recharge
   (pas deux coups en une demi-seconde) ; un quart de seconde avant, `dangerAt` sur ce point vaut au moins 0,5 (le
   bot est prévenu de tout ce qui frappe) ; les tireurs lancent leurs balles marquées `trap` avec les dégâts du piège
   et un coup n'est jamais rejoué ; hors de la fenêtre, rien ; un piège coupé (`disabled`) ne rend plus rien ; le
   ralentissement du gaz lit sa valeur ; la cadence musicale est calculée une fois puis gardée ; deux pièges
   identiques donnent la même suite de phases (déterminisme) ; et les dix mécaniques historiques sont toutes des
   triplets de tables. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();
  await salle(1, 'biome_1');
  await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    const pl = G.player;
    const out = { kinds: {}, pb: [] };
    const arm = () => {
      G.debug.invuln = false;
      pl.invulnUntil = 0;
      pl.shield = 0;
      pl.dead = false;
      pl.hp = pl.stats.maxHp;
      pl.stats.dodge = 0;
      pl.stats.trapDamageMul = 1;
      pl.dashing = false;
      Projectiles.list.length = 0;
    };
    const mk = (kind, inst, extra) => {
      const def = Object.assign(
        {},
        CONTENT.traps.find(t => t.kind === kind),
        extra || {}
      );
      const t = new Trap(def, inst);
      return t;
    };
    /* 1. les triplets */
    const tables = typeof TRAP_LEGACY !== 'undefined'; // le test se rejoue tel quel sur l'ancien moteur (sans tables)
    for (const k of tables ? TRAP_KINDS : []) {
      const L = TRAP_LEGACY[k];
      if (!L || !TRAP_TRIGGERS[L.trigger] || !TRAP_BODIES[L.body] || !TRAP_EFFECTS[L.effect]) out.pb.push(`${k} : pas de triplet complet`);
    }
    out.tables = tables
      ? { triggers: Object.keys(TRAP_TRIGGERS), bodies: Object.keys(TRAP_BODIES), effects: Object.keys(TRAP_EFFECTS) }
      : 'ancien moteur';
    if (!tables) out.pb.push('ancien moteur : pas de tables');
    /* 2. chaque mécanique blesse au point et à l'instant attendus, et le bot le savait un quart de seconde avant */
    const cases = [
      /* [kind, pose, point frappé (px), instant `on` (s)] — période / fenêtre lues sur la définition */
      { kind: 'laser_sweep', inst: { x: 6, y: 3, w: 6, h: 6 }, at: t => ({ x: t.x + 1, y: t.cy }), rt: t => t.period - t.active + 0.001 },
      {
        kind: 'laser_rotate',
        inst: { x: 10, y: 5, w: 3, h: 3 },
        at: t => ({ x: t.cx + 60, y: t.cy }),
        rt: t => t.period - t.active + 0.001,
        angle: true,
      },
      {
        kind: 'laser_grid',
        inst: { x: 4, y: 2, w: 8, h: 6 },
        at: t => ({ x: t.x + 2 * TILE, y: t.cy }) /* première ligne : à la moitié de l'espacement */,
        rt: t => t.period - t.active + 0.001,
      },
      {
        kind: 'spike_tiles',
        inst: { x: 6, y: 4, w: 2, h: 2 },
        at: t => ({ x: t.x + TILE / 2, y: t.y + TILE / 2 }),
        rt: t => t.period - t.active + 0.001,
      },
      {
        kind: 'gas_zone',
        inst: { x: 10, y: 6, w: 1, h: 1 },
        at: t => ({ x: t.cx + 10, y: t.cy }),
        rt: t => t.period - t.active + 0.001,
        gas: true,
      },
      {
        kind: 'saw_rail',
        inst: { x: 4, y: 6, w: 6, h: 1 },
        at: t => (tables ? TRAP_BODIES.rail.pos(t, t.telegraph + 0.5) : t.sawPos(t.telegraph + 0.5)),
        rt: t => t.telegraph + 0.5,
      },
      { kind: 'laser_beam', inst: { x: 0, y: 6, w: 1, h: 1 }, at: t => ({ x: t.cx + 200, y: t.cy }), rt: t => t.period - t.active + 0.001 },
    ];
    for (const cs of cases) {
      const t = mk(cs.kind, cs.inst);
      if (cs.angle) {
        t.p.a0 = 0;
        t.p.angularSpeed = 1e-6; // (0 vaudrait « non réglé »)
      }
      const res = { hp0: 0, hit: 0, cd: 0, again: 0, danger: 0, idle: 0, off: 0 };
      const pt = cs.at(t),
        rt = cs.rt(t);
      arm();
      pl.x = pt.x;
      pl.y = pt.y;
      res.hp0 = pl.hp;
      res.danger = t.dangerAt(pt.x, pt.y, rt - 0.25);
      /* hors de la fenêtre : rien */
      t.update(0.016, cs.kind === 'saw_rail' ? 0.01 : 0.05);
      res.idle = res.hp0 - pl.hp;
      arm();
      pl.x = pt.x;
      pl.y = pt.y;
      /* le gaz tique par demi-seconde : on lui donne le temps */
      if (cs.gas) for (let i = 0; i < 40; i++) t.update(0.016, rt + i * 0.016);
      else t.update(0.016, rt);
      res.hit = res.hp0 - pl.hp;
      res.cd = t.hitCd;
      res.slowMul = cs.gas ? pl.gasSlowMul : null;
      /* rechargé : pas un second coup tout de suite */
      pl.invulnUntil = 0;
      const hp1 = pl.hp;
      t.update(0.016, rt + 0.02);
      res.again = hp1 - pl.hp;
      /* coupé : rien */
      arm();
      pl.x = pt.x;
      pl.y = pt.y;
      t.disabled = true;
      t.update(0.016, rt);
      res.off = res.hp0 - pl.hp;
      res.dangerOff = t.dangerAt(pt.x, pt.y, rt - 0.25);
      t.disabled = false;
      out.kinds[cs.kind] = res;
    }
    /* 3. les tireurs : une salve au coup dû, marquée `trap`, aux dégâts du piège, jamais rejouée */
    for (const kind of ['wall_fireball', 'turret_fixed', 'emitter']) {
      const t = mk(kind, { x: 11, y: 0, w: 1, h: 1 }, kind === 'wall_fireball' ? { params: { dir: 'down' } } : undefined);
      arm();
      pl.x = W / 2;
      pl.y = H / 2 + 100;
      const every =
        (t.p.every || (t.body ? t.body.every : { wall_fireball: 1.2, turret_fixed: 1.5, emitter: 2 }[kind])) / G.difficulty.fireRateMul;
      t.update(0.016, 0); // réveil : on ne rejoue pas un coup passé
      const n0 = Projectiles.list.length;
      t.update(0.016, t.telegraph + 0.01); // le premier coup est dû
      t.update(0.016, t.telegraph + 0.02);
      const n1 = Projectiles.list.length;
      t.update(0.016, t.telegraph + 0.03); // le même coup : rien de plus
      const n2 = Projectiles.list.length;
      t.update(0.016, every + t.telegraph + 0.01); // le coup suivant
      const n3 = Projectiles.list.length;
      const b = Projectiles.list[n0];
      out.kinds[kind] = {
        n0,
        n1,
        n2,
        n3,
        trap: b && b.trap === true,
        owner: b && b.owner,
        damage: b && b.damage === t.damage,
        danger: t.dangerAt(t.cx, t.cy + 20, 0),
      };
    }
    /* 4. cadence musicale : calculée une fois, gardée ensuite ; changée si la difficulté change */
    const tb = mk('spike_tiles', { x: 2, y: 2, w: 2, h: 2, params: { beats: { period: 4, active: 0.5, telegraph: 1, on: 0 } } });
    tb.syncBeat();
    const k1 = tb.syncKey || 'ancien moteur',
      per1 = tb.period;
    tb.period = -1;
    tb.syncBeat();
    const kept = tb.period === -1; // même clé : rien n'est recalculé
    tb.speedMul += 0.5;
    tb.syncBeat();
    out.beats = { k1, per1, kept, recalc: tb.period === per1, L: Beat.beatLen() };
    /* 5. déterminisme : deux pièges identiques, mêmes phases sur cent instants */
    const a = mk('laser_grid', { x: 4, y: 2, w: 8, h: 6 }),
      b2 = mk('laser_grid', { x: 4, y: 2, w: 8, h: 6 });
    let same = true;
    for (let i = 0; i < 100; i++) {
      const ca = a.cycle(i * 0.37),
        cb = b2.cycle(i * 0.37);
      if (ca.stage !== cb.stage || ca.idx !== cb.idx) same = false;
    }
    out.same = same;
    arm();
    G.debug.invuln = true;
    return out;
  });
  ok(
    'les dix mécaniques historiques sont des triplets déclencheur × corps × effet',
    r.pb.length === 0,
    r.pb.join(' ; ') || JSON.stringify(r.tables)
  );
  for (const k of ['laser_sweep', 'laser_rotate', 'laser_grid', 'spike_tiles', 'gas_zone', 'saw_rail', 'laser_beam']) {
    const x = r.kinds[k];
    ok(
      `${k} : blesse au point et à l'instant attendus, se recharge, rien hors fenêtre ni coupé, bot prévenu avant`,
      x &&
        x.hit > 0 &&
        (x.cd > 0 || k === 'gas_zone') &&
        x.again === 0 &&
        x.idle === 0 &&
        x.off === 0 &&
        x.danger >= 0.5 &&
        x.dangerOff === 0,
      JSON.stringify(x)
    );
  }
  ok(
    'le gaz ralentit de la valeur déclarée (`slow`), pas d’un chiffre codé en dur',
    r.kinds.gas_zone && Math.abs(r.kinds.gas_zone.slowMul - 0.7) < 1e-9,
    JSON.stringify(r.kinds.gas_zone)
  );
  for (const k of ['wall_fireball', 'turret_fixed', 'emitter']) {
    const x = r.kinds[k];
    ok(
      `${k} : une salve au coup dû, marquée trap, aux dégâts du piège, jamais rejouée, le coup suivant vient`,
      x && x.n1 > x.n0 && x.n2 === x.n1 && x.n3 > x.n2 && x.trap && x.owner === 'enemy' && x.damage && x.danger >= 0.5,
      JSON.stringify(x)
    );
  }
  ok(
    'la cadence musicale est calculée une fois puis gardée, et refaite si la difficulté change',
    r.beats.kept && r.beats.recalc,
    JSON.stringify(r.beats)
  );
  ok('deux pièges identiques donnent la même suite de phases', r.same);
});
