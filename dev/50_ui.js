/* =========================================================================
   SALLE ZÉRO — 50_ui.js
   Écrans DOM (menu, hub, préparation, choix, pause, fin, crédits) et HUD canvas.
   ========================================================================= */

'use strict';
const UI = (() => {
  const $ = sel => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  let root,
    screens = {},
    banners = [],
    toasts = [],
    fade = { t: 0, dir: 0, cb: null };
  const state = { choice: null, prep: null };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function init() {
    root = $('#ui');
    for (const s of ['menu', 'hub', 'shop', 'prep', 'choice', 'pause', 'end', 'credits', 'lore']) {
      const d = el('div', 'screen', '');
      d.id = 'screen-' + s;
      d.hidden = true;
      root.appendChild(d);
      screens[s] = d;
    }
    /* son de survol : une seule fois par bouton/carte, jamais plus d'un toutes les 90 ms (sinon ça grésille) */
    let lastHover = null,
      lastHoverT = 0;
    root.addEventListener('mouseover', e => {
      const el = e.target.closest('button, .card');
      if (!el || el === lastHover) return;
      lastHover = el;
      const now = performance.now();
      if (now - lastHoverT < 90) return;
      lastHoverT = now;
      AudioEngine.uiHover({ intensity: 0.25, step: menuStep(el) });
    });
    root.addEventListener('mouseout', e => {
      const el = e.target.closest('button, .card');
      if (el && el === lastHover && !el.contains(e.relatedTarget)) lastHover = null;
    });
    for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel'])
      window.addEventListener(
        ev,
        () => {
          if (G.state === 'menu') menuIdle();
        },
        { passive: true }
      );
    window.addEventListener('keydown', e => {
      if (e.code === 'F1' && G.mode === 'test') {
        e.preventDefault();
        Debug.toggle();
      }
      if (G.state === 'run' && (e.code === 'Escape' || e.code === 'KeyP') && !G.overlay) togglePause();
      else if (G.state === 'run' && e.code === 'Escape' && G.overlay === 'pause') togglePause();
      if (G.overlay === 'menu' && menuFx.phase === 'splash') {
        if (e.code !== 'F11' && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          enterMenu();
        }
        return;
      }
      if (G.overlay === 'menu') {
        const btns = [...screens[G.overlay].querySelectorAll('.mbtn, .btn')].filter(b => !b.disabled && b.offsetParent !== null);
        if (!btns.length) return;
        let i = btns.indexOf(document.activeElement);
        if (e.code === 'ArrowDown' || e.code === 'ArrowUp' || (e.code === 'Tab' && G.overlay === 'menu')) {
          e.preventDefault();
          i = (i + (e.code === 'ArrowUp' || (e.code === 'Tab' && e.shiftKey) ? -1 : 1) + btns.length) % btns.length;
          btns[i].focus();
          AudioEngine.uiHover({ intensity: 0.35, step: menuStep(btns[i]) });
        } else if ((e.code === 'Enter' || e.code === 'Space') && i >= 0) {
          e.preventDefault();
          btns[i].click();
        }
      }
      if (G.overlay === 'choice' && state.choice) {
        const k = parseInt(e.key);
        if (k >= 1 && k <= state.choice.choices.length) state.choice.pick(state.choice.choices[k - 1]);
        if (e.code === 'KeyR') state.choice.reroll && state.choice.reroll();
      }
    });
  }
  function show(name) {
    for (const k in screens) screens[k].hidden = k !== name;
    G.overlay = name === null ? null : name;
    root.classList.toggle('active', name !== null);
  }
  function hideAll() {
    show(null);
  }

  /* ---------- Menu ---------- */
  /* Le menu se joue en deux temps : un écran-titre (« splash ») qui respire avec la musique, puis au clic le menu
     principal centré, titre compris. Tout ce qui bouge est calé sur Beat : temps, temps forts, mesures. */
  const menuFx = {
    phase: null,
    rings: [],
    flash: 0,
    glitch: 0,
    gxCss: null,
    vol: 0,
    bass: 0,
    idle: 0,
    arcade: false,
    anchor: 0.4,
    btns: null,
    reveal: 0,
    revealMax: 0,
    pending: null,
    pendT: 0,
  };
  function menuActive() {
    return G.state === 'menu' && !!menuFx.phase;
  }
  function menuIdle() {
    menuFx.idle = 0;
    menuFx.arcade = false;
  }
  /* degré de la gamme associé à un bouton : chaque changement de sélection sonne une note différente de la piste */
  function menuStep(el) {
    if (!el || !el.parentElement) return 0;
    const i = [...el.parentElement.children].indexOf(el);
    return i < 0 ? 0 : i % 5;
  }
  /* Une validation tombe sur la mesure : on attend le prochain temps fort, jamais plus d'un temps si la musique est absente. */
  function barSync(fn) {
    let wait = Music.isPlaying() ? Beat.timeToNextBar() : 0.12;
    if (wait > 1.05) wait = (1 - Beat.phase()) * Beat.beatLen();
    menuFx.pending = fn;
    menuFx.pendT = Math.max(0.08, wait);
  }
  const MENU_TAGLINE = 'Neuf salles par palier. Une seule sortie.';
  function menuFoot(p) {
    const hint = Input.touch.active
      ? 'Joystick à gauche · TIR / COMP. / E à droite'
      : 'ZQSD · souris · clic gauche : attaque · clic droit / Espace : compétence · E : interagir · Échap : pause';
    return `<div class="menufoot"><div class="hint">${hint}</div><div class="save">${p.runs} ${p.runs > 1 ? 'parties' : 'partie'} · ${p.wins} ${p.wins > 1 ? 'victoires' : 'victoire'} · ◈ ${fmt(p.coins)}</div></div>`;
  }

  /* Écran-titre : le titre, la musique, rien d'autre. Un clic (ou une touche) fait basculer sur le menu au temps fort suivant. */
  function showTitle() {
    G.state = 'menu';
    G.paused = false;
    menuFx.phase = 'splash';
    menuFx.anchor = 0.42;
    menuFx.idle = 0;
    menuFx.arcade = false;
    menuFx.pending = null;
    menuFx.btns = null;
    menuFx.reveal = menuFx.revealMax = 0;
    const s = screens.menu;
    const p = Meta.profile;
    s.innerHTML = `
      <div class="menuscreen splash">
        <div class="stamp"><span>Way</span><span class="sep">·</span><span>Roguelite à salles</span></div>
        <div class="titlebox">
          <div class="titlepulse">
            <h1 class="bigtitle" data-text="WAY"><span class="accent">W</span><span>AY</span></h1>
            <div class="tagline">${MENU_TAGLINE}</div>
          </div>
        </div>
        <div class="splashprompt">Cliquez pour commencer</div>
        ${menuFoot(p)}
      </div>`;
    s.querySelector('.menuscreen').onclick = enterMenu;
    show('menu');
    Music.play('menu');
    if (!Attract.running) Attract.start();
    Attract.freeze(false);
  }
  /* Passage écran-titre → menu : flash et souffle sur le temps fort, le titre monte et rétrécit. */
  function enterMenu() {
    if (menuFx.phase !== 'splash' || menuFx.pending) return;
    AudioEngine.uiConfirm({ intensity: 0.85 });
    barSync(() => {
      menuFx.flash = 1;
      menuFx.rings.push({ t: 0, gold: true, big: true });
      AudioEngine.bossBreath({ intensity: 0.35 });
      showMenu();
    });
  }

  function showMenu() {
    G.state = 'menu';
    G.paused = false;
    menuFx.phase = 'main';
    menuFx.anchor = 0.2;
    menuFx.idle = 0;
    menuFx.arcade = false;
    menuFx.pending = null;
    const s = screens.menu;
    const p = Meta.profile;
    s.innerHTML = `
      <div class="menuscreen main">
        <div class="stamp"><span>Way</span><span class="sep">·</span><span>Roguelite à salles</span></div>
        <div class="titlebox">
          <div class="titlepulse">
            <h1 class="bigtitle" data-text="WAY"><span class="accent">W</span><span>AY</span></h1>
            <div class="tagline">${MENU_TAGLINE}</div>
          </div>
        </div>
        <nav class="menunav">
          <button class="mbtn primary" id="btn-normal"><span class="k">01</span><span class="l">Mode Normal</span><span class="d">Progression réelle, sauvegarde locale</span></button>
          <button class="mbtn" id="btn-test"><span class="k">02</span><span class="l">Mode Test</span><span class="d">Tout débloqué, panneau debug F1</span></button>
          <button class="mbtn" id="btn-credits"><span class="k">03</span><span class="l">Crédits</span><span class="d">Sprites, musiques, licences</span></button>
          <button class="mbtn" id="btn-lore"><span class="k">04</span><span class="l">Fragments</span><span class="d">Ce que les salles ont laissé</span></button>
          <button class="mbtn" id="btn-fs"><span class="k">05</span><span class="l">Plein écran</span><span class="d">${Fullscreen.active ? 'Quitter le plein écran' : 'Recommandé sur téléphone'}</span></button>
          <button class="mbtn ghost" id="btn-reset"><span class="k">—</span><span class="l">Réinitialiser</span><span class="d">Effacer la sauvegarde du mode Normal</span></button>
        </nav>
        <div class="audiohint">▶ Cliquez ou appuyez sur une touche pour lancer le son</div>
        ${menuFoot(p)}
      </div>`;
    const go = mode => {
      Attract.stop();
      Meta.setMode(mode);
      Debug.hide();
      Run.toHub();
      if (mode === 'test') toast('Mode Test : tout est débloqué. F1 : panneau debug.', 5);
    };
    /* Validation calée sur la mesure : le bouton s'allume, l'action part au temps fort suivant. */
    const onBar = (sel, fn) => {
      const b = s.querySelector(sel);
      b.onclick = () => {
        if (menuFx.pending) return;
        b.classList.add('armed');
        AudioEngine.uiConfirm({ intensity: 0.75 });
        barSync(() => {
          b.classList.remove('armed');
          fn();
        });
      };
    };
    /* le plein écran exige un geste de l'utilisateur : il part tout de suite, seule la transition attend la mesure */
    onBar('#btn-normal', () => go('normal'));
    s.querySelector('#btn-normal').addEventListener('pointerdown', () => {
      if (Input.touch.active && !Fullscreen.active) Fullscreen.enter();
    });
    onBar('#btn-test', () => go('test'));
    s.querySelector('#btn-test').addEventListener('pointerdown', () => {
      if (Input.touch.active && !Fullscreen.active) Fullscreen.enter();
    });
    onBar('#btn-credits', showCredits);
    onBar('#btn-lore', showFragments);
    s.querySelector('#btn-fs').onclick = () => {
      Fullscreen.toggle();
      setTimeout(showMenu, 400);
    };
    s.querySelector('#btn-reset').onclick = () => {
      if (confirm('Effacer la sauvegarde du mode Normal ?')) {
        Meta.reset();
        showMenu();
      }
    };
    menuFx.btns = [...s.querySelectorAll('.mbtn')];
    menuFx.reveal = 0;
    menuFx.revealMax = menuFx.btns.length;
    show('menu');
    Music.play('menu');
    if (!Attract.running) Attract.start();
    Attract.freeze(false);
    setTimeout(() => {
      const b = s.querySelector('#btn-normal');
      if (b && !Input.touch.active) b.focus({ preventScroll: true });
    }, 50);
  }

  /* Effets du menu pilotés par la musique : ondes de mesure, saccade du titre, grain, apparition des boutons. */
  function menuUpdate(dt) {
    menuFx.flash = Math.max(0, menuFx.flash - dt * 2.6);
    for (let i = menuFx.rings.length - 1; i >= 0; i--) {
      menuFx.rings[i].t += dt;
      if (menuFx.rings[i].t > 2) menuFx.rings.splice(i, 1);
    }
    const sp = AudioEngine.spectrum ? AudioEngine.spectrum(12) : null;
    if (sp) {
      let lo = 0,
        all = 0;
      for (let i = 0; i < 3; i++) lo = Math.max(lo, sp[i]);
      for (let i = 0; i < sp.length; i++) all += sp[i];
      all /= sp.length;
      const a = Math.min(1, dt * 12);
      menuFx.bass += (lo - menuFx.bass) * a;
      menuFx.vol += (all - menuFx.vol) * Math.min(1, dt * 7);
    } else {
      menuFx.bass *= Math.max(0, 1 - dt * 3);
      menuFx.vol *= Math.max(0, 1 - dt * 3);
    }
    const crossed = Beat.crossedFrame(1),
      bib = Beat.beatInBar();
    if (crossed && bib === 0) menuFx.rings.push({ t: 0, gold: ((Beat.index() >> 2) & 1) === 0 });
    if (crossed) {
      /* saccade discrète des lettres sur les contretemps, remise à zéro sur le temps fort */
      menuFx.glitch = bib === 0 ? 0 : Math.round((Math.random() * 2 - 1) * 4);
      const gx = menuFx.glitch + 'px';
      if (gx !== menuFx.gxCss) {
        menuFx.gxCss = gx;
        document.documentElement.style.setProperty('--gx', gx);
      }
    }
    if (menuFx.phase === 'main' && menuFx.btns && menuFx.reveal < menuFx.revealMax && crossed) {
      const b = menuFx.btns[menuFx.reveal++];
      if (b) {
        b.classList.add('on');
        AudioEngine.uiHover({ intensity: 0.5, step: menuFx.reveal });
      }
    }
    if (menuFx.pending) {
      menuFx.pendT -= dt;
      if (menuFx.pendT <= 0) {
        const fn = menuFx.pending;
        menuFx.pending = null;
        fn();
      }
    }
    menuFx.idle += dt;
    if (menuFx.idle > 20 && menuFx.phase === 'splash') menuFx.arcade = true;
  }
  /* Calque canvas du menu : ondes de choc issues du titre, balayage de couleur sur les graves, grain au volume, flash. */
  function renderMenuFx(ctx) {
    if (!menuActive()) return;
    const V = Engine.view,
      x0 = -V.ox,
      y0 = -V.oy,
      vw = V.w,
      vh = V.h;
    const ax = W / 2,
      ay = H * menuFx.anchor;
    ctx.save();
    ctx.lineWidth = 2;
    for (const r of menuFx.rings) {
      const a = r.t / (r.big ? 1.2 : 1.9);
      if (a > 1) continue;
      ctx.globalAlpha = (r.big ? 0.5 : 0.26) * (1 - a) * (1 - a);
      ctx.strokeStyle = r.gold ? '#ffb347' : '#6ee7ff';
      ctx.beginPath();
      ctx.arc(ax, ay, 30 + a * (r.big ? 1200 : 760), 0, TAU);
      ctx.stroke();
    }
    /* une bande de couleur traverse l'écran à chaque mesure, sa largeur suit les graves */
    const bl = Beat.beatLen(),
      barK = 1 - Beat.timeToNextBar() / (4 * bl);
    const cx = x0 + barK * vw,
      bw = 80 + 300 * menuFx.bass;
    const gold = ((Beat.index() >> 2) & 1) === 0;
    const gr = ctx.createLinearGradient(cx - bw, 0, cx + bw, 0);
    const col = gold ? '255,179,71' : '110,231,255';
    gr.addColorStop(0, `rgba(${col},0)`);
    gr.addColorStop(0.5, `rgba(${col},${(0.05 + 0.1 * menuFx.bass).toFixed(3)})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = gr;
    ctx.fillRect(x0, y0, vw, vh);
    /* grain de pellicule : densité pilotée par le volume de la piste */
    const pat = grainPattern(ctx);
    if (pat) {
      ctx.save();
      ctx.globalAlpha = 0.05 + 0.11 * menuFx.vol;
      ctx.translate(-((Time.now * 130) % 96), -((Time.now * 91) % 96));
      ctx.fillStyle = pat;
      ctx.fillRect(x0 - 96, y0 - 96, vw + 192, vh + 192);
      ctx.restore();
    }
    if (menuFx.arcade) {
      ctx.globalAlpha = 0.55 + 0.35 * Math.pow(1 - Beat.phase(), 2);
      ctx.fillStyle = '#6ee7ff';
      ctx.font = '19px "VT323", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DÉMONSTRATION', W / 2, H - 58);
    }
    if (menuFx.flash > 0) {
      ctx.globalAlpha = Math.min(1, menuFx.flash) * 0.75;
      ctx.fillStyle = '#dff6ff';
      ctx.fillRect(x0, y0, vw, vh);
    }
    ctx.restore();
  }
  let grainTile = null,
    grainPat = null;
  function grainPattern(ctx) {
    if (grainPat) return grainPat;
    if (typeof document === 'undefined' || !document.createElement) return null;
    grainTile = document.createElement('canvas');
    grainTile.width = grainTile.height = 96;
    const g = grainTile.getContext('2d');
    if (!g) return null;
    const im = g.createImageData(96, 96);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = 90 + Math.floor(Math.random() * 165);
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 40;
    }
    g.putImageData(im, 0, 0);
    grainPat = ctx.createPattern(grainTile, 'repeat');
    return grainPat;
  }

  /* ---------- Hub : « Qui part ? Avec qui ? Où ? Partir. » (chantier I-3) ----------
     Une seule zone de défilement, trois questions, une carte d'équipe qui rassemble ce qui était éparpillé sur trois
     colonnes (attelage, caractère, stats, mode du compagnon), la boutique dans son propre écran. Le hub se
     reconstruit à chaque choix mais garde sa position de défilement. */
  let hubScroll = 0;
  const STAT_MAX = { maxHp: 150, speed: 320, luck: 6 };
  function jauge(label, v, max, txt) {
    const w = Math.max(v > 0 ? 6 : 0, Math.round(clamp(v / max, 0, 1) * 100)); // une valeur non nulle se voit toujours
    return `<div class="jauge"><span class="jl">${label}</span><span class="jb"><i style="width:${w}%"></i></span>${txt === '' ? '' : `<span class="jv">${txt != null ? txt : v}</span>`}</div>`;
  }
  function showHub() {
    G.state = 'hub';
    const p = Meta.profile;
    const s = screens.hub;
    const chars = Content.characters();
    const cur = Content.character(p.character);
    const biomes = Content.biomes();
    if (!p.biome || !biomes.find(b => b.id === p.biome && Meta.biomeUnlocked(b))) p.biome = biomes[0].id;
    const biome = biomes.find(b => b.id === p.biome);
    const mode = p.petMode || 'always';
    const pet = mode !== 'none' && p.pet ? Content.pet(p.pet) : null;
    const pair = pet ? Content.pairOf(p.character, p.pet) : null;
    const achetable =
      Content.metaPassives().some(m => m.tiers[Meta.tierOf(m.id)] && p.coins >= m.tiers[Meta.tierOf(m.id)].price) ||
      Content.weapons().some(w => !Meta.weaponUnlocked(w.id) && p.coins >= w.price);
    const petsVisibles = Content.pets().filter(a => !a.hidden);
    s.innerHTML = `
      <div class="hub3">
        <header class="hubhead">
          <div class="hubid"><div class="stamp"><span>WAY</span><span class="sep">·</span><span>Camp de base</span></div><div class="intercom">« ${esc(Content.pick('hub'))} »</div></div>
          <div class="hubcoins"><div class="credits">${fmt(p.coins)} crédits</div>${G.mode === 'test' ? '<span class="tag test">MODE TEST</span>' : ''}</div>
          <div class="hubactions"><button class="btn small" id="hub-shop-open">Boutique${achetable ? ' <span class="dot" title="quelque chose est achetable"></span>' : ''}</button><button class="btn ghost small" id="hub-menu">Menu</button></div>
        </header>
        <div class="hubbody" id="hub-body">
          <section class="hstep qui">
            <h2><span class="stepnum">1</span> Qui part ?</h2>
            <div class="row" id="hub-chars"></div>
          </section>
          <section class="hstep avec">
            <h2><span class="stepnum">2</span> Avec qui ?</h2>
            <div class="row" id="hub-pets"></div>
          </section>
          <section class="teamcard ${pair ? 'attelage' : ''}" id="hub-team">
            <div class="teamhead"><span class="teamnames">${esc(cur.name)}${pet ? ' + ' + esc(pet.duoName || pet.name) : ' — seul'}</span>${pair ? `<span class="teamtag">★ ${esc(pair.name)}</span>` : ''}</div>
            ${pair ? `<div class="muted small">${esc(pair.desc)}</div>` : ''}
            <div class="small"><b>${esc(cur.trait.name)}</b> — ${esc(cur.trait.desc)}</div>
            ${mode === 'none' ? `<div class="small">Seul : <b>${esc(PET_MODES.none.desc.replace(/^Aucun compagnon — /, ''))}</b></div>` : ''}
            <div class="jauges">${jauge('PV', cur.stats.maxHp, STAT_MAX.maxHp)}${jauge('Vitesse', cur.stats.speed, STAT_MAX.speed)}${jauge('Chance', cur.stats.luck, STAT_MAX.luck)}</div>
            ${
              pet
                ? `<div class="teammode"><span class="small">${esc(pet.duoName || pet.name)} ${pet.duo ? 'restent' : 'reste'} avec toi :</span> ${[
                    'always',
                    'call',
                  ]
                    .map(
                      k =>
                        `<button class="btn small ${mode === k ? 'primary' : 'ghost'}" data-mode="${k}" title="${esc(PET_MODES[k].desc)}">${PET_MODES[k].name}</button>`
                    )
                    .join('')}<span class="muted tiny modedesc">${esc(PET_MODES[mode].short || PET_MODES[mode].desc)}</span></div>`
                : ''
            }
          </section>
          <section class="hstep ou">
            <h2><span class="stepnum">3</span> Où ?</h2>
            <div class="row" id="hub-biomes">${biomes
              .map(b => {
                const ok = Meta.biomeUnlocked(b);
                const sel = b.id === biome.id;
                const done = (p.cleared || {})[b.id] || 0;
                const prev = b.unlockAfter ? Content.biome(b.unlockAfter) : null;
                if (!ok)
                  return `<div class="card level locked" data-biome="${b.id}"><div class="lvlhead"><span class="lvlnum">Palier ${b.order}</span><span class="lvlname">${esc(b.name)}</span></div><div class="muted tiny">🔒 Finis le palier ${prev ? prev.order : b.order - 1}</div></div>`;
                return `<div class="card level pick ${sel ? 'selected' : ''}" data-biome="${b.id}">
              <div class="lvlhead"><span class="lvlnum">Palier ${b.order}</span><span class="lvlname">${esc(b.name)}</span></div>
              <div class="lvlmeta"><span class="etoiles">${'★'.repeat(Math.min(5, b.order))}${'☆'.repeat(Math.max(0, 5 - b.order))}</span><span class="muted tiny">${done ? `fini ${done} fois` : 'jamais fini'}</span></div>
              ${sel ? `<div class="muted small lvldesc">${esc(b.tagline || b.desc)}</div>` : ''}
            </div>`;
              })
              .join('')}</div>
            <div class="muted tiny pairsline">Au départ, une paire bonus ⇄ malus à choisir parmi : ${biome.levelPassives
              .map(
                lp =>
                  `<span class="pairchip" title="${esc(lp.bonus.desc)} · ${esc(lp.malus.desc)}"><span class="good">${esc(lp.bonus.name)}</span> ⇄ <span class="bad">${esc(lp.malus.name)}</span></span>`
              )
              .join('')}</div>
          </section>
        </div>
        <button class="cta big" id="hub-enter"><span class="l">▶ PARTIR — ${esc(biome.name)}, 9 salles</span><span class="d">${esc(cur.name)}${pet ? ' + ' + esc(pet.duoName || pet.name) : ', seul'} · arme et compétence ensuite</span></button>
      </div>`;
    /* 1. qui part ? — une carte par ami : le portrait animé et le nom, rien d'autre (le détail est dans la carte d'équipe) */
    const cc = s.querySelector('#hub-chars');
    for (const c of chars) {
      const owned = Meta.characterUnlocked(c.id);
      const sel = c.id === p.character;
      const card = el(
        'div',
        'card char big' + (sel ? ' selected' : '') + (owned ? '' : ' locked'),
        `<div class="portrait" ></div><div class="cardname">${esc(c.name)}</div>${owned ? (sel ? '<div class="pickmark">✓</div>' : '') : `<button class="btn small buy" ${p.coins < c.price ? 'disabled' : ''}>Débloquer — ◈ ${c.price}</button>`}`
      );
      const pc = Sprites.portraitBody(c.sprite || 'player', 5, c.face, c.body, c.size, c.anim);
      if (pc) card.querySelector('.portrait').appendChild(pc);
      card.onclick = e => {
        if (e.target.classList.contains('buy')) {
          if (Meta.buyCharacter(c.id)) showHub();
          return;
        }
        if (owned && !sel) {
          p.character = c.id;
          Meta.save();
          AudioEngine.uiClick({});
          showHub();
        }
      };
      cc.appendChild(card);
    }
    /* 2. avec qui ? — les animaux en grand, et « Seul » comme une carte de même taille, avec son bonus dessus */
    const pc2 = s.querySelector('#hub-pets');
    for (const a of petsVisibles) {
      const owned = Meta.petUnlocked(a.id);
      const sel = mode !== 'none' && p.pet === a.id;
      const card = el(
        'div',
        'card pet big' + (sel ? ' selected' : '') + (owned ? '' : ' locked'),
        `<div class="peticonbox"></div><div class="cardtitle"><span>${esc(a.duoName || a.name)}</span></div><div class="muted tiny">${esc(a.tag || '')}</div>${owned ? (sel ? '<div class="pickmark">✓</div>' : '') : `<button class="btn small buy" ${p.coins < a.price ? 'disabled' : ''}>Débloquer — ◈ ${a.price}</button>`}`
      );
      const img = a.anim && a.anim.idle ? Sprites.sheetCanvas(a.anim.idle, 64) : Sprites.propCanvas(a.sprite, 64);
      if (img) {
        img.className = 'peticon';
        card.querySelector('.peticonbox').appendChild(img);
      }
      card.onclick = e => {
        if (e.target.classList.contains('buy')) {
          if (Meta.buyPet(a.id)) showHub();
          return;
        }
        if (!owned || sel) return;
        p.pet = a.id;
        if (p.petMode === 'none') p.petMode = 'always';
        Meta.save();
        AudioEngine.uiClick({});
        showHub();
      };
      pc2.appendChild(card);
    }
    const seul = el(
      'div',
      'card pet big seul' + (mode === 'none' ? ' selected' : ''),
      `<div class="peticonbox"><span class="seulglyph">—</span></div><div class="cardtitle"><span>Seul</span></div><div class="muted tiny">tu gardes sa part : +35 % PV, +20 % dégâts</div>${mode === 'none' ? '<div class="pickmark">✓</div>' : ''}`
    );
    seul.onclick = () => {
      if (mode === 'none') return;
      p.petMode = 'none';
      Meta.save();
      AudioEngine.uiClick({});
      showHub();
    };
    pc2.appendChild(seul);
    /* le mode du compagnon, dans la carte d'équipe, à côté de ce qu'il pilote */
    s.querySelectorAll('[data-mode]').forEach(b => {
      b.onclick = () => {
        p.petMode = b.dataset.mode;
        Meta.save();
        AudioEngine.uiClick({});
        showHub();
      };
    });
    /* 3. où ? */
    s.querySelectorAll('[data-biome]').forEach(
      c =>
        (c.onclick = () => {
          const b = Content.biome(c.dataset.biome);
          if (!Meta.biomeUnlocked(b)) {
            toast("Finis d'abord le palier précédent.");
            return;
          }
          if (p.biome === b.id) return;
          p.biome = b.id;
          Meta.save();
          AudioEngine.uiClick({});
          showHub();
        })
    );
    s.querySelector('#hub-menu').onclick = () => showMenu();
    s.querySelector('#hub-shop-open').onclick = () => showShop();
    s.querySelector('#hub-enter').onclick = () => {
      hideAll();
      Run.start({ character: p.character, biome: biome.id });
    };
    const body = s.querySelector('#hub-body');
    body.scrollTop = hubScroll;
    body.onscroll = () => (hubScroll = body.scrollTop);
    show('hub');
    if (!Attract.running) Attract.start();
    Attract.freeze(true); // figée derrière le hub : un tir ou un piège ne passe plus à travers les cartes
  }

  /* ---------- Boutique : un écran à part, entre deux parties ---------- */
  let hubTab = 'passifs';
  function showShop() {
    const p = Meta.profile;
    const s = screens.shop;
    const tabs = ['passifs', 'armes', 'sujets'];
    s.innerHTML = `
      <div class="panel shoppanel">
        <div class="shophead"><div><div class="eyebrow">Camp de base</div><h2>Boutique</h2></div><div class="hubcoins"><div class="credits">${fmt(p.coins)} crédits</div></div><button class="btn ghost" id="shop-back">Retour au camp</button></div>
        <nav class="tabs">${tabs.map(t => `<button class="tab ${hubTab === t ? 'on' : ''}" data-tab="${t}">${{ passifs: 'Améliorations', armes: 'Armes', sujets: 'Compétences' }[t]}</button>`).join('')}</nav>
        <div id="hub-shop" class="shop"></div>
      </div>`;
    s.querySelectorAll('.tab').forEach(
      t =>
        (t.onclick = () => {
          hubTab = t.dataset.tab;
          AudioEngine.uiClick({});
          showShop();
        })
    );
    s.querySelector('#shop-back').onclick = () => showHub();
    renderShop(s.querySelector('#hub-shop'));
    show('shop');
  }
  function renderShop(box) {
    const p = Meta.profile;
    box.innerHTML = '';
    if (hubTab === 'passifs') {
      for (const m of Content.metaPassives()) {
        const t = Meta.tierOf(m.id);
        const next = m.tiers[t];
        const maxed = !next;
        /* une carte ne montre que le palier suivant : ce qu'on peut acheter, pas la fiche technique des quatre */
        const card = el(
          'div',
          'card meta' + (maxed ? ' maxed' : ''),
          `<div class="cardtitle">${esc(m.name)} <span class="tier">${'●'.repeat(t)}${'○'.repeat(m.tiers.length - t)}</span></div><div class="muted small">${esc(m.desc)}</div>${maxed ? '<div class="good small">Au maximum</div>' : `<div class="small">Palier ${t + 1}/${m.tiers.length} : ${esc(describeTier(next))}</div><button class="btn small buy" ${p.coins < next.price ? 'disabled' : ''}>Acheter — ◈ ${next.price}</button>`}`
        );
        const b = card.querySelector('.buy');
        if (b)
          b.onclick = () => {
            if (Meta.buy(m.id)) showShop();
          };
        box.appendChild(card);
      }
    } else if (hubTab === 'armes') {
      for (const w of Content.weapons()) {
        const owned = Meta.weaponUnlocked(w.id);
        const card = el(
          'div',
          'card weapon' + (owned ? '' : ' locked'),
          `<div class="cardtitle">${esc(w.name)} <span class="tag">${esc(famille(w.family))}</span></div><div class="muted small">${esc(w.desc)}</div>${owned ? '<div class="good small">Déjà à toi</div>' : `<button class="btn small buy" ${p.coins < w.price ? 'disabled' : ''}>Racheter — ◈ ${w.price}</button>`}`
        );
        const b = card.querySelector('.buy');
        if (b)
          b.onclick = () => {
            if (Meta.buyWeapon(w.id)) showShop();
          };
        box.appendChild(card);
      }
    } else if (hubTab === 'sujets') {
      box.appendChild(
        el('div', 'muted small', "Trois compétences sont tirées au sort à l'entrée du palier, tu en choisis une. Le catalogue :")
      );
      for (const sk of Content.skills())
        box.appendChild(
          el(
            'div',
            'card',
            `<div class="cardtitle">${esc(sk.name)} <span class="tag cd">recharge ${sk.cooldown} s</span></div><div class="muted small">${esc(sk.desc)}</div>`
          )
        );
    }
  }
  /* ---------- Fragments : sortis du camp, accessibles depuis le menu ---------- */
  function showFragments() {
    const p = Meta.profile;
    const s = screens.lore;
    s.innerHTML = `<div class="panel center lore"><h2>Fragments</h2><div class="shop" id="lore-list"></div>
      <div class="muted tiny">Parties : ${p.runs} · victoires : ${p.wins} · morts : ${p.deaths} · meilleur niveau : ${p.bestLevel}</div>
      <div class="row"><button class="btn primary" id="lore-back">Retour</button></div></div>`;
    const box = s.querySelector('#lore-list');
    for (const f of LORE.fragments) {
      const ok = Meta.loreUnlocked(f.id);
      box.appendChild(
        el(
          'div',
          'card lore' + (ok ? '' : ' locked'),
          `<div class="cardtitle">${ok ? esc(f.title) : 'Document scellé'}</div><div class="muted small">${ok ? esc(f.text).replace(/\n/g, '<br>') : 'Condition : ' + esc(f.cond)}</div>`
        )
      );
    }
    s.querySelector('#lore-back').onclick = () => showMenu();
    show('lore');
  }
  function describeTier(t) {
    const parts = (t.mods || []).map(
      m =>
        `${STAT_LABELS[m.stat] || m.stat} ${m.add != null ? (m.add > 0 ? '+' : '') + (Math.abs(m.add) < 1 ? Math.round(m.add * 100) + ' %' : m.add) : pct(m.mul - 1)}`
    );
    if (t.special)
      parts.push(
        {
          resurrect: 'résurrection',
          selective_memory: 'mémoire sélective',
          chest_preview: 'aperçu du coffre',
          fourth_choice: '4e choix',
          reroll: '+1 re-roll',
        }[t.special] || t.special
      );
    for (const h in t.hooks || {}) for (const e of t.hooks[h]) if (!t.special) parts.push(e.effect);
    return parts.join(', ') || '—';
  }
  /* une distance du moteur en repère humain (chantier I-2 : jamais de px à l'écran) */
  function portee(px) {
    return px <= 80 ? 'au contact' : px <= 200 ? 'de près' : px <= 450 ? 'à mi-salle' : px <= 650 ? 'loin' : 'toute la salle';
  }
  const fmt1 = n => String(Math.round(n * 10) / 10).replace('.', ',');
  const WMAX = { damage: 75, fireRate: 10, range: 720 }; // le haut de chaque jauge d'arme : le maximum du catalogue
  function weaponStats(w) {
    const parts = [
      `${w.damage} dégâts par coup`,
      `${fmt1(w.fireRate)} coup${w.fireRate >= 2 ? 's' : ''} par seconde`,
      `portée : ${portee(w.range)}`,
    ];
    if (w.pierce >= 99) parts.push('traverse tout');
    else if (w.pierce) parts.push(`perce ${w.pierce} ennemi${w.pierce > 1 ? 's' : ''}`);
    if (w.bounce) parts.push(`${w.bounce} rebond${w.bounce > 1 ? 's' : ''}`);
    if (w.projectiles > 1) parts.push(`${w.projectiles} projectiles`);
    return parts.join(' · ');
  }

  /* ---------- Préparation (salle 1) ---------- */
  function showPrep() {
    const r = G.run;
    const s = screens.prep;
    const weapons = Content.weapons().filter(w => Meta.weaponUnlocked(w.id));
    let selW = r.char.startWeapon && Meta.weaponUnlocked(r.char.startWeapon) ? r.char.startWeapon : weapons[0].id;
    let selS = null;
    let selP = 0; // paire bonus/malus : la première par défaut
    let selR = state.testRoom || 1,
      selL = state.testLevel || 1; // mode Test : salle et niveau de départ (mémorisés pour la session)
    const metaList =
      Content.metaPassives()
        .filter(m => Meta.tierOf(m.id) > 0)
        .map(m => `${esc(m.name)} ${Meta.tierOf(m.id)}`)
        .join(', ') || 'aucune amélioration';
    const render = () => {
      const wSel = weapons.find(w => w.id === selW);
      const sSel = r.skillChoices.find(sk => sk.id === selS);
      const pairs = r.pairChoices || [];
      const touch = Input.touch.active;
      const testrow =
        G.mode === 'test'
          ? `<div class="row testrow"><span class="tag test">MODE TEST</span><label class="muted small">Commencer à la salle <select id="prep-room">${[
              1, 2, 3, 4, 5, 6, 7, 8, 9,
            ]
              .map(i => {
                const d = r.rooms.find(x => x.index === i);
                const lb = d && ROOM_TYPES[d.type] ? ROOM_TYPES[d.type].label : '';
                return `<option value="${i}" ${i === selR ? 'selected' : ''}>${i} — ${esc(lb)}</option>`;
              })
              .join(
                ''
              )}</select></label><label class="muted small">avec le personnage au niveau <select id="prep-level">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15].map(i => `<option value="${i}" ${i === selL ? 'selected' : ''}>${i}</option>`).join('')}</select></label></div>`
          : '';
      const nSkills = Content.skills().length;
      s.innerHTML = `
        <div class="panel prep prep2">
          <div class="prephead"><div><div class="eyebrow">Avant d'entrer — palier ${r.biome.order} · ${esc(r.biome.name)}</div><h2>Équipe-toi</h2></div>
          <div class="prepsummary">${wSel ? esc(wSel.name) : '…'} <span class="muted">+</span> ${sSel ? esc(sSel.name) : '<span class="bad">une compétence</span>'}</div></div>
          <section class="prepstep pairstep done">
            <h3><span class="stepnum">0</span> Ton départ <span class="muted tiny">— un bonus et un malus, ensemble · choisis la paire qui te va</span></h3>
            <div class="cards" id="prep-pairs">${pairs.map((pp, i) => `<div class="card pick pairpick ${i === selP ? 'selected' : ''}" data-p="${i}"><div class="prepmods"><span class="chip good"><b>+</b> ${esc(pp.bonus.name)} — ${esc(pp.bonus.desc)}</span><span class="swap">⇄</span><span class="chip bad"><b>−</b> ${esc(pp.malus.name)} — ${esc(pp.malus.desc)}</span></div>${i === selP ? '<div class="pickmark">✓ Choisie</div>' : ''}</div>`).join('')}</div>
          </section>
          <details class="prepdetails muted tiny"><summary>Caractère du personnage et améliorations du camp</summary><b>${esc(r.char.trait.name)}</b> — ${esc(r.char.trait.desc)}<br>Améliorations : ${metaList}</details>
          <section class="prepstep weapon done">
            <h3><span class="stepnum">1</span> Ton arme <span class="muted tiny">— ${weapons.length} à toi · l'attaque principale, en continu · clic gauche${touch ? ' ou bouton TIR' : ''}</span></h3>
            <div class="grid weapons" id="prep-weapons">${weapons
              .map(
                w =>
                  `<div class="card pick weapon wcard ${w.id === selW ? 'selected' : ''}" data-w="${w.id}"><div class="iconbox"></div><div class="cardtitle"><span>${esc(w.name)}</span><span class="tag">${esc(famille(w.family))}</span></div><div class="jauges mini">${jauge('Dégâts', w.damage, WMAX.damage, '')}${jauge('Cadence', w.fireRate, WMAX.fireRate, '')}${jauge('Portée', w.range, WMAX.range, '')}</div>${w.id === selW ? '<div class="pickmark">✓</div>' : ''}</div>`
              )
              .join('')}</div>
            <div class="detail" id="prep-detail"></div>
          </section>
          <section class="prepstep skill ${selS ? 'done' : 'todo'}">
            <h3><span class="stepnum">2</span> Ta compétence <span class="muted tiny">— ${r.skillChoices.length} tirées au sort sur ${nSkills} · un pouvoir à recharge · clic droit, Espace ou Maj${touch ? ' ou bouton COMP.' : ''}</span></h3>
            <div class="grid skills" id="prep-skills">${r.skillChoices
              .map(
                sk =>
                  `<div class="card pick skill scard ${sk.id === selS ? 'selected' : ''}" data-s="${sk.id}"><div class="iconbox"></div><div class="stext"><div class="cardtitle"><span>${esc(sk.name)}</span><span class="tag cd">recharge ${sk.cooldown} s</span></div><div class="muted small">${esc(sk.desc)}</div>${sk.id === selS ? '<div class="pickmark">✓ Choisie</div>' : ''}</div></div>`
              )
              .join('')}</div>
          </section>
          <div class="row"><button class="btn primary big" id="prep-go" ${selS ? '' : 'disabled'}>${selS ? `Entrer en salle 1 avec ${esc(wSel.name)} et ${esc(sSel.name)}` : 'Choisis une compétence pour entrer'}</button><button class="btn ghost" id="prep-abort">${STR.toHub}</button></div>
          ${testrow}
        </div>`;
      const pr = s.querySelector('#prep-room'),
        plv = s.querySelector('#prep-level');
      if (pr)
        pr.onchange = () => {
          selR = +pr.value;
          state.testRoom = selR;
        };
      if (plv)
        plv.onchange = () => {
          selL = +plv.value;
          state.testLevel = selL;
        };
      /* les icônes de la planche, et le panneau de détail unique : il décrit l'arme survolée, sinon la choisie */
      for (const c of s.querySelectorAll('[data-w]')) {
        const ic = Sprites.icon(c.dataset.w, 64);
        if (ic) c.querySelector('.iconbox').appendChild(ic);
      }
      for (const c of s.querySelectorAll('[data-s]')) {
        const ic = Sprites.icon(c.dataset.s, 56);
        if (ic) c.querySelector('.iconbox').appendChild(ic);
      }
      const detail = s.querySelector('#prep-detail');
      const showDetail = w => {
        detail.innerHTML = `<div class="iconbox"></div><div class="dtext"><div class="cardtitle"><span>${esc(w.name)}</span><span class="tag">${esc(famille(w.family))}</span></div><div class="small">${esc(w.desc)}</div><div class="muted tiny">${esc(weaponStats(w))}</div></div>`;
        detail.dataset.w = w.id;
        const ic = Sprites.icon(w.id, 48);
        if (ic) detail.querySelector('.iconbox').appendChild(ic);
      };
      showDetail(wSel);
      s.querySelectorAll('[data-w]').forEach(c => {
        c.onclick = () => {
          selW = c.dataset.w;
          AudioEngine.uiClick({});
          render();
        };
        c.onmouseenter = () => showDetail(weapons.find(w => w.id === c.dataset.w));
        c.onmouseleave = () => showDetail(weapons.find(w => w.id === selW));
      });
      s.querySelectorAll('[data-s]').forEach(
        c =>
          (c.onclick = () => {
            selS = c.dataset.s;
            AudioEngine.uiClick({});
            render();
          })
      );
      s.querySelectorAll('[data-p]').forEach(
        c =>
          (c.onclick = () => {
            selP = +c.dataset.p;
            Run.setPair(selP);
            AudioEngine.uiClick({});
            render();
          })
      );
      s.querySelector('#prep-go').onclick = () => go();
      s.querySelector('#prep-abort').onclick = () => {
        Run.toHub();
      };
    };
    const go = () => {
      if (!selS) return;
      Run.setPair(selP);
      Run.equip(selW, selS);
      hideAll();
      G.paused = false;
      if (G.mode === 'test' && selR > 1) Room.load(selR); // mode Test : départ direct dans la salle choisie
      if (G.mode === 'test' && selL > 1) {
        for (let i = 1; i < selL; i++) Run.addXp(G.run.xpNext - G.run.xp);
      } // niveaux offerts : les choix de greffes s'enchaînent avant la salle
      Room.begin();
      AudioEngine.uiConfirm({});
    };
    state.prep = {
      pick: (w, sk) => {
        selW = w;
        selS = sk;
        go();
      },
      weapons,
      skills: r.skillChoices,
    };
    render();
    show('prep');
    if (G.autoplay) Debug.autoPrep();
  }

  /* ---------- Choix (level-up / coffre) ---------- */
  function showChoice({ title, subtitle, choices, reroll, onPick, onReroll }) {
    const s = screens.choice;
    const pl = G.player;
    const render = () => {
      s.innerHTML = `
        <div class="panel choice">
          <div class="eyebrow">${esc(subtitle || '')}</div><h2>${esc(title)}</h2>
          <div class="cards" id="choice-cards">${choices.map((u, i) => cardHtml(u, i)).join('')}</div>
          <div class="row small">${reroll && pl.rerollsLeft > 0 ? `<button class="btn ghost" id="choice-reroll">Relancer (${pl.rerollsLeft}) — R</button>` : ''}<span class="muted tiny">1-${choices.length} : choisir</span></div>
        </div>`;
      s.querySelectorAll('[data-i]').forEach(c => (c.onclick = () => pick(choices[+c.dataset.i])));
      const rb = s.querySelector('#choice-reroll');
      if (rb) rb.onclick = doReroll;
    };
    const pick = u => {
      state.choice = null;
      onPick(u);
    };
    const doReroll = () => {
      if (!onReroll || pl.rerollsLeft <= 0) return;
      pl.rerollsLeft--;
      choices = onReroll();
      AudioEngine.uiClick({});
      render();
      state.choice.choices = choices;
    };
    state.choice = { choices, pick, reroll: reroll ? doReroll : null };
    render();
    show('choice');
    if (G.autoplay) Debug.autoChoice();
  }
  /* un mot par notion, en français : les catégories de greffes et les familles d'armes ne sortent jamais telles quelles du contenu */
  const CATEGORIES = {
    offense: 'Attaque',
    defense: 'Défense',
    mobility: 'Mobilité',
    utility: 'Utilitaire',
    economy: 'Butin',
    special: 'Spécial',
    synergy: 'Synergie',
  };
  const FAMILLES = {
    blade: 'lame',
    hammer: 'masse',
    bow: 'arc',
    pistol: 'pistolet',
    boomerang: 'boomerang',
    orb: 'orbe',
    chain: 'chaîne',
    flame: 'flamme',
  };
  const categorie = c => CATEGORIES[c] || c;
  const famille = f => FAMILLES[f] || f;
  function cardHtml(u, i) {
    const r = RARITY[u.rarity];
    const ex = G.run.upgrades.find(x => x.def.id === u.id);
    return `<div class="card upg r-${u.rarity}" data-i="${i}" style="--rc:${r.color};--rg:${r.glow}"><div class="rarity">${r.label}</div><div class="cardtitle">${esc(u.name)}</div><div class="desc">${esc(u.desc)}</div><div class="muted tiny">${categorie(u.category)}${u.weaponFamily ? ' · synergie ' + famille(u.weaponFamily) : ''}${ex ? ` · déjà prise ×${ex.stacks}` : ''}${u.maxStacks > 1 ? ` · ${u.maxStacks} paliers` : ''}</div><div class="key">${i + 1}</div></div>`;
  }
  function hideChoice() {
    state.choice = null;
    hideAll();
  }

  /* ---------- Pause ---------- */
  function togglePause() {
    if (G.overlay === 'pause') {
      hideAll();
      G.paused = false;
      return;
    }
    if (G.overlay) return;
    G.paused = true;
    const s = screens.pause;
    const v = Meta.profile.volume;
    const pl = G.player;
    s.innerHTML = `<div class="panel center pause"><h2>${STR.paused}</h2>
      <div class="muted small">${esc(pl.weapon.name)} · ${esc(pl.skill.name)} · niveau ${G.run.level}</div>
      <div class="upglist">${G.run.upgrades.map(u => `<span class="pill" style="--rc:${RARITY[u.def.rarity].color}">${esc(u.def.name)}${u.stacks > 1 ? ' ×' + u.stacks : ''}</span>`).join('') || '<span class="muted tiny">aucune greffe</span>'}</div>
      <div class="sliders">
        <label>Général <input type="range" min="0" max="1" step="0.05" value="${v.master}" data-v="master"></label>
        <label>Effets <input type="range" min="0" max="1" step="0.05" value="${v.sfx}" data-v="sfx"></label>
        <label>Musique <input type="range" min="0" max="1" step="0.05" value="${v.music}" data-v="music"></label>
        ${Input.touch.active ? `<label>Tir automatique (tactile) <input type="checkbox" id="pause-autofire" ${Input.touch.autoFire ? 'checked' : ''}></label>` : ''}
        <label>Zoom caméra <select id="pause-zoom">${[1, 1.25, 1.5, 1.75, 2].map(z => `<option value="${z}" ${Math.abs(Camera.zoom - z) < 0.01 ? 'selected' : ''}>${z}×</option>`).join('')}</select></label>
      </div>
      <div class="row small"><button class="btn ghost" id="pause-fs">${Fullscreen.active ? 'Quitter le plein écran' : 'Plein écran'}</button><button class="btn ghost" id="pause-report" title="Met dans le presse-papiers un rapport à envoyer si quelque chose a cassé">Copier le rapport</button></div>
      <div class="row"><button class="btn primary" id="pause-resume">${STR.resume}</button><button class="btn ghost" id="pause-quit">${STR.quit}</button></div></div>`;
    s.querySelectorAll('input[type=range]').forEach(
      i =>
        (i.oninput = () => {
          v[i.dataset.v] = +i.value;
          AudioEngine.setVolume(v);
          Meta.save();
        })
    );
    s.querySelector('#pause-zoom').onchange = e => {
      Camera.setZoom(+e.target.value);
      Meta.profile.zoom = +e.target.value;
      Meta.save();
    };
    s.querySelector('#pause-report').onclick = () =>
      Rapport.copier().then(ok => toast(ok ? 'Rapport copié — colle-le dans un message à Martin' : 'Rapport affiché'));
    s.querySelector('#pause-fs').onclick = () => {
      Fullscreen.toggle();
      setTimeout(() => {
        if (G.overlay === 'pause') {
          togglePause();
          togglePause();
        }
      }, 300);
    };
    const af = s.querySelector('#pause-autofire');
    if (af)
      af.onchange = () => {
        Input.touch.autoFire = af.checked;
        Meta.profile.touchAutoFire = af.checked;
        Meta.save();
      };
    s.querySelector('#pause-resume').onclick = togglePause;
    s.querySelector('#pause-quit').onclick = () => {
      hideAll();
      Run.abort();
    };
    show('pause');
  }

  /* ---------- Fin de run ---------- */
  function showEnd({ victory, kept, pending, validated, total, bonus }) {
    const s = screens.end;
    const r = G.run;
    const st = r.stats;
    /* « Rejouer » relance la même équipe, la même arme et la même compétence sur le même palier, sans passer par le hub */
    const encore = { character: r.char.id, biome: r.biome.id, weapon: r.weapon, skill: r.skill };
    const equipe = r.char.name + (G.pet ? ' + ' + G.pet.name : '');
    s.innerHTML = `<div class="panel center end">
      <div class="eyebrow">${victory ? 'Neuf salles, une sortie' : 'Fin de la partie'}</div>
      <h2 class="${victory ? 'good' : 'bad'}">${victory ? STR.victory : STR.dead}</h2>
      <p class="muted">${esc(victory ? "Le palier suivant t'attend au camp de base." : Content.pick('death'))}</p>
      <div class="grid2">
        <div>Crédits en banque (salle 4)</div><div>◈ ${fmt(validated)}</div>
        <div>${victory ? 'Crédits en attente validés' : `Butin ramené — prime de mort + une part des ${fmt(pending)} crédits en attente`}</div><div>◈ ${fmt(kept)}</div>
        ${bonus ? `<div>Prime de fin de palier</div><div>◈ ${fmt(bonus)}</div>` : ''}
        <div><b>Total</b></div><div><b>◈ ${fmt(total)}</b></div>
        <div>Niveau atteint</div><div>${st.levelReached}</div>
        <div>Ennemis neutralisés</div><div>${st.kills}</div>
        <div>Dégâts subis / coups</div><div>${fmt(Math.min(st.damageTaken, 9999))} / ${st.hitsTaken}</div>
      </div>
      <div class="row"><button class="btn primary big" id="end-again">Rejouer — ${esc(equipe)}, ${esc(r.biome.name)}</button><button class="btn ghost" id="end-hub">${STR.toHub}</button><button class="btn ghost" id="end-report">Copier le rapport</button></div></div>`;
    s.querySelector('#end-report').onclick = () =>
      Rapport.copier().then(ok => toast(ok ? 'Rapport copié — colle-le dans un message à Martin' : 'Rapport affiché'));
    s.querySelector('#end-hub').onclick = () => {
      hideAll();
      Run.toHub();
    };
    s.querySelector('#end-again').onclick = () => {
      hideAll();
      G.paused = false;
      Run.start(encore);
      AudioEngine.uiConfirm({});
    };
    show('end');
    if (G.autoplay) Debug.autoEnd();
  }

  /* ---------- Crédits ---------- */
  function showCredits() {
    const s = screens.credits;
    s.innerHTML = `<div class="panel center credits"><h2>Crédits</h2>
      <p class="small"><b>Sprites</b> : 0x72 — Dungeon Tileset II (CC0). Kenney — Tiny Dungeon, Particle Pack, UI Pack, Pixel Shmup, Game Icons (CC0). Icônes game-icons.net (CC BY 3.0).</p>
      <p class="small"><b>Musique</b> : pistes de l'auteur du jeu (dossier assets/music), repli génératif Web Audio.</p>
      <p class="small"><b>Polices</b> : Silkscreen, VT323, Pixelify Sans (SIL Open Font License).</p>
      <p class="small"><b>Sons</b> : synthèse organique Web Audio (bruit filtré, FM, convolution), module AudioEngine.</p>
      <p class="muted tiny">Détails et liens dans CREDITS.md et ASSETS.md.</p>
      <div class="row"><button class="btn primary" id="credits-back">Retour</button></div></div>`;
    s.querySelector('#credits-back').onclick = () => (G.state === 'run' ? hideAll() : showMenu());
    show('credits');
  }

  /* ---------- Une seule voix (chantier I-6) : bannières, toasts, transitions ----------
     Un seul point d'entrée, notify({ text, sub, color, level, key, secs, x, y }), et quatre niveaux :
       0 vital     — l'écran : flash, secousse (pas de texte, ou un bandeau qui coupe tout)
       1 danger    — dans le monde : un chiffre flottant à (x, y) ; sans position, un bandeau qui interrompt le courant
       2 événement — UN bandeau à la fois au tiers supérieur, 1,4 s, les autres font la queue
       3 info      — un toast en bas à droite, 3 au plus, RETENU tant qu'un ennemi est à moins de 400 px,
                     vidé quand la salle est sécurisée (clearInfo)
     Deux messages de même clé (la clé, sinon le texte) à moins de 3 s n'en font qu'un. banner() et toast() sont des
     enveloppes de compatibilité : elles gardent leur signature, les textes restent dans le code qui les émet. */
  const pendingToasts = [];
  const seenKeys = new Map();
  const NEAR_ENEMY = 400;
  function enemyNear() {
    const pl = G.player;
    if (!pl || G.state !== 'run') return false;
    return G.enemies.some(e => !e.dead && dist(e.x, e.y, pl.x, pl.y) < NEAR_ENEMY);
  }
  function notify(o) {
    const level = o.level == null ? 2 : o.level;
    const key = o.key || o.text;
    const now = performance.now() / 1000;
    if (key) {
      const last = seenKeys.get(key);
      if (last != null && now - last < 3) return false; // déjà dit il y a moins de 3 s
      seenKeys.set(key, now);
      if (seenKeys.size > 200) seenKeys.delete(seenKeys.keys().next().value);
    }
    if (level === 0) {
      flashScreen(0.35, 120);
      Feel.shake(4, undefined, 160);
      if (!o.text) return true;
    }
    if (level === 1 && o.x != null && o.y != null) {
      Floaters.add(o.x, o.y, o.text, o.color || PAL.alert, o.size || 16, 'event');
      return true;
    }
    if (level <= 2) {
      const b = { text: o.text, color: o.color || '#fff', sub: o.sub || '', t: 0, life: o.secs || 1.4, level };
      if (level < 2 && banners.length) banners[0].t = Math.max(banners[0].t, banners[0].life * 0.8); // le courant s'efface tout de suite
      if (level < 2) banners.splice(1, 0, b);
      else banners.push(b);
      if (banners.length > 6) banners.splice(6);
      return true;
    }
    const t = { text: o.text, t: 0, life: o.secs || 3.5 };
    if (enemyNear()) pendingToasts.push(t);
    else toasts.push(t);
    if (toasts.length > 3) toasts.shift();
    if (pendingToasts.length > 6) pendingToasts.shift();
    return true;
  }
  function banner(text, color = '#fff', sub = '') {
    return notify({ text, color, sub, level: 2 });
  }
  function toast(text, secs = 3.5) {
    return notify({ text, secs, level: 3 });
  }
  /* la salle est sécurisée : les infos retenues n'ont plus lieu d'être */
  function clearInfo() {
    pendingToasts.length = 0;
  }
  /* une nouvelle salle : rien de l'ancienne ne reste à dire */
  function clearAll() {
    banners.length = 0;
    toasts.length = 0;
    pendingToasts.length = 0;
    seenKeys.clear();
  }
  /* pour les tests : ce qui est visible et ce qui attend */
  function messages() {
    return { banner: banners[0] || null, queue: banners.slice(1), toasts: toasts.slice(), pending: pendingToasts.slice() };
  }
  /* où un bandeau a le droit de s'afficher : le tiers supérieur, sauf si le joueur y est — alors le tiers inférieur */
  function zoneLibre() {
    const V = Engine.view;
    const T = -V.oy,
      B = -V.oy + V.h;
    const pl = G.player;
    let haut = true;
    if (pl && G.state === 'run') {
      const sy = (pl.y - Camera.y) * Camera.zoom + H / 2; // position du joueur à l'écran
      if (sy < T + V.h * 0.42) haut = false;
    }
    return { haut, y: haut ? T + V.h * 0.1 : B - V.h * 0.22 };
  }
  function transition(cb) {
    fade.dir = 1;
    fade.cb = cb;
  }
  function update(dt) {
    /* un panneau ouvert sur la partie (montée de niveau, coffre, pause) fige les messages */
    const fige = G.state === 'run' && !!G.overlay;
    if (!fige) {
      if (banners.length) {
        banners[0].t += dt; // un seul bandeau vit à la fois, les autres attendent leur tour
        if (banners[0].t > banners[0].life) banners.shift();
      }
      for (let i = toasts.length - 1; i >= 0; i--) {
        toasts[i].t += dt;
        if (toasts[i].t > toasts[i].life) toasts.splice(i, 1);
      }
      while (pendingToasts.length && toasts.length < 3 && !enemyNear()) toasts.push(pendingToasts.shift());
    }
    if (menuActive()) menuUpdate(dt);
    if (fade.dir === 1) {
      fade.t += dt * 4;
      if (fade.t >= 1) {
        fade.t = 1;
        fade.dir = -1;
        if (fade.cb) {
          const cb = fade.cb;
          fade.cb = null;
          cb();
        }
      }
    } else if (fade.dir === -1) {
      fade.t -= dt * 3;
      if (fade.t <= 0) {
        fade.t = 0;
        fade.dir = 0;
      }
    }
  }

  /* ---------- HUD ---------- */
  /* Tout le HUD est ancré sur Engine.view (la vue réelle, plus large ou plus haute que 1280 × 720 selon l'écran),
     jamais sur W et H : sinon, sur un téléphone, la barre de PV flotte à 90 px du bord et l'arme se retrouve au
     milieu du terrain. Sonde de mise en page : quand G.debug.hudProbe est vrai, chaque panneau et chaque texte
     sont notés — interface.js vérifie qu'un texte tient dans un panneau et que tout tient dans la vue. */
  const hudProbe = { rects: [], texts: [], flags: {}, gauges: [], fonts: new Set() };
  /* flash blanc plein écran d'une image (gros coup reçu, phase de boss) : { a, until, life } */
  let flashScreenState = null;
  function flashScreen(a, ms) {
    flashScreenState = { a, until: Time.now + ms / 1000, life: ms / 1000 };
  }
  /* Le vocabulaire de dessin du HUD (chantier I-5) : panel, gauge, label — les cinq renderHud du jeu passent par là,
     c'est ce qui les fait se ressembler. Trois polices, celles du CSS : les chiffres en Silkscreen (kind 'num'), le
     texte en VT323 (par défaut, un cran plus grand parce que la police est étroite), les titres en Pixelify Sans
     (kind 'title'). Plus jamais la police système. */
  const HUD_FONT = FONT_TEXT;
  function hudFont(o) {
    const kind = o.kind || 'text';
    const fam = kind === 'num' ? FONT_PIXEL : kind === 'title' ? FONT_TITLE : FONT_TEXT;
    const size = Math.round((o.size || 12) * (kind === 'text' ? 1.3 : 1));
    if (G.debug.hudProbe) hudProbe.fonts.add(fam.split(',')[0].replace(/"/g, ''));
    return `${o.weight ? o.weight + ' ' : ''}${size}px ${fam}`;
  }
  function textW(ctx, t, o = {}) {
    ctx.font = hudFont(o);
    return ctx.measureText(t).width;
  }
  function panel(ctx, x, y, w, h, r = 8, fill = 'rgba(8,10,18,.75)') {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    if (G.debug.hudProbe) hudProbe.rects.push({ x, y, w, h });
  }
  /* une jauge : fond, remplissage, et des séparations tous les `segments` — une barre segmentée se lit en paliers */
  function gauge(ctx, x, y, w, h, k, col, o = {}) {
    ctx.fillStyle = o.bg || '#12203a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w * clamp(k, 0, 1), h);
    if (o.segments > 1) {
      ctx.fillStyle = o.seg || 'rgba(5,6,10,.6)';
      for (let i = 1; i < o.segments; i++) ctx.fillRect(Math.round(x + (w * i) / o.segments) - 1, y, 2, h);
    }
    if (G.debug.hudProbe) hudProbe.gauges.push({ x, y, w, h, k, segments: o.segments || 1 });
  }
  function label(ctx, t, x, y, o = {}) {
    ctx.font = hudFont(o);
    ctx.fillStyle = o.color || '#e8ecf7';
    ctx.textAlign = o.align || 'left';
    ctx.fillText(t, x, y);
    if (G.debug.hudProbe) {
      const w = ctx.measureText(t).width;
      const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
      hudProbe.texts.push({ t, x: x0, y, w, h: o.size || 12, free: !!o.free });
    }
  }
  /* Le HUD s'estompe : après 4 s sans dégât ni ennemi vivant, les blocs secondaires passent à 45 % et remontent en
     0,15 s dès qu'un ennemi paraît. hudAlpha() est lu par les autres renderHud (compagnon, défi). */
  let hudFade = 1,
    hudFadeT = 0;
  function hudAlpha() {
    return hudFade;
  }
  function updateHudFade() {
    const rm = G.room;
    const now = performance.now() / 1000; // horloge murale : le fondu ne dépend ni de la pause ni des ralentis
    const dt = Math.min(0.1, Math.max(0, now - hudFadeT));
    hudFadeT = now;
    const calme =
      rm && rm.time > 4 && Room.alive() === 0 && rm.time - (rm.lastDamageT || 0) > 4 && rm.time - (rm.lastKillT || 0) > 4 && !rm.boss;
    const cible = calme ? 0.45 : 1;
    if (cible > hudFade) hudFade = Math.min(1, hudFade + dt / 0.15);
    else hudFade = Math.max(cible, hudFade - dt / 0.6);
    return hudFade;
  }
  const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  let skillWasReady = true,
    skillFlashT = -9;
  function renderHud(ctx) {
    const pl = G.player,
      r = G.run,
      rm = G.room;
    if (!pl || !r || !rm || !pl.weapon || !pl.skill) return;
    const V = Engine.view;
    const L = -V.ox,
      T = -V.oy,
      R = -V.ox + V.w,
      B = -V.oy + V.h,
      CX = L + V.w / 2;
    if (G.debug.hudProbe) {
      hudProbe.rects.length = 0;
      hudProbe.texts.length = 0;
      hudProbe.gauges.length = 0;
      hudProbe.fonts.clear();
      hudProbe.flags = {};
    }
    const fade = updateHudFade();
    hudProbe.flags.hudAlpha = +fade.toFixed(2);
    ctx.save();
    ctx.textBaseline = 'middle';
    /* PV bas : le danger se lit en périphérie, sans quitter le personnage des yeux — et la vignette bat avec la musique */
    const hpk = clamp(pl.hp / pl.stats.maxHp, 0, 1);
    const vignette = (a, r, g, b) => {
      const gr = ctx.createRadialGradient(CX, T + V.h / 2, Math.min(V.w, V.h) * 0.35, CX, T + V.h / 2, Math.max(V.w, V.h) * 0.72);
      gr.addColorStop(0, `rgba(${r},${g},${b},0)`);
      gr.addColorStop(1, `rgba(${r},${g},${b},${a.toFixed(3)})`);
      ctx.fillStyle = gr;
      ctx.fillRect(L, T, V.w, V.h);
    };
    if (hpk < 0.3 && pl.hp > 0) {
      const k = 1 - hpk / 0.3;
      vignette(0.08 + 0.2 * k + 0.06 * (1 - Beat.phase()), 255, 59, 59); // PAL.alert
      hudProbe.flags.vignette = true;
    }
    /* coup reçu : vignette corail qui s'efface en 350 ms */
    if (pl.hurtVig > 0) {
      vignette(0.45 * (pl.hurtVig / 0.35), 255, 60, 90);
      hudProbe.flags.hurtVig = +(pl.hurtVig / 0.35).toFixed(2);
    }
    /* flash blanc d'une image */
    if (flashScreenState && Time.now < flashScreenState.until) {
      ctx.globalAlpha = flashScreenState.a * ((flashScreenState.until - Time.now) / flashScreenState.life);
      ctx.fillStyle = '#fff';
      ctx.fillRect(L, T, V.w, V.h);
      ctx.globalAlpha = 1;
      hudProbe.flags.flash = true;
    }
    /* le bloc « moi » (haut gauche) : pastille de niveau, barre de PV segmentée tous les 25 PV avec les chiffres
       dedans, bouclier au-dessus ; l'XP est une bande de 4 px tout en haut de l'écran, pleine largeur */
    const px0 = L + 18,
      py0 = T + 10,
      bw = 220,
      bh = 22,
      bx = px0 + 48,
      by = py0 + 14;
    panel(ctx, px0, py0, bw + 62, 50);
    /* la pastille de niveau : 26 px, ×1,6 → ×1 en 0,35 s à la montée, avec un anneau qui se dilate */
    const lvK = r.levelPopT != null ? clamp((Time.now - r.levelPopT) / 0.35, 0, 1) : 1;
    const lvS = 1 + 0.6 * (1 - Ease.outCubic(lvK));
    const lx = px0 + 24,
      ly = py0 + 25;
    if (lvK < 1) {
      ctx.strokeStyle = PAL.self;
      ctx.globalAlpha = 1 - lvK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lx, ly, 13 + 30 * Ease.outCubic(lvK), 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = PAL.self;
    ctx.beginPath();
    ctx.arc(lx, ly, 13 * lvS, 0, TAU);
    ctx.fill();
    label(ctx, String(r.level), lx, ly + 1, { kind: 'num', size: Math.round(11 * lvS), weight: 'bold', align: 'center', color: '#07080d' });
    hudProbe.flags.levelPop = +lvS.toFixed(2);
    /* vert tant que ça va, doré quand ça baisse, rouge — la couleur d'alerte — seulement sous 30 %, et il pulse */
    const hpCol = hpk > 0.6 ? PAL.life : hpk > 0.3 ? PAL.gold : PAL.alert;
    const hpSeg = Math.max(1, Math.ceil(pl.stats.maxHp / 25));
    ctx.globalAlpha = hpk <= 0.3 ? 0.7 + 0.3 * Math.sin(Time.now * 6) : 1;
    gauge(ctx, bx, by, bw, bh, hpk, hpCol, { bg: '#2b1a24', segments: hpSeg });
    ctx.globalAlpha = 1;
    hudProbe.flags.hpColor = hpCol;
    hudProbe.flags.hpSegments = hpSeg;
    /* sous 25 % : des hachures en plus de la couleur — un état ne se signale jamais par la seule couleur */
    if (hpk <= 0.25 && hpk > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx, by, bw * hpk, bh);
      ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 2;
      for (let x = bx - bh; x < bx + bw * hpk + bh; x += 7) {
        ctx.beginPath();
        ctx.moveTo(x, by + bh);
        ctx.lineTo(x + bh, by);
        ctx.stroke();
      }
      ctx.restore();
      hudProbe.flags.hatch = true;
    }
    if (pl.shield > 0) {
      ctx.fillStyle = 'rgba(140,255,255,.8)';
      ctx.fillRect(bx, by - 5, bw * clamp(pl.shield / pl.stats.maxHp, 0, 1), 3);
    }
    label(ctx, `${Math.ceil(pl.hp)} / ${pl.stats.maxHp}${pl.shield > 0 ? '  +' + Math.ceil(pl.shield) : ''}`, bx + 6, by + bh / 2 + 1, {
      kind: 'num',
      weight: 'bold',
      size: 11,
      color: '#fff',
    });
    /* l'XP : une bande de 4 px tout en haut, sur toute la largeur — on la sent monter sans la regarder */
    gauge(ctx, L, T, V.w, 4, r.xp / r.xpNext, PAL.self, { bg: 'rgba(18,32,58,.7)' });
    hudProbe.flags.xpBar = { y: T, h: 4, w: V.w };
    /* haut-centre : une seule ligne, « Salle 5/9 · 1:24 » — ou la barre du boss au même endroit, là où le joueur regarde */
    const boss = rm.boss;
    if (boss && !boss.dead) {
      const w2 = 480,
        x2 = CX - w2 / 2,
        y2 = T + 8;
      /* entrée en 0,6 s, flash à chaque coup, dégât retardé en rouge sombre qui rattrape en 0,4 s */
      if (boss.barT0 == null) {
        boss.barT0 = Time.now;
        boss.hpLag = boss.hp;
      }
      const entree = Ease.outCubic(clamp((Time.now - boss.barT0) / 0.6, 0, 1));
      boss.hpLag =
        boss.hpLag > boss.hp
          ? Math.max(boss.hp, boss.hpLag - (boss.maxHp / 0.4) * Math.min(0.05, Time.now - (boss.lagT || Time.now)))
          : boss.hp;
      boss.lagT = Time.now;
      panel(ctx, x2 - 8, y2, w2 + 16, 52, 8, 'rgba(8,10,18,.8)');
      label(ctx, boss.name, CX, y2 + 13, { kind: 'title', align: 'center', weight: 'bold', size: 14, color: PAL.danger });
      const hk = clamp(boss.hp / boss.maxHp, 0, 1) * entree,
        lk = clamp(boss.hpLag / boss.maxHp, 0, 1) * entree;
      ctx.fillStyle = '#2b1a24';
      ctx.fillRect(x2, y2 + 26, w2, 16);
      ctx.fillStyle = '#6b1a26';
      ctx.fillRect(x2, y2 + 26, w2 * lk, 16);
      ctx.fillStyle = boss.flash > 0 ? '#fff' : PAL.danger;
      ctx.fillRect(x2, y2 + 26, w2 * hk, 16);
      /* segmentée par phase : les seuils de hpBelow des phases suivantes */
      const seuils = (boss.phases || []).slice(1).map(ph => ph.hpBelow || 0.5);
      ctx.fillStyle = 'rgba(5,6,10,.7)';
      for (const sk of seuils) ctx.fillRect(Math.round(x2 + w2 * sk) - 1, y2 + 26, 2, 16);
      hudProbe.flags.bossSegments = seuils.length + 1;
      if (boss.weakActive)
        label(ctx, 'PRISE EXPOSÉE ×' + boss.weakMul, CX, y2 + 48, {
          align: 'center',
          weight: 'bold',
          size: 10,
          color: '#ffd166',
          free: true,
        });
      hudProbe.flags.bossY = y2;
    } else {
      const t = `${STR.room} ${rm.index}/9 · ${mmss(rm.time)}`;
      const w = textW(ctx, t, { kind: 'num', weight: 'bold', size: 12 }) + 28; // la boîte suit le texte, jamais l'inverse
      panel(ctx, CX - w / 2, T + 8, w, 26);
      label(ctx, t, CX, T + 22, { kind: 'num', align: 'center', weight: 'bold', size: 12 });
    }
    /* arme + compétence (bas gauche) : l'icône de la planche, et un anneau de compétence qui se remplit dans le sens
       horaire, flashe en blanc puis vert quand elle est prête ; le nom n'est écrit que les trois premières salles */
    const sy = B - 40,
      wx = L + 18;
    ctx.globalAlpha = fade;
    panel(ctx, wx, sy - 22, 420, 44);
    const wIcon = Sprites.icon(pl.weapon.id, 28);
    if (wIcon) ctx.drawImage(wIcon, wx + 22 - wIcon.width / 2, sy - wIcon.height / 2);
    else {
      ctx.fillStyle = WEAPON_COLORS[pl.weapon.family] || '#fff';
      ctx.beginPath();
      ctx.arc(wx + 22, sy, 10, 0, TAU);
      ctx.fill();
    }
    label(ctx, pl.weapon.name + (pl.trialWeapon ? ' (essai)' : ''), wx + 42, sy + 1, {
      size: 13,
      color: pl.trialWeapon ? '#ffd166' : '#e8ecf7',
    });
    const cx = wx + 252,
      cd = Skills.cooldownOf(pl);
    const ready = pl.skillCharges > 0;
    if (ready && !skillWasReady) skillFlashT = Time.now;
    skillWasReady = ready;
    const k = ready ? 1 : 1 - clamp(pl.skillCd / Math.max(0.01, cd), 0, 1);
    const flashK = clamp(1 - (Time.now - skillFlashT) / 0.15, 0, 1);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#1a2036';
    ctx.beginPath();
    ctx.arc(cx, sy, 17, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = flashK > 0 ? '#fff' : ready ? PAL.life : '#4fb3ff';
    ctx.beginPath();
    ctx.arc(cx, sy, 17, -Math.PI / 2, -Math.PI / 2 + TAU * k);
    ctx.stroke();
    if (Time.now - skillFlashT < 0.4) {
      const rk = clamp((Time.now - skillFlashT) / 0.4, 0, 1);
      ctx.globalAlpha = fade * (1 - rk);
      ctx.strokeStyle = PAL.life;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, sy, 17 + 16 * Ease.outCubic(rk), 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = fade;
    }
    const sIcon = Sprites.icon(pl.skill.id, 20);
    if (sIcon) ctx.drawImage(sIcon, cx - sIcon.width / 2, sy - sIcon.height / 2);
    hudProbe.flags.skillRing = { r: 17, ready, flash: flashK > 0 };
    if (rm.index <= 3) {
      label(ctx, pl.skill.name + (pl.skillMaxCharges > 1 ? ` ×${pl.skillCharges}` : ''), cx + 24, sy - 8, { size: 12 });
      const aide = Input.touch.active ? 'bouton COMP.' : 'clic droit ou Espace';
      label(ctx, ready ? aide : `${pl.skillCd.toFixed(1)} s`, cx + 24, sy + 9, { size: 11, color: '#9aa4c4' });
    } else {
      label(ctx, ready ? (pl.skillMaxCharges > 1 ? `×${pl.skillCharges}` : STR.ready) : `${pl.skillCd.toFixed(1)} s`, cx + 24, sy + 1, {
        kind: 'num',
        size: 11,
        color: ready ? PAL.life : '#9aa4c4',
      });
    }
    /* les greffes en jeu (bas droite) : une grille d'icônes 24 px par catégorie, ×n en bas à droite, le nom au survol */
    const ups = r.upgrades || [];
    if (ups.length) {
      const cell = 28,
        perRow = 10,
        rows = Math.ceil(ups.length / perRow),
        gw = Math.min(ups.length, perRow) * cell + 12,
        gh = rows * cell + 12;
      const gx = R - 18 - gw,
        gy = B - 18 - gh;
      panel(ctx, gx, gy, gw, gh, 8, 'rgba(8,10,18,.6)');
      const m = Input.mouse;
      let hover = null;
      ups.forEach((u, i) => {
        const x = gx + 6 + (i % perRow) * cell,
          y = gy + 6 + Math.floor(i / perRow) * cell;
        const ic = Sprites.icon(u.def.category, 24);
        if (ic) ctx.drawImage(ic, x + 12 - ic.width / 2, y + 12 - ic.height / 2);
        else {
          ctx.fillStyle = (RARITY[u.def.rarity] || {}).color || '#9aa4c4';
          ctx.fillRect(x + 6, y + 6, 12, 12);
        }
        if (u.stacks > 1) label(ctx, '×' + u.stacks, x + cell - 2, y + cell - 6, { kind: 'num', size: 8, align: 'right', color: PAL.gold });
        if (m && m.x >= x && m.x < x + cell && m.y >= y && m.y < y + cell) hover = { u, x: x + 12, y };
      });
      if (hover)
        label(ctx, hover.u.def.name, hover.x, hover.y - 10, {
          align: 'center',
          size: 12,
          color: (RARITY[hover.u.def.rarity] || {}).color || '#e8ecf7',
          free: true,
        });
      hudProbe.flags.upgGrid = ups.length;
    }
    ctx.globalAlpha = 1;
    /* bannières : le tiers supérieur, au-dessus de la zone de combat, jamais entre le joueur et les ennemis */
    banners.slice(0, 1).forEach(b => {
      const kk = b.t / b.life;
      const y0 = zoneLibre().y; // un seul bandeau, dans la zone libre : jamais entre le joueur et les ennemis
      const a = kk < 0.15 ? kk / 0.15 : kk > 0.75 ? (1 - kk) / 0.25 : 1;
      ctx.globalAlpha = a;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 24;
      label(ctx, b.text, CX, y0 - (1 - a) * 10, { align: 'center', weight: 'bold', size: 30, color: b.color, free: true });
      if (b.sub) label(ctx, b.sub, CX, y0 + 28, { align: 'center', size: 14, free: true });
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }
  /* toasts : en bas à droite, empilés vers le haut — au-dessus des boutons tactiles sur un téléphone */
  function renderToasts(ctx) {
    const V = Engine.view;
    const R = -V.ox + V.w - 24,
      B = -V.oy + V.h;
    ctx.save();
    ctx.textBaseline = 'middle';
    toasts.forEach((t, i) => {
      const a = Math.min(1, t.t * 3, (t.life - t.t) * 2);
      ctx.globalAlpha = clamp(a, 0, 1);
      const w = textW(ctx, t.text, { size: 13 }) + 24; // mesuré avec la police du label, sinon la boîte ment
      const y = B - (Input.touch.active ? 270 : 70) - i * 30; // au-dessus des boutons tactiles (tir, compétence, action)
      panel(ctx, R - w, y - 12, w, 24, 8, 'rgba(8,10,18,.85)');
      ctx.strokeStyle = '#6ee7ff88';
      ctx.stroke();
      label(ctx, t.text, R - 12, y, { align: 'right', size: 13 });
    });
    ctx.restore();
  }
  /* menu et hub battent avec la musique : --beat (retombe après chaque temps) et --down (temps fort de la mesure) pilotent le CSS */
  let beatCss = { b: -1, d: -1 };
  const beatPulses = [];
  function beatPulse() {
    const ph = Beat.phase();
    const k = Math.pow(1 - ph, 2.2);
    const bib = Beat.beatInBar();
    const d = bib === 0 ? k : 0;
    const bq = Math.round(k * 40) / 40,
      dq = Math.round(d * 40) / 40; // quantifié : pas de recalcul de style si rien ne change
    if (bq !== beatCss.b || dq !== beatCss.d) {
      beatCss = { b: bq, d: dq };
      const st = document.documentElement.style;
      st.setProperty('--beat', bq);
      st.setProperty('--down', dq);
    }
    if (Beat.crossedFrame(1) && bib === 0) {
      beatPulses.push({ t0: Time.now });
      if (beatPulses.length > 3) beatPulses.shift();
    }
    return k;
  }
  function renderAttractVeil(ctx) {
    ctx.save();
    const V = Engine.view;
    const x0 = -V.ox,
      y0 = -V.oy,
      vw = V.w,
      vh = V.h;
    const k = beatPulse();
    /* écran-titre : la scène d'attraction passe en ombres chinoises tant que l'attraction arcade ne s'est pas déclenchée */
    if (menuFx.phase === 'splash' && !menuFx.arcade) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#04050b';
      ctx.fillRect(x0, y0, vw, vh);
      ctx.globalAlpha = 1;
    }
    /* ondes depuis le centre sur chaque temps fort, léger flash sur chaque temps */
    ctx.strokeStyle = '#6ee7ff';
    ctx.lineWidth = 2;
    for (const p of beatPulses) {
      const a = (Time.now - p.t0) / 1.6;
      if (a > 1) continue;
      ctx.globalAlpha = 0.18 * (1 - a);
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 40 + a * 900, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.045 * k;
    ctx.fillStyle = '#6ee7ff';
    ctx.fillRect(x0, y0, vw, vh);
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(x0, 0, x0 + vw, 0);
    g.addColorStop(0, 'rgba(4,5,9,.86)');
    g.addColorStop(0.5, 'rgba(4,5,9,.5)');
    g.addColorStop(1, 'rgba(4,5,9,.3)');
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, vw, vh);
    const v = ctx.createLinearGradient(0, y0, 0, y0 + vh);
    v.addColorStop(0, 'rgba(4,5,9,.7)');
    v.addColorStop(0.25, 'rgba(4,5,9,0)');
    v.addColorStop(0.8, 'rgba(4,5,9,0)');
    v.addColorStop(1, 'rgba(4,5,9,.85)');
    ctx.fillStyle = v;
    ctx.fillRect(x0, y0, vw, vh);
    /* menu : le texte est centré, on creuse une flaque sombre derrière lui pour rester lisible sur la scène */
    if (menuActive()) {
      const rg = ctx.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.42, 640);
      rg.addColorStop(0, 'rgba(4,5,9,.7)');
      rg.addColorStop(1, 'rgba(4,5,9,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(x0, y0, vw, vh);
    }
    /* lignes de balayage */
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#6ee7ff';
    for (let y = y0 + ((Time.now * 40) % 6); y < y0 + vh; y += 6) ctx.fillRect(x0, y, vw, 1);
    ctx.restore();
  }
  function renderFade(ctx) {
    if (fade.t > 0) {
      const V = Engine.view;
      ctx.fillStyle = `rgba(4,5,9,${fade.t})`;
      ctx.fillRect(-V.ox, -V.oy, V.w, V.h);
    }
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  /* fond animé pour menu/hub */
  function renderBackdrop(ctx) {
    const V = Engine.view;
    ctx.fillStyle = '#07080d';
    ctx.fillRect(-V.ox, -V.oy, V.w, V.h);
    const kb = beatPulse();
    ctx.save();
    ctx.globalAlpha = 0.04 * kb;
    ctx.fillStyle = '#6ee7ff';
    ctx.fillRect(-V.ox, -V.oy, V.w, V.h);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 14; i++) {
      const t = Time.now * 0.05 + i * 0.37;
      const x = (((i * 137.5) % W) + Math.sin(t) * 40 + W) % W,
        y = (((i * 91.7) % H) + Math.cos(t * 1.3) * 30 + H) % H;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 160);
      g.addColorStop(0, i % 3 ? 'rgba(110,231,255,.10)' : 'rgba(255,154,60,.08)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 160, y - 160, 320, 320);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(110,231,255,.05)';
    ctx.lineWidth = 1;
    for (let x = -V.ox + (V.ox % 48); x < W + V.ox; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, -V.oy);
      ctx.lineTo(x, H + V.oy);
      ctx.stroke();
    }
    for (let y = -V.oy + (V.oy % 48); y < H + V.oy; y += 48) {
      ctx.beginPath();
      ctx.moveTo(-V.ox, y);
      ctx.lineTo(W + V.ox, y);
      ctx.stroke();
    }
  }
  return {
    init,
    show,
    hideAll,
    showTitle,
    showMenu,
    showHub,
    renderAttractVeil,
    renderMenuFx,
    showPrep,
    showChoice,
    hideChoice,
    togglePause,
    showEnd,
    showCredits,
    banner,
    toast,
    transition,
    update,
    renderHud,
    notify,
    clearInfo,
    clearAll,
    messages,
    zoneLibre,
    hudAlpha,
    gauge,
    label,
    panel,
    renderToasts,
    hudProbe,
    flashScreen,
    showShop,
    showFragments,
    renderFade,
    renderBackdrop,
    state,
    esc,
    roundRect,
  };
})();
