/* =========================================================================
   SALLE ZÉRO — 90_main.js — point d'entrée, boucle update/render.
   ========================================================================= */

function update(dt, rawDt) {
  UI.update(rawDt); Touch.sync();
  if (G.state === 'run') { Run.update(dt); if (G.player) Camera.follow(G.player.x, G.player.y, rawDt); }
  else if (G.attract) Attract.update(dt);
}
function render(ctx) {
  ctx.setTransform(ctx.getTransform());
  if ((G.state === 'run' || G.attract) && G.room) {
    ctx.save();
    Camera.apply(ctx);
    if (G.shake > 0) ctx.translate(VFX_RNG.range(-G.shake, G.shake), VFX_RNG.range(-G.shake, G.shake));
    ctx.fillStyle = '#07080d'; ctx.fillRect(-W, -H, 3 * W, 3 * H);
    Room.render(ctx);
    Pickups.render(ctx);
    const ents = G.enemies.slice().sort((a, b) => a.y - b.y); for (const e of ents) e.render(ctx);
    G.player.render(ctx);
    Projectiles.render(ctx); Room.renderFx(ctx); Particles.render(ctx);
    if (G.room.challenge) Challenge.renderOverlay(ctx, G.room);
    Floaters.render(ctx);
    Debug.renderOverlay(ctx);
    ctx.restore();
    if (G.attract) { UI.renderAttractVeil(ctx); } else { UI.renderHud(ctx); if (G.room.challenge) Challenge.renderHud(ctx, G.room); }
  } else UI.renderBackdrop(ctx);
  UI.renderToasts(ctx); UI.renderFade(ctx);
}
async function boot() {
  const canvas = document.getElementById('c');
  Engine.init(canvas);
  Meta.load(); Content.validate();
  const wake = () => { AudioEngine.init(); AudioEngine.resume && AudioEngine.resume(); AudioEngine.setVolume(Meta.profile.volume); Music.restart(); };
  Input.attach(canvas, wake);
  document.addEventListener('pointerdown', wake, { once: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && AudioEngine.resume) AudioEngine.resume(); });
  UI.init(); Debug.init(); Touch.init();
  Camera.setZoom(Meta.profile.zoom || (Touch.active ? 1.5 : 1));
  await Sprites.load();
  UI.showMenu();
  Engine.start(update, render);
  Attract.start();
  window.__autoplay = Debug.autoplay;
  window.__G = G;
}
window.addEventListener('DOMContentLoaded', boot);
