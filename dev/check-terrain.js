/* Vérifie hors ligne tous les plans de terrain déclarés dans dev/content*.js.
   Usage : node dev/check-terrain.js   (code de sortie 1 si un plan est fautif)

   Contrôles : nombre de lignes, largeur des lignes, caractères inconnus, tuile d'entrée praticable,
   porte atteignable depuis l'entrée (parcours en largeur, les obstacles déclarés de la salle comptés comme solides),
   et un couloir de deux tuiles de large d'un bout à l'autre, murets franchissables en ruée mis à part (le joueur et le
   bot ne se coincent pas dans une fente).
   Une salle coupée en deux est une run perdue : ça doit casser le build, pas se découvrir en jouant. */
'use strict';
const fs = require('fs'),
  path = require('path');
const COLS = 24,
  ROWS = 13;
const src = fs.readFileSync(path.join(__dirname, '35_terrain.js'), 'utf8');
const block = src.slice(src.indexOf('const TERRAIN = {'), src.indexOf('const TERRAIN_BY_ID'));
const SOLID = {},
  DASH = {};
/* une clé qui est un identifiant valide (le muret `n`) s'écrit sans guillemets */
for (const m of block.matchAll(/(?:'(.)'|(\w)):\s*\{([^}]*)\}/g)) {
  SOLID[m[1] || m[2]] = /solid:\s*true/.test(m[3]);
  DASH[m[1] || m[2]] = /dashOver:\s*true/.test(m[3]);
}
const CHARS = new Set(Object.keys(SOLID));

let errors = 0,
  plans = 0;
/* le bloc d'une salle : de son `id: 'room_…'` au suivant */
const roomBlocks = txt => {
  const out = [];
  const ms = [...txt.matchAll(/id:\s*'(room_[^']+)'/g)];
  ms.forEach((m, i) => out.push({ id: m[1], text: txt.slice(m.index, i + 1 < ms.length ? ms[i + 1].index : txt.length) }));
  return out;
};
/* les rectangles `obstacles: [ {x, y, w, h}, … ]` d'un bloc de salle */
const obstaclesOf = block => {
  const m = block.match(/obstacles:\s*\[([\s\S]*?)\n\s*\]/);
  if (!m) return [];
  return [...m[1].matchAll(/\{[^}]*\}/g)]
    .map(o => {
      const g = k => {
        const r = o[0].match(new RegExp('\\b' + k + ':\\s*(-?\\d+)'));
        return r ? +r[1] : null;
      };
      return { x: g('x'), y: g('y'), w: g('w') || 1, h: g('h') || 1 };
    })
    .filter(o => o.x != null && o.y != null);
};
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
/* parcours en largeur ; `free(x, y)` dit si l'on peut se tenir en (x, y) — pour le couloir large on y passe
   « la fenêtre 2×2 dont (x, y) est le coin haut-gauche est libre » */
const reach = (free, sx, sy, isGoal) => {
  const seen = new Set([`${sx},${sy}`]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    if (isGoal(x, y)) return seen.size;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx,
        ny = y + dy,
        k = `${nx},${ny}`;
      if (!free(nx, ny) || seen.has(k)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return 0;
};
for (const f of ['content.js', 'content2.js', 'content3.js', 'content4.js']) {
  const txt = fs.readFileSync(path.join(__dirname, f), 'utf8');
  for (const room of roomBlocks(txt)) {
    const m = room.text.match(/terrain:\s*\[([\s\S]*?)\]/);
    if (!m) continue;
    const id = room.id;
    const lines = [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1]);
    plans++;
    const fail = msg => {
      console.log(`  ✗ ${id} : ${msg}`);
      errors++;
    };
    if (lines.length !== ROWS) fail(`${lines.length} lignes au lieu de ${ROWS}`);
    lines.forEach((l, i) => {
      if (l.length !== COLS) fail(`ligne ${i} : ${l.length} caractères au lieu de ${COLS}`);
      for (const ch of l) if (!CHARS.has(ch)) fail(`ligne ${i} : caractère inconnu « ${ch} »`);
    });
    if (lines.length !== ROWS) continue;
    const obs = obstaclesOf(room.text);
    const blocked = (x, y) =>
      x < 0 ||
      y < 0 ||
      x >= COLS ||
      y >= ROWS ||
      SOLID[(lines[y] || '')[x]] ||
      obs.some(o => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h);
    const sy = Math.floor(ROWS / 2);
    if (blocked(1, sy)) {
      fail("la tuile d'entrée (1," + sy + ') est bloquée');
      continue;
    }
    const n1 = reach(
      (x, y) => !blocked(x, y),
      1,
      sy,
      (x, y) => x === COLS - 1 && y === sy
    );
    if (!n1) {
      fail(`la porte (${COLS - 1},${sy}) n'est pas atteignable depuis l'entrée (terrain + obstacles)`);
      continue;
    }
    /* couloir large : une fenêtre 2×2 libre part de l'entrée (lignes 5-6 ou 6-7) et arrive devant la porte.
       Les murets franchissables en ruée (`n`) ne comptent pas : leurs brèches d'une tuile sont voulues, et le joueur
       les saute — seuls les vrais murs et les obstacles ne doivent pas pincer le passage. */
    const hard = (x, y) => blocked(x, y) && !DASH[(lines[y] || '')[x]];
    const win = (x, y) => !hard(x, y) && !hard(x + 1, y) && !hard(x, y + 1) && !hard(x + 1, y + 1);
    const goal = (x, y) => x === COLS - 2 && (y === sy - 1 || y === sy);
    const n2 = Math.max(...[sy - 1, sy].map(y0 => (win(1, y0) ? reach(win, 1, y0, goal) : 0)));
    if (!n2) fail("pas de couloir de deux tuiles de large entre l'entrée et la porte");
    else console.log(`  ✓ ${id} — ${n1} tuiles atteignables sur ${COLS * ROWS}, couloir large : ${n2} positions`);
  }
}
console.log(`\n${plans} plan(s) de terrain, ${errors} erreur(s).`);
process.exit(errors ? 1 : 0);
