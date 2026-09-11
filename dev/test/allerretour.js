/* Chantier 8 — l'atelier honnête. Ce test mesure : ouvrir l'établi Amis sans rien toucher et exporter redonne
   dev/content5.js octet pour octet, et ce texte est un point fixe de Prettier ; les planches livrées sont en PNG
   palette (moins de 100 Ko de base64 pour 31 planches) et se découpent comme avant ; l'encodeur PNG palette rend
   exactement les pixels du canvas et pèse moins que le PNG du navigateur ; une fiche modifiée entre dans le jeu,
   se garde dans IndexedDB, survit au rechargement et se fond dans l'export à côté des amis du fichier ; une photo
   devient un JPEG de 64 px, un pixel art reste un PNG palette de sa taille ; un navigateur plein refuse l'image
   avant de la perdre ; un animal supprimé sort de l'export avec son duo ; plus de copie way.props.custom. */
const { test, out } = require('./lib');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
test(async ({ page: p, ok, entrer }) => {
  const fichier = fs.readFileSync(path.join(__dirname, '..', 'content5.js'), 'utf8');
  await entrer('test');
  await p.evaluate(async () => {
    Atelier.open();
    await Atelier.amisReset();
  });
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    Atelier.st.tab = 'amis';
    Atelier.refresh();
  });
  await p.waitForTimeout(300);

  /* --- l'aller-retour --- */
  const exp = await p.evaluate(() => Atelier.amisSnippet(true));
  ok(
    'sans rien toucher, l’export est dev/content5.js octet pour octet',
    exp === fichier,
    `${exp.length} caractères contre ${fichier.length}`
  );
  if (exp !== fichier) {
    const a = exp.split('\n'),
      b = fichier.split('\n');
    const i = a.findIndex((l, k) => l !== b[k]);
    console.log(
      '   première ligne différente ' +
        (i + 1) +
        ' :\n   export  : ' +
        (a[i] || '').slice(0, 120) +
        '\n   fichier : ' +
        (b[i] || '').slice(0, 120)
    );
  }
  fs.writeFileSync(out('content5_allerretour.js'), exp);
  let stable = false;
  try {
    execSync('npx prettier --check ' + JSON.stringify(out('content5_allerretour.js')), { cwd: __dirname, stdio: 'pipe' });
    stable = true;
  } catch (e) {
    /* prettier a trouvé quelque chose à changer */
  }
  ok('le texte exporté est un point fixe de Prettier (rien à reformater)', stable);

  const fiche = await p.evaluate(() => ({
    pets: Atelier.amis.pets.map(x => x.id),
    chars: Atelier.amis.chars.map(x => x.id),
    pairs: Atelier.amis.pairs.length,
    cartes: document.querySelectorAll('#atelier .amicard').length,
    uno: (Atelier.amis.pets.find(x => x.id === 'pet_uno') || {}).sheets,
  }));
  ok(
    'l’établi montre les amis du fichier : 3 copains, 4 animaux, 3 duos, les planches d’Uno comprises',
    fiche.chars.length === 3 &&
      fiche.pets.length === 4 &&
      fiche.pairs === 3 &&
      fiche.cartes === 7 &&
      fiche.uno &&
      Object.keys(fiche.uno).length === 4,
    JSON.stringify({ chars: fiche.chars, pets: fiche.pets, cartes: fiche.cartes })
  );

  /* --- les planches livrées : PNG palette, découpe intacte --- */
  const planches = await p.evaluate(() => {
    const noms = Object.keys(FRIEND_SHEETS);
    const total = noms.reduce((s, k) => s + FRIEND_SHEETS[k].url.length, 0);
    const palette = noms.every(k => atob(FRIEND_SHEETS[k].url.split(',')[1].slice(0, 64)).indexOf('PLTE') > 0);
    const decoupe = noms.map(k => {
      const i = Sprites.sheetInfo(k);
      return [k, i.fw, i.n, i.cols, i.rows];
    });
    return { n: noms.length, total, palette, decoupe };
  });
  const attendu = { char: [48, 7, 3, 3], pet32: [32, 7, 3, 3], pet48: [48, 7, 3, 3] };
  const decoupeOk = planches.decoupe.every(([k, fw, n, c, r]) => {
    const ref = k === 'pet_uno_idle' || k === 'pet_uno_walk' ? [32, 9, 3, 3] : fw === 32 ? attendu.pet32 : attendu.char;
    return fw === ref[0] && n === ref[1] && c === ref[2] && r === ref[3];
  });
  ok(
    '31 planches en PNG palette, moins de 100 Ko de base64 (261 Ko avant), découpées comme avant (7 ou 9 images)',
    planches.n === 31 && planches.palette && planches.total < 100000 && decoupeOk,
    `${planches.n} planches, ${Math.round(planches.total / 1024)} Ko`
  );

  /* --- l'encodeur : mêmes pixels, moins d'octets --- */
  const enc = await p.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = c.height = 40;
    const g = c.getContext('2d');
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `hsl(${i * 9},70%,50%)`;
      g.fillRect(i, 0, 1, 20);
    }
    g.fillStyle = 'rgba(20,40,60,0.5)';
    g.fillRect(0, 20, 20, 10);
    const avant = g.getImageData(0, 0, 40, 40).data;
    const url = await Amis.encodeCanvas(c);
    const img = new Image();
    await new Promise(r => ((img.onload = r), (img.src = url)));
    const c2 = document.createElement('canvas');
    c2.width = c2.height = 40;
    const g2 = c2.getContext('2d');
    g2.drawImage(img, 0, 0);
    const apres = g2.getImageData(0, 0, 40, 40).data;
    let diff = 0;
    for (let i = 0; i < avant.length; i++) if (Math.abs(avant[i] - apres[i]) > 1) diff++;
    return {
      diff,
      taille: url.length,
      rgba: c.toDataURL('image/png').length,
      palette: atob(url.split(',')[1].slice(0, 64)).indexOf('PLTE') > 0,
    };
  });
  ok(
    'Amis.encodeCanvas : un PNG palette qui redonne les mêmes pixels (transparence comprise) et pèse moins que le PNG du canvas',
    enc.diff === 0 && enc.palette && enc.taille < enc.rgba,
    `${enc.taille} contre ${enc.rgba} caractères, ${enc.diff} composante(s) différente(s)`
  );

  /* --- un changement local : dans le jeu, dans IndexedDB, dans l'export à côté du fichier --- */
  await p.evaluate(async () => {
    const carte = document.querySelector('.amicard[data-p="0"]');
    const e = carte.querySelector('[data-f="damage"]');
    e.value = 21;
    e.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 200));
    document.getElementById('am-addpet').click();
  });
  await p.waitForTimeout(400);
  await p.evaluate(async () => {
    const carte = document.querySelector('.amicard[data-p="4"]');
    const set = (f, v) => {
      const e = carte.querySelector(`[data-f="${f}"]`);
      e.value = v;
      e.dispatchEvent(new Event('change'));
    };
    set('name', 'Pilou');
    set('behavior', 'sting');
  });
  await p.waitForTimeout(400);
  const local = await p.evaluate(async () => {
    const r = await new Promise((res, rej) => {
      const q = indexedDB.open('way_atelier', 1);
      q.onsuccess = () => {
        const t = q.result.transaction('kv', 'readonly').objectStore('kv').get('amis');
        t.onsuccess = () => res(t.result);
        t.onerror = () => rej(t.error);
      };
      q.onerror = () => rej(q.error);
    });
    return {
      uno: Content.pet('pet_uno').damage,
      pilou: (Content.pets().find(x => x.name === 'Pilou') || {}).behavior,
      gardes: r ? r.pets.map(x => x.name) : null,
      copains: r ? r.chars.length : -1,
      ancien: localStorage.getItem('way_amis_v1'),
      custom: localStorage.getItem('way.props.custom'),
    };
  });
  ok(
    'la fiche modifiée et la nouvelle entrent dans le jeu ; IndexedDB ne garde que ces deux-là, rien en localStorage',
    local.uno === 21 &&
      local.pilou === 'sting' &&
      local.gardes &&
      local.gardes.length === 2 &&
      local.copains === 0 &&
      !local.ancien &&
      !local.custom,
    JSON.stringify(local)
  );
  const fusion = await p.evaluate(() => {
    const t = Atelier.amisSnippet(true);
    return {
      uno21: /id: 'pet_uno',[\s\S]*?damage: 21,/.test(t),
      pilou: t.indexOf("name: 'Pilou'") > 0,
      martin: t.indexOf("id: 'char_martin'") > 0,
      duos: (t.match(/petDamageMul/g) || []).length,
    };
  });
  ok(
    'l’export fond le local dans le fichier : Uno à 21, Pilou en plus, Martin toujours là, les trois duos',
    fusion.uno21 && fusion.pilou && fusion.martin && fusion.duos === 3,
    JSON.stringify(fusion)
  );

  /* --- survit au rechargement --- */
  await p.reload();
  await p.waitForTimeout(1200);
  await entrer('test');
  await p.evaluate(async () => {
    Atelier.open();
    await Atelier.amisReady;
  });
  await p.waitForTimeout(800);
  const apres = await p.evaluate(() => ({
    uno: Content.pet('pet_uno').damage,
    pilou: !!Content.pets().find(x => x.name === 'Pilou'),
    n: Atelier.amis.pets.length,
  }));
  ok('après rechargement, Uno mord toujours à 21 et Pilou est là', apres.uno === 21 && apres.pilou && apres.n === 5, JSON.stringify(apres));

  /* --- photo et pixel art --- */
  const imgs = await p.evaluate(async () => {
    const pilou = Atelier.amis.pets.find(x => x.name === 'Pilou');
    const photo = document.createElement('canvas');
    photo.width = 600;
    photo.height = 800;
    const g = photo.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 600, 800);
    gr.addColorStop(0, '#f3c');
    gr.addColorStop(1, '#3cf');
    g.fillStyle = gr;
    g.fillRect(0, 0, 600, 800);
    await Atelier.readImgData(pilou, 'img', 'sprite', photo.toDataURL('image/png'));
    const px = document.createElement('canvas');
    px.width = px.height = 32;
    const g2 = px.getContext('2d');
    g2.fillStyle = '#ff9a3c';
    g2.fillRect(0, 0, 32, 32);
    g2.fillStyle = '#123';
    g2.fillRect(8, 8, 6, 6);
    await Atelier.readImgData(pilou, 'imgE', 'spriteE', px.toDataURL('image/png'));
    const dims = url =>
      new Promise(r => {
        const i = new Image();
        i.onload = () => r([i.width, i.height]);
        i.src = url;
      });
    return {
      photo: pilou.img.slice(0, 22),
      dimPhoto: await dims(pilou.img),
      px: pilou.imgE.slice(0, 22),
      dimPx: await dims(pilou.imgE),
      taillePhoto: pilou.img.length,
    };
  });
  ok(
    'une photo de 600×800 devient un JPEG carré de 64 px ; un pixel art de 32 px reste un PNG de 32 px',
    imgs.photo === 'data:image/jpeg;base64' &&
      imgs.dimPhoto[0] === 64 &&
      imgs.dimPhoto[1] === 64 &&
      imgs.px === 'data:image/png;base64,' &&
      imgs.dimPx[0] === 32,
    JSON.stringify(imgs)
  );

  /* --- le navigateur plein refuse avant de perdre --- */
  const plein = await p.evaluate(async () => {
    const pilou = Atelier.amis.pets.find(x => x.name === 'Pilou');
    const avant = pilou.imgN;
    const est = navigator.storage.estimate;
    navigator.storage.estimate = async () => ({ usage: 9e8, quota: 9e8 + 100 });
    const px = document.createElement('canvas');
    px.width = px.height = 16;
    const r = await Atelier.readImgData(pilou, 'imgN', 'spriteN', px.toDataURL('image/png'));
    navigator.storage.estimate = est;
    return {
      accepte: r,
      inchangee: pilou.imgN === avant,
      toast: (document.querySelector('#toasts') || document.body).textContent.includes('Plus de place'),
    };
  });
  ok(
    'quand le navigateur est plein, l’image est refusée avec le message, rien n’est perdu',
    plein.accepte === false && plein.inchangee && plein.toast,
    JSON.stringify(plein)
  );

  /* --- supprimer un animal du fichier : il sort de l'export, son duo aussi --- */
  await p.evaluate(() => {
    Atelier.st.tab = 'amis';
    Atelier.refresh();
  });
  await p.waitForTimeout(200);
  const suppr = await p.evaluate(async () => {
    const i = Atelier.amis.pets.findIndex(x => x.id === 'pet_ori');
    document.querySelector(`.amicard[data-p="${i}"] [data-del="${i}"]`).click();
    await new Promise(r => setTimeout(r, 300));
    const t = Atelier.amisSnippet(true);
    return {
      jeu: !!Content.pet('pet_ori'),
      ori: t.indexOf("id: 'pet_ori'") > 0,
      duos: (t.match(/petDamageMul/g) || []).length,
      jean: t.indexOf("id: 'char_jean'") > 0,
    };
  });
  ok(
    'ORI supprimé : plus dans le jeu ni dans l’export, son duo avec Jean tombe, Jean reste',
    !suppr.jeu && !suppr.ori && suppr.duos === 2 && suppr.jean,
    JSON.stringify(suppr)
  );
  await p.evaluate(() => Atelier.amisReset());
});
