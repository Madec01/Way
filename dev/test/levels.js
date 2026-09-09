/* Le bot joue quatre armes sur les neuf salles du biome 1 (mode test, difficulté 1).
   C'est le banc d'équilibrage : on lit les chiffres, et on exige seulement que rien ne plante.
   BIOME=biome_2 SEED=41 node levels.js  pour un autre palier ou d'autres graines. */
const { test } = require('./lib');
test(async ({ page, ok, url }) => {
  await page.goto(url); await page.waitForTimeout(1500);
  const armes = ['weapon_pistol', 'weapon_bow', 'weapon_chain', 'weapon_boomerang'];
  for (let i = 0; i < armes.length; i++) {
    const cfg = { seed: (+(process.env.SEED || 900)) + i, timeScale: 40, render: false, weapon: armes[i], skill: 'skill_dash', mode: 'test', maxRooms: 9, maxSeconds: 700, difficulty: 1, biome: process.env.BIOME || null };
    const r = await Promise.race([page.evaluate(c => window.__autoplay(c), cfg), new Promise(res => setTimeout(() => res({ outcome: 'HARNESS_TIMEOUT' }), 120000))]);
    const detail = `${String(r.outcome).padEnd(8)} salle ${r.roomReached} niv ${r.levelReached} kills ${r.kills} dmg ${r.damageTaken} ${r.durationSec}s · niv/salle ${(r.roomTimes || []).map(x => x.room + ':' + (x.level || '?')).join(' ')}`;
    ok(`${armes[i]} : le bot va au bout sans plantage`, r.outcome === 'victory' || r.outcome === 'death' || r.outcome === 'timeout', detail);
    if (r.outcome === 'HARNESS_TIMEOUT') { await page.reload(); await page.waitForTimeout(1500); }
  }
});
