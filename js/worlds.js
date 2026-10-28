// CRYO DRIFT - the three worlds: stealth wilds, lantern labyrinth, Caesar's tower.
// Puzzle progression only - no weapons, no combat (TSA rules: E for Everyone).

import { PAL, FONT } from './palette.js';
import { Sfx } from './audio.js';
import { wrapText, Dialogue } from './ui.js';

function f(px, bold = '') { return `${bold} ${px}px ${FONT}`.trim(); }

// ============================ WORLD 1: STEALTH ============================
const MAPW = 30, MAPH = 15, TS = 32;
const MAPROWS = [
  '##############################',
  '#............#..........b....#',
  '#....b....b..#...######b..b..#',
  '#..c.#####..b#.........b..c..#',
  '#....#...#....b..###..b#####.#',
  '#..f.#...b......#...b.....b..#',
  '#....#####..###.#.###.####...#',
  '#.......b.....#.....#.....b..#',
  '#..###.####...#..f..######...#',
  '#..#.....#....#####......#c..#',
  '#..#..f..#..........b....#...#',
  '#..#####.....####..b..####...#',
  '#.....b....E.#..b..f.#f......#',
  '#..f......P..#.....b......b..#',
  '##############################',
];

export function stealthLevel(g) {
  // parse map
  const solid = [], bramble = [], ferns = [], cells = [];
  let start = { x: 2, y: 2 }, exit = { x: 2, y: 12 };
  for (let y = 0; y < MAPH; y++) {
    const row = (MAPROWS[y] || '').padEnd(MAPW, '#');
    for (let x = 0; x < MAPW; x++) {
      const c = row[x];
      if (c === '#') solid.push({ x, y });
      else if (c === 'b') bramble.push({ x, y });
      else if (c === 'f') ferns.push({ x, y });
      else if (c === 'c') cells.push({ tx: x, ty: y, got: false });
      else if (c === 'P') start = { x, y };
      else if (c === 'E') exit = { x, y };
    }
  }

  const watchers = [
    { ax: 2, ay: 5, bx: 9, by: 5, t: 0, dir: 1, pause: 0, susp: 0, alert: 0 },
    { ax: 18, ay: 10, bx: 27, by: 10, t: 0, dir: 1, pause: 0, susp: 0, alert: 0 },
    { ax: 21, ay: 3, bx: 27, by: 3, t: 0, dir: 1, pause: 0, susp: 0, alert: 0 },
  ];

  const s = {
    title: 'WORLD 1 - THE WHISPER WILDS',
    objective: 'Cells: 0/3 - stay out of their sight',
    brief: [
      'Move: WASD / Arrows   -   Sprint: hold SHIFT (uses stamina)',
      'Gather 3 energy cells, then reach the glowing exit pad.',
      'Glowing ferns hide you. Brambles block their view but slow you. If the suspicion eye fills, you are seen.',
    ],
    px: (start.x + 0.5) * TS, py: (start.y + 0.5) * TS,
    st: g.save.staminaMax(),
    stMax: g.save.staminaMax(),
    t: 0,
    caught: 0,
    gotCount: 0,
  };

  const solidAt = (tx, ty) =>
    tx < 0 || ty < 0 || tx >= MAPW || ty >= MAPH ||
    solid.some((r) => r.x === tx && r.y === ty);

  function collide(px, py, r) {
    // circle vs solid tiles & brambles
    for (let ty = Math.floor((py - r) / TS); ty <= Math.floor((py + r) / TS); ty++) {
      for (let tx = Math.floor((px - r) / TS); tx <= Math.floor((px + r) / TS); tx++) {
        if (solidAt(tx, ty)) {
          const cx = Math.max(tx * TS, Math.min(px, tx * TS + TS));
          const cy = Math.max(ty * TS, Math.min(py, ty * TS + TS));
          if ((px - cx) ** 2 + (py - cy) ** 2 < r * r) return true;
        }
      }
    }
    const bx = Math.floor(px / TS), by = Math.floor(py / TS);
    if (bramble.some((b) => b.x === bx && b.y === by)) return true; // brambles are walls too
    return false;
  }

  function inFern(px, py) {
    return ferns.some((f) => {
      const dx = px - (f.x + 0.5) * TS, dy = py - (f.y + 0.5) * TS;
      return dx * dx + dy * dy < 20 * 20;
    });
  }

  function losClear(x1, y1, x2, y2) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(d / 10);
    for (let i = 1; i < steps; i++) {
      const x = x1 + ((x2 - x1) * i) / steps, y = y1 + ((y2 - y1) * i) / steps;
      const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
      if (solidAt(tx, ty)) return false;
      if (bramble.some((b) => b.x === tx && b.y === ty)) return false;
    }
    return true;
  }

  s.update = (dt) => {
    s.t += dt;
    g.save.d.time += dt;
    if (s.caught > 0) { s.caught -= dt; if (s.caught <= 0) resetPositions(); return; }

    // player movement
    const k = g.keys, sp = 132;
    let dx = (k['ArrowRight'] || k['d'] ? 1 : 0) - (k['ArrowLeft'] || k['a'] ? 1 : 0);
    let dy = (k['ArrowDown'] || k['s'] ? 1 : 0) - (k['ArrowUp'] || k['w'] ? 1 : 0);
    const moving = dx || dy;
    if (moving) { dx /= Math.hypot(dx, dy); dy /= Math.hypot(dx, dy); }
    const sprinting = (k['Shift'] || k['shift']) && moving && s.st > 1;
    s.sprinting = sprinting;
    const speed = sprinting ? sp * 1.75 * g.save.sprintMult() : sp;
    if (sprinting) s.st = Math.max(0, s.st - 30 * dt);
    else s.st = Math.min(s.stMax, s.st + (moving ? 16 : 34) * dt);

    let nx = s.px + dx * speed * dt, ny = s.py + dy * speed * dt;
    if (!collide(nx, s.py, 9)) s.px = nx;
    if (!collide(s.px, ny, 9)) s.py = ny;

    // watchers
    for (const w of watchers) {
      if (w.pause > 0) { w.pause -= dt; }
      else {
        w.t += dt * 0.24;
        if (w.t >= 1) { w.t = 1; w.dir = -1; w.pause = 1.4; }
        if (w.t <= 0) { w.t = 0; w.dir = 1; w.pause = 1.4; }
      }
      w.x = (w.ax + (w.bx - w.ax) * w.t + 0.5) * TS;
      w.y = (w.ay + (w.by - w.ay) * w.t + 0.5) * TS;
      w.fx = (w.bx - w.ax) * w.dir; // facing
      w.fy = (w.by - w.ay) * w.dir;

      // suspicion
      const dist = Math.hypot(s.px - w.x, s.py - w.y);
      let seen = false;
      if (!inFern(s.px, s.py) && dist < 165) {
        const dot = ((s.px - w.x) * w.fx + (s.py - w.y) * w.fy) /
          (Math.max(0.001, Math.hypot(w.fx, w.fy)) * Math.max(0.01, dist));
        if (dot > 0.72 && losClear(w.x, w.y, s.px, s.py)) seen = true;
      }
      if (seen) {
        w.susp = Math.min(1, w.susp + dt * 1.1);
        if (w.susp >= 1 && s.caught <= 0) {
          s.caught = 1.4; Sfx.bad(); g.save.d.deaths++; g.save.persist();
        }
        if (Math.random() < dt * 6) Sfx.rustle();
      } else {
        w.susp = Math.max(0, w.susp - dt * 0.8);
      }
      w.alert = seen ? 1 : (w.alert && w.susp > 0 ? 1 : 0);
    }

    // cells pickup
    for (const c of cells) {
      if (!c.got && Math.abs(s.px - (c.tx + 0.5) * TS) < 14 && Math.abs(s.py - (c.ty + 0.5) * TS) < 14) {
        c.got = true; s.gotCount++;
        g.save.addXP(20); Sfx.pick();
        if (s.gotCount >= 3) Sfx.good();
      }
    }

    // exit
    if (s.gotCount >= 3 &&
        Math.abs(s.px - (exit.x + 0.5) * TS) < 14 && Math.abs(s.py - (exit.y + 0.5) * TS) < 14) {
      g.save.addXP(30); Sfx.good();
      g.complete('w1');
    }
  };

  function resetPositions() {
    s.px = (start.x + 0.5) * TS; s.py = (start.y + 0.5) * TS;
    s.st = s.stMax / 2;
    for (const w of watchers) { w.t = 0; w.dir = 1; w.susp = 0; w.pause = 0; }
  }

  s.draw = (ctx) => {
    ctx.fillStyle = PAL.bg1;
    ctx.fillRect(0, 40, 960, 500);
    // ground texture
    ctx.fillStyle = PAL.bg0;
    for (let y = 0; y < MAPH; y++) for (let x = 0; x < MAPW; x++) {
      if ((x * 31 + y * 17) % 13 === 0) ctx.fillRect(x * TS + 8, 40 + y * TS + 8, 3, 3);
    }
    // rocks
    for (const r of solid) {
      if (r.x === 0 || r.y === 0 || r.x === MAPW - 1 || r.y === MAPH - 1) ctx.fillStyle = PAL.bg2;
      else ctx.fillStyle = PAL.bg3;
      ctx.fillRect(r.x * TS, 40 + r.y * TS, TS, TS);
      ctx.strokeStyle = PAL.bg2; ctx.strokeRect(r.x * TS - 0.5, 40 + r.y * TS - 0.5, TS + 1, TS + 1);
      if (r.x % 2 === 0 && r.y % 2 === 0) { ctx.fillStyle = PAL.bg3; ctx.fillRect(r.x * TS + 6, 40 + r.y * TS + 6, 7, 7); }
    }
    // brambles
    for (const b of bramble) {
      ctx.fillStyle = PAL.bg2;
      ctx.fillRect(b.x * TS, 40 + b.y * TS, TS, TS);
      ctx.strokeStyle = PAL.purple;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(b.x * TS + 4 + i * 7, 40 + b.y * TS + TS - 2);
        ctx.lineTo(b.x * TS + 8 + i * 7, 40 + b.y * TS + 4);
        ctx.stroke();
      }
    }
    // ferns (safe zones)
    const pulse = 0.5 + Math.sin(s.t * 4) * 0.25;
    for (const f of ferns) {
      const fx = (f.x + 0.5) * TS, fy = 40 + (f.y + 0.5) * TS;
      ctx.globalAlpha = 0.16 * pulse + 0.08;
      ctx.fillStyle = PAL.hot;
      ctx.beginPath(); ctx.arc(fx, fy, 26, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = PAL.hot;
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.5;
        ctx.beginPath(); ctx.moveTo(fx, fy);
        ctx.lineTo(fx + Math.cos(a) * 11, fy + Math.sin(a) * 11);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }
    // cells
    for (const c of cells) {
      if (c.got) continue;
      const cx = (c.tx + 0.5) * TS, cy = 40 + (c.ty + 0.5) * TS + Math.sin(s.t * 3 + c.tx) * 2;
      ctx.fillStyle = PAL.peach;
      ctx.globalAlpha = 0.3 + pulse * 0.3;
      ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = PAL.cream;
      ctx.fillRect(cx - 4, cy - 6, 8, 12);
      ctx.fillRect(cx - 2, cy - 8, 4, 16);
    }
    // exit pad
    const exOn = s.gotCount >= 3;
    const exx = (exit.x + 0.5) * TS, exy = 40 + (exit.y + 0.5) * TS;
    ctx.fillStyle = exOn ? PAL.hot : PAL.bg3;
    ctx.globalAlpha = exOn ? 0.35 + pulse * 0.3 : 0.4;
    ctx.beginPath(); ctx.arc(exx, exy, 13, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    if (exOn) {
      ctx.fillStyle = PAL.cream;
      ctx.font = f(10, 'bold');
      ctx.fillText('EXIT', exx - 12, exy + 24);
    }

    // watchers: view cone then body
    for (const w of watchers) {
      if (w.fx === undefined) continue;
      const a0 = Math.atan2(w.fy, w.fx) - 0.62;
      const grad = ctx.createRadialGradient(w.x, w.y, 8, w.x, w.y, 165);
      const col = w.susp > 0.05 ? 'rgba(255,158,203,' : 'rgba(180,144,214,';
      grad.addColorStop(0, col + (0.34 - w.susp * 0.2) + ')');
      grad.addColorStop(1, col + '0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(w.x, w.y);
      ctx.arc(w.x, w.y, 165, a0, a0 + 1.24);
      ctx.closePath(); ctx.fill();

      // body: big pale free-crawler
      const bob = Math.sin(s.t * 6 + w.ax) * 2;
      ctx.fillStyle = PAL.laver;
      ctx.beginPath(); ctx.arc(w.x, w.y + bob, 11, 0, 7); ctx.fill();
      ctx.strokeStyle = PAL.laver;
      for (let i = -1; i <= 1; i++) {
        for (const fd of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(w.x, w.y + bob);
          ctx.lineTo(w.x + fd * (10 + i * 3), w.y + bob + 10 + Math.abs(i) * 3 + Math.sin(s.t * 8 + i) * 2);
          ctx.stroke();
        }
      }
      ctx.fillStyle = w.alert ? PAL.rose : PAL.pink;
      ctx.beginPath(); ctx.arc(w.x, w.y - 3 + bob, 4, 0, 7); ctx.fill();
    }

    // player: little astronaut
    ctx.fillStyle = PAL.cream;
    ctx.beginPath(); ctx.arc(s.px, s.py, 9, 0, 7); ctx.fill();
    ctx.fillStyle = PAL.bg2;
    ctx.beginPath(); ctx.arc(s.px - 2, s.py - 2, 5, 0, 7); ctx.fill();
    ctx.fillStyle = PAL.hot;
    ctx.beginPath(); ctx.arc(s.px + 4, s.py, 2.5, 0, 7); ctx.fill();

    // stamina bar (under HUD)
    bar2(ctx, 12, 510, 180, 10, s.st / s.stMax, s.sprinting ? PAL.rose : PAL.laver);
    ctx.font = f(10); ctx.fillStyle = PAL.laver;
    ctx.fillText('STAMINA', 14, 524);

    // suspicion eye if any
    const maxSusp = Math.max(...watchers.map((w) => w.susp));
    if (maxSusp > 0.01) {
      ctx.font = f(14, 'bold'); ctx.fillStyle = PAL.rose;
      ctx.fillText('THEY SEE SOMETHING...', 340, 524);
    }

    if (s.caught > 0) {
      ctx.fillStyle = 'rgba(15,8,32,0.75)';
      ctx.fillRect(0, 0, 960, 540);
      ctx.font = f(30, 'bold'); ctx.fillStyle = PAL.rose;
      ctx.textAlign = 'center';
      ctx.fillText('A watcher found you', 480, 268);
      ctx.font = f(16); ctx.fillStyle = PAL.laver;
      ctx.fillText('The wilds reset. Slow down - use the ferns.', 480, 300);
      ctx.textAlign = 'left';
    }

    function bar2(c, x, y, w, h, frac, col) {
      c.fillStyle = PAL.ink; c.fillRect(x, y, w, h);
      c.fillStyle = col; c.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
      c.strokeStyle = PAL.purple; c.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
    }
  };

  return s;
}

// ============================ WORLD 2: THE LABYRINTH ============================
const MW = 21, MH = 13, MTS = 36;

export function mazeLevel(g) {
  // generate maze with seeded DFS
  let seed = 1337 + (Math.random() * 99999 | 0);
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const solid = [];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (x % 2 === 0 || y % 2 === 0) solid.push({ x, y });
  const isSolid = (x, y) => x < 0 || y < 0 || x >= MW || y >= MH || solid.some((r) => r.x === x && r.y === y);
  const open = (x, y) => { const i = solid.findIndex((r) => r.x === x && r.y === y); if (i >= 0) solid.splice(i, 1); };

  const cw = (MW - 1) / 2, ch = (MH - 1) / 2;
  const visited = new Set(['0,0']);
  const stack = [{ x: 0, y: 0 }];
  while (stack.length) {
    const c = stack[stack.length - 1];
    const nbs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy }))
      .filter((n) => n.x >= 0 && n.y >= 0 && n.x < cw && n.y < ch && !visited.has(n.x + ',' + n.y));
    if (!nbs.length) { stack.pop(); continue; }
    const n = nbs[(rnd() * nbs.length) | 0];
    open(c.x * 2 + 1 + (n.x - c.x), c.y * 2 + 1 + (n.y - c.y));
    visited.add(n.x + ',' + n.y);
    stack.push(n);
  }
  // knock a few extra holes so dead ends are less brutal
  for (let i = 0; i < 6; i++) {
    const x = 1 + ((rnd() * (MW - 2)) | 0), y = 1 + ((rnd() * (MH - 2)) | 0);
    if (x % 2 === 1 && y % 2 === 0) open(x, y);
    else if (x % 2 === 0 && y % 2 === 1) open(x, y);
  }

  // BFS distances from start tile
  const sx = 1, sy = 1;
  const dist = new Map([['1,1', 0]]);
  const q = [{ x: 1, y: 1 }];
  while (q.length) {
    const c = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = c.x + dx, ny2 = c.y + dy, k = n + ',' + ny2;
      if (!isSolid(n, ny2) && !dist.has(k)) { dist.set(k, dist.get(c.x + ',' + c.y) + 1); q.push({ x: n, y: ny2 }); }
    }
  }
  const far = [...dist.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k.split(',').map(Number));
  const soulTile = far[0];
  const fuelTile = far[Math.floor(far.length / 2)] || far[1];

  // oil drops on random floor tiles mid-distance
  const drops = [];
  const cellsMid = far.filter(([x, y]) => {
    const d = dist.get(x + ',' + y);
    return d > 3 && d < far[0][1] - 1;
  });
  for (let i = 0; i < 8 && cellsMid.length; i++) {
    const idx = (rnd() * cellsMid.length) | 0;
    const [x, y] = cellsMid.splice(idx, 1)[0];
    drops.push({ x: (x + 0.5) * MTS, y: (y + 0.5) * MTS, got: false, ph: Math.random() * 7 });
  }

  // shadows
  const shadows = [];
  for (let i = 0; i < 4; i++) {
    const tile = far[2 + i * 2] || far[2];
    shadows.push({ x: (tile[0] + 0.5) * MTS, y: (tile[1] + 0.5) * MTS, tx: null, ty: null, retarget: 0 });
  }

  const ox = (960 - MW * MTS) / 2, oy = 46;
  const soul = { x: (soulTile[0] + 0.5) * MTS, y: (soulTile[1] + 0.5) * MTS, got: false };
  const fuel = { x: (fuelTile[0] + 0.5) * MTS, y: (fuelTile[1] + 0.5) * MTS, got: false };
  const portal = { x: (sx + 0.5) * MTS, y: (sy + 0.5) * MTS, on: false };

  const s = {
    title: 'WORLD 2 - THE LABYRINTH',
    objective: "Find Moria\u2019s soul + the fuel before the lantern dies",
    brief: [
      'Move: WASD / Arrows.  Your lantern burns oil - when it dies, the darkness takes you.',
      'Bring Moria his lost soul AND the fuel canister, then return to the portal where you woke.',
      'Oil drops refill the lantern. Shadows drift through the dark - if one touches you, the maze resets.',
    ],
    px: (sx + 0.5) * MTS, py: (sy + 0.5) * MTS,
    oil: g.save.oilMax(),
    oilMax: g.save.oilMax(),
    t: 0,
    dying: 0,
    gotS: 0, gotF: 0,
    radius: 200,
  };

  function collide(px, py, r) {
    for (let ty = Math.floor((py - r) / MTS); ty <= Math.floor((py + r) / MTS); ty++) {
      for (let tx = Math.floor((px - r) / MTS); tx <= Math.floor((px + r) / MTS); tx++) {
        if (isSolid(tx, ty)) {
          const cx = Math.max(tx * MTS, Math.min(px, tx * MTS + MTS));
          const cy = Math.max(ty * MTS, Math.min(py, ty * MTS + MTS));
          if ((px - cx) ** 2 + (py - cy) ** 2 < r * r) return true;
        }
      }
    }
    return false;
  }

  s.update = (dt) => {
    s.t += dt;
    g.save.d.time += dt;
    if (s.dying > 0) {
      s.dying -= dt;
      s.radius = Math.max(14, s.radius - dt * 60);
      if (s.dying <= 0) resetPositions();
      return;
    }
    // oil
    s.oil -= dt;
    if (s.oil <= 0) { s.oil = 0; s.dying = 2.2; s.dyingText = 'The lantern went dark'; Sfx.bad(); g.save.d.deaths++; g.save.persist(); }
    s.radius = 56 + 150 * Math.max(0.06, s.oil / s.oilMax);

    const k = g.keys, sp = 125;
    let dx = (k['ArrowRight'] || k['d'] ? 1 : 0) - (k['ArrowLeft'] || k['a'] ? 1 : 0);
    let dy = (k['ArrowDown'] || k['s'] ? 1 : 0) - (k['ArrowUp'] || k['w'] ? 1 : 0);
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }
    let nx = s.px + dx * sp * dt, ny = s.py + dy * sp * dt;
    if (!collide(nx, s.py, 9)) s.px = nx;
    if (!collide(s.px, ny, 9)) s.py = ny;

    // shadows wander towards you
    for (const sh of shadows) {
      sh.retarget -= dt;
      const dp = Math.hypot(s.px - sh.x, s.py - sh.y);
      if (dp < 210) { sh.tx = s.px; sh.ty = s.py; }
      else if (!sh.tx || sh.retarget <= 0) { sh.tx = sh.x + (Math.random() - 0.5) * 220; sh.ty = sh.y + (Math.random() - 0.5) * 220; sh.retarget = 2 + Math.random() * 2; }
      const d = Math.hypot(sh.tx - sh.x, sh.ty - sh.y) || 1;
      const sp2 = dp < 210 ? 46 : 30;
      sh.x += ((sh.tx - sh.x) / d) * sp2 * dt;
      sh.y += ((sh.ty - sh.y) / d) * sp2 * dt;
      if (Math.hypot(s.px - sh.x, s.py - sh.y) < 12) {
        Sfx.bad(); g.save.d.deaths++; g.save.persist();
        s.dying = 1.2; s.dyingText = 'A shadow touched you';
      }
    }

    // pickups
    for (const dr of drops) {
      if (!dr.got && Math.hypot(s.px - dr.x, s.py - dr.y) < 14) {
        dr.got = true; s.oil = Math.min(s.oilMax, s.oil + 14); Sfx.pick();
      }
    }
    if (!soul.got && Math.hypot(s.px - soul.x, s.py - soul.y) < 14) {
      soul.got = true; s.gotS = 1; g.save.addXP(35); Sfx.good();
    }
    if (!fuel.got && Math.hypot(s.px - fuel.x, s.py - fuel.y) < 14) {
      fuel.got = true; s.gotF = 1; g.save.addXP(35); Sfx.good();
    }
    if (s.gotS && s.gotF) portal.on = true;
    if (portal.on && Math.hypot(s.px - portal.x, s.py - portal.y) < 16) {
      g.save.addXP(20); Sfx.good();
      g.complete('maze');
    }
  };

  function resetPositions() {
    s.px = (sx + 0.5) * MTS; s.py = (sy + 0.5) * MTS;
    s.oil = s.oilMax * 0.7;
    s.radius = 160;
  }

  s.draw = (ctx) => {
    ctx.fillStyle = PAL.bg0;
    ctx.fillRect(0, 0, 960, 540);
    ctx.save();
    ctx.translate(ox, oy);

    // floor + walls
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      if (isSolid(x, y)) {
        ctx.fillStyle = PAL.bg2;
        ctx.fillRect(x * MTS, y * MTS, MTS, MTS);
        ctx.fillStyle = PAL.bg3;
        ctx.fillRect(x * MTS + 3, y * MTS + 3, MTS - 6, MTS - 6);
      }
    }

    // items (drawn before darkness, dimmable)
    const pulse = 0.5 + Math.sin(s.t * 4) * 0.25;
    for (const dr of drops) {
      if (dr.got) continue;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = PAL.hot;
      ctx.beginPath(); ctx.arc(dr.x, dr.y + Math.sin(s.t * 3 + dr.ph) * 2, 5, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (!soul.got) {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = PAL.rose;
      ctx.beginPath(); ctx.arc(soul.x, soul.y + Math.sin(s.t * 2.4) * 3, 8, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (!fuel.got) {
      ctx.fillStyle = PAL.peach;
      ctx.fillRect(fuel.x - 6, fuel.y - 8, 12, 16);
      ctx.fillStyle = PAL.pink;
      ctx.fillRect(fuel.x - 6, fuel.y - 3, 12, 5);
    }
    if (portal.on) {
      ctx.globalAlpha = 0.3 + pulse * 0.4;
      ctx.fillStyle = PAL.hot;
      ctx.beginPath(); ctx.arc(portal.x, portal.y, 15, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // shadows (only visible if within radius)
    for (const sh of shadows) {
      const d = Math.hypot(s.px + ox - (sh.x + ox), s.py + oy - (sh.y + oy));
      if (d < s.radius + 10) {
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = PAL.ink;
        ctx.beginPath(); ctx.arc(sh.x, sh.y, 11, 0, 7); ctx.fill();
        ctx.strokeStyle = PAL.purple;
        ctx.beginPath(); ctx.arc(sh.x, sh.y, 11, 0, 7); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // player + lantern
    ctx.fillStyle = PAL.cream;
    ctx.beginPath(); ctx.arc(s.px, s.py, 9, 0, 7); ctx.fill();
    ctx.fillStyle = PAL.bg2;
    ctx.beginPath(); ctx.arc(s.px - 2, s.py - 2, 5, 0, 7); ctx.fill();
    ctx.fillStyle = PAL.peach;
    ctx.beginPath(); ctx.arc(s.px + 8, s.py - 6, 3, 0, 7); ctx.fill();

    // darkness overlay with light hole
    const grd = ctx.createRadialGradient(s.px, s.py, s.radius * 0.35, s.px, s.py, s.radius);
    grd.addColorStop(0, 'rgba(10,5,20,0)');
    grd.addColorStop(1, 'rgba(10,5,20,0.97)');
    ctx.fillStyle = grd;
    ctx.fillRect(-ox, -oy, 960, 540);
    // hard dark beyond radius (covers whole screen incl. HUD area since translate)
    ctx.fillStyle = 'rgba(10,5,20,0.985)';
    ctx.beginPath();
    ctx.arc(s.px, s.py, s.radius, 0, Math.PI * 2);
    ctx.rect(-ox - 10, -oy - 10, 980, 560);
    ctx.fill('evenodd');

    ctx.restore();

    // oil gauge
    const frac = s.oil / s.oilMax;
    ctx.fillStyle = PAL.ink; ctx.fillRect(360, 514, 240, 14);
    ctx.fillStyle = frac > 0.25 ? PAL.peach : PAL.rose;
    ctx.fillRect(360, 514, 240 * Math.max(0, frac), 14);
    ctx.strokeStyle = PAL.lampp; ctx.strokeRect(359.5, 513.5, 241, 15);
    ctx.font = f(11, 'bold'); ctx.fillStyle = PAL.laver;
    ctx.fillText('LANTERN OIL', 268, 525);
    ctx.font = f(11);
    ctx.fillStyle = PAL.laver;
    ctx.fillText(`ITEMS ${s.gotS + s.gotF}/2`, 625, 525);

    if (s.dying > 0) {
      ctx.fillStyle = 'rgba(10,5,20,0.8)';
      ctx.fillRect(0, 0, 960, 540);
      ctx.textAlign = 'center';
      ctx.font = f(28, 'bold'); ctx.fillStyle = PAL.rose;
      ctx.fillText(s.dyingText || 'The darkness took you', 480, 265);
      ctx.font = f(15); ctx.fillStyle = PAL.laver;
      ctx.fillText('Keep the lantern burning. Follow the oil drops.', 480, 296);
      ctx.textAlign = 'left';
    }
  };

  return s;
}

// ============================ WORLD 3: CAESAR'S TOWER ============================
export function towerLevel(g) {
  const s = {
    title: 'WORLD 3 - THE TOWER OF CAESAR',
    objective: 'Three rooms: levers, crates, riddle',
    brief: [
      'Move: WASD / Arrows   -   Use / pull: SPACE   -   Restart room: R',
      'Caesar guards the hull plating at the top: pass his hall of levers, the counterweight room, and his riddle.',
      'Read the inscriptions carved into the walls - they matter.',
    ],
    mode: 'levers',
    t: 0,
    rooms: [],
    unlocked: false,
  };

  const state = {
    levers: null, soko: null, riddle: null,
  };
  s.roomsState = state; // exposed for automated testing / debugging

  // ---------------- Room I: levers ----------------
  state.levers = (() => {
    // wall order displayed:  FLAME  FROST  STAR  MOON
    // correct sequence:  FROST -> FLAME -> MOON -> STAR
    const L = [
      { name: 'FLAME', x: 240 },
      { name: 'FROST', x: 400 },
      { name: 'STAR', x: 560 },
      { name: 'MOON', x: 720 },
    ];
    return {
      L,
      prog: 0,
      seq: ['FROST', 'FLAME', 'MOON', 'STAR'],
      lift: 0,
      done: false,
    };
  })();

  // ---------------- Room II: counterweights (sokoban) ----------------
  state.soko = (() => {
    const rows = [
      '#######',
      '#.....#',
      '#.C.C.#',
      '#.....#',
      '#O...O#',
      '#######',
    ];
    return {
      w: 7, h: 6, rows, ts: 58,
      ox: (960 - 7 * 58) / 2, oy: 120,
      done: false,
    };
  })();

  // ---------------- Room III: Caesar's riddle ----------------
  state.riddle = { done: false };

  s.px = null;

  s.update = (dt) => {
    if (Dialogue.active) return;
    s.t += dt;
    g.save.d.time += dt;
    const spd = 140;
    const k = g.keys, once = g.consumeKeys();

    if (s.mode === 'levers') {
      let dx = (k['ArrowRight'] || k['d'] ? 1 : 0) - (k['ArrowLeft'] || k['a'] ? 1 : 0);
      s.px = Math.max(60, Math.min(900, (s.px || 480) + dx * spd * dt));
      s.py = 360;
      for (const l of state.levers.L) {
        if (Math.abs(s.px - l.x) < 26 && once[' ']) {
          if (state.levers.prog < 4 && l.name === state.levers.seq[state.levers.prog]) {
            l.pulled = true; state.levers.prog++; Sfx.lever();
            if (state.levers.prog === 4) { state.levers.done = true; Sfx.good(); g.save.addXP(30); }
          } else {
            Sfx.bad();
            state.levers.prog = 0;
            for (const ll of state.levers.L) ll.pulled = false;
          }
        }
      }
      if (state.levers.done) {
        state.levers.lift = Math.min(1, state.levers.lift + dt * 0.5);
        if (state.levers.lift >= 1 && once[' ']) {
          s.mode = 'soko'; s.px = null; s.rooms.push('I');
          Sfx.blip();
        }
      }
    } else if (s.mode === 'soko') {
      if (!s.sx) {
        s.sx = 3; s.sy = 4; s.crateList = [{ cx: 2, cy: 2 }, { cx: 4, cy: 2 }];
        buildPlateList();
      }
      if (once['r'] || once['R']) { s.sx = 3; s.sy = 4; s.crateList = [{ cx: 2, cy: 2 }, { cx: 4, cy: 2 }]; Sfx.blip(); }
      let moved = null;
      if (once['ArrowUp'] || once['w']) moved = [0, -1];
      else if (once['ArrowDown'] || once['s']) moved = [0, 1];
      else if (once['ArrowLeft'] || once['a']) moved = [-1, 0];
      else if (once['ArrowRight'] || once['d']) moved = [1, 0];
      if (moved) {
        const nx2 = s.sx + moved[0], ny2 = s.sy + moved[1];
        const crate = s.crateList.find((c) => c.cx === nx2 && c.cy === ny2);
        if (tile(state.soko, nx2, ny2) !== '#') {
          if (!crate) { s.sx = nx2; s.sy = ny2; }
          else {
            const bx = nx2 + moved[0], by = ny2 + moved[1];
            if (tile(state.soko, bx, by) !== '#' && !s.crateList.some((c) => c.cx === bx && c.cy === by)) {
              crate.cx = bx; crate.cy = by; s.sx = nx2; s.sy = ny2; Sfx.lever();
            }
          }
        }
      }
      // plates occupied?
      let all = true;
      for (const p of s.plateList) {
        if (!s.crateList.some((c) => c.cx === p[0] && c.cy === p[1])) all = false;
      }
      if (all) {
        g.save.addXP(30); Sfx.good();
        s.mode = 'riddle'; s.rooms.push('II');
        s.px = null; s.sx = null;
        s.riddleChoice = 0; s.riddlePhase = 'ask';
      }
    } else if (s.mode === 'riddle') {
      if (s.riddlePhase === 'ask') {
        if (once['ArrowUp'] || once['w']) { s.riddleChoice = (s.riddleChoice + 2) % 3; Sfx.blip(); }
        if (once['ArrowDown'] || once['s']) { s.riddleChoice = (s.riddleChoice + 1) % 3; Sfx.blip(); }
        if (once[' ']) {
          if (s.riddleChoice === 0) {
            s.riddlePhase = 'win';
            g.dialogue([
              { who: 'CAESAR', text: 'Ha! The MOUNTAIN, of course - the one who never moves. Everything else climbs ME. Read the walls next time, drifter!' },
              { who: 'CAESAR', text: 'Oh - and before you go: the stairs were on the left. The hidden ones. We could have just... walked up. Ha ha ha!' },
            ], () => {
              g.save.addXP(40); Sfx.good(); g.complete('tower');
            });
          } else {
            s.riddlePhase = 'miss';
            const wrongIs = s.riddleChoice === 1 ? 'The pulley moves all, yes - but it moves because something anchors it.' : 'The inscriptions remember, yes - but they were carved by one who does not move.';
            g.dialogue([
              { who: 'CAESAR', text: 'Wrong, little drifter! Ha!' },
              { who: 'CYU', text: 'Try again. The walls said: "The mountain does not move - yet the tower climbs it."' },
              { who: 'CAESAR', text: wrongIs + ' Answer again.' },
            ], () => { s.riddlePhase = 'ask'; });
          }
        }
      }
    }
  };

  function tile(sk, x, y) {
    if (x < 0 || y < 0 || x >= sk.w || y >= sk.h) return '#';
    return sk.rows[y][x];
  }
  function buildPlateList() {
    s.plateList = [];
    for (let y = 0; y < state.soko.h; y++) for (let x = 0; x < state.soko.w; x++) {
      if (state.soko.rows[y][x] === 'O') s.plateList.push([x, y]);
    }
  }
  const RIDDLE_OPTS = [
    'The one who never moves',
    'The one who moves all',
    'The one who remembers',
  ];

  s.draw = (ctx) => {
    // tower background
    ctx.fillStyle = PAL.bg0;
    ctx.fillRect(0, 0, 960, 540);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 3 === 0 ? PAL.laver : PAL.pink;
      ctx.globalAlpha = 0.2 + (i % 4) * 0.12;
      ctx.fillRect(((i * 211) % 960), ((i * 83) % 480), 2, 2);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.font = f(20, 'bold');
    ctx.fillStyle = PAL.laver;
    const roomNames = ['THE HALL OF LEVERS', 'THE COUNTERWEIGHT ROOM', 'AT THE SUMMIT'];
    const roomDesc = [
      'Frost before flame, moon after frost, star sleeps last.',
      'Two counterweights onto two plates. Mind the corners.',
      'Answer Caesar well.',
    ];
    const idx = s.mode === 'levers' ? 0 : s.mode === 'soko' ? 1 : 2;
    ctx.fillText(roomNames[idx], 480, 70);
    ctx.font = f(13);
    ctx.fillStyle = PAL.pink;
    ctx.fillText('"' + roomDesc[idx] + '"', 480, 92);
    ctx.textAlign = 'left';

    if (s.mode === 'levers') {
      // stone platform
      for (const l of state.levers.L) {
        ctx.fillStyle = PAL.bg3;
        ctx.fillRect(l.x - 22, 380, 44, 44);
        ctx.strokeStyle = PAL.purple;
        ctx.strokeRect(l.x - 22.5, 380.5, 45, 43);
        // lever stick
        ctx.save();
        ctx.translate(l.x, 400);
        ctx.rotate(l.pulled ? 0.9 : -0.5);
        ctx.strokeStyle = PAL.laver;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, -16); ctx.stroke();
        ctx.fillStyle = l.pulled ? PAL.hot : PAL.peach;
        ctx.beginPath(); ctx.arc(0, -16, 5, 0, 7); ctx.fill();
        ctx.restore();
        ctx.lineWidth = 1;
        ctx.font = f(13, 'bold');
        ctx.fillStyle = PAL.cream;
        ctx.textAlign = 'center';
        ctx.fillText(l.name, l.x, 452);
        ctx.textAlign = 'left';
        if (l.pulled) {
          ctx.fillStyle = PAL.hot;
          ctx.font = f(11, 'bold');
          ctx.textAlign = 'center';
          ctx.fillText('OK', l.x, 374);
          ctx.textAlign = 'left';
        }
      }
      // poem inscription
      ctx.font = f(14);
      ctx.fillStyle = PAL.laver;
      wrapAll(ctx, '"Wake the FROST before the FLAME; the MOON follows the frost; the STAR sleeps last at heaven\u2019s door."', 380, 150, 260);
      wrapAll(ctx, 'Inscription: "The mountain does not move - yet the tower climbs it."', 680, 150, 240);

      // player
      if (s.px !== null && s.px !== undefined) {
        ctx.fillStyle = PAL.cream;
        ctx.beginPath(); ctx.arc(s.px, 382, 10, 0, 7); ctx.fill();
        ctx.fillStyle = PAL.bg2;
        ctx.beginPath(); ctx.arc(s.px - 3, 378, 5, 0, 7); ctx.fill();
      }
      if (state.levers.done && state.levers.lift > 0) {
        ctx.fillStyle = PAL.hot;
        ctx.globalAlpha = state.levers.lift;
        ctx.fillRect(440, 480, 80, 8);
        ctx.globalAlpha = 1;
        ctx.font = f(15, 'bold');
        ctx.fillStyle = PAL.peach;
        ctx.textAlign = 'center';
        ctx.fillText('SPACE - step into the lifting room', 480, 500);
        ctx.textAlign = 'left';
      }
    } else if (s.mode === 'soko') {
      const sk = state.soko;
      for (let y = 0; y < sk.h; y++) for (let x = 0; x < sk.w; x++) {
        const c = sk.rows[y][x], px = sk.ox + x * sk.ts, py = sk.oy + y * sk.ts;
        if (c === '#') { ctx.fillStyle = PAL.bg2; ctx.fillRect(px, py, sk.ts, sk.ts); ctx.strokeStyle = PAL.bg3; ctx.strokeRect(px + 2.5, py + 2.5, sk.ts - 5, sk.ts - 5); }
        else {
          ctx.fillStyle = PAL.bg1; ctx.fillRect(px, py, sk.ts, sk.ts);
          if (c === 'O') {
            ctx.fillStyle = PAL.bg2;
            ctx.beginPath(); ctx.arc(px + sk.ts / 2, py + sk.ts / 2, sk.ts * 0.28, 0, 7); ctx.fill();
            ctx.strokeStyle = PAL.hot;
            ctx.beginPath(); ctx.arc(px + sk.ts / 2, py + sk.ts / 2, sk.ts * 0.2, 0, 7); ctx.stroke();
          }
        }
      }
      for (const c of s.crateList || []) {
        const px = sk.ox + c.cx * sk.ts, py = sk.oy + c.cy * sk.ts;
        ctx.fillStyle = s.plateList.some((p) => p[0] === c.cx && p[1] === c.cy) ? PAL.peach : PAL.bg3;
        ctx.fillRect(px + 5, py + 5, sk.ts - 10, sk.ts - 10);
        ctx.strokeStyle = PAL.laver;
        ctx.strokeRect(px + 5.5, py + 5.5, sk.ts - 11, sk.ts - 11);
        ctx.fillStyle = PAL.bg1;
        ctx.fillRect(px + 12, py + 12, sk.ts - 24, 6);
      }
      // player
      if (s.sx != null) {
        const px = sk.ox + s.sx * sk.ts, py = sk.oy + s.sy * sk.ts;
        ctx.fillStyle = PAL.cream;
        ctx.beginPath(); ctx.arc(px + sk.ts / 2, py + sk.ts / 2, sk.ts * 0.24, 0, 7); ctx.fill();
        ctx.fillStyle = PAL.bg2;
        ctx.beginPath(); ctx.arc(px + sk.ts / 2 - 3, py + sk.ts / 2 - 3, sk.ts * 0.13, 0, 7); ctx.fill();
      }
      ctx.font = f(12);
      ctx.fillStyle = PAL.laver;
      ctx.fillText('ARROWS/WASD: push crates onto the two pressure plates.  R: reset crate positions.', 20, 520);
    } else {
      // summit: Caesar robed figure + riddle
      const bob = Math.sin(s.t * 2) * 3;
      ctx.fillStyle = PAL.purple;
      ctx.beginPath();
      ctx.moveTo(480 + -34, 320 + bob);
      ctx.quadraticCurveTo(480, 200 + bob, 480 + 34, 320 + bob);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = PAL.lampp;
      ctx.stroke();
      ctx.fillStyle = PAL.bg0;
      ctx.beginPath(); ctx.arc(480, 250 + bob, 15, 0, 7); ctx.fill();
      ctx.fillStyle = PAL.peach;
      ctx.beginPath(); ctx.arc(480, 250 + bob, 9, 0, 7); ctx.fill();
      // tiny crown
      ctx.fillStyle = PAL.hot;
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(480 + i * 8 - 2, 236 + bob, 4, 6);
      }
      // plating award
      ctx.fillStyle = PAL.peach;
      ctx.fillRect(600, 260, 26, 34);
      ctx.strokeStyle = PAL.laver;
      ctx.strokeRect(600.5, 260.5, 25, 33);
      ctx.font = f(12, 'bold'); ctx.fillStyle = PAL.laver;
      ctx.fillText('HULL PLATING', 613, 320);

      if (s.riddlePhase === 'ask') {
        ctx.font = f(17);
        ctx.fillStyle = PAL.cream;
        ctx.textAlign = 'center';
        wrapCentered(ctx, 'Caesar: "Three companions carried this tower up: one never moves, one moves all, one remembers. Which am I?"', 480, 380, 620);
        ctx.textAlign = 'left';
        RIDDLE_OPTS.forEach((o, i) => {
          const sel = i === (s.riddleChoice || 0);
          ctx.fillStyle = sel ? PAL.hot : PAL.laver;
          ctx.textAlign = 'center';
          ctx.fillText((sel ? '> ' : '') + `[${i + 1}] ${o}`, 480, 416 + i * 26);
          ctx.textAlign = 'left';
        });
        if (!s.riddleSeenHint) {
          s.riddleSeenHint = true;
          const opening = () => {};
          g.dialogue([
            { who: 'CAESAR', text: 'So the little drifter climbs my whole tower! You want the hull plating for your cracked ship, yes? Then answer me one thing...' },
            { who: 'CYU', text: 'The inscriptions in the rooms below are clues. Room I walls said the mountain does not move, yet the tower climbs it.' },
          ]);
        }
      }
    }

    // room tracker
    ctx.font = f(13, 'bold');
    ctx.fillStyle = PAL.laver;
    ctx.fillText('ROOMS: ' + (s.rooms.join(' ') || '-'), 20, 542);

    function wrapAll(c, text, x, y, maxW) {
      c.fillStyle = PAL.laver;
      const lines = wrapText(c, text, maxW);
      let ty = y;
      for (const ln of lines) { c.fillText(ln, x, ty); ty += 20; }
    }
    function wrapCentered(c, text, cx, y, maxW) {
      c.fillStyle = PAL.cream;
      const lines = wrapText(c, text, maxW);
      let ty = y;
      for (const ln of lines) { c.fillText(ln, cx, ty); ty += 24; }
    }
  };

  return s;
}
