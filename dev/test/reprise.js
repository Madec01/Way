/* Deux retours de l'auteur après le chantier 10 : les salles de la Serre « trop zoomées, la porte de droite invisible »
   et la musique qui ne repart pas. Ce test mesure : le zoom de scène de la mort (1,3) ou de la victoire (1,15) ne survit
   pas à l'entrée de salle suivante ; le cadrage ne montre jamais au-delà de la salle quel que soit le zoom en cours,
   la porte de droite reste visible quand on va tout à droite ; une partie repartie pendant que la bande « meurt »
   rattrape la musique au lieu de croire qu'elle joue déjà. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, run, salle, erreurs }) => {
  await entrer('test');
  await p.waitForTimeout(800);
  await run({ character: 'char_martin', pet: 'pet_uno' });
  await p.waitForTimeout(1500);

  const cadrage = await p.evaluate(() => {
    const pl = G.player;
    Camera.setZoom(1.5);
    Camera.zoomFx = 1.3;
    Camera.zoomFxTarget = 1.3;
    pl.x = ROOM_X + ROOM_W - 10;
    pl.y = ROOM_Y + ROOM_H / 2;
    Camera.snap(pl.x, pl.y);
    const v = Engine.view;
    const z = Camera.effectiveZoom();
    const droite = Camera.x + v.w / (2 * z);
    const porte = ROOM_X + ROOM_W + TILE;
    const visible = droite >= porte - 1 && droite <= W + 1;
    Camera.zoomFx = 1;
    Camera.zoomFxTarget = 1;
    return { z, droite, porte, visible };
  });
  ok(
    'le cadrage tient compte du zoom de scène : tout à droite, la porte est dans l’écran et rien au-delà de la salle',
    cadrage.visible,
    JSON.stringify(cadrage)
  );

  await p.evaluate(() => Camera.zoomTo(1.15, 100));
  await p.waitForTimeout(400);
  const avant = await p.evaluate(() => Camera.zoomFx);
  await salle(2);
  const apres = await p.evaluate(() => ({ fx: Camera.zoomFx, cible: Camera.zoomFxTarget, focus: Camera.focus }));
  ok(
    'le zoom de scène (victoire 1,15) est remis à 1 à l’entrée de salle',
    avant > 1.1 && apres.fx === 1 && apres.cible === 1 && !apres.focus,
    JSON.stringify({ avant, apres })
  );

  /* la mort puis « Repartir tout de suite » : zoom 1,3 pendant la scène, 1 dans la partie suivante ; la musique repart */
  await p.evaluate(() => {
    G.debug.invuln = false;
    G.player.invulnUntil = 0;
    G.player.shield = 0;
    G.player.secondChanceUsed = true; // le mode test offre une seconde chance : on la saute
    G.player.stats.dodge = 0;
    G.player.hp = 1;
    Combat.hitPlayer(999, { type: 'contact' });
  });
  await p.waitForTimeout(600);
  const scene = await p.evaluate(() => ({ dead: G.player.dead, cible: Camera.zoomFxTarget }));
  const fin = await p
    .waitForFunction(() => G.overlay === 'end', null, { timeout: 15000 })
    .then(
      () => true,
      () => false
    );
  ok('la mort zoome la scène à 1,3 et mène à l’écran de fin', scene.dead && scene.cible === 1.3 && fin, JSON.stringify(scene));
  await p.waitForTimeout(300);
  await p.click('#end-again');
  await p.waitForTimeout(1200);
  const rep = await p.evaluate(() => ({ state: G.state, salle: G.room && G.room.index, fx: Camera.zoomFx, cible: Camera.zoomFxTarget }));
  ok(
    '« Repartir tout de suite » : la nouvelle partie commence au zoom de scène 1',
    rep.state === 'run' && rep.salle === 1 && rep.fx === 1 && rep.cible === 1,
    JSON.stringify(rep)
  );
  await p.waitForTimeout(4000);
  const mus = await p.evaluate(() => ({ playing: Music.isPlaying(), st: AudioEngine.musicState() }));
  ok('la musique joue dans la partie repartie (la bande qui mourait a été rattrapée)', mus.playing, JSON.stringify(mus.st));

  const direct = await p.evaluate(async () => {
    const attendre = ms => new Promise(r => setTimeout(r, ms));
    Music.dying(2.2);
    await attendre(300);
    Music.play('biome');
    await attendre(3200);
    return { playing: Music.isPlaying(), st: AudioEngine.musicState() };
  });
  ok(
    'Music.play pendant la mort de la bande : la piste continue au lieu de s’éteindre',
    direct.playing && direct.st.el && !direct.st.el.paused,
    JSON.stringify(direct.st)
  );
  ok('aucune erreur JS', erreurs.length === 0, erreurs.join(' | '));
});
