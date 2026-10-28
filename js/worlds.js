// CRYO DRIFT - the three worlds, rebuilt as side-scrolling platformers.
// World 1 stealth field, World 2 lantern labyrinth, World 3 vertical tower.
// No combat: sneak, climb, solve.

import { PAL, FONT } from './palette.js';
import { Sfx } from './audio.js';
import { Dialogue } from './ui.js';
import { WorldGrid, TS, makeMover } from './platform.js';
import { makePlatformLevel } from './scene.js';

function f(px, bold = '') { return `${bold} ${px}px ${FONT}`.trim(); }
const T = (n) => n * TS;

// ================================================================ WORLD 1
// THE WHISPER WILDS - platformer stealth. Three cells, watchers, ferns.
export function stealthLevel(g) {
  const world = new WorldGrid(120, 26);
  // forest floor with chasms
  world.rect(0, 20, 20, 6);
  world.rect(23, 20, 22, 6);
  world.rect(48, 20, 24, 6);
  world.rect(75, 20, 45, 6);

  // cell routes (steps every 2 rows, all single-jump reachable)
  world.rect(3, 18, 4, 1);
  world.rect(7, 18, 3, 1);   // shard shelf
  world.rect(11, 18, 3, 1);
  world.rect(14, 16, 4, 1);
  world.rect(17, 14, 4, 1);  // cell 1 above
  world.rect(24, 18, 3, 1);
  world.rect(27, 16, 4, 1);
  world.rect(30, 14, 4, 1);  // shard 2
  world.rect(51, 18, 3, 1);
  world.rect(54, 16, 4, 1);
  world.rect(57, 14, 4, 1);  // cell 2 above
  world.rect(63, 18, 3, 1);
  world.rect(66, 16, 4, 1);
  world.rect(69, 14, 3, 1);  // shard 3 above
  world.rect(78, 18, 3, 1);
  world.rect(81, 16, 4, 1);
  world.rect(84, 14, 4, 1);  // cell 3 above
  world.rect(95, 18, 3, 1);
  world.rect(98, 16, 4, 1);  // shard 4 above
  // crumble ledges over the third chasm
  world.rect(72, 18, 2, 1, 4);
  world.rect(74, 18, 2, 1, 4);
  // spikes on the ground
  world.set(60, 19, 3); world.set(61, 19, 3);
  world.set(90, 19, 3); world.set(91, 19, 3);

  const ferns = [
    { x: T(5) + 16, y: T(20) - 12 }, { x: T(25) + 16, y: T(20) - 12 },
    { x: T(34) + 16, y: T(20) - 12 }, { x: T(52) + 16, y: T(20) - 12 },
    { x: T(63) + 10, y: T(18) - 14 }, { x: T(80) + 16, y: T(20) - 12 },
    { x: T(96) + 10, y: T(18) - 14 }, { x: T(106) + 16, y: T(20) - 12 },
    { x: T(113) + 16, y: T(20) - 12 },
  ];

  const watchers = [
    mkWatch(T(2), T(13), T(15) + 10, 0.16, 0.0),
    mkWatch(T(25), T(41), T(14), 0.13, 0.35),
    mkWatch(T(49), T(67), T(13), 0.11, 0.7),
    mkWatch(T(76), T(93), T(15), 0.12, 0.2),
    mkWatch(T(96), T(113), T(12), 0.1, 0.55),
  ];

  const goal = { x: T(116), y: T(20), active: false, label: 'EXIT' };

  const s = makePlatformLevel(g, {
    title: 'WORLD 1 - THE WHISPER WILDS',
    objective: 'Cells: 0/3 - stay out of their sight',
    brief: [
      'WASD / Arrows - run   -   SPACE - jump   -   SHIFT - sprint (stamina)   -   E - nothing here, RUN',
      'Collect 3 energy cells high in the wilds, then reach the exit pad at the far right.',
      'Glowing ferns hide you from watcher lights. Brambles and rocks block sight. Watchers that see you fill an eye - then the wilds reset you.',
    ],
    briefTopics: [
      { label: 'CYU: What are watchers?', lines: [
        { who: 'CYU', text: 'Big pale things with lamps for eyes. They are not hunting you - they are curious. Their curiosity has killed several of my drones.' },
        { who: 'CYU', text: 'Stand in a glowing fern and their lamps slide right over you. Try not to be interesting.' },
      ] },
      { label: 'CYU: How do I climb?', lines: [
        { who: 'CYU', text: 'Jump. If your feet are on something and your head is not, you will clear two tiles. Three, if you sprint.' },
        { who: 'CYU', text: 'The cells are stacked on ledges just out of reach of the ground. That is not an accident. The planet likes to be difficult.' },
      ] },
      { label: 'CYU: Any shortcuts?', lines: [
        { who: 'CYU', text: 'The chasms are three tiles wide. You can jump them at a run. I have done the math four times.' },
        { who: 'YOU', text: 'Four times?', choices: [
          { label: 'Reassuring.', flag: 'w1a' },
          { label: 'That is not reassuring.', flag: 'w1b' },
        ] },
        { who: 'CYU', text: 'Noted. I will do it a fifth time while you fall.' },
      ] },
    ],
    world,
    theme: {
      block: '#241536', inner: '#1a0f2a', top: '#5d3a86', speck: '#3f2660',
      plat: '#3f2660', platTop: '#8657b8', spike: '#b490d6',
      crumble: '#3f2660', crack: '#8657b8',
    },
    spawn: { x: T(2) + 16, y: T(20) },
    hearts: g.save.hearts(),
    stamina: g.save.staminaMax(),
    sprint: true,
    goal,
    bg: (ctx, st) => drawWildsBg(ctx, st),
    drawMid: (ctx, st) => {
      for (const fn of ferns) drawFern(ctx, fn, st);
      for (const w of watchers) drawWatcher(ctx, w, st);
    },
    onUpdate: (st, dt) => {
      st.goal.active = st.cells >= 3;
      st.objective = `Cells: ${st.cells}/3 - ${st.goal.active ? 'reach the exit, right' : 'stay out of their sight'}`;
      if (st.cells >= 3 && !st.exitReady) { st.exitReady = true; st.flash('ALL CELLS - GET TO THE EXIT'); }
      updateWatchers(st, watchers, ferns, dt, (msg) => { st.damage(1); st.flash(msg); });
    },
    onGoal: (st) => {
      if (st.done) return;
      st.done = true;
      g.dialogue([
        { who: 'CYU', text: 'Three cells, and you are still breathing. I am upgrading my estimate of you, captain. The reactor will take these nicely.' },
        { who: 'CYU', text: 'The first belt is on the other side of the ridge. Try to keep the ship in one piece on the way through.' },
      ], () => { g.complete('w1'); });
    },
    drawAbove: (ctx, st) => {
      // suspicion eye
      const m = Math.max(0, ...watchers.map((w) => w.susp));
      if (m > 0.02) {
        const x = 480, y = 74;
        ctx.fillStyle = 'rgba(15,8,32,0.7)';
        ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill();
        ctx.strokeStyle = PAL.rose; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 20, -Math.PI / 2, -Math.PI / 2 + m * Math.PI * 2); ctx.stroke();
        ctx.fillStyle = PAL.rose;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill();
        ctx.lineWidth = 1;
        ctx.font = f(10, 'bold'); ctx.fillStyle = PAL.rose; ctx.textAlign = 'center';
        ctx.fillText('SEEN', x, y + 34);
        ctx.textAlign = 'left';
      }
    },
    onOverlay: (ctx, st) => {
      if (st.stMax) {
        const w = 170, x = 12, y = 500;
        ctx.fillStyle = PAL.ink; ctx.fillRect(x, y, w, 9);
        ctx.fillStyle = st.st < st.stMax * 0.25 ? PAL.rose : PAL.laver;
        ctx.fillRect(x, y, w * Math.max(0, st.st / st.stMax), 9);
        ctx.strokeStyle = PAL.purple; ctx.strokeRect(x - 0.5, y - 0.5, w + 1, 10);
        ctx.font = f(10); ctx.fillStyle = PAL.laver;
        ctx.fillText('STAMINA  (SHIFT)', x + 2, y + 22);
      }
    },
  });

  s.cells = 0;
  s.items = [
    { kind: 'cell', x: T(18) + 16, y: T(13) + 8 },
    { kind: 'cell', x: T(58) + 16, y: T(13) + 8 },
    { kind: 'cell', x: T(85) + 16, y: T(13) + 8 },
    { kind: 'shard', x: T(8) + 16, y: T(17) + 6 },
    { kind: 'shard', x: T(31) + 16, y: T(13) + 6 },
    { kind: 'shard', x: T(70) + 16, y: T(13) + 6 },
    { kind: 'shard', x: T(99) + 16, y: T(15) + 6 },
  ];
  s.checkpoints = [
    { x: T(2) + 16, y: T(20), on: true },
    { x: T(24) + 16, y: T(20), on: false },
    { x: T(76) + 16, y: T(20), on: false },
    { x: T(100) + 16, y: T(20), on: false },
  ];
  s.movers = [
    makeMover(T(72), T(18), 96, 14, { dx: 96, speed: 0.5, phase: 0.1 }),
  ];
  return s;
}

