/* =========================================================================
   SALLE ZÉRO — 00_core.js
   Constantes, utilitaires, PRNG seedable, Input, Time, Engine (boucle à pas fixe).
   ========================================================================= */
'use strict';

const W = 1280,
  H = 720; // résolution logique
const TILE = 48; // tuile en px (sprites 16 px rendus ×3)
const ROOM_COLS = 24,
  ROOM_ROWS = 13;
const ROOM_X = (W - ROOM_COLS * TILE) / 2; // 64
const ROOM_Y = (H - ROOM_ROWS * TILE) / 2; // 48
const ROOM_W = ROOM_COLS * TILE,
  ROOM_H = ROOM_ROWS * TILE;
const FIXED_DT = 1 / 60;

const RARITY = {
  common: { label: 'Commun', color: '#cfd6e6', glow: 'rgba(207,214,230,.35)', weight: 60 },
  rare: { label: 'Rare', color: '#4fb3ff', glow: 'rgba(79,179,255,.45)', weight: 27 },
  epic: { label: 'Épique', color: '#b46bff', glow: 'rgba(180,107,255,.5)', weight: 10 },
  colossal: { label: 'Colossal', color: '#ffb347', glow: 'rgba(255,179,71,.6)', weight: 3 },
};
const RARITY_ORDER = ['common', 'rare', 'epic', 'colossal'];

const ROOM_TYPES = {
  PREP_COMBAT: { label: 'Préparation + Combat', phase: 1 },
  TRAP: { label: 'Pièges', phase: 1 },
  COMBAT_CHALLENGE: { label: 'Salle aléatoire', phase: 1 },
  COMBAT_TEMPO: { label: 'Salle du tempo', phase: 2 },
  COMBAT_TRAP: { label: 'Combat + Pièges', phase: 1 },
  CHEST: { label: 'Coffre', phase: 1 },
  MINIBOSS: { label: 'Mini-boss', phase: 1 },
  COMBAT_MODULAR: { label: 'Combat + Modulaire', phase: 2 },
  COMBAT_TRAP_MODULAR: { label: 'Combat + Pièges + Modulaire', phase: 2 },
  CHEST_FINAL: { label: 'Coffre final', phase: 2 },
  BOSS_REVENGE: { label: 'Revanche', phase: 2 },
  /* chantier 9 : une salle unique par biome (les coffres ne sont plus des salles : ils sont offerts en fin de 3 et 7) */
  SOUS_SOL: { label: 'Le sous-sol', phase: 1 },
  TRAIN: { label: 'Le train', phase: 1 },
  PONT: { label: 'Le pont', phase: 2 },
  BAZAR: { label: 'Le bazar', phase: 2 },
};

/* ---------- Utilitaires ---------- */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const TAU = Math.PI * 2;
const wrapAngle = a => {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
};
const tileX = tx => ROOM_X + (tx + 0.5) * TILE; // centre de la tuile en px
const tileY = ty => ROOM_Y + (ty + 0.5) * TILE;
const deepClone = o => JSON.parse(JSON.stringify(o));
const fmt = n => Math.round(n).toLocaleString('fr-FR');
const pct = n => `${n >= 0 ? '+' : ''}${Math.round(n * 100)} %`;

/* Cercle vs AABB */
function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw),
    ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx,
    dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}
/* Segment (ax,ay)-(bx,by) vs cercle */
function segCircle(ax, ay, bx, by, cx, cy, r) {
  const dx = bx - ax,
    dy = by - ay,
    l2 = dx * dx + dy * dy;
  let t = l2 ? ((cx - ax) * dx + (cy - ay) * dy) / l2 : 0;
  t = clamp(t, 0, 1);
  const px = ax + dx * t,
    py = ay + dy * t;
  return (px - cx) ** 2 + (py - cy) ** 2 < r * r;
}

/* ---------- PRNG seedable (mulberry32) ---------- */
function makeRng(seed) {
  let s = seed >>> 0 || 0x9e3779b9;
  const rng = () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.range = (a, b) => a + rng() * (b - a);
  rng.int = (a, b) => Math.floor(rng.range(a, b + 1));
  rng.pick = arr => arr[Math.floor(rng() * arr.length)];
  rng.chance = p => rng() < p;
  rng.shuffle = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  rng.reseed = v => {
    s = v >>> 0 || 1;
  };
  return rng;
}
const RNG = makeRng(Date.now() & 0xffffffff); // RNG de gameplay (reseedé par __autoplay)
const VFX_RNG = makeRng(1234); // RNG cosmétique, jamais reseedé

