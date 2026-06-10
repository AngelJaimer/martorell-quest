/* ============================================================
 *  MARTODOOM · engine.js — a variable-height raycaster.
 *  Walls can be 1.4 m hedges or 17 m bell towers: rays keep
 *  marching past lower walls so the real skyline shows through.
 * ============================================================ */
'use strict';

const ENGINE = (() => {
  const FOV = 1.15;                  // ~66°
  const EYE = 1.7;                   // eye height (m)
  const FOG = 230, FOGC = [232, 163, 92];   // dusk haze
  const MAXD = 270, MAXHITS = 8;

  let RW, RH, PROJ, HOR;             // internal resolution (adaptive)
  let buf, bg, fimg, fdata, textures, sky, pal, zbuf, lightG, fogStyles;

  function setQuality(q) {
    RW = Math.round(480 * q); RH = Math.round(300 * q);
    PROJ = (RW / 2) / Math.tan(FOV / 2);
    HOR = (RH / 2) | 0;
    buf.width = RW; buf.height = RH;
    bg = buf.getContext('2d'); bg.imageSmoothingEnabled = false;
    fimg = bg.createImageData(RW, RH - HOR);
    fdata = fimg.data;
    for (let i = 3; i < fdata.length; i += 4) fdata[i] = 255;
    zbuf = new Float32Array(RW);
  }

  function init() {
    buf = ART3D.cv(4, 4);
    setQuality(1);
    textures = MAP.types.map(t => t ? ART3D.buildFacade(t) : null);
    sky = ART3D.buildSky();
    pal = ART3D.floorPalette();
    fogStyles = Array.from({ length: 21 }, (_, i) =>
      `rgba(${FOGC[0]},${FOGC[1]},${FOGC[2]},${(i / 20).toFixed(2)})`);
    // static warm light pools under the street lamps
    lightG = new Uint8Array(MAP.W * MAP.H);
    for (const p of MAP.props) {
      if (p.kind !== 'lamp') continue;
      for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
        const x = (p.x | 0) + dx, y = (p.y | 0) + dy;
        if (x < 0 || y < 0 || x >= MAP.W || y >= MAP.H) continue;
        const d = Math.hypot(dx, dy) / 7;
        if (d < 1) lightG[y * MAP.W + x] = Math.min(255, lightG[y * MAP.W + x] + (1 - d) * (1 - d) * 235);
      }
    }
  }

  /* ---- generic DDA used by render, hitscan & line-of-sight ---- */
  function wallDist(x, y, dx, dy, maxD, minH) {
    let mx = x | 0, my = y | 0;
    const ddx = Math.abs(1 / (dx || 1e-9)), ddy = Math.abs(1 / (dy || 1e-9));
    const sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
    let tx = (dx < 0 ? (x - mx) : (mx + 1 - x)) * ddx;
    let ty = (dy < 0 ? (y - my) : (my + 1 - y)) * ddy;
    let d = 0;
    while (d < maxD) {
      if (tx < ty) { d = tx; tx += ddx; mx += sx; } else { d = ty; ty += ddy; my += sy; }
      if (mx < 0 || my < 0 || mx >= MAP.W || my >= MAP.H) return maxD;
      const t = MAP.wall[my * MAP.W + mx];
      if (t && MAP.types[t].h >= minH) return d;
    }
    return maxD;
  }

  function render(cam, ents) {
    const dirX = Math.cos(cam.a), dirY = Math.sin(cam.a);
    const planeX = -dirY * Math.tan(FOV / 2), planeY = dirX * Math.tan(FOV / 2);

    /* ---- sky ---- */
    const skyW = sky.width, vw = skyW * (FOV / (Math.PI * 2));
    const destH = Math.round(HOR / 0.9);
    bg.fillStyle = '#1c2240'; bg.fillRect(0, 0, RW, HOR);
    const sx0 = (((cam.a - FOV / 2) / (Math.PI * 2)) % 1 + 1) % 1 * skyW;
    const w1 = Math.min(skyW - sx0, vw);
    bg.drawImage(sky, sx0, 0, w1, sky.height, 0, 0, Math.ceil(RW * w1 / vw), destH);
    if (w1 < vw)
      bg.drawImage(sky, 0, 0, vw - w1, sky.height, Math.floor(RW * w1 / vw), 0, Math.ceil(RW * (vw - w1) / vw), destH);

    /* ---- floor (per-pixel, fog per row) ---- */
    const rdx0 = dirX - planeX, rdy0 = dirY - planeY;
    const rdx1 = dirX + planeX, rdy1 = dirY + planeY;
    for (let y = 0; y < RH - HOR; y++) {
      const rowD = (EYE * PROJ) / (y + 1);
      const fog = Math.min(0.92, rowD / FOG);
      const fr = FOGC[0] * fog, fg = FOGC[1] * fog, fb = FOGC[2] * fog, nf = 1 - fog;
      let fx = cam.x + rowD * rdx0, fy = cam.y + rowD * rdy0;
      const stx = rowD * (rdx1 - rdx0) / RW, sty = rowD * (rdy1 - rdy0) / RW;
      let o = y * RW * 4;
      for (let x = 0; x < RW; x++) {
        const ix = fx | 0, iy = fy | 0;
        let c, lv = 0;
        if (ix >= 0 && iy >= 0 && ix < MAP.W && iy < MAP.H) {
          const ii = iy * MAP.W + ix;
          let ft = MAP.floor[ii];
          if (ft === 9) ft = (ix & 1) ? 7 : 1;        // zebra stripes (E-W road)
          else if (ft === 10) ft = (iy & 1) ? 7 : 1;  // zebra stripes (N-S road)
          c = pal[ft * 4 + (((ix * 0x9E37 ^ iy * 0x85EB) >> 3) & 3)];
          lv = lightG[ii];
        } else c = pal[0];
        // dusk haze + warm lamplight pools
        fdata[o] = c[0] * nf + fr + lv * 0.42;
        fdata[o + 1] = c[1] * nf + fg + lv * 0.28;
        fdata[o + 2] = c[2] * nf + fb + lv * 0.07;
        o += 4; fx += stx; fy += sty;
      }
    }
    bg.putImageData(fimg, 0, HOR);

    /* ---- walls ---- */
    for (let x = 0; x < RW; x++) {
      const cx = 2 * x / RW - 1;
      const rdx = dirX + planeX * cx, rdy = dirY + planeY * cx;
      let mx = cam.x | 0, my = cam.y | 0;
      const ddx = Math.abs(1 / (rdx || 1e-9)), ddy = Math.abs(1 / (rdy || 1e-9));
      const sx = rdx < 0 ? -1 : 1, sy = rdy < 0 ? -1 : 1;
      let tx = (rdx < 0 ? (cam.x - mx) : (mx + 1 - cam.x)) * ddx;
      let ty = (rdy < 0 ? (cam.y - my) : (my + 1 - cam.y)) * ddy;
      let side = 0, d = 0, lastT = 0, hits = 0, clipTop = RH;
      zbuf[x] = MAXD;

      while (d < MAXD && hits < MAXHITS && clipTop > 0) {
        if (tx < ty) { d = tx; tx += ddx; mx += sx; side = 0; }
        else { d = ty; ty += ddy; my += sy; side = 1; }
        if (mx < 0 || my < 0 || mx >= MAP.W || my >= MAP.H) break;
        const t = MAP.wall[my * MAP.W + mx];
        if (t === lastT) continue;
        lastT = t;
        if (!t) continue;
        hits++;
        const def = MAP.types[t];
        const dd = Math.max(d, 0.08);
        const bottom = HOR + (EYE * PROJ) / dd;
        const top = HOR - ((def.h - EYE) * PROJ) / dd;
        if (zbuf[x] === MAXD && def.h >= 2) zbuf[x] = d;
        const yEnd = Math.min(bottom, clipTop);
        if (yEnd <= top) { if (def.h >= 8) clipTop = Math.min(clipTop, top); continue; }
        const wallX = side === 0 ? cam.y + d * rdy : cam.x + d * rdx;
        const tex = side === 1 ? textures[t].dark : textures[t].lit;
        let u = (wallX / ART3D.MODULE_M) % 1; if (u < 0) u += 1;
        const su = Math.min(tex.width - 1, (u * tex.width) | 0);
        const fullH = bottom - top;
        const sh = tex.height * (yEnd - top) / fullH;
        bg.drawImage(tex, su, 0, 1, Math.max(1, sh), x, top, 1, yEnd - top);
        const fog = Math.min(0.88, d / FOG);
        if (fog > 0.03) {
          bg.fillStyle = fogStyles[(fog * 20) | 0];
          bg.fillRect(x, top, 1, yEnd - top);
        }
        clipTop = Math.min(clipTop, top);
      }
    }

    /* ---- sprites (far → near) ---- */
    const invDet = 1 / (planeX * dirY - dirX * planeY);
    const vis = [];
    for (const e of ents) {
      const dx = e.x - cam.x, dy = e.y - cam.y;
      const depth = invDet * (-planeY * dx + planeX * dy);
      if (depth < 0.2 || depth > MAXD) continue;
      const txx = invDet * (dirY * dx - dirX * dy);
      const sxp = (RW / 2) * (1 + txx / depth);
      const sw = e.wM * PROJ / depth;
      if (sxp + sw / 2 < 0 || sxp - sw / 2 >= RW) continue;
      vis.push({ e, depth, sxp, sw });
    }
    vis.sort((a, b) => b.depth - a.depth);
    for (const v of vis) {
      const { e, depth, sxp, sw } = v;
      const sh = e.hM * PROJ / depth;
      const bottom = HOR + ((EYE - (e.zM || 0)) * PROJ) / depth;
      const top = bottom - sh;
      const x0 = Math.max(0, Math.round(sxp - sw / 2)), x1 = Math.min(RW - 1, Math.round(sxp + sw / 2));
      const spr = e.spr;
      bg.globalAlpha = 1 - 0.6 * Math.min(1, depth / FOG);
      let run = -1;
      for (let x = x0; x <= x1 + 1; x++) {
        const ok = x <= x1 && depth < zbuf[x];
        if (ok && run < 0) run = x;
        else if (!ok && run >= 0) {
          const u0 = (run - (sxp - sw / 2)) / sw, u1 = (x - (sxp - sw / 2)) / sw;
          bg.drawImage(spr, u0 * spr.width, 0, Math.max(1, (u1 - u0) * spr.width), spr.height,
                       run, top, x - run, sh);
          run = -1;
        }
      }
      bg.globalAlpha = 1;
    }
    return buf;
  }

  return { init, render, wallDist, setQuality, EYE, FOG };
})();
