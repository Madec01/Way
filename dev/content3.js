/* =========================================================================
   WAY — content3.js — Biome 3 : LA CONCESSION (niveau 3, western). Une mine abandonnée en plein désert.
   Coyotes, bandits, bisons, barils de poudre, croque-morts, scorpions, crotales ; boss « le Marshal ».
   Décor : cactus, rochers, tonneaux, caisses, chariots (icônes game-icons.net rastérisées en pixels, voir Sprites.props).
   ========================================================================= */

CONTENT.biomes.push({
  id: 'biome_3', name: 'LA CONCESSION', order: 3, tagline: 'Une mine abandonnée en plein désert : bandits, bêtes, dynamite et wagonnets fous. Le niveau des durs.',
  desc: 'Niveau 3. La concession minière au bout de la piste : rails rouillés, poudrière éventrée, saloon vide. Ce qui vit ici a appris à survivre au soleil et aux hommes. Taux de perte : 91 %.',
  palette: { tint: 'rgba(210,150,60,.30)', neon: ['#ffb347', '#ff6b3c'], wall: 'rgba(120,70,30,.42)', sand: true },
  levelPassives: [
    { bonus: { name: 'Gâchette rapide', desc: '+15 % cadence de tir.', mods: [{ stat: 'fireRate', mul: 1.15 }], hooks: {} }, malus: { name: 'Soleil de plomb', desc: '-15 % PV max.', mods: [{ stat: 'maxHp', mul: 0.85 }], hooks: {} } },
    { bonus: { name: 'Prime de chasse', desc: '+50 % pièces, +10 % XP.', mods: [{ stat: 'coinGain', mul: 1.5 }, { stat: 'xpGain', mul: 1.1 }], hooks: {} }, malus: { name: 'Sable mouvant', desc: 'Pièges +50 % de dégâts, -8 % vitesse.', mods: [{ stat: 'trapDamageMul', mul: 1.5 }, { stat: 'speed', mul: 0.92 }], hooks: {} } },
    { bonus: { name: 'Sang-froid', desc: '+15 % dégâts.', mods: [{ stat: 'damage', mul: 1.15 }], hooks: {} }, malus: { name: 'Fièvre', desc: 'Invulnérabilité après un coup -0,2 s.', mods: [{ stat: 'invulnTime', add: -0.2 }], hooks: {} } },
  ],
  enemyPool: ['enemy_coyote', 'enemy_bandit', 'enemy_bison', 'enemy_baril', 'enemy_croquemort', 'enemy_scorpions', 'enemy_crotale'],
  trapPool: ['trap_moulin', 'trap_wagonnet', 'trap_embuscade', 'trap_poudre', 'trap_ours', 'trap_dynamite', 'trap_barbeles'],
  miniboss: 'boss_marshal',
  difficulty: { hpMul: 1.55, damageMul: 1.35, speedMul: 1.12 },
  unlockAfter: 'biome_2',
});

