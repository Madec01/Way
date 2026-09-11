/* Chantier 9, première séance — quatre biomes, quatre structures. Ce test mesure : chaque biome a son propre ordre de
   types de salles, sans salle-coffre (4 et 8 sont des combats) ; une salle unique par biome (sous-sol, pont, train,
   bazar), présente une seule fois ; deux coffres offerts par biome (fin de 3 et 7, ou le bazar) ; le coffre apparaît à
   la salle sécurisée, caché loin de la porte au bazar ; le sous-sol impose « lumières coupées » ; le défi suit le type
   et non le numéro ; les wagons du train traversent la salle sans revenir ; les salles modulaires diffèrent d'un biome
   à l'autre ; le boss de la salle 9 ne rejoue pas les phases de la salle 5, dans les quatre biomes. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();

  const st = await p.evaluate(() => {
    const out = {};
    for (const b of Content.biomes()) {
      const rooms = Content.roomsOf(b.id);
      out[b.id] = {
        types: rooms.map(r => r.type),
        idx: rooms.map(r => r.index),
        combats48: rooms.filter(r => r.index === 4 || r.index === 8).every(r => (r.waves || []).length > 0),
        chests: rooms.filter(r => r.chest).map(r => r.index),
        modulaires: rooms
          .filter(r => r.type === 'COMBAT_MODULAR')
          .map(r =>
            r.modular
              .map(m => m.kind + (m.dx != null ? (m.dx ? 'h' : 'v') : '') + (m.arms || ''))
              .sort()
              .join('+')
          )
          .join(' / '),
      };
    }
    return out;
  });
  const ids = Object.keys(st);
  const seqs = ids.map(id => st[id].types.join('>'));
  ok(
    'quatre biomes, quatre ordres de salles différents, neuf salles numérotées 1 à 9 chacun',
    ids.length === 4 && new Set(seqs).size === 4 && ids.every(id => st[id].idx.join() === '1,2,3,4,5,6,7,8,9'),
    ids.map(id => id + ' : ' + st[id].types.map(t => t.replace('COMBAT_', '')).join(' ')).join('\n      ')
  );
  ok(
    'plus de salle-coffre : les salles 4 et 8 sont des combats partout',
    ids.every(id => st[id].combats48 && !st[id].types.some(t => t === 'CHEST' || t === 'CHEST_FINAL'))
  );
  const uniques = { biome_1: [4, 'SOUS_SOL'], biome_2: [8, 'PONT'], biome_3: [2, 'TRAIN'], biome_4: [6, 'BAZAR'] };
  const tous = ids.flatMap(id => st[id].types);
  ok(
    'une salle unique par biome : le sous-sol (1, salle 4), le pont (2, salle 8), le train (3, salle 2), le bazar (4, salle 6), chacune une seule fois',
    ids.every(id => st[id].types[uniques[id][0] - 1] === uniques[id][1] && tous.filter(t => t === uniques[id][1]).length === 1)
  );
  ok(
    'deux coffres offerts par biome, en fin de salle 3 et 7 — au Sérail, le second est celui du bazar',
    st.biome_1.chests.join() === '3,7' &&
      st.biome_2.chests.join() === '3,7' &&
      st.biome_3.chests.join() === '3,7' &&
      st.biome_4.chests.join() === '3,6',
    ids.map(id => st[id].chests.join('+')).join(' · ')
  );
  ok(
    'les salles modulaires ne partagent pas leurs éléments d’un biome à l’autre',
    new Set(ids.map(id => st[id].modulaires)).size === 4,
    ids.map(id => st[id].modulaires).join(' | ')
  );

  /* --- le sous-sol : dans le noir, toujours --- */
  await salle(4, 'biome_1');
  const sousSol = await p.evaluate(() => ({ type: G.room.type, defi: G.room.challenge && G.room.challenge.id, label: G.room.label }));
  ok(
    'le sous-sol du biome 1 impose « lumières coupées »',
    sousSol.type === 'SOUS_SOL' && sousSol.defi === 'lights' && /sous-sol/.test(sousSol.label),
    JSON.stringify(sousSol)
  );

  /* --- le défi suit le type : la salle aléatoire de la Serre est en 3 --- */
  await salle(3, 'biome_2');
  const defi3 = await p.evaluate(() => ({ type: G.room.type, defi: !!G.room.challenge }));
  ok(
    'en salle 3 de la Serre (salle aléatoire), il y a un défi : le tirage suit le type, plus le numéro',
    defi3.type === 'COMBAT_CHALLENGE' && defi3.defi,
    JSON.stringify(defi3)
  );

  /* --- le train : les wagons traversent et repartent du début --- */
  await salle(2, 'biome_3');
  const train = await p.evaluate(async () => {
    const w = G.room.modular.find(m => m.kind === 'slide_wall' && m.loop);
    const xs = [];
    for (let i = 0; i < 70; i++) {
      await new Promise(r => setTimeout(r, 100));
      xs.push(w.obs[0].x);
    }
    let avance = 0,
      retours = 0;
    for (let i = 1; i < xs.length; i++) {
      if (xs[i] > xs[i - 1] + 0.05) avance++;
      if (xs[i] < xs[i - 1] - 8) retours++;
    }
    return { type: G.room.type, n: G.room.modular.filter(m => m.loop).length, course: Math.max(...xs) - Math.min(...xs), avance, retours };
  });
  ok(
    'le train : trois wagons en boucle, un wagon parcourt plus de 12 tuiles d’un trait et repart du début sans marche arrière',
    train.type === 'TRAIN' && train.n === 3 && train.course >= 12 && train.avance >= 40 && train.retours >= 1,
    JSON.stringify(train)
  );

  /* --- le coffre offert : à la salle sécurisée, devant la porte ; caché au bazar --- */
  await salle(3, 'biome_1');
  const coffre3 = await p.evaluate(() => {
    G.enemies = [];
    Room.clear();
    const c = G.room.chest;
    return { chest: !!c, offered: c && c.offered, x: c && Math.floor((c.x - ROOM_X) / TILE), y: c && Math.floor((c.y - ROOM_Y) / TILE) };
  });
  ok(
    'salle 3 sécurisée : un coffre apparaît devant la porte, à côté du cœur',
    coffre3.chest && coffre3.offered && coffre3.x === 19 && coffre3.y === 6,
    JSON.stringify(coffre3)
  );
  await salle(6, 'biome_4');
  const bazar = await p.evaluate(() => {
    G.enemies = [];
    Room.clear();
    const c = G.room.chest;
    const tx = Math.floor((c.x - ROOM_X) / TILE);
    return { type: G.room.type, chest: !!c, tx, libre: !pointBlocked(c.x, c.y, 20), etals: G.room.obstacles.length };
  });
  ok(
    'au bazar, le coffre se cache entre les étals, loin de la porte, sur une tuile libre',
    bazar.type === 'BAZAR' && bazar.chest && bazar.tx <= 15 && bazar.libre && bazar.etals >= 20,
    JSON.stringify(bazar)
  );

  /* --- le boss de la salle 9 ne rejoue pas la salle 5 --- */
  const boss = await p.evaluate(async () => {
    const out = {};
    for (const b of Content.biomes()) {
      const def = Content.boss(b.miniboss);
      const five = new Boss(def, 600, 300, {});
      const nine = new Boss(def, 600, 300, { revenge: true });
      const kinds = x => x.phases.map(ph => ph.patterns.map(q => q.kind).join('+')).join(' | ');
      out[b.id] = { five: kinds(five), nine: kinds(nine), nom: nine.name, phases9: nine.phases.length };
    }
    return out;
  });
  ok(
    'dans les quatre biomes, le boss de la salle 9 (rév. B) a ses propres phases, trois au total, différentes de celles de la salle 5',
    Object.values(boss).every(x => x.five !== x.nine && x.phases9 === 3 && /rév\. B/.test(x.nom)),
    Object.keys(boss)
      .map(id => id + ' : ' + boss[id].nine)
      .join('\n      ')
  );
  await salle(9, 'biome_2');
  const salle9 = await p.evaluate(async () => {
    await new Promise(r => setTimeout(r, 900));
    const b = G.room.boss;
    return { boss: !!b, nom: b && b.name, premier: b && b.phases[0].patterns[0].kind };
  });
  ok(
    'en salle 9 de la Serre, le boss qui entre est la rév. B et ouvre sur ses ronces',
    salle9.boss && /rév\. B/.test(salle9.nom) && salle9.premier === 'roots',
    JSON.stringify(salle9)
  );
});
