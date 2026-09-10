'use strict';
/* =========================================================================
   SALLE ZÉRO — 31_pets.js — compagnons
   Un animal ramassé en cours de run suit le joueur jusqu'à la fin du niveau. Il n'a qu'un comportement, mais il le
   joue EN MESURE : le faucon pique sur le temps, le chien mord sur le temps, le crapaud soigne sur le temps fort.
   C'est ce qui les distingue d'une tourelle : on les entend arriver.

   Un compagnon ne meurt jamais. Celui qui attire les coups (le chien) peut être assommé et revient au bout de
   quelques secondes — perdre définitivement son animal au milieu d'une run serait une punition sans rattrapage.
   ========================================================================= */

const PET_BEHAVIORS = ['strike', 'bite', 'spit', 'collect', 'guard', 'mend', 'charge', 'mark', 'sting'];
/* Trois façons d'emmener un animal, et c'est un vrai choix à trois branches :
   - `always` : il est là tout le temps, à sa force normale ;
   - `call`   : il n'est pas là, on l'appelle (touche C) ; il arrive plus fort mais pour un temps, puis se repose ;
   - `none`   : personne — et le joueur garde pour lui ce qu'il aurait donné à l'animal.
   Sans la contrepartie de `none`, ce troisième choix ne serait jamais pris. */
const PET_MODES = {
  always: { id: 'always', name: 'Tout le temps', desc: 'Il vous suit du début à la fin, à sa force normale.' },
  call: {
    id: 'call',
    name: "À l'appel",
    desc: 'Absent, appelé par C : son arrivée repousse tout autour de vous, puis il frappe plus fort (×1,6, cadence doublée) pendant 12 s et se repose 25 s.',
    boost: 1.6,
    dur: 12,
    cd: 25,
    arrival: { radius: 160, damage: 18, knockback: 3 }, // l'onde de choc de son arrivée, centrée sur le joueur
  },
  none: {
    id: 'none',
    name: 'Personne',
    desc: 'Aucun compagnon — vous gardez sa part : +35 % de PV max et +20 % de dégâts.',
    mods: [
      { stat: 'maxHp', mul: 1.35 },
      { stat: 'damage', mul: 1.2 },
    ],
  },
};