CONTENT.enemies.push(
  { id: 'enemy_coyote', name: 'Coyote', archetype: 'rusher', desc: 'Chasse en meute, ruée courte et rapide, revient vite à la charge.', hp: 52, speed: 235, damage: 12, radius: 14, xp: 7, coins: 2, color: '#d8a25a', sprite: 'enemy_rusher3',
    behavior: { lungeRange: 120, lungeWindup: 0.28, lungeSpeed: 640, lungeDuration: 0.28, lungeCooldown: 1.1 }, telegraph: { time: 0.28, color: '#ffd9a0' } },
  { id: 'enemy_bandit', name: 'Bandit', archetype: 'shooter', desc: 'Tire deux balles rapides puis se replie derrière un obstacle.', hp: 44, speed: 150, damage: 9, radius: 14, xp: 9, coins: 4, color: '#8a5a3a', projColor: '#ffe08a', sprite: 'enemy_shooter3',
    behavior: { fireRate: 0.9, projSpeed: 420, projDamage: 10, projSize: 6, keepDistance: 340, aimTime: 0.4, burst: 2, spread: 0.15 }, telegraph: { time: 0.4, color: '#ffe08a' } },
  { id: 'enemy_bison', name: 'Bison', archetype: 'tank', desc: 'Charge de loin, très lourd, sonné 1 s contre un mur.', hp: 300, speed: 90, damage: 18, radius: 28, xp: 22, coins: 6, color: '#6b4a2a', sprite: 'enemy_tank3',
    behavior: { chargeRange: 380, chargeWindup: 0.7, chargeSpeed: 680, chargeDuration: 0.9, chargeCooldown: 2.6, stunOnWallHit: 1.0, chargeDamageMul: 1.6 }, telegraph: { time: 0.7, color: '#ffd166' } },
  { id: 'enemy_baril', name: 'Baril de poudre', archetype: 'kamikaze', desc: 'Roule vers vous et explose. Explose aussi quand on le tue.', hp: 26, speed: 250, damage: 6, radius: 13, xp: 7, coins: 2, color: '#c0392b', sprite: 'enemy_kamikaze3',
    behavior: { fuse: 0.75, radius: 105, explosionDamage: 30, triggerRange: 70, explodeOnDeath: true }, telegraph: { time: 0.75, color: '#ff9a3c' } },
  { id: 'enemy_croquemort', name: 'Croque-mort', archetype: 'summoner', desc: 'Reste loin et lâche des scorpions par paquets de 3, jusqu\'à 6.', hp: 120, speed: 70, damage: 8, radius: 20, xp: 26, coins: 7, color: '#2a2a3a', sprite: 'enemy_summoner3',
    behavior: { summon: 'enemy_scorpions', every: 3.2, max: 6, count: 3, keepDistance: 380, summonWindup: 0.6 }, telegraph: { time: 0.6, color: '#c9a3ff' } },
  { id: 'enemy_scorpions', name: 'Scorpions', archetype: 'swarm', desc: 'Nuée de 5, piqûre rapide.', hp: 11, speed: 310, damage: 6, radius: 8, xp: 3, coins: 1, color: '#3a2a1a', sprite: 'enemy_swarm3',
    behavior: { groupSize: 5, jitter: 50, biteWindup: 0.18, biteCooldown: 0.65 }, telegraph: { time: 0.18, color: '#ffb347' } },
  { id: 'enemy_crotale', name: 'Crotale', archetype: 'dasher', desc: 'Sonne, puis fond sur vous d\'un coup. Longue pause après.', hp: 60, speed: 180, damage: 15, radius: 14, xp: 13, coins: 4, color: '#9a9a3a', sprite: 'enemy_dasher3',
    behavior: { blinkRange: 320, blinkWindup: 0.45, blinkCooldown: 1.6, dashSpeed: 820, dashDuration: 0.3, postDashPause: 0.6 }, telegraph: { time: 0.45, color: '#e8ff8a' } },
);

