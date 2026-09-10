/* =========================================================================
   WAY — 05_balance.js — constantes d'équilibrage (données, modifiables sans toucher au moteur)
   ========================================================================= */
'use strict';
const BALANCE = {
  /* XP nécessaire pour passer du niveau N au suivant : a + b·N + c·N² */
  xp: { a: 34, b: 25, c: 4.4 },
  xpPerfectTrapRoom: 15, // bonus XP d'une salle de pièges traversée sans dégât
  /* poids de base des raretés à chance 0 */
  rarity: { common: 72, rare: 22.6, epic: 5, colossal: 0.4 },
  /* +1 chance retire luckShift % au commun, réparti epicShare / (1-epicShare) entre épique et colossal ; plafonné à luckMax */
  luck: { shift: 0.45, epicShare: 0.72, max: 20 },
  /* planchers de coffre selon le score moyen de la fenêtre. Un joueur moyen tourne autour de 0,7 : c'est là que
     l'épique devient garanti — à 0,85 il ne le voyait jamais, et le colossal à 0,999 n'existait que pour le bot. */
  chest: { colossalAt: 0.97, epicAt: 0.7, rareAt: 0.45, shiftEpicCommonMul: 0.5, shiftEpicEpicMul: 1.8, shiftEpicColossalMul: 1.2 },
  /* armure : un pourcentage, pas un retrait fixe. 1 point = 4 %, plafonné à 50 %. En retrait fixe, trois greffes
     (9 points) ramenaient tout coup du biome 1 (5 à 13 dégâts) à 1 : le palier n'existait plus. */
  armor: { perPoint: 0.04, max: 0.5 },
  /* ce qu'une mort rapporte, en plus de la part des crédits en attente : une prime fixe, plus par salle atteinte.
     Mourir en salle 3 rapportait 18 à 42 crédits pour des prix à 400 : 300 runs d'une minute. */
  deathBonus: { base: 30, perRoom: 10 },
  /* renforts des défis qui tiennent la porte (zones à capturer) : au-delà, la porte s'ouvre et la récompense est
     perdue. Sans plafond, le bot est resté 378 s en salle 2. */
  reinforcementWaves: 3,
  /* compagnon : il se soigne quand on le laisse tranquille — sinon un chien qui attire les coups est sonné
     trois fois par salle et ne sert plus qu'à ça */
  petRegen: { delay: 4, perSec: 8, contactMul: 0.7 },
  /* soin : un cœur de cette valeur tombe devant la porte à chaque salle vidée (0 = jamais), et la chance qu'un
     ennemi en lâche un */
  heartOnClear: 30,
  heartDropChance: 0.05,
  heartOnBossPhase: 30, // second souffle au changement de phase d'un boss (0 = jamais)
  /* tempo : fenêtre « en rythme » (s) de part et d'autre du temps, et longueur de série à partir de laquelle le bonus s'applique */
  tempo: { window: 0.05, minStreak: 4 },
  /* reliques hors élites : chance qu'un ennemi ordinaire en lâche une (2 objets max par salle), et relique sûre sur le mini-boss */
  relicDropChance: 0.02,
  relicOnBoss: true,
  /* montée de difficulté à l'intérieur d'un palier : multiplicateur (1 + rampPerRoom·(salle-1)) sur PV et dégâts des ennemis/pièges */
  rampPerRoom: 0.09,
  /* foudre ambiante : intervalle réel = every × [jitterMin, jitterMax] */
  lightningJitter: { min: 0.8, max: 2.0 },
  /* prime de fin de palier (crédits) */
  levelEndBonus: 150,
};
