/* =========================================================================
   SALLE ZÉRO — 30_entities.js
   Joueur, armes, projectiles, pickups, particules, effets à hooks.
   Tout lit/écrit l'état global G (défini dans 40_room.js).
   ========================================================================= */

'use strict';
/* ---------- Particules (cosmétique) ---------- */
const Particles = {
  list: [],
  spawn(x, y, opts = {}) {
    const n = opts.count || 6;
    for (let i = 0; i < n; i++) {
      const a = opts.angle != null ? opts.angle + VFX_RNG.range(-(opts.spread || 0.5), opts.spread || 0.5) : VFX_RNG.range(0, TAU);
      const s = VFX_RNG.range(opts.speedMin || 40, opts.speedMax || 160);
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: VFX_RNG.range(0.2, opts.life || 0.5),
        t: 0,
        r: opts.size || 3,
        color: opts.color || '#fff',
        drag: opts.drag || 4,
        glow: opts.glow,
      });
    }
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      if (p.t >= p.life) {
        this.list.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx -= p.vx * p.drag * dt;
      p.vy -= p.vy * p.drag * dt;
    }
    if (this.list.length > 600) this.list.splice(0, this.list.length - 600);
  },
  render(ctx) {
    for (const p of this.list) {
      const k = 1 - p.t / p.life;
      ctx.globalAlpha = k;
      if (p.glow) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.4 + 0.6 * k), 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  },
};
/* Textes flottants (dégâts, +XP) */
const Floaters = {
  list: [],
  /* Un chiffre naît, retombe et s'efface — et son genre dit tout : un dégât normal est petit et blanc, un critique
     presque deux fois plus grand et doré, un dégât subi est le plus gros texte du jeu, part vers le bas et remonte,
     un soin est vert, un événement (« SONNÉ », « TEMPO ×4 ») garde sa couleur. Silkscreen à contour noir : lisible
     sur n'importe quel sol. Deux chiffres du même genre trop proches fusionnent au lieu de s'empiler. */
  KINDS: {
    dmg: { size: 18, color: '#f4f7ff', vy: -90, vx: 40, g: 180, life: 0.7 },
    crit: { size: 30, color: PAL.gold, vy: -130, vx: 40, g: 180, life: 0.85 },
    taken: { size: 34, color: PAL.danger, vy: 40, vx: 0, g: -160, life: 0.9 },
    heal: { size: 20, color: PAL.life, vy: -70, vx: 20, g: 0, life: 0.7 },
    event: { size: 22, color: '#fff', vy: -30, vx: 0, g: 0, life: 1.1 },
  },
  add(x, y, text, color, size, kind) {
    text = String(text);
    if (!kind) kind = /^[+-]?\d+$/.test(text) ? (color === PAL.danger ? 'taken' : text[0] === '+' ? 'heal' : 'dmg') : 'event';
    const K = this.KINDS[kind] || this.KINDS.event;
    const x0 = x,
      y0 = y; // le point d'origine, avant dispersion : c'est lui qui sert à la fusion
    if (kind === 'dmg' || kind === 'crit') {
      /* fusion : un chiffre du même genre à moins de 14 px et de moins de 120 ms s'additionne et grossit */
      const f = this.list.find(o => o.kind === kind && o.t < 0.12 && Math.abs(o.x0 - x) < 14 && Math.abs(o.y0 - y) < 14);
      if (f) {
        f.text = String(+f.text + +text);
        f.t = 0;
        f.size = Math.min(f.size + 2, 40);
        return f;
      }
      x += VFX_RNG.range(-14, 14);
      y += VFX_RNG.range(-10, 4);
    }
    const f = {
      kind,
      x,
      y,
      x0,
      y0,
      text,
      color: color || K.color, // un dégât de compagnon vient dans SA couleur (Uno mord en orange)
      size: kind === 'event' ? Math.round((size || K.size / 1.15) * 1.15) : K.size,
      t: 0,
      life: K.life,
      vx: VFX_RNG.range(-K.vx, K.vx),
      vy: K.vy,
      g: K.g,
    };
    this.list.push(f);
    if (this.list.length > 40) this.list.shift();
    return f;
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.t += dt;
      f.vy += f.g * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.t > f.life) this.list.splice(i, 1);
    }
  },
  render(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const f of this.list) {
      const k = f.t / f.life;
      ctx.globalAlpha = k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35; // plein jusqu'à 65 % de la durée, puis il s'efface
      const pop = Ease.outBack(Math.min(1, f.t / 0.12)); // il naît d'un sursaut
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(pop, pop);
      ctx.font = `bold ${f.size}px ${FONT_PIXEL}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0b0d14';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
};

/* ---------- Collision avec la salle (murs + obstacles) ---------- */
function resolveRoomCollision(e) {
  const r = e.r;
  e.x = clamp(e.x, ROOM_X + r, ROOM_X + ROOM_W - r);
  e.y = clamp(e.y, ROOM_Y + r, ROOM_Y + ROOM_H - r);
  for (const o of G.room.obstacles) {
    if (o.dashOver && e === G.player && e.dashing) continue; // le dash franchit les murets : c'est ce qui leur donne leur intérêt
    if (!circleRect(e.x, e.y, r, o.px, o.py, o.pw, o.ph)) continue;
    /* pousser hors du bloc selon l'axe de moindre pénétration */
    const cx = o.px + o.pw / 2,
      cy = o.py + o.ph / 2;
    const dx = e.x - cx,
      dy = e.y - cy;
    const px = o.pw / 2 + r - Math.abs(dx),
      py = o.ph / 2 + r - Math.abs(dy);
    if (px < py) e.x += px * Math.sign(dx || 1);
    else e.y += py * Math.sign(dy || 1);
    e.hitWall = true;
  }
  /* colliders segment (bras de rotor) : repousser le long de la normale */
  for (const c of G.room.colliders) {
    const dx = c.bx - c.ax,
      dy = c.by - c.ay,
      l2 = dx * dx + dy * dy;
    let t = l2 ? ((e.x - c.ax) * dx + (e.y - c.ay) * dy) / l2 : 0;
    t = clamp(t, 0, 1);
    const px = c.ax + dx * t,
      py = c.ay + dy * t;
    const d = dist(e.x, e.y, px, py);
    const min = r + c.r;
    if (d < min) {
      const nx = d > 0.001 ? (e.x - px) / d : -dy / Math.sqrt(l2 || 1),
        ny = d > 0.001 ? (e.y - py) / d : dx / Math.sqrt(l2 || 1);
      e.x += nx * (min - d + 0.5);
      e.y += ny * (min - d + 0.5);
      e.hitWall = true;
      if (c.vx != null) {
        e.x += c.vx * FIXED_DT;
        e.y += c.vy * FIXED_DT;
      }
    }
  }
}
/* `mask` : 'move' (par défaut) = ce qui arrête les pas · 'shot' = ce qui arrête les balles · 'sight' = ce qui coupe la vue.
   Un muret bloque les pas mais pas les balles, un moucharabieh coupe la vue mais ne bloque rien : sans ces trois
   masques, tout obstacle faisait les trois à la fois. */
function pointBlocked(x, y, r = 0, mask) {
  if (x < ROOM_X + r || x > ROOM_X + ROOM_W - r || y < ROOM_Y + r || y > ROOM_Y + ROOM_H - r) return true;
  for (const o of G.room.obstacles) {
    if (mask === 'shot' && o.stopsShot === false) continue;
    if (mask === 'sight' && o.blocksSight === false) continue;
    if (circleRect(x, y, r, o.px, o.py, o.pw, o.ph)) return true;
  }
  for (const c of G.room.colliders) if (segCircle(c.ax, c.ay, c.bx, c.by, x, y, r + c.r)) return true;
  return false;
}
function lineOfSight(ax, ay, bx, by) {
  const n = Math.ceil(dist(ax, ay, bx, by) / 16);
  for (let i = 1; i < n; i++) {
    const t = i / n,
      px = lerp(ax, bx, t),
      py = lerp(ay, by, t);
    if (pointBlocked(px, py, 0, 'sight')) return false;
    if (G.room.grid && Terrain.screenAt(px, py)) return false; // moucharabieh, feuillage, vapeur : opaques sans rien bloquer d'autre
  }
  return true;
}

/* ---------- Projectiles ---------- */
const Projectiles = {
  list: [],
  spawn(p) {
    const d = Object.assign(
      {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        r: 5,
        damage: 10,
        owner: 'player',
        pierce: 0,
        bounce: 0,
        life: 2,
        t: 0,
        color: '#fff',
        kind: 'bullet',
        hit: null,
        crit: false,
        homing: 0,
        returning: false,
        passes: 0,
        gravity: 0,
      },
      p
    );
    d.hit = new Set();
    this.list.push(d);
    return d;
  },
  update(dt) {
    const pl = G.player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      let p = this.list[i];
      if (!p) continue; // la liste peut avoir été raccourcie par une onde de choc pendant la boucle
      p.t += dt;
      if (p.homing && p.owner === 'player') {
        const tgt = nearestEnemy(p.x, p.y, 400);
        if (tgt) {
          const a = angleTo(p.x, p.y, tgt.x, tgt.y),
            sp = Math.hypot(p.vx, p.vy),
            cur = Math.atan2(p.vy, p.vx);
          const na = cur + clamp(wrapAngle(a - cur), -p.homing * dt, p.homing * dt);
          p.vx = Math.cos(na) * sp;
          p.vy = Math.sin(na) * sp;
        }
      }
      if (p.returning) {
        // boomerang / projectiles_return : deuxième passage vers le joueur
        const a = angleTo(p.x, p.y, pl.x, pl.y),
          sp = p.speed || Math.hypot(p.vx, p.vy) || 400;
        p.vx = lerp(p.vx, Math.cos(a) * sp, Math.min(1, 8 * dt));
        p.vy = lerp(p.vy, Math.sin(a) * sp, Math.min(1, 8 * dt));
        if (dist(p.x, p.y, pl.x, pl.y) < pl.r + p.r + 4) {
          this.list.splice(i, 1);
          continue;
        }
      } else if (p.range != null && p.t * Math.hypot(p.vx, p.vy) > p.range) {
        if (p.canReturn) {
          p.returning = true;
          p.hit.clear();
          p.passes++;
        } else {
          this.list.splice(i, 1);
          continue;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.spin != null) p.spin += dt * 20;
      /* murs & obstacles */
      let bounced = false;
      if (p.x < ROOM_X + p.r || p.x > ROOM_X + ROOM_W - p.r) {
        if (p.bounce > 0) {
          p.vx = -p.vx;
          p.bounce--;
          bounced = true;
          p.x = clamp(p.x, ROOM_X + p.r, ROOM_X + ROOM_W - p.r);
        } else if (!p.returning) {
          this.list.splice(i, 1);
          continue;
        }
      }
      if (p.y < ROOM_Y + p.r || p.y > ROOM_Y + ROOM_H - p.r) {
        if (p.bounce > 0) {
          p.vy = -p.vy;
          p.bounce--;
          bounced = true;
          p.y = clamp(p.y, ROOM_Y + p.r, ROOM_Y + ROOM_H - p.r);
        } else if (!p.returning) {
          this.list.splice(i, 1);
          continue;
        }
      }
      if (!p.ghost)
        for (const o of G.room.obstacles) {
          if (o.stopsShot === false) continue; // muret : on tire par-dessus
          if (!circleRect(p.x, p.y, p.r, o.px, o.py, o.pw, o.ph)) continue;
          if (p.bounce > 0 || p.returning) {
            const cx = o.px + o.pw / 2,
              cy = o.py + o.ph / 2;
            const dx = (p.x - cx) / o.pw,
              dy = (p.y - cy) / o.ph;
            if (Math.abs(dx) > Math.abs(dy)) {
              p.vx = -p.vx;
              p.x = cx + Math.sign(dx) * (o.pw / 2 + p.r + 1);
            } else {
              p.vy = -p.vy;
              p.y = cy + Math.sign(dy) * (o.ph / 2 + p.r + 1);
            }
            if (!p.returning) p.bounce--;
            bounced = true;
          } else {
            this.list.splice(i, 1);
            p = null;
            break;
          }
        }
      if (!p) continue;
      if (!p.ghost)
        for (const c of G.room.colliders) {
          if (!segCircle(c.ax, c.ay, c.bx, c.by, p.x, p.y, p.r + c.r)) continue;
          if (p.bounce > 0 || p.returning) {
            const dx = c.bx - c.ax,
              dy = c.by - c.ay;
            const l = Math.hypot(dx, dy) || 1;
            const nx = -dy / l,
              ny = dx / l;
            const dot = p.vx * nx + p.vy * ny;
            p.vx -= 2 * dot * nx;
            p.vy -= 2 * dot * ny;
            p.x += p.vx * dt * 2;
            p.y += p.vy * dt * 2;
            if (!p.returning) p.bounce--;
            bounced = true;
          } else {
            this.list.splice(i, 1);
            p = null;
            break;
          }
        }
      if (!p) continue;
      if (bounced) {
        p.hit.clear();
        Particles.spawn(p.x, p.y, { count: 3, color: p.color, size: 2 });
        if (p.seekOnBounce) {
          const tgt = nearestEnemy(p.x, p.y, p.seekRadius || 220);
          if (tgt) {
            const sp = Math.hypot(p.vx, p.vy),
              a = angleTo(p.x, p.y, tgt.x, tgt.y);
            p.vx = Math.cos(a) * sp;
            p.vy = Math.sin(a) * sp;
          }
        }
      }
      if (p.t > p.life && !p.returning) {
        this.list.splice(i, 1);
        continue;
      }
      /* collisions */
      if (p.owner === 'player') {
        for (const e of G.enemies) {
          if (e.dead || p.hit.has(e)) continue;
          if (dist(p.x, p.y, e.x, e.y) < p.r + e.r) {
            p.hit.add(e);
            Combat.hitEnemy(e, p.damage, {
              x: p.x,
              y: p.y,
              crit: p.crit,
              noCrit: p.noCrit,
              proj: p,
              knockback: p.knockback || 1,
              vx: p.vx,
              vy: p.vy,
            });
            if (!p.shard && p.kind !== 'flame') {
              const sp = pl.hooks.onHit.find(h => h.effect === 'split_on_hit');
              if (sp && RNG.chance(sp.chance != null ? sp.chance : 1)) {
                const base = Math.atan2(p.vy, p.vx),
                  spd = Math.hypot(p.vx, p.vy) * 0.9;
                const cnt = sp.count || 2;
                for (let k = 0; k < cnt; k++) {
                  const a = base + (k % 2 ? 1 : -1) * (0.6 + Math.floor(k / 2) * 0.4);
                  Projectiles.spawn({
                    x: p.x,
                    y: p.y,
                    vx: Math.cos(a) * spd,
                    vy: Math.sin(a) * spd,
                    r: Math.max(3, p.r * 0.7),
                    damage: Math.max(1, p.damage * (sp.damageMul || 0.4)),
                    owner: 'player',
                    pierce: 0,
                    life: 0.8,
                    range: 260,
                    color: p.color,
                    kind: 'bullet',
                    shard: true,
                    noCrit: true,
                  });
                }
              }
            }
            if (p.pierce > 0) p.pierce--;
            else if (!p.returning && !p.ghostHits) {
              this.list.splice(i, 1);
              break;
            }
          }
        }
      } else {
        if (!pl.dead && dist(p.x, p.y, pl.x, pl.y) < p.r + pl.r) {
          /* orbes de protection */
          Combat.hitPlayer(p.damage, { type: 'projectile', x: p.x, y: p.y });
          this.list.splice(i, 1);
          continue;
        }
        if (pl.orbitShield) {
          let blocked = false;
          for (const o of pl.orbitShield.orbs)
            if (dist(p.x, p.y, o.x, o.y) < p.r + 12) {
              blocked = true;
              break;
            }
          if (blocked) {
            Particles.spawn(p.x, p.y, { count: 4, color: '#8ff', size: 2 });
            this.list.splice(i, 1);
            continue;
          }
        }
      }
    }
  },
  render(ctx) {
    for (const p of this.list) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.kind === 'arrow' || (p.kind === 'bullet' && p.owner === 'player')) {
        ctx.rotate(Math.atan2(p.vy, p.vx));
      }
      if (p.spin != null) ctx.rotate(p.spin);
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      if (p.kind === 'arrow') {
        ctx.fillRect(-10, -2, 20, 4);
        ctx.beginPath();
        ctx.moveTo(10, -5);
        ctx.lineTo(16, 0);
        ctx.lineTo(10, 5);
        ctx.fill();
      } else if (p.kind === 'boomerang') {
        ctx.lineWidth = 5;
        ctx.strokeStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(-10, -8);
        ctx.lineTo(0, 2);
        ctx.lineTo(10, -8);
        ctx.stroke();
      } else if (p.kind === 'flame') {
        ctx.globalAlpha = 0.7 * (1 - p.t / p.life) + 0.2;
        ctx.beginPath();
        ctx.arc(0, 0, p.r * (0.6 + p.t / p.life), 0, TAU);
        ctx.fill();
      } else if (p.kind === 'fireball') {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff8';
        ctx.beginPath();
        ctx.arc(0, 0, p.r * 0.45, 0, TAU);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, TAU);
        ctx.fill();
        if (p.owner === 'enemy') {
          ctx.fillStyle = '#fff9';
          ctx.beginPath();
          ctx.arc(0, 0, p.r * 0.4, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  },
};
/* durée d'un clip : nombre d'images de la planche divisé par sa cadence */
const PICK_CLIP_KINDS = new Set(['purse', 'heart', 'relic', 'weapon', 'ally', 'pet']);
function clipLen(sheetName, clip) {
  const inf = Sprites.sheetInfo && Sprites.sheetInfo(sheetName);
  const cf = (Sprites.CLIPS && Sprites.CLIPS[clip]) || { fps: 10 };
  return inf ? inf.n / cf.fps : 0.4;
}

function nearestEnemy(x, y, maxD = Infinity, filter) {
  let best = null,
    bd = maxD;
  for (const e of G.enemies) {
    if (e.dead || (filter && !filter(e))) continue;
    const d = dist(x, y, e.x, e.y);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}

/* ---------- Pickups ---------- */
/* Reliques : effet pour la salle en cours seulement */
const RELICS = [
  {
    id: 'jambon',
    name: 'Jambon fumé',
    desc: '+40 PV et régénération +3/s pour la salle',
    apply: pl => {
      pl.heal(40);
      pl.addBuff('relic', 1e6, [{ stat: 'regen', add: 3 }], true);
    },
  },
  {
    id: 'parapluie',
    name: 'Parapluie renforcé',
    desc: 'Bouclier de 60 et armure +3 pour la salle',
    apply: pl => {
      pl.shield = Math.max(pl.shield, 60);
      pl.shieldUntil = Time.now + 1e6;
      pl.addBuff('relic', 1e6, [{ stat: 'armor', add: 3 }], true);
    },
  },
  {
    id: 'lunettes',
    name: 'Lunettes de visée',
    desc: 'Crit +30 % pour la salle',
    apply: pl =>
      pl.addBuff(
        'relic',
        1e6,
        [
          { stat: 'critChance', add: 0.3 },
          { stat: 'critMult', add: 0.5 },
        ],
        true
      ),
  },
  {
    id: 'bottes',
    name: 'Bottes de facteur',
    desc: 'Vitesse +30 % et cadence +15 % pour la salle',
    apply: pl =>
      pl.addBuff(
        'relic',
        1e6,
        [
          { stat: 'speed', mul: 1.3 },
          { stat: 'fireRate', mul: 1.15 },
        ],
        true
      ),
  },
  { id: 'sifflet', name: 'Sifflet de chef de gare', desc: 'Appelle un allié pour 25 s', apply: pl => Pickups.summonAlly(pl.x, pl.y) },
];
const NO_MAGNET = new Set(['fragment', 'weapon', 'ally', 'relic', 'pet']);
/* chantier F-4 : la pesanteur des drops (px/s²) et la couleur de chaque genre, pour les étincelles du ramassage et les fantômes */
const PICK_GRAVITY = 520;
const PICK_COLORS = {
  xp: '#7ef0ff',
  coin: '#ffd166',
  fragment: '#c8ff5a',
  heart: '#7fff9a',
  purse: '#ffd166',
  relic: '#c9a3ff',
  weapon: '#ffffff',
  ally: '#9ff',
  pet: '#ffb347',
  glint: '#ffd166',
};
const Pickups = {
  list: [],
  spawn(x, y, kind, value = 1, extra = {}) {
    const a = RNG.range(0, TAU),
      s = RNG.range(40, 120);
    /* un drop part en arc (chantier F-4) : une hauteur z, une vitesse verticale négative, la pesanteur le ramène au sol */
    this.list.push(
      Object.assign(
        {
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          z: 0,
          vz: -RNG.range(140, 260),
          ph: RNG.range(0, 0.25), // posé, l'objet sautille en cadence avec ce léger déphasage (F-5)
          kind,
          value,
          t: 0,
          magnet: false,
          r: kind === 'fragment' ? 10 : kind === 'weapon' || kind === 'relic' || kind === 'ally' || kind === 'pet' ? 12 : 6,
        },
        extra
      )
    );
  },
  /* tirage d'un objet à la mort d'un ennemi : élite 35 % (bourse, relique, compagnon, allié) ; un ennemi ordinaire lâche
     parfois une relique (BALANCE.relicDropChance) ; dernière vague : 6 % de bourse. 2 objets max par salle. Le mini-boss
     ne passe pas ici : il lâche sa relique à coup sûr (Room.onBossDefeated). */
  maybeDrop(e) {
    const r = G.room;
    if (!r || r.drops >= 2 || e.isBoss) return;
    const lastWave = r.waves.length && r.waves.every(w => w.done);
    if (!e.elite && RNG.chance(BALANCE.relicDropChance)) {
      r.drops++;
      this.spawn(e.x, e.y, 'relic', 1, { relic: RNG.pick(RELICS).id });
    } else if (e.elite && RNG.chance(0.35)) {
      const k = RNG();
      r.drops++;
      if (k < 0.5) this.spawn(e.x, e.y, 'purse', RNG.int(6, 14));
      else if (k < 0.75) this.spawn(e.x, e.y, 'relic', 1, { relic: RNG.pick(RELICS).id });
      else if (k < 0.9 && Content.pets().some(x => !x.hidden))
        this.spawn(e.x, e.y, 'pet', 1, { pet: RNG.pick(Content.pets().filter(x => !x.hidden)).id });
      else this.spawn(e.x, e.y, 'ally', 1);
    } else if (lastWave && RNG.chance(0.06)) {
      r.drops++;
      this.spawn(e.x, e.y, 'purse', RNG.int(4, 9));
    }
  },
  /* arme d'essai posée au sol, une fois par palier */
  placeWeaponDrop(room) {
    const pl = G.player;
    const cur = pl.weapon ? pl.weapon.id : null;
    const pool = Content.weapons().filter(w => w.id !== cur && !(pl.trialWeapon && w.id === pl.trialWeapon.prev.id));
    const notOwned = pool.filter(w => !Meta.weaponUnlocked(w.id));
    const w = RNG.pick(notOwned.length ? notOwned : pool);
    if (!w) return;
    for (let k = 0; k < 30; k++) {
      const tx = RNG.int(4, ROOM_COLS - 4),
        ty = RNG.int(2, ROOM_ROWS - 3);
      if (!pointBlocked(tileX(tx), tileY(ty), 16) && dist(tileX(tx), tileY(ty), pl.x, pl.y) > 200) {
        this.spawn(tileX(tx), tileY(ty), 'weapon', 1, { weapon: w.id, vx: 0, vy: 0 });
        return;
      }
    }
  },
  summonAlly(x, y) {
    const pl = G.player;
    G.room.turrets.push({
      x,
      y,
      until: Time.now + 25,
      cd: 0,
      rate: 2.2,
      damage: Math.max(3, pl.weapon.damage * pl.stats.damage * 0.4),
      range: 360,
      hp: 60,
      mobile: true,
    });
    Particles.spawn(x, y, { count: 14, color: '#9ff', glow: true });
    UI.toast('Un Passeur détraqué te suit 25 s.');
    AudioEngine.skillTurret({});
  },
  update(dt) {
    const pl = G.player;
    if (!pl) return;
    const always = pl.flags.xpMagnet || pl.magnetUntil > Time.now;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      /* la pesanteur : z < 0 est en l'air ; au sol, un rebond amorti puis plus rien */
      if (p.z < 0 || p.vz < 0) {
        p.vz += PICK_GRAVITY * dt;
        p.z += p.vz * dt;
        if (p.z >= 0) {
          p.z = 0;
          p.vz = p.vz > 60 ? -p.vz * 0.35 : 0;
        }
      }
      if (p.ghost) {
        /* un éclat de décor (pièces du coffre) : il vit sa vie et s'éteint, personne ne le ramasse */
        p.vx -= p.vx * 3 * dt;
        p.vy -= p.vy * 3 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.t > (p.life || 0.9)) this.list.splice(i, 1);
        continue;
      }
      /* porté par un compagnon (F-7) : l'objet vole vers lui, puis part vers le joueur */
      if (p.carrier) {
        const c = p.carrier;
        const dc = dist(p.x, p.y, c.x, c.y);
        const a = angleTo(p.x, p.y, c.x, c.y);
        const sp = 380;
        p.vx = Math.cos(a) * sp;
        p.vy = Math.sin(a) * sp;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (dc < 14 || c.down || (c.mode === 'call' && c.away)) {
          p.carrier = null;
          p.magnet = true;
          p.trail = [];
          if (p.stages) p.stages.push('player');
        }
        continue;
      }
      const d = dist(p.x, p.y, pl.x, pl.y);
      if (p.magnet || (d < pl.stats.pickupRadius && !NO_MAGNET.has(p.kind)) || (always && !NO_MAGNET.has(p.kind))) {
        if (!p.trail) p.trail = []; // l'aimantation peut venir d'ailleurs (fin de salle, tempo, compagnon) : la traînée naît ici
        p.magnet = true;
        p.z = Math.min(0, p.z * 0.8);
        const a = angleTo(p.x, p.y, pl.x, pl.y);
        const sp = 420 + p.t * 300;
        p.vx = Math.cos(a) * sp;
        p.vy = Math.sin(a) * sp;
        /* trois fantômes derrière un orbe aimanté */
        p.trail.unshift({ x: p.x, y: p.y + p.z });
        if (p.trail.length > 3) p.trail.length = 3;
      } else {
        p.vx -= p.vx * 5 * dt;
        p.vy -= p.vy * 5 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.magnet) resolveRoomCollision(p);
      if (d < pl.r + p.r + 2) {
        this.list.splice(i, 1);
        Combat.collect(p);
      }
    }
  },
  render(ctx) {
    for (const p of this.list) {
      /* en l'air : l'objet monte de z, son ombre reste au sol et rétrécit */
      if (p.z < -1) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + 3, Math.max(2, p.r * (1 + p.z / 200)), Math.max(1, p.r * 0.4 * (1 + p.z / 200)), 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      if (p.trail && p.trail.length) {
        const col = PICK_COLORS[p.kind] || '#fff';
        for (let i = 0; i < p.trail.length; i++) {
          ctx.globalAlpha = 0.35 - i * 0.1;
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.arc(p.trail[i].x, p.trail[i].y, Math.max(1, p.r - 1 - i), 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (p.kind === 'glint') {
        const k = 1 - p.t / (p.life || 0.9);
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = PAL.gold;
        ctx.shadowColor = PAL.gold;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y + p.z, 4, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        continue;
      }
      const bob = (p.z === 0 && !p.magnet ? -3 * (1 - Ease.outCubic((Beat.phase() + (p.ph || 0)) % 1)) : 0) + p.z; // posé : un petit saut sur chaque temps
      if (p.kind === 'xp') {
        ctx.fillStyle = '#7ef0ff';
        ctx.shadowColor = '#7ef0ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, 4 + Math.min(3, p.value / 6), 0, TAU);
        ctx.fill();
      } else if (p.kind === 'coin') {
        ctx.fillStyle = '#ffd166';
        ctx.shadowColor = '#ffd166';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, 5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#b8860b';
        ctx.fillRect(p.x - 1, p.y + bob - 3, 2, 6);
      } else if (p.kind === 'fragment') {
        ctx.save();
        ctx.translate(p.x, p.y + bob);
        ctx.rotate(Time.now * 2);
        ctx.fillStyle = '#c8ff5a';
        ctx.shadowColor = '#c8ff5a';
        ctx.shadowBlur = 16;
        ctx.fillRect(-7, -7, 14, 14);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
      } else if (p.kind === 'purse') {
        ctx.fillStyle = '#8b5a2b';
        ctx.shadowColor = '#ffd166';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob + 2, 8, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#c98a4b';
        ctx.fillRect(p.x - 4, p.y + bob - 8, 8, 4);
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob + 2, 3, 0, TAU);
        ctx.fill();
      } else if (p.kind === 'weapon') {
        const w = Content.weapon(p.weapon);
        const col = w ? WEAPON_COLORS[w.family] || '#fff' : '#fff';
        ctx.save();
        ctx.translate(p.x, p.y + bob);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = 'rgba(8,10,18,.8)';
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.shadowColor = col;
        ctx.shadowBlur = 16 + Math.sin(Time.now * 5) * 6;
        ctx.fillRect(-12, -12, 24, 24);
        ctx.strokeRect(-12, -12, 24, 24);
        ctx.rotate(-Math.PI / 4);
        ctx.fillStyle = col;
        ctx.font = `bold 14px ${FONT_PIXEL}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((w ? w.family[0] : '?').toUpperCase(), 0, 1);
        ctx.restore();
        ctx.fillStyle = '#e8ecf7';
        ctx.font = `14px ${FONT_TEXT}`;
        ctx.textAlign = 'center';
        ctx.fillText(w ? w.name : '', p.x, p.y + bob - 20);
      } else if (p.kind === 'ally') {
        ctx.fillStyle = '#3a4260';
        ctx.shadowColor = '#9ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob - 6, 5, 0, TAU);
        ctx.fill();
        ctx.fillRect(p.x - 5, p.y + bob - 1, 10, 10);
        ctx.fillStyle = '#9ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob - 6, 2, 0, TAU);
        ctx.fill();
        ctx.font = `14px ${FONT_TEXT}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#9ff';
        ctx.fillText('allié', p.x, p.y + bob - 18);
      } else if (p.kind === 'pet') {
        const pd = Content.pet(p.pet) || {};
        ctx.save();
        ctx.globalAlpha = 0.9;
        if (!Sprites.drawProp(ctx, Sprites.pickDir(pd.sprite, 's'), p.x, p.y + bob - 4, 26, 26, {})) {
          ctx.fillStyle = pd.color || '#9fd8ff';
          ctx.beginPath();
          ctx.arc(p.x, p.y + bob - 4, 8, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = pd.color || '#9fd8ff';
        ctx.font = `14px ${FONT_TEXT}`;
        ctx.textAlign = 'center';
        ctx.fillText(pd.name || 'Compagnon', p.x, p.y + bob - 22);
      } else if (p.kind === 'relic') {
        const rl = RELICS.find(r => r.id === p.relic);
        ctx.save();
        ctx.translate(p.x, p.y + bob);
        ctx.rotate(Time.now * 1.5);
        ctx.fillStyle = '#c9a3ff';
        ctx.shadowColor = '#c9a3ff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i * TAU) / 10,
            rr = i % 2 ? 11 : 5;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#e8ecf7';
        ctx.font = `14px ${FONT_TEXT}`;
        ctx.textAlign = 'center';
        ctx.fillText(rl ? rl.name : 'Relique', p.x, p.y + bob - 18);
      } else if (p.kind === 'heart') {
        ctx.fillStyle = PAL.life; // un cœur, c'est la vie qui revient : vert, pas corail (le corail est le danger)
        ctx.shadowColor = PAL.life;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x - 3, p.y + bob - 2, 4, 0, TAU);
        ctx.arc(p.x + 3, p.y + bob - 2, 4, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(p.x - 7, p.y + bob - 1);
        ctx.lineTo(p.x + 7, p.y + bob - 1);
        ctx.lineTo(p.x, p.y + bob + 7);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  },
};

/* ---------- Statuts (brûlure, gel, poison) partagés ennemis ---------- */
function applyStatus(e, kind, params) {
  e.status = e.status || {};
  if (kind === 'burn') {
    const s = e.status.burn || { dps: 0, until: 0 };
    s.dps = Math.max(s.dps, params.dps);
    s.until = Time.now + params.duration;
    e.status.burn = s;
  }
  if (kind === 'freeze') {
    e.status.freeze = { slow: Math.max(params.slow, e.status.freeze ? e.status.freeze.slow : 0), until: Time.now + params.duration };
  }
  if (kind === 'poison') {
    const s = e.status.poison || { stacks: 0, dps: params.dps, until: 0 };
    s.stacks = Math.min(params.stacks || 5, s.stacks + 1);
    s.until = Time.now + params.duration;
    e.status.poison = s;
  }
}
function updateStatus(e, dt) {
  if (!e.status) return 1;
  let slow = 1;
  const b = e.status.burn;
  if (b) {
    if (Time.now > b.until) delete e.status.burn;
    else {
      e.acc = (e.acc || 0) + b.dps * dt;
    }
  }
  const p = e.status.poison;
  if (p) {
    if (Time.now > p.until) delete e.status.poison;
    else {
      e.acc = (e.acc || 0) + p.dps * p.stacks * dt;
    }
  }
  const f = e.status.freeze;
  if (f) {
    if (Time.now > f.until) delete e.status.freeze;
    else slow = 1 - f.slow;
  }
  if (e.acc >= 1) {
    const d = Math.floor(e.acc);
    e.acc -= d;
    Combat.hitEnemy(e, d, { dot: true, x: e.x, y: e.y });
  }
  return slow;
}

/* ---------- Combat : point d'entrée de tous les dégâts ---------- */
const Combat = {
  hitEnemy(e, dmg, info = {}) {
    if (e.dead) return;
    const pl = G.player;
    let d = dmg;
    if (!info.dot && !info.noCrit) {
      const marked = e.markCrit && e.markUntil > Time.now; // désigné par un guetteur : le coup du joueur est critique à coup sûr
      const crit = info.crit != null ? info.crit : marked || RNG.chance(pl.stats.critChance);
      if (crit) {
        d *= pl.stats.critMult;
        info.crit = true;
      }
    }
    if (!info.dot && e.status && e.status.freeze) {
      const fb = Progression.hasPassive(pl.hooks, 'frost_bonus');
      if (fb) d *= fb.mul || 1.3;
    }
    if (e.markUntil > Time.now) d *= e.markMul || 1.3; // désigné par un compagnon guetteur
    if (e.isBoss) {
      if (e.shieldUntil > Time.now) {
        d *= 0.15;
        Particles.spawn(info.x || e.x, info.y || e.y, { count: 3, color: '#8ff', size: 2 });
      }
      if (e.weakActive) d *= e.weakMul;
      else if (e.weak.rule === 'back' && !info.dot && info.vx != null && !(info.proj && info.proj.returning)) {
        // le retour du boomerang ne compte pas comme un coup dans le dos
        const a = Math.atan2(info.vy, info.vx);
        if (Math.abs(wrapAngle(a - e.facingA)) < (e.weak.coneAngle || 1.57) / 2 && (!e.backHit || e.backHit())) {
          d *= e.weakMul;
          info.backHit = true;
          if (Time.now >= (e.backStunReadyAt || 0)) {
            e.backStunReadyAt = Time.now + (e.weak.stunCooldown || 3);
            e.stunUntil = Time.now + (e.weak.window || 0.8);
            e.weakActive = true;
            e.weakUntil = e.stunUntil;
            Floaters.add(e.x, e.y - e.r - 24, 'DÉBRANCHÉ', '#ffd166', 18);
            AudioEngine.bossPhase({ intensity: 0.4 });
          }
        }
      }
    }
    d = Math.max(1, Math.round(d));
    e.hp -= d;
    if (!info.dot) e.flash = 0.13; // deux temps : 60 ms de blanc plein, puis 70 ms à 35 % (Enemy.render lit la valeur) ; pas pour brûlure/poison
    if (!info.dot) {
      const kb = ((info.knockback || 1) * pl.stats.knockback * (e.isBoss ? 0.1 : 1) * 160) / Math.max(1, e.mass || 1);
      const a = info.vx != null ? Math.atan2(info.vy, info.vx) : angleTo(pl.x, pl.y, e.x, e.y);
      e.kvx += Math.cos(a) * kb;
      e.kvy += Math.sin(a) * kb;
      if (!info.silent) {
        AudioEngine[info.crit ? 'hitCrit' : 'hitEnemy']({ x: (e.x - W / 2) / (W / 2) });
      }
      /* l'impact se lit en lumière : étincelles blanches (dorées sur un critique) qui partent DU CORPS de l'ennemi, dans
         le sens du coup, une étincelle de contact, un arrêt sur image, une secousse dans le sens du coup, un écrasement */
      const hy = e.y - Combat.bodyH(e) * 0.55;
      Particles.spawn(e.x, hy, {
        count: info.crit ? 14 : 7,
        angle: a,
        spread: 0.7,
        speedMin: 90,
        speedMax: info.crit ? 320 : 220,
        size: info.crit ? 3 : 2,
        color: info.crit ? '#fff3c4' : '#ffffff',
        life: 0.28,
        glow: true,
      });
      G.room.slashes.push({ x: e.x, y: hy, a, range: 20, arc: 2.6, t: 0, life: 0.09, color: '#ffffff', spark: true });
      Floaters.add(e.x, hy - 10, d, info.color || null, null, info.crit ? 'crit' : 'dmg');
      if (!info.silent) {
        Feel.stop(info.crit ? 70 : 30);
        Feel.shake(info.crit ? 3.5 : 1.6, a, 120);
      }
      Feel.squash(e, a, 110);
      /* hooks onHit */
      for (const h of pl.hooks.onHit) {
        const chance = Math.min(1, (h.chance != null ? h.chance : 1) * (h.stacks || 1)); // reprendre la greffe = palier suivant
        if (h.effect === 'burn' && RNG.chance(chance)) applyStatus(e, 'burn', h);
        else if (h.effect === 'freeze' && RNG.chance(chance)) applyStatus(e, 'freeze', h);
        else if (h.effect === 'poison' && RNG.chance(chance)) applyStatus(e, 'poison', h);
        else if (h.effect === 'chain' && RNG.chance(chance) && !info.chained)
          Combat.chain(e, d * (h.damageMul || 0.5), h.jumps || 2, h.radius || 180);
        else if (h.effect === 'crit_explode' && info.crit && !info.explosion)
          Combat.explosion(e.x, e.y, (h.radius || 70) * pl.stats.areaSize, d * (h.damageMul || 0.6), '#ffb347', true);
        else if (h.effect === 'hit_explode' && !info.explosion && !info.chained && RNG.chance(chance))
          Combat.explosion(e.x, e.y, (h.radius || 60) * pl.stats.areaSize, d * (h.damageMul || 0.6), '#ff8c42', true);
      }
      if (pl.stats.lifesteal > 0) pl.heal(d * pl.stats.lifesteal, true);
      G.run.stats.damageDealt += d;
      G.room.lastDamageT = G.room.time;
    }
    if (e.hp > 0 && !e.isBoss && !info.dot) {
      const ex = Progression.hasPassive(pl.hooks, 'execute');
      if (ex && e.hp / e.maxHp <= (ex.threshold || 0.15)) {
        e.hp = 0;
        Floaters.add(e.x, e.y - e.r - 16, 'EXÉCUTION', PAL.gold, 13);
      }
    }
    if (e.hp <= 0) Combat.killEnemy(e, info);
  },
  /* hauteur du corps dessiné d'un ennemi (les étincelles et les chiffres partent du corps, pas des pieds) */
  bodyH(e) {
    if (e.hauteur == null) {
      let h = 0;
      try {
        h = Sprites.corps(e.def.sprite || (e.isBoss ? 'boss' : 'enemy_' + e.archetype), {
          scale: e.isBoss ? 1.15 : clamp(e.r / 14, 0.6, 1.5),
        }).hauteur;
      } catch (x) {
        h = 0;
      }
      e.hauteur = h > 8 && h < 400 ? h : e.r * 2.4;
    }
    return e.hauteur;
  },
  chain(from, dmg, jumps, radius) {
    let cur = from;
    const done = new Set([from]);
    for (let i = 0; i < jumps; i++) {
      const nxt = nearestEnemy(cur.x, cur.y, radius, x => !done.has(x));
      if (!nxt) break;
      done.add(nxt);
      G.room.beams.push({ ax: cur.x, ay: cur.y, bx: nxt.x, by: nxt.y, t: 0, life: 0.28, color: '#b3e5ff', width: 5, jag: true });
      Particles.spawn(nxt.x, nxt.y, { count: 6, color: '#b3e5ff', size: 2, speedMax: 140, glow: true });
      Combat.hitEnemy(nxt, dmg, { chained: true, noCrit: true, x: nxt.x, y: nxt.y, silent: true });
      cur = nxt;
    }
  },
  explosion(x, y, radius, dmg, color = '#ff8c42', fromPlayer = true) {
    G.room.blasts.push({ x, y, r: radius, t: 0, life: 0.45, color, fill: true });
    Particles.spawn(x, y, { count: 18, color, size: 4, speedMax: 260, glow: true, life: 0.6 });
    Particles.spawn(x, y, { count: 8, color: '#fff3c4', size: 3, speedMax: 120, glow: true, life: 0.3 });
    Feel.shake(9, angleTo(x, y, G.player.x, G.player.y), 220);
    Feel.stop(60);
    if (fromPlayer) {
      for (const e of G.enemies)
        if (!e.dead && dist(x, y, e.x, e.y) < radius + e.r) Combat.hitEnemy(e, dmg, { explosion: true, noCrit: true, x, y, silent: true });
    } else {
      const pl = G.player;
      if (!pl.dead && dist(x, y, pl.x, pl.y) < radius + pl.r) Combat.hitPlayer(dmg, { type: 'explosion', x, y });
    }
    AudioEngine.skillShockwave({ x: (x - W / 2) / (W / 2), intensity: 0.6 });
  },
  /* une tache au sol, qui reste jusqu'au changement de salle (plafond DECAL_MAX, la plus vieille part) */
  stain(x, y, color, k = 1) {
    const d = G.room.decals;
    d.push({ x, y, rx: 9 * k, ry: 3.5 * k, color: color || '#000' });
    if (d.length > DECAL_MAX) d.splice(0, d.length - DECAL_MAX);
  },
  killEnemy(e, info = {}) {
    if (e.dead) return;
    e.dead = true;
    e.deathT = 0; // le corps reste dessiné DEATH_MS : blanc, puis écrasé (Enemy.renderDeath)
    const pl = G.player;
    AudioEngine.enemyDie({ x: (e.x - W / 2) / (W / 2) });
    Feel.stop(70, true); // une mort compte toujours, même juste après le coup qui l'a donnée
    Feel.shake(4, info.vx != null ? Math.atan2(info.vy, info.vx) : angleTo(pl.x, pl.y, e.x, e.y), 160);
    /* la couronne part du corps, pas des pieds : 22 blanches, 6 dorées ; une onde à plat au sol ; une tache qui reste */
    const by = e.y - Combat.bodyH(e) * 0.5;
    Particles.spawn(e.x, by, { count: 22, color: '#ffffff', size: 3, speedMin: 90, speedMax: 260, glow: true, life: 0.45 });
    Particles.spawn(e.x, by, { count: 6, color: PAL.gold, size: 2, speedMin: 60, speedMax: 180, glow: true, life: 0.6 });
    Particles.spawn(e.x, by, { count: 8, color: e.color, size: 3, speedMax: 200, glow: true });
    G.room.blasts.push({ x: e.x, y: e.y + e.r * 0.6, r: 34, t: 0, life: 0.22, color: '#ffffff', flat: true });
    Combat.stain(e.x, e.y + e.r * 0.6, e.color, e.isBoss ? 2.2 : clamp(e.r / 14, 0.7, 1.6));
    G.run.stats.kills++;
    G.room.kills++;
    G.room.lastKillT = G.room.time; // le HUD s'estompe après 4 s de calme (temps de salle, comme lastDamageT)
    G.room.combo++;
    G.room.comboUntil = Time.now + 2.5;
    G.room.bestCombo = Math.max(G.room.bestCombo, G.room.combo);
    /* drops */
    const xpMul = pl.stats.xpGain * G.debug.xpMul,
      coinMul = pl.stats.coinGain * G.debug.coinMul;
    let xp = Math.round(e.xp * xpMul * Challenge.xpMul(G.room) * Challenge.killBonus(G.room, e));
    let n = clamp(Math.ceil(xp / 5), 1, 6);
    for (let i = 0; i < n; i++) Pickups.spawn(e.x, e.y, 'xp', Math.max(1, Math.round(xp / n)));
    const coins = Math.round(e.coins * coinMul);
    for (let i = 0; i < coins; i++) Pickups.spawn(e.x, e.y, 'coin', 1);
    if (!e.isBoss && RNG.chance(BALANCE.heartDropChance)) Pickups.spawn(e.x, e.y, 'heart', 15);
    if (!info.silent || e.elite) Pickups.maybeDrop(e);
    for (const h of pl.hooks.onKill) {
      if (h.effect === 'explode')
        Combat.explosion(e.x, e.y, (h.radius || 80) * pl.stats.areaSize, Math.round(e.maxHp * (h.damageMul || 0.3)) + 5, '#ff8c42', true);
      else if (h.effect === 'heal_on_kill') pl.heal(h.amount * (h.stacks || 1));
      else if (h.effect === 'coin_on_kill' && RNG.chance((h.chance || 0.2) * (h.stacks || 1)))
        Pickups.spawn(e.x, e.y, 'coin', h.amount || 1);
      else if (h.effect === 'kill_speed') {
        pl.killSpeedUntil = Time.now + (h.duration || 2);
        pl.killSpeedMul = h.speedMul || 1.3;
      } else if (h.effect === 'skill_reset_on_kill' && RNG.chance((h.chance || 0.2) * (h.stacks || 1))) {
        pl.skillCd = Math.max(0, pl.skillCd - Skills.cooldownOf(pl) * (h.fraction || 0.5));
        if (pl.skillCd <= 0 && pl.skillCharges < pl.skillMaxCharges) {
          pl.skillCharges++;
        }
        Floaters.add(pl.x, pl.y - 34, 'enchaînement', '#9ff', 12);
      }
    }
    if (e.isBoss) Room.onBossDefeated(e);
    if (e.onDeath) e.onDeath();
  },
  hitPlayer(dmg, info = {}) {
    const pl = G.player;
    if (pl.dead) return false;
    if (G.debug.invuln) return false;
    if (Time.now < pl.invulnUntil) return false;
    if (pl.dashing && pl.dashInvuln) return false;
    if (info.type === 'trap') {
      dmg *= pl.stats.trapDamageMul; // la difficulté est déjà appliquée dans Trap (G.difficulty.damageMul)
      const heal = Progression.hasPassive(pl.hooks, 'traps_heal');
      if (heal) {
        pl.heal(Math.max(1, dmg * (heal.fraction || 0.5)));
        pl.invulnUntil = Time.now + 0.3;
        Floaters.add(pl.x, pl.y - 30, 'greffe !', '#7fff9a');
        return false;
      }
      for (const h of pl.hooks.onTrapDamage) {
        if (h.effect === 'shockwave') Combat.playerShockwave(h);
        else if (h.effect === 'speed_burst') {
          pl.killSpeedUntil = Time.now + (h.duration || 2);
          pl.killSpeedMul = h.speedMul || 1.2;
        }
      }
    }
    if (RNG.chance(pl.stats.dodge)) {
      Floaters.add(pl.x, pl.y - 30, 'esquive', '#9ff');
      pl.invulnUntil = Time.now + 0.2;
      return false;
    }
    dmg = Math.max(1, Math.round(dmg * (1 - Math.min(BALANCE.armor.max, pl.stats.armor * BALANCE.armor.perPoint)))); // armure en %, plafonnée
    if (pl.shield > 0) {
      const used = Math.min(pl.shield, dmg);
      pl.shield -= used;
      dmg -= used;
      if (dmg <= 0) {
        pl.invulnUntil = Time.now + 0.25;
        Particles.spawn(pl.x, pl.y, { count: 6, color: '#8ff', size: 2 });
        return true;
      }
    }
    pl.hp -= dmg;
    pl.invulnUntil = Time.now + pl.stats.invulnTime;
    pl.hurtFlash = 0.25;
    Run.lastDamageSource =
      (info.type || 'inconnu') + (info.source && info.source.name ? ' : ' + info.source.name : info.trapName ? ' : ' + info.trapName : '');
    G.room.hits++;
    G.room.combo = 0;
    G.run.stats.damageTaken += dmg;
    G.run.stats.hitsTaken++;
    AudioEngine.playerHurt({ intensity: clamp(dmg / 30, 0.3, 1) });
    Floaters.add(pl.x, pl.y - 30, '-' + dmg, null, null, 'taken');
    Particles.spawn(pl.x, pl.y, { count: 8, color: PAL.danger, size: 3 });
    /* le coup se sent sans quitter le personnage des yeux : recul en courbe à l'opposé de la source, vignette
       corail sur les bords, ralenti bref, secousse dirigée, et un flash d'une image sur un gros coup */
    pl.hurtA = angleTo(info.x != null ? info.x : pl.x - pl.facing, info.y != null ? info.y : pl.y, pl.x, pl.y);
    pl.hurtVig = 0.35;
    Feel.shake(4, pl.hurtA, 200);
    Feel.slow(0.35, 120);
    if (dmg > pl.stats.maxHp * 0.15) UI.flashScreen(0.5, 60);
    for (const h of pl.hooks.onDamaged) {
      if (h.effect === 'shockwave') Combat.playerShockwave(h);
      else if (h.effect === 'time_slow_on_damage') {
        Time.slow = h.scale || 0.4;
        Time.slowUntil = Time.now + (h.duration || 0.6);
      } else if (h.effect === 'speed_burst') {
        pl.killSpeedUntil = Time.now + (h.duration || 2);
        pl.killSpeedMul = h.speedMul || 1.2;
      }
    }
    if (pl.stats.thorns > 0 && info.source && !info.source.dead)
      Combat.hitEnemy(info.source, pl.stats.thorns, { noCrit: true, x: pl.x, y: pl.y, silent: true });
    if (pl.hp <= 0) pl.die();
    return true;
  },
  playerShockwave(h) {
    const pl = G.player;
    const r = (h.radius || 120) * pl.stats.areaSize * pl.stats.skillPower;
    G.room.blasts.push({ x: pl.x, y: pl.y, r, t: 0, life: 0.4, color: '#8ff' });
    for (const e of G.enemies)
      if (!e.dead && dist(pl.x, pl.y, e.x, e.y) < r + e.r) {
        Combat.hitEnemy(e, (h.damage || 15) * pl.stats.damage, {
          noCrit: true,
          knockback: h.knockback || 3,
          x: pl.x,
          y: pl.y,
          silent: true,
        });
      }
    for (let i = Projectiles.list.length - 1; i >= 0; i--) {
      const p = Projectiles.list[i];
      if (p.owner === 'enemy' && dist(pl.x, pl.y, p.x, p.y) < r) Projectiles.list.splice(i, 1);
    }
    AudioEngine.skillShockwave({});
  },
  collect(p) {
    const pl = G.player;
    /* Se baisser pour ramasser : seulement pour un objet qu'on tient (bourse, cœur, relique, arme, allié, compagnon).
       Sur une pièce, un orbe d'XP ou un fragment — qui tombent par dizaines à chaque ennemi — le personnage passait
       son temps courbé et cessait de tirer à chaque kill. */
    if (pl.char && pl.char.anim && pl.char.anim.pick && PICK_CLIP_KINDS.has(p.kind)) pl.pickT = clipLen(pl.char.anim.pick, 'pick');
    /* série de ramassages : la hauteur monte d'un cran à chaque orbe pris dans la demi-seconde (cascade), au lieu d'empiler 30 fois le même son */
    const streak = Time.now - (Pickups.lastT || -9) < 0.5 ? Math.min((Pickups.streak || 0) + 1, 12) : 0;
    Pickups.lastT = Time.now;
    Pickups.streak = streak; // cascade : un degré de la gamme par orbe
    /* la cascade sonore devient visible : la taille et le nombre d'étincelles suivent la série ; un anneau à la collecte */
    const col = PICK_COLORS[p.kind] || '#fff';
    const fx = { size: 2 + streak * 0.25, count: 5 + streak, color: col };
    Pickups.lastFx = fx;
    Particles.spawn(p.x, p.y + (p.z || 0), {
      count: fx.count,
      color: col,
      size: fx.size,
      speedMin: 60,
      speedMax: 160 + streak * 12,
      glow: true,
      life: 0.35,
    });
    G.room.blasts.push({ x: p.x, y: p.y, r: 12 + streak, t: 0, life: 0.18, color: col });
    if (p.kind === 'heart') {
      Feel.pop(pl, 0.3, 160);
      G.room.blasts.push({ x: pl.x, y: pl.y, r: 40, t: 0, life: 0.35, color: PAL.life });
    } else if (p.kind === 'relic' || p.kind === 'weapon') {
      /* les seuls ramassages qui interrompent le combat : un arrêt et un rayon de lumière vertical */
      Feel.stop(140, true);
      G.room.beams.push({ ax: p.x, ay: p.y - 360, bx: p.x, by: p.y + 6, t: 0, life: 0.4, color: '#fff3c4', width: 10 });
      Particles.spawn(p.x, p.y, {
        count: 16,
        color: '#fff3c4',
        size: 3,
        speedMin: 40,
        speedMax: 140,
        angle: -Math.PI / 2,
        spread: 0.6,
        glow: true,
        life: 0.6,
      });
    }
    if (p.kind === 'xp') {
      Run.addXp(p.value);
      AudioEngine.pickupXp({ x: (p.x - W / 2) / (W / 2), step: streak });
    } else if (p.kind === 'coin') {
      G.run.coinsPending += p.value;
      G.run.stats.coins += p.value;
      AudioEngine.pickupCoin({ step: streak });
    } else if (p.kind === 'fragment') {
      const mul = Progression.hasPassive(pl.hooks, 'fragments_double') ? 2 : 1;
      const xp = Math.round(p.value * mul * pl.stats.xpGain * G.debug.xpMul);
      Run.addXp(xp);
      G.room.fragments++;
      AudioEngine.pickupFragment({});
    } else if (p.kind === 'heart') {
      pl.heal(p.value);
      AudioEngine.pickupXp({ intensity: 1 });
    } else if (p.kind === 'purse') {
      G.run.coinsPending += p.value;
      G.run.stats.coins += p.value;
      Floaters.add(p.x, p.y - 16, '+' + p.value + ' ◈', '#ffd166', 16);
      AudioEngine.chestOpen({ intensity: 0.5 });
    } else if (p.kind === 'weapon') {
      const w = Content.weapon(p.weapon);
      if (!w) return;
      if (!pl.trialWeapon) pl.trialWeapon = { prev: pl.weapon };
      else Pickups.spawn(p.x, p.y, 'weapon', 1, { weapon: pl.weapon.id, vx: 0, vy: 0 });
      pl.weapon = w;
      pl.orbs = null;
      pl.charge = 0;
      pl.recompute();
      UI.toast(`Arme d'essai : ${w.name} (cette salle seulement)`, 4);
      UI.banner(w.name, WEAPON_COLORS[w.family] || '#fff', "arme d'essai");
      AudioEngine.uiConfirm({});
    } else if (p.kind === 'ally') {
      Pickups.summonAlly(p.x, p.y);
    } else if (p.kind === 'pet') {
      Pets.give(p.pet);
    } else if (p.kind === 'relic') {
      const rl = RELICS.find(r => r.id === p.relic) || RELICS[0];
      rl.apply(pl);
      UI.banner(rl.name, '#c9a3ff', rl.desc);
      AudioEngine.levelUp({ intensity: 0.6 });
    }
  },
};

