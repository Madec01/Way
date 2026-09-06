/* =========================================================================
   SUJET NEUF — content2.js — Biome 2 : LA SERRE (palier -2). Un cran au-dessus d'ADMISSION.
   Variantes d'ennemis plus rapides et plus résistantes, salves, élites, boss ÉTALON 12 « la Serriste ».
   ========================================================================= */

CONTENT.biomes.push({
  id: 'biome_2', name: 'LA SERRE', order: 2,
  desc: 'Palier -2. L\'ancienne unité de culture des greffons : cuves éclatées, végétation qui a pris le contrôle des cellules d\'essai, sol humide qui conduit tout. Le Bureau y a laissé pousser ce qu\'il ne comprenait pas. Taux de perte : 84 %.',
  palette: { tint: 'rgba(40,120,70,.30)', neon: ['#7ed957', '#ffd166'], wall: 'rgba(30,90,60,.4)' },
  levelPassives: [
    { bonus: { name: 'Photosynthèse', desc: 'Régénération +1,5 PV/s.', mods: [{ stat: 'regen', add: 1.5 }], hooks: {} }, malus: { name: 'Air lourd', desc: '-15 % vitesse de déplacement.', mods: [{ stat: 'speed', mul: 0.85 }], hooks: {} } },
    { bonus: { name: 'Greffon sauvage', desc: '+1 projectile par tir.', mods: [{ stat: 'projectiles', add: 1 }], hooks: {} }, malus: { name: 'Sève corrosive', desc: 'Les pièges infligent +50 % de dégâts, armure -1.', mods: [{ stat: 'trapDamageMul', mul: 1.5 }, { stat: 'armor', add: -1 }], hooks: {} } },
    { bonus: { name: 'Récolte', desc: '+40 % pièces, +20 % XP.', mods: [{ stat: 'coinGain', mul: 1.4 }, { stat: 'xpGain', mul: 1.2 }], hooks: {} }, malus: { name: 'Serre chaude', desc: '-20 % PV max, invulnérabilité après un coup -0,15 s.', mods: [{ stat: 'maxHp', mul: 0.8 }, { stat: 'invulnTime', add: -0.15 }], hooks: {} } },
  ],
  enemyPool: ['enemy_ronce', 'enemy_pollinisateur', 'enemy_racine', 'enemy_spore', 'enemy_bourgeon', 'enemy_moucherons', 'enemy_liane'],
  trapPool: ['trap_balayage', 'trap_tourniquet', 'trap_grille', 'trap_bouche', 'trap_dalles', 'trap_nappe', 'trap_rail', 'trap_tourelle'],
  miniboss: 'boss_serriste',
  difficulty: { hpMul: 1.3, damageMul: 1.2, speedMul: 1.08 },
  unlockAfter: 'biome_1',
});

