/* ============================================================
 *  MARTODOOM · Episodi 1: Buenos Aires & Camí Fondo
 *  map.js — the real(istic) map of the two barris, in metres.
 *
 *  1 grid cell = 1 metre. X grows east, Y grows south.
 *  Street names, squares and landmarks are the real ones
 *  (Pl. Pompeu Fabra + Crist Salvador, Pl. d'Isidre Clopas,
 *  Av. del Camí Fondo, Mercat Municipal, IES Pompeu Fabra…).
 *  Shapes and positions are a careful approximation, not survey
 *  data — see the README for how to feed it real OSM footprints.
 * ============================================================ */
'use strict';

const MAP = (() => {
  const W = 560, H = 440;            // metres
  const FLOOR_M = 3;                 // metres per storey

  // ---- floor types ------------------------------------------------
  const F = { DIRT:0, ASPHALT:1, SIDEWALK:2, PLAZA_NEW:3, PLAZA_OLD:4,
              GRASS:5, COURT:6, MARK:7, RAMBLA:8 };

  // ---- wall-type interning ----------------------------------------
  // a "type" = material + colour + height (+ optional sign/flags)
  const types = [null];              // 0 = open air
  const typeKey = {};
  function T(def) {
    const k = JSON.stringify(def);
    if (typeKey[k] !== undefined) return typeKey[k];
    types.push(def);
    typeKey[k] = types.length - 1;
    return types.length - 1;
  }

  const wall  = new Uint16Array(W * H);   // wall-type id per cell
  const floor = new Uint8Array(W * H);    // floor type per cell
  floor.fill(F.DIRT);

  const inB = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  function fillRect(g, x0, y0, x1, y1, v) {
    x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0);
    x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) g[y * W + x] = v;
  }

  // seeded rng so the town looks the same every run
  let seed = 1234567;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function pick(a) { return a[(rnd() * a.length) | 0]; }

  // ---- streets ------------------------------------------------------
  // {name, pts (m), w road width, sw sidewalk width, trees?, ped?, rambla?}
  const STREETS = [
    // ── Barri del Camí Fondo (NE): quiet grid named after Baix Llobregat towns ──
    { name: 'Av. del Camí Fondo',          pts: [[222,128],[556,128]], w: 9, sw: 3.5, trees: true },
    { name: 'C. de Joan Maragall',         pts: [[230,68],[556,68]],   w: 7, sw: 3,   trees: true },
    { name: 'C. de Jacint Verdaguer',      pts: [[230,192],[556,192]], w: 7, sw: 3,   trees: true },
    { name: 'C. del Pou del Merli',        pts: [[230,28],[556,28]],   w: 6, sw: 2.5, trees: true },
    { name: 'C. de Vallirana',             pts: [[268,22],[268,228]],  w: 6, sw: 2.5 },
    { name: 'C. de Torrelles',             pts: [[340,22],[340,228]],  w: 6, sw: 2.5 },
    { name: "C. de St. Llorenç d'Hortons", pts: [[412,22],[412,228]],  w: 6, sw: 2.5 },
    { name: 'C. de Castellví de Rosanes',  pts: [[484,22],[484,228]],  w: 6, sw: 2.5 },
    { name: 'Rbla. de les Bòbiles',        pts: [[546,20],[546,236]],  w: 10, sw: 3, rambla: true },
    // ── the avenue that climbs the slope between the barris ──
    { name: 'Av. Fèlix Duran i Cañameras', pts: [[252,192],[252,422]], w: 9, sw: 3.5, trees: true },
    // ── Barri de Buenos Aires (SW): the 1962 polígon rows ──
    { name: 'C. del Tenor Palet',          pts: [[32,258],[200,258]],  w: 6, sw: 3 },
    { name: 'C. del Mestre Morera',        pts: [[32,308],[200,308]],  w: 6, sw: 3 },
    { name: 'C. de Lluís de Requesens',    pts: [[32,358],[256,358]],  w: 6, sw: 3 },
    { name: 'C. del Doctor Trueta',        pts: [[32,408],[256,408]],  w: 6, sw: 3 },
    { name: 'C. de Pompeu Fabra',          pts: [[60,234],[60,420]],   w: 6, sw: 2.5 },
    { name: 'Ptge. de Buenos Aires',       pts: [[200,258],[200,408]], w: 3.5, sw: 1.5, ped: true },
  ];

  const PLAZAS = [
    { name: 'Pl. de Pompeu Fabra', x0: 92, y0: 311, x1: 178, y1: 356, f: F.PLAZA_OLD },
    { name: "Pl. d'Isidre Clopas", x0: 34, y0: 261, x1: 92,  y1: 305, f: F.PLAZA_NEW },
  ];

  const PARKS = [
    { x0: 24,  y0: 196, x1: 250, y1: 232 },     // grassy slope below Camí Fondo
    { x0: 256, y0: 232, x1: 262, y1: 420 },     // verge along Av. FDiC
    { x0: 296, y0: 132, x1: 336, y1: 188 },     // jardins del Camí Fondo
  ];

  const ROW_COLORS   = ['#b3653f', '#a85a38', '#bd7048', '#9c5535'];
  const HOUSE_COLORS = ['#e8dcc3','#e3cfa8','#dfc095','#e0b9a0','#d9c6ae','#cdb791','#e6d2b8','#d8a87f'];

  const BUILDINGS = [];
  function B(x0, y0, x1, y1, def) { BUILDINGS.push({ x0, y0, x1, y1, def }); }

  // — landmarks —
  B(492, 200, 540, 234, { mat: 'brick',  c: '#a55a38', h: 9,  sign: 'MERCAT MUNICIPAL' });
  B(108, 312, 164, 340, { mat: 'church', c: '#cbb89a', h: 11 });                    // Crist Salvador
  B(164, 312, 173, 321, { mat: 'church', c: '#bfa888', h: 17, tower: true });       // campanar
  B(206, 238, 244, 290, { mat: 'stucco', c: '#e7e0c6', h: 9, sign: 'IES POMPEU FABRA' });
  const PAV = { x0: 206, y0: 300, x1: 244, y1: 352 };                               // pavelló

  // ---- programmatic housing fill ------------------------------------
  const cfBands = [[36, 60], [78, 118], [140, 182]];
  const cfCols  = [[238, 262], [276, 332], [348, 404], [420, 476], [492, 538]];
  const baBands = [[266, 300], [316, 350], [366, 400]];
  const baSegs  = [[32, 52], [68, 112], [120, 164], [172, 194]];

  function overlapsReserved(x0, y0, x1, y1) {
    const R = [...PLAZAS, { x0: 204, y0: 234, x1: 252, y1: 356 }, ...PARKS];
    return R.some(r => x0 < r.x1 + 2 && x1 > r.x0 - 2 && y0 < r.y1 + 2 && y1 > r.y0 - 2);
  }

  // Camí Fondo: 2-storey rowhouses, varied pastel facades
  for (const [y0, y1] of cfBands)
    for (const [cx0, cx1] of cfCols)
      for (let x = cx0; x + 6 <= cx1; x += 6) {
        if (!overlapsReserved(x, y0, x + 6, y0 + 9))
          B(x, y0, x + 6, y0 + 9, { mat: 'stucco', c: pick(HOUSE_COLORS), h: (rnd() < 0.18 ? 3 : 2) * FLOOR_M });
        if (y1 - y0 > 20 && !overlapsReserved(x, y1 - 9, x + 6, y1))
          B(x, y1 - 9, x + 6, y1, { mat: 'stucco', c: pick(HOUSE_COLORS), h: (rnd() < 0.18 ? 3 : 2) * FLOOR_M });
      }
  // a few 4-storey blocks with shops fronting the avenue itself
  for (const x of [276, 348, 420, 492])
    B(x, 140, x + 30, 152, { mat: 'stucco', c: pick(['#d9b894', '#cfae87', '#e2c49e']), h: 12, shops: true });

  // Buenos Aires: long 5-storey brick rows (the 1962/1972 housing)
  for (const [y0, y1] of baBands)
    for (const [sx0, sx1] of baSegs) {
      if (!overlapsReserved(sx0, y0, sx1, y0 + 12))
        B(sx0, y0, sx1, y0 + 12, { mat: 'brick', c: pick(ROW_COLORS), h: 15 });
      if (!overlapsReserved(sx0, y1 - 12, sx1, y1))
        B(sx0, y1 - 12, sx1, y1, { mat: 'brick', c: pick(ROW_COLORS), h: 15 });
    }
  // small shops rows near the north entrance of the barri
  B(68, 236, 196, 246, { mat: 'stucco', c: '#d8c19c', h: 6, shops: true });
  B(32, 236, 52, 246,  { mat: 'stucco', c: '#cdb791', h: 6, shops: true });

  // ---- rasterise -----------------------------------------------------
  for (const p of PARKS) fillRect(floor, p.x0, p.y0, p.x1, p.y1, F.GRASS);

  function paintStreet(s) {
    for (let i = 0; i + 1 < s.pts.length; i++) {
      const [ax, ay] = s.pts[i], [bx, by] = s.pts[i + 1];
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
      for (let t = 0; t <= len; t += 0.5) {
        const x = ax + dx * t / len, y = ay + dy * t / len, r2 = s.w / 2 + s.sw;
        fillRect(floor, x - r2, y - r2, x + r2, y + r2, F.SIDEWALK);
      }
      for (let t = 0; t <= len; t += 0.5) {
        const x = ax + dx * t / len, y = ay + dy * t / len, r1 = s.w / 2;
        fillRect(floor, x - r1, y - r1, x + r1, y + r1, s.ped ? F.SIDEWALK : F.ASPHALT);
      }
      if (s.rambla)
        for (let t = 0; t <= len; t += 0.5) {
          const x = ax + dx * t / len, y = ay + dy * t / len;
          fillRect(floor, x - 1.6, y - 1.6, x + 1.6, y + 1.6, F.RAMBLA);
        }
      if (!s.ped && !s.rambla)
        for (let t = 2; t < len - 2; t += 6) {
          const x = ax + dx * t / len, y = ay + dy * t / len;
          if (Math.abs(dx) > Math.abs(dy)) fillRect(floor, x, y - 0.4, x + 2.4, y + 0.4, F.MARK);
          else fillRect(floor, x - 0.4, y, x + 0.4, y + 2.4, F.MARK);
        }
    }
  }
  for (const s of STREETS) paintStreet(s);
  for (const p of PLAZAS) fillRect(floor, p.x0, p.y0, p.x1, p.y1, p.f);
  fillRect(floor, PAV.x0, PAV.y0, PAV.x1, PAV.y1, F.COURT);

  for (const b of BUILDINGS) fillRect(wall, b.x0, b.y0, b.x1, b.y1, T(b.def));

  // pavelló: hollow box, doorway on the west wall
  const pavT = T({ mat: 'metal', c: '#9fb4ad', h: 8, sign: 'PAVELLÓ MUNICIPAL' });
  fillRect(wall, PAV.x0, PAV.y0, PAV.x1, PAV.y0 + 2, pavT);
  fillRect(wall, PAV.x0, PAV.y1 - 2, PAV.x1, PAV.y1, pavT);
  fillRect(wall, PAV.x1 - 2, PAV.y0, PAV.x1, PAV.y1, pavT);
  fillRect(wall, PAV.x0, PAV.y0, PAV.x0 + 2, PAV.y1, pavT);
  fillRect(wall, PAV.x0, PAV.y0 + 20, PAV.x0 + 2, PAV.y0 + 32, 0);   // doorway

  // schoolyard fence along the Ptge. side, with the gate
  const fenceT = T({ mat: 'fence', c: '#5a6b58', h: 1.4 });
  for (let y = 236; y < 352; y++)
    if (y < 296 || y > 312) wall[y * W + 204] = wall[y * W + 204] || fenceT;

  // map edges + the wooded slopes that really wrap these barris
  const pineT = T({ mat: 'pines', c: '#2e4a30', h: 9 });
  fillRect(wall, 0, 0, W, 18, pineT);              // nord — cap a La Vila
  fillRect(wall, 0, H - 14, W, H, pineT);          // sud — el torrent
  fillRect(wall, 0, 0, 24, H, pineT);              // oest
  fillRect(wall, W - 8, 0, W, H, pineT);           // est
  fillRect(wall, 24, 18, 226, 196, pineT);         // bosc NW, slope to la Vila
  fillRect(wall, 262, 240, 552, 426, pineT);       // hillside between the barris

  // ---- props ---------------------------------------------------------
  const props = [];
  const cellFree = (x, y, m = 1) => {
    for (let yy = -m; yy <= m; yy++) for (let xx = -m; xx <= m; xx++)
      if (!inB((x | 0) + xx, (y | 0) + yy) || wall[((y | 0) + yy) * W + ((x | 0) + xx)]) return false;
    return true;
  };
  function alongStreet(s, spacing, off, kind, opts = {}) {
    for (let i = 0; i + 1 < s.pts.length; i++) {
      const [ax, ay] = s.pts[i], [bx, by] = s.pts[i + 1];
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
      const nx = -dy / len, ny = dx / len;
      for (let t = spacing * (0.4 + rnd() * 0.5); t < len; t += spacing * (0.8 + rnd() * 0.4)) {
        for (const side of [1, -1]) {
          if (opts.oneSide && side < 0) continue;
          const x = ax + dx * t / len + nx * off * side, y = ay + dy * t / len + ny * off * side;
          if (cellFree(x, y)) props.push({ kind, x, y, solid: opts.solid !== false, r: opts.r || 0.5 });
        }
      }
    }
  }
  for (const s of STREETS) {
    if (s.trees) alongStreet(s, 11, s.w / 2 + 1.2, 'plane', { r: 0.45 });
    if (s.rambla) alongStreet(s, 9, 0, 'plane', { oneSide: true, r: 0.45 });
    if (!s.ped) alongStreet(s, 26, s.w / 2 + 1.7, 'lamp', { r: 0.25 });
    if (!s.ped && !s.rambla) alongStreet(s, 17, s.w / 2 - 0.8, 'car', { r: 1.1 });
  }
  for (const p of PLAZAS) {
    const n = p.f === F.PLAZA_NEW ? 14 : 8;     // Isidre Clopas got 200 new trees
    for (let i = 0; i < n; i++) {
      const x = p.x0 + 3 + rnd() * (p.x1 - p.x0 - 6), y = p.y0 + 3 + rnd() * (p.y1 - p.y0 - 6);
      if (cellFree(x, y)) props.push({ kind: rnd() < 0.7 ? 'plane' : 'bench', x, y, solid: true, r: 0.5 });
    }
  }
  for (const pk of PARKS)
    for (let i = 0; i < (pk.x1 - pk.x0) * (pk.y1 - pk.y0) / 260; i++) {
      const x = pk.x0 + rnd() * (pk.x1 - pk.x0), y = pk.y0 + rnd() * (pk.y1 - pk.y0);
      if (cellFree(x, y)) props.push({ kind: 'pine', x, y, solid: true, r: 0.5 });
    }
  // the real bus stops of the barri
  props.push({ kind: 'busstop', x: 300, y: 74.5,  solid: false, r: 0.3 });
  props.push({ kind: 'busstop', x: 360, y: 134,   solid: false, r: 0.3 });

  // ---- gameplay placement ---------------------------------------------
  const start   = { x: 549, y: 224, a: Math.PI };   // Rbla. de les Bòbiles, by the Mercat
  const keySpot = { x: 225, y: 326 };               // inside the pavelló
  const portal  = { x: 136, y: 348 };               // forecourt of Crist Salvador

  const spawns = [
    { x: 500, y: 128, r: 12, n: 3, t: 'gos' },
    { x: 440, y: 192, r: 12, n: 2, t: 'diablot' },
    { x: 412, y: 68,  r: 14, n: 3, t: 'diablot' },
    { x: 340, y: 128, r: 12, n: 3, t: 'gos' },
    { x: 290, y: 28,  r: 10, n: 2, t: 'diablot' },
    { x: 268, y: 150, r: 12, n: 2, t: 'diablot' },
    { x: 252, y: 300, r: 8,  n: 3, t: 'gos' },
    { x: 200, y: 290, r: 8,  n: 2, t: 'diablot' },
    { x: 225, y: 326, r: 9,  n: 1, t: 'botxi' },    // pavilion key guard
    { x: 120, y: 258, r: 12, n: 3, t: 'diablot' },
    { x: 63,  y: 283, r: 12, n: 3, t: 'gos' },
    { x: 140, y: 358, r: 12, n: 3, t: 'diablot' },
    { x: 120, y: 408, r: 12, n: 2, t: 'gos' },
  ];
  const pickups = [
    { t: 'shotgun',   x: 63,  y: 283 },             // Pl. d'Isidre Clopas
    { t: 'coca', x: 522, y: 190 }, { t: 'coca', x: 300, y: 70 }, { t: 'coca', x: 136, y: 352 },
    { t: 'coca', x: 225, y: 340 }, { t: 'coca', x: 60, y: 360 },
    { t: 'vi', x: 412, y: 130 }, { t: 'vi', x: 268, y: 60 }, { t: 'vi', x: 200, y: 300 }, { t: 'vi', x: 100, y: 410 },
    { t: 'bales', x: 546, y: 100 }, { t: 'bales', x: 340, y: 60 }, { t: 'bales', x: 252, y: 250 },
    { t: 'bales', x: 160, y: 258 }, { t: 'bales', x: 40, y: 308 },
    { t: 'cartutxos', x: 80, y: 283 }, { t: 'cartutxos', x: 225, y: 312 }, { t: 'cartutxos', x: 135, y: 380 },
  ];

  const labels = STREETS.map(s => {
    const [a, b] = [s.pts[0], s.pts[s.pts.length - 1]];
    return { name: s.name, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2,
             vert: Math.abs(b[0] - a[0]) < Math.abs(b[1] - a[1]) };
  }).concat(
    PLAZAS.map(p => ({ name: p.name, x: (p.x0 + p.x1) / 2, y: (p.y0 + p.y1) / 2 })),
    [{ name: 'Mercat Municipal', x: 516, y: 217 }, { name: 'Crist Salvador', x: 136, y: 326 },
     { name: 'IES Pompeu Fabra', x: 225, y: 264 }, { name: 'Pavelló', x: 225, y: 326 }]);

  return { W, H, wall, floor, types, F, props, start, keySpot, portal, spawns, pickups, labels };
})();
