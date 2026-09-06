/* ==== 39_tempo.js — chef d'orchestre (Beat) + salle du tempo (Tempo) ====
   Beat : temps musical calé sur la piste en cours. assets/music/tempo.json (généré par dev/analyze_music.py) donne
   BPM, décalage du premier temps et tonalité de chaque piste ; sans piste ou fichier absent → métronome interne 120 BPM.
   Tout ce qui « joue en rythme » lit Beat (jamais l'horloge de salle), donc pause, chargement et reprise de position restent calés.
   Tempo : règles de la salle du tempo (type COMBAT_TEMPO, salle 7) : compte à rebours sur une mesure, pièges et ennemis sur les temps,
   vagues qui entrent sur le premier temps d'une mesure, bonus « en rythme » pour le joueur, porte qui s'ouvre sur la mesure. */
const Beat = (() => {
  let meta = null, cur = { bpm: 120, offset: 0, key: 'D', mode: 'minor', internal: true };
  let t = 0, prevT = 0, lastRead = -1, sameFrames = 0, anchorT = 0, anchorNow = 0;
  async function load() { try { const r = await fetch(ASSET_BASE + 'music/tempo.json'); if (r.ok) meta = await r.json(); } catch (e) { meta = null; } }
  function trackFor(url) { if (!meta || !url) return null; let name = url.split('/').pop().split('?')[0]; try { name = decodeURIComponent(name); } catch (e) { /* */ } return meta[name] || null; }
  /* position musicale lue sur l'<audio> (moins le décalage du premier temps), ou null si la piste ne joue pas (chargement, pause, génératif) */
  function readMusic() {
    const m = AudioEngine.musicTime ? AudioEngine.musicTime() : null; const url = Music.currentUrl; const info = m && !m.paused && url ? trackFor(url) : null;
    if (info && m.t > 0) {
      if (m.t === lastRead) sameFrames++; else { sameFrames = 0; lastRead = m.t; }
      if (sameFrames < 30) { cur = { bpm: info.bpm, offset: info.offset, key: info.key || 'D', mode: info.mode || 'minor', internal: false }; return m.t - info.offset; }
    }
    if (!cur.internal) cur = { bpm: 120, offset: 0, key: cur.key, mode: cur.mode, internal: true };
    return null;
  }
  /* le temps musical avance avec l'horloge de simulation (Time.now : vitesse debug, autoplay accéléré et ralenti compris) et se recale
     sur la piste quand le jeu tourne en temps réel : recalage franc au-delà de 120 ms (démarrage, boucle, reprise), correction douce sinon */
  function update() {
    prevT = t; const m = readMusic(); const simT = anchorT + (Time.now - anchorNow);
    if (m != null && Time.scale === 1 && !Engine.isHeadless()) {
      const drift = m - simT;
      if (Math.abs(drift) > 0.12) { anchorT = m; anchorNow = Time.now; t = m; }
      else { anchorT += drift * 0.05; t = anchorT + (Time.now - anchorNow); }
    } else t = simT;
  }
  const beatLen = () => 60 / cur.bpm;
  const index = () => Math.floor(t / beatLen());
  const phase = () => ((t / beatLen()) % 1 + 1) % 1;
  /* vrai si une frontière de subdivision (div par temps) a été franchie pendant le dernier pas */
  function crossedFrame(div = 1) { const L = beatLen() / div; return t >= prevT && Math.floor(t / L) !== Math.floor(prevT / L); }
  const beatInBar = () => ((index() % 4) + 4) % 4;
  /* distance (s) au temps le plus proche */
  function distToBeat(div = 1) { const L = beatLen() / div; const p = ((t / L) % 1 + 1) % 1; return Math.min(p, 1 - p) * L; }
  function rootHz() { const semi = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 }[cur.key]; return 440 * Math.pow(2, (semi == null ? -7 : semi) / 12); }
  /* fréquence de la n-ième note de la pentatonique de la piste (mode mineur ou majeur) */
  function noteHz(n) { const deg = cur.mode === 'major' ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10]; const i = Math.max(0, n | 0); return rootHz() * Math.pow(2, (deg[i % 5] + 12 * Math.min(2, Math.floor(i / 5))) / 12); }
  return { load, update, beatLen, index, phase, crossedFrame, beatInBar, distToBeat, rootHz, noteHz, get info() { return cur; }, get t() { return t; } };
})();