CONTENT.enemies.push(
  { id: 'enemy_ronce', name: 'Ronce', archetype: 'rusher', desc: 'Rôdeur envahi par les lianes : plus vif, ruée plus longue.', hp: 46, speed: 215, damage: 11, radius: 14, xp: 6, coins: 2, color: '#7ed957', sprite: 'enemy_rusher2',
    behavior: { lungeRange: 115, lungeWindup: 0.32, lungeSpeed: 600, lungeDuration: 0.3, lungeCooldown: 1.3 }, telegraph: { time: 0.3, color: '#b7ff7a' } },
  { id: 'enemy_pollinisateur', name: 'Pollinisateur', archetype: 'shooter', desc: 'Tire une salve de 3 spores en éventail. Reste à distance.', hp: 36, speed: 140, damage: 8, radius: 14, xp: 8, coins: 3, color: '#c9a3ff', projColor: '#e2c6ff', sprite: 'enemy_shooter2',
    behavior: { fireRate: 0.8, projSpeed: 340, projDamage: 9, projSize: 7, keepDistance: 320, aimTime: 0.45, burst: 3, spread: 0.4 }, telegraph: { time: 0.45, color: '#e2c6ff' } },
  { id: 'enemy_racine', name: 'Racine', archetype: 'tank', desc: 'Bloc végétal : charge plus vite, encaisse beaucoup.', hp: 240, speed: 95, damage: 16, radius: 26, xp: 18, coins: 5, color: '#5aa06a', sprite: 'enemy_tank2',
    behavior: { chargeWindup: 0.7, chargeSpeed: 620, chargeDuration: 0.8, chargeCooldown: 2.6, stunOnWallHit: 1.0, chargeDamageMul: 1.5 }, telegraph: { time: 0.7, color: '#ffd166' } },
  { id: 'enemy_spore', name: 'Spore', archetype: 'kamikaze', desc: 'Explose dans un rayon plus large et laisse un nuage.', hp: 24, speed: 260, damage: 6, radius: 12, xp: 6, coins: 2, color: '#b7ff7a', sprite: 'enemy_kamikaze2',
    behavior: { fuse: 0.8, radius: 100, explosionDamage: 26, triggerRange: 70, explodeOnDeath: true }, telegraph: { time: 0.8, color: '#eaffb0' } },
  { id: 'enemy_bourgeon', name: 'Bourgeon', archetype: 'summoner', desc: 'Libère des moucherons par paquets de 3, jusqu\'à 6.', hp: 110, speed: 65, damage: 8, radius: 20, xp: 24, coins: 6, color: '#ff9adb', sprite: 'enemy_summoner2',
    behavior: { summon: 'enemy_moucherons', every: 3.5, max: 6, count: 3, keepDistance: 360, summonWindup: 0.6 }, telegraph: { time: 0.6, color: '#ffc4ea' } },
  { id: 'enemy_moucherons', name: 'Moucherons', archetype: 'swarm', desc: 'Nuée de 5, plus rapide.', hp: 10, speed: 300, damage: 5, radius: 8, xp: 3, coins: 1, color: '#9cff57', sprite: 'enemy_swarm2',
    behavior: { groupSize: 5, jitter: 45, biteWindup: 0.2, biteCooldown: 0.7 }, telegraph: { time: 0.2, color: '#d0ff9a' } },
  { id: 'enemy_liane', name: 'Liane', archetype: 'dasher', desc: 'Fonce plus loin, plus souvent.', hp: 55, speed: 190, damage: 13, radius: 14, xp: 12, coins: 4, color: '#66e0c8', sprite: 'enemy_dasher2',
    behavior: { blinkRange: 300, blinkWindup: 0.4, blinkCooldown: 1.7, dashSpeed: 780, dashDuration: 0.32, postDashPause: 0.5 }, telegraph: { time: 0.4, color: '#a8fff0' } },
);