function mkWatch(x0, x1, y, speed, phase) {
  return { x0, x1, y, speed, phase, x: x0, dir: 1, susp: 0, alert: 0 };
}

function updateWatchers(st, watchers, ferns, dt, caught) {
  const hidden = ferns.some((fn) => Math.hypot(st.p.x - fn.x, (st.p.y - 12) - fn.y) < 40);
  for (const w of watchers) {
    const k = st.t * w.speed * Math.PI * 2 + w.phase * Math.PI;
    const ease = 0.5 - 0.5 * Math.cos(k);
    w.x = w.x0 + (w.x1 - w.x0) * ease;
    const vel = Math.sin(k);
    w.dir = vel >= 0 ? 1 : -1;
    w.alert = 0;

    const px = st.p.x, py = st.p.y - 15;
    const dx = px - w.x, dy = py - w.y;
    const dist = Math.hypot(dx, dy);
    let seen = false;
    if (!hidden && dist < 210) {
      const dot = (dx * w.dir) / Math.max(0.001, dist);
      if (dot > 0.55 && losClear(st.world, w.x, w.y, px, py)) seen = true;
    }
    if (seen) {
      w.susp = Math.min(1, w.susp + dt * 0.9);
      w.alert = 1;
      if (w.susp >= 1) {
        for (const x of watchers) x.susp = 0;
        caught('A WATCHER SAW YOU');
        Sfx.bad();
        return;
      }
    } else {
      w.susp = Math.max(0, w.susp - dt * 0.7);
    }
  }
}

function losClear(grid, x1, y1, x2, y2) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.ceil(d / 12);
  for (let i = 1; i < steps; i++) {
    const x = x1 + ((x2 - x1) * i) / steps, y = y1 + ((y2 - y1) * i) / steps;
    const t = grid.get(Math.floor(x / TS), Math.floor(y / TS));
    if (t === 1 || t === 4) return false;
  }
  return true;
}

function drawFern(ctx, fn, st) {
  const x = fn.x - st.cam.x, y = fn.y - st.cam.y;
  const pulse = 0.5 + Math.sin(st.t * 4 + fn.x) * 0.2;
  ctx.globalAlpha = 0.2 + pulse * 0.15;
  ctx.fillStyle = PAL.hot;
  ctx.beginPath(); ctx.arc(x, y + 4, 34, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = PAL.hot;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y + 12);
    ctx.quadraticCurveTo(x + Math.cos(a) * 18, y + Math.sin(a) * 14, x + Math.cos(a) * 28, y + Math.sin(a) * 8);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.fillStyle = PAL.pink;
  ctx.beginPath(); ctx.arc(x, y + 8, 4, 0, 7); ctx.fill();
}

function drawWatcher(ctx, w, st) {
  const x = w.x - st.cam.x, y = w.y - st.cam.y + Math.sin(st.t * 5 + w.x0) * 3;
  // cone of light
  const a0 = w.dir > 0 ? -0.5 : Math.PI - 0.5;
  const g = ctx.createRadialGradient(x, y, 12, x, y, 210);
  const col = w.susp > 0.03 ? 'rgba(255,158,203,' : 'rgba(180,144,214,';
  g.addColorStop(0, col + (0.30 + w.susp * 0.2) + ')');
  g.addColorStop(1, col + '0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, 210, a0, a0 + 1.0);
  ctx.closePath(); ctx.fill();
  // drone body
  ctx.fillStyle = PAL.laver;
  ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill();
  ctx.fillStyle = PAL.bg2;
  ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
  ctx.fillStyle = w.susp > 0.03 ? PAL.rose : PAL.hot;
  ctx.beginPath(); ctx.arc(x + w.dir * 4, y - 1, 4, 0, 7); ctx.fill();
  // tendrils
  ctx.strokeStyle = PAL.laver;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x - 6 + i * 6, y + 10);
    ctx.quadraticCurveTo(x - 8 + i * 7, y + 20, x - 4 + i * 6, y + 26 + Math.sin(st.t * 6 + i) * 3);
    ctx.stroke();
  }
}