/* ---------- Chaînes UI (français, centralisées) ---------- */
const STR = {
  room: 'Salle',
  level: 'Niveau',
  xp: 'XP',
  hp: 'PV',
  coins: 'Crédits',
  quality: 'Qualité',
  chooseWeapon: 'Choisis ton arme',
  chooseSkill: 'Choisis une compétence',
  enter: 'Entrer',
  levelUp: 'Montée de niveau',
  pick: 'Choisir',
  chest: 'Coffre',
  continue: 'Continuer',
  paused: 'Pause',
  resume: 'Reprendre',
  quit: 'Abandonner la partie',
  dead: 'Vaincu',
  toHub: 'Retour au camp',
  victory: 'Palier terminé',
  pending: 'en attente',
  wave: 'Vague',
  boss: 'Mini-boss',
  ready: 'Prêt',
  interact: 'E : interagir',
};

/* ---------- Rapport : ce qu'un ami peut envoyer quand ça casse ----------
   Toute erreur JavaScript non rattrapée est notée dans le navigateur (les 20 dernières), avec la salle en cours.
   « Copier le rapport » (pause, fin de partie) met dans le presse-papiers un texte lisible : version, navigateur,
   profil, partie en cours, journal. Sans ça, un ami qui plante ne peut rien dire d'autre que « ça a planté ». */
const Rapport = (() => {
  const CLE = 'way_journal';
  const MAX = 20;
  let dernierToast = -1e9;
  function lire() {
    try {
      return JSON.parse(localStorage.getItem(CLE) || '[]');
    } catch (e) {
      return [];
    }
  }
  function noter(msg, ou) {
    const j = lire();
    const G_ = typeof G !== 'undefined' ? G : null;
    j.push({
      t: new Date().toISOString(),
      msg: String(msg || 'erreur').slice(0, 300),
      ou: String(ou || '').slice(0, 200),
      salle: G_ && G_.room ? G_.room.index : null,
      etat: G_ ? G_.state : null,
    });
    while (j.length > MAX) j.shift();
    try {
      localStorage.setItem(CLE, JSON.stringify(j));
    } catch (e) {
      /* stockage indisponible : le journal reste en mémoire pour ce rapport-ci */
    }
    if (Date.now() - dernierToast > 10000) {
      dernierToast = Date.now();
      try {
        if (typeof UI !== 'undefined' && UI.toast)
          UI.toast("Le jeu a rencontré une erreur. Pause → « Copier le rapport » pour l'envoyer.", 7);
      } catch (e) {
        /* l'interface n'est pas encore là */
      }
    }
  }
  window.addEventListener('error', e => noter(e.message, (e.filename || '').split('/').pop() + ':' + e.lineno));
  window.addEventListener('unhandledrejection', e => noter((e.reason && e.reason.message) || e.reason, 'promesse'));
  function texte() {
    const G_ = typeof G !== 'undefined' ? G : null;
    const p = typeof Meta !== 'undefined' && Meta.profile ? Meta.profile : {};
    const r = G_ && G_.run;
    const l = [
      'WAY — rapport',
      'version : ' + (window.WAY_BUILD || 'inconnue'),
      'navigateur : ' + navigator.userAgent,
      'écran : ' +
        window.innerWidth +
        '×' +
        window.innerHeight +
        (typeof Input !== 'undefined' && Input.touch && Input.touch.active ? ' tactile' : ''),
      'mode : ' + (G_ ? G_.mode : '?') + ' · état : ' + (G_ ? G_.state : '?'),
      `profil : ${p.runs || 0} parties, ${p.wins || 0} gagnées, ${p.deaths || 0} morts, ${p.coins || 0} crédits, personnage ${p.character || '—'}, compagnon ${p.pet || '—'} (${p.petMode || '—'})`,
      r
        ? `partie : ${r.biome ? r.biome.id : '?'} salle ${G_.room ? G_.room.index : '?'}, niveau ${r.level}, ${r.weapon || '?'} + ${r.skill || '?'}`
        : 'partie : aucune',
      typeof Perf !== 'undefined' ? Perf.line() : '',
      '',
      'journal (' + lire().length + ') :',
    ];
    for (const e of lire()) l.push(`  ${e.t}  salle ${e.salle == null ? '—' : e.salle}  ${e.msg}  @ ${e.ou}`);
    return l.join('\n');
  }
  async function copier() {
    const t = texte();
    try {
      await navigator.clipboard.writeText(t);
      return true;
    } catch (e) {
      /* pas de presse-papiers (http, vieux navigateur) : on montre le texte, à copier à la main */
      try {
        window.prompt('Copie ce rapport :', t);
      } catch (e2) {
        /* rien à faire */
      }
      return false;
    }
  }
  function vider() {
    try {
      localStorage.removeItem(CLE);
    } catch (e) {
      /* rien */
    }
  }
  return { noter, lire, texte, copier, vider };
})();

