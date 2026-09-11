/* Chantier F-7 — les compagnons et le dash. Ce test mesure : Uno s'accroupit avant sa morsure et mord à moins de
   30 ms d'un temps ; Tanuki tourne pendant sa roulade, flashe un demi-temps avant, laisse des fantômes et une onde ;
   Choupi s'allonge en course et rapporte en deux temps (l'objet vole vers elle, puis vers le joueur) ; ORI trace un
   trait pointillé vers sa cible et sa marque bat sur le tempo ; l'appel fait entrer le compagnon depuis le bord de
   l'écran, son nom dans sa couleur ; le repos après 3 s (Uno s'assied, tourné vers le joueur) ; la ruée laisse cinq
   fantômes, dorés quand elle part sur le temps, une onde au départ, de la poussière à l'arrivée. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();

  /* --- Uno : l'accroupissement puis la morsure sur le temps --- */
  await p.evaluate(() => {
    Meta.profile.pet = 'pet_uno';
    Meta.profile.petMode = 'always';
    Meta.save();
  });
  await salle(2);
  const uno = await p.evaluate(async () => {
    const pl = G.player;
    G.enemies = [];
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, pl.x + 40, pl.y, {});
    e.hp = 99999;
    e.maxHp = 99999;
    const pet = G.pets[0];
    let crouchVu = false,
      bites = 0;
    for (let i = 0; i < 400 && bites < 2; i++) {
      await new Promise(r => setTimeout(r, 16));
      if (pet.crouch) crouchVu = true;
      if (pet.lastBite && pet.lastBite.t !== (pet._lastSeen || -1)) {
        pet._lastSeen = pet.lastBite.t;
        bites++;
      }
    }
    const r = { crouchVu, bites, dist: pet.lastBite && +(pet.lastBite.dist * 1000).toFixed(0), pop: pet.popD > 0 };
    e.dead = true;
    G.enemies = [];
    return r;
  });
  ok(
    'Uno s’accroupit avant de mordre, et sa morsure tombe à moins de 30 ms d’un temps',
    uno.crouchVu && uno.bites >= 1 && uno.dist != null && uno.dist < 30,
    `accroupi ${uno.crouchVu}, ${uno.bites} morsures, ${uno.dist} ms du temps`
  );

  /* --- le repos : après 3 s sans rien, il se tourne vers le joueur et s'assied --- */
  const repos = await p.evaluate(async () => {
    const pet = G.pets[0];
    const pl = G.player;
    G.enemies = [];
    Pickups.list = [];
    /* un coin tranquille : plus de pièges ni de zones, le joueur au milieu, le chien à portée de « suivre » */
    G.room.traps = [];
    G.room.hazards = [];
    for (const w of G.room.waves) w.done = true; // plus de vagues : un chien qui voit un ennemi n'est pas au repos
    G.room.wavesStarted = true;
    G.enemies = [];
    pl.x = ROOM_X + ROOM_W / 2;
    pl.y = ROOM_Y + ROOM_H / 2;
    pet.x = pl.x + 30;
    pet.y = pl.y;
    pet.idleT = 0;
    await new Promise(r => setTimeout(r, 3400));
    return {
      rest: pet.rest,
      pose: pet.restPose,
      versJoueur: pet.dx === (pl.x < pet.x ? -1 : 1),
      idleT: +(pet.idleT || 0).toFixed(1),
      diag: {
        moving: pet.moving,
        act: +pet.act.toFixed(2),
        target: !!pet.target,
        fetching: !!pet.fetching,
        state: pet.state,
        d: Math.round(Math.hypot(pet.x - pl.x, pet.y - pl.y)),
      },
    };
  });
  ok(
    'après 3 s sans rien, Uno s’assied, tourné vers le joueur',
    repos.rest && repos.pose === 'sit' && repos.versJoueur,
    JSON.stringify(repos)
  );

  /* --- l'appel : il entre par le bord de l'écran --- */
  const appel = await p.evaluate(async () => {
    const pet = G.pets[0];
    const pl = G.player;
    pet.mode = 'call';
    pet.away = true;
    pet.cdT = 0;
    UI.clearAll();
    const V = Engine.view;
    const hw = V.w / (2 * Camera.zoom);
    const ok0 = pet.call();
    const t0 = {
      ok: ok0,
      horsVue: Math.abs(pet.x - Camera.x) > hw,
      arrive: !!pet.arrive,
      fantomes: (pet.trail || []).length,
      nom: (UI.messages().banner && UI.messages().banner.text) === pet.name,
      couleur: UI.messages().banner && UI.messages().banner.color === pet.color,
    };
    await new Promise(r => setTimeout(r, 400));
    const t1 = { dist: Math.round(Math.hypot(pet.x - pl.x, pet.y - pl.y)), arrive: !!pet.arrive };
    pet.mode = 'always';
    pet.away = false;
    return { t0, t1 };
  });
  ok(
    'l’appel fait entrer le compagnon depuis le bord de l’écran, en 250 ms, son nom dans sa couleur',
    appel.t0.ok && appel.t0.horsVue && appel.t0.arrive && appel.t0.nom && appel.t0.couleur && appel.t1.dist < 60 && !appel.t1.arrive,
    JSON.stringify(appel)
  );

  /* --- la ruée : fantômes, onde, poussière, or en rythme --- */
  const ruee = await p.evaluate(async () => {
    const pl = G.player;
    G.enemies = [];
    G.room.blasts = [];
    Particles.list = [];
    pl.skillCharges = 1;
    pl.moveDir = { x: 1, y: 0 };
    /* on attend d'être loin d'un temps pour un dash hors rythme, puis pile dessus pour un dash en rythme */
    const attendre = async pred => {
      for (let i = 0; i < 400 && !pred(); i++) await new Promise(r => setTimeout(r, 4));
    };
    await attendre(() => Beat.distToBeat(1) > 0.15);
    Skills.use(pl, 0);
    const hors = { onBeat: pl.dashOnBeat, onde: G.room.blasts.some(b => b.r === 26 && b.color === '#ffffff'), pulse: Camera.pulse };
    await new Promise(r => setTimeout(r, 260));
    hors.fantomes = pl.dashTrail ? pl.dashTrail.length : 0;
    hors.poussiere = Particles.list.filter(q => q.color === '#b8b0a0').length;
    await new Promise(r => setTimeout(r, 400));
    pl.skillCharges = 1;
    await attendre(() => Beat.distToBeat(1) < 0.03);
    Skills.use(pl, 0);
    const dedans = { onBeat: pl.dashOnBeat };
    return { hors, dedans };
  });
  ok(
    'la ruée : cinq fantômes, une onde blanche de 26 px au départ, un coup de zoom inversé, huit grains de poussière à l’arrivée',
    ruee.hors.fantomes === 5 && ruee.hors.onde && ruee.hors.pulse < 0 && ruee.hors.poussiere >= 8 && !ruee.hors.onBeat,
    JSON.stringify(ruee.hors)
  );
  ok('partie sur le temps (à moins de 90 ms), la ruée est dorée', ruee.dedans.onBeat === true, `en rythme : ${ruee.dedans.onBeat}`);

  /* --- Choupi & Tanuki --- */
  await salle(3);
  const chats = await p.evaluate(async () => {
    const pl = G.player;
    G.enemies = [];
    Pickups.list = [];
    Pets.give('pet_choupi'); // les chats prennent la place d'Uno pour la suite
    await new Promise(r => setTimeout(r, 100));
    const choupi = G.pets.find(q => q.id === 'pet_choupi'),
      tanuki = G.pets.find(q => q.id === 'pet_tanuki');
    /* Choupi : une pièce à 200 px, elle court et rapporte en deux temps */
    Pickups.spawn(pl.x + 200, pl.y + 10, 'coin', 1);
    const q = Pickups.list[Pickups.list.length - 1];
    q.z = 0;
    q.vz = 0;
    let stretchVu = false,
      trailVu = false;
    for (let i = 0; i < 250 && !q.magnet; i++) {
      await new Promise(r => setTimeout(r, 16));
      if (choupi && choupi.stretch) stretchVu = true;
      if (choupi && choupi.trail && choupi.trail.length >= 3) trailVu = true;
    }
    const collecte = { stretchVu, trailVu, stages: q.stages, magnet: q.magnet };
    /* Tanuki : un ennemi à portée, il flashe puis roule en tournant */
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, pl.x + 260, pl.y, {});
    e.hp = 99999;
    let flashVu = false,
      spinMax = 0,
      trail6 = false,
      onde = false;
    for (let i = 0; i < 400; i++) {
      await new Promise(r => setTimeout(r, 16));
      if (tanuki && tanuki.preRoll) flashVu = true;
      if (tanuki && tanuki.state === 'roll') {
        spinMax = Math.max(spinMax, Math.abs(tanuki.rollSpin || 0));
        if (tanuki.trail && tanuki.trail.length >= 5) trail6 = true;
        if (G.room.blasts.some(b => b.flat && b.r === 30 && b.color === tanuki.color)) onde = true;
      }
      if (spinMax > 1 && trail6 && onde) break;
    }
    e.dead = true;
    G.enemies = [];
    return { collecte, roule: { flashVu, spinMax: +spinMax.toFixed(2), trail6, onde } };
  });
  ok(
    'Choupi s’allonge en course avec ses fantômes, et rapporte en deux temps : vers elle, puis vers le joueur',
    chats.collecte.stretchVu &&
      chats.collecte.trailVu &&
      chats.collecte.stages &&
      chats.collecte.stages.join() === 'pet,player' &&
      chats.collecte.magnet,
    JSON.stringify(chats.collecte)
  );
  ok(
    'Tanuki flashe un demi-temps avant, puis roule en tournant, avec six fantômes et une onde au départ',
    chats.roule.flashVu && chats.roule.spinMax > 1 && chats.roule.trail6 && chats.roule.onde,
    JSON.stringify(chats.roule)
  );

  /* --- ORI : le trait vers sa cible --- */
  await salle(2);
  const ori = await p.evaluate(async () => {
    const pl = G.player;
    G.enemies = [];
    Pets.give('pet_ori');
    await new Promise(r => setTimeout(r, 100));
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, pl.x + 200, pl.y, {});
    e.hp = 99999;
    const pet = G.pets[0];
    for (let i = 0; i < 300 && !pet.target; i++) await new Promise(r => setTimeout(r, 16));
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 720;
    const g = c.getContext('2d');
    let dashes = 0,
      offset = 0;
    const od = g.setLineDash;
    g.setLineDash = function (d) {
      if (d && d.length) dashes++;
      return od.call(g, d);
    };
    const os = g.stroke;
    g.stroke = function () {
      if (g.lineDashOffset !== 0) offset = g.lineDashOffset; // lu au moment du trait : restore() le remet à zéro ensuite
      return os.apply(g, arguments);
    };
    pet.render(g);
    const r = {
      cible: !!pet.target,
      trait: dashes > 0 && offset !== 0,
      flotte: pet.airborne,
      id: pet.id,
      pets: G.pets.map(q => q.id).join(),
    };
    e.dead = true;
    G.enemies = [];
    return r;
  });
  ok('ORI désigne une cible et trace vers elle un trait pointillé animé', ori.cible && ori.trait && ori.flotte, JSON.stringify(ori));
});