function drawWildsBg(ctx, st) {
  const grad = ctx.createLinearGradient(0, 0, 0, 540);
  grad.addColorStop(0, '#150c26');
  grad.addColorStop(0.6, '#1d1230');
  grad.addColorStop(1, '#120a1f'); // below the tiles: chasms must read as holes
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 960, 540);
  // stars
  for (let i = 0; i < 60; i++) {
    const x = (i * 173 - st.cam.x * 0.15) % 1100;
    const y = (i * 91) % 300;
    ctx.fillStyle = i % 4 === 0 ? PAL.peach : PAL.laver;
    ctx.globalAlpha = 0.25 + (i % 5) * 0.1 + Math.sin(st.t * 2 + i) * 0.1;
    ctx.fillRect(x < 0 ? x + 1100 : x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
  // mountain silhouettes
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = ['#1a0f2a', '#21132f', '#291838'][layer];
    ctx.beginPath();
    ctx.moveTo(0, 540);
    const off = st.cam.x * (0.1 + layer * 0.08);
    for (let x = -100; x <= 1100; x += 100) {
      const h = 160 + layer * 40 + ((x + layer * 37) % 120);
      ctx.lineTo(x - (off % 200), 540 - h);
      ctx.lineTo(x + 50 - (off % 200), 540 - h - 60);
    }
    ctx.lineTo(1100, 540);
    ctx.closePath(); ctx.fill();
  }
  // fog
  ctx.fillStyle = 'rgba(231,84,166,0.06)';
  ctx.fillRect(0, 380, 960, 160);
  // depth haze: below the treeline, chasms must read darker than the ground
  const dk = ctx.createLinearGradient(0, 330, 0, 540);
  dk.addColorStop(0, 'rgba(10,5,20,0)');
  dk.addColorStop(1, 'rgba(10,5,20,0.82)');
  ctx.fillStyle = dk;
  ctx.fillRect(0, 330, 960, 210);
}

