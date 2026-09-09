/* Chaque salle des quatre biomes : spawns fixes et pièges sur des tuiles libres, entrée et porte praticables, salle connexe. */
const { test } = require('./lib');
test(async ({ page, ok, url }) => {
  await page.goto(url);
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const pb = [];
    for (const b of Content.biomes()) {
      for (const def of Content.roomsOf(b.id)) {
        const room = Room.create(def); // compile le terrain sans lancer la salle
        const walk = (tx, ty) => Terrain.walkable(tx, ty, room);
        for (const w of def.waves || [])
          for (const sp of w.spawns || []) {
            if (sp.x < 0 || sp.y < 0) continue; // -1,-1 = position libre, choisie à l'exécution
            if (!walk(sp.x, sp.y)) pb.push(`${def.id} : spawn ${sp.enemy} en (${sp.x},${sp.y}) sur une tuile bloquée`);
          }
        for (const t of def.traps || []) {
          const auMur = t.x === 0 || t.y === 0 || t.x === 23 || t.y === 12; // les tourelles sont montées au mur
          if (!auMur && !walk(t.x, t.y)) pb.push(`${def.id} : piège ${t.trap} en (${t.x},${t.y}) sur une tuile bloquée`);
        }
        if (room.grid && !Terrain.connected(room)) pb.push(`${def.id} : PORTE INATTEIGNABLE`);
        if (!walk(1, 6)) pb.push(`${def.id} : tuile d'entrée bloquée`);
        if (!walk(22, 6)) pb.push(`${def.id} : tuile devant la porte bloquée`);
      }
    }
    return { pb, salles: Content.biomes().reduce((s, b) => s + Content.roomsOf(b.id).length, 0) };
  });
  ok(
    `${r.salles} salles : spawns, pièges, entrée, porte et connexité`,
    r.pb.length === 0,
    r.pb.length ? '\n  ' + r.pb.join('\n  ') : 'aucun problème'
  );
});
