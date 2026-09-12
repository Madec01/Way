/* Chantier 12, séance D — chaque salle reste traversable. Pour les 36 salles, créées sans les lancer (Room.create
   compile le terrain et pose les obstacles) : la porte est atteignable depuis l'entrée par un couloir de deux tuiles
   de large (les murets franchissables en ruée mis à part), le sas d'entrée et le couloir de la porte sont libres de
   tout obstacle, terrain solide et piège, la salle du boss garde un carré de 3×3 libre là où il apparaît, le décor
   est posé sur du sol nu (jamais dans un mur, un bassin ou une caisse), et le nombre de rectangles d'obstacle reste
   raisonnable pour les collisions. spawncheck.js garde les spawns fixes et les pièges ; ici c'est la géométrie. */
const { test } = require('./lib');
test(async ({ page, ok, url }) => {
  await page.goto(url);
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const pb = [];
    const stats = {};
    const DIRS = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const sy = Math.floor(ROOM_ROWS / 2);
    for (const b of Content.biomes()) {
      const st = (stats[b.id] = { salles: 0, obstaclesMax: 0, couloirMin: Infinity, terrain: 0 });
      for (const def of Content.roomsOf(b.id)) {
        const room = Room.create(def);
        st.salles++;
        if (room.grid) st.terrain++;
        st.obstaclesMax = Math.max(st.obstaclesMax, room.obstacles.length);
        const out = (x, y) => x < 0 || y < 0 || x >= ROOM_COLS || y >= ROOM_ROWS;
        const obsAt = (x, y) => room.obstacles.some(o => !o.terrain && x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h);
        const tdef = (x, y) => (room.grid ? TERRAIN_BY_ID[room.grid[y * ROOM_COLS + x]] : TERRAIN_BY_ID[0]);
        const solidAt = (x, y) => out(x, y) || obsAt(x, y) || !!tdef(x, y).solid;
        /* « dur » : bloque même en ruée — un muret franchissable ne pince pas le passage */
        const hard = (x, y) => out(x, y) || obsAt(x, y) || (tdef(x, y).solid && !tdef(x, y).dashOver);
        const win = (x, y) => !hard(x, y) && !hard(x + 1, y) && !hard(x, y + 1) && !hard(x + 1, y + 1);
        const reach = (free, sx, sy0, goal) => {
          const seen = new Set([`${sx},${sy0}`]);
          const q = [[sx, sy0]];
          while (q.length) {
            const [x, y] = q.shift();
            if (goal(x, y)) return seen.size;
            for (const [dx, dy] of DIRS) {
              const nx = x + dx,
                ny = y + dy,
                k = `${nx},${ny}`;
              if (!free(nx, ny) || seen.has(k)) continue;
              seen.add(k);
              q.push([nx, ny]);
            }
          }
          return 0;
        };
        /* 1. porte atteignable à pied (terrain + obstacles) */
        if (
          !reach(
            (x, y) => !solidAt(x, y),
            1,
            sy,
            (x, y) => x === ROOM_COLS - 1 && y === sy
          )
        )
          pb.push(`${def.id} : porte inatteignable à pied`);
        /* 2. couloir de deux tuiles de large */
        const wide = Math.max(
          ...[sy - 1, sy].map(y0 => (win(1, y0) ? reach(win, 1, y0, (x, y) => x === ROOM_COLS - 2 && (y === sy - 1 || y === sy)) : 0))
        );
        if (!wide) pb.push(`${def.id} : pas de couloir de deux tuiles de large entre l'entrée et la porte`);
        st.couloirMin = Math.min(st.couloirMin, wide);
        /* 3. sas d'entrée et couloir de la porte libres (obstacle, terrain solide, piège) */
        const zone = (x0, x1, nom) => {
          for (let y = sy - 1; y <= sy + 1; y++)
            for (let x = x0; x <= x1; x++) if (solidAt(x, y)) pb.push(`${def.id} : ${nom} bloqué en (${x},${y})`);
          for (const t of def.traps || []) {
            const w = t.w || 1,
              h = t.h || 1;
            if (w * h >= 40) continue; // une grille de tempo couvre toute la salle : c'est voulu, elle prévient
            if (t.x <= x1 && t.x + w > x0 && t.y <= sy + 1 && t.y + h > sy - 1) pb.push(`${def.id} : piège ${t.trap} dans ${nom}`);
          }
        };
        zone(0, 2, "le sas d'entrée");
        zone(ROOM_COLS - 3, ROOM_COLS - 1, 'le couloir de la porte');
        /* 4. le boss a la place d'apparaître (3×3 autour de sa tuile par défaut) */
        if (def.type === 'BOSS_REVENGE' || def.type === 'MINIBOSS') {
          const bx = Math.floor(ROOM_COLS * 0.72);
          for (let y = sy - 1; y <= sy + 1; y++)
            for (let x = bx - 1; x <= bx + 1; x++) if (solidAt(x, y)) pb.push(`${def.id} : la tuile du boss (${x},${y}) est bloquée`);
        }
        /* 5. le décor sur du sol nu, jamais dans un obstacle */
        for (const d of def.deco || []) {
          if (out(d.x, d.y)) pb.push(`${def.id} : décor ${d.kind} hors salle (${d.x},${d.y})`);
          else if (obsAt(d.x, d.y)) pb.push(`${def.id} : décor ${d.kind} dans un obstacle (${d.x},${d.y})`);
          else if (!Terrain.plain(d.x, d.y, room)) pb.push(`${def.id} : décor ${d.kind} sur du terrain (${d.x},${d.y})`);
        }
        /* 6. pas plus de 40 rectangles d'obstacle */
        if (room.obstacles.length > 40) pb.push(`${def.id} : ${room.obstacles.length} obstacles (plafond 40)`);
      }
    }
    return { pb, stats };
  });
  const total = Object.values(r.stats).reduce((s, x) => s + x.salles, 0);
  const terrains = Object.values(r.stats).reduce((s, x) => s + x.terrain, 0);
  ok(`${total} salles créées, ${terrains} avec un plan de terrain`, total === 36 && terrains >= 12, JSON.stringify(r.stats));
  ok(
    'porte atteignable par un couloir large, sas et porte libres, place du boss, décor sur sol nu, obstacles ≤ 40',
    r.pb.length === 0,
    r.pb.length ? '\n  ' + r.pb.join('\n  ') : 'aucun problème'
  );
  for (const [b, s] of Object.entries(r.stats))
    ok(
      `${b} : ${s.salles} salles, au plus ${s.obstaclesMax} obstacles, couloir large d'au moins ${s.couloirMin} positions`,
      s.couloirMin > 0
    );

  /* Chantier 13 A — le chemin sûr prouvé (la garantie d'Isaac et de DCSS, automatisée), dans le temps et l'espace :
     dans chaque salle à pièges, tous les pièges armés en même temps (plus sévère que la salle du tempo qui les arme un
     par un), depuis chaque instant de départ (0 à 12 s par pas de 0,4 s) un joueur parti du sas atteint la porte en
     marchant d'une tuile par cinquième de seconde ou en attendant, sans jamais être sur une tuile dangereuse — et
     le sas lui-même est sûr pendant les deux premières secondes (le temps d'entrer). Barre le passage ce qui frappe
     sur place (rayon, bras, dalle, scie, nappe : danger ≥ 0,8) ; la portée d'un tireur (0,5-0,6) est une gêne, pas
     un mur — ses balles se lisent et s'esquivent. */
  const sr = await page.evaluate(() => {
    const pb = [];
    let salles = 0,
      departs = 0;
    const sy = Math.floor(ROOM_ROWS / 2);
    const N = ROOM_COLS * ROOM_ROWS,
      STEP = 0.2,
      STEPS = 120; // 24 s
    const DIRS = [0, 1, -1, ROOM_COLS, -ROOM_COLS];
    for (const b of Content.biomes())
      for (const def of Content.roomsOf(b.id)) {
        const room = Room.create(def);
        if (!room.traps.length) continue;
        salles++;
        const walk = new Uint8Array(N);
        for (let y = 0; y < ROOM_ROWS; y++)
          for (let x = 0; x < ROOM_COLS; x++) walk[y * ROOM_COLS + x] = Terrain.walkable(x, y, room) ? 1 : 0;
        /* la carte du danger, instant par instant */
        const dang = [];
        for (let st = 0; st <= STEPS; st++) {
          const d = new Uint8Array(N);
          const rt = st * STEP;
          for (let y = 0; y < ROOM_ROWS; y++)
            for (let x = 0; x < ROOM_COLS; x++) {
              const i = y * ROOM_COLS + x;
              if (!walk[i]) {
                d[i] = 1;
                continue;
              }
              const px = ROOM_X + (x + 0.5) * TILE,
                py = ROOM_Y + (y + 0.5) * TILE;
              for (const t of room.traps)
                if (t.dangerAt(px, py, rt) >= 0.8) {
                  d[i] = 1;
                  break;
                }
            }
          dang.push(d);
        }
        const start = 1 + sy * ROOM_COLS,
          goal = ROOM_COLS - 1 + sy * ROOM_COLS;
        for (let s0 = 0; s0 <= 60; s0 += 2) {
          if (dang[s0][start]) {
            if (s0 * STEP < 2) pb.push(`${def.id} : le sas est dangereux à ${(s0 * STEP).toFixed(1)} s, le temps d'entrer`);
            continue;
          }
          departs++;
          /* parcours en largeur dans (tuile, instant) : avancer d'une tuile ou attendre, jamais sur du danger */
          const seen = new Uint8Array(N * (STEPS + 1));
          let q = [start],
            found = false;
          seen[s0 * N + start] = 1;
          for (let st = s0; st < STEPS && q.length && !found; st++) {
            const next = [],
              d = dang[st + 1];
            for (const i of q) {
              if (i === goal) {
                found = true;
                break;
              }
              const x = i % ROOM_COLS;
              for (const dd of DIRS) {
                const j = i + dd;
                if (j < 0 || j >= N) continue;
                if ((dd === 1 && x === ROOM_COLS - 1) || (dd === -1 && x === 0)) continue;
                if (d[j] || seen[(st + 1) * N + j]) continue;
                seen[(st + 1) * N + j] = 1;
                next.push(j);
              }
            }
            q = next;
          }
          if (!found && !q.includes(goal)) {
            pb.push(`${def.id} : parti du sas à ${(s0 * STEP).toFixed(1)} s, aucun chemin sûr n'atteint la porte en 24 s`);
            break;
          }
        }
      }
    return { pb, salles, departs };
  });
  ok(
    `chemin sûr prouvé : ${sr.salles} salles à pièges, ${sr.departs} départs, toujours un parcours sans danger du sas à la porte`,
    sr.pb.length === 0,
    sr.pb.length ? '\n  ' + sr.pb.join('\n  ') : 'aucune coupure'
  );
});
