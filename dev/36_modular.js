/* =========================================================================
   SUJET NEUF — 36_modular.js
   Salles modulaires (salles 6-7) : éléments de décor animés avec collision, déterministes (temps de salle).
   Kinds : slide_wall (mur coulissant), rotor (barre tournante), floor_cycle (sol qui change de configuration),
           safe_zone (zone sûre mobile : impulsion périodique qui frappe tout ce qui est hors de la zone).
   Chaque élément possède ses propres obstacles (flag dyn) insérés dans room.obstacles et repositionnés à chaque pas.
   ========================================================================= */

const MODULAR_KINDS = ['slide_wall', 'rotor', 'floor_cycle', 'safe_zone'];

const Modular = (() => {
  const mkObs = (tx, ty, w, h, extra = {}) => Object.assign({ x: tx, y: ty, w, h, px: ROOM_X + tx * TILE, py: ROOM_Y + ty * TILE, pw: w * TILE, ph: h * TILE, dyn: true }, extra);
  const place = (o, px, py) => { o.px = px; o.py = py; o.x = (px - ROOM_X) / TILE; o.y = (py - ROOM_Y) / TILE; };

  function init(room) {
    for (const m of room.modular) {
      if (!MODULAR_KINDS.includes(m.kind)) { console.warn('[Modular] kind inconnu', m.kind); m.disabled = true; continue; }
      m.phase = m.phase || 0; m.obs = []; m.warned = -1;
      switch (m.kind) {
        case 'slide_wall': { const o = mkObs(m.x, m.y, m.w || 1, m.h || 1, { owner: m }); m.obs.push(o); m.ax = o.px; m.ay = o.py; m.bx = o.px + (m.dx || 0) * TILE; m.by = o.py + (m.dy || 0) * TILE; break; }
        case 'rotor': { const arms = m.arms || 2; m.caps = []; for (let a = 0; a < arms; a++) m.caps.push({ ax: 0, ay: 0, bx: 0, by: 0, r: TILE * 0.32, arm: a, owner: m, vx: 0, vy: 0 }); room.colliders.push(...m.caps); m.pivot = mkObs(m.cx - 0.5, m.cy - 0.5, 1, 1, { owner: m, pivot: true }); m.obs.push(m.pivot); break; }
        case 'floor_cycle': { m.configs = (m.configs || []).map(cfg => cfg.map(b => mkObs(b.x, b.y, b.w || 1, b.h || 1, { owner: m }))); m.cur = -1; break; }
        case 'safe_zone': { m.path = (m.path || [{ x: 12, y: 6 }]).map(p => ({ x: tileX(p.x), y: tileY(p.y) })); m.r = (m.radius || 3) * TILE; m.zx = m.path[0].x; m.zy = m.path[0].y; m.pulses = 0; break; }
      }
      if (m.kind !== 'floor_cycle' && m.kind !== 'safe_zone') room.obstacles.push(...m.obs);
    }
  }
  /* position sur un cycle ping-pong avec pauses : 0..1 aller, pauses aux extrémités */
  function slideK(t, period) { const k = ((t % period) + period) % period / period; if (k < 0.4) return 0; if (k < 0.5) return (k - 0.4) / 0.1; if (k < 0.9) return 1; return 1 - (k - 0.9) / 0.1; }
  function zonePos(m, t) {
    const pts = m.path; if (pts.length < 2) return pts[0];
    const sp = (m.speed || 2) * TILE; let total = 0; const segs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const l = dist(a.x, a.y, b.x, b.y); segs.push({ a, b, l }); total += l; }
    let d = (t * sp) % total; for (const s of segs) { if (d <= s.l) { const k = s.l ? d / s.l : 0; return { x: lerp(s.a.x, s.b.x, k), y: lerp(s.a.y, s.b.y, k) }; } d -= s.l; }
    return pts[0];
  }
  function zoneStage(m, rt) { const t = Math.max(0, rt - m.phase); const per = m.period || 8, tel = m.telegraph || 2; const k = t % per; const idx = Math.floor(t / per); if (k >= per - 0.15) return { stage: 'pulse', idx, k: 1 }; if (k >= per - tel) return { stage: 'warn', idx, k: (k - (per - tel)) / tel }; return { stage: 'idle', idx, k: k / (per - tel) }; }

  function update(room, dt) {
    const rt = room.time; const pl = G.player;
    for (const m of room.modular) {
      if (m.disabled) continue; const t = Math.max(0, rt - m.phase);
      switch (m.kind) {
        case 'slide_wall': {
          const k = slideK(t, m.period || 8); const o = m.obs[0]; const nx = lerp(m.ax, m.bx, k), ny = lerp(m.ay, m.by, k);
          m.moving = Math.abs(nx - o.px) > 0.01 || Math.abs(ny - o.py) > 0.01; m.vx = (nx - o.px) / dt; m.vy = (ny - o.py) / dt; place(o, nx, ny);
          const kk = ((t % (m.period || 8)) / (m.period || 8)); m.warn = (kk > 0.32 && kk < 0.4) || (kk > 0.82 && kk < 0.9);
          if (m.warn && m.warned !== Math.floor(kk * 2) + Math.floor(t / (m.period || 8)) * 2) { m.warned = Math.floor(kk * 2) + Math.floor(t / (m.period || 8)) * 2; AudioEngine.trapWarn({ intensity: 0.3 }); }
          /* entraîner les entités posées contre le mur dans le sens du mouvement (évite l'écrasement) */
          if (m.moving) for (const e of [pl, ...G.enemies]) { if (!e || e.dead) continue; if (circleRect(e.x, e.y, e.r + 2, o.px, o.py, o.pw, o.ph)) { e.x += (nx - o.px) * 0 + m.vx * dt; e.y += m.vy * dt; } }
          break;
        }
        case 'rotor': {
          const w = (m.angularSpeed || 0.8) * G.difficulty.speedMul; const a0 = (m.a0 || 0) + t * w; const arms = m.arms || 2; const len = (m.length || 3) * TILE; const cx = tileX(m.cx - 0.5), cy = tileY(m.cy - 0.5);
          for (const c of m.caps) { const a = a0 + c.arm * TAU / arms; c.ax = cx + Math.cos(a) * TILE * 0.5; c.ay = cy + Math.sin(a) * TILE * 0.5; c.bx = cx + Math.cos(a) * len; c.by = cy + Math.sin(a) * len; /* vitesse tangentielle au milieu du bras, pour entraîner ce qui touche */ c.vx = -Math.sin(a) * w * len * 0.6; c.vy = Math.cos(a) * w * len * 0.6; }
          m.angle = a0;
          break;
        }
        case 'floor_cycle': {
          const per = m.period || 10, tel = m.telegraph || 1.5; const idx = Math.floor(t / per) % m.configs.length; const k = t % per;
          if (m.cur !== idx) { if (m.cur >= 0) for (const o of m.configs[m.cur]) { const i = room.obstacles.indexOf(o); if (i >= 0) room.obstacles.splice(i, 1); } m.cur = idx; room.obstacles.push(...m.configs[idx]); AudioEngine.trapSpike({ intensity: 0.5 }); }
          m.next = (idx + 1) % m.configs.length; m.warn = k >= per - tel ? (k - (per - tel)) / tel : 0;
          if (m.warn > 0 && m.warned !== idx) { m.warned = idx; AudioEngine.trapWarn({ intensity: 0.4 }); }
          break;
        }
        case 'safe_zone': {
          const p = zonePos(m, t); m.zx = p.x; m.zy = p.y; const st = zoneStage(m, rt); m.stage = st.stage; m.k = st.k;
          if (st.stage === 'warn' && m.warned !== st.idx) { m.warned = st.idx; AudioEngine.trapGas({ intensity: 0.6 }); }
          if (st.stage === 'pulse' && m.pulses !== st.idx) {
            m.pulses = st.idx; G.shake = Math.min(12, G.shake + 6); AudioEngine.skillShockwave({ intensity: 1 }); room.blasts.push({ x: m.zx, y: m.zy, r: 900, t: 0, life: 0.5, color: m.color || '#ff9a3c' });
            const dmg = Math.round((m.damage || 15) * G.difficulty.damageMul);
            if (!pl.dead && dist(pl.x, pl.y, m.zx, m.zy) > m.r - pl.r * 0.5) Combat.hitPlayer(dmg, { type: 'trap', x: m.zx, y: m.zy, trapName: 'Impulsion du Site' });
            for (const e of G.enemies) if (!e.dead && !e.isBoss && dist(e.x, e.y, m.zx, m.zy) > m.r) Combat.hitEnemy(e, Math.round(dmg * (m.enemyMul != null ? m.enemyMul : 0.5)), { dot: true, x: e.x, y: e.y });
          }
          break;
        }
      }
    }
  }
  function render(ctx, room) {
    for (const m of room.modular) {
      if (m.disabled) continue;
      ctx.save();
      if (m.kind === 'slide_wall') {
        const o = m.obs[0]; ctx.fillStyle = '#3a4260'; ctx.fillRect(o.px, o.py, o.pw, o.ph); ctx.fillStyle = '#2a3048'; ctx.fillRect(o.px + 4, o.py + 4, o.pw - 8, o.ph - 8);
        ctx.strokeStyle = m.warn ? '#ffb347' : 'rgba(110,231,255,.45)'; ctx.lineWidth = 2; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = m.warn || m.moving ? 14 : 4; ctx.strokeRect(o.px + 1, o.py + 1, o.pw - 2, o.ph - 2);
        /* rail */
        ctx.setLineDash([4, 8]); ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.shadowBlur = 0; ctx.beginPath(); ctx.moveTo(m.ax + o.pw / 2, m.ay + o.ph / 2); ctx.lineTo(m.bx + o.pw / 2, m.by + o.ph / 2); ctx.stroke();
      } else if (m.kind === 'rotor') {
        const cx = tileX(m.cx - 0.5), cy = tileY(m.cy - 0.5);
        ctx.lineCap = 'round';
        for (const c of m.caps) { ctx.strokeStyle = '#3a4260'; ctx.lineWidth = c.r * 2; ctx.beginPath(); ctx.moveTo(c.ax, c.ay); ctx.lineTo(c.bx, c.by); ctx.stroke(); ctx.strokeStyle = 'rgba(110,231,255,.55)'; ctx.lineWidth = 2; ctx.shadowColor = '#6ee7ff'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(c.ax, c.ay); ctx.lineTo(c.bx, c.by); ctx.stroke(); ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; for (let k = 0.25; k < 1; k += 0.25) { const px = lerp(c.ax, c.bx, k), py = lerp(c.ay, c.by, k); ctx.beginPath(); ctx.arc(px, py, c.r * 0.5, 0, TAU); ctx.stroke(); } }
        ctx.fillStyle = '#556'; ctx.beginPath(); ctx.arc(cx, cy, TILE * 0.45, 0, TAU); ctx.fill(); ctx.fillStyle = '#6ee7ff'; ctx.shadowColor = '#6ee7ff'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, TAU); ctx.fill();
      } else if (m.kind === 'floor_cycle') {
        if (m.cur >= 0) for (const o of m.configs[m.cur]) { ctx.shadowBlur = 0; Sprites.drawBlock(ctx, o); }
        if (m.warn > 0 && m.next != null) { ctx.setLineDash([6, 6]); ctx.strokeStyle = `rgba(255,179,71,${0.3 + 0.6 * m.warn})`; ctx.lineWidth = 2; ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 10 * m.warn; for (const o of m.configs[m.next]) ctx.strokeRect(o.px + 2, o.py + 2, o.pw - 4, o.ph - 4); }
      } else if (m.kind === 'safe_zone') {
        const col = m.color || '#ff9a3c'; const warn = m.stage === 'warn';
        if (warn) { ctx.fillStyle = `rgba(255,154,60,${0.06 + 0.16 * m.k})`; ctx.beginPath(); ctx.rect(ROOM_X, ROOM_Y, ROOM_W, ROOM_H); ctx.arc(m.zx, m.zy, m.r, 0, TAU, true); ctx.fill('evenodd'); }   // teinte partout sauf dans la zone
        if (warn) { const g = ctx.createRadialGradient(m.zx, m.zy, m.r * 0.6, m.zx, m.zy, m.r); g.addColorStop(0, 'rgba(127,255,154,.05)'); g.addColorStop(1, 'rgba(127,255,154,.22)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.zx, m.zy, m.r, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = warn ? '#7fff9a' : 'rgba(127,255,154,.45)'; ctx.lineWidth = warn ? 3 : 2; ctx.shadowColor = '#7fff9a'; ctx.shadowBlur = warn ? 18 : 6; ctx.setLineDash(warn ? [] : [8, 8]); ctx.beginPath(); ctx.arc(m.zx, m.zy, m.r, 0, TAU); ctx.stroke();
        if (warn) { ctx.setLineDash([]); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.zx, m.zy, m.r + 60 * (1 - m.k), 0, TAU); ctx.stroke(); ctx.fillStyle = '#7fff9a'; ctx.font = 'bold 12px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.shadowBlur = 0; ctx.fillText('ZONE SÛRE ' + Math.ceil((m.telegraph || 2) * (1 - m.k)) + ' s', m.zx, m.zy - m.r - 8); }
      }
      ctx.restore();
    }
  }
  function dangerAt(x, y, room) {
    let d = 0; const rt = room.time;
    for (const m of room.modular) {
      if (m.disabled) continue;
      if (m.kind === 'safe_zone') { const st = zoneStage(m, rt + 0.3); if (st.stage !== 'idle' && dist(x, y, m.zx, m.zy) > m.r - 20) d = Math.max(d, 1); }
      else if (m.kind === 'floor_cycle' && m.warn > 0.3 && m.next != null) { for (const o of m.configs[m.next]) if (circleRect(x, y, 20, o.px, o.py, o.pw, o.ph)) d = Math.max(d, 0.8); }
      else if (m.kind === 'slide_wall' && (m.warn || m.moving)) { const o = m.obs[0]; if (circleRect(x, y, 30, Math.min(o.px, m.bx) - 10, Math.min(o.py, m.by) - 10, Math.abs(m.bx - m.ax) + o.pw + 20, Math.abs(m.by - m.ay) + o.ph + 20)) d = Math.max(d, 0.6); }
      else if (m.kind === 'rotor') { for (const c of m.caps) if (segCircle(c.ax, c.ay, c.bx, c.by, x, y, c.r + 30)) d = Math.max(d, 0.5); }
    }
    return d;
  }
  return { init, update, render, dangerAt };
})();
