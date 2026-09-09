const { test, out } = require('./lib');
test(async ({ page: p, context, ok, entrer, salle, run, sansPause, erreurs: errs }) => {
  await entrer('test');
  const g = await p.evaluate(() =>
    ['char_gabriel', 'char_jean'].map(id => {
      const c = Content.character(id);
      return { nom: c.name, clips: Object.keys(c.anim || {}).length, taille: c.size, placeholder: !!c.placeholder };
    })
  );
  ok(
    'Gabriel et Jean ont leurs cinq planches',
    g.every(x => x.clips === 5 && !x.placeholder && x.taille === 96),
    g.map(x => `${x.nom} ${x.clips} clips, taille ${x.taille}`).join(' · ')
  );
  const reste = await p.evaluate(() =>
    Content.characters()
      .filter(c => c.placeholder)
      .map(c => c.name)
  );
  ok('plus aucun personnage en attente de dessins', reste.length === 0, reste.length ? reste.join(', ') : 'tout le monde a ses planches');

  const info = await p.evaluate(() => {
    const out = {};
    for (const k of [
      'char_gabriel_idle',
      'char_gabriel_walk',
      'char_gabriel_fire',
      'char_gabriel_pick',
      'char_gabriel_death',
      'pet_uno_attack',
      'pet_uno_hurt',
      'char_martin_idle',
    ]) {
      const s = Sprites.sheetInfo(k);
      out[k] = s ? `${s.cols}x${s.rows} de ${s.fw}px → ${s.n} images` : 'absente';
    }
    return out;
  });
  ok(
    'les cases vides de fin ne comptent plus',
    /→ 7 images/.test(info.char_gabriel_idle) && /→ 7 images/.test(info.pet_uno_attack),
    'Gabriel ' + info.char_gabriel_idle + ' · Uno attaque ' + info.pet_uno_attack
  );
  const regle = await p.evaluate(async () => {
    /* deux planches fabriquées ici : l'une avec deux cases vides à la fin, l'autre avec un trou au milieu */
    const faire = pleines => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g2 = c.getContext('2d');
      g2.fillStyle = '#f0c';
      pleines.forEach(i => g2.fillRect((i % 2) * 32 + 8, Math.floor(i / 2) * 32 + 8, 16, 16));
      return c.toDataURL();
    };
    await Sprites.addSheet('essai_fin', faire([0, 1]), 32); // 4 cases, 2 pleines au début
    await Sprites.addSheet('essai_trou', faire([0, 1, 3]), 32); // trou en case 2, dessin en case 3
    return { fin: Sprites.sheetInfo('essai_fin').n, trou: Sprites.sheetInfo('essai_trou').n };
  });
  ok(
    'les cases vides du milieu sont gardées, celles de la fin non',
    regle.fin === 2 && regle.trou === 4,
    `vides à la fin → ${regle.fin} images sur 4 · trou au milieu → ${regle.trou} images sur 4`
  );
  ok('Uno a ses quatre clips', /→ [0-9]+ images/.test(info.pet_uno_hurt), 'attaque et blessé chargés');

  const jeu = await p.evaluate(async () => {
    Meta.profile.character = 'char_gabriel';
    Meta.profile.pet = 'pet_choupi';
    Meta.profile.petMode = 'always';
    Meta.save();
    document.getElementById('hub-enter').click();
    await new Promise(r => setTimeout(r, 1800));
    return { perso: G.run.char.id, equipe: G.pets[0] && G.pets[0].pair && G.pets[0].pair.name, animaux: G.pets.map(x => x.name) };
  });
  ok(
    'on joue Gabriel avec la maisonnée',
    jeu.perso === 'char_gabriel' && jeu.equipe === 'La maisonnée',
    jeu.animaux.join(' + ') + ' · ' + jeu.equipe
  );

  /* ses cinq clips s'enchaînent selon l'action */
  const clips = await p.evaluate(() => {
    const pl = G.player;
    const r = {};
    pl.animStep(0.016, false, false);
    r.repos = pl.clip;
    for (let i = 0; i < 5; i++) pl.animStep(0.016, true, false);
    r.marche = pl.clip;
    for (let i = 0; i < 5; i++) pl.animStep(0.016, false, true);
    r.tir = pl.clip;
    pl.pickT = 0.5;
    for (let i = 0; i < 3; i++) pl.animStep(0.016, true, false);
    r.ramasse = pl.clip;
    pl.pickT = 0;
    pl.fireT = 0;
    pl.dead = true;
    pl.animStep(0.016, false, false);
    r.mort = pl.clip;
    pl.dead = false;
    return r;
  });
  ok(
    'ses cinq clips répondent',
    clips.repos === 'idle' && clips.marche === 'walk' && clips.tir === 'fire' && clips.ramasse === 'pick' && clips.mort === 'death',
    `repos→${clips.repos} · marche→${clips.marche} · tir→${clips.tir} · ramasse→${clips.ramasse} · mort→${clips.mort}`
  );

  /* aucune image vide dans la boucle de repos */
  const vide = await p.evaluate(() => {
    const s = Sprites.sheetInfo('char_gabriel_idle');
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const g2 = c.getContext('2d');
    let creuses = 0;
    for (let i = 0; i < s.n; i++) {
      g2.clearRect(0, 0, 96, 96);
      Sprites.drawSheet(g2, 'char_gabriel_idle', i, 48, 48, 96, {});
      const d = g2.getImageData(0, 0, 96, 96).data;
      let n = 0;
      for (let k = 3; k < d.length; k += 4) if (d[k] > 20) n++;
      if (n < 100) creuses++;
    }
    return { n: s.n, creuses };
  });
  ok('aucune image creuse dans sa boucle de repos', vide.creuses === 0, vide.n + ' images, ' + vide.creuses + ' creuse(s)');

  /* ses pieds tombent sur la ligne de sol */
  const pieds = await p.evaluate(() => {
    const mesure = dessin => {
      const c = document.createElement('canvas');
      c.width = 200;
      c.height = 260;
      const g2 = c.getContext('2d');
      g2.imageSmoothingEnabled = false;
      dessin(g2);
      const d = g2.getImageData(0, 0, 200, 260).data;
      let y1 = -1,
        x0 = 1e9,
        x1 = -1,
        y0 = 1e9;
      for (let y = 0; y < 260; y++)
        for (let x = 0; x < 200; x++)
          if (d[(y * 200 + x) * 4 + 3] > 20) {
            if (y > y1) y1 = y;
            if (y < y0) y0 = y;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
          }
      return { bas: y1, h: y1 - y0 + 1, w: x1 - x0 + 1 };
    };
    const out = {};
    for (const id of ['char_martin', 'char_gabriel', 'char_jean']) {
      const c = Content.character(id);
      out[c.name] = mesure(g2 =>
        Sprites.drawBody(g2, c.sprite, 100, 200, { anim: c.anim, size: c.size, clip: 'idle', clipT: 0, dir: 'e', walk: 0 })
      );
    }
    return out;
  });
  const bas = Object.values(pieds).map(x => x.bas),
    haut = Object.values(pieds).map(x => x.h);
  ok(
    'les trois posent les pieds au même endroit',
    Math.max(...bas) - Math.min(...bas) <= 3,
    Object.entries(pieds)
      .map(([k, v]) => `${k} ${v.bas}`)
      .join(' · ')
  );
  ok(
    'les trois font la même taille',
    Math.max(...haut) - Math.min(...haut) <= 12,
    Object.entries(pieds)
      .map(([k, v]) => `${k} ${v.w}×${v.h}`)
      .join(' · ')
  );

  const jeanEnJeu = await p.evaluate(async () => {
    Run.toHub();
    await new Promise(r => setTimeout(r, 600));
    Meta.profile.character = 'char_jean';
    Meta.profile.pet = 'pet_ori';
    Meta.profile.petMode = 'always';
    Meta.save();
    document.getElementById('hub-enter').click();
    await new Promise(r => setTimeout(r, 1800));
    return {
      perso: G.run.char.id,
      clip: G.player.clip,
      equipe: G.pets[0] && G.pets[0].pair && G.pets[0].pair.name,
      animal: G.pets.map(x => x.name).join('+'),
    };
  });
  ok(
    'on joue Jean avec ORI',
    jeanEnJeu.perso === 'char_jean' && jeanEnJeu.equipe === 'Œil pour œil',
    jeanEnJeu.animal + ' · ' + jeanEnJeu.equipe + ' · clip ' + jeanEnJeu.clip
  );
  await p.screenshot({ path: out('gabriel_jeu.png') });
});
