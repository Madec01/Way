const { test, out } = require('./lib');
const fs = require('fs');
test(async ({ page: p, context, ok, entrer, salle, run, sansPause, erreurs: errs }) => {
  /* deux fausses photos : un chat orange et un visage */
  function png(colA, colB) {
    const { createCanvas } = (() => {
      try {
        return require('canvas');
      } catch (e) {
        return {};
      }
    })();
    return null;
  }
  await entrer('test');
  // ---------- place nette ----------
  /* Aucun compagnon générique : la liste livrée est exactement celle de l'auteur, écrite dans content5.js. */
  const ROSTER = ['pet_uno', 'pet_choupi', 'pet_tanuki', 'pet_ori'];
  const vide = await p.evaluate(() => ({
    pets: Content.pets().map(x => x.id),
    visibles: Content.pets().filter(x => !x.hidden).length,
  }));
  ok(
    "le jeu ne livre que les animaux de l'auteur",
    vide.pets.length === ROSTER.length && ROSTER.every(i => vide.pets.includes(i)),
    vide.pets.length + ' compagnon(s) : ' + vide.pets.join(', ')
  );
  const hub = await p.evaluate(() => ({
    cartes: document.querySelectorAll('#hub-pets .card').length,
    animaux: document.querySelectorAll('#hub-pets .card.pet:not(.seul)').length,
  }));
  /* Tanuki ne s'achète pas seul : il vient avec Choupi. La boutique liste donc un choix de moins que d'animaux. */
  ok(
    "la boutique liste les compagnons de l'auteur, sans l'inséparable",
    hub.animaux === vide.visibles,
    hub.animaux + ' choix pour ' + vide.pets.length + ' animaux, sur ' + hub.cartes + ' cartes'
  );
  const dep = await p.evaluate(() => Content.pets().length);
  const DP = 4, // fiches du fichier déjà dans l'établi : 4 animaux, 3 copains (chantier 8) — la nouvelle vient après
    DC = 3;

  await p.evaluate(async () => {
    Atelier.open();
    await Atelier.amisReset();
  });
  await p.waitForTimeout(1600);
  await p.evaluate(() => {
    Atelier.st.tab = 'amis';
    Atelier.refresh();
  });
  await p.waitForTimeout(300);
  const onglet = await p.evaluate(() => ({
    tabs: [...document.querySelectorAll('#atelier .tab')].map(t => t.textContent),
    cols: document.querySelectorAll('#atelier .amiscol h4').length,
  }));
  ok('un quatrième établi « Amis »', onglet.tabs.includes('Amis') && onglet.cols === 2, onglet.tabs.join(' | '));

  // ---------- créer un animal avec sa photo ----------
  await p.click('#am-addpet');
  await p.waitForTimeout(250);
  const img1 = await p.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = '#ff9a3c';
    g.fillRect(0, 0, 96, 96);
    g.fillStyle = '#2a1a10';
    g.fillRect(20, 30, 14, 14);
    g.fillRect(62, 30, 14, 14);
    g.fillRect(38, 58, 20, 10);
    return c.toDataURL('image/png');
  });
  fs.writeFileSync(out('chat.png'), Buffer.from(img1.split(',')[1], 'base64'));
  await p.setInputFiles(`#atelier [data-file="${DP}"][data-v=""]`, out('chat.png'));
  await p.waitForTimeout(700);
  await p.evaluate(DP => {
    const c = document.querySelector(`.amicard[data-p="${DP}"]`);
    const set = (f, v) => {
      const e = c.querySelector(`[data-f="${f}"]`);
      e.value = v;
      e.dispatchEvent(new Event('change'));
    };
    set('name', 'Pilou');
    set('behavior', 'bite');
    set('damage', 16);
    set('desc', 'Le chat de Marie, mord les chevilles.');
  }, DP);
  await p.waitForTimeout(400);
  const pet = await p.evaluate(dep => {
    const d = Content.pets().find(x => x.name === 'Pilou');
    return {
      n: Content.pets().length - dep,
      nom: d && d.name,
      comp: d && d.behavior,
      dmg: d && d.damage,
      img: !!(d && Sprites.propNames().includes(d.sprite)),
    };
  }, dep);
  ok(
    "l'animal entre dans le jeu tout de suite",
    pet.n === 1 && pet.nom === 'Pilou' && pet.dmg === 16,
    `${pet.nom} · ${pet.comp} · ${pet.dmg} dégâts`
  );
  ok('sa photo devient son sprite', pet.img);

  const essai = await p.evaluate(async DP => {
    document.querySelector(`[data-try="${DP}"]`).click();
    await new Promise(r => setTimeout(r, 600));
    return { pet: G.pet && G.pet.id, nom: G.pet && G.pet.name };
  }, DP);
  ok("« Essayer » l'adopte sur-le-champ", essai.nom === 'Pilou', essai.nom);

  // ---------- créer un copain avec son visage ----------
  await p.click('#am-addchar');
  await p.waitForTimeout(250);
  const img2 = await p.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 120;
    const g = c.getContext('2d');
    g.fillStyle = '#e8b58f';
    g.fillRect(0, 0, 120, 120);
    g.fillStyle = '#1a1a2a';
    g.fillRect(28, 40, 16, 16);
    g.fillRect(76, 40, 16, 16);
    g.fillStyle = '#c0392b';
    g.fillRect(44, 80, 32, 10);
    return c.toDataURL('image/png');
  });
  fs.writeFileSync(out('visage.png'), Buffer.from(img2.split(',')[1], 'base64'));
  await p.setInputFiles(`#atelier [data-filec="${DC}"]`, out('visage.png'));
  await p.waitForTimeout(700);
  await p.evaluate(DC => {
    const c = document.querySelector(`.amicard[data-c="${DC}"]`);
    const set = (f, v) => {
      const e = c.querySelector(`[data-f="${f}"]`);
      e.value = v;
      e.dispatchEvent(new Event('change'));
    };
    set('name', 'Marie');
    set('trait', 'fast');
    set('maxHp', 120);
    set('desc', 'Court vite, parle fort.');
  }, DC);
  await p.waitForTimeout(400);
  const ch = await p.evaluate(() => {
    const d = Content.characters().find(c => c.name === 'Marie');
    return {
      existe: !!d,
      pv: d && d.stats.maxHp,
      face: d && d.face,
      mods: d && d.trait.mods.length,
      debloque: d && Meta.characterUnlocked(d.id),
    };
  });
  ok('le copain devient un personnage jouable', ch.existe && ch.pv === 120 && ch.debloque, `${ch.pv} PV, trait à ${ch.mods} effet(s)`);

  const joue = await p.evaluate(async DC => {
    document.querySelector(`[data-tryc="${DC}"]`).click();
    await new Promise(r => setTimeout(r, 500));
    return {
      nom: G.player.char && G.player.char.name,
      face: G.player.char && G.player.char.face,
      base: G.player.char && G.player.char.stats.maxHp,
      pv: Math.round(G.player.stats.maxHp),
    };
  }, DC);
  ok(
    '« Essayer » le met aux commandes, visage compris',
    joue.nom === 'Marie' && !!joue.face && joue.base === 120,
    `${joue.nom}, ${joue.base} PV de base (${joue.pv} avec les calibrations du mode test)`
  );

  // ---------- export ----------
  const snip = await p.evaluate(() => {
    window.confirm = () => true; // ces tests vérifient l'export AVEC les images : l'accord est donné
    document.getElementById('a-export').click();
    return document.getElementById('a-txt').value;
  });
  ok(
    "l'export est le contenu de content5.js",
    /AMIS_DEBUT/.test(snip) &&
      /const FRIEND_IMAGES/.test(snip) &&
      /CONTENT\.pets\.push/.test(snip) &&
      /CONTENT\.characters\.push/.test(snip) &&
      /const FRIEND_CONTENT/.test(snip),
    snip
      .split('\n')
      .filter(l => /^(const|CONTENT)/.test(l))
      .join(' · ')
  );
  ok(
    "les images sont embarquées dans l'export",
    /data:image\/png;base64,/.test(snip),
    Math.round(snip.length / 1024) + ' Ko pour les amis du fichier plus deux'
  );
  ok("l'export ne traîne pas de marqueur d'atelier", !/atelier: true/.test(snip));
  fs.writeFileSync(out('content5_export.js'), snip);

  // ---------- le fichier exporté est du JS valide et recharge les amis ----------
  const rechargé = await p.evaluate(txt => {
    const CONTENT2 = { pets: [], characters: [], pairs: [] };
    const f = new Function('CONTENT', txt + '; return typeof FRIEND_IMAGES === "object" ? Object.keys(FRIEND_IMAGES).length : -1;');
    const n = f(CONTENT2);
    return {
      imgs: n,
      pets: CONTENT2.pets.length,
      chars: CONTENT2.characters.length,
      nomPet: CONTENT2.pets[4] && CONTENT2.pets[4].name,
      nomChar: CONTENT2.characters[3] && CONTENT2.characters[3].name,
    };
  }, snip);
  ok(
    'le fichier exporté se relit sans erreur, les amis du fichier compris',
    rechargé.pets === 5 && rechargé.chars === 4 && rechargé.imgs === 2,
    `${rechargé.nomPet} et ${rechargé.nomChar}, ${rechargé.imgs} images`
  );

  // ---------- le travail survit au rechargement ----------
  await p.reload();
  await p.waitForTimeout(1600);
  await entrer('test');
  await p.evaluate(async () => {
    Atelier.open();
    await Atelier.amisReady;
  });
  await p.waitForTimeout(800);
  const apres = await p.evaluate(() => ({ pets: Content.pets().map(x => x.name), chars: Content.characters().map(c => c.name) }));
  ok(
    'les amis survivent au rechargement',
    apres.pets.includes('Pilou') && apres.chars.includes('Marie'),
    apres.pets.join(', ') + ' | ' + apres.chars.join(', ')
  );

  await p.evaluate(() => {
    Atelier.st.tab = 'amis';
    Atelier.refresh();
  });
  await p.waitForTimeout(600);
  await p.screenshot({ path: out('amis.png') });
  await p.evaluate(async () => {
    Pets.give(Content.pets().find(x => x.name === 'Pilou').id, true);
    Atelier.st.tab = 'anim';
    Atelier.refresh();
    document.getElementById('a-mode').click();
  });
  await p.waitForTimeout(900);
  await p.screenshot({ path: out('amis_jeu.png') });
  await p.evaluate(() => Atelier.amisReset());
});
