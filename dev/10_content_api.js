/* =========================================================================
   SALLE ZÉRO — 10_content_api.js
   Accès au contenu déclaratif (CONTENT défini juste avant) + textes de lore.
   ========================================================================= */

'use strict';
const LORE = {
  title: 'WAY',
  subtitle: 'Roguelite à salles',
  hub: [
    'Le camp de base. Le chien dort, les chats surveillent la porte.',
    'Tout le monde est rentré. Pas dans le même état, mais rentré.',
    'Le magasin a du neuf. Enfin, du propre.',
    'Les crédits consignés en salle 4 sont à toi. Le reste, tu le sais.',
    'Neuf salles. Une sortie. Même chose que la dernière fois, en mieux préparé.',
    "Rien n'a bougé pendant ton absence. C'est reposant.",
  ],
  levelEnter: [
    "Neuf salles. La porte du fond ne s'ouvre que quand la salle est vide.",
    "Palier ouvert. Le compagnon te suit, l'arme est chargée.",
    "Salle 4 : tes crédits sont mis à l'abri. Salle 5 : le boss. Après, on verra.",
    'Ce qui tombe se ramasse. Ce qui brille se ramasse deux fois plus vite.',
  ],
  death: [
    'Tombé. Les crédits consignés sont gardés, le reste repart au sol.',
    "La salle a gagné cette fois. Elle n'a pas changé : toi si.",
    "Le compagnon est rentré seul. Il t'attend au camp.",
    'Une salle de plus que la dernière fois, ou une de moins ? Regarde en bas.',
  ],
  bossWin: [
    'Le boss est à terre. Il se relèvera en salle 9, plus vif.',
    'Salle 5 vidée. La moitié du chemin, la plus facile.',
    "Le gros est tombé. Le coffre de la salle 8 va s'en souvenir.",
  ],
  synopsis:
    "Neuf salles, un compagnon, une sortie. Chaque salle se vide avant que la porte du fond ne s'ouvre ; à la quatrième, tes crédits sont mis à l'abri ; à la cinquième, le boss ; à la neuvième, il revient. Entre les deux, tu ramasses ce qui tombe et tu choisis ce qui te rend plus fort.",
  fragments: [
    {
      id: 'room3_done',
      title: 'Fragment 1 — Note de service BH/RÉV-3',
      cond: 'Terminer la salle 3 pour la première fois.',
      text: "Objet : passage du Protocole H-12 au Protocole H-9.\nSuite à la revue budgétaire, les cases 10, 11 et 12 du formulaire (« Récupération », « Retour au calme », « Restitution ») sont supprimées.\nLes salles correspondantes seront condamnées et non démolies.\nLes sujets ayant atteint la case 9 seront considérés comme ayant atteint la fin du parcours.\nAucune modification du taux de rémunération n'est prévue, les cases supprimées n'étant pas rémunérées.\nSigné : le Bureau. Copie à la Greffière pour mise à jour des annonces.",
    },
    {
      id: 'deaths_3',
      title: 'Fragment 2 — Transcription intercom, Salle 4',
      cond: 'Mourir 3 fois.',
      text: "GREFFIÈRE — Consignation acceptée. Crédits validés. Matrice mise à jour.\nSUJET — La sortie. Elle est où, la sortie.\nGREFFIÈRE — La sortie est à l'issue de la case 9.\nSUJET — Et après la 9 ?\nGREFFIÈRE — Le formulaire s'arrête à la case 9.\nSUJET — Ça veut dire quoi ?\nGREFFIÈRE — Que la question n'a pas de case. Poursuivez.\n(Fin de transcription. Sujet réimprimé le lendemain, itération 12.)",
    },
    {
      id: 'room5_reached',
      title: "Fragment 3 — Rapport d'incident MT-ADM-118",
      cond: 'Atteindre la salle 5 pour la première fois.',
      text: 'Personnel concerné : technicienne de maintenance, affectation pièges, palier ADMISSION.\nFaits : la technicienne a ouvert une cellule de charge en fuite (salle 2) et a inséré un greffon non répertorié dans son avant-bras gauche, « pour voir si ça tenait ».\nLe greffon a tenu.\nConséquence : le personnel greffé est, par définition, un sujet. Reclassement immédiat.\nObservation : la reclassée a demandé si elle serait rémunérée. Réponse : oui, aux conditions standard.\nLe dossier a été rangé dans la marge du registre, faute de case « personnel devenu sujet ».\nRecommandation : prévoir une case.',
    },
    {
      id: 'boss_no_hit',
      title: 'Fragment 4 — Fiche de maintenance, ÉTALON 07',
      cond: 'Battre le mini-boss sans subir de dégât.',
      text: "Retrait au seuil critique : effectué. Réparation structurelle : effectuée.\nChargement des données de consignation du sujet en cours (case 4) : effectué. Temps de réaction, angles d'esquive, équipement : intégrés.\nGreffe des échantillons refusés par le sujet aux seuils de réceptivité : effectuée (le Site ne jette rien).\nPrise de calibration dorsale : signalée exposée depuis 14 interventions. Couverture par plaque provisoire. Le vissage n'a pas été contrôlé, faute de temps.\nRemarque du technicien : « Il apprend plus vite que les sujets. C'est normal, on lui donne les réponses. »\nStatut : ÉTALON 07 / rév. B, prêt pour confrontation de contrôle.",
    },
    {
      id: 'first_colossal',
      title: 'Fragment 5 — Note manuscrite, distributeur de réserve',
      cond: 'Obtenir une greffe Colossale pour la première fois.',
      text: "Ce n'est pas dans la nomenclature parce que ce n'est pas à eux.\nAvant le Protocole, avant le Bureau, il y a eu un sujet sans numéro. On l'a appelé Zéro parce qu'il fallait bien commencer à compter.\nTout ce qu'ils greffent depuis, ils l'ont prélevé sur lui. Ce qu'ils n'ont pas compris, ils l'ont tamponné « colossal » et mis dans les armoires.\nSi tu lis ceci, c'est que le distributeur t'a jugé assez intact pour porter un morceau de lui.\nNe meurs pas avec. Ils le reprendraient.\n— M.",
    },
  ],
};

