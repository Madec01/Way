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
      if (!L || !TRAP_TRIGGERS[L.trigger] || !TRAP_BODIES[L.body] || ![].concat(L.effect).every(f => TRAP_EFFECTS[f]))
        out.pb.push(`${k} : pas de triplet complet`);
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
    /* 6. les deux camps (chantier 13 B) : un ennemi dans le piège prend ×enemyMul, un boss ×bossMul, un compagnon
       ×petMul par Pets.hurt ; une recharge par cible ; une balle de piège abat l'ennemi qu'elle croise */
    const B = BALANCE.trap;
    const beam = mk('laser_beam', { x: 0, y: 6, w: 1, h: 1 });
    const rtOn = beam.period - beam.active + 0.001;
    const spawn = (x, y) => {
      const e = Room.spawnEnemy(Content.enemy('enemy_rodeur'), x, y, {});
      if (e) e.spawnT = 0;
      return e;
    };
    arm();
    pl.x = W / 2;
    pl.y = ROOM_Y + 2 * TILE; // loin du rayon
    G.enemies.length = 0;
    const e1 = spawn(beam.cx + 200, beam.cy);
    const hpE = e1.hp;
    beam.update(0.016, rtOn);
    const hitE = hpE - e1.hp;
    beam.update(0.016, rtOn + 0.02);
    const againE = hpE - e1.hp - hitE;
    beam.clock += 0.6;
    beam.update(0.016, rtOn + 0.1);
    const laterE = hpE - e1.hp - hitE;
    /* boss : la fraction du boss */
    const e2 = spawn(beam.cx + 300, beam.cy);
    e2.isBoss = true;
    e2.weak = { rule: 'none' }; // un vrai boss a son point faible ; ici on ne teste que la fraction
    const hpB = e2.hp;
    beam.update(0.016, rtOn + 0.2);
    const hitB = hpB - e2.hp;
    /* compagnon */
    if (!G.pets || !G.pets.length) Pets.give('pet_uno', true);
    const pe = G.pets[0];
    pe.x = beam.cx + 400;
    pe.y = beam.cy;
    pe.down && (pe.downT = 0);
    pe.hp = pe.maxHp;
    beam.clock += 0.6; // le compagnon attendait près de l'entrée, sur la ligne du rayon : sa recharge est passée
    const hpP = pe.hp;
    beam.update(0.016, rtOn + 0.3);
    const hitP = hpP - pe.hp;
    /* le nuage aussi, par tic */
    const gas = mk('gas_zone', { x: 10, y: 6, w: 1, h: 1 });
    const e3 = spawn(gas.cx + 10, gas.cy);
    const hpG = e3.hp;
    const gOn = gas.period - gas.active + 0.001;
    for (let i = 0; i < 40; i++) {
      gas.clock += 0.016;
      gas.update(0.016, gOn + i * 0.016);
    }
    const hitG = hpG - e3.hp;
    /* une balle de piège : la tourelle vise le joueur, l'ennemi est sur la trajectoire */
    Projectiles.list.length = 0;
    const tur = mk('turret_fixed', { x: 11, y: 0, w: 1, h: 1 });
    pl.x = tur.cx;
    pl.y = tur.cy + 300;
    const e4 = spawn(tur.cx, tur.cy + 60);
    const hpS = e4.hp;
    tur.update(0.016, 0);
    tur.update(0.016, tur.telegraph + 0.01);
    const nb = Projectiles.list.length;
    for (let i = 0; i < 30; i++) Projectiles.update(0.016);
    const hitS = hpS - e4.hp;
    const left = Projectiles.list.filter(q => q.trap).length;
    out.camps = {
      enemyMul: B.enemyMul,
      bossMul: B.bossMul,
      petMul: B.petMul,
      dmg: beam.damage,
      hitE,
      attenduE: Math.max(1, Math.round(beam.damage * B.enemyMul)),
      againE,
      laterE,
      hitB,
      attenduB: Math.max(1, Math.round(beam.damage * B.bossMul)),
      hitP,
      attenduP: Math.max(1, Math.round(beam.damage * B.petMul)),
      hitG,
      nb,
      hitS,
      left,
    };
    for (const e of G.enemies) e.hp = 0;
    G.enemies.length = 0;
    Projectiles.list.length = 0;
    /* 7. le joueur décide (chantier 13 C) : plaque, proximité, tir, chaîne ; poussée, statut, feu ; cassable */
    const byId = id => CONTENT.traps.find(t => t.id === id);
    const mkId = (id, inst) => new Trap(byId(id), inst);
    const spawnAt = (x, y) => {
      const e = spawn(x, y);
      e.x = x;
      e.y = y;
      return e;
    };
    const C = {};
    /* plaque : le défibrillateur s'arme quand on s'y tient, l'arc blesse et étourdit l'ennemi dessus */
    {
      const t = mkId('trap_defibrillateur', { x: 10, y: 8 });
      arm();
      pl.x = t.cx;
      pl.y = t.cy;
      const e = spawnAt(t.cx, t.cy - 100); // sur l'arc, qui monte
      const hp0 = e.hp;
      t.update(0.016, 0);
      const armed = t.firedAt === 0;
      t.update(0.016, t.telegraph + 0.05);
      C.plaque = {
        armed,
        stage: t.stage(t.telegraph + 0.05).stage,
        hitE: hp0 - e.hp,
        stun: e.stunUntil > Time.now,
        hitPl: pl.stats.maxHp - pl.hp,
      };
      /* pas rearmable avant `rearm` : la plaque reste inerte juste après */
      t.update(0.016, t.telegraph + t.active + 0.1);
      C.plaque.stillArmed = t.firedAt != null;
      t.update(0.016, t.telegraph + t.active + t.p.rearm + 0.1);
      C.plaque.rearmed = t.firedAt == null;
    }
    /* tir + explosion en chaîne : la bonbonne saute au tir, blesse l'ennemi à côté, arme la voisine, et se consomme */
    {
      const a = mkId('trap_bonbonne', { x: 8, y: 6 }),
        b = mkId('trap_bonbonne', { x: 10, y: 6 });
      G.room.traps.push(a, b);
      arm();
      pl.x = W / 2;
      pl.y = ROOM_Y + TILE;
      const e = spawnAt(a.cx + 40, a.cy);
      const hp0 = e.hp;
      const shot = a.shotBy({ x: a.cx, y: a.cy, r: 4 });
      a.onShot({ x: a.cx, y: a.cy, r: 4 }, 0);
      const armed = a.firedAt === 0;
      a.update(0.016, a.telegraph + 0.02);
      C.bonbonne = { shot, armed, hitE: hp0 - e.hp, spent: a.spent, voisine: b.firedAt != null, delai: b.firedAt };
      G.room.traps.splice(G.room.traps.indexOf(a), 2);
    }
    /* cassable : deux tirs sur le boîtier d'une grille la coupent, elle revient après `rearm` */
    {
      const t = mkId('trap_grille', { x: 4, y: 2, w: 8, h: 6, params: { hp: 2, rearm: 2 } });
      const q = { x: t.cx, y: t.cy, r: 4 };
      const s1 = t.shotBy(q);
      t.onShot(q, 0);
      const alive = !t.disabled;
      t.onShot(q, 0);
      const off = t.disabled;
      t.clock += 2.1;
      t.update(0.016, 0);
      C.boitier = { s1, alive, off, back: !t.disabled && t.hp === 2 };
    }
    /* poussée : la vanne pousse l'ennemi dans la zone balayée */
    {
      const t = mkId('trap_vanne', { x: 6, y: 2, w: 6, h: 5 });
      arm();
      pl.x = W / 2;
      pl.y = ROOM_Y + 11 * TILE;
      const e = spawnAt(t.x + 8, t.cy);
      e.kvx = 0;
      t.onShot({ x: t.cx, y: t.cy, r: 4 }, 0);
      t.update(0.016, t.telegraph + 0.001); // le jet part du bord gauche
      C.vanne = { armed: t.firedAt === 0, kvx: e.kvx, hp: e.hp === e.maxHp };
    }
    /* statut : le pollen endort l'ennemi, ralentit le joueur, ne blesse personne */
    {
      const t = mkId('trap_pollen', { x: 10, y: 6 });
      arm();
      pl.x = t.cx + 20;
      pl.y = t.cy;
      const e = spawnAt(t.cx - 20, t.cy);
      const hpE = e.hp,
        hpP = pl.hp;
      t.update(0.016, t.period - t.active + 0.01);
      C.pollen = { stun: e.stunUntil > Time.now, slowPl: pl.gasSlowMul, hitE: hpE - e.hp, hitP: hpP - pl.hp };
    }
    /* feu : la flaque s'enflamme au passage d'une jarre et laisse un feu au sol qui brûle les deux camps */
    {
      const t = mkId('trap_huile', { x: 10, y: 6 });
      G.room.hazards.length = 0;
      Projectiles.list.push({
        x: t.cx,
        y: t.cy,
        vx: 0,
        vy: 0,
        r: 6,
        trap: true,
        kind: 'fireball',
        owner: 'enemy',
        t: 0,
        life: 9,
        damage: 1,
        hit: new Set(),
      });
      t.update(0.016, 0);
      const armed = t.firedAt === 0;
      t.update(0.016, t.telegraph + 0.01);
      const h = G.room.hazards.find(z => z.owner === 'trap');
      C.huile = { armed, feu: !!h, dps: h && h.dps, nom: h && h.name };
      G.room.hazards.length = 0;
      Projectiles.list.length = 0;
    }
    /* proximité : la cage tombe sur l'ennemi qui passe dessous et le retient trois secondes */
    {
      const t = mkId('trap_cage', { x: 10, y: 6 });
      arm();
      pl.x = W / 2;
      pl.y = ROOM_Y + TILE;
      const e = spawnAt(t.cx + 10, t.cy);
      t.update(0.016, 0);
      const armed = t.firedAt === 0;
      t.update(0.016, t.telegraph + 0.01);
      C.cage = { armed, stun: e.stunUntil > Time.now + 2 };
    }
    /* le brancard : un tir, un aller sur le rail pendant la fenêtre, puis il se range */
    {
      const t = mkId('trap_brancard', { x: 6, y: 6, w: 8, params: { box: { x: 6, y: 6 } } });
      const rest0 = TRAP_BODIES.rail.pos(t, 5).x;
      t.onShot({ x: t.x + TILE / 2, y: t.cy, r: 4 }, 0);
      const mid = TRAP_BODIES.rail.pos(t, t.telegraph + t.active / 2).x;
      const end = TRAP_BODIES.rail.pos(t, t.telegraph + t.active + 5).x;
      C.brancard = { armed: t.firedAt === 0, active: +t.active.toFixed(2), rest0, mid, end, roule: mid > rest0 && end >= mid };
    }
    for (const e of G.enemies) e.hp = 0;
    G.enemies.length = 0;
    Projectiles.list.length = 0;
    out.decide = C;
    out.kinds13 = TRAP_KINDS.length;
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
  const c = r.camps;
  ok(
    `les deux camps : un ennemi dans le rayon prend ×${c.enemyMul} (${c.hitE} pour ${c.dmg}), une recharge par cible, puis un second coup`,
    c.hitE === c.attenduE && c.againE === 0 && c.laterE === c.attenduE,
    JSON.stringify(c)
  );
  ok(`un boss prend ×${c.bossMul} (${c.hitB} pour ${c.dmg})`, c.hitB === c.attenduB, JSON.stringify(c));
  ok(`un compagnon prend ×${c.petMul} par Pets.hurt (${c.hitP} pour ${c.dmg})`, c.hitP === c.attenduP, JSON.stringify(c));
  ok('le nuage blesse aussi un ennemi, par tic', c.hitG > 0, JSON.stringify(c));
  ok('une balle de tourelle abat l’ennemi qu’elle croise et disparaît', c.nb > 0 && c.hitS > 0 && c.left < c.nb, JSON.stringify(c));
  const D = r.decide;
  ok(`${r.kinds13} mécaniques connues du contenu (dix historiques et onze familles nouvelles)`, r.kinds13 === 21);
  ok(
    'plaque : le défibrillateur s’arme sous le joueur, l’arc blesse le joueur et l’ennemi et l’étourdit, puis se réarme après le délai',
    D.plaque.armed &&
      D.plaque.stage === 'on' &&
      D.plaque.hitE > 0 &&
      D.plaque.stun &&
      D.plaque.hitPl > 0 &&
      D.plaque.stillArmed &&
      D.plaque.rearmed,
    JSON.stringify(D.plaque)
  );
  ok(
    'tir et chaîne : la bonbonne saute au tir, blesse l’ennemi à côté, arme sa voisine avec un délai, et se consomme',
    D.bonbonne.shot && D.bonbonne.armed && D.bonbonne.hitE > 0 && D.bonbonne.spent && D.bonbonne.voisine && D.bonbonne.delai > 0,
    JSON.stringify(D.bonbonne)
  );
  ok(
    'cassable : deux tirs coupent la grille, elle revient après le délai',
    D.boitier.s1 && D.boitier.alive && D.boitier.off && D.boitier.back,
    JSON.stringify(D.boitier)
  );
  ok('poussée : la vanne pousse l’ennemi sans le blesser', D.vanne.armed && D.vanne.kvx > 0 && D.vanne.hp, JSON.stringify(D.vanne));
  ok(
    'statut : le pollen endort l’ennemi et ralentit le joueur sans blesser',
    D.pollen.stun && D.pollen.slowPl < 1 && D.pollen.hitE === 0 && D.pollen.hitP === 0,
    JSON.stringify(D.pollen)
  );
  ok(
    'feu : la flaque s’enflamme au passage d’une jarre et laisse un feu au sol',
    D.huile.armed && D.huile.feu && D.huile.dps > 0,
    JSON.stringify(D.huile)
  );
  ok('proximité : la cage tombe sur l’ennemi et le retient', D.cage.armed && D.cage.stun, JSON.stringify(D.cage));
  ok(
    'brancard : un tir, un aller sur le rail pendant la fenêtre, puis il se range',
    D.brancard.armed && D.brancard.roule,
    JSON.stringify(D.brancard)
  );
});
