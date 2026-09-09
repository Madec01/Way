/* Quand ça casse, un ami peut le dire : l'erreur est notée avec la salle, et « Copier le rapport » donne un texte complet. */
const { test } = require('./lib');
test(async ({ page, context, ok, entrer, salle, erreurs }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await entrer('test');
  await page.evaluate(() => Rapport.vider());
  await salle(2);

  await page.evaluate(() =>
    setTimeout(() => {
      throw new Error('erreur volontaire du test');
    }, 0)
  );
  await page.waitForTimeout(400);
  const j = await page.evaluate(() => Rapport.lire());
  ok('une erreur non rattrapée est notée', j.length === 1 && /volontaire/.test(j[0].msg), j.length ? j[0].msg : 'journal vide');
  ok('avec la salle où elle est arrivée', j.length === 1 && j[0].salle === 2, j.length ? 'salle ' + j[0].salle : '');

  await page.evaluate(() => setTimeout(() => Promise.reject(new Error('promesse cassée')), 0));
  await page.waitForTimeout(300);
  const j2 = await page.evaluate(() => Rapport.lire().length);
  ok('une promesse rejetée aussi', j2 === 2, j2 + ' entrée(s)');

  const txt = await page.evaluate(() => Rapport.texte());
  ok(
    'le rapport dit la version, le navigateur, le profil et la partie',
    /version : \d{4}-/.test(txt) && /navigateur : /.test(txt) && /profil : /.test(txt) && /partie : biome_1 salle 2/.test(txt),
    txt.split('\n').slice(0, 3).join(' / ')
  );
  ok('et le journal', /erreur volontaire/.test(txt) && /promesse cassée/.test(txt));

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const bouton = await page.$('#pause-report');
  ok('la pause a un bouton « Copier le rapport »', !!bouton);
  await page.click('#pause-report');
  await page.waitForTimeout(400);
  const presse = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
  ok(
    'le bouton met le rapport dans le presse-papiers',
    /WAY — rapport/.test(presse) && /erreur volontaire/.test(presse),
    presse.slice(0, 40)
  );

  /* les deux erreurs ci-dessus sont voulues : on les retire de ce que le banc compte comme des erreurs du jeu */
  for (let i = erreurs.length - 1; i >= 0; i--) if (/volontaire|promesse cassée/.test(erreurs[i])) erreurs.splice(i, 1);
});
