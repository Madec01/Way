/* Chantier I-2 — un seul vocabulaire. Ce test balaie tout ce que le joueur peut lire — le contenu (armes, compétences,
   greffes, améliorations, ennemis, boss, pièges, compagnons, équipes, paliers), les chaînes de l'interface, les écrans
   rendus (titre, menu, hub et ses onglets, prépa, pause, montée de niveau, fin) et les messages du code (toasts,
   bandeaux, chiffres) — et refuse les mots bannis : anglicismes de développeur (DPS, cooldown, dash, pickups, spam,
   dmg, kill), unités de moteur (px, ticks/s), vouvoiement, mots de l'ancienne histoire (Sujet, Salle Zéro,
   calibration, consigné, réimpression, outillage), catégories et familles en anglais, doublons de notion. Les fragments
   de l'ancienne histoire (onglet Fragments) sont exclus : leur sort est une décision à part. */
const { test } = require('./lib');
const fs = require('fs');
const path = require('path');
test(async ({ page: p, ok, entrer, run, sansPause }) => {
  const BANNIS = [
    /\bDPS\b/,
    /cooldown/i,
    /\bdash\b/i,
    /\bpickups?\b/i,
    /\d ?px\b/,
    /ticks?\/s/i,
    /\bspam\b/i,
    /\bdmg\b/i,
    /\bkills?\b/i,
    /\bvous\b/i,
    /\bvotre\b/i,
    /\bvos\b/i,
    /\bSujet\b/,
    /Salle Zéro/i,
    /calibration/i,
    /consign/i,
    /réimpression/i,
    /outillage/i,
    /\bruns?\b/i,
    /\b(offense|defense|mobility|economy)\b/,
    /\b(BLADE|HAMMER|PISTOL|CHAIN|FLAME)\b/,
    /Réserve de greffes/,
  ];
  const fautes = (texte, ou) => {
    const out = [];
    for (const re of BANNIS) {
      const m = texte.match(re);
      if (m) out.push(`${ou} : « ${m[0]} » dans « ${texte.slice(Math.max(0, m.index - 30), m.index + 40).replace(/\s+/g, ' ')} »`);
    }
    return out;
  };

  await entrer('test');
  /* --- le contenu --- */
  const contenu = await p.evaluate(() => {
    const out = [];
    const push = (ou, t) => typeof t === 'string' && t && out.push([ou, t]);
    const champs = ['name', 'desc', 'tagline', 'subtitle', 'label', 'hint', 'tag'];
    const balaie = (k, o) => {
      for (const f of champs) push(`${k}.${o.id || '?'}.${f}`, o[f]);
      if (o.tiers) for (const t of o.tiers) push(`${k}.${o.id}.palier`, t.desc);
      if (o.trait) (push(`${k}.${o.id}.caractère`, o.trait.desc), push(`${k}.${o.id}.caractère`, o.trait.name));
      if (o.levelPassives)
        for (const lp of o.levelPassives)
          for (const s of ['bonus', 'malus']) (push(`${k}.${o.id}.${s}`, lp[s].name), push(`${k}.${o.id}.${s}`, lp[s].desc));
      if (Array.isArray(o.rooms)) for (const r of o.rooms) push(`${k}.${o.id}.salle`, r.label || r.name);
    };
    for (const k of ['weapons', 'skills', 'upgrades', 'metaPassives', 'biomes', 'enemies', 'bosses', 'pets', 'pairs', 'traps'])
      for (const o of Content[k] ? Content[k]() : []) balaie(k, o);
    for (const o of Content.characters()) balaie('characters', o);
    for (const m of Object.values(PET_MODES)) (push('mode.' + m.id, m.name), push('mode.' + m.id, m.desc));
    for (const [k, v] of Object.entries(STR)) push('STR.' + k, v);
    for (const k of ['hub', 'levelEnter', 'death', 'bossWin']) for (const t of LORE[k] || []) push('phrase.' + k, t);
    push('phrase.synopsis', LORE.synopsis);
    return out;
  });
  const f1 = contenu.flatMap(([ou, t]) => fautes(t, ou));
  ok(`le contenu est propre (${contenu.length} textes)`, f1.length === 0, f1.slice(0, 8).join('\n      ') || 'aucun mot banni');

  /* --- les écrans rendus --- */
  const ecrans = await p.evaluate(async () => {
    const out = [];
    const lis = nom => {
      const s = document.querySelector('#ui .screen:not([hidden])');
      out.push([nom, s ? s.innerText : '']);
    };
    UI.showMenu();
    lis('menu');
    UI.showHub();
    for (const t of ['passifs', 'armes', 'animaux', 'sujets']) {
      const b = document.querySelector(`.tab[data-tab="${t}"]`);
      if (b) b.click();
      await new Promise(r => setTimeout(r, 50));
      lis('hub · ' + t);
    }
    document.getElementById('hub-enter').click();
    await new Promise(r => setTimeout(r, 900));
    lis('prépa');
    return out;
  });
  const f2 = ecrans.flatMap(([ou, t]) => fautes(t, ou));
  ok('menu, hub (4 onglets) et prépa sont propres', f2.length === 0, f2.slice(0, 8).join('\n      ') || 'aucun mot banni');

  /* en partie : pause, montée de niveau, HUD, fin */
  await p.click('[data-s]');
  await p.click('#prep-go');
  await p.waitForTimeout(1200);
  const partie = await p.evaluate(async () => {
    const out = [];
    const lis = nom => {
      const s = document.querySelector('#ui .screen:not([hidden])');
      out.push([nom, s ? s.innerText : '']);
    };
    UI.togglePause();
    lis('pause');
    UI.togglePause();
    Run.addXp(G.run.xpNext);
    await new Promise(r => setTimeout(r, 300));
    lis('montée de niveau');
    if (UI.hideChoice) UI.hideChoice();
    G.paused = false;
    G.debug.hudProbe = true;
    const c = document.createElement('canvas');
    UI.renderHud(c.getContext('2d'));
    out.push(['HUD', UI.hudProbe.texts.map(t => t.t).join(' · ')]);
    G.debug.invuln = false;
    G.player.hp = 1;
    Combat.hitPlayer(999, { type: 'contact' });
    await new Promise(r => setTimeout(r, 1900));
    lis('fin');
    return out;
  });
  const f3 = partie.flatMap(([ou, t]) => fautes(t, ou));
  ok('pause, montée de niveau, HUD et écran de fin sont propres', f3.length === 0, f3.slice(0, 8).join('\n      ') || 'aucun mot banni');

  /* --- les messages écrits dans le code (toasts, bandeaux, chiffres) --- */
  const src = fs
    .readdirSync(path.join(__dirname, '..'))
    .filter(f => /^\d\d_.*\.js$/.test(f))
    .flatMap(f =>
      fs
        .readFileSync(path.join(__dirname, '..', f), 'utf8')
        .split('\n')
        .map((l, i) => [f + ':' + (i + 1), l])
        .filter(([, l]) => /\b(toast|banner|Floaters\.add)\(/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l.trim()))
    );
  /* les chaînes littérales de la ligne, sans les identifiants de genre d'un chiffre flottant ('dmg', 'crit'…), qui ne s'affichent pas */
  const litteraux = l =>
    (l.match(/'([^'\\]|\\.)*'|"([^"\\]|\\.)*"|`([^`\\]|\\.)*`/g) || [])
      .filter(t => !/^['"](dmg|crit|taken|heal|event)['"]$/.test(t))
      .join(' ');
  const f4 = src.flatMap(([ou, l]) => fautes(litteraux(l), ou));
  ok(`les ${src.length} messages du code sont propres`, f4.length === 0, f4.slice(0, 8).join('\n      ') || 'aucun mot banni');

  /* --- un mot par notion --- */
  const notions = await p.evaluate(() => ({
    palier: document.querySelector('#ui').textContent.includes('Palier 1'),
    ruee: Content.skill('skill_dash').name,
    coffre: STR.chest,
    longues: Content.weapons()
      .concat(Content.skills(), Content.upgrades(), Content.metaPassives())
      .filter(o => (o.desc || '').length > 90)
      .map(o => `${o.id} (${o.desc.length})`),
  }));
  ok(
    'le biome s’appelle « palier », la ruée « Ruée », le coffre « Coffre »',
    notions.palier && notions.ruee === 'Ruée' && notions.coffre === 'Coffre',
    `${notions.ruee} · ${notions.coffre}`
  );
  ok(
    'aucune description d’arme, de compétence, de greffe ou d’amélioration ne dépasse 90 caractères',
    notions.longues.length === 0,
    notions.longues.join(', ') || 'toutes ≤ 90'
  );
});
