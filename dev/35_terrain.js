'use strict';
/* =========================================================================
   WAY — 35_terrain.js
   Couche de terrain : une salle déclare un plan ASCII (13 lignes de 24 caractères), compilé au chargement en
   une grille `room.grid` (un code par tuile) et en rectangles poussés dans `room.obstacles`.

   Pourquoi une grille plutôt qu'une liste d'entités : `pointBlocked` et `lineOfSight` sont appelés une fois par
   ennemi et par image (jusqu'à 60 ennemis), et bouclaient sur toute la liste d'obstacles. Une lecture de tableau
   coûte moins cher qu'une boucle, donc ajouter du terrain ne coûte rien en performances.

   Le point clé : « bloque les pas », « arrête les balles » et « coupe la vue » sont trois choses distinctes.
   Un muret arrête le joueur mais pas les balles ; un moucharabieh coupe la vue mais laisse tout passer.
   Les obstacles portent donc `stopsShot` et `blocksSight` (absents = vrai, comportement d'avant).
   ========================================================================= */

const TERRAIN = {
  /* ch : caractère du plan · solid : bloque les pas · stopsShot : arrête les balles · blocksSight : coupe la vue
     speed : multiplicateur de vitesse en surface · dashOver : franchissable pendant le dash du joueur */
  '.': { id: 0, name: 'floor' },
  '#': { id: 1, name: 'wall', solid: true, stopsShot: true, blocksSight: true },
  n: { id: 2, name: 'ledge', solid: true, stopsShot: false, blocksSight: false, dashOver: true },
  ':': { id: 3, name: 'screen', blocksSight: true, speed: 0.9 },
  '=': { id: 4, name: 'bridge' },
  '~': { id: 5, name: 'water', speed: 0.72 },
  ',': { id: 6, name: 'mud', speed: 0.55 },
};
const TERRAIN_BY_ID = [];
for (const ch in TERRAIN) {
  TERRAIN_BY_ID[TERRAIN[ch].id] = Object.assign({ ch }, TERRAIN[ch]);
}