CONTENT.traps.push(
  { id: 'trap_moulin', name: 'Moulin', kind: 'laser_rotate', desc: '3 pales de bois de 5 tuiles tournent (1,3 rad/s). Pause de 1 s tous les 6 s.', damage: 14, telegraph: 1.0, period: 6.0, active: 5.0, color: '#d8b46a',
    params: { arms: 3, lengthTiles: 5, angularSpeed: 1.3, startAngle: 0, thickness: 0.45 } },
  { id: 'trap_wagonnet', name: 'Wagonnet fou', kind: 'saw_rail', desc: 'Wagonnet de mine qui fait des allers-retours sur 8 tuiles de rails à 6 tuiles/s.', damage: 22, telegraph: 0.4, period: 3.2, active: 3.2, color: '#9a8a6a',
    params: { axis: 'x', lengthTiles: 8, speedTiles: 6, pingpong: true, radiusTiles: 0.65, hitOnce: true } },
  { id: 'trap_embuscade', name: 'Tireur embusqué', kind: 'turret_fixed', desc: 'Depuis le mur : 0,7 s de visée puis 1 balle vers vous toutes les 2,2 s.', damage: 11, telegraph: 0.7, period: 2.2, active: 0.3, color: '#ffe08a',
    params: { mode: 'aim', angle: 0, projSpeed: 400, count: 1, spread: 0, projSize: 6 } },
  { id: 'trap_poudre', name: 'Nuage de poudre', kind: 'gas_zone', desc: 'Une bouche siffle 1,2 s puis libère un nuage de poussière de poudre 3 s : 10 dégâts/s et -30 % vitesse.', damage: 10, telegraph: 1.2, period: 7.0, active: 3.0, color: '#d9c39a',
    params: { radiusTiles: 2.5, tickRate: 4, slow: 0.3, dps: true } },
  { id: 'trap_ours', name: 'Pièges à ours', kind: 'spike_tiles', desc: 'Damier de mâchoires : les cases paires claquent 0,8 s, puis les impaires.', damage: 12, telegraph: 0.5, period: 2.6, active: 0.8, color: '#c9c0b0',
    params: { pattern: 'checker', groups: 2, hitOnce: true } },
  { id: 'trap_dynamite', name: 'Dynamite', kind: 'wall_fireball', desc: 'Un bâton de dynamite est lancé tout droit toutes les 2,5 s.', damage: 15, telegraph: 0.6, period: 2.5, active: 0.2, color: '#ff6b3c',
    params: { dir: 'down', projSpeed: 330, size: 12, count: 1, lifetime: 3.0 } },
  { id: 'trap_barbeles', name: 'Barbelés', kind: 'laser_grid', desc: 'Fils barbelés tendus tous les 4 tuiles, alternés. 1 s tendu, 2 s au sol.', damage: 12, telegraph: 0.5, period: 3.0, active: 1.0, color: '#b0774a',
    params: { spacingTiles: 4, alternate: true, thickness: 0.3 } },
);

CONTENT.bosses.push({
  id: 'boss_marshal', name: 'Étalon 19, dit « le Marshal »', subtitle: 'Il a nettoyé la concession. Il ne reste que vous.',
  desc: 'Le gardien de la mine. Six coups dans le barillet, une charge de bête et de la dynamite plein les poches. Quand il recharge, il est à vous.',
  hp: 3000, speed: 135, radius: 36, damage: 22, xp: 220, coins: 80, color: '#e0b060', sprite: 'boss3',
  phases: [
    { hpBelow: 1, patterns: [
      { kind: 'fan', telegraph: 0.6, duration: 0.5, cooldown: 2.4, count: 6, spread: 0.9, projSpeed: 380, projDamage: 16, projSize: 7, color: '#ffe08a', label: 'BARILLET' },
      { kind: 'charge', telegraph: 0.8, duration: 0.8, cooldown: 4.5, speed: 720, damage: 26, stunTime: 1.2, label: 'TACLE' },
      { kind: 'slam', telegraph: 1.0, duration: 0.4, cooldown: 5.5, radius: 160, damage: 30, color: '#ff6b3c', label: 'DYNAMITE' },
      { kind: 'summon', telegraph: 0.8, duration: 0.5, cooldown: 8, enemy: 'enemy_coyote', count: 2, label: 'MEUTE' },
    ] },
    { hpBelow: 0.55, patterns: [
      { kind: 'ring', telegraph: 0.6, duration: 0.3, cooldown: 3, count: 12, projSpeed: 300, projDamage: 15, projSize: 8, color: '#ffe08a', label: 'TIR EN ROND' },
      { kind: 'laser_sweep', telegraph: 1.0, duration: 2.2, cooldown: 7, length: 700, damage: 22, color: '#d8b46a', label: 'LASSO' },
      { kind: 'charge', telegraph: 0.6, duration: 0.8, cooldown: 4, speed: 800, damage: 28, stunTime: 1.2, label: 'TACLE' },
      { kind: 'fan', telegraph: 0.5, duration: 0.5, cooldown: 2.2, count: 8, spread: 1.3, projSpeed: 400, projDamage: 15, projSize: 7, color: '#ffe08a', label: 'BARILLET' },
      { kind: 'summon', telegraph: 0.8, duration: 0.5, cooldown: 9, enemy: 'enemy_baril', count: 2, label: 'POUDRE' },
    ] },
  ],
  weakness: { desc: 'Après chaque attaque il recharge : dégâts ×1,8 pendant 1 s.', rule: 'during_reload', damageMul: 1.8, window: 1.0 },
  revenge: { hpMul: 1.35, window: 0.7, name: 'Étalon 19 / rév. B', phaseText: 'DONNÉES CHARGÉES', mimic: true,
    extraPhases: [ { hpBelow: 0.3, patterns: [
      { kind: 'spiral', telegraph: 0.6, duration: 3, cooldown: 5, arms: 3, rate: 14, angularSpeed: 2.6, projSpeed: 260, projDamage: 14, projSize: 7, color: '#ffe08a', label: 'MITRAILLE' },
      { kind: 'ring', telegraph: 0.5, duration: 1.2, cooldown: 2.5, count: 14, rate: 3, rotate: 0.35, projSpeed: 320, projDamage: 16, projSize: 8, color: '#ffe08a' },
      { kind: 'charge', telegraph: 0.45, duration: 0.7, cooldown: 3, speed: 900, damage: 32, stunTime: 0.8, label: 'TACLE' },
    ] } ],
    desc: 'Salle 9 : rév. B, PV ×1,35, recharge plus courte (0,7 s), phase 3 sous 30 %.' },
});

