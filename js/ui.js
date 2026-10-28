// CRYO DRIFT - UI helpers: dialogue (branching), panels, bars, HUD.

import { PAL, FONT } from './palette.js';
import { Sfx } from './audio.js';

export function fontPx(px, bold = '') {
  return `${bold} ${px}px ${FONT}`.trim();
}

export function wrapText(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export function panel(ctx, x, y, w, h, fill = PAL.bg1, stroke = PAL.purple) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

export function bar(ctx, x, y, w, h, frac, colFill, colBack = PAL.bg0) {
  ctx.fillStyle = colBack;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = colFill;
  ctx.fillRect(x, y, Math.max(0, w * Math.min(1, frac)), h);
  ctx.strokeStyle = PAL.laver;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export function centerText(ctx, text, y, px, col) {
  ctx.font = fontPx(px, 'bold');
  ctx.fillStyle = col;
  ctx.textAlign = 'center';
  ctx.fillText(text, 480, y);
  ctx.textAlign = 'left';
}

// ---------------- Dialogue (branching) ----------------
export const Dialogue = {
  queue: [],
  active: false,
  choiceIdx: 0,
  onDone: null,

  open(lines, onDone = null) {
    this.queue = lines.slice();
    this.active = true;
    this.choiceIdx = 0;
    this.onDone = onDone;
  },

  advance(gameFlagChecker) {
    if (!this.active) return;
    const cur = this.queue[0];
    if (cur.choices) {
      // confirm selection
      const chosen = cur.choices[this.choiceIdx];
      Sfx.blip();
      if (chosen.flag) gameFlagChecker(chosen.flag);
      this.queue.shift();
      if (this.queue.length) this.choiceIdx = 0;
      else this._finish();
    } else {
      Sfx.blip();
      this.queue.shift();
      if (!this.queue.length) this._finish();
    }
  },

  choose(dir) {
    const cur = this.queue[0];
    if (!cur || !cur.choices) return;
    const n = cur.choices.length;
    this.choiceIdx = (this.choiceIdx + dir + n) % n;
    Sfx.blip();
  },

  _finish() {
    this.active = false;
    const cb = this.onDone;
    this.onDone = null;
    if (cb) cb();
  },

  draw(ctx) {
    if (!this.active) return;
    const cur = this.queue[0];
    const bx = 40, by = 372, bw = 880, bh = 148;
    panel(ctx, bx, by, bw, bh, PAL.ink, PAL.lampp);
    // name
    ctx.font = fontPx(15, 'bold');
    ctx.fillStyle = cur.who === 'CYU' ? PAL.hot : PAL.peach;
    ctx.fillText(cur.who || '...', bx + 16, by + 24);
    // body
    ctx.font = fontPx(17);
    ctx.fillStyle = PAL.cream;
    const lines = wrapText(ctx, cur.text, bw - 40);
    let ty = by + 52;
    for (const ln of lines.slice(0, 4)) { ctx.fillText(ln, bx + 20, ty); ty += 24; }
    if (cur.choices) {
      ty = by + bh - 30;
      ctx.font = fontPx(15);
      cur.choices.forEach((c, i) => {
        const sel = i === this.choiceIdx;
        ctx.fillStyle = sel ? PAL.hot : PAL.laver;
        const prefix = sel ? '> ' : '  ';
        const label = `[${i + 1}] ${c.label}`;
        const x = bx + 30 + i * 286;
        ctx.fillText(prefix + label, x, ty);
      });
    } else {
      ctx.font = fontPx(13);
      ctx.fillStyle = PAL.laver;
      ctx.fillText('SPACE - continue', bx + bw - 160, by + bh - 12);
    }
  },
};

// ---------------- HUD ----------------
export function drawHUD(ctx, g) {
  // top strip
  ctx.fillStyle = PAL.bg0;
  ctx.fillRect(0, 0, 960, 40);
  ctx.strokeStyle = PAL.bg2;
  ctx.beginPath(); ctx.moveTo(0, 40.5); ctx.lineTo(960, 40.5); ctx.stroke();

  ctx.font = fontPx(15, 'bold');
  ctx.fillStyle = PAL.hot;
  ctx.fillText(g.state.title || '', 12, 25);

  ctx.font = fontPx(13);
  ctx.fillStyle = PAL.laver;
  ctx.fillText(g.state.objective || '', 260, 25);

  // xp / level, right side
  const lvl = Save_level();
  ctx.font = fontPx(14, 'bold');
  ctx.fillStyle = PAL.peach;
  ctx.textAlign = 'right';
  ctx.fillText(`LV ${lvl}`, 950, 17);
  ctx.textAlign = 'left';
  const span = (g.save.d.xp - g.save.levelFloor()) / 60;
  bar(ctx, 806, 22, 144, 9, span, PAL.peach);
  ctx.font = fontPx(10);
  ctx.fillStyle = PAL.laver;
  ctx.textAlign = 'right';
  ctx.fillText(`XP ${g.save.d.xp}`, 800, 17);
  ctx.textAlign = 'left';
  // mute hint
  ctx.font = fontPx(10);
  ctx.fillStyle = PAL.purple;
  ctx.fillText('M: sound', 6, 552);
}

// late import to avoid cycle at module top
import { Save } from './save.js';
function Save_level() { return Save.level(); }
