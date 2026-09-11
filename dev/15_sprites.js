/* =========================================================================
   SALLE ZÉRO — 15_sprites.js
   Sprites (0x72 Dungeon Tileset II, CC0) avec fallback Canvas marqué TODO_SPRITE ; sol/murs ; musique.
   ========================================================================= */

'use strict';
const ASSET_BASE = 'assets/';
const SHEET_URL = ASSET_BASE + 'sprites/0x72_dungeon_tileset_ii/0x72_DungeonTilesetII_v1.4.png';
const SCALE = 3;
/* Coordonnées (voir ASSETS.md §5.2). idle/run : x y w h, 4 frames à droite. */
const SPRITE_DEFS = {
  player: { idle: [128, 100, 16, 28], run: [192, 100, 16, 28], hit: [256, 100, 16, 28], n: 4, foot: true },
  player2: { idle: [128, 36, 16, 28], run: [192, 36, 16, 28], hit: [256, 36, 16, 28], n: 4, foot: true },
  enemy_rusher: { idle: [368, 48, 16, 16], run: [432, 48, 16, 16], n: 4 },
  enemy_shooter: { idle: [368, 236, 16, 20], run: [432, 236, 16, 20], n: 4 },
  enemy_tank: { idle: [368, 172, 16, 20], run: [432, 172, 16, 20], n: 4 },
  enemy_kamikaze: { idle: [368, 16, 16, 16], run: [432, 16, 16, 16], n: 4 },
  enemy_summoner: { idle: [368, 268, 16, 20], run: [368, 268, 16, 20], n: 4 },
  enemy_swarm: { idle: [432, 112, 16, 16], run: [432, 112, 16, 16], n: 4 },
  enemy_dasher: { idle: [368, 32, 16, 16], run: [432, 32, 16, 16], n: 4 },
  boss: { idle: [16, 364, 32, 36], run: [144, 364, 32, 36], n: 4, foot: true },
  chest: { idle: [304, 304, 16, 16], run: [304, 304, 16, 16], n: 3 },
  coin: { idle: [288, 272, 8, 8], run: [288, 272, 8, 8], n: 4 },
  npc_doc: { idle: [128, 100, 16, 28], run: [128, 100, 16, 28], n: 4, foot: true },
  /* biome 2 */
  enemy_rusher2: { idle: [368, 80, 16, 16], run: [432, 80, 16, 16], n: 4 },
  enemy_shooter2: { idle: [368, 300, 16, 20], run: [432, 300, 16, 20], n: 4 },
  enemy_tank2: { idle: [368, 204, 16, 20], run: [432, 204, 16, 20], n: 4 },
  enemy_kamikaze2: { idle: [368, 144, 16, 16], run: [368, 144, 16, 16], n: 4 },
  enemy_summoner2: { idle: [368, 328, 16, 24], run: [432, 328, 16, 24], n: 4 },
  enemy_swarm2: { idle: [368, 112, 16, 16], run: [368, 112, 16, 16], n: 4 },
  enemy_dasher2: { idle: [432, 144, 16, 16], run: [432, 144, 16, 16], n: 4 },
  boss2: { idle: [16, 320, 32, 32], run: [144, 320, 32, 32], n: 4, foot: true },
  npc_ally: { idle: [368, 80, 16, 16], run: [432, 80, 16, 16], n: 4 },
  /* biome 3 (western) : wogol → coyote, lizard → bandit, big_zombie → bison, wizzard → croque-mort, big_demon → Marshal ; baril, scorpions et crotale = icônes rastérisées */
  enemy_rusher3: { idle: [368, 300, 16, 20], run: [432, 300, 16, 20], n: 4, tint: 'rgba(216,162,90,.55)' },
  enemy_shooter3: {
    idle: [128, 228, 16, 28],
    run: [192, 228, 16, 28],
    hit: [256, 228, 16, 28],
    n: 4,
    foot: true,
    tint: 'rgba(120,80,40,.45)',
  },
  enemy_tank3: { idle: [16, 320, 32, 32], run: [144, 320, 32, 32], n: 4, foot: true, tint: 'rgba(110,70,30,.6)' },
  enemy_kamikaze3: { prop: 'barrel', size: 34, roll: true },
  enemy_summoner3: {
    idle: [128, 164, 16, 28],
    run: [192, 164, 16, 28],
    hit: [256, 164, 16, 28],
    n: 4,
    foot: true,
    tint: 'rgba(30,25,45,.55)',
  },
  enemy_swarm3: { prop: 'scorpion', size: 22 },
  enemy_dasher3: { prop: 'rattlesnake', size: 30 },
  boss3: { idle: [16, 270, 32, 34], run: [144, 270, 32, 34], n: 4, foot: true, tint: 'rgba(224,176,96,.45)' }, // big_zombie : silhouette sèche, différente du démon (boss 1) et de l'ogre (boss 2)
  /* biome 4 (oriental) : wizzard_f → derviche, elf_f → archer, ogre → colosse d'argile, orc_shaman → charmeur ; jarre, cobras et djinn = icônes rastérisées */
  enemy_rusher4: {
    idle: [128, 132, 16, 28],
    run: [192, 132, 16, 28],
    hit: [256, 132, 16, 28],
    n: 4,
    foot: true,
    tint: 'rgba(255,178,52,.55)',
  },
  enemy_shooter4: { idle: [128, 4, 16, 28], run: [192, 4, 16, 28], hit: [256, 4, 16, 28], n: 4, foot: true, tint: 'rgba(90,214,204,.45)' },
  enemy_tank4: { idle: [16, 320, 32, 32], run: [144, 320, 32, 32], n: 4, foot: true, tint: 'rgba(198,116,64,.6)' },
  enemy_kamikaze4: { prop: 'covered-jar', size: 32, roll: true },
  enemy_summoner4: { idle: [368, 236, 16, 20], run: [432, 236, 16, 20], n: 4, tint: 'rgba(150,100,220,.5)' },
  enemy_swarm4: { prop: 'cobra', size: 24 },
  enemy_dasher4: { prop: 'djinn', size: 32 },
  /* le Vizir : silhouette haute et fine (wizzard_m agrandi), à l'opposé des trois colosses des autres paliers */
  boss4: {
    idle: [128, 164, 16, 28],
    run: [192, 164, 16, 28],
    hit: [256, 164, 16, 28],
    n: 4,
    foot: true,
    scale: 1.6,
    tint: 'rgba(140,110,235,.42)',
  },
};
const TILES = {
  floor: [
    [16, 64],
    [32, 64],
    [48, 64],
    [16, 80],
    [32, 80],
    [48, 80],
    [16, 96],
    [32, 96],
  ],
  wallTop: [32, 0],
  wallFace: [32, 16],
  wallLeft: [0, 128],
  wallRight: [16, 128],
  cornerTL: [32, 112],
  cornerTR: [48, 112],
  cornerBL: [32, 144],
  cornerBR: [48, 144],
  column: [
    [80, 80],
    [80, 96],
    [80, 112],
  ],
  banner: [32, 32],
  hole: [48, 32],
  goo: [64, 80],
};

