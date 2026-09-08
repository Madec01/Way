/* =========================================================================
   SALLE ZÉRO — 90_main.js — point d'entrée, boucle update/render.
   ========================================================================= */

function update(dt, rawDt) {
  Beat.update(); UI.update(rawDt); Touch.sync();
  if (!G.audioOk && Music.isPlaying()) { G.audioOk = true; document.body.classList.add('audio-on'); }   // le son tourne : l'invite du menu disparaît
  if (G.state === 'run') { Run.update(dt); if (G.player) Camera.follow(G.player.x, G.player.y, rawDt); }
  else if (G.attract) Attract.update(dt);
  Atelier.update();
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
    const ents = G.enemies.slice(); if (G.pet) ents.push(G.pet); ents.sort((a, b) => a.y - b.y); for (const e of ents) e.render(ctx);
    G.player.render(ctx);
    Projectiles.render(ctx); Room.renderFx(ctx); Particles.render(ctx);
    if (G.room.challenge) Challenge.renderOverlay(ctx, G.room);
    if (G.room.tempo) Tempo.renderOverlay(ctx, G.room);
    Floaters.render(ctx);
    Debug.renderOverlay(ctx); Atelier.render(ctx);
    ctx.restore();
    if (G.attract) { UI.renderAttractVeil(ctx); } else { UI.renderHud(ctx); Pets.renderHud(ctx); if (G.room.challenge) Challenge.renderHud(ctx, G.room); if (G.room.tempo) Tempo.renderHud(ctx, G.room); }
  } else UI.renderBackdrop(ctx);
  UI.renderMenuFx(ctx);
  UI.renderToasts(ctx); UI.renderFade(ctx);
}
async function boot() {
  const canvas = document.getElementById('c');
  Engine.init(canvas);
  Meta.load(); Content.validate();
  /* Le son ne peut démarrer qu'après un geste de l'utilisateur (règle des navigateurs) : clic, toucher ou touche du clavier.
     On tente quand même un démarrage immédiat : Chrome l'autorise sur les sites où l'on a déjà joué du son (indice d'engagement). */
  const wake = () => { if (G.audioOk) return; AudioEngine.init(); AudioEngine.resume && AudioEngine.resume(); AudioEngine.setVolume(Meta.profile.volume); Music.restart(); };
  Input.attach(canvas, wake);
  document.addEventListener('pointerdown', wake); document.addEventListener('keydown', wake);   // retentés à chaque geste tant que la musique ne joue pas vraiment
  setTimeout(wake, 300);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && AudioEngine.resume) AudioEngine.resume(); });
  UI.init(); Debug.init(); Touch.init();
  Camera.setZoom(Meta.profile.zoom || (Touch.active ? 1.5 : 1));
  await Sprites.load(); Sprites.loadProps(); Sprites.loadFriends(); Sprites.loadCustoms(); Beat.load();
  if (Meta.profile.lag) Beat.lag = Meta.profile.lag;   // décalage son/image calibré par l'auteur
  UI.showTitle();
  Engine.start(update, render);
  Attract.start();
  window.__autoplay = Debug.autoplay; window.__atelier = Atelier;
  window.addEventListener('keydown', e => { if (e.code === 'F2') { e.preventDefault(); Atelier.toggle(); } });
  if (/[?&]atelier=1/.test(location.search)) setTimeout(() => Atelier.open(), 600);
  window.__G = G;
}
window.addEventListener('DOMContentLoaded', boot);
