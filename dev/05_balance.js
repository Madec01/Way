/* =========================================================================
   WAY — 05_balance.js — constantes d'équilibrage (données, modifiables sans toucher au moteur)
   ========================================================================= */
const BALANCE = {
  /* XP nécessaire pour passer du niveau N au suivant : a + b·N + c·N² */
  xp: { a: 30, b: 20, c: 3.4 },
  xpPerfectTrapRoom: 15,          // bonus XP d'une salle de pièges traversée sans dégât
  /* poids de base des raretés à chance 0 */
  rarity: { common: 68, rare: 24, epic: 7, colossal: 1 },
  /* +1 chance retire luckShift % au commun, réparti epicShare / (1-epicShare) entre épique et colossal ; plafonné à luckMax */
  luck: { shift: 0.6, epicShare: 0.7, max: 20 },
  /* planchers de coffre selon le score moyen de la fenêtre */
  chest: { colossalAt: 0.999, epicAt: 0.85, rareAt: 0.6, shiftEpicCommonMul: 0.5, shiftEpicEpicMul: 1.8, shiftEpicColossalMul: 1.2 },
  /* montée de difficulté à l'intérieur d'un palier : multiplicateur (1 + rampPerRoom·(salle-1)) sur PV et dégâts des ennemis/pièges */
  rampPerRoom: 0.06,
  /* foudre ambiante : intervalle réel = every × [jitterMin, jitterMax] */
  lightningJitter: { min: 0.75, max: 1.6 },
  /* prime de fin de palier (crédits) */
  levelEndBonus: 150,
};