const Sprites = (() => {
  let sheet = null,
    ready = false,
    failed = false;
  const floorCache = new Map();
  let _fx = null;
  function flashCanvas(w, h) {
    if (!_fx) _fx = document.createElement('canvas');
    if (_fx.width < w || _fx.height < h) {
      _fx.width = Math.max(_fx.width, Math.ceil(w));
      _fx.height = Math.max(_fx.height, Math.ceil(h));
    }
    return _fx;
  }
  function load() {
    return new Promise(res => {
      sheet = new Image();
      sheet.onload = () => {
        ready = true;
        res(true);
      };
      sheet.onerror = () => {
        failed = true;
        console.warn('[Sprites] spritesheet indisponible, placeholders TODO_SPRITE');
        res(false);
      };
      sheet.src = SHEET_URL;
    });
  }
  /* ---- accessoires western : icônes SVG (game-icons.net, CC BY 3.0) rastérisées en 20 px puis agrandies sans lissage = pixel art ---- */
  const PROP_DEFS = {
    /* biome 3 — western (assets/sprites/western/) */
    cactus: { d: 'western', color: '#4f9a4f', px: 22 },
    rock: { d: 'western', color: '#8a7a66', px: 20 },
    barrel: { d: 'western', color: '#8b5a2b', px: 18 },
    'wooden-crate': { d: 'western', color: '#a0744a', px: 18 },
    'old-wagon': { d: 'western', color: '#6e4a2e', px: 26 },
    'mine-wagon': { d: 'western', color: '#5a5a5a', px: 22 },
    windmill: { d: 'western', color: '#c9a27a', px: 26 },
    'rail-road': { d: 'western', color: '#6a5a4a', px: 20 },
    'desert-skull': { d: 'western', color: '#e8e2cf', px: 16 },
    'animal-skull': { d: 'western', color: '#e8e2cf', px: 22 },
    tumbleweed: { d: 'western', color: '#b39a5a', px: 24 },
    'saloon-doors': { d: 'western', color: '#a0744a', px: 22 },
    'wanted-reward': { d: 'western', color: '#e0d2a8', px: 18 },
    rattlesnake: { d: 'western', color: '#9a9a3a', px: 26 },
    scorpion: { d: 'western', color: '#3a2a1a', px: 24 },
    vulture: { d: 'western', color: '#3a3a3a', px: 20 },
    bull: { d: 'western', color: '#4a2e1a', px: 26 },
    dynamite: { d: 'western', color: '#c0392b', px: 16 },
    'cellar-barrels': { d: 'western', color: '#8b5a2b', px: 22 },
    /* biome 1 — ADMISSION, hôpital désaffecté (assets/sprites/lab/) */
    'chemical-tank': { d: 'lab', color: '#7fa8c8', px: 22 },
    'fuel-tank': { d: 'lab', color: '#8a94b0', px: 22 },
    'medical-pack': { d: 'lab', color: '#d8e4f0', px: 18 },
    'medical-drip': { d: 'lab', color: '#9fd8ff', px: 20 },
    'hospital-cross': { d: 'lab', color: '#ff8a9a', px: 18 },
    'test-tube-rack': { d: 'lab', color: '#8fd8d0', px: 20 },
    microscope: { d: 'lab', color: '#b0bdd8', px: 20 },
    lockers: { d: 'lab', color: '#6e7a9a', px: 24 },
    'trash-can': { d: 'lab', color: '#6a748c', px: 18 },
    'computer-fan': { d: 'lab', color: '#8aa0c0', px: 20 },
    valve: { d: 'lab', color: '#9aa4bc', px: 18 },
    'straight-pipe': { d: 'lab', color: '#7a86a4', px: 20 },
    cog: { d: 'lab', color: '#8a94ac', px: 18 },
    'hazard-sign': { d: 'lab', color: '#ffd166', px: 18 },
    'battery-pack-alt': { d: 'lab', color: '#7fe0c8', px: 18 },
    /* compagnons et faune (assets/sprites/pets/) — servent aussi d'images pour le décor animé */
    'falcon-moon': { d: 'pets', color: '#9fd8ff', px: 24 },
    'sniffing-dog': { d: 'pets', color: '#d8b46a', px: 24 },
    'sitting-dog': { d: 'pets', color: '#d8b46a', px: 22 },
    snake: { d: 'pets', color: '#9ade6a', px: 24 },
    'scarab-beetle': { d: 'pets', color: '#c9a3ff', px: 22 },
    turtle: { d: 'pets', color: '#6ee7ff', px: 22 },
    frog: { d: 'pets', color: '#7fff9a', px: 22 },
    owl: { d: 'pets', color: '#d8c9a0', px: 22 },
    fox: { d: 'pets', color: '#ff9a3c', px: 24 },
    rat: { d: 'pets', color: '#9aa4bc', px: 22 },
    raven: { d: 'pets', color: '#6a7490', px: 24 },
    hedgehog: { d: 'pets', color: '#b39a6a', px: 22 },
    'wolf-head': { d: 'pets', color: '#8a94b0', px: 22 },
    crab: { d: 'pets', color: '#ff7a6a', px: 22 },
    butterfly: { d: 'pets', color: '#ffd166', px: 22 },
    bee: { d: 'pets', color: '#ffd166', px: 20 },
    monkey: { d: 'pets', color: '#a0744a', px: 24 },
    armadillo: { d: 'pets', color: '#b0a08a', px: 22 },
    seahorse: { d: 'pets', color: '#8fd8d0', px: 22 },
    lizardman: { d: 'pets', color: '#7fa86a', px: 24 },
    /* biome 2 — LA SERRE (assets/sprites/greenhouse/) */
    'flower-pot': { d: 'greenhouse', color: '#8fbf6a', px: 20 },
    'cactus-pot': { d: 'greenhouse', color: '#6aa85a', px: 20 },
    vines: { d: 'greenhouse', color: '#5aa06a', px: 26 },
    'curled-leaf': { d: 'greenhouse', color: '#7ed957', px: 18 },
    'mushrooms-cluster': { d: 'greenhouse', color: '#c9a3ff', px: 20 },
    'grass-mushroom': { d: 'greenhouse', color: '#b7ff7a', px: 18 },
    seedling: { d: 'greenhouse', color: '#9cff57', px: 16 },
    'sprout-disc': { d: 'greenhouse', color: '#8fd86a', px: 18 },
    'plant-roots': { d: 'greenhouse', color: '#5a8a4a', px: 22 },
    'bubbling-flask': { d: 'greenhouse', color: '#8fd8d0', px: 20 },
    'water-fountain': { d: 'greenhouse', color: '#9fd8ff', px: 22 },
    'carnivorous-plant': { d: 'greenhouse', color: '#ff9adb', px: 24 },
    'vine-flower': { d: 'greenhouse', color: '#ffb3e0', px: 18 },
    'tree-roots': { d: 'greenhouse', color: '#4f8a5a', px: 24 },
    /* biome 4 — LE SÉRAIL, palais oriental enseveli (assets/sprites/orient/) */
    'ancient-columns': { d: 'orient', color: '#e2d3ae', px: 24 },
    amphora: { d: 'orient', color: '#c07a4a', px: 20 },
    'porcelain-vase': { d: 'orient', color: '#5ad6cc', px: 20 },
    fountain: { d: 'orient', color: '#7fd8ff', px: 22 },
    'palm-tree': { d: 'orient', color: '#5aa05a', px: 26 },
    basket: { d: 'orient', color: '#c9a05a', px: 18 },
    'fire-bowl': { d: 'orient', color: '#ff9a3c', px: 20 },
    'arabic-door': { d: 'orient', color: '#8f6ad8', px: 24 },
    'theater-curtains': { d: 'orient', color: '#a03a5a', px: 24 },
    'covered-jar': { d: 'orient', color: '#8a5a3a', px: 18 },
    'magic-lamp': { d: 'orient', color: '#ffd166', px: 18 },
    'paper-lantern': { d: 'orient', color: '#ffb347', px: 18 },
    'hot-spices': { d: 'orient', color: '#e06a3a', px: 22 },
    teapot: { d: 'orient', color: '#d8c48a', px: 18 },
    gems: { d: 'orient', color: '#7fe0ff', px: 24 },
    'scarab-beetle': { d: 'orient', color: '#5ad6cc', px: 22 },
    'all-seeing-eye': { d: 'orient', color: '#8fd8ff', px: 22 },
    'samara-mosque': { d: 'orient', color: '#e2d3ae', px: 24 },
    oasis: { d: 'orient', color: '#6ac8a0', px: 22 },
    'jeweled-chalice': { d: 'orient', color: '#ffd166', px: 22 },
    'sands-of-time': { d: 'orient', color: '#e8c98a', px: 22 },
    'red-carpet': { d: 'orient', color: '#a8365a', px: 26 },
    cobra: { d: 'orient', color: '#3aa06a', px: 26 },
    djinn: { d: 'orient', color: '#9a7aff', px: 26 },
    'crescent-blade': { d: 'orient', color: '#d8dce8', px: 20 },
    incense: { d: 'orient', color: '#c9a3ff', px: 18 },
    'snake-jar': { d: 'orient', color: '#8a5a3a', px: 20 },
    turban: { d: 'orient', color: '#e8dcc0', px: 18 },
    /* la planche d'icônes (chantier I-4, assets/sprites/icons/) : armes en cyan, compétences en mauve, catégories de
       greffes à leur couleur, quelques notions (coffre, vie, recharge, niveau). Rastérisées à 24 px comme les accessoires,
       teintées à la rastérisation : un écran les prend par Sprites.icon(id, taille). */
    gladius: { d: 'icons', color: '#8fdcff', px: 24 },
    'thor-hammer': { d: 'icons', color: '#8fdcff', px: 24 },
    'high-shot': { d: 'icons', color: '#8fdcff', px: 24 },
    ricochet: { d: 'icons', color: '#8fdcff', px: 24 },
    boomerang: { d: 'icons', color: '#8fdcff', px: 24 },
    orbital: { d: 'icons', color: '#8fdcff', px: 24 },
    'lightning-arc': { d: 'icons', color: '#8fdcff', px: 24 },
    flamethrower: { d: 'icons', color: '#8fdcff', px: 24 },
    sprint: { d: 'icons', color: '#c9a3ff', px: 24 },
    'checked-shield': { d: 'icons', color: '#c9a3ff', px: 24 },
    'sonic-boom': { d: 'icons', color: '#c9a3ff', px: 24 },
    'time-trap': { d: 'icons', color: '#c9a3ff', px: 24 },
    'sentry-gun': { d: 'icons', color: '#c9a3ff', px: 24 },
    teleport: { d: 'icons', color: '#c9a3ff', px: 24 },
    magnet: { d: 'icons', color: '#c9a3ff', px: 24 },
    overdrive: { d: 'icons', color: '#c9a3ff', px: 24 },
    'crossed-swords': { d: 'icons', color: '#ff8a6a', px: 24 },
    shield: { d: 'icons', color: '#7fd8ff', px: 24 },
    wingfoot: { d: 'icons', color: '#7fff9a', px: 24 },
    'two-coins': { d: 'icons', color: '#ffd166', px: 24 },
    sparkles: { d: 'icons', color: '#c9a3ff', px: 24 },
    'locked-chest': { d: 'icons', color: '#ffd166', px: 24 },
    hearts: { d: 'icons', color: '#7fff9a', px: 24 },
    hourglass: { d: 'icons', color: '#c9a3ff', px: 24 },
    upgrade: { d: 'icons', color: '#6ee7ff', px: 24 },
    gears: { d: 'icons', color: '#9aa4c4', px: 24 },
    'linked-rings': { d: 'icons', color: '#7fd8ff', px: 24 },
  };
  /* quelle icône pour quelle notion du jeu : un id d'arme, de compétence, une catégorie de greffe ou un mot */
  const ICONS = {
    weapon_blade: 'gladius',
    weapon_hammer: 'thor-hammer',
    weapon_bow: 'high-shot',
    weapon_pistol: 'ricochet',
    weapon_boomerang: 'boomerang',
    weapon_orb: 'orbital',
    weapon_chain: 'lightning-arc',
    weapon_flame: 'flamethrower',
    skill_dash: 'sprint',
    skill_shield: 'checked-shield',
    skill_shockwave: 'sonic-boom',
    skill_slowtime: 'time-trap',
    skill_turret: 'sentry-gun',
    skill_blink: 'teleport',
    skill_magnet: 'magnet',
    skill_overdrive: 'overdrive',
    offense: 'crossed-swords',
    defense: 'shield',
    mobility: 'wingfoot',
    economy: 'two-coins',
    special: 'sparkles',
    utility: 'gears',
    synergy: 'linked-rings',
    coffre: 'locked-chest',
    vie: 'hearts',
    recharge: 'hourglass',
    niveau: 'upgrade',
  };
  /* l'icône d'une notion, en canvas prêt à poser dans un écran (null tant que la planche n'est pas chargée) */
  function icon(id, size) {
    const c = propCanvas(ICONS[id] || id, size || 32);
    if (c) c.className = 'icon';
    return c;
  }
  const props = {};
  /* Icône SVG → sprite pixel art. Trois passes, sinon le rendu fait « icône de menu agrandie » :
     1. rastérisation ×4 puis seuil d'alpha → bords nets (le lissage du navigateur, agrandi ensuite, donnait une frange floue) ;
     2. contour sombre d'un pixel autour de la silhouette (tous les sprites du tileset 0x72 en ont un, sans lui l'objet flotte) ;
     3. rampe de trois tons, lumière en haut à gauche, ombre en bas — au lieu d'un aplat d'une seule couleur.
     Les formes fines (frondes de palmier, fûts de colonne) gardent le ton de base : sur un pixel de large, éclairer un bord
     mangerait tout l'objet. */
  const SS = 4; // suréchantillonnage de la rastérisation
  function toneRamp(hex) {
    const v = hex.replace('#', '');
    const b = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16));
    const mix = t => b.map(c => Math.max(0, Math.min(255, Math.round(t > 0 ? c + (255 - c) * t : c * (1 + t)))));
    return { hi: mix(0.32), base: b, lo: mix(-0.3), out: mix(-0.76) };
  }
  function pixelize(img, px, hex) {
    const big = document.createElement('canvas');
    big.width = big.height = px * SS;
    const bg = big.getContext('2d');
    if (!bg) return null;
    bg.drawImage(img, 0, 0, px * SS, px * SS);
    const src = bg.getImageData(0, 0, px * SS, px * SS).data;
    const mask = new Uint8Array(px * px);
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        let a = 0;
        for (let j = 0; j < SS; j++) {
          const row = (y * SS + j) * px * SS;
          for (let i = 0; i < SS; i++) a += src[(row + x * SS + i) * 4 + 3];
        }
        if (a / (SS * SS) > 96) mask[y * px + x] = 1;
      }
    const at = (x, y) => (x < 0 || y < 0 || x >= px || y >= px ? 0 : mask[y * px + x]);
    const R = toneRamp(hex);
    const W = px + 2;
    const c = document.createElement('canvas');
    c.width = c.height = W;
    const g = c.getContext('2d');
    if (!g) return null;
    const im = g.createImageData(W, W);
    const put = (x, y, rgb) => {
      const i = ((y + 1) * W + (x + 1)) * 4;
      im.data[i] = rgb[0];
      im.data[i + 1] = rgb[1];
      im.data[i + 2] = rgb[2];
      im.data[i + 3] = 255;
    };
    for (let y = -1; y <= px; y++)
      for (let x = -1; x <= px; x++) {
        if (at(x, y)) continue;
        if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) put(x, y, R.out);
      }
    for (let y = 0; y < px; y++)
      for (let x = 0; x < px; x++) {
        if (!at(x, y)) continue;
        const up = !at(x, y - 1),
          down = !at(x, y + 1),
          left = !at(x - 1, y),
          right = !at(x + 1, y);
        const thin = (up && down) || (left && right);
        const v = y / px;
        put(x, y, thin ? R.base : up || (left && v < 0.62) ? R.hi : down || right || v > 0.74 ? R.lo : R.base);
      }
    g.putImageData(im, 0, 0);
    return c;
  }
  /* Un PNG déposé dans assets/sprites/pixel/ (listé par son index.json) remplace l'icône : sprites dessinés à la main ou
     générés, repris tels quels, sans traitement. C'est la porte d'entrée pour remplacer le décor pièce par pièce.
     Plusieurs essais du même accessoire cohabitent : « cactus.png », « cactus_v2.png », « cactus_v3.png »… Tous sont
     chargés, le panneau debug (F1 → Accessoires) permet de les comparer en jeu et d'en choisir un ; le choix est retenu
     dans le navigateur (`way.props`) le temps de trancher, ensuite on ne garde que le fichier retenu dans le dépôt. */
  const propVars = {}; // nom → [canvas, canvas…] dans l'ordre des variantes
  const VAR_RE = /_v(\d+)$/;
  /* Toutes les versions installées servent de variété : deux cactus dans une salle ne sont pas le même dessin. Chaque
     obstacle tire la sienne à partir de sa position (déterministe : la même salle est toujours meublée pareil).
     Le comparateur peut en imposer une le temps de la regarder — c'est le rôle de `forced`. */
  function propForced() {
    try {
      return JSON.parse(localStorage.getItem('way.props') || '{}');
    } catch (e) {
      return {};
    }
  }
  function applyPicks() {
    const f = propForced();
    for (const name in propVars) {
      const list = propVars[name];
      const i = f[name];
      props[name] = (i != null && list[i]) || list[0] || props[name];
    }
  }
  /* variante n° `k` d'un accessoire (k quelconque : ramené sur la liste), ou la version forcée si le comparateur en tient une */
  function variantOf(name, k) {
    const list = propVars[name];
    if (!list || !list.length) return props[name];
    const f = propForced()[name];
    if (f != null && list[f]) return list[f];
    return list[(((k | 0) % list.length) + list.length) % list.length] || list[0];
  }
  function setVariant(name, i) {
    const list = propVars[name];
    if (!list || !list[i]) return;
    const f = propForced();
    f[name] = i;
    try {
      localStorage.setItem('way.props', JSON.stringify(f));
    } catch (e) {
      /* navigation privée : le choix ne survit pas au rechargement */
    }
    props[name] = list[i];
    floorCache.clear();
  }
  function clearVariants() {
    try {
      localStorage.removeItem('way.props');
    } catch (e) {
      /* */
    }
    applyPicks();
    floorCache.clear();
  }
  /* Atelier : le sol est mis en cache par salle et le terrain y est peint — repeindre exige de vider ce cache. */
  function clearFloor() {
    floorCache.clear();
  }
  /* Atelier : une image déposée par l'auteur devient un accessoire utilisable tout de suite. Une seule copie de
     chaque image (chantier 8) : les amis vivent dans l'établi Amis (IndexedDB) puis dans content5.js ; ici on ne
     garde que le canvas, plus de `way.props.custom` réécrit en entier à chaque image. Un accessoire de décor déposé
     dans l'établi rythme vaut jusqu'au rechargement : pour le garder, ranger le fichier dans assets/sprites/pixel/. */
  let customs = {};
  function addCustom(name, url) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.drawImage(img, 0, 0);
        props[name] = c;
        customs[name] = url;
        floorCache.clear();
        res(true);
      };
      img.onerror = () => res(false);
      img.src = url;
    });
  }
  function removeCustom(name) {
    delete props[name];
    delete customs[name];
  }
  /* images des amis embarquées dans content5.js : enregistrées une fois, au démarrage (l'établi Amis ne
     réenregistre que ce qui a changé localement) */
  function loadFriends() {
    if (typeof FRIEND_IMAGES === 'object' && FRIEND_IMAGES) for (const k in FRIEND_IMAGES) addCustom(k, FRIEND_IMAGES[k]);
    if (typeof FRIEND_SHEETS === 'object' && FRIEND_SHEETS)
      for (const k in FRIEND_SHEETS) addSheet(k, FRIEND_SHEETS[k].url, FRIEND_SHEETS[k].fw);
  }
  function propNames() {
    return Object.keys(PROP_DEFS)
      .concat(Object.keys(customs).filter(k => !PROP_DEFS[k]))
      .sort();
  }
  /* vignette d'un accessoire pour le DOM (cartes du hub) ; null si l'image n'est pas encore chargée */
  function propCanvas(name, size) {
    const c = props[name];
    if (!c) return null;
    const out = document.createElement('canvas');
    const s = size || 32;
    const k = Math.min(s / c.width, s / c.height);
    out.width = Math.round(c.width * k);
    out.height = Math.round(c.height * k);
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(c, 0, 0, out.width, out.height);
    return out;
  }
  function loadProps() {
    if (typeof fetch !== 'function') return;
    fetch(ASSET_BASE + 'sprites/pixel/index.json')
      .then(r => (r.ok ? r.json() : null))
      .then(list => {
        const files = Array.isArray(list) ? list : [];
        const bases = new Set();
        for (const file of files) {
          const m = VAR_RE.exec(file);
          const name = m ? file.slice(0, m.index) : file;
          const idx = m ? +m[1] - 1 : 0;
          if (!PROP_DEFS[name]) continue; // un fichier dont le nom ne correspond à aucun accessoire est ignoré
          bases.add(name);
          const slot = propVars[name] || (propVars[name] = []);
          const img = new Image();
          img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const g = c.getContext('2d');
            g.imageSmoothingEnabled = false;
            g.drawImage(img, 0, 0);
            slot[idx] = c;
            applyPicks();
          };
          img.src = ASSET_BASE + 'sprites/pixel/' + file + '.png';
        }
        loadIcons(bases);
      })
      .catch(() => loadIcons(new Set()));
  }
  function loadIcons(skip) {
    for (const name of Object.keys(PROP_DEFS)) {
      if (skip.has(name)) continue;
      const pd = PROP_DEFS[name];
      fetch(ASSET_BASE + 'sprites/' + (pd.d || 'western') + '/' + name + '.svg')
        .then(r => (r.ok ? r.text() : null))
        .then(txt => {
          if (!txt) return;
          const svg = txt.replace(/currentColor/g, '#ffffff');
          const img = new Image();
          img.onload = () => {
            const c = pixelize(img, pd.px, pd.color);
            if (c) props[name] = c;
          };
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        })
        .catch(() => {});
    }
  }
  /* dessine un accessoire rastérisé, centré, ajusté dans w×h (ratio conservé), sans lissage */
  function drawProp(ctx, name, x, y, w, h, opts = {}) {
    const c = opts.variant != null ? variantOf(name, opts.variant) : props[name];
    if (!c) return false;
    const s = Math.min(w / c.width, h / c.height);
    const dw = c.width * s,
      dh = c.height * s;
    /* `foot` : y est la ligne de sol, pas le centre — sinon un sprite carré dans une case plus haute flotte au-dessus du socle */
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, opts.foot ? y - dh / 2 : y);
    if (opts.flip) ctx.scale(-1, 1);
    if (opts.rot) ctx.rotate(opts.rot);
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    if (opts.flash || opts.tint) {
      const fx = flashCanvas(dw, dh);
      const g = fx.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, dw, dh);
      g.drawImage(c, 0, 0, dw, dh);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = opts.flash ? 'rgba(255,255,255,.8)' : opts.tint;
      g.fillRect(0, 0, dw, dh);
      ctx.drawImage(fx, 0, 0, dw, dh, -dw / 2, -dh / 2, dw, dh);
    } else ctx.drawImage(c, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    return true;
  }
  const DECO_KIND = {
    skull: 'desert-skull',
    tumbleweed: 'tumbleweed',
    rails: 'rail-road',
    wanted: 'wanted-reward',
    saloon: 'saloon-doors',
    windmill: 'windmill',
    barrels: 'cellar-barrels',
    /* biome 1 */ cross: 'hospital-cross',
    hazard: 'hazard-sign',
    fan: 'computer-fan',
    valve: 'valve',
    cog: 'cog',
    battery: 'battery-pack-alt',
    tubes: 'test-tube-rack',
    pack: 'medical-pack',
    bin: 'trash-can',
    /* biome 2 */ leaf: 'curled-leaf',
    mushrooms: 'mushrooms-cluster',
    mushroom: 'grass-mushroom',
    seedling: 'seedling',
    sprout: 'sprout-disc',
    roots: 'plant-roots',
    flower: 'vine-flower',
    pot: 'cactus-pot',
    /* biome 4 */ lamp: 'magic-lamp',
    lantern: 'paper-lantern',
    spices: 'hot-spices',
    teapot: 'teapot',
    gems: 'gems',
    scarab: 'scarab-beetle',
    eye: 'all-seeing-eye',
    mosque: 'samara-mosque',
    oasis: 'oasis',
    chalice: 'jeweled-chalice',
    hourglass: 'sands-of-time',
    carpet: 'red-carpet',
    incense: 'incense',
    sabre: 'crescent-blade',
    snakejar: 'snake-jar',
  };
  /* décor au sol sans collision (salles du biome 3) */
  function drawDeco(ctx, d) {
    const name = DECO_KIND[d.kind] || d.kind;
    const x = ROOM_X + (d.x + 0.5) * TILE,
      y = ROOM_Y + (d.y + 0.5) * TILE;
    ctx.save();
    ctx.globalAlpha = 0.8;
    drawProp(ctx, name, x, y, TILE * (d.big ? 1.3 : 0.9), TILE * (d.big ? 1.3 : 0.9), { variant: hash2(d.x + 7, d.y + 3) });
    ctx.restore();
  } // rien si l'accessoire n'est pas encore chargé (pas de carré de repli)
  /* dessine un sprite nommé centré en (x, y) ; opts : flip, walk (temps de marche, anim run si > 0), flash, scale, fallback() */
  function draw(ctx, key, x, y, opts = {}) {
    const d = SPRITE_DEFS[key];
    if (d && d.prop) {
      // ennemi « accessoire » (baril, scorpion, crotale) : image rastérisée, roulis ou balancement selon la marche
      const s = (d.size || 32) * (opts.scale || 1);
      const moving = opts.walk != null && opts.walk > 0;
      const t = opts.walk != null ? opts.walk : Time.now;
      const rot = d.roll ? t * 7 : moving ? Math.sin(t * 14) * 0.12 : Math.sin(t * 3) * 0.04;
      if (
        drawProp(ctx, d.prop, x, y - (moving && !d.roll ? Math.abs(Math.sin(t * 14)) * 3 : 0), s, s, {
          flip: opts.flip,
          rot,
          flash: opts.flash,
          tint: opts.tint,
          alpha: opts.alpha,
        })
      )
        return true;
      if (opts.fallback) opts.fallback();
      return false;
    }
    if (!ready || !d) {
      if (opts.fallback) opts.fallback();
      return false;
    } // TODO_SPRITE : fallback Canvas
    if (!opts.tint && d.tint) opts = Object.assign({}, opts, { tint: d.tint }); // teinte propre au sprite (variantes de biome)
    if (d.scale) opts = Object.assign({}, opts, { scale: (opts.scale || 1) * d.scale }); // agrandissement propre au sprite (le Vizir, plus haut que les autres boss)
    const moving = opts.walk != null && opts.walk > 0;
    const set = opts.flash && d.hit ? d.hit : moving ? d.run : d.idle;
    const frame = opts.flash && d.hit ? 0 : Math.floor(((opts.walk != null ? opts.walk : Time.now) * (moving ? 10 : 6)) % d.n);
    const [sx, sy, sw, sh] = set;
    const s = SCALE * (opts.scale || 1);
    const dw = sw * s,
      dh = sh * s;
    const oy = d.foot ? dh / 2 - 14 * (opts.scale || 1) * 1 : 0; // ancrage au pied : le corps déborde vers le haut
    ctx.save();
    ctx.translate(x, y - (d.foot ? oy * 0.5 : 0));
    if (opts.flip) ctx.scale(-1, 1);
    if ((opts.sx != null && opts.sx !== 1) || (opts.sy != null && opts.sy !== 1)) {
      /* écrasement ancré au bas du dessin */
      const bas = dh / 2 - (d.foot ? 8 : 0);
      ctx.translate(0, bas);
      ctx.scale(opts.sx != null ? opts.sx : 1, opts.sy != null ? opts.sy : 1);
      ctx.translate(0, -bas);
    }
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    if (opts.flash || opts.tint) {
      /* flash blanc ou teinte de statut limités aux pixels du sprite : canvas hors écran (sinon le rectangle entier s'éclaire) */
      const fx = flashCanvas(dw, dh);
      const g = fx.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, dw, dh);
      g.drawImage(sheet, sx + frame * sw, sy, sw, sh, 0, 0, dw, dh);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = opts.flash ? `rgba(255,255,255,${opts.flash === true ? 0.75 : Math.min(1, opts.flash) * 0.9})` : opts.tint; // flash à deux temps : 1 puis 0,35
      g.fillRect(0, 0, dw, dh);
      ctx.drawImage(fx, 0, 0, dw, dh, -dw / 2, -dh / 2 - (d.foot ? 8 : 0), dw, dh);
    } else ctx.drawImage(sheet, sx + frame * sw, sy, sw, sh, -dw / 2, -dh / 2 - (d.foot ? 8 : 0), dw, dh);
    ctx.restore();
    return true;
  }
  function tile(ctx, t, dx, dy, w = TILE, h = TILE) {
    if (!ready) return false;
    ctx.drawImage(sheet, t[0], t[1], 16, 16, dx, dy, w, h);
    return true;
  }
  /* sol + murs, mis en cache par salle dans un canvas hors écran */
  function drawFloor(ctx, room) {
    const pal = (G.run && G.run.biome && G.run.biome.palette) || {
      tint: 'rgba(40,70,110,.28)',
      neon: ['#6ee7ff', '#ff9a3c'],
      wall: 'rgba(40,70,110,.35)',
    };
    const cacheKey = room.floorSeed + ':' + (G.run && G.run.biome ? G.run.biome.id : '') + ':' + (room.def ? room.def.id : ''); // floorSeed est le même pour toutes les salles d'un même index : sans l'id, deux salles partageraient leur sol
    let c = floorCache.get(cacheKey);
    if (!c) {
      c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      const rng = makeRng(room.floorSeed);
      g.fillStyle = '#07080d';
      g.fillRect(0, 0, W, H);
      /* décor des bandes hors salle (fenêtres larges) : dessiné à la volée dans drawFloor, voir plus bas */
      for (let ty = 0; ty < ROOM_ROWS; ty++)
        for (let tx = 0; tx < ROOM_COLS; tx++) {
          const x = ROOM_X + tx * TILE,
            y = ROOM_Y + ty * TILE;
          if (!tile(g, rng.chance(0.9) ? TILES.floor[0] : rng.pick(TILES.floor), x, y)) {
            g.fillStyle = (tx + ty) % 2 ? '#141826' : '#161b2b';
            g.fillRect(x, y, TILE, TILE);
          }
        }
      /* teinte froide (labo) + vignette */
      g.fillStyle = pal.tint;
      g.fillRect(ROOM_X, ROOM_Y, ROOM_W, ROOM_H);
      /* terrain peint ici, une fois par salle : eau, boue, ponts, murets, moucharabiehs. Gratuit à l'usage. */
      if (room.grid && typeof Terrain !== 'undefined') Terrain.paint(g, room);
      const v = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 760);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,.55)');
      g.fillStyle = v;
      g.fillRect(ROOM_X, ROOM_Y, ROOM_W, ROOM_H);
      /* grille discrète */
      g.strokeStyle = 'rgba(110,231,255,.035)';
      g.lineWidth = 1;
      for (let tx = 0; tx <= ROOM_COLS; tx++) {
        g.beginPath();
        g.moveTo(ROOM_X + tx * TILE, ROOM_Y);
        g.lineTo(ROOM_X + tx * TILE, ROOM_Y + ROOM_H);
        g.stroke();
      }
      for (let ty = 0; ty <= ROOM_ROWS; ty++) {
        g.beginPath();
        g.moveTo(ROOM_X, ROOM_Y + ty * TILE);
        g.lineTo(ROOM_X + ROOM_W, ROOM_Y + ty * TILE);
        g.stroke();
      }
      /* murs */
      for (let tx = -1; tx <= ROOM_COLS; tx++) {
        const x = ROOM_X + tx * TILE;
        if (!tile(g, TILES.wallFace, x, ROOM_Y - TILE)) {
          g.fillStyle = '#232a44';
          g.fillRect(x, ROOM_Y - TILE, TILE, TILE);
        }
        if (!tile(g, TILES.wallTop, x, ROOM_Y + ROOM_H)) {
          g.fillStyle = '#1a2036';
          g.fillRect(x, ROOM_Y + ROOM_H, TILE, TILE);
        }
      }
      for (let ty = 0; ty < ROOM_ROWS; ty++) {
        const y = ROOM_Y + ty * TILE;
        if (!tile(g, TILES.wallLeft, ROOM_X - TILE, y)) {
          g.fillStyle = '#1a2036';
          g.fillRect(ROOM_X - TILE, y, TILE, TILE);
        }
        if (!tile(g, TILES.wallRight, ROOM_X + ROOM_W, y)) {
          g.fillStyle = '#1a2036';
          g.fillRect(ROOM_X + ROOM_W, y, TILE, TILE);
        }
      }
      g.fillStyle = pal.wall;
      g.fillRect(ROOM_X - TILE, ROOM_Y - TILE, ROOM_W + 2 * TILE, TILE);
      g.fillRect(ROOM_X - TILE, ROOM_Y + ROOM_H, ROOM_W + 2 * TILE, TILE);
      g.fillRect(ROOM_X - TILE, ROOM_Y, TILE, ROOM_H);
      g.fillRect(ROOM_X + ROOM_W, ROOM_Y, TILE, ROOM_H);
      /* néons sur le mur du haut */
      for (let i = 0; i < 5; i++) {
        const x = ROOM_X + ((i + 0.5) * ROOM_W) / 5;
        g.fillStyle = i % 2 ? pal.neon[0] : pal.neon[1];
        g.shadowColor = g.fillStyle;
        g.shadowBlur = 16;
        g.fillRect(x - 30, ROOM_Y - 8, 60, 3);
        g.shadowBlur = 0;
      }
      g.strokeStyle = 'rgba(110,231,255,.35)';
      g.lineWidth = 2;
      g.strokeRect(ROOM_X - 1, ROOM_Y - 1, ROOM_W + 2, ROOM_H + 2);
      floorCache.set(cacheKey, c);
      if (floorCache.size > 12) floorCache.delete(floorCache.keys().next().value);
    }
    /* bandes hors 1280×720 : murs sombres répétés, pour les fenêtres plus larges ou plus hautes que 16:9 */
    const V = Engine.view;
    if (V.ox > 0 || V.oy > 0) {
      ctx.save();
      ctx.fillStyle = '#05060a';
      ctx.fillRect(-V.ox, -V.oy, V.w, V.h);
      ctx.globalAlpha = 0.55;
      const band = (x0, y0, w, h) => {
        for (let y = Math.floor(y0 / TILE) * TILE; y < y0 + h; y += TILE)
          for (let x = Math.floor(x0 / TILE) * TILE; x < x0 + w; x += TILE) {
            if (!tile(ctx, TILES.wallFace, x, y)) {
              ctx.fillStyle = '#12162a';
              ctx.fillRect(x, y, TILE, TILE);
            }
          }
      };
      if (V.ox > 0) {
        band(-V.ox, -V.oy, V.ox, V.h);
        band(W, -V.oy, V.ox, V.h);
      }
      if (V.oy > 0) {
        band(-V.ox, -V.oy, V.w, V.oy);
        band(-V.ox, H, V.w, V.oy);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(4,5,9,.55)';
      if (V.ox > 0) {
        ctx.fillRect(-V.ox, -V.oy, V.ox, V.h);
        ctx.fillRect(W, -V.oy, V.ox, V.h);
      }
      if (V.oy > 0) {
        ctx.fillRect(-V.ox, -V.oy, V.w, V.oy);
        ctx.fillRect(-V.ox, H, V.w, V.oy);
      }
      ctx.restore();
    }
    ctx.drawImage(c, 0, 0);
  }
  /* obstacle décoré : `kind` de la salle → accessoire. Un même kind peut avoir une variante par biome (cf. BLOCK_BY_BIOME). */
  const BLOCK_KIND = {
    cactus: 'cactus',
    rock: 'rock',
    barrel: 'barrel',
    crate: 'wooden-crate',
    wagon: 'old-wagon',
    cart: 'mine-wagon',
    barrels: 'cellar-barrels',
    skull: 'animal-skull',
    windmill: 'windmill',
    tank: 'chemical-tank',
    fuel: 'fuel-tank',
    locker: 'lockers',
    pipe: 'straight-pipe',
    drip: 'medical-drip',
    microscope: 'microscope',
    bin: 'trash-can',
    planter: 'flower-pot',
    bush: 'vines',
    roots: 'tree-roots',
    trap_plant: 'carnivorous-plant',
    flask: 'bubbling-flask',
    fountain: 'water-fountain',
    column: 'ancient-columns',
    jar: 'amphora',
    vase: 'porcelain-vase',
    basin: 'fountain',
    palm: 'palm-tree',
    basket: 'basket',
    brazier: 'fire-bowl',
    archway: 'arabic-door',
    drapes: 'theater-curtains',
  };
  /* certains accessoires débordent volontairement de leur case : un saguaro d'une tuile de large est plus haut qu'elle */
  const BLOCK_GROW = { cactus: 1.7, palm: 1.4, column: 1.2, windmill: 1.3, drapes: 1.2, archway: 1.2 };
  /* mélange de deux entiers : sans ça, une rangée d'obstacles alignés tirait tous la même variante (x pair, y constant → même parité) */
  function hash2(x, y) {
    let h = ((x | 0) * 374761393 + (y | 0) * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function drawBlock(ctx, o) {
    const name = o.kind && BLOCK_KIND[o.kind];
    if (name && props[name]) {
      /* accessoire : ombre elliptique au sol puis image ajustée à l'emprise (elle déborde un peu vers le haut). Aucun cadre : la
         silhouette suffit, un rectangle derrière se verrait comme une « ombre carrée ». */
      ctx.save();
      /* socle : marque l'emprise qui bloque (sans le rectangle plein derrière l'objet, qui se lisait comme une « ombre carrée ») */
      const bh = Math.min(14, o.ph * 0.3),
        by = o.py + o.ph - bh;
      const pal = (G.run && G.run.biome && G.run.biome.palette) || {};
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.beginPath();
      ctx.ellipse(o.px + o.pw / 2, o.py + o.ph - 3, o.pw * 0.46, Math.min(10, o.ph * 0.2), 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(8,10,18,.5)';
      ctx.fillRect(o.px + 2, by, o.pw - 4, bh);
      ctx.strokeStyle = (pal.neon && pal.neon[0]) || '#ffd166';
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(o.px + 3, by + bh - 1);
      ctx.lineTo(o.px + o.pw - 3, by + bh - 1);
      ctx.stroke();
      ctx.globalAlpha = 1;
      /* posé sur le sol, agrandi selon le kind (BLOCK_GROW), variante tirée de la position de l'obstacle */
      const grow = BLOCK_GROW[o.kind] || 1;
      drawProp(ctx, name, o.px + o.pw / 2, o.py + o.ph + 3, (o.pw + 6) * grow, (o.ph + 10) * grow, {
        foot: true,
        variant: hash2(o.x, o.y),
      });
      ctx.restore();
      return;
    }
    ctx.save();
    /* ombre portée au sol */
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(o.px + 6, o.py + 8, o.pw, o.ph);
    /* corps : dalle métallique claire, bien détachée du sol */
    ctx.fillStyle = '#4a5578';
    ctx.fillRect(o.px, o.py, o.pw, o.ph);
    for (let ty = 0; ty < o.h; ty++)
      for (let tx = 0; tx < o.w; tx++) {
        const x = o.px + tx * TILE,
          y = o.py + ty * TILE;
        const t = o.h > 1 ? (ty === 0 ? TILES.column[0] : ty === o.h - 1 ? TILES.column[2] : TILES.column[1]) : TILES.column[2];
        ctx.globalAlpha = 0.9;
        tile(ctx, t, x, y);
        ctx.globalAlpha = 1;
      }
    /* face supérieure claire + arêtes lumineuses */
    ctx.fillStyle = 'rgba(180,200,240,.22)';
    ctx.fillRect(o.px, o.py, o.pw, Math.min(10, o.ph));
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(o.px, o.py + o.ph - 6, o.pw, 6);
    ctx.strokeStyle = '#9fd8ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#6ee7ff';
    ctx.shadowBlur = 10;
    ctx.strokeRect(o.px + 1, o.py + 1, o.pw - 2, o.ph - 2);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(o.px + 2, o.py + o.ph - 2);
    ctx.lineTo(o.px + 2, o.py + 2);
    ctx.lineTo(o.px + o.pw - 2, o.py + 2);
    ctx.stroke();
    /* bandes d'avertissement jaunes/noires au pied (lisible même en périphérie) */
    ctx.save();
    ctx.beginPath();
    ctx.rect(o.px + 2, o.py + o.ph - 12, o.pw - 4, 8);
    ctx.clip();
    for (let x = o.px - 8; x < o.px + o.pw + 8; x += 12) {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(x, o.py + o.ph - 4);
      ctx.lineTo(x + 6, o.py + o.ph - 12);
      ctx.lineTo(x + 12, o.py + o.ph - 12);
      ctx.lineTo(x + 6, o.py + o.ph - 4);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  }
  function drawChest(ctx, ch) {
    ctx.save();
    const near = ch.near && !ch.opened;
    /* le halo grossit à l'approche (ch.approach, 0 loin → 1 à portée), puis bat quand on peut ouvrir */
    const ap = ch.opened ? 0 : ch.approach || 0;
    ctx.shadowColor = '#ffb347';
    ctx.shadowBlur = 10 + ap * 18 + (near ? 8 + Math.sin(Time.now * 6) * 8 : 0);
    if (ap > 0.05) {
      ctx.save();
      ctx.globalAlpha = 0.18 * ap;
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.ellipse(ch.x, ch.y + 14, 22 + ap * 26, 9 + ap * 10, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    /* l'ouverture : le couvercle se lève en CHEST_OPEN_MS, le coffre sursaute au départ */
    const openK = ch.opened ? clamp((ch.openT != null ? ch.openT : 1) / (CHEST_OPEN_MS / 1000), 0, 1) : 0;
    const jump = ch.opened && openK < 1 ? Math.sin(openK * Math.PI) * 6 : 0;
    const d = SPRITE_DEFS.chest;
    if (ready) {
      const f = ch.opened ? (openK < 0.4 ? 1 : 2) : 0;
      ctx.drawImage(sheet, d.idle[0] + f * 16, d.idle[1], 16, 16, ch.x - 24, ch.y - 24 - jump, 48, 48);
    } else {
      ctx.fillStyle = ch.opened ? '#5a4a2a' : '#b8862b';
      ctx.fillRect(ch.x - 22, ch.y - 16, 44, 32);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(ch.x - 4, ch.y - 4, 8, 8);
    } // TODO_SPRITE
    ctx.shadowBlur = 0;
    if (near) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(STR.interact, ch.x, ch.y - 36);
    }
    ctx.restore();
  }
  /* ---------- Corps dessiné : le personnage est habillé dès la première salle ----------
     Il n'y a plus de paliers de tenue. Un personnage sans image de l'auteur prend directement sa planche de
     sprites ; celui qui porte un visage garde le corps dessiné, habillé, pour que le visage reste visible.
     Dessin en « pixels » de 3 px sur une grille 16×28, même ancrage que les sprites (pieds). */
  /* ---- planches d'animation de l'auteur ----
     Une planche est une grille de cases carrées lues dans l'ordre de lecture. Elle est stockée SANS retouche :
     ni recadrage ni redimensionnement, sinon la grille ne tombe plus juste. La taille de case est devinée à
     partir des colonnes et des lignes réellement occupées — une planche a des gouttières transparentes. */
  const sheets = {};
  function addSheet(name, url, fw) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.drawImage(img, 0, 0);
        const size = fw || guessFrame(g, img.width, img.height);
        sheets[name] = {
          c,
          fw: size,
          fh: size,
          cols: Math.max(1, Math.round(img.width / size)),
          rows: Math.max(1, Math.round(img.height / size)),
        };
        sheets[name].n = framesOf(g, img.width, img.height, size, sheets[name].cols, sheets[name].rows);
        sheets[name].foot = footOf(g, img.width, img.height, size); // où sont les pieds dans la case, pour les poser au sol
        res(sheets[name]);
      };
      img.onerror = () => res(null);
      img.src = url;
    });
  }
  function guessFrame(g, w, h) {
    try {
      const d = g.getImageData(0, 0, w, h).data;
      const runs = (n, m, at) => {
        let c = 0,
          on = false;
        for (let i = 0; i < n; i++) {
          let v = false;
          for (let j = 0; j < m && !v; j++) if (d[at(i, j) * 4 + 3] > 10) v = true;
          if (v && !on) c++;
          on = v;
        }
        return c;
      };
      const cols = runs(w, h, (x, y) => y * w + x),
        rows = runs(h, w, (y, x) => y * w + x);
      if (cols > 0 && rows > 0 && w % cols === 0 && h % rows === 0 && w / cols === h / rows) return w / cols;
    } catch (e) {
      /* image d'une autre origine : on retombe sur la valeur par défaut */
    }
    return Math.min(w, h) >= 48 && w % 48 === 0 ? 48 : Math.min(w, h);
  }
  /* Nombre d'images réellement dessinées. Une planche de 7 images livrée en grille 3×3 traîne deux cases vides
     à la fin : comptées comme des images, le personnage disparaîtrait deux temps sur neuf à chaque boucle. Seules
     les cases vides de FIN sont retirées — une case vide au milieu est une image voulue (un clignotement). */
  function framesOf(g, w, h, size, cols, rows) {
    const total = cols * rows;
    try {
      const d = g.getImageData(0, 0, w, h).data;
      for (let i = total - 1; i > 0; i--) {
        const cx = (i % cols) * size,
          cy = Math.floor(i / cols) * size;
        for (let y = cy; y < cy + size && y < h; y++)
          for (let x = cx; x < cx + size && x < w; x++) if (d[(y * w + x) * 4 + 3] > 10) return i + 1;
      }
    } catch (e) {
      /* image d'une autre origine : on garde la grille entière */
    }
    return total;
  }
  /* Fraction de la case occupée jusqu'au bas du dessin. Une planche a presque toujours du vide sous les pieds :
     sans ce repère, le personnage flotte au-dessus du sol d'autant de pixels que la marge. */
  function footOf(g, w, h, size) {
    try {
      const d = g.getImageData(0, 0, w, h).data;
      let bot = 0;
      for (let y = 0; y < h; y++) {
        const inCell = y % size;
        if (inCell <= bot) continue;
        for (let x = 0; x < w; x++)
          if (d[(y * w + x) * 4 + 3] > 10) {
            bot = inCell;
            break;
          }
      }
      return bot ? (bot + 1) / size : 1;
    } catch (e) {
      return 1;
    }
  }
  const sheetInfo = name => sheets[name] || null;
  /* vignette DOM de la première image d'une planche (cartes du hub) */
  function sheetCanvas(name, size) {
    const s = sheets[name];
    if (!s) return null;
    /* multiple entier de la case, ou sa moitié exacte : 48 → 24, 48 ou 96, jamais 34 (des lignes perdues) */
    const voulu = size || 32;
    const k = voulu >= s.fw ? Math.max(1, Math.floor(voulu / s.fw)) : 0.5;
    const out = document.createElement('canvas');
    out.width = out.height = Math.round(s.fw * k);
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(s.c, 0, 0, s.fw, s.fh, 0, 0, out.width, out.height);
    return out;
  }
  /* dessine la case `idx` d'une planche, ajustée dans un carré de `size`, sans lissage */
  function drawSheet(ctx, name, idx, x, y, size, opts = {}) {
    const s = sheets[name];
    if (!s) return false;
    const i = (((idx | 0) % s.n) + s.n) % s.n;
    const cx = (i % s.cols) * s.fw,
      cy = Math.floor(i / s.cols) * s.fh;
    const k = size / s.fw;
    const dw = s.fw * k,
      dh = s.fh * k;
    /* `foot` : y est la ligne de sol, pas le centre de la case — le bas du dessin s'y pose, marge comprise */
    /* Le bas du DESSIN (pas de la case) tombe sur y : la case déborde sous les pattes de (1 − foot) × dh.
       Un « − dh/2 » de trop ici faisait flotter les compagnons d'une demi-case au-dessus de leur ombre. */
    const oy = opts.foot ? -((s.foot != null ? s.foot : 1) - 0.5) * dh : 0;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, y + oy);
    if (opts.flip) ctx.scale(-1, 1);
    /* squash & stretch et inclinaison, ancrés aux pieds : le bas du dessin ne bouge pas */
    if (opts.rot || (opts.sx != null && opts.sx !== 1) || (opts.sy != null && opts.sy !== 1)) {
      ctx.translate(0, dh / 2);
      if (opts.rot) ctx.rotate(opts.rot);
      ctx.scale(opts.sx != null ? opts.sx : 1, opts.sy != null ? opts.sy : 1);
      ctx.translate(0, -dh / 2);
    }
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    if (opts.flash) {
      /* le blanc ne couvre que les pixels du dessin : canvas hors écran (un source-atop sur le canvas du jeu, dont le sol
         est opaque, blanchissait toute la case — le joueur touché devenait un rectangle) */
      const fx = flashCanvas(dw, dh);
      const g = fx.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, dw, dh);
      g.drawImage(s.c, cx, cy, s.fw, s.fh, 0, 0, dw, dh);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = `rgba(255,255,255,${opts.flash === true ? 0.75 : Math.min(1, opts.flash) * 0.9})`;
      g.fillRect(0, 0, dw, dh);
      ctx.drawImage(fx, 0, 0, dw, dh, -dw / 2, -dh / 2, dw, dh);
    } else ctx.drawImage(s.c, cx, cy, s.fw, s.fh, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    return true;
  }
  /* Cadences des clips. `once` : joue une fois et garde la dernière image (mort), ou revient au repos (tir, ramassage). */
  const CLIPS = {
    idle: { fps: 6 },
    walk: { fps: 12 },
    fire: { fps: 14, once: true },
    pick: { fps: 12, once: true },
    death: { fps: 8, once: true },
    attack: { fps: 14, once: true },
    hurt: { fps: 10, once: true },
  }; // clips propres aux compagnons

  /* Un sprite peut être une image unique ou un jeu de vues { s, e, n } — sud (face), est (profil), nord (dos).
     L'ouest est l'est retourné : trois images suffisent aux quatre directions. Une vue manquante retombe sur le sud. */
  function pickDir(spec, dir) {
    if (!spec) return null;
    if (typeof spec === 'string') return spec;
    return spec[dir] || spec.s || spec.e || spec.n || null;
  }
  /* direction d'affichage à partir d'un déplacement ou d'une visée. Le profil est privilégié (marge de 1,2) :
     c'est la vue la plus lisible, et souvent la mieux dessinée. */
  function dirFrom(dx, dy) {
    if (Math.abs(dy) > Math.abs(dx) * 1.2) return { dir: dy > 0 ? 's' : 'n', flip: false };
    return { dir: 'e', flip: dx < 0 };
  }
  /* Démarche pour un sprite figé : un rebond, un léger balancement et une respiration. Ce n'est pas une animation,
     c'est ce qui empêche une image unique de paraître collée au sol en attendant les vraies planches. */
  function gait(walk) {
    if (!(walk > 0)) return { bob: Math.sin(Time.now * 1.43) * 0.6, tilt: 0, sx: 1, sy: 1 }; // respiration lente, figée en pause
    const t = walk * 10;
    return {
      bob: Math.abs(Math.sin(t)) * 2.5,
      tilt: Math.sin(t) * 0.05,
      sx: 1 - Math.abs(Math.sin(t)) * 0.04,
      sy: 1 + Math.abs(Math.sin(t)) * 0.05,
    };
  }
  /* ---------- Un corps, une ligne de sol ----------
     Tout ce qui se dessine debout — joueur à planche, sprite entier, visage sur corps, compagnon à planche ou
     à image, planche du jeu — pose ses pieds à `y + SOL`. Un corps se décrit par trois nombres depuis son point
     d'ancrage (x, y) : `sol` (les pieds sont à y + sol), `hauteur` (du sommet aux pieds), `main` (la main est à
     y + main). L'ombre, l'arme, la zone de contact et l'ordre de dessin lisent ces trois nombres et rien d'autre.
     Avant, six façons de dessiner un corps avaient chacune leur ligne de sol : l'arme sortait de l'entrejambe des
     grands, les petits flottaient, un chat devant le joueur passait derrière. */
  const SOL = 25;
  const HAND = 0.45; // fraction du corps au-dessus des pieds : la main d'une silhouette debout, arme tendue
  /* Où s'arrête vraiment le dessin d'un sprite du jeu dans sa case (fraction de la hauteur), mesuré une fois :
     les planches du jeu laissent du vide sous les pieds, et le chiffre change d'un sprite à l'autre. */
  const defBornes = {};
  function spriteBornes(key) {
    if (defBornes[key]) return defBornes[key];
    const d = SPRITE_DEFS[key];
    if (!ready || !d || !d.idle) return { haut: 0, bas: 1 };
    try {
      const [sx, sy, sw, sh] = d.idle;
      const c = document.createElement('canvas');
      c.width = sw;
      c.height = sh;
      const g = c.getContext('2d');
      g.drawImage(sheet, sx, sy, sw, sh, 0, 0, sw, sh);
      const px = g.getImageData(0, 0, sw, sh).data;
      let haut = sh,
        bas = -1;
      for (let yy = 0; yy < sh; yy++)
        for (let xx = 0; xx < sw; xx++)
          if (px[(yy * sw + xx) * 4 + 3] > 10) {
            haut = Math.min(haut, yy);
            bas = yy;
          }
      defBornes[key] = bas < 0 ? { haut: 0, bas: 1 } : { haut: haut / sh, bas: (bas + 1) / sh }; // le chevalier laisse 8 rangées vides EN HAUT, aucune en bas
    } catch (e) {
      defBornes[key] = { haut: 0, bas: 1 };
    }
    return defBornes[key];
  }
  const spriteFoot = key => spriteBornes(key).bas;
  /* Décalage à donner à draw() pour qu'un sprite du jeu pose ses pieds à y + SOL : draw() ancre la case à sa
     manière (voir son `oy`), on corrige de la différence, mesurée. */
  function spriteDecalage(key, scale) {
    const d = SPRITE_DEFS[key] || SPRITE_DEFS.player;
    const dh = (d.idle ? d.idle[3] : 28) * SCALE * (scale || 1) * (d.scale || 1);
    const s2 = scale || 1;
    const hautCase = d.foot ? -(dh / 2 - 14 * s2) * 0.5 - dh / 2 - 8 : -dh / 2; // où draw() met le haut de la case, depuis y
    const bas = hautCase + dh * spriteFoot(key);
    return SOL - bas;
  }
  function clipDe(opts) {
    const n = opts.anim && opts.clip && opts.anim[opts.clip] ? opts.anim[opts.clip] : null;
    return n && sheets[n] ? n : null;
  }
  function corps(key, opts = {}) {
    const sc = opts.scale || 1;
    const clip = clipDe(opts);
    if (clip) {
      const inf = sheets[clip];
      const h = (opts.size || 64) * sc * (inf.foot != null ? inf.foot : 1);
      return { sol: SOL * sc, hauteur: h, main: SOL * sc - HAND * h };
    }
    const bodyName = pickDir(opts.body, opts.dir || 's');
    const body = bodyName ? props[bodyName] : null;
    if (body) {
      const w = (opts.size || 64) * sc;
      const k = Math.min(w / body.width, w / body.height);
      const h = body.height * k;
      return { sol: SOL * sc, hauteur: h, main: SOL * sc - HAND * h };
    }
    if (pickDir(opts.face, opts.dir || 's')) {
      const h = 25 * SCALE * sc; // visage (8 rangées) + corps de la planche coupé sous le cou (17 rangées), en pixels de 3
      return { sol: SOL * sc, hauteur: h, main: SOL * sc - HAND * h };
    }
    const d = SPRITE_DEFS[key] || SPRITE_DEFS.player;
    const b = spriteBornes(key);
    const h = (d.idle ? d.idle[3] : 28) * SCALE * sc * (d.scale || 1) * (b.bas - b.haut); // rangées réellement dessinées
    return { sol: SOL * sc, hauteur: h, main: SOL * sc - HAND * h };
  }
  /* Hauteur de main en coordonnées écran : là où se dessine l'arme. Une lecture du descripteur, rien de plus. */
  function handY(key, y, opts = {}) {
    return y + corps(key, opts).main;
  }
  function drawBody(ctx, key, x, y, opts = {}) {
    /* `body` : sprite entier fourni par l'auteur, il remplace le corps dessiné. Il est posé sur la ligne de sol du
       corps standard (y + 25 px à l'échelle 3) et dessiné SANS lissage, à la taille demandée : une image de 32 px
       affichée en 64 garde des pixels carrés. Une image de 16 px et une de 32 px se valent ici, c'est le multiple
       d'affichage qui compte, pas la finesse de la source. */
    /* planche d'animation : elle prime sur tout le reste — c'est le dessin le plus fini dont on dispose */
    const clip = opts.anim && opts.clip && opts.anim[opts.clip] ? opts.anim[opts.clip] : null;
    if (clip && sheets[clip]) {
      const sc = opts.scale || 1;
      const size = (opts.size || 64) * sc;
      const inf = sheets[clip];
      const cf = CLIPS[opts.clip] || CLIPS.idle;
      let f = Math.floor((opts.clipT || 0) * (opts.fps || cf.fps)); // `fps` : cadence imposée (le tir suit l'arme)
      if (cf.once) f = Math.min(f, inf.n - 1);
      else f %= inf.n;
      /* la planche de marche anime déjà les pas : pas de rebond par-dessus — mais le squash & stretch et l'inclinaison
         de la démarche, eux, s'appliquent (à moitié) : c'est ce qui donne du poids à un personnage dessiné */
      const g2 = gait(opts.walk || 0);
      const foot = inf.foot != null ? inf.foot : 1; // les pieds du dessin tombent sur la ligne de sol
      const sq = opts.sx != null || opts.sy != null;
      drawSheet(ctx, clip, f, x, y + SOL * sc - (foot - 0.5) * size - (opts.clip === 'walk' ? 0 : g2.bob), size, {
        flip: opts.flip,
        alpha: opts.alpha,
        flash: opts.flash,
        rot: g2.tilt * 0.5 * (opts.flip ? -1 : 1),
        sx: (sq ? opts.sx || 1 : 1) * (1 + (g2.sx - 1) * 0.5),
        sy: (sq ? opts.sy || 1 : 1) * (1 + (g2.sy - 1) * 0.5),
      });
      return true;
    }
    const bodyName = pickDir(opts.body, opts.dir || 's');
    const body = bodyName ? props[bodyName] : null;
    if (body) {
      const s = opts.size || 64;
      const sc = opts.scale || 1;
      const w = s * sc;
      const k = Math.min(w / body.width, w / body.height);
      const dw = body.width * k,
        dh = body.height * k;
      const g2 = gait(opts.walk || 0);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(x, y + SOL * sc - dh / 2 - g2.bob);
      if (opts.flip) ctx.scale(-1, 1);
      ctx.rotate(g2.tilt * (opts.flip ? -1 : 1));
      ctx.scale(g2.sx, g2.sy);
      if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
      ctx.drawImage(body, -dw / 2, -dh / 2, dw, dh);
      if (opts.flash) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
      }
      ctx.restore();
      return true;
    }
    /* `face` : image de l'auteur collée à la place de la tête. Un personnage qui en porte une garde toujours le corps
       dessiné en pixels (jamais la planche de sprites), sinon le visage disparaîtrait dès la tenue complète. */
    const face = pickDir(opts.face, opts.dir || 's') ? props[pickDir(opts.face, opts.dir || 's')] : null;
    if (!face) return draw(ctx, key, x, y + spriteDecalage(key, opts.scale), opts); // planche du jeu, pieds à y + SOL
    if (!ready) return false; // le visage se pose sur le corps de la planche : sans planche chargée, rien à dessiner
    const d = SPRITE_DEFS[key] || SPRITE_DEFS.player;
    const u = SCALE * (opts.scale || 1);
    const left = -8 * u;
    const top = SOL * (opts.scale || 1) - 25 * u; // 25 rangées : 8 de visage, 17 de corps — les pieds à y + SOL
    const moving = opts.walk != null && opts.walk > 0;
    const step = moving ? (Math.floor(opts.walk * 10) % 2 ? 1 : -1) : 0;
    const bob = moving && step > 0 ? 1 : 0;
    ctx.save();
    ctx.translate(x, y);
    if (opts.flip) ctx.scale(-1, 1);
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    /* le visage de l'auteur à la place de la tête */
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (opts.flip) ctx.scale(-1, 1);
    ctx.drawImage(face, left + (opts.flip ? -12 : 4) * u, top + bob * u, 8 * u, 8 * u);
    ctx.restore();
    if (opts.flash) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#fff';
      ctx.fillRect(left + 4 * u, top + bob * u, 8 * u, 8 * u);
      ctx.globalAlpha = opts.alpha != null ? opts.alpha : 1;
    }
    /* le corps de la planche, sans la tête (coupé sous le cou) : la tenue la plus soignée, et le visage reste */
    const [sx, sy, sw, sh] = moving ? d.run : d.idle;
    const frame = Math.floor((opts.walk || Time.now) * (moving ? 10 : 6)) % d.n;
    const cut = 10;
    const hCorps = 17 * u; // les 17 rangées sous le cou, quelle que soit la case du sprite
    const piedRow = Math.max(cut + 1, Math.round(sh * spriteFoot(key))); // on coupe aussi le vide sous les pieds de la planche
    ctx.drawImage(sheet, sx + frame * sw, sy + cut, sw, piedRow - cut, left, top + (8 + bob) * u, sw * u, hCorps);
    if (opts.flash) {
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.fillRect(left, top + (8 + bob) * u, sw * u, hCorps);
    }
    ctx.restore();
    return true;
  }
  function portraitBody(key, scale = 5, face, body, size, anim) {
    const c = document.createElement('canvas');
    /* Un personnage à planche est dessiné à ×3 de sa case (48 → 144 px), pixels carrés, et respire au repos.
       Sans ce cas, le portrait retombait sur la planche du jeu : Martin s'affichait en chevalier orange. */
    const planche = anim && anim.idle && sheets[anim.idle];
    const tailleP = planche ? planche.fw * 3 : 0;
    c.width = planche ? Math.max(96, Math.ceil(tailleP * 0.9)) : 16 * scale;
    c.height = planche ? Math.ceil(tailleP * 1.05) + 8 : 30 * scale;
    c.className = 'portrait-canvas';
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const drawIt = () => {
      g.clearRect(0, 0, c.width, c.height);
      if (planche)
        drawBody(g, key, c.width / 2, c.height - 8 - 25, { anim, clip: 'idle', clipT: performance.now() / 1000, size: tailleP, walk: 0 });
      else drawBody(g, key, c.width / 2, c.height - 8, { scale: scale / SCALE, walk: 0, face, body, size });
      if (c.isConnected) setTimeout(drawIt, 250);
      else
        setTimeout(() => {
          if (c.isConnected) drawIt();
        }, 500);
    };
    drawIt();
    return c;
  }
  return {
    load,
    loadProps,
    drawProp,
    drawDeco,
    clearFloor,
    addCustom,
    removeCustom,
    loadFriends,
    propNames,
    propCanvas,
    icon,
    ICONS,
    pickDir,
    dirFrom,
    gait,
    addSheet,
    drawSheet,
    sheetInfo,
    sheetCanvas,
    CLIPS,
    draw,
    drawBody,
    handY,
    corps,
    SOL,
    portraitBody,
    tile,
    drawFloor,
    drawBlock,
    drawChest,
    setVariant,
    clearVariants,
    variantOf,
    get variants() {
      return propVars;
    },
    get picks() {
      return propForced();
    },
    get ready() {
      return ready;
    },
    get failed() {
      return failed;
    },
  };
})();

