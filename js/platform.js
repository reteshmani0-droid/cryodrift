// CRYO DRIFT - platformer core: tile grid, player physics, moving platforms, camera.
// Gravity, coyote time, jump buffering, variable jump height, double jump.
// No combat anywhere.

export const TS = 32;
export const PHYS = {
  GRAV: 2050, MAXFALL: 920,
  RUN: 225, ACC_G: 2600, ACC_A: 1500,
  JUMP: 620, DJUMP: 545,
  COYOTE: 0.1, BUFFER: 0.13,
};

// tile types: 0 empty, 1 solid, 2 one-way ledge, 3 spikes, 4 crumbling
export class WorldGrid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.g = new Uint8Array(w * h);
  }
  set(x, y, t) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y * this.w + x] = t;
  }
  get(x, y) {
    if (x < 0 || x >= this.w) return 1; // outer walls
    if (y < 0) return 0;
    if (y >= this.h) return 0;
    return this.g[y * this.w + x];
  }
  rect(x, y, w, h, t = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, t);
  }
  plat(x, y, w, t = 1) { this.rect(x, y, w, 1, t); }
  clear(x, y, w, h) { this.rect(x, y, w, h, 0); }
}

export function makePlayer(x, y) {
  return {
    x, y, // feet-centre
    vx: 0, vy: 0, w: 20, h: 30,
    face: 1, onGround: false, coyote: 0, buffer: 0,
    doubleUsed: false, onMover: null, jumpHeld: false, animT: 0,
  };
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// Step the player against the tile grid. Returns hazards hit this frame.
export function updatePhysics(grid, p, keys, dt, opt = {}) {
  const ev = { spike: false, fell: false };
  const speed = (opt.speed ?? PHYS.RUN) * (opt.speedMul ?? 1);
  const left = keys['ArrowLeft'] || keys['a'];
  const right = keys['ArrowRight'] || keys['d'];
  const jump = keys[' '] || keys['w'] || keys['ArrowUp'];

  let dx = (right ? 1 : 0) - (left ? 1 : 0);
  if (dx) p.face = dx;
  const target = dx * speed;
  const acc = p.onGround ? PHYS.ACC_G : PHYS.ACC_A;
  if (target > p.vx) p.vx = Math.min(target, p.vx + acc * dt);
  else if (target < p.vx) p.vx = Math.max(target, p.vx - acc * dt);
  else p.vx *= Math.pow(0.0008, dt);

  // jump: buffer + coyote + double jump
  if (jump && !p.jumpHeld) { p.buffer = PHYS.BUFFER; p.jumpHeld = true; }
  if (!jump) p.jumpHeld = false;
  p.buffer = Math.max(0, p.buffer - dt);
  p.coyote = p.onGround ? PHYS.COYOTE : Math.max(0, p.coyote - dt);

  if (p.buffer > 0 && (p.coyote > 0 || (opt.doubleJump && !p.doubleUsed))) {
    if (p.coyote > 0) { p.vy = -PHYS.JUMP; opt.onJump && opt.onJump('jump'); }
    else { p.vy = -PHYS.DJUMP; p.doubleUsed = true; opt.onJump && opt.onJump('double'); }
    p.onGround = false; p.coyote = 0; p.buffer = 0;
  }
  if (!jump && p.vy < -300) p.vy = -300; // jump cut (a tap still clears two tiles)

  p.vy = Math.min(PHYS.MAXFALL, p.vy + (opt.grav ?? PHYS.GRAV) * dt);

  // ---------------- horizontal
  p.x += p.vx * dt;
  {
    const top = p.y - p.h + 2, bot = p.y - 2;
    const ty0 = Math.floor(top / TS), ty1 = Math.floor(bot / TS);
    if (p.vx > 0) {
      const tx = Math.floor((p.x + p.w / 2) / TS);
      for (let ty = ty0; ty <= ty1; ty++) {
        const t = grid.get(tx, ty);
        if (t === 1 || t === 4) { p.x = tx * TS - p.w / 2 - 0.01; p.vx = 0; break; }
      }
    } else if (p.vx < 0) {
      const tx = Math.floor((p.x - p.w / 2) / TS);
      for (let ty = ty0; ty <= ty1; ty++) {
        const t = grid.get(tx, ty);
        if (t === 1 || t === 4) { p.x = (tx + 1) * TS + p.w / 2 + 0.01; p.vx = 0; break; }
      }
    }
  }

  // ---------------- vertical
  const prevBottom = p.y;
  p.onGround = false;
  p.y += p.vy * dt;
  p.onMover = null;
  if (p.vy > 0) {
    const ty = Math.floor(p.y / TS);
    const tx0 = Math.floor((p.x - p.w / 2 + 3) / TS);
    const tx1 = Math.floor((p.x + p.w / 2 - 3) / TS);
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = grid.get(tx, ty);
      const onewayOk = t === 2 && prevBottom <= ty * TS + 3;
      if (t === 1 || t === 4 || onewayOk) {
        p.y = ty * TS; p.vy = 0; p.onGround = true; p.doubleUsed = false;
        if (t === 4 && opt.onCrumble) opt.onCrumble(tx, ty);
        break;
      }
    }
    // moving platforms (land on top)
    if (opt.movers) for (const m of opt.movers) {
      if (p.vy >= 0 && prevBottom <= m.y + 6 && p.y >= m.y &&
          p.x > m.x - 4 && p.x < m.x + m.w + 4 && p.y - p.h < m.y + m.h) {
        p.y = m.y; p.vy = 0; p.onGround = true; p.doubleUsed = false; p.onMover = m;
      }
    }
  } else if (p.vy < 0) {
    const ty = Math.floor((p.y - p.h) / TS);
    const tx0 = Math.floor((p.x - p.w / 2 + 3) / TS);
    const tx1 = Math.floor((p.x + p.w / 2 - 3) / TS);
    for (let tx = tx0; tx <= tx1; tx++) {
      if (grid.get(tx, ty) === 1) { p.y = (ty + 1) * TS + p.h; p.vy = 0; break; }
    }
  }

  // spikes + pits
  if (scanTiles(grid, p, 3)) ev.spike = true;
  if (p.y > grid.h * TS + 160) ev.fell = true;
  if (Math.abs(p.vx) > 10) p.animT += dt;
  return ev;
}

