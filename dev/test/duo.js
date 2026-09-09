const { test, out } = require('./lib');
test(async ({ page: p, context, ok, entrer, salle, run, sansPause, erreurs: errs }) => {
  await p.evaluate(() => { try { localStorage.clear(); } catch(e){} });
  await p.reload(); await p.waitForTimeout(2200); await entrer('normal');
  const roster = await p.evaluate(() => ({
    chars: Content.characters().map(c => c.name),
    pets: Content.pets().map(x => x.name + (x.hidden ? ' (inséparable)' : '')),
    boutique: (() => { const t = [...document.querySelectorAll('.tab')].find(x => x.dataset.tab === 'animaux'); t.click(); return [...document.querySelectorAll('#hub-shop .card.pet .cardtitle span:first-child')].map(e => e.textContent); })(),
    equipes: Content.pairs().map(pr => pr.name),
  }));
  ok('les trois personnages sont là', roster.chars.includes('Martin') && roster.chars.includes('Gabriel') && roster.chars.includes('Jean'), roster.chars.join(' · '));
  ok('les quatre animaux sont là', roster.pets.length === 4, roster.pets.join(' · '));
  ok('la boutique n\'offre pas Tanuki tout seul', roster.boutique.length === 3 && roster.boutique.includes('Choupi & Tanuki') && !roster.boutique.includes('Tanuki'), roster.boutique.join(' | '));
  ok('les trois équipes sont déclarées', roster.equipes.length === 3, roster.equipes.join(' · '));

  /* le duo arrive à deux */
  const duo = await p.evaluate(async () => {
    Meta.profile.character = 'char_gabriel'; Meta.profile.pet = 'pet_choupi'; Meta.profile.petMode = 'always'; Meta.save();
    UI.hideAll(); Run.start({ character: 'char_gabriel', biome: 'biome_1', weapon: 'weapon_blade', skill: Content.skills()[0].id, seed: 4 });
    await new Promise(r => setTimeout(r, 1600));
    return { n: G.pets.length, noms: G.pets.map(x => x.name), comportements: G.pets.map(x => x.def.behavior), meneur: G.pet && G.pet.name, muls: G.pets.map(x => x.pairMul) };
  });
  ok('choisir Choupi amène aussi Tanuki', duo.n === 2 && duo.noms.join(',') === 'Choupi,Tanuki', duo.noms.join(' + ') + ' — ' + duo.comportements.join(' + '));
  ok('le bonus d\'équipe vaut pour les deux', duo.muls.every(m => m === 1.3), 'chacun ×' + duo.muls[0]);

  const gain = await p.evaluate(() => ({ credits: +G.player.stats.coinGain.toFixed(2), buff: G.player.buffs.some(b => b.id === 'pair') }));
  ok('Gabriel reçoit sa part de « La maisonnée »', gain.buff && gain.credits > 1, '×' + gain.credits + ' sur les crédits');

  /* les deux vivent vraiment : ils bougent, et l'un des deux charge */
  const vie = await p.evaluate(async () => {
    G.debug.invuln = true; G.enemies = [];
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, G.player.x + 260, G.player.y, {}); e.hp = 99999; e.speed = 0;
    /* un compagnon de suite ne bouge que si le joueur bouge : on le déplace pour de bon */
    const p0 = G.pets.map(x => ({ x: x.x, y: x.y }));
    G.player.x += 260; G.player.y += 90;
    Pickups.list = []; for (let i = 0; i < 4; i++) Pickups.spawn(G.player.x + 120 + i * 10, G.player.y + 60, 'coin', 1);
    let roula = false; const id = setInterval(() => { if (G.pets.some(x => x.state === 'roll')) roula = true; }, 30);
    await new Promise(r => setTimeout(r, 6000)); clearInterval(id);
    const pres = G.pets.map(x => Math.round(Math.hypot(x.x - G.player.x, x.y - G.player.y)));
    return { bougé: G.pets.filter((x, i) => Math.hypot(x.x - p0[i].x, x.y - p0[i].y) > 20).length, pres, roula,
             aimantés: Pickups.list.filter(x => x.magnet).length, restants: Pickups.list.length, degats: Math.round(99999 - e.hp) };
  });
  ok('les deux suivent le joueur qui se déplace', vie.bougé === 2, `à ${vie.pres.join(' et ')} px de lui`);
  ok('Tanuki charge et blesse', vie.roula && vie.degats > 0, vie.degats + ' dégâts');
  ok('Choupi aimante ce qui traîne', vie.aimantés > 0 || vie.restants === 0, vie.restants === 0 ? 'les 4 pièces sont déjà ramassées' : vie.aimantés + ' ramassables attirés');

  /* ORI avec Jean */
  const ori = await p.evaluate(async () => {
    Meta.profile.character = 'char_jean'; Meta.profile.pet = 'pet_ori'; Meta.save();
    UI.hideAll(); Run.start({ character: 'char_jean', biome: 'biome_1', weapon: 'weapon_blade', skill: Content.skills()[0].id, seed: 4 });
    await new Promise(r => setTimeout(r, 1500));
    G.debug.invuln = true; G.enemies = [];
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, G.player.x + 200, G.player.y, {}); e.hp = 99999; e.speed = 0;
    await new Promise(r => setTimeout(r, 2600));
    const marque = e.markUntil > Time.now;
    const hp0 = e.hp; Combat.hitEnemy(e, 100, { noCrit: true, silent: true }); const avec = hp0 - e.hp;
    e.markUntil = 0; const hp1 = e.hp; Combat.hitEnemy(e, 100, { noCrit: true, silent: true }); const sans = hp1 - e.hp;
    return { n: G.pets.length, marque, avec: Math.round(avec), sans: Math.round(sans), dmg: +G.player.stats.damage.toFixed(2) };
  });
  ok('ORI vient seul', ori.n === 1);
  ok('il désigne, et la cible encaisse plus', ori.marque && ori.avec > ori.sans, `${ori.avec} contre ${ori.sans}`);
  ok('Jean reçoit sa part d\'« Œil pour œil »', ori.dmg > 1, '×' + ori.dmg + ' de dégâts');

  /* mode appel avec un duo : les deux partent et reviennent ensemble */
  const appel = await p.evaluate(async () => {
    Meta.profile.character = 'char_gabriel'; Meta.profile.pet = 'pet_choupi'; Meta.profile.petMode = 'call'; Meta.save();
    UI.hideAll(); Run.start({ character: 'char_gabriel', biome: 'biome_1', weapon: 'weapon_blade', skill: Content.skills()[0].id, seed: 4 });
    await new Promise(r => setTimeout(r, 1500));
    const absents = G.pets.every(x => x.hidden());
    for (const x of G.pets) x.call();
    return { absents, présents: G.pets.filter(x => !x.hidden()).length, boosts: G.pets.map(x => x.boost) };
  });
  ok('en mode appel le duo attend à deux', appel.absents);
  ok('appelé, il revient à deux et boosté', appel.présents === 2 && appel.boosts.every(x => x > 1), 'chacun ×' + appel.boosts[0]);

  await p.evaluate(async () => {
    Meta.profile.petMode = 'always'; Meta.save(); UI.hideAll();
    Run.start({ character: 'char_gabriel', biome: 'biome_1', weapon: 'weapon_blade', skill: Content.skills()[0].id, seed: 4 });
    await new Promise(r => setTimeout(r, 1400));
    G.debug.invuln = true; G.enemies = []; G.player.x = 330; G.player.y = 360;
    G.pets[0].x = 400; G.pets[0].y = 340; G.pets[1].x = 400; G.pets[1].y = 400;
  });
  await p.waitForTimeout(800); await p.screenshot({ path: out('duo.png') });
  });