/* ---------- Armes ---------- */
const WEAPON_COLORS = {
  blade: '#e8ecf7',
  hammer: '#ffb347',
  bow: '#c8ff5a',
  pistol: '#ffe9a8',
  boomerang: '#7ef0ff',
  orb: '#c9a3ff',
  chain: '#b3e5ff',
  flame: '#ff8c42',
};
const Weapons = {
  /* Appelé chaque pas quand le joueur tient le tir. Retourne true si une attaque a été déclenchée. */
  update(pl, dt, firing, aim) {
    const w = pl.weapon;
    const st = pl.stats;
    if (!w) return; // écran de préparation : pas encore d'arme
    const rate = w.fireRate * st.fireRate;
    pl.attackCd -= dt;
    pl.beatMul = 1;
    if (w.type === 'orbital') {
      Weapons.orbital(pl, dt, firing);
      return;
    }
    if (w.family === 'bow') {
      const ch = w.charge || { min: 0.15, max: 0.9, damageMul: 3 };
      /* On charge tant qu'on tient ; on tire en lâchant, OU dès que la charge est pleine si on tient toujours.
         Sans ça, un débutant (et le bot) qui garde le bouton enfoncé ne tirait jamais : mort en salle 1. */
      if (firing && pl.attackCd <= 0 && pl.charge < ch.max) {
        const cs = Progression.hasPassive(pl.hooks, 'charge_speed');
        pl.charge = Math.min(ch.max, pl.charge + dt * (cs ? cs.mul || 1.4 : 1));
      } else if (pl.charge > 0 && (!firing || pl.charge >= ch.max)) {
        const t = clamp((pl.charge - ch.min) / Math.max(0.01, ch.max - ch.min), 0, 1);
        pl.beatMul = Tempo.playerAction(pl, 'shot');
        Weapons.shoot(pl, aim, {
          damageMul: lerp(1, ch.damageMul, t),
          speedMul: lerp(0.8, 1.4, t),
          extraPierce: t >= 0.99 ? (w.special && w.special.chargedPierceBonus) || 1 : 0,
          kind: 'arrow',
          size: 4 + 3 * t,
        });
        pl.charge = 0;
        pl.attackCd = 1 / rate;
      }
      return;
    }
    if (!firing) {
      if (pl.flameOn) {
        pl.flameOn = false;
        AudioEngine.stopFlame();
      }
      return;
    }
    if (w.family === 'flame') {
      Weapons.flame(pl, dt, aim, rate);
      return;
    }
    if (pl.attackCd > 0) return;
    pl.attackCd = 1 / rate;
    pl.beatMul = Tempo.playerAction(pl, 'shot');
    if (w.family === 'chain' || (w.special && w.special.kind === 'chain')) Weapons.chainStrike(pl, aim);
    else if (w.type === 'melee' || w.type === 'area') Weapons.melee(pl, aim);
    else Weapons.shoot(pl, aim, {});
  },
  dmgOf(pl, mul = 1) {
    return pl.weapon.damage * pl.stats.damage * mul * (pl.beatMul || 1);
  },
  /* recul de l'arme (« gun kickback ») : 2 px pour un pistolet, 6 pour un marteau — c'est ce qui donne du poids aux armes */
  kick(pl, aim) {
    const w = pl.weapon;
    pl.kickA = aim;
    pl.kickT = 0;
    pl.kickMag = w.family === 'hammer' ? 6 : w.type === 'melee' ? 3 : w.family === 'bow' ? 3 : 2;
  },
  shoot(pl, aim, o) {
    const w = pl.weapon,
      st = pl.stats;
    Weapons.kick(pl, aim);
    const n = (w.projectiles || 1) + st.projectiles;
    const spread = (w.spread || 0) + (n > 1 ? 0.12 * (n - 1) : 0);
    const spd = (w.projSpeed || 520) * st.projSpeed * (o.speedMul || 1);
    const canReturn = (w.special && w.special.kind === 'return') || !!Progression.hasPassive(pl.hooks, 'projectiles_return');
    const hom = Progression.hasPassive(pl.hooks, 'homing');
    const rear = Progression.hasPassive(pl.hooks, 'rear_shot');
    const angles = [];
    for (let i = 0; i < n; i++) angles.push(aim + (n > 1 ? lerp(-spread / 2, spread / 2, i / (n - 1)) : 0) + RNG.range(-0.02, 0.02));
    if (rear) angles.push(aim + Math.PI);
    for (let i = 0; i < angles.length; i++) {
      const a = angles[i];
      const isRear = rear && i === angles.length - 1;
      Projectiles.spawn({
        x: pl.x + Math.cos(a) * (pl.r + 6),
        y: pl.y + Math.sin(a) * (pl.r + 6),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        speed: spd,
        r: o.size || w.size || 5,
        damage: Weapons.dmgOf(pl, (o.damageMul || 1) * (isRear ? rear.damageMul || 0.5 : 1)),
        owner: 'player',
        pierce: (w.pierce || 0) + st.pierce + (o.extraPierce || 0),
        bounce: (w.bounce || 0) + st.bounce,
        range: (w.range || 500) * st.range,
        life: 3,
        color: w.color || WEAPON_COLORS[w.family] || '#ffe9a8',
        kind: o.kind || (w.family === 'boomerang' ? 'boomerang' : 'bullet'),
        canReturn,
        knockback: w.knockback || 1,
        spin: w.family === 'boomerang' ? 0 : null,
        ghostHits: w.family === 'boomerang',
        homing: w.special && w.special.kind === 'homing' ? w.special.turn || 3 : hom ? hom.turn || 2.5 : 0,
        seekOnBounce: !!(w.special && w.special.seekOnBounce),
        seekRadius: w.special && w.special.seekRadius,
      });
    }
    const snd =
      {
        blade: 'shootBlade',
        hammer: 'shootHammer',
        bow: 'shootBow',
        pistol: 'shootPistol',
        boomerang: 'shootBoomerang',
        orb: 'shootOrb',
        chain: 'shootChain',
        flame: 'shootFlame',
      }[w.family] || 'shootPistol';
    AudioEngine[snd]({ x: (pl.x - W / 2) / (W / 2) });
    G.run.stats.shots++;
    pl.tir(pl.attackCd);
  },
  melee(pl, aim) {
    const w = pl.weapon,
      st = pl.stats;
    const slam = w.special && w.special.kind === 'slam';
    const range = (w.range || 70) * st.range * st.areaSize;
    const arc = slam ? TAU : ((w.special && w.special.arc) || 2.1) * st.areaSize;
    const cx = slam ? pl.x + Math.cos(aim) * range * 0.6 : pl.x,
      cy = slam ? pl.y + Math.sin(aim) * range * 0.6 : pl.y;
    Weapons.kick(pl, aim);
    G.room.slashes.push({
      x: pl.x,
      y: pl.y - 12, // l'arc part de la taille, pas des pieds
      a: aim,
      range,
      arc,
      t: 0,
      life: slam ? 0.28 : 0.16,
      color: w.color || WEAPON_COLORS[w.family] || '#fff',
      slam,
      cx,
      cy,
    });
    let hits = 0;
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (slam) {
        if (dist(cx, cy, e.x, e.y) > range + e.r) continue;
      } else {
        const d = dist(pl.x, pl.y, e.x, e.y);
        if (d > range + e.r) continue;
        const da = Math.abs(wrapAngle(angleTo(pl.x, pl.y, e.x, e.y) - aim));
        if (da > arc / 2 + Math.atan2(e.r, Math.max(1, d))) continue;
      }
      hits++;
      Combat.hitEnemy(e, Weapons.dmgOf(pl), { x: e.x, y: e.y, knockback: w.knockback || 1, vx: Math.cos(aim), vy: Math.sin(aim) });
    }
    /* sweep : les projectiles ennemis dans l'arc sont détruits */
    if (w.special && w.special.kind === 'sweep')
      for (let i = Projectiles.list.length - 1; i >= 0; i--) {
        const p = Projectiles.list[i];
        if (
          p.owner === 'enemy' &&
          dist(pl.x, pl.y, p.x, p.y) < range &&
          Math.abs(wrapAngle(angleTo(pl.x, pl.y, p.x, p.y) - aim)) < arc / 2
        ) {
          Projectiles.list.splice(i, 1);
          Particles.spawn(p.x, p.y, { count: 3, color: '#fff', size: 2 });
        }
      }
    if (slam) Feel.shake(9, aim, 220);
    AudioEngine[w.family === 'hammer' ? 'shootHammer' : 'shootBlade']({ x: (pl.x - W / 2) / (W / 2), intensity: hits ? 1 : 0.5 });
    G.run.stats.shots++;
    pl.tir(pl.attackCd);
  },
  chainStrike(pl, aim) {
    const w = pl.weapon,
      st = pl.stats;
    const range = (w.range || 260) * st.range;
    /* cible : l'ennemi le plus proche de la direction visée dans la portée */
    let best = null,
      bs = Infinity;
    for (const e of G.enemies) {
      if (e.dead) continue;
      const d = dist(pl.x, pl.y, e.x, e.y);
      if (d > range + e.r) continue;
      const da = Math.abs(wrapAngle(angleTo(pl.x, pl.y, e.x, e.y) - aim));
      const s = d + da * 120;
      if (da < 1.2 && s < bs) {
        bs = s;
        best = e;
      }
    }
    AudioEngine.shootChain({ x: (pl.x - W / 2) / (W / 2) });
    G.run.stats.shots++;
    pl.tir(pl.attackCd);
    const ex = best ? best.x : pl.x + Math.cos(aim) * range * 0.6,
      ey = best ? best.y : pl.y + Math.sin(aim) * range * 0.6;
    G.room.beams.push({ ax: pl.x, ay: pl.y, bx: ex, by: ey, t: 0, life: 0.12, color: w.color || '#b3e5ff', width: 4, jag: true });
    if (!best) return;
    Combat.hitEnemy(best, Weapons.dmgOf(pl), { x: best.x, y: best.y, knockback: 0.4, silent: true });
    const jumps = ((w.special && w.special.jumps) || 3) + st.projectiles;
    Combat.chain(
      best,
      Weapons.dmgOf(pl, (w.special && w.special.damageMul) || 0.7),
      jumps,
      ((w.special && w.special.radius) || 200) * st.range
    );
  },
  flame(pl, dt, aim, rate) {
    const w = pl.weapon,
      st = pl.stats;
    if (!pl.flameOn) {
      pl.flameOn = true;
      AudioEngine.startFlame({});
    }
    pl.flameAcc = (pl.flameAcc || 0) + dt * rate * 3; // 3 particules par tick, chacune 1/3 des dégâts → DPS nominal = damage × fireRate
    const cone = (w.spread || 0.5) * st.areaSize,
      range = (w.range || 170) * st.range;
    while (pl.flameAcc >= 1) {
      pl.flameAcc--;
      const a = aim + RNG.range(-cone / 2, cone / 2);
      const spd = (w.projSpeed || 380) * st.projSpeed * RNG.range(0.8, 1.2);
      Projectiles.spawn({
        x: pl.x + Math.cos(aim) * (pl.r + 4),
        y: pl.y + Math.sin(aim) * (pl.r + 4),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        r: 7 * st.areaSize,
        damage: Math.max(1, Weapons.dmgOf(pl) / 3),
        owner: 'player',
        pierce: 2 + st.pierce,
        life: range / spd,
        range,
        color: w.color || '#ff8c42',
        kind: 'flame',
        ghost: true,
        knockback: 0.15,
        noCrit: true,
      });
    }
    G.run.stats.shots += dt;
  },
  orbital(pl, dt, firing) {
    const w = pl.weapon,
      st = pl.stats;
    const n = (w.projectiles || 2) + st.projectiles;
    if (!pl.orbs || pl.orbs.length !== n) pl.orbs = Array.from({ length: n }, () => ({ x: pl.x, y: pl.y, cd: new Map() }));
    pl.orbAngle = (pl.orbAngle || 0) + dt * ((w.special && (w.special.angularSpeed || w.special.spin)) || 3.5) * Math.sqrt(st.fireRate);
    const targetR = (w.range || 80) * st.range * (firing ? (w.special && w.special.expand) || 0.7 : 1); // tirer = resserrer l'anneau sur les ennemis au contact
    pl.orbR = lerp(pl.orbR || targetR, targetR, Math.min(1, 6 * dt));
    if (firing && pl.attackCd <= 0) {
      pl.attackCd = 0.5;
      AudioEngine.shootOrb({});
    }
    const rr = (w.size || 10) * st.areaSize;
    const tick = 1 / Math.max(0.5, w.fireRate * st.fireRate);
    pl.orbs.forEach((o, i) => {
      const a = pl.orbAngle + (i * TAU) / n;
      o.x = pl.x + Math.cos(a) * pl.orbR;
      o.y = pl.y + Math.sin(a) * pl.orbR;
      for (const e of G.enemies) {
        if (e.dead || dist(o.x, o.y, e.x, e.y) > rr + e.r) continue;
        const last = o.cd.get(e) || -9;
        if (Time.now - last < tick) continue;
        o.cd.set(e, Time.now);
        Combat.hitEnemy(e, Weapons.dmgOf(pl), {
          x: o.x,
          y: o.y,
          knockback: w.knockback || 0.6,
          vx: Math.cos(a + 1.5),
          vy: Math.sin(a + 1.5),
        });
      }
      /* les orbes détruisent aussi les projectiles ennemis (faible) */
      if (w.special && (w.special.blocks || w.special.blocksProjectiles))
        for (let k = Projectiles.list.length - 1; k >= 0; k--) {
          const p = Projectiles.list[k];
          if (p.owner === 'enemy' && dist(o.x, o.y, p.x, p.y) < rr + p.r) Projectiles.list.splice(k, 1);
        }
    });
  },
};