CONTENT.bosses.push({
  id: 'boss_serriste', name: 'Étalon 12, dite « la Serriste »', subtitle: 'Elle a fait pousser ce que vous portez.',
  desc: 'Sujet de référence de LA SERRE, greffée jusqu\'à l\'os de matériel végétal. Vaporise, enracine, et charge quand on la croit lente : après une charge, ses racines mettent 1,2 s à se rétracter.',
  hp: 2600, speed: 130, radius: 36, damage: 20, xp: 180, coins: 60, color: '#7ed957', sprite: 'boss2',
  phases: [
    { hpBelow: 1, patterns: [
      { kind: 'spiral', telegraph: 0.7, duration: 2.6, cooldown: 4.5, arms: 3, rate: 14, angularSpeed: 2.4, projSpeed: 230, projDamage: 12, projSize: 7, color: '#b7ff7a' },
      { kind: 'summon', telegraph: 0.8, duration: 0.5, cooldown: 8, enemy: 'enemy_spore', count: 2 },
      { kind: 'charge', telegraph: 0.8, duration: 0.8, cooldown: 4.5, speed: 680, damage: 24, stunTime: 1.2 },
      { kind: 'slam', telegraph: 1.0, duration: 0.4, cooldown: 5.5, radius: 150, damage: 28 },
    ] },
    { hpBelow: 0.55, patterns: [
      { kind: 'fan', telegraph: 0.5, duration: 0.6, cooldown: 2.2, count: 9, spread: 1.4, projSpeed: 320, projDamage: 13, projSize: 8, color: '#e2c6ff' },
      { kind: 'laser_sweep', telegraph: 1.0, duration: 2.2, cooldown: 7, length: 700, damage: 22, color: '#b7ff7a' },
      { kind: 'charge', telegraph: 0.6, duration: 0.8, cooldown: 4, speed: 760, damage: 26, stunTime: 1.2 },
      { kind: 'ring', telegraph: 0.6, duration: 0.3, cooldown: 3, count: 16, projSpeed: 280, projDamage: 13, projSize: 8, color: '#b7ff7a' },
      { kind: 'summon', telegraph: 0.8, duration: 0.5, cooldown: 9, enemy: 'enemy_moucherons', count: 1 },
    ] },
  ],
  weakness: { desc: 'Après chaque charge, ses racines restent plantées 1,2 s : dégâts ×1,8 pendant qu\'elle se rétracte.', rule: 'after_charge', damageMul: 1.8, window: 1.2 },
  revenge: { hpMul: 1.35, window: 0.8, name: 'Étalon 12 / rév. B', phaseText: 'DONNÉES CHARGÉES', mimic: true,
    extraPhases: [ { hpBelow: 0.3, patterns: [
      { kind: 'ring', telegraph: 0.5, duration: 1.2, cooldown: 2.5, count: 14, rate: 3, rotate: 0.35, projSpeed: 300, projDamage: 15, projSize: 8, color: '#b7ff7a' },
      { kind: 'spiral', telegraph: 0.6, duration: 3, cooldown: 5, arms: 4, rate: 16, angularSpeed: 3, projSpeed: 250, projDamage: 13, projSize: 7, color: '#e2c6ff' },
      { kind: 'charge', telegraph: 0.45, duration: 0.7, cooldown: 3, speed: 860, damage: 30, stunTime: 0.8 },
    ] } ],
    desc: 'Salle 9 : rév. B, PV ×1,35, rétraction plus courte (0,8 s), phase 3 sous 30 %.' },
});