// ================================================================ WORLD 2
// THE LABYRINTH OF MORIA - lantern platformer. Light is ammo, not decoration.
export function mazeLevel(g) {
  const world = new WorldGrid(100, 34);
  world.rect(0, 0, 100, 2);          // cave ceiling
  world.rect(0, 32, 16, 2);          // floor, with chasms
  world.rect(18, 32, 20, 2);
  world.rect(41, 32, 20, 2);
  world.rect(64, 32, 36, 2);
  world.rect(4, 28, 11, 2);          // start plateau, 128px above the cave floor
  world.rect(0, 30, 3, 2);           // stair block back up to the plateau

  // stair of ledges climbing to the soul (every step 2 rows up)
  const stair = [
    [19, 30, 3], [22, 28, 3], [25, 26, 3], [28, 24, 3], [31, 22, 3],
    [34, 20, 3], [37, 18, 3], [40, 16, 3], [43, 14, 3], [46, 12, 3],
    [49, 10, 3], [52, 8, 3],
  ];
  for (const [x, y, w] of stair) world.rect(x, y, w, 1);
  world.rect(55, 7, 9, 1);           // soul shelf
  // right floor area decoration
  world.rect(70, 29, 3, 1);
  world.rect(76, 27, 3, 1);
  world.rect(82, 29, 4, 1);
  // spikes on the central floor
  for (let x = 46; x <= 49; x++) world.set(x, 31, 3);

  const goal = { x: T(6), y: T(28), active: false, label: 'PORTAL' };

  const shadows = [
    mkShadow(T(26), T(24)), mkShadow(T(44), T(14)),
    mkShadow(T(52), T(8)), mkShadow(T(70), T(32)), mkShadow(T(86), T(32)),
  ];
  const shadowSpawns = shadows.map((s) => ({ x: s.hx, y: s.hy }));

  const s = makePlatformLevel(g, {
    title: 'WORLD 2 - THE LABYRINTH',
    objective: "Soul 0/1 - Fuel 0/1 - don't let the lantern die",
    brief: [
      'WASD / Arrows - run   -   SPACE - jump (twice for the thruster boots)   -   E - use',
      'Find Moria\u2019s lost soul and the fuel canister, then carry both back to the portal where you woke.',
      'Your lantern burns oil: the darker it gets, the smaller your light. Oil drops refill it. Shadows live in the dark - do not touch them.',
    ],
    briefTopics: [
      { label: 'CYU: Who is Moria?', lines: [
        { who: 'CYU', text: 'The cave-mind. Old, sad, and extremely possessive of its soul. Someone broke in and stole it years ago. We are going to borrow it back.' },
        { who: 'YOU', text: 'Borrow.', choices: [
          { label: 'Borrow. Sure.', flag: 'm1' },
          { label: 'We are stealing it, Cyu.', flag: 'm2' },
        ] },
        { who: 'CYU', text: 'We are borrowing it with intent to return. That is different. Probably.' },
      ] },
      { label: 'CYU: How does the lantern work?', lines: [
        { who: 'CYU', text: 'It burns oil. The more oil, the bigger the circle of "not eaten". Pink drops on the ground refill it. The bar at the bottom is your life, too.' },
      ] },
      { label: 'CYU: What are the shadows?', lines: [
        { who: 'CYU', text: 'Things the light forgot. They drift toward warmth. Stay out of arm\u2019s reach and you are a rumour to them.' },
        { who: 'CYU', text: 'If one touches you, the maze resets us to the last beacon. The lantern will be angry about it.' },
      ] },
    ],
    world,
    theme: {
      block: '#2a1a42', inner: '#1a0f2a', top: '#3f2660', speck: '#8657b8',
      plat: '#3f2660', platTop: '#8657b8', spike: '#b490d6',
      crumble: '#3f2660', crack: '#8657b8',
    },
    spawn: { x: T(6), y: T(28) },
    hearts: g.save.hearts(),
    oil: g.save.oilMax(),
    goal,
    bg: (ctx, st) => drawCaveBg(ctx, st),
    drawMid: (ctx, st) => {
      for (const sh of shadows) drawShadow(ctx, sh, st, 0);
    },
    onUpdate: (st, dt) => {
      // oil burns, light shrinks
      st.oil = Math.max(0, st.oil - dt);
      st.radius = 150 + 130 * (st.oil / st.oilMax);
      if (st.oil <= 0) {
        if (st.damage(1)) {
          st.oil = st.oilMax * 0.65;
          st.flash('The lantern guttered out...');
        }
      }
      st.objective = `Soul ${st.hasSoul ? 1 : 0}/1 - Fuel ${st.hasFuel ? 1 : 0}/1`;
      if (st.hasSoul && st.hasFuel && !st.goal.active) {
        st.goal.active = true;
        st.flash('THE PORTAL OPENS');
        Sfx.good();
      }
      // shadows hunt the light
      for (const sh of shadows) {
        const dp = Math.hypot(st.p.x - sh.x, (st.p.y - 15) - sh.y);
        sh.retarget -= dt;
        if (dp < 240) { sh.tx = st.p.x; sh.ty = st.p.y - 15; }
        else if (!sh.tx || sh.retarget <= 0) {
          sh.tx = sh.hx + (Math.random() - 0.5) * 260;
          sh.ty = sh.hy + (Math.random() - 0.5) * 180;
          sh.retarget = 2.5 + Math.random() * 2;
        }
        const d = Math.hypot(sh.tx - sh.x, sh.ty - sh.y) || 1;
        const sp = dp < 240 ? 52 : 30;
        sh.x += ((sh.tx - sh.x) / d) * sp * dt;
        sh.y += ((sh.ty - sh.y) / d) * sp * dt;
        sh.ph += dt * 3;
        if (dp < 20) {
          st.damage(1);
          st.flash('A shadow found you');
          if (st.oil > 0) st.oil = Math.max(20, st.oil - 12);
          break;
        }
      }
    },
    onRespawn: (st) => {
      st.oil = Math.max(st.oil, st.oilMax * 0.55);
      shadows.forEach((sh, i) => {
        sh.x = shadowSpawns[i].x; sh.y = shadowSpawns[i].y;
        sh.tx = null; sh.ty = null;
      });
    },
    onGoal: (st) => {
      if (st.done) return;
      st.done = true;
      g.dialogue([
        { who: 'MORIA', text: '...you brought it back. The light. The little light. I had forgotten how warm.' },
        { who: 'CYU', text: 'Soul and fuel, captain. Moria is purring - in a cave-mind sort of way. Two worlds down.' },
        { who: 'CYU', text: 'The next signature is tall. Very tall. I would say "rest first", but the tower is already paging us.' },
      ], () => { g.complete('maze'); });
    },
    onOverlay: (ctx, st) => {
      const cx = st.p.x - st.cam.x, cy = st.p.y - 16 - st.cam.y;
      // radius is derived each update; the first draw can happen before that
      const r = Number.isFinite(st.radius) ? st.radius : 150 + 130 * (st.oil / st.oilMax);
      st.radius = r;
      const flick = 1 + Math.sin(st.t * 9) * 0.02;
      const grd = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * flick);
      grd.addColorStop(0, 'rgba(10,5,20,0)');
      grd.addColorStop(0.75, 'rgba(10,5,20,0.55)');
      grd.addColorStop(1, 'rgba(10,5,20,0.97)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = 'rgba(10,5,20,0.985)';
      ctx.beginPath();
      ctx.arc(cx, cy, r * flick, 0, Math.PI * 2);
      ctx.rect(-10, -10, 985, 565);
      ctx.fill('evenodd');
      // warm core of the lantern
      const warm = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.55);
      warm.addColorStop(0, 'rgba(255,211,165,0.10)');
      warm.addColorStop(1, 'rgba(255,211,165,0)');
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, 960, 540);

      // oil + items
      const frac = st.oil / st.oilMax;
      ctx.fillStyle = PAL.ink; ctx.fillRect(330, 508, 240, 12);
      ctx.fillStyle = frac > 0.25 ? PAL.peach : PAL.rose;
      ctx.fillRect(330, 508, 240 * Math.max(0, frac), 12);
      ctx.strokeStyle = PAL.lampp; ctx.strokeRect(329.5, 507.5, 241, 13);
      ctx.font = f(11, 'bold'); ctx.fillStyle = PAL.laver;
      ctx.fillText('LANTERN OIL', 240, 519);
      ctx.font = f(11); ctx.fillStyle = PAL.laver;
      ctx.fillText(`SOUL ${st.hasSoul ? '◆' : '-'}  FUEL ${st.hasFuel ? '◆' : '-'}`, 600, 519);
    },
  });

  s.items = [
    { kind: 'soul', x: T(59) + 10, y: T(6) + 10, effect: (gg, st) => { st.hasSoul = true; Sfx.good(); } },
    { kind: 'fuel', x: T(11), y: T(32) - 16, effect: (gg, st) => { st.hasFuel = true; Sfx.good(); } },
    { kind: 'shard', x: T(9), y: T(28) - 16 },
    { kind: 'shard', x: T(35), y: T(20) - 16 },
    { kind: 'shard', x: T(55), y: T(6) + 4 },
    { kind: 'shard', x: T(78), y: T(26) + 4 },
  ];
  const oilSpots = [
    [20, 29], [27, 25], [35, 19], [44, 13], [52, 7],
    [10, 28], [4, 31], [70, 28], [84, 28],
  ];
  for (const [tx, ty] of oilSpots) s.items.push({ kind: 'oil', x: T(tx) + 16, y: T(ty) - 10, power: 26 });

  s.checkpoints = [
    { x: T(6), y: T(28), on: true },
    { x: T(28) + 16, y: T(24), on: false },
    { x: T(55) + 16, y: T(7), on: false },
    { x: T(70) + 16, y: T(32), on: false },
  ];
  s.movers = [
    makeMover(T(44), T(30), 96, 14, { dx: 160, speed: 0.45, phase: 0.15 }),
    makeMover(T(43), T(17), 96, 14, { dy: -224, speed: 0.32, phase: 0.5 }),
  ];
  return s;
}

function mkShadow(x, y) {
  return { x, y, hx: x, hy: y, tx: null, ty: null, retarget: 0, ph: 0 };
}

