/* Chantier 5 — des compagnons qui comptent. Ce test mesure chaque nouveauté :
   « Personne » vaut la peine (+35 % PV max, +20 % dégâts), « À l'appel » repousse à l'arrivée, Choupi court chercher
   ce qui traîne (anneau au sol), ORI rend chaque coup du joueur critique sur la cible marquée (marque dessinée),
   un ennemi ordinaire peut lâcher une relique et le mini-boss en lâche toujours une, les trois amis ont un caractère,
   et Run.reset() ne laisse rien traîner d'une partie à l'autre. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, run, sansPause }) => {
  await entrer('test');
  await sansPause();

  /* --- « Personne » : la part gardée --- */
  const seul = await p.evaluate(async () => {
    Meta.profile.petMode = 'none';
    Meta.save();
    UI.hideAll();
    Run.start({ character: 'char_martin', biome: 'biome_1', weapon: 'weapon_blade', skill: Content.skills()[0].id, seed: 5 });
    await new Promise(r => setTimeout(r, 1200));
    const pl = G.player;
    const avec = { pv: pl.stats.maxHp, dmg: pl.stats.damage };
    pl.buffs = pl.buffs.filter(b => b.id !== 'solo');
    pl.recompute();
    const sans = { pv: pl.stats.maxHp, dmg: pl.stats.damage };
    return { pv: +(avec.pv / sans.pv).toFixed(2), dmg: +(avec.dmg / sans.dmg).toFixed(2), pets: G.pets.length };
  });
  ok('« Personne » : +35 % de PV max', seul.pets === 0 && seul.pv === 1.35, '×' + seul.pv);
  ok('« Personne » : +20 % de dégâts', seul.dmg === 1.2, '×' + seul.dmg);

  /* --- « À l'appel » : l'arrivée repousse --- */
  const appel = await p.evaluate(async () => {
    Meta.profile.petMode = 'call';
    Meta.profile.pet = 'pet_uno';
    Meta.save();
    UI.hideAll();
    Run.start({ character: 'char_martin', biome: 'biome_1', weapon: 'weapon_blade', skill: Content.skills()[0].id, seed: 6 });
    await new Promise(r => setTimeout(r, 1200));
    G.debug.invuln = true;
    G.enemies = [];
    const pl = G.player;
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, pl.x + 60, pl.y, {});
    e.hp = 9999;
    e.speed = 0;
    const loin = Room.spawnEnemy(def, pl.x + 400, pl.y, {});
    loin.hp = 9999;
    loin.speed = 0;
    const hp0 = e.hp,
      hpLoin = loin.hp;
    const away = G.pet.away;
    const blasts0 = G.room.blasts.length;
    const appele = G.pet.call();
    return {
      away,
      appele,
      present: !G.pet.away,
      onde: G.room.blasts.length - blasts0,
      touche: Math.round(hp0 - e.hp),
      epargne: Math.round(hpLoin - loin.hp),
    };
  });
  ok('à l’appel, il est absent au départ puis arrive', appel.away && appel.appele && appel.present);
  ok('son arrivée est une onde de choc qui frappe tout près', appel.onde === 1 && appel.touche > 0, appel.touche + ' dégâts à 60 px');
  ok('l’onde n’atteint pas ce qui est loin', appel.epargne === 0, appel.epargne + ' dégâts à 400 px');

  /* --- Choupi : il va chercher --- */
  const choupi = await p.evaluate(async () => {
    Meta.profile.petMode = 'always';
    Meta.profile.pet = 'pet_choupi';
    Meta.save();
    UI.hideAll();
    Run.start({ character: 'char_gabriel', biome: 'biome_1', weapon: 'weapon_blade', skill: Content.skills()[0].id, seed: 7 });
    await new Promise(r => setTimeout(r, 1200));
    G.debug.invuln = true;
    G.enemies = [];
    Pickups.list = [];
    const pl = G.player;
    const ch = G.pets.find(x => x.id === 'pet_choupi');
    ch.x = pl.x - 34;
    ch.y = pl.y;
    /* une pièce à 200 px du joueur, 234 du chat : hors de sa portée d'aimant (140), dans son rayon de recherche (260) */
    Pickups.spawn(pl.x + 200, pl.y, 'coin', 1, { vx: 0, vy: 0 });
    const d0 = Math.hypot(ch.x - pl.x - 200, ch.y - pl.y);
    await new Promise(r => setTimeout(r, 350));
    const d1 = Pickups.list.length ? Math.hypot(ch.x - Pickups.list[0].x, ch.y - Pickups.list[0].y) : 0;
    const enCourse = !!ch.fetching;
    /* l'anneau de portée se dessine tant qu'il court : on compte ses appels à ellipse en le rendant à part */
    let ellipses = 0;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const orig = ctx.ellipse.bind(ctx);
    ctx.ellipse = (...a) => {
      ellipses++;
      return orig(...a);
    };
    ch.render(ctx);
    await new Promise(r => setTimeout(r, 1500));
    const ramasse = Pickups.list.length === 0;
    return { d0: Math.round(d0), d1: Math.round(d1), enCourse, ellipses, ramasse };
  });
  ok('Choupi court vers la pièce', choupi.enCourse && choupi.d1 < choupi.d0, `${choupi.d0} → ${choupi.d1} px`);
  ok('son anneau de portée se dessine en course', choupi.ellipses >= 2, choupi.ellipses + ' ellipses (anneau + ombre)');
  ok('la pièce finit dans la poche du joueur', choupi.ramasse);

  /* --- ORI : coup critique garanti sur la cible marquée, marque dessinée --- */
  const ori = await p.evaluate(async () => {
    Meta.profile.pet = 'pet_ori';
    Meta.save();
    UI.hideAll();
    Run.start({ character: 'char_jean', biome: 'biome_1', weapon: 'weapon_blade', skill: Content.skills()[0].id, seed: 4 });
    await new Promise(r => setTimeout(r, 1200));
    G.debug.invuln = true;
    G.enemies = [];
    const pl = G.player;
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, pl.x + 200, pl.y, {});
    e.hp = 99999;
    e.speed = 0;
    await new Promise(r => setTimeout(r, 2600));
    const marque = e.markUntil > Time.now && e.markCrit === true;
    let crits = 0;
    for (let i = 0; i < 20; i++) {
      const info = { silent: true };
      Combat.hitEnemy(e, 10, info);
      if (info.crit) crits++;
    }
    e.markUntil = 0;
    let critsSans = 0;
    for (let i = 0; i < 200; i++) {
      const info = { silent: true };
      Combat.hitEnemy(e, 10, info);
      if (info.crit) critsSans++;
    }
    e.markUntil = Time.now + 4;
    let losange = 0;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const orig = ctx.closePath.bind(ctx);
    ctx.closePath = () => {
      losange++;
      return orig();
    };
    G.pet.render(ctx);
    const jean = Content.character('char_jean');
    return { marque, crits, critsSans, losange, crit: +pl.stats.critChance.toFixed(2), trait: jean.trait.name };
  });
  ok('ORI marque, et chaque coup de Jean dessus est critique', ori.marque && ori.crits === 20, ori.crits + '/20 critiques');
  ok('sans la marque, les critiques redeviennent une chance', ori.critsSans < 100, ori.critsSans + '/200 critiques');
  ok('la marque se dessine au-dessus de la cible', ori.losange >= 1);
  ok('Jean a du sang-froid', ori.trait === 'Sang-froid' && ori.crit >= 0.15, ori.trait + ', crit ' + ori.crit);

  /* --- les caractères de Martin et Gabriel --- */
  const traits = await p.evaluate(() => {
    const m = Content.character('char_martin').trait,
      g = Content.character('char_gabriel').trait;
    return {
      martin: m.name,
      soin: m.hooks.onRoomStart && m.hooks.onRoomStart[0].effect,
      gabriel: g.name,
      pieges: g.mods[0].mul,
      fragments: g.hooks.passive && g.hooks.passive[0].effect,
    };
  });
  ok('Martin : Bonne constitution (soin à chaque salle)', traits.martin === 'Bonne constitution' && traits.soin === 'heal_on_room');
  ok(
    'Gabriel : Pied sûr (pièges ÷2, fragments ×2)',
    traits.gabriel === 'Pied sûr' && traits.pieges === 0.5 && traits.fragments === 'fragments_double'
  );

  /* --- reliques : un ennemi ordinaire peut en lâcher une, le mini-boss toujours --- */
  const reliques = await p.evaluate(() => {
    const pl = G.player;
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    let drops = 0;
    const N = 600;
    for (let i = 0; i < N; i++) {
      G.room.drops = 0;
      Pickups.list = [];
      const e = Room.spawnEnemy(def, pl.x + 300, pl.y, {});
      Pickups.maybeDrop(e);
      if (Pickups.list.some(x => x.kind === 'relic')) drops++;
      G.enemies = [];
    }
    Pickups.list = [];
    G.room.bossDead = false;
    const b = { x: pl.x + 200, y: pl.y, isBoss: true };
    Room.onBossDefeated(b);
    const boss = Pickups.list.filter(x => x.kind === 'relic').length;
    return { drops, N, boss, chance: BALANCE.relicDropChance };
  });
  ok(
    'un ennemi ordinaire lâche parfois une relique',
    reliques.drops > 0 && reliques.drops < reliques.N * 0.1,
    `${reliques.drops}/${reliques.N} (réglage ${reliques.chance})`
  );
  ok('le mini-boss lâche toujours une relique', reliques.boss === 1, reliques.boss + ' relique');

  /* --- Run.reset : rien ne traîne d'une partie à l'autre --- */
  const propre = await p.evaluate(async () => {
    Particles.spawn(300, 300, { count: 20 });
    Floaters.add(300, 300, '12', '#fff', 12);
    Projectiles.spawn({ x: 300, y: 300, vx: 0, vy: 0, damage: 1, owner: 'enemy', r: 4, life: 9 });
    const avant = { pets: G.pets.length, part: Particles.list.length, flot: Floaters.list.length, proj: Projectiles.list.length };
    Run.toHub();
    /* le hub relance aussitôt la salle d'attente (Attract) : G.room n'est donc pas vide, mais c'est la sienne */
    const hub = {
      pets: G.pets.length,
      part: Particles.list.length,
      flot: Floaters.list.length,
      proj: Projectiles.list.length,
      salle: G.room ? G.room.def.id : null,
    };
    return { avant, hub };
  });
  ok(
    'au retour au hub, compagnons, particules, chiffres et tirs sont effacés',
    propre.avant.pets > 0 &&
      propre.avant.part > 0 &&
      propre.hub.pets === 0 &&
      propre.hub.part === 0 &&
      propre.hub.flot === 0 &&
      propre.hub.proj === 0 &&
      propre.hub.salle !== 'room_1',
    JSON.stringify(propre.hub)
  );
});
