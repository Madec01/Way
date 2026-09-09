const { test, out } = require('./lib');
const fs = require('fs');
test(async ({ page: p, context, ok, entrer, salle, run, sansPause, erreurs: errs }) => {
  await entrer('test');
  /* le contenu livré porte déjà les compagnons de l'auteur : on ne vise que celui posé par ce test */
  await p.addInitScript(() => {
    window.monPet = () =>
      Content.pets()
        .filter(x => x.atelier)
        .slice(-1)[0] || Content.pets()[0];
  });

  /* trois vues 32×32, chacune d'une couleur franche pour être identifiable au pixel près */
  const mk = col =>
    p.evaluate(c => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 32;
      const g = cv.getContext('2d');
      g.fillStyle = c;
      g.fillRect(4, 4, 24, 24);
      g.fillStyle = '#000';
      g.fillRect(12, 12, 8, 4);
      return cv.toDataURL('image/png');
    }, col);
  for (const [n, c] of [
    ['sud', '#ff3b5c'],
    ['est', '#6ee7ff'],
    ['nord', '#7fff9a'],
  ]) {
    const d = await mk(c);
    fs.writeFileSync(out('v_' + n + '.png'), Buffer.from(d.split(',')[1], 'base64'));
  }

  const dirs = await p.evaluate(() => ({
    bas: Sprites.dirFrom(0, 1),
    haut: Sprites.dirFrom(0, -1),
    droite: Sprites.dirFrom(1, 0),
    gauche: Sprites.dirFrom(-1, 0),
    diag: Sprites.dirFrom(1, 0.5),
    presqueVertical: Sprites.dirFrom(0.2, 1),
  }));
  ok('vers le bas → vue sud', dirs.bas.dir === 's' && !dirs.bas.flip);
  ok('vers le haut → vue nord', dirs.haut.dir === 'n');
  ok('vers la droite → vue est', dirs.droite.dir === 'e' && !dirs.droite.flip);
  ok('vers la gauche → vue est retournée', dirs.gauche.dir === 'e' && dirs.gauche.flip, 'trois images suffisent aux quatre directions');
  ok('une diagonale garde le profil', dirs.diag.dir === 'e', 'marge de 1,2 en faveur du profil');

  await p.evaluate(() => {
    try {
      localStorage.removeItem('way_amis_v1');
    } catch (e) {}
    Atelier.open();
  });
  await p.waitForTimeout(1600);
  await p.evaluate(() => {
    Atelier.st.tab = 'amis';
    Atelier.refresh();
  });
  await p.click('#am-addpet');
  await p.waitForTimeout(250);
  const slots = await p.evaluate(() => [...document.querySelectorAll('.amicard[data-p="0"] .amivue')].map(e => e.textContent.trim()));
  ok("trois emplacements d'image par animal", slots.length === 3, slots.join(' · '));

  await p.setInputFiles('#atelier [data-file="0"][data-v=""]', out('v_sud.png'));
  await p.waitForTimeout(600);
  const uneSeule = await p.evaluate(() => {
    const sp = Content.pets().find(x => x.atelier).sprite;
    return { type: typeof sp, sud: Sprites.pickDir(sp, 's'), nord: Sprites.pickDir(sp, 'n') };
  });
  ok(
    'avec une seule image, toutes les vues la reprennent',
    uneSeule.type === 'string' && uneSeule.sud === uneSeule.nord,
    'un seul sprite pour les trois directions'
  );

  await p.setInputFiles('#atelier [data-file="0"][data-v="E"]', out('v_est.png'));
  await p.waitForTimeout(600);
  await p.setInputFiles('#atelier [data-file="0"][data-v="N"]', out('v_nord.png'));
  await p.waitForTimeout(600);
  const trois = await p.evaluate(() => {
    const sp = Content.pets().find(x => x.atelier).sprite;
    return { type: typeof sp, s: Sprites.pickDir(sp, 's'), e: Sprites.pickDir(sp, 'e'), n: Sprites.pickDir(sp, 'n') };
  });
  ok(
    'les trois vues sont distinctes une fois fournies',
    trois.type === 'object' && trois.s !== trois.e && trois.e !== trois.n,
    `${trois.s} / ${trois.e} / ${trois.n}`
  );
  const marques = await p.evaluate(() => document.querySelectorAll('.amicard[data-p="0"] .amivue.ok').length);
  ok('les emplacements remplis sont signalés', marques === 3, marques + '/3 marqués');

  /* en jeu : la couleur dessinée doit changer avec la direction */
  const enjeu = await p.evaluate(async () => {
    document.querySelector('[data-try="0"]').click();
    await new Promise(r => setTimeout(r, 500));
    const lire = (dx, dy) => {
      G.pet.dx = dx;
      G.pet.dy = dy;
      const c = document.createElement('canvas');
      c.width = c.height = 100;
      const g = c.getContext('2d');
      const ox = G.pet.x,
        oy = G.pet.y;
      G.pet.x = 50;
      G.pet.y = 50;
      G.pet.render(g);
      G.pet.x = ox;
      G.pet.y = oy;
      const d = g.getImageData(0, 0, 100, 100).data;
      const cnt = {};
      for (let i = 0; i < d.length; i += 4)
        if (d[i + 3] > 200) {
          const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2];
          cnt[k] = (cnt[k] || 0) + 1;
        }
      return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    };
    return { bas: lire(0, 1), haut: lire(0, -1), droite: lire(1, 0), gauche: lire(-1, 0) };
  });
  ok(
    'le compagnon change de vue selon sa direction',
    enjeu.bas !== enjeu.haut && enjeu.bas !== enjeu.droite && enjeu.haut !== enjeu.droite,
    `bas ${enjeu.bas} · haut ${enjeu.haut} · droite ${enjeu.droite}`
  );
  ok("l'ouest réutilise la vue est", enjeu.gauche === enjeu.droite, 'même image, retournée');

  /* le sprite figé respire */
  const vie = await p.evaluate(() => {
    const bobs = [],
      tilts = [],
      sxs = [];
    for (let w = 0.1; w < 1.5; w += 0.02) {
      const g = Sprites.gait(w);
      bobs.push(g.bob);
      tilts.push(g.tilt);
      sxs.push(g.sx);
    }
    const sp = a => Math.max(...a) - Math.min(...a);
    const arret = Sprites.gait(0);
    return {
      bob: +sp(bobs).toFixed(2),
      tilt: +sp(tilts).toFixed(3),
      sx: +sp(sxs).toFixed(3),
      arret: Math.abs(arret.tilt) < 0.001 && arret.sx === 1,
    };
  });
  ok(
    'un sprite figé garde une démarche',
    vie.bob > 2 && vie.tilt > 0.08 && vie.sx > 0.03 && vie.arret,
    `rebond ${vie.bob} px · balancement ${vie.tilt} rad · respiration ${vie.sx} — et rien de tout ça à l'arrêt`
  );

  /* sprite entier de personnage, trois vues */
  await p.click('#am-addchar');
  await p.waitForTimeout(250);
  for (const [v, f] of [
    ['', 'sud'],
    ['E', 'est'],
    ['N', 'nord'],
  ]) {
    await p.setInputFiles(`#atelier [data-fileb="0"][data-v="${v}"]`, out('v_' + f + '.png'));
    await p.waitForTimeout(500);
  }
  const perso = await p.evaluate(async () => {
    const c = document.querySelector('.amicard[data-c="0"]');
    const e = c.querySelector('[data-f="name"]');
    e.value = 'Lou';
    e.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 400));
    document.querySelector('[data-tryc="0"]').click();
    await new Promise(r => setTimeout(r, 400));
    const lire = dir => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 160;
      const g = cv.getContext('2d');
      Sprites.drawBody(g, 'player', 80, 60, { body: G.player.char.body, size: 64, dir, tier: 3 });
      const d = g.getImageData(0, 0, 160, 160).data;
      const cnt = {};
      for (let i = 0; i < d.length; i += 4)
        if (d[i + 3] > 200) {
          const k = d[i] + ',' + d[i + 1] + ',' + d[i + 2];
          cnt[k] = (cnt[k] || 0) + 1;
        }
      return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    };
    return { s: lire('s'), e: lire('e'), n: lire('n'), body: typeof G.player.char.body };
  });
  ok(
    'le personnage a ses trois vues',
    perso.body === 'object' && perso.s !== perso.e && perso.e !== perso.n,
    `sud ${perso.s} · est ${perso.e} · nord ${perso.n}`
  );

  const exp = await p.evaluate(() => {
    document.getElementById('a-export').click();
    const t = document.getElementById('a-txt').value;
    return { n: (t.match(/data:image\/png/g) || []).length, dir: /"e":/.test(t) && /"n":/.test(t) };
  });
  ok("l'export emporte les six images et les vues", exp.n === 6 && exp.dir, exp.n + ' images');

  await p.evaluate(() => {
    Atelier.st.tab = 'anim';
    Atelier.refresh();
    document.getElementById('a-mode').click();
    G.player.x = 300;
    G.player.y = 360;
  });
  await p.waitForTimeout(800);
  await p.screenshot({ path: out('vues.png') });
});
