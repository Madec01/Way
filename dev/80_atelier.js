/* =========================================================================
   SALLE ZÉRO — 80_atelier.js — Atelier rythme
   Une salle vierge, la piste du biome découpée en temps cliquables, et une partition par élément posé.
   Trois établis : Animations (décor qui joue en rythme), Pièges (ce qui blesse), Niveau (terrain et murs).
   F2 ouvre et ferme.

   Repère de temps : les positions sont comptées en temps musicaux depuis le début d'une boucle de `bars`
   mesures, et les pièges comme le décor lisent exactement la même chose (`params.beats.hits`).
   Ce qu'on entend dans l'atelier est donc ce qu'on aura en salle, quel que soit le BPM de la piste.
   ========================================================================= */
const Atelier = (() => {
  const KEY = 'way_atelier_v1';
  /* Réglages par défaut à la pose, et réglages proposés, selon la mécanique du piège.
     `act: 0` = « toute la boucle » : un piège à trajet continu (bras qui tourne, scie sur rail) doit rester allumé,
     sinon il s'éteint, tourne dans le noir et se rallume ailleurs. `turn` / `trip` calent ce trajet sur la mesure. */
  const KIND = {
    laser_sweep:   { size: [6, 8], act: 2, tele: 1, axis: 1 },
    laser_rotate:  { size: [1, 1], act: 0, tele: 1, turn: 4, arms: 1 },
    laser_grid:    { size: [10, 8], act: 1, tele: 1, axis: 1 },
    wall_fireball: { size: [1, 1], act: 0.25, tele: 1, angle: 1, count: 1 },
    spike_tiles:   { size: [4, 3], act: 0.5, tele: 1 },
    gas_zone:      { size: [1, 1], act: 2, tele: 1 },
    saw_rail:      { size: [8, 1], act: 0, tele: 1, trip: 4, axis: 1 },
    turret_fixed:  { size: [1, 1], act: 0.25, tele: 1, angle: 1, count: 1 },
    emitter:       { size: [1, 1], act: 0.25, tele: 1, angle: 1, count: 1, spinDeg: 1, arc: 1, burst: 1 },
    laser_beam:    { size: [1, 1], act: 1, tele: 1, angle: 1, len: 1 },
  };
  /* réglages proposés pour le décor animé */
  const AKIND = {
    tile_color: { mode: 1, color2: 1, cells: 1 },
    tile_lift:  { mode: 1, amp: 1, down: 1, color2: 1, cells: 1 },
    spinner:    { sprite: 1, step: 1, scale: 1 },
    bouncer:    { sprite: 1, amp: 1, scale: 1 },
    light:      { radius: 1, gain: 1, color2: 1 },
    ring:       { radius: 1, color2: 1 },
    mover:      { sprite: 1, scale: 1, path: 1, pingpong: 1, spin: 1, color2: 1 },
  };
  const SNAPS = [[1, 'noires'], [2, 'croches'], [4, 'doubles'], [3, 'triolets']];
  /* Rythmes prédéfinis : un motif (`at`) répété tous les `per` temps jusqu'au bout de la boucle. On les applique
     à un élément posé comme au modèle du pinceau — c'est ce qui évite de recocher la même chose à la main
     pour chaque objet. */
  const RHYTHMS = [
    ['', 'rythme…'],
    ['noires|1|0', 'tous les temps'],
    ['forts|4|0', 'temps forts (1)'],
    ['deuxquatre|4|1,3', 'temps 2 et 4'],
    ['unetrois|4|0,2', 'temps 1 et 3'],
    ['croches|1|0,0.5', 'croches'],
    ['contretemps|1|0.5', 'contretemps'],
    ['doubles|1|0,0.25,0.5,0.75', 'doubles-croches'],
    ['triolets|1|0,0.333,0.667', 'triolets'],
    ['tresillo|4|0,1.5,3', 'tresillo (3-3-2)'],
    ['clave|8|0,1.5,3,5,6', 'clave 3-2'],
    ['galop|2|0,0.75,1', 'galop'],
    ['charleston|4|0,1.5', 'charleston'],
    ['montee|4|0,1,1.5,2,2.25,2.5,2.75,3', 'montée'],
    ['silence|0|', 'silence (aucun coup)'],
  ];
  /* déploie un rythme sur toute la boucle courante */
  function rhythmHits(key) {
    const row = RHYTHMS.find(r => r[0] && r[0].split('|')[0] === key); if (!row) return null;
    const [, per, at] = row[0].split('|');
    const step = +per; if (!step) return [];
    const offs = at.split(',').filter(x => x !== '').map(Number);
    const out = []; for (let b = 0; b < Lb(); b += step) for (const o of offs) { const v = Math.round((b + o) * 1000) / 1000; if (v < Lb()) out.push(v); }
    return out.sort((a, b) => a - b);
  }
  const TABS = [['anim', 'Animations'], ['trap', 'Pièges'], ['level', 'Niveau'], ['amis', 'Amis']];
  /* Rôles d'un compagnon, avec ce qu'il faut régler pour chacun. Les valeurs servent de départ à la création :
     un animal fraîchement ajouté doit être jouable tout de suite, sans réglage. */
  const ROLES = [
    ['strike', 'pique en vol', { damage: 24, every: 8, range: 360, speed: 300, diveSpeed: 660, fly: true }],
    ['bite', 'mord et attire les coups', { damage: 14, every: 4, range: 280, speed: 320, taunt: 230, hp: 90, revive: 6 }],
    ['spit', 'crache à distance', { damage: 9, every: 2, range: 340, speed: 250, projSpeed: 480 }],
    ['collect', 'ramasse à votre place', { damage: 0, every: 4, radius: 260, speed: 280 }],
    ['guard', 'brise les tirs ennemis', { damage: 0, every: 1, block: 2, dist: 56, spin: 1.7 }],
    ['mend', 'soigne', { damage: 0, every: 4, heal: 4, speed: 230 }],
    ['charge', 'charge en ligne droite', { damage: 18, every: 4, range: 420, speed: 240, rollSpeed: 560, rollTime: 0.8 }],
    ['mark', 'désigne une cible', { damage: 0, every: 4, range: 420, markTime: 4, markMul: 1.3, speed: 280, fly: true }],
    ['sting', 'harcèle sans relâche', { damage: 5, every: 1, range: 320, speed: 440, orbit: 26, spin: 5, fly: true }],
  ];
  const CADENCES = [[1, 'chaque temps'], [2, 'un temps sur deux'], [4, 'chaque mesure'], [8, 'toutes les deux mesures'], [16, 'toutes les quatre mesures']];
  /* Traits proposés pour un personnage : de quoi donner un caractère sans écrire de mods à la main. */
  const TRAITS = [
    ['aucun', 'Aucun', []],
    ['xp', 'Apprend vite (+15 % XP, +2 chance)', [{ stat: 'xpGain', mul: 1.15 }, { stat: 'luck', add: 2 }]],
    ['dmg', 'Cogne fort (+15 % dégâts)', [{ stat: 'damage', mul: 1.15 }]],
    ['fast', 'Va vite (+15 % vitesse)', [{ stat: 'speed', mul: 1.15 }]],
    ['tank', 'Encaisse (+30 PV, +2 armure)', [{ stat: 'maxHp', add: 30 }, { stat: 'armor', add: 2 }]],
    ['crit', 'Vise juste (+10 % crit, +30 % dégâts critiques)', [{ stat: 'critChance', add: 0.1 }, { stat: 'critMult', add: 0.3 }]],
    ['lucky', 'A de la chance (+4 chance)', [{ stat: 'luck', add: 4 }]],
  ];
  const BRUSH = { '.': 'sol', '#': 'mur plein', 'n': 'muret', ':': 'claustra', '=': 'pont', '~': 'eau', ',': 'boue' };
  const st = { biome: 'biome_1', track: 'a', bars: 2, snap: 2, items: [], terrain: null, sel: -1, tab: 'trap',
    pose: true, loop: true, metro: false, safe: true, grid: true, brush: null, win: 2, winIdx: 0, tpl: {} };
  /* Modèle du pinceau : les réglages affichés quand rien n'est choisi appartiennent au pinceau courant, et le
     prochain élément posé naît avec. Sans ça il fallait poser puis régler, pour chaque objet. */
  function tplOf(brush) { return st.tpl[brush] || (st.tpl[brush] = { params: {} }); }
  let box = null, live = false, lastIdx = -1, headEl = null, canvas = null, headX0 = 0, headW = 0;
  const AKEY = 'way_amis_v1';
  let amis = { pets: [], chars: [] };   // animaux et copains créés ici, gardés dans le navigateur puis exportés

  /* Deux longueurs distinctes, et c'est tout le sujet des partitions longues :
     `bars` est la longueur de la PARTITION (jusqu'à un morceau entier, plusieurs minutes) ;
     `win` est la largeur de la FENÊTRE affichée dans la grille, qui coulisse dedans. */
  const Lb = () => st.bars * 4;                        // temps dans la partition entière
  const winBeats = () => Math.min(st.win, st.bars) * 4;  // temps affichés
  const winStart = () => Math.min(st.winIdx * winBeats(), Math.max(0, Lb() - winBeats()));   // premier temps affiché
  const winCount = () => Math.max(1, Math.ceil(Lb() / winBeats()));
  const nCells = () => Math.round(winBeats() * st.snap);
  const beatNow = () => Beat.t / Beat.beatLen();
  const cycle = () => Math.floor(beatNow() / Lb());     // n-ième passage de la partition sur la piste
  const inLoop = () => beatNow() - cycle() * Lb();      // position dans la partition
  const q = n => Math.round(n * 1000) / 1000;
  const kindOf = it => (Content.trap(it.trap) || {}).kind;
  const defOf = it => KIND[kindOf(it)] || {};
  const trapsOf = () => (Content.biome(st.biome) || {}).trapPool || [];
  const famOf = it => it.kind === 'anim' ? 'anim' : it.kind === 'trap' ? 'trap' : 'level';
  const enemiesOf = () => (Content.biome(st.biome) || {}).enemyPool || [];
  const shown = () => st.items.map((it, i) => [it, i]).filter(([it]) => famOf(it) === st.tab);
  const $ = s => box.querySelector(s);

  /* élément « modèle » du pinceau courant : même forme qu'un élément posé, mais il ne vit que dans le panneau */
  function brushItem() {
    const b = st.brush; if (!b || b === 'mur' || b.startsWith('t:') || b.startsWith('e:')) return null;
    const t = tplOf(b); if (t.kind) return t;
    if (b.startsWith('a:')) {
      const a = b.slice(2); const ad = ANIM_DEFS[a] || {}; const sz = ad.size || [1, 1];
      Object.assign(t, { kind: 'anim', anim: a, x: 0, y: 0, w: sz[0], h: sz[1], hits: [0], tele: 0, act: ad.act || 1, params: {} });
    } else {
      const d = Content.trap(b); if (!d) return null;
      const kk = KIND[d.kind] || {}; const sz = kk.size || [1, 1];
      Object.assign(t, { kind: 'trap', trap: b, x: 0, y: 0, w: sz[0], h: sz[1], hits: [0], tele: kk.tele || 1, act: kk.act || 0, params: {} });
      if (kk.turn) t.turn = kk.turn; if (kk.trip) t.trip = kk.trip;
    }
    return t;
  }
  /* un élément neuf, né des réglages du pinceau */
  function fromBrush(tx, ty) {
    const t = brushItem(); if (!t) return null;
    const it = JSON.parse(JSON.stringify(t)); delete it.params.cells; delete it.params.path;
    it.x = clamp(tx, 0, ROOM_COLS - it.w); it.y = clamp(ty, 0, ROOM_ROWS - it.h);
    return it;
  }

  /* ---------- salle ---------- */
  function roomDef() {
    const walls = st.items.filter(i => i.kind === 'mur');
    const d = {
      id: 'room_atelier', index: 1, type: 'TRAP', name: 'Atelier rythme', biome: st.biome, refTime: 60,
      obstacles: walls.map(w => ({ x: w.x, y: w.y, w: w.w, h: w.h })), deco: [], waves: [], fragments: [], modular: [],
      traps: st.items.filter(i => i.kind === 'trap').map(compileTrap),
      anims: st.items.filter(i => i.kind === 'anim').map(compileAnim),
    };
    d.waves = compileWaves();
    if (st.terrain) d.terrain = st.terrain.slice();
    return d;
  }
  /* Les ennemis posés se rangent par numéro de vague : la vague 1 entre au démarrage, les suivantes quand la
     précédente est vidée. Le type de salle reste TRAP, donc la porte ne s'ouvre jamais — on reste dans l'atelier. */
  function compileWaves() {
    const g = {};
    for (const it of st.items) if (it.kind === 'ennemi') (g[it.wave || 0] = g[it.wave || 0] || []).push({ enemy: it.enemy, x: it.x, y: it.y, count: it.count || 1, elite: !!it.elite });
    const keys = Object.keys(g).map(Number).sort((a, b) => a - b);
    return keys.map((w, i) => ({ at: i === 0 ? 'start' : 'clear', spawns: g[w] }));
  }

  /* un élément de l'atelier → une déclaration de content*.js */
  function beatsOf(it, tele) {
    const b = { bars: st.bars, hits: it.hits.slice().sort((a, b) => a - b), active: it.act || Lb() };
    if (tele) b.telegraph = it.tele;
    if (it.turn) b.turn = it.turn;   // temps pour un tour : la rotation revient au même endroit à chaque boucle
    if (it.trip) b.trip = it.trip;   // temps pour un aller sur le rail
    return b;
  }
  function compileTrap(it) { return { trap: it.trap, x: it.x, y: it.y, w: it.w, h: it.h, params: Object.assign({}, it.params, { beats: beatsOf(it, true) }) }; }
  function compileAnim(it) { return { kind: it.anim, x: it.x, y: it.y, w: it.w, h: it.h, params: Object.assign({}, it.params), beats: beatsOf(it, false) }; }
  /* refabrique la salle sans la recharger : la musique ne saute pas et le joueur ne bouge pas */
  function apply() {
    const r = G.room; if (!r) return; const def = roomDef();
    r.def.traps = def.traps; r.def.obstacles = def.obstacles; r.def.anims = def.anims; r.def.terrain = def.terrain;
    r.obstacles = def.obstacles.map(o => ({ x: o.x, y: o.y, w: o.w, h: o.h, px: ROOM_X + o.x * TILE, py: ROOM_Y + o.y * TILE, pw: o.w * TILE, ph: o.h * TILE }));
    r.grid = null; Terrain.compile(r, def);
    r.traps = []; for (const t of def.traps) { const td = Content.trap(t.trap); if (td) r.traps.push(new Trap(td, t)); }
    Anim.compile(r, def);
    r.def.waves = def.waves;
    r.deco = []; r.dressed = false; Room.dress(r); r.deco = [];   // les murs prennent l'accessoire du biome, mais pas de décor au sol : la salle reste lisible
    Sprites.clearFloor();   // le terrain est peint dans le cache du sol
    save();
  }

  /* ---------- mémoire du navigateur ---------- */
  function snap() { return { biome: st.biome, track: st.track, bars: st.bars, snap: st.snap, items: st.items, terrain: st.terrain }; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(snap())); } catch (e) { /* */ } }
  function load() {
    try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o) adopt(o); } catch (e) { /* */ }
  }
  function adopt(o) {
    if (o.biome) st.biome = o.biome; if (o.track) st.track = o.track; if (o.bars) st.bars = o.bars; if (o.snap) st.snap = o.snap;
    if (Array.isArray(o.items)) st.items = o.items; if (Array.isArray(o.terrain)) st.terrain = o.terrain; else if (o.terrain === null) st.terrain = null;
  }

  /* ---------- les amis : animaux de compagnie et visages ----------
     Tout est gardé dans le navigateur pendant qu'on travaille, et versé dans le jeu tout de suite (CONTENT).
     « Exporter » écrit dev/content5.js, images comprises : c'est ce fichier qui fait vivre les amis chez tout
     le monde une fois le jeu partagé. */
  function amisLoad() {
    try { const o = JSON.parse(localStorage.getItem(AKEY) || 'null'); if (o) amis = { pets: o.pets || [], chars: o.chars || [] }; } catch (e) { /* */ }
    amisRegister();
  }
  function amisSave() { try { localStorage.setItem(AKEY, JSON.stringify(amis)); } catch (e) { UI.toast('Trop d\'images pour le navigateur : exportez dans content5.js'); } amisRegister(); }
  /* verse les amis dans le contenu du jeu (en remplaçant la fournée précédente) */
  function amisRegister() {
    for (const a of amis.pets.concat(amis.chars)) for (const [f, k] of IMG_SLOTS) if (a[f] && a[k]) Sprites.addCustom(a[k], a[f]);
    for (const c of amis.chars) if (c.sheets) for (const k in c.sheets) Sprites.addSheet(c.id + '_' + k, c.sheets[k], c.fw || 0);
    CONTENT.pets = CONTENT.pets.filter(p => !p.atelier).concat(amis.pets.map(petDef));
    CONTENT.characters = CONTENT.characters.filter(c => !c.atelier).concat(amis.chars.map(charDef));
    Content.invalidate(); Meta.ensure();
  }
  const roleOf = b => ROLES.find(r => r[0] === b) || ROLES[0];
  function petDef(p) {
    const base = Object.assign({}, roleOf(p.behavior)[2]);
    const vues = (p.imgE || p.imgN) ? { s: p.sprite, e: p.imgE ? p.spriteE : null, n: p.imgN ? p.spriteN : null } : p.sprite;
    return Object.assign(base, { id: p.id, name: p.name || 'Animal', sprite: vues, color: p.color || '#9fd8ff',
      tag: roleOf(p.behavior)[1], desc: p.desc || '', behavior: p.behavior, damage: +p.damage || 0, every: +p.every || 4,
      size: +p.size || 64, price: +p.price || 0, unlocked: true, atelier: true });
  }
  function charDef(c) {
    const tr = TRAITS.find(t => t[0] === c.trait) || TRAITS[0];
    const corps = c.imgBody ? { s: c.spriteBody, e: c.imgBodyE ? c.spriteBodyE : null, n: c.imgBodyN ? c.spriteBodyN : null } : null;
    const anim = {}; for (const [k] of CLIPS_UI) if (c.sheets && c.sheets[k]) anim[k] = c.id + '_' + k;
    return { id: c.id, name: c.name || 'Copain', sprite: 'player', face: (c.imgBody || anim.idle) ? null : c.sprite,
      body: corps, anim: Object.keys(anim).length ? anim : null, size: +c.size || 64, atelier: true,
      desc: c.desc || '', stats: { maxHp: +c.maxHp || 100, speed: +c.speed || 260, damage: +c.damage || 1, luck: +c.luck || 2 },
      trait: { id: 'trait_' + c.id, name: c.traitName || tr[1], desc: c.traitDesc || tr[1], mods: tr[2], hooks: {} },
      startWeapon: c.weapon || 'weapon_blade', unlocked: true, price: 0 };
  }
  const uid = p => p + '_' + Math.random().toString(36).slice(2, 8);
  /* toutes les images qu'un ami peut porter : champ de données ↔ nom d'accessoire */
  const IMG_SLOTS = [['img', 'sprite'], ['imgE', 'spriteE'], ['imgN', 'spriteN'], ['imgBody', 'spriteBody'], ['imgBodyE', 'spriteBodyE'], ['imgBodyN', 'spriteBodyN']];
  const VUES = [['', 'sud (face)'], ['E', 'est (profil)'], ['N', 'nord (dos)']];
  /* Planches d'animation : une grille de cases carrées, lues dans l'ordre de lecture. Elles priment sur l'image
     fixe — c'est le dessin le plus fini dont on dispose. */
  const CLIPS_UI = [['idle', 'repos'], ['walk', 'marche'], ['fire', 'tir'], ['pick', 'ramasse'], ['death', 'mort']];
  /* 64 px par défaut : le double d'une image de 32, donc des pixels carrés, et une bête un peu plus grande
     qu'une tuile (48) — c'est la taille qui « fait animal » à côté d'un joueur de 48 × 75. */
  function addPet() { const n = uid('img'); amis.pets.push({ id: uid('pet_ami'), sprite: n, spriteE: n + '_e', spriteN: n + '_n', name: '', desc: '', behavior: 'bite', damage: 14, every: 4, size: 64, price: 0, color: '#9fd8ff' }); amisSave(); refresh(); }
  function addChar() { const n = uid('body'); amis.chars.push({ id: uid('char_ami'), sprite: uid('face'), spriteBody: n, spriteBodyE: n + '_e', spriteBodyN: n + '_n', name: '', desc: '', trait: 'aucun', maxHp: 100, speed: 260, damage: 1, luck: 2, size: 64, weapon: 'weapon_blade' }); amisSave(); refresh(); }

  /* ---------- ouverture / fermeture ---------- */
  function toggle() { live ? close() : open(); }
  function open() {
    if (live) return;
    if (G.state === 'run' && !G.attract && !confirm('Ouvrir l\'atelier abandonne la run en cours. Continuer ?')) return;
    live = true; load(); amisLoad();
    Attract.stop(); UI.hideAll();
    const ch = Content.characters()[0], w = Content.weapons()[0], sk = Content.skills()[0];
    Run.start({ character: ch.id, biome: st.biome, weapon: w.id, skill: sk.id, seed: 7 });
    startRoom(); build();
    UI.toast('Atelier rythme — F2 pour sortir');
  }
  /* charge la salle vierge à la place de la salle 1 du biome */
  function startRoom() {
    G.run.rooms = [roomDef()]; G.run.weaponDropRoom = 0; G.run.attract = false;
    Room.load(1); Room.begin(); apply();   // Room.load réhabille la salle : apply lui retire son décor au sol
    G.room.doorOpen = false; G.room.label = 'Atelier rythme — ' + (Content.biome(st.biome) || {}).name;
    G.debug.invuln = st.safe; G.room.noScore = !st.pose;
    st.loopBar = Math.max(0, Math.floor(beatNow() / Lb()));
    setTrack(st.track);
  }
  function close() {
    if (!live) return; live = false; save();
    if (box) { box.hidden = true; box.innerHTML = ''; box.className = ''; }
    G.debug.invuln = false;
    if (canvas) { canvas.removeEventListener('mousedown', onCanvas); canvas.removeEventListener('mousemove', onDrag); }
    window.removeEventListener('mouseup', onUp);
    if (G.run) Run.abort();
  }
  /* piste jouée : a = biome (salles 1-4), b = biome (salles 6-8), boss */
  function setTrack(k) {
    st.track = k; if (!G.room) return;
    G.room.index = k === 'b' ? 6 : 1; Music.stop(); Music.play(k === 'boss' ? 'boss' : 'biome');
  }

  /* ---------- panneau ---------- */
  function build() {
    box = document.getElementById('atelier'); box.hidden = false; box.className = ''; canvas = document.getElementById('c');
    box.innerHTML = `
      <div class="arow ahead">
        <b>ATELIER</b>
        <span class="atabs">${TABS.map(([k, n]) => `<button class="btn small tab" data-t="${k}">${n}</button>`).join('')}</span>
        <button class="btn small" id="a-mode"></button>
        <label>Biome <select id="a-biome">${Content.biomes().map(b => `<option value="${b.id}">${b.name}</option>`).join('')}</select></label>
        <label>Piste <select id="a-track"><option value="a">biome (1-4)</option><option value="b">biome (6-8)</option><option value="boss">boss</option></select></label>
        <label>Partition <select id="a-bars">${[1, 2, 4, 8, 16, 32, 64, 128].map(b => `<option value="${b}">${b} mesure${b > 1 ? 's' : ''}${b >= 16 ? ' · ' + fmtDur(b) : ''}</option>`).join('')}</select></label>
        <label>Fenêtre <select id="a-win"><option value="1">1 mesure</option><option value="2">2 mesures</option><option value="4">4 mesures</option><option value="8">8 mesures</option></select></label>
        <label>Grille <select id="a-snap">${SNAPS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></label>
        <label class="chk"><input type="checkbox" id="a-loop"> boucler</label>
        <label class="chk"><input type="checkbox" id="a-metro"> métronome</label>
        <label class="chk"><input type="checkbox" id="a-safe"> invulnérable</label>
        <label class="chk"><input type="checkbox" id="a-grid"> repères</label>
        <label>décalage <input type="number" min="-200" max="200" step="5" id="a-lag" value="0"> ms</label>
        <span class="asp"></span>
        <span class="anw"><button class="btn small" id="a-prev">◀</button><span id="a-pos" class="amono"></span><button class="btn small" id="a-next">▶</button></span>
        <button class="btn small" id="a-export">Exporter</button><button class="btn small ghost" id="a-clear">Vider</button><button class="btn small ghost" id="a-fold">Réduire</button><button class="btn small ghost" id="a-close">Fermer (F2)</button>
      </div>
      <div class="apal" id="a-pal"></div>
      <div class="agrid"><div class="alanes" id="a-lanes"></div><div class="ahead-line" id="a-head"></div></div>
      <div class="aio" id="a-io" hidden><textarea id="a-txt" spellcheck="false"></textarea>
        <div class="arow"><button class="btn small" id="a-copy">Copier</button><button class="btn small" id="a-import">Importer ce texte</button><button class="btn small ghost" id="a-hide">Fermer</button></div></div>`;
    headEl = $('#a-head');
    $('#a-biome').onchange = e => { st.biome = e.target.value; st.brush = null; startRoom(); refresh(); };
    $('#a-track').onchange = e => setTrack(e.target.value);
    $('#a-bars').onchange = e => { st.bars = +e.target.value; st.winIdx = Math.min(st.winIdx, winCount() - 1); apply(); refresh(); };
    $('#a-win').onchange = e => { st.win = +e.target.value; st.winIdx = Math.min(st.winIdx, winCount() - 1); refresh(); };
    $('#a-snap').onchange = e => { st.snap = +e.target.value; refresh(); };
    $('#a-loop').onchange = e => { st.loop = e.target.checked; };
    $('#a-metro').onchange = e => { st.metro = e.target.checked; };
    $('#a-safe').onchange = e => { st.safe = e.target.checked; G.debug.invuln = st.safe; };
    $('#a-grid').onchange = e => { st.grid = e.target.checked; };
    $('#a-lag').value = Math.round(Beat.lag * 1000);
    $('#a-lag').onchange = e => { Beat.lag = (+e.target.value || 0) / 1000; Meta.profile.lag = Beat.lag; Meta.save(); UI.toast('Décalage son/image : ' + Math.round(Beat.lag * 1000) + ' ms'); };
    $('#a-mode').onclick = () => setPose(!st.pose);
    $('#a-prev').onclick = () => jumpWin(-1); $('#a-next').onclick = () => jumpWin(1);
    $('#a-export').onclick = showIo; $('#a-hide').onclick = () => { $('#a-io').hidden = true; };
    $('#a-copy').onclick = () => { const t = $('#a-txt'); t.select(); try { navigator.clipboard.writeText(t.value); UI.toast('Copié'); } catch (e) { document.execCommand('copy'); } };
    $('#a-import').onclick = () => importText($('#a-txt').value);
    $('#a-clear').onclick = () => { if (st.tab === 'amis') { UI.toast('Rien à vider ici : supprimez les fiches une par une avec ×'); return; } if (st.tab === 'level') { st.terrain = null; st.items = st.items.filter(i => i.kind !== 'mur'); } else st.items = st.items.filter(i => famOf(i) !== st.tab); st.sel = -1; apply(); refresh(); };
    $('#a-close').onclick = close;
    $('#a-fold').onclick = () => { const f = box.classList.toggle('fold'); $('#a-fold').textContent = f ? 'Déplier' : 'Réduire'; if (!f) measure(); };
    box.querySelectorAll('.tab').forEach(b => { b.onclick = () => { st.tab = b.dataset.t; st.brush = null; st.sel = -1; refresh(); }; });
    canvas.addEventListener('mousedown', onCanvas);
    canvas.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', onUp);
    refresh();
  }
  /* pose ↔ test : en test, plus de grille, plus de cadres, plus de partition au sol — la salle telle qu'elle sera jouée */
  function setPose(v) {
    st.pose = v; if (G.room) G.room.noScore = !v;
    if (box) { box.classList.toggle('fold', !v); const f = $('#a-fold'); if (f) f.textContent = v ? 'Réduire' : 'Déplier'; }
    refresh();
  }
  const fmtDur = bars => { const s0 = bars * 4 * (Beat.beatLen() || 0.5); return Math.floor(s0 / 60) + ' min ' + String(Math.round(s0 % 60)).padStart(2, '0'); };
  function winLabel() { const b0 = winStart() / 4; return 'mesures ' + Math.round(b0 + 1) + '–' + Math.round(b0 + winBeats() / 4) + ' / ' + st.bars; }
  /* la fenêtre coulisse dans la partition, et la lecture la suit */
  function jumpWin(d) {
    const i = clamp(st.winIdx + d, 0, winCount() - 1); if (i === st.winIdx) return;
    st.winIdx = i; Music.seekBeat(cycle() * Lb() + winStart()); refresh();
  }

  /* ---------- palette et partition ---------- */
  function refresh() {
    if (!box || box.hidden) return;
    $('#a-biome').value = st.biome; $('#a-track').value = st.track; $('#a-bars').value = st.bars; $('#a-snap').value = st.snap; $('#a-win').value = st.win;
    $('#a-loop').checked = st.loop; $('#a-metro').checked = st.metro; $('#a-safe').checked = st.safe; $('#a-grid').checked = st.grid;
    $('#a-mode').textContent = st.pose ? 'Mode : pose' : 'Mode : test';
    $('#a-mode').className = 'btn small' + (st.pose ? ' primary' : '');
    $('#a-pos').textContent = winLabel();
    box.querySelectorAll('.tab').forEach(b => { b.className = 'btn small tab' + (b.dataset.t === st.tab ? ' primary' : ''); });
    if (st.tab === 'amis') { $('#a-pal').innerHTML = ''; renderAmis($('#a-lanes')); return; }
    /* palette de l'établi courant */
    const pal = $('#a-pal'); const rows = [];
    if (st.tab === 'trap') rows.push('<span class="amuted">Poser :</span>' + trapsOf().map(id => { const d = Content.trap(id); return `<button class="btn small pal${st.brush === id ? ' primary' : ''}" data-b="${id}">${d ? d.name : id}</button>`; }).join(''));
    else if (st.tab === 'anim') rows.push('<span class="amuted">Poser :</span>' + Object.keys(ANIM_DEFS).map(k => `<button class="btn small pal${st.brush === 'a:' + k ? ' primary' : ''}" data-b="a:${k}">${ANIM_DEFS[k].name}</button>`).join(''));
    else {
      rows.push(`<span class="amuted">Décor :</span><button class="btn small pal${st.brush === 'mur' ? ' primary' : ''}" data-b="mur">Bloc</button>` + Object.keys(BRUSH).map(c => `<button class="btn small pal${st.brush === 't:' + c ? ' primary' : ''}" data-b="t:${c}">${BRUSH[c]}</button>`).join(''));
      rows.push('<span class="amuted">Ennemis :</span>' + enemiesOf().map(id => { const e = Content.enemy(id); return `<button class="btn small pal${st.brush === 'e:' + id ? ' primary' : ''}" data-b="e:${id}">${e ? e.name : id}</button>`; }).join('') + '<button class="btn small" id="a-rewave">Relancer les vagues</button>');
    }
    rows.push('<span class="amuted">clic dans la salle pour poser · clic sur un élément pour le choisir · Suppr pour l\'enlever</span>');
    pal.innerHTML = rows.map(r => `<div class="arow">${r}</div>`).join('');
    pal.querySelectorAll('[data-b]').forEach(b => { b.onclick = () => { st.brush = st.brush === b.dataset.b ? null : b.dataset.b; setPose(true); }; });
    const rw = $('#a-rewave'); if (rw) rw.onclick = replay;
    /* règle + lignes de l'établi courant */
    const n = nCells(), lanes = $('#a-lanes');
    const w0 = winStart();
    let html = '<div class="alane aruler"><span class="an"></span><div class="acells">';
    for (let i = 0; i < n; i++) { const b = w0 + i / st.snap; const isBeat = Math.abs(b - Math.round(b)) < 1e-6; const bar = isBeat && Math.round(b) % 4 === 0;
      html += `<div class="ac ${bar ? 'bar' : isBeat ? 'beat' : ''}" data-c="${i}">${isBeat ? (Math.floor(Math.round(b) / 4) + 1) + '·' + (Math.round(b) % 4 + 1) : ''}</div>`; }
    html += '</div><span class="ax"></span></div>';
    for (const [it, k] of shown()) {
      const name = it.kind === 'mur' ? 'Bloc' : it.kind === 'ennemi' ? ((Content.enemy(it.enemy) || {}).name || it.enemy) + ' · vague ' + ((it.wave || 0) + 1)
        : it.kind === 'anim' ? (ANIM_DEFS[it.anim] || {}).name || it.anim : ((Content.trap(it.trap) || {}).name || it.trap);
      html += `<div class="alane${k === st.sel ? ' sel' : ''}" data-l="${k}"><span class="an" title="${name}">${name} <i>${it.x},${it.y}</i></span><div class="acells">`;
      if (!it.hits) html += '<div class="amur">décor sans partition</div>';
      else for (let i = 0; i < n; i++) { const b = w0 + i / st.snap; const hit = it.hits.some(h => Math.abs(h - b) < 1e-6); const isBeat = Math.abs(b - Math.round(b)) < 1e-6; const bar = isBeat && Math.round(b) % 4 === 0;
        html += `<div class="ac ${bar ? 'bar' : isBeat ? 'beat' : ''}${hit ? ' hit' : ''}" data-l="${k}" data-c="${i}"></div>`; }
      html += `</div><span class="ax"><button class="btn tiny" data-del="${k}">×</button></span></div>`;
    }
    if (st.tab === 'level') html += `<div class="alane"><span class="an amuted">terrain</span><div class="acells"><div class="amur">${st.terrain ? 'plan peint — « Vider » le remet à zéro' : 'aucun plan : peindre une tuile en crée un'}</div></div><span class="ax"></span></div>`;
    lanes.innerHTML = html;
    lanes.querySelectorAll('.aruler .ac').forEach(c => { c.onclick = () => Music.seekBeat(cycle() * Lb() + w0 + (+c.dataset.c) / st.snap); });
    lanes.querySelectorAll('.ac[data-l]').forEach(c => { c.onclick = () => toggleHit(+c.dataset.l, w0 + (+c.dataset.c) / st.snap); });
    lanes.querySelectorAll('.alane[data-l] .an').forEach(e => { e.onclick = () => { st.sel = +e.parentNode.dataset.l; refresh(); }; });
    lanes.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => { st.items.splice(+b.dataset.del, 1); st.sel = -1; apply(); refresh(); }; });
    measure();
    tune(lanes);
  }
  /* ---------- établi « Amis » ---------- */
  function renderAmis(lanes) {
    const opt = (list, v) => list.map(r => `<option value="${r[0]}"${r[0] === v ? ' selected' : ''}>${r[1]}</option>`).join('');
    let h = '<div class="amis">';
    h += '<div class="amiscol"><h4>Animaux de compagnie</h4>';
    amis.pets.forEach((p, i) => {
      h += `<div class="amicard" data-p="${i}">
        <div class="amitop"><span class="amiimg" data-img="p${i}"></span>
          <input type="text" class="aminom" data-f="name" value="${(p.name || '').replace(/"/g, '&quot;')}" placeholder="Nom de l'animal">
          <button class="btn tiny" data-try="${i}">Essayer</button><button class="btn tiny" data-dup="${i}">Copier</button><button class="btn tiny ghost" data-del="${i}">×</button></div>
        <div class="amirow">${VUES.map(v => `<label class="amivue${p['img' + v[0]] ? ' ok' : ''}">${v[1]} <input type="file" accept="image/*" data-file="${i}" data-v="${v[0]}"></label>`).join('')}</div>
        <div class="amirow"><label>rôle <select data-f="behavior">${opt(ROLES, p.behavior)}</select></label>
          <label>cadence <select data-f="every">${opt(CADENCES.map(c => [c[0], c[1]]), +p.every)}</select></label></div>
        <div class="amirow"><label>dégâts <input type="number" min="0" max="99" step="1" data-f="damage" value="${p.damage}"></label>
          <label>taille <input type="number" min="16" max="128" step="8" data-f="size" value="${p.size}"> px <i class="amuted">(image 32 px → 64 = ×2 net · tuile 48 · joueur 48×75)</i></label>
          <label>prix <input type="number" min="0" max="999" step="10" data-f="price" value="${p.price}"></label>
          <label>teinte <input type="color" data-f="color" value="${p.color || '#9fd8ff'}"></label></div>
        <div class="amirow"><input type="text" class="amidesc" data-f="desc" value="${(p.desc || '').replace(/"/g, '&quot;')}" placeholder="Ce qu'il fait, en une phrase"></div></div>`;
    });
    h += '<button class="btn small" id="am-addpet">+ Ajouter un animal</button></div>';
    h += '<div class="amiscol"><h4>Copains</h4>';
    amis.chars.forEach((c, i) => {
      h += `<div class="amicard" data-c="${i}">
        <div class="amitop"><span class="amiimg" data-img="c${i}"></span>
          <input type="text" class="aminom" data-f="name" value="${(c.name || '').replace(/"/g, '&quot;')}" placeholder="Son nom">
          <button class="btn tiny" data-tryc="${i}">Essayer</button><button class="btn tiny ghost" data-delc="${i}">×</button></div>
        <div class="amirow"><label class="amivue${c.img ? ' ok' : ''}">visage <input type="file" accept="image/*" data-filec="${i}"></label>
          <span class="amuted">ou sprite entier :</span>
          ${VUES.map(v => `<label class="amivue${c['imgBody' + v[0]] ? ' ok' : ''}">${v[1]} <input type="file" accept="image/*" data-fileb="${i}" data-v="${v[0]}"></label>`).join('')}</div>
        <div class="amirow"><span class="amuted">${c.imgBody ? 'sprite entier utilisé — il remplace le corps dessiné' : 'visage collé sur le corps dessiné du jeu'}</span>
          ${c.imgBody ? `<button class="btn tiny ghost" data-nobody="${i}">retirer le sprite entier</button>` : ''}
          <label>taille <input type="number" min="32" max="128" step="8" data-f="size" value="${c.size || 64}"> px</label>
          <label>caractère <select data-f="trait">${opt(TRAITS.map(t => [t[0], t[1]]), c.trait)}</select></label></div>
        <div class="amirow"><label>PV <input type="number" min="40" max="300" step="5" data-f="maxHp" value="${c.maxHp}"></label>
          <label>vitesse <input type="number" min="150" max="400" step="10" data-f="speed" value="${c.speed}"></label>
          <label>chance <input type="number" min="0" max="20" step="1" data-f="luck" value="${c.luck}"></label>
          <label>arme <select data-f="weapon">${Content.weapons().map(w => `<option value="${w.id}"${w.id === c.weapon ? ' selected' : ''}>${w.name}</option>`).join('')}</select></label></div>
        <div class="amirow"><span class="amuted">planches d'animation :</span>
          ${CLIPS_UI.map(cl => `<label class="amivue${c.sheets && c.sheets[cl[0]] ? ' ok' : ''}">${cl[1]} <input type="file" accept="image/*" data-sheet="${i}" data-clip="${cl[0]}"></label>`).join('')}
          <label>case <input type="number" min="8" max="256" step="1" data-f="fw" value="${c.fw || 0}"> px <i class="amuted">(0 = deviné)</i></label>
          ${c.sheets && c.sheets.idle ? '<span class="amuted">les planches priment sur l\'image fixe</span>' : ''}</div>
        <div class="amirow"><input type="text" class="amidesc" data-f="desc" value="${(c.desc || '').replace(/"/g, '&quot;')}" placeholder="Qui c'est, en une phrase"></div></div>`;
    });
    h += '<button class="btn small" id="am-addchar">+ Ajouter un copain</button></div>';
    h += '</div><div class="amifoot amuted">Les images sont embarquées dans l\'export : rien à déposer dans assets/. « Exporter » donne le contenu de <b>dev/content5.js</b> — le coller tel quel, puis <b>node dev/build.js</b>.</div>';
    lanes.innerHTML = h;
    /* vignettes */
    lanes.querySelectorAll('[data-img]').forEach(sp => {
      const k = sp.dataset.img; const a = k[0] === 'p' ? amis.pets[+k.slice(1)] : amis.chars[+k.slice(1)];
      const c = a ? Sprites.propCanvas(a.imgBody ? a.spriteBody : a.sprite, 34) : null;
      if (c) sp.appendChild(c); else sp.textContent = '—';
    });
    const bindList = (sel, list, after) => lanes.querySelectorAll(sel).forEach(el2 => {
      const card = el2.closest('.amicard'); const i = +(card.dataset.p != null ? card.dataset.p : card.dataset.c);
      el2.onchange = () => { list[i][el2.dataset.f] = el2.type === 'number' ? +el2.value : el2.value; if (after) after(list[i], el2.dataset.f); amisSave(); refresh(); };
    });
    /* changer de rôle repose les valeurs de départ de ce rôle ; changer un chiffre ne touche à rien d'autre */
    bindList('.amicard[data-p] [data-f]', amis.pets, (p, f) => { if (f !== 'behavior') return; const d = roleOf(p.behavior)[2]; if (d.damage != null) p.damage = d.damage; });
    bindList('.amicard[data-c] [data-f]', amis.chars, (c, f) => { if (f === 'size') c.sizeSet = true; });
    /* photos */
    lanes.querySelectorAll('[data-file]').forEach(f => { f.onchange = () => readImg(f, amis.pets[+f.dataset.file], 'img' + f.dataset.v, 'sprite' + f.dataset.v); });
    lanes.querySelectorAll('[data-filec]').forEach(f => { f.onchange = () => readImg(f, amis.chars[+f.dataset.filec], 'img', 'sprite'); });
    lanes.querySelectorAll('[data-fileb]').forEach(f => { f.onchange = () => readImg(f, amis.chars[+f.dataset.fileb], 'imgBody' + f.dataset.v, 'spriteBody' + f.dataset.v); });
    lanes.querySelectorAll('[data-sheet]').forEach(f => { f.onchange = () => readSheet(f, amis.chars[+f.dataset.sheet], f.dataset.clip); });
    lanes.querySelectorAll('[data-del]').forEach(bt => { bt.onclick = () => { amis.pets.splice(+bt.dataset.del, 1); amisSave(); refresh(); }; });
    lanes.querySelectorAll('[data-delc]').forEach(bt => { bt.onclick = () => { amis.chars.splice(+bt.dataset.delc, 1); amisSave(); refresh(); }; });
    lanes.querySelectorAll('[data-nobody]').forEach(bt => { bt.onclick = () => { const c = amis.chars[+bt.dataset.nobody]; delete c.imgBody; delete c.imgBodyE; delete c.imgBodyN; amisSave(); refresh(); }; });
    lanes.querySelectorAll('[data-dup]').forEach(bt => { bt.onclick = () => { const c = JSON.parse(JSON.stringify(amis.pets[+bt.dataset.dup])); c.id = uid('pet_ami'); amis.pets.push(c); amisSave(); refresh(); }; });
    lanes.querySelectorAll('[data-try]').forEach(bt => { bt.onclick = () => { const p = amis.pets[+bt.dataset.try]; amisSave(); Pets.give(p.id); }; });
    lanes.querySelectorAll('[data-tryc]').forEach(bt => { bt.onclick = () => {
      const c = amis.chars[+bt.dataset.tryc]; amisSave();
      const def = Content.character(c.id); if (!def || !G.player) return;
      Meta.profile.character = c.id; Meta.save(); G.player.char = def; G.player.recompute();
      UI.toast((def.name || 'Copain') + ' est aux commandes'); } });
    const ap = lanes.querySelector('#am-addpet'); if (ap) ap.onclick = addPet;
    const ac = lanes.querySelector('#am-addchar'); if (ac) ac.onclick = addChar;
  }
  /* Une photo devient un sprite : recadrée au carré et réduite à 64 px, sans lissage. Sans réduction, dix visages
     de téléphone pèseraient plusieurs mégaoctets une fois embarqués dans content5.js. */
  /* Une planche d'animation entre TELLE QUELLE : ni recadrage ni redimensionnement, sinon la grille de cases ne
     tombe plus juste. La taille de case est devinée à partir des colonnes et lignes occupées, et reste modifiable. */
  function readSheet(input, entry, clip) {
    const f = input.files && input.files[0]; if (!f || !entry) return;
    const rd = new FileReader();
    rd.onload = () => {
      entry.sheets = entry.sheets || {}; entry.sheets[clip] = rd.result;
      Sprites.addSheet(entry.id + '_' + clip, rd.result, entry.fw || 0).then(inf => {
        if (inf) {
          if (!entry.fw) entry.fw = inf.fw;
          /* taille d'affichage calée sur un multiple entier de la case : ×2 garde des pixels carrés et donne une
             silhouette de la hauteur du joueur standard (48 × 75) une fois la marge sous les pieds retirée. */
          if (!entry.sizeSet) { entry.size = inf.fw * 2; entry.sizeSet = true; }
          UI.toast(clip + ' : ' + inf.cols + '×' + inf.rows + ' cases de ' + inf.fw + ' px (' + inf.n + ' images), affiché en ' + entry.size + ' px');
        }
        else UI.toast('Planche illisible');
        amisSave(); refresh();
      });
    };
    rd.readAsDataURL(f);
  }
  /* Une image déposée entre dans le jeu telle quelle si elle est déjà à une taille de sprite. On ne l'AGRANDIT
     jamais : un pixel art de 32×32 agrandi, a fortiori en lissant, perd exactement ce qui en fait du pixel art.
     Seules les photos d'appareil sont réduites — et là le lissage sert, puisqu'il s'agit de photos. */
  const IMG_MAX = 128;
  function readImg(input, entry, field, key) {
    const f = input.files && input.files[0]; if (!f || !entry) return;
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const carre = img.width === img.height;
        const S = Math.min(IMG_MAX, side);
        const c = document.createElement('canvas'); c.width = S; c.height = S; const g = c.getContext('2d');
        const reduit = side > S;
        g.imageSmoothingEnabled = reduit; if (reduit) g.imageSmoothingQuality = 'high';
        g.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, S, S);
        entry[field] = c.toDataURL('image/png');
        if (!carre) UI.toast('Image recadrée au carré (' + img.width + '×' + img.height + ' → ' + S + '×' + S + ')');
        else if (!reduit) UI.toast('Image reprise telle quelle : ' + S + '×' + S + ' px');
        Sprites.addCustom(entry[key], entry[field]).then(() => { amisSave(); refresh(); });
      };
      img.onerror = () => UI.toast('Image illisible');
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  }
  /* réglages de l'élément choisi : ce qui a du sens pour sa mécanique, rien de plus */
  function tune(lanes) {
    let it = st.items[st.sel]; let tpl = false;
    if (!it || famOf(it) !== st.tab) { it = brushItem(); tpl = true; if (!it) return; }   // rien de choisi : on règle le MODÈLE du pinceau
    if (it.kind === 'ennemi') return tuneEnemy(lanes, it);
    const anim = it.kind === 'anim'; const k = it.kind === 'mur' ? {} : anim ? (AKIND[it.anim] || {}) : defOf(it); const p = it.params || (it.params = {});
    const d = document.createElement('div'); d.className = 'arow atune';
    const nom = it.kind === 'mur' ? 'Bloc' : anim ? (ANIM_DEFS[it.anim] || {}).name : ((Content.trap(it.trap) || {}).name || it.trap);
    const col = p.color || (anim ? (ANIM_DEFS[it.anim] || {}).color : (Content.trap(it.trap) || {}).color) || '#ff5e7a';
    let h = tpl ? `<b class="atpl">Modèle : ${nom}</b><span class="amuted">ces réglages seront ceux du prochain élément posé</span>`
      : `<b>${nom}</b>`;
    if (it.kind !== 'mur') h += `<label>rythme <select id="t-rhy">${RHYTHMS.map(r => `<option value="${r[0].split('|')[0]}">${r[1]}</option>`).join('')}</select></label>`;
    if (k.path) h += `<span class="amuted">${(p.path || []).length} point(s) de trajet — cliquez dans la salle pour tracer, recliquez sur un point pour l'enlever</span>${tpl ? '' : '<button class="btn tiny" id="t-newzone">Nouveau trajet</button>'}`;
    else if (k.cells) h += tpl ? '<span class="amuted">cliquez dans la salle pour peindre les dalles</span>' : `<span class="amuted">${(p.cells || []).length} dalle(s) — cliquez dans la salle pour en ajouter, recliquez pour retirer</span><button class="btn tiny" id="t-newzone">Nouveau motif</button>`;
    if (!k.cells && !k.path) h += `<label>largeur <input type="number" min="1" max="24" step="1" id="t-w" value="${it.w}"></label>
      <label>hauteur <input type="number" min="1" max="13" step="1" id="t-h" value="${it.h}"></label>`;
    if (it.kind !== 'mur') {
      if (!anim) h += `<label>annonce <input type="number" min="0" max="8" step="0.25" id="t-tele" value="${it.tele}"> temps</label>`;
      h += `<label>durée <input type="number" min="0" max="32" step="0.25" id="t-act" value="${it.act}"> temps <i class="amuted">(0 = toute la boucle)</i></label>
        <label>couleur <input type="color" id="t-col" value="${col}"></label>`;
      if (k.color2) h += `<label>2ᵉ couleur <input type="color" id="t-col2" value="${p.color2 || col}"><button class="btn tiny" id="t-col2x">×</button></label>`;
      if (k.angle) h += `<label>orientation <input type="number" min="0" max="359" step="15" id="t-ang" value="${Math.round(((p.dir != null ? p.dir : p.angle || 0) * 180 / Math.PI + 360) % 360)}">°</label>`;
      if (k.axis) h += `<label>sens <select id="t-axis"><option value="x">horizontal</option><option value="y">vertical</option></select></label>`;
      if (k.turn) h += `<label>tour en <input type="number" min="0.5" max="32" step="0.5" id="t-turn" value="${it.turn || 4}"> temps</label>`;
      if (k.trip) h += `<label>aller en <input type="number" min="0.5" max="32" step="0.5" id="t-trip" value="${it.trip || 4}"> temps</label>`;
      if (k.arms) h += `<label>bras <input type="number" min="1" max="6" step="1" id="t-arms" value="${p.arms || 2}"></label>`;
      if (k.count) h += `<label>projectiles <input type="number" min="1" max="16" step="1" id="t-count" value="${p.count || 1}"></label>`;
      if (k.arc) h += `<label>ouverture <input type="number" min="0" max="360" step="15" id="t-arc" value="${Math.round((p.arc != null ? p.arc : TAU) * 180 / Math.PI)}">° <i class="amuted">(360 = couronne)</i></label>`;
      if (k.spinDeg) h += `<label>rotation <input type="number" min="-180" max="180" step="15" id="t-spin" value="${Math.round((p.spin || 0) * 180 / Math.PI)}">°/coup</label>`;
      if (k.burst) h += `<label>rafale <input type="number" min="1" max="8" step="1" id="t-burst" value="${p.burst || 1}"> × <input type="number" min="0.125" max="4" step="0.125" id="t-bgap" value="${p.burstGap != null ? p.burstGap : 0.25}"> temps</label>`;
      if (k.len) h += `<label>longueur <input type="number" min="1" max="26" step="1" id="t-len" value="${p.length || 26}"> tuiles</label>`;
      if (k.mode) h += `<label>motif <select id="t-mode"><option value="all">toutes les dalles</option><option value="checker">damier</option><option value="sweep">vague</option></select></label>`;
      if (k.amp) h += `<label>amplitude <input type="number" min="1" max="40" step="1" id="t-amp" value="${p.amp != null ? p.amp : (it.anim === 'bouncer' ? 18 : 7)}"> px</label>`;
      if (k.down) h += `<label class="chk"><input type="checkbox" id="t-down"${p.down ? ' checked' : ''}> s'enfonce</label>`;
      if (k.radius) h += `<label>rayon <input type="number" min="0.5" max="12" step="0.5" id="t-rad" value="${p.radius || 3}"> tuiles</label>`;
      if (k.gain) h += `<label>intensité <input type="number" min="0.1" max="1" step="0.1" id="t-gain" value="${p.gain != null ? p.gain : 0.5}"></label>`;
      if (k.step) h += `<label>pas <input type="number" min="15" max="360" step="15" id="t-step" value="${Math.round((p.step != null ? p.step : Math.PI / 2) * 180 / Math.PI)}">°/coup</label>`;
      if (k.scale) h += `<label>taille <input type="number" min="0.3" max="4" step="0.1" id="t-scale" value="${p.scale || 1}"></label>`;
      if (k.pingpong) h += `<label class="chk"><input type="checkbox" id="t-ping"${p.pingpong ? ' checked' : ''}> aller-retour</label>`;
      if (k.spin) h += `<label class="chk"><input type="checkbox" id="t-spin2"${p.spin ? ' checked' : ''}> tourne vers l'avant</label>`;
      if (k.sprite) h += `<label>image <select id="t-sprite"><option value="">— aucune —</option>${Sprites.propNames().map(s => `<option value="${s}">${s}</option>`).join('')}</select></label><label class="afile">+ image <input type="file" id="t-file" accept="image/*"></label>`;
    }
    if (!tpl) h += '<button class="btn small" id="t-dup">Dupliquer</button>';
    d.innerHTML = h; lanes.appendChild(d);
    const bind = (id, f) => { const e = d.querySelector(id); if (e) e.onchange = () => { f(e.type === 'number' ? +e.value : e.type === 'checkbox' ? e.checked : e.value); apply(); refresh(); }; };
    bind('#t-rhy', v => { const hh = rhythmHits(v); if (hh) it.hits = hh; });
    bind('#t-ping', v => { p.pingpong = v; }); bind('#t-spin2', v => { p.spin = v; });
    bind('#t-w', v => { it.w = clamp(Math.round(v), 1, ROOM_COLS); }); bind('#t-h', v => { it.h = clamp(Math.round(v), 1, ROOM_ROWS); });
    bind('#t-tele', v => { it.tele = clamp(v, 0, 8); }); bind('#t-act', v => { it.act = clamp(v, 0, 32); });
    bind('#t-col', v => { p.color = v; }); bind('#t-col2', v => { p.color2 = v; });
    bind('#t-ang', v => { const a = (v % 360) * Math.PI / 180; if (kindOf(it) === 'wall_fireball') p.dir = a; else p.angle = a; });
    bind('#t-axis', v => { p.axis = v; p.orientation = v === 'y' ? 'horizontal' : 'vertical'; });
    bind('#t-turn', v => { it.turn = clamp(v, 0.5, 32); }); bind('#t-trip', v => { it.trip = clamp(v, 0.5, 32); });
    bind('#t-arms', v => { p.arms = clamp(Math.round(v), 1, 6); }); bind('#t-count', v => { p.count = clamp(Math.round(v), 1, 16); });
    bind('#t-arc', v => { p.arc = clamp(v, 0, 360) * Math.PI / 180; }); bind('#t-spin', v => { p.spin = clamp(v, -180, 180) * Math.PI / 180; });
    bind('#t-burst', v => { p.burst = clamp(Math.round(v), 1, 8); }); bind('#t-bgap', v => { p.burstGap = clamp(v, 0.125, 4); });
    bind('#t-len', v => { p.length = clamp(Math.round(v), 1, 26); }); bind('#t-mode', v => { p.mode = v; });
    bind('#t-amp', v => { p.amp = clamp(v, 1, 40); }); bind('#t-down', v => { p.down = v; });
    bind('#t-rad', v => { p.radius = clamp(v, 0.5, 12); }); bind('#t-gain', v => { p.gain = clamp(v, 0.1, 1); });
    bind('#t-step', v => { p.step = clamp(v, 15, 360) * Math.PI / 180; }); bind('#t-scale', v => { p.scale = clamp(v, 0.3, 4); });
    bind('#t-sprite', v => { p.sprite = v || null; });
    const ax = d.querySelector('#t-axis'); if (ax) ax.value = p.axis || 'x';
    const md = d.querySelector('#t-mode'); if (md) md.value = p.mode || 'all';
    const sp = d.querySelector('#t-sprite'); if (sp) sp.value = p.sprite || '';
    const fi = d.querySelector('#t-file');
    if (fi) fi.onchange = () => {   // image déposée par l'auteur : utilisable tout de suite, à ranger ensuite dans assets/sprites/pixel/
      const f = fi.files && fi.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { const nm = f.name.replace(/\.[^.]+$/, ''); Sprites.addCustom(nm, rd.result).then(okk => { if (okk) { p.sprite = nm; apply(); refresh(); UI.toast('Image « ' + nm + ' » ajoutée'); } else UI.toast('Image illisible'); }); };
      rd.readAsDataURL(f);
    };
    const du = d.querySelector('#t-dup'); if (du) du.onclick = () => { const c = JSON.parse(JSON.stringify(it)); c.x = clamp(c.x + 1, 0, ROOM_COLS - 1); c.y = clamp(c.y + 1, 0, ROOM_ROWS - 1); st.items.push(c); st.sel = st.items.length - 1; apply(); refresh(); };
    const cx = d.querySelector('#t-col2x'); if (cx) cx.onclick = () => { delete p.color2; apply(); refresh(); };
    const nz = d.querySelector('#t-newzone'); if (nz) nz.onclick = () => { st.sel = -1; st.newZone = true; st.brush = 'a:' + it.anim; UI.toast('Motif suivant : la prochaine dalle posée en ouvre un nouveau'); refresh(); };
  }
  function tuneEnemy(lanes, it) {
    const d = document.createElement('div'); d.className = 'arow atune';
    d.innerHTML = `<b>${(Content.enemy(it.enemy) || {}).name || it.enemy}</b>
      <label>vague <input type="number" min="1" max="6" step="1" id="e-w" value="${(it.wave || 0) + 1}"></label>
      <label>nombre <input type="number" min="1" max="12" step="1" id="e-n" value="${it.count || 1}"></label>
      <label class="chk"><input type="checkbox" id="e-el"${it.elite ? ' checked' : ''}> élite</label>
      <button class="btn small" id="e-dup">Dupliquer</button><span class="amuted">la vague 1 entre au démarrage, les suivantes quand la précédente est vidée</span>`;
    lanes.appendChild(d);
    const bind = (id, f) => { const e = d.querySelector(id); e.onchange = () => { f(e.type === 'checkbox' ? e.checked : +e.value); apply(); replay(); refresh(); }; };
    bind('#e-w', v => { it.wave = clamp(Math.round(v) - 1, 0, 5); }); bind('#e-n', v => { it.count = clamp(Math.round(v), 1, 12); }); bind('#e-el', v => { it.elite = v; });
    d.querySelector('#e-dup').onclick = () => { const c = JSON.parse(JSON.stringify(it)); c.x = clamp(c.x + 1, 0, ROOM_COLS - 1); st.items.push(c); st.sel = st.items.length - 1; apply(); replay(); refresh(); };
  }
  /* remet les vagues à zéro : les ennemis rentrent comme au premier jour */
  function replay() {
    const r = G.room; if (!r) return;
    G.enemies = []; r.waves = (r.def.waves || []).map(w => Object.assign({ done: false }, w));
    r.waveIdx = 0; r.wavesStarted = false; r.lastWaveT = -99; r.state = 'fight'; r.stateT = 0; r.doorOpen = false;
  }
  /* position et largeur de la zone des cases : le curseur de lecture s'y aligne au pixel */
  function syncPos() { if (box && !box.hidden) { const e = $('#a-pos'); if (e) e.textContent = winLabel(); } }
  function measure() {
    if (!box || box.hidden) { headW = 0; return; }
    const g = box.querySelector('.agrid'), c = box.querySelector('.aruler .acells');
    if (!g || !c) { headW = 0; return; }
    const gr = g.getBoundingClientRect(), cr = c.getBoundingClientRect(); headX0 = cr.left - gr.left; headW = cr.width;
  }
  function toggleHit(k, b) {
    const it = st.items[k]; if (!it || !it.hits) return;
    const i = it.hits.findIndex(h => Math.abs(h - b) < 1e-6);
    if (i >= 0) it.hits.splice(i, 1); else { it.hits.push(b); AudioEngine.tempoTick({ intensity: 0.6 }); }
    st.sel = k; apply(); refresh();
  }

  /* ---------- pose à la souris ---------- */
  function paintTerrain(tx, ty, ch) {
    if (!st.terrain) st.terrain = new Array(ROOM_ROWS).fill('.'.repeat(ROOM_COLS));
    const row = st.terrain[ty]; st.terrain[ty] = row.slice(0, tx) + ch + row.slice(tx + 1);
    if (st.terrain.every(r => /^\.+$/.test(r))) st.terrain = null;   // plan entièrement effacé : on le retire
  }
  /* Ajoute (ou retire) une dalle au motif courant. Un motif garde UNE partition, quel que soit le nombre de dalles :
     c'est tout l'intérêt de peindre plutôt que de poser une zone rectangulaire par ligne. */
  function paintCell(anim, tx, ty, erase) {
    let it = st.items[st.sel];
    if (!it || it.kind !== 'anim' || it.anim !== anim) {
      it = st.newZone ? null : st.items.find(o => o.kind === 'anim' && o.anim === anim && o.params && o.params.cells);
      st.newZone = false;
      if (!it) {
        const ad = ANIM_DEFS[anim] || {};
        it = { kind: 'anim', anim, x: tx, y: ty, w: 1, h: 1, hits: [0], tele: 0, act: ad.act || 1, params: { cells: [] } };
        st.items.push(it);
      }
      st.sel = st.items.indexOf(it);
    }
    const cells = it.params.cells || (it.params.cells = []);
    const i = cells.findIndex(c => c[0] === tx && c[1] === ty);
    if (i >= 0) { if (erase !== false) cells.splice(i, 1); }
    else cells.push([tx, ty]);
    if (!cells.length) { st.items.splice(st.items.indexOf(it), 1); st.sel = -1; }
    else bbox(it);
    apply(); refresh();
  }
  /* Ajoute (ou retire) un point au trajet de l'objet mobile. L'ordre des clics est l'ordre du parcours. */
  function paintPath(anim, tx, ty) {
    let it = st.items[st.sel];
    if (!it || it.kind !== 'anim' || it.anim !== anim) {
      it = st.newZone ? null : st.items.find(o => o.kind === 'anim' && o.anim === anim && o.params && o.params.path);
      st.newZone = false;
      if (!it) { it = fromBrush(tx, ty) || { kind: 'anim', anim, x: tx, y: ty, w: 1, h: 1, hits: [0], tele: 0, act: 1, params: {} }; it.params.path = []; st.items.push(it); }
      st.sel = st.items.indexOf(it);
    }
    const path = it.params.path || (it.params.path = []);
    const i = path.findIndex(c => c[0] === tx && c[1] === ty);
    if (i >= 0) path.splice(i, 1); else path.push([tx, ty]);
    if (!path.length) { st.items.splice(st.items.indexOf(it), 1); st.sel = -1; }
    else { it.x = path[0][0]; it.y = path[0][1]; }
    apply(); refresh();
  }
  /* emprise du motif : ce que dessine le cadre de sélection et ce qu'affiche la ligne */
  function bbox(it) {
    const c = it.params.cells; if (!c || !c.length) return;
    const xs = c.map(p => p[0]), ys = c.map(p => p[1]);
    it.x = Math.min.apply(null, xs); it.y = Math.min.apply(null, ys);
    it.w = Math.max.apply(null, xs) - it.x + 1; it.h = Math.max.apply(null, ys) - it.y + 1;
  }
  function onCanvas(e) {
    if (!live || e.button !== 0 || !st.pose) return;
    dragging = true; dragSeen = new Set();
    const wm = Camera.toWorld(Input.mouse.x, Input.mouse.y);
    const tx = Math.floor((wm.x - ROOM_X) / TILE), ty = Math.floor((wm.y - ROOM_Y) / TILE);
    if (tx < 0 || ty < 0 || tx >= ROOM_COLS || ty >= ROOM_ROWS) return;
    dragSeen.add(tx + ',' + ty);
    if (st.brush && st.brush.startsWith('t:')) { paintTerrain(tx, ty, st.brush.slice(2)); apply(); refresh(); return; }
    if (st.brush && st.brush.startsWith('a:')) {
      const ad = ANIM_DEFS[st.brush.slice(2)] || {};
      if (ad.cells) { paintCell(st.brush.slice(2), tx, ty); return; }
      if (ad.path) { paintPath(st.brush.slice(2), tx, ty); return; }
    }
    const k = st.items.findIndex(it => famOf(it) === st.tab && tx >= it.x && tx < it.x + it.w && ty >= it.y && ty < it.y + it.h);
    if (k >= 0 && (!st.brush || k !== st.sel)) { st.sel = k; refresh(); return; }   // clic sur un élément : on le choisit
    if (!st.brush) return;
    if (st.brush === 'mur') st.items.push({ kind: 'mur', x: tx, y: ty, w: 1, h: 1 });
    else if (st.brush.startsWith('e:')) st.items.push({ kind: 'ennemi', enemy: st.brush.slice(2), x: tx, y: ty, w: 1, h: 1, wave: 0, count: 1, elite: false });
    else {
      if (st.brush.startsWith('a:')) {
        const ad = ANIM_DEFS[st.brush.slice(2)] || {};
        if (ad.cells) { paintCell(st.brush.slice(2), tx, ty); return; }   // dalles : on peint tuile par tuile
        if (ad.path) { paintPath(st.brush.slice(2), tx, ty); return; }    // objet mobile : on trace le trajet point par point
      }
      const it = fromBrush(tx, ty); if (!it) return;
      st.items.push(it);
    }
    st.sel = st.items.length - 1; apply(); refresh();
  }

  /* Traînée : bouton enfoncé, on peint les tuiles survolées. Peindre une salle dalle par dalle au clic isolé
     serait vite pénible ; une tuile n'est jamais traitée deux fois dans la même traînée. */
  let dragging = false, dragSeen = null;
  function onDrag() {
    if (!dragging || !live || !st.pose || !st.brush) return;
    const paintable = st.brush.startsWith('t:') || (st.brush.startsWith('a:') && (ANIM_DEFS[st.brush.slice(2)] || {}).cells);
    if (!paintable) return;
    const wm = Camera.toWorld(Input.mouse.x, Input.mouse.y);
    const tx = Math.floor((wm.x - ROOM_X) / TILE), ty = Math.floor((wm.y - ROOM_Y) / TILE);
    if (tx < 0 || ty < 0 || tx >= ROOM_COLS || ty >= ROOM_ROWS) return;
    const key = tx + ',' + ty; if (dragSeen.has(key)) return; dragSeen.add(key);
    if (st.brush.startsWith('t:')) { paintTerrain(tx, ty, st.brush.slice(2)); apply(); refresh(); }
    else paintCell(st.brush.slice(2), tx, ty, false);   // en traînée on ajoute seulement, jamais on n'efface
  }
  function onUp() { dragging = false; }

  /* ---------- import / export ---------- */
  function snippet() {
    const walls = st.items.filter(i => i.kind === 'mur'), traps = st.items.filter(i => i.kind === 'trap'), anims = st.items.filter(i => i.kind === 'anim');
    const info = Beat.info;
    let out = `/* Atelier rythme — boucle de ${st.bars} mesure(s), piste ${st.track} du ${st.biome}` + (info.internal ? ' (métronome interne)' : ` (${Math.round(info.bpm)} BPM)`) + ' */\n';
    if (st.terrain) out += 'terrain: [\n' + st.terrain.map(r => `  '${r}',`).join('\n') + '\n],\n';
    if (walls.length) out += 'obstacles: [\n' + walls.map(w => `  { x: ${w.x}, y: ${w.y}, w: ${w.w}, h: ${w.h} },`).join('\n') + '\n],\n';
    if (anims.length) out += 'anims: [\n' + anims.map(a => `  { kind: '${a.anim}', x: ${a.x}, y: ${a.y}, w: ${a.w}, h: ${a.h}${par(a.params)}, beats: ${bj(beatsOf(a, false))} },`).join('\n') + '\n],\n';
    const waves = compileWaves();
    if (waves.length) out += 'waves: [\n' + waves.map(w => `  { at: '${w.at}', spawns: [${w.spawns.map(sp => `{ enemy: '${sp.enemy}', x: ${sp.x}, y: ${sp.y}${sp.count > 1 ? ', count: ' + sp.count : ''}${sp.elite ? ', elite: true' : ''} }`).join(', ')}] },`).join('\n') + '\n],\n';
    out += 'traps: [\n' + traps.map(t => `  { trap: '${t.trap}', x: ${t.x}, y: ${t.y}, w: ${t.w}, h: ${t.h}, params: { ${inner(t.params)}beats: ${bj(beatsOf(t, true))} } },`).join('\n') + '\n],\n';
    out += '/* atelier:' + JSON.stringify(snap()) + ' */';
    return out;
  }
  const bj = b => '{ ' + Object.keys(b).map(k => `${k}: ${Array.isArray(b[k]) ? '[' + b[k].map(q).join(', ') + ']' : q(b[k])}`).join(', ') + ' }';
  const val = v => Array.isArray(v) ? '[' + v.map(val).join(', ') + ']' : typeof v === 'string' ? `'${v}'` : typeof v === 'boolean' ? String(v) : q(v);
  const inner = p => Object.keys(p || {}).map(k => `${k}: ${val(p[k])}, `).join('');
  const par = p => Object.keys(p || {}).length ? `, params: { ${inner(p).replace(/, $/, '')} }` : '';
  /* export de l'établi Amis : le contenu complet de dev/content5.js, images comprises */
  function amisSnippet() {
    const src = amis.pets.concat(amis.chars); const imgs = []; const shs = [];
    for (const a of src) for (const [f, k] of IMG_SLOTS) if (a[f] && a[k]) imgs.push([a[k], a[f]]);
    for (const c of amis.chars) if (c.sheets) for (const k in c.sheets) shs.push([c.id + '_' + k, c.sheets[k], c.fw || 0]);
    let out = '/* AMIS_DEBUT */\n';
    out += 'const FRIEND_IMAGES = {\n' + imgs.map(([k, v]) => `  '${k}': '${v}',`).join('\n') + '\n};\n\n';
    out += 'const FRIEND_SHEETS = {\n' + shs.map(([k, v, w]) => `  '${k}': { fw: ${w}, url: '${v}' },`).join('\n') + '\n};\n\n';
    out += 'CONTENT.pets.push(\n' + amis.pets.map(p => '  ' + JSON.stringify(petDef(p)) + ',').join('\n') + '\n);\n\n';
    out += 'CONTENT.characters.push(\n' + amis.chars.map(c => '  ' + JSON.stringify(charDef(c)) + ',').join('\n') + '\n);\n';
    out += '/* AMIS_FIN */\n';
    return out.replace(/"atelier":true,?/g, '');
  }
  function showIo() { $('#a-io').hidden = false; $('#a-txt').value = st.tab === 'amis' ? amisSnippet() : snippet(); }
  /* relit le bloc « atelier:{…} » qu'écrit l'export : un aller-retour complet sans réécrire à la main */
  function importText(txt) {
    if (txt.indexOf('AMIS_DEBUT') >= 0) { UI.toast('Ce texte est le contenu de dev/content5.js : le coller dans le fichier, pas ici'); return; }
    const i = txt.indexOf('atelier:'); if (i < 0) { UI.toast('Texte non reconnu (il faut le bloc « atelier: » de l\'export)'); return; }
    let j = txt.lastIndexOf('*/'); if (j < i) j = txt.length;
    try {
      adopt(JSON.parse(txt.slice(i + 8, j).trim())); st.sel = -1;
      startRoom(); build(); UI.toast('Partition chargée : ' + st.items.length + ' élément(s)');
    } catch (e) { UI.toast('Lecture impossible : ' + e.message); }
  }

  /* ---------- boucle ---------- */
  function update() {
    if (!live) return;
    if (!G.run || G.state !== 'run' || !G.room) { close(); return; }   // run quittée depuis la pause : on referme proprement
    if (G.room.doorOpen) G.room.doorOpen = false;   // on ne sort pas de l'atelier par la porte
    if (Input.keys.has('Delete') && st.sel >= 0) { st.items.splice(st.sel, 1); st.sel = -1; Input.keys.delete('Delete'); apply(); refresh(); }
    /* La lecture boucle sur la FENÊTRE de travail, pas sur la partition entière : c'est ce qui permet de
       repasser deux mesures en boucle au milieu d'un morceau de trois minutes. Boucle décochée, c'est la
       fenêtre qui suit la musique. */
    const w0 = winStart(), wl = winBeats(); let pos = inLoop();
    if (pos < w0 || pos >= w0 + wl) {
      if (st.loop) { if (!Music.seekBeat(cycle() * Lb() + w0)) { st.winIdx = Math.floor(pos / wl); syncPos(); } }
      else { const i = clamp(Math.floor(pos / wl), 0, winCount() - 1); if (i !== st.winIdx) { st.winIdx = i; refresh(); } }
      pos = clamp(inLoop(), w0, w0 + wl);
    }
    if (Time.frame % 30 === 0) measure();   // fenêtre redimensionnée, panneau replié : la tête de lecture se recale
    if (headEl && headW) headEl.style.left = (headX0 + headW * (pos - w0) / wl) + 'px';
    /* Métronome : on programme le clic pour l'instant EXACT du prochain temps, jusqu'à 250 ms à l'avance, au lieu
       de le déclencher au pas de simulation qui suit — celui-ci tombait 8 à 17 ms trop tard, systématiquement.
       `Beat.lag` avance encore le clic de la latence de sortie, pour qu'il soit entendu sur le temps. */
    if (st.metro) {
      const nb = Beat.timeToBeat(1);
      if (nb.at < 0.25 && nb.index !== lastIdx) {
        lastIdx = nb.index;
        AudioEngine.tempoTick({ intensity: ((nb.index % 4) + 4) % 4 === 0 ? 1 : 0.45, delay: Math.max(0, nb.at - Beat.lag) });
      }
    } else lastIdx = -1;
  }
  /* repères dans la salle : grille de pose, élément choisi, aperçu sous le curseur */
  function render(ctx) {
    if (!live || !st.pose) return;
    /* Repères de pose : très effacés, et marqués seulement toutes les quatre tuiles — un quadrillage plein masquait la salle. */
    if (st.grid) {
      ctx.save(); ctx.strokeStyle = '#6ee7ff'; ctx.lineWidth = 1;
      for (let x = 0; x <= ROOM_COLS; x++) { ctx.globalAlpha = x % 4 === 0 ? 0.13 : 0.04; ctx.beginPath(); ctx.moveTo(ROOM_X + x * TILE, ROOM_Y); ctx.lineTo(ROOM_X + x * TILE, ROOM_Y + ROOM_ROWS * TILE); ctx.stroke(); }
      for (let y = 0; y <= ROOM_ROWS; y++) { ctx.globalAlpha = y % 4 === 0 ? 0.13 : 0.04; ctx.beginPath(); ctx.moveTo(ROOM_X, ROOM_Y + y * TILE); ctx.lineTo(ROOM_X + ROOM_COLS * TILE, ROOM_Y + y * TILE); ctx.stroke(); }
      ctx.restore();
    }
    const it = st.items[st.sel];
    if (it) { ctx.save(); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(ROOM_X + it.x * TILE + 1, ROOM_Y + it.y * TILE + 1, it.w * TILE - 2, it.h * TILE - 2); ctx.restore(); }
    /* trajet d'un objet mobile : la ligne et les points numérotés, pour voir l'ordre du parcours */
    for (const o2 of st.items) {
      const path = o2.kind === 'anim' && o2.params && o2.params.path;
      if (!path || !path.length) continue;
      const sel = st.items[st.sel] === o2; const c = o2.params.color || (ANIM_DEFS[o2.anim] || {}).color || '#ffd166';
      const px = i => ROOM_X + (path[i][0] + 0.5) * TILE, py = i => ROOM_Y + (path[i][1] + 0.5) * TILE;
      ctx.save(); ctx.globalAlpha = sel ? 0.9 : 0.35; ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(px(0), py(0));
      for (let i = 1; i < path.length; i++) ctx.lineTo(px(i), py(i));
      if (!o2.params.pingpong && path.length > 2) ctx.lineTo(px(0), py(0));
      ctx.stroke(); ctx.setLineDash([]);
      ctx.font = 'bold 11px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < path.length; i++) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px(i), py(i), 9, 0, TAU); ctx.fill(); ctx.fillStyle = '#07080d'; ctx.fillText(String(i + 1), px(i), py(i) + 1); }
      ctx.restore();
    }
    if (st.brush) {
      const wm = Camera.toWorld(Input.mouse.x, Input.mouse.y);
      const tx = Math.floor((wm.x - ROOM_X) / TILE), ty = Math.floor((wm.y - ROOM_Y) / TILE);
      if (tx >= 0 && ty >= 0 && tx < ROOM_COLS && ty < ROOM_ROWS) {
        let s = [1, 1], col = '#8890aa';
        if (st.brush.startsWith('a:')) { const ad = ANIM_DEFS[st.brush.slice(2)] || {}; s = ad.size || [1, 1]; col = ad.color || '#6ee7ff'; }
        else if (st.brush.startsWith('t:')) { col = '#7fff9a'; }
        else if (st.brush !== 'mur') { const dfn = Content.trap(st.brush); if (dfn) { s = (KIND[dfn.kind] || {}).size || [1, 1]; col = dfn.color || '#ff5e7a'; } }
        ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = col;
        ctx.fillRect(ROOM_X + tx * TILE, ROOM_Y + ty * TILE, s[0] * TILE, s[1] * TILE); ctx.restore();
      }
    }
  }
  return { open, close, toggle, update, render, apply, refresh, snippet, get live() { return live; }, get st() { return st; }, posing: () => live && st.pose };
})();
