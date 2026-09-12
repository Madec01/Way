/* Finitions après le chantier 13 — quatre remarques de partie de l'auteur. Ce test mesure : le contour sombre autour
   des sprites (un ennemi dessiné avec contour a plus de pixels sombres autour de lui que sans) et l'anneau au sol des
   ennemis (corail) et des alliés (vert) ; le réticule dessiné à la place du curseur pendant le jeu (curseur caché sur le
   canvas, revenu sur un écran) ; le verrou de 600 ms de l'écran de choix (un clic immédiat ne choisit rien, un clic
   après le délai choisit) ; les niveaux des sons de tir baissés et la rafale plus douce. */
const { test } = require('./lib');
const fs = require('fs');
const path = require('path');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();
  await salle(1, 'biome_1');
  await p.waitForTimeout(400);

  const dessin = await p.evaluate(() => {
    const e = Room.spawnEnemy(Content.enemy('enemy_rodeur'), W / 2, H / 2, {});
    e.x = W / 2;
    e.y = H / 2;
    e.spawnT = 0;
    const rendu = () => {
      const c = document.createElement('canvas');
      c.width = 200;
      c.height = 200;
      const g = c.getContext('2d');
      g.fillStyle = '#c8c0b0'; // un sol clair : le contour doit s'y voir
      g.fillRect(0, 0, 200, 200);
      g.translate(100 - e.x, 100 - e.y);
      e.render(g);
      return g.getImageData(0, 0, 200, 200).data;
    };
    const sombres = d => {
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 40 && d[i + 1] < 40 && d[i + 2] < 60 && d[i + 3] > 200) n++;
      return n;
    };
    const corail = d => {
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i + 1] < 150 && d[i + 2] < 175 && d[i] - d[i + 1] > 60) n++; // rougeâtre : l'anneau corail mêlé au sol
      return n;
    };
    Sprites.outline = true;
    const avec = rendu();
    Sprites.outline = false;
    const sans = rendu();
    Sprites.outline = true;
    const out = { avec: sombres(avec), sans: sombres(sans), anneau: corail(avec), outline: Sprites.outline };
    e.hp = 0;
    G.enemies = G.enemies.filter(x => x !== e);
    /* l'anneau vert des alliés et le contour des compagnons : dans le code du rendu */
    out.pet = /PAL\.life/.test(Pet.prototype.render.toString());
    out.enemyRing = /PAL\.danger/.test(Enemy.prototype.render.toString());
    return out;
  });
  ok(
    'le contour sombre : un ennemi sur un sol clair a bien plus de pixels sombres avec le contour que sans',
    dessin.avec > dessin.sans * 1.3 && dessin.avec - dessin.sans > 60,
    JSON.stringify(dessin)
  );
  ok(
    'l’anneau au sol : corail sous les ennemis, vert vie sous les compagnons',
    dessin.anneau >= 8 && dessin.enemyRing && dessin.pet,
    JSON.stringify(dessin)
  );

  /* le réticule */
  const ret = await p.evaluate(async () => {
    Input.mouse.x = W / 2 + 120;
    Input.mouse.y = H / 2;
    await new Promise(r => setTimeout(r, 150));
    const jeu = { cursor: Engine.canvas.style.cursor, flag: !!(UI.hudProbe && UI.hudProbe.flags && UI.hudProbe.flags.reticle) };
    /* la couleur du réticule à l'endroit de la souris, sur le canvas du jeu */
    const g = Engine.canvas.getContext('2d');
    const k = Engine.canvas.width / W;
    const d = g.getImageData(Math.round(Input.mouse.x * k), Math.round(Input.mouse.y * k), 1, 1).data;
    jeu.centre = [d[0], d[1], d[2]];
    G.overlay = 'essai'; // un écran devant le jeu (la pause est neutralisée par le test, on pose l'état à la main)
    await new Promise(r => setTimeout(r, 150));
    const pause = { overlay: G.overlay, cursor: Engine.canvas.style.cursor };
    G.overlay = null;
    return { jeu, pause, self: PAL.self };
  });
  ok(
    'le réticule : dessiné pendant le jeu à la souris, curseur caché ; sur un écran le curseur revient',
    ret.jeu.cursor === 'none' && ret.jeu.flag && ret.pause.overlay && ret.pause.cursor === '',
    JSON.stringify(ret)
  );

  /* le verrou de l'écran de choix */
  const verrou = await p.evaluate(async () => {
    const ups = Progression.drawUpgrades(Run.upgradePool(), 3, 0, {});
    let pris = null;
    UI.showChoice({ title: 'Essai', subtitle: 'finitions', choices: ups, onPick: u => (pris = u) });
    const carte = () => document.querySelector('#choice-cards [data-i="0"]');
    carte().click();
    const tot = pris;
    await new Promise(r => setTimeout(r, UI.CHOICE_LOCK_MS + 150));
    carte().click();
    const tard = pris;
    return { lock: UI.CHOICE_LOCK_MS, tot: !!tot, tard: !!tard, overlay: G.overlay };
  });
  ok(
    `l’écran de choix : un clic immédiat ne choisit rien, un clic après ${verrou.lock} ms choisit`,
    verrou.lock >= 400 && !verrou.tot && verrou.tard,
    JSON.stringify(verrou)
  );

  /* les sons de tir */
  const src = fs.readFileSync(path.join(__dirname, '..', 'AudioEngine.js'), 'utf8');
  const niveaux = {};
  for (const m of src.matchAll(/^\s*(shoot[A-Za-z]+): ([\d.]+),/gm)) if (!niveaux[m[1]]) niveaux[m[1]] = +m[2];
  const trop = Object.entries(niveaux).filter(([, v]) => v > 1.3);
  ok(
    'les sons de tir : aucun au-dessus de 1,3 et une rafale de tirs s’adoucit plus vite que les autres sons',
    Object.keys(niveaux).length >= 6 && trop.length === 0 && /name\.startsWith\('shoot'\) \? 0\.8/.test(src),
    JSON.stringify(niveaux)
  );
});
