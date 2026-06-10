/* ============================================================
 *  MARTODOOM · art3d.js — procedural textures & sprites.
 *  No assets: every facade, demon and pickup is drawn in code,
 *  same philosophy as the Zelda-like in this repo.
 * ============================================================ */
'use strict';

const ART3D = (() => {
  const PXM = 24;                       // texture pixels per metre (vertical)
  const MODULE_M = 8, MODULE_PX = 256;  // facade repeats every 8 m horizontally

  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, Math.max(0, ((n >> 16) & 255) * f)) | 0;
    const g = Math.min(255, Math.max(0, ((n >> 8) & 255) * f)) | 0;
    const b = Math.min(255, Math.max(0, (n & 255) * f)) | 0;
    return `rgb(${r},${g},${b})`;
  }
  let s_ = 99991;
  const rnd = () => (s_ = (s_ * 16807) % 2147483647) / 2147483647;

  /* ---------------- facades ---------------- */
  function windowAt(g, x, y, w, h, opts = {}) {
    g.fillStyle = '#26303d'; g.fillRect(x, y, w, h);                       // glass
    g.fillStyle = 'rgba(140,170,200,.35)'; g.fillRect(x + 2, y + 2, w / 2 - 2, h - 4);
    if (opts.persiana && rnd() < 0.45) {                                   // half-drawn blind
      const ph = (0.3 + rnd() * 0.6) * h;
      g.fillStyle = '#d8cfb4'; g.fillRect(x, y, w, ph);
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1;
      for (let yy = y + 3; yy < y + ph; yy += 3) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
    }
    g.strokeStyle = opts.frame || '#f0ead8'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
  }

  function buildFacade(def) {
    const hpx = Math.max(1, Math.round(def.h * PXM));
    const c = cv(MODULE_PX, hpx), g = c.getContext('2d');
    const base = def.c || '#cccccc';
    g.fillStyle = base; g.fillRect(0, 0, MODULE_PX, hpx);

    const floorPx = 3 * PXM;
    const floors = Math.max(1, Math.round(def.h / 3));
    const gy = f => hpx - (f + 1) * floorPx;                 // top y of storey f (0 = ground)

    if (def.mat === 'brick') {
      // running-bond brick + light mortar
      g.fillStyle = shade(base, 0.86);
      for (let y = 0; y < hpx; y += 8)
        for (let x = (y / 8 % 2) * 12; x < MODULE_PX; x += 24) g.fillRect(x, y, 22, 6);
      g.fillStyle = 'rgba(255,255,255,.07)';
      for (let y = 6; y < hpx; y += 8) g.fillRect(0, y, MODULE_PX, 1);
    } else if (def.mat === 'stucco') {
      g.fillStyle = shade(base, 0.95);
      for (let i = 0; i < 90; i++) g.fillRect(rnd() * MODULE_PX, rnd() * hpx, 2 + rnd() * 3, 2);
      g.fillStyle = shade(base, 1.06);
      for (let i = 0; i < 60; i++) g.fillRect(rnd() * MODULE_PX, rnd() * hpx, 2, 2);
    } else if (def.mat === 'metal') {
      for (let x = 0; x < MODULE_PX; x += 10) { g.fillStyle = x % 20 ? shade(base, 0.9) : shade(base, 1.05); g.fillRect(x, 0, 10, hpx); }
    } else if (def.mat === 'pines') {
      // forest edge: layered dark pines
      g.fillStyle = '#22381f'; g.fillRect(0, 0, MODULE_PX, hpx);
      for (let i = 0; i < 14; i++) {
        const x = rnd() * MODULE_PX, w = 30 + rnd() * 50, top = rnd() * hpx * 0.45;
        g.fillStyle = ['#2e4a30', '#27412a', '#365538'][i % 3];
        g.beginPath(); g.moveTo(x, top); g.lineTo(x - w / 2, hpx); g.lineTo(x + w / 2, hpx); g.fill();
      }
      g.fillStyle = '#3b2a1a';
      for (let i = 0; i < 6; i++) g.fillRect(rnd() * MODULE_PX, hpx * 0.75, 5, hpx * 0.25);
      return { lit: c, dark: darken(c) };
    } else if (def.mat === 'fence') {
      // hedge + chain-link suggestion
      g.fillStyle = '#41543c'; g.fillRect(0, 0, MODULE_PX, hpx);
      g.fillStyle = '#567050';
      for (let i = 0; i < 120; i++) g.fillRect(rnd() * MODULE_PX, rnd() * hpx, 3, 3);
      g.strokeStyle = 'rgba(190,200,190,.5)'; g.lineWidth = 1;
      for (let x = 0; x < MODULE_PX; x += 14) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 10, hpx); g.stroke(); }
      return { lit: c, dark: darken(c) };
    }

    if (def.mat === 'church') {
      if (def.tower) {       // campanar: long slit windows + bells + cross
        g.fillStyle = '#1d2630';
        g.fillRect(MODULE_PX * 0.42, hpx * 0.08, MODULE_PX * 0.16, hpx * 0.16);
        for (let i = 0; i < 3; i++) g.fillRect(MODULE_PX * (0.25 + i * 0.2), hpx * 0.45, 14, hpx * 0.3);
        g.fillStyle = '#caa84a'; g.beginPath(); g.arc(MODULE_PX * 0.5, hpx * 0.13, 9, 0, 7); g.fill();
        g.fillStyle = '#e8e2d2';
        g.fillRect(MODULE_PX * 0.49, hpx * 0.0, 6, hpx * 0.05); g.fillRect(MODULE_PX * 0.45, hpx * 0.012, 26, 5);
      } else {               // nau: portal arch + creu + rosassa
        g.fillStyle = shade(def.c, 0.92); g.fillRect(0, hpx - 8, MODULE_PX, 8);
        g.fillStyle = '#3a2d22';
        g.beginPath(); g.arc(MODULE_PX / 2, hpx - 10, 34, Math.PI, 0); g.fill();
        g.fillRect(MODULE_PX / 2 - 34, hpx - 10, 68, 10);
        g.fillStyle = '#8a6b4a'; g.fillRect(MODULE_PX / 2 - 3, hpx - 64, 6, 54);
        g.fillStyle = '#b3552e'; g.beginPath(); g.arc(MODULE_PX / 2, hpx * 0.3, 20, 0, 7); g.fill();
        g.fillStyle = '#f3e9c8'; g.beginPath(); g.arc(MODULE_PX / 2, hpx * 0.3, 14, 0, 7); g.fill();
        g.fillStyle = '#8a3320';
        g.fillRect(MODULE_PX / 2 - 4, hpx * 0.3 - 13, 8, 26); g.fillRect(MODULE_PX / 2 - 13, hpx * 0.3 - 4, 26, 8);
        for (const sx of [0.12, 0.88]) {
          g.fillStyle = '#26303d'; g.fillRect(MODULE_PX * sx - 7, hpx * 0.35, 14, hpx * 0.4);
        }
      }
      return { lit: c, dark: darken(c) };
    }

    // ---- generic housing: windows / balconies / ground floor ----
    for (let f = 1; f < floors; f++) {
      const y = gy(f) + 14;
      for (let i = 0; i < 3; i++) {
        const x = 26 + i * 82;
        windowAt(g, x, y, 34, floorPx - 30, { persiana: true });
        if (def.mat === 'brick' && f % 2 === 1) {     // balcony rail
          g.fillStyle = 'rgba(20,24,28,.8)'; g.fillRect(x - 8, y + floorPx - 34, 50, 3);
          for (let bx = x - 8; bx <= x + 42; bx += 6) g.fillRect(bx, y + floorPx - 34, 2, 12);
        }
      }
    }
    // ground floor
    const gyy = gy(0);
    if (def.shops) {
      g.fillStyle = '#1c2228'; g.fillRect(14, gyy + 20, 100, floorPx - 26);
      g.fillStyle = '#1c2228'; g.fillRect(142, gyy + 20, 100, floorPx - 26);
      g.fillStyle = 'rgba(150,190,220,.25)'; g.fillRect(18, gyy + 24, 44, floorPx - 34);
      g.fillStyle = pick(['#a8503c', '#3c6e58', '#7a5a86']);
      g.fillRect(10, gyy + 8, 108, 14); g.fillRect(138, gyy + 8, 108, 14);   // awnings
    } else {
      g.fillStyle = '#4a3526'; g.fillRect(36, gyy + 18, 30, floorPx - 18);   // door
      g.fillStyle = '#caa84a'; g.fillRect(58, gyy + floorPx / 2, 3, 6);
      windowAt(g, 110, gyy + 20, 34, floorPx - 40, { persiana: true });
      windowAt(g, 186, gyy + 20, 34, floorPx - 40, { persiana: true });
    }
    if (def.sign) {
      g.fillStyle = 'rgba(245,240,225,.92)'; g.fillRect(0, gyy + 1, MODULE_PX, 16);
      g.fillStyle = '#2d2620'; g.font = 'bold 12px monospace'; g.textAlign = 'center';
      g.fillText(def.sign, MODULE_PX / 2, gyy + 13);
    }
    // top cornice
    g.fillStyle = shade(base, 0.8); g.fillRect(0, 0, MODULE_PX, 4);
    return { lit: c, dark: darken(c) };
  }

  function pick(a) { return a[(rnd() * a.length) | 0]; }
  function darken(src) {
    const c = cv(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.fillStyle = 'rgba(10,8,20,.30)'; g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  /* ---------------- sky: dusk over the Baix Llobregat ---------------- */
  function buildSky() {
    const w = 2048, h = 420, c = cv(w, h), g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1c2240'); grad.addColorStop(0.55, '#54416a');
    grad.addColorStop(0.82, '#c96f3a'); grad.addColorStop(1, '#e8a35c');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.3 + rnd() * 0.5) + ')'; g.fillRect(rnd() * w, rnd() * h * 0.4, 2, 2); }
    // low sun in the west (angle π → x = w*(π/2π) when a=0 faces east… handled by engine offset)
    const sunX = w * 0.55;
    g.fillStyle = 'rgba(255,190,120,.25)'; g.beginPath(); g.arc(sunX, h * 0.86, 60, 0, 7); g.fill();
    g.fillStyle = '#ffd9a0'; g.beginPath(); g.arc(sunX, h * 0.86, 26, 0, 7); g.fill();
    // far hills all around the horizon
    g.fillStyle = '#3a2f44';
    for (let x = 0; x < w; x += 7) {
      const yy = h * 0.9 + Math.sin(x * 0.013) * 9 + Math.sin(x * 0.041) * 5;
      g.fillRect(x, yy, 7, h - yy);
    }
    // Montserrat, NW of town: the unmistakable serrated profile
    const mX = w * 0.68, mW = 330;
    g.fillStyle = '#473a55';
    g.beginPath(); g.moveTo(mX - mW / 2, h * 0.9);
    const teeth = [0.05,0.32,0.12,0.55,0.30,0.72,0.45,0.95,0.52,0.78,0.60,1.0,0.68,0.62,0.78,0.85,0.88,0.5,1.0,0.0];
    for (let i = 0; i < teeth.length; i += 2)
      g.lineTo(mX - mW / 2 + teeth[i] * mW, h * 0.9 - teeth[i + 1] * 120);
    g.lineTo(mX + mW / 2, h * 0.9); g.closePath(); g.fill();
    return c;
  }

  /* ---------------- floor palette ---------------- */
  // 4 dithered shades per floor type, indexed by MAP.F
  function floorPalette() {
    const defs = ['#7a6a52',            // DIRT
                  '#3d3f44',            // ASPHALT
                  '#9a9590',            // SIDEWALK (panot)
                  '#b06a4a',            // PLAZA_NEW (coloured concrete, Isidre Clopas)
                  '#bdb3a0',            // PLAZA_OLD (Pompeu Fabra slabs)
                  '#4f7a3a',            // GRASS
                  '#3f7a68',            // sports COURT
                  '#c9c9c4',            // road MARK
                  '#8c7a5e'];           // RAMBLA (sauló)
    const pal = [];
    for (const hex of defs) {
      const n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, gg = n >> 8 & 255, b = n & 255;
      for (const f of [1, 0.965, 1.03, 0.94]) pal.push([r * f | 0, gg * f | 0, b * f | 0]);
    }
    return pal;   // pal[type*4 + shade] = [r,g,b]
  }

  /* ---------------- sprites ---------------- */
  function sprite(w, h, fn) { const c = cv(w, h); fn(c.getContext('2d'), w, h); return c; }
  const E = {}; // ellipse helper
  function ell(g, x, y, rx, ry, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); }

  const sprites = {};
  sprites.plane = sprite(96, 128, (g, w, h) => {       // plàtan d'ombra
    g.fillStyle = '#8a7458'; g.fillRect(w / 2 - 5, h * 0.55, 10, h * 0.45);
    g.fillStyle = '#9c8668'; g.fillRect(w / 2 - 5, h * 0.55, 4, h * 0.45);
    for (const [dx, dy, r, col] of [[0,-18,34,'#557d3a'],[-22,0,26,'#4c7034'],[22,-2,26,'#618b42'],[0,8,28,'#557d3a']])
      ell(g, w / 2 + dx, h * 0.34 + dy, r, r * 0.85, col);
  });
  sprites.pine = sprite(80, 144, (g, w, h) => {
    g.fillStyle = '#5a4030'; g.fillRect(w / 2 - 4, h * 0.7, 8, h * 0.3);
    g.fillStyle = '#2e4a30';
    for (let i = 0; i < 4; i++) {
      const y = h * (0.12 + i * 0.17), ww = w * (0.25 + i * 0.16);
      g.beginPath(); g.moveTo(w / 2, y - h * 0.12); g.lineTo(w / 2 - ww / 2, y + h * 0.1); g.lineTo(w / 2 + ww / 2, y + h * 0.1); g.fill();
    }
  });
  sprites.lamp = sprite(40, 160, (g, w, h) => {
    g.fillStyle = '#3c4248'; g.fillRect(w / 2 - 2, h * 0.08, 4, h * 0.92);
    g.fillRect(w / 2 - 2, h * 0.06, 14, 4);
    ell(g, w / 2 + 12, h * 0.09, 6, 7, '#ffe9b0');
    g.fillStyle = 'rgba(255,230,170,.35)'; g.beginPath(); g.arc(w / 2 + 12, h * 0.09, 13, 0, 7); g.fill();
  });
  sprites.bench = sprite(72, 36, (g, w, h) => {
    g.fillStyle = '#7c5a38'; g.fillRect(4, h * 0.3, w - 8, 8); g.fillRect(4, h * 0.05, w - 8, 6);
    g.fillStyle = '#444'; g.fillRect(8, h * 0.3, 5, h * 0.7 - 10); g.fillRect(w - 13, h * 0.3, 5, h * 0.7 - 10);
  });
  function carSprite(col) {
    return sprite(150, 56, (g, w, h) => {
      g.fillStyle = col; g.fillRect(8, h * 0.35, w - 16, h * 0.42);
      g.beginPath(); g.moveTo(w * 0.22, h * 0.38); g.lineTo(w * 0.32, h * 0.08); g.lineTo(w * 0.72, h * 0.08); g.lineTo(w * 0.82, h * 0.38); g.fill();
      g.fillStyle = '#1d2630'; g.fillRect(w * 0.33, h * 0.12, w * 0.16, h * 0.24); g.fillRect(w * 0.53, h * 0.12, w * 0.17, h * 0.24);
      g.fillStyle = '#15181c'; ell(g, w * 0.25, h * 0.8, 11, 11, '#15181c'); ell(g, w * 0.78, h * 0.8, 11, 11, '#15181c');
      ell(g, w * 0.25, h * 0.8, 5, 5, '#666'); ell(g, w * 0.78, h * 0.8, 5, 5, '#666');
    });
  }
  sprites.cars = ['#9a3b32', '#cfd2d6', '#3a4a6b', '#76777b', '#b8b39c', '#34503c'].map(carSprite);
  sprites.busstop = sprite(56, 120, (g, w, h) => {
    g.fillStyle = '#3c4248'; g.fillRect(w / 2 - 2, 0, 4, h);
    g.fillStyle = '#1c6e46'; g.fillRect(w / 2 - 22, 4, 44, 30);
    g.fillStyle = '#fff'; g.font = 'bold 16px monospace'; g.textAlign = 'center'; g.fillText('BUS', w / 2, 26);
  });

  // pickups
  sprites.coca = sprite(56, 32, (g, w, h) => {          // la coca de Martorell
    ell(g, w / 2, h * 0.62, 24, 10, '#e9d9c2');
    ell(g, w / 2, h * 0.55, 21, 8, '#d8a85c');
    g.fillStyle = '#b8762e'; for (let i = 0; i < 7; i++) g.fillRect(8 + i * 6, h * 0.45 + (i % 2) * 4, 4, 3);
  });
  sprites.vi = sprite(40, 48, (g, w, h) => {            // el porró
    g.fillStyle = 'rgba(190,210,220,.7)';
    g.beginPath(); g.moveTo(w * 0.45, 4); g.lineTo(w * 0.58, 4); g.lineTo(w * 0.66, h * 0.5);
    g.quadraticCurveTo(w * 0.78, h, w * 0.5, h - 2); g.quadraticCurveTo(w * 0.2, h, w * 0.36, h * 0.5); g.fill();
    g.fillStyle = '#7a1f2b'; ell(g, w * 0.5, h * 0.78, 12, 9, '#7a1f2b');
    g.beginPath(); g.moveTo(w * 0.4, h * 0.62); g.lineTo(8, h * 0.3); g.lineTo(13, h * 0.27); g.lineTo(w * 0.45, h * 0.58); g.fill();
  });
  sprites.bales = sprite(48, 32, (g, w, h) => {
    g.fillStyle = '#5a5f4a'; g.fillRect(4, 8, w - 8, h - 12);
    g.fillStyle = '#caa84a'; g.font = 'bold 11px monospace'; g.textAlign = 'center'; g.fillText('9mm', w / 2, h - 9);
  });
  sprites.cartutxos = sprite(48, 32, (g, w, h) => {
    g.fillStyle = '#7a2f28'; g.fillRect(4, 8, w - 8, h - 12);
    g.fillStyle = '#e8d8b0'; for (let i = 0; i < 4; i++) g.fillRect(9 + i * 9, 3, 6, 10);
  });
  sprites.shotgun = sprite(96, 28, (g, w, h) => {
    g.fillStyle = '#5a4128'; g.fillRect(4, h * 0.4, 30, 10);
    g.fillStyle = '#2c2f33'; g.fillRect(30, h * 0.42, 60, 7); g.fillRect(40, h * 0.62, 22, 6);
  });
  sprites.key = sprite(40, 48, (g, w, h) => {
    g.fillStyle = '#e2b93b'; g.beginPath(); g.arc(w / 2, 12, 9, 0, 7); g.fill();
    g.fillStyle = '#0e0e12'; g.beginPath(); g.arc(w / 2, 12, 4, 0, 7); g.fill();
    g.fillStyle = '#e2b93b'; g.fillRect(w / 2 - 3, 18, 6, 24); g.fillRect(w / 2, 34, 10, 5); g.fillRect(w / 2, 26, 8, 5);
  });

  // portal (2 frames)
  sprites.portal = [0, 1].map(f => sprite(128, 168, (g, w, h) => {
    for (let i = 5; i > 0; i--) {
      g.fillStyle = ['#2a0a14', '#5a1020', '#8a1d2c', '#c93a30', '#ffb24a'][i - 1];
      g.beginPath(); g.ellipse(w / 2, h / 2, (i * 11 + (f ? 4 : 0)), i * 15 + (f ? 5 : 0), 0, 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(255,220,150,.85)';
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28 + f * 0.4; g.fillRect(w / 2 + Math.cos(a) * 48 - 2, h / 2 + Math.sin(a) * 66 - 2, 4, 4); }
  }));
  sprites.fireball = [0, 1].map(f => sprite(36, 36, (g, w, h) => {
    ell(g, w/2, h/2, 14 + f * 2, 14 + f * 2, 'rgba(255,120,40,.5)');
    ell(g, w/2, h/2, 9, 9, '#ff9a3a'); ell(g, w/2, h/2, 5, 5, '#ffe9a0');
  }));

  /* ---- enemies: el bestiari del Diable ---- */
  function impish(g, w, h, opts) {
    const { col, col2, step, attack, big, dead } = opts;
    if (dead) {
      ell(g, w/2, h - 12, w * 0.32, 9, 'rgba(60,10,15,.85)');
      g.fillStyle = col; ell(g, w/2, h - 16, w * 0.2, 7, col);
      g.fillStyle = '#e8e2c8';
      g.fillRect(w/2 - 12, h - 28, 4, 10); g.fillRect(w/2 + 8, h - 28, 4, 10);   // horns up from the puddle
      return;
    }
    const cy = h * 0.32;
    // wings
    g.fillStyle = col2;
    g.beginPath(); g.moveTo(w/2 - 8, cy + 8); g.lineTo(w * 0.08, cy - 10 + step * 4); g.lineTo(w * 0.2, cy + 22); g.fill();
    g.beginPath(); g.moveTo(w/2 + 8, cy + 8); g.lineTo(w * 0.92, cy - 10 - step * 4); g.lineTo(w * 0.8, cy + 22); g.fill();
    // body + head
    ell(g, w/2, h * 0.55, w * 0.2, h * 0.26, col);
    ell(g, w/2, cy, w * 0.17, h * 0.15, col);
    // horns + eyes
    g.fillStyle = '#e8e2c8';
    g.beginPath(); g.moveTo(w/2 - 10, cy - 8); g.lineTo(w/2 - 16, cy - 22); g.lineTo(w/2 - 5, cy - 12); g.fill();
    g.beginPath(); g.moveTo(w/2 + 10, cy - 8); g.lineTo(w/2 + 16, cy - 22); g.lineTo(w/2 + 5, cy - 12); g.fill();
    g.fillStyle = '#ffe14a'; g.fillRect(w/2 - 9, cy - 3, 6, 4); g.fillRect(w/2 + 3, cy - 3, 6, 4);
    g.fillStyle = '#14080a'; g.fillRect(w/2 - 7, cy - 2, 2, 2); g.fillRect(w/2 + 5, cy - 2, 2, 2);
    // legs
    g.fillStyle = col;
    g.fillRect(w/2 - 12, h * 0.74, 7, h * 0.24 - step * 5);
    g.fillRect(w/2 + 5, h * 0.74, 7, h * 0.24 + step * 5 - 5);
    // arms / attack
    if (attack) {
      g.fillStyle = col; g.fillRect(w/2 + 10, cy + 6, 18, 6);
      ell(g, w/2 + 32, cy + 9, 9, 9, '#ff9a3a'); ell(g, w/2 + 32, cy + 9, 5, 5, '#ffe9a0');
    } else {
      g.fillStyle = col; g.fillRect(w/2 - 20, h * 0.5, 8, 16); g.fillRect(w/2 + 12, h * 0.5, 8, 16);
    }
  }
  function frames(n, w, h, fn) { return Array.from({ length: n }, (_, i) => sprite(w, h, (g) => fn(g, w, h, i))); }

  sprites.diablot = {
    walk: frames(2, 96, 128, (g, w, h, i) => impish(g, w, h, { col: '#a8352a', col2: '#5e1d18', step: i ? 1 : -1 })),
    attack: frames(1, 96, 128, (g, w, h) => impish(g, w, h, { col: '#a8352a', col2: '#5e1d18', step: 0, attack: true })),
    dead: frames(1, 96, 128, (g, w, h) => impish(g, w, h, { dead: true, col: '#a8352a' })),
  };
  sprites.botxi = {
    walk: frames(2, 120, 150, (g, w, h, i) => impish(g, w, h, { col: '#6b3a78', col2: '#3a1d44', step: i ? 1 : -1, big: true })),
    attack: frames(1, 120, 150, (g, w, h) => impish(g, w, h, { col: '#6b3a78', col2: '#3a1d44', step: 0, attack: true })),
    dead: frames(1, 120, 150, (g, w, h) => impish(g, w, h, { dead: true, col: '#6b3a78' })),
  };
  sprites.banyeta = {
    walk: frames(2, 150, 190, (g, w, h, i) => {
      impish(g, w, h, { col: '#7a1420', col2: '#2a060c', step: i ? 1 : -1 });
      g.fillStyle = '#caa84a';   // the trident
      g.fillRect(w * 0.82, h * 0.25, 4, h * 0.6);
      g.fillRect(w * 0.78, h * 0.25, 12, 4); g.fillRect(w * 0.78, h * 0.18, 3, 9); g.fillRect(w * 0.87, h * 0.18, 3, 9); g.fillRect(w * 0.825, h * 0.16, 3, 11);
    }),
    attack: frames(1, 150, 190, (g, w, h) => impish(g, w, h, { col: '#7a1420', col2: '#2a060c', step: 0, attack: true })),
    dead: frames(1, 150, 190, (g, w, h) => impish(g, w, h, { dead: true, col: '#7a1420' })),
  };
  sprites.gos = {
    walk: frames(2, 110, 70, (g, w, h, i) => {
      ell(g, w * 0.5, h * 0.5, w * 0.3, h * 0.22, '#1d1416');
      ell(g, w * 0.78, h * 0.38, w * 0.13, h * 0.16, '#1d1416');         // head
      g.fillStyle = '#ff5a2a'; g.fillRect(w * 0.82, h * 0.34, 5, 3);     // eye
      g.fillStyle = '#1d1416';
      g.fillRect(w * 0.32, h * 0.62, 7, h * 0.36 - i * 6);
      g.fillRect(w * 0.62, h * 0.62, 7, h * 0.3 + i * 6);
      g.beginPath(); g.moveTo(w * 0.2, h * 0.45); g.lineTo(w * 0.04, h * 0.3); g.lineTo(w * 0.18, h * 0.55); g.fill();  // tail
    }),
    attack: frames(1, 110, 70, (g, w, h) => {
      ell(g, w * 0.5, h * 0.5, w * 0.32, h * 0.22, '#1d1416');
      ell(g, w * 0.8, h * 0.4, w * 0.15, h * 0.18, '#1d1416');
      g.fillStyle = '#c93a30'; g.beginPath(); g.moveTo(w * 0.86, h * 0.36); g.lineTo(w, h * 0.28); g.lineTo(w * 0.92, h * 0.5); g.fill();
      g.fillStyle = '#ff5a2a'; g.fillRect(w * 0.8, h * 0.32, 6, 4);
    }),
    dead: frames(1, 110, 70, (g, w, h) => {
      ell(g, w / 2, h - 10, w * 0.34, 8, 'rgba(60,10,15,.85)');
      ell(g, w / 2, h - 14, w * 0.24, 7, '#1d1416');
    }),
  };

  /* ---- first-person weapon drawing (direct to HUD layer) ---- */
  // each: draw(g, cx, bottomY, bob, firing01)
  const weapons = {
    porra(g, cx, by, bob, f) {        // the festa-major bat
      g.save(); g.translate(cx + 70 + bob.x, by + bob.y + 30);
      g.rotate(-0.5 - f * 1.1);
      g.fillStyle = '#8a6b42'; g.fillRect(-9, -150, 18, 120);
      g.fillStyle = '#a8845a'; g.fillRect(-9, -150, 7, 120);
      g.fillStyle = '#5e4426'; g.fillRect(-11, -34, 22, 36);
      g.restore();
      arm(g, cx + 48 + bob.x, by + bob.y);
    },
    pistola(g, cx, by, bob, f) {
      const ky = f * 14;
      g.fillStyle = '#23272c'; g.fillRect(cx - 12 + bob.x, by - 88 + bob.y + ky, 24, 52);
      g.fillStyle = '#2f343b'; g.fillRect(cx - 9 + bob.x, by - 116 + bob.y + ky, 18, 34);
      g.fillStyle = '#1a1d21'; g.fillRect(cx - 5 + bob.x, by - 122 + bob.y + ky, 10, 10);
      if (f > 0.55) muzzle(g, cx + bob.x, by - 130 + bob.y, 26);
      arm(g, cx - 30 + bob.x, by + bob.y); arm(g, cx + 30 + bob.x, by + bob.y);
    },
    escopeta(g, cx, by, bob, f) {
      const ky = f * 22;
      g.fillStyle = '#5a4128'; g.fillRect(cx - 16 + bob.x, by - 60 + bob.y + ky, 32, 60);
      g.fillStyle = '#2c2f33'; g.fillRect(cx - 12 + bob.x, by - 130 + bob.y + ky, 10, 76);
      g.fillStyle = '#33373c'; g.fillRect(cx + 2 + bob.x, by - 130 + bob.y + ky, 10, 76);
      g.fillStyle = '#46392a'; g.fillRect(cx - 14 + bob.x, by - 76 + bob.y + ky, 28, 16);
      if (f > 0.6) muzzle(g, cx + bob.x, by - 138 + bob.y, 40);
      arm(g, cx - 34 + bob.x, by + bob.y); arm(g, cx + 34 + bob.x, by + bob.y);
    },
  };
  function arm(g, x, by) {
    g.fillStyle = '#c98e62'; g.beginPath(); g.ellipse(x, by + 6, 22, 34, 0, 0, 7); g.fill();
    g.fillStyle = '#3a5e8a'; g.beginPath(); g.ellipse(x, by + 34, 26, 30, 0, 0, 7); g.fill();
  }
  function muzzle(g, x, y, r) {
    g.fillStyle = 'rgba(255,200,90,.9)';
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; g.lineTo(x + Math.cos(a) * r * (i % 2 ? 0.4 : 1), y + Math.sin(a) * r * (i % 2 ? 0.4 : 1)); }
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,245,200,.95)'; g.beginPath(); g.arc(x, y, r * 0.3, 0, 7); g.fill();
  }

  return { PXM, MODULE_M, MODULE_PX, buildFacade, buildSky, floorPalette, sprites, weapons, cv };
})();
