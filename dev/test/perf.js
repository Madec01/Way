/* Chantier 10 — la performance sur téléphone. Ce test mesure : le compteur d'images par seconde (Perf) compte les
   flous posés par image et les salles à pièges et à modules n'en posent presque plus (les traits, anneaux et disques
   qui luisaient passent par Halo) ; le rendu économe coupe les flous à la source, retire les flous d'arrière-plan
   des écrans et se remet ; il s'allume tout seul au tactile quand le jeu tient moins que le seuil pendant 3 s ; la
   pause propose le réglage, le compteur et la mesure à copier ; ?perf affiche le compteur ; le rapport porte la
   mesure ; les boutons tactiles n'ont plus de flou d'arrière-plan. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, salle, sansPause, url, erreurs }) => {
  await entrer('test');
  await sansPause();

  const halo = await p.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 80;
    const g = c.getContext('2d');
    Halo.line(g, 10, 40, 70, 40, '#7fff9a', 2, 12);
    const lueur = g.getImageData(40, 35, 1, 1).data[3]; // 5 px au-dessus du trait : la lueur (largeur 2 + 12), pas le trait
    const trait = g.getImageData(40, 40, 1, 1).data[3];
    const vide = g.getImageData(40, 5, 1, 1).data[3];
    g.clearRect(0, 0, 80, 80);
    g.setLineDash([4, 4]);
    Halo.rect(g, 20, 20, 40, 40, '#ffb347', 2, 10, 0.5);
    const coin = g.getImageData(15, 40, 1, 1).data[3];
    const tiret = g.getLineDash();
    return { lueur, trait, vide, coin, tiret };
  });
  ok(
    'Halo.line et Halo.rect : un trait net sur une lueur large et pâle, rien au loin, le tiret en cours est rendu',
    halo.trait > 200 && halo.lueur > 20 && halo.lueur < halo.trait && halo.vide === 0 && halo.coin > 10 && halo.tiret.join() === '4,4',
    JSON.stringify(halo)
  );

  const sources = await p.evaluate(() => {
    const flou = /shadowBlur = (?![0;])/;
    const pieges = Object.getOwnPropertyNames(Trap.prototype)
      .filter(k => k.startsWith('r_'))
      .filter(k => flou.test(Trap.prototype[k].toString()));
    return {
      pieges,
      modules: flou.test(Modular.render.toString()),
      tempoRing: /shadowBlur\s*=\s*1[02]\b/.test(Tempo.renderOverlay.toString()),
      porte: /12 \+ 10 \* Beat\.pulse\(\)/.test(Room.render.toString()) && !/shadowBlur = 12 \+ 10/.test(Room.render.toString()),
      lameHalo: Room.renderFx.toString().indexOf('r.slashes') < Room.renderFx.toString().indexOf('lineWidth += 14'),
    };
  });
  ok(
    'pièges, modules, anneaux du tempo, porte et lames de mêlée ne posent plus de shadowBlur par image',
    !sources.pieges.length && !sources.modules && !sources.tempoRing && sources.porte && sources.lameHalo,
    JSON.stringify(sources)
  );

  /* flous posés par image, salle par salle (avant le chantier : 1 / 11 / 4 / 11) */
  const flous = {};
  for (const [n, nom] of [
    [2, 'salle2'],
    [6, 'salle6modulaire'],
    [7, 'salle7tempo'],
    [8, 'salle8'],
  ]) {
    await salle(n);
    await p.waitForTimeout(400);
    flous[nom] = await p.evaluate(async () => {
      let max = 0;
      for (let i = 0; i < 20; i++) {
        await new Promise(r => requestAnimationFrame(r));
        max = Math.max(max, Perf.blurs);
      }
      return max;
    });
  }
  ok(
    'au plus 5 flous par image dans les salles à modules, à tempo et à pièges (11 avant)',
    Object.values(flous).every(n => n <= 5),
    JSON.stringify(flous)
  );

  const mesure = await p.evaluate(async () => {
    await new Promise(r => setTimeout(r, 1300));
    return { fps: Perf.fps, min: Perf.min, ms: Perf.renderMs, ligne: Perf.line(), rapport: Rapport.texte().includes('WAY perf ·') };
  });
  ok(
    'la mesure vit : des images par seconde, un minimum sur 10 s, un temps de rendu, une ligne à coller, reprise dans le rapport',
    mesure.fps > 0 &&
      mesure.min > 0 &&
      mesure.ms > 0 &&
      /^WAY perf · \d+ i\/s · min \d+ sur 10 s · rendu [\d.]+ ms/.test(mesure.ligne) &&
      mesure.rapport,
    mesure.ligne
  );

  const eco = await p.evaluate(() => {
    const ctx = Engine.ctx;
    const avant = Perf.eco;
    Perf.setEco(true, 'choix');
    ctx.shadowBlur = 12;
    const coupe = ctx.shadowBlur;
    const compte = Perf.blurs; // compté quand même : la mesure reste honnête
    const corps = document.body.classList.contains('eco');
    const panneau = document.createElement('div');
    panneau.className = 'panel';
    document.body.appendChild(panneau);
    const fond = getComputedStyle(panneau).backdropFilter;
    panneau.remove();
    const dpr = Engine.canvas.width === window.innerWidth;
    Perf.setEco(false);
    ctx.shadowBlur = 12;
    const rendu = ctx.shadowBlur;
    ctx.shadowBlur = 0;
    return { avant, coupe, compte, corps, fond, dpr, rendu, apres: Perf.eco, why: Perf.why };
  });
  ok(
    'rendu économe : shadowBlur ramené à 0 à la source, body.eco sans flou d’arrière-plan, un pixel par pixel, et retour au rendu complet',
    !eco.avant && eco.coupe === 0 && eco.corps && eco.fond === 'none' && eco.dpr && eco.rendu === 12 && !eco.apres && eco.why === '',
    JSON.stringify(eco)
  );

  /* automatique : au tactile, 3 secondes sous le seuil ; ni au clavier, ni quand ça tient */
  const auto = await p.evaluate(async () => {
    const attendre = ms => new Promise(r => setTimeout(r, ms));
    const mots = [];
    const orig = UI.toast;
    UI.toast = (t, s) => {
      mots.push(t);
      return orig(t, s);
    };
    Perf.setMode('auto');
    Perf.seuil = 1000; // tout passe pour lent
    await attendre(4500);
    const clavier = Perf.eco;
    Input.touch.active = true;
    await attendre(1500);
    const tot = Perf.eco;
    await attendre(3200);
    const tactile = Perf.eco,
      why = Perf.why,
      toast = mots.some(t => /économe/.test(t));
    UI.toast = orig;
    Perf.setMode('full');
    const full = Perf.eco;
    Perf.seuil = 0;
    Perf.setMode('auto');
    await attendre(4500);
    const tient = Perf.eco;
    Input.touch.active = false;
    Perf.seuil = 45;
    return { clavier, tot, tactile, why, toast, full, tient, seuil: Perf.seuil };
  });
  ok(
    'automatique : rien au clavier, rien avant 3 s, économe au tactile après 3 s lentes (avec un mot à l’écran), « complet » l’éteint, rien quand ça tient',
    !auto.clavier && !auto.tot && auto.tactile && auto.why === 'auto' && auto.toast && !auto.full && !auto.tient,
    JSON.stringify(auto)
  );

  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  const pause = await p.evaluate(() => {
    const sel = document.querySelector('#pause-perf'),
      cb = document.querySelector('#pause-fps'),
      ligne = document.querySelector('#pause-perfline'),
      bouton = document.querySelector('#pause-perfcopy');
    if (!sel || !cb || !ligne || !bouton) return { manque: true };
    sel.value = 'eco';
    sel.dispatchEvent(new Event('change'));
    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    const r = {
      mode: Meta.profile.perfMode,
      eco: Perf.eco,
      show: Perf.show,
      profilShow: Meta.profile.perfShow,
      ligne: /WAY perf/.test(ligne.textContent),
      sauve: JSON.parse(localStorage.getItem('way_save_test') || localStorage.getItem('way_save') || '{}'),
    };
    sel.value = 'auto';
    sel.dispatchEvent(new Event('change'));
    return r;
  });
  ok(
    'la pause : le réglage du rendu (gardé dans le profil), le compteur, la mesure à copier',
    !pause.manque && pause.mode === 'eco' && pause.eco && pause.show && pause.profilShow && pause.ligne,
    JSON.stringify({ ...pause, sauve: undefined })
  );
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);

  const compteur = await p.evaluate(async () => {
    Perf.show = true;
    await new Promise(r => setTimeout(r, 1200));
    const ctx = Engine.ctx;
    const V = Engine.view,
      s = V.scale * (Engine.canvas.width / window.innerWidth);
    const px = Math.round((W / 2 + V.ox) * s),
      py = Math.round((H + 2 * V.oy - 12) * s);
    let vu = 0;
    for (let dx = -60; dx <= 60; dx += 4) {
      const d = ctx.getImageData(px + dx, py, 1, 1).data;
      if (d[1] > 150 && d[0] < 200) vu++;
    }
    Perf.show = false;
    return vu;
  });
  ok('le compteur se dessine en bas au centre, en vert', compteur > 3, `${compteur} points verts`);

  const tbtn = await p.evaluate(() => {
    const el = document.createElement('button');
    el.className = 'tbtn';
    document.getElementById('touch').appendChild(el);
    const f = getComputedStyle(el).backdropFilter;
    el.remove();
    return f;
  });
  ok('les boutons tactiles n’ont plus de flou d’arrière-plan (il se recalculait à chaque image)', tbtn === 'none', tbtn);

  await p.goto(url + '?perf=1');
  await p.waitForTimeout(1500);
  const param = await p.evaluate(() => ({ show: Perf.show, mode: Perf.mode, defaut: Meta.profile.perfMode }));
  ok(
    '?perf affiche le compteur sans passer par la pause ; le réglage par défaut est « automatique »',
    param.show && param.defaut === 'auto',
    JSON.stringify(param)
  );
  ok('aucune erreur JS', erreurs.length === 0, erreurs.join(' | '));
});
