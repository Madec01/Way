/* L'export de l'établi Amis ne publie une photo qu'avec l'accord, et un pseudo remplace le prénom. */
const { test, out } = require('./lib');
const fs = require('fs');
test(async ({ page: p, ok, entrer }) => {
  await entrer('test');
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
  await p.waitForTimeout(300);
  await p.click('#am-addchar');
  await p.waitForTimeout(250);
  const img = await p.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#e8b58f';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#222';
    g.fillRect(18, 22, 8, 8);
    g.fillRect(38, 22, 8, 8);
    return c.toDataURL('image/png');
  });
  fs.writeFileSync(out('visage_test.png'), Buffer.from(img.split(',')[1], 'base64'));
  await p.setInputFiles('#atelier [data-filec="0"]', out('visage_test.png'));
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    const c = document.querySelector('.amicard[data-c="0"]');
    const set = (f, v) => {
      const e = c.querySelector(`[data-f="${f}"]`);
      e.value = v;
      e.dispatchEvent(new Event('change'));
    };
    set('name', 'Prénom Réel');
    set('pseudo', 'Le Renard');
  });
  await p.waitForTimeout(300);

  /* export en refusant : pas de photo, pas de prénom */
  await p.evaluate(() => {
    window.confirm = () => false;
  });
  await p.click('#a-export');
  await p.waitForTimeout(300);
  const sans = await p.evaluate(() => document.querySelector('#a-txt').value);
  ok('sans accord, aucune photo ne part', !/data:image/.test(sans) && /photos non exportées/.test(sans));
  ok('le pseudo remplace le prénom dans le fichier', /"name":"Le Renard"/.test(sans) && !/Prénom Réel/.test(sans));

  /* export en acceptant : la photo part */
  await p.evaluate(() => {
    window.confirm = () => true;
  });
  await p.click('#a-export');
  await p.waitForTimeout(300);
  const avec = await p.evaluate(() => document.querySelector('#a-txt').value);
  ok('avec accord, la photo est embarquée', /data:image\/png/.test(avec));
});
