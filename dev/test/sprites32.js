const { test, out } = require('./lib');
const fs = require('fs');
test(async ({ page: p, context, ok, entrer, salle, run, sansPause, erreurs: errs }) => {
  await entrer('test');
  /* un vrai pixel art 32×32 : damier 1 px, qui révèle immédiatement tout lissage ou toute mise à l'échelle non entière */
  const px32 = await p.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d');
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        g.fillStyle = (x + y) % 2 ? '#ffffff' : '#101018';
        g.fillRect(x, y, 1, 1);
      }
    g.fillStyle = '#ff3b5c';
    g.fillRect(12, 10, 8, 8);
    return c.toDataURL('image/png');
  });
  fs.writeFileSync(out('px32.png'), Buffer.from(px32.split(',')[1], 'base64'));

  await p.evaluate(() => {
    try {
      localStorage.removeItem('way_amis_v1');
    } catch (e) {}
    Atelier.open();
  });
  await p.waitForTimeout(1600);
  await p.evaluate(() => {
    Atelier.st.tab = 'amis';
    Atelier.refresh();
  });
  await p.click('#am-addpet');
  await p.waitForTimeout(250);
  await p.setInputFiles('#atelier [data-file="0"]', out('px32.png'));
  await p.waitForTimeout(800);

  const gard = await p.evaluate(
    () =>
      new Promise(r => {
        const e = JSON.parse(localStorage.getItem('way_amis_v1')).pets[0];
        const i = new Image();
        i.onload = () => r({ w: i.width, h: i.height, taille: Content.pets()[0].size, src: e.img.length });
        i.src = e.img;
      })
  );
  ok('une image 32×32 est reprise telle quelle', gard.w === 32 && gard.h === 32, `${gard.w}×${gard.h} conservés`);
  ok("l'animal naît à 64 px, soit ×2 exactement", gard.taille === 64, gard.taille + ' px');

  /* le damier doit rester un damier : on relit les pixels dessinés */
  const net = await p.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 80;
    const g = c.getContext('2d');
    Sprites.drawProp(g, Content.pets()[0].sprite, 40, 40, 64, 64, {});
    const d = g.getImageData(8, 8, 64, 64).data;
    const vus = new Set();
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) vus.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
    return { couleurs: vus.size, liste: [...vus].slice(0, 6) };
  });
  ok(
    'le pixel art reste net (aucune couleur intermédiaire)',
    net.couleurs <= 3,
    net.couleurs + ' couleurs distinctes : ' + net.liste.join(' | ')
  );

  /* sprite entier de personnage */
  await p.click('#am-addchar');
  await p.waitForTimeout(250);
  await p.setInputFiles('#atelier [data-fileb="0"]', out('px32.png'));
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    const c = document.querySelector('.amicard[data-c="0"]');
    const e = c.querySelector('[data-f="name"]');
    e.value = 'Lou';
    e.dispatchEvent(new Event('change'));
  });
  await p.waitForTimeout(400);
  const corps = await p.evaluate(() => {
    const d = Content.characters().find(c => c.name === 'Lou');
    return { body: !!d.body, face: d.face, size: d.size };
  });
  ok('le copain porte son sprite entier', corps.body && !corps.face, 'taille ' + corps.size + ' px');

  const enjeu = await p.evaluate(async () => {
    document.querySelector('[data-tryc="0"]').click();
    await new Promise(r => setTimeout(r, 500));
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 160;
    const g = c.getContext('2d');
    Sprites.drawBody(g, 'player', 80, 60, { body: G.player.char.body, size: G.player.char.size, tier: 3 });
    const d = g.getImageData(0, 0, 160, 160).data;
    let n = 0;
    const vus = new Set();
    for (let i = 0; i < d.length; i += 4)
      if (d[i + 3] > 200) {
        n++;
        vus.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
      }
    return { nom: G.player.char.name, pixels: n, couleurs: vus.size };
  });
  ok('il est dessiné en jeu à la place du corps standard', enjeu.pixels > 3000, `${enjeu.pixels} pixels opaques`);
  ok('son sprite reste net une fois en jeu', enjeu.couleurs <= 3, enjeu.couleurs + ' couleurs');

  /* une photo d'appareil, elle, est bien réduite */
  const photo = await p.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 900;
    c.height = 1200;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 900, 1200);
    gr.addColorStop(0, '#e8b58f');
    gr.addColorStop(1, '#3a2a1a');
    g.fillStyle = gr;
    g.fillRect(0, 0, 900, 1200);
    return c.toDataURL('image/png');
  });
  fs.writeFileSync(out('photo.png'), Buffer.from(photo.split(',')[1], 'base64'));
  await p.click('#am-addpet');
  await p.waitForTimeout(250);
  await p.setInputFiles('#atelier [data-file="1"]', out('photo.png'));
  await p.waitForTimeout(900);
  const ph = await p.evaluate(
    () =>
      new Promise(r => {
        const e = JSON.parse(localStorage.getItem('way_amis_v1')).pets[1];
        const i = new Image();
        i.onload = () => r({ w: i.width, h: i.height });
        i.src = e.img;
      })
  );
  ok("une photo d'appareil est réduite à 128 px", ph.w === 128 && ph.h === 128, `900×1200 → ${ph.w}×${ph.h}`);

  await p.evaluate(async () => {
    Pets.give(Content.pets()[0].id, true);
    Atelier.st.tab = 'anim';
    Atelier.refresh();
    document.getElementById('a-mode').click();
    G.player.x = 300;
    G.player.y = 360;
  });
  await p.waitForTimeout(900);
  await p.screenshot({ path: out('sprites32.png') });
});
