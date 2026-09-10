/* =========================================================================
   WAY — 38_challenges.js
   Défis de salle : salle 2 (« salle aléatoire », toujours un défi), salles 6 et 7 (60 %) :
   capture (tenir 3 zones), collapse (le sol s'effondre, tenir jusqu'à 40 % de surface),
   switches (3 interrupteurs dans l'ordre, récompense), lights (lumières coupées), timer (chrono, enragés après).
   ========================================================================= */

'use strict';
const CHALLENGE_DEFS = {
  capture: {
    name: 'Capture de zone',
    desc: "Tenez la zone pour remplir la jauge, trois zones de suite. Porte fermée tant que les zones ne sont pas prises. Renforts au corps à corps. Kills dans la zone : +50 % d'XP.",
    rooms: ['COMBAT_CHALLENGE', 'COMBAT_MODULAR', 'COMBAT_TRAP_MODULAR'],
    color: '#7fff9a',
  },
  collapse: {
    name: "Sol qui s'effondre",
    desc: "Des dalles tombent par paquets pendant tout le combat, jusqu'à la moitié du sol. Les ennemis tombent aussi. Tuez les vagues : la porte s'ouvre et une passerelle se déploie.",
    rooms: ['COMBAT_CHALLENGE', 'COMBAT_MODULAR', 'COMBAT_TRAP_MODULAR'],
    color: '#ffb347',
    replacesTraps: true,
  },
  switches: {
    name: 'Séquence',
    desc: "Activez les 3 interrupteurs dans l'ordre affiché ET tuez les vagues : la porte ne s'ouvre qu'avec les deux. Décharge en cas d'erreur.",
    rooms: ['COMBAT_CHALLENGE', 'COMBAT_MODULAR', 'COMBAT_TRAP_MODULAR'],
    color: '#c9a3ff',
  },
  lights: {
    name: 'Lumières coupées',
    desc: "Noir complet : des projecteurs balaient la salle en musique, à vous de suivre la lumière. Les ennemis se trahissent par leurs yeux. Tuer dans la lumière : +50 % d'XP. XP +25 %.",
    rooms: ['COMBAT_CHALLENGE', 'COMBAT_MODULAR', 'COMBAT_TRAP_MODULAR'],
    color: '#9fd8ff',
  },
  timer: {
    name: 'Chrono',
    desc: "Finissez en moins de 60 s : prime de crédits. Après, tout ce qui reste s'enrage.",
    rooms: ['COMBAT_CHALLENGE', 'COMBAT_MODULAR', 'COMBAT_TRAP_MODULAR'],
    color: '#ff5e7a',
  },
};
const CHALLENGE_ROOMS = [2, 6]; // salle 2 : toujours un défi ; 6 : 60 % de chance (la salle 7 est la salle du tempo)
const CHALLENGE_CHANCE = 0.6;

