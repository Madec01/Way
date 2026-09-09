/* =========================================================================
   SALLE ZÉRO — 33_anim.js — décor animé en rythme
   Des éléments sans collision ni dégât, pilotés par la même partition que les pièges (`beats.hits`) : dalles qui
   changent de couleur ou qui se soulèvent, accessoires qui tournent ou qui sautent, lumières colorées, ondes.
   Ils ne blessent jamais — c'est la lecture de la salle qu'ils portent, pas la difficulté.
   ========================================================================= */

/* Coup en cours et coup suivant dans une partition triée, par dichotomie.
   `at` / `idx` : le dernier coup à ou avant `t` (celui de la boucle précédente si `t` tombe avant le premier) ;
   `nextAt` / `nextIdx` : le suivant. Indices croissants dans le temps, donc utilisables comme repère de tir. */
function hitAround(hits, t, P, loop) {
  const n = hits.length;
  let lo = 0,
    hi = n - 1,
    i = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (hits[m] <= t) {
      i = m;
      lo = m + 1;
    } else hi = m - 1;
  }
  const at = i < 0 ? hits[n - 1] - P : hits[i];
  const idx = (i < 0 ? loop - 1 : loop) * n + (i < 0 ? n - 1 : i);
  const j = i + 1;
  const nextAt = j >= n ? hits[0] + P : hits[j];
  const nextIdx = (j >= n ? loop + 1 : loop) * n + (j >= n ? 0 : j);
  return { at, idx, nextAt, nextIdx };
}

/* enveloppe rythmique commune : `since` = temps écoulé depuis le dernier coup, `k` = 0 au coup → 1 au bout de `active` */
function beatPulse(b, rt) {
  const L = Beat.beatLen();
  const bars = b.bars || 1;
  const P = bars * 4 * L;
  const src = b.hits && b.hits.length ? b.hits : [0];
  if (b.__L !== L || !b.__sec) {
    b.__L = L;
    b.__sec = src.map(h => h * L);
  } // conversion en secondes refaite seulement quand le tempo change
  const hits = b.__sec;
  const loop = Math.floor(rt / P),
    t = rt - loop * P;
  const c = hitAround(hits, t + 1e-9, P, loop);
  const dur = Math.max(0.02, (b.active || 1) * L);
  return { since: t - c.at, until: c.nextAt - t, idx: c.idx, k: clamp((t - c.at) / dur, 0, 1) };
}
const easeOut = k => 1 - Math.pow(1 - k, 3);

const ANIM_DEFS = {
  tile_color: { name: 'Dalles colorées', size: [1, 1], act: 1, color: '#6ee7ff', cells: true },
  tile_lift: { name: 'Dalles qui montent', size: [1, 1], act: 1, color: '#8a94b0', cells: true },
  spinner: { name: 'Rotatif', size: [1, 1], act: 1, color: '#ffd166', sprite: 1 },
  bouncer: { name: 'Sauteur', size: [1, 1], act: 1, color: '#7fff9a', sprite: 1 },
  light: { name: 'Lumière', size: [1, 1], act: 2, color: '#c9a3ff' },
  ring: { name: 'Onde', size: [1, 1], act: 1, color: '#6ee7ff' },
  mover: { name: 'Objet mobile', size: [1, 1], act: 1, color: '#ffd166', sprite: 1, path: true },
};

