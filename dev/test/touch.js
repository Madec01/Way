/* La couche tactile sur un téléphone simulé : joystick, tir maintenu, compétence, pause. */
const { test, out } = require('./lib');
test(
  async ({ page, context, ok, url }) => {
    await page.goto(url);
    await page.waitForTimeout(1200);
    const splash = await page.$('.menuscreen.splash');
    if (splash) {
      await splash.tap();
      await page.waitForTimeout(2700);
    }
    await page.tap('#btn-test');
    await page.waitForTimeout(500);
    await page.tap('#hub-enter');
    await page.waitForTimeout(500);
    await page.screenshot({ path: out('touch_prep.png') });
    await page.tap('[data-s]');
    await page.tap('#prep-go');
    await page.waitForTimeout(1200);
    const couche = await page.evaluate(() => ({
      hidden: document.getElementById('touch').hidden,
      active: Input.touch.active,
      overlay: G.overlay,
    }));
    ok('la couche tactile est active en salle', couche.active && !couche.hidden, JSON.stringify(couche));

    const cdp = await context.newCDPSession(page);
    const tp = async (type, x, y, id) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id }] });
    const x0 = await page.evaluate(() => G.player.x);
    await tp('touchStart', 150, 300, 1);
    await page.waitForTimeout(50);
    for (let i = 1; i <= 8; i++) {
      await tp('touchMove', 150 + i * 8, 300, 1);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(500);
    const x1 = await page.evaluate(() => G.player.x);
    ok('le joystick déplace vers la droite', x1 > x0 + 40, `${x0.toFixed(0)} → ${x1.toFixed(0)}`);
    await page.screenshot({ path: out('touch_jeu.png') });
    await tp('touchEnd', 0, 0, 1);
    await page.waitForTimeout(100);

    const bouton = async (sel, id, ms) => {
      const b = await page.$(sel);
      const bb = await b.boundingBox();
      await tp('touchStart', bb.x + bb.width / 2, bb.y + bb.height / 2, id);
      await page.waitForTimeout(ms);
      await tp('touchEnd', 0, 0, id);
      await page.waitForTimeout(200);
    };
    await bouton('#t-fire', 2, 700);
    ok('le bouton de tir maintenu tire', (await page.evaluate(() => G.run.stats.shots)) > 0);
    await bouton('#t-skill', 3, 80);
    ok('le bouton de compétence la déclenche', (await page.evaluate(() => G.run.stats.skillUses)) > 0);
    /* --- le pouce (I-8) : l'esquive, les cibles, l'échelle du HUD, le joystick au repos, le tir translucide, la pause hors de la prise --- */
    /* sans déplacement, le pas part du côté où le joueur regarde ; un tonneau peut l'arrêter net,
       donc on lit le pas lui-même (110 px en 0,14 s) à l'instant où il part, puis le délai après */
    await page.evaluate(() => {
      G.enemies = [];
    });
    const bd = await (await page.$('#t-dodge')).boundingBox();
    await tp('touchStart', bd.x + bd.width / 2, bd.y + bd.height / 2, 5);
    await page.waitForTimeout(30);
    const esquive = await page.evaluate(() => {
      const h = G.player.hop;
      return { d: h ? Math.round(Math.hypot(h.vx, h.vy) * h.dur) : G.player.dashing ? 999 : 0 };
    });
    await tp('touchEnd', 0, 0, 5);
    await page.waitForTimeout(250);
    esquive.cd = await page.evaluate(() => G.player.hopCd > 0 || G.player.skillCd > 0);
    ok('le bouton ESQ. fait un pas de côté (ou la ruée si c’est la compétence)', esquive.d >= 60 && esquive.cd, `${esquive.d} px`);
    const pouce = await page.evaluate(() => {
      const V = Engine.view;
      const boutons = [...document.querySelectorAll('#touch .tbtn')].map(b => {
        const r = b.getBoundingClientRect();
        return { id: b.id, w: Math.round(r.width), h: Math.round(r.height), top: r.top, bottom: r.bottom };
      });
      const H = innerHeight;
      const prise = boutons.filter(b => ['t-pause', 't-fs'].includes(b.id));
      const stick = document.getElementById('t-stick');
      const hint = document.getElementById('t-hint');
      const fire = document.getElementById('t-fire');
      return {
        petits: boutons.filter(b => b.w < 44 || b.h < 44).map(b => `${b.id} ${b.w}×${b.h}`),
        k: UI.hudScale(),
        stickVisible: !stick.hidden && stick.classList.contains('rest'),
        hintCache: hint.hidden, // le joystick a déjà été touché plus haut : l'indication a disparu
        hinted: Meta.profile.touchHinted,
        fireOpacity: +getComputedStyle(fire).opacity,
        fireAuto: fire.classList.contains('auto'),
        autoFire: Input.touch.autoFire,
        priseHaute: prise.every(b => b.bottom < H * 0.25),
        priseCentre: prise.every(b => {
          const r = document.getElementById(b.id).getBoundingClientRect();
          return r.left > innerWidth * 0.5 && r.right < innerWidth * 0.8; // à droite de la ligne « Salle n/9 », loin des pouces
        }),
      };
    });
    ok('toutes les cibles tactiles font au moins 44 px', pouce.petits.length === 0, pouce.petits.join(', ') || 'toutes ≥ 44 px');
    ok('le HUD est dessiné à ×1,35 au tactile', pouce.k === 1.35, `×${pouce.k}`);
    ok(
      'le joystick reste visible au repos, et « pose ton pouce ici » a disparu après le premier toucher',
      pouce.stickVisible && pouce.hintCache && pouce.hinted,
      JSON.stringify({ stick: pouce.stickVisible, hint: pouce.hintCache, hinted: pouce.hinted })
    );
    ok(
      'le tir est automatique par défaut, et le bouton TIR se voit en pointillé',
      pouce.autoFire && pouce.fireAuto && pouce.fireOpacity === 1,
      `auto ${pouce.autoFire}, opacité ${pouce.fireOpacity}`
    );
    ok(
      'pause et plein écran sont en haut, au centre, hors de la zone de préhension',
      pouce.priseHaute && pouce.priseCentre,
      JSON.stringify(pouce)
    );
    await bouton('#t-pause', 4, 80);
    const ps = await page.evaluate(() => ({ overlay: G.overlay, cache: document.getElementById('touch').hidden }));
    ok('le bouton pause ouvre la pause et cache la couche', ps.overlay === 'pause' && ps.cache, JSON.stringify(ps));
    await page.screenshot({ path: out('touch_pause.png') });
    /* le tir translucide quand il n'est pas automatique */
    const translucide = await page.evaluate(() => {
      Input.touch.autoFire = false;
      UI.togglePause();
      Touch.sync();
      const fire = document.getElementById('t-fire');
      const o = +getComputedStyle(fire).opacity;
      Input.touch.autoFire = true;
      return o;
    });
    ok(
      'sans tir automatique, le bouton TIR est translucide à 55 % tant qu’il n’est pas pressé',
      Math.abs(translucide - 0.55) < 0.01,
      `opacité ${translucide}`
    );
    /* le hub et la prépa au pouce : cartes en rangées défilables, tout ce qui se touche à 48 px */
    await page.evaluate(() => {
      Run.abort();
    });
    await page.waitForTimeout(600);
    const hub = await page.evaluate(() => {
      UI.showHub();
      const rows = [...document.querySelectorAll('.hub3 .row')].map(r => getComputedStyle(r).overflowX);
      const petits = [...document.querySelectorAll('.hub3 .btn, .hub3 .card.big, .hub3 [data-mode]')]
        .filter(e => e.offsetParent)
        .map(e => ({ t: (e.id || e.className).slice(0, 24), h: e.getBoundingClientRect().height }))
        .filter(e => e.h < 44);
      return { rows, petits: petits.map(e => `${e.t} ${Math.round(e.h)}`) };
    });
    ok(
      'au pouce, le camp met ses cartes en rangées défilables et rien de cliquable ne fait moins de 44 px',
      hub.rows.every(o => o === 'auto') && hub.petits.length === 0,
      `${hub.rows.join('/')} · ${hub.petits.join(', ') || 'tout ≥ 44 px'}`
    );
  },
  { mobile: true }
);
