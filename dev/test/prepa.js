/* Chantier I-4 — la prépa qui montre. Ce test mesure : chaque arme a une icône de la planche et trois jauges ; les
   cartes font 190 px et la grille est calée à gauche ; un seul panneau de détail, qui suit la sélection et le survol ;
   « n tirées au sort sur 8 » dans le titre des compétences, avec une icône par carte ; le ⇄ entre bonus et malus ;
   le bandeau MODE TEST en pied d'écran ; le bouton d'entrée qui récapitule ; sous 900 px, des cartes d'au moins 140 px. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer }) => {
  await entrer('test');
  /* la planche d'icônes se charge en tâche de fond : on l'attend avant d'ouvrir la prépa */
  await p.waitForFunction(() => Sprites.icon('weapon_blade', 32) && Sprites.icon('skill_dash', 32), { timeout: 15000 });
  await p.click('#hub-enter');
  await p.waitForSelector('#prep-weapons [data-w]', { timeout: 10000 });
  await p.hover('.prephead'); // la souris est restée sur une carte après le clic sur Partir : on l'écarte
  const forme = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#prep-weapons [data-w]')];
    const grid = document.querySelector('#prep-weapons').getBoundingClientRect();
    const r0 = cards[0].getBoundingClientRect();
    const go = document.querySelector('#prep-go').getBoundingClientRect();
    const testrow = document.querySelector('.testrow');
    const skills = [...document.querySelectorAll('#prep-skills [data-s]')];
    return {
      armes: cards.length,
      icones: cards.filter(c => c.querySelector('.iconbox canvas.icon')).length,
      jauges: cards.map(c => c.querySelectorAll('.jauge').length),
      largeur: r0.width,
      gauche: r0.left - grid.left,
      details: document.querySelectorAll('#prep-detail').length,
      detail: document.querySelector('#prep-detail').dataset.w,
      choisie: document.querySelector('#prep-weapons .selected').dataset.w,
      titreSkill: document.querySelector('.prepstep.skill h3').textContent.replace(/\s+/g, ' '),
      skIcones: skills.filter(c => c.querySelector('.iconbox canvas.icon')).length,
      skRecharge: skills.filter(c => /recharge \d+ s/.test(c.textContent)).length,
      swaps: document.querySelectorAll('#prep-pairs .swap').length,
      paires: document.querySelectorAll('#prep-pairs [data-p]').length,
      testBas: testrow ? testrow.getBoundingClientRect().top >= go.bottom : false,
      dps: /DPS|coups\/s|\d px/.test(document.querySelector('.prep2').innerText),
    };
  });
  ok(
    'chaque arme a son icône de la planche et trois jauges',
    forme.armes === 8 && forme.icones === 8 && forme.jauges.every(n => n === 3),
    `${forme.icones}/${forme.armes} icônes, jauges ${forme.jauges.join('')}`
  );
  ok(
    'cartes de 190 px, grille calée à gauche',
    Math.abs(forme.largeur - 190) < 3 && forme.gauche < 2,
    `${forme.largeur.toFixed(0)} px, ${forme.gauche.toFixed(0)} px du bord`
  );
  ok(
    'un seul panneau de détail, sur l’arme choisie',
    forme.details === 1 && forme.detail === forme.choisie,
    `${forme.detail} (choisie : ${forme.choisie})`
  );
  ok(
    '« 3 tirées au sort sur 8 » dans le titre, une icône et la recharge sur chaque carte',
    /3 tirées au sort sur 8/.test(forme.titreSkill) && forme.skIcones === 3 && forme.skRecharge === 3,
    forme.titreSkill
  );
  ok(
    'le ⇄ entre le bonus et le malus de chaque paire',
    forme.paires === 2 && forme.swaps === 2,
    `${forme.swaps} ⇄ pour ${forme.paires} paires`
  );
  ok('le bandeau MODE TEST est en pied d’écran, sous le bouton', forme.testBas, 'sous le bouton');
  ok('ni DPS, ni coups/s, ni px dans la prépa', !forme.dps);

  /* le panneau suit la sélection, puis le survol, puis revient */
  await p.click('#prep-weapons [data-w]:nth-child(2)');
  await new Promise(r => setTimeout(r, 100));
  const apresClic = await p.evaluate(() => document.querySelector('#prep-detail').dataset.w);
  await p.hover('#prep-weapons [data-w]:nth-child(3)');
  await new Promise(r => setTimeout(r, 100));
  const survol = await p.evaluate(() => document.querySelector('#prep-detail').dataset.w);
  await p.hover('.prephead');
  await new Promise(r => setTimeout(r, 100));
  const retour = await p.evaluate(() => document.querySelector('#prep-detail').dataset.w);
  ok(
    'le panneau de détail suit le clic, puis le survol, puis revient à l’arme choisie',
    apresClic === 'weapon_hammer' && survol === 'weapon_bow' && retour === 'weapon_hammer',
    `${apresClic} → ${survol} → ${retour}`
  );

  await p.click('#prep-skills [data-s]');
  await new Promise(r => setTimeout(r, 100));
  const go = await p.evaluate(() => ({
    txt: document.querySelector('#prep-go').textContent,
    off: document.querySelector('#prep-go').disabled,
    resume: document.querySelector('.prepsummary').textContent.replace(/\s+/g, ' '),
  }));
  ok(
    'le bouton d’entrée porte le récapitulatif',
    /Entrer en salle 1 avec Masse de pression et .+/.test(go.txt) && !go.off && /Masse de pression \+ \S/.test(go.resume),
    go.txt
  );

  /* sous 900 px : la grille se resserre mais aucune carte sous 140 px */
  await p.setViewportSize({ width: 800, height: 600 });
  await new Promise(r => setTimeout(r, 200));
  const mobile = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('#prep-weapons [data-w]')].map(c => c.getBoundingClientRect().width);
    const sk = [...document.querySelectorAll('#prep-skills [data-s]')].map(c => c.getBoundingClientRect().width);
    return {
      min: Math.min(...cards),
      cols: new Set(cards.map(w => Math.round(w))).size,
      skMin: Math.min(...sk),
      panel: document.querySelector('.prep2').getBoundingClientRect().width,
    };
  });
  ok(
    'sous 900 px, les cartes d’arme font au moins 140 px et les compétences prennent la largeur',
    mobile.min >= 140 && mobile.skMin > mobile.panel * 0.7,
    `${mobile.min.toFixed(0)} px, compétences ${mobile.skMin.toFixed(0)} / ${mobile.panel.toFixed(0)}`
  );
});
