/* =========================================================================
   SALLE ZÉRO — 33_anim.js — décor animé en rythme
   Des éléments sans collision ni dégât, pilotés par la même partition que les pièges (`beats.hits`) : dalles qui
   changent de couleur ou qui se soulèvent, accessoires qui tournent ou qui sautent, lumières colorées, ondes.
   Ils ne blessent jamais — c'est la lecture de la salle qu'ils portent, pas la difficulté.
   ========================================================================= */

/* enveloppe rythmique commune : `since` = temps écoulé depuis le dernier coup, `k` = 0 au coup → 1 au bout de `active` */
function beatPulse(b, rt) {
  const L = Beat.beatLen(); const bars = b.bars || 1; const P = bars * 4 * L;
  const hits = (b.hits && b.hits.length) ? b.hits : [0];
  const loop = Math.floor(rt / P), t = rt - loop * P;
  let last = -Infinity, li = 0, ll = loop, next = Infinity;
  for (let o = -1; o <= 1; o++) for (let i = 0; i < hits.length; i++) {
    const h = hits[i] * L + o * P;
    if (h <= t + 1e-9) { if (h > last) { last = h; li = i; ll = loop + o; } }
    else if (h < next) next = h;
  }
  const dur = Math.max(0.02, (b.active || 1) * L);
  return { since: t - last, until: next - t, idx: ll * hits.length + li, k: clamp((t - last) / dur, 0, 1) };
}
const easeOut = k => 1 - Math.pow(1 - k, 3);

const ANIM_DEFS = {
  tile_color: { name: 'Dalles colorées', size: [4, 3], act: 1, color: '#6ee7ff' },
  tile_lift:  { name: 'Dalles qui montent', size: [4, 3], act: 1, color: '#8a94b0' },
  spinner:    { name: 'Rotatif', size: [1, 1], act: 1, color: '#ffd166', sprite: 1 },
  bouncer:    { name: 'Sauteur', size: [1, 1], act: 1, color: '#7fff9a', sprite: 1 },
  light:      { name: 'Lumière', size: [1, 1], act: 2, color: '#c9a3ff' },
  ring:       { name: 'Onde', size: [1, 1], act: 1, color: '#6ee7ff' },
};

class AnimProp {
  constructor(inst) {
    this.kind = inst.kind; this.p = Object.assign({}, inst.params);
    this.tx = inst.x; this.ty = inst.y; this.tw = inst.w || 1; this.th = inst.h || 1;
    this.x = ROOM_X + this.tx * TILE; this.y = ROOM_Y + this.ty * TILE; this.w = this.tw * TILE; this.h = this.th * TILE;
    this.cx = this.x + this.w / 2; this.cy = this.y + this.h / 2;
    this.beats = inst.beats || this.p.beats || { bars: 1, hits: [0], active: 1 };
    this.color = this.p.color || (ANIM_DEFS[this.kind] || {}).color || '#6ee7ff';
  }
  /* couleur du coup courant : deux teintes alternées si `color2` est donnée */
  hue(idx) { return (this.p.color2 && idx % 2 === 1) ? this.p.color2 : this.color; }
  pulse(rt) { return beatPulse(this.beats, rt); }
  render(ctx, rt) { const f = this['r_' + this.kind]; if (f) f.call(this, ctx, this.pulse(rt)); }
  renderOver(ctx, rt) { const f = this['o_' + this.kind]; if (f) f.call(this, ctx, this.pulse(rt)); }

