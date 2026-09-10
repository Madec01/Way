/* Chantier I-3 — le hub en trois questions. Ce test mesure : « Qui part ? Avec qui ? Où ? » avec une seule zone de
   défilement ; Gabriel avec ses chats en deux clics (sept interactions avant) ; le hub sous 250 mots (857 avant) ; la
   carte d'équipe (attelage, caractère, jauges, mode du compagnon à côté de ce qu'il pilote) ; la carte « Seul » ;
   les paliers verrouillés réduits ; la boutique dans son propre écran, avec la pastille quand quelque chose est
   achetable, et une carte d'amélioration qui ne montre que le palier suivant ; les fragments accessibles depuis le
   menu ; le bouton « Partir » qui récapitule l'équipe ; le défilement gardé d'un clic à l'autre. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer }) => {
  await entrer('test');
  const forme = await p.evaluate(() => {
    const s = document.querySelector('#screen-hub') || document.querySelector('.hub3').closest('.screen');
    const texte = document.querySelector('.hub3').innerText;
    const mots = texte.split(/\s+/).filter(Boolean).length;
    const scrolls = [...s.querySelectorAll('*')].filter(e => {
      const st = getComputedStyle(e);
      return /auto|scroll/.test(st.overflowY) && e.scrollHeight > e.clientHeight + 2;
    });
    return {
      questions: [...document.querySelectorAll('.hstep h2')].map(h => h.textContent.trim()),
      mots,
      scrolls: scrolls.map(e => e.id || e.className),
      chars: document.querySelectorAll('#hub-chars .card.char').length,
      pets: document.querySelectorAll('#hub-pets .card.pet').length,
      seul: !!document.querySelector('#hub-pets .card.seul'),
      portraits: document.querySelectorAll('#hub-chars .portrait-canvas').length,
      icones: document.querySelectorAll('#hub-pets .peticon').length,
      shopInHub: !!document.querySelector('.hub3 #hub-shop'),
      partir: document.querySelector('#hub-enter').textContent.replace(/\s+/g, ' ').trim(),
    };
  });
  /* les paliers verrouillés : le mode test ouvre tout, on regarde le camp d'un profil neuf le temps d'une mesure */
  const verrou = await p.evaluate(() => {
    const mode = G.mode;
    G.mode = 'normal';
    UI.showHub();
    const r = {
      verrouilles: [...document.querySelectorAll('#hub-biomes .card.level.locked')].map(c => c.getBoundingClientRect().width),
      jouable: [...document.querySelectorAll('#hub-biomes .card.level.pick')].map(c => c.getBoundingClientRect().width),
    };
    G.mode = mode;
    UI.showHub();
    return r;
  });
  ok(
    'trois questions : Qui part ? Avec qui ? Où ?',
    forme.questions.join(' | ') === '1 Qui part ? | 2 Avec qui ? | 3 Où ?',
    forme.questions.join(' | ')
  );
  ok('le hub tient en moins de 250 mots (857 avant)', forme.mots < 250, forme.mots + ' mots');
  ok('une seule zone de défilement', forme.scrolls.length <= 1, forme.scrolls.join(', ') || 'aucune (tout tient)');
  ok(
    'trois amis avec leur portrait, les compagnons avec leur sprite, une carte « Seul », pas de boutique dans le camp',
    forme.chars === 3 && forme.portraits === 3 && forme.pets === 4 && forme.icones === 3 && forme.seul && !forme.shopInHub,
    `${forme.chars} amis, ${forme.portraits} portraits, ${forme.pets} cartes compagnon, ${forme.icones} sprites`
  );
  ok(
    'les paliers verrouillés font moitié largeur du jouable',
    verrou.verrouilles.length === 3 && verrou.verrouilles.every(w => w < verrou.jouable[0] * 0.65),
    `${verrou.jouable[0]} contre ${verrou.verrouilles.join(' / ')}`
  );
  ok(
    'le bouton « Partir » récapitule le palier et l’équipe',
    /PARTIR — ADMISSION, 9 salles/.test(forme.partir) && /Martin \+ Uno/.test(forme.partir),
    forme.partir
  );

  /* Gabriel avec ses chats : deux clics */
  const gabriel = await p.evaluate(async () => {
    let clics = 0;
    const clic = sel => {
      clics++;
      document.querySelector(sel).click();
    };
    clic('#hub-chars .card.char:nth-child(2)');
    await new Promise(r => setTimeout(r, 100));
    clic('#hub-pets .card.pet:nth-child(2)');
    await new Promise(r => setTimeout(r, 100));
    const team = document.querySelector('#hub-team');
    return {
      clics,
      char: Meta.profile.character,
      pet: Meta.profile.pet,
      attelage: team.classList.contains('attelage'),
      texte: team.textContent.replace(/\s+/g, ' ').trim(),
      jauges: team.querySelectorAll('.jauge').length,
      modes: [...team.querySelectorAll('[data-mode]')].map(b => b.dataset.mode),
      partir: document.querySelector('#hub-enter').textContent.replace(/\s+/g, ' '),
    };
  });
  ok(
    'Gabriel avec ses chats en deux clics (sept interactions avant)',
    gabriel.clics === 2 && gabriel.char === 'char_gabriel' && gabriel.pet === 'pet_choupi',
    `${gabriel.char} + ${gabriel.pet}`
  );
  ok(
    'la carte d’équipe dit l’attelage, le caractère, trois jauges, et les deux modes à côté du compagnon',
    gabriel.attelage &&
      /La maisonnée/.test(gabriel.texte) &&
      /Pied sûr/.test(gabriel.texte) &&
      gabriel.jauges === 3 &&
      gabriel.modes.join() === 'always,call',
    gabriel.texte.slice(0, 160)
  );
  ok('le bouton « Partir » suit', /Gabriel \+ Choupi/.test(gabriel.partir), gabriel.partir.trim());

  const seul = await p.evaluate(async () => {
    document.querySelector('#hub-pets .card.seul').click();
    await new Promise(r => setTimeout(r, 100));
    const team = document.querySelector('#hub-team').textContent.replace(/\s+/g, ' ');
    const r = {
      mode: Meta.profile.petMode,
      pet: Meta.profile.pet,
      texte: /seul/.test(team) && /\+35 % de PV/.test(team),
      modes: document.querySelectorAll('#hub-team [data-mode]').length,
    };
    document.querySelector('#hub-pets .card.pet:nth-child(1)').click();
    await new Promise(r => setTimeout(r, 100));
    r.retour = Meta.profile.petMode;
    return r;
  });
  ok(
    '« Seul » garde le compagnon en mémoire et dit sa part ; reprendre un animal remet « tout le temps »',
    seul.mode === 'none' && seul.pet === 'pet_choupi' && seul.texte && seul.modes === 0 && seul.retour === 'always',
    JSON.stringify(seul)
  );

  /* le défilement survit à un clic */
  const scroll = await p.evaluate(async () => {
    const body = document.querySelector('#hub-body');
    body.scrollTop = 120;
    body.dispatchEvent(new Event('scroll'));
    await new Promise(r => setTimeout(r, 50));
    document.querySelector('#hub-biomes .card.level.pick').click();
    await new Promise(r => setTimeout(r, 100));
    return { avant: 120, apres: document.querySelector('#hub-body').scrollTop, max: body.scrollHeight - body.clientHeight };
  });
  ok(
    'le défilement est gardé d’un clic à l’autre',
    scroll.max < 130 || Math.abs(scroll.apres - 120) < 2,
    `${scroll.apres} après (max ${scroll.max})`
  );

  /* la boutique : son écran, sa pastille, ses cartes */
  const shop = await p.evaluate(async () => {
    Meta.profile.coins = 0;
    UI.showHub();
    const sansPastille = !document.querySelector('#hub-shop-open .dot');
    Meta.profile.coins = 999;
    Meta.profile.metaTiers.meta_vitalite = 0; // le mode test a tout acheté : on rouvre un palier pour voir la pastille
    UI.showHub();
    const avecPastille = !!document.querySelector('#hub-shop-open .dot');
    document.querySelector('#hub-shop-open').click();
    await new Promise(r => setTimeout(r, 100));
    const ecran = G.overlay;
    const carte = document.querySelector('#hub-shop .card.meta');
    const paliers = (carte.textContent.match(/Palier \d\/\d/g) || []).length;
    const tabs = [...document.querySelectorAll('.tab')].map(t => t.textContent);
    document.querySelector('#shop-back').click();
    await new Promise(r => setTimeout(r, 100));
    return { sansPastille, avecPastille, ecran, paliers, tabs, retour: G.overlay };
  });
  ok(
    'la boutique est un écran à part, avec une pastille quand quelque chose est achetable',
    shop.sansPastille && shop.avecPastille && shop.ecran === 'shop' && shop.retour === 'hub',
    JSON.stringify(shop)
  );
  ok(
    'une carte d’amélioration ne montre que le palier suivant ; trois onglets',
    shop.paliers <= 1 && shop.tabs.join() === 'Améliorations,Armes,Compétences',
    shop.tabs.join(', ')
  );

  const lore = await p.evaluate(async () => {
    UI.showMenu();
    const bouton = document.querySelector('#btn-lore');
    UI.showFragments();
    await new Promise(r => setTimeout(r, 50));
    const r = { bouton: !!bouton, ecran: G.overlay, cartes: document.querySelectorAll('#lore-list .card').length };
    UI.showHub();
    return r;
  });
  ok(
    'les fragments ont quitté le camp : une entrée du menu, leur propre écran',
    lore.bouton && lore.ecran === 'lore' && lore.cartes > 0,
    `${lore.cartes} fragments`
  );
});
