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
              GRASS:5, COURT:6, MARK:7, RAMBLA:8, CROSS_X:9, CROSS_Y:10, CURB:11 };

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
    // the promenade that ends at Pl. de les Cultures / Centre Cultural
    { name: 'Pg. de Catalunya',            pts: [[372,196],[372,268]], w: 6, sw: 4, trees: true },
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
    { name: 'Pl. de Pompeu Fabra', x0: 64, y0: 311, x1: 150, y1: 356, f: F.PLAZA_OLD },
    { name: "Pl. d'Isidre Clopas", x0: 34, y0: 261, x1: 92,  y1: 305, f: F.PLAZA_NEW },
  ];

  const PARKS = [
    { x0: 24,  y0: 196, x1: 250, y1: 232 },     // grassy slope below Camí Fondo
    { x0: 256, y0: 232, x1: 262, y1: 420 },     // verge along Av. FDiC
    { x0: 296, y0: 132, x1: 336, y1: 188 },     // jardins del Camí Fondo
    { x0: 300, y0: 252, x1: 334, y1: 308 },     // the park beside Pl. de les Cultures
  ];

  // 1960s polígon slabs: painted render in light warm tones + slab accents,
  // a few in light obra-vista brick — not the dark uniform brick of before
  const BLOC_COLORS = ['#e9e2d0', '#e7d9b8', '#dcc7a4', '#e3cfc4', '#d8d2c4', '#cbb89e'];
  const BLOC_ACCENT = ['#a85a38', '#8a6b4a', '#7a4a3a', '#9c5535'];
  const BRICK_LIGHT = ['#b97a52', '#aa6a47', '#c08a60'];
  const HOUSE_COLORS = ['#e8dcc3','#e3cfa8','#dfc095','#e0b9a0','#d9c6ae','#cdb791','#e6d2b8','#d8a87f'];

  const BUILDINGS = [];
  function B(x0, y0, x1, y1, def) { BUILDINGS.push({ x0, y0, x1, y1, def }); }

  // — landmarks —
  // Mercat de Les Bòbiles: brick hall, mid-remodelling (the real works run to 2026)
  B(492, 200, 540, 234, { mat: 'brick', c: '#b06a45', h: 8, nowin: true, sign: 'MERCAT MUNICIPAL · LES BÒBILES' });
  // (the Centre Cultural is stamped after the woods are rasterised — see below —
  //  since its real site is the clearing between the two barris)
  // Crist Salvador (1988): modern brick parish church on c. Pompeu Fabra
  B(80, 312, 136, 338,  { mat: 'church', c: '#b06a45', h: 9 });
  B(136, 312, 144, 320, { mat: 'church', c: '#a86040', h: 13, tower: true });       // campanar
  B(206, 238, 244, 290, { mat: 'stucco', c: '#e7e0c6', h: 9, sign: 'IES POMPEU FABRA' });
  const PAV = { x0: 206, y0: 300, x1: 244, y1: 352 };                               // pavelló
  // el bar de la plaça, with its terrace on Pl. de Pompeu Fabra
  B(152, 316, 172, 328, { mat: 'stucco', c: '#d9b894', h: 6, shops: true, sign: 'BAR DE LA PLAÇA' });
  // l'ascensor de Buenos Aires (the real municipal lift project on the slope)
  B(24, 296, 30, 304, { mat: 'metal', c: '#8aa0b0', h: 12 });

  // ---- programmatic housing fill ------------------------------------
  const cfBands = [[36, 60], [78, 118], [140, 182]];
  const cfCols  = [[238, 262], [276, 332], [348, 404], [420, 476], [492, 538]];
  const baBands = [[266, 300], [316, 350], [366, 400]];
  const baSegs  = [[32, 52], [68, 112], [120, 164], [172, 194]];

  function overlapsReserved(x0, y0, x1, y1) {
    const R = [...PLAZAS, { x0: 204, y0: 234, x1: 252, y1: 356 }, ...PARKS];
    return R.some(r => x0 < r.x1 + 2 && x1 > r.x0 - 2 && y0 < r.y1 + 2 && y1 > r.y0 - 2);
  }

  // Camí Fondo: 2-storey rowhouses — varied pastel facades, tiled socles,
  // about half with a garage roller door (cases unifamiliars)
  const house = () => ({ mat: 'stucco', c: pick(HOUSE_COLORS), h: (rnd() < 0.18 ? 3 : 2) * FLOOR_M,
                         garage: rnd() < 0.55, socle: true });
  for (const [y0, y1] of cfBands)
    for (const [cx0, cx1] of cfCols)
      for (let x = cx0; x + 6 <= cx1; x += 6) {
        if (!overlapsReserved(x, y0, x + 6, y0 + 9)) B(x, y0, x + 6, y0 + 9, house());
        if (y1 - y0 > 20 && !overlapsReserved(x, y1 - 9, x + 6, y1)) B(x, y1 - 9, x + 6, y1, house());
      }
  // a few 4-storey blocks with shops fronting the avenue itself
  for (const x of [276, 348, 420, 492])
    B(x, 140, x + 30, 152, { mat: 'stucco', c: pick(['#d9b894', '#cfae87', '#e2c49e']), h: 12, shops: true });

  // Buenos Aires: long 5-storey rows (the 1962/1972 housing)
  const bloc = () => rnd() < 0.3
    ? { mat: 'brick', c: pick(BRICK_LIGHT), h: 15 }
    : { mat: 'bloc', c: pick(BLOC_COLORS), accent: pick(BLOC_ACCENT), h: 15 };
  for (const [y0, y1] of baBands)
    for (const [sx0, sx1] of baSegs) {
      if (!overlapsReserved(sx0, y0, sx1, y0 + 12)) B(sx0, y0, sx1, y0 + 12, bloc());
      if (!overlapsReserved(sx0, y1 - 12, sx1, y1)) B(sx0, y1 - 12, sx1, y1, bloc());
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

  // Centre Cultural grounds, at the end of Pg. de Catalunya:
  // green clearing, paved apron, Pl. de les Cultures + park in front, gardens behind
  for (let y = 240; y < 344; y++)
    for (let x = 296; x < 456; x++)
      if (floor[y * W + x] === F.DIRT) floor[y * W + x] = F.GRASS;
  fillRect(floor, 336, 294, 412, 322, F.SIDEWALK);
  fillRect(floor, 336, 260, 412, 294, F.PLAZA_OLD);
  fillRect(floor, 340, 322, 408, 338, F.GRASS);
  fillRect(floor, 262, 294, 344, 308, F.SIDEWALK);   // path in from Av. FDiC

  // zebra crossings (passos de vianants) at every proper crossing
  const segs = STREETS.filter(s => !s.ped);
  for (const h of segs) for (const v of segs) {
    const [ha, hb] = h.pts, [va, vb] = v.pts;
    if (ha[1] !== hb[1] || va[0] !== vb[0]) continue;     // h must run E-W, v N-S
    const y = ha[1], x = va[0];
    if (x < Math.min(ha[0], hb[0]) + 4 || x > Math.max(ha[0], hb[0]) - 4) continue;
    if (y < Math.min(va[1], vb[1]) + 4 || y > Math.max(va[1], vb[1]) - 4) continue;
    const hw = h.w / 2, vw = v.w / 2;
    fillRect(floor, x - vw - 3.4, y - hw, x - vw - 0.4, y + hw, F.CROSS_X);
    fillRect(floor, x + vw + 0.4, y - hw, x + vw + 3.4, y + hw, F.CROSS_X);
    fillRect(floor, x - vw, y - hw - 3.4, x + vw, y - hw - 0.4, F.CROSS_Y);
    fillRect(floor, x - vw, y + hw + 0.4, x + vw, y + hw + 3.4, F.CROSS_Y);
  }

  for (const p of PLAZAS) fillRect(floor, p.x0, p.y0, p.x1, p.y1, p.f);
  fillRect(floor, PAV.x0, PAV.y0, PAV.x1, PAV.y1, F.COURT);

  // granite curb line wherever panot sidewalk meets the roadway
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      if (floor[y * W + x] !== F.SIDEWALK) continue;
      for (const n of [floor[y * W + x - 1], floor[y * W + x + 1], floor[(y - 1) * W + x], floor[(y + 1) * W + x]])
        if (n === F.ASPHALT || n === F.CROSS_X || n === F.CROSS_Y) { floor[y * W + x] = F.CURB; break; }
    }

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

  // tanca d'obra: the Mercat remodelling works (real ones, until 2026)
  const obraT = T({ mat: 'obra', c: '#e8e6e0', h: 1.9, sign: 'NOU MERCAT 2026' });
  fillRect(wall, 492, 236, 540, 237, obraT);
  fillRect(wall, 490, 200, 491, 237, obraT);

  // map edges + the wooded slopes that really wrap these barris
  const pineT = T({ mat: 'pines', c: '#2e4a30', h: 9 });
  fillRect(wall, 0, 0, W, 18, pineT);              // nord — cap a La Vila
  fillRect(wall, 0, H - 14, W, H, pineT);          // sud — el torrent
  fillRect(wall, 0, 0, 24, H, pineT);              // oest
  fillRect(wall, W - 8, 0, W, H, pineT);           // est
  fillRect(wall, 24, 18, 226, 196, pineT);         // bosc NW, slope to la Vila
  fillRect(wall, 262, 240, 552, 426, pineT);       // hillside between the barris

  // …and the clearing in it where the Centre Cultural really stands,
  // at the south end of Pg. de Catalunya (near Av. Mancomunitats Comarcals)
  fillRect(wall, 296, 240, 456, 344, 0);
  fillRect(wall, 262, 294, 300, 310, 0);           // the path through to Av. FDiC
  // Centre Cultural (1995, Bargués & Isart): pale civic body with the
  // library + auditorium, crowned by its five huge coloured roof panels —
  // modelled as taller slabs rising behind the facade
  fillRect(wall, 344, 296, 404, 318, T({ mat: 'cultural', c: '#ddd6c4', h: 10, sign: 'CENTRE CULTURAL' }));
  ['#c43a2e', '#2f5fae', '#e0b32a', '#3c8a4e', '#7a4a86'].forEach((pc, i) =>
    fillRect(wall, 344 + i * 12, 314, 344 + (i + 1) * 12, 318, T({ mat: 'panel', c: pc, h: 16.5 })));
  // low hedge around the gardens behind (gap on the east corner)
  const hedgeT = T({ mat: 'fence', c: '#46603f', h: 1.0 });
  for (let x = 340; x < 408; x++) wall[338 * W + x] = wall[338 * W + x] || hedgeT;
  for (let y = 322; y < 338; y++) {
    wall[y * W + 340] = wall[y * W + 340] || hedgeT;
    if (y < 326 || y > 332) wall[y * W + 407] = wall[y * W + 407] || hedgeT;
  }

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
          if (!cellFree(x, y)) continue;
          if (opts.onRoad && floor[(y | 0) * W + (x | 0)] !== F.ASPHALT) continue;
          props.push({ kind, x, y, solid: opts.solid !== false, r: opts.r || 0.5 });
          if (opts.pit && floor[(y | 0) * W + (x | 0)] === F.SIDEWALK)
            floor[(y | 0) * W + (x | 0)] = F.DIRT;      // escocell under street trees
        }
      }
    }
  }
  for (const s of STREETS) {
    if (s.trees) alongStreet(s, 11, s.w / 2 + 1.2, 'plane', { r: 0.45, pit: true });
    else if (!s.ped && !s.rambla)            // the newly replanted young trees
      alongStreet(s, 14, s.w / 2 + 1.2, 'sapling', { r: 0.3, pit: true });
    if (s.rambla) alongStreet(s, 9, 0, 'plane', { oneSide: true, r: 0.45 });
    if (!s.ped) alongStreet(s, 26, s.w / 2 + 1.7, 'lamp', { r: 0.25 });
    if (!s.ped && !s.rambla) alongStreet(s, 17, s.w / 2 - 0.8, 'car', { r: 1.1, onRoad: true });
    if (!s.ped && !s.rambla) alongStreet(s, 75, s.w / 2 + 2.1, 'bins', { oneSide: true, r: 1.3 });
    if (s.trees) alongStreet(s, 52, s.w / 2 - 0.7, 'moto', { oneSide: true, r: 0.6 });
    if (!s.ped) alongStreet(s, 47, s.w / 2 + 1.6, 'paperera', { oneSide: true, r: 0.2 });
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
  // terrace tables in front of the bar
  for (const [tx, ty] of [[145, 320], [148, 330], [143, 337], [148, 344]])
    if (cellFree(tx, ty)) props.push({ kind: 'taula', x: tx, y: ty, solid: true, r: 0.7 });
  // Centre Cultural: gardens behind, the square + park in front
  for (let i = 0; i < 10; i++) {
    const x = 342 + rnd() * 64, y = 324 + rnd() * 12;
    if (cellFree(x, y)) props.push({ kind: rnd() < 0.6 ? 'plane' : 'bench', x, y, solid: true, r: 0.5 });
  }
  for (let i = 0; i < 12; i++) {
    const x = 302 + rnd() * 30, y = 254 + rnd() * 52;
    if (cellFree(x, y) && floor[(y | 0) * W + (x | 0)] === F.GRASS)
      props.push({ kind: rnd() < 0.7 ? 'plane' : 'bench', x, y, solid: true, r: 0.5 });
  }
  for (const [bx, by] of [[344, 276], [374, 264], [404, 276], [358, 286], [390, 286]])
    if (cellFree(bx, by)) props.push({ kind: rnd() < 0.6 ? 'bench' : 'paperera', x: bx, y: by, solid: true, r: 0.4 });
  // the real bus stops of the barri
  props.push({ kind: 'busstop', x: 300, y: 74.5,  solid: false, r: 0.3 });
  props.push({ kind: 'busstop', x: 360, y: 134,   solid: false, r: 0.3 });

  // ---- gameplay placement ---------------------------------------------
  const start   = { x: 549, y: 224, a: Math.PI };   // Rbla. de les Bòbiles, by the Mercat
  const keySpot = { x: 225, y: 326 };               // inside the pavelló
  const portal  = { x: 107, y: 348 };               // forecourt of Crist Salvador

  const spawns = [
    { x: 374, y: 276, r: 12, n: 3, t: 'gos' },      // Pl. de les Cultures
    { x: 372, y: 226, r: 10, n: 2, t: 'diablot' },  // Pg. de Catalunya
    { x: 316, y: 280, r: 10, n: 2, t: 'diablot' },  // the park
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
    { t: 'coca', x: 522, y: 190 }, { t: 'coca', x: 300, y: 70 }, { t: 'coca', x: 80, y: 348 },
    { t: 'coca', x: 225, y: 340 }, { t: 'coca', x: 60, y: 360 },
    { t: 'vi', x: 412, y: 130 }, { t: 'vi', x: 268, y: 60 }, { t: 'vi', x: 200, y: 300 }, { t: 'vi', x: 100, y: 410 },
    { t: 'vi', x: 146, y: 325 },                      // a porró at the bar terrace
    { t: 'bales', x: 546, y: 100 }, { t: 'bales', x: 340, y: 60 }, { t: 'bales', x: 252, y: 250 },
    { t: 'bales', x: 374, y: 290 }, { t: 'coca', x: 374, y: 330 },   // plaça + jardins del C. Cultural
    { t: 'bales', x: 160, y: 258 }, { t: 'bales', x: 40, y: 308 },
    { t: 'cartutxos', x: 80, y: 283 }, { t: 'cartutxos', x: 225, y: 312 }, { t: 'cartutxos', x: 135, y: 380 },
  ];

  const labels = STREETS.map(s => {
    const [a, b] = [s.pts[0], s.pts[s.pts.length - 1]];
    return { name: s.name, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2,
             vert: Math.abs(b[0] - a[0]) < Math.abs(b[1] - a[1]) };
  }).concat(
    PLAZAS.map(p => ({ name: p.name, x: (p.x0 + p.x1) / 2, y: (p.y0 + p.y1) / 2 })),
    [{ name: 'Mercat Municipal', x: 516, y: 217 }, { name: 'Crist Salvador', x: 107, y: 326 },
     { name: 'IES Pompeu Fabra', x: 225, y: 264 }, { name: 'Pavelló', x: 225, y: 326 },
     { name: 'Ascensor', x: 30, y: 292 }, { name: 'Centre Cultural', x: 374, y: 307 },
     { name: 'Pl. de les Cultures', x: 374, y: 276 }]);

  return { W, H, wall, floor, types, F, props, start, keySpot, portal, spawns, pickups, labels };
})();
