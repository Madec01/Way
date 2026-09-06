/* =========================================================================
   SALLE ZÉRO — 32_enemies.js
   Ennemis (7 archétypes, machine à états avec télégraphie) et mini-boss (phases, patterns, faiblesse).
   ========================================================================= */

const ENEMY_ARCHETYPES = ['rusher', 'shooter', 'tank', 'kamikaze', 'summoner', 'swarm', 'dasher'];

function enemyProjectile(e, a, o = {}) {
  const b = e.behavior || {};
  const spd = (o.speed || b.projSpeed || 260) * G.difficulty.speedMul;
  Projectiles.spawn({ x: e.x + Math.cos(a) * (e.r + 4), y: e.y + Math.sin(a) * (e.r + 4), vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: o.r || 6, damage: Math.round((o.damage || b.projDamage || e.damage) * G.difficulty.damageMul), owner: 'enemy', life: o.life || 4, color: o.color || e.projColor || '#ff6b6b', kind: o.kind || 'bullet', bounce: o.bounce || 0, source: e });
}

class Enemy {
  constructor(def, x, y, opts = {}) {
    Object.assign(this, { id: def.id, name: def.name, archetype: def.archetype, def, x, y, r: def.radius || 14, color: def.color || '#ff6b6b', projColor: def.projColor });
    const d = G.difficulty; const eliteMul = opts.elite ? 1.8 : 1;
    this.maxHp = Math.round(def.hp * d.hpMul * eliteMul * (opts.hpMul || 1)); this.hp = this.maxHp;
    this.speed = def.speed * d.speedMul; this.damage = Math.round(def.damage * d.damageMul * (opts.elite ? 1.3 : 1));
    this.xp = def.xp * (opts.elite ? 2 : 1); this.coins = def.coins || 0; this.behavior = def.behavior || {}; this.telegraph = def.telegraph || { time: 0.4, color: '#fff' };
    this.mass = def.mass || (def.archetype === 'tank' ? 4 : 1); this.elite = !!opts.elite; if (this.elite) this.r *= 1.25;
    this.state = 'spawn'; this.stateT = 0; this.dead = false; this.flash = 0; this.kvx = 0; this.kvy = 0; this.stunUntil = 0; this.tele = 0; this.facing = 1;
    this.spawnT = opts.noSpawn ? 0 : 0.6; this.fireCd = RNG.range(0.5, 1.5); this.summonCd = 1.5; this.summoned = []; this.wander = RNG.range(0, TAU);
    this.contactCd = 0; this.isBoss = false; this.status = null; this.acc = 0; this.hitWall = false; this.anim = RNG.range(0, 10);
    /* alias des paramètres de contenu */
    const b = this.behavior;
    if (b.lungeTime == null && b.lungeDuration != null) b.lungeTime = b.lungeDuration;
    if (b.recover == null && b.lungeCooldown != null) b.recover = b.lungeCooldown;
    if (b.chargeTime == null && b.chargeDuration != null) b.chargeTime = b.chargeDuration;
    if (b.stun == null && b.stunOnWallHit != null) b.stun = b.stunOnWallHit;
    if (b.range == null && b.blinkRange != null) b.range = b.blinkRange;
    if (b.wait == null && b.blinkCooldown != null) b.wait = b.blinkCooldown;
    if (b.dashDistance == null && b.dashDuration != null) b.dashDistance = (b.dashSpeed || 700) * b.dashDuration;
    if (b.count == null && b.burst != null) b.count = b.burst;
    if (b.lungeWindup != null) this.telegraph = Object.assign({}, this.telegraph, { time: b.lungeWindup });
    if (b.blinkWindup != null) this.telegraph = Object.assign({}, this.telegraph, { time: b.blinkWindup });
    if (b.summonWindup != null) this.telegraph = Object.assign({}, this.telegraph, { time: b.summonWindup });
    if (b.aimTime != null) this.telegraph = Object.assign({}, this.telegraph, { time: b.aimTime });
  }
  get slowFactor() { return updateStatus(this, 0); }
  moveToward(tx, ty, dt, speedMul = 1, sep = true) {
    let a = angleTo(this.x, this.y, tx, ty); let sx = Math.cos(a), sy = Math.sin(a);
    if (sep) for (const o of G.enemies) { if (o === this || o.dead) continue; const d = dist(this.x, this.y, o.x, o.y); if (d < this.r + o.r + 6 && d > 0.01) { sx += (this.x - o.x) / d * 0.8; sy += (this.y - o.y) / d * 0.8; } }
    const l = Math.hypot(sx, sy) || 1; const sp = this.speed * speedMul * this.slow;
    this.x += sx / l * sp * dt; this.y += sy / l * sp * dt;
  }
  setState(s) { this.state = s; this.stateT = 0; }
  /* prêt à frapper : télégraphie écoulée et, dans la salle du tempo, un temps (ou une croche) vient d'être franchi */
  armed(t) { return this.stateT >= t && (!this.beatLock || Beat.crossedFrame(this.beatDiv || 1)); }
  update(dt) {
    if (this.dead) return; const pl = G.player;
    this.slow = updateStatus(this, dt); if (this.dead) return;
    this.stateT += dt; this.anim += dt; if (this.flash > 0) this.flash -= dt; this.fireCd -= dt; this.contactCd -= dt;
    /* recul */
    this.x += this.kvx * dt; this.y += this.kvy * dt; this.kvx -= this.kvx * Math.min(1, 10 * dt); this.kvy -= this.kvy * Math.min(1, 10 * dt);
    if (this.spawnT > 0) { this.spawnT -= dt; resolveRoomCollision(this); return; }
    if (Time.now < this.stunUntil) { resolveRoomCollision(this); return; }
    const target = this.pickTarget(); const d = dist(this.x, this.y, target.x, target.y);
    if (target.x < this.x - 2) this.facing = -1; else if (target.x > this.x + 2) this.facing = 1;
    this['ai_' + this.archetype](dt, target, d);
    this.hitWall = false; resolveRoomCollision(this);
    /* anti-blocage : un ennemi immobile 6 s loin du joueur est relocalisé (recoin derrière un mur mobile, pile d'ennemis) */
    if (pointBlocked(this.x, this.y, this.r * 0.5)) { this.inWallT = (this.inWallT || 0) + dt; if (this.inWallT > 1.5) { this.inWallT = 0; this.relocate(); } } else this.inWallT = 0;
    if (this.lastX == null || dist(this.x, this.y, this.lastX, this.lastY) > 24) { this.lastX = this.x; this.lastY = this.y; this.stuckT = 0; }
    else if (d > 160 && this.archetype !== 'summoner' && this.archetype !== 'shooter') { this.stuckT = (this.stuckT || 0) + dt; if (this.stuckT > 6) this.relocate(); }
    else if (d > 160) { this.stuckT = (this.stuckT || 0) + dt; if (this.stuckT > 14) this.relocate(); }
    /* contact */
    if (this.contactCd <= 0 && !pl.dead && dist(this.x, this.y, pl.x, pl.y) < this.r + pl.r) {
      if (Combat.hitPlayer(this.contactDamage(), { type: 'contact', source: this, x: this.x, y: this.y })) { this.contactCd = 0.6; const a = angleTo(pl.x, pl.y, this.x, this.y); this.kvx += Math.cos(a) * 120; this.kvy += Math.sin(a) * 120; }
    }
    for (const dc of G.room.decoys) if (dist(this.x, this.y, dc.x, dc.y) < this.r + dc.r && this.contactCd <= 0) { dc.hp -= this.damage; this.contactCd = 0.6; }
  }
  relocate() {
    this.stuckT = 0; const pl = G.player;
    for (let k = 0; k < 20; k++) { const x = RNG.range(ROOM_X + 40, ROOM_X + ROOM_W - 40), y = RNG.range(ROOM_Y + 40, ROOM_Y + ROOM_H - 40); if (dist(x, y, pl.x, pl.y) > 200 && !pointBlocked(x, y, this.r + 8)) { Particles.spawn(this.x, this.y, { count: 8, color: this.color, glow: true }); this.x = x; this.y = y; this.lastX = x; this.lastY = y; Particles.spawn(x, y, { count: 8, color: this.color, glow: true }); Floaters.add(x, y - this.r - 10, 'relocalisé', '#9aa4c4', 11); return; } }
  }
  contactDamage() { return this.archetype === 'tank' && this.state === 'charge' ? Math.round(this.damage * (this.behavior.chargeDamageMul || 1.5)) : this.damage; }
  pickTarget() { const pl = G.player; let t = pl; let bd = Infinity; for (const dc of G.room.decoys) { const d = dist(this.x, this.y, dc.x, dc.y); if (d < bd) { bd = d; t = dc; } } return t; }
  /* --- archétypes --- */
  ai_rusher(dt, t, d) {
    const b = this.behavior; const lr = b.lungeRange || 110;
    if (this.state === 'spawn') this.setState('chase');
    if (this.state === 'chase') { this.moveToward(t.x, t.y, dt); if (d < lr && this.stateT > 0.3) { this.setState('windup'); this.lungeA = angleTo(this.x, this.y, t.x, t.y); } }
    else if (this.state === 'windup') { this.tele = 1; this.lungeA = lerp(this.lungeA, angleTo(this.x, this.y, t.x, t.y), 0.1); if (this.armed(this.telegraph.time)) { this.setState('lunge'); this.tele = 0; } }
    else if (this.state === 'lunge') { const sp = (b.lungeSpeed || 620) * this.slow; this.x += Math.cos(this.lungeA) * sp * dt; this.y += Math.sin(this.lungeA) * sp * dt; if (this.stateT > (b.lungeTime || 0.25) || this.hitWall) this.setState('recover'); }
    else if (this.state === 'recover') { if (this.stateT > (b.recover || 0.5)) this.setState('chase'); }
  }
  ai_shooter(dt, t, d) {
    const b = this.behavior; const keep = b.keepDistance || 260;
    if (this.state === 'spawn') this.setState('position');
    if (this.state === 'position') {
      if (d < keep - 40) this.moveToward(this.x * 2 - t.x, this.y * 2 - t.y, dt, 0.9); else if (d > keep + 60) this.moveToward(t.x, t.y, dt); else { this.wander += dt * 1.5; this.x += Math.cos(this.wander) * this.speed * 0.4 * dt; this.y += Math.sin(this.wander) * this.speed * 0.4 * dt; }
      if (this.fireCd <= 0 && d < (b.range || 520) && lineOfSight(this.x, this.y, t.x, t.y)) { this.setState('aim'); this.aimA = angleTo(this.x, this.y, t.x, t.y); }
    } else if (this.state === 'aim') {
      this.tele = 1; if (this.armed(this.telegraph.time)) { this.tele = 0; const n = b.count || 1, sp = b.spread || 0.3; for (let i = 0; i < n; i++) enemyProjectile(this, this.aimA + (n > 1 ? lerp(-sp / 2, sp / 2, i / (n - 1)) : 0)); this.fireCd = 1 / (b.fireRate || 0.8) / G.difficulty.fireRateMul; AudioEngine.shootPistol({ x: (this.x - W / 2) / (W / 2), intensity: 0.4 }); this.setState('position'); }
    }
  }
  ai_tank(dt, t, d) {
    const b = this.behavior;
    if (this.state === 'spawn') this.setState('walk');
    if (this.state === 'walk') { this.moveToward(t.x, t.y, dt, 0.6); if (d < (b.chargeRange || 320) && this.stateT > Math.max(1, (b.chargeCooldown || 3) - (b.stun || 1.2)) && lineOfSight(this.x, this.y, t.x, t.y)) { this.setState('windup'); this.chargeA = angleTo(this.x, this.y, t.x, t.y); } }
    else if (this.state === 'windup') { this.tele = 1; if (this.armed(b.chargeWindup || this.telegraph.time)) { this.tele = 0; this.setState('charge'); AudioEngine.dash({ intensity: 1 }); } }
    else if (this.state === 'charge') { const sp = (b.chargeSpeed || 520) * this.slow; this.x += Math.cos(this.chargeA) * sp * dt; this.y += Math.sin(this.chargeA) * sp * dt; if (this.hitWall || this.stateT > (b.chargeTime || 0.9)) { this.setState('stunned'); if (this.hitWall) { G.shake = Math.min(8, G.shake + 4); Particles.spawn(this.x, this.y, { count: 10, color: '#aaa', size: 3 }); } } }
    else if (this.state === 'stunned') { if (this.stateT > (b.stun || 1.2)) this.setState('walk'); }
    if (this.state === 'walk' && this.stateT < (b.chargeCooldown || 0) - (b.stun || 1.2)) { /* attente avant nouvelle charge */ }
  }
  ai_kamikaze(dt, t, d) {
    const b = this.behavior;
    if (this.state === 'spawn') this.setState('chase');
    if (this.state === 'chase') { this.moveToward(t.x, t.y, dt, 1.1); if (d < (b.triggerRange || 60)) this.setState('fuse'); }
    else if (this.state === 'fuse') { this.tele = 1; this.moveToward(t.x, t.y, dt, 0.35); if (this.armed(b.fuse || 0.7)) { this.explode(); } }
  }
  explode() {
    const b = this.behavior; const r = (b.radius || 80); const dmg = Math.round((b.explosionDamage || this.damage * 2) * G.difficulty.damageMul);
    Combat.explosion(this.x, this.y, r, dmg, this.color, false);
    for (const e of G.enemies) if (e !== this && !e.dead && dist(this.x, this.y, e.x, e.y) < r + e.r) { e.hp -= Math.round(dmg * 0.5); e.flash = 0.1; if (e.hp <= 0) Combat.killEnemy(e); }
    this.hp = 0; this.xp = Math.round(this.xp * 0.5); Combat.killEnemy(this, { silent: true });
  }
  ai_summoner(dt, t, d) {
    const b = this.behavior; const keep = b.keepDistance || 340;
    if (this.state === 'spawn') this.setState('idle');
    this.summonCd -= dt;
    if (this.state === 'idle') {
      if (d < keep) this.moveToward(this.x * 2 - t.x, this.y * 2 - t.y, dt, 0.8); else { this.wander += dt; this.x += Math.cos(this.wander) * this.speed * 0.3 * dt; this.y += Math.sin(this.wander) * this.speed * 0.3 * dt; }
      this.summoned = this.summoned.filter(e => !e.dead);
      if (this.summonCd <= 0 && this.summoned.length < (b.max || 4)) this.setState('summon');
    } else if (this.state === 'summon') {
      this.tele = 1; if (this.armed(this.telegraph.time)) {
        this.tele = 0; const def = Content.enemy(b.summon); const n = b.count || 2;
        for (let i = 0; i < n; i++) { const a = RNG.range(0, TAU); const e = Room.spawnEnemy(def, this.x + Math.cos(a) * 40, this.y + Math.sin(a) * 40, { hpMul: 0.7 }); if (e) { e.xp = Math.round(e.xp * 0.4); e.coins = 0; this.summoned.push(e); } }
        this.summonCd = (b.every || 5) / G.difficulty.fireRateMul; this.setState('idle'); AudioEngine.trapGas({ intensity: 0.5 });
      }
    }
  }
  ai_swarm(dt, t, d) {
    const b = this.behavior;
    if (this.state === 'spawn') this.setState('chase');
    this.wander += (RNG() - 0.5) * (b.jitter || 6) * dt * 10;
    const a = angleTo(this.x, this.y, t.x, t.y) + Math.sin(this.wander) * 0.9;
    const sp = this.speed * this.slow; this.x += Math.cos(a) * sp * dt; this.y += Math.sin(a) * sp * dt;
  }
  ai_dasher(dt, t, d) {
    const b = this.behavior;
    if (this.state === 'spawn') this.setState('wait');
    if (this.state === 'wait') { this.moveToward(t.x, t.y, dt, 0.5); if (this.stateT > (b.wait || 1.2) && (d < (b.range || 420) || this.stateT > (b.wait || 1.2) * 3)) { this.setState('windup'); this.dashA = angleTo(this.x, this.y, t.x, t.y); this.dashLen = Math.min(d + 40, b.dashDistance || 300); } }
    else if (this.state === 'windup') { this.tele = 1; this.dashA = angleTo(this.x, this.y, t.x, t.y); if (this.armed(this.telegraph.time)) { this.tele = 0; this.setState('dash'); this.dashed = 0; Particles.spawn(this.x, this.y, { count: 8, color: this.color, glow: true }); } }
    else if (this.state === 'dash') { const sp = (b.dashSpeed || 900) * this.slow; const step = sp * dt; this.x += Math.cos(this.dashA) * step; this.y += Math.sin(this.dashA) * step; this.dashed += step; if (this.dashed >= this.dashLen || this.hitWall) { this.setState('wait'); this.stateT = -(b.postDashPause || 0); } }
  }
  /* --- rendu commun --- */
  render(ctx) {
    if (this.dead) return;
    const alpha = this.spawnT > 0 ? clamp(1 - this.spawnT / 0.6, 0.1, 1) : 1;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(this.x, this.y + this.r - 2, this.r * 0.9, this.r * 0.4, 0, 0, TAU); ctx.fill();
    /* salle du tempo : voyant qui bat au-dessus de la tête */
    if (this.beatLock) { const k = Math.max(0, 1 - Beat.phase() * 3); ctx.strokeStyle = '#ffd166'; ctx.fillStyle = '#ffd166'; ctx.lineWidth = 2; ctx.globalAlpha = alpha * (0.3 + 0.7 * k); ctx.beginPath(); ctx.arc(this.x, this.y - this.r - 10, 3 + k * 3, 0, TAU); ctx.fill(); ctx.globalAlpha = alpha; }
    /* télégraphie : halo pulsant + ligne d'intention */
    if (this.tele) {
      const k = 0.5 + 0.5 * Math.sin(Time.now * 30); ctx.strokeStyle = this.telegraph.color || '#fff'; ctx.lineWidth = 2 + k * 2; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 6 + k * 4, 0, TAU); ctx.stroke();
      const a = this.lungeA != null && this.state === 'windup' ? this.lungeA : this.chargeA != null && this.state === 'windup' ? this.chargeA : this.dashA != null && this.state === 'windup' ? this.dashA : this.aimA != null && this.state === 'aim' ? this.aimA : null;
      if (a != null) { ctx.globalAlpha = alpha * 0.5; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x + Math.cos(a) * 160, this.y + Math.sin(a) * 160); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = alpha; }
      if (this.archetype === 'kamikaze') { ctx.globalAlpha = 0.25; ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.behavior.radius || 80, 0, TAU); ctx.fill(); ctx.globalAlpha = alpha; }
      ctx.shadowBlur = 0;
    }
    if (this.elite) { ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 3, 0, TAU); ctx.stroke(); }
    const flash = this.flash > 0;
    const tint = this.status && this.status.burn ? 'rgba(255,110,30,.45)' : this.status && this.status.poison ? 'rgba(120,255,90,.4)' : this.enraged ? 'rgba(255,40,40,.35)' : null;
    Sprites.draw(ctx, this.def.sprite || (this.isBoss ? 'boss' : 'enemy_' + this.archetype), this.x, this.y, { flip: this.facing < 0, walk: this.anim, flash, tint, scale: this.isBoss ? 1.15 : clamp(this.r / 14, 0.6, 1.5), fallback: () => {
      ctx.fillStyle = flash ? '#fff' : this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 10; ctx.beginPath();
      switch (this.archetype) {
        case 'tank': ctx.rect(this.x - this.r, this.y - this.r, this.r * 2, this.r * 2); break;
        case 'shooter': ctx.moveTo(this.x, this.y - this.r); ctx.lineTo(this.x + this.r, this.y + this.r); ctx.lineTo(this.x - this.r, this.y + this.r); ctx.closePath(); break;
        case 'kamikaze': for (let i = 0; i < 8; i++) { const a = i * TAU / 8, rr = i % 2 ? this.r : this.r * 0.6; ctx.lineTo(this.x + Math.cos(a) * rr, this.y + Math.sin(a) * rr); } ctx.closePath(); break;
        case 'summoner': for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.lineTo(this.x + Math.cos(a) * this.r, this.y + Math.sin(a) * this.r); } ctx.closePath(); break;
        case 'dasher': ctx.moveTo(this.x + this.r, this.y); ctx.lineTo(this.x, this.y + this.r); ctx.lineTo(this.x - this.r, this.y); ctx.lineTo(this.x, this.y - this.r); ctx.closePath(); break;
        default: ctx.arc(this.x, this.y, this.r, 0, TAU);
      }
      ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#0b0d14'; ctx.beginPath(); ctx.arc(this.x + this.facing * 4, this.y - 2, 3, 0, TAU); ctx.fill(); } });
    /* statuts : brûlure = flammes qui montent, gel = givre bleu sur le corps, poison = bulles vertes */
    if (this.status) {
      if (this.status.burn) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) { const fx = this.x + VFX_RNG.range(-this.r * 0.8, this.r * 0.8), fy = this.y + this.r * 0.4 - VFX_RNG.range(0, this.r * 1.8); const rr = VFX_RNG.range(3, 7); const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, rr * 2); g.addColorStop(0, 'rgba(255,240,150,.9)'); g.addColorStop(0.4, 'rgba(255,120,40,.7)'); g.addColorStop(1, 'rgba(255,60,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, rr * 2, 0, TAU); ctx.fill(); }
        ctx.restore();
        if (VFX_RNG.chance(0.5)) Particles.spawn(this.x + VFX_RNG.range(-6, 6), this.y - this.r * 0.5, { count: 1, color: VFX_RNG.chance(0.5) ? '#ff8c42' : '#ffd166', size: 3, speedMin: 30, speedMax: 70, angle: -Math.PI / 2, spread: 0.5, life: 0.5, glow: true });
      }
      if (this.status.freeze) {
        ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#9ff'; ctx.beginPath(); ctx.arc(this.x, this.y - 4, this.r + 4, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1; ctx.strokeStyle = '#e0ffff'; ctx.lineWidth = 2; ctx.shadowColor = '#9ff'; ctx.shadowBlur = 12; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Time.now * 0.5; ctx.lineTo(this.x + Math.cos(a) * (this.r + 8), this.y - 4 + Math.sin(a) * (this.r + 8)); } ctx.closePath(); ctx.stroke();
        for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + Time.now; ctx.beginPath(); ctx.moveTo(this.x, this.y - 4); ctx.lineTo(this.x + Math.cos(a) * (this.r + 10), this.y - 4 + Math.sin(a) * (this.r + 10)); ctx.stroke(); }
        ctx.restore();
      }
      if (this.status.poison) {
        ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#7ed957'; ctx.beginPath(); ctx.arc(this.x, this.y - 4, this.r + 3, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#b7ff7a';
        for (let i = 0; i < 3; i++) { const t = (Time.now * 1.5 + i * 0.33) % 1; ctx.beginPath(); ctx.arc(this.x + Math.sin(i * 2.1 + Time.now) * this.r * 0.6, this.y + this.r * 0.3 - t * this.r * 2, 2 + (1 - t) * 2, 0, TAU); ctx.fill(); }
        ctx.restore();
      }
    }
    /* barre de vie si entamé */
    if (this.hp < this.maxHp && !this.isBoss) { const w = this.r * 2.2; ctx.fillStyle = '#000a'; ctx.fillRect(this.x - w / 2, this.y - this.r - 10, w, 4); ctx.fillStyle = '#ff5e7a'; ctx.fillRect(this.x - w / 2, this.y - this.r - 10, w * clamp(this.hp / this.maxHp, 0, 1), 4); }
    if (Time.now < this.stunUntil) { ctx.fillStyle = '#ffd166'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✦', this.x, this.y - this.r - 14); }
    ctx.restore();
  }
}

