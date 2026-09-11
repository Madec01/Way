/* Les lueurs pré-dessinées et le KO des compagnons. Ce test mesure : Halo.disc rend un canvas lumineux au centre et
   transparent au bord ; particules, projectiles, objets au sol, ondes et télégraphies ne posent plus de shadowBlur
   (chaque flou coûtait une passe par forme, cent morts de particules à la fois faisaient chuter le jeu) ; le cache
   des halos reste borné ; un compagnon sonné joue sa planche « hurt » jusqu'à sa dernière image au lieu de rester
   figé sur le clip d'avant. */
const { test } = require('./lib');
test(async ({ page: p, ok, entrer, salle, sansPause }) => {
  await entrer('test');
  await sansPause();
  await p.evaluate(() => {
    Meta.profile.pet = 'pet_uno';
    Meta.profile.petMode = 'always';
    Meta.save();
  });
  await salle(2);

  const halo = await p.evaluate(() => {
    const c = Halo.disc('#ffd166', 5, 8);
    const g = c.getContext('2d');
    const centre = g.getImageData(c.width / 2, c.height / 2, 1, 1).data;
    const coin = g.getImageData(0, 0, 1, 1).data;
    const bord = g.getImageData(c.width / 2 + 5 + 4, c.height / 2, 1, 1).data; // 4 px hors du disque : encore de la lueur
    return { w: c.width, centre: centre[3], coin: coin[3], bord: bord[3], meme: Halo.disc('#ffd166', 5, 8) === c };
  });
  ok(
    'Halo.disc : un canvas de la taille du disque et de son flou, lumineux au centre et juste au bord, vide dans le coin, mis en cache',
    halo.w === 46 && halo.centre > 80 && halo.bord > 10 && halo.coin === 0 && halo.meme,
    JSON.stringify(halo)
  );

  const sources = await p.evaluate(() => {
    const flou = /shadowBlur\s*=\s*[^0;]/;
    return {
      particules: flou.test(Particles.render.toString()),
      projectiles: flou.test(Projectiles.render.toString()),
      objets: flou.test(Pickups.render.toString()),
      ondes: flou.test(Room.renderFx.toString().slice(Room.renderFx.toString().indexOf('r.blasts'))),
      halo: Particles.render.toString().includes('Halo.draw') && Projectiles.render.toString().includes('Halo.draw'),
      anneau: Room.renderFx.toString().includes('Halo.ring'),
    };
  });
  ok(
    'particules, projectiles, objets au sol et ondes ne posent plus de shadowBlur : ils collent un halo',
    !sources.particules && !sources.projectiles && !sources.objets && !sources.ondes && sources.halo && sources.anneau,
    JSON.stringify(sources)
  );

  const cache = await p.evaluate(() => {
    const ctx = Engine.ctx;
    for (let i = 0; i < 400; i++) Halo.draw(ctx, 100, 100, 1 + (i % 40) * 0.5, `hsl(${i * 7},80%,60%)`, 6 + (i % 3));
    return Halo.cache.size;
  });
  ok('le cache des halos reste borné à 200 entrées', cache <= 200, `${cache} entrées`);

  const ko = await p.evaluate(async () => {
    const pet = G.pets[0];
    G.enemies = [];
    const avant = pet.clip;
    pet.hurt(99999);
    const clips = [];
    const frames = new Set();
    const inf = Sprites.sheetInfo(pet.def.anim.hurt);
    for (let i = 0; i < 70; i++) {
      await new Promise(r => setTimeout(r, 16));
      clips.push(pet.clip);
      if (pet.clip === 'hurt') frames.add(Math.min(Math.floor(pet.clipT * Sprites.CLIPS.hurt.fps), inf.n - 1));
    }
    return { avant, down: pet.down, clips: [...new Set(clips)], frames: [...frames].sort((a, b) => a - b), n: inf.n };
  });
  ok(
    'un compagnon sonné joue sa planche « hurt » : le clip change dès le KO et ses images défilent jusqu’à la dernière',
    ko.down && ko.clips.length === 1 && ko.clips[0] === 'hurt' && ko.frames.length >= 3 && ko.frames[ko.frames.length - 1] === ko.n - 1,
    JSON.stringify(ko)
  );
});