export function scanTiles(grid, p, type) {
  const x0 = Math.floor((p.x - p.w / 2 + 2) / TS), x1 = Math.floor((p.x + p.w / 2 - 2) / TS);
  const y0 = Math.floor((p.y - p.h + 2) / TS), y1 = Math.floor((p.y - 2) / TS);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (grid.get(x, y) === type) return { x, y };
  }
  return null;
}

// ---------------------------------------------------------------- movers
export function makeMover(x, y, w, h, o = {}) {
  return {
    x, y, x0: x, y0: y, w, h,
    dx: o.dx || 0, dy: o.dy || 0,
    speed: o.speed ?? 0.5, phase: o.phase || 0,
    mx: 0, my: 0,
  };
}
export function updateMovers(list, t) {
  for (const m of list) {
    const k = 0.5 - 0.5 * Math.cos((((t * m.speed) + m.phase) % 1) * Math.PI * 2);
    const nx = m.x0 + m.dx * k, ny = m.y0 + m.dy * k;
    m.mx = nx - m.x; m.my = ny - m.y;
    m.x = nx; m.y = ny;
  }
}

// ---------------------------------------------------------------- camera
export function updateCamera(cam, p, wTiles, hTiles, dt) {
  const tx = clamp(p.x - 480, 0, Math.max(0, wTiles * TS - 960));
  const ty = clamp(p.y - 340, 0, Math.max(0, hTiles * TS - 540));
  const k = Math.min(1, dt * 7);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
}
