// CRYO DRIFT - asteroid-belt transits between worlds (dodge, no weapons).

import { PAL, FONT } from './palette.js';
import { Sfx } from './audio.js';

export function transitLevel(g, which) {
  const T = which === 1
    ? { dur: 40, name: 'THE FIRST BELT', objective: 'Survive the belt: ' + 40 + 's', speed: 120 }
    : { dur: 50, name: 'THE CRYSTAL BELT', objective: 'Survive the belt: ' + 50 + 's', speed: 155 };

  const s = {
    title: T.name,
    objective: T.objective,
    hud: true,
    brief: [
      'Arrow keys / WASD - drift the ship up and down',
      'Collect pink star-motes for XP. Avoid the asteroids - the hull takes 3 hits.',
    ],
    briefTopics: [
      { label: 'CYU: Why are we flying through this?', lines: [
        { who: 'CYU', text: 'Because the short way is full of rocks and the long way is full of radiation. I picked the rocks. You are welcome.' },
        { who: 'CYU', text: 'Keep the nose level, captain. The EXON-1 handles like a cathedral with a grudge.' },
      ] },
      { label: 'CYU: What are the pink motes?', lines: [
        { who: 'CYU', text: 'Ionised starlight. Beautiful, harmless, and worth a little experience if you scoop them up. The belt is full of them.' },
        { who: 'YOU', text: 'Is scooping them safe?', choices: [
          { label: 'Define "safe".', flag: 'belt_a' },
          { label: 'I will take that as a yes.', flag: 'belt_b' },
        ] },
        { who: 'CYU', text: 'Safe is a spectrum. You are at the colourful end of it.' },
      ] },
      { label: 'CYU: How is the hull?', lines: [
        { who: 'CYU', text: 'Three impacts from a bad day. The plating we find in the tower is the last piece. Try not to spend those three hits on the same asteroid.' },
      ] },
    ],
    t: 0,
    px: 200, py: 270,
    vy: 0,
    hearts: g.save.hearts(),
    maxHearts: g.save.hearts(),
    inv: 0,         // invulnerability timer
    rocks: [],
    motes: [],
    spawn: 0,
    moteSpawn: 0,
    shake: 0,
    done: false,
  };

  s.update = (dt) => {
    s.t += dt;
    g.save.d.time += dt;
    if (s.inv > 0) s.inv -= dt;
    if (s.shake > 0) s.shake -= dt;

    // drift ship
    const k = g.keys;
    const acc = 480;
    if (k['ArrowUp'] || k['w']) s.vy -= acc * dt;
    if (k['ArrowDown'] || k['s']) s.vy += acc * dt;
    if (!k['ArrowUp'] && !k['ArrowDown'] && !k['w'] && !k['s']) s.vy *= Math.pow(0.02, dt);
    s.vy = Math.max(-280, Math.min(280, s.vy));
    s.py = Math.max(60, Math.min(520, s.py + s.vy * dt));

    // spawn rocks
    s.spawn -= dt;
    if (s.spawn <= 0) {
      s.spawn = 0.32 + Math.random() * 0.25;
      s.rocks.push({
        x: 990, y: 70 + Math.random() * 420,
        r: 16 + Math.random() * 30,
        vx: -(T.speed + Math.random() * 90 + s.t * 1.4),
        vy: (Math.random() - 0.5) * 46,
        rot: Math.random() * 7, vr: (Math.random() - 0.5) * 2,
        pts: 8 + Math.floor(Math.random() * 3),
      });
    }
    s.moteSpawn -= dt;
    if (s.moteSpawn <= 0) {
      s.moteSpawn = 1.1 + Math.random();
      s.motes.push({ x: 990, y: 80 + Math.random() * 380, vx: -T.speed * 0.9, ph: Math.random() * 7 });
    }

    for (const r of s.rocks) { r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt; }
    s.rocks = s.rocks.filter((r) => r.x > -80);
    for (const m of s.motes) { m.x += m.vx * dt; m.ph += dt * 5; }
    s.motes = s.motes.filter((m) => m.x > -40);

    // ship hitbox ~ 22x16
    const hx = s.px - 20, hy = s.py - 9, hw = 42, hh = 18;
    const hitRect = (cx, cy, cr) => cx + cr > hx && cx - cr < hx + hw && cy + cr > hy && cy - cr < hy + hh;

    s.motes = s.motes.filter((m) => {
      if (Math.abs(m.x - (s.px + 12)) < 26 && Math.abs(m.y - s.py) < 24) {
        s.addXP(5); Sfx.pick(); return false;
      }
      return true;
    });

    if (s.inv <= 0) {
      for (const r of s.rocks) {
        if (hitRect(r.x, r.y, r.r * 0.8)) {
          s.hearts--; s.inv = 1.6; s.shake = 0.4; Sfx.hurt();
          if (s.hearts <= 0) { s.restart(); }
          break;
        }
      }
    }

    if (s.t >= T.dur && !s.done) {
      s.done = true;
      s.addXP(30);
      Sfx.good();
      g.complete('transit' + which);
    }
  };

  s.addXP = (n) => g.save.addXP(n);
  s.restart = () => { g.save.d.deaths++; g.save.persist(); g.restartLevel(); };
  s.draw = (ctx) => {
    // starfield
    drawStars(ctx, s.t);
    ctx.save();
    if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);

    // motes
    for (const m of s.motes) {
      ctx.fillStyle = PAL.hot;
      ctx.globalAlpha = 0.65 + Math.sin(m.ph) * 0.3;
      ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // rocks: chunky purple polygons
    for (const r of s.rocks) {
      ctx.save();
      ctx.translate(r.x, r.y); ctx.rotate(r.rot);
      ctx.fillStyle = PAL.bg3;
      ctx.strokeStyle = PAL.purple;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < r.pts; i++) {
        const a = (i / r.pts) * Math.PI * 2;
        const rr = r.r * (0.75 + ((i * 37) % 10) / 28);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = PAL.bg2;
      ctx.beginPath(); ctx.arc(-r.r * 0.25, -r.r * 0.2, r.r * 0.3, 0, 7); ctx.fill();
      ctx.restore();
    }
    // ship: little drifting capsule, engine glow
    const blink = s.inv > 0 && Math.floor(s.inv * 10) % 2 === 0;
    if (!blink) {
      ctx.fillStyle = PAL.cream;
      ctx.beginPath();
      ctx.moveTo(s.px - 20, s.py - 9);
      ctx.lineTo(s.px + 12, s.py - 9);
      ctx.quadraticCurveTo(s.px + 30, s.py, s.px + 12, s.py + 9);
      ctx.lineTo(s.px - 20, s.py + 9);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = PAL.lampp;
      ctx.stroke();
      // window
      ctx.fillStyle = PAL.hot;
      ctx.beginPath(); ctx.arc(s.px + 4, s.py, 4, 0, 7); ctx.fill();
      // engine flame
      ctx.fillStyle = PAL.peach;
      const fl = 8 + Math.sin(s.t * 20) * 3;
      ctx.beginPath();
      ctx.moveTo(s.px - 20, s.py - 4); ctx.lineTo(s.px - 20 - fl, s.py); ctx.lineTo(s.px - 20, s.py + 4);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // progress bar of belt
    ctx.fillStyle = PAL.bg1; ctx.fillRect(330, 522, 300, 10);
    ctx.fillStyle = PAL.hot; ctx.fillRect(330, 522, 300 * Math.min(1, s.t / T.dur), 10);
    ctx.font = '12px ' + FONT;
    ctx.fillStyle = PAL.laver;
    ctx.fillText('BELT', 296, 531);
  };

  function drawStars(ctx, t) {
    ctx.fillStyle = PAL.bg0;
    ctx.fillRect(0, 0, 960, 540);
    for (let i = 0; i < 70; i++) {
      const x = (920 - ((t * (30 + (i % 5) * 22) + i * 137) % 1000));
      const y = (i * 149) % 540;
      ctx.fillStyle = i % 4 === 0 ? PAL.peach : (i % 4 === 1 ? PAL.laver : PAL.pink);
      ctx.globalAlpha = 0.25 + (i % 5) * 0.14;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
    // big pink planet
    ctx.fillStyle = PAL.pink;
    ctx.globalAlpha = 0.28;
    ctx.beginPath(); ctx.arc(130, 90, 56, 0, 7); ctx.fill();
    ctx.globalAlpha = 0.12;
    ctx.beginPath(); ctx.arc(130, 90, 72, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  return s;
}