  /* --- dalles qui changent de couleur : la teinte frappe puis s'efface --- */
  r_tile_color(ctx, u) {
    const a = 1 - u.k; if (a <= 0.01) return;
    const mode = this.p.mode || 'all';
    ctx.save(); ctx.fillStyle = this.hue(u.idx);
    for (let i = 0; i < this.tw; i++) for (let j = 0; j < this.th; j++) {
      if (mode === 'checker' && (i + j) % 2 !== u.idx % 2) continue;
      if (mode === 'sweep') { const k = (i + j) / Math.max(1, this.tw + this.th - 2); if (u.k < k * 0.6 || u.k > k * 0.6 + 0.5) continue; }
      ctx.globalAlpha = 0.5 * a; ctx.fillRect(this.x + i * TILE + 1, this.y + j * TILE + 1, TILE - 2, TILE - 2);
      ctx.globalAlpha = 0.9 * a * a; ctx.fillRect(this.x + i * TILE + 1, this.y + j * TILE + 1, TILE - 2, 3);
    }
    ctx.restore();
  }
  /* --- dalles qui montent (ou s'enfoncent) : un léger relief, sans collision --- */
  r_tile_lift(ctx, u) {
    const amp = (this.p.amp != null ? this.p.amp : 7) * (this.p.down ? -1 : 1);
    const dy = -amp * (1 - easeOut(u.k));
    ctx.save();
    for (let i = 0; i < this.tw; i++) for (let j = 0; j < this.th; j++) {
      if (this.p.mode === 'checker' && (i + j) % 2 !== u.idx % 2) continue;
      const x = this.x + i * TILE + 2, y = this.y + j * TILE + 2, s = TILE - 4;
      ctx.globalAlpha = 0.45; ctx.fillStyle = '#05070c'; ctx.fillRect(x, y + 2, s, s);              // creux laissé par la dalle
      ctx.globalAlpha = 0.85; ctx.fillStyle = this.hue(u.idx); ctx.fillRect(x, y + dy, s, s);
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y + dy, s, 3);
    }
    ctx.restore();
  }
  /* --- rotatif : un quart de tour (ou l'angle donné) à chaque coup --- */
  r_spinner(ctx, u) {
    const step = (this.p.step != null ? this.p.step : Math.PI / 2);
    const a = (u.idx + easeOut(u.k) - 1) * step;
    const s = Math.min(this.w, this.h) * (this.p.scale || 1);
    if (this.p.sprite && Sprites.drawProp(ctx, this.p.sprite, this.cx, this.cy, s, s, { rot: a })) return;
    ctx.save(); ctx.translate(this.cx, this.cy); ctx.rotate(a);
    ctx.strokeStyle = this.hue(u.idx); ctx.lineWidth = 4; ctx.shadowColor = this.hue(u.idx); ctx.shadowBlur = 10;
    const r = s * 0.4; ctx.beginPath(); for (let i = 0; i < 4; i++) { const t = i * TAU / 4; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); } ctx.stroke();
    ctx.restore();
  }
  /* --- sauteur : l'accessoire décolle sur le coup et retombe --- */
  r_bouncer(ctx, u) {
    const amp = this.p.amp != null ? this.p.amp : 18;
    const dy = -amp * Math.sin(Math.PI * Math.min(1, u.k));
    const s = Math.min(this.w, this.h) * (this.p.scale || 1);
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#05070c';
    ctx.beginPath(); ctx.ellipse(this.cx, this.cy + s * 0.42, s * 0.3 * (1 - 0.3 * Math.sin(Math.PI * Math.min(1, u.k))), s * 0.1, 0, 0, TAU); ctx.fill(); ctx.restore();
    if (this.p.sprite && Sprites.drawProp(ctx, this.p.sprite, this.cx, this.cy + dy, s, s, {})) return;
    ctx.save(); ctx.fillStyle = this.hue(u.idx); ctx.shadowColor = this.hue(u.idx); ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(this.cx, this.cy + dy, s * 0.26, 0, TAU); ctx.fill(); ctx.restore();
  }
  /* --- lumière colorée : halo additif qui bat, dessiné par-dessus la salle --- */
  o_light(ctx, u) {
    const r = (this.p.radius || 3) * TILE; const a = (this.p.base != null ? this.p.base : 0.25) + 0.75 * (1 - u.k);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a, 0, 1) * (this.p.gain != null ? this.p.gain : 0.5);
    const g = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, r);
    g.addColorStop(0, this.hue(u.idx)); g.addColorStop(0.45, this.hue(u.idx) + '80'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.cx, this.cy, r, 0, TAU); ctx.fill(); ctx.restore();
  }
  /* --- onde : un anneau qui s'ouvre sur le coup --- */
  r_ring(ctx, u) {
    if (u.k >= 1) return; const r = (this.p.radius || 3) * TILE * easeOut(u.k);
    ctx.save(); ctx.globalAlpha = 1 - u.k; ctx.strokeStyle = this.hue(u.idx); ctx.shadowColor = this.hue(u.idx); ctx.shadowBlur = 14; ctx.lineWidth = 4 * (1 - u.k) + 1;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, r, 0, TAU); ctx.stroke(); ctx.restore();
  }
}

const Anim = {
  compile(room, def) { room.anims = (def.anims || []).map(a => new AnimProp(a)); },
  render(ctx, room) { if (!room.anims) return; for (const a of room.anims) a.render(ctx, Room.trapTime(room, a)); },
  renderOver(ctx, room) { if (!room.anims) return; for (const a of room.anims) a.renderOver(ctx, Room.trapTime(room, a)); },
};
