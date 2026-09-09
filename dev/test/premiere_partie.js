/* Ce qu'un ami voit à sa première partie : plus de mots de l'ancien lore, pas de Neuf ni de Marge, le portrait
   du hub qui montre le bon personnage, F2 qui ne s'ouvre pas en Normal, « Personne » qui ne se cumule pas. */
const { test } = require('./lib');
const BANNIS = /Sujet\b|Sujet 09|Protocole|Réimpression|Salle Zéro|le Bureau|le Site\b|H-9|consentement|Itération/;
test(async ({ page, ok, entrer, run }) => {
  await entrer('normal');

  const persos = await page.evaluate(() => Content.characters().map(c => c.name));
  ok('Neuf et Marge ne sont plus dans le jeu', !persos.some(n => /Neuf|Marge/.test(n)), persos.join(' · '));
  ok('le premier personnage est Martin', persos[0] === 'Martin');

  const textes = await page.evaluate(() => ({
    str: Object.values(STR).join(' | '),
    lore: [].concat(LORE.hub, LORE.levelEnter, LORE.death, LORE.bossWin, [LORE.synopsis]).join(' | '),
    hub: document.body.innerText.replace(/\s+/g, ' '),
  }));
  for (const [nom, t] of Object.entries(textes)) {
    const m = t.match(BANNIS);
    ok(
      `aucun mot de l'ancien lore dans ${nom === 'str' ? 'les libellés' : nom === 'lore' ? 'les phrases du jeu' : 'le hub'}`,
      !m,
      m ? `trouvé « ${m[0]} »` : ''
    );
  }

  const portrait = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas.portrait-canvas')].pop();
    if (!c) return null;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let t = 1e9,
      b = -1,
      l = 1e9,
      r = -1;
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++)
        if (d[(y * c.width + x) * 4 + 3] > 40) {
          t = Math.min(t, y);
          b = Math.max(b, y);
          l = Math.min(l, x);
          r = Math.max(r, x);
        }
    return { w: r - l + 1, h: b - t + 1, perso: Meta.profile.character };
  });
  ok(
    'le portrait du hub montre le personnage de sa planche',
    portrait && portrait.h >= 120 && portrait.w <= 80,
    portrait ? `${portrait.w}×${portrait.h} px pour ${portrait.perso}` : 'aucun portrait'
  );

  await page.keyboard.press('F2');
  await page.waitForTimeout(300);
  const atelier = await page.evaluate(() => {
    const a = document.getElementById('atelier');
    return a ? !a.hidden : false;
  });
  ok("F2 n'ouvre pas l'atelier en mode Normal", !atelier);

  /* « Personne » puis un compagnon ramassé en route : la part gardée disparaît */
  await run({ character: 'char_martin', pet: null, petMode: 'none' });
  const solo = await page.evaluate(() => {
    const avant = G.player.buffs.some(b => b.id === 'solo');
    Pets.give('pet_uno', true, 'always');
    const apres = G.player.buffs.some(b => b.id === 'solo');
    return { avant, apres, pets: G.pets.length };
  });
  ok('« Personne » donne sa part au départ', solo.avant);
  ok('un compagnon ramassé en route la retire', !solo.apres && solo.pets === 1);

  const fin = await page.evaluate(async () => {
    G.debug.invuln = false;
    G.player.hp = 1;
    Combat.hitPlayer(999, { type: 'contact' });
    await new Promise(r => setTimeout(r, 1700));
    return document.body.innerText.replace(/\s+/g, ' ');
  });
  const m = fin.match(BANNIS);
  ok("aucun mot de l'ancien lore sur l'écran de fin", !m, m ? `trouvé « ${m[0]} »` : '');
});
