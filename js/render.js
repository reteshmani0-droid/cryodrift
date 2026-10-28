// CRYO DRIFT - platformer rendering: tiles, the astronaut, pickups, checkpoints.

import { PAL, FONT } from './palette.js';
import { TS } from './platform.js';

function f(px, bold = '') { return `${bold} ${px}px ${FONT}`.trim(); }

export function drawTiles(ctx, grid, cam, theme) {
  const x0 = Math.max(0, Math.floor(cam.x / TS)), x1 = Math.min(grid.w - 1, Math.ceil((cam.x + 960) / TS));
  const y0 = Math.max(0, Math.floor(cam.y / TS)), y1 = Math.min(grid.h - 1, Math.ceil((cam.y + 540) / TS));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const t = grid.get(x, y);
      if (!t) continue;
      const sx = x * TS - cam.x, sy = y * TS - cam.y;
      if (t === 3) { // spikes
        ctx.fillStyle = theme.spike;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(sx + i * 11 + 1, sy + TS);
          ctx.lineTo(sx + i * 11 + 5.5, sy + 10);
          ctx.lineTo(sx + i * 11 + 10, sy + TS);
          ctx.closePath(); ctx.fill();
        }
        continue;
      }
      if (t === 2) { // one-way ledge
        ctx.fillStyle = theme.plat;
        ctx.fillRect(sx, sy + 6, TS, 9);
        ctx.fillStyle = theme.platTop;
        ctx.fillRect(sx, sy + 6, TS, 3);
        continue;
      }
      if (t === 4) { // crumbling
        ctx.fillStyle = theme.crumble;
        ctx.fillRect(sx + 1, sy + 1, TS - 2, TS - 2);
        ctx.strokeStyle = theme.crack;
        ctx.beginPath();
        ctx.moveTo(sx + 8, sy + 4); ctx.lineTo(sx + 14, sy + 16);
        ctx.lineTo(sx + 10, sy + 24); ctx.lineTo(sx + 17, sy + 29);
        ctx.stroke();
        continue;
      }
      // solid
      ctx.fillStyle = theme.block;
      ctx.fillRect(sx, sy, TS, TS);
      ctx.fillStyle = theme.inner;
      ctx.fillRect(sx + 3, sy + 3, TS - 6, TS - 6);
      if (!grid.get(x, y - 1)) {
        ctx.fillStyle = theme.top;
        ctx.fillRect(sx, sy, TS, 5);
      }
      // deterministic speckle
      if ((x * 31 + y * 17) % 7 === 0) {
        ctx.fillStyle = theme.speck;
        ctx.fillRect(sx + 9, sy + 12, 4, 4);
      }
    }
  }
}

export function drawMover(ctx, m, cam, theme) {
  const x = m.x - cam.x, y = m.y - cam.y;
  ctx.fillStyle = 'rgba(255,113,206,0.18)';
  ctx.fillRect(x - 3, y - 3, m.w + 6, m.h + 6);
  ctx.fillStyle = theme?.plat || '#3f2660';
  ctx.fillRect(x, y, m.w, m.h);
  ctx.fillStyle = PAL.laver;
  ctx.fillRect(x, y, m.w, 3);
  ctx.fillStyle = PAL.hot;
  ctx.fillRect(x + 4, y + m.h - 4, m.w - 8, 2);
}

export function drawSpring(ctx, sp, cam) {
  const x = sp.x - cam.x, y = sp.y - cam.y;
  ctx.strokeStyle = PAL.peach;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(x - 12, y - 2 - i * 4);
    ctx.lineTo(x + 12, y - 4 - i * 4);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = PAL.hot;
  ctx.fillRect(x - 14, y + 1, 28, 3);
}

export function drawCheckpoint(ctx, c, cam, t) {
  const x = c.x - cam.x, y = c.y - cam.y;
  ctx.strokeStyle = c.on ? PAL.peach : PAL.purple;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 46); ctx.stroke();
  ctx.lineWidth = 1;
  const fl = c.on ? 1 : 0.5 + Math.sin(t * 2) * 0.15;
  ctx.globalAlpha = fl;
  ctx.fillStyle = c.on ? PAL.hot : PAL.lav;
  ctx.beginPath();
  ctx.moveTo(x, y - 46); ctx.lineTo(x + 22, y - 40); ctx.lineTo(x, y - 32);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  if (c.on) {
    ctx.fillStyle = 'rgba(255,158,203,0.18)';
    ctx.beginPath(); ctx.arc(x, y - 45, 18, 0, 7); ctx.fill();
  }
}