/* Salles du biome 3. Obstacles avec `kind` : cactus, rock, barrel, crate, wagon, cart, barrels, skull (dessinés par Sprites.drawBlock). */
CONTENT.rooms.push(
  { id: 'room_b3_1', biome: 'biome_3', index: 1, type: 'PREP_COMBAT', refTime: 60,
    obstacles: [ { x: 5, y: 2, w: 1, h: 2, kind: 'cactus' }, { x: 18, y: 2, w: 1, h: 2, kind: 'cactus' }, { x: 5, y: 9, w: 1, h: 2, kind: 'cactus' }, { x: 18, y: 9, w: 1, h: 2, kind: 'cactus' }, { x: 11, y: 6, w: 2, h: 1, kind: 'wagon' } ],
    deco: [ { x: 2, y: 11, kind: 'skull' }, { x: 21, y: 1, kind: 'tumbleweed' }, { x: 9, y: 1, kind: 'rails' }, { x: 10, y: 1, kind: 'rails' }, { x: 11, y: 1, kind: 'rails' } ],
    waves: [
      { at: 'start', spawns: [ { enemy: 'enemy_coyote', count: 2, x: 20, y: 3 }, { enemy: 'enemy_coyote', count: 2, x: 20, y: 9 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_coyote', count: 3, x: -1, y: -1 }, { enemy: 'enemy_bandit', count: 1, x: 21, y: 6 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_baril', count: 2, x: 21, y: 2 }, { enemy: 'enemy_bandit', count: 2, x: 21, y: 10 }, { enemy: 'enemy_coyote', count: 2, x: 2, y: 1 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_coyote', count: 1, x: -1, y: -1, elite: true }, { enemy: 'enemy_crotale', count: 1, x: 12, y: 1 }, { enemy: 'enemy_coyote', count: 2, x: 2, y: 11 }, { enemy: 'enemy_bandit', count: 1, x: 21, y: 6 } ] },
    ], traps: [], fragments: [], modular: [] },
  { id: 'room_b3_2', biome: 'biome_3', index: 2, type: 'COMBAT_CHALLENGE', refTime: 80,
    obstacles: [ { x: 6, y: 4, w: 1, h: 1, kind: 'rock' }, { x: 17, y: 4, w: 1, h: 1, kind: 'rock' }, { x: 6, y: 8, w: 1, h: 1, kind: 'barrel' }, { x: 17, y: 8, w: 1, h: 1, kind: 'barrel' } ],
    deco: [ { x: 12, y: 2, kind: 'skull' }, { x: 3, y: 6, kind: 'tumbleweed' } ],
    waves: [
      { at: 'start', spawns: [ { enemy: 'enemy_coyote', count: 3, x: 20, y: 4 }, { enemy: 'enemy_bandit', count: 1, x: 21, y: 8 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_baril', count: 2, x: 21, y: 2 }, { enemy: 'enemy_coyote', count: 2, x: -1, y: -1 }, { enemy: 'enemy_crotale', count: 1, x: 2, y: 11 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_bandit', count: 2, x: 21, y: 6 }, { enemy: 'enemy_coyote', count: 3, x: -1, y: -1 }, { enemy: 'enemy_scorpions', count: 1, x: 12, y: 1 } ] },
    ], traps: [], fragments: [], modular: [] },
  { id: 'room_b3_3', biome: 'biome_3', index: 3, type: 'COMBAT_TRAP', refTime: 90,
    obstacles: [ { x: 4, y: 3, w: 2, h: 1, kind: 'crate' }, { x: 4, y: 9, w: 2, h: 1, kind: 'crate' }, { x: 18, y: 3, w: 1, h: 2, kind: 'cactus' }, { x: 18, y: 8, w: 1, h: 2, kind: 'cactus' } ],
    deco: [ { x: 1, y: 11, kind: 'skull' }, { x: 22, y: 1, kind: 'tumbleweed' } ],
    waves: [
      { at: 'start', spawns: [ { enemy: 'enemy_coyote', count: 4, x: 20, y: 6 }, { enemy: 'enemy_bandit', count: 2, x: 21, y: 2 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_bison', count: 1, x: 21, y: 6 }, { enemy: 'enemy_coyote', count: 3, x: -1, y: -1 }, { enemy: 'enemy_baril', count: 2, x: 2, y: 11 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_baril', count: 3, x: 2, y: 1 }, { enemy: 'enemy_bandit', count: 3, x: 21, y: 10 }, { enemy: 'enemy_scorpions', count: 1, x: 21, y: 2 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_crotale', count: 2, x: 21, y: 6 }, { enemy: 'enemy_coyote', count: 3, x: -1, y: -1 }, { enemy: 'enemy_bison', count: 1, x: 12, y: 11, elite: true } ] },
    ],
    traps: [
      { trap: 'trap_moulin', x: 11, y: 6, phase: 0 },
      { trap: 'trap_ours', x: 1, y: 1, w: 3, h: 3, phase: 0 }, { trap: 'trap_ours', x: 20, y: 9, w: 3, h: 3, phase: 1 },
      { trap: 'trap_embuscade', x: 7, y: 0, phase: 0 }, { trap: 'trap_embuscade', x: 16, y: 12, phase: 1.2 },
      { trap: 'trap_poudre', x: 6, y: 6, phase: 2 },
    ], fragments: [], modular: [] },
  { id: 'room_b3_4', biome: 'biome_3', index: 4, type: 'CHEST', refTime: 20,
    obstacles: [ { x: 8, y: 4, w: 1, h: 1, kind: 'barrel' }, { x: 8, y: 8, w: 1, h: 1, kind: 'barrel' }, { x: 15, y: 4, w: 1, h: 1, kind: 'barrel' }, { x: 15, y: 8, w: 1, h: 1, kind: 'barrel' } ],
    deco: [ { x: 3, y: 2, kind: 'wanted' }, { x: 20, y: 10, kind: 'skull' } ], waves: [], traps: [], fragments: [], modular: [] },
  { id: 'room_b3_5', biome: 'biome_3', index: 5, type: 'MINIBOSS', refTime: 140,
    obstacles: [ { x: 5, y: 3, w: 2, h: 2, kind: 'rock' }, { x: 17, y: 3, w: 2, h: 2, kind: 'rock' }, { x: 5, y: 8, w: 2, h: 2, kind: 'rock' }, { x: 17, y: 8, w: 2, h: 2, kind: 'rock' }, { x: 11, y: 6, w: 2, h: 1, kind: 'wagon' } ],
    deco: [ { x: 2, y: 1, kind: 'wanted' }, { x: 21, y: 11, kind: 'skull' } ],
    waves: [ { at: 'start', spawns: [ { enemy: 'boss_marshal', count: 1, x: 18, y: 6 } ] } ],
    traps: [ { trap: 'trap_poudre', x: 3, y: 6, phase: 3 }, { trap: 'trap_poudre', x: 20, y: 6, phase: 7 } ], fragments: [], modular: [] },
  { id: 'room_b3_6', biome: 'biome_3', index: 6, type: 'COMBAT_MODULAR', refTime: 95,
    obstacles: [ { x: 11, y: 5, w: 2, h: 3, kind: 'rock' } ],
    deco: [ { x: 1, y: 1, kind: 'tumbleweed' }, { x: 22, y: 11, kind: 'skull' } ],
    waves: [
      { at: 'start', spawns: [ { enemy: 'enemy_crotale', count: 2, x: -1, y: -1 }, { enemy: 'enemy_bandit', count: 3, x: -1, y: -1 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_croquemort', count: 1, x: 21, y: 6 }, { enemy: 'enemy_coyote', count: 5, x: -1, y: -1 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_bison', count: 2, x: -1, y: -1 }, { enemy: 'enemy_baril', count: 4, x: -1, y: -1 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_crotale', count: 2, x: -1, y: -1, elite: true }, { enemy: 'enemy_bandit', count: 2, x: -1, y: -1 }, { enemy: 'enemy_scorpions', count: 2, x: -1, y: -1 } ] },
    ],
    traps: [ { trap: 'trap_embuscade', x: 0, y: 3, phase: 0 }, { trap: 'trap_embuscade', x: 23, y: 9, phase: 1 } ], fragments: [],
    modular: [
      { kind: 'slide_wall', x: 3, y: 1, w: 1, h: 5, dx: 0, dy: 6, period: 7, phase: 0 },
      { kind: 'slide_wall', x: 20, y: 7, w: 1, h: 5, dx: 0, dy: -6, period: 7, phase: 3.5 },
      { kind: 'rotor', cx: 12, cy: 6.5, arms: 3, length: 4, angularSpeed: 0.75 },
      { kind: 'floor_cycle', period: 8, telegraph: 1.5, configs: [
        [ { x: 7, y: 3, w: 1, h: 1 }, { x: 16, y: 3, w: 1, h: 1 }, { x: 7, y: 9, w: 1, h: 1 }, { x: 16, y: 9, w: 1, h: 1 }, { x: 11, y: 1, w: 2, h: 1 } ],
        [ { x: 5, y: 6, w: 2, h: 1 }, { x: 17, y: 6, w: 2, h: 1 }, { x: 9, y: 2, w: 1, h: 2 }, { x: 14, y: 9, w: 1, h: 2 } ]
      ] },
    ] },
  { id: 'room_b3_7', biome: 'biome_3', index: 7, type: 'COMBAT_TEMPO', refTime: 110,
    obstacles: [ { x: 5, y: 3, w: 1, h: 1, kind: 'barrel' }, { x: 18, y: 3, w: 1, h: 1, kind: 'barrel' }, { x: 5, y: 9, w: 1, h: 1, kind: 'barrel' }, { x: 18, y: 9, w: 1, h: 1, kind: 'barrel' } ],
    waves: [
      { at: 'start', spawns: [ { enemy: 'enemy_coyote', count: 3, x: -1, y: -1 }, { enemy: 'enemy_bandit', count: 2, x: -1, y: -1 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_baril', count: 3, x: -1, y: -1 }, { enemy: 'enemy_crotale', count: 2, x: -1, y: -1 }, { enemy: 'enemy_bandit', count: 2, x: -1, y: -1 }, { enemy: 'enemy_scorpions', count: 1, x: -1, y: -1 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_bandit', count: 3, x: -1, y: -1 }, { enemy: 'enemy_coyote', count: 2, x: -1, y: -1 }, { enemy: 'enemy_baril', count: 3, x: -1, y: -1 }, { enemy: 'enemy_crotale', count: 1, x: -1, y: -1 }, { enemy: 'enemy_bison', count: 1, x: 21, y: 6 } ] },
    ],
    traps: [
      { trap: 'trap_ours', x: 2, y: 2, w: 4, h: 3, params: { beats: { period: 4, active: 0.5, telegraph: 1, on: 0 } } },
      { trap: 'trap_ours', x: 18, y: 8, w: 4, h: 3, params: { beats: { period: 4, active: 0.5, telegraph: 1, on: 0 } } },
      { trap: 'trap_ours', x: 18, y: 2, w: 4, h: 3, params: { beats: { period: 4, active: 0.5, telegraph: 1, on: 2 } } },
      { trap: 'trap_ours', x: 2, y: 8, w: 4, h: 3, params: { beats: { period: 4, active: 0.5, telegraph: 1, on: 2 } } },
      { trap: 'trap_ours', x: 10, y: 5, w: 4, h: 3, params: { beats: { period: 4, active: 0.5, telegraph: 1, on: 1 } } },
      { trap: 'trap_dynamite', x: 11, y: 0, params: { dir: 'down', pattern: 'fan', count: 3, beats: { every: 8, telegraph: 1, on: 1 } } },
      { trap: 'trap_dynamite', x: 12, y: 12, params: { dir: 'up', pattern: 'fan', count: 3, beats: { every: 8, telegraph: 1, on: 5 } } },
      { trap: 'trap_poudre', x: 4, y: 6, params: { beats: { period: 8, active: 2, telegraph: 2, on: 4 } } },
      { trap: 'trap_poudre', x: 19, y: 6, params: { beats: { period: 8, active: 2, telegraph: 2, on: 0 } } },
      { trap: 'trap_embuscade', x: 0, y: 10, params: { beats: { every: 8, telegraph: 1, on: 3 } } },
      { trap: 'trap_embuscade', x: 23, y: 2, params: { beats: { every: 8, telegraph: 1, on: 7 } } },
    ], fragments: [], modular: [] },
  { id: 'room_b3_8', biome: 'biome_3', index: 8, type: 'CHEST_FINAL', refTime: 20,
    obstacles: [ { x: 8, y: 4, w: 1, h: 1, kind: 'crate' }, { x: 8, y: 8, w: 1, h: 1, kind: 'crate' }, { x: 15, y: 4, w: 1, h: 1, kind: 'crate' }, { x: 15, y: 8, w: 1, h: 1, kind: 'crate' } ],
    deco: [ { x: 3, y: 10, kind: 'wanted' }, { x: 20, y: 2, kind: 'tumbleweed' } ], waves: [], traps: [], fragments: [], modular: [] },
  { id: 'room_b3_9', biome: 'biome_3', index: 9, type: 'BOSS_REVENGE', refTime: 170,
    obstacles: [ { x: 5, y: 3, w: 2, h: 2, kind: 'rock' }, { x: 17, y: 3, w: 2, h: 2, kind: 'rock' }, { x: 5, y: 8, w: 2, h: 2, kind: 'rock' }, { x: 17, y: 8, w: 2, h: 2, kind: 'rock' } ],
    deco: [ { x: 2, y: 1, kind: 'wanted' }, { x: 21, y: 11, kind: 'skull' }, { x: 12, y: 1, kind: 'tumbleweed' } ],
    waves: [ { at: 'start', spawns: [ { enemy: 'boss_marshal', count: 1, x: 18, y: 6 } ] } ],
    traps: [ { trap: 'trap_embuscade', x: 11, y: 0, phase: 0 }, { trap: 'trap_embuscade', x: 12, y: 12, phase: 1.2 }, { trap: 'trap_poudre', x: 3, y: 6, phase: 4 }, { trap: 'trap_poudre', x: 20, y: 6, phase: 8 } ],
    fragments: [], modular: [] },
);
