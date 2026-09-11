/* Assemble dev/*.js + style.css + shell.html → ../index.html (un seul fichier, aucune dépendance). */
'use strict';
const fs = require('fs'),
  path = require('path');
const dev = __dirname,
  out = path.join(dev, '..', 'index.html');
const ORDER = [
  '00_core.js',
  '05_balance.js',
  'AudioEngine.js',
  'content.js',
  'content2.js',
  'content3.js',
  'content4.js',
  'content5.js',
  '10_content_api.js',
  '15_sprites.js',
  '20_progression.js',
  '30_entities.js',
  '31_pets.js',
  '32_enemies.js',
  '33_anim.js',
  '34_traps.js',
  '35_terrain.js',
  '36_modular.js',
  '38_challenges.js',
  '39_tempo.js',
  '40_room.js',
  '50_ui.js',
  '55_touch.js',
  '57_attract.js',
  '60_meta.js',
  '70_debug.js',
  '78_amis.js',
  '80_atelier.js',
  '90_main.js',
];
let html = fs.readFileSync(path.join(dev, 'shell.html'), 'utf8');
html = html.replace('/*@@STYLE@@*/', fs.readFileSync(path.join(dev, 'style.css'), 'utf8'));
/* Contrat entre les blocs <script> : chaque fichier dépose des noms de premier niveau (const, let, function, class)
   que les suivants utilisent. Deux fichiers qui déclarent le même nom, c'est une redéclaration silencieuse ou une
   erreur au chargement : le build refuse. Les fichiers de contenu poussent dans CONTENT, ils ne déclarent rien. */
const declares = {};
for (const f of ORDER) {
  const src = fs.readFileSync(path.join(dev, f), 'utf8');
  for (const m of src.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    const nom = m[1];
    if (declares[nom] && declares[nom] !== f) {
      console.error(`build : « ${nom} » est déclaré au premier niveau dans ${declares[nom]} et dans ${f}`);
      process.exit(1);
    }
    declares[nom] = f;
  }
}
const stamp = `<script>window.WAY_BUILD = '${new Date().toISOString().slice(0, 16).replace('T', ' ')}';</script>\n`;
const scripts =
  stamp +
  ORDER.map(
    f => `<script>\n/* ==== ${f} ==== */\n${fs.readFileSync(path.join(dev, f), 'utf8').replace(/<\/script/gi, '<\\/script')}\n</script>`
  ).join('\n');
html = html.replace('<!--@@SCRIPTS@@-->', scripts);
fs.writeFileSync(out, html);
console.log(
  'index.html :',
  (fs.statSync(out).size / 1024).toFixed(0),
  'Ko ·',
  Object.keys(declares).length,
  'noms de premier niveau, aucun doublon'
);