class AnimProp {
  constructor(inst) {
    this.kind = inst.kind;
    this.p = Object.assign({}, inst.params);
    this.tx = inst.x;
    this.ty = inst.y;
    this.tw = inst.w || 1;
    this.th = inst.h || 1;
    this.x = ROOM_X + this.tx * TILE;
    this.y = ROOM_Y + this.ty * TILE;
    this.w = this.tw * TILE;
    this.h = this.th * TILE;
    this.cx = this.x + this.w / 2;
    this.cy = this.y + this.h / 2;
    /* Dalles : soit un rectangle (tw × th), soit une liste de tuiles peintes une à une (`params.cells`).
       La liste garde UNE seule partition pour tout le motif — poser douze dalles ne fait pas douze lignes. */
    this.cells = Array.isArray(this.p.cells) && this.p.cells.length ? this.p.cells.map(c => [c[0], c[1]]) : null;
    if (this.cells) {
      const xs = this.cells.map(c => c[0]),
        ys = this.cells.map(c => c[1]);
      this.tx = Math.min(...xs);
      this.ty = Math.min(...ys);
      this.tw = Math.max(...xs) - this.tx + 1;
      this.th = Math.max(...ys) - this.ty + 1;
      this.x = ROOM_X + this.tx * TILE;
      this.y = ROOM_Y + this.ty * TILE;
      this.w = this.tw * TILE;
      this.h = this.th * TILE;
      this.cx = this.x + this.w / 2;
      this.cy = this.y + this.h / 2;
    }
    this.beats = inst.beats || this.p.beats || { bars: 1, hits: [0], active: 1 };
    this.color = this.p.color || (ANIM_DEFS[this.kind] || {}).color || '#6ee7ff';
  }
  /* couleur du coup courant : deux teintes alternées si `color2` est donnée */
  hue(idx) {
    return this.p.color2 && idx % 2 === 1 ? this.p.color2 : this.color;
  }
  pulse(rt) {
    return beatPulse(this.beats, rt);
  }
  /* parcourt les tuiles du motif : la liste peinte si elle existe, le rectangle sinon */
  eachCell(fn) {
    if (this.cells) {
      for (const c of this.cells) fn(c[0], c[1]);
      return;
    }
    for (let i = 0; i < this.tw; i++) for (let j = 0; j < this.th; j++) fn(this.tx + i, this.ty + j);
  }
  render(ctx, rt) {
    const f = this['r_' + this.kind];
    if (f) f.call(this, ctx, this.pulse(rt));
  }
  renderOver(ctx, rt) {
    const f = this['o_' + this.kind];
    if (f) f.call(this, ctx, this.pulse(rt));
  }

