/* =========================================================================
   WAY — 40_room.js
   État global G, Room (chargement, vagues, portes, transitions), Run (déroulé d'un niveau).
   ========================================================================= */

'use strict';
const G = {
  state: 'boot', // boot | menu | hub | run
  mode: 'normal', // normal | test
  player: null,
  enemies: [],
  room: null,
  run: null,
  pets: [], // compagnons présents : un seul d'ordinaire, deux pour un duo inséparable
  get pet() {
    return this.pets[0] || null;
  }, // le meneur, celui que le HUD montre et que les paires visent
  paused: false,
  overlay: null,
  shake: 0,
  difficulty: { hpMul: 1, damageMul: 1, speedMul: 1, fireRateMul: 1 },
  debug: { difficulty: 1, xpMul: 1, coinMul: 1, forceRarity: null, invuln: false, hitboxes: false, showScores: false, open: false },
  autoplay: null,
};
function applyDifficulty() {
  const d = G.debug.difficulty;
  const b = (G.run && G.run.biome && G.run.biome.difficulty) || {};
  const idx = (G.run && G.run.roomIndex) || 1;
  /* Une salle de boss n'est pas rampée : un boss est réglé à la main pour SA salle, et la rampe (×1,24 en salle 5,
     ×1,48 en salle 9) s'ajoutait par-dessus — elle annulait toute baisse de ses dégâts et gonflait la revanche
     de salle 9 à 12 500 PV au biome 4. */
  const defs = G.run && G.run.biome ? Content.roomsOf(G.run.biome.id) : [];
  const def = defs[idx - 1];
  const salleDeBoss = !!(def && /BOSS|REVENGE/.test(def.type || ''));
  const ramp = salleDeBoss ? 1 : 1 + (b.rampPerRoom != null ? b.rampPerRoom : BALANCE.rampPerRoom) * Math.max(0, idx - 1); // salle 1 → ×1, salle 9 → ×1.48 par défaut
  G.difficulty = {
    hpMul: d * (b.hpMul || 1) * ramp,
    damageMul: d * (b.damageMul || 1) * ramp,
    speedMul: (BALANCE.difficulty.speedBase + BALANCE.difficulty.speedPerD * d) * (b.speedMul || 1),
    fireRateMul: BALANCE.difficulty.fireBase + BALANCE.difficulty.firePerD * d,
    ramp,
  };
}

