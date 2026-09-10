/* Chantier F-6 — les moments forts. Ce test mesure : la montée de niveau mise en scène (arrêt, coup de zoom, anneau
   doré, silhouette blanche, « NIVEAU n », le compagnon qui saute) et son écran de choix retardé jusqu'au temps fort ;
   l'arrivée du boss (rideau, caméra sur lui, zoom, descente, trois secousses espacées d'un temps exact, son nom sur
   la bande) ; sa mort (ralenti à 0,25, cinq explosions, le corps qui reste 1,6 s, le compagnon qui court au corps) ;
   la mort du joueur (ralenti, ennemis figés, voile sombre, zoom, le compagnon qui vient s'asseoir, l'écran de fin sur
   le temps fort) ; l'entrée de salle (le joueur entre par la gauche en marchant, un seul texte, pas de bandeau). */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();

  /* --- l'entrée de salle --- */
  const entree = await p.evaluate(async () => {
    Meta.profile.pet = 'pet_uno';
    Meta.profile.petMode = 'always';
    Debug.gotoRoom(3);
    Debug.hide();
    G.debug.invuln = true;
    Room.load(3); // le débogage saute l'intro : on recharge la salle par le chemin normal, avec son entrée
    const pl = G.player;
    const t0 = { x: pl.x, state: G.room.state, entry: !!G.room.entry };
    await new Promise(r => setTimeout(r, 220));
    const t1 = { x: pl.x, clip: pl.clip, moving: pl.movingNow, state: G.room.state };
    await new Promise(r => setTimeout(r, 900));
    const m = UI.messages();
    const textes = [m.banner && m.banner.text, ...m.queue.map(b => b.text)].filter(Boolean);
    return {
      t0,
      t1,
      t2: { x: pl.x, state: G.room.state },
      cible: ROOM_X + TILE * 1.5,
      mur: ROOM_X,
      textes,
      label: G.room.label,
      introLabel: G.room.introLabelT > 0,
    };
  });
  ok(
    'le joueur part dans le mur de gauche et entre en marchant pendant l’intro',
    entree.t0.x < entree.mur && entree.t0.state === 'intro' && entree.t0.entry && entree.t1.clip === 'walk' && entree.t1.x > entree.t0.x,
    `x ${entree.t0.x.toFixed(0)} → ${entree.t1.x.toFixed(0)} (clip ${entree.t1.clip})`
  );
  ok(
    'à la fin de l’intro il est à sa place et le combat commence',
    Math.abs(entree.t2.x - entree.cible) < 2 && entree.t2.state === 'fight',
    `x ${entree.t2.x.toFixed(0)} pour ${entree.cible}`
  );
  ok(
    'un seul texte à l’entrée : le nom de la salle en bas, plus de bandeau « Salle n/9 »',
    entree.introLabel && !entree.textes.some(t => t === entree.label),
    entree.textes.join(' | ') || 'aucun bandeau'
  );

  /* --- la montée de niveau --- */
  const niveau = await p.evaluate(async () => {
    const r = G.run,
      pl = G.player;
    G.enemies = [];
    G.room.blasts = [];
    Floaters.list = [];
    const pet = G.pets[0];
    Time.slowUntil = 0;
    Feel.lastStop = -9;
    Run.addXp(r.xpNext - r.xp);
    const t0 = {
      levelAt: r.levelAt != null,
      overlay: G.overlay,
      stop: +(Time.slowUntil - Time.now).toFixed(2),
      pulse: Camera.pulse,
      anneau: G.room.blasts.some(b => b.r === 170 && b.color === PAL.gold),
      blanc: pl.whiteT > 0,
      texte: Floaters.list.some(f => /NIVEAU/.test(f.text)),
      saut: pet ? pet.jumpT > 0 : null,
    };
    /* sansPause referme l'écran de choix dès qu'il paraît : on lit l'instant où il a été appelé */
    r.levelUpAt = null;
    for (let i = 0; i < 100 && !r.levelUpAt; i++) await new Promise(r => setTimeout(r, 50));
    const t1 = { appele: !!r.levelUpAt, at: r.levelUpAt };
    return { t0, t1 };
  });
  ok(
    'la montée de niveau est une scène : arrêt de 120 ms, coup de zoom, anneau doré de 170 px, silhouette blanche, « NIVEAU n », le compagnon saute',
    niveau.t0.levelAt &&
      niveau.t0.overlay !== 'choice' &&
      niveau.t0.stop >= 0.11 &&
      niveau.t0.pulse > 0.05 &&
      niveau.t0.anneau &&
      niveau.t0.blanc &&
      niveau.t0.texte &&
      niveau.t0.saut,
    JSON.stringify(niveau.t0)
  );
  ok(
    'l’écran de choix s’ouvre sur le temps fort suivant (à 30 ms près)',
    niveau.t1.appele && niveau.t1.at.bib === 0 && niveau.t1.at.phase * 0.5 < 0.05,
    `appelé : ${niveau.t1.appele}, temps ${niveau.t1.at && niveau.t1.at.bib}, phase ${niveau.t1.at && niveau.t1.at.phase.toFixed(2)}`
  );

  /* --- le boss : arrivée, puis mort --- */
  await salle(5);
  const boss = await p.evaluate(async () => {
    const kicks = [];
    const orig = Camera.kick;
    Camera.kick = function (mag, angle, ms) {
      kicks.push({ t: performance.now() / 1000, mag });
      return orig.call(Camera, mag, angle, ms);
    };
    G.enemies = [];
    G.room.boss = null;
    G.debug.hudProbe = true;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    Room.spawnBoss(null, ROOM_X + ROOM_W * 0.72, ROOM_Y + ROOM_H / 2);
    const b = G.room.boss;
    const t0 = {
      scene: G.room.scene && G.room.scene.kind,
      dur: G.room.scene && G.room.scene.dur,
      drop: b.introDrop,
      focus: !!Camera.focus,
      zoomTarget: Camera.zoomFxTarget,
    };
    await new Promise(r => setTimeout(r, 300));
    UI.renderHud(ctx);
    const t1 = {
      curtain: UI.hudProbe.flags.curtain,
      nom: UI.hudProbe.texts.some(t => t.t === b.name),
      drop: b.introDrop,
      camX: Camera.x,
      bossX: b.x,
      plX: G.player.x,
    };
    await new Promise(r => setTimeout(r, 1500));
    Camera.kick = orig;
    const gros = kicks.filter(k => k.mag === 9);
    const ecarts = gros.slice(1).map((k, i) => +(k.t - gros[i].t).toFixed(3));
    return { t0, t1, n: gros.length, ecarts, beat: Beat.beatLen(), fini: !G.room.scene, zoomBack: Camera.zoomFxTarget };
  });
  ok(
    'l’arrivée du boss : 1,4 s de rideau, la caméra va sur lui, zoom 1,12, il descend de 120 px, son nom sur la bande',
    boss.t0.scene === 'bossIn' &&
      boss.t0.dur === 1.4 &&
      boss.t0.drop === 1 &&
      boss.t0.focus &&
      boss.t0.zoomTarget === 1.12 &&
      boss.t1.curtain === 40 &&
      boss.t1.nom &&
      boss.t1.drop < 1 &&
      boss.t1.drop > 0 &&
      Math.abs(boss.t1.camX - boss.t1.bossX) < Math.abs(boss.t1.camX - boss.t1.plX),
    JSON.stringify({ t0: boss.t0, t1: boss.t1 })
  );
  ok(
    'trois pas de secousse espacés d’un temps exact, puis la caméra revient',
    boss.n >= 3 && boss.ecarts.slice(0, 2).every(e => Math.abs(e - boss.beat) < 0.06) && boss.fini && boss.zoomBack === 1,
    `${boss.n} secousses, écarts ${boss.ecarts.join(' / ')} pour un temps de ${boss.beat.toFixed(3)} s`
  );

  const mortBoss = await p.evaluate(async () => {
    const b = G.room.boss;
    const pet = G.pets[0];
    G.room.blasts = [];
    Time.slowUntil = 0;
    Time.slow = 1;
    b.hp = 1;
    b.intro = 0;
    Combat.hitEnemy(b, 5, { noCrit: true });
    const t0 = {
      dead: b.dead,
      dur: b.deathDur,
      slow: Time.slow,
      until: +(Time.slowUntil - Time.now).toFixed(2),
      scene: G.room.scene && G.room.scene.kind,
      pulse: Camera.pulse,
      celebrate: pet ? !!pet.celebrate : null,
    };
    await new Promise(r => setTimeout(r, 1800));
    const t1 = {
      encore: G.enemies.includes(b),
      explosions: G.room.bossExplosions || 0,
      deathT: +b.deathT.toFixed(2),
      petDist: pet ? Math.round(Math.hypot(pet.x - b.x, pet.y - b.y)) : null,
    };
    await new Promise(r => setTimeout(r, 400));
    t1.parti = !G.enemies.includes(b);
    return { t0, t1 };
  });
  ok(
    'la mort du boss : ralenti à 0,25 pendant 1,6 s, cinq explosions échelonnées, le corps qui reste 1,6 s puis part, le compagnon qui court au corps',
    mortBoss.t0.dead &&
      mortBoss.t0.dur === 0.4 &&
      mortBoss.t0.slow === 0.25 &&
      mortBoss.t0.until >= 1.5 &&
      mortBoss.t0.scene === 'bossOut' &&
      mortBoss.t0.pulse > 0.05 &&
      mortBoss.t0.celebrate &&
      mortBoss.t1.explosions === 5 &&
      !mortBoss.t1.encore &&
      mortBoss.t1.petDist < 100,
    JSON.stringify(mortBoss)
  );

  /* --- la mort du joueur --- */
  await salle(2);
  const mort = await p.evaluate(async () => {
    const pl = G.player;
    const pet = G.pets[0];
    G.enemies = [];
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, pl.x + 240, pl.y, {});
    G.debug.invuln = false;
    G.debug.hudProbe = true;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    pl.hp = 1;
    pl.secondChanceUsed = true; // le mode test a la résurrection : on la considère consommée
    const st0 = e.stateT;
    Combat.hitPlayer(999, { type: 'contact' });
    const t0 = {
      dead: pl.dead,
      slow: Time.slow,
      endAt: G.run.endReal != null,
      mourn: pet ? pet.mourn : null,
      zoomTarget: Camera.zoomFxTarget,
      overlay: G.overlay,
    };
    await new Promise(r => setTimeout(r, 1300));
    UI.renderHud(ctx);
    const t1 = {
      veil: UI.hudProbe.flags.deathVeil,
      enemyMoved: e.stateT !== st0,
      petDist: pet ? Math.round(Math.hypot(pet.x - pl.x, pet.y - pl.y)) : null,
      pose: pet && pet.mournPose,
      overlay: G.overlay,
    };
    const tm = performance.now();
    for (let i = 0; i < 120 && !G.run.endedAt; i++) await new Promise(r => setTimeout(r, 50));
    const t2 = { fini: !!G.run.endedAt, apres: Math.round(performance.now() - tm) };
    return { t0, t1, t2 };
  });
  ok(
    'la mort du joueur : ralenti à 0,18, les ennemis figés, un voile sombre, un zoom sur le corps, le compagnon qui vient s’asseoir à côté',
    mort.t0.dead &&
      mort.t0.slow === 0.18 &&
      mort.t0.endAt &&
      mort.t0.mourn &&
      mort.t0.zoomTarget === 1.3 &&
      mort.t0.overlay !== 'end' &&
      mort.t1.veil >= 0.9 &&
      !mort.t1.enemyMoved &&
      mort.t1.petDist < 60 &&
      mort.t1.pose === 'lie' &&
      mort.t1.overlay !== 'end',
    JSON.stringify({ t0: mort.t0, t1: mort.t1 })
  );
  ok(
    'l’écran de fin vient après la chute et au moins 1,4 s, pas avant',
    mort.t2.fini && mort.t2.apres >= 50,
    `écran de fin ${mort.t2.fini}, ${mort.t2.apres} ms après la mesure à 1,3 s`
  );
});
