'use strict';
/* ==== 39_tempo.js — chef d'orchestre (Beat) + salle du tempo (Tempo) ====
   Beat : temps musical calé sur la piste en cours. assets/music/tempo.json (généré par dev/analyze_music.py) donne
   BPM, décalage du premier temps et tonalité de chaque piste ; sans piste ou fichier absent → métronome interne 120 BPM.
   Tout ce qui « joue en rythme » lit Beat (jamais l'horloge de salle), donc pause, chargement et reprise de position restent calés.
   Tempo : règles de la salle du tempo (type COMBAT_TEMPO, salle 7) : compte à rebours sur une mesure, pièges et ennemis sur les temps,
   vagues qui entrent sur le premier temps d'une mesure, bonus « en rythme » pour le joueur, porte qui s'ouvre sur la mesure. */
const Beat = (() => {
  let meta = null,
    cur = { bpm: 120, offset: 0, key: 'D', mode: 'minor', internal: true };
  /* Décalage son/image (s). Ce que l'oreille entend à un instant donné a été envoyé à la carte son un peu plus
     tôt : sans correction, l'image est en avance sur le son de cette latence. Réglable à l'oreille dans l'atelier,
     0 par défaut (la valeur juste dépend de la machine et du casque). */
  let lag = 0;
  let t = 0,
    prevT = 0,
    lastRead = -1,
    sameFrames = 0,
    anchorT = 0,
    anchorNow = 0;
  async function load() {
    try {
      const r = await fetch(ASSET_BASE + 'music/tempo.json');
      if (r.ok) meta = await r.json();
    } catch (e) {
      meta = null;
    }
  }
  function trackFor(url) {
    if (!meta || !url) return null;
    let name = url.split('/').pop().split('?')[0];
    try {
      name = decodeURIComponent(name);
    } catch (e) {
      /* */
    }
    return meta[name] || null;
  }
  /* position musicale lue sur l'<audio> (moins le décalage du premier temps), ou null si la piste ne joue pas (chargement, pause, génératif) */
  function readMusic() {
    const m = AudioEngine.musicTime ? AudioEngine.musicTime() : null;
    const url = Music.currentUrl;
    const info = m && !m.paused && url ? trackFor(url) : null;
    if (info && m.t > 0) {
      if (m.t === lastRead) sameFrames++;
      else {
        sameFrames = 0;
        lastRead = m.t;
      }
      if (sameFrames < 30) {
        cur = { bpm: info.bpm, offset: info.offset, key: info.key || 'D', mode: info.mode || 'minor', internal: false };
        return m.t - info.offset - lag;
      }
    }
    if (!cur.internal) cur = { bpm: 120, offset: 0, key: cur.key, mode: cur.mode, internal: true };
    return null;
  }
  /* le temps musical avance avec l'horloge de simulation (Time.now : vitesse debug, autoplay accéléré et ralenti compris) et se recale
     sur la piste quand le jeu tourne en temps réel : recalage franc au-delà de 120 ms (démarrage, boucle, reprise), correction douce sinon */
  let keySent = '';
  function update() {
    prevT = t;
    const m = readMusic();
    const simT = anchorT + (Time.now - anchorNow);
    const ks = cur.key + cur.mode;
    if (ks !== keySent && AudioEngine.setKey) {
      keySent = ks;
      AudioEngine.setKey(rootHz(), cur.mode);
    } // les sons accordés suivent la piste
    if (m != null && Time.scale === 1 && !Engine.isHeadless()) {
      const drift = m - simT;
      const rateOff = Music.rate !== 1; // vitesse modifiée (ralenti, tape stop, mort) : on colle à la piste
      if (Math.abs(drift) > 0.12 || rateOff) {
        anchorT = m;
        anchorNow = Time.now;
        t = m;
      } else {
        anchorT += drift * 0.05;
        t = anchorT + (Time.now - anchorNow);
      }
    } else t = simT;
  }
  const beatLen = () => 60 / cur.bpm;
  const index = () => Math.floor(t / beatLen());
  const phase = () => (((t / beatLen()) % 1) + 1) % 1;
  /* vrai si une frontière de subdivision (div par temps) a été franchie pendant le dernier pas */
  function crossedFrame(div = 1) {
    const L = beatLen() / div;
    return t >= prevT && Math.floor(t / L) !== Math.floor(prevT / L);
  }
  const beatInBar = () => ((index() % 4) + 4) % 4;
  /* le battement (chantier F-5) : 1 pile sur le temps, retombe en outCubic — la seule courbe que le monde suit.
     div : subdivision (2 = croche, 4 = double) ; pulseBar : le temps fort seulement, 0 ailleurs. */
  const phaseDiv = (div = 1) => {
    const L = beatLen() / div;
    return (((t / L) % 1) + 1) % 1;
  };
  const pulse = (div = 1) => 1 - Ease.outCubic(phaseDiv(div));
  const pulseBar = () => (beatInBar() === 0 ? pulse() : 0);
  /* distance (s) au temps le plus proche */
  function distToBeat(div = 1) {
    const L = beatLen() / div;
    const p = (((t / L) % 1) + 1) % 1;
    return Math.min(p, 1 - p) * L;
  }
  /* secondes avant le prochain temps fort (au moins 150 ms, sinon la mesure suivante) */
  function timeToNextBar() {
    const L = beatLen();
    const p = (((t / L) % 4) + 4) % 4;
    let s = (4 - p) * L;
    if (s < 0.15) s += 4 * L;
    return s;
  }
  function trackInfo(url) {
    return trackFor(url);
  }
  function rootHz() {
    const semi = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 }[cur.key];
    return 440 * Math.pow(2, (semi == null ? -7 : semi) / 12);
  }
  /* fréquence de la n-ième note de la pentatonique de la piste (mode mineur ou majeur) */
  function noteHz(n) {
    const deg = cur.mode === 'major' ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10];
    const i = Math.max(0, n | 0);
    return rootHz() * Math.pow(2, (deg[i % 5] + 12 * Math.min(2, Math.floor(i / 5))) / 12);
  }
  /* secondes avant le n-ième temps à venir (n = 1 : le prochain) */
  function timeToBeat(n) {
    const L = beatLen();
    const next = Math.floor(t / L) + (n || 1);
    return { at: next * L - t, index: next };
  }
  return {
    load,
    update,
    beatLen,
    index,
    phase,
    crossedFrame,
    beatInBar,
    phaseDiv,
    pulse,
    pulseBar,
    distToBeat,
    timeToNextBar,
    timeToBeat,
    trackInfo,
    rootHz,
    noteHz,
    get info() {
      return cur;
    },
    get t() {
      return t;
    },
    get lag() {
      return lag;
    },
    set lag(v) {
      lag = clamp(v || 0, -0.3, 0.3);
    },
  };
})();