function drawShadow(ctx, sh, st, layer) {
  const x = sh.x - st.cam.x, y = sh.y - st.cam.y;
  const dp = Math.hypot(st.p.x - sh.x, (st.p.y - 15) - sh.y);
  if (dp > st.radius + 90) return;
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = PAL.ink;
  const wob = Math.sin(sh.ph) * 2;
  ctx.beginPath(); ctx.ellipse(x, y + wob, 13, 16, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = PAL.purple;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y + wob, 13, 16, 0, 0, 7); ctx.stroke();
  ctx.lineWidth = 1;
  // two pale eyes
  ctx.fillStyle = PAL.laver;
  ctx.beginPath(); ctx.arc(x - 4, y - 3 + wob, 1.6, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 4, y - 3 + wob, 1.6, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawCaveBg(ctx, st) {
  const grad = ctx.createLinearGradient(0, 0, 0, 540);
  grad.addColorStop(0, '#0f0820');
  grad.addColorStop(0.7, '#150c26');
  grad.addColorStop(1, '#120a1f'); // chasms darker than tile faces
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 960, 540);
  // stalactites
  ctx.fillStyle = '#1a0f2a';
  const off = (st.cam.x * 0.25) % 300;
  for (let i = -1; i < 5; i++) {
    const x = i * 300 - off;
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + 150, 0); ctx.lineTo(x + 100, 90 + (i % 2) * 50); ctx.lineTo(x + 40, 40);
    ctx.closePath(); ctx.fill();
  }
  // faint fungal glow
  for (let i = 0; i < 8; i++) {
    const x = (i * 233 - st.cam.x * 0.4) % 1100;
    const y = 120 + (i * 97) % 320;
    ctx.globalAlpha = 0.10 + Math.sin(st.t + i) * 0.05;
    ctx.fillStyle = i % 2 ? PAL.pink : PAL.laver;
    ctx.beginPath(); ctx.arc(x < 0 ? x + 1100 : x, y, 24, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ================================================================ WORLD 3
// THE TOWER OF CAESAR - a vertical platformer. Climb six floors, set four
// seals, answer the statue's riddle, reach the beacon housing.
const TFLOOR = [98, 82, 66, 50, 34, 18];
const TLEVER = [
  { name: 'FLAME', x: 25, floor: 82, col: PAL.hot },
  { name: 'MOON', x: 25, floor: 66, col: PAL.laver },
  { name: 'FROST', x: 25, floor: 50, col: PAL.cream },
  { name: 'STAR', x: 25, floor: 34, col: PAL.peach },
];

export function towerLevel(g) {
  const W = 30, H = 102;
  const world = new WorldGrid(W, H);
  world.rect(0, 0, W, 2);            // tower ceiling
  world.rect(0, 2, 1, H - 2);        // left wall
  world.rect(W - 1, 2, 1, H - 2);    // right wall
  world.rect(0, 98, W, 4);           // foundation

  // one-way stone girders: every floor above the ground
  for (let i = 1; i < TFLOOR.length; i++) world.rect(1, TFLOOR[i], W - 2, 1, 2);
  // climbing shafts between each pair of floors
  for (let i = 0; i < TFLOOR.length - 1; i++) buildShaft(world, TFLOOR[i], TFLOOR[i + 1]);

  // room hazards, kept clear of the shaft landings at columns 5-14
  for (let x = 18; x <= 19; x++) world.set(x, 81, 3);   // floor 1 spikes
  world.clear(19, 66, 3, 1);                            // floor 2 pit
  world.clear(18, 50, 5, 1);                            // floor 3 crumbling bridge
  world.rect(18, 50, 5, 1, 4);
  for (let x = 18; x <= 19; x++) world.set(x, 33, 3);   // floor 4 spikes

  // summit gate, sealing the beacon housing
  world.rect(17, 12, 1, 6, 1);

  const levers = TLEVER.map((l) => Object.assign({ on: false, y: T(l.floor) }, l));

  const s = makePlatformLevel(g, {
    title: 'WORLD 3 - THE TOWER OF CAESAR',
    objective: 'Seals 0/4 - climb the tower',
    brief: [
      'WASD / Arrows - run   -   SPACE - jump (twice for thrusters)   -   E - use / read / pull   -   SHIFT - sprint',
      'Climb six floors. On each, cross the hazard and pull the seal lever at the far right. Checkpoints sit beside each landing.',
      'At the summit, Caesar\u2019s statue asks one riddle. Answer it, the gate opens, and the beacon housing is yours.',
    ],
    briefTopics: [
      { label: 'CYU: What is this tower?', lines: [
        { who: 'CYU', text: 'A power relay, older than the colony that built it. Six floors of very sincere stonework. The beacon at the top is what I need for the burn.' },
        { who: 'CYU', text: 'It also has opinions. The seals are not decoration - each one feeds the gate.' },
      ] },
      { label: 'CYU: Who was Caesar?', lines: [
        { who: 'CYU', text: 'The colony\u2019s first governor, and a bit of a dramatist. He built a tower so tall the sunrise would hit it first, then filled it with riddles so nobody could say he made it easy.' },
        { who: 'YOU', text: 'That is a lot of effort to be mysterious.', choices: [
          { label: 'I respect it a little.', flag: 'tower_a' },
          { label: 'That is deeply annoying.', flag: 'tower_b' },
        ] },
        { who: 'CYU', text: 'He also named the moon after himself. Twice. There are two moons called Caesar up there and he is not on either of them.' },
      ] },
      { label: 'CYU: What are the seals?', lines: [
        { who: 'CYU', text: 'Flame, moon, frost, star - the four things the first settlers feared and needed. Pull one and the floor hums. Pull all four and the summit gate wakes up.' },
        { who: 'CYU', text: 'The levers are at the far right of every floor. Yes, past the spikes. No, I did not design this tower.' },
      ] },
      { label: 'CYU: Are you alright?', lines: [
        { who: 'CYU', text: 'My reactor is at eleven percent, my hull is open to vacuum in two places, and I have been talking to a sleeping human for a hundred and forty million lightyears.' },
        { who: 'CYU', text: 'I am excellent. Why do you ask?' },
        { who: 'YOU', text: '...', choices: [
          { label: 'No reason. Keep talking.', flag: 'tower_c' },
          { label: 'Because I am glad you are here.', flag: 'tower_d' },
        ] },
        { who: 'CYU', text: 'Logged. Under "things the captain said at altitude".' },
      ] },
    ],
    world,
    theme: {
      block: '#2a1a42', inner: '#1a0f2a', top: '#5d3a86', speck: '#8657b8',
      plat: '#3f2660', platTop: '#8657b8', spike: '#b490d6',
      crumble: '#3f2660', crack: '#ff9ecb',
    },
    spawn: { x: T(15) + 16, y: T(98) },
    hearts: g.save.hearts(),
    goal: { x: T(24), y: T(18), active: false, label: 'BEACON' },
    bg: drawTowerBg,
    drawBelow: drawTowerProps,
    drawMid: (ctx, st, cam) => drawTowerMid(ctx, st, cam, levers),
    onUpdate: (st) => {
      st.objective = `Seals ${st.seals || 0}/4 - ${st.gateOpen ? 'reach the beacon' : 'climb the tower'}`;
      if (st.seals >= 4 && !st.sealsDone) {
        st.sealsDone = true;
        st.flash('FOUR SEALS SET - THE SUMMIT');
        Sfx.good();
      }
    },
    onGoal: (st) => {
      if (st.done) return;
      st.done = true;
      g.dialogue([
        { who: 'CYU', text: 'Beacon housing open. That is the last piece - plating, fuel, cells and a lighthouse. The EXON-1 can fly.' },
        { who: 'CYU', text: 'Come back down, captain. I will leave the porch light on. ...I will miss the purple a little. Do not tell anyone.' },
      ], () => { g.complete('tower'); });
    },
    onOverlay: (ctx, st) => drawTowerHud(ctx, st, levers),
  });

  s.seals = 0;

  s.items = [
    { kind: 'shard', x: T(3), y: T(98) - 12 },
    { kind: 'shard', x: T(14), y: T(80) - 8 },
    { kind: 'shard', x: T(15), y: T(64) - 8 },
    { kind: 'shard', x: T(14), y: T(48) - 8 },
    { kind: 'shard', x: T(14), y: T(32) - 8 },
  ];

  s.checkpoints = [
    { x: T(15), y: T(98), on: true },
    { x: T(7), y: T(82), on: false },
    { x: T(7), y: T(66), on: false },
    { x: T(7), y: T(50), on: false },
    { x: T(7), y: T(34), on: false },
    { x: T(5), y: T(18), on: false },
  ];

  s.movers = [
    makeMover(T(19), T(66), T(3), 14, { dx: T(3), speed: 0.3, phase: 0.15 }),
  ];

  s.interactables = [
    { x: T(8), y: T(98), r: 72, label: 'E - READ THE FOUNDATION STONE',
      use: () => g.dialogue([
        { who: 'THE STONE', text: 'HERE STOOD CAESAR, FIRST OF THE COLONY. FOUR SEALS RING MY TOWER: THE HEARTH AT THE ROOT, THE TIDE ABOVE IT, THE FROST ABOVE THAT, AND THE STAR AT THE CROWN.' },
        { who: 'THE STONE', text: 'SET THEM IN THE ORDER OF THE CLIMB AND THE GATE WILL KNOW YOUR NAME. OR AT LEAST YOUR FOOTWORK.' },
        { who: 'CYU', text: 'Helpful. And slightly smug for a rock.' },
      ]) },
    ...[...levers].map((lv) => ({
      x: T(lv.x) + 16, y: T(lv.floor), r: 68,
      label: 'E - PULL THE ' + lv.name + ' SEAL',
      use: (st) => {
        if (lv.on) {
          g.dialogue([{ who: 'CYU', text: lv.name + ' is already lit. ' + st.seals + ' of 4 seals are burning. Keep climbing, captain.' }]);
          return;
        }
        lv.on = true;
        st.seals++;
        Sfx.good();
        st.flash(lv.name + ' SEAL SET - ' + st.seals + '/4');
        g.dialogue([{ who: 'CYU', text: LEVER_LINES[lv.name] }]);
      },
    })),
    { x: T(8), y: T(18), r: 80, label: "E - CAESAR'S STATUE",
      use: (st) => askCaesar(g, st) },
    { x: T(3), y: T(18), r: 64, label: 'E - SERVICE VENT (DOWN)',
      use: (st) => {
        st.p.x = T(15); st.p.y = T(98);
        st.p.vx = 0; st.p.vy = 0;
        st.spawnPt = { x: T(15), y: T(98) };
        st.flash('THE VENT DROPS YOU AT THE ROOT');
        Sfx.blip();
      } },
  ];

  return s;
}

const LEVER_LINES = {
  FLAME: 'The hearth seal. The tower remembers warm hands. One floor down, five to go - well, up. You know what I mean.',
  MOON: 'Tide seal lit. The old colonists used to read the moons like a calendar. Mostly they read "run".',
  FROST: 'Frost seal. Careful on the stone from here - the tower gets cold near the crown.',
  STAR: 'The star seal. All four are burning, captain. The summit gate should be awake. Go and be clever at it.',
};

function buildShaft(world, lowerY, upperY) {
  let side = 0, n = 0;
  for (let y = lowerY - 2; y > upperY; y -= 2) {
    const kind = n % 5 === 4 ? 4 : 2; // one-way: jump up through them, land on top
    world.rect(side === 0 ? 5 : 16, y, 10, 1, kind);
    side ^= 1;
    n++;
  }
}

function askCaesar(g, st) {
  if (st.gateOpen) {
    g.dialogue([{ who: 'CAESAR', text: 'The gate is open, little climber. The sky is on the other side. Go and take it.' }]);
    return;
  }
  if (st.seals < 4) {
    g.dialogue([
      { who: 'CAESAR', text: `Four seals ring my tower. ${st.seals} burn for you. The gate does not answer a half-made key.` },
      { who: 'CYU', text: 'He is right. The levers are on the floors below - far right, past the spikes. The service vent at the edge will take you back to the root.' },
    ]);
    return;
  }
  st.answer = null;
  g.onChoice = (flag) => { if (flag && flag.startsWith('tower_')) st.answer = flag; };
  g.dialogue([
    { who: 'CAESAR', text: 'So. The little climber reaches the crown. Four seals burn for you, and still the gate wants one answer.' },
    { who: 'THE INSCRIPTION', text: 'I have no feet, yet I stand. I have no hands, yet I hold this tower. I was here before the first stone, and I will be here after the last. What am I?' },
    { who: 'YOU', text: '...', choices: [
      { label: 'The mountain.', flag: 'tower_ok' },
      { label: 'The wind.', flag: 'tower_no' },
      { label: 'The star.', flag: 'tower_no' },
    ] },
    { who: 'CAESAR', text: 'Then the gate remembers you.' },
  ], () => {
    g.onChoice = null;
    if (st.answer === 'tower_ok') openSealGate(g, st);
    else g.dialogue([{ who: 'CAESAR', text: 'The stone does not answer. Neither will the gate. Read it again, climber.' }]);
  });
}

function openSealGate(g, st) {
  st.gateOpen = true;
  st.world.clear(17, 12, 1, 6);
  st.goal.active = true;
  st.flash('THE GATE OPENS');
  Sfx.good();
  g.dialogue([{ who: 'CYU', text: 'Gate is open. Beacon housing is right there. Go on, captain - I will keep the channel open.' }]);
}

// ---------------- tower art ----------------
function drawTowerBg(ctx, st, cam) {
  const grd = ctx.createLinearGradient(0, 0, 0, 540);
  grd.addColorStop(0, '#0d0719');
  grd.addColorStop(0.55, '#150c26');
  grd.addColorStop(1, '#0f0820'); // darker than the tile inner face, so shafts/pits read as drops
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 960, 540);

  // tall arched windows, parallax behind the tower
  const off = (cam.y * 0.4) % 360;
  for (let i = -1; i < 3; i++) {
    const y = 60 - off + i * 360;
    ctx.fillStyle = 'rgba(93,58,134,0.16)';
    ctx.beginPath();
    ctx.moveTo(392, y + 250);
    ctx.lineTo(392, y + 80);
    ctx.quadraticCurveTo(480, y - 20, 568, y + 80);
    ctx.lineTo(568, y + 250);
    ctx.closePath(); ctx.fill();
    for (let k = 0; k < 12; k++) {
      ctx.fillStyle = k % 3 === 0 ? PAL.peach : PAL.laver;
      ctx.globalAlpha = 0.22 + ((k * 7) % 5) * 0.08;
      ctx.fillRect(404 + (k * 61) % 150, y + 44 + (k * 47) % 180, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  // brick courses and joints
  ctx.strokeStyle = 'rgba(93,58,134,0.13)';
  const boff = cam.y % 64;
  for (let y = -boff; y < 560; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke();
    const stagger = Math.floor((y + cam.y) / 64) % 2 ? 40 : 0;
    for (let x = stagger; x < 960; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 64); ctx.stroke();
    }
  }

  // dark buttresses at the walls
  ctx.fillStyle = 'rgba(13,7,25,0.5)';
  ctx.fillRect(0, 0, 30, 540);
  ctx.fillRect(930, 0, 30, 540);
}

function drawTowerProps(ctx, st, cam) {
  for (let i = 1; i < TFLOOR.length; i++) {
    const fy = T(TFLOOR[i]) - cam.y;
    if (fy < -40 || fy > 580) continue;

    // banner on the right wall
    ctx.fillStyle = PAL.purple;
    ctx.globalAlpha = 0.6 + Math.sin(st.t * 1.4 + i) * 0.06;
    ctx.fillRect(906, fy - 168, 24, 126);
    ctx.fillStyle = PAL.hot;
    ctx.fillRect(906, fy - 168, 24, 7);
    ctx.beginPath();
    ctx.moveTo(906, fy - 42); ctx.lineTo(918, fy - 24); ctx.lineTo(930, fy - 42);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.peach;
    ctx.beginPath(); ctx.arc(918, fy - 110, 6, 0, 7); ctx.fill();

    // torch on the left wall
    const fl = 0.7 + Math.sin(st.t * 9 + i * 2) * 0.22;
    ctx.globalAlpha = 0.2 * fl;
    ctx.fillStyle = PAL.peach;
    ctx.beginPath(); ctx.arc(46, fy - 62, 44, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.lampp;
    ctx.fillRect(42, fy - 56, 8, 18);
    ctx.fillStyle = PAL.peach;
    ctx.beginPath();
    ctx.moveTo(46, fy - 78 - fl * 6);
    ctx.quadraticCurveTo(55, fy - 62, 46, fy - 54);
    ctx.quadraticCurveTo(37, fy - 62, 46, fy - 78 - fl * 6);
    ctx.fill();

    // chains hanging from the girder above
    ctx.strokeStyle = 'rgba(134,87,184,0.3)';
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const x = 140 + k * 300;
      ctx.moveTo(x, fy - 200);
      ctx.lineTo(x, fy - 70);
    }
    ctx.stroke();
  }
}

function drawTowerMid(ctx, st, cam, levers) {
  drawGate(ctx, st, cam);
  drawStatue(ctx, st, cam);

  // service vent grate
  const vx = T(3) - cam.x, vy = T(18) - cam.y;
  ctx.fillStyle = PAL.bg1;
  ctx.fillRect(vx - 20, vy - 8, 40, 8);
  ctx.strokeStyle = PAL.purple;
  ctx.strokeRect(vx - 19.5, vy - 7.5, 39, 7);
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(vx - 20 + i * 10, vy - 8); ctx.lineTo(vx - 20 + i * 10, vy); ctx.stroke();
  }

  for (const lv of levers) drawLever(ctx, lv, st, cam);
}

function drawLever(ctx, lv, st, cam) {
  const x = T(lv.x) + 16 - cam.x;
  const y = T(lv.floor) - cam.y;
  if (y < -120 || y > 620) return;

  const glow = lv.on ? 0.45 + Math.sin(st.t * 4 + lv.floor) * 0.18 : 0.07;
  ctx.fillStyle = lv.col;
  ctx.globalAlpha = glow;
  ctx.beginPath(); ctx.arc(x, y - 54, 30, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = PAL.bg2;
  ctx.fillRect(x - 18, y - 26, 36, 26);
  ctx.fillStyle = PAL.bg1;
  ctx.fillRect(x - 13, y - 22, 26, 22);
  ctx.strokeStyle = lv.on ? lv.col : PAL.purple;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y - 22);
  ctx.lineTo(x + (lv.on ? 16 : -16), y - 52);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = lv.on ? lv.col : PAL.laver;
  ctx.beginPath(); ctx.arc(x + (lv.on ? 16 : -16), y - 52, 5, 0, 7); ctx.fill();

  drawRune(ctx, lv.name, x, y - 74, lv.on ? lv.col : PAL.purple, st.t);

  ctx.font = f(9, 'bold');
  ctx.textAlign = 'center';
  ctx.fillStyle = lv.on ? lv.col : PAL.laver;
  ctx.fillText(lv.name, x, y + 14);
  ctx.textAlign = 'left';
}

function drawRune(ctx, name, x, y, col, t) {
  ctx.strokeStyle = col;
  ctx.fillStyle = col;
  ctx.lineWidth = 2;
  if (name === 'FLAME') {
    ctx.beginPath();
    ctx.moveTo(x, y - 11);
    ctx.quadraticCurveTo(x + 11, y + 2, x, y + 10);
    ctx.quadraticCurveTo(x - 11, y + 2, x, y - 11);
    ctx.fill();
  } else if (name === 'MOON') {
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, 7);
    ctx.fill();
    ctx.fillStyle = PAL.bg0;
    ctx.beginPath(); ctx.arc(x + 5, y - 2, 8, 0, 7); ctx.fill();
  } else if (name === 'FROST') {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      ctx.moveTo(x - Math.cos(a) * 11, y - Math.sin(a) * 11);
      ctx.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11);
    }
    ctx.stroke();
  } else {
    const p = 0.75 + Math.sin(t * 3) * 0.25;
    ctx.beginPath();
    ctx.moveTo(x, y - 12 * p); ctx.lineTo(x + 4, y - 4);
    ctx.lineTo(x + 12 * p, y); ctx.lineTo(x + 4, y + 4);
    ctx.lineTo(x, y + 12 * p); ctx.lineTo(x - 4, y + 4);
    ctx.lineTo(x - 12 * p, y); ctx.lineTo(x - 4, y - 4);
    ctx.closePath(); ctx.fill();
  }
  ctx.lineWidth = 1;
}