const Terrain = (() => {
  const idx = (tx, ty) => ty * ROOM_COLS + tx;
  const inside = (tx, ty) => tx >= 0 && ty >= 0 && tx < ROOM_COLS && ty < ROOM_ROWS;
  const defOf = code => TERRAIN_BY_ID[code] || TERRAIN_BY_ID[0];
  /* tuile sous un point du monde */
  const tileOf = (x, y) => [Math.floor((x - ROOM_X) / TILE), Math.floor((y - ROOM_Y) / TILE)];
  function codeAt(x, y) {
    const g = G.room && G.room.grid;
    if (!g) return 0;
    const [tx, ty] = tileOf(x, y);
    if (!inside(tx, ty)) return 0;
    return g[idx(tx, ty)];
  }
  const at = (x, y) => defOf(codeAt(x, y));
  /* on peut se tenir ici : ni terrain solide, ni obstacle déclaré */
  function walkable(tx, ty, room) {
    const r = room || G.room;
    if (!r) return false;
    if (!inside(tx, ty)) return false;
    if (r.grid && defOf(r.grid[idx(tx, ty)]).solid) return false;
    const px = ROOM_X + (tx + 0.5) * TILE,
      py = ROOM_Y + (ty + 0.5) * TILE;
    for (const o of r.obstacles) {
      if (o.terrain) continue;
      if (circleRect(px, py, TILE * 0.35, o.px, o.py, o.pw, o.ph)) return false;
    }
    return true;
  }
  /* tuile praticable la plus proche d'un point (replacement après une poussée dans un mur) */
  function nearestWalkable(x, y, room) {
    const r = room || G.room;
    const [cx, cy] = tileOf(x, y);
    if (walkable(cx, cy, r)) return { x, y };
    for (let ring = 1; ring < 12; ring++) {
      let best = null,
        bd = Infinity;
      for (let ty = cy - ring; ty <= cy + ring; ty++)
        for (let tx = cx - ring; tx <= cx + ring; tx++) {
          if (Math.max(Math.abs(tx - cx), Math.abs(ty - cy)) !== ring || !walkable(tx, ty, r)) continue;
          const px = ROOM_X + (tx + 0.5) * TILE,
            py = ROOM_Y + (ty + 0.5) * TILE;
          const d = dist(x, y, px, py);
          if (d < bd) {
            bd = d;
            best = { x: px, y: py };
          }
        }
      if (best) return best;
    }
    return { x: W / 2, y: H / 2 };
  }
  /* sol nu : ni terrain solide, ni surface (eau, boue, pont, moucharabieh). C'est là et nulle part ailleurs
     qu'on sème du décor — un tapis au fond du bassin ou une plante sur un pont se voient tout de suite. */
  function plain(tx, ty, room) {
    const r = room || G.room;
    return !r.grid || (inside(tx, ty) && r.grid[idx(tx, ty)] === 0);
  }
  /* multiplicateur de vitesse de la surface (1 hors terrain ralentissant) */
  function speedAt(x, y) {
    const t = at(x, y);
    return t.speed || 1;
  }
  /* le point coupe-t-il la vue sans bloquer les pas (moucharabieh, feuillage, vapeur) */
  function screenAt(x, y) {
    const t = at(x, y);
    return !t.solid && !!t.blocksSight;
  }

  /* ---------- compilation du plan ---------- */
  /* Les tuiles solides voisines sont fusionnées en bandes horizontales : 40 rectangles au lieu de 200 tuiles,
     et le reste du moteur (collision, projectiles, rendu) continue de ne voir que des rectangles. */
  function compile(room, def) {
    const plan = def.terrain,
      rects = def.terrainRects;
    if (!plan && !rects) return;
    const g = (room.grid = new Uint8Array(ROOM_COLS * ROOM_ROWS));
    if (plan) {
      for (let ty = 0; ty < Math.min(plan.length, ROOM_ROWS); ty++) {
        const line = plan[ty];
        for (let tx = 0; tx < Math.min(line.length, ROOM_COLS); tx++) {
          const t = TERRAIN[line[tx]];
          if (!t) {
            console.warn('[Terrain] caractère inconnu « ' + line[tx] + ' » en ' + tx + ',' + ty + ' (' + def.id + ')');
            continue;
          }
          g[idx(tx, ty)] = t.id;
        }
      }
      if (plan.length !== ROOM_ROWS) console.warn('[Terrain] ' + def.id + ' : ' + plan.length + ' lignes au lieu de ' + ROOM_ROWS);
      for (const line of plan)
        if (line.length !== ROOM_COLS) {
          console.warn('[Terrain] ' + def.id + ' : une ligne fait ' + line.length + ' caractères au lieu de ' + ROOM_COLS);
          break;
        }
    }
    for (const rc of rects || []) {
      const t = TERRAIN[rc.ch] || Object.values(TERRAIN).find(v => v.name === rc.kind);
      if (!t) {
        console.warn('[Terrain] rectangle de type inconnu', rc);
        continue;
      }
      for (let ty = rc.y; ty < rc.y + (rc.h || 1); ty++)
        for (let tx = rc.x; tx < rc.x + (rc.w || 1); tx++) if (inside(tx, ty)) g[idx(tx, ty)] = t.id;
    }
    /* fusion en bandes horizontales, par type de solide */
    for (let ty = 0; ty < ROOM_ROWS; ty++) {
      let run = 0,
        code = 0;
      for (let tx = 0; tx <= ROOM_COLS; tx++) {
        const c = tx < ROOM_COLS ? g[idx(tx, ty)] : 0;
        const solid = tx < ROOM_COLS && defOf(c).solid;
        if (solid && c === code) {
          run++;
          continue;
        }
        if (run) pushRect(room, tx - run, ty, run, 1, code);
        run = solid ? 1 : 0;
        code = solid ? c : 0;
      }
    }
    room.hasTerrain = true;
    if (!connected(room)) console.warn('[Terrain] ' + def.id + " : la porte n'est pas atteignable depuis l'entrée");
  }
  function pushRect(room, tx, ty, w, h, code) {
    const t = defOf(code);
    room.obstacles.push({
      x: tx,
      y: ty,
      w,
      h,
      kind: t.name,
      terrain: true,
      code,
      stopsShot: t.stopsShot !== false,
      blocksSight: t.blocksSight !== false,
      dashOver: !!t.dashOver,
      px: ROOM_X + tx * TILE,
      py: ROOM_Y + ty * TILE,
      pw: w * TILE,
      ph: h * TILE,
    });
  }
  /* parcours en largeur de l'entrée vers la porte : une salle coupée en deux est une run perdue */
  function connected(room) {
    const seen = new Uint8Array(ROOM_COLS * ROOM_ROWS);
    const q = [[1, Math.floor(ROOM_ROWS / 2)]];
    const start = q[0];
    if (!walkable(start[0], start[1], room)) return false;
    seen[idx(start[0], start[1])] = 1;
    const goal = [ROOM_COLS - 1, Math.floor(ROOM_ROWS / 2)];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === goal[0] && y === goal[1]) return true;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy;
        if (!inside(nx, ny) || seen[idx(nx, ny)] || !walkable(nx, ny, room)) continue;
        seen[idx(nx, ny)] = 1;
        q.push([nx, ny]);
      }
    }
    return false;
  }

  /* ---------- rendu ---------- */
  /* Les surfaces sont peintes une fois dans le cache du sol (gratuit). Seul le miroitement est redessiné par
     image, dans une passe légère : jamais de floorCache.clear() en boucle, ce serait 1280×720 soixante fois par seconde. */
  const SKIN = {
    water: { fill: '#2a5a7a', edge: '#7fd8ff', alpha: 0.85 },
    mud: { fill: '#4a3a26', edge: '#8a6a44', alpha: 0.9 },
    bridge: { fill: '#5a4630', edge: '#8b6a44', alpha: 0.95, planks: true },
    ledge: { fill: '#3a4058', edge: '#8a94ac', alpha: 1 },
    screen: { fill: '#2a2438', edge: '#9a8ac0', alpha: 0.75, lattice: true },
    wall: { fill: '#1a1e2e', edge: '#4a5470', alpha: 1 },
  };
  function skinOf(name) {
    const pal = (G.run && G.run.biome && G.run.biome.palette && G.run.biome.palette.terrain) || {};
    return Object.assign({}, SKIN[name], pal[name] || {});
  }
  function paint(g, room) {
    if (!room.grid) return;
    const grid = room.grid;
    for (let ty = 0; ty < ROOM_ROWS; ty++)
      for (let tx = 0; tx < ROOM_COLS; tx++) {
        const t = defOf(grid[idx(tx, ty)]);
        if (t.id === 0) continue;
        const s = skinOf(t.name);
        if (!s || !s.fill) continue;
        const x = ROOM_X + tx * TILE,
          y = ROOM_Y + ty * TILE;
        g.globalAlpha = s.alpha != null ? s.alpha : 1;
        g.fillStyle = s.fill;
        g.fillRect(x, y, TILE, TILE);
        /* liseré de rive : c'est lui qui rend la surface lisible d'un coup d'œil, pas le remplissage */
        g.globalAlpha = 1;
        g.fillStyle = s.edge;
        const same = (ax, ay) => inside(ax, ay) && grid[idx(ax, ay)] === grid[idx(tx, ty)];
        if (!same(tx, ty - 1)) g.fillRect(x, y, TILE, 3);
        if (!same(tx, ty + 1)) g.fillRect(x, y + TILE - 3, TILE, 3);
        if (!same(tx - 1, ty)) g.fillRect(x, y, 3, TILE);
        if (!same(tx + 1, ty)) g.fillRect(x + TILE - 3, y, 3, TILE);
        if (s.planks) {
          g.globalAlpha = 0.5;
          for (let k = 6; k < TILE; k += 12) g.fillRect(x + 2, y + k, TILE - 4, 2);
          g.globalAlpha = 1;
        }
        if (s.lattice) {
          g.globalAlpha = 0.45;
          for (let k = 6; k < TILE; k += 10) {
            g.fillRect(x + k, y, 2, TILE);
            g.fillRect(x, y + k, TILE, 2);
          }
          g.globalAlpha = 1;
        }
      }
    g.globalAlpha = 1;
  }
  /* passe animée : reflets sur l'eau, remous dans la boue. Rien d'autre ne bouge. */
  function render(ctx, room) {
    if (!room.grid) return;
    const grid = room.grid;
    const t = Time.now;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let ty = 0; ty < ROOM_ROWS; ty++)
      for (let tx = 0; tx < ROOM_COLS; tx++) {
        const d = defOf(grid[idx(tx, ty)]);
        if (d.name !== 'water') continue;
        const x = ROOM_X + tx * TILE,
          y = ROOM_Y + ty * TILE;
        const k = 0.5 + 0.5 * Math.sin(t * 1.6 + tx * 0.7 + ty * 0.4);
        ctx.globalAlpha = 0.05 + 0.07 * k;
        ctx.fillStyle = '#9fd8ff';
        ctx.fillRect(x + 4, y + 10 + Math.sin(t * 1.2 + tx) * 3, TILE - 8, 3);
        ctx.fillRect(x + 10, y + 30 + Math.sin(t * 1.5 + ty) * 3, TILE - 22, 2);
      }
    ctx.restore();
  }
  return { compile, connected, walkable, plain, nearestWalkable, codeAt, at, speedAt, screenAt, paint, render, tileOf, defOf };
})();
