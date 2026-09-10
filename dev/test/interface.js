/* Chantier I-1 — ce qui est cassé ou faux. Ce test mesure :
   les cinq onglets de la boutique dans le cadre ; les lignes « Tenue », « calibration(s) », « Phase 2 » et « case(s) »
   disparues ; la scène d'attraction figée derrière le hub ; Uno sur un profil neuf ; le HUD sondé (chaque texte dans
   un panneau, tout dans la vue, boîte du cartouche à la taille du texte) ; les couleurs de PV inversées et la vignette
   sous 30 % ; un seul compteur de série ; la barre du boss en haut sans bandeau ; les toasts en bas à droite ; le badge
   du compagnon aligné sur le cartouche d'arme ; l'écran de fin sans ligne fausse, avec « Rejouer ». */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, salle, run, sansPause }) => {
  await entrer('test');

  /* --- hub --- */
  const hub = await p.evaluate(() => {
    const texte = document.querySelector('#ui').textContent;
    const gele = Attract.frozen;
    UI.showShop();
    const tabs = [...document.querySelectorAll('.tab')];
    const boite = tabs[0].closest('.panel');
    const droite = boite ? boite.getBoundingClientRect().right : innerWidth;
    const dehors = tabs.filter(t => t.getBoundingClientRect().right > droite + 1 || t.getBoundingClientRect().left < 0).length;
    UI.showHub();
    return {
      n: tabs.length,
      dehors,
      libelles: tabs.map(t => t.textContent.trim()),
      tenue: /Tenue :/.test(texte),
      calib: /calibration\(s\)/.test(texte),
      gele,
    };
  });
  ok('les onglets de la boutique sont tous dans le cadre', hub.n === 3 && hub.dehors === 0, `${hub.n} onglets, ${hub.dehors} dehors`);
  ok(
    'l’onglet des compétences s’appelle « Compétences »',
    hub.libelles.includes('Compétences') && !hub.libelles.includes('Personnages'),
    hub.libelles.join(' · ')
  );
  ok('« Tenue » et « calibration(s) » ont disparu du hub', !hub.tenue && !hub.calib);
  ok('la scène d’attraction est figée derrière le hub', hub.gele === true);

  const titre = await p.evaluate(() => {
    UI.showMenu();
    const t = document.querySelector('#ui').textContent;
    const r = { phase: /Phase 2/.test(t), cases: /case\(s\)/.test(t), gele: Attract.frozen };
    UI.showHub();
    return r;
  });
  ok(
    'l’écran-titre n’écrit plus « Phase 2 » ni « case(s) », et l’attraction y revit',
    !titre.phase && !titre.cases && titre.gele === false
  );

  /* --- HUD sondé, PV, compteur de série, toasts, badge --- */
  await sansPause();
  await salle(2);
  const hud = await p.evaluate(() => {
    G.debug.hudProbe = true;
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 720;
    const ctx = c.getContext('2d');
    const V = Engine.view;
    const L = -V.ox,
      T = -V.oy,
      R = -V.ox + V.w,
      B = -V.oy + V.h;
    const sonde = () => {
      UI.renderHud(ctx);
      UI.renderToasts(ctx);
      const pr = UI.hudProbe;
      const dedans = (t, r) => t.x >= r.x - 1 && t.x + t.w <= r.x + r.w + 1 && t.y >= r.y - 1 && t.y <= r.y + r.h + 1;
      const orphelins = pr.texts.filter(t => !t.free && !pr.rects.some(r => dedans(t, r))).map(t => t.t);
      const horsVue = pr.rects.filter(r => r.x < L - 1 || r.x + r.w > R + 1 || r.y < T - 1 || r.y + r.h > B + 1).length;
      return {
        orphelins,
        horsVue,
        flags: Object.assign({}, pr.flags),
        texts: pr.texts.map(t => ({ t: t.t, x: t.x, y: t.y, w: t.w })),
        rects: pr.rects.slice(),
      };
    };
    const pl = G.player;
    pl.hp = pl.stats.maxHp;
    const plein = sonde();
    pl.hp = pl.stats.maxHp * 0.15;
    const bas = sonde();
    pl.hp = pl.stats.maxHp;
    G.enemies = []; // un toast est retenu tant qu'un ennemi est près (I-6) : ici on veut le voir tout de suite
    UI.toast('Un message court');
    const avecToast = sonde();
    const toast = avecToast.texts.find(t => t.t === 'Un message court');
    /* badge du compagnon : même bord gauche et même largeur que le cartouche d'arme */
    Pets.give('pet_uno');
    UI.hudProbe.rects.length = 0;
    Pets.renderHud(ctx); // le badge passe par UI.panel (I-5) : la sonde le voit
    const badge = UI.hudProbe.rects.find(r => r.h === 30) || UI.hudProbe.rects[0];
    const arme = plein.rects.find(r => r.w === 420);
    return {
      orphelins: plein.orphelins,
      horsVue: plein.horsVue,
      pleinCouleur: plein.flags.hpColor,
      pleinVignette: !!plein.flags.vignette,
      basCouleur: bas.flags.hpColor,
      basVignette: !!bas.flags.vignette,
      toast: toast && { x: toast.x, y: toast.y, R, B, CX: L + V.w / 2 },
      badge,
      arme,
      cartouche: plein.texts.find(t => /Salle 2\/9/.test(t.t)),
      cartoucheBoite: plein.rects.find(r => r.y === T + 8),
    };
  });
  ok('chaque texte du HUD tient dans un panneau', hud.orphelins.length === 0, hud.orphelins.join(' | ') || 'aucun orphelin');
  ok('tout le HUD tient dans la vue', hud.horsVue === 0, hud.horsVue + ' panneau(x) hors vue');
  ok(
    'la boîte du cartouche suit son texte',
    hud.cartouche && hud.cartoucheBoite && hud.cartoucheBoite.w - hud.cartouche.w >= 20 && hud.cartoucheBoite.w - hud.cartouche.w <= 40,
    hud.cartouche && `${Math.round(hud.cartouche.w)} px de texte dans ${hud.cartoucheBoite && hud.cartoucheBoite.w} px`
  );
  ok('PV pleins : vert, sans vignette', hud.pleinCouleur === '#7fff9a' && !hud.pleinVignette, hud.pleinCouleur);
  ok('PV à 15 % : rouge et vignette en périphérie', hud.basCouleur === '#ff3b3b' && hud.basVignette, hud.basCouleur);
  ok(
    'le toast est en bas à droite',
    hud.toast && hud.toast.x > hud.toast.CX && hud.toast.y > hud.toast.B - 120,
    hud.toast && `x ${Math.round(hud.toast.x)}, y ${Math.round(hud.toast.y)}`
  );
  ok(
    'le badge du compagnon est aligné sur le cartouche d’arme',
    hud.badge && hud.arme && hud.badge.x === hud.arme.x && hud.badge.w === hud.arme.w,
    JSON.stringify({ badge: hud.badge, arme: hud.arme })
  );

  /* --- un seul compteur de série : plus de bandeau « SÉRIE » --- */
  await salle(7);
  const serie = await p.evaluate(() => {
    let bandeaux = [];
    const orig = UI.banner;
    UI.banner = (t, ...a) => {
      bandeaux.push(t);
      return orig(t, ...a);
    };
    const tp = G.room.tempo;
    tp.started = true;
    tp.combo = 0;
    G.paused = true;
    const d = Beat.distToBeat;
    Beat.distToBeat = () => 0;
    for (let i = 1; i <= 6; i++) {
      tp.lastIdx = -10 - i;
      Tempo.playerAction(G.player, 'shot');
    }
    Beat.distToBeat = d;
    UI.banner = orig;
    G.paused = false;
    const src = Tempo.renderHud.toString();
    return { bandeaux, interne: src.includes('métronome interne'), tempoHaut: src.includes('TEMPO ×') };
  });
  ok(
    'plus de bandeau « SÉRIE » ni de « TEMPO » en haut : le compteur reste près du joueur',
    serie.bandeaux.every(t => !/SÉRIE/.test(t)) && !serie.tempoHaut,
    serie.bandeaux.join(' | ') || 'aucun bandeau'
  );
  ok('« métronome interne » ne s’affiche plus', !serie.interne);

  /* --- boss : la barre en haut, sans bandeau au nom --- */
  const boss = await p.evaluate(async () => {
    const noms = [];
    const orig = UI.banner;
    UI.banner = (t, ...a) => {
      noms.push(t);
      return orig(t, ...a);
    };
    Debug.gotoRoom(5);
    await new Promise(r => setTimeout(r, 2500));
    UI.banner = orig;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    G.debug.hudProbe = true;
    UI.renderHud(ctx);
    const b = G.room.boss;
    return { boss: !!b, nom: b && b.name, bandeauNom: b && noms.includes(b.name), y: UI.hudProbe.flags.bossY, T: -Engine.view.oy };
  });
  ok(
    'la barre du boss est en haut de l’écran et son nom n’est pas aussi un bandeau',
    boss.boss && !boss.bandeauNom && boss.y != null && boss.y < boss.T + 20,
    `${boss.nom} · barre à y=${boss.y}`
  );

  /* --- profil neuf : Uno --- */
  await p
    .evaluate(() => {
      localStorage.clear();
      location.reload();
    })
    .catch(() => {});
  await p.waitForTimeout(600);
  await entrer('normal');
  const neuf = await p.evaluate(() => ({ pet: Meta.profile.pet, mode: Meta.profile.petMode }));
  ok('un profil neuf part avec Uno', neuf.pet === 'pet_uno' && neuf.mode === 'always', `${neuf.pet} · ${neuf.mode}`);

  /* --- écran de fin : ligne vraie, « Rejouer » --- */
  await run({ character: 'char_martin', pet: 'pet_uno' });
  const fin = await p.evaluate(async () => {
    G.debug.invuln = false;
    G.run.coinsPending = 100;
    G.run.coinsValidated = 50;
    const arme = G.run.weapon,
      comp = G.run.skill;
    G.player.hp = 1;
    Combat.hitPlayer(999, { type: 'contact' });
    await new Promise(r => setTimeout(r, 1900));
    const t = (document.querySelector('.panel.end') || document.body).textContent;
    const again = document.querySelector('#end-again');
    const r = {
      overlay: G.overlay,
      faux: /10 % de/.test(t),
      butin: /Butin ramené/.test(t),
      salles: /Salles/.test(t),
      bouton: again && again.textContent,
    };
    if (again) again.click();
    await new Promise(r => setTimeout(r, 1500));
    Object.assign(r, {
      etat: G.state,
      salle: G.room && G.room.index,
      memeArme: G.run && G.run.weapon === arme && G.run.skill === comp,
      pet: G.pet && G.pet.id,
      overlayApres: G.overlay,
    });
    return r;
  });
  ok(
    'l’écran de fin ne dit plus « 10 % de » mais « Butin ramené », sans ligne « Salles »',
    fin.overlay === 'end' && !fin.faux && fin.butin && !fin.salles
  );
  ok(
    '« Rejouer » relance la même équipe, même arme, même compétence, en salle 1',
    fin.etat === 'run' && fin.salle === 1 && fin.memeArme && fin.pet === 'pet_uno' && !fin.overlayApres,
    `${fin.bouton} → salle ${fin.salle}, ${fin.pet}`
  );
});
