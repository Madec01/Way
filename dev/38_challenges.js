/* =========================================================================
   WAY — 38_challenges.js
   Défis de salle, tirés au sort sur les salles 2, 3, 6 et 7 :
   capture (tenir 3 zones), collapse (le sol s'effondre, tenir jusqu'à 40 % de surface),
   switches (3 interrupteurs dans l'ordre, récompense), lights (lumières coupées), timer (chrono, enragés après).
   ========================================================================= */

const CHALLENGE_DEFS = {
  capture:  { name: 'Capture de zone', desc: 'Tenez la zone pour remplir la jauge. Trois zones. Les kills dans la zone rapportent +50 % d\'XP.', rooms: ['COMBAT_TRAP', 'COMBAT_MODULAR', 'COMBAT_TRAP_MODULAR', 'PREP_COMBAT'], color: '#7fff9a' },
  collapse: { name: 'Sol qui s\'effondre', desc: 'Des dalles tombent par paquets, de plus en plus vite. Tenez jusqu\'à ce qu\'il reste 40 % du sol. Les ennemis tombent aussi.', rooms: ['COMBAT_TRAP', 'COMBAT_MODULAR', 'COMBAT_TRAP_MODULAR', 'TRAP'], color: '#ffb347', replacesTraps: true },
  switches: { name: 'Séquence', desc: 'Activez les 3 interrupteurs dans l\'ordre affiché. Récompense à la clé, décharge en cas d\'erreur.', rooms: ['COMBAT_TRAP', 'COMBAT_MODULAR', 'COMBAT_TRAP_MODULAR', 'TRAP'], color: '#c9a3ff' },
  lights:   { name: 'Lumières coupées', desc: 'Seule votre lampe éclaire. Les ennemis se trahissent par leurs yeux. XP +25 %.', rooms: ['COMBAT_TRAP', 'COMBAT_MODULAR', 'COMBAT_TRAP_MODULAR', 'TRAP'], color: '#9fd8ff' },
  timer:    { name: 'Chrono', desc: 'Finissez en moins de 60 s : prime de crédits. Après, tout ce qui reste s\'enrage.', rooms: ['COMBAT_TRAP', 'COMBAT_MODULAR', 'COMBAT_TRAP_MODULAR'], color: '#ff5e7a' },
};
const CHALLENGE_ROOMS = [2, 3, 6, 7];
const CHALLENGE_CHANCE = 0.6;