/* ---------- Room ---------- */
const Room = {
  create(def) {
    const r = {
      def,
      index: def.index,
      type: def.type,
      state: 'intro',
      time: 0,
      stateT: 0,
      refTime: def.refTime || 45,
      obstacles: (def.obstacles || []).map(o => ({
        x: o.x,
        y: o.y,
        w: o.w,
        h: o.h,
        kind: o.kind,
        px: ROOM_X + o.x * TILE,
        py: ROOM_Y + o.y * TILE,
        pw: o.w * TILE,
        ph: o.h * TILE,
      })),
      deco: def.deco || [],
      dressed: false,
      colliders: [],
      lastDamageT: 0,
      traps: [],
      waves: (def.waves || []).map(w => Object.assign({ done: false }, w)),
      waveIdx: 0,
      fragmentsDef: (def.fragments || []).slice(),
      fragmentsSpawned: 0,
      fragments: 0,
      hits: 0,
      kills: 0,
      combo: 0,
      comboUntil: 0,
      bestCombo: 0,
      comboTarget: 8,
      died: false,
      doorOpen: false,
      pendingDoor: false,
      chest: null,
      boss: null,
      beams: [],
      blasts: [],
      decals: [], // les traces qui restent (taches des morts) : plafond DECAL_MAX, effacées avec la salle
      slashes: [],
      hazards: [],
      turrets: [],
      decoys: [],
      modular: (def.modular || []).map(m => Object.assign({ t: 0 }, m)),
      challenge: null,
      challengeOk: false,
      drops: 0, // phase 2 : éléments de décor animés avec collision (murs coulissants, plateformes, zone sûre mobile)
      floorSeed: (def.index * 7919) ^ 0x5bd1,
      label: `${STR.room} ${def.index}/9 — ${ROOM_TYPES[def.type] ? ROOM_TYPES[def.type].label : def.type}`,
    };
    Terrain.compile(r, def); // le plan ASCII devient une grille + des rectangles poussés dans r.obstacles
    Anim.compile(r, def); // décor animé en rythme (sans collision ni dégât)
    Room.placeLights(r, def);
    for (const t of def.traps || []) {
      const td = Content.trap(t.trap);
      if (!td) {
        console.warn('piège inconnu', t.trap);
        continue;
      }
      r.traps.push(new Trap(td, t));
    }
    return r;
  },
  load(index) {
    const def = G.run.rooms.find(r => r.index === index);
    if (!def) {
      console.error('Salle absente', index);
      return false;
    }
    G.run.roomIndex = index;
    applyDifficulty();
    UI.clearAll(); // une nouvelle salle : les messages de l'ancienne n'ont plus lieu d'être
    G.enemies = [];
    Projectiles.list = [];
    Pickups.list = [];
    Particles.list = [];
    Floaters.list = [];
    G.room = Room.create(def);
    Room.dress(G.room); // habillage : accessoires du biome sur les obstacles et décor au sol
    /* défi de salle (salles 2, 3, 6, 7) */
    const chId = Challenge.pick(def, RNG, G.run.usedChallenges || (G.run.usedChallenges = []));
    if (chId) {
      if (Challenge.DEFS[chId].replacesTraps) {
        G.room.traps = [];
        G.room.modular = [];
      }
      G.room.challenge = Challenge.create(chId, G.room);
      G.run.usedChallenges.push(chId);
    }
    const pl = G.player;
    /* l'entrée de salle (F-6) : le joueur part dans le mur de gauche et entre en marchant pendant l'intro */
    G.room.entry = { from: ROOM_X - TILE * 0.6, to: ROOM_X + TILE * 1.5, dur: 0.5 };
    pl.x = G.room.entry.from;
    pl.y = ROOM_Y + ROOM_H / 2;
    pl.facing = 1;
    pl.dashing = false;
    pl.orbs = null;
    pl.charge = 0;
    Camera.pulse = 0;
    Camera.resetScene(); // le zoom de la mort (1,3) ou de la victoire (1,15) ne doit pas survivre à la partie d'avant
    Camera.snap(pl.x, pl.y);
    for (const pe of G.pets) pe.snap(); // les compagnons franchissent la porte avec le joueur — après qu'il a pris sa place
    /* fin des effets « cette salle seulement » : arme d'essai rendue, reliques retirées */
    if (pl.trialWeapon) {
      pl.weapon = pl.trialWeapon.prev;
      pl.trialWeapon = null;
    }
    if (pl.buffs.some(b => b.roomOnly)) pl.buffs = pl.buffs.filter(b => !b.roomOnly);
    pl.recompute();
    /* arme d'essai : en salle 1 le joueur n'a pas encore choisi son arme (écran de préparation), on pose le tirage à l'entrée en combat */
    if (G.run.weaponDropRoom === index && !G.run.attract) {
      if (G.player.weapon) Pickups.placeWeaponDrop(G.room);
      else G.room.pendingWeaponDrop = true;
    }
    for (const h of pl.hooks.onRoomStart) {
      if (h.effect === 'shield_on_room') {
        pl.shield = Math.max(pl.shield, h.amount * (h.stacks || 1));
        pl.shieldUntil = Time.now + 999;
      } else if (h.effect === 'heal_on_room') pl.heal(pl.stats.maxHp * h.fraction * (h.stacks || 1));
    }
    G.run.roomIndex = index;
    G.run.stats.roomsEntered++;
    Modular.init(G.room);
    if (def.type === 'CHEST' || def.type === 'CHEST_FINAL') {
      G.room.chest = { x: W / 2, y: H / 2, r: 22, opened: false };
      G.room.doorOpen = false;
    }
    if (def.type === 'TRAP') {
      G.room.doorOpen = !(G.room.challenge && G.room.challenge.id === 'collapse');
    }
    if (def.type === 'COMBAT_TEMPO') {
      Tempo.create(G.room);
      setTimeout(() => {
        if (G.room && G.room.tempo && !G.room.tempo.boss) Tempo.intro(G.room);
      }, 900);
    }
    if (def.type === 'MINIBOSS' || def.type === 'BOSS_REVENGE') Tempo.createBoss(G.room);
    G.room.introLabelT = 2.4; // un seul texte : le nom de la salle, en bas, en petit (HUD) — plus de bandeau
    AudioEngine.uiConfirm({});
    if (G.room.challenge)
      setTimeout(() => {
        if (G.room && G.room.challenge) {
          UI.banner('DÉFI : ' + G.room.challenge.def.name, G.room.challenge.def.color, G.room.challenge.def.desc);
          AudioEngine.trapWarn({ intensity: 0.8 });
        }
      }, 900);
    Music.uncalm();
    if (def.type === 'MINIBOSS' || def.type === 'BOSS_REVENGE') Music.play('boss');
    else Music.play('biome');
    return true;
  },
  begin() {
    if (G.room.entry) {
      G.player.x = G.room.entry.to; // une intro sautée (débogage) : le joueur prend sa place d'un coup
      G.room.entry = null;
    }
    G.room.state = 'fight';
    G.room.stateT = 0;
    if (G.room.pendingWeaponDrop && G.player.weapon) {
      G.room.pendingWeaponDrop = false;
      Pickups.placeWeaponDrop(G.room);
    }
  },
  spawnEnemy(def, x, y, opts = {}) {
    if (!def) return null;
    if (G.enemies.filter(e => !e.dead).length > 60) return null;
    const e = new Enemy(def, x, y, opts);
    resolveRoomCollision(e);
    G.enemies.push(e);
    if (G.room.tempo) {
      e.beatLock = true;
      e.beatDiv = G.room.tempo.div || 1;
    } // salle du tempo : frappe sur les temps
    if (G.room.challenge && G.room.challenge.enraged) Challenge.enrage(e);
    return e;
  },
  spawnAt(spawn) {
    const bdef = Content.boss(spawn.enemy);
    if (bdef) {
      Room.spawnBoss(bdef, spawn.x >= 0 ? tileX(spawn.x) : null, spawn.y >= 0 ? tileY(spawn.y) : null);
      return;
    }
    const def = Content.enemy(spawn.enemy);
    if (!def) {
      console.warn('ennemi inconnu', spawn.enemy);
      return;
    }
    const n = spawn.count || 1;
    const pl = G.player;
    let x = W / 2,
      y = H / 2;
    for (let i = 0; i < n; i++) {
      if (spawn.x == null || spawn.x < 0) {
        /* bord aléatoire loin du joueur */
        for (let k = 0; k < 12; k++) {
          const side = RNG.int(0, 3);
          x = side === 0 ? ROOM_X + 30 : side === 1 ? ROOM_X + ROOM_W - 30 : RNG.range(ROOM_X + 40, ROOM_X + ROOM_W - 40);
          y = side === 2 ? ROOM_Y + 30 : side === 3 ? ROOM_Y + ROOM_H - 30 : RNG.range(ROOM_Y + 40, ROOM_Y + ROOM_H - 40);
          if (dist(x, y, pl.x, pl.y) > 220 && !pointBlocked(x, y, 16)) break;
        }
      } else {
        x = tileX(spawn.x) + RNG.range(-20, 20) * (n > 1 ? 1 : 0);
        y = tileY(spawn.y) + RNG.range(-20, 20) * (n > 1 ? 1 : 0);
      }
      if (def.archetype === 'swarm') {
        const g = (def.behavior && def.behavior.groupSize) || 1;
        for (let j = 0; j < g; j++) {
          const a = (j * TAU) / g;
          Room.spawnEnemy(def, x + Math.cos(a) * 24, y + Math.sin(a) * 24, { elite: spawn.elite });
        }
      } else Room.spawnEnemy(def, x, y, { elite: spawn.elite });
    }
    Particles.spawn(x, y, { count: 10, color: '#ff6b6b', glow: true });
  },
  spawnBoss(def, x, y) {
    def = def || Content.boss(G.run.biome.miniboss);
    if (!def) {
      UI.toast('Mini-boss absent du contenu');
      G.room.doorOpen = true;
      return;
    }
    if (G.room.boss) return;
    const revenge = G.room.type === 'BOSS_REVENGE';
    const b = new Boss(def, x || ROOM_X + ROOM_W * 0.72, y || ROOM_Y + ROOM_H / 2, { revenge });
    G.enemies.push(b);
    G.room.boss = b;
    AudioEngine.bossRoar({}); // pas de bandeau : la barre de vie en haut de l'écran porte déjà son nom
    /* l'arrivée (F-6) : 1,4 s de rideau, la caméra va sur lui et revient, zoom 1 → 1,12 → 1, il descend de 120 px,
       trois pas de secousse espacés d'un temps exact ; son nom sur la bande du bas */
    if (!G.autoplay) {
      G.room.scene = { kind: 'bossIn', t: 0, dur: 1.4, boss: b, kicks: 0, name: b.name };
      b.introDrop = 1;
      Camera.lookAt(b.x, b.y, 900);
      Camera.zoomTo(1.12, 4);
    }
  },
  onBossDefeated(b) {
    G.room.bossDead = true;
    G.run.stats.bossKilled = true;
    Feel.shake(9, angleTo(b.x, b.y, G.player.x, G.player.y), 320);
    /* la mort du boss (F-6) : 1,6 s — ralenti à 0,25, cinq explosions échelonnées, le corps qui blanchit puis s'écrase,
       un coup de zoom, et le compagnon qui court vers le corps */
    b.deathDur = 0.4; // en temps de jeu : 1,6 s réelles au ralenti ×0,25
    b.deathWhite = 0.15;
    Time.slow = 0.25; // par-dessus l'arrêt sur image du coup mortel : la scène prime
    Time.slowUntil = Time.now + 1.6;
    Camera.pulse = 0.08;
    G.room.scene = { kind: 'bossOut', t: 0, dur: 1.6, boss: b, fired: 0 };
    for (const pe of G.pets) pe.celebrate = { x: b.x, y: b.y, until: performance.now() + 2600 };
    UI.banner(Content.pick('bossWin') || 'Étalon neutralisé', '#ffd166');
    AudioEngine.roomClear({});
    for (let i = 0; i < 12; i++) Pickups.spawn(b.x, b.y, 'coin', 1);
    if (BALANCE.relicOnBoss) Pickups.spawn(b.x, b.y, 'relic', 1, { relic: RNG.pick(RELICS).id }); // un boss abattu, une relique sûre
  },
  alive() {
    return G.enemies.filter(e => !e.dead).length;
  },
  update(dt) {
    const r = G.room;
    const pl = G.player;
    r.time += dt;
    r.stateT += dt;
    if (r.combo > 0 && Time.now > r.comboUntil) r.combo = 0;
    if (r.state === 'intro') {
      /* le joueur entre en marchant : sa position suit une courbe, sa planche joue la marche, la caméra le rejoint */
      if (r.entry) {
        const k = clamp(r.stateT / r.entry.dur, 0, 1);
        pl.x = lerp(r.entry.from, r.entry.to, Ease.outCubic(k));
        pl.walkT = (pl.walkT || 0) + dt;
        pl.movingNow = k < 1;
        pl.animStep(dt, k < 1, false);
        if (k >= 1) r.entry = null;
      }
      if (r.stateT >= 0.8) Room.begin();
      return;
    }
    /* vagues */
    if (r.state === 'fight') {
      const alive = Room.alive();
      for (const w of r.waves) {
        if (w.done) continue;
        const trig =
          w.at === 'start'
            ? r.stateT >= 0
            : w.at === 'clear'
              ? alive === 0 && r.wavesStarted && r.lastWaveT < r.stateT - 0.5
              : typeof w.at === 'number'
                ? r.stateT >= w.at
                : false;
        if (trig && (!r.tempo || Tempo.waveGate(r)) && Challenge.waveGate(r)) {
          w.done = true;
          if (r.wavesStarted && r.tempo) Tempo.onWave(r);
          r.wavesStarted = true;
          r.lastWaveT = r.stateT;
          for (const s of w.spawns) Room.spawnAt(s);
          if (w.at !== 'start') {
            UI.notify({ text: STR.wave + ' ' + (++r.waveIdx + 1), color: '#ff6b6b', level: 2, key: 'wave' });
          } else r.waveIdx = 0;
          break;
        }
      }
      if ((r.type === 'MINIBOSS' || r.type === 'BOSS_REVENGE') && !r.boss && r.stateT > 0.2 && !r.waves.length) Room.spawnBoss();
      /* fragments d'énergie */
      for (const f of r.fragmentsDef) {
        if (!f.spawned && r.stateT >= (f.at || 0)) {
          f.spawned = true;
          Pickups.spawn(tileX(f.x), tileY(f.y), 'fragment', f.xp || 12);
          r.fragmentsSpawned++;
        }
      }
      /* condition de fin */
      const allWaves = r.waves.every(w => w.done);
      const ch = r.challenge;
      const holdsDoor = ch && !ch.done && (ch.id === 'capture' || ch.id === 'switches'); // zones à prendre / interrupteurs : la porte attend, en plus des vagues
      if (r.type === 'CHEST' || r.type === 'CHEST_FINAL') {
        /* fin par interaction */
      } else if (r.type === 'TRAP') {
        /* porte ouverte dès le début (sauf effondrement) */
      } else if (r.type === 'MINIBOSS' || r.type === 'BOSS_REVENGE') {
        if (r.bossDead && Room.alive() === 0) Room.clear();
      } else if (!holdsDoor && allWaves && Room.alive() === 0 && r.wavesStarted) Room.clear();
    }
    /* coffre */
    if (r.chest && !r.chest.opened) {
      const d = dist(pl.x, pl.y, r.chest.x, r.chest.y);
      const near = d < r.chest.r + pl.r + 16;
      r.chest.near = near;
      r.chest.approach = clamp(1 - (d - 40) / 220, 0, 1); // le halo grossit à l'approche, bien avant la portée d'ouverture
      if (near && (Input.wasPressed('interact') || (pl.bot && r.stateT > 1))) Run.openChest();
    } else if (r.chest && r.chest.pending) {
      /* l'ouverture prend CHEST_OPEN_MS : le couvercle, la gerbe, les pièces en arc — l'écran de choix vient après */
      r.chest.openT += dt;
      if (r.chest.openT >= CHEST_OPEN_MS / 1000) {
        r.chest.pending = false;
        Run.chestChoice();
      }
    }
    /* porte : elle s'ouvre pile sur le temps fort, avec une onde verte */
    if (r.pendingDoor) {
      /* l'horloge musicale peut se recaler sur la piste (elle saute en arrière quand la musique démarre) : un rendez-vous
         qui s'est retrouvé à plus d'une mesure est repris sur la mesure suivante, jamais perdu */
      if (Beat.t < r.doorAt - 4 * Beat.beatLen() - 0.5) r.doorAt = Beat.t + Beat.timeToNextBar();
      if (Beat.t >= r.doorAt) Room.openDoor();
    }
    if (r.doorOpen && !pl.dead) {
      const dx = ROOM_X + ROOM_W,
        dy = ROOM_Y + ROOM_H / 2;
      if (pl.x > dx - pl.r - 26 && Math.abs(pl.y - dy) < TILE * 0.9) Run.nextRoom();
    }
    /* défi */
    if (r.challenge) Challenge.update(r, dt);
    /* salle du tempo */
    if (r.tempo) Tempo.update(r, dt);
    /* pièges (salle du tempo : temps musical) */
    for (const t of r.traps) t.update(dt, Room.trapTime(r, t));
    /* salles modulaires (phase 2) : Modular.update(r, dt) déplacera les obstacles et recalculera px/py */
    if (r.modular.length) Modular.update(r, dt);
    /* zones de dégâts (traînées de feu, gaz du joueur…) */
    for (let i = r.hazards.length - 1; i >= 0; i--) {
      const h = r.hazards[i];
      if (Time.now > h.until) {
        r.hazards.splice(i, 1);
        continue;
      }
      if (h.owner === 'enemy') {
        /* (le piège à loup du coyote est un vrai piège depuis le chantier 13 D : Room.dropTrap) */
        /* zone posée par un boss : mine qui saute à l'heure dite, ou ronces qui blessent et ralentissent tant qu'on reste dedans */
        if (h.boomAt && Time.now >= h.boomAt) {
          h.boomAt = 0;
          h.until = 0;
          Combat.explosion(h.x, h.y, h.r, Math.round((h.damage || 24) * G.difficulty.damageMul), h.color, false);
          continue;
        }
        if (h.dps && !pl.dead && dist(h.x, h.y, pl.x, pl.y) < h.r) {
          if (h.slow) {
            pl.gasSlowUntil = Time.now + 0.1;
            pl.gasSlowMul = 0.7;
          }
          const last = h.cd.get('pl') || -9;
          if (Time.now - last >= 0.5) {
            h.cd.set('pl', Time.now);
            Combat.hitPlayer(Math.round(h.dps * 0.5 * G.difficulty.damageMul), {
              type: 'trap',
              x: h.x,
              y: h.y,
              trapName: h.name || 'Ronces',
            });
          }
        }
        /* le feu d'un piège (chantier 13 C) brûle aussi les ennemis, à la fraction des deux camps */
        if (h.owner === 'trap' && h.dps)
          for (const e of G.enemies) {
            if (e.dead || dist(h.x, h.y, e.x, e.y) > h.r + e.r) continue;
            const last = h.cd.get(e) || -9;
            if (Time.now - last < 0.5) continue;
            h.cd.set(e, Time.now);
            const mul = e.isBoss ? BALANCE.trap.bossMul : BALANCE.trap.enemyMul;
            if (mul) Combat.hitEnemy(e, Math.max(1, Math.round(h.dps * 0.5 * G.difficulty.damageMul * mul)), { dot: true, x: e.x, y: e.y });
          }
        continue;
      }
      if (h.owner === 'player')
        for (const e of G.enemies) {
          if (e.dead || dist(h.x, h.y, e.x, e.y) > h.r + e.r) continue;
          const last = h.cd.get(e) || -9;
          if (Time.now - last < 0.25) continue;
          h.cd.set(e, Time.now);
          Combat.hitEnemy(e, h.dps * 0.25, { dot: true, x: e.x, y: e.y });
        }
    }
    /* tourelles */
    for (let i = r.turrets.length - 1; i >= 0; i--) {
      const t = r.turrets[i];
      if (Time.now > t.until) {
        r.turrets.splice(i, 1);
        continue;
      }
      if (t.mobile) {
        const d = dist(t.x, t.y, pl.x, pl.y);
        if (d > 90) {
          const a = angleTo(t.x, t.y, pl.x, pl.y);
          t.x += Math.cos(a) * 220 * dt;
          t.y += Math.sin(a) * 220 * dt;
        }
        t.r = 12;
        resolveRoomCollision(t);
      }
      t.cd -= dt;
      if (t.cd <= 0) {
        const e = nearestEnemy(t.x, t.y, t.range);
        if (e) {
          t.cd = 1 / t.rate;
          const a = angleTo(t.x, t.y, e.x, e.y);
          Projectiles.spawn({
            x: t.x,
            y: t.y,
            vx: Math.cos(a) * 560,
            vy: Math.sin(a) * 560,
            r: 4,
            damage: t.damage,
            owner: 'player',
            life: 1.2,
            color: '#9ff',
            knockback: 0.3,
          });
        }
      }
    }
    /* leurres */
    for (let i = r.decoys.length - 1; i >= 0; i--) {
      const d = r.decoys[i];
      if (Time.now > d.until || d.hp <= 0) {
        if (d.explode) Combat.explosion(d.x, d.y, 110, 40 * pl.stats.damage, '#c9a3ff', true);
        r.decoys.splice(i, 1);
      }
    }
    /* cosmétique */
    const tick = a => {
      for (let i = a.length - 1; i >= 0; i--) {
        a[i].t += dt;
        if (a[i].t > a[i].life) a.splice(i, 1);
      }
    };
    tick(r.beams);
    tick(r.blasts);
    tick(r.slashes);
  },
  /* Habillage d'une salle : donne un accessoire du biome aux obstacles qui n'en ont pas (`kind`) et sème du décor au sol.
     Déterministe (graine du sol) : la même salle est toujours habillée pareil. Le décor n'a aucune collision. */
  DRESS: {
    biome_1: {
      blocks: ['tank', 'fuel', 'locker', 'pipe', 'drip', 'microscope', 'bin', 'bed', 'counter', 'machine', 'boiler'],
      deco: ['cross', 'hazard', 'fan', 'valve', 'cog', 'battery', 'tubes', 'pack', 'bin', 'stool'],
    },
    biome_2: {
      blocks: ['planter', 'bush', 'roots', 'trap_plant', 'flask', 'fountain', 'tree', 'treep', 'bigrock', 'stump', 'roundbush'],
      deco: [
        'leaf',
        'mushrooms',
        'mushroom',
        'seedling',
        'sprout',
        'roots',
        'flower',
        'pot',
        'flowers',
        'shrooms',
        'smallrock',
        'mossypot',
      ],
    },
    biome_3: {
      blocks: ['cactus', 'rock', 'barrel', 'crate', 'wagon', 'cart', 'saguaro', 'deadtree'],
      deco: ['skull', 'tumbleweed', 'rails', 'wanted', 'skullpile'],
    },
    biome_4: {
      blocks: [
        'column',
        'jar',
        'vase',
        'basin',
        'palm',
        'basket',
        'brazier',
        'drapes',
        'bigpalm',
        'sphinx',
        'lion',
        'well',
        'stall',
        'stall2',
      ],
      deco: [
        'lamp',
        'lantern',
        'spices',
        'teapot',
        'gems',
        'scarab',
        'eye',
        'carpet',
        'incense',
        'chalice',
        'rug',
        'ruggreen',
        'bones',
        'drybush',
        'potround',
      ],
    },
  },
  dress(r) {
    if (r.dressed) return;
    r.dressed = true;
    const set = Room.DRESS[(G.run && G.run.biome && G.run.biome.id) || 'biome_1'];
    if (!set) return;
    const rng = makeRng(r.floorSeed ^ 0x9e37);
    for (let i = 0; i < r.obstacles.length; i++) {
      const o = r.obstacles[i];
      if (o.terrain) continue;
      if (!o.kind) o.kind = set.blocks[Math.floor(rng() * set.blocks.length)];
    } // le terrain a déjà son rendu : pas de cactus dans un muret
    if (r.deco.length) return;
    /* décor au sol : tuiles libres, loin du départ du joueur (colonnes 0-2) et du couloir de la porte */
    const taken = t => r.obstacles.some(o => t.x >= o.x - 1 && t.x <= o.x + o.w && t.y >= o.y - 1 && t.y <= o.y + o.h);
    const door = t => t.x >= ROOM_COLS - 2 && Math.abs(t.y - Math.floor(ROOM_ROWS / 2)) <= 1;
    const n = 5 + Math.floor(rng() * 4);
    for (let k = 0; k < n * 6 && r.deco.length < n; k++) {
      const t = { x: 3 + Math.floor(rng() * (ROOM_COLS - 5)), y: Math.floor(rng() * ROOM_ROWS) };
      if (taken(t) || door(t) || r.deco.some(d => Math.abs(d.x - t.x) < 3 && Math.abs(d.y - t.y) < 2)) continue;
      if (r.grid && !Terrain.plain(t.x, t.y, r)) continue; // pas de tapis au fond du bassin ni de plante sur un pont
      r.deco.push({ x: t.x, y: t.y, kind: set.deco[Math.floor(rng() * set.deco.length)], big: rng() < 0.25 });
    }
  },
  /* Des lumières dans les salles (F-5) : deux à quatre halos néon qui battent sur le temps fort, aux coins de la salle,
     si le contenu de la salle n'en pose pas lui-même (`anims` avec kind 'light'). Tirées du floorSeed : les mêmes à
     chaque visite. C'est le début du décor animé du chantier 9. */
  placeLights(r, def) {
    if (r.anims && r.anims.some(a => a.kind === 'light')) return;
    const pal = (G.run && G.run.biome && G.run.biome.palette) || { neon: ['#6ee7ff', '#ff9a3c'] };
    const rng = makeRng((r.floorSeed || 1) * 7 + 13);
    const spots = [
      { x: 1, y: 1 },
      { x: ROOM_COLS - 3, y: 1 },
      { x: 1, y: ROOM_ROWS - 3 },
      { x: ROOM_COLS - 3, y: ROOM_ROWS - 3 },
      { x: Math.floor(ROOM_COLS / 2) - 1, y: 0 },
      { x: Math.floor(ROOM_COLS / 2) - 1, y: ROOM_ROWS - 2 },
    ];
    const n = 2 + Math.floor(rng() * 3);
    const picked = spots.sort(() => rng() - 0.5).slice(0, n);
    r.anims = r.anims || [];
    picked.forEach((sp, i) =>
      r.anims.push(
        new AnimProp({
          kind: 'light',
          x: sp.x,
          y: sp.y,
          w: 2,
          h: 2,
          params: { radius: 2, base: 0.5, gain: 0.2, color: pal.neon[i % 2] || pal.neon[0] },
        })
      )
    );
  },
  /* horloge des pièges : temps musical dans la salle du tempo, temps de salle ailleurs */
  /* Horloge d'un piège : musicale s'il déclare une cadence en temps (`params.beats`), horloge de salle sinon.
     C'était décidé par salle : un piège rythmique posé hors de la salle du tempo tournait à la bonne vitesse mais
     sur une phase sans rapport avec la musique — donc seule la salle 7 jouait en mesure. */
  trapTime(r, t) {
    if (t ? t.beats : r.tempo && r.tempo.syncTraps) return Beat.t;
    return r.time + (r.trapShift || 0); // le sablier de salle (13 D) décale les pièges à l'horloge de salle, jamais ceux en musique
  },
  /* un piège posé en cours de salle (13 D) : le piège à loup que le coyote laisse en tombant. Il est à usage unique et
     hors des familles du tempo ; `spawncheck.js` ne le voit pas, c'est voulu. */
  dropTrap(id, x, y) {
    const def = Content.trap(id);
    if (!def || !G.room) return null;
    const tx = clamp(Math.floor((x - ROOM_X) / TILE), 0, ROOM_COLS - 1),
      ty = clamp(Math.floor((y - ROOM_Y) / TILE), 0, ROOM_ROWS - 1);
    const t = new Trap(def, { x: tx, y: ty, params: { once: true } });
    t.dropped = true;
    G.room.traps.push(t);
    return t;
  },
  clear() {
    const r = G.room;
    if (r.state === 'clear') return;
    r.state = 'clear';
    r.stateT = 0;
    if (r.tempo) {
      Tempo.onClear(r);
      return;
    } // porte sur la mesure suivante
    /* la porte s'ouvre sur le temps fort suivant (F-5) : Room.update la guette ; le reste de la fin de salle est immédiat */
    r.pendingDoor = true;
    UI.clearInfo(); // salle sécurisée : les infos retenues pendant le combat n'ont plus lieu d'être
    r.doorAt = Beat.t + Beat.timeToNextBar(); // un instant musical, pas une image : robuste aux grands pas de simulation
    UI.banner('Salle sécurisée — sortie ouverte', '#7fff9a');
    Music.calm();
    for (const p of Pickups.list) p.magnet = true;
    /* Un cœur à chaque salle vidée, devant la porte : la seule source de soin régulière d'une run. Sans lui,
       on arrivait au mini-boss avec 40 PV et aucun moyen d'en regagner — c'est là que mouraient 13 parties sur 16. */
    if (BALANCE.heartOnClear && r.index > 0)
      Pickups.spawn(ROOM_X + 22 * TILE + TILE / 2, ROOM_Y + 6 * TILE + TILE / 2, 'heart', BALANCE.heartOnClear);
    if (r.def.chest && !r.chest) Room.offerChest();
  },
  /* chantier 9 : le coffre n'est plus une salle, il est offert en fin de salle 3 et 7 (devant la porte, à gauche du cœur) ;
     au bazar il est caché derrière un étal, loin de la porte — on le cherche */
  offerChest() {
    const r = G.room;
    let x = tileX(19),
      y = tileY(6);
    if (r.def.chestHidden) {
      for (let k = 0; k < 60; k++) {
        const tx = RNG.int(2, 15),
          ty = RNG.int(1, 11);
        const px = tileX(tx),
          py = tileY(ty);
        if (!pointBlocked(px, py, 26)) {
          x = px;
          y = py;
          break;
        }
      }
    }
    r.chest = { x, y, r: 22, opened: false, offered: true };
    r.blasts.push({ x, y, r: 40, t: 0, life: 0.4, color: PAL.gold });
    UI.notify({
      text: r.def.chestHidden ? 'Un coffre, quelque part entre les étals' : 'Un coffre vous attend',
      color: PAL.gold,
      level: 2,
      key: 'chest',
    });
  },
  openDoor() {
    const r = G.room;
    if (r.doorOpen) return;
    r.pendingDoor = false;
    r.doorOpen = true;
    r.doorOpenedAt = { phase: Beat.phase(), bib: Beat.beatInBar() }; // mesuré par les tests : à moins de 30 ms du temps fort
    AudioEngine.roomClear({});
    r.blasts.push({ x: ROOM_X + ROOM_W + TILE / 2, y: ROOM_Y + ROOM_H / 2, r: 60, t: 0, life: 0.45, color: PAL.life });
  },
  /* score de la salle courante */
  score() {
    const r = G.room;
    return Progression.roomScore({
      hits: r.hits,
      time: r.time,
      refTime: r.refTime,
      bestCombo: r.bestCombo,
      comboTarget: r.comboTarget,
      died: r.died,
      fragments: r.fragments,
      fragmentsTotal: r.fragmentsDef.length,
    });
  },
  /* danger pour le bot */
  dangerAt(x, y) {
    let d = 0;
    const r = G.room;
    for (const t of r.traps) d = Math.max(d, t.dangerAt(x, y, Room.trapTime(r, t)));
    if (r.modular.length) d = Math.max(d, Modular.dangerAt(x, y, r));
    if (r.challenge) d = Math.max(d, Challenge.dangerAt(x, y, r));
    return d;
  },

  render(ctx) {
    const r = G.room;
    if (!r) return;
    Sprites.drawFloor(ctx, r);
    Sprites.drawWallFx(ctx, r);
    if (r.grid) Terrain.render(ctx, r);
    /* les traces des morts : une ellipse sombre teintée de l'ennemi, posée pour la salle */
    for (const d of r.decals) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#05060a';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.rx * 0.7, d.ry * 0.7, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    /* la passe de lumière (F-5) : le sol reste en cache, c'est la lumière qui bat — néon du palier en additif,
       0,09 au temps fort et 0,045 sur les autres temps, en outCubic de la phase */
    {
      const pal = (G.run && G.run.biome && G.run.biome.palette) || { neon: ['#6ee7ff', '#ff9a3c'] };
      r.lightAlpha = (Beat.beatInBar() === 0 ? 0.09 : 0.045) * Beat.pulse();
      if (r.lightAlpha > 0.002) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = r.lightAlpha;
        ctx.fillStyle = pal.neon[0];
        ctx.fillRect(ROOM_X, ROOM_Y, ROOM_W, ROOM_H);
        ctx.restore();
      }
    }
    for (const d of r.deco) Sprites.drawDeco(ctx, d);
    Anim.render(ctx, r); // décor animé au sol : sous les obstacles et les entités
    /* obstacles */
    if (r.challenge) Challenge.renderFloor(ctx, r);
    if (r.tempo) Tempo.renderFloor(ctx, r);
    Tempo.renderScore(ctx, r); // partition au sol : les tuiles qui vont être frappées s'annoncent, dans toutes les salles
    if (r.tempo) Tempo.renderPlayer(ctx, r); // la série qui se construit, sous les pieds du joueur
    for (const o of r.obstacles) if (!o.dyn && !o.terrain) Sprites.drawBlock(ctx, o);
    if (r.modular.length) Modular.render(ctx, r);
    /* porte */
    const dx = ROOM_X + ROOM_W,
      dy = ROOM_Y + ROOM_H / 2;
    ctx.save();
    ctx.fillStyle = r.doorOpen ? '#0b0d14' : '#2b3350';
    ctx.fillRect(dx - 4, dy - TILE, TILE + 8, TILE * 2);
    if (r.doorOpen) {
      Halo.rect(ctx, dx - 2, dy - TILE + 2, TILE + 4, TILE * 2 - 4, '#7fff9a', 3, 12 + 10 * Beat.pulse()); // la porte bat
      ctx.fillStyle = '#7fff9a';
      ctx.font = `bold 24px ${FONT_PIXEL}`;
      ctx.textAlign = 'center';
      ctx.fillText('▶', dx + TILE / 2, dy + 8);
    } else {
      ctx.strokeStyle = PAL.muted; // porte fermée : une croix grise, pas un danger
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(dx + 6, dy - TILE + 8);
      ctx.lineTo(dx + TILE - 2, dy + TILE - 8);
      ctx.moveTo(dx + TILE - 2, dy - TILE + 8);
      ctx.lineTo(dx + 6, dy + TILE - 8);
      ctx.stroke();
    }
    ctx.restore();
    /* zones */
    for (const h of r.hazards) {
      ctx.save();
      if (h.trap || h.marker) {
        /* un piège à loup : deux mâchoires ; un point de chute : un cercle qui se referme */
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = h.color;
        ctx.lineWidth = h.trap ? 3 : 2;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.trap ? h.r * 0.7 : h.r * clamp((h.boomAt - Time.now) / 0.8, 0.15, 1), 0, TAU);
        ctx.stroke();
        if (h.trap)
          for (let i = 0; i < 8; i++) {
            const a = (i * TAU) / 8;
            ctx.beginPath();
            ctx.moveTo(h.x + Math.cos(a) * h.r * 0.5, h.y + Math.sin(a) * h.r * 0.5);
            ctx.lineTo(h.x + Math.cos(a) * h.r * 0.85, h.y + Math.sin(a) * h.r * 0.85);
            ctx.stroke();
          }
        ctx.restore();
        continue;
      }
      ctx.globalAlpha = 0.45 * clamp((h.until - Time.now) / 1, 0.3, 1);
      ctx.fillStyle = h.color;
      Halo.draw(ctx, h.x, h.y, h.r, h.color, 12);
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    for (const t of r.traps) t.render(ctx, Room.trapTime(r, t));
    /* coffre */
    if (r.chest) Sprites.drawChest(ctx, r.chest);
    /* tourelles & leurres */
    for (const t of r.turrets) {
      ctx.save();
      if (t.mobile) {
        Sprites.draw(ctx, 'npc_ally', t.x, t.y, {
          walk: Time.now,
          tint: 'rgba(120,255,255,.35)',
          fallback: () => {
            ctx.fillStyle = '#3a4260';
            ctx.beginPath();
            ctx.arc(t.x, t.y - 8, 7, 0, TAU);
            ctx.fill();
            ctx.fillRect(t.x - 7, t.y - 2, 14, 14);
          },
        });
        ctx.fillStyle = '#9ff';
        ctx.font = `13px ${FONT_TEXT}`;
        ctx.textAlign = 'center';
        ctx.fillText(Math.ceil(t.until - Time.now) + ' s', t.x, t.y - 30);
      } else {
        ctx.fillStyle = '#3a4260';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 12, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#9ff';
        Halo.draw(ctx, t.x, t.y, 5, '#9ff', 10);
        ctx.beginPath();
        ctx.arc(t.x, t.y, 5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    for (const d of r.decoys) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#c9a3ff';
      Halo.draw(ctx, d.x, d.y, d.r, '#c9a3ff', 14);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  },
  renderFx(ctx) {
    const r = G.room;
    if (!r) return;
    Anim.renderOver(ctx, r); // lumières : par-dessus la salle, en mode additif
    for (const s of r.slashes) {
      const k = s.t / s.life;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.spark ? 3 * (1 - k) + 1 : s.slam ? 8 * (1 - k) + 1 : 7 * (1 - k) + 1; // il s'affine en s'effaçant
      const arc = () => {
        ctx.beginPath();
        if (s.slam) ctx.arc(s.cx, s.cy, s.range * (0.5 + 0.5 * k), 0, TAU);
        else ctx.arc(s.x, s.y, s.range * (0.7 + 0.3 * k), s.a - s.arc / 2, s.a + s.arc / 2);
      };
      ctx.globalAlpha = (1 - k) * 0.28;
      ctx.lineWidth += 14;
      arc();
      ctx.stroke();
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth -= 14;
      arc();
      ctx.stroke();
      ctx.restore();
    }
    for (const b of r.beams) {
      const k = b.t / b.life;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = b.width;
      ctx.beginPath();
      ctx.moveTo(b.ax, b.ay);
      if (b.jag) {
        const n = 6;
        for (let i = 1; i < n; i++) {
          const t = i / n;
          ctx.lineTo(lerp(b.ax, b.bx, t) + VFX_RNG.range(-8, 8), lerp(b.ay, b.by, t) + VFX_RNG.range(-8, 8));
        }
      }
      ctx.lineTo(b.bx, b.by);
      ctx.stroke();
      ctx.restore();
    }
    for (const b of r.blasts) {
      const k = b.t / b.life;
      ctx.save();
      if (b.fill) {
        ctx.globalCompositeOperation = 'lighter';
        const rr = b.r * (0.4 + 0.6 * k);
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, rr);
        g.addColorStop(0, `rgba(255,245,200,${0.9 * (1 - k)})`);
        g.addColorStop(0.45, b.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = (1 - k) * 0.85;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, rr, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      /* l'anneau et sa lueur (Halo.ring) : quarante ramassages en une seconde, c'était quarante flous de 24 px par image */
      const rr = b.r * (0.3 + 0.7 * k);
      if (b.flat)
        Halo.ring(ctx, b.x, b.y, rr, rr * 0.4, b.color, 3 * (1 - k) + 1, 8, 1 - k); // une onde à plat sur le sol
      else Halo.ring(ctx, b.x, b.y, rr, null, b.color, 7 * (1 - k) + 1, 24, 1 - k);
      ctx.restore();
    }
  },
};

/* ---------- Run : un niveau du début à la fin ---------- */
const Run = {
  start({ character, biome, weapon, skill, seed }) {
    Attract.stop();
    /* la graine (chantier 7) : donnée (bot, atelier), sinon celle collée d'une ligne de résultat (une fois), sinon la
       graine du jour si l'option est cochée, sinon au hasard — et toujours notée, pour la ligne de résultat */
    if (seed == null) {
      const p = Meta.profile;
      if (p.seedNext != null) {
        seed = +p.seedNext;
        p.seedNext = null;
        Meta.save();
      } else if (p.dailySeed) seed = Meta.dailySeed();
      else seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    }
    RNG.reseed(seed);
    const charDef = Content.character(character) || Content.character(null);
    const biomeDef = Content.biome(biome) || Content.biome(null);
    const rooms = Content.roomsOf(biomeDef.id);
    /* deux paires bonus/malus tirées : le joueur choisit la sienne en prépa (Run.setPair), la première par défaut */
    const pairChoices = RNG.shuffle(
      (biomeDef.levelPassives || [{ bonus: { name: '—', desc: '', mods: [] }, malus: { name: '—', desc: '', mods: [] } }]).slice()
    ).slice(0, 2);
    const pair = pairChoices[0];
    G.run = {
      biome: biomeDef,
      char: charDef,
      rooms,
      roomIndex: 0,
      pairChoices,
      seed,
      levelPassive: { bonus: Object.assign({ id: 'lp_bonus' }, pair.bonus), malus: Object.assign({ id: 'lp_malus' }, pair.malus) },
      level: 1,
      xp: 0,
      xpNext: Progression.xpForLevel(1),
      upgrades: [],
      pendingLevelUps: 0,
      rerolls: 0,
      scores: [],
      coinsPending: 0,
      coinsValidated: 0,
      lastCheckpoint: 0,
      startedAt: Time.now,
      ended: false,
      stats: {
        kills: 0,
        damageDealt: 0,
        damageTaken: 0,
        hitsTaken: 0,
        shots: 0,
        skillUses: 0,
        coins: 0,
        roomsEntered: 0,
        roomTimes: [],
        bossKilled: false,
        deathCause: null,
        deathRoom: null,
        levelReached: 1,
      },
      skillChoices: null,
      weaponDropRoom: RNG.pick([1, 3, 6, 7]),
    };
    Run.reset();
    G.player = new Player(charDef);
    G.player.hp = 0;
    G.player.recompute();
    G.player.hp = G.player.stats.maxHp;
    G.state = 'run';
    G.paused = false;
    const startW = weapon || charDef.startWeapon;
    if (weapon && skill) {
      Run.equip(startW, skill);
    }
    G.run.skillChoices = RNG.shuffle(Content.skillsAvailable().slice()).slice(0, 3);
    applyDifficulty();
    /* compagnon choisi au hub : il entre avec le joueur (celui trouvé sur une élite le remplacera) */
    const petId = Meta.profile.pet;
    const mode = Meta.profile.petMode || 'always';
    if (petId && Meta.petUnlocked(petId) && mode !== 'none')
      Pets.give(petId, true, mode); // sans bandeau : celui de la salle 1 passe d'abord
    else if (mode === 'none' || !petId) G.player.addBuff('solo', 1e6, PET_MODES.none.mods, false); // parti seul : il garde la part de l'animal, toute la run
    if (!Room.load(1)) return;
    if (!(weapon && skill)) {
      G.paused = true;
      UI.showPrep();
    } else Room.begin();
  },
  equip(weaponId, skillId) {
    const pl = G.player;
    pl.weapon = Content.weapon(weaponId) || Content.weapons()[0];
    pl.skill = Content.skill(skillId) || Content.skills()[0];
    pl.rerollsLeft = Meta.rerolls();
    pl.skillCharges = 1;
    pl.skillCd = 0;
    pl.recompute();
    pl.skillCharges = pl.skillMaxCharges;
    G.run.weapon = pl.weapon.id;
    G.run.skill = pl.skill.id;
  },
  addXp(n) {
    const r = G.run;
    if (r.ended || r.attract) return;
    r.xp += n;
    while (r.xp >= r.xpNext) {
      r.xp -= r.xpNext;
      r.level++;
      r.levelPopT = Time.now; // la pastille de niveau grossit et un anneau se dilate (HUD, I-5)
      r.xpNext = Progression.xpForLevel(r.level);
      r.pendingLevelUps++;
      r.stats.levelReached = r.level;
    }
    if (r.pendingLevelUps > 0 && !G.overlay) {
      /* en plein combat, la montée est une scène et l'écran attend le temps fort ; ailleurs (prépa, entre deux salles, bot), tout de suite */
      if (G.room && G.room.state === 'fight' && !G.autoplay && !G.player.dead) Run.levelUpScene();
      else Run.levelUp();
    }
  },
  /* Les scènes (F-6) : ce qui se joue dans le temps après un événement. Une scène est un objet sur la salle
     ({ kind, t, dur, … }) ; les rendez-vous musicaux (montée de niveau, écran de fin) sont des instants de Beat.t,
     repris sur la mesure suivante si l'horloge se recale. */
  barAfter(delay) {
    const bar = 4 * Beat.beatLen();
    let t = Beat.timeToNextBar();
    while (t < delay) t += bar;
    return Beat.t + t;
  },
  /* les scènes vivent en temps réel : un ralenti ne les étire pas (dt est le pas de simulation, déjà ralenti) */
  rawDt(dt) {
    return Time.now < Time.slowUntil ? dt / Math.max(0.02, Time.slow) : dt;
  },
  updateScenes(dt) {
    const r = G.run,
      rm = G.room,
      pl = G.player;
    const raw = Run.rawDt(dt);
    const sc = rm.scene;
    if (sc) {
      sc.t += raw;
      if (sc.kind === 'bossIn') {
        const b = sc.boss;
        b.introDrop = 1 - Ease.outCubic(clamp(sc.t / 0.7, 0, 1));
        const L = Beat.beatLen();
        while (sc.kicks < 3 && sc.t >= 0.45 + sc.kicks * L) {
          Feel.shake(9, Math.PI / 2, 160);
          sc.kicks++;
        }
        if (sc.t >= 0.9) Camera.zoomTo(1, 3);
      } else if (sc.kind === 'bossOut') {
        const b = sc.boss;
        while (sc.fired < 5 && sc.t >= sc.fired * 0.25) {
          const a = (sc.fired * TAU) / 5;
          const R = b.r || 30; // un boss factice des tests n'a pas de rayon
          const x = b.x + Math.cos(a) * R * 0.7,
            y = b.y + Math.sin(a) * R * 0.5;
          rm.blasts.push({ x, y, r: 60 + sc.fired * 14, t: 0, life: 0.45, color: b.color || '#ff8c42', fill: true });
          Particles.spawn(x, y, { count: 14, color: '#fff3c4', size: 3, speedMax: 240, glow: true, life: 0.6 });
          Feel.shake(9, a, 200);
          sc.fired++;
          rm.bossExplosions = sc.fired; // pour les tests : combien ont éclaté
        }
      }
      if (sc.t >= sc.dur) rm.scene = null;
    }
    /* la montée de niveau différée sur le temps fort suivant */
    if (r.levelAt != null && !G.overlay) {
      if (Beat.t < r.levelAt - 4 * Beat.beatLen() - 0.5) r.levelAt = Run.barAfter(0);
      if (Beat.t >= r.levelAt) {
        r.levelAt = null;
        r.levelUpAt = { bib: Beat.beatInBar(), phase: Beat.phase() };
        Run.levelUp();
      }
    }
    /* l'écran de fin sur le temps fort */
    if (r.endAt != null) {
      if (Beat.t < r.endAt - 4 * Beat.beatLen() - 0.5) r.endAt = Run.barAfter(0);
      if (Beat.t >= r.endAt) {
        r.endAt = null;
        r.endedAt = { bib: Beat.beatInBar(), phase: Beat.phase() };
        if (r.endFn) r.endFn();
      }
    }
    if (r.deathScene) r.deathScene.t += raw;
    if (r.winScene) r.winScene.t += raw;
    /* l'écran de fin de la mort : en temps réel, après la chute et au moins 1,4 s — la bande ralentit, un temps fort n'y a plus de sens */
    if (r.endReal && performance.now() >= r.endReal) {
      r.endReal = null;
      r.endedAt = { real: true };
      if (r.endFn) r.endFn();
    }
  },
  /* la montée de niveau mise en scène : l'écran de choix vient sur le temps fort suivant, le reste tout de suite */
  levelUpScene() {
    const r = G.run,
      pl = G.player;
    if (r.levelAt != null) return;
    Feel.stop(120, true);
    Camera.pulse = 0.06;
    const by = pl.y - 10;
    G.room.blasts.push({ x: pl.x, y: pl.y + Sprites.SOL - 3, r: 170, t: 0, life: 0.55, color: PAL.gold, flat: true });
    Particles.spawn(pl.x, by, {
      count: 40,
      color: PAL.gold,
      size: 3,
      speedMin: 120,
      speedMax: 320,
      angle: -Math.PI / 2,
      spread: 0.7,
      glow: true,
      life: 0.8,
    });
    pl.whiteT = 0.2;
    Floaters.add(pl.x, pl.y - 70, `${STR.level.toUpperCase()} ${r.level}`, PAL.gold, 40, 'event');
    for (const pe of G.pets) pe.hop();
    r.levelAt = Run.barAfter(0.3);
  },
  /* la paire bonus/malus choisie en prépa (index dans G.run.pairChoices) */
  setPair(i) {
    const r = G.run;
    const pair = r.pairChoices && r.pairChoices[i];
    if (!pair) return;
    r.levelPassive = { bonus: Object.assign({ id: 'lp_bonus' }, pair.bonus), malus: Object.assign({ id: 'lp_malus' }, pair.malus) };
    if (G.player) G.player.recompute();
  },
  upgradePool() {
    const pl = G.player;
    const fam = pl.weapon ? pl.weapon.family : null;
    const counts = {};
    for (const u of G.run.upgrades) counts[u.def.id] = u.stacks;
    return Content.upgrades().filter(u => (!u.weaponFamily || u.weaponFamily === fam) && (counts[u.id] || 0) < (u.maxStacks || 1));
  },
  levelUp() {
    const r = G.run;
    if (r.pendingLevelUps <= 0) return;
    r.pendingLevelUps--;
    const pl = G.player;
    AudioEngine.levelUp({});
    for (const h of pl.hooks.onLevelUp) if (h.effect === 'reroll_on_levelup') pl.rerollsLeft += h.count * (h.stacks || 1);
    const n = Meta.fourthChoice() ? 4 : 3;
    const opts = { force: G.debug.forceRarity };
    const choices = Progression.drawUpgrades(Run.upgradePool(), n, pl.stats.luck, opts);
    G.paused = true;
    UI.showChoice({
      title: STR.levelUp,
      subtitle: `${STR.level} ${r.level}`,
      choices,
      reroll: true,
      onPick: u => {
        Run.takeUpgrade(u);
        UI.hideChoice();
        G.paused = false;
        if (r.pendingLevelUps > 0) Run.levelUp();
      },
      onReroll: () => Progression.drawUpgrades(Run.upgradePool(), n, pl.stats.luck, opts),
    });
  },
  takeUpgrade(def) {
    const r = G.run;
    const ex = r.upgrades.find(u => u.def.id === def.id);
    if (ex) ex.stacks++;
    else r.upgrades.push({ def, stacks: 1 });
    G.player.recompute();
    AudioEngine.uiConfirm({});
    Floaters.add(G.player.x, G.player.y - 40, def.name, RARITY[def.rarity].color, 16);
    if (def.rarity === 'colossal') Meta.unlockLore('first_colossal');
  },
  /* fenêtre de scores pour un coffre */
  chestWindow() {
    const r = G.run;
    const idx = G.room.index;
    const scores = r.scores.filter(s => s.index < idx && (idx <= 4 ? s.index >= 1 : s.index >= 1));
    let vals = scores.map(s => s.score);
    let label = `Salles 1-${idx - 1}`;
    if (idx >= 8 && Meta.selectiveMemory()) {
      vals = Progression.bestN(vals, 3);
      label = '3 meilleures salles';
    }
    const died = scores.some(s => s.died);
    return { avg: Progression.avgScore(vals), died, label, count: vals.length };
  },
  openChest() {
    const r = G.room;
    if (!r.chest || r.chest.opened) return;
    const ch = r.chest;
    ch.opened = true;
    ch.pending = true;
    ch.openT = 0;
    AudioEngine.chestOpen({});
    Feel.stop(70, true);
    Feel.shake(4, -Math.PI / 2, 160);
    Particles.spawn(ch.x, ch.y - 10, {
      count: 26,
      color: '#ffd166',
      size: 3,
      speedMin: 120,
      speedMax: 320,
      angle: -Math.PI / 2,
      spread: 0.9,
      glow: true,
      life: 0.7,
    });
    Particles.spawn(ch.x, ch.y - 10, { count: 10, color: '#fff3c4', size: 2, speedMax: 160, glow: true, life: 0.4 });
    /* des pièces qui partent en arc du coffre : un décor du moment, pas des crédits — elles ne se ramassent pas */
    for (let i = 0; i < 7; i++) Pickups.spawn(ch.x, ch.y, 'glint', 0, { vz: -VFX_RNG.range(220, 340), ghost: true, life: 0.9 });
  },
  /* l'écran de choix du coffre, une fois le couvercle levé */
  chestChoice() {
    const r = G.room;
    const win = Run.chestWindow();
    const opts = Progression.chestOptions(win.avg, win.died);
    if (G.debug.forceRarity) opts.force = G.debug.forceRarity;
    const n = Meta.fourthChoice() ? 4 : 3;
    const pl = G.player;
    const choices = Progression.drawUpgrades(Run.upgradePool(), n, pl.stats.luck, opts);
    G.paused = true;
    UI.showChoice({
      title: STR.chest,
      subtitle:
        {
          'Sans dégât : Colossal garanti': 'Traversée sans dégât : une trouvaille Colossale garantie',
          'Épique garanti': 'Belle traversée : une trouvaille Épique garantie',
          'Rare garanti': 'Bonne traversée : une trouvaille Rare garantie',
          'Mort récente : tirage dégradé': 'Une mort en route : rien de colossal cette fois',
        }[opts.label] || 'Ce que la salle a gardé pour toi',
      choices,
      reroll: false,
      onPick: u => {
        Run.takeUpgrade(u);
        UI.hideChoice();
        G.paused = false;
        Room.clear();
      },
    });
    /* checkpoint : consignation des pièces */
    if (r.index === 4 || r.index === 8) Run.checkpoint();
  },
  checkpoint() {
    const r = G.run;
    if (r.coinsPending > 0) {
      r.coinsValidated += r.coinsPending;
      UI.toast(`En banque : ${r.coinsPending} crédits`);
      r.coinsPending = 0;
    }
    r.lastCheckpoint = G.room.index;
  },
  finishRoom() {
    const r = G.room;
    const s = Room.score();
    G.run.scores.push({ index: r.index, score: s, hits: r.hits, time: r.time, died: r.died });
    G.run.stats.roomTimes.push({
      room: r.index,
      time: Math.round(r.time * 10) / 10,
      hits: r.hits,
      score: Math.round(s * 100) / 100,
      level: G.run.level,
    });
    if ((r.type === 'TRAP' || r.type === 'COMBAT_TEMPO') && r.hits === 0) {
      const bonus = Math.round(BALANCE.xpPerfectTrapRoom * G.player.stats.xpGain * G.debug.xpMul);
      Run.addXp(bonus);
      UI.toast(r.type === 'COMBAT_TEMPO' ? `Sans fausse note : +${bonus} XP` : `Traversée parfaite : +${bonus} XP`);
    }
    if (r.index === 3) Meta.unlockLore('room3_done');
    if (r.index === 5) {
      Meta.unlockLore('room5_reached');
      if (r.hits === 0) Meta.unlockLore('boss_no_hit');
    }
    if (r.index === 9 && r.hits === 0) Meta.unlockLore('boss_no_hit');
  },
  nextRoom() {
    if (G.overlay || G.room.leaving) return;
    G.room.leaving = true;
    Run.finishRoom();
    const next = G.room.index + 1;
    if (!G.run.rooms.find(x => x.index === next)) {
      Run.endLevel(true);
      return;
    }
    UI.transition(() => {
      Room.load(next);
    });
  },
  onPlayerDeath() {
    const r = G.run;
    if (r.ended || r.attract) return;
    r.ended = true;
    G.room.died = true;
    r.stats.deathRoom = G.room.index;
    r.stats.deathCause = Run.lastDamageSource || 'inconnu';
    const kept = Progression.coinsKeptOnDeath(r.coinsPending, G.room.index, r.lastCheckpoint);
    const total = r.coinsValidated + kept;
    Meta.addCoins(total);
    Meta.recordRun(false, Run.summary(false));
    Meta.unlockLore('deaths_3');
    /* Le personnage tombe avant que l'écran de fin ne s'affiche : la durée de sa planche de mort, plus un temps
       d'arrêt sur la dernière image. Sans planche (ou pour le bot), tout de suite, comme avant. */
    const pl = G.player;
    const chute = pl && pl.char && pl.char.anim && pl.char.anim.death && !G.autoplay ? clipLen(pl.char.anim.death, 'death') + 0.35 : 0;
    const fin = () => {
      if (G.state !== 'run' || G.overlay === 'end') return;
      G.paused = true;
      UI.showEnd({ victory: false, kept, pending: r.coinsPending, validated: r.coinsValidated, total });
    };
    if (G.autoplay) fin();
    else {
      /* la scène (F-6) : ralenti, ennemis figés, voile sombre, zoom sur le corps, le compagnon qui vient s'asseoir ;
         l'écran de fin sur le temps fort suivant, après la chute et au moins 1,4 s */
      Feel.slow(0.18, 1400);
      Camera.zoomTo(1.3, 1.4);
      r.deathScene = { t: 0, dur: 1.2 };
      for (const pe of G.pets) pe.mourn = true;
      r.endFn = fin;
      r.endReal = performance.now() + Math.max(chute, 1.4) * 1000;
    }
    Music.dying(2.2, () => {
      if (G.overlay === 'end' || G.state === 'hub') Music.play('hub');
    }); // la bande ralentit et descend, puis le hub
  },
  endLevel(victory) {
    const r = G.run;
    if (r.ended || r.attract) return;
    r.ended = true;
    const bonus = Math.round(BALANCE.levelEndBonus * G.player.stats.coinGain * G.debug.coinMul);
    const total = r.coinsValidated + r.coinsPending + bonus;
    Meta.addCoins(total);
    Meta.recordRun(true, Run.summary(true));
    const fin = () => {
      if (G.overlay === 'end') return;
      G.paused = true;
      UI.showEnd({ victory: true, kept: r.coinsPending, pending: 0, validated: r.coinsValidated, total, bonus });
      Music.resetState();
      Music.play('hub');
    };
    if (G.autoplay) fin();
    else {
      /* la victoire : la même image que la mort, à l'envers — debout, l'animal qui saute, voile doré, l'anneau grand ouvert */
      r.winScene = { t: 0, dur: 1.4 };
      for (const pe of G.pets) pe.hop();
      Camera.zoomTo(1.15, 1.2);
      r.endFn = fin;
      r.endAt = Run.barAfter(1.4);
    }
  },
  abort() {
    const r = G.run;
    if (!r || r.ended) return;
    r.ended = true;
    const kept = Progression.coinsKeptOnDeath(r.coinsPending, G.room.index, r.lastCheckpoint);
    Meta.addCoins(r.coinsValidated + kept);
    Meta.recordRun(false);
    Run.toHub();
  },
  /* Tout ce qu'une partie laisse derrière elle, effacé d'un seul geste : au départ d'une run comme au retour au hub.
     Une liste oubliée ici, c'est un compagnon fantôme ou une particule d'une autre partie qui traîne. */
  reset() {
    G.enemies = [];
    G.pets = [];
    G.room = null;
    Projectiles.list = [];
    Pickups.list = [];
    Particles.list = [];
    Floaters.list = [];
  },
  toHub() {
    G.state = 'hub';
    G.paused = false;
    G.overlay = null;
    G.run = null;
    G.player = null;
    Run.reset();
    UI.showHub();
    Music.resetState();
    Music.play('hub');
    Attract.start();
  },
  /* le score et le résumé d'une partie (chantier 7) : ce que l'écran de fin affiche et ce que le tableau garde */
  score(win) {
    const r = G.run;
    if (!r) return 0;
    return Progression.runScore({
      scores: r.scores,
      reached: win ? 9 : G.room ? G.room.index : r.stats.deathRoom || 1,
      level: r.level,
      time: Time.now - r.startedAt,
      win: !!win,
    });
  },
  summary(win) {
    const r = G.run;
    if (!r) return null;
    const room = win ? 9 : G.room ? G.room.index : r.stats.deathRoom || 1;
    r.summary = {
      score: Run.score(win),
      room,
      win: !!win,
      time: Math.round(Time.now - r.startedAt),
      seed: r.seed,
      biome: r.biome.id,
      char: r.char.id,
      pet: G.pet ? G.pet.id : null,
    };
    return r.summary;
  },
  /* « WAY · Martin + Uno · ADMISSION · salle 9 · 4 min 12 · 18 430 pts · graine 20260911 » : à coller à un ami ; la graine se relit */
  resultLine(s) {
    s = s || (G.run && G.run.summary) || Run.summary(false);
    if (!s) return '';
    const ch = Content.character(s.char),
      pet = s.pet ? Content.pet(s.pet) : null,
      bio = Content.biome(s.biome);
    const t = `${Math.floor(s.time / 60)} min ${String(s.time % 60).padStart(2, '0')}`;
    const pts = String(s.score).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `WAY · ${ch ? ch.name : s.char}${pet ? ' + ' + pet.name : ''} · ${bio ? bio.name : s.biome} · salle ${s.room}${s.win ? ' (fini)' : ''} · ${t} · ${pts} pts · graine ${s.seed}`;
  },
  /* relit une ligne collée : la graine, et le palier s'il est reconnu */
  parseResult(text) {
    const m = /graine\s+(\d+)/i.exec(text || '');
    if (!m) return null;
    const out = { seed: +m[1] };
    for (const b of Content.biomes()) if (text.toUpperCase().includes(b.name.toUpperCase())) out.biome = b.id;
    return out;
  },
  qualityAvg() {
    const r = G.run;
    if (!r) return 1;
    const vals = r.scores.map(s => s.score);
    const cur = G.room && G.room.state !== 'clear' ? [Room.score()] : [];
    return Progression.avgScore(vals.concat(cur));
  },

  update(dt) {
    if (!G.run || G.paused) return;
    const pl = G.player;
    if (!G.attract)
      Music.setState({
        hp01: pl.hp / pl.stats.maxHp,
        slow: Time.now < Time.slowUntil ? Time.slow : 1,
        overdrive: pl.overdriveUntil > Time.now,
      });
    const rm = G.room;
    if (!(rm && rm.state === 'intro')) pl.update(dt); // pendant l'entrée de salle, c'est la scène qui bouge le joueur
    Pets.update(dt);
    if (!pl.dead) for (const e of G.enemies) e.update(dt); // la mort du joueur fige les ennemis
    G.enemies = G.enemies.filter(e => !e.dead || (e.deathT != null && e.deathT < (e.deathDur || DEATH_MS / 1000))); // un mort s'écrase avant de partir
    Run.updateScenes(dt);
    Projectiles.update(dt);
    Pickups.update(dt);
    Room.update(dt);
    Particles.update(dt);
    Floaters.update(dt);
    Camera.update(dt); // secousse et impulsion de zoom
  },
};
