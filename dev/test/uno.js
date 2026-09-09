const { test, out } = require('./lib');
test(async ({ page: p, context, ok, entrer, salle, run, sansPause, erreurs: errs }) => {
  await entrer('test');
  const u = await p.evaluate(() => {
    const d = Content.pet('pet_uno');
    const i = Sprites.sheetInfo('pet_uno_walk');
    return {
      nom: d && d.name,
      comp: d && d.behavior,
      clips: d && Object.keys(d.anim),
      grille: i && `${i.cols}×${i.rows} de ${i.fw}px (${i.n} images)`,
      pieds: i && +(1 - i.foot).toFixed(3),
    };
  });
  ok('Uno est dans le jeu', u.nom === 'Uno' && u.comp === 'bite', `${u.nom} · ${u.comp} · clips ${(u.clips || []).join(', ')}`);
  ok('ses planches sont lues en 3×3 de 32 px', u.grille === '3×3 de 32px (9 images)', u.grille);

  const paire = await p.evaluate(() => {
    const pr = Content.pairOf('char_martin', 'pet_uno');
    return { nom: pr && pr.name, mul: pr && pr.petDamageMul, mods: pr && pr.mods.length };
  });
  ok(
    "l'équipe Martin + Uno est déclarée",
    paire.nom === 'Vieille complicité',
    `${paire.nom} · ×${paire.mul} pour Uno · ${paire.mods} bonus joueur`
  );

  /* mode « tout le temps » + paire */
  const ens = await p.evaluate(async () => {
    Meta.profile.character = 'char_martin';
    Meta.profile.pet = 'pet_uno';
    Meta.profile.petMode = 'always';
    Meta.save();
    UI.hideAll();
    Run.start({ character: 'char_martin', biome: 'biome_1', weapon: 'weapon_blade', skill: Content.skills()[0].id, seed: 5 });
    await new Promise(r => setTimeout(r, 1600));
    return {
      pet: G.pet && G.pet.id,
      mode: G.pet && G.pet.mode,
      pairMul: G.pet && G.pet.pairMul,
      vitesse: Math.round(G.player.stats.speed),
      buff: G.player.buffs.some(x => x.id === 'pair'),
    };
  });
  ok('Uno entre avec Martin', ens.pet === 'pet_uno' && ens.mode === 'always');
  ok("l'équipe donne son bonus aux deux", ens.pairMul === 1.3 && ens.buff, `Uno ×${ens.pairMul}, joueur à ${ens.vitesse} de vitesse`);

  const dmg = await p.evaluate(() => {
    const base = Math.round(G.pet.def.damage * G.player.stats.damage);
    return { avec: G.pet.dmg(), base };
  });
  ok("la morsure d'Uno est bien majorée", dmg.avec > dmg.base, `${dmg.avec} au lieu de ${dmg.base}`);

  /* les planches d'Uno tournent */
  const anim = await p.evaluate(() => {
    const emp = (clip, t) => {
      const c = document.createElement('canvas');
      c.width = c.height = 120;
      const g = c.getContext('2d');
      const inf = Sprites.sheetInfo(G.pet.def.anim[clip]);
      const f = Math.floor(t * Sprites.CLIPS[clip].fps) % inf.n;
      Sprites.drawSheet(g, G.pet.def.anim[clip], f, 60, 90, 64, { foot: true });
      const d = g.getImageData(0, 0, 120, 120).data;
      let h = 2166136261;
      for (let i = 0; i < d.length; i += 4) {
        h ^= d[i] + d[i + 3] * 7 + i;
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };
    const marche = [0, 0.09, 0.18, 0.27, 0.36, 0.45, 0.54, 0.63, 0.72].map(t => emp('walk', t));
    return { distincts: new Set(marche).size };
  });
  ok('ses neuf images de marche défilent', anim.distincts === 9, anim.distincts + ' images distinctes');

  const clip = await p.evaluate(async () => {
    const out = {};
    G.pet.animStep(0.016, false);
    out.arret = G.pet.clip;
    for (let i = 0; i < 3; i++) G.pet.animStep(0.016, true);
    out.marche = G.pet.clip;
    G.pet.act = 1;
    G.pet.animStep(0.016, false);
    out.action = G.pet.clip; // il a sa planche d'attaque depuis peu
    return out;
  });
  ok(
    "ses clips suivent ce qu'il fait",
    clip.arret === 'idle' && clip.marche === 'walk' && clip.action === 'attack',
    `arrêt ${clip.arret} · marche ${clip.marche} · morsure ${clip.action}`
  );

  /* mode « à l'appel » */
  const appel = await p.evaluate(async () => {
    Pets.setMode('call');
    const absent = { away: G.pet.away, visible: false };
    const avant = G.pet.dmg();
    const e0 = G.pet.every();
    const refus = G.pet.call === undefined ? null : ((G.pet.cdT = 5), G.pet.call());
    G.pet.cdT = 0;
    const venu = G.pet.call();
    return {
      absent: absent.away,
      refus,
      venu,
      boost: G.pet.boost,
      dmgAvant: avant,
      dmgApres: G.pet.dmg(),
      cadenceAvant: e0,
      cadenceApres: G.pet.every(),
      presence: Math.round(G.pet.callT),
    };
  });
  ok('en mode appel il commence absent', appel.absent);
  ok('il refuse de venir pendant son repos', appel.refus === false);
  ok(
    'appelé, il arrive plus fort et plus vite',
    appel.venu && appel.dmgApres > appel.dmgAvant && appel.cadenceApres < appel.cadenceAvant,
    `${appel.dmgAvant} → ${appel.dmgApres} dégâts, toutes les ${appel.cadenceAvant} → ${appel.cadenceApres} temps, pour ${appel.presence} s`
  );

  const repos = await p.evaluate(async () => {
    G.pet.callT = 0.01;
    G.pet.update(0.05);
    return { away: G.pet.away, cd: Math.round(G.pet.cdT), boost: G.pet.boost };
  });
  ok('sa présence expire et il se repose', repos.away && repos.cd > 0 && repos.boost === 1, `repos de ${repos.cd} s`);

  /* mode « personne » */
  const seul = await p.evaluate(async () => {
    Meta.profile.petMode = 'none';
    Meta.save();
    UI.hideAll();
    Run.start({ character: 'char_martin', biome: 'biome_1', weapon: 'weapon_blade', skill: Content.skills()[0].id, seed: 5 });
    await new Promise(r => setTimeout(r, 1400));
    return { pet: !!G.pet, buff: G.player.buffs.some(x => x.id === 'solo'), pv: Math.round(G.player.stats.maxHp) };
  });
  ok("« personne » ne donne pas d'animal mais compense", !seul.pet && seul.buff, seul.pv + ' PV avec la part gardée');

  const survit = await p.evaluate(async () => {
    const av = G.player.buffs.some(x => x.id === 'solo');
    Debug.gotoRoom(2);
    await new Promise(r => setTimeout(r, 900));
    return { av, ap: G.player.buffs.some(x => x.id === 'solo') };
  });
  ok("le bonus tient d'une salle à l'autre", survit.av && survit.ap, 'toute la run, pas une salle');

  await p.evaluate(async () => {
    Meta.profile.petMode = 'always';
    Meta.save();
    UI.hideAll();
    Run.start({ character: 'char_martin', biome: 'biome_1', weapon: 'weapon_blade', skill: Content.skills()[0].id, seed: 5 });
    await new Promise(r => setTimeout(r, 1400));
    G.debug.invuln = true;
    G.enemies = [];
    G.player.x = 320;
    G.player.y = 360;
    G.pet.x = 400;
    G.pet.y = 370;
    G.pet.clip = 'walk';
    G.pet.clipT = 0.2;
  });
  await p.waitForTimeout(800);
  await p.screenshot({ path: out('uno_jeu.png') });
});