const Challenge = (() => {
  const tileFree = (tx, ty, room) => !room.obstacles.some(o => tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.h);
  const randFreeTile = (room, rng, margin = 2) => { for (let k = 0; k < 40; k++) { const tx = rng.int(margin, ROOM_COLS - 1 - margin), ty = rng.int(margin, ROOM_ROWS - 1 - margin); if (tileFree(tx, ty, room)) return { x: tx, y: ty }; } return { x: 12, y: 6 }; };

  /* choix du défi pour une salle (null si aucun) */
  function pick(def, rng, used) {
    if (!CHALLENGE_ROOMS.includes(def.index)) return null;
    if (G.debug.forceChallenge) return G.debug.forceChallenge === 'none' ? null : G.debug.forceChallenge;
    if (!rng.chance(CHALLENGE_CHANCE)) return null;
    const ids = Object.keys(CHALLENGE_DEFS).filter(id => CHALLENGE_DEFS[id].rooms.includes(def.type) && !used.includes(id));
    return ids.length ? rng.pick(ids) : null;
  }
  function create(id, room) {
    const d = CHALLENGE_DEFS[id]; const c = { id, def: d, done: false, t: 0, hud: '' };
    const rng = RNG;
    if (id === 'capture') {
      c.zones = []; for (let i = 0; i < 3; i++) { let p; for (let k = 0; k < 20; k++) { p = randFreeTile(room, rng, 3); if (!c.zones.some(z => dist(z.x, z.y, tileX(p.x), tileY(p.y)) < 300)) break; } c.zones.push({ x: tileX(p.x), y: tileY(p.y) }); }
      c.zi = 0; c.gauge = 0; c.r = 3 * TILE; c.reinforceT = 6; c.reinforceEvery = 7;
    } else if (id === 'collapse') {
      c.holes = new Set(); c.warn = new Map(); c.nextT = 3; c.every0 = Math.max(2.0, 3.0 - 0.3 * ((G.run.biome.order || 1) - 1)); c.total = ROOM_COLS * ROOM_ROWS; c.target = Math.round(c.total * 0.4); c.fallen = 0; c.reinforceT = 8; c.reinforceEvery = 9;
    } else if (id === 'switches') {
      c.sw = []; const order = rng.shuffle([0, 1, 2]);
      for (let i = 0; i < 3; i++) { let p; for (let k = 0; k < 20; k++) { p = randFreeTile(room, rng, 2); if (!c.sw.some(s => dist(s.tx, s.ty, p.x, p.y) < 5)) break; } c.sw.push({ tx: p.x, ty: p.y, x: tileX(p.x), y: tileY(p.y), on: false, label: ['I', 'II', 'III'][i] }); }
      c.order = order; c.step = 0; c.showT = 4; c.fails = 0;
    } else if (id === 'lights') { c.radius = 210; }
    else if (id === 'timer') { c.limit = 60; c.enraged = false; }
    return c;
  }
  const spawnReinforcement = (n) => { const pool = G.run.biome.enemyPool.filter(id => { const e = Content.enemy(id); return e && e.archetype !== 'summoner'; }); if (Room.alive() >= 8) return; for (let i = 0; i < n; i++) Room.spawnAt({ enemy: RNG.pick(pool), count: 1, x: -1, y: -1 }); UI.banner('Renforts', '#ff6b6b'); };

  /* ---------- update ---------- */
  function update(room, dt) {
    const c = room.challenge; if (!c || c.done) return; c.t += dt; const pl = G.player;
    if (c.id === 'capture') {
      const z = c.zones[c.zi]; const inside = dist(pl.x, pl.y, z.x, z.y) < c.r;
      c.gauge = clamp(c.gauge + (inside ? dt / 6 : -dt / 12), 0, 1);
      c.reinforceT -= dt; if (c.reinforceT <= 0) { c.reinforceT = c.reinforceEvery; spawnReinforcement(2 + Math.floor(RNG() * 2)); }
      if (c.gauge >= 1) { c.zi++; c.gauge = 0; AudioEngine.roomClear({ intensity: 0.6 }); Particles.spawn(z.x, z.y, { count: 30, color: '#7fff9a', glow: true, speedMax: 300 }); if (c.zi >= c.zones.length) { c.done = true; UI.banner('Zones capturées', '#7fff9a'); room.challengeOk = true; } else UI.banner(`Zone ${c.zi + 1} / 3`, '#7fff9a'); }
      c.hud = `Zone ${Math.min(c.zi + 1, 3)}/3 · ${Math.round(c.gauge * 100)} %`;
    } else if (c.id === 'collapse') {
      /* avertissements → chutes */
      for (const [k, until] of c.warn) { if (room.time >= until) { c.warn.delete(k); c.holes.add(k); c.fallen++; const [tx, ty] = k.split(',').map(Number); Particles.spawn(tileX(tx), tileY(ty), { count: 8, color: '#3a3f55', size: 4, speedMax: 90, life: 0.7 }); G.shake = Math.min(6, G.shake + 1.5); } }
      c.nextT -= dt;
      const safe = c.total - c.holes.size - c.warn.size;
      if (c.nextT <= 0 && safe > c.target) { c.nextT = Math.max(1.3, c.every0 - c.t * 0.014); scheduleCluster(room, c); if (c.t > 25 && RNG.chance(0.5)) scheduleCluster(room, c); AudioEngine.trapSpike({ intensity: 0.7 }); }   // accélère avec le temps, parfois deux paquets
      c.reinforceT -= dt; if (c.reinforceT <= 0 && Room.alive() < 5) { c.reinforceT = c.reinforceEvery; spawnReinforcement(2); }
      /* chutes */
      const tileOf = e => `${Math.floor((e.x - ROOM_X) / TILE)},${Math.floor((e.y - ROOM_Y) / TILE)}`;
      if (!pl.dead && !pl.dashing && c.holes.has(tileOf(pl))) fallPlayer(room, c);
      for (const e of G.enemies) { if (e.dead || e.isBoss || e.state === 'dash' || e.state === 'lunge' || e.state === 'charge') continue; if (c.holes.has(tileOf(e))) { e.xp = Math.round(e.xp * 0.5); e.coins = 0; Floaters.add(e.x, e.y - 10, 'tombé', '#9aa4c4', 12); Combat.killEnemy(e, { silent: true }); } }
      const pct = Math.round(100 * (c.total - c.holes.size) / c.total);
      c.hud = `Sol ${pct} % · objectif 40 %`;
      if (c.total - c.holes.size <= c.target) { c.done = true; room.challengeOk = true; c.warn.clear(); buildPlanks(room, c); UI.banner('Surface atteinte : une passerelle se déploie', '#ffb347'); Room.clear(); }
    } else if (c.id === 'switches') {
      c.showT -= dt;
      for (const s of c.sw) {
        if (s.on || dist(pl.x, pl.y, s.x, s.y) > 26 + pl.r) continue;
        const expected = c.order[c.step];
        if (c.sw.indexOf(s) === expected) { s.on = true; c.step++; AudioEngine.uiConfirm({}); Particles.spawn(s.x, s.y, { count: 10, color: '#7fff9a', glow: true }); if (c.step >= 3) { c.done = true; room.challengeOk = true; reward(room); } }
        else { c.fails++; for (const q of c.sw) q.on = false; c.step = 0; Combat.hitPlayer(8, { type: 'trap', x: s.x, y: s.y, trapName: 'Décharge' }); G.room.beams.push({ ax: s.x, ay: s.y, bx: pl.x, by: pl.y, t: 0, life: 0.25, color: '#c9a3ff', width: 4, jag: true }); UI.banner('Mauvais ordre', '#ff5e7a'); s.cool = 1; }
      }
      c.hud = `Ordre : ${c.order.map(i => c.sw[i].label).join(' → ')} · ${c.step}/3`;
    } else if (c.id === 'lights') { c.hud = 'Lampe : ' + Math.round(c.radius) + ' px'; if (room.state === 'clear') c.done = true; }
    else if (c.id === 'timer') {
      const left = Math.max(0, c.limit - room.time);
      if (room.state === 'clear' && !c.done) { c.done = true; if (left > 0) { room.challengeOk = true; const bonus = 30; G.run.coinsPending += bonus; UI.toast(`Chrono tenu : +${bonus} crédits`); } }
      if (left <= 0 && !c.enraged) { c.enraged = true; UI.banner('ENRAGÉS', '#ff5e7a'); AudioEngine.bossRoar({}); for (const e of G.enemies) enrage(e); }
      c.hud = left > 0 ? `${left.toFixed(1)} s` : 'ENRAGÉS';
    }
  }
  function enrage(e) { if (e.dead || e.enraged) return; e.enraged = true; e.speed *= 1.3; e.damage = Math.round(e.damage * 1.3); e.color = '#ff3b3b'; }
  function reward(room) { const pl = G.player; UI.banner('Séquence validée', '#c9a3ff'); AudioEngine.chestOpen({}); Run.addXp(Math.round(40 * pl.stats.xpGain)); for (let i = 0; i < 25; i++) Pickups.spawn(W / 2, H / 2, 'coin', 1); Pickups.spawn(W / 2, H / 2, 'relic', 1); }
  function fallPlayer(room, c) {
    const pl = G.player; Combat.hitPlayer(12, { type: 'trap', x: pl.x, y: pl.y, trapName: 'Chute' });
    /* remonter sur la dalle sûre la plus proche */
    let best = null, bd = 1e9; for (let ty = 0; ty < ROOM_ROWS; ty++) for (let tx = 0; tx < ROOM_COLS; tx++) { const k = `${tx},${ty}`; if (c.holes.has(k) || c.warn.has(k) || !tileFree(tx, ty, room)) continue; const d = dist(pl.x, pl.y, tileX(tx), tileY(ty)); if (d < bd) { bd = d; best = { x: tileX(tx), y: tileY(ty) }; } }
    if (best) { pl.x = best.x; pl.y = best.y; } pl.invulnUntil = Math.max(pl.invulnUntil, Time.now + 1); Particles.spawn(pl.x, pl.y, { count: 10, color: '#9aa4c4', size: 3 });
  }
  /* génère un paquet de 2-5 dalles (6 max au biome 2+) qui tomberont, sans couper la salle */
  function scheduleCluster(room, c) {
    const pl = G.player; const ptx = Math.floor((pl.x - ROOM_X) / TILE), pty = Math.floor((pl.y - ROOM_Y) / TILE);
    const maxSize = 6 + Math.max(0, (G.run.biome.order || 1) - 1);
    const protectedTile = (tx, ty) => (Math.abs(tx - ptx) <= 1 && Math.abs(ty - pty) <= 1) || (tx >= ROOM_COLS - 2 && Math.abs(ty - 6) <= 1) || (tx <= 1 && Math.abs(ty - 6) <= 1);
    const isSafe = (tx, ty, extra) => tx >= 0 && ty >= 0 && tx < ROOM_COLS && ty < ROOM_ROWS && !c.holes.has(`${tx},${ty}`) && !c.warn.has(`${tx},${ty}`) && !extra.has(`${tx},${ty}`);
    for (let attempt = 0; attempt < 12; attempt++) {
      const size = RNG.int(3, maxSize); const cluster = new Set();
      let cx = RNG.int(0, ROOM_COLS - 1), cy = RNG.int(0, ROOM_ROWS - 1);
      if (!isSafe(cx, cy, cluster) || protectedTile(cx, cy)) continue;
      cluster.add(`${cx},${cy}`);
      let guard = 0;
      while (cluster.size < size && guard++ < 30) { const dir = RNG.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); const nx = cx + dir[0], ny = cy + dir[1]; if (isSafe(nx, ny, cluster) && !protectedTile(nx, ny)) { cluster.add(`${nx},${ny}`); cx = nx; cy = ny; } }
      /* connexité : toutes les dalles sûres restantes (hors obstacles) doivent rester reliées */
      if (!connected(room, c, cluster)) continue;
      for (const k of cluster) c.warn.set(k, room.time + 1.3);
      return;
    }
  }
  /* passerelle : plus court chemin du joueur à la porte, les trous traversés redeviennent des planches */
  function buildPlanks(room, c) {
    const pl = G.player; const sx = clamp(Math.floor((pl.x - ROOM_X) / TILE), 0, ROOM_COLS - 1), sy = clamp(Math.floor((pl.y - ROOM_Y) / TILE), 0, ROOM_ROWS - 1); const gx = ROOM_COLS - 1, gy = 6;
    const ok = (tx, ty) => tx >= 0 && ty >= 0 && tx < ROOM_COLS && ty < ROOM_ROWS && tileFree(tx, ty, room);
    const prev = new Map(); const q = [[sx, sy]]; prev.set(`${sx},${sy}`, null); let found = false;
    while (q.length) { const [x, y] = q.shift(); if (x === gx && y === gy) { found = true; break; } for (const [dx, dy] of [[1, 0], [0, 1], [0, -1], [-1, 0]]) { const nx = x + dx, ny = y + dy, k = `${nx},${ny}`; if (ok(nx, ny) && !prev.has(k)) { prev.set(k, `${x},${y}`); q.push([nx, ny]); } } }
    c.planks = new Set(); c.path = []; if (!found) return;
    let k = `${gx},${gy}`; while (k) { if (c.holes.has(k)) { c.holes.delete(k); c.planks.add(k); } const [tx, ty] = k.split(',').map(Number); c.path.unshift({ x: tileX(tx), y: tileY(ty) }); k = prev.get(k); }
  }
  function connected(room, c, cluster) {
    const ok = (tx, ty) => tx >= 0 && ty >= 0 && tx < ROOM_COLS && ty < ROOM_ROWS && !c.holes.has(`${tx},${ty}`) && !c.warn.has(`${tx},${ty}`) && !cluster.has(`${tx},${ty}`) && tileFree(tx, ty, room);
    let start = null; for (let ty = 0; ty < ROOM_ROWS && !start; ty++) for (let tx = 0; tx < ROOM_COLS; tx++) if (ok(tx, ty)) { start = [tx, ty]; break; }
    if (!start) return false;
    const seen = new Set([start.join(',')]); const q = [start]; let count = 0;
    while (q.length) { const [x, y] = q.pop(); count++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = `${nx},${ny}`; if (!seen.has(k) && ok(nx, ny)) { seen.add(k); q.push([nx, ny]); } } }
    let total = 0; for (let ty = 0; ty < ROOM_ROWS; ty++) for (let tx = 0; tx < ROOM_COLS; tx++) if (ok(tx, ty)) total++;
    return count === total;
  }
  /* ---------- rendu monde (sous les entités) ---------- */
  function renderFloor(ctx, room) {
    const c = room.challenge; if (!c) return;
    if (c.id === 'collapse') {
      ctx.save();
      for (const k of c.holes) { const [tx, ty] = k.split(',').map(Number); const x = ROOM_X + tx * TILE, y = ROOM_Y + ty * TILE; ctx.fillStyle = '#04050a'; ctx.fillRect(x, y, TILE, TILE); ctx.fillStyle = 'rgba(110,231,255,.08)'; ctx.fillRect(x, y, TILE, 3); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x, y + TILE - 6, TILE, 6); }
      if (c.planks) for (const k of c.planks) { const [tx, ty] = k.split(',').map(Number); const x = ROOM_X + tx * TILE, y = ROOM_Y + ty * TILE; ctx.fillStyle = '#04050a'; ctx.fillRect(x, y, TILE, TILE); ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x + 4, y + 6, TILE - 8, 12); ctx.fillRect(x + 4, y + 22, TILE - 8, 12); ctx.fillStyle = '#5a3a22'; ctx.fillRect(x + 4, y + 17, TILE - 8, 3); ctx.fillStyle = '#c98a4b'; ctx.fillRect(x + 8, y + 9, 4, 3); ctx.fillRect(x + TILE - 12, y + 25, 4, 3); }
      for (const [k, until] of c.warn) { const [tx, ty] = k.split(',').map(Number); const kk = 1 - clamp((until - room.time) / 1.3, 0, 1); const j = Math.sin(Time.now * 40) * 2 * kk; const x = ROOM_X + tx * TILE + j, y = ROOM_Y + ty * TILE; ctx.fillStyle = `rgba(255,179,71,${0.15 + 0.35 * kk})`; ctx.fillRect(x, y, TILE, TILE); ctx.strokeStyle = `rgba(20,20,30,${0.5 + 0.5 * kk})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 8, y + 6); ctx.lineTo(x + 22, y + 24); ctx.lineTo(x + 14, y + 40); ctx.moveTo(x + 30, y + 4); ctx.lineTo(x + 26, y + 26); ctx.lineTo(x + 40, y + 42); ctx.stroke(); }
      ctx.restore();
    } else if (c.id === 'capture' && !c.done) {
      const z = c.zones[c.zi]; ctx.save(); const g = ctx.createRadialGradient(z.x, z.y, c.r * 0.3, z.x, z.y, c.r); g.addColorStop(0, 'rgba(127,255,154,.05)'); g.addColorStop(1, 'rgba(127,255,154,.22)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.x, z.y, c.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7fff9a'; ctx.lineWidth = 3; ctx.shadowColor = '#7fff9a'; ctx.shadowBlur = 14; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -Time.now * 40; ctx.beginPath(); ctx.arc(z.x, z.y, c.r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(z.x, z.y, c.r + 10, -Math.PI / 2, -Math.PI / 2 + TAU * c.gauge); ctx.stroke(); ctx.restore();
      c.zones.forEach((zz, i) => { if (i > c.zi) { ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = '#7fff9a'; ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.arc(zz.x, zz.y, c.r * 0.6, 0, TAU); ctx.stroke(); ctx.restore(); } });
    } else if (c.id === 'switches') {
      ctx.save();
      for (const s of c.sw) { ctx.fillStyle = s.on ? '#2a6a3a' : '#3a4260'; ctx.fillRect(s.x - 20, s.y - 20, 40, 40); ctx.strokeStyle = s.on ? '#7fff9a' : '#c9a3ff'; ctx.lineWidth = 2; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12; ctx.strokeRect(s.x - 20, s.y - 20, 40, 40); ctx.shadowBlur = 0; ctx.fillStyle = s.on ? '#7fff9a' : '#e8ecf7'; ctx.font = 'bold 18px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.label, s.x, s.y + 1); }
      if (c.showT > 0 && !c.done) { ctx.globalAlpha = clamp(c.showT, 0, 1); ctx.fillStyle = '#c9a3ff'; ctx.font = 'bold 26px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.shadowColor = '#c9a3ff'; ctx.shadowBlur = 16; ctx.fillText('ORDRE : ' + c.order.map(i => c.sw[i].label).join('  →  '), W / 2, ROOM_Y + 40); }
      ctx.restore();
    }
  }
  /* ---------- rendu monde (au-dessus des entités) : lumières coupées ---------- */
  function renderOverlay(ctx, room) {
    const c = room.challenge; if (!c || c.id !== 'lights' || c.done) return; const pl = G.player;
    ctx.save(); const V = Engine.view;
    const g = ctx.createRadialGradient(pl.x, pl.y, c.radius * 0.35, pl.x, pl.y, c.radius); g.addColorStop(0, 'rgba(2,3,8,0)'); g.addColorStop(0.7, 'rgba(2,3,8,.75)'); g.addColorStop(1, 'rgba(2,3,8,.94)');
    ctx.fillStyle = g; ctx.fillRect(-V.ox - W, -V.oy - H, 3 * W + V.w, 3 * H + V.h);
    /* yeux des ennemis */
    for (const e of G.enemies) { if (e.dead) continue; ctx.fillStyle = e.tele ? '#ffd166' : '#ff5e7a'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(e.x - 4, e.y - 4, 2.2, 0, TAU); ctx.arc(e.x + 4, e.y - 4, 2.2, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  /* ---------- HUD ---------- */
  function renderHud(ctx, room) {
    const c = room.challenge; if (!c) return;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = 340, x = W / 2 - w / 2, y = 52; ctx.fillStyle = 'rgba(8,10,18,.75)'; UI.roundRect(ctx, x, y, w, 30, 8); ctx.fill(); ctx.strokeStyle = c.def.color; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = c.def.color; ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif'; ctx.fillText(`${c.def.name.toUpperCase()}${c.done ? ' — ' + (room.challengeOk ? 'réussi' : 'terminé') : ' · ' + c.hud}`, W / 2, y + 15);
    ctx.restore();
  }
  function dangerAt(x, y, room) {
    const c = room.challenge; if (!c) return 0;
    if (c.id === 'collapse') { const k = `${Math.floor((x - ROOM_X) / TILE)},${Math.floor((y - ROOM_Y) / TILE)}`; if (c.holes.has(k)) return 1; if (c.warn.has(k)) return 0.9; }
    return 0;
  }
  /* objectif pour le bot */
  function goal(room) {
    const c = room.challenge; if (!c) return null;
    if (c.done && c.id !== 'collapse') return null;
    if (c.id === 'capture') return c.zones[c.zi];
    if (c.id === 'collapse' && c.done && c.path && c.path.length) { const pl = G.player; let bi = 0, bd = 1e9; c.path.forEach((p, i) => { const d = dist(pl.x, pl.y, p.x, p.y); if (d < bd) { bd = d; bi = i; } }); return c.path[Math.min(bi + (bd < 20 ? 1 : 0), c.path.length - 1)]; }
    if (c.id === 'switches' && Room.alive() === 0) { const i = c.order[c.step]; return c.sw[i]; }
    return null;
  }
  const xpMul = room => { const c = room.challenge; if (!c || c.done) return 1; if (c.id === 'lights') return 1.25; return 1; };
  const killBonus = (room, e) => { const c = room.challenge; if (!c || c.done || c.id !== 'capture') return 1; const z = c.zones[c.zi]; return dist(e.x, e.y, z.x, z.y) < c.r ? 1.5 : 1; };
  return { pick, create, update, renderFloor, renderOverlay, renderHud, dangerAt, goal, xpMul, killBonus, enrage, DEFS: CHALLENGE_DEFS };
})();
