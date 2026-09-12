/* Finitions 13 — le budget d'écran (rapport de l'agent « surcharge visuelle », dev/agents/ecran.md). Ce test mesure
   dans une salle chargée après huit secondes de combat : pas plus de 250 particules ni de 8 chiffres flottants à la
   fois, pas plus de 2 toasts, le décor au sol plus petit qu'un ennemi (0,7 tuile, 1,05 en grand) et à 60 %, les balles
   ennemies cerclées de corail, les tirs du joueur à halo court, l'orbe d'XP à halo court, le point du tempo qui
   s'éteint entre deux temps, aucun toast pour un compagnon sonné, le bandeau de vague hors du rouge, les chiffres de
   dégâts à 14 px et une demi-seconde. */
const { test } = require('./lib');
const fs = require('fs');
const path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();
  const mesures = [];
  for (const [b, n] of [
    ['biome_2', 6],
    ['biome_3', 8],
  ]) {
    await salle(n, b);
    await p.evaluate(() => {
      G.player.bot = null;
      Input.mouse.x = W / 2 + 200;
      Input.mouse.y = H / 2;
      Input.mouse.down = true;
    });
    let pic = { particules: 0, chiffres: 0, toasts: 0, ennemis: 0 };
    for (let i = 0; i < 16; i++) {
      await p.waitForTimeout(500);
      const m = await p.evaluate(() => ({
        particules: Particles.list.length,
        chiffres: Floaters.list ? Floaters.list.length : 0,
        toasts: (() => {
          const ms = typeof UI.messages === 'function' ? UI.messages() : null;
          return Array.isArray(ms) ? ms.length : ms && Array.isArray(ms.toasts) ? ms.toasts.length : 0;
        })(),
        ennemis: G.enemies.filter(e => !e.dead).length,
      }));
      for (const k in pic) pic[k] = Math.max(pic[k], m[k]);
    }
    await p.evaluate(() => (Input.mouse.down = false));
    mesures.push({ salle: b + '_' + n, ...pic });
  }
  ok(
    'en combat, jamais plus de 250 particules, 8 chiffres flottants ni 2 toasts à la fois',
    mesures.every(m => m.particules <= 250 && m.chiffres <= 8 && m.toasts <= 2),
    JSON.stringify(mesures)
  );
  const sp = src('15_sprites.js'),
    en = src('30_entities.js'),
    em = src('32_enemies.js'),
    rm = src('40_room.js'),
    pe = src('31_pets.js'),
    tp = src('39_tempo.js');
  ok('le décor au sol fait 0,7 tuile (1,05 en grand), plus petit qu’un ennemi', /TILE \* \(d\.big \? 1\.05 : 0\.7\)/.test(sp));
  ok('une balle ennemie est cerclée de noir puis de corail', /strokeStyle = PAL\.danger;\s*ctx\.lineWidth = 1\.5;/.test(en));
  ok('les tirs du joueur ont un halo court (6), les balles ennemies un long (12)', /p\.owner === 'player' \? 6 : 12/.test(en));
  ok('l’orbe d’XP a un halo court', /'#7ef0ff', 4\)/.test(en));
  ok('le point du tempo au-dessus d’un ennemi s’éteint entre deux temps', /globalAlpha = alpha \* k;/.test(em));
  ok('le bandeau « Vague n » n’est plus rouge', /STR\.wave \+ ' ' \+ \(\+\+r\.waveIdx \+ 1\), color: '#e8ecf7'/.test(rm));
  ok('aucun toast quand un compagnon est sonné ou revient (le badge le dit)', !/est sonné'\)|est de retour'\)/.test(pe));
  ok('les chiffres de dégâts : 14 px, une demi-seconde', /dmg: \{ size: 14,[^}]*life: 0\.5 \}/.test(en));
  ok(
    'la salle du tempo : égaliseur et voile deux fois plus discrets',
    /0\.08 \+ 0\.17 \* sp\[i\]/.test(tp) && /\$\{0\.08 \* kd\}/.test(tp)
  );
});