/* ---------- Compétences actives ---------- */
const Skills = {
  cooldownOf(pl) {
    return pl.skill.cooldown * (1 - pl.stats.cooldownReduction);
  },
  use(pl, aim) {
    if (pl.skillCharges <= 0) return false;
    const s = pl.skill,
      e = s.effect,
      pw = pl.stats.skillPower * Tempo.playerAction(pl, 'skill');
    pl.skillCharges--;
    if (pl.skillCharges < pl.skillMaxCharges && pl.skillCd <= 0) pl.skillCd = Skills.cooldownOf(pl);
    switch (e.kind) {
      case 'dash': {
        const d = (e.distance || 200) * pw;
        pl.dashing = true;
        pl.dashInvuln = e.invulnerable !== false;
        pl.dashT = 0;
        pl.dashDur = e.duration || s.duration || 0.18;
        const mv = pl.moveDir.x || pl.moveDir.y ? Math.atan2(pl.moveDir.y, pl.moveDir.x) : aim;
        pl.dashVx = (Math.cos(mv) * d) / pl.dashDur;
        pl.dashVy = (Math.sin(mv) * d) / pl.dashDur;
        /* la ruée (F-7) : onde blanche au départ, coup de zoom inversé, fantômes ; en rythme (à moins de 90 ms d'un
           temps) les fantômes sont dorés et le son une quinte plus haut — rien de plus, c'est ce qui donne envie */
        pl.dashOnBeat = Beat.distToBeat(1) <= 0.09;
        pl.dashA = mv;
        pl.dashTrail = [{ x: pl.x, y: pl.y, t: Time.now }]; // le premier fantôme au départ, quatre autres en route
        pl.dashTrailT = 0;
        G.room.blasts.push({ x: pl.x, y: pl.y, r: 26, t: 0, life: 0.2, color: '#ffffff' });
        Camera.pulse = -0.015;
        AudioEngine.dash({ pitch: pl.dashOnBeat ? 1.5 : 1 });
        for (const h of pl.hooks.onDash) Skills.dashHook(pl, h);
        break;
      }
      case 'shield':
        pl.shield = Math.round((e.amount || 40) * pw);
        pl.shieldUntil = Time.now + (s.duration || 5);
        AudioEngine.skillShield({});
        break;
      case 'shockwave':
        Combat.playerShockwave({ radius: e.radius || 160, damage: e.damage || 25, knockback: e.knockback || 3 });
        for (const en of G.enemies)
          if (!en.dead && dist(pl.x, pl.y, en.x, en.y) < (e.radius || 160) * pw) en.stunUntil = Time.now + (e.stun || 0.8);
        break;
      case 'slowtime':
        Time.slow = e.scale || 0.35;
        Time.slowUntil = Time.now + (s.duration || 3) * pw;
        pl.slowImmune = Time.slowUntil;
        AudioEngine.skillSlowtime({});
        break;
      case 'turret':
        G.room.turrets.push({
          x: pl.x,
          y: pl.y,
          until: Time.now + (s.duration || 8),
          cd: 0,
          rate: e.fireRate || 3,
          damage: (e.damage || 8) * pl.stats.damage * pw,
          range: e.range || 380,
          hp: 1,
        });
        AudioEngine.skillTurret({});
        break;
      case 'blink': {
        const d = (e.distance || 220) * pw;
        let tx = pl.x + Math.cos(aim) * d,
          ty = pl.y + Math.sin(aim) * d;
        for (let k = 0; k < 10 && pointBlocked(tx, ty, pl.r); k++) {
          tx = lerp(pl.x, tx, 0.85);
          ty = lerp(pl.y, ty, 0.85);
        }
        Particles.spawn(pl.x, pl.y, { count: 12, color: '#c9a3ff', glow: true });
        pl.x = tx;
        pl.y = ty;
        resolveRoomCollision(pl);
        pl.invulnUntil = Math.max(pl.invulnUntil, Time.now + (e.invuln || 0.3));
        Particles.spawn(pl.x, pl.y, { count: 12, color: '#c9a3ff', glow: true });
        AudioEngine.skillBlink({});
        for (const h of pl.hooks.onDash) Skills.dashHook(pl, h);
        break;
      }
      case 'magnet':
        pl.magnetUntil = Time.now + (s.duration || 6);
        for (const p of Pickups.list) p.magnet = true;
        AudioEngine.skillMagnet({});
        break;
      case 'decoy':
        G.room.decoys.push({ x: pl.x, y: pl.y, until: Time.now + (s.duration || 5), hp: (e.hp || 60) * pw, r: 14, explode: e.explode });
        AudioEngine.skillTurret({});
        break;
      case 'overdrive':
        pl.overdriveUntil = Time.now + (s.duration || 5);
        pl.overdrive = {
          fireRate: e.fireRateMul || e.fireRate || 1.5,
          damage: e.damageMul || e.damage || 1.5,
          speed: e.speedMul || 1.1,
          selfDps: e.selfDamagePerSec || 0,
        };
        pl.recompute();
        AudioEngine.skillShield({ intensity: 1 });
        break;
    }
    for (const h of pl.hooks.onSkill) {
      if (h.effect === 'shockwave') Combat.playerShockwave(h);
      else if (h.effect === 'bullet_time_skill') {
        Time.slow = h.scale || 0.5;
        Time.slowUntil = Time.now + (h.duration || 0.8);
      } else if (h.effect === 'fire_frenzy')
        pl.addBuff('frenzy', h.duration || 3, [
          { stat: 'fireRate', mul: h.fireRateMul || 1.4 },
          { stat: 'damage', mul: h.damageMul || 1 },
        ]);
    }
    G.run.stats.skillUses++;
    return true;
  },
  dashHook(pl, h) {
    if (h.effect === 'fire_trail') pl.trail = { until: Time.now + 0.35, dps: h.dps || 20, duration: h.duration || 2 };
    else if (h.effect === 'shockwave') Combat.playerShockwave(h);
  },
};

