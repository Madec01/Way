/* Chantier 7 — se comparer entre amis. Ce test mesure : le score d'une partie (formule, ordre, arrondi) ; une graine
   notée à chaque partie, la même graine donne les mêmes tirages (paires, défi de la salle 2) et une autre graine en
   donne d'autres ; la graine du jour (la date en chiffres) cochée dans le camp ; l'écran de fin avec le score, la
   graine et la ligne de résultat à copier ; la ligne collée dans le camp qui rejoue la graine (et le palier) ; le
   tableau des dix meilleures parties par personnage, trié, plafonné ; l'export de la sauvegarde qui se relit et
   l'import qui remplace le profil en gardant une copie ; la version 4 de la sauvegarde qui migre une v3. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();

  /* --- le score --- */
  const score = await p.evaluate(() => {
    const f = Progression.runScore;
    const s3 = f({
      scores: [
        { index: 1, score: 0.9 },
        { index: 2, score: 0.5 },
      ],
      reached: 3,
      level: 4,
      time: 90,
      win: false,
    });
    const s9 = f({
      scores: Array.from({ length: 9 }, (_, i) => ({ index: i + 1, score: 0.8 })),
      reached: 9,
      level: 12,
      time: 300,
      win: true,
    });
    const s9lent = f({
      scores: Array.from({ length: 9 }, (_, i) => ({ index: i + 1, score: 0.8 })),
      reached: 9,
      level: 12,
      time: 900,
      win: true,
    });
    return { s3, s9, s9lent, dizaine: s3 % 10 === 0 && s9 % 10 === 0 };
  });
  ok(
    'le score : une mort en salle 3 vaut ~2 000, une victoire ~19 000, plus vite = plus de points, arrondi à la dizaine',
    score.s3 > 1500 && score.s3 < 3000 && score.s9 > 15000 && score.s9 < 22000 && score.s9 > score.s9lent && score.dizaine,
    JSON.stringify(score)
  );

  /* --- la graine : notée, reproductible, différente autrement --- */
  const graines = await p.evaluate(() => {
    const tirage = seed => {
      Run.start({
        character: Meta.profile.character,
        biome: 'biome_1',
        weapon: Content.weapons()[0].id,
        skill: Content.skills()[0].id,
        seed,
      });
      const pairs = G.run.pairChoices.map(x => x.bonus.name).join('+');
      Room.load(2);
      const defi = G.room.challenge && G.room.challenge.id;
      const drop = Pickups.list.map(x => x.kind + Math.round(x.x)).join(',');
      return { seed: G.run.seed, pairs, defi, drop };
    };
    const a = tirage(20260911),
      b = tirage(20260911);
    const autres = [1, 2, 3, 4, 5, 6].map(tirage);
    return { a, b, autres: autres.map(x => x.pairs + '|' + x.defi) };
  });
  ok(
    'la même graine donne la même partie (paires, défi de la salle 2) ; six autres graines donnent au moins deux tirages différents',
    graines.a.seed === 20260911 &&
      graines.a.pairs === graines.b.pairs &&
      graines.a.defi === graines.b.defi &&
      new Set(graines.autres).size >= 2,
    JSON.stringify(graines)
  );

  /* --- la graine du jour dans le camp --- */
  await p.evaluate(() => {
    UI.hideAll();
    Run.toHub();
  });
  await p.waitForTimeout(600);
  const jour = await p.evaluate(async () => {
    const d = new Date();
    const attendu = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const cb = document.querySelector('#hub-daily');
    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    const coche = Meta.profile.dailySeed;
    document.getElementById('hub-enter').click();
    await new Promise(r => setTimeout(r, 400));
    return {
      attendu,
      texte: document.querySelector('.graine-jour b') && +document.querySelector('.graine-jour b').textContent,
      coche,
      seed: G.run && G.run.seed,
    };
  });
  ok(
    'la graine du jour est la date en chiffres ; cochée dans le camp, la partie part avec elle',
    jour.texte === Meta_daily(jour) && jour.coche && jour.seed === jour.attendu,
    JSON.stringify(jour)
  );
  function Meta_daily(j) {
    return j.attendu;
  }

  /* --- l'écran de fin : score, graine, ligne à copier --- */
  await p.evaluate(() => {
    Meta.profile.dailySeed = false;
    Meta.save();
  });
  await salle(3, 'biome_1');
  const fin = await p.evaluate(async () => {
    G.run.scores.push({ index: 1, score: 0.9 }, { index: 2, score: 0.7 });
    G.run.level = 3;
    G.debug.invuln = false;
    G.player.secondChanceUsed = true;
    G.player.hp = 1;
    Combat.hitPlayer(999, { type: 'contact', x: G.player.x + 10, y: G.player.y });
    for (let i = 0; i < 80 && G.overlay !== 'end'; i++) await new Promise(r => setTimeout(r, 100));
    const s = document.querySelector('#screen-end');
    const ligne = ((s.querySelector('#end-line') || {}).textContent || '').replace(/\u00a0/g, ' ').trim();
    return {
      overlay: G.overlay === 'end' || (!s.hidden && s.classList.contains('on')) || s.innerHTML.length > 200,
      score: G.run.summary && G.run.summary.score,
      rang: G.run.rank,
      ligne,
      graineAffichee: /graine \d+/.test((s.querySelector('.progline') || {}).textContent || ''),
      bouton: !!s.querySelector('#end-copy'),
      points: /points/.test(s.textContent),
    };
  });
  ok(
    "l'écran de fin montre le score, la graine, et une ligne « WAY · … · salle 3 · … pts · graine N » avec son bouton Copier",
    fin.overlay &&
      fin.score > 0 &&
      fin.rang >= 1 &&
      /^WAY · .+ · ADMISSION · salle 3 · \d+ min \d\d · [\d ]+ pts · graine \d+$/.test(fin.ligne) &&
      fin.graineAffichee &&
      fin.bouton &&
      fin.points,
    JSON.stringify(fin)
  );

  /* --- la ligne collée dans le camp rejoue la graine --- */
  const rejoue = await p.evaluate(async ligne => {
    document.getElementById('end-hub').click();
    await new Promise(r => setTimeout(r, 500));
    const input = document.querySelector('#hub-seed-text');
    input.value = 'Regarde ça ! ' + ligne.replace('ADMISSION', 'LA SERRE');
    document.getElementById('hub-seed-go').click();
    await new Promise(r => setTimeout(r, 300));
    const affiche = (document.querySelector('#hub-seednext') || {}).textContent || '';
    const seedNext = Meta.profile.seedNext;
    document.getElementById('hub-enter').click();
    await new Promise(r => setTimeout(r, 400));
    return { affiche: /Prochaine partie/.test(affiche), seedNext, seed: G.run.seed, biome: G.run.biome.id, oublie: Meta.profile.seedNext };
  }, fin.ligne);
  const graineLigne = +(/graine (\d+)/.exec(fin.ligne) || [])[1];
  ok(
    'la ligne d’un ami collée dans le camp : la prochaine partie rejoue sa graine (et son palier), une seule fois',
    rejoue.affiche &&
      rejoue.seedNext === graineLigne &&
      rejoue.seed === graineLigne &&
      rejoue.biome === 'biome_2' &&
      rejoue.oublie === null,
    JSON.stringify(rejoue)
  );

  /* --- le tableau des meilleures parties --- */
  const tableau = await p.evaluate(async () => {
    const ch = G.run.char.id;
    Meta.profile.best = {};
    for (let i = 0; i < 13; i++)
      Meta.recordScore({
        char: ch,
        score: 1000 + i * 137,
        room: 1 + (i % 9),
        win: false,
        time: 60 + i,
        seed: 100 + i,
        biome: 'biome_1',
        pet: null,
        date: '2026-09-11',
      });
    const l = Meta.profile.best[ch];
    UI.hideAll();
    Run.toHub();
    await new Promise(r => setTimeout(r, 400));
    const rows = [...document.querySelectorAll('table.bests tbody tr')];
    return {
      n: l.length,
      tri: l.every((b, i) => !i || l[i - 1].score >= b.score),
      premier: l[0].score,
      lignes: rows.length,
      cellule: rows[0] && rows[0].querySelector('.pts').textContent.trim(),
    };
  });
  ok(
    'le camp liste les dix meilleures parties du personnage, triées par points, plafonnées à dix',
    tableau.n === 10 &&
      tableau.tri &&
      tableau.premier === 1000 + 12 * 137 &&
      tableau.lignes === 10 &&
      tableau.cellule.replace(/\s/g, '') === String(1000 + 12 * 137),
    JSON.stringify(tableau)
  );

  /* --- export / import --- */
  const sauve = await p.evaluate(() => {
    const txt = Meta.exportText();
    const d = JSON.parse(txt);
    const avant = JSON.stringify(d.profile);
    /* on abîme le profil, puis on réimporte le texte */
    const r0 = Meta.importText('pas une sauvegarde');
    const r1 = Meta.importText(JSON.stringify({ coucou: 1 }));
    const bosse = JSON.parse(avant);
    bosse.coins = 12345;
    bosse.runs = 77;
    bosse.v = 3; // une v3 : la migration 3 → 4 doit passer sans rien perdre
    delete bosse.best;
    const r2 = Meta.importText(JSON.stringify({ way: 'sauvegarde', v: 3, profile: bosse }));
    const stocke = JSON.parse(localStorage.getItem('way_save'));
    const secours = localStorage.getItem('way_save_secours_import');
    return {
      way: d.way,
      v: d.v,
      r0: r0.ok,
      r1: r1.ok,
      r2: r2.ok,
      coins: stocke.coins,
      runs: stocke.runs,
      vStocke: stocke.v,
      best: typeof stocke.best,
      secours: !!secours && JSON.parse(secours).coins !== 12345,
    };
  });
  ok(
    'la sauvegarde s’exporte en texte, refuse un texte étranger, et une v3 importée est migrée en v4 avec ses crédits, une copie de l’ancienne gardée',
    sauve.way === 'sauvegarde' &&
      sauve.v === 4 &&
      !sauve.r0 &&
      !sauve.r1 &&
      sauve.r2 &&
      sauve.coins === 12345 &&
      sauve.runs === 77 &&
      sauve.vStocke === 4 &&
      sauve.best === 'object' &&
      sauve.secours,
    JSON.stringify(sauve)
  );
  /* le camp expose les trois gestes */
  const boutons = await p.evaluate(() => {
    document.getElementById('hub-save-open').click();
    const box = document.getElementById('hub-save');
    return {
      visible: !box.hidden,
      dl: !!box.querySelector('#save-download'),
      copie: !!box.querySelector('#save-copy'),
      fichier: !!box.querySelector('#save-file'),
      colle: !!box.querySelector('#save-import'),
    };
  });
  ok(
    'le camp a un volet Sauvegarde : télécharger, copier, importer un fichier, coller un texte',
    boutons.visible && boutons.dl && boutons.copie && boutons.fichier && boutons.colle,
    JSON.stringify(boutons)
  );
});
