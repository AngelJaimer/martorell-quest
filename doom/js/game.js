/* ============================================================
 *  MARTODOOM · game.js — input, combat, AI, HUD, audio, i18n.
 * ============================================================ */
'use strict';

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  /* ---------------- i18n ---------------- */
  const STR = {
    es: {
      title: 'MARTODOOM', sub: 'Episodio 1 · Buenos Aires & Camí Fondo',
      story: ['El Diablo nunca perdonó lo del puente. Esta tarde ha abierto',
              'un portal frente a la iglesia de Crist Salvador y sus diablillos',
              'han tomado Buenos Aires y Camí Fondo.',
              'Eres del barrio. Esto no va a quedar así.'],
      start: 'Haz clic para jugar', lang: 'L · idioma',
      controls: 'WASD mover · ratón/flechas girar · clic/espacio disparar · 1-3 arma · M mapa · R reiniciar',
      obj1: 'Busca la llave del pabellón del IES Pompeu Fabra',
      obj2: 'Cierra el portal de la plaza Pompeu Fabra',
      msgKey: '¡La llave del Botxí! Algo ruge en la plaza Pompeu Fabra…',
      msgBoss: 'EN BANYETA te espera ante Crist Salvador',
      msgShotgun: '¡Escopeta de la fiesta mayor!',
      dead: 'HAS CAÍDO EN EL BARRIO', deadSub: 'Pulsa R para volver a intentarlo',
      win: 'EL PORTAL SE HA CERRADO', winSub: 'Buenos Aires y Camí Fondo respiran. Pulsa R para rejugar.',
      hpL: 'VIDA', amL: 'MUNICIÓN', kiL: 'DIABLOS', wpn: ['PORRA', 'PISTOLA', 'ESCOPETA'],
      noammo: 'Sin munición', got: { coca: '+25 · coca de Martorell', vi: '+10 · un trago del porró', bales: '+20 balas', cartutxos: '+8 cartuchos' },
    },
    ca: {
      title: 'MARTODOOM', sub: 'Episodi 1 · Buenos Aires & Camí Fondo',
      story: ['El Diable mai no va perdonar allò del pont. Aquesta tarda ha obert',
              'un portal davant de Crist Salvador i els seus diablots',
              'han pres Buenos Aires i el Camí Fondo.',
              'Ets del barri. Això no quedarà així.'],
      start: 'Fes clic per jugar', lang: 'L · llengua',
      controls: 'WASD moure · ratolí/fletxes girar · clic/espai disparar · 1-3 arma · M mapa · R reiniciar',
      obj1: "Busca la clau al pavelló de l'IES Pompeu Fabra",
      obj2: 'Tanca el portal de la plaça Pompeu Fabra',
      msgKey: 'La clau del Botxí! Alguna cosa rugeix a la plaça Pompeu Fabra…',
      msgBoss: 'EN BANYETA t\'espera davant Crist Salvador',
      msgShotgun: 'Escopeta de la festa major!',
      dead: 'HAS CAIGUT AL BARRI', deadSub: 'Prem R per tornar-ho a provar',
      win: 'EL PORTAL S\'HA TANCAT', winSub: 'Buenos Aires i el Camí Fondo respiren. Prem R per rejugar.',
      hpL: 'VIDA', amL: 'MUNICIÓ', kiL: 'DIABLES', wpn: ['PORRA', 'PISTOLA', 'ESCOPETA'],
      noammo: 'Sense munició', got: { coca: '+25 · coca de Martorell', vi: '+10 · un glop de porró', bales: '+20 bales', cartutxos: '+8 cartutxos' },
    },
    en: {
      title: 'MARTODOOM', sub: 'Episode 1 · Buenos Aires & Camí Fondo',
      story: ['The Devil never forgave the bridge trick. This evening he opened',
              'a portal in front of Crist Salvador church, and his imps',
              'have overrun Buenos Aires and Camí Fondo.',
              'You are from the barri. This will not stand.'],
      start: 'Click to play', lang: 'L · language',
      controls: 'WASD move · mouse/arrows turn · click/space fire · 1-3 weapon · M map · R restart',
      obj1: 'Find the key in the IES Pompeu Fabra sports hall',
      obj2: 'Close the portal on Plaça Pompeu Fabra',
      msgKey: "The Botxí's key! Something roars over at Plaça Pompeu Fabra…",
      msgBoss: 'EN BANYETA awaits you before Crist Salvador',
      msgShotgun: 'Festa major shotgun!',
      dead: 'YOU FELL IN THE BARRI', deadSub: 'Press R to try again',
      win: 'THE PORTAL IS CLOSED', winSub: 'Buenos Aires and Camí Fondo can breathe. Press R to replay.',
      hpL: 'HEALTH', amL: 'AMMO', kiL: 'DEMONS', wpn: ['BAT', 'PISTOL', 'SHOTGUN'],
      noammo: 'Out of ammo', got: { coca: '+25 · coca de Martorell', vi: '+10 · a swig from the porró', bales: '+20 bullets', cartutxos: '+8 shells' },
    },
  };
  const LANGS = ['es', 'ca', 'en'];
  let lang = 'es';
  const S = () => STR[lang];

  /* ---------------- audio (WebAudio, all synthesised) ---------------- */
  let AC = null, master = null;
  function audio() {
    if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.35; master.connect(AC.destination); }
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(f0, f1, dur, type, vol = 0.5, delay = 0) {
    if (!AC) return;
    const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur);
  }
  function noise(dur, vol = 0.5, lp = 1200, delay = 0) {
    if (!AC) return;
    const t = AC.currentTime + delay, n = AC.sampleRate * dur, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = AC.createBufferSource(); src.buffer = b;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
    const g = AC.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master); src.start(t);
  }
  const SFX = {
    pistol: () => { noise(0.09, 0.5, 2600); tone(420, 80, 0.08, 'square', 0.3); },
    shotgun: () => { noise(0.22, 0.8, 1600); tone(180, 40, 0.18, 'sawtooth', 0.4); },
    swing: () => tone(300, 120, 0.12, 'sine', 0.3),
    thwack: () => { noise(0.06, 0.5, 900); tone(160, 60, 0.08, 'square', 0.35); },
    hurt: () => tone(220, 90, 0.25, 'sawtooth', 0.45),
    growl: () => { tone(95, 55, 0.4, 'sawtooth', 0.3); tone(140, 70, 0.4, 'square', 0.15, 0.05); },
    bark: () => { tone(340, 150, 0.09, 'square', 0.35); tone(300, 130, 0.09, 'square', 0.3, 0.12); },
    die: () => { tone(180, 40, 0.5, 'sawtooth', 0.4); noise(0.3, 0.3, 700, 0.1); },
    pick: () => { tone(660, 990, 0.09, 'square', 0.25); tone(990, 1320, 0.1, 'square', 0.2, 0.08); },
    key: () => { for (let i = 0; i < 4; i++) tone(523 * Math.pow(1.25, i), 523 * Math.pow(1.25, i), 0.16, 'triangle', 0.3, i * 0.13); },
    bell: () => { for (let i = 0; i < 3; i++) { tone(311, 308, 1.1, 'sine', 0.4, i * 0.7); tone(622, 615, 0.7, 'sine', 0.15, i * 0.7); } },
    roar: () => { tone(70, 30, 1.1, 'sawtooth', 0.6); noise(0.8, 0.4, 400, 0.1); },
    fire: () => noise(0.18, 0.35, 800),
    boom: () => { noise(0.5, 0.8, 500); tone(90, 30, 0.4, 'sine', 0.6); },
  };

  /* ---------------- enemy & weapon defs ---------------- */
  const EDEF = {
    diablot: { hp: 30, sp: 2.4, r: 0.4, wM: 1.5, hM: 1.7, sight: 65, melee: 8, ranged: true, fcd: 2.3, snd: 'growl' },
    gos:     { hp: 18, sp: 4.6, r: 0.4, wM: 1.6, hM: 1.0, sight: 55, melee: 11, ranged: false, snd: 'bark' },
    botxi:   { hp: 150, sp: 1.8, r: 0.6, wM: 2.2, hM: 2.4, sight: 70, melee: 20, ranged: true, fcd: 1.6, snd: 'roar' },
    banyeta: { hp: 650, sp: 2.1, r: 0.8, wM: 3.0, hM: 3.4, sight: 90, melee: 25, ranged: true, fcd: 1.1, snd: 'roar', boss: true },
  };
  const WDEF = [
    { key: 'porra',    rate: 0.5,  melee: true,  dmg: 34, range: 2.3 },
    { key: 'pistola',  rate: 0.36, dmg: 14, ammo: 'bales',     spread: 0.012 },
    { key: 'escopeta', rate: 0.95, dmg: 8,  ammo: 'cartutxos', pellets: 8, spread: 0.085 },
  ];

  /* ---------------- state ---------------- */
  let state, P, enemies, shots, pickups, msgs, kills, totalKills, time;
  let hasKey, bossUp, boss, won, flash, hurtFlash, showMap, portalE;
  const keys = {};

  // spatial hash for solid props
  const HASH = new Map();
  for (const p of MAP.props) {
    if (!p.solid) continue;
    const k = ((p.x / 4) | 0) + ',' + ((p.y / 4) | 0);
    if (!HASH.has(k)) HASH.set(k, []);
    HASH.get(k).push(p);
  }
  function propsNear(x, y) {
    const out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const l = HASH.get((((x / 4) | 0) + dx) + ',' + (((y / 4) | 0) + dy));
      if (l) out.push(...l);
    }
    return out;
  }

  function solidAt(x, y) {
    const ix = x | 0, iy = y | 0;
    if (ix < 0 || iy < 0 || ix >= MAP.W || iy >= MAP.H) return true;
    const t = MAP.wall[iy * MAP.W + ix];
    return t !== 0 && MAP.types[t].h >= 0.6;
  }
  function free(x, y, r) {
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r], [0, 0]])
      if (solidAt(x + ox, y + oy)) return false;
    for (const p of propsNear(x, y))
      if ((x - p.x) ** 2 + (y - p.y) ** 2 < (r + p.r) ** 2) return false;
    return true;
  }
  function tryMove(e, dx, dy) {
    if (free(e.x + dx, e.y, e.r)) e.x += dx;
    if (free(e.x, e.y + dy, e.r)) e.y += dy;
  }

  function reset() {
    P = { x: MAP.start.x, y: MAP.start.y, a: MAP.start.a, hp: 100, r: 0.35,
          ammo: { bales: 48, cartutxos: 0 }, wpns: [true, true, false], wi: 1,
          cd: 0, fire: 0, bobT: 0 };
    enemies = []; shots = []; msgs = []; kills = 0; time = 0;
    hasKey = false; bossUp = false; boss = null; won = false;
    flash = 0; hurtFlash = 0; showMap = false;
    let id = 0;
    for (const z of MAP.spawns)
      for (let i = 0; i < z.n; i++)
        for (let tr = 0; tr < 20; tr++) {
          const x = z.x + (Math.random() * 2 - 1) * z.r, y = z.y + (Math.random() * 2 - 1) * z.r;
          if (free(x, y, EDEF[z.t].r)) {
            const d = EDEF[z.t];
            enemies.push({ id: id++, t: z.t, ...JSON.parse(JSON.stringify(d)), x, y, hp: d.hp,
                           st: 'idle', cd: Math.random() * 2, pain: 0, animT: Math.random() * 9 });
            break;
          }
        }
    totalKills = enemies.length + 1;   // +1: the boss
    pickups = MAP.pickups.map(p => ({ ...p, taken: false }));
    pickups.push({ t: 'key', x: MAP.keySpot.x, y: MAP.keySpot.y, taken: false });
    portalE = { x: MAP.portal.x, y: MAP.portal.y };
  }

  function msg(txt, dur = 2.6) { msgs.push({ txt, t: dur }); }

  /* ---------------- input ---------------- */
  addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyL') { lang = LANGS[(LANGS.indexOf(lang) + 1) % 3]; }
    if (e.code === 'KeyR' && state !== 'menu') { reset(); state = 'play'; }
    if (e.code === 'KeyM' || e.code === 'Tab') { showMap = !showMap; e.preventDefault(); }
    if (state === 'play') {
      if (e.code === 'Digit1') switchW(0);
      if (e.code === 'Digit2') switchW(1);
      if (e.code === 'Digit3') switchW(2);
      if (e.code === 'Space') { shoot(); e.preventDefault(); }
    }
    if (state === 'menu' && e.code === 'Enter') startGame();
  });
  addEventListener('keyup', e => keys[e.code] = false);
  canvas.addEventListener('click', () => {
    audio();
    if (state === 'menu') startGame();
    else if (state === 'play') {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
      shoot();
    }
  });
  addEventListener('mousemove', e => {
    if (state === 'play' && document.pointerLockElement === canvas) P.a += e.movementX * 0.0026;
  });
  function startGame() { state = 'play'; canvas.requestPointerLock && canvas.requestPointerLock(); }
  function switchW(i) { if (P.wpns[i]) { P.wi = i; P.cd = Math.max(P.cd, 0.25); } }

  /* ---------------- combat ---------------- */
  function shoot() {
    if (state !== 'play' || P.cd > 0) return;
    const w = WDEF[P.wi];
    if (w.ammo && P.ammo[w.ammo] <= 0) { msg(S().noammo, 1.2); SFX.swing(); P.cd = 0.3; return; }
    P.cd = w.rate; P.fire = 1;
    if (w.melee) {
      SFX.swing();
      let hit = null, hd = 1e9;
      for (const e of enemies) {
        if (e.st === 'dead') continue;
        const d = Math.hypot(e.x - P.x, e.y - P.y);
        const ang = Math.atan2(e.y - P.y, e.x - P.x);
        let da = Math.abs(((ang - P.a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        if (d < w.range + e.r && da < 0.7 && d < hd) { hit = e; hd = d; }
      }
      if (hit) { SFX.thwack(); damage(hit, w.dmg); }
      return;
    }
    P.ammo[w.ammo]--;
    if (w.pellets) SFX.shotgun(); else SFX.pistol();
    const n = w.pellets || 1;
    for (let i = 0; i < n; i++) {
      const a = P.a + (Math.random() * 2 - 1) * w.spread;
      const dx = Math.cos(a), dy = Math.sin(a);
      const wd = ENGINE.wallDist(P.x, P.y, dx, dy, 200, 0.9);
      let hit = null, hd = wd;
      for (const e of enemies) {
        if (e.st === 'dead') continue;
        const ex = e.x - P.x, ey = e.y - P.y;
        const depth = ex * dx + ey * dy;
        if (depth < 0.3 || depth > hd) continue;
        if (Math.abs(-dy * ex + dx * ey) < e.r + 0.15) { hit = e; hd = depth; }
      }
      if (hit) damage(hit, w.dmg);
    }
  }
  function damage(e, d) {
    e.hp -= d;
    if (e.hp <= 0 && e.st !== 'dead') {
      e.st = 'dead'; e.deadT = 0; kills++;
      SFX.die();
      if (e.t === 'banyeta') { SFX.boom(); won = true; setTimeout(() => { state = 'win'; document.exitPointerLock && document.exitPointerLock(); }, 1800); }
    } else { e.pain = 0.25; if (e.st === 'idle') e.st = 'chase'; }
  }
  function hurtPlayer(d) {
    if (state !== 'play') return;
    P.hp -= d; hurtFlash = 0.5; SFX.hurt();
    if (P.hp <= 0) { P.hp = 0; state = 'dead'; document.exitPointerLock && document.exitPointerLock(); }
  }

  /* ---------------- enemy AI ---------------- */
  function los(e) {
    const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy);
    if (d < 0.001) return true;
    return ENGINE.wallDist(e.x, e.y, dx / d, dy / d, d, 1.5) >= d - 0.4;
  }
  function updEnemies(dt) {
    for (const e of enemies) {
      e.animT += dt;
      if (e.st === 'dead') { e.deadT += dt; continue; }
      if (e.pain > 0) { e.pain -= dt; continue; }
      e.cd -= dt;
      const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy);
      if (e.st === 'idle') {
        if (d < e.sight && los(e)) { e.st = 'chase'; SFX[e.snd](); }
        continue;
      }
      // chase / attack
      const seen = d < 95 && los(e);
      if (e.ranged && seen && d > 7 && d < 55 && e.cd <= 0) {
        e.cd = e.fcd;
        e.atk = 0.35;
        const shotsN = e.t === 'banyeta' ? 3 : 1;
        for (let i = 0; i < shotsN; i++) {
          const a = Math.atan2(dy, dx) + (i - (shotsN - 1) / 2) * 0.18;
          shots.push({ x: e.x + Math.cos(a) * 0.8, y: e.y + Math.sin(a) * 0.8, dx: Math.cos(a) * 12, dy: Math.sin(a) * 12, t: 4, hostile: true });
        }
        SFX.fire();
      }
      if (e.atk > 0) { e.atk -= dt; continue; }
      if (d < e.r + 0.9) {
        if (e.cd <= 0) { e.cd = e.t === 'gos' ? 0.7 : 1.1; hurtPlayer(e.melee); }
      } else {
        // steer toward player; if blocked, try perpendicular
        const sp = e.sp * dt;
        const ox = e.x, oy = e.y;
        tryMove(e, dx / d * sp, dy / d * sp);
        if (Math.hypot(e.x - ox, e.y - oy) < sp * 0.3) {
          const side = (e.id % 2 ? 1 : -1);
          tryMove(e, -dy / d * sp * side, dx / d * sp * side);
        }
        // unstick from buddies
        for (const o of enemies) {
          if (o === e || o.st === 'dead') continue;
          const sx = e.x - o.x, sy = e.y - o.y, sd = Math.hypot(sx, sy);
          if (sd > 0.01 && sd < e.r + o.r) { e.x += sx / sd * 0.04; e.y += sy / sd * 0.04; }
        }
      }
      // banyeta summons reinforcements
      if (e.t === 'banyeta') {
        e.sumT = (e.sumT || 8) - dt;
        if (e.sumT <= 0 && enemies.filter(o => o.st !== 'dead' && o.t === 'diablot' && o.summoned).length < 4) {
          e.sumT = 9;
          const a = Math.random() * 6.28, x = e.x + Math.cos(a) * 4, y = e.y + Math.sin(a) * 4;
          if (free(x, y, 0.4)) {
            const dd = EDEF.diablot;
            enemies.push({ id: 999 + (Math.random() * 9999 | 0), t: 'diablot', ...JSON.parse(JSON.stringify(dd)), x, y, hp: dd.hp, st: 'chase', cd: 1, pain: 0, animT: 0, summoned: true });
            totalKills++;
          }
        }
      }
    }
  }

  function updShots(dt) {
    for (const s of shots) {
      s.t -= dt;
      const nx = s.x + s.dx * dt, ny = s.y + s.dy * dt;
      if (solidAt(nx, ny)) { s.t = 0; continue; }
      s.x = nx; s.y = ny;
      if (s.hostile && Math.hypot(s.x - P.x, s.y - P.y) < 0.6) { hurtPlayer(10); s.t = 0; }
    }
    shots = shots.filter(s => s.t > 0);
  }

  function updPickups() {
    for (const p of pickups) {
      if (p.taken) continue;
      if (Math.hypot(p.x - P.x, p.y - P.y) > 1.0) continue;
      if (p.t === 'coca') { if (P.hp >= 100) continue; P.hp = Math.min(100, P.hp + 25); msg(S().got.coca, 1.4); }
      else if (p.t === 'vi') { if (P.hp >= 100) continue; P.hp = Math.min(100, P.hp + 10); msg(S().got.vi, 1.4); }
      else if (p.t === 'bales') { P.ammo.bales += 20; msg(S().got.bales, 1.4); }
      else if (p.t === 'cartutxos') { if (!P.wpns[2]) continue; P.ammo.cartutxos += 8; msg(S().got.cartutxos, 1.4); }
      else if (p.t === 'shotgun') { P.wpns[2] = true; P.ammo.cartutxos += 8; P.wi = 2; msg(S().msgShotgun, 2.2); }
      else if (p.t === 'key') {
        hasKey = true; bossUp = true; SFX.key(); SFX.bell(); msg(S().msgKey, 3.4);
        const dd = EDEF.banyeta;
        boss = { id: 7777, t: 'banyeta', ...JSON.parse(JSON.stringify(dd)), x: MAP.portal.x, y: MAP.portal.y + 3,
                 hp: dd.hp, st: 'idle', cd: 1, pain: 0, animT: 0 };
        enemies.push(boss);
        setTimeout(() => { if (state === 'play') { msg(S().msgBoss, 3); SFX.roar(); } }, 1600);
      }
      p.taken = true; flash = 0.25;
      if (p.t !== 'key' && p.t !== 'shotgun') SFX.pick();
    }
  }

  /* ---------------- per-frame sprite list ---------------- */
  function buildSprites() {
    const out = [];
    for (const pr of MAP.props) {
      let spr, wM, hM;
      switch (pr.kind) {
        case 'plane': spr = ART3D.sprites.plane; wM = 5; hM = 6.6; break;
        case 'pine': spr = ART3D.sprites.pine; wM = 4.4; hM = 8; break;
        case 'lamp': spr = ART3D.sprites.lamp; wM = 1.6; hM = 5.2; break;
        case 'bench': spr = ART3D.sprites.bench; wM = 1.9; hM = 0.95; break;
        case 'car': spr = ART3D.sprites.cars[(pr.x * 7 + pr.y * 3 | 0) % ART3D.sprites.cars.length]; wM = 4.3; hM = 1.55; break;
        case 'busstop': spr = ART3D.sprites.busstop; wM = 1.3; hM = 2.8; break;
      }
      out.push({ x: pr.x, y: pr.y, spr, wM, hM, zM: 0 });
    }
    const bob = Math.sin(time * 3) * 0.12 + 0.18;
    for (const p of pickups) {
      if (p.taken) continue;
      const sz = { coca: [0.9, 0.5], vi: [0.6, 0.75], bales: [0.7, 0.45], cartutxos: [0.7, 0.45], shotgun: [1.4, 0.4], key: [0.6, 0.8] }[p.t];
      out.push({ x: p.x, y: p.y, spr: ART3D.sprites[p.t], wM: sz[0], hM: sz[1], zM: bob });
    }
    const pf = (time * 5 | 0) % 2;
    out.push({ x: portalE.x, y: portalE.y, spr: ART3D.sprites.portal[pf], wM: 4, hM: 5.4, zM: 0 });
    for (const s of shots) out.push({ x: s.x, y: s.y, spr: ART3D.sprites.fireball[pf], wM: 0.55, hM: 0.55, zM: 1.1 });
    for (const e of enemies) {
      const set = ART3D.sprites[e.t];
      let spr;
      if (e.st === 'dead') spr = set.dead[0];
      else if (e.atk > 0 || e.pain > 0) spr = set.attack[0];
      else spr = set.walk[(e.animT * 4 | 0) % 2];
      const hM = e.st === 'dead' ? e.hM * 0.35 : e.hM;
      out.push({ x: e.x, y: e.y, spr, wM: e.wM, hM, zM: 0 });
    }
    return out;
  }

  /* ---------------- minimap ---------------- */
  let mapBase = null;
  function buildMapBase() {
    const sc = 1.2;
    const c = ART3D.cv(MAP.W * sc | 0, MAP.H * sc | 0), g = c.getContext('2d');
    const fc = ['#6b5d49', '#43454a', '#8d8a85', '#a06044', '#aaa291', '#4a6e38', '#3a6e60', '#b9b9b4', '#7e6e55'];
    for (let y = 0; y < MAP.H; y += 2) for (let x = 0; x < MAP.W; x += 2) {
      const w = MAP.wall[y * MAP.W + x];
      if (w) { const d = MAP.types[w]; g.fillStyle = d.mat === 'pines' ? '#243d26' : (d.c || '#888'); }
      else g.fillStyle = fc[MAP.floor[y * MAP.W + x]];
      g.fillRect(x * sc, y * sc, 2 * sc + 0.5, 2 * sc + 0.5);
    }
    g.font = 'bold 11px sans-serif'; g.textAlign = 'center';
    for (const l of MAP.labels) {
      g.save(); g.translate(l.x * sc, l.y * sc);
      if (l.vert) g.rotate(-Math.PI / 2);
      g.strokeStyle = 'rgba(0,0,0,.75)'; g.lineWidth = 3; g.strokeText(l.name, 0, 0);
      g.fillStyle = '#ffe9c0'; g.fillText(l.name, 0, 0);
      g.restore();
    }
    return c;
  }
  function drawMap() {
    if (!mapBase) mapBase = buildMapBase();
    const sc = 1.2;
    const mw = mapBase.width, mh = mapBase.height;
    const ox = (canvas.width - mw) / 2, oy = (canvas.height - mh) / 2;
    ctx.fillStyle = 'rgba(8,6,10,.72)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mapBase, ox, oy);
    // objective marker
    const tgt = hasKey ? MAP.portal : MAP.keySpot;
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(ox + tgt.x * sc, oy + tgt.y * sc, 5 + Math.sin(time * 6) * 2, 0, 7); ctx.fill();
    for (const e of enemies) {
      if (e.st === 'dead' || e.st === 'idle') continue;
      ctx.fillStyle = '#e3402e'; ctx.fillRect(ox + e.x * sc - 2, oy + e.y * sc - 2, 4, 4);
    }
    ctx.save(); ctx.translate(ox + P.x * sc, oy + P.y * sc); ctx.rotate(P.a);
    ctx.fillStyle = '#7ad0ff'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.fill();
    ctx.restore();
  }

  /* ---------------- HUD ---------------- */
  function drawHUD() {
    const W = canvas.width, H = canvas.height;
    // crosshair
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fillRect(W / 2 - 1, H / 2 - 7, 2, 5); ctx.fillRect(W / 2 - 1, H / 2 + 2, 2, 5);
    ctx.fillRect(W / 2 - 7, H / 2 - 1, 5, 2); ctx.fillRect(W / 2 + 2, H / 2 - 1, 5, 2);
    // weapon
    const w = WDEF[P.wi];
    const bob = { x: Math.sin(P.bobT * 7.5) * 9, y: Math.abs(Math.cos(P.bobT * 7.5)) * 7 };
    ART3D.weapons[w.key](ctx, W / 2, H - 64, bob, Math.max(0, P.fire));
    // bottom bar
    ctx.fillStyle = 'rgba(12,10,16,.82)'; ctx.fillRect(0, H - 64, W, 64);
    ctx.fillStyle = '#5a3320'; ctx.fillRect(0, H - 66, W, 2);
    ctx.textAlign = 'left'; ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#9a9590'; ctx.fillText(S().hpL, 24, H - 42);
    ctx.font = 'bold 30px monospace'; ctx.fillStyle = P.hp > 35 ? '#e8e2c8' : '#e3402e';
    ctx.fillText(P.hp + '%', 24, H - 14);
    ctx.font = 'bold 13px monospace'; ctx.fillStyle = '#9a9590'; ctx.fillText(S().amL, 160, H - 42);
    ctx.font = 'bold 30px monospace'; ctx.fillStyle = '#e8e2c8';
    ctx.fillText(w.melee ? '—' : String(P.ammo[w.ammo]), 160, H - 14);
    ctx.font = 'bold 13px monospace'; ctx.fillStyle = '#9a9590'; ctx.fillText(S().kiL, 290, H - 42);
    ctx.font = 'bold 30px monospace'; ctx.fillStyle = '#e8e2c8'; ctx.fillText(kills + '/' + totalKills, 290, H - 14);
    // weapons owned
    ctx.font = 'bold 12px monospace';
    for (let i = 0; i < 3; i++) {
      if (!P.wpns[i]) continue;
      ctx.fillStyle = i === P.wi ? '#ffd24a' : '#7a7468';
      ctx.fillText((i + 1) + ' ' + S().wpn[i], 430, H - 44 + i * 18);
    }
    if (hasKey) { ctx.drawImage(ART3D.sprites.key, W - 200, H - 56, 24, 30); }
    // objective + boss bar
    ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(12,10,16,.6)';
    const obj = hasKey ? S().obj2 : S().obj1;
    ctx.fillRect(12, 12, ctx.measureText('▸ ' + obj).width + 16, 24);
    ctx.fillStyle = '#ffe9c0'; ctx.fillText('▸ ' + obj, 20, 29);
    if (boss && boss.st !== 'dead' && boss.st !== 'idle') {
      ctx.fillStyle = 'rgba(12,10,16,.6)'; ctx.fillRect(W / 2 - 152, 14, 304, 18);
      ctx.fillStyle = '#7a1420'; ctx.fillRect(W / 2 - 150, 16, 300, 14);
      ctx.fillStyle = '#e3402e'; ctx.fillRect(W / 2 - 150, 16, 300 * Math.max(0, boss.hp) / EDEF.banyeta.hp, 14);
      ctx.fillStyle = '#ffe9c0'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('EN BANYETA', W / 2, 27);
    }
    // messages
    ctx.textAlign = 'center'; ctx.font = 'bold 17px monospace';
    let my = 70;
    for (const m of msgs) {
      ctx.fillStyle = 'rgba(12,10,16,.55)';
      ctx.fillRect(W / 2 - ctx.measureText(m.txt).width / 2 - 10, my - 17, ctx.measureText(m.txt).width + 20, 24);
      ctx.fillStyle = '#ffe9c0'; ctx.fillText(m.txt, W / 2, my); my += 30;
    }
    // street you are on (the realism touch)
    const here = nearestLabel();
    if (here) {
      ctx.font = '12px monospace'; ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(12,10,16,.55)';
      ctx.fillRect(W - ctx.measureText(here).width - 28, 12, ctx.measureText(here).width + 16, 22);
      ctx.fillStyle = '#cfe3ff'; ctx.fillText(here, W - 20, 28);
    }
  }
  function nearestLabel() {
    let best = null, bd = 1e9;
    for (const l of MAP.labels) {
      const d = Math.hypot(l.x - P.x, l.y - P.y);
      if (d < bd) { bd = d; best = l.name; }
    }
    return best;
  }

  function centerScreen(big, small, sub) {
    ctx.fillStyle = 'rgba(8,4,8,.78)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e3402e'; ctx.font = 'bold 54px monospace';
    ctx.fillText(big, canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillStyle = '#ffe9c0'; ctx.font = 'bold 18px monospace';
    ctx.fillText(small, canvas.width / 2, canvas.height / 2 + 16);
    if (sub) { ctx.fillStyle = '#9a9590'; ctx.font = '14px monospace'; ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 48); }
  }
  function drawMenu() {
    ctx.drawImage(ENGINE.render({ x: MAP.portal.x, y: MAP.portal.y + 26, a: -Math.PI / 2 + Math.sin(time * 0.1) * 0.2 }, buildSprites()), 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(10,6,10,.55)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e3402e'; ctx.font = 'bold 64px monospace'; ctx.fillText(S().title, canvas.width / 2, 130);
    ctx.fillStyle = '#ffd24a'; ctx.font = 'bold 20px monospace'; ctx.fillText(S().sub, canvas.width / 2, 165);
    ctx.fillStyle = '#e8e2c8'; ctx.font = '16px monospace';
    S().story.forEach((l, i) => ctx.fillText(l, canvas.width / 2, 230 + i * 26));
    ctx.fillStyle = '#ffe9c0'; ctx.font = 'bold 22px monospace';
    if ((time * 2 | 0) % 2) ctx.fillText(S().start, canvas.width / 2, 400);
    ctx.fillStyle = '#9a9590'; ctx.font = '13px monospace';
    ctx.fillText(S().controls, canvas.width / 2, 450);
    ctx.fillText(S().lang + '  ·  [' + lang.toUpperCase() + ']', canvas.width / 2, 478);
    ctx.fillStyle = '#6a665c'; ctx.font = '11px monospace';
    ctx.fillText('Martorell, Baix Llobregat — carrers i places reals dels dos barris', canvas.width / 2, 560);
  }

  /* ---------------- main loop ---------------- */
  let last = 0;
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts; time += dt;

    if (state === 'play') {
      // movement
      const fw = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      const st = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
      if (keys.ArrowLeft) P.a -= 2.6 * dt;
      if (keys.ArrowRight) P.a += 2.6 * dt;
      const sp = 5.6 * dt;
      if (fw || st) {
        const n = Math.hypot(fw, st);
        const mx = (Math.cos(P.a) * fw / n + Math.cos(P.a + Math.PI / 2) * st / n) * sp;
        const my = (Math.sin(P.a) * fw / n + Math.sin(P.a + Math.PI / 2) * st / n) * sp;
        tryMove(P, mx, my);
        P.bobT += dt;
      }
      P.cd -= dt; P.fire = Math.max(0, P.fire - dt * 5);
      if (keys.Space) shoot();
      updEnemies(dt); updShots(dt); updPickups();
      for (const m of msgs) m.t -= dt;
      msgs = msgs.filter(m => m.t > 0);
      flash = Math.max(0, flash - dt); hurtFlash = Math.max(0, hurtFlash - dt);
    }

    // render world
    if (state === 'menu') drawMenu();
    else {
      ctx.drawImage(ENGINE.render(P, buildSprites()), 0, 0, canvas.width, canvas.height);
      if (state === 'play' || state === 'dead') {
        if (hurtFlash > 0) { ctx.fillStyle = `rgba(200,30,20,${(hurtFlash * 0.8).toFixed(2)})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        if (flash > 0) { ctx.fillStyle = `rgba(255,240,200,${(flash * 0.5).toFixed(2)})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      }
      if (state === 'play') { drawHUD(); if (showMap) drawMap(); }
      if (state === 'dead') centerScreen(S().dead, S().deadSub);
      if (state === 'win') centerScreen(S().win, S().winSub, 'MARTODOOM · Episodi 1');
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- boot ---------------- */
  ENGINE.init();
  reset();
  state = 'menu';
  requestAnimationFrame(frame);
})();