/* ---------- Joueur ---------- */
class Player {
  constructor(charDef) {
    this.char = charDef;
    this.x = W / 2;
    this.y = H / 2;
    this.r = 14;
    this.vx = 0;
    this.vy = 0;
    this.aim = 0;
    this.moveDir = { x: 0, y: 0 };
    this.facing = 1;
    this.hp = 100;
    this.shield = 0;
    this.shieldUntil = 0;
    this.invulnUntil = 0;
    this.hurtFlash = 0;
    this.hurtVig = 0; // vignette de dégât (0,35 s)
    this.hurtA = 0; // direction du recul : à l'opposé de la source du coup
    this.kickT = 1; // recul de l'arme : actif tant que kickT < 0,09
    this.kickA = 0;
    this.kickMag = 0;
    this.dead = false;
    this.attackCd = 0;
    this.charge = 0;
    this.skillCd = 0;
    this.skillCharges = 1;
    this.skillMaxCharges = 1;
    this.kvx = 0;
    this.kvy = 0; // vélocité de poussée (souffles, ondes, balanciers) : les ennemis l'avaient, pas le joueur
    this.dashing = false;
    this.dashT = 0;
    this.dashDur = 0;
    this.dashVx = 0;
    this.dashVy = 0;
    this.dashInvuln = true;
    this.magnetUntil = 0;
    this.killSpeedUntil = 0;
    this.killSpeedMul = 1;
    this.overdriveUntil = 0;
    this.overdrive = null;
    this.flags = {};
    this.weapon = null;
    this.skill = null;
    this.trail = null;
    this.orbitShield = null;
    this.secondChanceUsed = false;
    this.stats = Object.assign({}, BASE_STATS);
    this.hooks = Progression.collectHooks([]);
    this.buffs = [];
    this.stormT = 0;
    this.auraCd = new Map();
    this.drones = [];
    this.clip = 'idle';
    this.clipT = 0;
    this.fireT = 0;
    this.pickT = 0; // planche d'animation en cours (personnages dessinés par l'auteur)
    this.bot = null; // contrôleur autoplay
  }
  addBuff(id, duration, mods, roomOnly = false) {
    this.buffs = this.buffs.filter(b => b.id !== id);
    this.buffs.push({ id, until: Time.now + duration, mods, roomOnly });
    this.recompute();
  }
  sources() {
    const src = [];
    const c = this.char;
    if (c) {
      src.push({
        id: c.id,
        mods: Object.keys(c.stats || {}).map(k =>
          k === 'maxHp' || k === 'speed' || k === 'luck'
            ? { stat: k, add: c.stats[k] - BASE_STATS[k] }
            : { stat: k, mul: c.stats[k] / BASE_STATS[k] }
        ),
      });
      if (c.trait) src.push(c.trait);
    }
    src.push(...Meta.activeSources());
    if (G.run.levelPassive) {
      src.push(G.run.levelPassive.bonus);
      src.push(G.run.levelPassive.malus);
    }
    for (const u of G.run.upgrades) src.push(Object.assign({}, u.def, { stacks: u.stacks }));
    for (const b of this.buffs) src.push({ id: 'buff_' + b.id, mods: b.mods });
    if (this.overdrive && Time.now < this.overdriveUntil)
      src.push({
        id: 'overdrive',
        mods: [
          { stat: 'fireRate', mul: this.overdrive.fireRate },
          { stat: 'damage', mul: this.overdrive.damage },
          { stat: 'speed', mul: this.overdrive.speed },
        ],
      });
    return src;
  }
  recompute() {
    const src = this.sources();
    const hooks = Progression.collectHooks(src);
    const gc = Progression.hasPassive(hooks, 'glass_cannon');
    if (gc)
      src.push({
        id: 'glass',
        mods: [
          { stat: 'damage', mul: gc.damageMul || 2 },
          { stat: 'maxHp', mul: gc.hpMul || 0.5 },
        ],
      });
    const oldMax = this.stats.maxHp;
    this.stats = Progression.computeStats(src);
    this.hooks = hooks;
    if (this.stats.maxHp > oldMax) this.hp += this.stats.maxHp - oldMax;
    this.hp = Math.min(this.hp, this.stats.maxHp);
    this.flags.xpMagnet = !!Progression.hasPassive(hooks, 'xp_magnet');
    this.skillMaxCharges = Progression.hasPassive(hooks, 'double_skill') ? 2 : 1;
    this.skillCharges = Math.min(this.skillCharges, this.skillMaxCharges);
    const oss = hooks.passive.filter(e => e.effect === 'orbit_shield');
    const os = oss.length
      ? {
          count: oss.reduce((s, e) => s + (e.count || 1) * (e.stacks || 1), 0),
          damage: oss.reduce((s, e) => Math.max(s, e.damage || 6), 0),
          radius: oss.reduce((s, e) => Math.max(s, e.radius || 48), 0),
        }
      : null;
    this.orbitShield = os ? Object.assign(os, { orbs: [], cd: new Map() }) : null;
    if (this.weapon && this.weapon.type !== 'orbital') this.orbs = null;
  }
  heal(n, silent) {
    if (this.dead) return;
    const before = this.hp;
    this.hp = Math.min(this.stats.maxHp, this.hp + n);
    if (!silent && this.hp - before >= 1) Floaters.add(this.x, this.y - 30, '+' + Math.round(this.hp - before), null, null, 'heal');
  }
  die() {
    const sc = Progression.hasPassive(this.hooks, 'second_chance') || Meta.resurrectAvailable();
    if (sc && !this.secondChanceUsed) {
      this.secondChanceUsed = true;
      this.hp = Math.round(this.stats.maxHp * (sc.hpFraction || 0.5));
      this.invulnUntil = Time.now + 2;
      G.room.died = true;
      Combat.playerShockwave({ radius: 220, damage: 30, knockback: 4 });
      Floaters.add(this.x, this.y - 40, 'SECONDE VIE', '#ffb347', 20);
      AudioEngine.levelUp({});
      return;
    }
    if (G.run && G.run.attract) {
      this.hp = this.stats.maxHp;
      return;
    }
    this.dead = true;
    this.hp = 0;
    AudioEngine.playerDie({});
    Run.onPlayerDeath();
  }
  /* Choisit le clip à jouer et avance son horloge. L'ordre est une priorité : mourir passe avant tout, puis
     ramasser, puis tirer, puis marcher. Un clip « une fois » garde la main jusqu'au bout de sa durée. */
  /* Un geste de tir par tir réel, à la cadence de l'arme : le clip tient dans l'intervalle entre deux tirs
     (borné entre 0,15 et 0,6 s), ses images réparties dessus. Avant, un geste fixe de 0,5 s courait tout seul
     tant que le bouton était tenu : deux balles de pistolet par geste, deux gestes et demi par coup de marteau. */
  tir(intervalle) {
    const a = this.char && this.char.anim;
    if (!a || !a.fire) return;
    const inf = Sprites.sheetInfo(a.fire);
    if (!inf) return;
    const duree = clamp(intervalle || 0.3, 0.15, 0.6);
    this.fireT = duree;
    this.fireFps = inf.n / duree;
    if (this.clip === 'fire') this.clipT = 0; // un nouveau tir relance le geste
  }
  /* les pieds, pour l'ordre de dessin : plus bas à l'écran = dessiné après */
  feetY() {
    return this.y + Sprites.SOL;
  }
  animStep(dt, moving, firing) {
    const a = this.char && this.char.anim;
    if (!a) return;
    this.fireT = Math.max(0, this.fireT - dt);
    this.pickT = Math.max(0, this.pickT - dt);
    let want = 'idle';
    if (this.dead && a.death) want = 'death';
    else if (this.pickT > 0 && a.pick) want = 'pick';
    else if (this.fireT > 0 && a.fire) want = 'fire';
    else if (moving && a.walk) want = 'walk';
    if (want !== this.clip) {
      this.clip = want;
      this.clipT = 0;
    } else this.clipT += dt;
  }
  update(dt) {
    if (this.dead) {
      this.animStep(dt, false, false);
      return;
    }
    /* --- intentions : humain ou bot --- */
    let mv, aim, firing, wantSkill;
    if (this.bot) {
      const c = this.bot(this);
      mv = c.move;
      aim = c.aim;
      firing = c.fire;
      wantSkill = c.skill;
    } else if (Input.touch.active) {
      const t = Input.touch;
      mv = { x: t.move.x, y: t.move.y };
      /* visée automatique : l'ennemi le plus proche, sinon la direction du joystick, sinon la dernière visée */
      const tgt = nearestEnemy(this.x, this.y, 720);
      aim = tgt ? angleTo(this.x, this.y, tgt.x, tgt.y) : mv.x || mv.y ? Math.atan2(mv.y, mv.x) : this.aim;
      firing = t.fire || (t.autoFire && !!tgt);
      wantSkill = Input.wasPressed('skill');
      if (t.interact) {
        Input.press('KeyE');
        t.interact = false;
      }
    } else {
      const wm = Camera.toWorld(Input.mouse.x, Input.mouse.y);
      mv = Input.axis();
      aim = angleTo(this.x, this.y, wm.x, wm.y);
      firing = (Input.mouse.down && !Atelier.posing()) || Input.isDown('fire'); // atelier en mode pose : le clic sert à poser, pas à tirer
      wantSkill = Input.wasPressed('skill') || Input.wasPressed('mouse2');
    }
    this.moveDir = mv;
    this.aim = aim;
    if (Math.abs(Math.cos(aim)) > 0.2) this.facing = Math.cos(aim) > 0 ? 1 : -1;
    /* --- déplacement --- */
    if (this.dashing) {
      this.dashT += dt;
      this.x += this.dashVx * dt;
      this.y += this.dashVy * dt;
      this.animStep(dt, true, false); // le personnage court pendant le dash au lieu de se figer
      this.dashTrailT += dt;
      if (this.dashTrailT >= this.dashDur / 5 && (this.dashTrail || []).length < 5) {
        this.dashTrailT = 0;
        this.dashTrail.push({ x: this.x, y: this.y, t: Time.now });
      }
      if (this.trail && Time.now < this.trail.until)
        G.room.hazards.push({
          x: this.x,
          y: this.y,
          r: 22,
          until: Time.now + this.trail.duration,
          dps: this.trail.dps * this.stats.damage,
          color: '#ff8c42',
          owner: 'player',
          cd: new Map(),
        });
      if (this.dashT >= this.dashDur) {
        this.dashing = false;
        Particles.spawn(this.x, this.y + Sprites.SOL - 4, {
          count: 8,
          color: '#b8b0a0',
          size: 2,
          speedMin: 40,
          speedMax: 120,
          angle: (this.dashA || 0) + Math.PI,
          spread: 0.5,
          life: 0.4,
        }); // la poussière, à l'opposé
      }
    } else {
      let sp = this.stats.speed;
      if (Time.now < this.killSpeedUntil) sp *= this.killSpeedMul;
      if (this.charge > 0) sp *= 0.6;
      if (this.gasSlowUntil > Time.now) sp *= 0.7;
      if (this.jamUntil > Time.now) sp *= this.jamScale || 0.55;
      if (G.room && G.room.grid) sp *= Terrain.speedAt(this.x, this.y); // eau, boue : on ralentit sans rien perdre
      if (Time.now < Time.slowUntil && this.slowImmune > Time.now) sp /= Time.slow; // ralenti du temps : le joueur garde sa vitesse
      this.vx = mv.x * sp;
      this.vy = mv.y * sp;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.walkT = (this.walkT || 0) + (mv.x || mv.y ? dt : 0);
      this.movingNow = !!(mv.x || mv.y);
      if (this.whiteT > 0) this.whiteT -= dt;
      this.animStep(dt, !!(mv.x || mv.y), firing);
    }
    /* poussée : s'ajoute au déplacement puis s'amortit, comme chez les ennemis. Un piège peut ainsi déplacer le
       joueur sans lui retirer de vie — c'est la monnaie de tous les pièges « qui gênent au lieu de blesser ». */
    if (this.kvx || this.kvy) {
      this.x += this.kvx * dt;
      this.y += this.kvy * dt;
      const k = Math.min(1, 10 * dt);
      this.kvx -= this.kvx * k;
      this.kvy -= this.kvy * k;
      if (Math.abs(this.kvx) < 1) this.kvx = 0;
      if (Math.abs(this.kvy) < 1) this.kvy = 0;
    }
    this.hitWall = false;
    resolveRoomCollision(this);
    /* --- régén, boucliers, timers --- */
    if (this.stats.regen > 0) this.heal(this.stats.regen * dt, true);
    if (this.shield > 0 && Time.now > this.shieldUntil) this.shield = 0;
    if (this.overdrive) {
      if (Time.now > this.overdriveUntil) {
        this.overdrive = null;
        this.recompute();
      } else if (this.overdrive.selfDps) this.hp = Math.max(1, this.hp - this.overdrive.selfDps * dt);
    }
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.hurtVig > 0) this.hurtVig -= dt;
    if (this.kickT < 0.09) this.kickT += dt;
    if (this.buffs.length && this.buffs.some(b => Time.now > b.until)) {
      this.buffs = this.buffs.filter(b => Time.now <= b.until);
      this.recompute();
    }
    /* foudre ambiante */
    const storm = Progression.hasPassive(this.hooks, 'lightning_storm');
    if (storm) {
      this.stormT += dt;
      if (this.stormNext == null) this.stormNext = (storm.every || 2) * RNG.range(BALANCE.lightningJitter.min, BALANCE.lightningJitter.max);
      const every = this.stormNext / Math.sqrt(Math.max(1, storm.stacks || 1));
      if (this.stormT >= every) {
        this.stormT = 0;
        this.stormNext = (storm.every || 2) * RNG.range(BALANCE.lightningJitter.min, BALANCE.lightningJitter.max);
        const tgt = nearestEnemy(this.x, this.y, (storm.radius || 320) * this.stats.range);
        if (tgt) {
          G.room.beams.push({
            ax: tgt.x + VFX_RNG.range(-30, 30),
            ay: ROOM_Y - 20,
            bx: tgt.x,
            by: tgt.y,
            t: 0,
            life: 0.18,
            color: '#b3e5ff',
            width: 4,
            jag: true,
          });
          Combat.hitEnemy(tgt, (storm.damage || 18) * this.stats.damage, { x: tgt.x, y: tgt.y, knockback: 0.3, silent: true });
          if (storm.jumps) Combat.chain(tgt, (storm.damage || 18) * this.stats.damage * 0.6, storm.jumps, 160);
          AudioEngine.shootChain({ intensity: 0.5 });
        }
      }
    }
    /* aura brûlante */
    const aura = Progression.hasPassive(this.hooks, 'burn_aura');
    if (aura) {
      const R = (aura.radius || 90) * this.stats.areaSize;
      for (const e of G.enemies) {
        if (e.dead || dist(this.x, this.y, e.x, e.y) > R + e.r) continue;
        const last = this.auraCd.get(e) || -9;
        if (Time.now - last < 0.25) continue;
        this.auraCd.set(e, Time.now);
        Combat.hitEnemy(e, (aura.dps || 12) * (aura.stacks || 1) * this.stats.damage * 0.25, { dot: true, x: e.x, y: e.y });
        if (RNG.chance(0.3)) applyStatus(e, 'burn', { dps: 4, duration: 1.5 });
      }
      if (VFX_RNG.chance(0.4)) {
        const a = VFX_RNG.range(0, TAU);
        Particles.spawn(this.x + Math.cos(a) * R, this.y + Math.sin(a) * R, {
          count: 1,
          color: '#ff8c42',
          size: 2,
          speedMax: 30,
          life: 0.4,
          glow: true,
        });
      }
    }
    /* drones */
    const dr = Progression.hasPassive(this.hooks, 'drone');
    const wantDrones = dr ? (dr.count || 1) * (dr.stacks || 1) : 0;
    if (this.drones.length !== wantDrones)
      this.drones = Array.from({ length: wantDrones }, (_, i) => ({ x: this.x, y: this.y, cd: i * 0.3 }));
    this.drones.forEach((d, i) => {
      const a = Time.now * 1.4 + (i * TAU) / this.drones.length;
      const tx = this.x + Math.cos(a) * 46,
        ty = this.y + Math.sin(a) * 46;
      d.x = lerp(d.x, tx, Math.min(1, 8 * dt));
      d.y = lerp(d.y, ty, Math.min(1, 8 * dt));
      d.cd -= dt;
      if (d.cd <= 0) {
        const tgt = nearestEnemy(d.x, d.y, (dr.range || 340) * this.stats.range);
        if (tgt) {
          d.cd = 1 / ((dr.fireRate || 2) * this.stats.fireRate);
          const aa = angleTo(d.x, d.y, tgt.x, tgt.y);
          Projectiles.spawn({
            x: d.x,
            y: d.y,
            vx: Math.cos(aa) * 600,
            vy: Math.sin(aa) * 600,
            r: 4,
            damage: (dr.damage || 8) * this.stats.damage,
            owner: 'player',
            life: 1.2,
            color: '#9ff',
            knockback: 0.3,
            pierce: this.stats.pierce,
          });
        }
      }
    });
    if (this.skillCd > 0) {
      this.skillCd -= dt;
      if (this.skillCd <= 0 && this.skillCharges < this.skillMaxCharges) {
        this.skillCharges++;
        if (this.skillCharges < this.skillMaxCharges) this.skillCd = Skills.cooldownOf(this);
        AudioEngine.uiConfirm && AudioEngine.uiConfirm({ intensity: 0.25 });
      }
    }
    /* --- arme & compétence --- */
    Weapons.update(this, dt, firing, aim);
    if (wantSkill && this.skill) Skills.use(this, aim);
    /* --- orbes de protection --- */
    if (this.orbitShield) {
      const os = this.orbitShield;
      os.a = (os.a || 0) + dt * 2.6;
      os.orbs = Array.from({ length: os.count }, (_, i) => ({
        x: this.x + Math.cos(os.a + (i * TAU) / os.count) * os.radius,
        y: this.y + Math.sin(os.a + (i * TAU) / os.count) * os.radius,
      }));
      for (const o of os.orbs)
        for (const e of G.enemies) {
          if (e.dead || dist(o.x, o.y, e.x, e.y) > 12 + e.r) continue;
          const last = os.cd.get(e) || -9;
          if (Time.now - last < 0.5) continue;
          os.cd.set(e, Time.now);
          Combat.hitEnemy(e, os.damage * this.stats.damage, { x: o.x, y: o.y, knockback: 1.5, silent: true });
        }
    }
  }
  render(ctx) {
    /* Mort : le corps reste et joue sa chute — s'il a une planche pour ça. Sans planche, il disparaît comme avant.
       Rien d'autre ne se dessine sur un mort : ni arme en main, ni aura, ni clignotement. */
    const chute = this.dead && !!(this.char && this.char.anim && this.char.anim.death);
    if (this.dead && !chute) return;
    /* invulnérable : clignotement à 6 Hz (10 Hz se lisait comme un scintillement d'erreur) */
    const blink = !this.dead && Time.now < this.invulnUntil && Math.floor(Time.now * 12) % 2 === 0 && !this.dashing;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.35;
    /* ombre */
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + Sprites.SOL - 3, this.r * 0.9, this.r * 0.4, 0, 0, TAU);
    ctx.fill();
    if (!this.dead && !G.attract) Tempo.renderRing(ctx, this.x, this.y + Sprites.SOL - 3); // l'anneau de mesure, partout
    /* auras selon les greffes (artefacts visibles) */
    const fx = this.hooks;
    const hasFx = eff => fx.onHit.some(h => h.effect === eff) || fx.passive.some(h => h.effect === eff);
    if (!this.dead && (hasFx('burn') || hasFx('burn_aura'))) {
      if (VFX_RNG.chance(0.5))
        Particles.spawn(this.x + VFX_RNG.range(-10, 10), this.y + this.r - 4, {
          count: 1,
          color: VFX_RNG.chance(0.5) ? '#ff8c42' : '#ffd166',
          size: 3,
          speedMin: 30,
          speedMax: 60,
          angle: -Math.PI / 2,
          spread: 0.4,
          life: 0.5,
          glow: true,
        });
      ctx.save();
      ctx.globalAlpha = 0.25;
      const g = ctx.createRadialGradient(this.x, this.y + 8, 4, this.x, this.y + 8, 30);
      g.addColorStop(0, 'rgba(255,140,40,.8)');
      g.addColorStop(1, 'rgba(255,140,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.x, this.y + 8, 30, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    if (!this.dead && (hasFx('chain') || hasFx('lightning_storm'))) {
      if (VFX_RNG.chance(0.12)) {
        const a = VFX_RNG.range(0, TAU);
        G.room.beams.push({
          ax: this.x,
          ay: this.y - 10,
          bx: this.x + Math.cos(a) * 26,
          by: this.y - 10 + Math.sin(a) * 26,
          t: 0,
          life: 0.12,
          color: '#b3e5ff',
          width: 2,
          jag: true,
        });
      }
    }
    if (!this.dead && (hasFx('freeze') || hasFx('frost_bonus'))) {
      if (VFX_RNG.chance(0.3))
        Particles.spawn(this.x + VFX_RNG.range(-12, 12), this.y - VFX_RNG.range(0, 24), {
          count: 1,
          color: '#c8f6ff',
          size: 2,
          speedMax: 12,
          life: 0.7,
          glow: true,
        });
    }
    if (!this.dead && hasFx('poison')) {
      if (VFX_RNG.chance(0.2))
        Particles.spawn(this.x + VFX_RNG.range(-8, 8), this.y - 20, {
          count: 1,
          color: '#b7ff7a',
          size: 2,
          speedMin: 15,
          speedMax: 30,
          angle: -Math.PI / 2,
          spread: 0.3,
          life: 0.8,
        });
    }
    /* Le corps regarde où il vise, comme l'arme — pas où il marche : on tirait à droite avec le dos tourné.
       Une planche n'a qu'un profil (décision : pas de nord/sud), retourné vers l'ouest ; un sprite à trois vues
       choisit la sienne d'après la visée. */
    const dv =
      this.char && this.char.anim
        ? { dir: 'e', flip: Math.cos(this.aim) < 0 }
        : this.char && (this.char.body || this.char.face)
          ? Sprites.dirFrom(Math.cos(this.aim), Math.sin(this.aim))
          : null;
    /* blessé : un recul de 7 px en courbe, à l'opposé de la source du coup, pendant 140 ms — plus un créneau de 3 px */
    if (this.hurtFlash > 0.11) {
      const kk = 7 * (1 - Ease.outCubic(Math.min(1, (0.25 - this.hurtFlash) / 0.14)));
      ctx.translate(Math.cos(this.hurtA) * kk, Math.sin(this.hurtA) * kk);
    }
    if (this.kickT < 0.09) {
      const kk = this.kickMag * (1 - Ease.outCubic(this.kickT / 0.09));
      ctx.translate(-Math.cos(this.kickA) * kk, -Math.sin(this.kickA) * kk);
    }
    /* la respiration (F-5) : le corps bat avec la musique partout, plus fort au repos (bob, écrasement) */
    const kb = Beat.pulse();
    const idle = !this.movingNow && !this.dead && !this.dashing;
    if (idle) ctx.translate(0, -2.2 * kb);
    /* les fantômes de la ruée (F-7) : cinq silhouettes, dorées si elle est partie en rythme, effacées en 300 ms */
    if (this.dashTrail && this.dashTrail.length) {
      ctx.save();
      for (const g of this.dashTrail) {
        const age = Time.now - g.t;
        if (age > 0.3) continue;
        ctx.globalAlpha = 0.35 * (1 - age / 0.3);
        ctx.fillStyle = this.dashOnBeat ? PAL.gold : PAL.self;
        ctx.beginPath();
        ctx.ellipse(g.x, g.y + Sprites.SOL - this.r, this.r * 0.8, this.r * 1.3, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      if (!this.dashing && Time.now - this.dashTrail[this.dashTrail.length - 1].t > 0.3) this.dashTrail = null;
    }
    const dashH = this.dashing ? Math.abs(Math.cos(this.dashA || 0)) : 0; // étirement orienté : le long du dash
    Sprites.drawBody(ctx, (this.char && this.char.sprite) || 'player', this.x, this.y, {
      face: this.char && this.char.face,
      body: this.char && this.char.body,
      size: this.char && this.char.size,
      anim: this.char && this.char.anim,
      clip: this.clip,
      clipT: this.clipT,
      fps: this.clip === 'fire' ? this.fireFps : undefined,
      dir: dv && dv.dir,
      flip: dv ? dv.flip : this.facing < 0,
      walk: this.walkT,
      flash: this.hurtFlash > 0 || this.whiteT > 0, // blessé, ou la silhouette blanche de la montée de niveau (F-6)
      scale: 1 + 0.04 * kb,
      sx: this.dashing ? 1 + 0.22 * dashH - 0.1 * (1 - dashH) : idle ? 1 - 0.03 * kb : undefined,
      sy: this.dashing ? 0.9 * dashH + 1.22 * (1 - dashH) : idle ? 1 + 0.035 * kb : undefined,
      fallback: () => {
        ctx.fillStyle = this.hurtFlash > 0 ? '#ff9db0' : '#e8ecf7';
        ctx.shadowColor = '#6ee7ff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0b0d14';
        ctx.beginPath();
        ctx.arc(this.x + Math.cos(this.aim) * 6, this.y + Math.sin(this.aim) * 6, 4, 0, TAU);
        ctx.fill();
      },
    });
    /* arme en main, orientée vers la visée */
    if (this.weapon && !this.dead) {
      const col = WEAPON_COLORS[this.weapon.family] || '#fff';
      /* l'arme part de la main, pas d'une hauteur fixe : elle dépend du corps dessiné (voir Sprites.handY) */
      const hMain = Sprites.handY((this.char && this.char.sprite) || 'player', this.y, {
        anim: this.char && this.char.anim,
        clip: this.clip,
        body: this.char && this.char.body,
        face: this.char && this.char.face,
        size: this.char && this.char.size,
        dir: dv && dv.dir,
      });
      ctx.save();
      ctx.translate(this.x + Math.cos(this.aim) * 10, hMain + Math.sin(this.aim) * 6);
      ctx.rotate(this.aim);
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      const fam = this.weapon.family;
      if (fam === 'blade') {
        ctx.fillRect(0, -1.5, 22, 3);
        ctx.fillStyle = '#5a3a22';
        ctx.fillRect(-4, -2.5, 6, 5);
      } else if (fam === 'hammer') {
        ctx.fillStyle = '#5a3a22';
        ctx.fillRect(0, -1.5, 22, 3);
        ctx.fillStyle = col;
        ctx.fillRect(18, -6, 9, 12);
      } else if (fam === 'bow') {
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(6, 0, 12, -1.3, 1.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(9, -11);
        ctx.lineTo(9, 11);
        ctx.stroke();
      } else if (fam === 'flame') {
        ctx.fillStyle = '#3a4260';
        ctx.fillRect(0, -3, 16, 6);
        ctx.fillStyle = col;
        ctx.fillRect(14, -2, 8, 4);
      } else if (fam === 'orb' || fam === 'chain') {
        ctx.beginPath();
        ctx.arc(12, 0, 5, 0, TAU);
        ctx.fill();
      } else if (fam === 'boomerang') {
        ctx.strokeStyle = col;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 8);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#3a4260';
        ctx.fillRect(0, -2.5, 14, 5);
        ctx.fillStyle = col;
        ctx.fillRect(12, -1.5, 6, 3);
      }
      ctx.restore();
    }
    /* bouclier */
    if (this.shield > 0) {
      ctx.strokeStyle = '#8ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#8ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 6, 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    /* charge de l'arc */
    if (this.charge > 0) {
      const ch = this.weapon.charge || { min: 0.15, max: 0.9 };
      const t = clamp((this.charge - ch.min) / (ch.max - ch.min), 0, 1);
      ctx.strokeStyle = t >= 1 ? '#ffd166' : '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r + 10, -Math.PI / 2, -Math.PI / 2 + TAU * t);
      ctx.stroke();
    }
    /* orbes d'arme */
    if (this.orbs)
      for (const o of this.orbs) {
        ctx.fillStyle = this.weapon.color || WEAPON_COLORS[this.weapon.family] || '#c9a3ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(o.x, o.y, (this.weapon.size || 10) * this.stats.areaSize, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    for (const d of this.drones) {
      ctx.fillStyle = '#3a4260';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#9ff';
      ctx.shadowColor = '#9ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 3, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (this.orbitShield)
      for (const o of this.orbitShield.orbs) {
        ctx.fillStyle = '#8ff';
        ctx.shadowColor = '#8ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(o.x, o.y, 6, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    ctx.restore();
  }
}