/* ---------- Mini-boss ---------- */
class Boss extends Enemy {
  constructor(def, x, y, opts = {}) {
    const rv = opts.revenge ? (def.revenge || { hpMul: 1.5 }) : null;
    super({ id: def.id, name: rv && rv.name || def.name, archetype: 'boss', hp: Math.round(def.hp * (rv ? rv.hpMul || 1.5 : 1)), speed: def.speed * (rv ? 1.1 : 1), damage: def.damage, radius: def.radius || 30, xp: Math.round(def.xp * (rv ? 1.5 : 1)), coins: Math.round(def.coins * (rv ? 1.5 : 1)), color: rv ? '#ff7a3c' : (def.color || '#ff3b5c'), sprite: def.sprite, telegraph: { time: 0.8, color: '#ff3b5c' } }, x, y, { noSpawn: true });
    this.bossDef = def; this.isBoss = true; this.mass = 12; this.phaseIdx = 0; this.patternIdx = 0; this.patternCd = 1.5; this.cur = null;
    this.weak = Object.assign({}, def.weakness || { rule: 'after_charge', damageMul: 2, window: 1.5 });
    this.revenge = rv;
    /* phases : celles du mini-boss, plus les phases supplémentaires de la revanche (triées par seuil décroissant) */
    this.phases = def.phases.map(p => Object.assign({}, p, { patterns: p.patterns.slice() }));
    if (rv) {
      for (const p of (rv.extraPhases || [])) this.phases.push(Object.assign({}, p, { patterns: p.patterns.slice() }));
      this.phases.sort((a, b) => (b.hpBelow != null ? b.hpBelow : 1) - (a.hpBelow != null ? a.hpBelow : 1));
      /* plaque : la faiblesse dorsale est inactive tant que la plaque tient */
      this.plateHits = 0; this.plateNeeded = rv.plateHits || 6; this.plateOn = true;
      /* mimétisme : il reproduit la compétence choisie en salle 1, insérée en tête de la 2e phase */
      if (rv.mimic !== false && G.run && G.run.skill) { const mp = Boss.mimicPattern(G.run.skill); if (mp && this.phases[1]) this.phases[1].patterns.unshift(mp); else if (mp) this.phases[0].patterns.push(mp); }
      this.phaseText = rv.phaseText;
    }
    this.phase = this.phases[0];
    this.weakActive = false; this.weakUntil = 0; this.weakMul = this.weak.damageMul || 2; this.facingA = 0; this.intro = 1.5; this.spawnT = 0;
  }
  /* pattern miroir de la compétence du joueur */
  static mimicPattern(skillId) {
    const s = Content.skill(skillId); if (!s) return null; const k = s.effect.kind;
    return {
      dash: { kind: 'charge', telegraph: 0.35, duration: 0.35, cooldown: 2.2, speed: 900, damage: 22, stunTime: 0.4, color: '#9ff', label: 'DASH COPIÉ' },
      blink: { kind: 'teleport', telegraph: 0.6, duration: 0.4, cooldown: 4, count: 5, spread: 1.0, projSpeed: 320, projDamage: 14, color: '#c9a3ff', label: 'SAUT DE PHASE COPIÉ' },
      turret: { kind: 'summon', telegraph: 0.8, duration: 0.5, cooldown: 8, enemy: 'enemy_sentinelle', count: 2, label: 'TOURELLE COPIÉE' },
      shockwave: { kind: 'slam', telegraph: 0.9, duration: 0.4, cooldown: 5, radius: 170, damage: 28, label: 'ONDE COPIÉE' },
      shield: { kind: 'shield', telegraph: 0.4, duration: 3, cooldown: 9, label: 'BLINDAGE' },
      slowtime: { kind: 'slow', telegraph: 0.6, duration: 2.5, cooldown: 8, scale: 0.55, label: 'BROUILLAGE' },
      magnet: { kind: 'pull', telegraph: 0.7, duration: 1.4, cooldown: 7, force: 520, damage: 18, label: 'ASPIRATION' },
      overdrive: { kind: 'ring', telegraph: 0.5, duration: 1.6, cooldown: 6, count: 10, rate: 3, rotate: 0.3, projSpeed: 280, projDamage: 13, projSize: 7, label: 'FRÉNÉSIE' },
      decoy: { kind: 'summon', telegraph: 0.8, duration: 0.5, cooldown: 8, enemy: 'enemy_nuee', count: 1, label: 'LEURRE COPIÉ' },
    }[k] || null;
  }
  /* coup dans le dos : renvoie true si la faiblesse s'applique */
  backHit() {
    if (this.plateOn) {
      this.plateHits++; Floaters.add(this.x, this.y - this.r - 24, `PLAQUE ${this.plateHits}/${this.plateNeeded}`, '#cfd6e6', 14); AudioEngine.hitCrit({ intensity: 0.5 });
      if (this.plateHits >= this.plateNeeded) { this.plateOn = false; this.weak.window = (this.revenge && this.revenge.window) || 0.4; Floaters.add(this.x, this.y - this.r - 40, 'PLAQUE ARRACHÉE', '#ffd166', 20); Particles.spawn(this.x, this.y, { count: 20, color: '#cfd6e6', glow: true, speedMax: 260 }); G.shake = 8; AudioEngine.bossPhase({}); }
      return false;
    }
    return true;
  }
  ai_boss(dt, t, d) {
    const pl = G.player;
    if (this.intro > 0) { this.intro -= dt; return; }
    /* changement de phase */
    const next = this.phases[this.phaseIdx + 1];
    if (next && this.hp / this.maxHp <= (next.hpBelow || 0.5)) { this.phaseIdx++; this.phase = next; this.patternIdx = 0; this.cur = null; this.patternCd = 1.2; this.stunUntil = Time.now + 1; this.invulnPhase = Time.now + 1; Particles.spawn(this.x, this.y, { count: 30, color: this.color, glow: true, speedMax: 300 }); G.shake = 10; AudioEngine.bossPhase({}); UI.banner(this.phaseText && this.phaseIdx === 1 ? this.phaseText : 'PHASE ' + (this.phaseIdx + 1), this.color); }
    /* faiblesse temporelle */
    if (this.weakActive && Time.now > this.weakUntil) this.weakActive = false;
    if (this.weak.rule === 'back') { this.facingA = this.cur && this.cur.kind === 'charge' ? this.chargeA : angleTo(this.x, this.y, pl.x, pl.y); }
    if (this.cur) { this.runPattern(dt, t, d); return; }
    /* déplacement d'attente : approche lente */
    if (d > 180) this.moveToward(t.x, t.y, dt, 0.7, false); else if (d < 100) this.moveToward(this.x * 2 - t.x, this.y * 2 - t.y, dt, 0.5, false);
    this.patternCd -= dt;
    if (this.patternCd <= 0) { const pats = this.phase.patterns; const p = pats[this.patternIdx % pats.length]; this.patternIdx++; this.cur = Object.assign({ t: 0, fired: 0, phase: 'tele' }, p); this.tele = 1; this.telegraph = { time: p.telegraph || 0.8, color: p.color || this.color }; this.chargeA = angleTo(this.x, this.y, t.x, t.y); AudioEngine.trapWarn({ intensity: 0.7 }); if (p.label) Floaters.add(this.x, this.y - this.r - 30, p.label, p.color || '#ff7a3c', 15); }
  }
  runPattern(dt, t, d) {
    const c = this.cur; c.t += dt; const pl = G.player; const rate = G.difficulty.fireRateMul;
    if (c.phase === 'tele') {
      if (c.kind === 'charge' || c.kind === 'slam') this.chargeA = lerp(this.chargeA, angleTo(this.x, this.y, t.x, t.y), 0.08);
      if (c.kind === 'slam') { c.tx = t.x; c.ty = t.y; }
      if (c.t >= (c.telegraph || 0.8)) { c.phase = 'act'; c.t = 0; this.tele = 0; if (c.kind === 'charge') AudioEngine.bossRoar({ intensity: 0.7 }); }
      return;
    }
    const dur = c.duration || 1;
    switch (c.kind) {
      case 'ring': { const every = 1 / ((c.rate || 2) * rate); if (c.t >= c.fired * every) { c.fired++; const n = c.count || 12; const off = (c.fired * (c.rotate || 0.25)); for (let i = 0; i < n; i++) enemyProjectile(this, off + i * TAU / n, { speed: c.projSpeed || c.speed || 220, damage: c.projDamage || c.damage || this.damage * 0.6, r: c.projSize || c.size || 7, color: c.color }); AudioEngine.shootHammer({ intensity: 0.4 }); } if (c.t >= dur) this.endPattern(); break; }
      case 'fan': { const every = 1 / ((c.rate || 3) * rate); if (c.t >= c.fired * every) { c.fired++; const n = c.count || 5, sp = c.spread || 0.9; const a0 = angleTo(this.x, this.y, pl.x, pl.y); for (let i = 0; i < n; i++) enemyProjectile(this, a0 + lerp(-sp / 2, sp / 2, n > 1 ? i / (n - 1) : 0.5), { speed: c.projSpeed || c.speed || 300, damage: c.projDamage || c.damage || this.damage * 0.6, r: c.projSize || c.size || 7, color: c.color }); AudioEngine.shootPistol({ intensity: 0.5 }); } if (c.t >= dur) this.endPattern(); break; }
      case 'spiral': { const every = 1 / ((c.rate || 12) * rate); if (c.t >= c.fired * every) { c.fired++; const arms = c.arms || 2; for (let i = 0; i < arms; i++) enemyProjectile(this, c.fired * (c.step || (c.angularSpeed || 2) / (c.rate || 12)) + i * TAU / arms, { speed: c.projSpeed || c.speed || 200, damage: c.projDamage || c.damage || this.damage * 0.5, r: c.projSize || c.size || 6, color: c.color }); } if (c.t >= dur) this.endPattern(); break; }
      case 'charge': { const sp = (c.speed || 640) * G.difficulty.speedMul * this.slow; this.x += Math.cos(this.chargeA) * sp * dt; this.y += Math.sin(this.chargeA) * sp * dt; if (this.hitWall || c.t >= dur) { const wall = this.hitWall; this.endPattern(); if (this.weak.rule === 'after_charge' || (this.weak.rule === 'while_stunned' && wall) || (this.weak.rule === 'back' && wall)) { const win = wall ? (c.stunTime || this.weak.window || 1.5) : (this.weak.window || 1.5); this.stunUntil = Time.now + win; if (this.weak.rule !== 'back') { this.weakActive = true; this.weakUntil = this.stunUntil; } Floaters.add(this.x, this.y - this.r - 20, wall ? 'SONNÉ' : 'PRISE EXPOSÉE', '#ffd166', 18); G.shake = 8; } } break; }
      case 'slam': { const jt = c.jump || 0.6; if (c.t < jt) { const k = c.t / jt; this.x = lerp(c.sx != null ? c.sx : (c.sx = this.x), c.tx, k); this.y = lerp(c.sy != null ? c.sy : (c.sy = this.y), c.ty, k); this.air = Math.sin(k * Math.PI) * 60; } else { this.air = 0; Combat.explosion(this.x, this.y, (c.radius || 120), Math.round((c.damage || this.damage) * G.difficulty.damageMul), c.color || '#ffb347', false); G.shake = 12; this.endPattern(); if (this.weak.rule === 'while_stunned') { this.weakActive = true; this.weakUntil = Time.now + (this.weak.window || 1.2); this.stunUntil = this.weakUntil; } } break; }
      case 'summon': { if (!c.fired) { c.fired = 1; const def = Content.enemy(c.enemy); for (let i = 0; i < (c.count || 3); i++) { const a = RNG.range(0, TAU); const e = Room.spawnEnemy(def, this.x + Math.cos(a) * 70, this.y + Math.sin(a) * 70, { hpMul: 0.8 }); if (e) { e.xp = Math.round(e.xp * 0.5); } } AudioEngine.trapGas({}); } if (c.t >= (c.duration || 0.5)) this.endPattern(); break; }
      case 'laser_sweep': { const sweep = c.sweep || Math.PI; const a0 = c.a0 != null ? c.a0 : (c.a0 = angleTo(this.x, this.y, pl.x, pl.y) - sweep / 2 * (c.dir = RNG.chance(0.5) ? 1 : -1)); const a = a0 + c.dir * sweep * (c.t / dur); const len = c.length || 700; G.room.beams.push({ ax: this.x, ay: this.y, bx: this.x + Math.cos(a) * len, by: this.y + Math.sin(a) * len, t: 0, life: 0.05, color: c.color || '#ff3b5c', width: 8 }); if (segCircle(this.x, this.y, this.x + Math.cos(a) * len, this.y + Math.sin(a) * len, pl.x, pl.y, pl.r)) Combat.hitPlayer(Math.round((c.damage || this.damage * 0.8) * G.difficulty.damageMul), { type: 'trap', x: this.x, y: this.y }); if (c.t >= dur) this.endPattern(); break; }
      case 'teleport': { if (!c.fired) { c.fired = 1; Particles.spawn(this.x, this.y, { count: 16, color: '#c9a3ff', glow: true }); const a = angleTo(pl.x, pl.y, this.x, this.y); const dd = this.r + pl.r + 40; let tx = pl.x - Math.cos(angleTo(this.x, this.y, pl.x, pl.y)) * -dd, ty = pl.y - Math.sin(angleTo(this.x, this.y, pl.x, pl.y)) * -dd; /* derrière le joueur : opposé à la direction boss→joueur */ tx = pl.x + (pl.x - this.x) / Math.max(1, dist(pl.x, pl.y, this.x, this.y)) * dd; ty = pl.y + (pl.y - this.y) / Math.max(1, dist(pl.x, pl.y, this.x, this.y)) * dd; tx = clamp(tx, ROOM_X + this.r, ROOM_X + ROOM_W - this.r); ty = clamp(ty, ROOM_Y + this.r, ROOM_Y + ROOM_H - this.r); this.x = tx; this.y = ty; resolveRoomCollision(this); Particles.spawn(this.x, this.y, { count: 16, color: '#c9a3ff', glow: true }); AudioEngine.skillBlink({}); const n = c.count || 5, sp = c.spread || 1; const a0 = angleTo(this.x, this.y, pl.x, pl.y); for (let i = 0; i < n; i++) enemyProjectile(this, a0 + lerp(-sp / 2, sp / 2, n > 1 ? i / (n - 1) : 0.5), { speed: c.projSpeed || 320, damage: c.projDamage || 14, r: c.projSize || 7, color: c.color }); } if (c.t >= dur) this.endPattern(); break; }
      case 'shield': { if (!c.fired) { c.fired = 1; this.shieldUntil = Time.now + dur; AudioEngine.skillShield({}); } if (c.t >= 0.3) this.endPattern(); break; }
      case 'slow': { if (!c.fired) { c.fired = 1; pl.jamUntil = Time.now + dur; pl.jamScale = c.scale || 0.55; AudioEngine.skillSlowtime({}); Floaters.add(pl.x, pl.y - 34, 'BROUILLÉ', '#c9a3ff', 16); } if (c.t >= 0.3) this.endPattern(); break; }
      case 'pull': { const a = angleTo(pl.x, pl.y, this.x, this.y); const f = (c.force || 500) * dt; if (!pl.dead && !pl.dashing) { pl.x += Math.cos(a) * f; pl.y += Math.sin(a) * f; resolveRoomCollision(pl); } G.room.beams.push({ ax: this.x, ay: this.y, bx: pl.x, by: pl.y, t: 0, life: 0.05, color: '#c9a3ff', width: 3 }); if (c.t >= dur) { this.endPattern(); if (dist(pl.x, pl.y, this.x, this.y) < this.r + pl.r + 30) Combat.explosion(this.x, this.y, this.r + 60, Math.round((c.damage || 18) * G.difficulty.damageMul), '#c9a3ff', false); } break; }
      default: this.endPattern();
    }
  }
  endPattern() { const c = this.cur; this.cur = null; this.patternCd = (c.cooldown || 1.2) / G.difficulty.fireRateMul; this.air = 0; if (this.weak.rule === 'during_reload') { this.weakActive = true; this.weakUntil = Time.now + (this.weak.window || 1); } }
  update(dt) {
    if (this.dead) return; const pl = G.player;
    this.slow = updateStatus(this, dt); if (this.dead) return;
    this.stateT += dt; this.anim += dt; if (this.flash > 0) this.flash -= dt; this.contactCd -= dt;
    this.x += this.kvx * dt; this.y += this.kvy * dt; this.kvx -= this.kvx * Math.min(1, 10 * dt); this.kvy -= this.kvy * Math.min(1, 10 * dt);
    const t = this.pickTarget(); const d = dist(this.x, this.y, t.x, t.y);
    if (t.x < this.x - 2) this.facing = -1; else if (t.x > this.x + 2) this.facing = 1;
    if (Time.now >= this.stunUntil) this.ai_boss(dt, t, d);
    this.hitWall = false; resolveRoomCollision(this);
    if (this.contactCd <= 0 && !pl.dead && !this.air && dist(this.x, this.y, pl.x, pl.y) < this.r + pl.r) { if (Combat.hitPlayer(this.damage, { type: 'contact', source: this })) this.contactCd = 0.7; }
  }
  render(ctx) {
    const y0 = this.y; this.y -= this.air || 0;
    if (this.shieldUntil > Time.now) { ctx.save(); ctx.strokeStyle = '#8ff'; ctx.lineWidth = 4; ctx.shadowColor = '#8ff'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 8, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (this.revenge && this.plateOn) { ctx.save(); ctx.fillStyle = '#8890aa'; ctx.strokeStyle = '#cfd6e6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.x - Math.cos(this.facingA) * (this.r - 4), this.y - Math.sin(this.facingA) * (this.r - 4), 9, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
    if (this.weakActive) { ctx.save(); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 20; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(this.x, this.y, this.r + 10 + Math.sin(Time.now * 12) * 3, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (this.weak.rule === 'back' && !(this.revenge && this.plateOn)) { ctx.save(); ctx.fillStyle = '#ffd166'; ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(this.x - Math.cos(this.facingA) * (this.r - 4), this.y - Math.sin(this.facingA) * (this.r - 4), 6, 0, TAU); ctx.fill(); ctx.restore(); }
    if (this.cur && this.cur.kind === 'slam' && this.cur.phase === 'act') { ctx.save(); ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.arc(this.cur.tx, this.cur.ty, this.cur.radius || 120, 0, TAU); ctx.stroke(); ctx.restore(); }
    super.render(ctx); this.y = y0;
  }
}
Boss.prototype.hitFromBehind = function (fromX, fromY) { const a = angleTo(this.x, this.y, fromX, fromY); return Math.abs(wrapAngle(a - this.facingA)) > Math.PI * 0.6; };
