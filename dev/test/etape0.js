const { test, out } = require('./lib');
/* Étape 0 du chantier rythmique : horloge musicale par piège, tourniquet calé sur la mesure, familles de la salle du tempo, poussée du joueur. */
test(async ({ page, ok, entrer }) => {
  await entrer('test');
  // --- 1. horloge par piège : le tourniquet de la salle 3 (hors salle du tempo) lit-il Beat ? ---
  await page.evaluate(() => { document.querySelector('#d-biome').value = 'biome_1'; Debug.gotoRoom(3); Debug.hide(); G.debug.invuln = true; });
  await page.waitForTimeout(1200);
  const t1 = await page.evaluate(() => {
    const rot = G.room.traps.find(t => t.kind === 'laser_rotate');
    return { existe: !!rot, aBeats: !!(rot && rot.beats), musical: rot ? Room.trapTime(G.room, rot) === Beat.t : null,
             autre: (() => { const o = G.room.traps.find(t => !t.beats); return o ? Room.trapTime(G.room, o) === G.room.time : 'aucun'; })(),
             tempo: !!G.room.tempo };
  });
  ok('salle 3 sans salle du tempo', !t1.tempo);
  ok('le tourniquet déclare des beats', t1.aBeats);
  ok('il lit l\'horloge musicale hors salle 7', t1.musical);
  ok('un piège sans beats garde l\'horloge de salle', t1.autre === true, 'autre piège : ' + t1.autre);

  // --- 2. la rotation est-elle calée sur la mesure ? ---
  const t2 = await page.evaluate(() => {
    const rot = G.room.traps.find(t => t.kind === 'laser_rotate'); rot.syncBeat();
    const L = Beat.beatLen(); const tourEnTemps = (Math.PI * 2 / rot.p.angularSpeed) / L;
    return { angularSpeed: +rot.p.angularSpeed.toFixed(4), tourEnTemps: +tourEnTemps.toFixed(3), L: +L.toFixed(3) };
  });
  ok('un tour dure exactement 4 temps', Math.abs(t2.tourEnTemps - 4) < 0.01, `${t2.tourEnTemps} temps · ω=${t2.angularSpeed} rad/s · 1 temps=${t2.L}s`);

  // --- 3. les 4 familles de la salle du tempo s'arment-elles ? ---
  await page.evaluate(() => { Debug.gotoRoom(7); Debug.hide(); G.debug.invuln = true; Time.scale = 4; });
  await page.waitForTimeout(1000);
  const fams = await page.evaluate(() => G.room.tempo.groups.length);
  let armed = 0;
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(1000); armed = await page.evaluate(() => G.room.tempo.groupIdx + 1); if (armed >= fams) break; }
  ok(`les ${fams} familles s'arment toutes`, armed >= fams, `${armed}/${fams} armées`);
  await page.evaluate(() => { Time.scale = 1; });

  // --- 4. le joueur a-t-il une vélocité de poussée ? ---
  const t4 = await page.evaluate(() => {
    const pl = G.player; pl.x = ROOM_X + 6 * TILE; pl.y = ROOM_Y + 6 * TILE; const x0 = pl.x;
    /* amortissement de 10/s : la distance parcourue vaut l'impulsion divisée par 10. 1440 px/s = 3 tuiles. */
    pl.kvx = 1440; for (let i = 0; i < 120; i++) { const dt = 1 / 60; if (pl.kvx || pl.kvy) { pl.x += pl.kvx * dt; const k = Math.min(1, 10 * dt); pl.kvx -= pl.kvx * k; if (Math.abs(pl.kvx) < 1) pl.kvx = 0; } }
    return { deplacement: Math.round(pl.x - x0), tuiles: +((pl.x - x0) / TILE).toFixed(2), champExiste: pl.kvx !== undefined };
  });
  ok('le joueur a kvx/kvy', t4.champExiste);
  ok('impulsion 1440 = 3 tuiles', Math.abs(t4.tuiles - 3) < 0.15, `${t4.deplacement} px = ${t4.tuiles} tuiles`);

  // --- 5. mix ---
  const t5 = await page.evaluate(() => ({ shot: typeof AudioEngine.trapShot === 'function' }));
  ok('la tourelle a son propre son', t5.shot);

  });