export function drawGoal(ctx, g, cam, t) {
  const x = g.x - cam.x, y = g.y - cam.y;
  const on = g.active;
  const pulse = 0.5 + Math.sin(t * 4) * 0.25;
  ctx.fillStyle = on ? PAL.hot : PAL.bg3;
  ctx.globalAlpha = on ? 0.25 + pulse * 0.3 : 0.35;
  ctx.beginPath(); ctx.ellipse(x, y - 8, 30, 14, 0, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = on ? PAL.hot : PAL.purple;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y - 8, 22, 8, 0, 0, 7); ctx.stroke();
  if (on) {
    ctx.fillStyle = PAL.cream;
    ctx.font = f(11, 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(g.label || 'EXIT', x, y - 30);
    ctx.textAlign = 'left';
  }
}

export function drawItem(ctx, it, cam, t) {
  if (it.got) return;
  const x = it.x - cam.x, y = it.y - cam.y + Math.sin(t * 3 + it.x * 0.01) * 2;
  const pulse = 0.5 + Math.sin(t * 4 + it.x) * 0.25;
  ctx.save();
  if (it.kind === 'shard') {
    ctx.globalAlpha = 0.35 + pulse * 0.3;
    ctx.fillStyle = PAL.peach;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(x, y); ctx.rotate(t * 2 + it.x);
    ctx.fillStyle = PAL.peach;
    ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(6, 0); ctx.lineTo(-6, 8); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill();
  } else if (it.kind === 'cell') {
    ctx.globalAlpha = 0.3 + pulse * 0.3;
    ctx.fillStyle = PAL.cream;
    ctx.beginPath(); ctx.arc(x, y, 15, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(x - 5, y - 8, 10, 16);
    ctx.fillStyle = PAL.hot;
    ctx.fillRect(x - 3, y - 5, 6, 10);
  } else if (it.kind === 'oil') {
    ctx.fillStyle = PAL.hot;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
    ctx.fillStyle = PAL.rose;
    ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 2, 0, 7); ctx.fill();
  } else if (it.kind === 'soul') {
    ctx.globalAlpha = 0.25 + pulse * 0.35;
    ctx.fillStyle = PAL.rose;
    ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAL.rose;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
    ctx.fillStyle = PAL.cream;
    ctx.beginPath(); ctx.arc(x - 2, y - 2, 3, 0, 7); ctx.fill();
  } else if (it.kind === 'fuel') {
    ctx.fillStyle = PAL.peach;
    ctx.fillRect(x - 7, y - 9, 14, 18);
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(x - 7, y - 3, 14, 6);
    ctx.fillStyle = PAL.bg0;
    ctx.fillRect(x - 2, y - 12, 4, 3);
  } else if (it.kind === 'plating') {
    ctx.fillStyle = PAL.peach;
    ctx.fillRect(x - 10, y - 12, 20, 24);
    ctx.strokeStyle = PAL.laver;
    ctx.strokeRect(x - 9.5, y - 11.5, 19, 23);
    ctx.fillStyle = PAL.bg2;
    for (let i = 0; i < 3; i++) ctx.fillRect(x - 6, y - 6 + i * 6, 12, 2);
  }
  ctx.restore();
}

export function drawPlayer(ctx, p, cam, t, inv) {
  const x = p.x - cam.x, y = p.y - cam.y;
  if (inv > 0 && Math.floor(inv * 14) % 2 === 0) return;
  const run = p.onGround && Math.abs(p.vx) > 20 ? Math.sin(p.animT * 14) : 0;
  const bob = p.onGround ? Math.abs(run) * 1.5 : 0;
  // shadow
  ctx.fillStyle = 'rgba(15,8,32,0.45)';
  ctx.beginPath(); ctx.ellipse(x, y + 1, 12, 4, 0, 0, 7); ctx.fill();
  // legs
  ctx.strokeStyle = PAL.laver;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 12); ctx.lineTo(x - 4 - run * 4, y - 1);
  ctx.moveTo(x + 4, y - 12); ctx.lineTo(x + 4 + run * 4, y - 1);
  ctx.stroke();
  ctx.lineWidth = 1;
  // body
  ctx.fillStyle = PAL.cream;
  ctx.beginPath(); ctx.roundRect(x - 9, y - 26 - bob, 18, 16, 5); ctx.fill();
  // backpack
  ctx.fillStyle = PAL.pink;
  ctx.fillRect(x - (p.face > 0 ? 15 : -11), y - 25 - bob, 5, 12);
  // helmet
  ctx.fillStyle = PAL.cream;
  ctx.beginPath(); ctx.arc(x, y - 33 - bob, 9, 0, 7); ctx.fill();
  ctx.fillStyle = PAL.bg2;
  ctx.beginPath(); ctx.arc(x + p.face * 2, y - 33 - bob, 5.5, 0, 7); ctx.fill();
  ctx.fillStyle = PAL.hot;
  ctx.beginPath(); ctx.arc(x + p.face * 4, y - 35 - bob, 1.8, 0, 7); ctx.fill();
  // double-jump thruster flame
  if (!p.onGround && p.doubleUsed && p.vy < 120) {
    ctx.fillStyle = PAL.peach;
    const fl = 8 + Math.sin(t * 30) * 3;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 10); ctx.lineTo(x, y - 10 + fl); ctx.lineTo(x + 4, y - 10);
    ctx.closePath(); ctx.fill();
  }
}

export function drawPrompt(ctx, text, p, cam) {
  if (!text) return;
  const x = clampNum(p.x - cam.x, 120, 840), y = p.y - cam.y - 62;
  ctx.font = f(12, 'bold');
  const w = ctx.measureText(text).width + 18;
  ctx.fillStyle = 'rgba(15,8,32,0.85)';
  ctx.strokeStyle = PAL.purple;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - 15, w, 22, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAL.peach;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

export function drawMsg(ctx, text, t) {
  if (!text || t <= 0) return;
  ctx.globalAlpha = Math.min(1, t * 2);
  ctx.font = f(16, 'bold');
  const w = ctx.measureText(text).width + 32;
  ctx.fillStyle = 'rgba(15,8,32,0.88)';
  ctx.strokeStyle = PAL.lampp;
  ctx.beginPath(); ctx.roundRect(480 - w / 2, 84, w, 30, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PAL.cream;
  ctx.textAlign = 'center';
  ctx.fillText(text, 480, 104);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}

function clampNum(v, a, b) { return Math.max(a, Math.min(b, v)); }
