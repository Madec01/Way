/* La couche tactile sur un téléphone simulé : joystick, tir maintenu, compétence, pause. */
const { test, out } = require('./lib');
test(async ({ page, context, ok, url }) => {
  await page.goto(url); await page.waitForTimeout(1200);
  const splash = await page.$('.menuscreen.splash'); if (splash) { await splash.tap(); await page.waitForTimeout(2700); }
  await page.tap('#btn-test'); await page.waitForTimeout(500);
  await page.tap('#hub-enter'); await page.waitForTimeout(500);
  await page.screenshot({ path: out('touch_prep.png') });
  await page.tap('[data-s]'); await page.tap('#prep-go'); await page.waitForTimeout(1200);
  const couche = await page.evaluate(() => ({ hidden: document.getElementById('touch').hidden, active: Input.touch.active, overlay: G.overlay }));
  ok('la couche tactile est active en salle', couche.active && !couche.hidden, JSON.stringify(couche));

  const cdp = await context.newCDPSession(page);
  const tp = async (type, x, y, id) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id }] });
  const x0 = await page.evaluate(() => G.player.x);
  await tp('touchStart', 150, 300, 1); await page.waitForTimeout(50);
  for (let i = 1; i <= 8; i++) { await tp('touchMove', 150 + i * 8, 300, 1); await page.waitForTimeout(40); }
  await page.waitForTimeout(500);
  const x1 = await page.evaluate(() => G.player.x);
  ok('le joystick déplace vers la droite', x1 > x0 + 40, `${x0.toFixed(0)} → ${x1.toFixed(0)}`);
  await page.screenshot({ path: out('touch_jeu.png') });
  await tp('touchEnd', 0, 0, 1); await page.waitForTimeout(100);

  const bouton = async (sel, id, ms) => { const b = await page.$(sel); const bb = await b.boundingBox(); await tp('touchStart', bb.x + bb.width / 2, bb.y + bb.height / 2, id); await page.waitForTimeout(ms); await tp('touchEnd', 0, 0, id); await page.waitForTimeout(200); };
  await bouton('#t-fire', 2, 700);
  ok('le bouton de tir maintenu tire', (await page.evaluate(() => G.run.stats.shots)) > 0);
  await bouton('#t-skill', 3, 80);
  ok('le bouton de compétence la déclenche', (await page.evaluate(() => G.run.stats.skillUses)) > 0);
  await bouton('#t-pause', 4, 80);
  const ps = await page.evaluate(() => ({ overlay: G.overlay, cache: document.getElementById('touch').hidden }));
  ok('le bouton pause ouvre la pause et cache la couche', ps.overlay === 'pause' && ps.cache, JSON.stringify(ps));
  await page.screenshot({ path: out('touch_pause.png') });
}, { mobile: true });