/* Salles du biome 2 : mêmes types que le biome 1, plus d'ennemis, des élites, pièges plus serrés. */
CONTENT.rooms.push(
  { id: 'room_b2_1', biome: 'biome_2', index: 1, type: 'PREP_COMBAT', refTime: 55,
    obstacles: [ { x: 5, y: 2, w: 1, h: 2 }, { x: 18, y: 2, w: 1, h: 2 }, { x: 5, y: 9, w: 1, h: 2 }, { x: 18, y: 9, w: 1, h: 2 }, { x: 11, y: 6, w: 2, h: 1 } ],
    waves: [
      { at: 'start', spawns: [ { enemy: 'enemy_ronce', count: 2, x: 20, y: 3 }, { enemy: 'enemy_ronce', count: 2, x: 20, y: 9 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_ronce', count: 3, x: -1, y: -1 }, { enemy: 'enemy_pollinisateur', count: 1, x: 21, y: 6 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_spore', count: 2, x: 21, y: 2 }, { enemy: 'enemy_pollinisateur', count: 2, x: 21, y: 10 }, { enemy: 'enemy_ronce', count: 2, x: 2, y: 1 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_ronce', count: 1, x: -1, y: -1, elite: true }, { enemy: 'enemy_liane', count: 1, x: 12, y: 1 }, { enemy: 'enemy_ronce', count: 2, x: 2, y: 11 }, { enemy: 'enemy_pollinisateur', count: 1, x: 21, y: 6 } ] },
    ], traps: [], fragments: [], modular: [] },
  { id: 'room_b2_2', biome: 'biome_2', index: 2, type: 'TRAP', refTime: 70,
    obstacles: [ { x: 8, y: 0, w: 1, h: 4 }, { x: 8, y: 9, w: 1, h: 4 }, { x: 16, y: 0, w: 1, h: 4 }, { x: 16, y: 9, w: 1, h: 4 } ],
    waves: [],
    traps: [
      { trap: 'trap_dalles', x: 2, y: 2, w: 6, h: 9, phase: 0, params: { pattern: 'checker' } },
      { trap: 'trap_grille', x: 9, y: 1, w: 7, h: 11, phase: 0.5 },
      { trap: 'trap_balayage', x: 9, y: 0, w: 7, h: 13, phase: 2.5 },
      { trap: 'trap_bouche', x: 17, y: 0, phase: 0 }, { trap: 'trap_bouche', x: 19, y: 0, phase: 0.6 }, { trap: 'trap_bouche', x: 21, y: 0, phase: 1.2 },
      { trap: 'trap_bouche', x: 18, y: 12, phase: 0.3, params: { dir: 'up' } }, { trap: 'trap_bouche', x: 20, y: 12, phase: 0.9, params: { dir: 'up' } },
      { trap: 'trap_rail', x: 17, y: 4, w: 6, h: 1, phase: 0 }, { trap: 'trap_rail', x: 17, y: 8, w: 6, h: 1, phase: 1.6 },
      { trap: 'trap_tourniquet', x: 20, y: 6, phase: 0, params: { arms: 3 } },
    ],
    fragments: [ { x: 4, y: 6, at: 0 }, { x: 12, y: 3, at: 0 }, { x: 12, y: 9, at: 6 }, { x: 19, y: 6, at: 12 }, { x: 22, y: 2, at: 18 }, { x: 22, y: 10, at: 24 } ], modular: [] },
  { id: 'room_b2_3', biome: 'biome_2', index: 3, type: 'COMBAT_TRAP', refTime: 85,
    obstacles: [ { x: 4, y: 3, w: 2, h: 1 }, { x: 4, y: 9, w: 2, h: 1 }, { x: 18, y: 3, w: 2, h: 1 }, { x: 18, y: 9, w: 2, h: 1 }, { x: 11, y: 1, w: 2, h: 1 }, { x: 11, y: 11, w: 2, h: 1 } ],
    waves: [
      { at: 'start', spawns: [ { enemy: 'enemy_ronce', count: 4, x: 20, y: 6 }, { enemy: 'enemy_pollinisateur', count: 2, x: 21, y: 2 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_racine', count: 1, x: 21, y: 6 }, { enemy: 'enemy_ronce', count: 4, x: -1, y: -1 }, { enemy: 'enemy_spore', count: 2, x: 2, y: 11 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_spore', count: 3, x: 2, y: 1 }, { enemy: 'enemy_pollinisateur', count: 3, x: 21, y: 10 }, { enemy: 'enemy_moucherons', count: 1, x: 21, y: 2 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_liane', count: 2, x: 21, y: 6 }, { enemy: 'enemy_ronce', count: 3, x: -1, y: -1 }, { enemy: 'enemy_bourgeon', count: 1, x: 2, y: 6 }, { enemy: 'enemy_racine', count: 1, x: 12, y: 11, elite: true } ] },
    ],
    traps: [
      { trap: 'trap_tourniquet', x: 11, y: 6, phase: 0, params: { arms: 3, lengthTiles: 5, angularSpeed: 1.4 } },
      { trap: 'trap_dalles', x: 1, y: 1, w: 3, h: 3, phase: 0 }, { trap: 'trap_dalles', x: 20, y: 9, w: 3, h: 3, phase: 1 }, { trap: 'trap_dalles', x: 1, y: 9, w: 3, h: 3, phase: 0.5 }, { trap: 'trap_dalles', x: 20, y: 1, w: 3, h: 3, phase: 1.5 },
      { trap: 'trap_tourelle', x: 7, y: 0, phase: 0 }, { trap: 'trap_tourelle', x: 16, y: 0, phase: 1.2 }, { trap: 'trap_tourelle', x: 11, y: 12, phase: 0.6, params: { count: 3, spread: 0.6 } },
      { trap: 'trap_nappe', x: 6, y: 6, phase: 2 }, { trap: 'trap_nappe', x: 17, y: 6, phase: 5 },
    ], fragments: [], modular: [] },
  { id: 'room_b2_4', biome: 'biome_2', index: 4, type: 'CHEST', refTime: 20,
    obstacles: [ { x: 8, y: 4, w: 1, h: 1 }, { x: 8, y: 8, w: 1, h: 1 }, { x: 15, y: 4, w: 1, h: 1 }, { x: 15, y: 8, w: 1, h: 1 } ], waves: [], traps: [], fragments: [], modular: [] },
  { id: 'room_b2_5', biome: 'biome_2', index: 5, type: 'MINIBOSS', refTime: 130,
    obstacles: [ { x: 5, y: 3, w: 2, h: 2 }, { x: 17, y: 3, w: 2, h: 2 }, { x: 5, y: 8, w: 2, h: 2 }, { x: 17, y: 8, w: 2, h: 2 }, { x: 11, y: 6, w: 2, h: 1 } ],
    waves: [ { at: 'start', spawns: [ { enemy: 'boss_serriste', count: 1, x: 18, y: 6 } ] } ],
    traps: [ { trap: 'trap_nappe', x: 3, y: 6, phase: 3 }, { trap: 'trap_nappe', x: 20, y: 6, phase: 7 } ], fragments: [], modular: [] },
  { id: 'room_b2_6', biome: 'biome_2', index: 6, type: 'COMBAT_MODULAR', refTime: 90,
    obstacles: [ { x: 11, y: 5, w: 2, h: 3 } ],
    waves: [
      { at: 'start', spawns: [ { enemy: 'enemy_liane', count: 2, x: -1, y: -1 }, { enemy: 'enemy_pollinisateur', count: 3, x: -1, y: -1 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_bourgeon', count: 1, x: 21, y: 6 }, { enemy: 'enemy_ronce', count: 5, x: -1, y: -1 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_racine', count: 2, x: -1, y: -1 }, { enemy: 'enemy_spore', count: 4, x: -1, y: -1 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_liane', count: 2, x: -1, y: -1, elite: true }, { enemy: 'enemy_pollinisateur', count: 2, x: -1, y: -1 }, { enemy: 'enemy_moucherons', count: 2, x: -1, y: -1 } ] },
    ],
    traps: [ { trap: 'trap_tourelle', x: 0, y: 3, phase: 0 }, { trap: 'trap_tourelle', x: 23, y: 9, phase: 1 } ], fragments: [],
    modular: [
      { kind: 'slide_wall', x: 3, y: 1, w: 1, h: 5, dx: 0, dy: 6, period: 7, phase: 0 },
      { kind: 'slide_wall', x: 20, y: 7, w: 1, h: 5, dx: 0, dy: -6, period: 7, phase: 3.5 },
      { kind: 'rotor', cx: 12, cy: 6.5, arms: 3, length: 4, angularSpeed: 0.7 },
      { kind: 'floor_cycle', period: 8, telegraph: 1.5, configs: [
        [ { x: 7, y: 3, w: 1, h: 1 }, { x: 16, y: 3, w: 1, h: 1 }, { x: 7, y: 9, w: 1, h: 1 }, { x: 16, y: 9, w: 1, h: 1 }, { x: 11, y: 1, w: 2, h: 1 } ],
        [ { x: 5, y: 6, w: 2, h: 1 }, { x: 17, y: 6, w: 2, h: 1 }, { x: 9, y: 2, w: 1, h: 2 }, { x: 14, y: 9, w: 1, h: 2 } ]
      ] },
    ] },
  { id: 'room_b2_7', biome: 'biome_2', index: 7, type: 'COMBAT_TRAP_MODULAR', refTime: 100,
    obstacles: [ { x: 6, y: 6, w: 1, h: 1 }, { x: 17, y: 6, w: 1, h: 1 } ],
    waves: [
      { at: 'start', spawns: [ { enemy: 'enemy_bourgeon', count: 1, x: 21, y: 3 }, { enemy: 'enemy_liane', count: 2, x: -1, y: -1 }, { enemy: 'enemy_ronce', count: 2, x: -1, y: -1 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_racine', count: 1, x: 21, y: 6, elite: true }, { enemy: 'enemy_pollinisateur', count: 3, x: -1, y: -1 }, { enemy: 'enemy_moucherons', count: 2, x: -1, y: -1 } ] },
      { at: 'clear', spawns: [ { enemy: 'enemy_spore', count: 5, x: -1, y: -1 }, { enemy: 'enemy_liane', count: 2, x: -1, y: -1 }, { enemy: 'enemy_bourgeon', count: 1, x: 2, y: 9 } ] },
    ],
    traps: [
      { trap: 'trap_grille', x: 2, y: 1, w: 20, h: 11, phase: 0, params: { spacingTiles: 3 } },
      { trap: 'trap_nappe', x: 11, y: 6, phase: 0 }, { trap: 'trap_nappe', x: 5, y: 2, phase: 4 }, { trap: 'trap_nappe', x: 18, y: 10, phase: 2 },
      { trap: 'trap_tourelle', x: 0, y: 6, phase: 0.6 }, { trap: 'trap_tourelle', x: 23, y: 6, phase: 1.8 },
      { trap: 'trap_bouche', x: 11, y: 12, phase: 0.4, params: { dir: 'up', pattern: 'fan', count: 3 } },
    ], fragments: [],
    modular: [
      { kind: 'safe_zone', radius: 2.6, period: 8, telegraph: 2.0, damage: 18, speed: 1.9, path: [ { x: 4, y: 3 }, { x: 19, y: 3 }, { x: 19, y: 9 }, { x: 4, y: 9 } ] },
      { kind: 'slide_wall', x: 11, y: 0, w: 2, h: 3, dx: 0, dy: 8, period: 9, phase: 2 },
      { kind: 'slide_wall', x: 2, y: 5, w: 3, h: 1, dx: 8, dy: 0, period: 11, phase: 5 },
    ] },
  { id: 'room_b2_8', biome: 'biome_2', index: 8, type: 'CHEST_FINAL', refTime: 20,
    obstacles: [ { x: 8, y: 4, w: 1, h: 1 }, { x: 8, y: 8, w: 1, h: 1 }, { x: 15, y: 4, w: 1, h: 1 }, { x: 15, y: 8, w: 1, h: 1 } ], waves: [], traps: [], fragments: [], modular: [] },
  { id: 'room_b2_9', biome: 'biome_2', index: 9, type: 'BOSS_REVENGE', refTime: 160,
    obstacles: [ { x: 5, y: 3, w: 2, h: 2 }, { x: 17, y: 3, w: 2, h: 2 }, { x: 5, y: 8, w: 2, h: 2 }, { x: 17, y: 8, w: 2, h: 2 } ],
    waves: [ { at: 'start', spawns: [ { enemy: 'boss_serriste', count: 1, x: 18, y: 6 } ] } ],
    traps: [ { trap: 'trap_tourelle', x: 11, y: 0, phase: 0 }, { trap: 'trap_tourelle', x: 12, y: 12, phase: 1.2 }, { trap: 'trap_nappe', x: 3, y: 6, phase: 4 }, { trap: 'trap_nappe', x: 20, y: 6, phase: 8 } ],
    fragments: [], modular: [] },
);