function drawStatue(ctx, st, cam) {
  const x = T(8) - cam.x, y = T(18) - cam.y;
  const awake = st.seals >= 4;

  ctx.fillStyle = '#241536';
  ctx.beginPath();
  ctx.moveTo(x - 36, y);
  ctx.lineTo(x - 36, y - 26);
  ctx.lineTo(x - 22, y - 38);
  ctx.lineTo(x - 21, y - 62);
  ctx.quadraticCurveTo(x - 22, y - 92, x, y - 95);
  ctx.quadraticCurveTo(x + 22, y - 92, x + 21, y - 62);
  ctx.lineTo(x + 27, y - 42);
  ctx.lineTo(x + 36, y - 36);
  ctx.lineTo(x + 36, y);
  ctx.closePath(); ctx.fill();

  ctx.strokeStyle = PAL.purple;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.lineWidth = 1;

  // crown of small points
  ctx.fillStyle = PAL.lampp;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 8, y - 94);
    ctx.lineTo(x + i * 8 + 3, y - 108 - Math.abs(i) * -3);
    ctx.lineTo(x + i * 8 + 6, y - 94);
    ctx.closePath(); ctx.fill();
  }

  // eyes
  ctx.fillStyle = awake ? PAL.hot : PAL.bg3;
  if (awake) ctx.globalAlpha = 0.55 + Math.sin(st.t * 4) * 0.25;
  ctx.fillRect(x - 11, y - 78, 8, 3);
  ctx.fillRect(x + 3, y - 78, 8, 3);
  ctx.globalAlpha = 1;

  // plaque at the base
  ctx.fillStyle = PAL.bg1;
  ctx.fillRect(x - 26, y - 20, 52, 14);
  ctx.strokeStyle = awake ? PAL.peach : PAL.purple;
  ctx.strokeRect(x - 25.5, y - 19.5, 51, 13);
  ctx.font = f(8, 'bold');
  ctx.textAlign = 'center';
  ctx.fillStyle = awake ? PAL.peach : PAL.laver;
  ctx.fillText('ASK', x, y - 9);
  ctx.textAlign = 'left';
}