/* ---------- Musique : pistes CC-BY (voir CREDITS.md), fallback génératif ---------- */
const Music = (() => {
  /* Musiques du joueur dans assets/music/ : menu.mp3, hub.mp3, biome1.mp3 (salles 1-4 et 6-8 du biome 1), boss1.mp3 (salles 5 et 9),
     puis biome2.mp3 / boss2.mp3 pour le biome 2, etc. (.ogg et .m4a acceptés). Fichier absent → musique générative. */
  const resolved = {};
  /* 'biome' / 'boss' → 'biome1' / 'boss1' selon le biome de la run courante */
  /* 'biome' → biome1-1 (salles 1-4) ou biome1-2 (salles 6-8) ; 'boss' → boss1. Replis : biome1-2 → biome1-1 (qui reprend sa position) → biome1 (ancien nom). */
  function keyFor(kind) {
    if (kind === 'hub' || kind === 'menu') return kind;
    const n = (G.run && G.run.biome && G.run.biome.order) || 1;
    if (kind === 'biome_b') return 'biome' + n + '-2';
    if (kind === 'biome') return 'biome' + n + (G.room && G.room.index >= 6 ? '-2' : '-1');
    return kind + n;
  }
  async function resolve(key) {
    if (resolved[key]) return resolved[key];
    for (const ext of ['mp3', 'ogg', 'm4a']) {
      const url = ASSET_BASE + 'music/' + key + '.' + ext;
      try {
        const r = await fetch(url, { method: 'HEAD' });
        if (r.ok) {
          resolved[key] = url;
          return url;
        }
      } catch (e) {
        break;
      } // file:// → fetch impossible → génératif
    }
    if (/^biome\d+-2$/.test(key)) {
      const base = await resolve(key.slice(0, -2) + '-1');
      resolved[key] = base;
      return base;
    } // pas de 2e piste : la 1re continue
    if (/^biome\d+-1$/.test(key)) {
      const base = await resolve(key.slice(0, -2));
      resolved[key] = base;
      return base;
    } // ancien nom biome1.mp3
    if (key === 'menu') {
      const h = await resolve('hub');
      resolved.menu = h;
      return h;
    }
    if (key === 'hub') {
      const m = await resolve('menu');
      resolved.hub = m;
      return m;
    } // pas de hub.mp3 : le hub garde la musique du menu
    resolved[key] = null;
    return null;
  }
  let current = null,
    currentUrl = null,
    generative = false,
    enabled = true,
    armed = false;
  const preloaded = {};
  let pending = null; // bascule programmée (sur la mesure)
  const st8 = { rate: 1, ramp: null, calmAt: null, cutoff: 20000, heart: 0 }; // état « la musique respire »
  const positions = {}; // position de lecture mémorisée par piste : la musique du biome reprend en salle 6 là où elle s'était arrêtée, idem pour le boss en salle 9
  function remember() {
    try {
      if (currentUrl && AudioEngine.musicState) {
        const st = AudioEngine.musicState();
        if (st.el && st.el.t > 0) positions[currentUrl] = st.el.t;
      }
    } catch (e) {
      /* */
    }
  }
  /* précharge (cache navigateur) les pistes d'un biome pour un démarrage immédiat en salle */
  function preload(kinds) {
    for (const k of kinds) {
      const key = keyFor(k);
      resolve(key).then(url => {
        if (!url || preloaded[url]) return;
        preloaded[url] = { ready: false };
        fetch(url)
          .then(r => (r.ok ? r.blob() : null))
          .then(b => {
            if (b) {
              preloaded[url].blobUrl = URL.createObjectURL(b);
              preloaded[url].ready = true;
            }
          })
          .catch(() => {});
      });
    }
  }
  function play(kind) {
    const key = keyFor(kind);
    if (!enabled || current === key) return;
    current = key;
    if (!AudioEngine.isReady || !AudioEngine.isReady()) return;
    resolve(key).then(url => {
      if (current !== key) return;
      const mood = key.startsWith('boss') ? 'boss' : key === 'hub' || key === 'menu' ? 'hub' : 'biome';
      if (!url) {
        remember();
        generative = true;
        currentUrl = null;
        AudioEngine.stopMusic && AudioEngine.stopMusic(1);
        AudioEngine.startGenerativeMusic(mood);
        return;
      }
      const st = AudioEngine.musicState ? AudioEngine.musicState() : null;
      if (url === currentUrl && !generative && st && st.hasTrack && st.el && !st.el.paused) return; // même piste déjà en cours : on continue sans coupure (si elle est en pause — lecture refusée avant le premier geste — on relance)
      const playing = !generative && st && st.hasTrack && st.el && !st.el.paused && st.el.t > 0.1 && !Beat.info.internal;
      const doStart = (fadeIn, fadeOut, forceOffset) => {
        if (current !== key) return;
        remember();
        generative = false;
        currentUrl = url;
        const src = preloaded[url] && preloaded[url].ready ? preloaded[url].blobUrl : url; // déjà téléchargé → lecture locale immédiate
        const p = AudioEngine.playMusic(src, {
          fadeIn,
          fadeOut,
          loop: true,
          stream: true,
          offset: forceOffset != null ? forceOffset : alignedOffset(url),
        });
        if (p && p.then)
          p.then(ok => {
            if (!ok && current === key) {
              generative = true;
              AudioEngine.startGenerativeMusic(key.startsWith('boss') ? 'boss' : key === 'hub' || key === 'menu' ? 'hub' : 'biome');
            }
          });
      };
      if (pending) {
        clearTimeout(pending);
        pending = null;
      }
      const bossEntry = key.startsWith('boss') && !(current || '').startsWith('boss');
      if (!playing || G.attract) {
        doStart(0.6, 0.8);
        return;
      }
      /* une piste joue : on attend la fin de la mesure ; entrée de boss = coupure nette, un souffle, puis le morceau de boss part sur son premier temps */
      const wait = Math.min(2.2, Beat.timeToNextBar());
      pending = setTimeout(() => {
        pending = null;
        if (current !== key) return;
        if (bossEntry) {
          remember();
          AudioEngine.cutMusic();
          AudioEngine.bossBreath({});
          pending = setTimeout(() => {
            pending = null;
            doStart(0.08, 0.05, 0);
          }, 1050);
        } else doStart(0.35, 0.35);
      }, wait * 1000);
    });
  }
  /* reprise d'une piste : position mémorisée recalée sur sa grille de temps, pour qu'elle reparte sur un temps */
  function alignedOffset(url) {
    const p = positions[url] || 0;
    const info = Beat.trackInfo ? Beat.trackInfo(url) : null;
    if (!info || p <= 0) return p;
    const L = 60 / info.bpm;
    return Math.max(0, info.offset + Math.round((p - info.offset) / L) * L);
  }
  function stop() {
    if (pending) {
      clearTimeout(pending);
      pending = null;
    }
    remember();
    current = null;
    currentUrl = null;
    AudioEngine.stopMusic && AudioEngine.stopMusic(1);
    AudioEngine.stopGenerativeMusic && AudioEngine.stopGenerativeMusic(1);
  }
  /* ---- la musique respire : appelé chaque pas par Run.update ---- */
  function setState(o) {
    if (!AudioEngine.isReady || !AudioEngine.isReady()) return;
    const hp = o.hp01 == null ? 1 : o.hp01;
    /* vie basse : filtre qui s'étouffe et cœur qui bat sous 30 % ; salle vidée : filtre fermé qui se rouvre en 4 s */
    let cutoff = 20000;
    if (hp < 0.3) cutoff = Math.min(cutoff, lerp(650, 5000, hp / 0.3));
    if (st8.calmAt != null) {
      const k = clamp((Time.now - st8.calmAt) / 4, 0, 1);
      cutoff = Math.min(cutoff, lerp(1800, 20000, k * k));
    }
    if (Math.abs(cutoff - st8.cutoff) > st8.cutoff * 0.02) {
      st8.cutoff = cutoff;
      AudioEngine.setMusicTone(cutoff, 0.25);
    }
    const heart = hp < 0.3 ? 1 - hp / 0.3 : 0;
    if (Math.abs(heart - st8.heart) > 0.03 || (heart === 0) !== (st8.heart === 0)) {
      st8.heart = heart;
      AudioEngine.setHeartbeat(heart);
    }
    /* ralenti : la bande freine (hauteur qui descend) ; frénésie : légère accélération sans changer la hauteur */
    if (!st8.ramp) {
      const rate = o.slow != null && o.slow < 1 ? Math.max(0.5, o.slow) : o.overdrive ? 1.05 : 1;
      if (rate !== st8.rate) {
        st8.rate = rate;
        AudioEngine.setMusicRate(rate, rate > 1);
      }
    }
  }
  function resetState() {
    st8.calmAt = null;
    if (st8.heart) {
      st8.heart = 0;
      AudioEngine.setHeartbeat(0);
    }
    if (st8.cutoff !== 20000) {
      st8.cutoff = 20000;
      AudioEngine.setMusicTone(20000, 0.3);
    }
    if (st8.rate !== 1 && !st8.ramp) {
      st8.rate = 1;
      AudioEngine.setMusicRate(1, false);
    }
  }
  function calm() {
    st8.calmAt = Time.now;
  }
  function uncalm() {
    st8.calmAt = null;
  }
  /* rampe de vitesse (JS, playbackRate n'est pas un AudioParam) */
  function rampRate(from, to, seconds, preservePitch, then) {
    if (st8.ramp) cancelAnimationFrame(st8.ramp);
    const t0 = performance.now();
    const step = () => {
      const k = clamp((performance.now() - t0) / (seconds * 1000), 0, 1);
      const r = from + (to - from) * k;
      AudioEngine.setMusicRate(r, preservePitch);
      if (k < 1) st8.ramp = requestAnimationFrame(step);
      else {
        st8.ramp = null;
        if (then) then();
      }
    };
    st8.ramp = requestAnimationFrame(step);
  }
  /* « tape stop » : la bande s'arrête un quart de seconde puis repart (grosse attaque de boss, paliers de combo) */
  function tapeStop() {
    if (st8.ramp || generative || !currentUrl) return;
    rampRate(st8.rate, 0.08, 0.14, false, () => rampRate(0.3, st8.rate, 0.2, false));
  }
  /* mort : la bande ralentit et descend sur `seconds`, puis silence, puis `then` */
  function dying(seconds, then) {
    if (generative || !currentUrl) {
      if (then) then();
      return;
    }
    resetState();
    rampRate(1, 0.25, seconds, false, () => {
      AudioEngine.stopMusic && AudioEngine.stopMusic(0.3);
      currentUrl = null;
      current = null;
      st8.rate = 1;
      if (then) setTimeout(then, 350);
    });
  }
  /* Atelier rythme : place la lecture sur le n-ième temps de la piste (temps 0 = premier temps repéré par tempo.json). */
  function seekBeat(n) {
    const info = Beat.trackInfo ? Beat.trackInfo(currentUrl) : null;
    if (!info || !AudioEngine.seekMusic) return false;
    return AudioEngine.seekMusic(info.offset + n * (60 / info.bpm));
  }
  function setEnabled(v) {
    enabled = v;
    if (!v) stop();
  }
  /* appelé à chaque geste tant que la musique ne joue pas (l'AudioContext et l'<audio> ne peuvent démarrer qu'après un geste) : relance la piste courante */
  function restart() {
    const k = current;
    current = null;
    if (k) play(k.replace(/\d+(-\d)?$/, ''));
    if (!armed) {
      armed = true;
      preload(['biome', 'boss', 'biome_b']);
    }
  }
  /* vrai si une piste fichier joue réellement, ou si la musique générative tourne sur un contexte actif */
  function isPlaying() {
    const st = AudioEngine.musicState ? AudioEngine.musicState() : null;
    if (!st) return false;
    if (st.hasTrack && st.el && !st.el.paused && st.el.t > 0.05) return true;
    return !!(st.generative && st.ctxState === 'running');
  }
  return {
    play,
    stop,
    setEnabled,
    restart,
    isPlaying,
    preload,
    keyFor,
    seekBeat,
    setState,
    resetState,
    calm,
    uncalm,
    tapeStop,
    dying,
    get rate() {
      return st8.rate;
    },
    get current() {
      return current;
    },
    get currentUrl() {
      return currentUrl;
    },
    get generative() {
      return generative;
    },
  };
})();
