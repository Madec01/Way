/* =========================================================================
   SUJET NEUF — 55_touch.js
   Mode tactile : joystick virtuel à gauche (déplacement ; la visée est automatique sur l'ennemi le plus proche,
   sinon la direction du joystick), boutons à droite (TIR maintenu, COMPÉTENCE, INTERAGIR), pause en haut à droite.
   Activé automatiquement au premier contact tactile.
   ========================================================================= */

const Touch = (() => {
  let layer, stick, knob, stickId = null, origin = { x: 0, y: 0 }, built = false;
  const R = 70;   // rayon du joystick en px logiques
  const isTouchDevice = () => ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;

  function build() {
    if (built) return; built = true;
    layer = document.getElementById('touch');
    layer.innerHTML = `
      <div class="tzone" id="t-zone"></div>
      <div class="tstick" id="t-stick" hidden><div class="tknob" id="t-knob"></div></div>
      <button class="tbtn fire" id="t-fire">TIR</button>
      <button class="tbtn skill" id="t-skill">COMP.</button>
      <button class="tbtn act" id="t-act">E</button>
      <button class="tbtn pause" id="t-pause">II</button>`;
    stick = document.getElementById('t-stick'); knob = document.getElementById('t-knob');
    const zone = document.getElementById('t-zone');
    const T = Input.touch;
    const toLogical = e => { const r = layer.getBoundingClientRect(); const s = r.width / W; return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s }; };
    zone.addEventListener('pointerdown', e => {
      if (stickId != null) return; e.preventDefault(); zone.setPointerCapture(e.pointerId); stickId = e.pointerId;
      origin = toLogical(e); stick.hidden = false; stick.style.left = origin.x + 'px'; stick.style.top = origin.y + 'px'; knob.style.transform = 'translate(-50%,-50%)'; T.move.x = 0; T.move.y = 0;
    });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== stickId) return; e.preventDefault(); const p = toLogical(e); let dx = p.x - origin.x, dy = p.y - origin.y; const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      const dead = 10; const k = d < dead ? 0 : Math.min(1, (d - dead) / (R - dead)); const a = Math.atan2(dy, dx);
      T.move.x = k ? Math.cos(a) * k : 0; T.move.y = k ? Math.sin(a) * k : 0;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
    const release = e => { if (e.pointerId !== stickId) return; stickId = null; stick.hidden = true; T.move.x = 0; T.move.y = 0; };
    zone.addEventListener('pointerup', release); zone.addEventListener('pointercancel', release); zone.addEventListener('lostpointercapture', release);
    const hold = (id, on, off) => { const b = document.getElementById(id); b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('on'); on(); }); const up = e => { b.classList.remove('on'); off && off(); }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up); b.addEventListener('contextmenu', e => e.preventDefault()); };
    hold('t-fire', () => { T.fire = true; }, () => { T.fire = false; });
    hold('t-skill', () => { Input.press('Space'); });
    hold('t-act', () => { T.interact = true; });
    hold('t-pause', () => { if (G.state === 'run') UI.togglePause(); });
    layer.addEventListener('contextmenu', e => e.preventDefault());
  }
  function activate() {
    if (Input.touch.active) return; Input.touch.active = true; build();
    try { Input.touch.autoFire = !!Meta.profile.touchAutoFire; } catch (e) { /* */ }
    document.body.classList.add('touch');
  }
  function init() {
    window.addEventListener('touchstart', activate, { once: true, passive: true });
    window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') activate(); }, { passive: true });
    if (isTouchDevice() && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) activate();
  }
  /* visible seulement en jeu, sans écran superposé */
  function sync() { if (!built) return; const show = Input.touch.active && G.state === 'run' && !G.overlay; layer.hidden = !show; if (!show && stickId != null) { stickId = null; stick.hidden = true; Input.touch.move.x = 0; Input.touch.move.y = 0; Input.touch.fire = false; } }
  return { init, sync, activate, get active() { return Input.touch.active; } };
})();