const Tempo = {
  get WINDOW() {
    return BALANCE.tempo.window;
  }, // fenêtre « en rythme » (s) de part et d'autre du temps
  get MIN_STREAK() {
    return BALANCE.tempo.minStreak;
  }, // le bonus commence à cette longueur de série : avant, la série se construit sans rien donner
  COLOR: '#ffd166',
  /* bandeau d'accueil : dit ce qui va se passer, pour ne pas confondre avec une salle de boss */
  intro(room) {
    const tp = room.tempo;
    const first = room.traps.find(t => t.id === tp.groups[0]);
    UI.banner(
      'SALLE DU TEMPO',
      Tempo.COLOR,
      'Tout joue en musique. Tire sur le temps : dégâts bonus. Aucun piège au départ, un de plus à chaque vague — toujours annoncé' +
        (first ? ' (premier : ' + first.name + ')' : '') +
        '.'
    );
  },
  create(room) {
    room.tempo = {
      phase: 'wait',
      count: 0,
      countT: 9,
      started: false,
      div: 1,
      combo: 0,
      best: 0,
      onBeat: 0,
      lastAction: -99,
      lastIdx: -1,
      lastMul: 1,
      pulses: [],
      flashes: [],
      pendingDoor: false,
      goT: 9,
      syncTraps: true,
      bigFlash: 0,
      groups: [],
      groupIdx: -1,
      newTrapT: 9,
      pendingGroup: null,
      cueBeats: 0,
      cueName: '',
      armBar: -99,
      wantGroup: false,
    }; // groupIdx -1 : on commence sans aucun piège
    /* Les pièges arrivent par familles, une de plus à chaque vague : on entre sur un seul type, on finit avec tous.
       Les familles gardent l'ordre de la salle (le premier piège déclaré est celui d'accueil). */
    const seen = [];
    for (const t of room.traps) {
      if (!seen.includes(t.id)) seen.push(t.id);
      t.disabled = true;
    }
    room.tempo.groups = seen;
  },
  /* salle de boss : le boss joue par phrases (voir Boss.rhythmStep), pas de compte à rebours, pièges sur leur horloge habituelle,
     bonus « en rythme » du joueur actif, portée et HUD de phrase */
  createBoss(room) {
    room.tempo = {
      phase: 'go',
      count: 0,
      countT: 9,
      started: true,
      div: 1,
      combo: 0,
      best: 0,
      onBeat: 0,
      lastAction: -99,
      lastIdx: -1,
      lastMul: 1,
      pulses: [],
      flashes: [],
      pendingDoor: false,
      goT: 9,
      syncTraps: false,
      boss: true,
      bigFlash: 0,
    };
  },
  /* appelé chaque pas de simulation (Room.update) */
  update(room, dt) {
    const tp = room.tempo;
    const crossed = Beat.crossedFrame(1);
    const down = crossed && Beat.beatInBar() === 0;
    if (crossed) {
      tp.pulses.push({ t: 0, down: Beat.beatInBar() === 0 });
      if (tp.pulses.length > 6) tp.pulses.shift();
    }
    const bar = crossed && Beat.beatInBar() === 0;
    const kd = Beat.beatInBar() === 0 ? Math.max(0, 1 - Beat.phase() * 2.5) : 0;
    tp.bigFlash = Math.max(0, tp.bigFlash - dt * 2.2);
    Camera.pulse = tp.boss ? 0.02 * tp.bigFlash : tp.started ? 0.012 * kd : 0;
    if (down && tp.started && !tp.boss) {
      for (const o of room.obstacles) {
        if (o.dyn) continue;
        Particles.spawn(o.x + o.w / 2, o.y + 4, {
          count: 5,
          color: Tempo.COLOR,
          glow: true,
          speedMin: 40,
          speedMax: 120,
          life: 0.5,
          size: 2,
        });
      }
    }
    for (let i = tp.pulses.length - 1; i >= 0; i--) {
      tp.pulses[i].t += dt;
      if (tp.pulses[i].t > 1.2) tp.pulses.splice(i, 1);
    }
    for (let i = tp.flashes.length - 1; i >= 0; i--) {
      tp.flashes[i].t += dt;
      if (tp.flashes[i].t > 0.35) tp.flashes.splice(i, 1);
    }
    tp.countT += dt;
    tp.goT += dt;
    tp.newTrapT += dt;
    if (room.state === 'intro') return;
    if (tp.phase === 'wait') {
      if (down) {
        tp.phase = 'count';
        tp.count = 8;
        tp.countT = 0;
        AudioEngine.tempoTick({ intensity: 0.7 });
      }
      return;
    } // attend le début d'une mesure ; 8 temps = deux mesures pour lire la salle
    if (tp.phase === 'count') {
      /* la salle démarre sans aucun piège : le premier est annoncé avec la première vague */
      if (crossed) {
        tp.count--;
        tp.countT = 0;
        if (tp.count <= 0) {
          tp.phase = 'go';
          tp.started = true;
          tp.goT = 0;
          AudioEngine.tempoTick({ intensity: 1 });
        } else AudioEngine.tempoTick({ intensity: 0.7 });
      }
      return;
    }
    /* avertisseur : quatre temps annoncés (bip qui monte), puis la famille de pièges s'arme */
    if (bar) Tempo.tryAnnounce(room);
    if (tp.pendingGroup != null && crossed) {
      tp.cueBeats--;
      if (tp.cueBeats <= 0) {
        const n = tp.pendingGroup;
        tp.pendingGroup = null;
        Tempo.armGroup(room, n);
      } else if (tp.cueBeats <= 4) AudioEngine.tempoCue({ intensity: 0.6, hz: Beat.noteHz(4 - tp.cueBeats) }); // les quatre derniers temps sont sonnés
    }
    if (tp.combo > 0 && Beat.t - tp.lastAction > Beat.beatLen() * 8) tp.combo = 0; // deux mesures sans action en rythme : le combo retombe
    if (tp.pendingDoor && down) {
      tp.pendingDoor = false;
      room.doorOpen = true;
      AudioEngine.roomClear({});
      UI.banner('Salle sécurisée — sortie ouverte', '#7fff9a');
      for (const p of Pickups.list) p.magnet = true;
    }
  },
  /* arme la famille de pièges n (et toutes les précédentes) */
  armGroup(room, n) {
    const tp = room.tempo;
    if (n >= tp.groups.length) return;
    tp.groupIdx = n;
    let name = '';
    for (const t of room.traps) {
      const i = tp.groups.indexOf(t.id);
      if (i <= n) {
        if (t.disabled && i === n) name = t.name;
        t.disabled = false;
      }
    }
    if (name) {
      tp.lastName = name;
      AudioEngine.tempoTick({ intensity: 1 });
      tp.newTrapT = 0;
    } // annoncé dans le HUD, pas en bandeau : il chevauchait celui des vagues
    tp.armBar = Math.floor(Beat.index() / 4);
  },
  /* une vague vient d'entrer : la famille suivante est annoncée, puis armée une mesure plus tard */
  onWave(room) {
    const tp = room.tempo;
    if (tp && tp.started && !tp.boss) tp.wantGroup = true;
  },
  /* Lance l'annonce de la famille suivante, mais jamais moins de 6 mesures après la précédente : même si les vagues
     s'enchaînent vite, les pièges arrivent à un rythme tenable. Deux mesures d'avertissement avant la mise en place. */
  tryAnnounce(room) {
    const tp = room.tempo;
    if (tp.pendingGroup != null || tp.boss || !tp.groups) return; // la salle de boss n'a pas de familles de pièges
    /* Filet : les vagues n'arment qu'une famille chacune, à partir de la deuxième (la salle démarre sans piège,
       c'est voulu). Avec 4 familles pour 3 vagues, les deux dernières ne s'armaient JAMAIS — dans les quatre
       biomes. Passé 10 mesures sans nouveauté, la suivante s'annonce toute seule. */
    if (!tp.wantGroup) {
      if (!tp.started || Math.floor(Beat.index() / 4) - tp.armBar < 10) return;
    }
    const n = tp.groupIdx + 1;
    if (n >= tp.groups.length) {
      tp.wantGroup = false;
      return;
    }
    if (Math.floor(Beat.index() / 4) - tp.armBar < 6) return;
    const first = room.traps.find(t => t.id === tp.groups[n]);
    tp.wantGroup = false;
    tp.pendingGroup = n;
    tp.cueBeats = 8;
    tp.cueName = first ? first.name : '';
    AudioEngine.tempoCue({ intensity: 0.9, hz: Beat.noteHz(0) });
  },
  /* les vagues n'entrent que sur le premier temps d'une mesure, une fois le compte à rebours fini */
  waveGate(room) {
    const tp = room.tempo;
    if (!tp.started) return false;
    if (!(Beat.crossedFrame(1) && Beat.beatInBar() === 0)) return false;
    tp.div = room.wavesStarted ? 2 : 1; // vague 1 : les ennemis frappent sur les noires ; vagues suivantes : sur les croches
    return true;
  },
  /* fin de salle : la porte s'ouvre sur la mesure suivante, bonus d'XP selon le nombre d'actions en rythme */
  onClear(room) {
    const tp = room.tempo;
    room.doorOpen = false;
    tp.pendingDoor = true;
    UI.clearInfo();
    const bonus = Math.round(Math.min(150, tp.onBeat * 4) * G.player.stats.xpGain * G.debug.xpMul);
    if (bonus > 0 && !G.attract) {
      Run.addXp(bonus);
      UI.toast(`En rythme ×${tp.onBeat} (meilleure série ${tp.best}) : +${bonus} XP`);
    }
    UI.banner('Dernier accord', Tempo.COLOR);
  },
  /* action du joueur (tir, compétence) : multiplicateur si elle tombe sur un temps ; un seul bonus par temps */
  playerAction(pl, kind) {
    const r = G.room;
    if (!r || !r.tempo || !r.tempo.started || G.attract) return 1;
    const tp = r.tempo;
    if (Beat.distToBeat(1) > Tempo.WINDOW) {
      /* fausse note : une action hors du temps casse la série. Tenir le bouton ne construit donc jamais de série,
         il faut frapper sur le temps — c'est ce qui en fait un geste, pas un hasard de cadence. */
      if (tp.combo >= Tempo.MIN_STREAK) Floaters.add(pl.x, pl.y - pl.r - 26, 'fausse note', '#9aa4c4', 12);
      tp.combo = 0;
      tp.lastMul = 1;
      return 1;
    }
    const idx = Math.round(Beat.t / Beat.beatLen());
    if (tp.lastIdx === idx) return tp.lastMul;
    tp.lastIdx = idx;
    tp.combo++;
    tp.best = Math.max(tp.best, tp.combo);
    tp.lastAction = Beat.t;
    /* la série se construit d'abord (jauge au HUD), le bonus ne vient qu'à partir de MIN_STREAK : un tir tombé
       par hasard sur le temps ne rapporte rien, quatre d'affilée sont un geste */
    if (tp.combo < Tempo.MIN_STREAK) {
      tp.lastMul = 1;
      AudioEngine.tempoNote({ intensity: 0.35, hz: Beat.noteHz(tp.combo - 1) });
      tp.flashes.push({ t: 0 });
      return 1;
    }
    tp.onBeat++;
    const mul = 1.25 + Math.min(0.25, tp.combo * 0.025);
    tp.lastMul = mul;
    Floaters.add(pl.x, pl.y - pl.r - 26, 'TEMPO ×' + tp.combo, Tempo.COLOR, 15);
    if (tp.combo === 5 || tp.combo === 10 || tp.combo === 20 || tp.combo === 30 || tp.combo === 50) {
      Particles.spawn(pl.x, pl.y, {
        count: 28,
        color: tp.combo >= 20 ? '#fff' : Tempo.COLOR,
        glow: true,
        speedMin: 120,
        speedMax: 320,
        life: 0.7,
        size: 3,
      });
      AudioEngine.tempoTick({ intensity: 1 });
      if (tp.combo >= 10) Music.tapeStop();
    }
    AudioEngine.tempoNote({ intensity: 0.75, hz: Beat.noteHz(tp.combo - 1) });
    tp.flashes.push({ t: 0 });
    return mul;
  },
  /* sol : flash sur chaque temps + ondes qui partent du centre */
  /* PARTITION AU SOL — les tuiles qui vont être frappées s'éclairent AVANT que ça arrive : faiblement un temps à
     l'avance, franchement un demi-temps avant. C'est la couche de lisibilité qui autorise tout le reste : sans elle,
     chaque piège doit crier son propre avertissement et la salle devient un sapin de Noël.
     Recalculée seulement quand on change de demi-temps (8 fois par seconde au plus), jamais par image : sinon ce
     serait 312 tuiles × N pièges × 60 images. */
  score: { key: -1, look: null, near: null },
  scoreAt(room) {
    const sc = Tempo.score,
      L = Beat.beatLen();
    const key = Math.floor(Beat.t / (L / 2));
    if (sc.key === key && sc.look) return sc;
    sc.key = key;
    const n = ROOM_COLS * ROOM_ROWS;
    if (!sc.look) {
      sc.look = new Float32Array(n);
      sc.near = new Float32Array(n);
    }
    sc.look.fill(0);
    sc.near.fill(0);
    /* Les lasers dessinent déjà leur rayon et son annonce : les remettre case par case faisait des carrés cerclés de rouge
       sur tout leur trajet (demande du 10 septembre). La partition ne parle que pour ce qui frappe des cases. */
    const beats = room.traps.filter(t => t.beats && !t.disabled && !/^laser/.test(t.kind));
    if (!beats.length) return sc;
    for (let ty = 0; ty < ROOM_ROWS; ty++)
      for (let tx = 0; tx < ROOM_COLS; tx++) {
        const x = ROOM_X + (tx + 0.5) * TILE,
          y = ROOM_Y + (ty + 0.5) * TILE;
        const i = ty * ROOM_COLS + tx;
        let a = 0,
          b = 0;
        for (const t of beats) {
          a = Math.max(a, t.dangerAt(x, y, Beat.t + L));
          b = Math.max(b, t.dangerAt(x, y, Beat.t + L * 0.5));
        }
        sc.look[i] = a;
        sc.near[i] = b;
      }
    return sc;
  },
  renderScore(ctx, room) {
    if (room.noScore) return; // mode test de l'atelier : la salle sans ses repères d'édition
    if (!room.traps.some(t => t.beats && !t.disabled && !/^laser/.test(t.kind))) return;
    const sc = Tempo.scoreAt(room);
    ctx.save();
    for (let ty = 0; ty < ROOM_ROWS; ty++)
      for (let tx = 0; tx < ROOM_COLS; tx++) {
        const i = ty * ROOM_COLS + tx;
        const far = sc.look[i],
          near = sc.near[i];
        if (far < 0.2 && near < 0.2) continue;
        const x = ROOM_X + tx * TILE,
          y = ROOM_Y + ty * TILE;
        /* Le damier du dancefloor remplit déjà des tuiles entières : un remplissage de plus s'y noierait. La partition
         parle donc en coins (annoncé) et en cadre (imminent) — deux formes que rien d'autre ne dessine. */
        /* Le contrat de couleur (F-3) : une case qui va être frappée parle en rouge d'alerte, jamais en or — l'or est la
           mesure et la récompense. Annoncé : quatre coins gris discrets ; imminent : un cadre d'alerte, sans remplissage. */
        if (far >= 0.2) {
          ctx.globalAlpha = 0.18 + 0.3 * far;
          ctx.fillStyle = PAL.muted;
          const c = 7,
            e = 3;
          for (const [ox, oy] of [
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
          ]) {
            const px = x + (ox ? TILE - c - e : e),
              py = y + (oy ? TILE - c - e : e);
            ctx.fillRect(px, py, c, 2);
            ctx.fillRect(px + (ox ? c - 2 : 0), py, 2, c);
          }
        }
        if (near >= 0.2) {
          /* imminent : un voile d'alerte sur la case, sans cadre — un carré cerclé de rouge, c'est laid et ça crie */
          ctx.globalAlpha = 0.1 + 0.16 * near;
          ctx.fillStyle = PAL.alert;
          ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        }
      }
    ctx.restore();
  },
  renderFloor(ctx, room) {
    const tp = room.tempo;
    const ph = Beat.phase();
    const idx = Beat.index();
    ctx.save();
    ctx.beginPath();
    ctx.rect(ROOM_X, ROOM_Y, ROOM_W, ROOM_H);
    ctx.clip();
    ctx.globalAlpha = 0.06 * Math.max(0, 1 - ph * 2.5);
    ctx.fillStyle = Tempo.COLOR;
    ctx.fillRect(ROOM_X, ROOM_Y, ROOM_W, ROOM_H);
    /* dancefloor : damier qui bascule à chaque temps + anneaux de dalles qui partent du centre (or sur le temps fort, cyan sinon) */
    const cols = ROOM_W / TILE,
      rows = ROOM_H / TILE,
      cx = cols / 2,
      cy = rows / 2;
    for (let ty = 0; ty < rows; ty++)
      for (let tx = 0; tx < cols; tx++) {
        const d = Math.hypot(tx + 0.5 - cx, (ty + 0.5 - cy) * 1.25);
        let a = 0,
          gold = 0;
        for (const p of tp.pulses) {
          const r = p.t * 10;
          const w = Math.abs(d - r);
          if (w < 1.1) {
            const v = (1 - w / 1.1) * (1 - p.t / 1.2) * (p.down ? 0.42 : 0.26);
            if (v > a) {
              a = v;
              gold = p.down ? 1 : 0;
            }
          }
        }
        if (!tp.boss && (tx + ty + idx) % 2 === 0) a = Math.max(a, 0.035);
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = gold ? Tempo.COLOR : '#6ee7ff';
        ctx.fillRect(ROOM_X + tx * TILE + 2, ROOM_Y + ty * TILE + 2, TILE - 4, TILE - 4);
      }
    /* liseré or qui bat sur le pourtour : on reconnaît la salle du tempo au premier coup d'œil, sans la confondre avec une salle de boss */
    ctx.globalAlpha = 0.35 + 0.4 * Math.max(0, 1 - ph * 2);
    ctx.strokeStyle = Tempo.COLOR;
    ctx.lineWidth = 5;
    ctx.strokeRect(ROOM_X + 2.5, ROOM_Y + 2.5, ROOM_W - 5, ROOM_H - 5);
    ctx.restore();
  },
  /* égaliseur le long des murs haut et bas : vrai spectre de la musique (AudioEngine.spectrum), sinon pseudo-spectre calé sur le temps */
  renderEq(ctx, room) {
    const n = ROOM_W / TILE;
    let sp = AudioEngine.spectrum ? AudioEngine.spectrum(n) : null;
    const k = Math.max(0, 1 - Beat.phase() * 2.5);
    if (!sp || sp.every(v => v === 0)) {
      sp = new Float32Array(n);
      for (let i = 0; i < n; i++) sp[i] = k * (0.25 + 0.75 * Math.abs(Math.sin(i * 1.7 + Beat.index())));
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(ROOM_X, ROOM_Y, ROOM_W, ROOM_H);
    ctx.clip();
    for (let i = 0; i < n; i++) {
      const h = 6 + sp[i] * 44;
      const x = ROOM_X + i * TILE + 6;
      const gold = i % 4 === 0;
      ctx.globalAlpha = 0.16 + 0.34 * sp[i];
      ctx.fillStyle = gold ? Tempo.COLOR : '#6ee7ff';
      ctx.fillRect(x, ROOM_Y, TILE - 12, h);
      ctx.fillRect(x, ROOM_Y + ROOM_H - h, TILE - 12, h);
    }
    ctx.restore();
  },
  /* au-dessus des entités : anneau du joueur, éclats « en rythme », compte à rebours */
  renderOverlay(ctx, room) {
    const tp = room.tempo;
    const pl = G.player;
    const ph = Beat.phase();
    Tempo.renderEq(ctx, room);
    ctx.save();
    if (pl && !pl.dead) {
      ctx.strokeStyle = Tempo.COLOR;
      ctx.shadowColor = Tempo.COLOR;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.25 + 0.55 * Math.max(0, 1 - ph * 2);
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, pl.r + 8 + (1 - ph) * 8, 0, TAU);
      ctx.stroke();
      for (const f of tp.flashes) {
        const k = f.t / 0.35;
        ctx.globalAlpha = 0.8 * (1 - k);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.arc(pl.x, pl.y, pl.r + 10 + k * 50, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;
    /* boss : anneau de phrase (blanc = petites attaques, orange = annonce, rouge = grosse attaque, vert = il souffle) + jauge d'annonce */
    const b = room.boss;
    if (tp.boss && b && !b.dead && b.phrasePos) {
      const pp = b.phrasePos();
      if (pp) {
        const seg = pp.p < pp.smallEnd ? 0 : pp.p < pp.bigBeat ? 1 : b.cur ? 2 : 3;
        const col = ['#e8ecf7', '#ffb347', PAL.alert, '#7fff9a'][seg];
        ctx.strokeStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 12;
        ctx.lineWidth = seg === 1 ? 4 : 2.5;
        ctx.globalAlpha = 0.35 + 0.55 * Math.max(0, 1 - ph * 2);
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 14 + (1 - ph) * 6, 0, TAU);
        ctx.stroke();
        if (seg === 1) {
          const k = (pp.p - pp.smallEnd) / (pp.bigBeat - pp.smallEnd);
          ctx.globalAlpha = 0.9;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r + 24, -Math.PI / 2, -Math.PI / 2 + TAU * k);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }
    }
    if (tp.phase === 'count' || tp.goT < 0.5) {
      const txt = tp.phase === 'count' ? (tp.count > 4 ? '' : String(tp.count)) : 'GO'; // la 1re mesure sert à souffler : on ne compte qu'à partir de 4
      const k = tp.phase === 'count' ? clamp(tp.countT / Beat.beatLen(), 0, 1) : clamp(tp.goT / 0.5, 0, 1);
      ctx.globalAlpha = 1 - k * 0.8;
      ctx.fillStyle = Tempo.COLOR;
      ctx.shadowColor = Tempo.COLOR;
      ctx.shadowBlur = 24;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.round(150 - k * 40)}px ${FONT_PIXEL}`;
      ctx.fillText(txt, ROOM_X + ROOM_W / 2, ROOM_Y + ROOM_H / 2);
      ctx.strokeStyle = Tempo.COLOR;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.7 * (1 - k);
      ctx.beginPath();
      ctx.arc(ROOM_X + ROOM_W / 2, ROOM_Y + ROOM_H / 2, 90 + (1 - k) * 260, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  },
  /* jauge de série : MIN_STREAK pastilles qui se remplissent une à une, avant que « TEMPO ×n » ne prenne la place */
  renderStreak(ctx, cx, y, tp) {
    const n = Tempo.MIN_STREAK,
      sp = 14;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const x = cx - ((n - 1) * sp) / 2 + i * sp;
      const on = i < tp.combo;
      ctx.globalAlpha = on ? 0.95 : 0.3;
      ctx.strokeStyle = Tempo.COLOR;
      ctx.fillStyle = Tempo.COLOR;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, TAU);
      if (on) ctx.fill();
      else ctx.stroke();
    }
    ctx.restore();
  },
  /* HUD (coordonnées écran) : barre de mesure en haut au centre + combo */
  renderHud(ctx, room) {
    const tp = room.tempo;
    const ph = Beat.phase();
    const bib = Beat.beatInBar();
    ctx.save();
    if (tp.started && (tp.boss ? tp.bigFlash > 0 : bib === 0)) {
      const kd = tp.boss ? tp.bigFlash : Math.max(0, 1 - ph * 2.5);
      const V = Engine.view;
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(V.w, V.h) * 0.3, W / 2, H / 2, Math.max(V.w, V.h) * 0.75);
      g.addColorStop(0, 'rgba(255,209,102,0)');
      g.addColorStop(1, tp.boss ? `rgba(255,59,92,${0.22 * kd})` : `rgba(255,209,102,${0.16 * kd})`);
      ctx.fillStyle = g;
      ctx.fillRect(-V.ox, -V.oy, V.w, V.h);
    }
    const b = room.boss;
    const pp = tp.boss && b && !b.dead && b.phrasePos ? b.phrasePos() : null;
    if (pp) {
      /* partition de la phrase : un point par temps, groupés par mesure ; blanc = petites attaques, orange = annonce, rouge = grosse attaque, vert = il souffle */
      const n = pp.n,
        spd = n > 8 ? 14 : 22,
        gap = 10;
      const w = n * spd + (n / 4 - 1) * gap;
      const V = Engine.view;
      const x0 = -V.ox + V.w / 2 - w / 2,
        yb = -V.oy + 70;
      ctx.fillStyle = 'rgba(8,10,18,.7)';
      ctx.fillRect(x0 - 12, yb - 14, w + 24, 28);
      for (let i = 0; i < n; i++) {
        const x = x0 + i * spd + Math.floor(i / 4) * gap + spd / 2;
        const col = i < pp.smallEnd ? '#e8ecf7' : i < pp.bigBeat ? '#ffb347' : i === pp.bigBeat ? PAL.alert : '#7fff9a';
        const cur = Math.floor(pp.p) === i;
        ctx.globalAlpha = cur ? 1 : 0.4;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, yb, cur ? 5 + (1 - ph) * 3 : i === pp.bigBeat ? 5 : 3.5, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x0 + pp.p * spd + Math.floor(pp.p / 4) * gap - 1, yb - 11, 2, 22);
      ctx.restore();
      return;
    }
    /* le métronome : quatre disques de 12 px, le temps fort plus gros, sans boîte opaque — c'est le cœur du jeu,
       pas un détail. Le compteur de série, lui, est près du joueur (renderPlayer) et non ici. */
    const V = Engine.view;
    const cx = -V.ox + V.w / 2,
      y = -V.oy + 66,
      sp = 34; // sous le cartouche « Salle 7/9 » du HUD
    for (let i = 0; i < 4; i++) {
      const x = cx - 1.5 * sp + i * sp;
      const on = i === bib && tp.phase !== 'wait';
      const rr = (i === 0 ? 7 : 6) + (on ? (1 - ph) * 4 : 0);
      ctx.globalAlpha = on ? 1 : 0.4;
      ctx.fillStyle = i === 0 ? Tempo.COLOR : '#e8ecf7';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = on ? 14 : 0;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - 1.5 * sp + (bib + ph) * sp - 1, y - 12, 2, 24);
    /* pièges : avertissement puis mise en place, sous la barre de mesure (jamais en bandeau, pour ne pas couvrir « Vague N ») */
    const ty = y + 26;
    if (tp.pendingGroup != null) {
      const kk = Math.max(0, 1 - ph * 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(8,10,18,.75)';
      ctx.fillRect(cx - 150, ty - 11, 300, 22);
      ctx.fillStyle = '#ff9a3c';
      ctx.globalAlpha = 0.6 + 0.4 * kk;
      ctx.font = `bold 14px ${FONT_TITLE}`;
      ctx.fillText('⚠ ' + (tp.cueName || 'Nouveau piège') + ' dans ' + tp.cueBeats, cx, ty);
      ctx.globalAlpha = 1;
    } else if (tp.newTrapT < 3 && tp.lastName) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = Math.max(0, 1 - tp.newTrapT / 3);
      ctx.fillStyle = 'rgba(8,10,18,.7)';
      ctx.fillRect(cx - 150, ty - 11, 300, 22);
      ctx.fillStyle = Tempo.COLOR;
      ctx.font = `bold 14px ${FONT_TITLE}`;
      ctx.fillText('Piège en place : ' + tp.lastName, cx, ty);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  },
  /* près du joueur, en coordonnées du monde (appelé par Room.render) : la série qui se construit, quatre pastilles
     sous ses pieds ; dès quatre notes, c'est le chiffre flottant « TEMPO ×n » qui prend le relais */
  /* L'anneau de mesure (chantier F-5) : sous les pieds du joueur, dans toutes les salles. Un arc doré se remplit sur les
     quatre temps de la mesure et claque au temps fort (26 → 40 px en 0,3 temps). Sur une image figée, c'est ce qui dit
     que WAY est un jeu de musique. */
  renderRing(ctx, x, y) {
    const bib = Beat.beatInBar(),
      ph = Beat.phase();
    const prog = (bib + ph) / 4;
    const snap = bib === 0 && ph < 0.3 ? 1 - Ease.outCubic(ph / 0.3) : 0;
    const r = 26 + 14 * snap;
    ctx.save();
    ctx.strokeStyle = PAL.gold;
    ctx.globalAlpha = 0.22 + 0.4 * snap;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.4, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.4, 0, -Math.PI / 2, -Math.PI / 2 + prog * TAU);
    ctx.stroke();
    ctx.restore();
  },
  renderPlayer(ctx, room) {
    const tp = room.tempo;
    const pl = G.player;
    if (!tp || !tp.started || !pl || tp.combo <= 0 || tp.combo >= Tempo.MIN_STREAK) return;
    Tempo.renderStreak(ctx, pl.x, pl.y + Sprites.SOL + 10, tp);
  },
};
