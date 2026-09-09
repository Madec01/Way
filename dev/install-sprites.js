'use strict';
/* Installe des sprites exportés depuis PixelLab dans assets/sprites/pixel/.
   Usage : node dev/install-sprites.js <dossier contenant les .zip>

   Chaque export PixelLab est un .zip qui contient le PNG et un metadata.json dont le champ `prompt` commence par le nom
   du fichier visé (« cactus.png<TAB>tall saguaro cactus… ») : c'est ce nom qui décide de la destination, pas celui du zip
   (PixelLab enlève les tirets, « wooden-crate » devient « woodencrate »).

   Les essais successifs du même accessoire prennent le premier emplacement libre : cactus.png, cactus_v2.png, cactus_v3.png…
   Rien n'est écrasé. index.json est reconstruit à la fin. */
const fs = require('fs'),
  path = require('path'),
  os = require('os'),
  { execFileSync } = require('child_process');
const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error('Usage : node dev/install-sprites.js <dossier contenant les .zip>');
  process.exit(1);
}
const dest = path.join(__dirname, '..', 'assets', 'sprites', 'pixel');
fs.mkdirSync(dest, { recursive: true });
const defs = fs.readFileSync(path.join(__dirname, '15_sprites.js'), 'utf8');
const block = defs.slice(defs.indexOf('const PROP_DEFS = {'), defs.indexOf('const props = {}'));
const known = new Set([...block.matchAll(/'?([a-zA-Z][a-zA-Z0-9-]*)'?\s*:\s*\{\s*d:\s*'/g)].map(m => m[1]));

const walk = d =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const nextSlot = name => {
  if (!fs.existsSync(path.join(dest, name + '.png'))) return name;
  for (let i = 2; i < 50; i++) {
    const n = `${name}_v${i}`;
    if (!fs.existsSync(path.join(dest, n + '.png'))) return n;
  }
  return null;
};

const zips = fs
  .readdirSync(src)
  .filter(f => f.toLowerCase().endsWith('.zip'))
  .sort();
if (!zips.length) {
  console.error('Aucun .zip dans ' + src);
  process.exit(1);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sprites-'));
let done = 0;
const skipped = [];
for (const z of zips) {
  const out = path.join(tmp, path.basename(z, '.zip'));
  fs.mkdirSync(out, { recursive: true });
  try {
    execFileSync('unzip', ['-q', '-o', path.join(src, z), '-d', out]);
  } catch (e) {
    skipped.push(z + ' (zip illisible)');
    continue;
  }
  const files = walk(out);
  const meta = files.find(f => path.basename(f) === 'metadata.json');
  const png = files.find(f => f.toLowerCase().endsWith('.png'));
  if (!png) {
    skipped.push(z + ' (aucun PNG)');
    continue;
  }
  let name = null;
  if (meta) {
    try {
      const j = JSON.parse(fs.readFileSync(meta, 'utf8'));
      const p = (j.objects && j.objects[0] && j.objects[0].prompt) || '';
      name = p.split(/[\s\t]/)[0].replace(/\.png$/i, '') || null;
    } catch (e) {
      /* metadata illisible : on retombe sur le nom du zip */
    }
  }
  if (!known.has(name)) {
    skipped.push(`${z} (accessoire « ${name} » inconnu — mettre le nom exact au début du prompt)`);
    continue;
  }
  const slot = nextSlot(name);
  if (!slot) {
    skipped.push(z + ' (plus de place)');
    continue;
  }
  fs.copyFileSync(png, path.join(dest, slot + '.png'));
  fs.chmodSync(path.join(dest, slot + '.png'), 0o644);
  console.log(`${z}\n   → ${slot}.png`);
  done++;
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${done} sprite(s) installé(s).`);
if (skipped.length) console.log('IGNORÉS :\n  ' + skipped.join('\n  '));
require('child_process').execFileSync('node', [path.join(__dirname, 'index-pixel.js')], { stdio: 'inherit' });
