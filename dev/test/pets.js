const { test, out } = require('./lib');
test(async ({ page: p, context, ok, entrer, salle, run, sansPause, erreurs: errs }) => {
  await entrer('test');
  /* Le jeu ne livre plus aucun compagnon (ils se créent dans l'atelier « Amis »). Ce sont les COMPORTEMENTS
     du moteur qu'on vérifie ici : on injecte un compagnon d'essai par comportement, comme le ferait l'atelier. */
  const list = await p.evaluate(() => {
    const T = {
      pet_faucon: { behavior:'strike', fly:true, damage:26, every:2, range:360, speed:300, diveSpeed:660, size:32 },   // cadence resserrée pour le test : c'est le piqué qu'on vérifie, pas l'attente
      pet_chien: { behavior:'bite', damage:14, every:4, range:280, speed:320, taunt:230, hp:90, revive:6, size:34 },
      pet_serpent: { behavior:'spit', damage:9, every:2, range:340, speed:250, projSpeed:480, size:30 },
      pet_scarabee: { behavior:'collect', damage:0, every:4, radius:260, speed:280, size:28 },
      pet_tortue: { behavior:'guard', damage:0, every:1, block:2, dist:56, spin:1.7, size:30 },
      pet_crapaud: { behavior:'mend', damage:0, every:4, heal:4, speed:230, size:30 },
      pet_tatou: { behavior:'charge', damage:18, every:4, range:420, speed:240, rollSpeed:560, rollTime:0.8, size:32 },
      pet_chouette: { behavior:'mark', fly:true, damage:0, every:4, range:420, markTime:4, markMul:1.3, speed:280, size:30 },
      pet_abeille: { behavior:'sting', fly:true, damage:5, every:1, range:320, speed:440, orbit:26, spin:5, size:24 },
    };
    CONTENT.pets = Object.keys(T).map(id => Object.assign({ id, name: id, sprite: 'frog', color: '#9fd8ff', desc: '', tag: '' }, T[id]));
    Content.invalidate();
    return Content.pets().map(x => x.id + ':' + x.behavior);
  });
  ok('les neuf comportements du moteur sont instanciables', list.length === 9, list.join(' '));
  const cov = await p.evaluate(() => ({ manque: PET_BEHAVIORS.filter(b => !Content.pets().some(p2 => p2.behavior === b)), total: PET_BEHAVIORS.length }));
  ok('chaque comportement déclaré est couvert', cov.manque.length === 0, cov.manque.length ? 'non couverts : ' + cov.manque.join(', ') : cov.total + ' comportements');

  await p.evaluate(() => {
    document.querySelector('#d-biome').value = 'biome_1'; Debug.gotoRoom(2); Debug.hide(); G.debug.invuln = true;
    /* Le jeu se met en pause dès qu'un écran de choix s'ouvre (montée de niveau, coffre). Les compagnons tuent
       pendant qu'on les observe : sans ça la simulation se fige au milieu d'une mesure et le test mesure du vide. */
    setInterval(() => { if (G.paused && G.state === 'run') { if (UI.hideChoice) UI.hideChoice(); G.paused = false; } }, 50);
  });
  await p.waitForTimeout(1200);

  // --- faucon : il pique et fait des dégâts ---
  const faucon = await p.evaluate(async () => {
    Pets.give('pet_faucon'); G.player.x = 400; G.player.y = 360;
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, 620, 360, {}); e.hp = 9999; e.speed = 0; const hp0 = e.hp;
    await new Promise(r => setTimeout(r, 9000));   // le faucon pique toutes les 2 mesures : il faut laisser passer une fenêtre
    return { degats: hp0 - e.hp, dist: Math.round(Math.hypot(G.pet.x - G.player.x, G.pet.y - G.player.y)), vol: G.pet.airborne };
  });
  ok('le faucon pique et blesse', faucon.degats > 0, faucon.degats + ' dégâts en 9 s');

  // --- tortue : elle brise les tirs ennemis ---
  const tortue = await p.evaluate(async () => {
    Pets.give('pet_tortue'); G.enemies = []; Projectiles.list = [];
    let brises = 0; const n0 = 40;
    for (let i = 0; i < n0; i++) { const a = i * Math.PI * 2 / n0; Projectiles.spawn({ x: G.player.x + Math.cos(a) * 90, y: G.player.y + Math.sin(a) * 90, vx: -Math.cos(a) * 120, vy: -Math.sin(a) * 120, r: 5, damage: 1, owner: 'enemy', life: 4, color: '#f00' }); }
    await new Promise(r => setTimeout(r, 2500));
    brises = n0 - Projectiles.list.filter(x => x.owner === 'enemy').length;
    return { brises };
  });
  ok('la tortue brise des tirs', tortue.brises > 0, tortue.brises + ' projectiles brisés');

  // --- crapaud : il soigne sur le temps fort ---
  const crapaud = await p.evaluate(async () => {
    Pets.give('pet_crapaud'); G.debug.invuln = true; G.player.hp = 40;
    const h0 = G.player.hp; await new Promise(r => setTimeout(r, 5000));
    return { gagne: Math.round(G.player.hp - h0) };
  });
  ok('le crapaud soigne', crapaud.gagne > 0, '+' + crapaud.gagne + ' PV en 5 s');

  // --- scarabée : il aimante les ramassables ---
  const scara = await p.evaluate(async () => {
    /* témoin : sans compagnon, des pièces posées loin ne bougent pas ; avec le scarabée, elles sont aimantées */
    Pets.clear(); Pickups.list = [];
    for (let i = 0; i < 6; i++) Pickups.spawn(G.player.x + 210 + i * 10, G.player.y + 120, 'coin', 1);
    await new Promise(r => setTimeout(r, 400));
    const sans = Pickups.list.filter(x => x.magnet).length;
    Pets.give('pet_scarabee'); G.pet.x = G.player.x + 200; G.pet.y = G.player.y + 110;
    await new Promise(r => setTimeout(r, 600));
    /* aimantée puis ramassée : au bout de 600 ms la pièce peut avoir déjà quitté la liste — les deux comptent */
    const avec = Pickups.list.filter(x => x.magnet).length + (6 - Pickups.list.length);
    return { sans, avec, total: Pickups.list.length };
  });
  ok('le scarabée aimante ce qui traîne', scara.sans === 0 && scara.avec > 0, `sans lui ${scara.sans} aimantée(s), avec lui ${scara.avec}/6`);

  // --- chien : il attire les ennemis et peut être assommé ---
  const chien = await p.evaluate(async () => {
    Pets.give('pet_chien'); G.enemies = []; Pickups.list = [];
    G.player.x = 300; G.player.y = 360; G.pet.x = 640; G.pet.y = 360;
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, 700, 360, {}); e.hp = 9999;
    await new Promise(r => setTimeout(r, 400));
    const cible = e.pickTarget() === G.pet;
    G.pet.hurt(999);
    return { cible, sonne: G.pet.down, pv: G.pet.maxHp };
  });
  ok('le chien attire l\'ennemi le plus proche', chien.cible, 'cible = compagnon : ' + chien.cible);
  ok('le chien est assommé, pas perdu', chien.sonne && chien.pv === 90, 'PV max ' + chien.pv);

  // --- serpent : il tire des projectiles alliés ---
  const serpent = await p.evaluate(async () => {
    Pets.give('pet_serpent'); Projectiles.list = []; G.enemies = [];
    G.player.x = 400; G.player.y = 360;
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, 560, 360, {}); e.hp = 9999; e.speed = 0;
    let n = 0; const s = Projectiles.spawn.bind(Projectiles); Projectiles.spawn = o => { if (o.owner === 'player') n++; return s(o); };
    await new Promise(r => setTimeout(r, 6000)); Projectiles.spawn = s;   // il crache toutes les 2 mesures : 3 s peuvent ne rien contenir
    return { n };
  });
  ok('le serpent crache', serpent.n > 0, serpent.n + ' gerbes en 6 s');

  // --- il suit d'une salle à l'autre ---
  const suite = await p.evaluate(async () => {
    Pets.give('pet_faucon'); Debug.gotoRoom(4); await new Promise(r => setTimeout(r, 1500));
    return { garde: !!G.pet && G.pet.id === 'pet_faucon', pres: Math.round(Math.hypot(G.pet.x - G.player.x, G.pet.y - G.player.y)) };
  });
  ok('le compagnon franchit la porte', suite.garde && suite.pres < 200, 'à ' + suite.pres + ' px du joueur');

  // --- ramassable ---
  const drop = await p.evaluate(async () => {
    Pets.clear(); Pickups.list = [];
    Pickups.spawn(G.player.x + 60, G.player.y, 'pet', 1, { pet: 'pet_tortue' });
    await new Promise(r => setTimeout(r, 200));
    const avant = !!G.pet; G.player.x = Pickups.list[0].x; G.player.y = Pickups.list[0].y;
    await new Promise(r => setTimeout(r, 800));
    return { avant, apres: G.pet && G.pet.id };
  });
  ok('un compagnon se ramasse au sol', !drop.avant && drop.apres === 'pet_tortue', String(drop.apres));

  await p.evaluate(() => { Pets.give('pet_chien'); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: out('pets.png') });
  });
