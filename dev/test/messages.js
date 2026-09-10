/* Chantier I-6 — une seule voix. Ce test mesure : un seul point d'entrée (notify) derrière banner() et toast() ; dix
   messages en une image → au plus un bandeau visible (les autres font la queue) et trois toasts ; deux messages
   identiques à moins de 3 s n'en font qu'un ; un toast est retenu tant qu'un ennemi est à moins de 400 px, et libéré
   quand il s'éloigne ; la salle sécurisée vide les infos retenues ; un niveau supérieur interrompt le bandeau courant ;
   un panneau ouvert fige les messages ; le bandeau s'affiche dans le tiers inférieur quand le joueur est en haut. */
const { test } = require('./lib');
const fs = require('fs');
const path = require('path');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();
  await salle(2);

  const dix = await p.evaluate(() => {
    G.paused = true;
    G.enemies = [];
    /* on repart de zéro : rien de visible, rien en attente */
    UI.clearAll();
    const m0 = UI.messages();
    for (let i = 0; i < 5; i++) UI.banner('Bandeau ' + i, '#fff');
    for (let i = 0; i < 5; i++) UI.toast('Info ' + i);
    const m = UI.messages();
    return { avant: m0, visible: m.banner && m.banner.text, queue: m.queue.length, toasts: m.toasts.length, pending: m.pending.length };
  });
  ok(
    'dix messages en une image : un seul bandeau visible, quatre en file ; trois toasts au plus',
    dix.visible === 'Bandeau 0' && dix.queue === 4 && dix.toasts === 3,
    `${dix.visible}, file ${dix.queue}, ${dix.toasts} toasts`
  );

  const doublon = await p.evaluate(() => {
    const a = UI.banner('Même chose', '#fff');
    const b = UI.banner('Même chose', '#fff');
    const c = UI.notify({ text: 'Vague 3', level: 2, key: 'wave' });
    const d = UI.notify({ text: 'Vague 4', level: 2, key: 'wave' });
    return { a, b, c, d, queue: UI.messages().queue.map(x => x.text) };
  });
  ok(
    'deux messages identiques (ou de même clé) à moins de 3 s n’en font qu’un',
    doublon.a && !doublon.b && doublon.c && !doublon.d,
    JSON.stringify(doublon.queue)
  );

  /* --- un niveau supérieur interrompt le bandeau courant --- */
  const coupe = await p.evaluate(() => {
    const avant = UI.messages().banner.text;
    UI.notify({ text: 'ENRAGÉS', color: PAL.alert, level: 1 });
    UI.update(0.3);
    const m = UI.messages();
    return { avant, apres: m.banner && m.banner.text };
  });
  ok(
    'un message de niveau 1 coupe le bandeau courant et passe devant la file',
    coupe.avant === 'Bandeau 0' && coupe.apres === 'ENRAGÉS',
    `${coupe.avant} → ${coupe.apres}`
  );

  /* --- les toasts sont retenus tant qu'un ennemi est à moins de 400 px --- */
  const retenu = await p.evaluate(() => {
    const pl = G.player;
    UI.clearAll();
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, pl.x + 200, pl.y, {});
    UI.toast('Uno arrive');
    const pres = UI.messages();
    e.x = pl.x + 900;
    UI.update(0.01);
    const loin = UI.messages();
    e.dead = true;
    G.enemies = [];
    return {
      presToasts: pres.toasts.length,
      presPending: pres.pending.length,
      loinToasts: loin.toasts.map(t => t.text),
      loinPending: loin.pending.length,
    };
  });
  ok(
    'un toast est retenu tant qu’un ennemi est à moins de 400 px, et paraît dès qu’il s’éloigne',
    retenu.presToasts === 0 && retenu.presPending === 1 && retenu.loinToasts.join() === 'Uno arrive' && retenu.loinPending === 0,
    JSON.stringify(retenu)
  );

  const secu = await p.evaluate(() => {
    const pl = G.player;
    UI.clearAll();
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    const e = Room.spawnEnemy(def, pl.x + 100, pl.y, {});
    UI.toast('En rythme ×4 : +40 XP');
    UI.toast('Chrono tenu : +10 crédits');
    const avant = UI.messages().pending.length;
    e.dead = true;
    G.enemies = [];
    for (const w of G.room.waves) w.done = true;
    G.room.wavesStarted = true;
    G.room.state = 'fight';
    Room.clear();
    const apres = UI.messages().pending.length;
    return { avant, apres };
  });
  ok('la salle sécurisée vide les infos retenues', secu.avant === 2 && secu.apres === 0, `${secu.avant} → ${secu.apres}`);

  /* --- un panneau ouvert fige les messages --- */
  const fige = await p.evaluate(() => {
    UI.clearAll();
    UI.banner('Figé ?', '#fff');
    const t0 = UI.messages().banner.t;
    G.overlay = 'pause';
    UI.update(0.5);
    const t1 = UI.messages().banner.t;
    G.overlay = null;
    UI.update(0.5);
    const t2 = UI.messages().banner.t;
    return { t0, t1, t2 };
  });
  ok(
    'un panneau ouvert sur la partie fige les bandeaux, qui reprennent ensuite',
    fige.t1 === fige.t0 && fige.t2 > fige.t1,
    `${fige.t0} → ${fige.t1} → ${fige.t2}`
  );

  /* --- la zone libre : le bandeau descend quand le joueur est en haut --- */
  const zone = await p.evaluate(() => {
    const pl = G.player;
    const V = Engine.view;
    const T = -V.oy;
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 720;
    const ctx = c.getContext('2d');
    G.debug.hudProbe = true;
    const y0 = pl.y,
      cy0 = Camera.y;
    UI.clearAll();
    UI.banner('En bas ?', '#fff');
    /* la caméra est bloquée par le bord de la salle : le joueur se retrouve en haut de l'écran */
    pl.y = ROOM_Y + 40;
    Camera.y = pl.y + 260;
    UI.renderHud(ctx);
    const bas = UI.hudProbe.texts.find(t => t.t === 'En bas ?');
    pl.y = y0;
    Camera.y = cy0;
    UI.renderHud(ctx);
    const haut = UI.hudProbe.texts.find(t => t.t === 'En bas ?');
    return { bas: bas && bas.y, haut: haut && haut.y, T, h: V.h };
  });
  ok(
    'le bandeau s’affiche dans le tiers inférieur quand le joueur est en haut, dans le tiers supérieur sinon',
    zone.bas != null && zone.bas > zone.T + zone.h * 0.66 && zone.haut != null && zone.haut < zone.T + zone.h * 0.33,
    `en haut : y=${zone.bas && zone.bas.toFixed(0)} · sinon y=${zone.haut && zone.haut.toFixed(0)} (vue ${zone.h})`
  );

  /* --- les sources : un seul point d'entrée --- */
  const src = fs.readFileSync(path.join(__dirname, '..', '50_ui.js'), 'utf8');
  const bp = (src.match(/banners\.push\(/g) || []).length;
  const wrapB = src.slice(src.indexOf('function banner('), src.indexOf('function banner(') + 120);
  const wrapT = src.slice(src.indexOf('function toast('), src.indexOf('function toast(') + 120);
  ok(
    'un seul endroit pose un bandeau (notify) ; banner() et toast() ne sont que des enveloppes',
    bp === 1 && /notify\(/.test(wrapB) && /notify\(/.test(wrapT),
    `${bp} banners.push`
  );
});