function drawGate(ctx, st, cam) {
  const x = 17 * TS + 16 - cam.x;
  const y0 = 12 * TS - cam.y, y1 = 18 * TS - cam.y;
  if (st.gateOpen) {
    const grd = ctx.createLinearGradient(x - 50, 0, x + 50, 0);
    grd.addColorStop(0, 'rgba(255,211,165,0)');
    grd.addColorStop(0.5, 'rgba(255,211,165,0.20)');
    grd.addColorStop(1, 'rgba(255,211,165,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - 50, y0 - 40, 100, y1 - y0 + 40);
    ctx.strokeStyle = PAL.peach;
    ctx.globalAlpha = 0.5 + Math.sin(st.t * 3) * 0.15;
    ctx.beginPath();
    ctx.moveTo(x - 24, y0 - 40); ctx.lineTo(x - 24, y0);
    ctx.moveTo(x + 24, y0 - 40); ctx.lineTo(x + 24, y0);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = 'rgba(255,158,203,0.09)';
    ctx.fillRect(x - 30, y0, 60, y1 - y0);
    ctx.strokeStyle = PAL.rose;
    ctx.globalAlpha = 0.35 + Math.sin(st.t * 2) * 0.12;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const yy = y0 + 22 + i * 46;
      ctx.moveTo(x - 11, yy); ctx.lineTo(x, yy + 11); ctx.lineTo(x + 11, yy);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.font = f(9, 'bold');
    ctx.textAlign = 'center';
    ctx.fillStyle = PAL.rose;
    ctx.fillText('SEALED', x, y0 - 12);
    ctx.textAlign = 'left';
  }
}

function drawTowerHud(ctx, st, levers) {
  const top = 84, h = 400, x = 924;
  const base = T(98), crown = T(18);
  const frac = Math.max(0, Math.min(1, (base - st.p.y) / (base - crown)));

  // panel sits in the tower's outer-wall strip (x 846-940), clear of the seal levers at x 800-832
  ctx.fillStyle = 'rgba(12,6,24,0.86)';
  ctx.fillRect(846, top - 10, 94, h + 20);
  ctx.strokeStyle = PAL.purple;
  ctx.strokeRect(846.5, top - 9.5, 93, h + 19);
  ctx.fillStyle = PAL.bg2;
  ctx.fillRect(x - 2, top, 4, h);
  ctx.fillStyle = PAL.peach;
  ctx.fillRect(x - 2, top + h * (1 - frac), 4, h * frac);

  for (let i = 0; i < TFLOOR.length; i++) {
    const fy = top + h * ((base - T(TFLOOR[i])) / (base - crown));
    ctx.fillStyle = i === 0 || i === TFLOOR.length - 1 ? PAL.cream : PAL.laver;
    ctx.fillRect(x - 8, fy - 1, 16, 2);
  }

  ctx.font = f(8, 'bold');
  ctx.textAlign = 'center';
  ctx.fillStyle = PAL.laver;
  ctx.fillText('CROWN', x, top - 16);
  ctx.fillText('ROOT', x, top + h + 18);

  // four seals, lit as they are pulled
  ctx.textAlign = 'left';
  ctx.font = f(8, 'bold');
  ctx.fillStyle = PAL.laver;
  ctx.fillText('SEALS', 854, top + 8);
  levers.forEach((lv, i) => {
    const sy = top + 28 + i * 22;
    ctx.globalAlpha = lv.on ? 1 : 0.3;
    ctx.fillStyle = lv.on ? lv.col : PAL.purple;
    ctx.beginPath();
    ctx.moveTo(866, sy - 6); ctx.lineTo(872, sy); ctx.lineTo(866, sy + 6); ctx.lineTo(860, sy);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = f(7, 'bold');
    ctx.fillStyle = lv.on ? lv.col : PAL.purple;
    ctx.fillText(lv.name, 877, sy + 3);
  });
}