/* ---------- Le vocabulaire de l'animation (chantier F-1) ----------
   Cinq mots, employés partout avec les mêmes valeurs : pop (outBack, 120 ms, 1 → 1,25 → 1), squash & stretch
   (à l'impact sx +30 % / sy −22 % en 110 ms), flash (60 ms plein puis 70 ms à 35 %), hitstop (coup 30 ms,
   critique 70, mort 60, phase de boss 180), trail (5 fantômes). Les courbes sont ici, pas dans une bibliothèque :
   un tween externe ignorerait le pas fixe du moteur et le ralenti. */
const Ease = {
  outCubic: t => 1 - Math.pow(1 - t, 3),
  outQuad: t => 1 - (1 - t) * (1 - t),
  inQuad: t => t * t,
  outBack: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2), // dépasse à 1,10 : le « pop »
  outElastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * 2.094) + 1),
};
/* Polices du monde : Silkscreen pour les chiffres, les noms et les compteurs ; VT323 pour les phrases. Les deux sont
   déjà chargées par le CSS ; boot() attend document.fonts.ready avant le premier rendu. Le HUD garde sa police
   jusqu'au chantier I-5 (HUD_FONT dans 50_ui.js). */
/* Le contrat de couleur (chantier F-3, CONTENT.md §46) : une couleur, une intention, sans exception.
   self = toi et ce qui est à toi · gold = le temps, la mesure, la récompense · danger = ce qui vient de l'extérieur
   (dégâts subis, pièges, zones, vignette) · alert = LA couleur des télégraphies, jamais employée ailleurs · life = la
   vie qui revient (soins, cœurs, porte ouverte) · enemyBar = la vie des ennemis, ni rouge ni cyan · les animaux dans
   la seule famille chaude et douce du jeu. Un effet prend sa couleur ici, jamais en dur. */
const PAL = {
  self: '#6ee7ff',
  gold: '#ffd166',
  danger: '#ff5e7a',
  alert: '#ff3b3b',
  life: '#7fff9a',
  text: '#e8ecf7',
  muted: '#9aa4c4',
  ink: '#0b0d14',
  enemyBar: '#cfd6e6',
  pets: { pet_uno: '#e08a4a', pet_choupi: '#f0c46a', pet_tanuki: '#a8784a', pet_ori: '#c9a3ff' },
};
const FONT_PIXEL = '"Silkscreen", "Segoe UI", system-ui, sans-serif';
const FONT_TEXT = '"VT323", "Segoe UI", monospace';
const FONT_TITLE = '"Pixelify Sans", "Segoe UI", sans-serif'; // les titres du HUD (nom du boss, bandeaux)
/* chantier F-4 : les traces qui restent et l'ouverture du coffre */
const DECAL_MAX = 60;
/* ---------- Halo : les lueurs pré-dessinées ----------
   `ctx.shadowBlur` coûte un flou gaussien à chaque forme, et le prix explose sous une transparence ou une rotation :
   trois ennemis qui meurent, c'est cent particules floutées par image. Ici, la lueur d'un disque est dessinée une fois
   par (couleur, rayon, flou) dans un petit canvas, puis collée d'un `drawImage` : le même halo, pour presque rien. */
