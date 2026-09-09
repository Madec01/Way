/* Lance toute la batterie, un test après l'autre, et sort en erreur si un seul échoue.
   node dev/test/run.js            → tout
   node dev/test/run.js duo uno    → seulement ceux-là
   Chaque test est un processus séparé : un test qui plante n'emporte pas les autres. */
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs'),
  path = require('path');

const ici = __dirname;
const tous = fs
  .readdirSync(ici)
  .filter(f => f.endsWith('.js') && !['lib.js', 'run.js'].includes(f))
  .sort();
const choisis = process.argv.slice(2);
const liste = choisis.length ? choisis.map(n => (n.endsWith('.js') ? n : n + '.js')) : tous;

const debut = Date.now();
const bilan = [];
for (const f of liste) {
  if (!fs.existsSync(path.join(ici, f))) {
    console.log(`?  ${f} : introuvable`);
    bilan.push([f, 'introuvable']);
    continue;
  }
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(ici, f)], { encoding: 'utf8', timeout: 15 * 60 * 1000 });
  const sortie = (r.stdout || '') + (r.stderr || '');
  const derniere =
    sortie
      .trim()
      .split('\n')
      .filter(l => / : \d+\/\d+ OK/.test(l))
      .pop() || '';
  const etat = r.status === 0 ? 'OK' : r.status === 2 ? 'PLANTÉ' : r.status === null ? 'TEMPS DÉPASSÉ' : 'ÉCHEC';
  console.log(
    `${etat === 'OK' ? '✓' : '✗'}  ${f.padEnd(16)} ${etat.padEnd(14)} ${((Date.now() - t0) / 1000).toFixed(0).padStart(4)} s   ${derniere}`
  );
  if (etat !== 'OK')
    console.log(
      sortie
        .split('\n')
        .filter(l => /ÉCHEC|ERREUR|PLANTÉ|Error/.test(l))
        .map(l => '      ' + l)
        .join('\n')
    );
  bilan.push([f, etat]);
}
const rates = bilan.filter(([, e]) => e !== 'OK');
console.log(
  `\n${bilan.length - rates.length}/${bilan.length} tests OK en ${((Date.now() - debut) / 60000).toFixed(1)} min${rates.length ? ' — ratés : ' + rates.map(([f]) => f).join(', ') : ''}`
);
process.exit(rates.length ? 1 : 0);