  /* --- dalles qui changent de couleur : la teinte frappe puis s'efface --- */
  r_tile_color(ctx, u) {
    const a = 1 - u.k;
    if (a <= 0.01) return;
    const mode = this.p.mode || 'all';
    const span = Math.max(1, this.tw + this.th - 2);
    ctx.save();
    ctx.fillStyle = this.hue(u.idx);
    this.eachCell((tx, ty) => {
      const i = tx - this.tx,
        j = ty - this.ty;
      if (mode === 'checker' && (tx + ty) % 2 !== ((u.idx % 2) + 2) % 2) return;
      if (mode === 'sweep') {
        const k = (i + j) / span;
        if (u.k < k * 0.6 || u.k > k * 0.6 + 0.5) return;
      }
      const x = ROOM_X + tx * TILE,
        y = ROOM_Y + ty * TILE;
      ctx.globalAlpha = 0.5 * a;
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      ctx.globalAlpha = 0.9 * a * a;
      ctx.fillRect(x + 1, y + 1, TILE - 2, 3);
    });
    ctx.restore();
  }
  /* --- dalles qui montent (ou s'enfoncent) : un léger relief, sans collision --- */
  r_tile_lift(ctx, u) {
    const amp = (this.p.amp != null ? this.p.amp : 7) * (this.p.down ? -1 : 1);
    const dy = -amp * (1 - easeOut(u.k));
    ctx.save();
    this.eachCell((tx, ty) => {
      if (this.p.mode === 'checker' && (tx + ty) % 2 !== ((u.idx % 2) + 2) % 2) return;
      const x = ROOM_X + tx * TILE + 2,
        y = ROOM_Y + ty * TILE + 2,
        s = TILE - 4;
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#05070c';
      ctx.fillRect(x, y + 2, s, s); // creux laissé par la dalle
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = this.hue(u.idx);
      ctx.fillRect(x, y + dy, s, s);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y + dy, s, 3);
    });
    ctx.restore();
  }
  /* --- rotatif : un quart de tour (ou l'angle donné) à chaque coup --- */
  r_spinner(ctx, u) {
    const step = this.p.step != null ? this.p.step : Math.PI / 2;
    const a = (u.idx + easeOut(u.k) - 1) * step;
    const s = Math.min(this.w, this.h) * (this.p.scale || 1);
    if (this.p.sprite && Sprites.drawProp(ctx, this.p.sprite, this.cx, this.cy, s, s, { rot: a })) return;
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(a);
    ctx.strokeStyle = this.hue(u.idx);
    ctx.lineWidth = 4;
    ctx.shadowColor = this.hue(u.idx);
    ctx.shadowBlur = 10;
    const r = s * 0.4;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const t = (i * TAU) / 4;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r);
    }
    ctx.stroke();
    ctx.restore();
  }
  /* --- sauteur : l'accessoire décolle sur le coup et retombe --- */
  r_bouncer(ctx, u) {
    const amp = this.p.amp != null ? this.p.amp : 18;
    const dy = -amp * Math.sin(Math.PI * Math.min(1, u.k));
    const s = Math.min(this.w, this.h) * (this.p.scale || 1);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#05070c';
    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy + s * 0.42, s * 0.3 * (1 - 0.3 * Math.sin(Math.PI * Math.min(1, u.k))), s * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (this.p.sprite && Sprites.drawProp(ctx, this.p.sprite, this.cx, this.cy + dy, s, s, {})) return;
    ctx.save();
    ctx.fillStyle = this.hue(u.idx);
    ctx.shadowColor = this.hue(u.idx);
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy + dy, s * 0.26, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  /* --- lumière colorée : halo additif qui bat, dessiné par-dessus la salle --- */
  o_light(ctx, u) {
    const r = (this.p.radius || 3) * TILE;
    const a = (this.p.base != null ? this.p.base : 0.25) + 0.75 * (1 - u.k);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(a, 0, 1) * (this.p.gain != null ? this.p.gain : 0.5);
    const g = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, r);
    g.addColorStop(0, this.hue(u.idx));
    g.addColorStop(0.45, this.hue(u.idx) + '80');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  /* --- objet mobile : il saute d'un point à l'autre du trajet tracé, un point par coup ---
     Le trajet est une liste de tuiles (`params.path`). Sur chaque coup l'objet part vers le point suivant et met
     `active` temps à y arriver : c'est le déplacement lui-même qui joue en mesure, pas un simple clignotement.
     `pingpong` fait l'aller-retour au lieu de boucler. Aucune collision : c'est du décor, comme le reste du module. */
  moverAt(u) {
    const path = this.p.path;
    if (!path || !path.length) return { x: this.cx, y: this.cy, a: 0 };
    const n = path.length;
    const pos = i => ({ x: ROOM_X + (path[i][0] + 0.5) * TILE, y: ROOM_Y + (path[i][1] + 0.5) * TILE });
    if (n === 1) return Object.assign(pos(0), { a: 0 });
    /* index du point courant : en boucle, il avance d'un cran par coup ; en aller-retour il repart en arrière */
    const step = i => {
      const m = ((i % n) + n) % n;
      if (!this.p.pingpong) return m;
      const p2 = ((i % (2 * n - 2)) + 2 * n - 2) % (2 * n - 2);
      return p2 < n ? p2 : 2 * n - 2 - p2;
    };
    const a = pos(step(u.idx)),
      b = pos(step(u.idx + 1));
    const k = this.p.ease === false ? Math.min(1, u.k) : easeOut(Math.min(1, u.k));
    return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), a: Math.atan2(b.y - a.y, b.x - a.x), k };
  }
  r_mover(ctx, u) {
    const p = this.p;
    const m = this.moverAt(u);
    const s = TILE * (p.scale || 0.8);
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#05070c';
    ctx.beginPath();
    ctx.ellipse(m.x, m.y + s * 0.36, s * 0.28, s * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    const rot = p.spin ? m.a : 0;
    if (p.sprite && Sprites.drawProp(ctx, p.sprite, m.x, m.y, s, s, { rot, flip: !p.spin && Math.cos(m.a) < 0 })) return;
    ctx.save();
    ctx.fillStyle = this.hue(u.idx);
    ctx.shadowColor = this.hue(u.idx);
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(m.x, m.y, s * 0.3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* --- onde : un anneau qui s'ouvre sur le coup --- */
  r_ring(ctx, u) {
    if (u.k >= 1) return;
    const r = (this.p.radius || 3) * TILE * easeOut(u.k);
    ctx.save();
    ctx.globalAlpha = 1 - u.k;
    ctx.strokeStyle = this.hue(u.idx);
    ctx.shadowColor = this.hue(u.idx);
    ctx.shadowBlur = 14;
    ctx.lineWidth = 4 * (1 - u.k) + 1;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

const Anim = {
  compile(room, def) {
    room.anims = (def.anims || []).map(a => new AnimProp(a));
  },
  render(ctx, room) {
    if (!room.anims) return;
    for (const a of room.anims) a.render(ctx, Room.trapTime(room, a));
  },
  renderOver(ctx, room) {
    if (!room.anims) return;
    for (const a of room.anims) a.renderOver(ctx, Room.trapTime(room, a));
  },
};
