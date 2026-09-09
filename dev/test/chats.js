const { test, out } = require('./lib');
test(async ({ page: p, context, ok, entrer, salle, run, sansPause, erreurs: errs }) => {
  const s = await p.$('.menuscreen.splash'); if (s) { await s.click(); await p.waitForTimeout(2700); }
  await entrer('test');
  const defs = await p.evaluate(() => Content.pets().map(x => ({ id: x.id, nom: x.name, clips: Object.keys(x.anim || {}).length, taille: x.size, place: !!x.placeholder })));
  ok('les quatre animaux ont leurs planches', defs.every(x => x.clips === 4 && !x.place),
     defs.map(x => `${x.nom} ${x.clips} clips, taille ${x.taille}`).join(' · '));

  const sheets = await p.evaluate(() => {
    const o = {};
    for (const q of Content.pets()) for (const [c, n] of Object.entries(q.anim || {})) { const s2 = Sprites.sheetInfo(n); o[n] = s2 ? `${s2.fw}px ×${s2.n}` : 'ABSENTE'; }
    return o;
  });
  ok('toutes les planches sont lues', Object.values(sheets).every(v => v !== 'ABSENTE'),
     Object.keys(sheets).length + ' planches, ' + [...new Set(Object.values(sheets))].join(' / '));

  /* taille et ligne de sol : tout le monde debout sur le même trait */
  const mes = await p.evaluate(() => {
    /* seuil alpha > 200 : l'ombre (0,32 → 82) ne compte pas, seul le dessin compte — sans ça on mesure l'ombre */
    const boite = dessin => { const c = document.createElement('canvas'); c.width = 220; c.height = 260; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; dessin(g);
      const d = g.getImageData(0,0,220,260).data; let t=999,bt=-1,l=999,r=-1;
      for (let y=0;y<260;y++) for (let x=0;x<220;x++) if (d[(y*220+x)*4+3] > 200) { if(y<t)t=y; if(y>bt)bt=y; if(x<l)l=x; if(x>r)r=x; }
      return { bas: bt, h: bt-t+1, w: r-l+1 }; };
    /* on les dessine comme le jeu le fait, par Pet.render, tous au même point */
    const out = {};
    for (const d of Content.pets()) { const q = new Pet(d); q.x = 110; q.y = 160; q.clip = 'idle'; q.clipT = 0; q.dx = 1; q.dy = 0;
      const m = boite(g => q.render(g)); if (q.airborne) m.bas += 15;   // un animal qui vole plane 15 px au-dessus du sol : on le ramène
      out[d.name] = m; }
    const ch = Content.character('char_martin');
    out.Martin = boite(g => Sprites.drawBody(g, ch.sprite, 110, 160, { anim: ch.anim, size: ch.size, clip: 'idle', clipT: 0, dir: 'e', walk: 0 }));
    return out;
  });
  for (const [k, v] of Object.entries(mes)) console.log(`   ${k.padEnd(8)} ${v.w}×${v.h} px, pattes à ${v.bas}`);
  const bas = Object.values(mes).map(x => x.bas);
  ok('les quatre posent les pattes sur la ligne de sol du joueur', Math.max(...bas) - Math.min(...bas) <= 2, `de ${Math.min(...bas)} à ${Math.max(...bas)}`);
  /* chacun est affiché à ×2 exactement de sa case : c'est ce qui garde le même grain de pixel pour tous */
  const grain = await p.evaluate(() => Content.pets().map(q => ({ nom: q.name, k: q.size / Sprites.sheetInfo(q.anim.idle).fw })));
  ok('chaque animal est affiché à ×2 de sa case', grain.every(x => x.k === 2), grain.map(x => `${x.nom} ×${x.k}`).join(' · '));

  /* en jeu, avec leurs maîtres */
  for (const [ch, pet, attendu] of [['char_gabriel','pet_choupi','La maisonnée'], ['char_jean','pet_ori',"Œil pour œil"]]) {
    const r = await p.evaluate(async ([c, q]) => {
      if (G.run) Run.toHub(); await new Promise(x => setTimeout(x, 500));
      Meta.profile.character = c; Meta.profile.pet = q; Meta.profile.petMode = 'always'; Meta.save();
      document.getElementById('hub-enter').click(); await new Promise(x => setTimeout(x, 1800));
      return { perso: G.run.char.name, animaux: G.pets.map(z => z.name + ':' + z.clip), equipe: G.pets[0].pair && G.pets[0].pair.name };
    }, [ch, pet]);
    ok(`${r.perso} entre avec ${r.animaux.map(x => x.split(':')[0]).join(' & ')}`, r.equipe === attendu, r.equipe + ' · clips ' + r.animaux.join(' '));
  }

  /* leur clip suit ce qu'ils font */
  const clip = await p.evaluate(() => {
    const q = G.pets[0]; const o = {};
    q.animStep(0.016, false); o.arret = q.clip;
    for (let i = 0; i < 3; i++) q.animStep(0.016, true); o.marche = q.clip;
    q.act = 1; q.animStep(0.016, false); o.action = q.clip;
    return o;
  });
  ok('leurs clips suivent ce qu\'ils font', clip.arret === 'idle' && clip.marche === 'walk' && clip.action === 'attack',
     `arrêt ${clip.arret} · marche ${clip.marche} · action ${clip.action}`);

  /* la vignette de boutique n'est plus une pastille */
  const vign = await p.evaluate(() => {
    const out = {};
    for (const q of Content.pets()) { const c = Sprites.sheetCanvas(q.anim.idle, 32); out[q.name] = !!c; }
    return out;
  });
  ok('chacun a sa vignette de boutique', Object.values(vign).every(Boolean), Object.keys(vign).join(', '));

  });