/* Chantier 6 : les greffes en double ont été fondues dans une seule (CONTENT.md §41). Un ancien id (dans une vieille
   sauvegarde, un test, une liste d'exemples) se résout vers la greffe qui l'a absorbée. */
const UPGRADE_ALIASES = {
  upg_munitions: 'upg_tranchant',
  upg_calibrage: 'upg_longue_portee',
  upg_aimant_de_poche: 'upg_tirelire',
  upg_projectiles_lourds: 'upg_frappe_lourde',
  upg_balles_incendiaires: 'upg_etincelle',
  upg_balles_givrantes: 'upg_givre',
  upg_balles_electriques: 'upg_chaine_eclair',
  upg_conducteur: 'upg_chaine_eclair',
  upg_double_canon: 'upg_second_canon',
  upg_satellite: 'upg_orbes_gardiennes',
  upg_ceinture: 'upg_orbes_gardiennes',
  upg_noyau: 'upg_orbes_gardiennes',
  upg_tempete: 'upg_foudre_ambiante',
};
const Content = (() => {
  /* index par id, construit à la demande. `invalidate` est indispensable dès qu'on ajoute du contenu à chaud
     (atelier « Amis ») : sans lui, un personnage créé en cours de partie reste introuvable et l'appel retombe
     silencieusement sur le premier de la liste. */
  const idx = {};
  const byId = k => {
    if (!idx[k]) {
      idx[k] = {};
      for (const o of CONTENT[k] || []) idx[k][o.id] = o;
    }
    return idx[k];
  };
  const get = (k, id) => byId(k)[id] || null;
  function validate() {
    const warn = (...a) => console.warn('[Content]', ...a);
    CONTENT.characters.forEach((c, i) => {
      if (!c.sprite) c.sprite = i === 0 ? 'player' : 'player2';
    });
    for (const c of CONTENT.characters) if (!get('weapons', c.startWeapon)) warn('arme de départ inconnue', c.id, c.startWeapon);
    for (const b of CONTENT.biomes) {
      if (!get('bosses', b.miniboss)) warn('mini-boss inconnu', b.miniboss);
      for (const e of b.enemyPool) if (!get('enemies', e)) warn('ennemi inconnu', e);
      for (const t of b.trapPool) if (!get('traps', t)) warn('piège inconnu', t);
    }
    for (const r of CONTENT.rooms) {
      if (!ROOM_TYPES[r.type]) warn('type de salle inconnu', r.id, r.type);
      for (const w of r.waves || [])
        for (const s of w.spawns) if (!get('enemies', s.enemy) && !get('bosses', s.enemy)) warn('spawn inconnu', r.id, s.enemy);
      for (const t of r.traps || []) if (!get('traps', t.trap)) warn('piège inconnu', r.id, t.trap);
    }
    for (const e of CONTENT.enemies) if (!ENEMY_ARCHETYPES.includes(e.archetype)) warn('archétype inconnu', e.id, e.archetype);
    for (const t of CONTENT.traps) if (!TRAP_KINDS.includes(t.kind)) warn('kind de piège inconnu', t.id, t.kind);
    for (const p of CONTENT.pets || [])
      if (!PET_BEHAVIORS.includes(p.behavior)) warn('comportement de compagnon inconnu', p.id, p.behavior);
    for (const u of CONTENT.upgrades) if (!RARITY[u.rarity]) warn('rareté inconnue', u.id, u.rarity);
  }
  return {
    validate,
    characters: () => CONTENT.characters,
    character: id => get('characters', id) || CONTENT.characters[0],
    weapons: () => CONTENT.weapons,
    weapon: id => get('weapons', id),
    skills: () => CONTENT.skills,
    skill: id => get('skills', id),
    skillsAvailable: () => CONTENT.skills.filter(s => Meta.skillUnlocked(s.id)),
    upgrades: () => CONTENT.upgrades,
    upgrade: id => get('upgrades', UPGRADE_ALIASES[id] || id),
    upgradeAlias: id => UPGRADE_ALIASES[id] || id,
    metaPassives: () => CONTENT.metaPassives,
    metaPassive: id => get('metaPassives', id),
    biomes: () => CONTENT.biomes.slice().sort((a, b) => a.order - b.order),
    biome: id => get('biomes', id) || CONTENT.biomes[0],
    enemies: () => CONTENT.enemies,
    enemy: id => get('enemies', id),
    bosses: () => CONTENT.bosses,
    boss: id => get('bosses', id),
    invalidate: () => {
      for (const k in idx) delete idx[k];
    },
    traps: () => CONTENT.traps,
    trap: id => get('traps', id),
    pets: () => CONTENT.pets || [],
    pet: id => get('pets', id),
    pairs: () => CONTENT.pairs || [],
    pairOf: (charId, petId) => (CONTENT.pairs || []).find(p => p.char === charId && p.pet === petId) || null,
    rooms: () => CONTENT.rooms,
    roomsOf: biome => CONTENT.rooms.filter(r => r.biome === biome).sort((a, b) => a.index - b.index),
    pick: key => (LORE[key] ? LORE[key][Math.floor(VFX_RNG() * LORE[key].length)] : ''),
    lore: LORE,
  };
})();
