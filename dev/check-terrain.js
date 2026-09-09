/* Vérifie hors ligne tous les plans de terrain déclarés dans dev/content*.js.
   Usage : node dev/check-terrain.js   (code de sortie 1 si un plan est fautif)

   Contrôles : nombre de lignes, largeur des lignes, caractères inconnus, tuile d'entrée praticable,
   porte atteignable depuis l'entrée (parcours en largeur). Une salle coupée en deux est une run perdue :
   ça doit casser le build, pas se découvrir en jouant. */
'use strict';
const fs = require('fs'),
  path = require('path');
const COLS = 24,
  ROWS = 13;
const src = fs.readFileSync(path.join(__dirname, '35_terrain.js'), 'utf8');
const block = src.slice(src.indexOf('const TERRAIN = {'), src.indexOf('const TERRAIN_BY_ID'));
const SOLID = {};
for (const m of block.matchAll(/'(.)':\s*\{([^}]*)\}/g)) SOLID[m[1]] = /solid:\s*true/.test(m[2]);
const CHARS = new Set(Object.keys(SOLID));

let errors = 0,
  plans = 0;
for (const f of ['content.js', 'content2.js', 'content3.js', 'content4.js']) {
  const txt = fs.readFileSync(path.join(__dirname, f), 'utf8');
  for (const m of txt.matchAll(/terrain:\s*\[([\s\S]*?)\]/g)) {
    /* l'identifiant est le dernier `id:` rencontré avant le plan — chercher en avant attraperait l'ennemi d'à côté */
    const before = txt.slice(0, m.index);
    const ids = [...before.matchAll(/id:\s*'([^']+)'/g)];
    const id = ids.length ? ids[ids.length - 1][1] : '(salle inconnue)';
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
    const solid = (x, y) => x < 0 || y < 0 || x >= COLS || y >= ROWS || SOLID[(lines[y] || '')[x]];
    const sy = Math.floor(ROWS / 2);
    if (solid(1, sy)) {
      fail("la tuile d'entrée (1," + sy + ') est bloquée');
      continue;
    }
    const seen = new Set([`1,${sy}`]);
    const q = [[1, sy]];
    let ok = false;
    while (q.length) {
      const [x, y] = q.shift();
      if (x === COLS - 1 && y === sy) {
        ok = true;
        break;
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          k = `${nx},${ny}`;
        if (solid(nx, ny) || seen.has(k)) continue;
        seen.add(k);
        q.push([nx, ny]);
      }
    }
    if (!ok) fail(`la porte (${COLS - 1},${sy}) n'est pas atteignable depuis l'entrée`);
    else console.log(`  ✓ ${id} — ${seen.size} tuiles atteignables sur ${COLS * ROWS}`);
  }
}
console.log(`\n${plans} plan(s) de terrain, ${errors} erreur(s).`);
process.exit(errors ? 1 : 0);
