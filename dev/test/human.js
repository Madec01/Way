/* Une partie au clavier et à la souris, en mode Normal : bouger, tirer, compétence, pause, mort, crédits, achat. */
const { test, out } = require('./lib');
test(async ({ page, ok, entrer }) => {
  await entrer('normal');
  const hub = await page.evaluate(() => ({
    coins: Meta.coins,
    weapons: Meta.profile.weapons.length,
    chars: Meta.profile.characters.length,
    mode: G.mode,
  }));
  ok("le hub s'ouvre en mode Normal", hub.mode === 'normal', `${hub.coins} crédits · ${hub.weapons} armes · ${hub.chars} personnages`);
  await page.click('#hub-enter');
  await page.waitForTimeout(900);
  const prep = await page.$('[data-s]');
  if (!ok("l'écran de préparation propose une compétence", !!prep)) return;
  await page.click('[data-s]');
  await page.click('#prep-go');
  await page.waitForTimeout(1200);

  const p0 = await page.evaluate(() => G.player.x);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(400);
  await page.keyboard.up('KeyD');
  const p1 = await page.evaluate(() => G.player.x);
  ok('la touche D déplace vers la droite', p1 > p0 + 50, `${p0.toFixed(0)} → ${p1.toFixed(0)}`);

  await page.mouse.move(900, 360);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  const tirs = await page.evaluate(() => G.run.stats.shots);
  ok('le clic gauche tire', tirs > 0, tirs + ' tirs');

  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  const comp = await page.evaluate(() => G.run.stats.skillUses);
  ok('Espace déclenche la compétence', comp > 0, comp + ' usage(s)');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const pause = await page.evaluate(() => ({ paused: G.paused, overlay: G.overlay }));
  ok('Échap met en pause', pause.overlay === 'pause' && pause.paused);
  await page.screenshot({ path: out('human_pause.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  ok('Échap reprend', !(await page.evaluate(() => G.paused)));

  /* mort forcée : 50 crédits consignés + 10 % des 100 en attente */
  await page.evaluate(() => {
    G.run.coinsPending = 100;
    G.run.coinsValidated = 50;
    G.player.hp = 1;
    Combat.hitPlayer(999, { type: 'contact' });
  });
  await page.waitForTimeout(400);
  const fin = await page.evaluate(() => ({ overlay: G.overlay, coins: Meta.coins, deaths: Meta.profile.deaths }));
  ok(
    'la mort garde 50 + 10 % de 100 = 60 crédits',
    fin.overlay === 'end' && fin.coins === 60,
    `${fin.coins} crédits, ${fin.deaths} mort(s)`
  );
  await page.screenshot({ path: out('human_fin.png') });

  await page.reload();
  await page.waitForTimeout(800);
  const apres = await page.evaluate(() => ({ coins: Meta.coins, runs: Meta.profile.runs }));
  ok('les crédits survivent au rechargement', apres.coins === 60, `${apres.coins} crédits, ${apres.runs} run(s)`);

  await entrer('normal');
  const achat = await page.evaluate(() => {
    const r = Meta.buy('meta_vitalite');
    return { r, tier: Meta.tierOf('meta_vitalite'), coins: Meta.coins };
  });
  ok('on peut acheter Vitalité palier 1 avec 60 crédits', achat.r && achat.tier === 1, `reste ${achat.coins} crédits`);
});
