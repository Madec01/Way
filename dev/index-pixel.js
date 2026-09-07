/* Reconstruit assets/sprites/pixel/index.json à partir des PNG présents dans le dossier.
   À relancer après chaque dépôt de sprites : node dev/index-pixel.js
   Nommage : <accessoire>.png pour la première version, <accessoire>_v2.png, _v3.png… pour les essais suivants.
   Le nom doit être celui d'un accessoire connu (clés de PROP_DEFS dans dev/15_sprites.js) ; les autres sont signalés. */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'assets', 'sprites', 'pixel');
if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }
const src = fs.readFileSync(path.join(__dirname, '15_sprites.js'), 'utf8');
const block = src.slice(src.indexOf('const PROP_DEFS = {'), src.indexOf('const props = {}'));
const known = new Set([...block.matchAll(/'?([a-zA-Z][a-zA-Z0-9-]*)'?\s*:\s*\{\s*d:\s*'/g)].map(m => m[1]));
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.png')).map(f => f.replace(/\.png$/i, '')).sort();
const ok = [], bad = [];
for (const f of files) { const base = f.replace(/_v\d+$/, ''); (known.has(base) ? ok : bad).push(f); }
fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(ok, null, 0) + '\n');
const byBase = {};
for (const f of ok) { const b = f.replace(/_v\d+$/, ''); (byBase[b] = byBase[b] || []).push(f); }
console.log(`index.json : ${ok.length} fichier(s), ${Object.keys(byBase).length} accessoire(s)`);
for (const b of Object.keys(byBase).sort()) if (byBase[b].length > 1) console.log(`  ${b} : ${byBase[b].length} variantes`);
if (bad.length) console.log('IGNORÉS (nom inconnu, vérifier l\'orthographe) :', bad.join(', '));
