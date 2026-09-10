/* Banc d'équilibrage : le bot joue le mode Normal avec un profil neuf, chaque arme sur plusieurs graines,
   et on lit le taux de victoire, le mini-boss, la salle atteinte, la durée, et ce qu'encaisse le compagnon.
   Ce n'est pas un test (pas de vert/rouge) : c'est la mesure qu'on refait avant et après chaque réglage.
     node normal.js                       → 8 armes × 4 graines, biome 1, Martin + Uno
     ARMES=weapon_pistol GRAINES=41,42 node normal.js
     BIOME=biome_3 PROFIL=test node normal.js   → profil maxé (mode test) sur un autre palier
     MODE=call node normal.js                   → mode de compagnon (always, call, none) ; le bot appelle dès que possible
   Écrit un JSON dans out/bench_<biome>_<profil>[_<mode>].json pour comparer deux passes. */
'use strict';
const fs = require('fs');
const path = require('path');
const { test, out } = require('../lib');
const ARMES = (
  process.env.ARMES || 'weapon_blade,weapon_hammer,weapon_bow,weapon_pistol,weapon_boomerang,weapon_orb,weapon_chain,weapon_flame'
).split(',');
const GRAINES = (process.env.GRAINES || '41,42,43,44').split(',').map(Number);
const BIOME = process.env.BIOME || 'biome_1';
const PROFIL = process.env.PROFIL || 'normal';
const PET = process.env.PET === 'none' ? null : process.env.PET || 'pet_uno';
const MODE = process.env.MODE || 'always';
test(async ({ page, ok, url }) => {
  await page.goto(url);
  await page.waitForTimeout(1500);
  const runs = [];
  for (const arme of ARMES) {
    for (const graine of GRAINES) {
      const cfg = {
        seed: graine,
        timeScale: 40,
        render: false,
        weapon: arme,
        skill: 'skill_dash',
        mode: PROFIL,
        maxRooms: 9,
        maxSeconds: 700,
        difficulty: 1,
        biome: BIOME,
        character: 'char_martin',
        pet: PET,
        petMode: MODE,
      };
      /* on note aussi ce que le compagnon encaisse : dégâts pris et fois sonné */
      const r = await Promise.race([
        page.evaluate(async c => {
          window.__petHits = 0;
          window.__petDown = 0;
          const h = Pet.prototype.hurt;
          Pet.prototype.hurt = function (d) {
            if (!this.down && this.maxHp) window.__petHits += d;
            const wasDown = this.down;
            h.call(this, d);
            if (!wasDown && this.down) window.__petDown++;
          };
          const res = await window.__autoplay(c);
          Pet.prototype.hurt = h;
          res.petHits = Math.round(window.__petHits);
          res.petDown = window.__petDown;
          return res;
        }, cfg),
        new Promise(res => setTimeout(() => res({ outcome: 'HARNESS_TIMEOUT' }), 150000)),
      ]);
      if (r.outcome === 'HARNESS_TIMEOUT') {
        await page.reload();
        await page.waitForTimeout(1500);
      }
      const salleMax = Math.max(0, ...(r.roomTimes || []).map(x => x.time || 0));
      runs.push({
        arme,
        graine,
        outcome: r.outcome,
        salle: r.roomReached,
        niveau: r.levelReached,
        kills: r.kills,
        degats: r.damageTaken,
        infliges: r.damageDealt,
        duree: r.durationSec,
        boss: !!r.bossKilled,
        petHits: r.petHits,
        petDown: r.petDown,
        salleMax,
        salles: r.roomTimes || [],
      });
      console.log(
        `${arme.replace('weapon_', '').padEnd(10)} g${graine}  ${String(r.outcome).padEnd(9)} salle ${String(r.roomReached).padStart(2)}  niv ${String(r.levelReached).padStart(2)}  dmg ${String(r.damageTaken).padStart(4)}  infligés ${String(r.damageDealt).padStart(6)}  ${String(r.durationSec).padStart(6)} s  boss ${r.bossKilled ? 'oui' : 'non'}  Uno ${r.petHits || 0} dmg / ${r.petDown || 0} KO  pire salle ${salleMax} s`
      );
    }
  }
  const n = runs.length;
  const v = runs.filter(r => r.outcome === 'victory').length;
  const b = runs.filter(r => r.boss).length;
  const mediane = a => {
    const s = a.slice().sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)];
  };
  const bilan = {
    biome: BIOME,
    profil: PROFIL,
    pet: PET,
    mode: MODE,
    n,
    infligesMedian: mediane(runs.map(r => r.infliges || 0)),
    victoires: v,
    boss: b,
    salleMediane: mediane(runs.map(r => r.salle)),
    dureeMediane: mediane(runs.map(r => r.duree)),
    pireSalle: Math.max(...runs.map(r => r.salleMax)),
    petDownParRun: +(runs.reduce((s, r) => s + (r.petDown || 0), 0) / n).toFixed(2),
  };
  console.log(
    `\nBILAN ${BIOME} ${PROFIL} : ${v}/${n} victoires (${Math.round((100 * v) / n)} %), mini-boss tué ${b}/${n} (${Math.round((100 * b) / n)} %), salle médiane ${bilan.salleMediane}, durée médiane ${bilan.dureeMediane} s, pire salle ${bilan.pireSalle} s, dégâts infligés médians ${bilan.infligesMedian}, Uno KO ${bilan.petDownParRun} fois par run`
  );
  fs.writeFileSync(out(`bench_${BIOME}_${PROFIL}${MODE === 'always' ? '' : '_' + MODE}.json`), JSON.stringify({ bilan, runs }, null, 1));
  ok('le banc a tourné', n > 0, `${n} runs`);
});
