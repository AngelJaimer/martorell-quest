/* =====================================================================
 *  MARTORELL QUEST  ·  art.js
 *  SNES-era ("A Link to the Past"-ish) rendering toolkit — still 100%
 *  code-drawn, no external assets. Provides:
 *    · deterministic per-tile noise (so detail is stable, not flickering)
 *    · a pre-rendered, textured terrain layer (drawn once, then blitted)
 *    · animated water highlights, detailed trees, lamps and buildings
 *    · an animated hero and animated imps, drawn from primitives
 *    · a night-time lighting pass with warm light pools
 *
 *  Everything here is pure drawing; game state lives in game.js.
 * ===================================================================== */

const ART = (() => {
  'use strict';

  /* ---- deterministic helpers ------------------------------------- */
  // Stable hash -> [0,1) for a tile/coord, so textures never shimmer.
  function hash(x, y, s = 0) {
    let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
    h = (h ^ (h >>> 13)) * 1274126177 >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---- palette --------------------------------------------------- */
  const PAL = {
    grass1: '#5a9b46', grass2: '#6cae54', grass3: '#7cbf61', grassDk: '#4a8639',
    park1:  '#3f8a3c', park2:  '#4f9c45',
    dirt1:  '#c2a06a', dirt2:  '#b3925c', dirtDk: '#94733f',
    cobble: '#bdb7a6', cobbleDk: '#9a9483', grout: '#807a6b',
    water1: '#2f6fc4', water2: '#3f86d8', waterDk: '#235aa6', foam: '#cfe7ff',
    sand1:  '#e4cf94', sand2:  '#d8be7e',
    plank1: '#b07b43', plank2: '#9a6836', plankDk: '#7d5328',
    rock1:  '#8d8474', rock2:  '#a39a88', rockDk: '#6a6356',
    concrete: '#b9bcc2',
  };

  /* ---- tiny shading helpers -------------------------------------- */
  function speckle(ctx, sx, sy, x, y, n, colA, colB) {
    for (let i = 0; i < n; i++) {
      const r = hash(x, y, i + 11);
      const px = sx + Math.floor(r * 30) + 1;
      const py = sy + Math.floor(hash(x, y, i + 53) * 30) + 1;
      ctx.fillStyle = r > 0.5 ? colA : colB;
      ctx.fillRect(px, py, 2, 2);
    }
  }

  /* =================================================================
   *  GROUND TILES  (drawn once into the offscreen terrain canvas)
   * =============================================================== */
  function drawGround(ctx, map, TILE, MAP_W, MAP_H, tk, sx, sy, x, y) {
    const at = (xx, yy) => (xx < 0 || yy < 0 || xx >= MAP_W || yy >= MAP_H) ? 'M' : map[yy][xx];

    switch (tk) {
      case 'W': { // water with depth + baked foam shoreline
        const g = ctx.createLinearGradient(sx, sy, sx, sy + TILE);
        g.addColorStop(0, PAL.water2); g.addColorStop(1, PAL.waterDk);
        ctx.fillStyle = g; ctx.fillRect(sx, sy, TILE, TILE);
        // subtle still ripples baked in
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        for (let i = 0; i < 3; i++) {
          const ry = sy + 4 + Math.floor(hash(x, y, i) * 24);
          ctx.fillRect(sx + 3, ry, TILE - 6, 1);
        }
        // foam where a non-water tile is adjacent
        ctx.fillStyle = PAL.foam;
        const isLand = (t) => t !== 'W';
        if (isLand(at(x, y - 1))) ctx.fillRect(sx, sy, TILE, 3);
        if (isLand(at(x, y + 1))) ctx.fillRect(sx, sy + TILE - 3, TILE, 3);
        if (isLand(at(x - 1, y))) ctx.fillRect(sx, sy, 3, TILE);
        if (isLand(at(x + 1, y))) ctx.fillRect(sx + TILE - 3, sy, 3, TILE);
        break;
      }
      case '#': { // sandy shore
        ctx.fillStyle = PAL.sand1; ctx.fillRect(sx, sy, TILE, TILE);
        speckle(ctx, sx, sy, x, y, 10, PAL.sand2, '#c9ad6c');
        break;
      }
      case 'R': case 'D': { // dirt path/road (D = doorway approach)
        ctx.fillStyle = PAL.dirt2; ctx.fillRect(sx, sy, TILE, TILE);
        const g = ctx.createLinearGradient(sx, sy, sx, sy + TILE);
        g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.06)');
        ctx.fillStyle = g; ctx.fillRect(sx, sy, TILE, TILE);
        speckle(ctx, sx, sy, x, y, 7, PAL.dirt1, PAL.dirtDk);
        // worn grassy edge where path meets grass
        ctx.fillStyle = 'rgba(90,150,70,0.5)';
        if (at(x, y - 1) === 'G') ctx.fillRect(sx, sy, TILE, 2);
        if (at(x, y + 1) === 'G') ctx.fillRect(sx, sy + TILE - 2, TILE, 2);
        if (at(x - 1, y) === 'G') ctx.fillRect(sx, sy, 2, TILE);
        if (at(x + 1, y) === 'G') ctx.fillRect(sx + TILE - 2, sy, 2, TILE);
        break;
      }
      case 'S': { // cobblestone plaza
        ctx.fillStyle = PAL.grout; ctx.fillRect(sx, sy, TILE, TILE);
        for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) {
          const off = (cy % 2) * 4;
          const bx = sx + cx * 16 + off, by = sy + cy * 16;
          const shade = hash(x, y, cx * 2 + cy) > 0.5 ? PAL.cobble : PAL.cobbleDk;
          ctx.fillStyle = shade;
          roundRect(ctx, bx + 1, by + 1, 14, 14, 3); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.10)';
          ctx.fillRect(bx + 2, by + 2, 11, 2);
        }
        break;
      }
      case '~': { // wooden bridge planks
        ctx.fillStyle = PAL.plankDk; ctx.fillRect(sx, sy, TILE, TILE);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 ? PAL.plank2 : PAL.plank1;
          ctx.fillRect(sx, sy + i * 8 + 1, TILE, 6);
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          ctx.fillRect(sx, sy + i * 8 + 7, TILE, 1);
        }
        // bolts
        ctx.fillStyle = '#5d3f1f';
        ctx.fillRect(sx + 3, sy + 3, 2, 2); ctx.fillRect(sx + TILE - 5, sy + 3, 2, 2);
        break;
      }
      case 'M': { // rocky hill / cliff
        ctx.fillStyle = PAL.rockDk; ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = PAL.rock1;
        roundRect(ctx, sx + 1, sy + 1, TILE - 2, TILE - 2, 4); ctx.fill();
        ctx.fillStyle = PAL.rock2;
        ctx.fillRect(sx + 3, sy + 3, TILE - 10, 3);
        speckle(ctx, sx, sy, x, y, 6, PAL.rockDk, '#7c7466');
        // bright top lip if open above
        if (at(x, y - 1) !== 'M') { ctx.fillStyle = '#b9b1a0'; ctx.fillRect(sx, sy, TILE, 3); }
        break;
      }
      case 'F': { // factory floor — concrete
        ctx.fillStyle = PAL.concrete; ctx.fillRect(sx, sy, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.strokeRect(sx + 0.5, sy + 0.5, TILE - 1, TILE - 1);
        break;
      }
      case 'P': { // lush park grass
        grassBase(ctx, x, y, sx, sy, TILE, PAL.park1, PAL.park2);
        if (hash(x, y, 7) > 0.55) bush(ctx, sx + 8, sy + 10);
        break;
      }
      default: { // 'G', 'B', 'T' (sprites drawn on top) -> grass base
        grassBase(ctx, x, y, sx, sy, TILE, PAL.grass1, PAL.grass2);
        const r = hash(x, y, 3);
        if (r > 0.93) flower(ctx, sx + 8 + r * 12, sy + 9 + hash(x, y, 9) * 12, x, y);
        else if (r > 0.7) { // grass tuft
          ctx.strokeStyle = PAL.grassDk; ctx.lineWidth = 1;
          const tx = sx + 6 + hash(x, y, 4) * 18, ty = sy + 24;
          ctx.beginPath();
          ctx.moveTo(tx, ty); ctx.lineTo(tx - 2, ty - 5);
          ctx.moveTo(tx, ty); ctx.lineTo(tx + 1, ty - 6);
          ctx.moveTo(tx, ty); ctx.lineTo(tx + 3, ty - 4); ctx.stroke();
        }
        break;
      }
    }
  }

  function grassBase(ctx, x, y, sx, sy, TILE, c1, c2) {
    // 2x2 checker of greens + speckle for a woven look
    for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) {
      ctx.fillStyle = ((cx + cy + Math.floor(hash(x, y, 1) * 2)) % 2) ? c1 : c2;
      ctx.fillRect(sx + cx * 16, sy + cy * 16, 16, 16);
    }
    speckle(ctx, sx, sy, x, y, 5, PAL.grass3, PAL.grassDk);
  }

  function flower(ctx, cx, cy, x, y) {
    const cols = ['#ef5350', '#ffee58', '#ffffff', '#ab47bc'];
    const c = cols[Math.floor(hash(x, y, 21) * cols.length)];
    ctx.fillStyle = c;
    ctx.fillRect(cx - 1, cy - 2, 2, 2); ctx.fillRect(cx - 3, cy, 2, 2);
    ctx.fillRect(cx + 1, cy, 2, 2); ctx.fillRect(cx - 1, cy + 2, 2, 2);
    ctx.fillStyle = '#ffd54f'; ctx.fillRect(cx - 1, cy, 2, 2);
  }

  function bush(ctx, cx, cy) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(cx + 1, cy + 9, 9, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2f7d36';
    ctx.beginPath(); ctx.arc(cx - 3, cy + 3, 6, 0, 7); ctx.arc(cx + 4, cy + 3, 6, 0, 7);
    ctx.arc(cx, cy, 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#3f9647'; ctx.beginPath(); ctx.arc(cx - 2, cy - 1, 4, 0, 7); ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* =================================================================
   *  TERRAIN PRE-RENDER  — draw the whole map once, then blit
   * =============================================================== */
  function buildTerrain(map, TILE, MAP_W, MAP_H) {
    const cv = document.createElement('canvas');
    cv.width = MAP_W * TILE; cv.height = MAP_H * TILE;
    const c = cv.getContext('2d');
    for (let y = 0; y < MAP_H; y++)
      for (let x = 0; x < MAP_W; x++)
        drawGround(c, map, TILE, MAP_W, MAP_H, map[y][x], x * TILE, y * TILE, x, y);
    return cv;
  }

  /* ---- animated water overlay (per visible water tile) ----------- */
  function waterOverlay(ctx, sx, sy, x, y, TILE, time) {
    const t = time / 600 + (x + y) * 0.6;
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    const yy = sy + 6 + (Math.sin(t) * 0.5 + 0.5) * (TILE - 12);
    ctx.fillRect(sx + 4, Math.floor(yy), TILE - 8, 1);
    const yy2 = sy + 6 + (Math.sin(t + 2) * 0.5 + 0.5) * (TILE - 12);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(sx + 6, Math.floor(yy2), TILE - 14, 1);
  }

  /* =================================================================
   *  TREE  (sprite, depth-sorted in game.js)
   * =============================================================== */
  function drawTree(ctx, cx, by, time, seed) {
    const sway = Math.sin(time / 900 + seed) * 1.5;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(cx, by - 1, 15, 5, 0, 0, 7); ctx.fill();
    // trunk
    ctx.fillStyle = '#6b4a2b'; ctx.fillRect(cx - 4, by - 16, 8, 16);
    ctx.fillStyle = '#5a3c22'; ctx.fillRect(cx + 1, by - 16, 3, 16);
    // canopy — layered blobs
    const top = by - 16;
    const blob = (ox, oy, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx + ox + sway, top + oy, r, 0, 7); ctx.fill(); };
    blob(-9, -8, 11, '#256a2c'); blob(9, -8, 11, '#256a2c');
    blob(0, -16, 13, '#2f7d34'); blob(-6, -10, 10, '#358a3b'); blob(6, -10, 10, '#358a3b');
    blob(-2, -20, 8, '#43a04a');
    // highlights
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.arc(cx - 4 + sway, top - 18, 5, 0, 7); ctx.fill();
  }

  /* =================================================================
   *  LAMP POST  (sprite + light source registered separately)
   * =============================================================== */
  function drawLamp(ctx, cx, by, time) {
    const flick = 0.85 + Math.sin(time / 90 + cx) * 0.05 + Math.random() * 0.04;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(cx, by - 1, 6, 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b2f36'; ctx.fillRect(cx - 2, by - 26, 4, 26);
    ctx.fillStyle = '#3a3f47'; ctx.fillRect(cx - 1, by - 26, 1, 26);
    ctx.fillStyle = '#1f242b'; ctx.fillRect(cx - 5, by - 32, 10, 7);
    // glowing glass
    ctx.fillStyle = `rgba(255,210,120,${flick})`;
    roundRect(ctx, cx - 4, by - 31, 8, 5, 2); ctx.fill();
    ctx.fillStyle = `rgba(255,245,200,${flick})`; ctx.fillRect(cx - 2, by - 30, 3, 3);
    // soft local glow
    const g = ctx.createRadialGradient(cx, by - 28, 1, cx, by - 28, 22);
    g.addColorStop(0, `rgba(255,210,120,${0.28 * flick})`); g.addColorStop(1, 'rgba(255,210,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, by - 28, 22, 0, 7); ctx.fill();
  }

  /* =================================================================
   *  BUILDING  (sprite with roof, walls, windows, sign)
   * =============================================================== */
  function drawBuilding(ctx, L, bx, by, bw, bh, time) {
    const roofH = Math.min(22, Math.floor(bh * 0.42));
    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(bx + 4, by + bh - 4, bw, 8);
    // wall
    const wallTop = by + roofH;
    const wg = ctx.createLinearGradient(bx, wallTop, bx, by + bh);
    wg.addColorStop(0, shade(L.color, 1.06)); wg.addColorStop(1, shade(L.color, 0.82));
    ctx.fillStyle = wg; ctx.fillRect(bx, wallTop, bw, bh - roofH);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, wallTop + 0.5, bw - 1, bh - roofH - 1);
    // windows (warm-lit at night)
    const lit = '#ffd982';
    for (let wx = bx + 8; wx < bx + bw - 12; wx += 22) {
      ctx.fillStyle = '#2a3340'; ctx.fillRect(wx, wallTop + 8, 11, 12);
      ctx.fillStyle = lit; ctx.fillRect(wx + 1, wallTop + 9, 9, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(wx + 5, wallTop + 9, 1, 10);
      ctx.fillRect(wx + 1, wallTop + 13, 9, 1);
    }
    // door
    const dx = bx + bw / 2 - 7;
    ctx.fillStyle = '#5a3a1e'; roundRect(ctx, dx, by + bh - 18, 14, 18, 3); ctx.fill();
    ctx.fillStyle = '#6e4a28'; ctx.fillRect(dx + 2, by + bh - 16, 10, 14);
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(dx + 9, by + bh - 9, 2, 2);
    // roof (pitched)
    ctx.fillStyle = shade(L.roof || '#7a3b2e', 1.0);
    ctx.beginPath();
    ctx.moveTo(bx - 3, wallTop); ctx.lineTo(bx + bw / 2, by - 4);
    ctx.lineTo(bx + bw + 3, wallTop); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.moveTo(bx + bw / 2, by - 4); ctx.lineTo(bx + bw + 3, wallTop);
    ctx.lineTo(bx + bw / 2, wallTop); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.moveTo(bx - 3, wallTop); ctx.lineTo(bx + bw / 2, by - 4); ctx.lineTo(bx + bw + 3, wallTop); ctx.stroke();
    // landmark icon on the roof peak
    drawIcon(ctx, L.icon, bx + bw / 2, by - 4, time);
  }

  function drawIcon(ctx, icon, cx, top, time) {
    ctx.save(); ctx.translate(cx, top);
    switch (icon) {
      case 'tower':
        ctx.fillStyle = '#7a4a1f'; ctx.fillRect(-7, -26, 14, 26);
        ctx.fillStyle = '#caa84e'; ctx.fillRect(-7, -26, 14, 4);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -16, 6, 0, 7); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(0, -16); ctx.lineTo(0, -20); ctx.moveTo(0, -16); ctx.lineTo(4, -16); ctx.stroke(); break;
      case 'church': case 'chapel':
        ctx.fillStyle = '#7a4a1f'; ctx.fillRect(-2, -34, 4, 12); ctx.fillRect(-6, -30, 12, 3); break;
      case 'townhall':
        ctx.fillStyle = '#caa84e'; ctx.fillRect(-3, -16, 6, 6);
        ctx.fillStyle = '#a8862f'; ctx.beginPath(); ctx.arc(0, -16, 5, Math.PI, 0); ctx.fill(); break;
      case 'market':
        for (let i = -12; i < 12; i += 8) { ctx.fillStyle = i % 16 ? '#e07a3e' : '#fff'; ctx.fillRect(i, -12, 8, 8); } break;
      case 'museum':
        ctx.fillStyle = '#efe7d2'; for (let i = -12; i < 12; i += 7) ctx.fillRect(i, -16, 4, 16);
        ctx.fillStyle = '#8e7cc3'; ctx.beginPath(); ctx.moveTo(-15, -16); ctx.lineTo(0, -22); ctx.lineTo(15, -16); ctx.closePath(); ctx.fill(); break;
      case 'factory': {
        ctx.fillStyle = '#3f5a78'; ctx.fillRect(8, -28, 6, 14);
        const p = (time / 200) % 1;
        ctx.fillStyle = `rgba(180,180,190,${0.4 - p * 0.4})`;
        ctx.beginPath(); ctx.arc(11, -30 - p * 8, 4 + p * 4, 0, 7); ctx.fill(); break;
      }
      case 'station':
        ctx.fillStyle = '#3a4250'; ctx.fillRect(-14, -8, 28, 8);
        ctx.fillStyle = '#ffd34d'; ctx.fillRect(-10, -6, 4, 3); ctx.fillRect(6, -6, 4, 3); break;
      case 'bakery':
        ctx.fillStyle = '#e8b04b'; ctx.beginPath(); ctx.arc(0, -10, 9, 0, 7); ctx.fill();
        ctx.fillStyle = '#a8742a'; ctx.fillRect(-7, -11, 14, 2); break;
      case 'bar':
        ctx.fillStyle = '#c0504d'; ctx.fillRect(-9, -12, 18, 12);
        ctx.fillStyle = '#fff'; ctx.fillRect(-6, -10, 4, 8); ctx.fillRect(2, -10, 4, 8); break;
      case 'house': // residential barri — little gabled house
        ctx.fillStyle = '#e0cda2'; ctx.fillRect(-9, -10, 18, 10);
        ctx.fillStyle = '#9a4636'; ctx.beginPath();
        ctx.moveTo(-11, -10); ctx.lineTo(0, -19); ctx.lineTo(11, -10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#7a4a1f'; ctx.fillRect(-3, -7, 6, 7);
        ctx.fillStyle = '#ffd982'; ctx.fillRect(4, -8, 4, 4); break;
      case 'warehouse': // industrial estate — wide sawtooth roof
        ctx.fillStyle = '#9aa1a8'; ctx.fillRect(-13, -10, 26, 10);
        ctx.fillStyle = '#54616f';
        for (let i = -13; i < 13; i += 9) { ctx.beginPath(); ctx.moveTo(i, -10); ctx.lineTo(i + 5, -16); ctx.lineTo(i + 9, -10); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = '#2a3340'; ctx.fillRect(-3, -7, 6, 7); break;
      case 'kiln': { // old brick kiln (bòbila) with rising smoke
        ctx.fillStyle = '#a0522d'; ctx.beginPath(); ctx.arc(0, -2, 11, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#8a4424'; for (let i = -8; i <= 6; i += 4) ctx.fillRect(i, -10, 2, 9);
        ctx.fillStyle = '#7a3b1f'; ctx.fillRect(-3, -22, 6, 12);
        const p = (time / 240) % 1;
        ctx.fillStyle = `rgba(120,120,120,${0.45 - p * 0.45})`;
        ctx.beginPath(); ctx.arc(0, -24 - p * 9, 4 + p * 4, 0, 7); ctx.fill(); break;
      }
    }
    ctx.restore();
  }

  // multiply a hex color by a factor (for quick light/dark shading)
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r * f)));
    g = Math.max(0, Math.min(255, Math.round(g * f)));
    b = Math.max(0, Math.min(255, Math.round(b * f)));
    return `rgb(${r},${g},${b})`;
  }

  /* =================================================================
   *  HERO  — 4-direction, walk cycle + sword swing
   *  Drawn relative to the player's top-left (px,py); box ~20x24.
   * =============================================================== */
  function drawHero(ctx, px, py, dir, walk, attack /*0..1 or 0*/) {
    const cx = px + 10;                 // sprite centre x
    const moving = walk !== null;
    const phase = moving ? Math.sin(walk) : 0;
    const bob = moving ? Math.abs(Math.sin(walk)) * 1.5 : 0;
    const top = py - 2 - bob;

    // drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(cx, py + 24, 11, 4, 0, 0, 7); ctx.fill();

    // back arm/shield depending on facing handled inline
    const C = { tunic: '#2f9e44', tunicDk: '#1f6e2c', tunicLt: '#46b85a',
                skin: '#f1c393', skinDk: '#d7a169', hair: '#7a4a1f',
                boot: '#5a3a1a', belt: '#4a2f15', cap: '#268a3a',
                blade: '#e6eef4', hilt: '#caa23e', shield: '#c9d2db', shieldEdge: '#8c97a3' };

    // legs (alternate)
    const lly = py + 16, lift = phase * 2.5;
    ctx.fillStyle = C.boot;
    ctx.fillRect(px + 4, lly - lift, 5, 8);
    ctx.fillRect(px + 11, lly + lift, 5, 8);

    if (dir === 'up') {
      // body (back)
      ctx.fillStyle = C.tunic; ctx.fillRect(px + 3, top + 8, 14, 12);
      ctx.fillStyle = C.tunicDk; ctx.fillRect(px + 3, top + 16, 14, 4);
      ctx.fillStyle = C.belt; ctx.fillRect(px + 3, top + 15, 14, 2);
      // head from behind
      ctx.fillStyle = C.skin; ctx.fillRect(px + 5, top + 1, 11, 9);
      ctx.fillStyle = C.hair; ctx.fillRect(px + 4, top, 13, 6);
      ctx.fillStyle = C.cap;  ctx.fillRect(px + 3, top - 2, 15, 5);
      ctx.fillStyle = C.tunicLt; ctx.fillRect(px + 13, top - 4, 5, 6); // cap tip
    } else if (dir === 'down') {
      ctx.fillStyle = C.tunic; ctx.fillRect(px + 3, top + 8, 14, 12);
      ctx.fillStyle = C.tunicLt; ctx.fillRect(px + 3, top + 8, 3, 12);
      ctx.fillStyle = C.belt; ctx.fillRect(px + 3, top + 15, 14, 2);
      ctx.fillStyle = '#caa23e'; ctx.fillRect(px + 8, top + 15, 4, 2); // buckle
      // head
      ctx.fillStyle = C.skin; ctx.fillRect(px + 5, top + 1, 11, 9);
      ctx.fillStyle = C.skinDk; ctx.fillRect(px + 5, top + 8, 11, 1);
      ctx.fillStyle = C.hair; ctx.fillRect(px + 4, top, 13, 4); ctx.fillRect(px + 4, top + 3, 3, 4); ctx.fillRect(px + 14, top + 3, 3, 4);
      ctx.fillStyle = C.cap;  ctx.fillRect(px + 3, top - 2, 15, 4);
      ctx.fillStyle = C.tunicLt; ctx.fillRect(px - 1, top - 3, 5, 5);
      ctx.fillStyle = '#222'; ctx.fillRect(px + 7, top + 5, 2, 2); ctx.fillRect(px + 12, top + 5, 2, 2);
    } else { // left / right — mirror via flip
      const flip = dir === 'left';
      ctx.save();
      if (flip) { ctx.translate(px + 20, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
      ctx.fillStyle = C.tunic; ctx.fillRect(px + 4, top + 8, 12, 12);
      ctx.fillStyle = C.tunicDk; ctx.fillRect(px + 4, top + 8, 3, 12);
      ctx.fillStyle = C.belt; ctx.fillRect(px + 4, top + 15, 12, 2);
      ctx.fillStyle = C.skin; ctx.fillRect(px + 5, top + 1, 10, 9);
      ctx.fillStyle = C.hair; ctx.fillRect(px + 4, top, 12, 4); ctx.fillRect(px + 4, top + 3, 3, 5);
      ctx.fillStyle = C.cap;  ctx.fillRect(px + 4, top - 2, 13, 4);
      ctx.fillStyle = C.tunicLt; ctx.fillRect(px - 1, top - 3, 5, 5);
      ctx.fillStyle = '#222'; ctx.fillRect(px + 12, top + 5, 2, 2); // eye on facing side
      // shield on back arm
      ctx.fillStyle = C.shieldEdge; ctx.fillRect(px + 3, top + 10, 4, 8);
      ctx.fillStyle = C.shield; ctx.fillRect(px + 3, top + 11, 3, 6);
      ctx.restore();
    }

    // sword swing arc
    if (attack) drawSwing(ctx, cx, py + 12, dir, attack, C);
  }

  function drawSwing(ctx, cx, cy, dir, a /*0..1*/, C) {
    // a goes 1 -> 0 over the swing; sweep a crescent across the facing arc
    const base = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[dir];
    const ang = base + (a - 0.5) * 2.2;          // sweep ~125°
    const r = 22;
    const tx = cx + Math.cos(ang) * r, ty = cy + Math.sin(ang) * r;
    // arc trail
    ctx.strokeStyle = `rgba(220,240,255,${a * 0.7})`;
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, base - 1.1, ang); ctx.stroke();
    ctx.lineWidth = 1;
    // blade
    ctx.strokeStyle = C.blade; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * 6, cy + Math.sin(ang) * 6); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.fillStyle = C.hilt; ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * 6, cy + Math.sin(ang) * 6, 2.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tx, ty, 2, 0, 7); ctx.fill();
    ctx.lineWidth = 1;
  }

  /* =================================================================
   *  IMP  (diablillo) — flapping wings, glowing eyes
   * =============================================================== */
  function drawImp(ctx, ex, ey, time, seed) {
    const cx = ex + 11, bob = Math.sin(time / 200 + seed) * 2;
    const cy = ey + 12 + bob;
    const flap = Math.sin(time / 80 + seed) * 0.5;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(cx, ey + 22, 9, 3, 0, 0, 7); ctx.fill();
    // wings
    ctx.fillStyle = '#5a0f0f';
    ctx.save(); ctx.translate(cx, cy);
    ctx.rotate(-0.5 - flap);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-14, -4, -10, 6); ctx.quadraticCurveTo(-6, 2, 0, 4); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(cx, cy);
    ctx.rotate(0.5 + flap);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(14, -4, 10, 6); ctx.quadraticCurveTo(6, 2, 0, 4); ctx.fill();
    ctx.restore();
    // body
    const g = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, 11);
    g.addColorStop(0, '#d6463b'); g.addColorStop(1, '#9c211b');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 7); ctx.fill();
    // horns
    ctx.fillStyle = '#3a0c0c';
    ctx.beginPath(); ctx.moveTo(cx - 7, cy - 6); ctx.lineTo(cx - 9, cy - 12); ctx.lineTo(cx - 4, cy - 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 7, cy - 6); ctx.lineTo(cx + 9, cy - 12); ctx.lineTo(cx + 4, cy - 8); ctx.fill();
    // eyes (glowing)
    ctx.fillStyle = '#fff2a8';
    ctx.fillRect(cx - 5, cy - 2, 3, 3); ctx.fillRect(cx + 2, cy - 2, 3, 3);
    ctx.fillStyle = '#000'; ctx.fillRect(cx - 4, cy - 1, 1, 1); ctx.fillRect(cx + 3, cy - 1, 1, 1);
    // grin
    ctx.strokeStyle = '#3a0c0c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 3, cy + 4); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx + 3, cy + 4); ctx.stroke();
  }

  /* =================================================================
   *  STARFIELD (for menu)
   * =============================================================== */
  function stars(ctx, w, h, time) {
    for (let i = 0; i < 70; i++) {
      const x = hash(i, 1) * w, y = hash(i, 2) * h * 0.55;
      const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time / 500 + i));
      ctx.fillStyle = `rgba(255,255,255,${tw})`;
      ctx.fillRect(x, y, hash(i, 3) > 0.85 ? 2 : 1, 1);
    }
  }

  return { hash, lerp, buildTerrain, waterOverlay, drawTree, drawLamp,
           drawBuilding, drawIcon, drawHero, drawImp, stars, shade, roundRect };
})();
