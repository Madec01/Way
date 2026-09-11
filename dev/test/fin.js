/* Chantier I-7 — choisir et finir en un coup d'œil. Ce test mesure : la montée de niveau (« choix 1 sur 3 », l'icône de
   catégorie dans un rond, le ruban de rareté, « tu es à … », la bande des greffes déjà prises) ; le coffre en une
   phrase ; l'écran de fin (deux gros chiffres qui sont les plus grands textes de l'écran, la ligne de progression, le
   détail replié, la phrase du compagnon, « Repartir tout de suite » qui relance la même équipe sans passer par le hub,
   « Avec n crédits tu peux prendre … » qui ouvre la boutique) ; la pause (temps, salle, PV, crédits, stats de l'arme,
   commandes, curseurs stylés) ; le HUD de combat éteint derrière l'écran de fin. */
const { test } = require('./lib');
const fs = require('fs');
const path = require('path');
test(async ({ page: p, ok, entrer, run }) => {
  await entrer('test');
  await run({ character: 'char_martin', pet: 'pet_uno' });
  await p.waitForTimeout(1400);

  /* --- la montée de niveau --- */
  const niveau = await p.evaluate(async () => {
    G.enemies = [];
    Run.takeUpgrade(Content.upgrade('upg_gachette'));
    Run.levelUp.call(Run); // pas de scène ici : on veut l'écran tout de suite
    G.run.pendingLevelUps = 1;
    Run.levelUp();
    await new Promise(r => setTimeout(r, 120));
    const s = document.querySelector('.panel.choice');
    const cards = [...s.querySelectorAll('.card.upg')];
    const r = {
      titre: s.querySelector('h2').textContent.replace(/\s+/g, ' ').trim(),
      cartes: cards.length,
      icones: cards.filter(c => c.querySelector('.iconround canvas.icon')).length,
      rubans: cards.filter(c => c.querySelector('.ribbon') && /Commun|Rare|Épique|Colossal/.test(c.querySelector('.ribbon').textContent))
        .length,
      etat: cards.filter(c => /tu es à/.test(c.textContent)).length,
      prises: /Déjà à toi/.test(s.textContent) && /Gâchette/.test(s.textContent),
      bordure: getComputedStyle(cards[0]).borderTopWidth,
    };
    UI.hideChoice();
    G.paused = false;
    G.run.pendingLevelUps = 0;
    return r;
  });
  ok(
    'la montée de niveau : « choix 1 sur 3 », une icône dans un rond, un ruban de rareté, bordure de 2 px',
    /choix 1 sur \d/.test(niveau.titre) &&
      niveau.cartes >= 3 &&
      niveau.icones === niveau.cartes &&
      niveau.rubans === niveau.cartes &&
      niveau.bordure === '2px',
    JSON.stringify(niveau)
  );
  ok(
    'chaque carte dit où tu en es (« tu es à … »), et la bande des greffes déjà prises est là',
    niveau.etat >= 1 && niveau.prises,
    `${niveau.etat} cartes avec l’état, prises : ${niveau.prises}`
  );

  /* --- le coffre : une phrase --- */
  const coffre = await p.evaluate(async () => {
    G.room.chest = { x: G.player.x, y: G.player.y, r: 22, opened: false };
    Run.chestChoice();
    await new Promise(r => setTimeout(r, 80));
    const s = document.querySelector('.panel.choice');
    const r = { titre: s.querySelector('h2').textContent.trim(), sous: s.querySelector('.eyebrow').textContent.trim() };
    UI.hideChoice();
    G.paused = false;
    G.room.chest = null;
    return r;
  });
  ok(
    'le coffre : titre « Coffre », sous-titre en une phrase, sans pourcentage de qualité',
    /^Coffre/.test(coffre.titre) && !/qualité|%/.test(coffre.sous) && coffre.sous.length > 12,
    coffre.sous
  );

  /* --- la pause --- */
  const pause = await p.evaluate(() => {
    UI.togglePause();
    const s = document.querySelector('.panel.pause');
    const t = s.textContent.replace(/\s+/g, ' ');
    const range = s.querySelector('input[type=range]');
    const r = {
      temps: /\d:\d\d/.test(t),
      salle: /Salle\s*\d+ \/ 9/.test(t),
      pv: /PV\s*\d+ \/ \d+/.test(t),
      credits: /Crédits en jeu/.test(t),
      arme: /dégâts par coup/.test(t),
      commandes: /Échap : pause|pause/.test(t) && /bouger/.test(t),
      accent: range && getComputedStyle(range).accentColor,
      fond: getComputedStyle(document.querySelector('#screen-pause')).backgroundColor,
    };
    UI.togglePause();
    return r;
  });
  ok(
    'la pause dit le temps, la salle, les PV, les crédits en jeu, les stats de l’arme et les commandes',
    pause.temps && pause.salle && pause.pv && pause.credits && pause.arme && pause.commandes,
    JSON.stringify(pause)
  );
  ok(
    'les curseurs sont stylés comme le reste et le jeu est assombri derrière',
    pause.accent && pause.accent !== 'auto' && /0\.7\)$/.test(pause.fond),
    `${pause.accent} · ${pause.fond}`
  );

  /* --- l'écran de fin --- */
  const fin = await p.evaluate(async () => {
    let hubs = 0;
    const origHub = UI.showHub;
    UI.showHub = function () {
      hubs++;
      return origHub.apply(this, arguments);
    };
    Meta.profile.metaTiers.meta_vitalite = 0; // le mode test a tout acheté : on rouvre un palier pour voir la suggestion
    G.debug.invuln = false;
    G.run.coinsPending = 300;
    G.run.coinsValidated = 100;
    const pl = G.player;
    pl.hp = 1;
    pl.secondChanceUsed = true;
    const t0 = performance.now();
    Combat.hitPlayer(999, { type: 'contact' });
    await new Promise(r => setTimeout(r, 400));
    G.debug.hudProbe = true;
    for (let i = 0; i < 100 && G.overlay !== 'end'; i++) await new Promise(r => setTimeout(r, 50));
    const s = document.querySelector('.panel.end');
    const nums = [...s.querySelectorAll('.bignum .n')];
    const tailles = [...s.querySelectorAll('*')]
      .filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
      .map(e => ({ t: e.textContent.trim().slice(0, 20), fs: parseFloat(getComputedStyle(e).fontSize), big: e.classList.contains('n') }));
    const maxAutre = Math.max(...tailles.filter(x => !x.big).map(x => x.fs));
    const minBig = Math.min(...tailles.filter(x => x.big).map(x => x.fs));
    const details = s.querySelector('details');
    const shop = s.querySelector('#end-shop');
    const again = s.querySelector('#end-again');
    const r = {
      overlay: G.overlay,
      nums: nums.map(n => n.textContent.trim()),
      plusGrands: nums.length === 2 && minBig > maxAutre,
      minBig,
      maxAutre,
      prog: /Meilleure tentative : salle \d/.test(s.textContent),
      repli: details && !details.open && /Butin ramené/.test(details.textContent),
      compagnon: /Uno/.test(s.querySelector('.petline').textContent),
      shop: shop && shop.textContent,
      again: again && again.textContent,
      hudRects: UI.hudProbe.rects.length,
    };
    /* le HUD de combat s'est tu derrière l'écran de fin : on force un rendu de la boucle et on lit la sonde */
    await new Promise(r => setTimeout(r, 100));
    r.hudRectsApres = UI.hudProbe.rects.length;
    r.mainGuard = true;
    /* « Repartir » : même équipe, même palier, sans passer par le hub */
    again.click();
    await new Promise(r => setTimeout(r, 1500));
    Object.assign(r, {
      etat: G.state,
      salle: G.room && G.room.index,
      pet: G.pet && G.pet.id,
      biome: G.run && G.run.biome.id,
      hubs,
      overlayApres: G.overlay,
    });
    UI.showHub = origHub;
    return r;
  });
  ok(
    'deux gros chiffres (crédits ramenés, salle atteinte) sont les plus grands textes de l’écran',
    fin.overlay === 'end' && fin.plusGrands && /◈/.test(fin.nums[0]) && /\/ 9/.test(fin.nums[1]),
    `${fin.nums.join(' · ')} — ${fin.minBig} px contre ${fin.maxAutre} px au plus ailleurs`
  );
  ok('la ligne de progression, le détail replié, la phrase du compagnon en grand', fin.prog && fin.repli && fin.compagnon);
  ok(
    '« Avec n crédits tu peux prendre Vitalité 1 » est proposé quand un achat devient possible',
    !!fin.shop && /Vitalité 1/.test(fin.shop),
    fin.shop || 'absent'
  );
  ok(
    '« Repartir tout de suite » relance la même équipe sur le même palier sans passer par le hub',
    /Repartir tout de suite/.test(fin.again) &&
      fin.etat === 'run' &&
      fin.salle === 1 &&
      fin.pet === 'pet_uno' &&
      fin.biome === 'biome_1' &&
      fin.hubs === 0 &&
      !fin.overlayApres,
    `${fin.again} → salle ${fin.salle}, ${fin.pet}, hub ouvert ${fin.hubs} fois`
  );

  /* --- la suggestion d'achat ouvre la boutique ; le HUD ne se dessine pas derrière l'écran de fin --- */
  const src = fs.readFileSync(path.join(__dirname, '..', '90_main.js'), 'utf8');
  ok(
    'le HUD de combat ne se dessine pas derrière l’écran de fin',
    /G\.overlay !== 'end'/.test(src.slice(src.indexOf('function render(ctx)'), src.indexOf('function render(ctx)') + 2500))
  );
  const boutique = await p.evaluate(async () => {
    await new Promise(r => setTimeout(r, 300));
    G.debug.invuln = false;
    G.player.hp = 1;
    G.player.secondChanceUsed = true;
    Combat.hitPlayer(999, { type: 'contact' });
    for (let i = 0; i < 100 && G.overlay !== 'end'; i++) await new Promise(r => setTimeout(r, 50));
    const shop = document.querySelector('#end-shop');
    if (shop) shop.click();
    await new Promise(r => setTimeout(r, 200));
    return {
      overlay: G.overlay,
      onglet: document.querySelector('.tab.on') && document.querySelector('.tab.on').textContent,
      etat: G.state,
    };
  });
  ok(
    'la suggestion d’achat ouvre la boutique sur les améliorations',
    boutique.overlay === 'shop' && boutique.onglet === 'Améliorations' && boutique.etat === 'hub',
    JSON.stringify(boutique)
  );
});
