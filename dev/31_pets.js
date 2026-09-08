/* =========================================================================
   SALLE ZÉRO — 31_pets.js — compagnons
   Un animal ramassé en cours de run suit le joueur jusqu'à la fin du niveau. Il n'a qu'un comportement, mais il le
   joue EN MESURE : le faucon pique sur le temps, le chien mord sur le temps, le crapaud soigne sur le temps fort.
   C'est ce qui les distingue d'une tourelle : on les entend arriver.

   Un compagnon ne meurt jamais. Celui qui attire les coups (le chien) peut être assommé et revient au bout de
   quelques secondes — perdre définitivement son animal au milieu d'une run serait une punition sans rattrapage.
   ========================================================================= */

const PET_BEHAVIORS = ['strike', 'bite', 'spit', 'collect', 'guard', 'mend', 'charge', 'mark', 'sting'];

class Pet {
  constructor(def) {
    this.def = def; this.id = def.id; this.name = def.name; this.color = def.color || '#9fd8ff';
    const pl = G.player; this.x = pl ? pl.x - 34 : W / 2; this.y = pl ? pl.y : H / 2;
    this.r = clamp((def.size || 48) * 0.28, 8, 26);   // l'emprise suit la taille : un gros animal se cogne comme un gros animal
    this.t = 0; this.act = 0; this.facing = 1; this.moving = false;
    this.state = 'follow'; this.target = null; this.lastBeat = -1; this.blocks = 0;
    this.rollA = 0; this.rollT = 0; this.rolled = new Set();
    this.maxHp = def.hp || 0; this.hp = this.maxHp; this.downT = 0;
  }
  get airborne() { return !!this.def.fly || this.state === 'roll'; }
  get down() { return this.downT > 0; }
  get taunts() { return !!this.def.taunt && !this.down; }
  dmg() { return Math.round(this.def.damage * (G.player ? G.player.stats.damage : 1)); }
  /* replacé à côté du joueur : changement de salle, ou trop distancé */
  snap() { const pl = G.player; if (!pl) return; this.x = pl.x - 34; this.y = pl.y; this.state = 'follow'; this.target = null; }
  /* vrai une fois par temps utile (tous les `every` temps) */
  beatTick() {
    const b = Beat.index(); if (b === this.lastBeat) return false; this.lastBeat = b;
    return ((b % (this.def.every || 4)) + (this.def.every || 4)) % (this.def.every || 4) === 0;
  }
  hurt(d) {
    if (!this.maxHp || this.down) return;
    this.hp -= d; Floaters.add(this.x, this.y - 20, Math.round(d), '#ff9a9a', 12);
    if (this.hp <= 0) { this.hp = 0; this.downT = this.def.revive || 6; this.state = 'follow'; this.target = null; AudioEngine.uiBack && AudioEngine.uiBack({ intensity: 0.5 }); UI.toast(this.name + ' est sonné'); }
  }
  /* déplacement de suite : rejoint le joueur au-delà de `dist`, se pose en deçà */
  follow(dt, mult) {
    const pl = G.player; const d = dist(this.x, this.y, pl.x, pl.y); const want = this.def.dist || 46;
    if (d > 460) { this.snap(); return; }   // distancé (porte franchie, téléportation) : il rattrape d'un coup
    if (d > want) {
      const a = angleTo(this.x, this.y, pl.x, pl.y); const sp = Math.min((this.def.speed || 260) * (mult || 1), 70 + (d - want) * 4.5);
      this.x += Math.cos(a) * sp * dt; this.y += Math.sin(a) * sp * dt; this.facing = Math.cos(a) > 0 ? 1 : -1; this.moving = true;
    } else this.moving = false;
    if (!this.airborne) resolveRoomCollision(this);
  }
  update(dt) {
    this.t += dt; this.act = Math.max(0, this.act - dt * 3);
    if (this.downT > 0) { this.downT -= dt; if (this.downT <= 0) { this.hp = this.maxHp; this.snap(); UI.toast(this.name + ' est de retour'); } this.moving = false; return; }
    const tick = this.beatTick(); const pl = G.player;
    switch (this.def.behavior) {
      /* --- faucon : pique sur l'ennemi le plus proche, revient ensuite --- */
      case 'strike': {
        if (this.state === 'dive') {
          const t = this.target;
          if (!t || t.dead) { this.state = 'follow'; this.target = null; break; }
          const a = angleTo(this.x, this.y, t.x, t.y); const sp = this.def.diveSpeed || 640;
          this.x += Math.cos(a) * sp * dt; this.y += Math.sin(a) * sp * dt; this.facing = Math.cos(a) > 0 ? 1 : -1; this.moving = true;
          if (dist(this.x, this.y, t.x, t.y) < t.r + this.r) {
            Combat.hitEnemy(t, this.dmg(), { x: t.x, y: t.y, knockback: this.def.knockback || 1.4, silent: true });
            Particles.spawn(t.x, t.y, { count: 7, color: this.color, glow: true, speedMax: 160, life: 0.35, size: 2 });
            AudioEngine.trapShot({ x: (this.x - W / 2) / (W / 2), intensity: 0.35 });
            this.act = 1; this.state = 'follow'; this.target = null;
          }
        } else { this.follow(dt); if (tick) { const e = nearestEnemy(this.x, this.y, this.def.range || 340); if (e) { this.target = e; this.state = 'dive'; } } }
        break;
      }
      /* --- chien : court au contact, mord en mesure, et attire les coups --- */
      case 'bite': {
        const e = nearestEnemy(this.x, this.y, this.def.range || 260);
        if (e) {
          const a = angleTo(this.x, this.y, e.x, e.y); const d = dist(this.x, this.y, e.x, e.y);
          if (d > e.r + this.r + 4) { const sp = this.def.speed || 300; this.x += Math.cos(a) * sp * dt; this.y += Math.sin(a) * sp * dt; this.facing = Math.cos(a) > 0 ? 1 : -1; this.moving = true; }
          else { this.moving = false; if (tick) { Combat.hitEnemy(e, this.dmg(), { x: e.x, y: e.y, knockback: this.def.knockback || 2, silent: true }); Particles.spawn(e.x, e.y, { count: 5, color: this.color, speedMax: 120, life: 0.3, size: 2 }); this.act = 1; } }
          resolveRoomCollision(this);
        } else this.follow(dt);
        break;
      }
      /* --- serpent : crache sur le temps, à distance --- */
      case 'spit': {
        this.follow(dt);
        if (tick) {
          const e = nearestEnemy(this.x, this.y, this.def.range || 320);
          if (e) {
            const a = angleTo(this.x, this.y, e.x, e.y); const sp = this.def.projSpeed || 460;
            Projectiles.spawn({ x: this.x, y: this.y - 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: this.def.projSize || 5, damage: this.dmg(), owner: 'player', life: 1.4, color: this.color, kind: 'bullet', noCrit: true, knockback: 0.4 });
            this.facing = Math.cos(a) > 0 ? 1 : -1; this.act = 1;
            AudioEngine.trapShot({ x: (this.x - W / 2) / (W / 2), intensity: 0.3 });
          }
        }
        break;
      }
      /* --- scarabée : aimante les ramassables autour de lui --- */
      case 'collect': {
        this.follow(dt);
        const R = this.def.radius || 220;
        for (const p of Pickups.list) { if (p.magnet || NO_MAGNET.has(p.kind)) continue; if (dist(p.x, p.y, this.x, this.y) < R) { p.magnet = true; this.act = Math.max(this.act, 0.6); } }
        if (tick) this.act = Math.max(this.act, 0.5);
        break;
      }
      /* --- tortue : tourne autour du joueur et brise les tirs ennemis --- */
      case 'guard': {
        const a = this.t * (this.def.spin || 1.7); const R = this.def.dist || 54;
        this.x = pl.x + Math.cos(a) * R; this.y = pl.y + Math.sin(a) * R; this.facing = Math.cos(a) > 0 ? 1 : -1; this.moving = true;
        if (tick) this.blocks = this.def.block || 2;
        for (let i = Projectiles.list.length - 1; i >= 0 && this.blocks > 0; i--) {
          const p = Projectiles.list[i]; if (p.owner === 'player') continue;
          if (dist(p.x, p.y, this.x, this.y) < p.r + this.r + 4) {
            Projectiles.list.splice(i, 1); this.blocks--; this.act = 1;
            Particles.spawn(p.x, p.y, { count: 5, color: this.color, glow: true, speedMax: 140, life: 0.3, size: 2 });
            AudioEngine.uiBack && AudioEngine.uiBack({ intensity: 0.25 });
          }
        }
        break;
      }
      /* --- tatou : se roule en boule et traverse la salle en ligne droite, blessant tout sur son passage --- */
      case 'charge': {
        if (this.state === 'roll') {
          const sp = this.def.rollSpeed || 560;
          this.x += Math.cos(this.rollA) * sp * dt; this.y += Math.sin(this.rollA) * sp * dt; this.moving = true; this.act = 1;
          for (const e of G.enemies) {
            if (e.dead || this.rolled.has(e) || dist(this.x, this.y, e.x, e.y) > e.r + this.r) continue;
            this.rolled.add(e); Combat.hitEnemy(e, this.dmg(), { x: e.x, y: e.y, knockback: this.def.knockback || 3, silent: true });
            Particles.spawn(e.x, e.y, { count: 6, color: this.color, speedMax: 150, life: 0.3, size: 2 });
          }
          this.rollT -= dt;
          if (this.rollT <= 0 || this.x < ROOM_X || this.y < ROOM_Y || this.x > ROOM_X + ROOM_W || this.y > ROOM_Y + ROOM_H) { this.state = 'follow'; this.act = 0; }
        } else {
          this.follow(dt);
          if (tick) {
            const e = nearestEnemy(this.x, this.y, this.def.range || 420);
            if (e) { this.rollA = angleTo(this.x, this.y, e.x, e.y); this.facing = Math.cos(this.rollA) > 0 ? 1 : -1; this.rolled = new Set(); this.rollT = this.def.rollTime || 0.8; this.state = 'roll'; AudioEngine.trapSaw && AudioEngine.trapSaw({ intensity: 0.3 }); }
          }
        }
        break;
      }
      /* --- chouette : désigne une cible, qui encaisse davantage tant qu'elle est marquée --- */
      case 'mark': {
        this.follow(dt);
        if (this.target && (this.target.dead || this.target.markUntil <= Time.now)) this.target = null;
        if (tick) {
          const e = nearestEnemy(this.x, this.y, this.def.range || 420, x => x !== this.target);
          const t = e || nearestEnemy(this.x, this.y, this.def.range || 420);
          if (t) {
            t.markUntil = Time.now + (this.def.markTime || 4); t.markMul = this.def.markMul || 1.3;
            this.target = t; this.act = 1;
            Particles.spawn(t.x, t.y - 24, { count: 6, color: this.color, glow: true, speedMax: 60, life: 0.6, size: 2 });
          }
        }
        break;
      }
      /* --- abeille : tourne autour de l'ennemi le plus proche et pique sans relâche --- */
      case 'sting': {
        const e = nearestEnemy(this.x, this.y, this.def.range || 300);
        if (!e) { this.follow(dt, 1.2); break; }
        const R = this.def.orbit || 26; const a = this.t * (this.def.spin || 5);
        const tx = e.x + Math.cos(a) * (e.r + R), ty = e.y + Math.sin(a) * (e.r + R);
        const sp = this.def.speed || 420; const d = dist(this.x, this.y, tx, ty);
        if (d > 2) { const ang = angleTo(this.x, this.y, tx, ty); const step = Math.min(sp * dt, d); this.x += Math.cos(ang) * step; this.y += Math.sin(ang) * step; }
        this.facing = Math.cos(a) > 0 ? 1 : -1; this.moving = true;
        /* la piqûre porte jusqu'au rayon d'orbite : sinon l'abeille tourne juste au-delà de sa propre portée */
        if (tick && dist(this.x, this.y, e.x, e.y) < e.r + R + 10) {
          Combat.hitEnemy(e, this.dmg(), { x: this.x, y: this.y, knockback: 0.2, silent: true, noCrit: true });
          Particles.spawn(this.x, this.y, { count: 3, color: this.color, speedMax: 80, life: 0.25, size: 2 }); this.act = 1;
        }
        break;
      }
      /* --- crapaud : soigne sur le temps fort --- */
      case 'mend': {
        this.follow(dt);
        if (tick && pl.hp < pl.stats.maxHp && !pl.dead) {
          const h = this.def.heal || 4; pl.heal(h); this.act = 1;
          Floaters.add(pl.x, pl.y - 34, '+' + h, '#7fff9a', 13);
          Particles.spawn(this.x, this.y - 8, { count: 4, color: '#7fff9a', glow: true, speedMax: 70, life: 0.5, size: 2 });
        }
        break;
      }
      default: this.follow(dt);
    }
  }
  render(ctx) {
    const s = this.def.size || 48; const lift = this.airborne ? 15 : 0;
    const bob = this.moving ? Math.abs(Math.sin(this.t * (this.airborne ? 16 : 11))) * 3.5 : Math.sin(this.t * 3) * 2;
    ctx.save(); ctx.globalAlpha = this.down ? 0.15 : 0.32; ctx.fillStyle = '#05070c';
    ctx.beginPath(); ctx.ellipse(this.x, this.y + s * 0.34, s * 0.28, s * 0.1, 0, 0, TAU); ctx.fill(); ctx.restore();
    const pop = 1 + this.act * 0.22;
    const opts = { flip: this.facing < 0, rot: this.down ? 1.4 : 0, alpha: this.down ? 0.5 : 1 };
    if (!Sprites.drawProp(ctx, this.def.sprite, this.x, this.y - bob - lift, s * pop, s * pop, opts)) {
      ctx.save(); ctx.globalAlpha = this.down ? 0.5 : 1; ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(this.x, this.y - bob - lift, s * 0.24, 0, TAU); ctx.fill(); ctx.restore();
    }
    if (this.act > 0.05 && !this.down) { ctx.save(); ctx.globalAlpha = this.act * 0.7; ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.x, this.y - bob - lift, s * 0.4 + (1 - this.act) * 10, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (this.maxHp && this.hp < this.maxHp && !this.down) {
      const w = 26; ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(this.x - w / 2, this.y - s * 0.55 - lift, w, 3);
      ctx.fillStyle = '#7fff9a'; ctx.fillRect(this.x - w / 2, this.y - s * 0.55 - lift, w * (this.hp / this.maxHp), 3); ctx.restore();
    }
  }
}

const Pets = {
  /* donne un compagnon (remplace celui en cours) */
  give(id, silent) {
    const def = Content.pet(id); if (!def) return null;
    G.pet = new Pet(def);
    if (!silent) { UI.banner(def.name, def.color || '#9fd8ff', def.desc); AudioEngine.levelUp({ intensity: 0.5 }); }
    return G.pet;
  },
  clear() { G.pet = null; },
  update(dt) { if (G.pet && G.player && G.room) G.pet.update(dt); },
  render(ctx) { if (G.pet) G.pet.render(ctx); },
  /* dégâts pris par un compagnon qui attire les coups */
  hurt(d) { if (G.pet) G.pet.hurt(d); },
  /* badge du compagnon, au-dessus de la ligne arme/compétence */
  renderHud(ctx) {
    const p = G.pet; if (!p) return;
    const x = 16, y = H - 108;
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,18,.72)'; UI.roundRect(ctx, x, y, 168, 30, 8); ctx.fill();
    if (!Sprites.drawProp(ctx, p.def.sprite, x + 18, y + 15, 24, 24, { alpha: p.down ? 0.4 : 1 })) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x + 18, y + 15, 7, 0, TAU); ctx.fill(); }
    ctx.fillStyle = p.down ? '#8a93ad' : '#e8ecf7'; ctx.font = '12px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(p.name, x + 36, y + 14);
    ctx.fillStyle = '#8a93ad'; ctx.font = '10px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(p.down ? 'sonné — ' + Math.ceil(p.downT) + ' s' : (p.def.tag || ''), x + 36, y + 25);
    ctx.restore();
  },
};
