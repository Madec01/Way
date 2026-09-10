/* Chantier I-1 sur un écran de téléphone simulé (900 × 420, tactile) : le HUD est ancré sur la vue réelle, les
   onglets restent dans le cadre, aucune police n'est calculée sous 12 px (11 pour les étiquettes), les toasts passent
   au-dessus des boutons tactiles. */
const { test } = require('./lib');
test(
  async ({ page: p, ok, entrer, salle, sansPause }) => {
    await entrer('test');
    const hub = await p.evaluate(() => {
      UI.showShop();
      const tabs = [...document.querySelectorAll('.tab')];
      const dehors = tabs.filter(t => t.getBoundingClientRect().right > innerWidth + 1 || t.getBoundingClientRect().left < -1).length;
      const hautes = tabs.filter(t => t.getBoundingClientRect().height < 43).length;
      UI.showHub();
      const petits = [];
      for (const el of document.querySelectorAll('#screen-hub *')) {
        if (!el.offsetParent) continue;
        if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        const etiquette =
          ['tag', 'lvlnum', 'rarity'].some(k => el.classList.contains(k)) ||
          (el.tagName === 'B' && el.parentElement.classList.contains('chip'));
        const min = etiquette ? 11 : 12;
        if (fs < min - 0.1) petits.push(`${el.className || el.tagName}:${fs.toFixed(1)}`);
      }
      return { n: tabs.length, dehors, petits: petits.slice(0, 6), nPetits: petits.length, hautes };
    });
    ok('les onglets de la boutique tiennent dans l’écran du téléphone', hub.n === 3 && hub.dehors === 0, `${hub.dehors} dehors`);
    ok('aucun texte du hub sous 12 px (11 pour une étiquette)', hub.nPetits === 0, hub.petits.join(' ') || 'tout ≥ 12 px');
    ok('les onglets font au moins 44 px de haut au doigt', hub.hautes === 0, hub.hautes + ' trop bas');

    await sansPause();
    await salle(2);
    const hud = await p.evaluate(() => {
      G.debug.hudProbe = true;
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      Pets.give('pet_uno');
      UI.toast('Un message');
      UI.renderHud(ctx);
      UI.renderToasts(ctx);
      const V = Engine.view;
      const L = -V.ox,
        T = -V.oy,
        R = -V.ox + V.w,
        B = -V.oy + V.h;
      const pr = UI.hudProbe;
      const horsVue = pr.rects.filter(r => r.x < L - 1 || r.x + r.w > R + 1 || r.y < T - 1 || r.y + r.h > B + 1).length;
      const pv = pr.rects[0];
      const arme = pr.rects.find(r => r.w === 420);
      const toast = pr.texts.find(t => t.t === 'Un message');
      const tir = document.querySelector('#touch .tbtn.fire');
      const tirTop = tir ? tir.getBoundingClientRect().top / V.scale - V.oy : B;
      return { vue: { L, T, R, B, ox: V.ox, oy: V.oy }, horsVue, pv, arme, toast: toast && toast.y, tirTop, touch: Input.touch.active };
    });
    ok('la vue est plus large que 1280 × 720 (bandes autour)', hud.vue.ox !== 0 || hud.vue.oy !== 0, JSON.stringify(hud.vue));
    ok(
      'le HUD est ancré aux bords de la vue, pas de la boîte 1280 × 720',
      hud.horsVue === 0 && hud.pv && Math.round(hud.pv.x) === Math.round(hud.vue.L + 18),
      `PV à x=${hud.pv && Math.round(hud.pv.x)} pour un bord à ${Math.round(hud.vue.L)}`
    );
    ok(
      'le cartouche d’arme est collé au bas de la vue',
      hud.arme && Math.round(hud.arme.y + hud.arme.h) === Math.round(hud.vue.B - 18),
      hud.arme && `bas à ${Math.round(hud.arme.y + hud.arme.h)} pour ${Math.round(hud.vue.B)}`
    );
    ok(
      'le toast passe au-dessus du bouton TIR',
      hud.touch && hud.toast != null && hud.toast < hud.tirTop - 10,
      `toast à y=${Math.round(hud.toast)}, TIR à ${Math.round(hud.tirTop)}`
    );
  },
  { mobile: true }
);
