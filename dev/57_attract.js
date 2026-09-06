/* =========================================================================
   SUJET NEUF — 57_attract.js
   Scène d'attraction : derrière le menu et le hub, le sujet (piloté par le bot, invulnérable) combat
   des vagues d'ennemis des deux biomes, en changeant d'arme régulièrement. Utilise le vrai moteur.
   ========================================================================= */

const Attract = (() => {
  let running = false, spawnT = 0, weaponT = 0, savedVol = null, savedInvuln = false, wIdx = 0;
  const WEAPONS = ['weapon_pistol', 'weapon_chain', 'weapon_boomerang', 'weapon_flame', 'weapon_bow', 'weapon_blade', 'weapon_orb', 'weapon_hammer'];
  const SHOW_UPGRADES = ['upg_balles_incendiaires', 'upg_balles_electriques', 'upg_satellite', 'upg_detonation', 'upg_tir_guide'];
  function pool() { const out = []; for (const b of Content.biomes()) for (const id of b.enemyPool) out.push(id); return out; }
  function start() {
    if (running || G.state === 'run') return; running = true;
    G.attract = true;   // ne change pas de profil : rien n'est sauvegardé pendant l'attraction
    RNG.reseed((Date.now() & 0xffff) | 1);
    const charDef = Content.characters()[Math.floor(VFX_RNG() * Content.characters().length)];
    const biome = Content.biomes()[0];
    G.run = { biome, char: charDef, rooms: [], roomIndex: 0, levelPassive: null, level: 1, xp: 0, xpNext: 1e9, upgrades: [], pendingLevelUps: 0, rerolls: 0, scores: [], coinsPending: 0, coinsValidated: 0, lastCheckpoint: 0, startedAt: Time.now, ended: false,
      stats: { kills: 0, damageDealt: 0, damageTaken: 0, hitsTaken: 0, shots: 0, skillUses: 0, coins: 0, roomsEntered: 0, roomTimes: [], bossKilled: false, deathCause: null, deathRoom: null, levelReached: 1 }, skillChoices: [], attract: true };
    G.player = new Player(charDef); G.player.hp = 0; G.player.recompute(); G.player.hp = G.player.stats.maxHp;
    applyDifficulty();
    G.enemies = []; Projectiles.list = []; Pickups.list = []; Particles.list = []; Floaters.list = [];
    G.room = Room.create({ id: 'room_attract', biome: biome.id, index: 0, type: 'PREP_COMBAT', refTime: 999, obstacles: [{ x: 5, y: 3, w: 1, h: 1 }, { x: 18, y: 3, w: 1, h: 1 }, { x: 5, y: 9, w: 1, h: 1 }, { x: 18, y: 9, w: 1, h: 1 }], waves: [], traps: [], fragments: [], modular: [] });
    G.room.state = 'fight'; G.room.label = ''; G.room.doorOpen = false;
    G.player.x = W / 2; G.player.y = H / 2; Camera.setZoom(1.12); Camera.snap(G.player.x, G.player.y);
    wIdx = Math.floor(VFX_RNG() * WEAPONS.length); equip();
    for (const id of SHOW_UPGRADES) { const u = Content.upgrade(id); if (u) G.run.upgrades.push({ def: u, stacks: 1 }); }
    G.player.recompute();
    G.player.bot = Debug.botControl;
    savedInvuln = G.debug.invuln; G.debug.invuln = true;
    savedVol = Object.assign({}, Meta.profile.volume); AudioEngine.setVolume(Object.assign({}, savedVol, { sfx: savedVol.sfx * 0.35 }));
    spawnT = 0.5; weaponT = 18;
  }
  function equip() { const w = Content.weapon(WEAPONS[wIdx % WEAPONS.length]); const sk = Content.skills()[Math.floor(VFX_RNG() * Content.skills().length)]; G.player.weapon = w; G.player.skill = sk; G.player.skillCharges = 1; G.player.orbs = null; G.player.recompute(); }
  function spawn() {
    const alive = G.enemies.filter(e => !e.dead).length; if (alive >= 7) return;
    const ids = pool(); const n = 2 + Math.floor(VFX_RNG() * 3);
    for (let i = 0; i < n; i++) { const def = Content.enemy(ids[Math.floor(VFX_RNG() * ids.length)]); if (!def || def.archetype === 'summoner') continue; Room.spawnAt({ enemy: def.id, count: 1, x: -1, y: -1, elite: VFX_RNG() < 0.15 }); }
  }
  function update(dt) {
    if (!running || !G.run || !G.run.attract) return;
    spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = 4 + VFX_RNG() * 3; }
    weaponT -= dt; if (weaponT <= 0) { wIdx++; equip(); weaponT = 16 + VFX_RNG() * 8; }
    if (G.player.hp < G.player.stats.maxHp * 0.5) G.player.hp = G.player.stats.maxHp;
    if (Pickups.list.length > 60) Pickups.list.splice(0, Pickups.list.length - 60);
    Run.update(dt);
    Camera.follow(G.player.x, G.player.y, dt);
  }
  function stop() {
    if (!running) return; running = false; G.attract = false;
    G.debug.invuln = savedInvuln; if (savedVol) AudioEngine.setVolume(savedVol);
    G.run = null; G.player = null; G.enemies = []; G.room = null; Projectiles.list = []; Pickups.list = []; Particles.list = []; Floaters.list = [];
    Camera.setZoom(Meta.profile.zoom || (Touch.active ? 1.5 : 1));
  }
  return { start, stop, update, get running() { return running; } };
})();
