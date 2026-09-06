/* =========================================================================
   WAY — 05_balance.js — constantes d'équilibrage (données, modifiables sans toucher au moteur)
   ========================================================================= */
const BALANCE = {
  /* XP nécessaire pour passer du niveau N au suivant : a + b·N + c·N² */
  xp: { a: 34, b: 25, c: 4.4 },
  xpPerfectTrapRoom: 15,          // bonus XP d'une salle de pièges traversée sans dégât
  /* poids de base des raretés à chance 0 */
  rarity: { common: 72, rare: 22.6, epic: 5, colossal: 0.4 },
  /* +1 chance retire luckShift % au commun, réparti epicShare / (1-epicShare) entre épique et colossal ; plafonné à luckMax */
  luck: { shift: 0.45, epicShare: 0.72, max: 20 },
  /* planchers de coffre selon le score moyen de la fenêtre */
  chest: { colossalAt: 0.999, epicAt: 0.85, rareAt: 0.6, shiftEpicCommonMul: 0.5, shiftEpicEpicMul: 1.8, shiftEpicColossalMul: 1.2 },
  /* montée de difficulté à l'intérieur d'un palier : multiplicateur (1 + rampPerRoom·(salle-1)) sur PV et dégâts des ennemis/pièges */
  rampPerRoom: 0.09,
  /* foudre ambiante : intervalle réel = every × [jitterMin, jitterMax] */
  lightningJitter: { min: 0.8, max: 2.0 },
  /* prime de fin de palier (crédits) */
  levelEndBonus: 150,
};