const Tempo = {
  WINDOW: 0.1,   // fenêtre « en rythme » (s) de part et d'autre du temps
  COLOR: '#ffd166',
  create(room) {
    room.tempo = { phase: 'wait', count: 0, countT: 9, started: false, div: 1, combo: 0, best: 0, onBeat: 0, lastAction: -99, lastIdx: -1, lastMul: 1, pulses: [], flashes: [], pendingDoor: false, goT: 9 };
    for (const t of room.traps) t.disabled = true;   // les pièges attendent la fin du compte à rebours
  },
  /* appelé chaque pas de simulation (Room.update) */
  update(room, dt) {
    const tp = room.tempo; const crossed = Beat.crossedFrame(1); const down = crossed && Beat.beatInBar() === 0;
    if (crossed) { tp.pulses.push({ t: 0 }); if (tp.pulses.length > 6) tp.pulses.shift(); }
    for (let i = tp.pulses.length - 1; i >= 0; i--) { tp.pulses[i].t += dt; if (tp.pulses[i].t > 1.2) tp.pulses.splice(i, 1); }
    for (let i = tp.flashes.length - 1; i >= 0; i--) { tp.flashes[i].t += dt; if (tp.flashes[i].t > 0.35) tp.flashes.splice(i, 1); }
    tp.countT += dt; tp.goT += dt;
    if (room.state === 'intro') return;
    if (tp.phase === 'wait') { if (down) { tp.phase = 'count'; tp.count = 4; tp.countT = 0; AudioEngine.tempoTick({ intensity: 0.7 }); } return; }   // attend le début d'une mesure
    if (tp.phase === 'count') {
      if (crossed) { tp.count--; tp.countT = 0; if (tp.count <= 0) { tp.phase = 'go'; tp.started = true; tp.goT = 0; for (const t of room.traps) t.disabled = false; AudioEngine.tempoTick({ intensity: 1 }); } else AudioEngine.tempoTick({ intensity: 0.7 }); }
      return;
    }
    if (tp.combo > 0 && Beat.t - tp.lastAction > Beat.beatLen() * 8) tp.combo = 0;   // deux mesures sans action en rythme : le combo retombe
    if (tp.pendingDoor && down) { tp.pendingDoor = false; room.doorOpen = true; AudioEngine.roomClear({}); UI.banner('Salle sécurisée — sortie ouverte', '#7fff9a'); for (const p of Pickups.list) p.magnet = true; }
  },
  /* les vagues n'entrent que sur le premier temps d'une mesure, une fois le compte à rebours fini */
  waveGate(room) {
    const tp = room.tempo; if (!tp.started) return false;
    if (!(Beat.crossedFrame(1) && Beat.beatInBar() === 0)) return false;
    tp.div = room.wavesStarted ? 2 : 1;   // vague 1 : les ennemis frappent sur les noires ; vagues suivantes : sur les croches
    return true;
  },
  /* fin de salle : la porte s'ouvre sur la mesure suivante, bonus d'XP selon le nombre d'actions en rythme */
  onClear(room) {
    const tp = room.tempo; room.doorOpen = false; tp.pendingDoor = true;
    const bonus = Math.round(Math.min(150, tp.onBeat * 4) * G.player.stats.xpGain * G.debug.xpMul);
    if (bonus > 0 && !G.attract) { Run.addXp(bonus); UI.toast(`En rythme ×${tp.onBeat} (meilleure série ${tp.best}) : +${bonus} XP`); }
    UI.banner('Dernier accord', Tempo.COLOR);
  },
  /* action du joueur (tir, compétence) : multiplicateur si elle tombe sur un temps ; un seul bonus par temps */
  playerAction(pl, kind) {
    const r = G.room; if (!r || !r.tempo || !r.tempo.started || G.attract) return 1;
    const tp = r.tempo; if (Beat.distToBeat(1) > Tempo.WINDOW) return 1;
    const idx = Math.round(Beat.t / Beat.beatLen()); if (tp.lastIdx === idx) return tp.lastMul;
    tp.lastIdx = idx; tp.combo++; tp.best = Math.max(tp.best, tp.combo); tp.onBeat++; tp.lastAction = Beat.t;
    const mul = 1.25 + Math.min(0.25, tp.combo * 0.025); tp.lastMul = mul;
    Floaters.add(pl.x, pl.y - pl.r - 26, 'TEMPO ×' + tp.combo, Tempo.COLOR, 15);
    AudioEngine.tempoNote({ intensity: 0.75, hz: Beat.noteHz(tp.combo - 1) });
    tp.flashes.push({ t: 0 });
    return mul;
  },
  /* sol : flash sur chaque temps + ondes qui partent du centre */
  renderFloor(ctx, room) {
    const tp = room.tempo; const ph = Beat.phase(); ctx.save();
    ctx.beginPath(); ctx.rect(ROOM_X, ROOM_Y, ROOM_W, ROOM_H); ctx.clip();
    ctx.globalAlpha = 0.07 * Math.max(0, 1 - ph * 2.5); ctx.fillStyle = Tempo.COLOR; ctx.fillRect(ROOM_X, ROOM_Y, ROOM_W, ROOM_H);
    ctx.strokeStyle = Tempo.COLOR; ctx.lineWidth = 3;
    for (const p of tp.pulses) { const k = p.t / 1.2; ctx.globalAlpha = 0.22 * (1 - k); ctx.beginPath(); ctx.arc(ROOM_X + ROOM_W / 2, ROOM_Y + ROOM_H / 2, 20 + k * 720, 0, TAU); ctx.stroke(); }
    ctx.restore();
  },
  /* au-dessus des entités : anneau du joueur, éclats « en rythme », compte à rebours */
  renderOverlay(ctx, room) {
    const tp = room.tempo; const pl = G.player; const ph = Beat.phase(); ctx.save();
    if (pl && !pl.dead) {
      ctx.strokeStyle = Tempo.COLOR; ctx.shadowColor = Tempo.COLOR; ctx.shadowBlur = 10; ctx.lineWidth = 2; ctx.globalAlpha = 0.25 + 0.55 * Math.max(0, 1 - ph * 2);
      ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r + 8 + (1 - ph) * 8, 0, TAU); ctx.stroke();
      for (const f of tp.flashes) { const k = f.t / 0.35; ctx.globalAlpha = 0.8 * (1 - k); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r + 10 + k * 50, 0, TAU); ctx.stroke(); }
    }
    ctx.shadowBlur = 0;
    if (tp.phase === 'count' || tp.goT < 0.5) {
      const txt = tp.phase === 'count' ? String(tp.count) : 'GO'; const k = tp.phase === 'count' ? clamp(tp.countT / Beat.beatLen(), 0, 1) : clamp(tp.goT / 0.5, 0, 1);
      ctx.globalAlpha = 1 - k * 0.8; ctx.fillStyle = Tempo.COLOR; ctx.shadowColor = Tempo.COLOR; ctx.shadowBlur = 24; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.round(150 - k * 40)}px "Segoe UI", system-ui, sans-serif`; ctx.fillText(txt, ROOM_X + ROOM_W / 2, ROOM_Y + ROOM_H / 2);
    }
    ctx.restore();
  },
  /* HUD (coordonnées écran) : barre de mesure en haut au centre + combo */
  renderHud(ctx, room) {
    const tp = room.tempo; const ph = Beat.phase(); const bib = Beat.beatInBar(); ctx.save();
    const cx = W / 2, y = 66, sp = 30;   // sous le cartouche « Salle 7/9 » du HUD
    ctx.fillStyle = 'rgba(8,10,18,.7)'; ctx.fillRect(cx - 88, y - 14, 176, tp.combo > 0 ? 46 : 28);
    for (let i = 0; i < 4; i++) {
      const x = cx - 1.5 * sp + i * sp; const on = i === bib && tp.phase !== 'wait';
      ctx.globalAlpha = on ? 1 : 0.35; ctx.fillStyle = i === 0 ? Tempo.COLOR : '#e8ecf7'; ctx.beginPath(); ctx.arc(x, y, on ? 6 + (1 - ph) * 4 : 4, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff'; ctx.fillRect(cx - 1.5 * sp + (bib + ph) * sp - 1, y - 11, 2, 22);
    if (tp.combo > 0) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = Tempo.COLOR; ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif'; ctx.fillText(`TEMPO ×${tp.combo}`, cx, y + 22); }
    if (Beat.info.internal) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#9aa4c4'; ctx.font = '10px "Segoe UI", system-ui, sans-serif'; ctx.globalAlpha = 0.8; ctx.fillText('métronome interne', cx, y + (tp.combo > 0 ? 38 : 24)); }
    ctx.restore();
  },
};
