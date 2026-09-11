/* Chantier 9, deuxième séance — un comportement neuf par archétype et par biome. Ce test mesure : 28 comportements
   distincts au grep (7 archétypes + 21 variantes) ; puis chaque variante en action — la ronce bondit par-dessus un bloc,
   les spores rebondissent, la racine s'enracine, la spore laisse un nuage, le bourgeon soigne, les moucherons volent,
   la liane fouette ; le coyote pose un piège, le bandit se replie, le bison secoue le sol, le baril roule, le
   croquemort relève, le venin engourdit, le crotale feinte ; le derviche se dédouble, l'archer tire en cloche, le
   colosse encaisse de face, la jarre brûle, le charmeur attire, les cobras crachent, le djinn surgit dans le dos ;
   et le bot traverse une salle des trois biomes sans erreur. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, salle, sansPause, erreurs }) => {
  await entrer('test');
  await sansPause();

  const grep = await p.evaluate(() => {
    const ens = Content.enemies();
    const arch = new Set(ens.map(e => e.archetype));
    const vars = new Set(ens.map(e => e.behavior && e.behavior.variant).filter(Boolean));
    const parBiome = Content.biomes().map(b => b.enemyPool.filter(id => (Content.enemy(id).behavior || {}).variant).length);
    return { arch: arch.size, vars: vars.size, parBiome };
  });
  ok(
    '28 comportements distincts : 7 archétypes et 21 variantes, 7 par biome au-delà du premier',
    grep.arch === 7 && grep.vars === 21 && grep.parBiome.join() === '0,7,7,7',
    JSON.stringify(grep)
  );

  /* une salle vide pour les mesures : la salle 2 du biome, ennemis retirés, joueur au centre */
  const scene = async biome => {
    await salle(1, biome);
    await p.evaluate(() => {
      G.enemies = [];
      for (const w of G.room.waves) w.done = true;
      G.room.hazards = [];
      Projectiles.list = [];
      G.player.x = tileX(11);
      G.player.y = tileY(6);
      G.debug.invuln = true;
      G.pets = []; // pas de compagnon pendant les mesures : la cible est le joueur, et personne ne mord le baril
    });
  };
  const spawn = (id, dx, dy, extra) =>
    p.evaluate(
      ([id, dx, dy, extra]) => {
        const e = Room.spawnEnemy(Content.enemy(id), G.player.x + dx, G.player.y + dy, {});
        e.spawnT = 0;
        Object.assign(e, extra || {});
        window.E = e;
        return !!e;
      },
      [id, dx, dy, extra]
    );
  const attendre = ms => p.waitForTimeout(ms);

  /* ---------------- LA SERRE ---------------- */
  await scene('biome_2');
  /* la ronce : un bloc entre elle et le joueur, elle bondit par-dessus */
  await p.evaluate(() => {
    const o = { x: 13, y: 6, w: 1, h: 1 };
    G.room.obstacles.push({ x: o.x, y: o.y, w: 1, h: 1, px: ROOM_X + o.x * TILE, py: ROOM_Y + o.y * TILE, pw: TILE, ph: TILE });
  });
  await spawn('enemy_ronce', 150, 0, { state: 'windup', stateT: 10, lungeA: Math.PI });
  await attendre(450);
  const ronce = await p.evaluate(() => ({ x: E.x - G.player.x, saute: E.variant, noClip: E.noClip, state: E.state }));
  ok('la ronce bondit par-dessus le bloc qui la sépare du joueur', ronce.saute === 'saut' && ronce.x < 40, JSON.stringify(ronce));
  await p.evaluate(() => {
    G.room.obstacles.pop();
    G.enemies = [];
  });
  /* le pollinisateur : ses spores rebondissent */
  await spawn('enemy_pollinisateur', 300, 0, { state: 'aim', stateT: 10, aimA: Math.PI, fireCd: 0 });
  await attendre(120);
  const spores = await p.evaluate(() => Projectiles.list.filter(q => q.owner === 'enemy').map(q => q.bounce));
  ok(
    'le pollinisateur tire trois spores qui rebondissent une fois',
    spores.length === 3 && spores.every(b => b === 1),
    JSON.stringify(spores)
  );
  await p.evaluate(() => ((G.enemies = []), (Projectiles.list = [])));
  /* la racine : au bout de la charge, trois ronces */
  await spawn('enemy_racine', 200, 0, { state: 'charge', stateT: 10, chargeA: Math.PI });
  await attendre(150);
  const racine = await p.evaluate(() => ({ state: E.state, ronces: G.room.hazards.filter(h => h.slow && h.dps).length }));
  ok(
    "la racine s'enracine au bout de sa charge : trois ronces qui ralentissent",
    racine.state === 'stunned' && racine.ronces === 3,
    JSON.stringify(racine)
  );
  await p.evaluate(() => ((G.enemies = []), (G.room.hazards = [])));
  /* la spore : un nuage après l'explosion */
  await spawn('enemy_spore', 60, 0, {});
  await p.evaluate(() => E.explode());
  const nuage = await p.evaluate(() => G.room.hazards.filter(h => h.slow).map(h => [h.r > 40, Math.round(h.until - Time.now)]));
  ok('la spore laisse un nuage qui ralentit 3 s', nuage.length === 1 && nuage[0][0] && nuage[0][1] >= 2, JSON.stringify(nuage));
  await p.evaluate(() => ((G.enemies = []), (G.room.hazards = [])));
  /* le bourgeon soigne ses moucherons */
  const soin = await p.evaluate(async () => {
    const b = Room.spawnEnemy(Content.enemy('enemy_bourgeon'), G.player.x + 300, G.player.y, {});
    const m = Room.spawnEnemy(Content.enemy('enemy_moucherons'), G.player.x + 320, G.player.y + 20, {});
    b.spawnT = m.spawnT = 0;
    b.summoned.push(m);
    m.hp = Math.round(m.maxHp * 0.3);
    const avant = m.hp;
    b.healCd = 0.05;
    await new Promise(r => setTimeout(r, 250));
    return { avant, apres: m.hp, max: m.maxHp, vol: m.variant, noClip: m.noClip };
  });
  ok(
    'le bourgeon soigne ses moucherons (+20 % des PV), et les moucherons volent',
    soin.apres > soin.avant && soin.vol === 'vol' && soin.noClip === true,
    JSON.stringify(soin)
  );
  await p.evaluate(() => (G.enemies = []));
  /* la liane : sa course laisse un fouet */
  await spawn('enemy_liane', 260, 0, { state: 'dash', stateT: 0, dashA: Math.PI, dashLen: 200, dashed: 0, whipAcc: 0 });
  await attendre(250);
  const fouet = await p.evaluate(() => G.room.hazards.filter(h => h.dps && !h.slow).length);
  ok('la liane laisse un fouet au sol sur sa course (au moins 4 segments)', fouet >= 4, fouet + ' segments');
  await p.evaluate(() => ((G.enemies = []), (G.room.hazards = [])));

  /* ---------------- LA CONCESSION ---------------- */
  await scene('biome_3');
  /* le coyote : un piège à loup en tombant, qui mord */
  await spawn('enemy_coyote', 80, 0, {});
  const piege = await p.evaluate(async () => {
    Combat.killEnemy(E);
    const h = G.room.hazards.find(x => x.trap);
    if (!h) return { piege: false };
    G.debug.invuln = false;
    const pv0 = G.player.hp;
    G.player.invulnUntil = 0;
    G.player.x = h.x;
    G.player.y = h.y;
    await new Promise(r => setTimeout(r, 120));
    G.debug.invuln = true;
    return { piege: true, mord: G.player.hp < pv0, disparu: !G.room.hazards.some(x => x.trap) };
  });
  ok(
    'le coyote laisse un piège à loup, qui mord une fois puis disparaît',
    piege.piege && piege.mord && piege.disparu,
    JSON.stringify(piege)
  );
  await p.evaluate(() => ((G.enemies = []), (G.room.hazards = []), (G.player.x = tileX(11)), (G.player.y = tileY(6))));
  /* le bandit se replie derrière un bloc */
  await p.evaluate(() => {
    const o = { x: 16, y: 6 };
    G.room.obstacles.push({ x: o.x, y: o.y, w: 1, h: 1, px: ROOM_X + o.x * TILE, py: ROOM_Y + o.y * TILE, pw: TILE, ph: TILE });
  });
  await spawn('enemy_bandit', 200, 0, { state: 'aim', stateT: 10, aimA: Math.PI, fireCd: 0 });
  await attendre(100);
  const bandit = await p.evaluate(() => ({ state: E.state, cover: E.cover && Math.round((E.cover.x - G.player.x) / TILE) }));
  ok(
    "le bandit, sa salve tirée, court se mettre derrière le bloc (à l'opposé du joueur)",
    bandit.state === 'cover' && bandit.cover >= 5,
    JSON.stringify(bandit)
  );
  await p.evaluate(() => {
    G.room.obstacles.pop();
    G.enemies = [];
    Projectiles.list = [];
  });
  /* le bison : le choc contre un bloc secoue le sol */
  const bison = await p.evaluate(async () => {
    const o = { x: 17, y: 6 };
    G.room.obstacles.push({ x: o.x, y: o.y, w: 1, h: 2, px: ROOM_X + o.x * TILE, py: ROOM_Y + o.y * TILE, pw: TILE, ph: 2 * TILE });
    const e = Room.spawnEnemy(Content.enemy('enemy_bison'), tileX(14), tileY(6), {});
    e.spawnT = 0;
    G.player.x = tileX(16);
    G.player.y = tileY(9); // à deux tuiles du point d'impact, hors de la trajectoire
    e.state = 'charge';
    e.stateT = 0;
    e.chargeA = 0;
    G.debug.invuln = false;
    G.player.invulnUntil = 0;
    const pv0 = G.player.hp;
    await new Promise(r => setTimeout(r, 400));
    G.debug.invuln = true;
    G.room.obstacles.pop();
    return { state: e.state, secousse: G.player.hp < pv0, onde: G.room.blasts.some(b => b.flat && b.r === 150) };
  });
  ok(
    'le bison sonné contre le mur secoue le sol : le joueur à trois tuiles encaisse',
    bison.state === 'stunned' && bison.secousse,
    JSON.stringify(bison)
  );
  await p.evaluate(() => ((G.enemies = []), (G.player.x = tileX(11)), (G.player.y = tileY(6))));
  /* le baril roule */
  await spawn('enemy_baril', 300, 0, {});
  await attendre(400);
  const baril = await p.evaluate(() => ({ state: E.state, avance: Math.round(G.player.x + 300 - E.x), vivant: !E.dead }));
  ok('le baril roule vers le joueur au lieu de marcher', baril.state === 'roll' && baril.avance > 60, JSON.stringify(baril));
  await p.evaluate(() => ((G.enemies = []), (G.room.hazards = [])));
  /* le croquemort relève */
  const releve = await p.evaluate(async () => {
    const c = Room.spawnEnemy(Content.enemy('enemy_croquemort'), G.player.x + 340, G.player.y, {});
    const v = Room.spawnEnemy(Content.enemy('enemy_coyote'), G.player.x + 300, G.player.y + 40, {});
    c.spawnT = v.spawnT = 0;
    Combat.killEnemy(v);
    const retenu = c.raise && c.raise.id;
    c.state = 'summon';
    c.stateT = 10;
    await new Promise(r => setTimeout(r, 120));
    const r = G.enemies.filter(e => !e.dead && e.raised);
    return { retenu, releves: r.map(e => e.id + ':' + e.hp + '/' + e.maxHp), raise: c.raise };
  });
  ok(
    'le croquemort relève le coyote tombé près de lui, à la moitié de ses PV',
    releve.retenu === 'enemy_coyote' && releve.releves.length === 1 && /enemy_coyote/.test(releve.releves[0]) && !releve.raise,
    JSON.stringify(releve)
  );
  await p.evaluate(() => ((G.enemies = []), (G.room.hazards = [])));
  /* les scorpions : le venin engourdit */
  const venin = await p.evaluate(async () => {
    const s = Room.spawnEnemy(Content.enemy('enemy_scorpions'), G.player.x + 10, G.player.y, {});
    s.spawnT = 0;
    s.contactCd = 0;
    G.debug.invuln = false;
    G.player.invulnUntil = 0;
    await new Promise(r => setTimeout(r, 150));
    G.debug.invuln = true;
    return { venin: G.player.venomUntil > Time.now };
  });
  ok('la piqûre des scorpions engourdit (venin, marche à 65 %)', venin.venin, JSON.stringify(venin));
  await p.evaluate(() => (G.enemies = []));
  /* le crotale feinte : on force le tirage */
  const feinte = await p.evaluate(async () => {
    const o = RNG.chance;
    RNG.chance = () => true;
    const e = Room.spawnEnemy(Content.enemy('enemy_crotale'), G.player.x + 220, G.player.y, {});
    e.spawnT = 0;
    e.state = 'windup';
    e.stateT = 10;
    e.dashA = Math.PI;
    const y0 = e.y;
    await new Promise(r => setTimeout(r, 80));
    RNG.chance = o;
    return { state: e.state, decale: Math.abs(e.y - y0) > 60 || (e.blinked || 0) > 0 };
  });
  ok('le crotale feinte : il surgit de côté avant de foncer', feinte.state === 'dash' && feinte.decale, JSON.stringify(feinte));
  await p.evaluate(() => (G.enemies = []));

  /* ---------------- LE SÉRAIL ---------------- */
  await scene('biome_4');
  /* le derviche se dédouble */
  const derviche = await p.evaluate(async () => {
    const e = Room.spawnEnemy(Content.enemy('enemy_derviche'), G.player.x + 250, G.player.y, {});
    e.spawnT = 0;
    e.hp = Math.round(e.maxHp * 0.45);
    await new Promise(r => setTimeout(r, 120));
    const d = G.enemies.filter(x => !x.dead && x.id === 'enemy_derviche');
    return { n: d.length, pv: d.map(x => x.hp), split: d.every(x => x.split) };
  });
  ok(
    'le derviche à moitié de ses PV se dédouble, une seule fois',
    derviche.n === 2 && derviche.split && derviche.pv[0] === derviche.pv[1],
    JSON.stringify(derviche)
  );
  await p.evaluate(() => (G.enemies = []));
  /* l'archer tire en cloche */
  await spawn('enemy_archer', 300, 0, { state: 'aim', stateT: 10, aimA: Math.PI, fireCd: 0 });
  await attendre(100);
  const cloche = await p.evaluate(() => ({
    fleche: Projectiles.list.filter(q => q.owner === 'enemy' && q.ghost && q.lob).length,
    cible: G.room.hazards.filter(h => h.marker && h.boomAt).map(h => Math.round(Math.hypot(h.x - G.player.x, h.y - G.player.y))),
  }));
  ok(
    "l'archer tire en cloche : une flèche qui ignore les obstacles et un point de chute annoncé sur le joueur",
    cloche.fleche === 1 && cloche.cible.length === 1 && cloche.cible[0] < 10,
    JSON.stringify(cloche)
  );
  await p.evaluate(() => ((G.enemies = []), (Projectiles.list = []), (G.room.hazards = [])));
  /* le colosse : de face, moitié moins */
  const colosse = await p.evaluate(() => {
    const e = Room.spawnEnemy(Content.enemy('enemy_colosse'), G.player.x + 200, G.player.y, {});
    e.spawnT = 0;
    e.facing = -1; // il regarde le joueur, à sa gauche
    const hp0 = e.hp;
    Combat.hitEnemy(e, 40, { x: e.x, y: e.y, vx: 300, vy: 0, noCrit: true }); // une balle venue de sa gauche : de face
    const face = hp0 - e.hp;
    Combat.hitEnemy(e, 40, { x: e.x, y: e.y, vx: -300, vy: 0, noCrit: true }); // de sa droite : dans le dos
    const dos = hp0 - face - e.hp;
    e.state = 'stunned';
    Combat.hitEnemy(e, 40, { x: e.x, y: e.y, vx: 300, vy: 0, noCrit: true });
    const sonne = hp0 - face - dos - e.hp;
    return { face, dos, sonne };
  });
  ok(
    'le colosse encaisse moitié moins de face, tout de dos ou sonné',
    colosse.face === 20 && colosse.dos === 40 && colosse.sonne === 40,
    JSON.stringify(colosse)
  );
  await p.evaluate(() => (G.enemies = []));
  /* la jarre : une nappe de feu */
  await spawn('enemy_jarre', 60, 0, {});
  await p.evaluate(() => E.explode());
  const nappe = await p.evaluate(() => G.room.hazards.filter(h => h.dps && !h.slow).map(h => h.color));
  ok("la jarre s'ouvre en nappe de feu qui brûle au sol", nappe.length === 1 && nappe[0] === '#ff8c42', JSON.stringify(nappe));
  await p.evaluate(() => ((G.enemies = []), (G.room.hazards = [])));
  /* le charmeur attire */
  const charme = await p.evaluate(async () => {
    const c = Room.spawnEnemy(Content.enemy('enemy_charmeur'), G.player.x + 380, G.player.y, {});
    c.spawnT = 0;
    c.charmCd = 0;
    const d0 = Math.hypot(c.x - G.player.x, c.y - G.player.y);
    await new Promise(r => setTimeout(r, 200));
    const charm = c.state;
    c.stateT = 10;
    await new Promise(r => setTimeout(r, 500));
    return { charm, d0: Math.round(d0), d1: Math.round(Math.hypot(c.x - G.player.x, c.y - G.player.y)) };
  });
  ok(
    'le charmeur télégraphie puis attire le joueur de plus de 100 px',
    charme.charm === 'charm' && charme.d0 - charme.d1 > 100,
    JSON.stringify(charme)
  );
  await p.evaluate(() => ((G.enemies = []), (G.player.x = tileX(11)), (G.player.y = tileY(6))));
  /* les cobras crachent */
  await spawn('enemy_cobras', 180, 0, { spitCd: 0 });
  await attendre(120);
  const crachat = await p.evaluate(() => Projectiles.list.filter(q => q.owner === 'enemy').map(q => q.color));
  ok('les cobras crachent de loin avant de mordre', crachat.length >= 1 && crachat[0] === '#9cff57', JSON.stringify(crachat));
  await p.evaluate(() => ((G.enemies = []), (Projectiles.list = [])));
  /* le djinn surgit dans le dos */
  const djinn = await p.evaluate(async () => {
    G.player.aim = 0; // le joueur regarde à droite : son dos est à gauche
    const e = Room.spawnEnemy(Content.enemy('enemy_djinn'), G.player.x + 240, G.player.y, {});
    e.spawnT = 0;
    e.state = 'windup';
    e.stateT = 10;
    e.dashA = Math.PI;
    await new Promise(r => setTimeout(r, 40));
    return { state: e.state, blinked: !!e.blinked, cote: e.x < G.player.x ? 'dos' : 'face' };
  });
  ok('le djinn réapparaît dans le dos du joueur avant de le traverser', djinn.blinked && djinn.cote === 'dos', JSON.stringify(djinn));
  await p.evaluate(() => (G.enemies = []));

  /* ---------------- le bot traverse une salle de chaque biome ---------------- */
  const avant = erreurs.length;
  for (const b of ['biome_2', 'biome_3', 'biome_4']) {
    await salle(3, b);
    await p.evaluate(() => (G.player.bot = Debug.botControl));
    await attendre(7000);
    await p.evaluate(() => (G.player.bot = null));
  }
  ok(
    'le bot joue 7 s dans une salle de chaque biome sans erreur JS',
    erreurs.length === avant,
    erreurs.slice(avant, avant + 2).join(' | ')
  );
});
