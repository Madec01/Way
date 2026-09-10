/* Ce que voit quelqu'un qui ouvre le jeu pour la première fois : profil neuf, mode Normal. */
const { test, out } = require('./lib');
test(async ({ page: p, ok, entrer }) => {
  await entrer('normal');
  await p.evaluate(() => {
    try {
      localStorage.clear();
    } catch (e) {}
  });
  await entrer('normal'); // recharge la page : profil neuf

  const dep = await p.evaluate(() => ({
    credits: Meta.profile.coins,
    pets: Content.pets().map(x => `${x.name} (${x.price} ◈, ${Meta.petUnlocked(x.id) ? 'possédé' : 'à acheter'})`),
    chars: Content.characters().map(c => `${c.name}${Meta.characterUnlocked(c.id) ? '' : ' (verrouillé)'}`),
  }));
  ok(
    "les personnages de l'auteur sont jouables d'emblée",
    dep.chars.some(c => c.startsWith('Martin') && !c.includes('verrouillé')),
    dep.chars.join(' · ')
  );
  ok(
    "les animaux de l'auteur sont possédés d'emblée",
    dep.pets.every(x => x.includes('possédé')),
    dep.pets.join(' · ') + ` · ${dep.credits} crédits`
  );

  const shop = await p.evaluate(() => ({
    cartes: [...document.querySelectorAll('#hub-pets .card.pet')].map(c => c.querySelector('.cardtitle span').textContent),
    modes: [...document.querySelectorAll('#hub-team [data-mode]')].map(b => b.textContent),
  }));
  await p.waitForTimeout(300);
  ok(
    'le camp montre Uno parmi les compagnons, la carte « Seul », et les deux modes dans la carte d’équipe',
    shop.cartes.includes('Uno') && shop.cartes.includes('Seul') && shop.modes.length === 2,
    shop.cartes.join(' | ') + ' — modes : ' + shop.modes.join(', ')
  );

  const choix = await p.evaluate(() => {
    [...document.querySelectorAll('#hub-pets .card.pet')].find(c => c.textContent.includes('Seul')).click();
    [...document.querySelectorAll('#hub-pets .card.pet')].find(c => c.textContent.includes('Uno')).click();
    return { pet: Meta.profile.pet, mode: Meta.profile.petMode };
  });
  await p.waitForTimeout(400);
  ok('un clic le choisit comme compagnon de départ', choix.pet === 'pet_uno' && choix.mode === 'always', choix.mode);

  const perso = await p.evaluate(() => {
    const c = [...document.querySelectorAll('#hub-chars .card')].find(x => x.textContent.includes('Martin'));
    c.click();
    return { char: Meta.profile.character };
  });
  await p.waitForTimeout(400);
  const equipe = await p.evaluate(() => document.querySelector('#hub-team').textContent.replace(/\s+/g, ' '));
  ok("choisir Martin affiche l'équipe", perso.char === 'char_martin' && /Vieille complicité/.test(equipe), equipe.slice(0, 80));

  const enjeu = await p.evaluate(async () => {
    document.getElementById('hub-enter').click();
    await new Promise(r => setTimeout(r, 1200));
    const sk = document.querySelector('[data-skill]');
    if (sk) sk.click();
    await new Promise(r => setTimeout(r, 300));
    const go = [...document.querySelectorAll('button')].find(b => /entrer|salle 1|commencer/i.test(b.textContent));
    if (go) go.click();
    await new Promise(r => setTimeout(r, 1600));
    return {
      salle: G.room && G.room.index,
      joueur: G.player && G.player.char && G.player.char.name,
      pet: G.pet && G.pet.name,
      mode: G.pet && G.pet.mode,
    };
  });
  ok(
    'on entre en salle 1 avec Martin et Uno',
    enjeu.salle === 1 && enjeu.joueur === 'Martin' && enjeu.pet === 'Uno',
    `salle ${enjeu.salle} · ${enjeu.joueur} + ${enjeu.pet} (${enjeu.mode})`
  );
  await p.screenshot({ path: out('acces.png') });
});
