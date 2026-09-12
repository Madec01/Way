/* =========================================================================
   WAY — 90_main.js — point d'entrée, boucle update/render.
   ========================================================================= */

'use strict';
function update(dt, rawDt) {
  Beat.update();
  UI.update(rawDt);
  Touch.sync();
  if (!G.audioOk && Music.isPlaying()) {
    G.audioOk = true;
    document.body.classList.add('audio-on');
  } // le son tourne : l'invite du menu disparaît
  if (G.state === 'run') {
    Run.update(dt);
    if (G.player) {
      const tg = Camera.target(G.player);
      Camera.follow(tg.x, tg.y, rawDt);
    }
  } else if (G.attract) Attract.update(dt);
  Atelier.update();
}
function render(ctx) {
  ctx.setTransform(ctx.getTransform());
  if ((G.state === 'run' || G.attract) && G.room) {
    ctx.save();
    Camera.shake(ctx); // avant le zoom : la secousse est en pixels d'écran
    Camera.apply(ctx);
    ctx.fillStyle = '#07080d';
    ctx.fillRect(-W, -H, 3 * W, 3 * H);
    Room.render(ctx);
    Pickups.render(ctx);
    /* Ordre de dessin par les PIEDS, joueur compris : ce qui est plus bas à l'écran passe devant. Le joueur
       était toujours dessiné après tout le monde — un chat devant lui passait derrière. */
    const ents = G.enemies.slice();
    for (const pe of G.pets) if (!pe.hidden()) ents.push(pe);
    ents.push(G.player);
    const pieds = e => (e.feetY ? e.feetY() : e.y + 20);
    ents.sort((a, b) => pieds(a) - pieds(b));
    for (const e of ents) e.render(ctx);
    Projectiles.render(ctx);
    Room.renderFx(ctx);
    Particles.render(ctx);
    if (G.room.challenge) Challenge.renderOverlay(ctx, G.room);
    if (G.room.tempo) Tempo.renderOverlay(ctx, G.room);
    Floaters.render(ctx);
    Debug.renderOverlay(ctx);
    Atelier.render(ctx);
    ctx.restore();
    if (G.attract) {
      UI.renderAttractVeil(ctx);
    } else if (G.overlay !== 'end') {
      /* derrière l'écran de fin, le HUD de combat n'a plus rien à dire (I-7) ; au tactile, tout est à ×1,35 (I-8) */
      UI.hudBegin(ctx);
      UI.renderHud(ctx);
      Pets.renderHud(ctx);
      if (G.room.challenge) Challenge.renderHud(ctx, G.room);
      if (G.room.tempo) Tempo.renderHud(ctx, G.room);
      UI.hudEnd(ctx);
    }
  } else UI.renderBackdrop(ctx);
  UI.renderMenuFx(ctx);
  UI.renderToasts(ctx);
  UI.renderFade(ctx);
  Perf.render(ctx);
}
async function boot() {
  const canvas = document.getElementById('c');
  Engine.init(canvas);
  Perf.hook(Engine.ctx);
  Meta.load();
  Perf.setMode(Meta.profile.perfMode);
  Perf.show = !!Meta.profile.perfShow || /[?&]perf(=1)?(&|$)/.test(location.search); // ?perf : le compteur sans passer par la pause
  Content.validate();
  /* Le son ne peut démarrer qu'après un geste de l'utilisateur (règle des navigateurs) : clic, toucher ou touche du clavier.
     On tente quand même un démarrage immédiat : Chrome l'autorise sur les sites où l'on a déjà joué du son (indice d'engagement). */
  const wake = () => {
    if (G.audioOk) return;
    AudioEngine.init();
    AudioEngine.resume && AudioEngine.resume();
    AudioEngine.setVolume(Meta.profile.volume);
    Music.restart();
  };
  Input.attach(canvas, wake);
  document.addEventListener('pointerdown', wake);
  document.addEventListener('keydown', wake); // retentés à chaque geste tant que la musique ne joue pas vraiment
  setTimeout(wake, 300);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && AudioEngine.resume) AudioEngine.resume();
  });
  UI.init();
  Debug.init();
  Touch.init();
  Camera.setZoom(Meta.profile.zoom || (Touch.active ? 1.5 : 1));
  await Sprites.load();
  Sprites.loadProps();
  Sprites.loadFriends();
  Beat.load();
  if (Meta.profile.lag) Beat.lag = Meta.profile.lag; // décalage son/image calibré par l'auteur
  UI.showTitle();
  /* les polices pixel doivent être là avant le premier rendu du canvas, sinon Silkscreen retombe en silence sur Segoe UI */
  try {
    await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
  } catch (e) {}
  Engine.start(update, render);
  Attract.start();
  window.__autoplay = Debug.autoplay;
  window.__atelier = Atelier;
  window.addEventListener('keydown', e => {
    if (e.code === 'F2' && G.mode === 'test') {
      // l'atelier est un outil de fabrication : un ami qui tâtonne les touches ne doit pas tomber dedans
      e.preventDefault();
      Atelier.toggle();
    }
  });
  if (/[?&]atelier=1/.test(location.search)) setTimeout(() => Atelier.open(), 600);
  window.__G = G;
}
window.addEventListener('DOMContentLoaded', boot);
