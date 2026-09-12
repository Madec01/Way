'use strict';
/* =========================================================================
   WAY — 34_traps.js
   Pièges : patterns déterministes pilotés par le temps de salle, télégraphe avant activation.

   Chantier 13 A : un piège est l'assemblage de trois choses, chacune une entrée de table et jamais un `case` :
     · un DÉCLENCHEUR (`TRAP_TRIGGERS`) qui dit à quel moment le piège annonce, frappe ou tire — aujourd'hui trois
       horloges (cycle, course, coup), demain la plaque, la proximité, le tir du joueur, le lien ;
     · un CORPS (`TRAP_BODIES`) qui porte la géométrie (où ça frappe, où c'est dangereux pour le bot) et le rendu ;
     · un EFFET (`TRAP_EFFECTS`) qui dit ce qui arrive à la cible : dégâts, gaz, projectiles — demain la poussée,
       le statut, le feu qui reste.
   Les dix `kind` historiques sont traduits en triplets par `TRAP_LEGACY` : les définitions et les poses du contenu
   n'ont pas changé d'un caractère, et une définition peut aussi nommer `trigger`, `body`, `effect` elle-même.
   La classe `Trap` reste l'horloge (cycle, partition, coups) et l'assembleur : update / render / dangerAt.
   ========================================================================= */

const TRAP_KINDS = [
  'laser_sweep',
  'laser_rotate',
  'laser_grid',
  'wall_fireball',
  'spike_tiles',
  'gas_zone',
  'saw_rail',
  'turret_fixed',
  'emitter',
  'laser_beam',
];

/* une couleur hexa (#rgb ou #rrggbb) avec une transparence : les annonces et les nappes prennent la couleur du piège */
function trapRgba(hex, a) {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6) return `rgba(255,255,255,${a})`;
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}
const trapPan = t => (t.cx - W / 2) / (W / 2);

/* ---------- les déclencheurs : { stage: 'idle' | 'warn' | 'on', k, idx } ----------
   Un déclencheur est pur : appelé avec un temps futur par `dangerAt`, il ne change rien au piège.
   `fires` : le piège tire des coups (un instant, pas une fenêtre) ; Trap.update compare `shotIdx` au dernier coup joué. */
const TRAP_TRIGGERS = {
  /* période ou partition : idle → annonce → fenêtre active */
  cycle: { stage: (t, rt) => t.cycle(rt) },
  /* course : une annonce au départ, puis toujours en marche (la scie) */
  run: {
    stage(t, rt) {
      const l = t.lt(rt);
      return l < t.telegraph ? { stage: 'warn', k: l / t.telegraph, idx: 0 } : { stage: 'on', k: 1, idx: 0 };
    },
  },
  /* coup : un instant sur `every` (ou sur la partition), annoncé pendant `telegraph` */
  shot: {
    fires: true,
    warnLevel: 0.3,
    stage(t, rt) {
      const s = t.shotState(rt, t.body.every);
      return { stage: s.warm > 0 ? 'warn' : 'idle', k: s.warm, idx: s.warnIdx, shotIdx: s.shotIdx };
    },
  },
};

/* ---------- les effets : ce qui arrive à la cible ----------
   `apply(t, target, dt)` quand le corps touche la cible pendant la fenêtre active ; `fire(t, pl, idx)` à chaque coup
   d'un déclencheur qui tire ; `tick(t, dt, pl)` à chaque image (les rafales). `weight` : poids pour le bot (1 blesse,
   moins gêne). */
const TRAP_EFFECTS = {
  damage: {
    weight: 1,
    apply(t, target) {
      t.hit(target);
    },
  },
  /* gaz : dégâts continus par demi-seconde (moitié des dégâts) et ralentissement, `slow` lu comme une fraction */
  gas: {
    weight: 0.8,
    apply(t, pl, dt) {
      if (t.p.slow) {
        pl.gasSlowUntil = Time.now + 0.1;
        pl.gasSlowMul = typeof t.p.slow === 'number' ? 1 - t.p.slow : 0.7;
      }
      t.acc = (t.acc || 0) + dt;
      if (t.acc >= 0.5) {
        t.acc = 0;
        Combat.hitPlayer(Math.max(1, Math.round(t.damage * 0.5)), { type: 'trap', x: t.cx, y: t.cy, trapName: t.name });
      }
    },
  },
  /* une salve de projectiles aux angles que donne le corps (`angles`), avec ses réglages de balle (`proj`) */
  shoot: {
    weight: 0.6,
    fire(t, pl, idx) {
      const p = t.p,
        q = t.body.proj;
      const sp = (p.speed || q.speed) * t.speedMul;
      for (const a of t.body.angles(t, pl, idx)) {
        Projectiles.spawn({
          x: t.cx + Math.cos(a) * q.offset,
          y: t.cy + Math.sin(a) * q.offset,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          r: p.size || q.size,
          damage: t.damage,
          owner: 'enemy',
          life: p.lifetime || q.life,
          color: t.color,
          kind: q.kind,
          bounce: p.bounce || 0,
          trap: true,
        });
      }
      AudioEngine[q.snd]({ x: trapPan(t), intensity: 0.5 });
    },
  },
  /* une salve en rafale (`burst` coups espacés de `burstGap` temps). L'espacement se compte en temps réel et non en
     temps musical : dans l'atelier la lecture revient en arrière, une rafale en cours ne doit pas rester coincée. */
  salvo: {
    weight: 0.6,
    fire(t, pl, idx) {
      const p = t.p;
      const nb = Math.max(1, p.burst || 1);
      t.volley = { left: nb, next: Time.now, idx, gap: (p.burstGap != null ? p.burstGap : 0.25) * Beat.beatLen() };
    },
    tick(t, dt, pl) {
      const v = t.volley;
      if (!v || v.left <= 0) return;
      if (Time.now > v.next + 2) {
        t.volley = null;
        return;
      } // rafale oubliée (pause, saut) : on l'abandonne
      while (v.left > 0 && Time.now >= v.next) {
        TRAP_EFFECTS.shoot.fire(t, pl, v.idx);
        v.left--;
        v.next += v.gap;
      }
    },
  },
};

