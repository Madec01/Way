/* La sauvegarde ne perd rien : ancienne clé relue, version migrée, objets fusionnés champ à champ, copie de secours,
   et une version plus récente que le jeu est gardée telle quelle. */
const { test } = require('./lib');
test(async ({ page, ok, entrer, url }) => {
  await entrer('normal');

  /* 1. un profil de la v1, sous l'ancienne clé, avec un volume incomplet */
  const v1 = await page
    .evaluate(async () => {
      localStorage.clear();
      localStorage.setItem(
        'sujet_neuf_save_v1',
        JSON.stringify({ v: 1, coins: 123, runs: 7, wins: 2, deaths: 5, volume: { master: 0.5 }, metaTiers: { meta_vitalite: 2 } })
      );
      location.reload();
    })
    .catch(() => {});
  await page.waitForTimeout(2500);
  const lu = await page.evaluate(() => ({
    coins: Meta.profile.coins,
    runs: Meta.profile.runs,
    v: Meta.profile.v,
    volume: Meta.profile.volume,
    tiers: Meta.profile.metaTiers,
    zoom: Meta.profile.zoom,
    secours: !!localStorage.getItem('way_save_secours_v1'),
    nouvelleCle: !!localStorage.getItem('way_save') || true,
  }));
  ok("l'ancienne clé de sauvegarde est relue", lu.coins === 123 && lu.runs === 7, `${lu.coins} crédits, ${lu.runs} parties`);
  ok('la version est montée à la version courante (4 depuis le chantier 7)', lu.v === 4, 'v' + lu.v);
  ok(
    'un volume incomplet garde ses autres réglages',
    lu.volume.master === 0.5 && lu.volume.sfx === 0.9 && lu.volume.music === 0.6,
    JSON.stringify(lu.volume)
  );
  ok('les paliers achetés sont conservés', lu.tiers.meta_vitalite === 2);
  ok('les nouveaux champs arrivent avec leur défaut', lu.zoom === 0, 'zoom ' + lu.zoom);
  ok('une copie de secours de la v1 est gardée', lu.secours);

  /* 2. après une sauvegarde, la nouvelle clé existe et la relecture est stable */
  const re = await page
    .evaluate(async () => {
      Meta.addCoins(1);
      const brut = localStorage.getItem('way_save');
      location.reload();
      return !!brut;
    })
    .catch(() => true);
  await page.waitForTimeout(2500);
  const lu2 = await page.evaluate(() => ({ coins: Meta.profile.coins, v: Meta.profile.v, cle: !!localStorage.getItem('way_save') }));
  ok(
    "la sauvegarde s'écrit sous la nouvelle clé et se relit",
    lu2.cle && lu2.coins === 124 && lu2.v === 4,
    `${lu2.coins} crédits, v${lu2.v}`
  );

  /* 3. un profil d'une version future n'est ni jeté ni tronqué */
  await page
    .evaluate(() => {
      localStorage.setItem(
        'way_save',
        JSON.stringify({ v: 9, coins: 555, runs: 1, champFutur: { a: 1 }, volume: { master: 0.3, sfx: 0.2, music: 0.1 } })
      );
      location.reload();
    })
    .catch(() => {});
  await page.waitForTimeout(2500);
  const fut = await page.evaluate(() => ({
    coins: Meta.profile.coins,
    v: Meta.profile.v,
    futur: Meta.profile.champFutur,
    secours: !!localStorage.getItem('way_save_secours_v9'),
  }));
  ok('une sauvegarde plus récente que le jeu garde ses crédits', fut.coins === 555, fut.coins + ' crédits');
  ok('ses champs inconnus sont conservés', fut.futur && fut.futur.a === 1);
  ok("sa version n'est pas rabaissée", fut.v === 9, 'v' + fut.v);
  ok('elle a aussi sa copie de secours', fut.secours);
});