const Halo = (() => {
  const cache = new Map();
  const MAX = 200; // au-delà, le plus vieux part (les rayons continus sont arrondis, on n'y arrive pas en pratique)
  function disc(color, r, blur) {
    const key = color + '|' + r + '|' + blur;
    let c = cache.get(key);
    if (c) return c;
    const pad = blur * 2 + 2,
      size = (r + pad) * 2;
    c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    /* la forme est dessinée hors du canvas, seule son ombre tombe dedans : on ne garde que la lueur */
    g.shadowColor = color;
    g.shadowBlur = blur;
    g.shadowOffsetX = size * 2;
    g.fillStyle = color;
    g.beginPath();
    g.arc(size / 2 - size * 2, size / 2, r, 0, TAU);
    g.fill();
    if (cache.size >= MAX) cache.delete(cache.keys().next().value);
    cache.set(key, c);
    return c;
  }
  /* colle la lueur d'un disque de rayon r (arrondi au demi-pixel) ; la forme nette se dessine ensuite par-dessus */
  function draw(ctx, x, y, r, color, blur = 10) {
    const c = disc(color, Math.max(1, Math.round(r * 2) / 2), Math.round(blur));
    ctx.drawImage(c, x - c.width / 2, y - c.height / 2);
  }
  /* un anneau qui luit : un trait large et pâle sous le trait net, à la place d'un flou de 24 px par onde ;
     ry (optionnel) en fait une ellipse à plat sur le sol */
  function ring(ctx, x, y, rx, ry, color, width, blur, alpha = 1) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * 0.28;
    ctx.lineWidth = width + blur;
    ctx.beginPath();
    if (ry != null) ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    else ctx.arc(x, y, rx, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  /* un trait qui luit (laser, rail, bord de zone) : même recette que l'anneau. Le tiret en cours ne s'applique qu'au
     trait net, la lueur reste continue */
  function glow(ctx, color, width, blur, alpha, path) {
    const dash = ctx.getLineDash();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha * 0.28;
    ctx.lineWidth = width + blur;
    ctx.setLineDash([]);
    path();
    ctx.stroke();
    ctx.setLineDash(dash);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    path();
    ctx.stroke();
  }
  function line(ctx, ax, ay, bx, by, color, width, blur, alpha = 1) {
    glow(ctx, color, width, blur, alpha, () => {
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    });
  }
  function rect(ctx, x, y, w, h, color, width, blur, alpha = 1) {
    glow(ctx, color, width, blur, alpha, () => {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
    });
  }
  return { draw, ring, line, rect, disc, cache };
})();

/* ---- Perf : la mesure des images par seconde et le rendu économe (chantier 10) ----
   Le jeu ne sait pas ce qu'il coûte sur un téléphone sans le mesurer sur place : ce module compte les images par
   seconde (et le pire des dix dernières secondes), le temps passé à dessiner, et le nombre de flous (shadowBlur)
   posés par image — chaque flou coûte une passe de plus par forme. Le rendu économe coupe ces flous à la source
   (le réglage du contexte est intercepté), plafonne la densité de pixels à 1 et retire les flous d'arrière-plan
   des écrans (body.eco). Il s'allume tout seul au tactile quand le jeu tient moins de 45 images par seconde
   pendant 3 secondes, ou à la demande depuis la pause (profil : perfMode 'auto' | 'eco' | 'full'). */
const Perf = (() => {
  const SEUIL = 45; // images par seconde en dessous desquelles le rendu économe s'allume (au tactile, en 'auto')
  const TENIR = 3; // secondes consécutives sous le seuil
  const P = {
    fps: 0, // images par seconde sur la dernière seconde
    min: 0, // le pire des dix dernières secondes
    renderMs: 0, // temps moyen passé dans render() par image (commandes ; la rastérisation vient après)
    blurs: 0, // flous posés par la dernière image
    eco: false, // rendu économe actif
    why: '', // 'auto' (le jeu ralentissait) ou 'choix' (la pause)
    mode: 'auto',
    show: false, // compteur affiché en haut de l'écran
    low: 0,
    seuil: SEUIL,
  };
  const seconds = [];
  let frames = 0,
    t = 0,
    renderAcc = 0,
    blursFrame = 0,
    hooked = null;
  /* intercepte shadowBlur sur ce contexte : compté, et ramené à 0 en mode économe */
  function hook(ctx) {
    if (!ctx || hooked === ctx) return;
    const proto = Object.getPrototypeOf(ctx);
    const d = Object.getOwnPropertyDescriptor(proto, 'shadowBlur');
    if (!d || !d.set) return;
    hooked = ctx;
    Object.defineProperty(ctx, 'shadowBlur', {
      configurable: true,
      get() {
        return d.get.call(this);
      },
      set(v) {
        if (v > 0) {
          blursFrame++;
          if (P.eco) v = 0;
        }
        d.set.call(this, v);
      },
    });
  }
  function setEco(on, why) {
    if (P.eco === on) return;
    P.eco = on;
    P.why = on ? why : '';
    P.low = 0;
    try {
      document.body.classList.toggle('eco', on);
    } catch (e) {
      /* pas de document */
    }
    if (typeof Engine !== 'undefined' && Engine.canvas) Engine.resize();
    if (on && why === 'auto') {
      try {
        UI.toast('Le jeu ralentissait : rendu économe activé (réglable dans la pause).', 5);
      } catch (e) {
        /* l'interface n'est pas encore là */
      }
    }
  }
  function setMode(m) {
    P.mode = m === 'eco' || m === 'full' ? m : 'auto';
    if (P.mode === 'eco') setEco(true, 'choix');
    else setEco(false);
  }
  const touch = () => typeof Input !== 'undefined' && Input.touch && Input.touch.active;
  function frame(dt, renderMs) {
    frames++;
    t += dt;
    renderAcc += renderMs;
    P.blurs = blursFrame;
    blursFrame = 0;
    if (t < 1) return;
    P.fps = Math.round(frames / t);
    P.renderMs = renderAcc / frames;
    seconds.push(P.fps);
    while (seconds.length > 10) seconds.shift();
    P.min = Math.min(...seconds);
    frames = 0;
    t = 0;
    renderAcc = 0;
    /* automatique : seulement en jeu, au tactile, hors pause — un onglet caché ou un menu ne comptent pas */
    const enJeu = typeof G !== 'undefined' && G.state === 'run' && !G.paused && !document.hidden;
    if (P.mode === 'auto' && !P.eco && enJeu && touch()) {
      P.low = P.fps < P.seuil ? P.low + 1 : 0;
      if (P.low >= TENIR) setEco(true, 'auto');
    } else P.low = 0;
  }
  function reset() {
    seconds.length = 0;
    P.min = 0;
    P.low = 0;
  }
  /* une ligne à coller dans un message : ce que le téléphone a mesuré */
  function line() {
    const G_ = typeof G !== 'undefined' ? G : null;
    const dpr = Math.round((window.devicePixelRatio || 1) * 10) / 10;
    const ou = G_ && G_.room ? `salle ${G_.room.index}` : 'hors partie';
    return (
      `WAY perf · ${P.fps} i/s · min ${P.min} sur 10 s · rendu ${P.renderMs.toFixed(1)} ms · ${P.blurs} flous · ` +
      `${P.eco ? 'économe (' + P.why + ')' : 'complet'} · ${ou} · ${window.innerWidth}×${window.innerHeight} ×${dpr}` +
      `${touch() ? ' tactile' : ''} · ${(navigator.userAgent.match(/\(([^)]*)\)/) || [0, ''])[1].slice(0, 60)}`
    );
  }
  /* le compteur : en bas au centre, entre le stick et les boutons au tactile, sous le HUD au clavier ; en rouge quand
     la dernière seconde est passée sous le seuil */
  function render(ctx) {
    if (!P.show) return;
    const V = Engine.view;
    const txt = `${P.fps} i/s · min ${P.min} · ${P.renderMs.toFixed(1)} ms · ${P.blurs} flous${P.eco ? ' · éco' : ''}`;
    ctx.save();
    ctx.font = `12px ${FONT_PIXEL}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 16,
      x = W / 2,
      y = H + V.oy - 12;
    ctx.fillStyle = 'rgba(4,5,9,.7)';
    ctx.fillRect(x - w / 2, y - 9, w, 18);
    ctx.fillStyle = P.fps && P.fps < P.seuil ? '#ff6b6b' : '#7fff9a';
    ctx.fillText(txt, x, y + 1);
    ctx.restore();
  }
  return {
    hook,
    frame,
    render,
    setEco,
    setMode,
    reset,
    line,
    get fps() {
      return P.fps;
    },
    get min() {
      return P.min;
    },
    get renderMs() {
      return P.renderMs;
    },
    get blurs() {
      return P.blurs;
    },
    get eco() {
      return P.eco;
    },
    get why() {
      return P.why;
    },
    get mode() {
      return P.mode;
    },
    get show() {
      return P.show;
    },
    set show(v) {
      P.show = !!v;
    },
    get seuil() {
      return P.seuil;
    },
    set seuil(v) {
      P.seuil = v;
    },
    get low() {
      return P.low;
    },
  };
})();

const CHEST_OPEN_MS = 300;
const Feel = {
  lastStop: -9,
  /* arrêt sur image : la simulation se fige (Time.slow = 0,02) le temps demandé. Jamais par-dessus un ralenti de
     compétence, et au plus un petit arrêt par 250 ms — une arme rapide ne doit pas figer le jeu en continu. */
  stop(ms, force) {
    if (Time.now < Time.slowUntil && Time.slow > 0.05) return false; // un ralenti (compétence, coup reçu) est en cours
    if (!force && ms < 100 && Time.now - Feel.lastStop < 0.25) return false;
    Feel.lastStop = Time.now;
    Time.slow = 0.02;
    Time.slowUntil = Math.max(Time.slowUntil, Time.now + ms / 1000);
    return true;
  },
  /* ralenti : ne raccourcit jamais un ralenti plus fort déjà en cours */
  slow(scale, ms) {
    if (Time.now < Time.slowUntil && Time.slow < scale) return false;
    Time.slow = scale;
    Time.slowUntil = Time.now + ms / 1000;
    return true;
  },
  /* secousse : trois amplitudes et pas d'autres — 1,6 (tir, coup), 4 (critique, mort, coup reçu), 9 (explosion, boss) */
  shake(mag, angle, ms = 160) {
    Camera.kick(mag, angle == null ? VFX_RNG.range(0, TAU) : angle, ms);
  },
  pop(e, amount = 0.25, ms = 120) {
    e.popA = amount;
    e.popT = 0;
    e.popD = ms / 1000;
  },
  squash(e, angle, ms = 110) {
    e.sqA = angle;
    e.sqT = 0;
    e.sqD = ms / 1000;
  },
  /* facteur d'un pop ou d'un écrasement en cours (0 quand il n'y en a pas) */
  popK(e) {
    return e.popD && e.popT < e.popD ? e.popA * (1 - Ease.outBack(Math.min(1, e.popT / e.popD))) : 0;
  },
  squashK(e) {
    return e.sqD && e.sqT < e.sqD ? 1 - Ease.outCubic(e.sqT / e.sqD) : 0;
  },
  tick(e, dt) {
    if (e.popD && e.popT < e.popD) e.popT += dt;
    if (e.sqD && e.sqT < e.sqD) e.sqT += dt;
  },
};

/* ---------- Caméra (zoom + suivi du joueur ; le HUD n'est pas affecté) ---------- */
const Camera = {
  x: W / 2,
  y: H / 2,
  zoom: 1,
  pulse: 0, // pulse : impulsion de zoom (salle du tempo, montée de niveau…), amortie dans update, remise à 0 à chaque salle
  k: null, // la secousse en cours : { ax, ay, mag, t, life }
  /* Une secousse a une direction et une fraction de degré de rotation — sans rotation, ça lit comme un bug
     d'affichage ; sans direction, un coup reçu par la gauche secoue comme une explosion. Décroissance en courbe. */
  kick(mag, angle, ms) {
    const k = this.k;
    if (k && k.t < k.life && k.mag * (1 - Ease.outCubic(k.t / k.life)) > mag) return; // une plus forte est en cours
    this.k = { ax: Math.cos(angle), ay: Math.sin(angle), mag, t: 0, life: ms / 1000 };
  },
  update(dt) {
    if (this.k && this.k.t < this.k.life) this.k.t += dt;
    this.pulse += (0 - this.pulse) * Math.min(1, 6 * dt);
    this.zoomFx += (this.zoomFxTarget - this.zoomFx) * Math.min(1, this.zoomFxSpeed * dt);
    if (Math.abs(this.pulse) < 0.0005) this.pulse = 0;
  },
  /* appliquée AVANT le zoom, en coordonnées d'écran : 12 px de secousse sont 12 px, pas 18 en tactile */
  shake(ctx) {
    const k = this.k;
    if (!k || k.t >= k.life) return 0;
    const d = 1 - Ease.outCubic(k.t / k.life);
    const osc = Math.sin(k.t * 70) * d * k.mag;
    ctx.translate(W / 2, H / 2);
    ctx.rotate(osc * 0.0012);
    ctx.translate(-W / 2, -H / 2);
    ctx.translate(k.ax * osc, k.ay * osc);
    return osc;
  },
  snap(x, y) {
    this.x = x;
    this.y = y;
    this.clamp();
  },
  follow(x, y, dt) {
    const k = Math.min(1, 6 * dt);
    this.x = lerp(this.x, x, k);
    this.y = lerp(this.y, y, k);
    this.clamp();
  },
  /* les scènes (F-6) : un point à regarder à la place du joueur, et un zoom de scène qui se multiplie au zoom courant.
     focus = { x, y, until } (horloge murale) ; zoomFx tend vers zoomFxTarget à la vitesse zoomFxSpeed. */
  focus: null,
  zoomFx: 1,
  zoomFxTarget: 1,
  zoomFxSpeed: 3,
  lookAt(x, y, ms) {
    this.focus = { x, y, until: performance.now() + ms };
  },
  target(pl) {
    if (this.focus && performance.now() < this.focus.until) return this.focus;
    this.focus = null;
    return pl;
  },
  zoomTo(z, speed = 3) {
    this.zoomFxTarget = z;
    this.zoomFxSpeed = speed;
  },
  clamp() {
    const v = Engine.view;
    const hw = v.w / (2 * this.zoom),
      hh = v.h / (2 * this.zoom);
    this.x = hw >= W / 2 ? W / 2 : clamp(this.x, hw, W - hw);
    this.y = hh >= H / 2 ? H / 2 : clamp(this.y, hh, H - hh);
  },
  apply(ctx) {
    const z = this.zoom * (1 + (this.pulse || 0)) * (this.zoomFx || 1);
    ctx.translate(W / 2, H / 2);
    ctx.scale(z, z);
    ctx.translate(-this.x, -this.y);
  },
  toWorld(sx, sy) {
    return { x: this.x + (sx - W / 2) / this.zoom, y: this.y + (sy - H / 2) / this.zoom };
  },
  setZoom(z) {
    this.zoom = clamp(z || 1, 1, 2.5);
    this.clamp();
  },
};
/* ---------- Plein écran ---------- */
const Fullscreen = {
  get active() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  },
  supported() {
    const d = document.documentElement;
    return !!(d.requestFullscreen || d.webkitRequestFullscreen);
  },
  enter() {
    const d = document.documentElement;
    const p = d.requestFullscreen
      ? d.requestFullscreen({ navigationUI: 'hide' })
      : d.webkitRequestFullscreen
        ? d.webkitRequestFullscreen()
        : null;
    if (p && p.then)
      p.then(() => {
        try {
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
        } catch (e) {
          /* */
        }
      }).catch(() => {});
  },
  exit() {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  },
  toggle() {
    this.active ? this.exit() : this.enter();
  },
};

/* ---------- Time ---------- */
const Time = { scale: 1, slow: 1, slowUntil: 0, now: 0, frame: 0 };

/* ---------- Input ---------- */
const Input = (() => {
  const keys = new Set(),
    pressed = new Set();
  const mouse = { x: W / 2, y: H / 2, down: false, right: false, moved: 0 };
  const touch = { active: false, move: { x: 0, y: 0 }, fire: false, skill: false, interact: false, autoFire: false };
  let canvas = null,
    scale = 1,
    offX = 0,
    offY = 0;
  const KEYMAP = {
    up: ['KeyW', 'KeyZ', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'KeyQ', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    skill: ['Space', 'ShiftLeft', 'ShiftRight'],
    interact: ['KeyE', 'KeyF', 'Enter'],
    pause: ['Escape', 'KeyP'],
    debug: ['F1'],
    fire: ['KeyJ', 'KeyK'],
    mouse2: ['Mouse2'],
    pet: ['KeyC'],
  };
  function attach(c, onFirstInteraction) {
    canvas = c;
    let first = false;
    const firstInt = () => {
      if (!first) {
        first = true;
        onFirstInteraction && onFirstInteraction();
      }
    };
    const typing = e => {
      const t = e.target;
      return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    };
    window.addEventListener('keydown', e => {
      firstInt();
      if (typing(e)) return; // champ de saisie (atelier rythme) : le clavier lui appartient
      if (e.code === 'F1' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!keys.has(e.code)) pressed.add(e.code);
      keys.add(e.code);
    });
    window.addEventListener('keyup', e => keys.delete(e.code));
    window.addEventListener('blur', () => {
      keys.clear();
      mouse.down = false;
      mouse.right = false;
    });
    const toLogical = e => {
      const r = canvas.getBoundingClientRect();
      mouse.x = clamp((e.clientX - r.left) / scale - offX, -offX, W + offX);
      mouse.y = clamp((e.clientY - r.top) / scale - offY, -offY, H + offY);
      mouse.moved = Time.now;
    };
    canvas.addEventListener('mousemove', e => {
      if (!touch.active) toLogical(e);
    });
    canvas.addEventListener('mousedown', e => {
      firstInt();
      if (touch.active) return;
      toLogical(e);
      if (e.button === 0) mouse.down = true;
      if (e.button === 2) {
        mouse.right = true;
        pressed.add('Mouse2');
      }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) mouse.down = false;
      if (e.button === 2) mouse.right = false;
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }
  function setScale(s, ox, oy) {
    scale = s;
    offX = ox;
    offY = oy;
  }
  const isDown = action => KEYMAP[action].some(k => keys.has(k));
  const wasPressed = action => KEYMAP[action].some(k => pressed.has(k));
  function axis() {
    let x = (isDown('right') ? 1 : 0) - (isDown('left') ? 1 : 0);
    let y = (isDown('down') ? 1 : 0) - (isDown('up') ? 1 : 0);
    if (x && y) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x, y };
  }
  /* Gamepad : abstraction prévue, non branchée en phase 1. */
  function endFrame() {
    pressed.clear();
  }
  function press(code) {
    pressed.add(code);
  }
  return { attach, setScale, isDown, wasPressed, axis, mouse, touch, press, endFrame, keys };
})();

/* ---------- Engine : canvas, boucle à pas fixe ---------- */
const Engine = (() => {
  let canvas,
    ctx,
    acc = 0,
    last = 0,
    running = false,
    rafId = 0;
  let updateFn = () => {},
    renderFn = () => {};
  const stats = { fps: 0, frames: 0, fpsT: 0, steps: 0 };
  let maxStepsPerFrame = 8;
  let headless = false; // rendu désactivé (autoplay)

  function init(c) {
    canvas = c;
    ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    resize();
    window.addEventListener('resize', resize);
  }
  /* Le canvas couvre toute la fenêtre. La salle (1280×720 logiques) reste entièrement visible et centrée ;
     la fenêtre plus large ou plus haute montre du décor autour (vue logique étendue : view.w × view.h, décalage view.ox/oy). */
  const view = { w: W, h: H, ox: 0, oy: 0, scale: 1 };
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, Perf.eco ? 1 : 2); // économe : un pixel physique par pixel CSS
    const ww = window.innerWidth,
      wh = window.innerHeight;
    const s = Math.min(ww / W, wh / H);
    view.scale = s;
    view.w = ww / s;
    view.h = wh / s;
    view.ox = (view.w - W) / 2;
    view.oy = (view.h - H) / 2;
    canvas.style.width = ww + 'px';
    canvas.style.height = wh + 'px';
    canvas.style.left = '0px';
    canvas.style.top = '0px';
    canvas.width = Math.floor(ww * dpr);
    canvas.height = Math.floor(wh * dpr);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, view.ox * dpr * s, view.oy * dpr * s);
    ctx.imageSmoothingEnabled = false;
    Input.setScale(s, view.ox, view.oy);
    document.documentElement.style.setProperty('--ui-scale', s.toFixed(3));
    for (const id of ['ui', 'touch']) {
      const el = document.getElementById(id);
      if (el) {
        el.style.width = ww + 'px';
        el.style.height = wh + 'px';
        el.style.left = '0px';
        el.style.top = '0px';
      }
    }
  }
  function loop(t) {
    rafId = requestAnimationFrame(loop);
    if (!last) last = t;
    let frameDt = Math.min((t - last) / 1000, 0.25);
    last = t;
    stats.frames++;
    stats.fpsT += frameDt;
    if (stats.fpsT >= 0.5) {
      stats.fps = Math.round(stats.frames / stats.fpsT);
      stats.frames = 0;
      stats.fpsT = 0;
    }
    acc += frameDt * Time.scale;
    let steps = 0;
    while (acc >= FIXED_DT && steps < maxStepsPerFrame) {
      const slow = Time.now < Time.slowUntil ? Time.slow : 1;
      updateFn(FIXED_DT * slow, FIXED_DT);
      Time.now += FIXED_DT;
      Time.frame++;
      acc -= FIXED_DT;
      steps++;
    }
    if (steps === maxStepsPerFrame) acc = 0;
    stats.steps = steps;
    const t0 = performance.now();
    if (!headless) renderFn(ctx, acc / FIXED_DT);
    Perf.frame(frameDt, performance.now() - t0);
    if (steps > 0 || G.paused) Input.endFrame(); // ne pas perdre un appui entre deux pas (écrans 120/144 Hz)
  }
  function start(u, r) {
    updateFn = u;
    renderFn = r;
    if (!running) {
      running = true;
      last = 0;
      rafId = requestAnimationFrame(loop);
    }
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }
  function setHeadless(h) {
    headless = h;
    maxStepsPerFrame = h ? 400 : 8;
  }
  function isHeadless() {
    return headless;
  }
  return {
    init,
    start,
    stop,
    resize,
    stats,
    view,
    get ctx() {
      return ctx;
    },
    get canvas() {
      return canvas;
    },
    setHeadless,
    isHeadless,
  };
})();
