/* Chantier 12, séance B — un sol et des murs par palier. Ce test mesure : les quatre planches libres se chargent ;
   chaque palier a son tileset (planche, dalles, murs) et le sol de deux paliers n'a pas la même couleur moyenne ;
   le mur du haut porte deux à quatre motifs et, là où le palier en a une, une fontaine animée dessinée par-dessus le
   sol mis en cache ; la même salle est toujours habillée pareil ; sans planche de palier, les dalles 0x72 reprennent ;
   et la salle ne coûte pas plus de flous par image qu'avant. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, salle, sansPause, erreurs }) => {
  await entrer('test');
  await sansPause();
  const planches = await p.evaluate(() => Object.keys(Sprites.SHEETS).map(k => [k, Sprites.sheetReady(k)]));
  ok(
    'les quatre planches libres (Kenney, Ninja Adventure) sont chargées',
    planches.length === 4 && planches.every(x => x[1]),
    JSON.stringify(planches)
  );

  const sols = {};
  for (const b of ['biome_1', 'biome_2', 'biome_3', 'biome_4']) {
    await salle(2, b);
    await p.waitForTimeout(500);
    sols[b] = await p.evaluate(async () => {
      const ts = Sprites.tilesetOf();
      /* la couleur moyenne du sol : on redessine le sol seul sur un canvas à part */
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const g = c.getContext('2d');
      Sprites.drawFloor(g, G.room);
      const d = g.getImageData(ROOM_X + 60, ROOM_Y + 60, ROOM_W - 120, ROOM_H - 120).data;
      let r = 0,
        v = 0,
        bl = 0,
        n = 0;
      for (let i = 0; i < d.length; i += 64) {
        r += d[i];
        v += d[i + 1];
        bl += d[i + 2];
        n++;
      }
      const moy = [r / n, v / n, bl / n].map(Math.round);
      const mur = g.getImageData(ROOM_X + ROOM_W / 2, ROOM_Y - TILE / 2, 1, 1).data;
      /* deux rendus de la même salle : identiques */
      const c2 = document.createElement('canvas');
      c2.width = W;
      c2.height = H;
      const g2 = c2.getContext('2d');
      Sprites.drawFloor(g2, G.room);
      const meme = g.getImageData(ROOM_X, ROOM_Y, 200, 200).data.join() === g2.getImageData(ROOM_X, ROOM_Y, 200, 200).data.join();
      /* la fontaine : un pixel du mur qui change entre deux images de l'animation */
      let fontaine = null;
      if (G.room.fountainX != null) {
        const lire = () => {
          const k = document.createElement('canvas');
          k.width = W;
          k.height = H;
          const kg = k.getContext('2d');
          Sprites.drawFloor(kg, G.room);
          Sprites.drawWallFx(kg, G.room);
          return kg.getImageData(G.room.fountainX, ROOM_Y - TILE, TILE, TILE).data.join();
        };
        const t0 = Time.now;
        Time.now = 0;
        const a = lire();
        Time.now = 0.3;
        const b = lire();
        Time.now = t0;
        fontaine = a !== b;
      }
      return {
        planche: ts && ts.floor[0][2],
        dalles: ts && ts.floor.length,
        moy,
        mur: [...mur].slice(0, 3),
        deco: G.room.wallDeco.length,
        fontaine,
        meme,
      };
    });
  }
  const b = sols;
  ok(
    'chaque palier a son tileset : hôpital et Concession sur Kenney, Serre et Sérail sur Ninja Adventure, six dalles chacun',
    b.biome_1.planche === 'kd' &&
      b.biome_3.planche === 'kd' &&
      b.biome_2.planche === 'na_floor' &&
      b.biome_4.planche === 'na_interior' &&
      Object.values(b).every(x => x.dalles === 6),
    JSON.stringify(Object.fromEntries(Object.entries(b).map(([k, x]) => [k, x.planche])))
  );
  const dist = (a, c) => Math.abs(a[0] - c[0]) + Math.abs(a[1] - c[1]) + Math.abs(a[2] - c[2]);
  const ids = Object.keys(b);
  let minSol = 999,
    minMur = 999;
  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 4; j++) {
      minSol = Math.min(minSol, dist(b[ids[i]].moy, b[ids[j]].moy));
      minMur = Math.min(minMur, dist(b[ids[i]].mur, b[ids[j]].mur));
    }
  ok(
    'deux paliers n’ont jamais le même sol ni le même mur (écart de couleur ≥ 24)',
    minSol >= 24 && minMur >= 24,
    `sol ${minSol} · mur ${minMur} · ${JSON.stringify(Object.values(b).map(x => x.moy))}`
  );
  ok(
    'le mur du haut porte deux à quatre motifs dans chaque palier',
    Object.values(b).every(x => x.deco >= 2 && x.deco <= 4),
    JSON.stringify(Object.values(b).map(x => x.deco))
  );
  ok(
    'la fontaine murale s’anime à l’hôpital, dans la serre et au Sérail ; la Concession n’en a pas',
    b.biome_1.fontaine === true && b.biome_2.fontaine === true && b.biome_4.fontaine === true && b.biome_3.fontaine === null,
    JSON.stringify(Object.values(b).map(x => x.fontaine))
  );
  ok(
    'la même salle est toujours habillée pareil',
    Object.values(b).every(x => x.meme)
  );

  /* sans planche de palier : les dalles 0x72 reprennent, sans erreur */
  const repli = await p.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d');
    const sauve = G.run.biome.id;
    G.run.biome = Object.assign({}, G.run.biome, { id: 'biome_inconnu' });
    const room = Object.assign({}, G.room, { floorSeed: 12345, def: { id: 'x' } });
    Sprites.drawFloor(g, room);
    G.run.biome = Object.assign({}, G.run.biome, { id: sauve });
    const d = g.getImageData(ROOM_X + 100, ROOM_Y + 100, 1, 1).data;
    return { dessine: d[3] === 255, deco: room.wallDeco.length, fontaine: room.fountainX };
  });
  ok(
    'sans tileset pour le palier, le sol 0x72 reprend, sans motif ni fontaine',
    repli.dessine && repli.deco === 0 && repli.fontaine === null,
    JSON.stringify(repli)
  );

  const flous = await p.evaluate(async () => {
    let m = 0;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => requestAnimationFrame(r));
      m = Math.max(m, Perf.blurs);
    }
    return m;
  });
  ok('le nouveau sol ne coûte aucun flou par image', flous <= 7, flous + ' flous');
  ok('aucune erreur JS', erreurs.length === 0, erreurs.join(' | '));
});
