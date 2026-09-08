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
    emitter:       { size: [1, 1], act: 0.25, tele: 1, angle: 1, count: 1, spin: 1, arc: 1, burst: 1 },
    laser_beam:    { size: [1, 1], act: 1, tele: 1, angle: 1, len: 1 },
  };
  /* réglages proposés pour le décor animé */
  const AKIND = {
    tile_color: { mode: 1, color2: 1 },
    tile_lift:  { mode: 1, amp: 1, down: 1, color2: 1 },
    spinner:    { sprite: 1, step: 1, scale: 1 },
    bouncer:    { sprite: 1, amp: 1, scale: 1 },
    light:      { radius: 1, gain: 1, color2: 1 },
    ring:       { radius: 1, color2: 1 },
  };
  const SNAPS = [[1, 'noires'], [2, 'croches'], [4, 'doubles'], [3, 'triolets']];
  const TABS = [['anim', 'Animations'], ['trap', 'Pièges'], ['level', 'Niveau']];
  const BRUSH = { '.': 'sol', '#': 'mur plein', 'n': 'muret', ':': 'claustra', '=': 'pont', '~': 'eau', ',': 'boue' };
  const st = { biome: 'biome_1', track: 'a', bars: 2, snap: 2, items: [], terrain: null, sel: -1, tab: 'trap',
    pose: true, loop: true, metro: false, safe: true, grid: true, brush: null, loopBar: 0 };
  let box = null, live = false, lastIdx = -1, headEl = null, canvas = null, headX0 = 0, headW = 0;

  const Lb = () => st.bars * 4;                       // temps par boucle
  const nCells = () => Math.round(Lb() * st.snap);    // cases de la grille
  const beatNow = () => Beat.t / Beat.beatLen();
  const inLoop = () => beatNow() - st.loopBar * Lb();
  const q = n => Math.round(n * 1000) / 1000;
  const kindOf = it => (Content.trap(it.trap) || {}).kind;
  const defOf = it => KIND[kindOf(it)] || {};
  const trapsOf = () => (Content.biome(st.biome) || {}).trapPool || [];
  const famOf = it => it.kind === 'anim' ? 'anim' : it.kind === 'trap' ? 'trap' : 'level';
  const enemiesOf = () => (Content.biome(st.biome) || {}).enemyPool || [];
  const shown = () => st.items.map((it, i) => [it, i]).filter(([it]) => famOf(it) === st.tab);
  const $ = s => box.querySelector(s);

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

  /* ---------- ouverture / fermeture ---------- */
  function toggle() { live ? close() : open(); }
  function open() {
    if (live) return;
    if (G.state === 'run' && !G.attract && !confirm('Ouvrir l\'atelier abandonne la run en cours. Continuer ?')) return;
    live = true; load();
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
    if (canvas) canvas.removeEventListener('mousedown', onCanvas);
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
        <label>Boucle <select id="a-bars"><option value="1">1 mesure</option><option value="2">2 mesures</option><option value="4">4 mesures</option><option value="8">8 mesures</option></select></label>
        <label>Grille <select id="a-snap">${SNAPS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></label>
        <label class="chk"><input type="checkbox" id="a-loop"> boucler</label>
        <label class="chk"><input type="checkbox" id="a-metro"> métronome</label>
        <label class="chk"><input type="checkbox" id="a-safe"> invulnérable</label>
        <label class="chk"><input type="checkbox" id="a-grid"> repères</label>
        <span class="asp"></span>
        <span class="anw"><button class="btn small" id="a-prev">◀</button><span id="a-win" class="amono"></span><button class="btn small" id="a-next">▶</button></span>
        <button class="btn small" id="a-export">Exporter</button><button class="btn small ghost" id="a-clear">Vider</button><button class="btn small ghost" id="a-fold">Réduire</button><button class="btn small ghost" id="a-close">Fermer (F2)</button>
      </div>
      <div class="apal" id="a-pal"></div>
      <div class="agrid"><div class="alanes" id="a-lanes"></div><div class="ahead-line" id="a-head"></div></div>
      <div class="aio" id="a-io" hidden><textarea id="a-txt" spellcheck="false"></textarea>
        <div class="arow"><button class="btn small" id="a-copy">Copier</button><button class="btn small" id="a-import">Importer ce texte</button><button class="btn small ghost" id="a-hide">Fermer</button></div></div>`;
    headEl = $('#a-head');
    $('#a-biome').onchange = e => { st.biome = e.target.value; st.brush = null; startRoom(); refresh(); };
    $('#a-track').onchange = e => setTrack(e.target.value);
    $('#a-bars').onchange = e => { st.bars = +e.target.value; st.loopBar = Math.floor(beatNow() / Lb()); apply(); refresh(); };
    $('#a-snap').onchange = e => { st.snap = +e.target.value; refresh(); };
    $('#a-loop').onchange = e => { st.loop = e.target.checked; };
    $('#a-metro').onchange = e => { st.metro = e.target.checked; };
    $('#a-safe').onchange = e => { st.safe = e.target.checked; G.debug.invuln = st.safe; };
    $('#a-grid').onchange = e => { st.grid = e.target.checked; };
    $('#a-mode').onclick = () => setPose(!st.pose);
    $('#a-prev').onclick = () => jumpLoop(-1); $('#a-next').onclick = () => jumpLoop(1);
    $('#a-export').onclick = showIo; $('#a-hide').onclick = () => { $('#a-io').hidden = true; };
    $('#a-copy').onclick = () => { const t = $('#a-txt'); t.select(); try { navigator.clipboard.writeText(t.value); UI.toast('Copié'); } catch (e) { document.execCommand('copy'); } };
    $('#a-import').onclick = () => importText($('#a-txt').value);
    $('#a-clear').onclick = () => { if (st.tab === 'level') { st.terrain = null; st.items = st.items.filter(i => i.kind !== 'mur'); } else st.items = st.items.filter(i => famOf(i) !== st.tab); st.sel = -1; apply(); refresh(); };
    $('#a-close').onclick = close;
    $('#a-fold').onclick = () => { const f = box.classList.toggle('fold'); $('#a-fold').textContent = f ? 'Déplier' : 'Réduire'; if (!f) measure(); };
    box.querySelectorAll('.tab').forEach(b => { b.onclick = () => { st.tab = b.dataset.t; st.brush = null; st.sel = -1; refresh(); }; });
    canvas.addEventListener('mousedown', onCanvas);
    refresh();
  }
  /* pose ↔ test : en test, plus de grille, plus de cadres, plus de partition au sol — la salle telle qu'elle sera jouée */
  function setPose(v) {
    st.pose = v; if (G.room) G.room.noScore = !v;
    if (box) { box.classList.toggle('fold', !v); const f = $('#a-fold'); if (f) f.textContent = v ? 'Réduire' : 'Déplier'; }
    refresh();
  }
  function jumpLoop(d) { const b = st.loopBar + d; if (b < 0) return; if (!Music.seekBeat(b * Lb())) return; st.loopBar = b; refresh(); }

  /* ---------- palette et partition ---------- */
  function refresh() {
    if (!box || box.hidden) return;
    $('#a-biome').value = st.biome; $('#a-track').value = st.track; $('#a-bars').value = st.bars; $('#a-snap').value = st.snap;
    $('#a-loop').checked = st.loop; $('#a-metro').checked = st.metro; $('#a-safe').checked = st.safe; $('#a-grid').checked = st.grid;
    $('#a-mode').textContent = st.pose ? 'Mode : pose' : 'Mode : test';
    $('#a-mode').className = 'btn small' + (st.pose ? ' primary' : '');
    $('#a-win').textContent = 'mesures ' + (st.loopBar * st.bars + 1) + '–' + (st.loopBar * st.bars + st.bars);
    box.querySelectorAll('.tab').forEach(b => { b.className = 'btn small tab' + (b.dataset.t === st.tab ? ' primary' : ''); });
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
    let html = '<div class="alane aruler"><span class="an"></span><div class="acells">';
    for (let i = 0; i < n; i++) { const b = i / st.snap; const isBeat = Math.abs(b - Math.round(b)) < 1e-6; const bar = isBeat && Math.round(b) % 4 === 0;
      html += `<div class="ac ${bar ? 'bar' : isBeat ? 'beat' : ''}" data-c="${i}">${isBeat ? (Math.floor(Math.round(b) / 4) + 1) + '·' + (Math.round(b) % 4 + 1) : ''}</div>`; }
    html += '</div><span class="ax"></span></div>';
    for (const [it, k] of shown()) {
      const name = it.kind === 'mur' ? 'Bloc' : it.kind === 'ennemi' ? ((Content.enemy(it.enemy) || {}).name || it.enemy) + ' · vague ' + ((it.wave || 0) + 1)
        : it.kind === 'anim' ? (ANIM_DEFS[it.anim] || {}).name || it.anim : ((Content.trap(it.trap) || {}).name || it.trap);
      html += `<div class="alane${k === st.sel ? ' sel' : ''}" data-l="${k}"><span class="an" title="${name}">${name} <i>${it.x},${it.y}</i></span><div class="acells">`;
      if (!it.hits) html += '<div class="amur">décor sans partition</div>';
      else for (let i = 0; i < n; i++) { const b = i / st.snap; const hit = it.hits.some(h => Math.abs(h - b) < 1e-6); const isBeat = Math.abs(b - Math.round(b)) < 1e-6; const bar = isBeat && Math.round(b) % 4 === 0;
        html += `<div class="ac ${bar ? 'bar' : isBeat ? 'beat' : ''}${hit ? ' hit' : ''}" data-l="${k}" data-c="${i}"></div>`; }
      html += `</div><span class="ax"><button class="btn tiny" data-del="${k}">×</button></span></div>`;
    }
    if (st.tab === 'level') html += `<div class="alane"><span class="an amuted">terrain</span><div class="acells"><div class="amur">${st.terrain ? 'plan peint — « Vider » le remet à zéro' : 'aucun plan : peindre une tuile en crée un'}</div></div><span class="ax"></span></div>`;
    lanes.innerHTML = html;
    lanes.querySelectorAll('.aruler .ac').forEach(c => { c.onclick = () => Music.seekBeat(st.loopBar * Lb() + (+c.dataset.c) / st.snap); });
    lanes.querySelectorAll('.ac[data-l]').forEach(c => { c.onclick = () => toggleHit(+c.dataset.l, (+c.dataset.c) / st.snap); });
    lanes.querySelectorAll('.alane[data-l] .an').forEach(e => { e.onclick = () => { st.sel = +e.parentNode.dataset.l; refresh(); }; });
    lanes.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => { st.items.splice(+b.dataset.del, 1); st.sel = -1; apply(); refresh(); }; });
    measure();
    tune(lanes);
  }
  /* réglages de l'élément choisi : ce qui a du sens pour sa mécanique, rien de plus */
  function tune(lanes) {
    const it = st.items[st.sel]; if (!it || famOf(it) !== st.tab) return;
    if (it.kind === 'ennemi') return tuneEnemy(lanes, it);
    const anim = it.kind === 'anim'; const k = it.kind === 'mur' ? {} : anim ? (AKIND[it.anim] || {}) : defOf(it); const p = it.params || (it.params = {});
    const d = document.createElement('div'); d.className = 'arow atune';
    const nom = it.kind === 'mur' ? 'Bloc' : anim ? (ANIM_DEFS[it.anim] || {}).name : ((Content.trap(it.trap) || {}).name || it.trap);
    const col = p.color || (anim ? (ANIM_DEFS[it.anim] || {}).color : (Content.trap(it.trap) || {}).color) || '#ff5e7a';
    let h = `<b>${nom}</b>
      <label>largeur <input type="number" min="1" max="24" step="1" id="t-w" value="${it.w}"></label>
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
      if (k.spin) h += `<label>rotation <input type="number" min="-180" max="180" step="15" id="t-spin" value="${Math.round((p.spin || 0) * 180 / Math.PI)}">°/coup</label>`;
      if (k.burst) h += `<label>rafale <input type="number" min="1" max="8" step="1" id="t-burst" value="${p.burst || 1}"> × <input type="number" min="0.125" max="4" step="0.125" id="t-bgap" value="${p.burstGap != null ? p.burstGap : 0.25}"> temps</label>`;
      if (k.len) h += `<label>longueur <input type="number" min="1" max="26" step="1" id="t-len" value="${p.length || 26}"> tuiles</label>`;
      if (k.mode) h += `<label>motif <select id="t-mode"><option value="all">toutes les dalles</option><option value="checker">damier</option><option value="sweep">vague</option></select></label>`;
      if (k.amp) h += `<label>amplitude <input type="number" min="1" max="40" step="1" id="t-amp" value="${p.amp != null ? p.amp : (it.anim === 'bouncer' ? 18 : 7)}"> px</label>`;
      if (k.down) h += `<label class="chk"><input type="checkbox" id="t-down"${p.down ? ' checked' : ''}> s'enfonce</label>`;
      if (k.radius) h += `<label>rayon <input type="number" min="0.5" max="12" step="0.5" id="t-rad" value="${p.radius || 3}"> tuiles</label>`;
      if (k.gain) h += `<label>intensité <input type="number" min="0.1" max="1" step="0.1" id="t-gain" value="${p.gain != null ? p.gain : 0.5}"></label>`;
      if (k.step) h += `<label>pas <input type="number" min="15" max="360" step="15" id="t-step" value="${Math.round((p.step != null ? p.step : Math.PI / 2) * 180 / Math.PI)}">°/coup</label>`;
      if (k.scale) h += `<label>taille <input type="number" min="0.3" max="4" step="0.1" id="t-scale" value="${p.scale || 1}"></label>`;
      if (k.sprite) h += `<label>image <select id="t-sprite"><option value="">— aucune —</option>${Sprites.propNames().map(s => `<option value="${s}">${s}</option>`).join('')}</select></label><label class="afile">+ image <input type="file" id="t-file" accept="image/*"></label>`;
    }
    h += '<button class="btn small" id="t-dup">Dupliquer</button>';
    d.innerHTML = h; lanes.appendChild(d);
    const bind = (id, f) => { const e = d.querySelector(id); if (e) e.onchange = () => { f(e.type === 'number' ? +e.value : e.type === 'checkbox' ? e.checked : e.value); apply(); refresh(); }; };
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
    d.querySelector('#t-dup').onclick = () => { const c = JSON.parse(JSON.stringify(it)); c.x = clamp(c.x + 1, 0, ROOM_COLS - 1); c.y = clamp(c.y + 1, 0, ROOM_ROWS - 1); st.items.push(c); st.sel = st.items.length - 1; apply(); refresh(); };
    const cx = d.querySelector('#t-col2x'); if (cx) cx.onclick = () => { delete p.color2; apply(); refresh(); };
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
  function onCanvas(e) {
    if (!live || e.button !== 0 || !st.pose) return;
    const wm = Camera.toWorld(Input.mouse.x, Input.mouse.y);
    const tx = Math.floor((wm.x - ROOM_X) / TILE), ty = Math.floor((wm.y - ROOM_Y) / TILE);
    if (tx < 0 || ty < 0 || tx >= ROOM_COLS || ty >= ROOM_ROWS) return;
    if (st.brush && st.brush.startsWith('t:')) { paintTerrain(tx, ty, st.brush.slice(2)); apply(); refresh(); return; }
    const k = st.items.findIndex(it => famOf(it) === st.tab && tx >= it.x && tx < it.x + it.w && ty >= it.y && ty < it.y + it.h);
    if (k >= 0 && (!st.brush || k !== st.sel)) { st.sel = k; refresh(); return; }   // clic sur un élément : on le choisit
    if (!st.brush) return;
    if (st.brush === 'mur') st.items.push({ kind: 'mur', x: tx, y: ty, w: 1, h: 1 });
    else if (st.brush.startsWith('e:')) st.items.push({ kind: 'ennemi', enemy: st.brush.slice(2), x: tx, y: ty, w: 1, h: 1, wave: 0, count: 1, elite: false });
    else if (st.brush.startsWith('a:')) {
      const a = st.brush.slice(2); const ad = ANIM_DEFS[a] || {}; const s = ad.size || [1, 1];
      st.items.push({ kind: 'anim', anim: a, x: clamp(tx, 0, ROOM_COLS - s[0]), y: clamp(ty, 0, ROOM_ROWS - s[1]), w: s[0], h: s[1], hits: [0], tele: 0, act: ad.act || 1, params: {} });
    } else {
      const dfn = Content.trap(st.brush); if (!dfn) return;
      const kk = KIND[dfn.kind] || {}; const s = kk.size || [1, 1];
      const it = { kind: 'trap', trap: st.brush, x: clamp(tx, 0, ROOM_COLS - s[0]), y: clamp(ty, 0, ROOM_ROWS - s[1]), w: s[0], h: s[1], hits: [0], tele: kk.tele || 1, act: kk.act || 0, params: {} };
      if (kk.turn) it.turn = kk.turn; if (kk.trip) it.trip = kk.trip;
      st.items.push(it);
    }
    st.sel = st.items.length - 1; apply(); refresh();
  }

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
  const inner = p => Object.keys(p || {}).map(k => `${k}: ${typeof p[k] === 'string' ? `'${p[k]}'` : q(p[k])}, `).join('');
  const par = p => Object.keys(p || {}).length ? `, params: { ${inner(p).replace(/, $/, '')} }` : '';
  function showIo() { $('#a-io').hidden = false; $('#a-txt').value = snippet(); }
  /* relit le bloc « atelier:{…} » qu'écrit l'export : un aller-retour complet sans réécrire à la main */
  function importText(txt) {
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
    const L = Lb(); let pos = inLoop();
    if (pos >= L || pos < 0) {
      if (!(st.loop && pos >= L && Music.seekBeat(st.loopBar * L))) { st.loopBar = Math.max(0, Math.floor(beatNow() / L)); if (box && !box.hidden) $('#a-win').textContent = 'mesures ' + (st.loopBar * st.bars + 1) + '–' + (st.loopBar * st.bars + st.bars); }
      pos = clamp(inLoop(), 0, L);
    }
    if (Time.frame % 30 === 0) measure();   // fenêtre redimensionnée, panneau replié : la tête de lecture se recale
    if (headEl && headW) headEl.style.left = (headX0 + headW * pos / L) + 'px';
    const idx = Beat.index();
    if (idx !== lastIdx) { lastIdx = idx; if (st.metro) AudioEngine.tempoTick({ intensity: Beat.beatInBar() === 0 ? 1 : 0.45 }); }
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
