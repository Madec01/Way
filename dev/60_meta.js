/* =========================================================================
   WAY — 60_meta.js
   Méta-progression : profils Normal (localStorage) / Test (tout débloqué, jamais sauvegardé), argent, passifs, déblocages.
   ========================================================================= */

'use strict';
/* La sauvegarde a une version. La lire, c'est : trouver le bon blob (clé actuelle, sinon les anciennes), en garder
   une copie de secours si on va le transformer, le faire passer de version en version, puis le FUSIONNER dans un
   profil neuf — champ à champ pour les objets, sinon un `volume: { master }` d'une vieille version perdait
   `sfx` et `music`, et un profil d'une autre version repartait à zéro sans un mot. */
const SAVE_KEY = 'way_save';
const SAVE_KEYS_ANCIENNES = ['sujet_neuf_save_v1'];
const SAVE_VERSION = 4;
const Meta = (() => {
  const fresh = () => ({
    v: SAVE_VERSION,
    coins: 0,
    metaTiers: {},
    weapons: [],
    characters: [],
    skills: [],
    pets: [],
    pet: 'pet_uno', // un profil neuf part avec le chien : le premier ami qui ouvre le jeu doit le voir
    petMode: 'always',
    lore: [],
    cleared: {},
    runs: 0,
    wins: 0,
    deaths: 0,
    bestLevel: 0,
    bestRoom: 0,
    best: {}, // chantier 7 : les 10 meilleures parties par personnage ({ charId: [{ score, room, win, time, seed, biome, pet, date }] })
    dailySeed: false, // la graine du jour : la même partie pour tout le monde un jour donné
    seedNext: null, // une graine collée depuis une ligne de résultat, jouée une fois
    touchAutoFire: true, // au pouce, on tire tout seul par défaut (I-8) — la pause permet de l'éteindre
    touchHinted: false, // « pose ton pouce ici » ne se montre qu'au premier lancement
    character: null,
    volume: { master: 0.8, sfx: 0.9, music: 0.6 },
    zoom: 0, // 0 = automatique (1 au clavier, 1,5 au tactile)
    lag: 0, // décalage son/image calibré dans l'atelier, en secondes
    perfMode: 'auto', // chantier 10 : 'auto' (économe dès que le tactile ralentit), 'eco', 'full'
    perfShow: false, // le compteur d'images par seconde en haut de l'écran
  });
  let normal = fresh();
  let test = null;
  let profile = normal;
  const estObjet = x => x && typeof x === 'object' && !Array.isArray(x);
  /* fusion profonde : les objets champ à champ, les tableaux et les valeurs simples tels quels ; un champ inconnu
     du profil neuf est gardé (il vient peut-être d'une version plus récente du jeu) */
  function fusion(base, d) {
    for (const k in d) {
      if (estObjet(d[k]) && estObjet(base[k])) fusion(base[k], d[k]);
      else if (d[k] !== undefined) base[k] = d[k];
    }
    return base;
  }
  /* une fonction par saut de version : v → v + 1. Ajouter ici, jamais modifier une entrée existante. */
  const MIGRATIONS = {
    1: d => d, // v1 → v2 : mêmes champs ; `zoom` et `lag` arrivent avec leurs défauts par la fusion
    /* v2 → v3 (chantier 6) : Mémoire sélective, Aperçu du coffre et Quatrième choix n'ont plus qu'un palier — les
       paliers 2 et 3 ne faisaient rien. Qui les avait payés est remboursé au prix d'alors. */
    2: d => {
      const anciens = { meta_memoire_selective: [80, 150], meta_apercu_coffre: [70, 130], meta_quatrieme_choix: [100, 170] };
      if (!estObjet(d.metaTiers)) return d;
      let rembourse = 0;
      for (const id in anciens) {
        const t = +d.metaTiers[id] || 0;
        if (t > 1) {
          for (let i = 1; i < t && i - 1 < anciens[id].length; i++) rembourse += anciens[id][i - 1];
          d.metaTiers[id] = 1;
        }
      }
      if (rembourse) d.coins = (+d.coins || 0) + rembourse;
      return d;
    },
    3: d => d, // v3 → v4 (chantier 7) : `best`, `dailySeed` et `seedNext` arrivent avec leurs défauts par la fusion
  };
  function migrate(d) {
    let v = +d.v || 1;
    while (v < SAVE_VERSION && MIGRATIONS[v]) {
      d = MIGRATIONS[v](d) || d;
      v++;
    }
    d.v = Math.max(v, +d.v || 1);
    return d;
  }
  function load() {
    try {
      let raw = localStorage.getItem(SAVE_KEY);
      let cle = SAVE_KEY;
      for (const k of SAVE_KEYS_ANCIENNES) if (!raw && (raw = localStorage.getItem(k))) cle = k;
      if (raw) {
        const d = JSON.parse(raw);
        if (estObjet(d)) {
          const v = +d.v || 1;
          if (v > SAVE_VERSION)
            console.warn(`[Meta] sauvegarde v${v}, ce jeu connaît la v${SAVE_VERSION} : lue telle quelle, rien n'est jeté`);
          /* on va la transformer ou la déplacer : on en garde une copie avant, sous une clé qu'on n'écrase jamais */
          if (v !== SAVE_VERSION || cle !== SAVE_KEY) {
            try {
              localStorage.setItem(`way_save_secours_v${v}`, raw);
            } catch (e) {
              /* stockage plein : la copie de secours est un confort, pas une condition */
            }
          }
          normal = fusion(fresh(), migrate(d));
        }
      }
    } catch (e) {
      console.warn('[Meta] sauvegarde illisible', e);
    }
    profile = normal;
    ensureDefaults(normal);
  }
  function ensureDefaults(p) {
    for (const w of Content.weapons()) if (w.unlocked && !p.weapons.includes(w.id)) p.weapons.push(w.id);
    for (const c of Content.characters()) if (c.unlocked && !p.characters.includes(c.id)) p.characters.push(c.id);
    p.pets = p.pets || [];
    for (const a of Content.pets()) if (a.unlocked && !p.pets.includes(a.id)) p.pets.push(a.id);
    if (p.pet && !p.pets.includes(p.pet)) p.pet = null;
    if (!p.character || !p.characters.includes(p.character)) p.character = p.characters[0];
  }
  function save() {
    if (profile !== normal) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(normal));
    } catch (e) {
      /* stockage indisponible */
    }
  }
  function reset() {
    normal = fresh();
    ensureDefaults(normal);
    profile = normal;
    save();
  }
  function setMode(mode) {
    G.mode = mode;
    if (mode === 'test') {
      test = fresh();
      test.coins = 99999;
      test.weapons = Content.weapons().map(w => w.id);
      test.characters = Content.characters().map(c => c.id);
      test.character = test.characters[0];
      test.pets = Content.pets().map(a => a.id);
      for (const m of Content.metaPassives()) test.metaTiers[m.id] = m.tiers.length;
      test.lore = LORE.fragments.map(f => f.id);
      test.volume = Object.assign({}, normal.volume);
      profile = test;
    } else if (mode === 'sandbox') {
      const sb = fresh();
      ensureDefaults(sb);
      sb.volume = Object.assign({}, normal.volume);
      profile = sb;
      G.mode = 'normal';
    } else profile = normal;
  }
  const tierOf = id => profile.metaTiers[id] || 0;
  function setTier(id, t) {
    profile.metaTiers[id] = clamp(t, 0, (Content.metaPassive(id) || { tiers: [] }).tiers.length);
    save();
  }
  function buy(id) {
    const m = Content.metaPassive(id);
    if (!m) return false;
    const t = tierOf(id);
    if (t >= m.tiers.length) return false;
    const price = m.tiers[t].price;
    if (profile.coins < price) return false;
    profile.coins -= price;
    profile.metaTiers[id] = t + 1;
    save();
    AudioEngine.uiConfirm({});
    return true;
  }
  function buyWeapon(id) {
    const w = Content.weapon(id);
    if (!w || profile.weapons.includes(id) || profile.coins < w.price) return false;
    profile.coins -= w.price;
    profile.weapons.push(id);
    save();
    AudioEngine.uiConfirm({});
    return true;
  }
  function buyPet(id) {
    const a = Content.pet(id);
    if (!a || profile.pets.includes(id) || profile.coins < a.price) return false;
    profile.coins -= a.price;
    profile.pets.push(id);
    save();
    AudioEngine.uiConfirm({});
    return true;
  }
  function buyCharacter(id) {
    const c = Content.character(id);
    if (!c || profile.characters.includes(id) || profile.coins < c.price) return false;
    profile.coins -= c.price;
    profile.characters.push(id);
    save();
    AudioEngine.uiConfirm({});
    return true;
  }
  /* sources de stats actives (tous les paliers achetés) */
  function activeSources() {
    const out = [];
    for (const m of Content.metaPassives()) {
      const t = tierOf(m.id);
      for (let i = 0; i < t; i++) {
        const tier = m.tiers[i];
        out.push({ id: m.id + '_' + i, mods: tier.mods || [], hooks: tier.special === 'resurrect' ? {} : tier.hooks || {} });
      }
    }
    return out;
  }
  function special(name) {
    let best = null;
    for (const m of Content.metaPassives()) {
      const t = tierOf(m.id);
      for (let i = 0; i < t; i++) if (m.tiers[i].special === name) best = m.tiers[i];
    }
    return best;
  }
  function resurrectAvailable() {
    const t = special('resurrect');
    if (!t) return null;
    const h = t.hooks && t.hooks.passive && t.hooks.passive.find(e => e.effect === 'second_chance');
    return h || { hpFraction: 0.25 };
  }
  const selectiveMemory = () => !!special('selective_memory');
  const chestPreview = () => !!special('chest_preview');
  const fourthChoice = () => !!special('fourth_choice');
  function rerolls() {
    let n = 0;
    for (const m of Content.metaPassives()) {
      const t = tierOf(m.id);
      for (let i = 0; i < t; i++) if (m.tiers[i].special === 'reroll') n++;
    }
    return n;
  }
  function addCoins(n) {
    profile.coins += Math.max(0, Math.round(n));
    save();
  }
  /* la graine du jour : la date locale en chiffres (20260911) — deux amis qui jouent le même jour ont la même partie */
  function dailySeed(d = new Date()) {
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  /* range une partie dans les dix meilleures de son personnage ; renvoie son rang (1 = record), 0 si elle n'y entre pas */
  function recordScore(entry) {
    if (!entry || !entry.char) return 0;
    profile.best = profile.best || {};
    const list = (profile.best[entry.char] = profile.best[entry.char] || []);
    list.push(entry);
    list.sort((a, b) => b.score - a.score || b.room - a.room || a.time - b.time);
    if (list.length > 10) list.length = 10;
    return list.indexOf(entry) + 1;
  }
  /* la sauvegarde en texte, pour changer de navigateur — toujours le profil Normal, jamais le profil de test */
  function exportText() {
    return JSON.stringify({ way: 'sauvegarde', v: SAVE_VERSION, at: new Date().toISOString(), profile: normal }, null, 1);
  }
  /* relit un texte exporté (ou un blob brut), le migre comme au chargement, remplace le profil Normal — l'ancien est copié avant */
  function importText(text) {
    let d;
    try {
      d = JSON.parse(text);
    } catch (e) {
      return { ok: false, why: 'ce texte n’est pas une sauvegarde' };
    }
    if (estObjet(d) && estObjet(d.profile) && d.way === 'sauvegarde') d = d.profile;
    if (!estObjet(d) || d.coins === undefined || d.v === undefined) return { ok: false, why: 'ce texte n’est pas une sauvegarde WAY' };
    try {
      localStorage.setItem('way_save_secours_import', JSON.stringify(normal));
    } catch (e) {
      /* la copie de secours est un confort */
    }
    normal = fusion(fresh(), migrate(d));
    ensureDefaults(normal);
    if (G.mode !== 'test') profile = normal;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(normal)); // même depuis le mode test : c'est le profil Normal qu'on importe
    } catch (e) {
      /* stockage indisponible */
    }
    return { ok: true, parties: normal.runs, credits: normal.coins };
  }
  function recordRun(win, summary) {
    profile.runs++;
    let rank = 0;
    if (summary) rank = recordScore(Object.assign({ date: new Date().toISOString().slice(0, 10) }, summary));
    if (G.run) G.run.rank = rank;
    if (win) {
      profile.wins++;
      if (G.run && G.run.biome) {
        profile.cleared = profile.cleared || {};
        profile.cleared[G.run.biome.id] = (profile.cleared[G.run.biome.id] || 0) + 1;
      }
    } else profile.deaths++;
    if (G.run) profile.bestLevel = Math.max(profile.bestLevel, G.run.level);
    if (G.run) profile.bestRoom = Math.max(profile.bestRoom || 0, win ? 9 : G.room ? G.room.index : 0); // la meilleure tentative, en salles
    save();
  }
  function unlockLore(id) {
    if (id === 'deaths_3' && profile.deaths < 3) return;
    if (!LORE.fragments.find(f => f.id === id) || profile.lore.includes(id)) return;
    profile.lore.push(id);
    save();
    const f = LORE.fragments.find(x => x.id === id);
    UI.toast('Fragment débloqué : ' + f.title, 6);
  }
  return {
    load,
    save,
    reset,
    setMode,
    ensure: () => ensureDefaults(profile),
    tierOf,
    setTier,
    buy,
    buyWeapon,
    buyCharacter,
    buyPet,
    activeSources,
    special,
    resurrectAvailable,
    selectiveMemory,
    chestPreview,
    fourthChoice,
    rerolls,
    addCoins,
    recordRun,
    recordScore,
    dailySeed,
    exportText,
    importText,
    unlockLore,
    get profile() {
      return profile;
    },
    get coins() {
      return profile.coins;
    },
    biomeUnlocked: b => G.mode === 'test' || !b.unlockAfter || !!(profile.cleared || {})[b.unlockAfter],
    weaponUnlocked: id => profile.weapons.includes(id),
    characterUnlocked: id => profile.characters.includes(id),
    petUnlocked: id => (profile.pets || []).includes(id),
    skillUnlocked: () => true,
    loreUnlocked: id => profile.lore.includes(id),
  };
})();
