/* Chantier I-9 — les menus en paysage court. Sur un téléphone tenu à l'horizontale (ici 900×420 tactile), ce test
   mesure : choisir une arme garde le défilement de la prépa ; l'échelle des menus a un plancher (les cartes ne sont plus réduites de moitié), le camp se défile en moins
   de deux écrans et demi, « Qui part ? » et « Avec qui ? » sont côte à côte, aucune carte n'est deux fois plus haute
   que large, l'en-tête et le bouton PARTIR tiennent en une ligne chacun, la phrase du palier vit sous la rangée, les
   puces bonus ⇄ malus sont fines mais les contrôles restent des cibles ; la prépa : paires côte à côte et basses,
   compétences en rangée, en-tête collant, moins de deux écrans et demi ; et au bureau (1280×720) rien ne bouge. */
const { test } = require('./lib');
test(
  async ({ page: p, ok, entrer, context }) => {
    await entrer('test');
    await p.waitForTimeout(800);

    const hub = await p.evaluate(() => {
      const r = el => el.getBoundingClientRect();
      const body = document.querySelector('#hub-body');
      const qui = r(document.querySelector('.hstep.qui')),
        avec = r(document.querySelector('.hstep.avec'));
      const cards = [...document.querySelectorAll('#hub-body .card')].map(c => ({ w: r(c).width, h: r(c).height, cls: c.className }));
      const chip = document.querySelector('.pairsline .pairchip');
      const graine = document.querySelector('label.pairchip');
      const tag = document.querySelector('.lvltag');
      return {
        scale: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-scale')) || null,
        charW: r(document.querySelector('.card.char.big')).width,
        ecrans: body.scrollHeight / body.clientHeight,
        coteACote: Math.abs(qui.top - avec.top) < 4 && avec.left > qui.left + 200,
        trop: cards.filter(c => c.h > 2 * c.w).map(c => c.cls),
        head: r(document.querySelector('.hubhead')).height,
        cta: r(document.querySelector('#hub-enter')).height,
        ctaTexte: document.querySelector('#hub-enter').textContent.replace(/\s+/g, ' ').trim(),
        chipH: chip ? r(chip).height : 0,
        graineH: graine ? r(graine).height : 0,
        tagVisible: !!tag && getComputedStyle(tag).display !== 'none' && r(tag).height > 0,
        descDansCarte: [...document.querySelectorAll('.card.level .lvldesc')].some(d => getComputedStyle(d).display !== 'none'),
        rows: [...document.querySelectorAll('.hub3 .row')].every(el => getComputedStyle(el).overflowX === 'auto'),
      };
    });
    ok(
      'l’échelle des menus a un plancher : les cartes de personnage font au moins 75 px de large (58 avant)',
      hub.charW >= 75,
      `${hub.charW.toFixed(0)} px · échelle ${hub.scale}`
    );
    ok('le camp se défile en moins de 2,5 écrans (3,7 avant)', hub.ecrans < 2.5, hub.ecrans.toFixed(2) + ' écrans');
    ok('« Qui part ? » et « Avec qui ? » sont côte à côte', hub.coteACote);
    ok('aucune carte du camp n’est deux fois plus haute que large', !hub.trop.length, hub.trop.join(' | '));
    ok(
      'l’en-tête et le bouton PARTIR tiennent en une ligne chacun (≤ 56 px), le bouton garde l’équipe',
      hub.head <= 56 && hub.cta <= 56 && hub.cta >= 44 && /Martin \+ Uno/.test(hub.ctaTexte),
      `en-tête ${hub.head.toFixed(0)} px · bouton ${hub.cta.toFixed(0)} px · « ${hub.ctaTexte} »`
    );
    ok('la phrase du palier vit sous la rangée, plus dans la carte', hub.tagVisible && !hub.descDansCarte);
    ok(
      'les puces bonus ⇄ malus sont fines (< 40 px) ; la graine du jour reste une cible de 44 px ; les rangées gardent overflow-x: auto',
      hub.chipH < 40 && hub.graineH >= 44 && hub.rows,
      `puce ${hub.chipH.toFixed(0)} px · graine ${hub.graineH.toFixed(0)} px`
    );

    await p.click('#hub-enter');
    await p.waitForTimeout(1200);
    const prep = await p.evaluate(() => {
      const r = el => el.getBoundingClientRect();
      const panel = document.querySelector('.prep2');
      const pairs = [...document.querySelectorAll('.pairpick')].map(c => r(c));
      const skills = [...document.querySelectorAll('.scard')].map(c => r(c));
      const head = document.querySelector('.prephead');
      panel.scrollTop = 400;
      const headApres = r(head).top;
      panel.scrollTop = 0;
      return {
        ecrans: panel.scrollHeight / panel.clientHeight,
        pairesCote: pairs.length >= 2 && Math.abs(pairs[0].top - pairs[1].top) < 4,
        paireH: Math.max(...pairs.map(x => x.height)),
        paireW: Math.min(...pairs.map(x => x.width)),
        skillsRangee: skills.length >= 2 && skills.every(s => Math.abs(s.top - skills[0].top) < 4),
        sticky: headApres >= r(panel).top - 1 && headApres < r(panel).top + 30,
      };
    });
    ok(
      'la prépa : les paires côte à côte, basses (< 130 px, 234 avant) et larges (> 250 px, 179 avant)',
      prep.pairesCote && prep.paireH < 130 && prep.paireW > 250,
      `${prep.paireW.toFixed(0)}×${prep.paireH.toFixed(0)}`
    );
    ok('les compétences sur une rangée', prep.skillsRangee);
    ok(
      'la prépa se défile en moins de 2,5 écrans (3,2 avant), l’en-tête reste collé en haut',
      prep.ecrans < 2.5 && prep.sticky,
      prep.ecrans.toFixed(2) + ' écrans'
    );

    /* choisir une arme ne ramène pas en haut de la prépa (retour de l'auteur) */
    await p.evaluate(() => {
      document.querySelector('.prep2').scrollTop = 300;
    });
    await p.waitForTimeout(150);
    const armes = await p.$$('.wcard');
    await armes[1].click();
    await p.waitForTimeout(300);
    const garde = await p.evaluate(() => ({
      scroll: document.querySelector('.prep2').scrollTop,
      choisie: document.querySelector('.wcard.selected').dataset.w,
    }));
    ok(
      'choisir une arme garde la position de défilement de la prépa',
      garde.scroll > 250 && garde.choisie === (await armes[1].getAttribute('data-w')),
      JSON.stringify(garde)
    );

    /* au bureau : rien ne bouge */
    const bureau = await context.browser().newContext({ viewport: { width: 1280, height: 720 } });
    const q = await bureau.newPage();
    await q.goto(p.url().split('?')[0]);
    await q.waitForTimeout(600);
    await q
      .waitForFunction(() => window.G && (G.state === 'menu' || G.state === 'title' || document.querySelector('.menuscreen')), null, {
        timeout: 15000,
      })
      .catch(() => {});
    const splash = await q.$('.menuscreen.splash');
    if (splash) {
      await splash.click();
      await q.waitForTimeout(2700);
    }
    await q.click('#btn-test');
    await q.waitForTimeout(500);
    if (await q.$('#intro-skip')) {
      await q.click('#intro-skip');
      await q.waitForTimeout(300);
    }
    await q.waitForFunction(() => window.G && G.state === 'hub', null, { timeout: 10000 }).catch(() => {});
    const b = await q.evaluate(() => {
      const r = el => el.getBoundingClientRect();
      const body = document.querySelector('#hub-body');
      return {
        scale: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--menu-scale')),
        charW: r(document.querySelector('.card.char.big')).width,
        lvlW: r(document.querySelector('.card.level.pick')).width,
        colonnes: getComputedStyle(body).display,
        tag: getComputedStyle(document.querySelector('.lvltag')).display,
        desc: !!document.querySelector('.card.level.selected .lvldesc'),
      };
    });
    await bureau.close();
    ok(
      'au bureau (1280×720), rien ne bouge : cartes de 150 et 210 px (échelle 1), une colonne, la phrase du palier dans sa carte',
      Math.abs(b.charW - 150) < 2 && Math.abs(b.lvlW - 210) < 2 && b.colonnes === 'flex' && b.tag === 'none' && b.desc,
      JSON.stringify(b)
    );
  },
  { mobile: true }
);
