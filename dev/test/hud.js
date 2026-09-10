/* Chantier I-5 — le HUD refait. Ce test mesure : rien n'est dessiné dans le rectangle central (40 % × 40 % de la vue)
   hors le compteur de série ; les trois polices du HUD sont celles du CSS (Silkscreen, VT323, Pixelify Sans), plus
   la police système ; la barre de PV segmentée tous les 25 PV avec les chiffres dedans, la pastille de niveau qui
   grossit à la montée, l'XP en bande de 4 px pleine largeur tout en haut ; l'anneau de compétence de 34 px qui flashe
   quand elle est prête ; une seule ligne « Salle n/9 · m:ss » ; la barre du boss dans le tiers supérieur, segmentée par
   phase, qui entre en 0,6 s ; les chiffres flottants de trois sortes à trois tailles ; la grille des greffes en bas à
   droite avec ×n ; le HUD qui s'estompe à 45 % après 4 s de calme et remonte en 0,15 s ; les barres ennemies segmentées
   et les zones d'impact au sol dans la couleur d'alerte. */
const { test } = require('./lib');
const fs = require('fs');
const path = require('path');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();
  await salle(2);

  const hud = await p.evaluate(() => {
    G.paused = true;
    G.debug.hudProbe = true;
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 720;
    const ctx = c.getContext('2d');
    const V = Engine.view;
    const L = -V.ox,
      T = -V.oy,
      CX = L + V.w / 2,
      CY = T + V.h / 2;
    const pl = G.player;
    const r = G.run;
    G.enemies = [];
    /* trois greffes, dont une doublée */
    for (const id of ['upg_tranchant', 'upg_gachette', 'upg_tranchant']) {
      const u = Content.upgrade(id);
      if (u) Run.takeUpgrade(u);
    }
    pl.hp = Math.round(pl.stats.maxHp * 0.55);
    pl.skillCd = 3;
    pl.skillCharges = 0;
    UI.renderHud(ctx);
    const pr = UI.hudProbe;
    const centre = { x: CX - V.w * 0.2, y: CY - V.h * 0.2, w: V.w * 0.4, h: V.h * 0.4 };
    const croise = q => q.x < centre.x + centre.w && q.x + q.w > centre.x && q.y < centre.y + centre.h && q.y + (q.h || 12) > centre.y;
    const dedansCentre = [
      ...pr.rects.filter(croise).map(q => 'panneau ' + Math.round(q.w) + '×' + Math.round(q.h)),
      ...pr.texts.filter(croise).map(q => q.t),
    ];
    const fonts = [...pr.fonts];
    const flags = Object.assign({}, pr.flags);
    const hpGauge = pr.gauges.find(g => g.h === 22);
    const xpGauge = pr.gauges.find(g => g.h === 4 && g.y === T);
    const ligne = pr.texts.find(t => /^Salle 2\/9 · \d:\d\d$/.test(t.t));
    const pvTexte = pr.texts.find(t => t.t.startsWith(Math.ceil(pl.hp) + ' / '));
    const dansJauge = pvTexte && hpGauge && pvTexte.x >= hpGauge.x && pvTexte.x + pvTexte.w <= hpGauge.x + hpGauge.w;
    const grille = pr.texts.find(t => t.t === '×2');
    /* la montée de niveau : la pastille grossit puis revient */
    r.levelPopT = Time.now;
    UI.renderHud(ctx);
    const pop0 = pr.flags.levelPop;
    r.levelPopT = Time.now - 1;
    UI.renderHud(ctx);
    const pop1 = pr.flags.levelPop;
    /* la compétence redevient prête : flash blanc puis anneau vert */
    pl.skillCharges = 1;
    pl.skillCd = 0;
    UI.renderHud(ctx);
    const pret = Object.assign({}, pr.flags.skillRing);
    return {
      dedansCentre,
      fonts,
      flags,
      hpGauge,
      xpGauge,
      ligne: ligne && ligne.t,
      dansJauge,
      grille: !!grille,
      pop0,
      pop1,
      pret,
      maxHp: pl.stats.maxHp,
      V: { w: V.w, h: V.h },
    };
  });
  ok(
    'rien n’est dessiné dans le rectangle central de la vue (40 % × 40 %)',
    hud.dedansCentre.length === 0,
    hud.dedansCentre.join(' | ') || 'centre libre'
  );
  ok(
    'les polices du HUD sont celles du CSS : Silkscreen, VT323, Pixelify Sans — jamais la police système',
    hud.fonts.length > 0 && hud.fonts.every(f => ['Silkscreen', 'VT323', 'Pixelify Sans'].includes(f)),
    hud.fonts.join(', ')
  );
  ok(
    'la barre de PV fait 220 × 22, segmentée tous les 25 PV, les chiffres dedans',
    hud.hpGauge &&
      hud.hpGauge.w === 220 &&
      hud.hpGauge.segments === Math.ceil(hud.maxHp / 25) &&
      hud.flags.hpSegments === hud.hpGauge.segments &&
      hud.dansJauge,
    `${hud.hpGauge && hud.hpGauge.segments} segments pour ${hud.maxHp} PV`
  );
  ok(
    'l’XP est une bande de 4 px pleine largeur tout en haut de la vue',
    hud.xpGauge && hud.xpGauge.w === hud.V.w && hud.flags.xpBar && hud.flags.xpBar.h === 4,
    JSON.stringify(hud.xpGauge)
  );
  ok('la pastille de niveau grossit à ×1,6 à la montée et revient à ×1', hud.pop0 >= 1.5 && hud.pop1 === 1, `${hud.pop0} → ${hud.pop1}`);
  ok('une seule ligne en haut au centre : « Salle 2/9 · 0:05 »', !!hud.ligne, hud.ligne || 'absente');
  ok(
    'l’anneau de compétence (34 px) flashe en blanc quand elle redevient prête',
    hud.flags.skillRing && hud.flags.skillRing.r === 17 && !hud.flags.skillRing.ready && hud.pret.ready && hud.pret.flash,
    JSON.stringify(hud.pret)
  );
  ok(
    'les greffes sont une grille d’icônes en bas à droite, avec ×n sur les doublons',
    hud.flags.upgGrid === 2 && hud.grille,
    `${hud.flags.upgGrid} greffes`
  );

  /* --- la barre du boss : tiers supérieur, segmentée par phase, entrée en 0,6 s --- */
  const boss = await p.evaluate(() => {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const V = Engine.view;
    const T = -V.oy;
    const pl = G.player;
    const def = Content.boss ? Content.boss(Content.biome('biome_1').boss) : null;
    const b = {
      name: 'ÉTALON 07',
      hp: 900,
      maxHp: 1000,
      dead: false,
      phaseIdx: 0,
      phases: (def && def.phases) || [{ hpBelow: 1 }, { hpBelow: 0.6 }, { hpBelow: 0.3 }],
      flash: 0,
    };
    G.room.boss = b;
    UI.renderHud(ctx);
    const y = UI.hudProbe.flags.bossY;
    const seg = UI.hudProbe.flags.bossSegments;
    const entree0 = b.barT0 != null && Time.now - b.barT0 < 0.05;
    b.barT0 = Time.now - 1;
    b.hp = 400;
    UI.renderHud(ctx);
    const lag = b.hpLag > b.hp; // le rouge sombre rattrape en 0,4 s
    const nom = UI.hudProbe.texts.find(t => t.t === 'ÉTALON 07');
    G.room.boss = null;
    return { y, T, h: V.h, seg, entree0, lag, nom: !!nom, phases: b.phases.length };
  });
  ok(
    'la barre du boss est dans le tiers supérieur, segmentée par phase, son nom au-dessus',
    boss.y != null && boss.y < boss.T + boss.h / 3 && boss.seg === boss.phases && boss.nom,
    `y=${boss.y}, ${boss.seg} segments pour ${boss.phases} phases`
  );
  ok('elle entre en 0,6 s et le dégât retardé rattrape en rouge sombre', boss.entree0 && boss.lag);

  /* --- les chiffres flottants : trois sortes, trois tailles --- */
  const fl = await p.evaluate(() => [Floaters.KINDS.dmg.size, Floaters.KINDS.crit.size, Floaters.KINDS.taken.size]);
  ok('les chiffres flottants de trois sortes ont trois tailles (normal < critique < subi)', fl[0] < fl[1] && fl[1] < fl[2], fl.join(' < '));

  /* --- le HUD s'estompe après 4 s de calme, remonte vite --- */
  const fondu = await p.evaluate(async () => {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    /* la salle est vidée pour de bon : plus de vagues, plus d'ennemis, rien depuis 4 s */
    for (const w of G.room.waves) w.done = true;
    G.room.wavesStarted = true;
    G.enemies = [];
    G.room.boss = null;
    G.room.time = 30;
    G.room.lastDamageT = 0;
    G.room.lastKillT = 0;
    let a = 1;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 30));
      G.enemies = G.enemies.filter(e => false);
      UI.renderHud(ctx);
      a = UI.hudProbe.flags.hudAlpha;
    }
    const calme = a;
    /* un ennemi paraît : remontée en 0,15 s */
    const def = Content.enemy(Content.biome('biome_1').enemyPool[0]);
    Room.spawnEnemy(def, G.player.x + 300, G.player.y, {});
    const t0 = performance.now();
    let apres = calme;
    while (performance.now() - t0 < 300) {
      await new Promise(r => setTimeout(r, 16));
      UI.renderHud(ctx);
      apres = UI.hudProbe.flags.hudAlpha;
      if (apres >= 1) break;
    }
    const dt = performance.now() - t0;
    G.enemies = [];
    G.paused = false;
    return { calme, apres, dt: Math.round(dt) };
  });
  ok(
    'après 4 s de calme les blocs secondaires sont à 45 %, et remontent à 100 % en moins de 0,3 s dès qu’un ennemi paraît',
    fondu.calme <= 0.46 && fondu.apres >= 1 && fondu.dt < 300,
    `${fondu.calme} → ${fondu.apres} en ${fondu.dt} ms`
  );

  /* --- les sources : barres ennemies segmentées, zones d'impact au sol en alerte --- */
  const en = fs.readFileSync(path.join(__dirname, '..', '32_enemies.js'), 'utf8');
  const bar = en.slice(en.indexOf('barre de vie si entamé'), en.indexOf('barre de vie si entamé') + 700);
  const tele = en.slice(en.indexOf('if (this.tele) {'), en.indexOf('if (this.tele) {') + 3200);
  ok('les barres ennemies sont segmentées à 25 %', /i < 4/.test(bar) && /segmentée à 25 %/.test(bar));
  ok(
    'les zones d’impact au sol (cône, ligne, disque) sont dessinées dans la couleur d’alerte',
    (tele.match(/PAL\.alert/g) || []).length >= 4 &&
      /teleZone = 'disc'/.test(tele) &&
      /teleZone = this\.state === 'aim' \? 'line' : 'cone'/.test(tele)
  );
});