class Pet {
  constructor(def) {
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.color = def.color || '#9fd8ff';
    const pl = G.player;
    this.x = pl ? pl.x - 34 : W / 2;
    this.y = pl ? pl.y : H / 2;
    this.r = clamp((def.size || 48) * 0.28, 8, 26); // l'emprise suit la taille : un gros animal se cogne comme un gros animal
    this.t = 0;
    this.act = 0;
    this.facing = 1;
    this.moving = false;
    this.state = 'follow';
    this.target = null;
    this.lastBeat = -1;
    this.blocks = 0;
    this.rollA = 0;
    this.rollT = 0;
    this.rolled = new Set();
    this.px = this.x;
    this.py = this.y;
    this.dx = 1;
    this.dy = 0; // déplacement réel de la dernière image : donne la vue à afficher
    this.clip = 'idle';
    this.clipT = 0; // planche d'animation en cours, quand l'auteur en a fourni une
    this.maxHp = def.hp || 0;
    this.hp = this.maxHp;
    this.downT = 0;
    this.mode = 'always';
    this.away = false;
    this.callT = 0;
    this.cdT = 0; // mode « à l'appel » : présence limitée puis repos
    this.boost = 1;
  }
  get airborne() {
    return !!this.def.fly || this.state === 'roll';
  }
  get down() {
    return this.downT > 0;
  }
  get taunts() {
    return !!this.def.taunt && !this.down && !this.hidden();
  }
  /* absent : appelé mais pas encore venu, ou reparti se reposer */
  hidden() {
    return this.mode === 'call' && this.away;
  }
  dmg() {
    return Math.round(this.def.damage * (G.player ? G.player.stats.damage : 1) * this.boost * (this.pairMul || 1));
  }
  /* cadence : le mode « à l'appel » joue deux fois plus souvent, puisqu'il ne dure pas */
  every() {
    const e = this.def.every || 4;
    return this.boost > 1 ? Math.max(1, Math.round(e / 2)) : e;
  }
  /* appel du joueur : l'animal accourt si son repos est fini */
  call() {
    const m = PET_MODES.call;
    if (this.mode !== 'call' || this.cdT > 0 || !this.away) return false;
    this.away = false;
    this.callT = m.dur;
    this.boost = m.boost;
    this.snap();
    if (m.arrival && G.room) Combat.playerShockwave(m.arrival); // il déboule : tout ce qui entoure le joueur est repoussé
    UI.toast(this.name + ' arrive');
    AudioEngine.levelUp({ intensity: 0.4 });
    return true;
  }
  /* replacé à côté du joueur : changement de salle, ou trop distancé */
  snap() {
    const pl = G.player;
    if (!pl) return;
    this.x = pl.x - 34;
    this.y = pl.y;
    this.state = 'follow';
    this.target = null;
  }
  /* vrai une fois par temps utile (tous les `every` temps) */
  beatTick() {
    const b = Beat.index();
    if (b === this.lastBeat) return false;
    this.lastBeat = b;
    const e = this.every();
    return ((b % e) + e) % e === 0;
  }
  hurt(d) {
    if (!this.maxHp || this.down) return;
    this.lastHurt = Time.now;
    this.hp -= d;
    Floaters.add(this.x, this.y - 20, Math.round(d), '#ff9a9a', 12);
    if (this.hp <= 0) {
      this.hp = 0;
      this.downT = this.def.revive || 6;
      this.state = 'follow';
      this.target = null;
      AudioEngine.uiBack && AudioEngine.uiBack({ intensity: 0.5 });
      UI.toast(this.name + ' est sonné');
    }
  }
  /* déplacement de suite : rejoint le joueur au-delà de `dist`, se pose en deçà */
  follow(dt, mult) {
    const pl = G.player;
    const d = dist(this.x, this.y, pl.x, pl.y);
    const want = this.def.dist || 46;
    if (d > 460) {
      this.snap();
      return;
    } // distancé (porte franchie, téléportation) : il rattrape d'un coup
    if (d > want) {
      const a = angleTo(this.x, this.y, pl.x, pl.y);
      const sp = Math.min((this.def.speed || 260) * (mult || 1), 70 + (d - want) * 4.5);
      this.x += Math.cos(a) * sp * dt;
      this.y += Math.sin(a) * sp * dt;
      this.facing = Math.cos(a) > 0 ? 1 : -1;
      this.moving = true;
    } else this.moving = false;
    if (!this.airborne) resolveRoomCollision(this);
  }
  update(dt) {
    /* laissé tranquille quelques secondes, un compagnon qui a des PV les récupère */
    if (this.maxHp && !this.down && this.hp < this.maxHp && Time.now - (this.lastHurt || -1e9) > BALANCE.petRegen.delay)
      this.hp = Math.min(this.maxHp, this.hp + BALANCE.petRegen.perSec * dt);
    /* mode « à l'appel » : décompte de la présence puis du repos ; absent, il ne fait rien et ne se dessine pas */
    if (this.mode === 'call') {
      if (this.away) {
        this.cdT = Math.max(0, this.cdT - dt);
        return;
      }
      this.callT -= dt;
      if (this.callT <= 0) {
        this.away = true;
        this.boost = 1;
        this.cdT = PET_MODES.call.cd;
        UI.toast(this.name + ' se repose');
        return;
      }
    }
    this.px = this.x;
    this.py = this.y;
    this.t += dt;
    this.act = Math.max(0, this.act - dt * 3);
    if (this.downT > 0) {
      this.downT -= dt;
      if (this.downT <= 0) {
        this.hp = this.maxHp;
        this.snap();
        UI.toast(this.name + ' est de retour');
      }
      this.moving = false;
      return;
    }
    const tick = this.beatTick();
    const pl = G.player;
    switch (this.def.behavior) {
      /* --- faucon : pique sur l'ennemi le plus proche, revient ensuite --- */
      case 'strike': {
        if (this.state === 'dive') {
          const t = this.target;
          if (!t || t.dead) {
            this.state = 'follow';
            this.target = null;
            break;
          }
          const a = angleTo(this.x, this.y, t.x, t.y);
          const sp = this.def.diveSpeed || 640;
          this.x += Math.cos(a) * sp * dt;
          this.y += Math.sin(a) * sp * dt;
          this.facing = Math.cos(a) > 0 ? 1 : -1;
          this.moving = true;
          if (dist(this.x, this.y, t.x, t.y) < t.r + this.r) {
            Combat.hitEnemy(t, this.dmg(), { x: t.x, y: t.y, knockback: this.def.knockback || 1.4, silent: true });
            Particles.spawn(t.x, t.y, { count: 7, color: this.color, glow: true, speedMax: 160, life: 0.35, size: 2 });
            AudioEngine.trapShot({ x: (this.x - W / 2) / (W / 2), intensity: 0.35 });
            this.act = 1;
            this.state = 'follow';
            this.target = null;
          }
        } else {
          this.follow(dt);
          if (tick) {
            const e = nearestEnemy(this.x, this.y, this.def.range || 340);
            if (e) {
              this.target = e;
              this.state = 'dive';
            }
          }
        }
        break;
      }
      /* --- chien : court au contact, mord en mesure, et attire les coups --- */
      case 'bite': {
        const e = nearestEnemy(this.x, this.y, this.def.range || 260);
        if (e) {
          const a = angleTo(this.x, this.y, e.x, e.y);
          const d = dist(this.x, this.y, e.x, e.y);
          if (d > e.r + this.r + 4) {
            const sp = this.def.speed || 300;
            this.x += Math.cos(a) * sp * dt;
            this.y += Math.sin(a) * sp * dt;
            this.facing = Math.cos(a) > 0 ? 1 : -1;
            this.moving = true;
          } else {
            this.moving = false;
            if (tick) {
              Combat.hitEnemy(e, this.dmg(), { x: e.x, y: e.y, knockback: this.def.knockback || 2, silent: true });
              Particles.spawn(e.x, e.y, { count: 5, color: this.color, speedMax: 120, life: 0.3, size: 2 });
              this.act = 1;
            }
          }
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
            const a = angleTo(this.x, this.y, e.x, e.y);
            const sp = this.def.projSpeed || 460;
            Projectiles.spawn({
              x: this.x,
              y: this.y - 6,
              vx: Math.cos(a) * sp,
              vy: Math.sin(a) * sp,
              r: this.def.projSize || 5,
              damage: this.dmg(),
              owner: 'player',
              life: 1.4,
              color: this.color,
              kind: 'bullet',
              noCrit: true,
              knockback: 0.4,
            });
            this.facing = Math.cos(a) > 0 ? 1 : -1;
            this.act = 1;
            AudioEngine.trapShot({ x: (this.x - W / 2) / (W / 2), intensity: 0.3 });
          }
        }
        break;
      }
      /* --- rapporteur : il va chercher ce qui traîne. Il court vers le ramassable le plus proche (dans `radius`
         de lui, sans s'éloigner du joueur de plus de `leash`) et tout ce qui passe à `reach` de lui file vers le joueur.
         Un anneau au sol montre cette portée tant qu'il a une cible. --- */
      case 'collect': {
        const R = this.def.radius || 260,
          reach = this.def.reach || 140,
          leash = this.def.leash || 320;
        let best = null,
          bd = R;
        for (const p of Pickups.list) {
          if (p.magnet || NO_MAGNET.has(p.kind)) continue;
          const d = dist(p.x, p.y, this.x, this.y);
          if (d < reach) {
            p.magnet = true;
            this.act = Math.max(this.act, 0.6);
          } else if (d < bd) {
            bd = d;
            best = p;
          }
        }
        this.fetching = best && dist(best.x, best.y, pl.x, pl.y) < leash ? best : null;
        if (this.fetching) {
          const a = angleTo(this.x, this.y, best.x, best.y);
          const sp = this.def.speed || 260;
          this.x += Math.cos(a) * sp * dt;
          this.y += Math.sin(a) * sp * dt;
          this.facing = Math.cos(a) > 0 ? 1 : -1;
          this.moving = true;
          if (!this.airborne) resolveRoomCollision(this);
        } else this.follow(dt);
        if (tick) this.act = Math.max(this.act, 0.5);
        break;
      }
      /* --- tortue : tourne autour du joueur et brise les tirs ennemis --- */
      case 'guard': {
        const a = this.t * (this.def.spin || 1.7);
        const R = this.def.dist || 54;
        this.x = pl.x + Math.cos(a) * R;
        this.y = pl.y + Math.sin(a) * R;
        this.facing = Math.cos(a) > 0 ? 1 : -1;
        this.moving = true;
        if (tick) this.blocks = this.def.block || 2;
        for (let i = Projectiles.list.length - 1; i >= 0 && this.blocks > 0; i--) {
          const p = Projectiles.list[i];
          if (p.owner === 'player') continue;
          if (dist(p.x, p.y, this.x, this.y) < p.r + this.r + 4) {
            Projectiles.list.splice(i, 1);
            this.blocks--;
            this.act = 1;
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
          this.x += Math.cos(this.rollA) * sp * dt;
          this.y += Math.sin(this.rollA) * sp * dt;
          this.moving = true;
          this.act = 1;
          for (const e of G.enemies) {
            if (e.dead || this.rolled.has(e) || dist(this.x, this.y, e.x, e.y) > e.r + this.r) continue;
            this.rolled.add(e);
            Combat.hitEnemy(e, this.dmg(), { x: e.x, y: e.y, knockback: this.def.knockback || 3, silent: true });
            Particles.spawn(e.x, e.y, { count: 6, color: this.color, speedMax: 150, life: 0.3, size: 2 });
          }
          this.rollT -= dt;
          if (this.rollT <= 0 || this.x < ROOM_X || this.y < ROOM_Y || this.x > ROOM_X + ROOM_W || this.y > ROOM_Y + ROOM_H) {
            this.state = 'follow';
            this.act = 0;
          }
        } else {
          this.follow(dt);
          if (tick) {
            const e = nearestEnemy(this.x, this.y, this.def.range || 420);
            if (e) {
              this.rollA = angleTo(this.x, this.y, e.x, e.y);
              this.facing = Math.cos(this.rollA) > 0 ? 1 : -1;
              this.rolled = new Set();
              this.rollT = this.def.rollTime || 0.8;
              this.state = 'roll';
              AudioEngine.trapSaw && AudioEngine.trapSaw({ intensity: 0.3 });
            }
          }
        }
        break;
      }
      /* --- guetteur : désigne une cible, qui encaisse davantage tant qu'elle est marquée. Avec `markCrit`, chaque
         coup du joueur sur la cible marquée est un coup critique. La marque se voit : un anneau à ses pieds et un
         losange au-dessus de sa tête (renderMark). --- */
      case 'mark': {
        this.follow(dt);
        if (this.target && (this.target.dead || this.target.markUntil <= Time.now)) this.target = null;
        if (tick) {
          const e = nearestEnemy(this.x, this.y, this.def.range || 420, x => x !== this.target);
          const t = e || nearestEnemy(this.x, this.y, this.def.range || 420);
          if (t) {
            t.markUntil = Time.now + (this.def.markTime || 4);
            t.markMul = this.def.markMul || 1.3;
            t.markCrit = !!this.def.markCrit;
            t.markColor = this.color;
            this.target = t;
            this.act = 1;
            Particles.spawn(t.x, t.y - 24, { count: 6, color: this.color, glow: true, speedMax: 60, life: 0.6, size: 2 });
          }
        }
        break;
      }
      /* --- abeille : tourne autour de l'ennemi le plus proche et pique sans relâche --- */
      case 'sting': {
        const e = nearestEnemy(this.x, this.y, this.def.range || 300);
        if (!e) {
          this.follow(dt, 1.2);
          break;
        }
        const R = this.def.orbit || 26;
        const a = this.t * (this.def.spin || 5);
        const tx = e.x + Math.cos(a) * (e.r + R),
          ty = e.y + Math.sin(a) * (e.r + R);
        const sp = this.def.speed || 420;
        const d = dist(this.x, this.y, tx, ty);
        if (d > 2) {
          const ang = angleTo(this.x, this.y, tx, ty);
          const step = Math.min(sp * dt, d);
          this.x += Math.cos(ang) * step;
          this.y += Math.sin(ang) * step;
        }
        this.facing = Math.cos(a) > 0 ? 1 : -1;
        this.moving = true;
        /* la piqûre porte jusqu'au rayon d'orbite : sinon l'abeille tourne juste au-delà de sa propre portée */
        if (tick && dist(this.x, this.y, e.x, e.y) < e.r + R + 10) {
          Combat.hitEnemy(e, this.dmg(), { x: this.x, y: this.y, knockback: 0.2, silent: true, noCrit: true });
          Particles.spawn(this.x, this.y, { count: 3, color: this.color, speedMax: 80, life: 0.25, size: 2 });
          this.act = 1;
        }
        break;
      }
      /* --- crapaud : soigne sur le temps fort --- */
      case 'mend': {
        this.follow(dt);
        if (tick && pl.hp < pl.stats.maxHp && !pl.dead) {
          const h = this.def.heal || 4;
          pl.heal(h);
          this.act = 1;
          Floaters.add(pl.x, pl.y - 34, '+' + h, '#7fff9a', 13);
          Particles.spawn(this.x, this.y - 8, { count: 4, color: '#7fff9a', glow: true, speedMax: 70, life: 0.5, size: 2 });
        }
        break;
      }
      default:
        this.follow(dt);
    }
    const mx = this.x - this.px,
      my = this.y - this.py;
    if (Math.abs(mx) + Math.abs(my) > 0.15) {
      const k = Math.min(1, dt * 12);
      this.dx += (mx - this.dx) * k;
      this.dy += (my - this.dy) * k;
    }
    this.animStep(dt, Math.abs(mx) + Math.abs(my) > 0.3);
  }
  /* Clip du compagnon, par priorité : sonné, en train d'agir, en marche, au repos. Un compagnon qui n'a que
     « repos » et « marche » retombe dessus sans rien casser — c'est le cas le plus fréquent. */
  animStep(dt, moving) {
    const a = this.def.anim;
    if (!a) return;
    let want = 'idle';
    if (this.down && a.hurt) want = 'hurt';
    else if (this.act > 0.35 && a.attack) want = 'attack';
    else if (moving && a.walk) want = 'walk';
    if (want !== this.clip) {
      this.clip = want;
      this.clipT = 0;
    } else this.clipT += dt;
  }
  feetY() {
    return this.y + Sprites.SOL;
  }
  render(ctx) {
    const s = this.def.size || 48;
    const lift = this.airborne ? 15 : 0;
    const bob = this.moving ? Math.abs(Math.sin(this.t * (this.airborne ? 16 : 11))) * 3.5 : Math.sin(this.t * 3) * 2;
    const a = this.def.anim;
    const planche = a && a[this.clip] && Sprites.sheetInfo(a[this.clip]);
    /* vue affichée : celle du déplacement réel. Une planche n'a qu'un profil, retourné vers l'ouest. */
    const dv = planche ? { dir: 'e', flip: this.dx < 0 } : Sprites.dirFrom(this.dx, this.dy);
    const sprite = Sprites.pickDir(this.def.sprite, dv.dir);
    /* Une seule ligne de sol pour tout le monde, planche ou image : celle du joueur (Sprites.SOL). */
    const sol = Sprites.SOL;
    if (this.fetching && !this.down) this.renderReach(ctx, sol);
    if (this.target && this.target.markUntil > Time.now && !this.target.dead) this.renderMark(ctx, this.target);
    ctx.save();
    ctx.globalAlpha = this.down ? 0.15 : 0.32;
    ctx.fillStyle = '#05070c';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + sol, s * 0.28, s * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    const pop = 1 + this.act * 0.22;
    if (planche) {
      const cf = Sprites.CLIPS[this.clip] || Sprites.CLIPS.idle;
      const inf = planche;
      let f = Math.floor(this.clipT * cf.fps);
      f = cf.once ? Math.min(f, inf.n - 1) : f % inf.n;
      Sprites.drawSheet(ctx, a[this.clip], f, this.x, this.y + sol - lift, s * pop, {
        foot: true,
        flip: dv.flip,
        alpha: this.down ? 0.5 : 1,
      });
      this.renderTags(ctx, s, lift);
      return;
    }
    const opts = { flip: dv.flip, rot: this.down ? 1.4 : 0, alpha: this.down ? 0.5 : 1 };
    /* image fixe : dessinée centrée, donc remontée d'une demi-taille pour que son bas touche la ligne de sol */
    const cy = this.y + sol - (s * pop) / 2 - bob - lift;
    if (!Sprites.drawProp(ctx, sprite, this.x, cy, s * pop, s * pop, opts)) {
      ctx.save();
      ctx.globalAlpha = this.down ? 0.5 : 1;
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.x, this.y + sol - s * 0.24 - bob - lift, s * 0.24, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    this.renderTags(ctx, s, lift);
  }
  /* rapporteur en course : sa portée d'aimant, un anneau au sol qui respire */
  renderReach(ctx, sol) {
    const reach = this.def.reach || 140;
    ctx.save();
    ctx.globalAlpha = 0.18 + Math.sin(this.t * 6) * 0.06;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + sol, reach, reach * 0.42, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  /* guetteur : la cible marquée porte un anneau aux pieds et un losange au-dessus de la tête, aux couleurs du compagnon */
  renderMark(ctx, t) {
    const left = Math.max(0, t.markUntil - Time.now);
    const pulse = 0.5 + Math.sin(this.t * 9) * 0.5;
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.55 + pulse * 0.3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(t.x, t.y + t.r * 0.8, t.r + 8 + pulse * 3, (t.r + 8 + pulse * 3) * 0.4, 0, 0, TAU);
    ctx.stroke();
    const y = t.y - t.r - 22 - pulse * 4;
    ctx.beginPath();
    ctx.moveTo(t.x, y - 7);
    ctx.lineTo(t.x + 6, y);
    ctx.lineTo(t.x, y + 7);
    ctx.lineTo(t.x - 6, y);
    ctx.closePath();
    ctx.fill();
    if (left < 1.2) {
      ctx.globalAlpha = 0.5;
      ctx.fillRect(t.x - 8, y + 10, 16 * (left / 1.2), 2);
    }
    ctx.restore();
  }
  /* halo d'action et barre de vie, communs au dessin fixe et à la planche animée */
  renderTags(ctx, s, lift) {
    if (this.act > 0.05 && !this.down && !this.def.anim) {
      ctx.save();
      ctx.globalAlpha = this.act * 0.7;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y - lift, s * 0.4 + (1 - this.act) * 10, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    if (this.maxHp && this.hp < this.maxHp && !this.down) {
      const w = 26;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(this.x - w / 2, this.y - s * 0.55 - lift, w, 3);
      ctx.fillStyle = '#7fff9a';
      ctx.fillRect(this.x - w / 2, this.y - s * 0.55 - lift, w * (this.hp / this.maxHp), 3);
      ctx.restore();
    }
  }
}

const Pets = {
  /* donne un compagnon (remplace celui en cours) */
  /* Un choix de compagnon peut en amener deux : `def.duo` nomme l'inséparable, qui arrive avec le premier et
     s'en va avec lui. Ils comptent pour une seule place — c'est un attelage, pas deux compagnons. */
  give(id, silent, mode) {
    const def = Content.pet(id);
    if (!def) return null;
    G.pets = [new Pet(def)];
    /* Parti sans animal, le joueur gardait sa part (+12 % dégâts, +20 PV) : un compagnon ramassé en route l'annule. */
    if (G.player) G.player.buffs = G.player.buffs.filter(b => b.id !== 'solo');
    if (def.duo) {
      const d2 = Content.pet(def.duo);
      if (d2) G.pets.push(new Pet(d2));
    }
    Pets.setMode(mode || (Meta.profile.petMode === 'call' ? 'call' : 'always'));
    Pets.applyPair();
    if (!silent) {
      UI.banner(Pets.title(def), def.color || '#9fd8ff', def.desc);
      AudioEngine.levelUp({ intensity: 0.5 });
    }
    return G.pets[0];
  },
  /* nom affiché : celui de l'attelage quand il y en a un */
  title(def) {
    return (def && (def.duoName || def.name)) || 'Compagnon';
  },
  setMode(m) {
    for (const p of G.pets) {
      p.mode = PET_MODES[m] ? m : 'always';
      if (p.mode === 'call') {
        p.away = true;
        p.cdT = 0;
        p.callT = 0;
        p.boost = 1;
      } else {
        p.away = false;
        p.boost = 1;
      }
    }
  },
  /* bonus d'équipe : appliqué à l'animal, et posé sur le joueur comme un buff de run */
  applyPair() {
    const pl = G.player;
    if (!G.pets.length || !pl || !G.run) return;
    const pr = Content.pairOf(G.run.char && G.run.char.id, G.pets[0].id);
    for (const p of G.pets) {
      p.pairMul = 1;
      p.pair = null;
    }
    pl.buffs = pl.buffs.filter(b => b.id !== 'pair');
    if (!pr) return;
    for (const p of G.pets) {
      p.pair = pr;
      p.pairMul = pr.petDamageMul || 1;
    } // le bonus vaut pour tout l'attelage
    if (pr.mods && pr.mods.length) pl.addBuff('pair', 1e6, pr.mods, false); // toute la run : `true` le ferait sauter au changement de salle
    UI.toast('Équipe : ' + pr.name);
  },
  clear() {
    G.pets = [];
  },
  update(dt) {
    if (!G.pets.length || !G.player || !G.room) return;
    const appel = Input.wasPressed('pet');
    for (const p of G.pets) {
      if (appel && p.mode === 'call' && p.away && p.cdT <= 0) p.call();
      p.update(dt);
    }
  },
  render(ctx) {
    for (const p of G.pets) if (!p.hidden()) p.render(ctx);
  },
  /* Vignette d'un compagnon : la première image de sa planche de repos s'il en a une, sinon son accessoire.
     Un animal animé n'a pas d'accessoire à son nom — sans ce détour, son badge n'affichait qu'une pastille. */
  icon(ctx, p, x, y, size, alpha) {
    const a = p.def.anim;
    if (a && a.idle && Sprites.sheetInfo(a.idle)) return Sprites.drawSheet(ctx, a.idle, 0, x, y, size, { alpha });
    return Sprites.drawProp(ctx, Sprites.pickDir(p.def.sprite, 's'), x, y, size, size, { alpha });
  },
  /* dégâts pris par un compagnon qui attire les coups */
  hurt(d) {
    for (const p of G.pets)
      if (!p.hidden()) {
        p.hurt(d);
        return;
      }
  },
  /* mode « à l'appel » : jauge de présence ou de repos, avec la touche à presser */
  renderCall(ctx, p) {
    const V = Engine.view;
    const x = -V.ox + 18,
      y = -V.oy + V.h - 98; // même bord gauche et même largeur que le cartouche d'arme, juste au-dessus
    const m = PET_MODES.call;
    const pret = p.away && p.cdT <= 0;
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,18,.72)';
    UI.roundRect(ctx, x, y, 420, 30, 8);
    ctx.fill();
    if (!Pets.icon(ctx, p, x + 22, y + 15, 24, p.away ? 0.35 : 1)) {
      ctx.globalAlpha = p.away ? 0.35 : 1;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x + 22, y + 15, 7, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = pret ? '#7fff9a' : '#e8ecf7';
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(Pets.title(p.def), x + 40, y + 15);
    ctx.fillStyle = pret ? '#7fff9a' : '#9aa4c4';
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(
      pret ? 'C : appeler' : p.away ? 'repos ' + Math.ceil(p.cdT) + ' s' : 'présent ' + Math.ceil(p.callT) + ' s',
      x + 175,
      y + 15
    );
    const k = p.away ? (p.cdT > 0 ? 1 - p.cdT / m.cd : 1) : p.callT / m.dur;
    ctx.fillStyle = '#12203a';
    ctx.fillRect(x + 340, y + 12, 70, 6);
    ctx.fillStyle = pret ? '#7fff9a' : p.away ? '#6ee7ff' : '#ffd166';
    ctx.fillRect(x + 340, y + 12, 70 * clamp(k, 0, 1), 6);
    ctx.restore();
  },
  /* badge du compagnon, au-dessus de la ligne arme/compétence */
  renderHud(ctx) {
    const p = G.pet;
    if (!p) return;
    if (p.mode === 'call') return Pets.renderCall(ctx, p);
    const nom = Pets.title(p.def);
    const V = Engine.view;
    const x = -V.ox + 18,
      y = -V.oy + V.h - 98; // même bord gauche et même largeur que le cartouche d'arme, juste au-dessus
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,18,.72)';
    UI.roundRect(ctx, x, y, 420, 30, 8);
    ctx.fill();
    if (!Pets.icon(ctx, p, x + 22, y + 15, 24, p.down ? 0.4 : 1)) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x + 22, y + 15, 7, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = p.down ? '#8a93ad' : '#e8ecf7';
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(nom, x + 40, y + 15);
    ctx.fillStyle = '#9aa4c4';
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(p.down ? 'sonné — ' + Math.ceil(p.downT) + ' s' : p.def.tag || '', x + 175, y + 15);
    /* la vie d'un compagnon qui en a : dans le badge, plus seulement au-dessus de sa tête */
    if (p.maxHp) {
      ctx.fillStyle = '#12203a';
      ctx.fillRect(x + 340, y + 12, 70, 6);
      ctx.fillStyle = p.down ? '#8a93ad' : '#7fff9a';
      ctx.fillRect(x + 340, y + 12, 70 * clamp(p.hp / p.maxHp, 0, 1), 6);
    }
    ctx.restore();
  },
};
