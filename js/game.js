/* =====================================================================
 *  MARTORELL QUEST  ·  La Leyenda del Puente del Diablo
 *  game.js  —  a small, dependency-free top-down action-adventure engine.
 *
 *  Zelda-style: walk the map, swing your sword (J/Z/Space), talk (E),
 *  gather the 5 Devil's Stones and rebuild the Pont del Diable.
 *
 *  Trilingual (ES default · CA · EN) — chosen from the start menu or with L.
 *  Everything is code-drawn on a <canvas> (see art.js). No assets.
 *
 *  This version aims for a SNES "A Link to the Past" look: pre-rendered
 *  textured terrain, depth-sorted sprites, an animated hero & imps,
 *  particles, screen-shake and an atmospheric night-lighting pass.
 * ===================================================================== */

(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const VIEW_W = canvas.width;
  const VIEW_H = canvas.height;
  const now = () => performance.now();

  const map = buildMap();

  // Pre-render the whole textured map once (big quality + perf win).
  const terrain = ART.buildTerrain(map, TILE, MAP_W, MAP_H);

  // Offscreen buffer for the night-lighting pass.
  const lightBuf = document.createElement('canvas');
  lightBuf.width = VIEW_W; lightBuf.height = VIEW_H;
  const lctx = lightBuf.getContext('2d');
  const NIGHT = 0.5;   // 0 = day, 1 = pitch black where unlit

  /* ---------------- Static decorations ---------------- */
  const trees = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++)
    if (map[y][x] === 'T')
      trees.push({ cx: x * TILE + TILE / 2, by: y * TILE + TILE, seed: ART.hash(x, y) * 10 });

  const lamps = LAMPS.map(([x, y]) => ({
    cx: x * TILE + TILE / 2, by: y * TILE + TILE - 4,
    lx: x * TILE + TILE / 2, ly: y * TILE + TILE - 32,
  }));

  /* ---------------- Game state ---------------- */
  const state = {
    lang: 'es', scene: 'menu', stones: 0, flags: {}, visited: {}, won: false,
  };

  // i18n helpers
  const ui = () => I18N[state.lang];
  const t = (field) => {
    if (field == null) return '';
    if (typeof field === 'string') return field;
    return field[state.lang] != null ? field[state.lang] : field.es;
  };
  function setLang(l) { state.lang = l; refreshChrome(); }
  function cycleLang() {
    const i = LANG_ORDER.indexOf(state.lang);
    setLang(LANG_ORDER[(i + 1) % LANG_ORDER.length]);
  }
  function refreshChrome() {
    const h = document.getElementById('help'); if (h) h.textContent = ui().controls;
    const g = document.getElementById('tag');  if (g) g.textContent  = ui().tagline;
  }
  function currentObjective() {
    if (state.won) return ui().objectiveWon;
    if (state.stones >= STONES_NEEDED) return ui().objectiveGo;
    return ui().objective;
  }

  /* ---------------- World helpers ---------------- */
  const tileAt = (px, py) => {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 'M';
    return map[ty][tx];
  };
  const isSolid = (px, py) => { const t2 = tileAt(px, py); return TILES[t2] ? TILES[t2].solid : true; };

  /* ---------------- Player ---------------- */
  const player = {
    x: 24 * TILE, y: 14 * TILE, w: 20, h: 24, speed: 2.4, dir: 'down',
    hp: 6, maxhp: 6, attack: 0, cooldown: 0, hurt: 0, anim: 0,
  };

  /* ---------------- Enemies: the imps (diablillos) ---------------- */
  const enemies = [];
  (function spawn() {
    [[45,14],[43,12],[49,8],[44,18],[46,22],[42,9],[50,13],
     [33,22],[20,26],[11,9]].forEach(([tx, ty], i) => {
      enemies.push({ x: tx * TILE, y: ty * TILE, w: 22, h: 22, hp: 2,
        dir: Math.random() * Math.PI * 2, speed: 0.9 + Math.random() * 0.4,
        wob: i, dead: false, hurt: 0, seed: i * 3.1 });
    });
  })();

  /* ---------------- Particles & screen shake ---------------- */
  const particles = [];
  let shake = 0;
  function burst(x, y, n, opt) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (opt.spd || 2) * (0.4 + Math.random());
      particles.push({
        x, y, vx: Math.cos(a) * sp + (opt.vx || 0), vy: Math.sin(a) * sp + (opt.vy || 0),
        life: opt.life || 24, max: opt.life || 24, grav: opt.grav || 0,
        size: opt.size || 3, color: opt.color || '#fff', type: opt.type || 'spark',
      });
    }
  }
  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += p.grav; p.vx *= 0.96; p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }
  function drawParticles() {
    particles.forEach(p => {
      const a = Math.max(0, p.life / p.max);
      const x = p.x - cam.x, y = p.y - cam.y;
      ctx.globalAlpha = a;
      if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(x, y, p.size * (1.4 - a * 0.6), 0, 7); ctx.fill();
      } else if (p.type === 'star') {
        ctx.fillStyle = p.color;
        ctx.fillRect(x - 1, y - p.size, 2, p.size * 2); ctx.fillRect(x - p.size, y - 1, p.size * 2, 2);
      } else if (p.type === 'heart') {
        ctx.fillStyle = p.color; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        ctx.fillText('♥', x, y);
      } else {
        ctx.fillStyle = p.color; ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
      }
    });
    ctx.globalAlpha = 1;
  }

  /* ---------------- Input ---------------- */
  const keys = {}, pressed = {};
  window.addEventListener('keydown', e => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    if (!keys[e.key]) pressed[e.key] = true;
    keys[e.key] = true;
  });
  window.addEventListener('keyup', e => { keys[e.key] = false; });

  function bindTouch(id, key) {
    const el = document.getElementById(id); if (!el) return;
    const down = e => { e.preventDefault(); if (!keys[key]) pressed[key] = true; keys[key] = true; };
    const up   = e => { e.preventDefault(); keys[key] = false; };
    el.addEventListener('touchstart', down); el.addEventListener('mousedown', down);
    el.addEventListener('touchend', up);     el.addEventListener('mouseup', up);
    el.addEventListener('mouseleave', up);   el.addEventListener('touchcancel', up);
  }
  bindTouch('btn-up','ArrowUp'); bindTouch('btn-down','ArrowDown');
  bindTouch('btn-left','ArrowLeft'); bindTouch('btn-right','ArrowRight');
  bindTouch('btn-a','j'); bindTouch('btn-b','e');

  let menuRegions = { play: null, langs: [] };
  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    const p = e.touches && e.touches[0] ? e.touches[0] : e;
    return { x: (p.clientX - r.left) * (VIEW_W / r.width),
             y: (p.clientY - r.top)  * (VIEW_H / r.height) };
  }
  function inRect(p, b) { return b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }
  function handlePoint(p) {
    if (state.scene !== 'menu') return;
    for (const L of menuRegions.langs) if (inRect(p, L)) { setLang(L.lang); return; }
    if (inRect(p, menuRegions.play)) startGame();
  }
  canvas.addEventListener('click', e => handlePoint(canvasPoint(e)));
  canvas.addEventListener('touchstart', e => {
    if (state.scene === 'menu') { e.preventDefault(); handlePoint(canvasPoint(e)); }
  }, { passive: false });

  const downHeld  = () => keys['ArrowDown']  || keys['s'] || keys['S'];
  const upHeld    = () => keys['ArrowUp']    || keys['w'] || keys['W'];
  const leftHeld  = () => keys['ArrowLeft']  || keys['a'] || keys['A'];
  const rightHeld = () => keys['ArrowRight'] || keys['d'] || keys['D'];
  const hitPressed = () => pressed['j']||pressed['J']||pressed['z']||pressed['Z']||pressed[' '];
  const talkPressed = () => pressed['e']||pressed['E']||pressed['Enter'];
  const clearPressed = () => Object.keys(pressed).forEach(k => pressed[k] = false);

  function startGame() { state.scene = 'play'; clearPressed(); }

  /* ---------------- Dialogue ---------------- */
  const dialog = { active: false, lines: [], i: 0, after: null };
  function say(lines, after) {
    dialog.active = true; dialog.lines = lines.slice(); dialog.i = 0; dialog.after = after || null;
  }
  function advanceDialog() {
    dialog.i++;
    if (dialog.i >= dialog.lines.length) {
      dialog.active = false;
      const cb = dialog.after; dialog.after = null; if (cb) cb();
    }
  }

  /* ---------------- Interaction ---------------- */
  function nearestLandmark() {
    const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    let best = null, bd = 1e9;
    for (const L of LANDMARKS) {
      const lx = L.x * TILE + TILE / 2, ly = L.y * TILE + TILE / 2;
      const d = Math.hypot(cx - lx, cy - ly);
      if (d < TILE * 1.6 && d < bd) { bd = d; best = L; }
    }
    return best;
  }

  function interact(L) {
    state.visited[L.id] = true;

    if (L.isGoal) {
      if (state.won) { say(t(L.lines)); return; }
      if (state.stones >= STONES_NEEDED) {
        state.won = true; sfx('win'); winFanfare();
        say(t(L.goalDone));
      } else {
        say([ui().stonesCount(state.stones), ...t(L.goalLocked)]);
      }
      return;
    }

    if (L.stone && !state.flags[L.id]) {
      say(t(L.lines), () => {
        state.flags[L.id] = true; state.stones++; sfx('stone');
        const mx = L.x * TILE + TILE / 2, my = L.y * TILE + TILE / 2;
        burst(mx, my, 18, { color: '#ffd34d', type: 'star', size: 4, life: 36, spd: 2, vy: -1, grav: 0.04 });
        say([t(L.stoneLine),
             state.stones >= STONES_NEEDED ? ui().haveAll : ui().stonesCount(state.stones)]);
      });
      return;
    }

    if (L.heal) {
      if (player.hp < player.maxhp) {
        say(t(L.lines), () => {
          player.hp = player.maxhp; sfx('heal');
          burst(player.x + 10, player.y + 6, 8, { color: '#ff5a7a', type: 'heart', life: 40, spd: 1, vy: -1.2 });
          say([t(L.healLine)]);
        });
      } else {
        say([t(L.lines)[0], ui().fullHeart]);
      }
      return;
    }

    say(t(L.lines));
  }

  function winFanfare() {
    for (let i = 0; i < 60; i++)
      burst(player.x + 10, player.y - 40, 1, {
        color: ['#ffd34d','#ff5a3c','#46b85a','#4f9cff','#fff'][i % 5],
        type: 'star', size: 4, life: 70, spd: 4, vy: -2, grav: 0.08,
      });
    shake = 14;
  }

  /* ---------------- Audio (tiny Web Audio blips) ---------------- */
  let actx = null;
  function sfx(kind) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      const t0 = actx.currentTime;
      const tbl = { hit:[220,'square',0.08], hurt:[140,'sawtooth',0.18], stone:[660,'triangle',0.18],
        heal:[880,'sine',0.22], talk:[440,'sine',0.05], win:[523,'triangle',0.5], slash:[330,'square',0.06] };
      const [f, type, dur] = tbl[kind] || [440,'sine',0.1];
      o.type = type; o.frequency.setValueAtTime(f, t0);
      if (kind === 'win') o.frequency.exponentialRampToValueAtTime(f * 2, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) { /* no audio */ }
  }

  /* ---------------- Movement & collision ---------------- */
  function tryMove(dx, dy) {
    const corners = (x, y) => [[x,y],[x+player.w,y],[x,y+player.h],[x+player.w,y+player.h]];
    const nx = player.x + dx;
    if (!corners(nx, player.y).some(([cx, cy]) => isSolid(cx, cy))) player.x = nx;
    const ny = player.y + dy;
    if (!corners(player.x, ny).some(([cx, cy]) => isSolid(cx, cy))) player.y = ny;
    player.x = Math.max(0, Math.min((MAP_W - 1) * TILE, player.x));
    player.y = Math.max(0, Math.min((MAP_H - 1) * TILE, player.y));
  }
  function swordBox() {
    const r = 26, cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    if (player.dir === 'up')   return { x: cx-12, y: cy-r, w: 24, h: r };
    if (player.dir === 'down') return { x: cx-12, y: cy,   w: 24, h: r };
    if (player.dir === 'left') return { x: cx-r,  y: cy-12, w: r, h: 24 };
    return { x: cx, y: cy-12, w: r, h: 24 };
  }
  const overlap = (a, b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;

  /* ---------------- Update ---------------- */
  function updateMenu() {
    if (pressed['l'] || pressed['L']) cycleLang();
    if (pressed['1']) setLang('es');
    if (pressed['2']) setLang('ca');
    if (pressed['3']) setLang('en');
    if (talkPressed() || pressed[' ']) startGame();
    clearPressed();
  }

  function update() {
    if (shake > 0) shake *= 0.88, shake < 0.4 && (shake = 0);
    updateParticles();

    if (state.scene === 'menu') { updateMenu(); return; }

    if (pressed['r'] || pressed['R']) location.reload();
    if (pressed['l'] || pressed['L']) cycleLang();

    if (dialog.active) {
      if (talkPressed() || hitPressed()) { sfx('talk'); advanceDialog(); }
      clearPressed(); return;
    }

    let dx = 0, dy = 0;
    if (leftHeld())  { dx -= 1; player.dir = 'left'; }
    if (rightHeld()) { dx += 1; player.dir = 'right'; }
    if (upHeld())    { dy -= 1; player.dir = 'up'; }
    if (downHeld())  { dy += 1; player.dir = 'down'; }
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      tryMove((dx/len)*player.speed, (dy/len)*player.speed);
      player.anim += 0.22;
    } else player.anim = 0;

    if (player.cooldown > 0) player.cooldown--;
    if (hitPressed() && player.cooldown === 0) { player.attack = 14; player.cooldown = 22; sfx('slash'); }
    if (player.attack > 0) {
      player.attack--;
      const sb = swordBox();
      enemies.forEach(en => {
        if (!en.dead && !en.hurt && overlap(sb, en)) {
          en.hp--; en.hurt = 20; sfx('hit');
          burst(en.x + 11, en.y + 11, 8, { color: '#ffe08a', size: 3, life: 16, spd: 3 });
          en.x += (en.x - player.x) * 0.3; en.y += (en.y - player.y) * 0.3;
          if (en.hp <= 0) {
            en.dead = true;
            burst(en.x + 11, en.y + 11, 12, { color: '#7a1414', type: 'smoke', size: 5, life: 26, spd: 1.4, vy: -0.6 });
            burst(en.x + 11, en.y + 11, 6, { color: '#fff2a8', type: 'star', size: 3, life: 22, spd: 2 });
          }
        }
      });
    }

    if (talkPressed()) { const L = nearestLandmark(); if (L) interact(L); }

    if (player.hurt > 0) player.hurt--;
    enemies.forEach(en => {
      if (en.dead) return;
      if (en.hurt > 0) en.hurt--;
      const cx = player.x + player.w/2, cy = player.y + player.h/2;
      const ex = en.x + en.w/2, ey = en.y + en.h/2;
      const d = Math.hypot(cx - ex, cy - ey);
      if (d < TILE * 5) en.dir = Math.atan2(cy - ey, cx - ex);
      else en.dir += (Math.random() - 0.5) * 0.4;
      const mvx = Math.cos(en.dir) * en.speed, mvy = Math.sin(en.dir) * en.speed;
      if (!isSolid(en.x + mvx, ey) && !isSolid(en.x + en.w + mvx, ey)) en.x += mvx;
      if (!isSolid(ex, en.y + mvy) && !isSolid(ex, en.y + en.h + mvy)) en.y += mvy;
      en.wob += 0.2;
      if (player.hurt === 0 && overlap(player, en)) {
        player.hp--; player.hurt = 60; sfx('hurt'); shake = 8;
        burst(player.x + 10, player.y + 12, 8, { color: '#ff5a3c', size: 3, life: 18, spd: 2.5 });
        const ang = Math.atan2(player.y - en.y, player.x - en.x);
        tryMove(Math.cos(ang) * 16, Math.sin(ang) * 16);
        if (player.hp <= 0) {
          player.hp = player.maxhp; player.hurt = 90;
          player.x = 24 * TILE; player.y = 14 * TILE;
          say(ui().deathT);
        }
      }
    });
    clearPressed();
  }

  /* =====================================================================
   *  RENDERING
   * =================================================================== */
  let cam = { x: 0, y: 0 };

  function drawSignpost(L, sx, sy) {
    const active = (L.stone && !state.flags[L.id]) || (L.isGoal && !state.won);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(sx + 16, sy + 30, 9, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a4632'; ctx.fillRect(sx + 14, sy + 8, 4, 22);
    ctx.fillStyle = active ? (L.isGoal ? '#ffd34d' : '#ffe08a') : '#cdbfa0';
    ART.roundRect(ctx, sx + 6, sy + 4, 20, 12, 3); ctx.fill();
    ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 1; ART.roundRect(ctx, sx + 6, sy + 4, 20, 12, 3); ctx.stroke();
    ctx.fillStyle = '#5a4632';
    ctx.fillRect(sx + 9, sy + 7, 14, 1); ctx.fillRect(sx + 9, sy + 10, 14, 1); ctx.fillRect(sx + 9, sy + 13, 9, 1);
  }

  function drawMarker(L) {
    const active = (L.stone && !state.flags[L.id]) || (L.isGoal && !state.won);
    if (!active) return;
    const dx = L.x * TILE - cam.x + 16, dy = L.y * TILE - cam.y;
    const bob = Math.sin(now() / 250) * 3;
    // glow
    const g = ctx.createRadialGradient(dx, dy - 14 + bob, 1, dx, dy - 14 + bob, 16);
    const c = L.isGoal ? '255,90,60' : '255,211,77';
    g.addColorStop(0, `rgba(${c},0.5)`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx, dy - 14 + bob, 16, 0, 7); ctx.fill();
    ctx.fillStyle = L.isGoal ? '#ff5a3c' : '#ffd34d';
    ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
    ctx.fillText(L.isGoal ? '★' : '!', dx, dy - 8 + bob);
  }

  function drawHeart(x, y, fill) {
    ctx.save(); ctx.translate(x, y);
    const path = (c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0,4);
      ctx.bezierCurveTo(-8,-5,-16,5,0,16); ctx.bezierCurveTo(16,5,8,-5,0,4); ctx.fill(); };
    path('rgba(0,0,0,0.35)');
    ctx.translate(-1, -1);
    path('#5a1f1f');
    if (fill >= 1) { path('#e23b3b'); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-6, -1, 3, 3); }
    else if (fill === 0.5) { ctx.save(); ctx.beginPath(); ctx.rect(-16,-6,16,24); ctx.clip(); path('#e23b3b'); ctx.restore(); }
    ctx.restore();
  }

  function drawMinimap() {
    const mw = 120, mh = Math.round(120 * MAP_H / MAP_W), ox = VIEW_W - mw - 12, oy = 48;
    ctx.fillStyle = 'rgba(20,16,10,0.6)'; ART.roundRect(ctx, ox - 4, oy - 4, mw + 8, mh + 8, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,211,77,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    const sx = mw / MAP_W, sy = mh / MAP_H;
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const tk = map[y][x];
      ctx.fillStyle = ({ G:'#5a9b46', P:'#3f8a3c', W:'#3f7fd1','#':'#e4cf94', R:'#b3925c', S:'#bdb7a6',
        '~':'#9a6836', B:'#caa37a', F:'#b9bcc2', M:'#6a6356', T:'#256a2c', D:'#b3925c' })[tk] || '#5a9b46';
      ctx.fillRect(ox + x*sx, oy + y*sy, Math.ceil(sx), Math.ceil(sy));
    }
    LANDMARKS.forEach(L => {
      if (L.isGoal) ctx.fillStyle = '#ff5a3c';
      else if (L.stone && !state.flags[L.id]) ctx.fillStyle = '#ffd34d';
      else return;
      ctx.fillRect(ox + L.x*sx - 1, oy + L.y*sy - 1, 3, 3);
    });
    if (Math.floor(now() / 300) % 2) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(ox + (player.x/TILE)*sx - 1, oy + (player.y/TILE)*sy - 1, 3, 3);
    }
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(20,16,10,0.6)'; ART.roundRect(ctx, x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,211,77,0.55)'; ctx.lineWidth = 1.5;
    ART.roundRect(ctx, x, y, w, h, 6); ctx.stroke();
  }

  function drawHUD() {
    panel(8, 8, player.maxhp / 2 * 22 + 12, 32);
    for (let i = 0; i < player.maxhp; i += 2) {
      const f = player.hp - i;
      drawHeart(26 + (i/2)*22, 16, f >= 2 ? 1 : f === 1 ? 0.5 : 0);
    }

    const sw = 168;
    panel(VIEW_W - sw - 8, 8, sw, 32);
    ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'left';
    ctx.fillText('🪨', VIEW_W - sw, 30);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px monospace';
    ctx.fillText(`${ui().stones} ${state.stones}/${STONES_NEEDED}`, VIEW_W - sw + 26, 29);

    // objective ribbon
    ctx.fillStyle = 'rgba(20,16,10,0.6)'; ctx.fillRect(0, VIEW_H - 28, VIEW_W, 28);
    ctx.fillStyle = 'rgba(255,211,77,0.5)'; ctx.fillRect(0, VIEW_H - 28, VIEW_W, 1);
    ctx.fillStyle = '#ffe9a8'; ctx.font = '13px monospace'; ctx.textAlign = 'center';
    ctx.fillText(currentObjective(), VIEW_W/2, VIEW_H - 9);

    if (!dialog.active) {
      const L = nearestLandmark();
      if (L) {
        const label = `[E] ${t(L.name)}`;
        ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
        const w = ctx.measureText(label).width + 20;
        panel(VIEW_W/2 - w/2, 44, w, 26);
        ctx.fillStyle = '#fff'; ctx.fillText(label, VIEW_W/2, 62);
      }
    }
    drawMinimap();
  }

  function wrapText(text, x, y, maxW, lh) {
    const words = String(text).split(' '); let line = '', yy = y;
    for (const w of words) {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w + ' '; yy += lh; }
      else line = test;
    }
    ctx.fillText(line, x, yy);
  }

  function drawDialog() {
    if (!dialog.active) return;
    const h = 112, y = VIEW_H - h - 34, x = 28, w = VIEW_W - 56;
    ctx.fillStyle = 'rgba(8,12,20,0.94)'; ART.roundRect(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2; ART.roundRect(ctx, x, y, w, h, 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,211,77,0.35)'; ctx.lineWidth = 1; ART.roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 6); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '15px monospace'; ctx.textAlign = 'left';
    wrapText(dialog.lines[dialog.i], x + 18, y + 30, w - 36, 22);
    if (Math.floor(now() / 400) % 2) {
      ctx.fillStyle = '#ffd34d'; ctx.font = '12px monospace'; ctx.textAlign = 'right';
      ctx.fillText(ui().contDialog, x + w - 16, y + h - 12);
    }
  }

  /* ---------------- Night lighting pass ---------------- */
  function lightingPass() {
    lctx.globalCompositeOperation = 'source-over';
    // dawn-tinged darkness (slightly purple at the bottom, bluer up top)
    const grad = lctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, 'rgb(10,14,40)'); grad.addColorStop(1, 'rgb(24,14,34)');
    lctx.fillStyle = grad; lctx.fillRect(0, 0, VIEW_W, VIEW_H);

    lctx.globalCompositeOperation = 'destination-out';
    const carve = (x, y, r, soft) => {
      if (x < -r || y < -r || x > VIEW_W + r || y > VIEW_H + r) return;
      const g = lctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${soft})`); g.addColorStop(0.7, `rgba(0,0,0,${soft * 0.5})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g; lctx.beginPath(); lctx.arc(x, y, r, 0, 7); lctx.fill();
    };
    // player lantern
    carve(player.x + 10 - cam.x, player.y + 12 - cam.y, 110, 0.95);
    // lamps
    lamps.forEach(l => carve(l.lx - cam.x, l.ly - cam.y, 78, 1));
    // lit buildings
    LANDMARKS.forEach(L => {
      if (!L.building) return;
      const bx = (L.building.x + L.building.w / 2) * TILE - cam.x;
      const by = (L.building.y + L.building.h / 2) * TILE - cam.y;
      carve(bx, by, 70, 0.9);
    });

    lctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lightBuf, 0, 0);

    // warm additive glow on top of light pools
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x, y, r, col) => {
      if (x < -r || y < -r || x > VIEW_W + r || y > VIEW_H + r) return;
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    };
    lamps.forEach(l => glow(l.lx - cam.x, l.ly - cam.y, 60, 'rgba(255,190,90,0.16)'));
    LANDMARKS.forEach(L => {
      if (!L.building) return;
      const bx = (L.building.x + L.building.w / 2) * TILE - cam.x;
      const by = (L.building.y + L.building.h / 2) * TILE - cam.y;
      glow(bx, by, 55, 'rgba(255,200,120,0.10)');
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------------- Menu screen ---------------- */
  function renderMenu() {
    const time = now();
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, '#0c1230'); grad.addColorStop(0.4, '#2a2a5e');
    grad.addColorStop(0.55, '#5a4a78'); grad.addColorStop(0.58, '#3f6f3c'); grad.addColorStop(1, '#2c5226');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ART.stars(ctx, VIEW_W, VIEW_H, time);

    // moon with craters + halo
    const mg = ctx.createRadialGradient(640, 96, 10, 640, 96, 70);
    mg.addColorStop(0, 'rgba(244,233,184,0.5)'); mg.addColorStop(1, 'rgba(244,233,184,0)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(640, 96, 70, 0, 7); ctx.fill();
    ctx.fillStyle = '#f4e9b8'; ctx.beginPath(); ctx.arc(640, 96, 36, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(200,190,150,0.5)';
    ctx.beginPath(); ctx.arc(628, 88, 6, 0, 7); ctx.arc(650, 104, 8, 0, 7); ctx.arc(646, 80, 4, 0, 7); ctx.fill();

    // far hills
    ctx.fillStyle = '#24412a';
    ctx.beginPath(); ctx.moveTo(0, 330);
    for (let x = 0; x <= VIEW_W; x += 40) ctx.lineTo(x, 320 + Math.sin(x / 90) * 22);
    ctx.lineTo(VIEW_W, 360); ctx.lineTo(0, 360); ctx.fill();

    // river with shimmer + reflected moon
    ctx.fillStyle = '#2a4f86'; ctx.fillRect(0, 320, VIEW_W, 44);
    for (let i = 0; i < 30; i++) {
      const x = (i * 53 + (time / 40)) % VIEW_W;
      ctx.fillStyle = `rgba(255,255,255,${0.05 + 0.05 * Math.sin(time / 300 + i)})`;
      ctx.fillRect(x, 326 + (i % 4) * 8, 24, 1);
    }
    ctx.fillStyle = 'rgba(244,233,184,0.18)'; ctx.fillRect(628, 320, 24, 44);

    // the Devil's Bridge silhouette with its arch
    ctx.fillStyle = '#3a2c1c';
    ctx.fillRect(280, 318, 240, 8);
    ctx.beginPath(); ctx.moveTo(330, 326);
    ctx.bezierCurveTo(360, 286, 440, 286, 470, 326); ctx.lineTo(470, 340); ctx.lineTo(330, 340); ctx.fill();
    ctx.fillStyle = '#4a3826'; ctx.fillRect(360, 296, 6, 30); ctx.fillRect(434, 296, 6, 30);

    // drifting fireflies
    for (let i = 0; i < 14; i++) {
      const fx = (i * 91 + time / 30) % VIEW_W;
      const fy = 360 + Math.sin(time / 600 + i) * 40 + i * 6;
      ctx.fillStyle = `rgba(255,230,120,${0.4 + 0.4 * Math.sin(time / 200 + i)})`;
      ctx.fillRect(fx, fy % VIEW_H, 2, 2);
    }

    // title
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.font = 'bold 54px monospace';
    ctx.fillText('MARTORELL QUEST', VIEW_W/2 + 3, 133);
    ctx.fillStyle = '#ffd34d'; ctx.fillText('MARTORELL QUEST', VIEW_W/2, 130);
    ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 1; ctx.strokeText('MARTORELL QUEST', VIEW_W/2, 130);
    ctx.fillStyle = '#fff'; ctx.font = '20px monospace';
    ctx.fillText(ui().subtitle, VIEW_W/2, 165);

    if (Math.floor(time/500) % 2 === 0) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px monospace';
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      ctx.fillText(coarse ? ui().playTouch : ui().play, VIEW_W/2, 235);
    }
    menuRegions.play = { x: VIEW_W/2 - 180, y: 205, w: 360, h: 44 };

    ctx.fillStyle = '#ffe9a8'; ctx.font = '16px monospace';
    ctx.fillText(ui().language, VIEW_W/2, 430);
    menuRegions.langs = [];
    const bw = 150, gap = 16, total = LANG_ORDER.length * bw + (LANG_ORDER.length - 1) * gap;
    let bx = VIEW_W/2 - total/2; const by = 448;
    LANG_ORDER.forEach(code => {
      const sel = state.lang === code;
      ctx.fillStyle = sel ? '#ffd34d' : 'rgba(0,0,0,0.5)';
      ART.roundRect(ctx, bx, by, bw, 40, 6); ctx.fill();
      ctx.strokeStyle = sel ? '#fff' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
      ART.roundRect(ctx, bx, by, bw, 40, 6); ctx.stroke();
      ctx.fillStyle = sel ? '#3a2a00' : '#fff'; ctx.font = 'bold 16px monospace';
      ctx.fillText(LANG_NAMES[code], bx + bw/2, by + 26);
      menuRegions.langs.push({ lang: code, x: bx, y: by, w: bw, h: 40 });
      bx += bw + gap;
    });

    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '12px monospace';
    ctx.fillText('1 · 2 · 3  /  L', VIEW_W/2, 512);
    ctx.fillText(ui().tagline, VIEW_W/2, 560);
  }

  /* ---------------- Play scene ---------------- */
  function renderPlay() {
    const time = now();
    cam.x = Math.max(0, Math.min(MAP_W*TILE - VIEW_W, player.x + player.w/2 - VIEW_W/2));
    cam.y = Math.max(0, Math.min(MAP_H*TILE - VIEW_H, player.y + player.h/2 - VIEW_H/2));

    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.save();
    const sox = shake ? (Math.random() - 0.5) * shake : 0;
    const soy = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.translate(Math.round(sox), Math.round(soy));

    // terrain (blit visible region of the pre-rendered map)
    ctx.drawImage(terrain, cam.x, cam.y, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);

    // animated water highlights over visible water tiles
    const x0 = Math.floor(cam.x/TILE), y0 = Math.floor(cam.y/TILE);
    const x1 = Math.ceil((cam.x+VIEW_W)/TILE), y1 = Math.ceil((cam.y+VIEW_H)/TILE);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) continue;
      if (map[y][x] === 'W') ART.waterOverlay(ctx, x*TILE - cam.x, y*TILE - cam.y, x, y, TILE, time);
    }

    // depth-sorted entities
    const ents = [];
    trees.forEach(tr => ents.push({ by: tr.by, draw: () => ART.drawTree(ctx, tr.cx - cam.x, tr.by - cam.y, time, tr.seed) }));
    lamps.forEach(l => ents.push({ by: l.by, draw: () => ART.drawLamp(ctx, l.cx - cam.x, l.by - cam.y, time) }));
    LANDMARKS.forEach(L => {
      if (L.building) {
        const b = L.building;
        ents.push({ by: (b.y + b.h) * TILE, draw: () =>
          ART.drawBuilding(ctx, { color: L.color, roof: ROOFS[L.icon], icon: L.icon },
            b.x*TILE - cam.x, b.y*TILE - cam.y, b.w*TILE, b.h*TILE, time) });
      }
      ents.push({ by: L.y * TILE + TILE, draw: () => drawSignpost(L, L.x*TILE - cam.x, L.y*TILE - cam.y) });
    });
    enemies.forEach(en => { if (!en.dead) ents.push({ by: en.y + en.h, draw: () => {
      if (en.hurt > 0 && Math.floor(en.hurt/3) % 2) return;
      ART.drawImp(ctx, en.x - cam.x, en.y - cam.y, time, en.seed);
    } }); });
    ents.push({ by: player.y + player.h, draw: () => {
      if (player.hurt > 0 && Math.floor(player.hurt/4) % 2) return;
      const walk = (Math.abs(player.anim) > 0.01) ? player.anim : null;
      const atk = player.attack > 0 ? player.attack / 14 : 0;
      ART.drawHero(ctx, player.x - cam.x, player.y - cam.y, player.dir, walk, atk);
    } });
    ents.sort((a, b) => a.by - b.by);
    ents.forEach(e => e.draw());

    // floating landmark markers + particles
    LANDMARKS.forEach(drawMarker);
    drawParticles();

    // atmospheric night lighting
    lightingPass();

    ctx.restore();

    // HUD / dialog (unaffected by shake)
    drawHUD();
    drawDialog();

    if (state.won) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 36px monospace'; ctx.textAlign = 'center';
      ctx.fillText(ui().won1, VIEW_W/2, VIEW_H/2 - 10);
      ctx.fillStyle = '#fff'; ctx.font = '16px monospace';
      ctx.fillText(ui().won2, VIEW_W/2, VIEW_H/2 + 24);
    }
  }

  function render() { if (state.scene === 'menu') renderMenu(); else renderPlay(); }

  /* ---------------- Main loop ---------------- */
  refreshChrome();
  (function loop() { update(); render(); requestAnimationFrame(loop); })();
})();
