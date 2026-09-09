/* Banc d'essai de WAY — ce que chaque test partage.
   Un test s'écrit :  require('./lib').test(async ({ page, ok, entrer, salle, run }) => { ... });
   et se lance avec  node dev/test/<nom>.js  (ou tous d'un coup : node dev/test/run.js).
   Le serveur, le navigateur, la collecte des erreurs JS, le compte des assertions et le code de sortie
   sont pris en charge ici — un test ne contient que ce qu'il vérifie. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium, devices } = require('playwright');

const RACINE = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.svg': 'image/svg+xml', '.md': 'text/plain' };

/* Serveur statique minuscule sur la racine du dépôt : aucune dépendance, un port libre par test. */
function servir() {
  return new Promise(res => {
    const srv = http.createServer((req, rep) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      const f = path.join(RACINE, url === '/' ? 'index.html' : url);
      if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rep.writeHead(404); rep.end(); return; }
      rep.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(rep);
    });
    srv.listen(0, '127.0.0.1', () => res({ srv, url: `http://127.0.0.1:${srv.address().port}/index.html` }));
  });
}

function chromiumPath() {
  if (process.env.WAY_CHROMIUM) return process.env.WAY_CHROMIUM;
  if (fs.existsSync('/opt/pw-browsers/chromium')) return '/opt/pw-browsers/chromium';
  return undefined;   // celui que Playwright a installé
}

/* Chemin d'une capture ou d'un journal : dev/test/out/, ignoré par git. */
function out(nom) { fs.mkdirSync(OUT, { recursive: true }); return path.join(OUT, nom); }

/* Lance un test. `opts.mobile` ouvre un contexte tactile ; `opts.viewport` change la taille. */
function test(fn, opts = {}) {
  const nom = path.basename(process.argv[1], '.js');
  (async () => {
    const { srv, url } = await servir();
    const browser = await chromium.launch({ executablePath: chromiumPath(), args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });
    const ctxOpts = opts.mobile
      ? { viewport: { width: 900, height: 420 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' }
      : { viewport: opts.viewport || { width: 1280, height: 720 } };
    const context = await browser.newContext(ctxOpts);
    const page = await context.newPage();
    const erreurs = [];
    page.on('pageerror', e => erreurs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
    let total = 0, echecs = 0;
    const ok = (libelle, cond, detail) => { total++; if (!cond) echecs++; console.log(`${cond ? '✓' : '✗ ÉCHEC'}  ${libelle}${detail ? ' — ' + detail : ''}`); return !!cond; };

    /* --- aides partagées --- */
    /* Entre dans le jeu : charge la page, passe l'écran-titre, choisit le mode (test = tout débloqué). */
    const entrer = async (mode = 'test') => {
      await page.goto(url); await page.waitForTimeout(600);
      await page.waitForFunction(() => window.G && (G.state === 'menu' || G.state === 'title' || document.querySelector('.menuscreen')), null, { timeout: 15000 }).catch(() => {});
      const splash = await page.$('.menuscreen.splash'); if (splash) { await splash.click(); await page.waitForTimeout(2700); }
      const bouton = mode === 'test' ? '#btn-test' : '#btn-normal';
      await page.click(bouton); await page.waitForTimeout(500);
      if (await page.$('#intro-skip')) { await page.click('#intro-skip'); await page.waitForTimeout(300); }
      await page.waitForFunction(() => window.G && G.state === 'hub', null, { timeout: 10000 }).catch(() => {});
    };
    /* Saute directement dans une salle (mode test), invulnérable, panneau debug fermé. */
    const salle = async (n, biome = 'biome_1') => {
      await page.evaluate(([n, b]) => { const s = document.querySelector('#d-biome'); if (s) s.value = b; Debug.gotoRoom(n); Debug.hide(); G.debug.invuln = true; }, [n, biome]);
      await page.waitForTimeout(1200);
    };
    /* Démarre une run depuis le hub avec un personnage et un compagnon, passe la prépa. */
    const run = async ({ character, pet, petMode = 'always' } = {}) => {
      await page.evaluate(([c, p, m]) => { if (c) Meta.profile.character = c; if (p !== undefined) Meta.profile.pet = p; Meta.profile.petMode = m; Meta.save(); document.getElementById('hub-enter').click(); }, [character, pet, petMode]);
      await page.waitForTimeout(1500);
      if (await page.$('[data-s]')) { await page.click('[data-s]'); await page.click('#prep-go'); await page.waitForTimeout(1500); }
      await page.evaluate(() => { G.debug.invuln = true; });
    };
    /* Referme tout écran de choix (montée de niveau, coffre) dès qu'il s'ouvre : sans ça la simulation se fige
       au milieu d'une mesure et un test qui observe un compagnon mesure du vide. */
    const sansPause = () => page.evaluate(() => { setInterval(() => { if (G.paused && G.state === 'run') { if (UI.hideChoice) UI.hideChoice(); G.paused = false; } }, 50); });

    let plante = null;
    try { await fn({ page, context, browser, ok, entrer, salle, run, sansPause, out, url, erreurs }); }
    catch (e) { plante = e; }
    await browser.close(); srv.close();
    const errJs = [...new Set(erreurs)];
    console.log(`${nom} : ${total - echecs}/${total} OK${echecs ? ` · ${echecs} ÉCHEC(S)` : ''}${errJs.length ? ` · ${errJs.length} ERREUR(S) JS` : ''}`);
    if (errJs.length) console.log('ERREURS JS\n  ' + errJs.slice(0, 5).join('\n  '));
    if (plante) { console.log('LE TEST A PLANTÉ : ' + (plante.stack || plante.message)); process.exit(2); }
    process.exit(echecs || errJs.length ? 1 : 0);
  })();
}

module.exports = { test, out, RACINE, devices };