/* ---------- les corps : géométrie, danger pour le bot, rendu ----------
   `hits(t, target, rt)` : le corps touche-t-il la cible maintenant (appelé pendant la fenêtre active) ;
   `danger(t, x, y, rt)` : 0..1 pour le bot, qui regarde un peu en avance (`ahead`) avec une marge ;
   `render(t, ctx, rt)` ; `tick(t, dt, rt, pl, c)` : ce qui se met à jour à chaque image (visée, grincement).
   Les corps qui tirent donnent `every` (cadence par défaut), `proj` (la balle) et `angles(t, pl, idx)`. */
const TRAP_BODIES = {
  /* balayage : un rayon traverse la zone pendant la fenêtre active (aller, puis retour au cycle suivant) */
  sweep: {
    seg(t, rt) {
      const c = t.cycle(rt);
      const len = t.p.axis === 'y' ? t.h : t.w;
      let k = c.stage === 'on' ? c.k : 0;
      if (t.p.pingpong !== false && c.idx % 2 === 1) k = 1 - k;
      const o = k * len;
      const seg =
        t.p.axis === 'y' ? { ax: t.x, ay: t.y + o, bx: t.x + t.w, by: t.y + o } : { ax: t.x + o, ay: t.y, bx: t.x + o, by: t.y + t.h };
      seg.stage = c.stage;
      seg.k = c.k;
      seg.idx = c.idx;
      return seg;
    },
    hits(t, pl, rt) {
      const s = this.seg(t, rt);
      return segCircle(s.ax, s.ay, s.bx, s.by, pl.x, pl.y, pl.r - 2);
    },
    danger(t, x, y, rt) {
      const s = this.seg(t, rt + 0.2);
      if (s.stage === 'idle') return 0;
      return segCircle(s.ax, s.ay, s.bx, s.by, x, y, 44) ? 1 : 0;
    },
    render(t, ctx, rt) {
      ctx.save();
      ctx.strokeStyle = t.color;
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = 1;
      ctx.strokeRect(t.x, t.y, t.w, t.h);
      const s = this.seg(t, rt);
      if (s.stage === 'idle') {
        ctx.globalAlpha = 0.25;
        ctx.setLineDash([4, 10]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.ax, s.ay);
        ctx.lineTo(s.bx, s.by);
        ctx.stroke();
        ctx.restore();
        return;
      }
      const on = s.stage === 'on';
      ctx.globalAlpha = on ? 1 : 0.4 + 0.4 * (2 * Beat.pulse(4) - 1);
      if (!on) ctx.setLineDash([6, 6]);
      Halo.line(ctx, s.ax, s.ay, s.bx, s.by, t.color, on ? 5 : 2, on ? 20 : 6, ctx.globalAlpha);
      ctx.setLineDash([]);
      ctx.fillStyle = t.color;
      [
        [s.ax, s.ay],
        [s.bx, s.by],
      ].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, TAU);
        ctx.fill();
      });
      ctx.restore();
    },
  },

  /* bras : une ou plusieurs barres qui tournent autour du centre */
  arms: {
    angle: (t, rt) => (t.p.a0 || 0) + t.lt(rt) * (t.p.angularSpeed || 1) * t.speedMul,
    seg(t, rt, i = 0) {
      const a = this.angle(t, rt) + (i * TAU) / (t.p.arms || 1);
      const len = t.p.length || 200;
      const inner = t.p.inner || 0;
      return {
        ax: t.cx + Math.cos(a) * inner,
        ay: t.cy + Math.sin(a) * inner,
        bx: t.cx + Math.cos(a) * len,
        by: t.cy + Math.sin(a) * len,
      };
    },
    hits(t, pl, rt) {
      for (let i = 0; i < (t.p.arms || 1); i++) {
        const s = this.seg(t, rt, i);
        if (segCircle(s.ax, s.ay, s.bx, s.by, pl.x, pl.y, pl.r - 2)) return true;
      }
      return false;
    },
    danger(t, x, y, rt) {
      if (t.cycle(rt + 0.3).stage === 'idle') return 0;
      for (let i = 0; i < (t.p.arms || 1); i++) {
        const s = this.seg(t, rt + 0.3, i);
        if (segCircle(s.ax, s.ay, s.bx, s.by, x, y, 40)) return 1;
      }
      return 0;
    },
    render(t, ctx, rt) {
      ctx.save();
      const c = t.cycle(rt);
      const arm = c.stage === 'on';
      ctx.fillStyle = '#556';
      ctx.beginPath();
      ctx.arc(t.cx, t.cy, 12, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = c.stage === 'idle' ? 0.25 : c.stage === 'warn' ? 0.4 + 0.4 * (2 * Beat.pulse(4) - 1) : 1;
      if (!arm) ctx.setLineDash([6, 6]);
      for (let i = 0; i < (t.p.arms || 1); i++) {
        const s = this.seg(t, rt, i);
        Halo.line(ctx, s.ax, s.ay, s.bx, s.by, t.color, arm ? 5 : 2, arm ? 16 : 6, ctx.globalAlpha);
      }
      ctx.restore();
    },
  },

  /* grille : lignes parallèles qui s'allument par cycle (alternance paire / impaire). La géométrie est fixe :
     calculée une fois, plus trois fois par image. */
  grid: {
    lines(t) {
      const p = t.p;
      const key = `${t.x},${t.y},${t.w},${t.h},${p.spacing},${p.axis}`;
      if (t.linesKey === key) return t.lines;
      const sp = (p.spacing || 2) * TILE;
      const out = [];
      if (p.axis === 'y') {
        for (let y = t.y + sp / 2; y < t.y + t.h; y += sp) out.push({ ax: t.x, ay: y, bx: t.x + t.w, by: y });
      } else {
        for (let x = t.x + sp / 2; x < t.x + t.w; x += sp) out.push({ ax: x, ay: t.y, bx: x, by: t.y + t.h });
      }
      t.linesKey = key;
      t.lines = out;
      return out;
    },
    hits(t, pl, rt) {
      const par = t.cycle(rt).idx % 2;
      return this.lines(t).some((s, i) => i % 2 === par && segCircle(s.ax, s.ay, s.bx, s.by, pl.x, pl.y, pl.r - 2));
    },
    danger(t, x, y, rt) {
      const c = t.cycle(rt + 0.3);
      if (c.stage === 'idle') return 0;
      const par = c.idx % 2;
      return this.lines(t).some((s, i) => i % 2 === par && segCircle(s.ax, s.ay, s.bx, s.by, x, y, 30)) ? 1 : 0;
    },
    render(t, ctx, rt) {
      const c = t.cycle(rt),
        par = c.idx % 2;
      ctx.save();
      ctx.strokeStyle = t.color;
      this.lines(t).forEach((s, i) => {
        const mine = i % 2 === par;
        const on = c.stage === 'on' && mine;
        const warn = c.stage === 'warn' && mine;
        const alpha = on ? 1 : warn ? 0.35 + 0.35 * (2 * Beat.pulse(4) - 1) : 0.12;
        ctx.setLineDash(on ? [] : [4, 8]);
        if (on) Halo.line(ctx, s.ax, s.ay, s.bx, s.by, t.color, 4, 14, 1);
        else {
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(s.ax, s.ay);
          ctx.lineTo(s.bx, s.by);
          ctx.stroke();
        }
      });
      ctx.restore();
    },
  },

  /* bouche murale : tire des boules de feu (droit / éventail / spirale / visé) */
  mouth: {
    every: 1.2,
    beatEvery: true, // `beats.every` règle sa cadence en temps
    proj: { speed: 200, size: 9, life: 6, offset: 10, kind: 'fireball', snd: 'trapFire' },
    angles(t, pl, idx) {
      const p = t.p;
      const dir = p.dir != null ? p.dir : angleTo(t.cx, t.cy, W / 2, H / 2);
      const n = p.count || 1;
      const pattern = p.pattern || 'straight';
      const out = [];
      for (let i = 0; i < n; i++) {
        let a = dir;
        if (pattern === 'fan') a = dir + lerp(-(p.spread || 0.8) / 2, (p.spread || 0.8) / 2, n > 1 ? i / (n - 1) : 0.5);
        else if (pattern === 'spiral') a = dir + idx * (p.step || 0.4) + (i * TAU) / n;
        else if (pattern === 'aimed') a = angleTo(t.cx, t.cy, pl.x, pl.y);
        out.push(a);
      }
      return out;
    },
    hits: () => false,
    danger: (t, x, y) => (dist(x, y, t.cx, t.cy) < 70 ? 0.6 : 0),
    render(t, ctx, rt) {
      const warm = t.trigger.stage(t, rt).k;
      ctx.save();
      ctx.fillStyle = '#3a3f55';
      ctx.fillRect(t.x + 6, t.y + 6, t.w - 12, t.h - 12);
      ctx.fillStyle = t.color;
      Halo.draw(ctx, t.cx, t.cy, 8 + warm * 6, t.color, 8 + warm * 18);
      ctx.beginPath();
      ctx.arc(t.cx, t.cy, 8 + warm * 6, 0, TAU);
      ctx.fill();
      ctx.restore();
    },
  },

  /* dalles : une zone de dalles qui sortent leurs pointes en rythme (damier : une case sur deux, toujours une sûre à côté) */
  tiles: {
    active: (t, tx, ty, idx) => (t.p.pattern === 'checker' ? (tx + ty) % 2 === idx % 2 : true),
    hits(t, pl, rt) {
      const idx = t.cycle(rt).idx;
      for (let ty = 0; ty < t.th; ty++)
        for (let tx = 0; tx < t.tw; tx++)
          if (this.active(t, tx, ty, idx) && circleRect(pl.x, pl.y, pl.r - 5, t.x + tx * TILE, t.y + ty * TILE, TILE, TILE)) return true;
      return false;
    },
    danger(t, x, y, rt) {
      const c = t.cycle(rt + 0.3);
      if (c.stage === 'idle') return 0;
      for (let ty = 0; ty < t.th; ty++)
        for (let tx = 0; tx < t.tw; tx++)
          if (this.active(t, tx, ty, c.idx) && circleRect(x, y, 16, t.x + tx * TILE, t.y + ty * TILE, TILE, TILE)) return 1;
      return 0;
    },
    render(t, ctx, rt) {
      const c = t.cycle(rt);
      const idle = trapRgba(t.color, 0.2),
        edge = trapRgba(t.color, 0.35);
      ctx.save();
      for (let ty = 0; ty < t.th; ty++)
        for (let tx = 0; tx < t.tw; tx++) {
          const x = t.x + tx * TILE,
            y = t.y + ty * TILE;
          const act = this.active(t, tx, ty, c.idx);
          if (!act) {
            ctx.fillStyle = 'rgba(255,255,255,.04)';
            ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
            ctx.strokeStyle = idle;
            ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
            continue;
          }
          /* l'annonce est dans la couleur d'alerte, la seule qui dise « ça va frapper » (règle F-3) */
          ctx.fillStyle =
            c.stage === 'on' ? '#4a1f2a' : c.stage === 'warn' ? trapRgba(PAL.alert, 0.15 + 0.25 * c.k) : 'rgba(255,255,255,.04)';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          ctx.strokeStyle = c.stage === 'warn' ? trapRgba(PAL.alert, 0.5) : edge;
          ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
          if (c.stage !== 'idle') {
            const h = c.stage === 'on' ? 1 : c.k * 0.3;
            ctx.fillStyle = c.stage === 'on' ? '#e8ecf7' : '#888';
            for (let i = 0; i < 3; i++)
              for (let j = 0; j < 3; j++) {
                const px = x + 8 + i * 16,
                  py = y + 8 + j * 16;
                ctx.beginPath();
                ctx.moveTo(px - 5, py + 5);
                ctx.lineTo(px, py + 5 - 12 * h);
                ctx.lineTo(px + 5, py + 5);
                ctx.fill();
              }
          }
        }
      ctx.restore();
    },
  },

  /* nappe : un nuage circulaire pendant la fenêtre active. Le dégradé est pré-rendu une fois par rayon et par couleur,
     jamais recalculé par image ; la nappe prend la couleur du piège (spores violettes, poudre beige, encens gris). */
  cloud: {
    radius: t => t.p.radius || 90,
    hits(t, pl) {
      return dist(pl.x, pl.y, t.cx, t.cy) < this.radius(t) + pl.r * 0.5;
    },
    danger(t, x, y, rt) {
      const c = t.cycle(rt + 0.4);
      return c.stage !== 'idle' && dist(x, y, t.cx, t.cy) < this.radius(t) + 20 ? 0.8 : 0;
    },
    disc(R, color) {
      const key = `${R}|${color}`;
      const cache = this.cache || (this.cache = new Map());
      if (cache.has(key)) return cache.get(key);
      const c = document.createElement('canvas');
      c.width = c.height = Math.ceil(R * 2) + 2;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(R + 1, R + 1, R * 0.2, R + 1, R + 1, R);
      grad.addColorStop(0, trapRgba(color, 0.45));
      grad.addColorStop(1, trapRgba(color, 0.05));
      g.fillStyle = grad;
      g.beginPath();
      g.arc(R + 1, R + 1, R, 0, TAU);
      g.fill();
      cache.set(key, c);
      return c;
    },
    render(t, ctx, rt) {
      const c = t.cycle(rt);
      const R = this.radius(t);
      ctx.save();
      ctx.fillStyle = '#2f3a2a';
      ctx.beginPath();
      ctx.arc(t.cx, t.cy, 10, 0, TAU);
      ctx.fill();
      if (c.stage === 'warn') {
        ctx.strokeStyle = PAL.alert;
        ctx.setLineDash([6, 6]);
        ctx.globalAlpha = 0.3 + 0.4 * c.k;
        ctx.beginPath();
        ctx.arc(t.cx, t.cy, R * (0.6 + 0.4 * c.k), 0, TAU);
        ctx.stroke();
      }
      if (c.stage === 'on') {
        const s = Math.min(1, 0.7 + c.k);
        const img = this.disc(R, t.color);
        ctx.drawImage(img, t.cx - (img.width / 2) * s, t.cy - (img.height / 2) * s, img.width * s, img.height * s);
        ctx.fillStyle = trapRgba(t.color, 0.12);
        for (let i = 0; i < 5; i++) {
          const a = Time.now * 0.7 + i * 1.3,
            rr = R * 0.5 + Math.sin(Time.now * 2 + i) * 10;
          ctx.beginPath();
          ctx.arc(t.cx + Math.cos(a) * rr, t.cy + Math.sin(a) * rr, R * 0.35, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    },
  },

  /* rail : un corps rond qui suit des points de passage, aller-retour ou en boucle */
  rail: {
    points: t =>
      (
        t.p.points || [
          { x: 0, y: 0 },
          { x: t.tw - 1, y: 0 },
        ]
      ).map(q => ({ x: ROOM_X + (t.tx + q.x + 0.5) * TILE, y: ROOM_Y + (t.ty + q.y + 0.5) * TILE })),
    /* longueur totale du rail en px : sert à convertir « un aller en N temps » en px/s */
    length(t) {
      const pts = this.points(t);
      const n = t.p.loop ? pts.length : pts.length - 1;
      let total = 0;
      for (let i = 0; i < n; i++) total += dist(pts[i].x, pts[i].y, pts[(i + 1) % pts.length].x, pts[(i + 1) % pts.length].y);
      return total;
    },
    pos(t, rt) {
      const pts = this.points(t);
      const loop = t.p.loop;
      const segs = [];
      let total = 0;
      const n = loop ? pts.length : pts.length - 1;
      for (let i = 0; i < n; i++) {
        const a = pts[i],
          b = pts[(i + 1) % pts.length];
        const l = dist(a.x, a.y, b.x, b.y);
        segs.push({ a, b, l });
        total += l;
      }
      if (!total) return pts[0];
      const sp = (t.p.speed || 160) * t.speedMul;
      let d = t.lt(rt) * sp;
      d = loop ? d % total : d % (2 * total) < total ? d % (2 * total) : 2 * total - (d % (2 * total));
      for (const s of segs) {
        if (d <= s.l) {
          const k = d / s.l;
          return { x: lerp(s.a.x, s.b.x, k), y: lerp(s.a.y, s.b.y, k), pts };
        }
        d -= s.l;
      }
      return Object.assign({}, pts[pts.length - 1], { pts });
    },
    hits(t, pl, rt) {
      const s = this.pos(t, rt);
      return dist(s.x, s.y, pl.x, pl.y) < (t.p.radius || 22) + pl.r - 3;
    },
    danger(t, x, y, rt) {
      const s = this.pos(t, rt + 0.25);
      return dist(x, y, s.x, s.y) < (t.p.radius || 22) + 34 ? 1 : 0;
    },
    tick(t, dt, rt, pl, c) {
      if (c.stage !== 'on') return;
      const st = t.beats ? Math.floor(Beat.t / Beat.beatLen()) : Math.floor(rt * 2); // en musique il grince sur le temps ; sinon, l'ancienne cadence
      if (st !== t.sawT) {
        t.sawT = st;
        const s = this.pos(t, rt);
        AudioEngine.trapSaw({ x: (s.x - W / 2) / (W / 2), intensity: 0.25 });
      }
    },
    render(t, ctx, rt) {
      const s = this.pos(t, rt);
      const R = t.p.radius || 22;
      ctx.save();
      if (s.pts) {
        ctx.strokeStyle = 'rgba(255,255,255,.15)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        s.pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        if (t.p.loop) ctx.closePath();
        ctx.stroke();
      }
      ctx.translate(s.x, s.y);
      ctx.rotate(rt * 14);
      ctx.fillStyle = '#cfd6e6';
      Halo.draw(ctx, 0, 0, R, t.color, 10);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i * TAU) / 16,
          rr = i % 2 ? R : R * 0.75;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a3f55';
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.35, 0, TAU);
      ctx.fill();
      ctx.restore();
    },
  },

  /* tourelle : vise le joueur (ou un angle fixe qui peut tourner) et tire une salve en éventail */
  turret: {
    every: 1.5,
    beatEvery: true,
    proj: { speed: 260, size: 6, life: 5, offset: 14, kind: undefined, snd: 'trapShot' },
    tick(t, dt, rt, pl) {
      const p = t.p;
      t.aimA = p.aim === 'player' ? angleTo(t.cx, t.cy, pl.x, pl.y) : (p.angle || 0) + (p.rotate ? t.lt(rt) * p.rotate : 0);
    },
    angles(t) {
      const n = t.p.count || 3,
        spread = t.p.spread || 0.5;
      const out = [];
      for (let i = 0; i < n; i++) out.push(t.aimA + (n > 1 ? lerp(-spread / 2, spread / 2, i / (n - 1)) : 0));
      return out;
    },
    hits: () => false,
    danger: (t, x, y) => (dist(x, y, t.cx, t.cy) < 60 ? 0.5 : 0),
    render(t, ctx, rt) {
      const warm = t.trigger.stage(t, rt).k;
      ctx.save();
      ctx.translate(t.cx, t.cy);
      ctx.fillStyle = '#3a3f55';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, TAU);
      ctx.fill();
      ctx.rotate(t.aimA || 0);
      ctx.fillStyle = warm ? `rgb(255,${Math.round(200 - warm * 120)},80)` : '#8890aa';
      ctx.fillRect(0, -5, 24, 10);
      ctx.fillStyle = t.color;
      if (warm > 0.05) Halo.draw(ctx, 0, 0, 6 + warm * 3, t.color, warm * 16);
      ctx.beginPath();
      ctx.arc(0, 0, 6 + warm * 3, 0, TAU);
      ctx.fill();
      ctx.restore();
    },
  },

  /* émetteur : lanceur de projectiles en motif — couronne, spirale, éventail, visé. Un coup = une salve ; `arc` donne
     l'ouverture (2π = couronne complète), `spin` fait tourner la salve d'un coup à l'autre (spirale). */
  emitter: {
    every: 2,
    beatEvery: true, // « every: 4 » dans `beats` voulait dire quatre temps : il était lu comme deux secondes (chantier 13 A)
    proj: { speed: 240, size: 7, life: 5, offset: 14, kind: undefined, snd: 'trapShot' },
    tick(t, dt, rt, pl, c) {
      const p = t.p;
      t.warm = c.k;
      t.aimA = p.pattern === 'aimed' ? angleTo(t.cx, t.cy, pl.x, pl.y) : (p.angle || 0) + (c.shotIdx >= 0 ? c.shotIdx * (p.spin || 0) : 0);
    },
    angles(t, pl, idx) {
      const p = t.p;
      const n = Math.max(1, p.count || 6);
      const arc = p.arc != null ? p.arc : TAU;
      const full = Math.abs(arc - TAU) < 1e-6;
      const base = p.pattern === 'aimed' ? angleTo(t.cx, t.cy, pl.x, pl.y) : (p.angle || 0) + idx * (p.spin || 0);
      const out = [];
      for (let i = 0; i < n; i++) {
        const k = full ? i / n : n > 1 ? i / (n - 1) - 0.5 : 0;
        out.push(base + arc * k);
      }
      return out;
    },
    hits: () => false,
    danger: (t, x, y) => (dist(x, y, t.cx, t.cy) < 80 ? 0.6 : 0),
    render(t, ctx, rt) {
      const warm = t.warm || 0;
      const p = t.p;
      ctx.save();
      ctx.translate(t.cx, t.cy);
      ctx.fillStyle = '#333a4e';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = t.color;
      ctx.globalAlpha = 0.35 + 0.65 * warm;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 15, -Math.PI / 2, -Math.PI / 2 + TAU * warm);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.rotate(t.aimA || 0);
      const n = Math.min(8, Math.max(1, p.count || 6));
      const arc = p.arc != null ? p.arc : TAU;
      const full = Math.abs(arc - TAU) < 1e-6;
      ctx.fillStyle = t.color;
      for (let i = 0; i < n; i++) {
        const k = full ? i / n : n > 1 ? i / (n - 1) - 0.5 : 0;
        const a = arc * k;
        Halo.draw(ctx, Math.cos(a) * 13, Math.sin(a) * 13, 2 + warm * 2.5, t.color, 6 + warm * 16);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 13, Math.sin(a) * 13, 2 + warm * 2.5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    },
  },

  /* rayon : un segment fixe depuis un mur, taillé au bord de la salle, allumé et éteint sur la partition */
  beam: {
    seg(t, rt) {
      const c = t.cycle(rt);
      const a = t.p.angle || 0;
      const len = (t.p.length || 26) * TILE;
      const bx = clamp(t.cx + Math.cos(a) * len, ROOM_X, ROOM_X + ROOM_W),
        by = clamp(t.cy + Math.sin(a) * len, ROOM_Y, ROOM_Y + ROOM_H);
      return { ax: t.cx, ay: t.cy, bx, by, stage: c.stage, k: c.k, idx: c.idx };
    },
    hits(t, pl, rt) {
      const s = this.seg(t, rt);
      return segCircle(s.ax, s.ay, s.bx, s.by, pl.x, pl.y, pl.r - 2);
    },
    danger(t, x, y, rt) {
      const s = this.seg(t, rt + 0.25);
      if (s.stage === 'idle') return 0;
      return segCircle(s.ax, s.ay, s.bx, s.by, x, y, 40) ? 1 : 0;
    },
    render(t, ctx, rt) {
      const s = this.seg(t, rt);
      const on = s.stage === 'on';
      const warn = s.stage === 'warn';
      ctx.save();
      ctx.fillStyle = '#333a4e';
      ctx.beginPath();
      ctx.arc(s.ax, s.ay, 11, 0, TAU);
      ctx.fill();
      if (!on) ctx.setLineDash([5, 9]);
      Halo.line(
        ctx,
        s.ax,
        s.ay,
        s.bx,
        s.by,
        t.color,
        on ? (t.p.thickness || 0.4) * TILE * 0.55 : 2,
        on ? 18 : 4,
        on ? 1 : warn ? 0.35 + 0.35 * (2 * Beat.pulse(4) - 1) : 0.14
      );
      if (on) {
        ctx.setLineDash([]);
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.arc(s.bx, s.by, 5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    },
  },
};

/* les dix mécaniques historiques, traduites en triplets — le contenu ne change pas */
const TRAP_LEGACY = {
  laser_sweep: { trigger: 'cycle', body: 'sweep', effect: 'damage', snd: 'trapLaser' },
  laser_rotate: { trigger: 'cycle', body: 'arms', effect: 'damage', snd: 'trapLaser' },
  laser_grid: { trigger: 'cycle', body: 'grid', effect: 'damage', snd: 'trapLaser' },
  wall_fireball: { trigger: 'shot', body: 'mouth', effect: 'shoot', snd: 'trapWarn' },
  spike_tiles: { trigger: 'cycle', body: 'tiles', effect: 'damage', snd: 'trapSpike' },
  gas_zone: { trigger: 'cycle', body: 'cloud', effect: 'gas', snd: 'trapGas' },
  saw_rail: { trigger: 'run', body: 'rail', effect: 'damage', snd: 'trapSaw' },
  turret_fixed: { trigger: 'shot', body: 'turret', effect: 'shoot', snd: 'trapWarn' },
  emitter: { trigger: 'shot', body: 'emitter', effect: 'salvo', snd: 'trapWarn' },
  laser_beam: { trigger: 'cycle', body: 'beam', effect: 'damage', snd: 'trapLaser' },
};

class Trap {
  constructor(def, inst) {
    this.def = def;
    this.kind = def.kind;
    this.id = def.id;
    this.name = def.name;
    const L = TRAP_LEGACY[def.kind] || {};
    this.trigger = TRAP_TRIGGERS[def.trigger || L.trigger] || TRAP_TRIGGERS.cycle;
    this.body = TRAP_BODIES[def.body || L.body] || TRAP_BODIES.tiles;
    this.effect = TRAP_EFFECTS[def.effect || L.effect] || TRAP_EFFECTS.damage;
    this.snd = def.snd || L.snd || 'trapWarn';
    this.p = Object.assign({}, def.params || {}, inst.params || {});
    this.tx = inst.x;
    this.ty = inst.y;
    this.tw = inst.w || 1;
    this.th = inst.h || 1;
    this.x = ROOM_X + inst.x * TILE;
    this.y = ROOM_Y + inst.y * TILE;
    this.w = this.tw * TILE;
    this.h = this.th * TILE;
    this.cx = this.x + this.w / 2;
    this.cy = this.y + this.h / 2;
    this.phase = inst.phase || 0;
    const d = G.difficulty;
    this.damage = Math.round(def.damage * d.damageMul);
    this.period = (def.period || 3) / d.fireRateMul;
    this.telegraph = def.telegraph != null ? def.telegraph : 0.6;
    this.active = def.active != null ? def.active : 1;
    this.speedMul = d.speedMul;
    this.hitCd = 0;
    this.warned = -1;
    this.fireCount = 0;
    this.lastShot = null;
    this.color = this.p.color || def.color || PAL.danger; // `params.color` : une salle peut reteinter un piège
    this.disabled = false;
    this.beats = this.p.beats || null; // salle du tempo : cadence en temps musicaux (voir syncBeat)
    /* --- adaptation des paramètres de contenu (unités de tuiles → px, mots → nombres) --- */
    const p = this.p;
    if (p.orientation) p.axis = p.orientation === 'horizontal' ? 'y' : 'x';
    if (p.lengthTiles && this.body === TRAP_BODIES.arms) p.length = p.lengthTiles * TILE;
    if (p.startAngle != null) p.a0 = p.startAngle;
    if (p.spacingTiles) p.spacing = p.spacingTiles;
    if (p.radiusTiles) p.radius = p.radiusTiles * TILE;
    if (p.projSpeed) p.speed = p.projSpeed;
    if (p.projSize) p.size = p.projSize;
    if (p.speedTiles) p.speed = p.speedTiles * TILE;
    if (p.mode) p.aim = p.mode === 'aim' ? 'player' : 'fixed';
    if (typeof p.dir === 'string') p.dir = { down: Math.PI / 2, up: -Math.PI / 2, left: Math.PI, right: 0 }[p.dir];
    if (this.body.beatEvery && p.every == null) p.every = def.period;
    if (this.body === TRAP_BODIES.mouth && !p.pattern) p.pattern = 'straight';
    if (this.body === TRAP_BODIES.rail && !p.points) {
      const ax = p.axis || (this.th > this.tw ? 'y' : 'x');
      const n = ax === 'y' ? Math.max(this.th, p.lengthTiles || 1) : Math.max(this.tw, p.lengthTiles || 1);
      p.points =
        ax === 'y'
          ? [
              { x: 0, y: 0 },
              { x: 0, y: n - 1 },
            ]
          : [
              { x: 0, y: 0 },
              { x: n - 1, y: 0 },
            ];
    }
  }
  /* temps local du piège (avec décalage de phase) */
  lt(rt) {
    return Math.max(0, rt - this.phase);
  }
  /* cycle : renvoie {stage:'idle'|'warn'|'on', k} */
  cycle(rt) {
    if (this.hitsSec) return this.cycleHits(rt);
    const t = this.lt(rt) % this.period;
    const on0 = this.period - this.active;
    if (t >= on0) return { stage: 'on', k: (t - on0) / this.active, idx: Math.floor(this.lt(rt) / this.period) };
    if (t >= on0 - this.telegraph)
      return { stage: 'warn', k: (t - (on0 - this.telegraph)) / this.telegraph, idx: Math.floor(this.lt(rt) / this.period) };
    return { stage: 'idle', k: t / Math.max(0.01, on0 - this.telegraph), idx: Math.floor(this.lt(rt) / this.period) };
  }
  /* Partition libre (`beats.hits`) : la boucle dure `bars` mesures et chaque coup a sa place, au lieu d'une période
     unique. Le coup i de la boucle L porte l'indice L*n+i : il croît avec le temps, donc les avertisseurs sonores et
     les alternances (aller-retour du balayage, groupes de dalles) qui s'appuient sur cet indice marchent sans changement. */
  cycleHits(rt) {
    const P = this.hitLoop,
      n = this.hitsSec.length;
    if (!P || !n) return { stage: 'idle', k: 0, idx: 0 };
    const loop = Math.floor(rt / P),
      t = rt - loop * P;
    const E = 1e-9; // un coup posé pile sur le début de la boucle ne doit pas tomber dans l'arrondi
    const c = hitAround(this.hitsSec, t + E, P, loop);
    /* La durée d'activité est la même pour tous les coups : si le dernier coup passé ne couvre pas `t`, aucun
       coup plus ancien ne le couvre non plus. Un seul candidat suffit donc de chaque côté — c'est ce qui permet
       de tenir une partition de plusieurs centaines de coups sans balayer la liste à chaque image. */
    if (t >= c.at - E && t < c.at + this.active - E) return { stage: 'on', k: clamp((t - c.at) / this.active, 0, 1), idx: c.idx };
    if (t >= c.nextAt - this.telegraph - E && t < c.nextAt - E)
      return { stage: 'warn', k: (t - c.nextAt + this.telegraph) / this.telegraph, idx: c.nextIdx };
    return { stage: 'idle', k: 0, idx: c.idx };
  }
  /* Bouches de feu, tourelles et émetteurs tirent sur leur propre horloge (`p.every`) et non sur cycle().
     Le déclenchement compare l'indice du coup au dernier joué (`lastShot`) au lieu de compter vers le haut :
     dans l'atelier la lecture revient en arrière à chaque boucle, et un compteur croissant bloquait
     définitivement le piège après le premier tour.
     `shotIdx` = indice du dernier coup dû (croissant, jamais rejoué), `warnIdx` / `warm` = le coup à venir et sa chaleur d'annonce.
     En partition libre, un coup est un instant, pas un cycle : sur des coups rapprochés (1 · 1,5 · 2) les fenêtres
     d'annonce se chevauchaient et le découpage précédent en avalait deux sur trois. */
  shotState(rt, fallback) {
    const tele = this.telegraph;
    if (this.hitsSec) {
      const P = this.hitLoop,
        n = this.hitsSec.length;
      if (!P || !n) return { shotIdx: -1, warnIdx: -1, warm: 0 };
      const E = 1e-9;
      const loop = Math.floor(rt / P),
        t = rt - loop * P;
      const c = hitAround(this.hitsSec, t + E, P, loop);
      const d = c.nextAt - t;
      return { shotIdx: c.idx, warnIdx: c.nextIdx, warm: d < tele ? 1 - d / tele : 0 };
    }
    const every = (this.p.every || fallback) / G.difficulty.fireRateMul;
    const t = this.lt(rt);
    const c = Math.floor(t / every);
    const inCycle = t - c * every;
    return { shotIdx: inCycle >= tele ? c : c - 1, warnIdx: c, warm: inCycle < tele ? inCycle / tele : 0, inCycle };
  }
  warn(idx, snd = 'trapWarn', intensity = 0.5) {
    if (this.warned !== idx) {
      this.warned = idx;
      AudioEngine[snd]({ x: trapPan(this), intensity });
    }
  }
  hit(pl) {
    if (this.hitCd > 0) return;
    if (Combat.hitPlayer(this.damage, { type: 'trap', x: this.cx, y: this.cy, trapName: this.name })) this.hitCd = 0.5;
  }
  update(dt, rt) {
    this.hitCd -= dt;
    if (this.beats) this.syncBeat();
    if (this.disabled) return;
    const pl = G.player;
    const c = this.trigger.stage(this, rt);
    if (this.body.tick) this.body.tick(this, dt, rt, pl, c);
    if (c.stage === 'warn') this.warn(c.idx, this.snd, this.trigger.warnLevel);
    if (this.trigger.fires) {
      /* un coup dû est joué une fois ; au premier réveil on ne rejoue pas un coup déjà passé */
      if (this.lastShot == null) this.lastShot = c.shotIdx;
      else if (c.shotIdx >= 0 && c.shotIdx !== this.lastShot) {
        this.lastShot = c.shotIdx;
        this.fireCount = c.shotIdx + 1;
        this.effect.fire(this, pl, c.shotIdx);
      }
    } else if (c.stage === 'on' && !pl.dead && this.body.hits(this, pl, rt)) this.effect.apply(this, pl, dt);
    if (this.effect.tick) this.effect.tick(this, dt, pl);
  }
  render(ctx, rt) {
    if (this.beats) this.syncBeat();
    if (this.disabled) return;
    this.body.render(this, ctx, rt);
  }
  dangerAt(x, y, rt) {
    if (this.disabled) return 0;
    if (this.beats) this.syncBeat();
    return this.body.danger(this, x, y, rt);
  }
  railLength() {
    return TRAP_BODIES.rail.length(this);
  }
  /* salle du tempo : p.beats = { period, active, telegraph, on } (ou { every, telegraph, on } pour bouches et tourelles), en temps musicaux ;
     rt est alors le temps musical (Beat.t) et le piège se déclenche sur le temps « on » de chaque cycle, quel que soit le BPM de la piste.
     Le calcul ne dépend que de la longueur du temps et de la difficulté : fait une fois, puis mis en cache (il était
     refait trois fois par piège et par image). */
  syncBeat() {
    const b = this.beats,
      L = Beat.beatLen();
    const key = `${L}|${G.difficulty.fireRateMul}|${this.speedMul}`;
    if (this.syncKey === key && this.syncBeats === b) return;
    this.syncKey = key;
    this.syncBeats = b;
    const tele = b.telegraph != null ? b.telegraph : 1,
      on = b.on || 0;
    /* Trajets continus : la période, elle, était bien convertie, mais ni la vitesse de rotation ni celle du rail.
       Le bras croisait donc le joueur à un instant musicalement arbitraire, et le décalage dérivait à l'infini.
       `turn` = temps pour un tour, `trip` = temps pour un aller. `speedMul` est écarté : un piège plus rapide en
       difficulté 3 sortirait du tempo. */
    if (b.turn) this.p.angularSpeed = TAU / (b.turn * L) / (this.speedMul || 1);
    if (b.trip) {
      const len = this.railLength();
      if (len) this.p.speed = len / (b.trip * L) / (this.speedMul || 1);
    }
    if (b.hits) {
      // partition libre : une boucle de `bars` mesures et la liste des temps frappés (fractions acceptées)
      this.hitLoop = (b.bars || 1) * 4 * L;
      this.hitsSec = b.hits.map(h => (typeof h === 'number' ? h : h.b || 0) * L);
      this.telegraph = tele * L;
      this.active = (b.active || 1) * L;
      this.period = this.hitLoop;
      this.phase = 0;
      return;
    }
    this.hitsSec = null;
    if (this.body.beatEvery) {
      const every = b.every || b.period || 2;
      this.p.every = every * L * G.difficulty.fireRateMul;
      this.telegraph = tele * L;
      this.phase = ((((on - tele) % every) + every) % every) * L;
    } else {
      const period = b.period || 4,
        act = b.active || 1;
      this.period = period * L;
      this.active = act * L;
      this.telegraph = tele * L;
      this.phase = ((((on + act) % period) + period) % period) * L;
    }
  }
}