const Challenge = (() => {
  const tileFree = (tx, ty, room) => !room.obstacles.some(o => tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.h);
  const randFreeTile = (room, rng, margin = 2) => {
    for (let k = 0; k < 40; k++) {
      const tx = rng.int(margin, ROOM_COLS - 1 - margin),
        ty = rng.int(margin, ROOM_ROWS - 1 - margin);
      if (tileFree(tx, ty, room)) return { x: tx, y: ty };
    }
    return { x: 12, y: 6 };
  };

  /* choix du défi pour une salle (null si aucun) */
  function pick(def, rng, used) {
    if (!CHALLENGE_ROOMS.includes(def.index)) return null;
    if (G.debug.forceChallenge) return G.debug.forceChallenge === 'none' ? null : G.debug.forceChallenge;
    if (def.type !== 'COMBAT_CHALLENGE' && !rng.chance(CHALLENGE_CHANCE)) return null;
    let ids = Object.keys(CHALLENGE_DEFS).filter(id => CHALLENGE_DEFS[id].rooms.includes(def.type) && !used.includes(id));
    if (!ids.length && def.type === 'COMBAT_CHALLENGE')
      ids = Object.keys(CHALLENGE_DEFS).filter(id => CHALLENGE_DEFS[id].rooms.includes(def.type));
    return ids.length ? rng.pick(ids) : null;
  }
  function create(id, room) {
    const d = CHALLENGE_DEFS[id];
    const c = { id, def: d, done: false, t: 0, hud: '' };
    const rng = RNG;
    if (id === 'capture') {
      c.zones = [];
      for (let i = 0; i < 3; i++) {
        let p;
        for (let k = 0; k < 20; k++) {
          p = randFreeTile(room, rng, 3);
          if (!c.zones.some(z => dist(z.x, z.y, tileX(p.x), tileY(p.y)) < 300)) break;
        }
        c.zones.push({ x: tileX(p.x), y: tileY(p.y) });
      }
      c.zi = 0;
      c.gauge = 0;
      c.r = 3 * TILE;
      c.reinforceT = 5;
      c.reinforceEvery = 6;
      c.reinforcements = 0; // vagues de renfort envoyées (plafonnées par BALANCE.reinforcementWaves)
    } else if (id === 'collapse') {
      c.holes = new Set();
      c.warn = new Map();
      c.nextT = 3;
      c.every0 = Math.max(2.0, 3.0 - 0.3 * ((G.run.biome.order || 1) - 1));
      c.total = ROOM_COLS * ROOM_ROWS;
      c.target = Math.round(c.total * 0.55);
      c.fallen = 0;
      c.reinforceT = 8;
      c.reinforceEvery = 9;
    } else if (id === 'switches') {
      c.sw = [];
      const order = rng.shuffle([0, 1, 2]);
      for (let i = 0; i < 3; i++) {
        let p;
        for (let k = 0; k < 20; k++) {
          p = randFreeTile(room, rng, 2);
          if (!c.sw.some(s => dist(s.tx, s.ty, p.x, p.y) < 5)) break;
        }
        c.sw.push({ tx: p.x, ty: p.y, x: tileX(p.x), y: tileY(p.y), on: false, label: ['I', 'II', 'III'][i] });
      }
      c.order = order;
      c.step = 0;
      c.showT = 4;
      c.fails = 0;
    } else if (id === 'lights') {
      /* Boîte de nuit : au départ un seul halo au centre. Dès qu'on le rejoint, les ennemis arrivent et les projecteurs
         se mettent à balayer la salle en musique. La lampe du joueur reste minuscule : c'est la lumière qu'il faut suivre. */
      c.radius = 96;
      c.phase = 'lure';
      c.lure = { x: ROOM_X + ROOM_W / 2, y: ROOM_Y + ROOM_H / 2, r: 120 };
      c.t2 = 0;
      c.beams = [];
      c.patId = null;
      c.patName = '';
      c.patBars = 4;
      c.barAt = 0;
      c.fade = 1;
      c.flash = 0;
    } else if (id === 'timer') {
      c.limit = 60;
      c.enraged = false;
    }
    return c;
  }
  /* ---------- « lumières coupées » : motifs de lumière, un seul actif à la fois ----------
     Chaque motif dure quelques mesures puis cède la place au suivant, sur un temps fort. À chaque instant le joueur n'a
     qu'une idée de lumière à comprendre, et la salle change de visage en musique. */
  const pt = () => ({ x: RNG.range(ROOM_X + 90, ROOM_X + ROOM_W - 90), y: RNG.range(ROOM_Y + 80, ROOM_Y + ROOM_H - 80) });
  const LIGHT_PATTERNS = [
    { id: 'chase', name: 'Poursuite', bars: 4, make: () => [{ kind: 'round', r: 185, ...pt(), speed: 2.2, color: '#fff6d8', near: true }] },
    {
      id: 'fireflies',
      name: 'Lucioles',
      bars: 4,
      make: () => [
        { kind: 'round', r: 84, ...pt(), speed: 6, color: '#9fd8ff', jump: true },
        { kind: 'round', r: 84, ...pt(), speed: 6, color: '#ffd166', jump: true },
      ],
    }, // jump : une destination par temps, atteinte en un temps
    {
      id: 'sweep',
      name: 'Balayage',
      bars: 4,
      make: () => [{ kind: 'rect', axis: 'v', w: 150, x: ROOM_X + 40, y: 0, speed: 1.2, color: '#c9a3ff', sweep: 1 }],
    },
    {
      id: 'cross',
      name: 'Croix',
      bars: 4,
      make: () => [
        { kind: 'rect', axis: 'v', w: 130, x: ROOM_X + ROOM_W * 0.5, y: 0, speed: 2, color: '#c9a3ff' },
        { kind: 'rect', axis: 'h', h: 104, x: 0, y: ROOM_Y + ROOM_H * 0.5, speed: 2, color: '#7fff9a' },
      ],
    },
    {
      id: 'mirrorball',
      name: 'Boule à facettes',
      bars: 4,
      make: () => [{ kind: 'mirror', n: 6, r: 46, spin: 0.62, orbit: 210, color: '#ffd166' }],
    },
    { id: 'strobe', name: 'Stroboscope', bars: 2, make: () => [{ kind: 'strobe', color: '#e8ecf7' }] },
    { id: 'blackout', name: 'Noir', bars: 2, make: () => [] },
  ];
  /* passe au motif suivant : jamais deux fois le même, et jamais deux motifs « durs » à la suite */
  function nextPattern(c) {
    const hard = ['strobe', 'blackout'];
    let pool = LIGHT_PATTERNS.filter(p => p.id !== c.patId);
    if (hard.includes(c.patId)) pool = pool.filter(p => !hard.includes(p.id));
    const p = RNG.pick(pool);
    c.patId = p.id;
    c.patName = p.name;
    c.patBars = p.bars;
    c.beams = p.make();
    c.barAt = Math.floor(Beat.index() / 4);
    c.fade = 0;
    for (const b of c.beams) {
      if (b.tx === undefined) {
        b.tx = b.x;
        b.ty = b.y;
      }
    }
    AudioEngine.tempoCue({ intensity: 0.45, hz: Beat.noteHz(2) });
  }
  /* renforts : de préférence au corps à corps (rôdeurs, chargeurs, kamikazes, dashers) — les tireurs laissent tenir une zone trop facilement */
  const spawnReinforcement = (n, melee) => {
    const all = G.run.biome.enemyPool.filter(id => {
      const e = Content.enemy(id);
      return e && e.archetype !== 'summoner';
    });
    const cc = all.filter(id => ['rusher', 'tank', 'kamikaze', 'dasher'].includes(Content.enemy(id).archetype));
    if (Room.alive() >= 9) return;
    for (let i = 0; i < n; i++) {
      const pool = melee && cc.length && RNG.chance(0.8) ? cc : all;
      Room.spawnAt({ enemy: RNG.pick(pool), count: 1, x: -1, y: -1 });
    }
    UI.banner('Renforts', '#ff6b6b');
  };

  /* ---------- update ---------- */
  function update(room, dt) {
    const c = room.challenge;
    if (!c || c.done) return;
    c.t += dt;
    const pl = G.player;
    if (c.id === 'capture') {
      const z = c.zones[c.zi];
      const inside = dist(pl.x, pl.y, z.x, z.y) < c.r;
      c.gauge = clamp(c.gauge + (inside ? dt / 6 : -dt / 12), 0, 1);
      c.reinforceT -= dt;
      if (c.reinforceT <= 0 && c.reinforcements < BALANCE.reinforcementWaves) {
        c.reinforceT = c.reinforceEvery;
        c.reinforcements++;
        spawnReinforcement(3 + Math.floor(RNG() * 2), true);
      }
      /* plus de renforts et plus personne : la porte s'ouvre, les zones restent non capturées (pas de prime) */
      if (c.reinforcements >= BALANCE.reinforcementWaves && Room.alive() === 0 && room.waves.every(w => w.done)) {
        c.done = true;
        UI.banner("Zones abandonnées — la porte s'ouvre", '#ffb347');
      }
      if (c.gauge >= 1) {
        c.zi++;
        c.gauge = 0;
        AudioEngine.roomClear({ intensity: 0.6 });
        Particles.spawn(z.x, z.y, { count: 30, color: '#7fff9a', glow: true, speedMax: 300 });
        if (c.zi >= c.zones.length) {
          c.done = true;
          UI.banner('Zones capturées', '#7fff9a');
          room.challengeOk = true;
        } else UI.banner(`Zone ${c.zi + 1} / 3`, '#7fff9a');
      }
      c.hud = `Zone ${Math.min(c.zi + 1, 3)}/3 · ${Math.round(c.gauge * 100)} %`;
    } else if (c.id === 'collapse') {
      /* avertissements → chutes */
      for (const [k, until] of c.warn) {
        if (room.time >= until) {
          c.warn.delete(k);
          c.holes.add(k);
          c.fallen++;
          const [tx, ty] = k.split(',').map(Number);
          Particles.spawn(tileX(tx), tileY(ty), { count: 8, color: '#3a3f55', size: 4, speedMax: 90, life: 0.7 });
          G.shake = Math.min(6, G.shake + 1.5);
        }
      }
      c.nextT -= dt;
      const safe = c.total - c.holes.size - c.warn.size;
      if (c.nextT <= 0 && safe > c.target) {
        c.nextT = Math.max(1.3, c.every0 - c.t * 0.014);
        scheduleCluster(room, c);
        if (c.t > 25 && RNG.chance(0.5)) scheduleCluster(room, c);
        AudioEngine.trapSpike({ intensity: 0.7 });
      } // accélère avec le temps, parfois deux paquets
      c.reinforceT -= dt;
      if (c.reinforceT <= 0 && Room.alive() < 5 && !room.waves.every(w => w.done)) {
        c.reinforceT = c.reinforceEvery;
        spawnReinforcement(2);
      }
      /* chutes */
      const tileOf = e => `${Math.floor((e.x - ROOM_X) / TILE)},${Math.floor((e.y - ROOM_Y) / TILE)}`;
      if (!pl.dead && !pl.dashing && c.holes.has(tileOf(pl))) fallPlayer(room, c);
      for (const e of G.enemies) {
        if (e.dead || e.isBoss || e.state === 'dash' || e.state === 'lunge' || e.state === 'charge') continue;
        if (c.holes.has(tileOf(e))) {
          e.xp = Math.round(e.xp * 0.5);
          e.coins = 0;
          Floaters.add(e.x, e.y - 10, 'tombé', '#9aa4c4', 12);
          Combat.killEnemy(e, { silent: true });
        }
      }
      const pct = Math.round((100 * (c.total - c.holes.size)) / c.total);
      c.hud = `Sol ${pct} % · tuez les vagues`;
      /* la salle se termine par les vagues, pas par le sol : à la fin, une passerelle se déploie si le chemin vers la porte est coupé */
      if (room.state === 'clear' && !c.done) {
        c.done = true;
        room.challengeOk = true;
        c.warn.clear();
        buildPlanks(room, c);
        UI.banner('Une passerelle se déploie vers la sortie', '#ffb347');
      }
    } else if (c.id === 'switches') {
      c.showT -= dt;
      for (const s of c.sw) {
        if (s.on || dist(pl.x, pl.y, s.x, s.y) > 26 + pl.r) continue;
        const expected = c.order[c.step];
        if (c.sw.indexOf(s) === expected) {
          s.on = true;
          c.step++;
          AudioEngine.uiConfirm({});
          Particles.spawn(s.x, s.y, { count: 10, color: '#7fff9a', glow: true });
          if (c.step >= 3) {
            c.done = true;
            room.challengeOk = true;
            reward(room);
          }
        } else {
          c.fails++;
          for (const q of c.sw) q.on = false;
          c.step = 0;
          Combat.hitPlayer(8, { type: 'trap', x: s.x, y: s.y, trapName: 'Décharge' });
          G.room.beams.push({ ax: s.x, ay: s.y, bx: pl.x, by: pl.y, t: 0, life: 0.25, color: '#c9a3ff', width: 4, jag: true });
          UI.banner('Mauvais ordre', '#ff5e7a');
          s.cool = 1;
        }
      }
      c.hud = `Ordre : ${c.order.map(i => c.sw[i].label).join(' → ')} · ${c.step}/3`;
    } else if (c.id === 'lights') {
      c.t2 += dt;
      if (c.phase === 'lure') {
        c.hud = 'Rejoins le halo';
        if (dist(pl.x, pl.y, c.lure.x, c.lure.y) < c.lure.r * 0.8) {
          // le joueur a rejoint la lumière : le spectacle commence
          c.phase = 'show';
          nextPattern(c);
          AudioEngine.bossPhase({ intensity: 0.6 });
          UI.banner(
            "Les projecteurs s'allument",
            c.def.color,
            "Un seul motif de lumière à la fois, il change toutes les quelques mesures. Tuer dans la lumière : +50 % d'XP."
          );
        }
      } else {
        c.hud = c.patName || 'Suis la lumière';
        const bar = Beat.crossedFrame(1) && Beat.beatInBar() === 0,
          beat = Beat.crossedFrame(1),
          ph2 = Beat.phase();
        /* un seul motif à la fois : il cède la place au suivant sur un temps fort, une fois ses mesures écoulées */
        if (bar && Math.floor(Beat.index() / 4) - c.barAt >= c.patBars) nextPattern(c);
        c.fade = Math.min(1, c.fade + dt * 3);
        c.flash = Math.max(0, c.flash - dt * 6);
        if (c.patId === 'strobe' && bar) c.flash = 1;
        const L = Beat.beatLen(),
          vMax = (pl.stats && pl.stats.speed) || 260; // toute la chorégraphie se règle sur la vitesse du joueur
        for (const b of c.beams) {
          if (b.kind === 'mirror') {
            b.a = (b.a || 0) + b.spin * dt * (1 + 0.5 * Math.max(0, 1 - ph2 * 2));
            continue;
          } // la rotation s'emballe sur le temps
          if (b.kind === 'strobe') continue;
          /* balayage : va-et-vient continu (avant, il se téléportait au bord opposé), toujours sous la vitesse du joueur */
          if (b.sweep) {
            const u = (b.x - ROOM_X) / ROOM_W;
            b.x += b.sweep * Math.min(vMax * 0.8, 90 + 150 * Math.sin(Math.PI * clamp(u, 0, 1))) * dt;
            if (b.x > ROOM_X + ROOM_W - 60) {
              b.x = ROOM_X + ROOM_W - 60;
              b.sweep = -1;
            }
            if (b.x < ROOM_X + 60) {
              b.x = ROOM_X + 60;
              b.sweep = 1;
            }
            b.tx = b.x;
            continue;
          }
          /* Nouvelle destination seulement quand la précédente est atteinte, et toujours sur un temps. La distance est
             bornée par ce que le joueur peut parcourir dans le même temps : avant, la lumière visait n'importe quel point
             de la salle et allait 1,2× à 20× plus vite que lui — impossible à suivre. Les pointes restent (elles couvrent
             la même distance en deux fois moins de temps), mais on peut toujours recoller. */
          if (b.moveK == null) b.moveK = 1;
          if (b.moveK >= 1 && (bar || (beat && b.jump) || (beat && RNG.chance(0.2)))) {
            b.fx = b.x;
            b.fy = b.y;
            const burst = RNG.chance(0.22);
            const dur = L * (burst || b.jump ? 1 : 2);
            const reach = vMax * (burst ? 1.55 : b.jump ? 1.05 : 0.85) * dur;
            if (b.kind === 'rect') {
              if (b.axis === 'v') b.tx = clamp(b.x + RNG.range(-reach, reach), ROOM_X + 70, ROOM_X + ROOM_W - 70);
              else b.ty = clamp(b.y + RNG.range(-reach, reach), ROOM_Y + 60, ROOM_Y + ROOM_H - 60);
            } else {
              /* le halo « poursuite » revient régulièrement vers le joueur sans le coller : c'est à lui de suivre */
              const a = b.near && RNG.chance(0.5) ? angleTo(b.x, b.y, pl.x, pl.y) + RNG.range(-0.9, 0.9) : RNG.range(0, TAU);
              const d = reach * RNG.range(0.55, 1);
              b.tx = clamp(b.x + Math.cos(a) * d, ROOM_X + 80, ROOM_X + ROOM_W - 80);
              b.ty = clamp(b.y + Math.sin(a) * d, ROOM_Y + 70, ROOM_Y + ROOM_H - 70);
            }
            b.moveDur = dur;
            b.moveK = 0;
            b.burst = burst;
          }
          if (b.moveK < 1) {
            b.moveK = Math.min(1, b.moveK + dt / Math.max(0.05, b.moveDur || L));
            const e = b.moveK < 0.5 ? 4 * b.moveK * b.moveK * b.moveK : 1 - Math.pow(-2 * b.moveK + 2, 3) / 2; // accélère puis freine
            b.x = lerp(b.fx != null ? b.fx : b.x, b.tx, e);
            b.y = lerp(b.fy != null ? b.fy : b.y, b.ty, e);
          }
        }
      }
      if (room.state === 'clear') c.done = true;
    } else if (c.id === 'timer') {
      const left = Math.max(0, c.limit - room.time);
      if (room.state === 'clear' && !c.done) {
        c.done = true;
        if (left > 0) {
          room.challengeOk = true;
          const bonus = 30;
          G.run.coinsPending += bonus;
          UI.toast(`Chrono tenu : +${bonus} crédits`);
        }
      }
      if (left <= 0 && !c.enraged) {
        c.enraged = true;
        UI.banner('ENRAGÉS', '#ff5e7a');
        AudioEngine.bossRoar({});
        for (const e of G.enemies) enrage(e);
      }
      c.hud = left > 0 ? `${left.toFixed(1)} s` : 'ENRAGÉS';
    }
  }
  function enrage(e) {
    if (e.dead || e.enraged) return;
    e.enraged = true;
    e.speed *= 1.3;
    e.damage = Math.round(e.damage * 1.3);
    e.color = '#ff3b3b';
  }
  function reward(room) {
    const pl = G.player;
    UI.banner('Séquence validée', '#c9a3ff');
    AudioEngine.chestOpen({});
    Run.addXp(Math.round(40 * pl.stats.xpGain));
    for (let i = 0; i < 25; i++) Pickups.spawn(W / 2, H / 2, 'coin', 1);
    Pickups.spawn(W / 2, H / 2, 'relic', 1);
  }
  function fallPlayer(room, c) {
    const pl = G.player;
    Combat.hitPlayer(12, { type: 'trap', x: pl.x, y: pl.y, trapName: 'Chute' });
    /* remonter sur la dalle sûre la plus proche */
    let best = null,
      bd = 1e9;
    for (let ty = 0; ty < ROOM_ROWS; ty++)
      for (let tx = 0; tx < ROOM_COLS; tx++) {
        const k = `${tx},${ty}`;
        if (c.holes.has(k) || c.warn.has(k) || !tileFree(tx, ty, room)) continue;
        const d = dist(pl.x, pl.y, tileX(tx), tileY(ty));
        if (d < bd) {
          bd = d;
          best = { x: tileX(tx), y: tileY(ty) };
        }
      }
    if (best) {
      pl.x = best.x;
      pl.y = best.y;
    }
    pl.invulnUntil = Math.max(pl.invulnUntil, Time.now + 1);
    Particles.spawn(pl.x, pl.y, { count: 10, color: '#9aa4c4', size: 3 });
  }
  /* génère un paquet de 2-5 dalles (6 max au biome 2+) qui tomberont, sans couper la salle */
  function scheduleCluster(room, c) {
    const pl = G.player;
    const ptx = Math.floor((pl.x - ROOM_X) / TILE),
      pty = Math.floor((pl.y - ROOM_Y) / TILE);
    const maxSize = 6 + Math.max(0, (G.run.biome.order || 1) - 1);
    const protectedTile = (tx, ty) =>
      (Math.abs(tx - ptx) <= 1 && Math.abs(ty - pty) <= 1) ||
      (tx >= ROOM_COLS - 2 && Math.abs(ty - 6) <= 1) ||
      (tx <= 1 && Math.abs(ty - 6) <= 1);
    const isSafe = (tx, ty, extra) =>
      tx >= 0 &&
      ty >= 0 &&
      tx < ROOM_COLS &&
      ty < ROOM_ROWS &&
      !c.holes.has(`${tx},${ty}`) &&
      !c.warn.has(`${tx},${ty}`) &&
      !extra.has(`${tx},${ty}`);
    for (let attempt = 0; attempt < 12; attempt++) {
      const size = RNG.int(3, maxSize);
      const cluster = new Set();
      let cx = RNG.int(0, ROOM_COLS - 1),
        cy = RNG.int(0, ROOM_ROWS - 1);
      if (!isSafe(cx, cy, cluster) || protectedTile(cx, cy)) continue;
      cluster.add(`${cx},${cy}`);
      let guard = 0;
      while (cluster.size < size && guard++ < 30) {
        const dir = RNG.pick([
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]);
        const nx = cx + dir[0],
          ny = cy + dir[1];
        if (isSafe(nx, ny, cluster) && !protectedTile(nx, ny)) {
          cluster.add(`${nx},${ny}`);
          cx = nx;
          cy = ny;
        }
      }
      /* connexité : toutes les dalles sûres restantes (hors obstacles) doivent rester reliées */
      if (!connected(room, c, cluster)) continue;
      for (const k of cluster) c.warn.set(k, room.time + 1.3);
      return;
    }
  }
  /* passerelle : plus court chemin du joueur à la porte, les trous traversés redeviennent des planches */
  function buildPlanks(room, c) {
    const pl = G.player;
    const sx = clamp(Math.floor((pl.x - ROOM_X) / TILE), 0, ROOM_COLS - 1),
      sy = clamp(Math.floor((pl.y - ROOM_Y) / TILE), 0, ROOM_ROWS - 1);
    const gx = ROOM_COLS - 1,
      gy = 6;
    const ok = (tx, ty) => tx >= 0 && ty >= 0 && tx < ROOM_COLS && ty < ROOM_ROWS && tileFree(tx, ty, room);
    const prev = new Map();
    const q = [[sx, sy]];
    prev.set(`${sx},${sy}`, null);
    let found = false;
    while (q.length) {
      const [x, y] = q.shift();
      if (x === gx && y === gy) {
        found = true;
        break;
      }
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [0, -1],
        [-1, 0],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          k = `${nx},${ny}`;
        if (ok(nx, ny) && !prev.has(k)) {
          prev.set(k, `${x},${y}`);
          q.push([nx, ny]);
        }
      }
    }
    c.planks = new Set();
    c.path = [];
    if (!found) return;
    let k = `${gx},${gy}`;
    while (k) {
      if (c.holes.has(k)) {
        c.holes.delete(k);
        c.planks.add(k);
      }
      const [tx, ty] = k.split(',').map(Number);
      c.path.unshift({ x: tileX(tx), y: tileY(ty) });
      k = prev.get(k);
    }
  }
  function connected(room, c, cluster) {
    const ok = (tx, ty) =>
      tx >= 0 &&
      ty >= 0 &&
      tx < ROOM_COLS &&
      ty < ROOM_ROWS &&
      !c.holes.has(`${tx},${ty}`) &&
      !c.warn.has(`${tx},${ty}`) &&
      !cluster.has(`${tx},${ty}`) &&
      tileFree(tx, ty, room);
    let start = null;
    for (let ty = 0; ty < ROOM_ROWS && !start; ty++)
      for (let tx = 0; tx < ROOM_COLS; tx++)
        if (ok(tx, ty)) {
          start = [tx, ty];
          break;
        }
    if (!start) return false;
    const seen = new Set([start.join(',')]);
    const q = [start];
    let count = 0;
    while (q.length) {
      const [x, y] = q.pop();
      count++;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          k = `${nx},${ny}`;
        if (!seen.has(k) && ok(nx, ny)) {
          seen.add(k);
          q.push([nx, ny]);
        }
      }
    }
    let total = 0;
    for (let ty = 0; ty < ROOM_ROWS; ty++) for (let tx = 0; tx < ROOM_COLS; tx++) if (ok(tx, ty)) total++;
    return count === total;
  }
  /* ---------- rendu monde (sous les entités) ---------- */
  function renderFloor(ctx, room) {
    const c = room.challenge;
    if (!c) return;
    if (c.id === 'collapse') {
      ctx.save();
      for (const k of c.holes) {
        const [tx, ty] = k.split(',').map(Number);
        const x = ROOM_X + tx * TILE,
          y = ROOM_Y + ty * TILE;
        ctx.fillStyle = '#04050a';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = 'rgba(110,231,255,.08)';
        ctx.fillRect(x, y, TILE, 3);
        ctx.fillStyle = 'rgba(0,0,0,.6)';
        ctx.fillRect(x, y + TILE - 6, TILE, 6);
      }
      if (c.planks)
        for (const k of c.planks) {
          const [tx, ty] = k.split(',').map(Number);
          const x = ROOM_X + tx * TILE,
            y = ROOM_Y + ty * TILE;
          ctx.fillStyle = '#04050a';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#8b5a2b';
          ctx.fillRect(x + 4, y + 6, TILE - 8, 12);
          ctx.fillRect(x + 4, y + 22, TILE - 8, 12);
          ctx.fillStyle = '#5a3a22';
          ctx.fillRect(x + 4, y + 17, TILE - 8, 3);
          ctx.fillStyle = '#c98a4b';
          ctx.fillRect(x + 8, y + 9, 4, 3);
          ctx.fillRect(x + TILE - 12, y + 25, 4, 3);
        }
      for (const [k, until] of c.warn) {
        const [tx, ty] = k.split(',').map(Number);
        const kk = 1 - clamp((until - room.time) / 1.3, 0, 1);
        const j = Math.sin(Time.now * 40) * 2 * kk;
        const x = ROOM_X + tx * TILE + j,
          y = ROOM_Y + ty * TILE;
        ctx.fillStyle = `rgba(255,179,71,${0.15 + 0.35 * kk})`;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = `rgba(20,20,30,${0.5 + 0.5 * kk})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 6);
        ctx.lineTo(x + 22, y + 24);
        ctx.lineTo(x + 14, y + 40);
        ctx.moveTo(x + 30, y + 4);
        ctx.lineTo(x + 26, y + 26);
        ctx.lineTo(x + 40, y + 42);
        ctx.stroke();
      }
      ctx.restore();
    } else if (c.id === 'capture' && !c.done) {
      const z = c.zones[c.zi];
      ctx.save();
      const g = ctx.createRadialGradient(z.x, z.y, c.r * 0.3, z.x, z.y, c.r);
      g.addColorStop(0, 'rgba(127,255,154,.05)');
      g.addColorStop(1, 'rgba(127,255,154,.22)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(z.x, z.y, c.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#7fff9a';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#7fff9a';
      ctx.shadowBlur = 14;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -Time.now * 40;
      ctx.beginPath();
      ctx.arc(z.x, z.y, c.r, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(z.x, z.y, c.r + 10, -Math.PI / 2, -Math.PI / 2 + TAU * c.gauge);
      ctx.stroke();
      ctx.restore();
      c.zones.forEach((zz, i) => {
        if (i > c.zi) {
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = '#7fff9a';
          ctx.setLineDash([4, 8]);
          ctx.beginPath();
          ctx.arc(zz.x, zz.y, c.r * 0.6, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      });
    } else if (c.id === 'switches') {
      ctx.save();
      for (const s of c.sw) {
        ctx.fillStyle = s.on ? '#2a6a3a' : '#3a4260';
        ctx.fillRect(s.x - 20, s.y - 20, 40, 40);
        ctx.strokeStyle = s.on ? '#7fff9a' : '#c9a3ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12;
        ctx.strokeRect(s.x - 20, s.y - 20, 40, 40);
        ctx.shadowBlur = 0;
        ctx.fillStyle = s.on ? '#7fff9a' : '#e8ecf7';
        ctx.font = 'bold 18px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.label, s.x, s.y + 1);
      }
      if (c.showT > 0 && !c.done) {
        ctx.globalAlpha = clamp(c.showT, 0, 1);
        ctx.fillStyle = '#c9a3ff';
        ctx.font = 'bold 26px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#c9a3ff';
        ctx.shadowBlur = 16;
        ctx.fillText('ORDRE : ' + c.order.map(i => c.sw[i].label).join('  →  '), W / 2, ROOM_Y + 40);
      }
      ctx.restore();
    }
  }
  /* ---------- rendu monde (au-dessus des entités) : lumières coupées ---------- */
  let darkC = null;
  /* Masque d'obscurité : un calque noir dans lequel on « perce » chaque source de lumière (destination-out), puis une passe
     colorée en fondu additif pour la teinte des projecteurs. Un seul calque hors écran, redimensionné avec la vue. */
  function lightMask(ctx, c, pl) {
    const V = Engine.view;
    const w = Math.ceil(V.w),
      h = Math.ceil(V.h);
    if (!darkC) darkC = document.createElement('canvas');
    if (darkC.width !== w || darkC.height !== h) {
      darkC.width = w;
      darkC.height = h;
    }
    const g = darkC.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(2,3,8,.985)';
    g.fillRect(0, 0, w, h); // noir presque total : dans l'ombre on ne devine plus les silhouettes
    g.save();
    g.translate(V.ox, V.oy);
    g.globalCompositeOperation = 'destination-out';
    /* respiration sur le temps, plus le fondu d'entrée du motif courant */
    const ph = Beat.phase();
    const pulse = (1 + 0.12 * Math.max(0, 1 - ph * 2.5)) * (c.phase === 'lure' ? 1 : 0.4 + 0.6 * c.fade);
    const disc = (x, y, r) => {
      const rg = g.createRadialGradient(x, y, r * 0.25, x, y, r);
      rg.addColorStop(0, 'rgba(0,0,0,1)');
      rg.addColorStop(0.65, 'rgba(0,0,0,.85)');
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    };
    if (c.phase === 'lure') disc(pl.x, pl.y, c.radius); // pas de lampe personnelle pendant le spectacle : hors des faisceaux, le joueur disparaît lui aussi
    if (c.phase === 'lure') {
      disc(c.lure.x, c.lure.y, c.lure.r * (1 + 0.08 * Math.sin(Time.now * 3)));
    } else
      for (const b of c.beams) {
        if (b.kind === 'round') disc(b.x, b.y, b.r * pulse);
        else if (b.kind === 'rect') {
          const rw = b.axis === 'v' ? b.w * pulse : ROOM_W + 200,
            rh = b.axis === 'v' ? ROOM_H + 200 : b.h * pulse;
          const x0 = b.axis === 'v' ? b.x - rw / 2 : ROOM_X - 100,
            y0 = b.axis === 'v' ? ROOM_Y - 100 : b.y - rh / 2;
          const lg = b.axis === 'v' ? g.createLinearGradient(x0, 0, x0 + rw, 0) : g.createLinearGradient(0, y0, 0, y0 + rh);
          lg.addColorStop(0, 'rgba(0,0,0,0)');
          lg.addColorStop(0.5, 'rgba(0,0,0,.92)');
          lg.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = lg;
          g.fillRect(x0, y0, rw, rh);
        } else if (b.kind === 'strobe') {
          if (c.flash > 0) {
            g.globalAlpha = c.flash;
            g.fillStyle = 'rgba(0,0,0,1)';
            g.fillRect(ROOM_X - 60, ROOM_Y - 60, ROOM_W + 120, ROOM_H + 120);
            g.globalAlpha = 1;
          }
        } else if (b.kind === 'mirror') {
          for (let i = 0; i < b.n; i++) {
            const a = (b.a || 0) + (i * TAU) / b.n;
            disc(ROOM_X + ROOM_W / 2 + Math.cos(a) * b.orbit, ROOM_Y + ROOM_H / 2 + Math.sin(a * 1.3) * b.orbit * 0.5, b.r * pulse);
          }
        }
      }
    g.restore();
    ctx.drawImage(darkC, -V.ox, -V.oy);
    /* teinte des faisceaux, par-dessus, en lumière additive */
    if (c.phase !== 'lure') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.13;
      for (const b of c.beams) {
        ctx.fillStyle = b.color;
        if (b.kind === 'round') {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * pulse, 0, TAU);
          ctx.fill();
        } else if (b.kind === 'rect') {
          if (b.axis === 'v') ctx.fillRect(b.x - (b.w * pulse) / 2, ROOM_Y, b.w * pulse, ROOM_H);
          else ctx.fillRect(ROOM_X, b.y - (b.h * pulse) / 2, ROOM_W, b.h * pulse);
        } else if (b.kind === 'strobe') {
          if (c.flash > 0) {
            ctx.globalAlpha = 0.13 * c.flash;
            ctx.fillRect(ROOM_X, ROOM_Y, ROOM_W, ROOM_H);
            ctx.globalAlpha = 0.13;
          }
        } else
          for (let i = 0; i < b.n; i++) {
            const a = (b.a || 0) + (i * TAU) / b.n;
            ctx.beginPath();
            ctx.arc(
              ROOM_X + ROOM_W / 2 + Math.cos(a) * b.orbit,
              ROOM_Y + ROOM_H / 2 + Math.sin(a * 1.3) * b.orbit * 0.5,
              b.r * pulse,
              0,
              TAU
            );
            ctx.fill();
          }
      }
      ctx.restore();
    }
  }
  /* vrai si le point est dans un faisceau (bonus d'XP, lisibilité du bot) */
  function lit(c, x, y) {
    if (!c || c.id !== 'lights') return true;
    if (c.phase === 'lure') return dist(x, y, c.lure.x, c.lure.y) < c.lure.r;
    for (const b of c.beams) {
      if (b.kind === 'strobe') {
        if (c.flash > 0.2) return true;
        continue;
      }
      if (b.kind === 'round' && dist(x, y, b.x, b.y) < b.r) return true;
      if (b.kind === 'rect' && (b.axis === 'v' ? Math.abs(x - b.x) < b.w / 2 : Math.abs(y - b.y) < b.h / 2)) return true;
      if (b.kind === 'mirror')
        for (let i = 0; i < b.n; i++) {
          const a = (b.a || 0) + (i * TAU) / b.n;
          if (dist(x, y, ROOM_X + ROOM_W / 2 + Math.cos(a) * b.orbit, ROOM_Y + ROOM_H / 2 + Math.sin(a * 1.3) * b.orbit * 0.5) < b.r)
            return true;
        }
    }
    return false;
  }
  function renderOverlay(ctx, room) {
    const c = room.challenge;
    if (!c || c.id !== 'lights' || c.done) return;
    const pl = G.player;
    ctx.save();
    lightMask(ctx, c, pl);
    /* où va la lumière : un cercle en pointillés sur la destination tant qu'elle se déplace. Sans ça on court derrière
       elle au lieu de couper au plus court, et le motif devient illisible dès qu'il accélère. */
    if (c.phase !== 'lure')
      for (const b of c.beams) {
        if (b.kind !== 'round' || b.moveK == null || b.moveK >= 1 || b.tx == null) continue;
        const k = 1 - b.moveK;
        ctx.save();
        ctx.globalAlpha = 0.16 + 0.34 * k;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.burst ? 3 : 2;
        ctx.setLineDash([10, 12]);
        ctx.lineDashOffset = -Time.now * 30;
        ctx.beginPath();
        ctx.arc(b.tx, b.ty, b.r * (0.55 + 0.45 * b.moveK), 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 0.1 + 0.2 * k;
        ctx.setLineDash([]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.tx, b.ty);
        ctx.stroke();
        ctx.restore();
      }
    /* Le joueur dans le noir : seuls ses yeux restent, en blanc, pour ne pas le confondre avec les ennemis (yeux rouges
       ou jaunes). Ses projectiles restent visibles : une balle qui file éclaire, et sans ça on tirerait à l'aveugle. */
    if (!pl.dead && !lit(c, pl.x, pl.y)) {
      const f = pl.facing < 0 ? -1 : 1;
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#cfe8ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(pl.x - 4 * f, pl.y - 6, 2.4, 0, TAU);
      ctx.arc(pl.x + 4 * f, pl.y - 6, 2.4, 0, TAU);
      ctx.fill();
    }
    for (const p of Projectiles.list) {
      if (p.owner !== 'player') continue;
      ctx.fillStyle = p.color || '#fff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(2, p.r * 0.8), 0, TAU);
      ctx.fill();
    }
    /* yeux des ennemis */
    for (const e of G.enemies) {
      if (e.dead) continue;
      ctx.fillStyle = e.tele ? '#ffd166' : '#ff5e7a';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(e.x - 4, e.y - 4, 2.2, 0, TAU);
      ctx.arc(e.x + 4, e.y - 4, 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  /* ---------- HUD ---------- */
  function renderHud(ctx, room) {
    const c = room.challenge;
    if (!c) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const V = Engine.view;
    const w = 340,
      x = -V.ox + V.w / 2 - w / 2,
      y = -V.oy + 52;
    ctx.fillStyle = 'rgba(8,10,18,.75)';
    UI.roundRect(ctx, x, y, w, 30, 8);
    ctx.fill();
    ctx.strokeStyle = c.def.color;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = c.def.color;
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(
      `${c.def.name.toUpperCase()}${c.done ? ' — ' + (room.challengeOk ? 'réussi' : 'terminé') : ' · ' + c.hud}`,
      x + w / 2,
      y + 15
    );
    ctx.restore();
  }
  function dangerAt(x, y, room) {
    const c = room.challenge;
    if (!c) return 0;
    if (c.id === 'collapse') {
      const k = `${Math.floor((x - ROOM_X) / TILE)},${Math.floor((y - ROOM_Y) / TILE)}`;
      if (c.holes.has(k)) return 1;
      if (c.warn.has(k)) return 0.9;
    }
    return 0;
  }
  /* objectif pour le bot */
  /* les ennemis n'arrivent qu'une fois le halo d'accueil rejoint */
  function waveGate(room) {
    const c = room.challenge;
    return !(c && c.id === 'lights' && !c.done && c.phase === 'lure');
  }
  function goal(room) {
    const c = room.challenge;
    if (!c) return null;
    if (c.done && c.id !== 'collapse') return null;
    if (c.id === 'lights') {
      if (c.phase === 'lure') return c.lure;
      const b = c.beams.find(q => q.kind === 'round') || c.beams.find(q => q.kind === 'rect');
      return b
        ? { x: b.kind === 'rect' && b.axis === 'h' ? G.player.x : b.x, y: b.kind === 'rect' && b.axis === 'v' ? G.player.y : b.y }
        : null;
    }
    if (c.id === 'capture') return c.zones[c.zi];
    if (c.id === 'collapse' && c.done && c.path && c.path.length) {
      const pl = G.player;
      let bi = 0,
        bd = 1e9;
      c.path.forEach((p, i) => {
        const d = dist(pl.x, pl.y, p.x, p.y);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      return c.path[Math.min(bi + (bd < 20 ? 1 : 0), c.path.length - 1)];
    }
    if (c.id === 'switches' && Room.alive() === 0) {
      const i = c.order[c.step];
      return c.sw[i];
    }
    return null;
  }
  const xpMul = room => {
    const c = room.challenge;
    if (!c || c.done) return 1;
    if (c.id === 'lights') return 1.25;
    return 1;
  };
  const killBonus = (room, e) => {
    const c = room.challenge;
    if (!c || c.done) return 1;
    if (c.id === 'lights') return lit(c, e.x, e.y) ? 1.5 : 1;
    if (c.id !== 'capture') return 1;
    const z = c.zones[c.zi];
    return dist(e.x, e.y, z.x, z.y) < c.r ? 1.5 : 1;
  };
  return {
    pick,
    create,
    update,
    renderFloor,
    renderOverlay,
    renderHud,
    dangerAt,
    goal,
    waveGate,
    lit,
    xpMul,
    killBonus,
    enrage,
    DEFS: CHALLENGE_DEFS,
  };
})();
