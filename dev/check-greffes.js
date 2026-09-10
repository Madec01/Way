/* Vérifie qu'aucune greffe n'en domine strictement une autre de la même rareté : mêmes stats au moins aussi bonnes,
   mêmes effets au moins aussi probables, sans malus en plus, et pas identique. Deux greffes dans ce cas sont un
   doublon déguisé : le joueur n'a aucune raison de prendre la faible. Une rareté supérieure a le droit de dominer
   une rareté inférieure — c'est le palier. Les synergies d'arme ne sont comparées qu'entre elles (même famille).
     node dev/check-greffes.js   → liste les dominances, sort en erreur s'il y en a */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs
  .readFileSync(path.join(__dirname, 'content.js'), 'utf8')
  .replace(/^'use strict';/m, '')
  .replace(/^const CONTENT\s*=/m, 'globalThis.CONTENT =');
eval(src);
/* stats où « plus » est mieux ; les autres (fireRate < 1, trapDamageMul < 1…) se lisent à l'envers */
const LOWER_IS_BETTER = new Set(['trapDamageMul']);
const stat = u => {
  const o = {};
  for (const m of u.mods || []) o[m.stat] = m.mul != null ? m.mul : 1 + m.add;
  return o;
};
const better = (k, a, b) => (LOWER_IS_BETTER.has(k) ? a <= b : a >= b);
const isMalus = (k, v) => (LOWER_IS_BETTER.has(k) ? v > 1 : v < 1);
const fx = u => {
  const o = {};
  for (const k in u.hooks || {}) for (const h of u.hooks[k]) o[k + ':' + h.effect] = h.chance != null ? h.chance : 1;
  return o;
};
function dominates(a, b) {
  const sa = stat(a),
    sb = stat(b),
    fa = fx(a),
    fb = fx(b);
  for (const k in sb) if (!(k in sa) || !better(k, sa[k], sb[k])) return false;
  for (const k in sa) if (!(k in sb) && isMalus(k, sa[k])) return false; // un malus en plus : ce n'est pas une domination
  for (const k in fb) if (!(k in fa) || fa[k] < fb[k]) return false;
  const same = JSON.stringify([sa, fa]) === JSON.stringify([sb, fb]);
  return !same && Object.keys(sa).length + Object.keys(fa).length > 0;
}
const U = CONTENT.upgrades;
const found = [];
for (const a of U)
  for (const b of U) {
    if (a === b || a.rarity !== b.rarity || (a.weaponFamily || null) !== (b.weaponFamily || null)) continue;
    if (dominates(a, b)) found.push(`${a.id} domine ${b.id}`);
  }
const parRarete = ['common', 'rare', 'epic', 'colossal'].map(r => `${r} ${U.filter(u => u.rarity === r).length}`).join(', ');
console.log(`${U.length} greffes (${parRarete}) — ${found.length} dominance(s) dans la même rareté`);
for (const f of found) console.log('  ' + f);
if (require.main === module) process.exit(found.length ? 1 : 0);
module.exports = { dominates, found, count: U.length };
