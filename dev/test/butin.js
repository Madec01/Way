/* Chantier F-4 — la mort d'un ennemi et le ramassage. Ce test mesure : un ennemi tué reste dessiné 220 ms (deathT),
   blanc pendant 60 ms puis écrasé (luminance et boîte englobante mesurées au pixel) ; une couronne d'étincelles et une
   onde à plat au sol ; une tache posée, plafonnée, purgée au changement de salle ; des drops qui partent en arc (vitesse
   verticale négative au départ, retour au sol) ; des étincelles de ramassage dont la taille et le nombre suivent la
   série ; le cœur qui fait sursauter le joueur ; la relique qui arrête le combat avec un rayon vertical ; le coffre dont
   le halo grossit à l'approche et qui s'ouvre en 300 ms avant l'écran de choix. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();
  await salle(2);

  /* --- la mort en 220 ms --- */
  const mort = await p.evaluate(() => {
    G.paused = true;
    G.enemies = [];
    Particles.list = [];
    Pickups.list = [];
    G.room.blasts = [];
    G.room.decals = [];
    const pl = G.player;
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, pl.x + 200, pl.y, {});
    e.hp = 1;
    Time.slowUntil = 0;
    Time.slow = 1;
    const nBlanches0 = Particles.list.length;
    Combat.hitEnemy(e, 5, { noCrit: true });
    const r = {
      dead: e.dead,
      deathT: e.deathT,
      blanches: Particles.list.filter(q => q.color === '#ffffff').length - nBlanches0,
      dorees: Particles.list.filter(q => q.color === PAL.gold).length,
      onde: G.room.blasts.filter(b => b.flat).length,
      tache: G.room.decals.length,
      drops: Pickups.list.filter(q => !q.ghost).map(q => q.vz),
      stop: +(Time.slowUntil - Time.now).toFixed(3),
    };
    r.alive = Room.alive();
    window.__mort = e;
    /* le dessin : blanc à 30 ms, écrasé à 180 ms — rendu sur un canvas à part, compté au pixel */
    const mesure = t => {
      e.deathT = t;
      const c = document.createElement('canvas');
      c.width = 1280;
      c.height = 720;
      const g = c.getContext('2d');
      e.render(g);
      const d = g.getImageData(0, 0, 1280, 720).data;
      let n = 0,
        lum = 0,
        x0 = 1e9,
        x1 = -1,
        y0 = 1e9,
        y1 = -1;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 40) continue;
        n++;
        lum += (d[i] + d[i + 1] + d[i + 2]) / 3;
        const x = (i / 4) % 1280,
          y = Math.floor(i / 4 / 1280);
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      return { n, lum: n ? Math.round(lum / n) : 0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    };
    r.blanc = mesure(0.03);
    r.ecrase = mesure(0.12);
    r.fini = mesure(0.25);
    e.deathT = 0;
    G.paused = false;
    return r;
  });
  /* la simulation ne tourne pas en pause : le corps reste dans la liste jusqu'à 220 ms de jeu, puis il part */
  await new Promise(r => setTimeout(r, 90));
  const a100 = await p.evaluate(() => ({ encore: G.enemies.includes(window.__mort), deathT: +window.__mort.deathT.toFixed(3) }));
  await new Promise(r => setTimeout(r, 450));
  const a500 = await p.evaluate(() => G.enemies.includes(window.__mort));
  mort.encoreA100 = a100.encore && a100.deathT > 0 && a100.deathT < 0.22;
  mort.deathT100 = a100.deathT;
  mort.encoreA300 = a500;
  ok(
    'un ennemi tué reste dans la liste 220 ms (deathT), puis s’en va, et ne compte plus comme vivant',
    mort.dead && mort.deathT === 0 && mort.encoreA100 && !mort.encoreA300 && mort.alive === 0,
    `à 90 ms : ${mort.encoreA100} (deathT ${mort.deathT100}) ; à 540 ms : ${mort.encoreA300}`
  );
  ok(
    'à 30 ms la silhouette est blanche (luminance > 200 au pixel), à 120 ms elle est écrasée (plus large, moins haute), à 250 ms plus rien',
    mort.blanc.n > 50 && mort.blanc.lum > 200 && mort.ecrase.w > mort.blanc.w && mort.ecrase.h < mort.blanc.h * 0.6 && mort.fini.n === 0,
    `blanc ${JSON.stringify(mort.blanc)} · écrasé ${JSON.stringify(mort.ecrase)} · après ${mort.fini.n} px`
  );
  ok(
    'la mort arrête l’image 70 ms, lance 22 étincelles blanches et 6 dorées, une onde à plat, et pose une tache',
    mort.stop >= 0.065 && mort.blanches >= 22 && mort.dorees >= 6 && mort.onde === 1 && mort.tache === 1,
    `arrêt ${mort.stop} s, ${mort.blanches} blanches, ${mort.dorees} dorées, ${mort.onde} onde, ${mort.tache} tache`
  );
  ok(
    'les drops partent en arc : vitesse verticale négative au départ',
    mort.drops.length > 0 && mort.drops.every(v => v < 0),
    `${mort.drops.length} drops, vz ${mort.drops
      .slice(0, 3)
      .map(v => v.toFixed(0))
      .join(' / ')}`
  );

  /* --- l'arc retombe, le plafond des taches, la purge --- */
  const sol = await p.evaluate(() => {
    G.paused = true;
    /* un drop neuf, loin du joueur pour qu'il ne soit pas aimanté : on le suit image par image */
    Pickups.spawn(G.player.x + 260, G.player.y, 'coin', 1);
    const q = Pickups.list[Pickups.list.length - 1];
    let zMin = 0;
    for (let i = 0; i < 90; i++) {
      Pickups.update(1 / 60);
      if (q.z < zMin) zMin = q.z;
    }
    for (let i = 0; i < 70; i++) Combat.stain(100 + i, 100, '#f00');
    /* une aimantation venue d'ailleurs (fin de salle, tempo, compagnon) : la traînée naît quand même, sans erreur */
    q.magnet = true;
    q.trail = undefined;
    let erreur = null;
    try {
      Pickups.update(1 / 60);
    } catch (e) {
      erreur = String(e.message);
    }
    const r = { zMin, zFin: q.z, plafond: G.room.decals.length, erreur, trail: Array.isArray(q.trail) && q.trail.length };
    G.paused = false;
    return r;
  });
  ok(
    'un drop monte puis retombe au sol ; les taches sont plafonnées à 60',
    sol.zMin < -8 && Math.abs(sol.zFin) < 0.5 && sol.plafond === 60,
    `z min ${sol.zMin.toFixed(0)}, z final ${sol.zFin.toFixed(1)}, ${sol.plafond} taches`
  );
  ok(
    'un orbe aimanté de l’extérieur prend sa traînée de fantômes sans erreur',
    !sol.erreur && sol.trail === 1,
    sol.erreur || `${sol.trail} fantôme`
  );
  await salle(3);
  const purge = await p.evaluate(() => G.room.decals.length);
  ok('les taches sont effacées au changement de salle', purge === 0, purge + ' taches');

  /* --- le ramassage visible --- */
  const ramasse = await p.evaluate(() => {
    G.paused = true;
    const pl = G.player;
    G.enemies = [];
    Pickups.lastT = -9;
    Pickups.streak = 0;
    const prend = (kind, extra) => {
      Particles.list = [];
      G.room.blasts = [];
      G.room.beams = [];
      Combat.collect(Object.assign({ kind, value: 1, x: pl.x + 10, y: pl.y, r: 6, z: 0 }, extra || {}));
      return {
        fx: Object.assign({}, Pickups.lastFx),
        part: Particles.list.length,
        anneaux: G.room.blasts.map(b => [b.r, b.color]),
        rayons: G.room.beams.length,
      };
    };
    Time.slowUntil = 0;
    const seul = prend('coin');
    Pickups.lastT = Time.now;
    Pickups.streak = 7;
    const serie = prend('coin');
    pl.popD = 0;
    const coeur = prend('heart');
    const popCoeur = pl.popD > 0 && pl.popT === 0;
    Time.slowUntil = 0;
    Feel.lastStop = -9;
    const relique = prend('relic', { relic: RELICS[0].id });
    const stopRelique = +(Time.slowUntil - Time.now).toFixed(3);
    G.paused = false;
    return { seul, serie, coeur, popCoeur, relique, stopRelique };
  });
  ok(
    'la taille et le nombre des étincelles suivent la série (2 px × 5 seul, 4 px × 13 au huitième)',
    ramasse.seul.fx.size === 2 &&
      ramasse.seul.fx.count === 5 &&
      ramasse.serie.fx.size === 4 &&
      ramasse.serie.fx.count === 13 &&
      ramasse.serie.part > ramasse.seul.part,
    `${ramasse.seul.fx.size} px × ${ramasse.seul.fx.count} → ${ramasse.serie.fx.size} px × ${ramasse.serie.fx.count}`
  );
  ok(
    'un anneau de la couleur du genre à chaque collecte, doré pour une pièce',
    ramasse.seul.anneaux.length === 1 && ramasse.seul.anneaux[0][1] === '#ffd166' && ramasse.seul.anneaux[0][0] === 12,
    JSON.stringify(ramasse.seul.anneaux)
  );
  ok(
    'le cœur fait sursauter le joueur et pose un anneau vert de 40 px',
    ramasse.popCoeur && ramasse.coeur.anneaux.some(a => a[0] === 40 && a[1] === '#7fff9a'),
    JSON.stringify(ramasse.coeur.anneaux)
  );
  ok(
    'la relique arrête le combat 140 ms et trace un rayon de lumière vertical',
    ramasse.stopRelique >= 0.135 && ramasse.relique.rayons === 1,
    `arrêt ${ramasse.stopRelique} s, ${ramasse.relique.rayons} rayon`
  );

  /* --- le coffre --- */
  const coffre = await p.evaluate(async () => {
    const pl = G.player;
    G.enemies = [];
    Pickups.list = [];
    G.room.chest = { x: pl.x + 300, y: pl.y, r: 22, opened: false };
    await new Promise(r => setTimeout(r, 150));
    const loin = { approach: G.room.chest.approach, near: G.room.chest.near };
    G.room.chest.x = pl.x + 120;
    await new Promise(r => setTimeout(r, 150));
    const proche = { approach: G.room.chest.approach, near: G.room.chest.near };
    /* sansPause referme l'écran de choix dès qu'il paraît : on compte les appels de l'écran plutôt que de le voir */
    let appels = 0;
    const orig = Run.chestChoice;
    Run.chestChoice = () => {
      appels++;
      orig();
    };
    G.room.chest.x = pl.x + 10;
    Run.openChest();
    const t0 = {
      pending: G.room.chest.pending,
      openT: G.room.chest.openT,
      eclats: Pickups.list.filter(q => q.ghost && q.vz < 0).length,
      appels,
    };
    await new Promise(r => setTimeout(r, 120)); // le couvercle se lève encore (l'arrêt sur image de 70 ms compte), pas d'écran
    const t1 = { pending: G.room.chest.pending, appels, openT: +G.room.chest.openT.toFixed(2) };
    await new Promise(r => setTimeout(r, 700)); // l'écran de choix est venu
    const t2 = { pending: G.room.chest.pending, appels };
    Run.chestChoice = orig;
    return { loin, proche, t0, t1, t2 };
  });
  ok(
    'le halo du coffre grossit à l’approche, avant la portée d’ouverture',
    coffre.loin.approach < 0.25 && coffre.proche.approach > 0.5 && !coffre.proche.near,
    `loin ${coffre.loin.approach.toFixed(2)} → près ${coffre.proche.approach.toFixed(2)}`
  );
  ok(
    'l’ouverture prend 300 ms (gerbe et pièces en arc) avant l’écran de choix',
    coffre.t0.pending &&
      coffre.t0.openT === 0 &&
      coffre.t0.eclats >= 7 &&
      coffre.t0.appels === 0 &&
      coffre.t1.pending &&
      coffre.t1.appels === 0 &&
      !coffre.t2.pending &&
      coffre.t2.appels === 1,
    `${coffre.t0.eclats} éclats ; à 120 ms : couvercle à ${coffre.t1.openT} s, ${coffre.t1.appels} écran ; à 820 ms : ${coffre.t2.appels} écran`
  );
});
