// CRYO DRIFT - PROLOGUE: aboard the wrecked EXON-1.
// Wake in the cryo bay, talk to CYU, reboot the engine core, open the blast door.

import { PAL, FONT } from './palette.js';
import { Sfx } from './audio.js';
import { Dialogue } from './ui.js';
import { WorldGrid, TS } from './platform.js';
import { makePlatformLevel } from './scene.js';

function f(px, bold = '') { return `${bold} ${px}px ${FONT}`.trim(); }

export function prologueLevel(g) {
  const world = new WorldGrid(48, 18);
  // hull
  world.rect(0, 15, 48, 3);          // deck
  world.rect(0, 0, 48, 2);           // ceiling
  world.rect(0, 2, 1, 13);           // left wall
  world.rect(47, 2, 1, 13);          // right wall
  // bulkhead partitions with door gaps
  world.rect(17, 2, 2, 10);
  world.rect(33, 2, 2, 10);
  // machinery ledges
  world.rect(6, 14, 3, 1);
  world.rect(12, 14, 2, 1);
  world.rect(23, 14, 2, 1);
  // sealed blast door, set into a full bulkhead
  world.rect(44, 2, 1, 9);
  world.rect(44, 11, 1, 4);

  const s = makePlatformLevel(g, {
    title: 'PROLOGUE - THE WAKE',
    objective: 'Inspect the cryo pod, talk to CYU, reboot the core',
    brief: [
      'WASD / Arrows - walk   -   SPACE - jump   -   E - use / talk',
      'The EXON-1 is wrecked on Exxon, 142 million lightyears from Earth.',
      'You will not fix the ship from in here. Wake up, listen to CYU, and get the blast door open.',
    ],
    briefTopics: [
      { label: 'CYU: Where am I?', lines: [
        { who: 'CYU', text: 'Cryo bay B, deck two of the EXON-1. Which is a generous name for "this hallway" right now. The rest of the ship is open to the sky.' },
        { who: 'CYU', text: 'Through the port glass: planet Exxon. Purple skies, glowing ferns, extremely unfriendly wildlife. You are 142 million lightyears from home.' },
      ] },
      { label: 'CYU: What happened?', lines: [
        { who: 'CYU', text: 'I hit something. It was dark, my sensors lagged, and the hull objected. That is the whole story for now.' },
        { who: 'YOU', text: 'You were flying?', choices: [
          { label: 'That was you?', flag: 'blame' },
          { label: 'We can talk later.', flag: 'kind' },
        ] },
        { who: 'CYU', text: 'I will log your answer. And I will get us home. That part is a promise, not a computation.' },
      ] },
      { label: 'CYU: What do we need?', lines: [
        { who: 'CYU', text: 'Three things: reactor cells, fuel for the burn, hull plating. Three worlds hold them. I have already scanned the neighbourhood. It is worse than it sounds.' },
        { who: 'YOU', text: 'Of course it is.' },
      ] },
      { label: 'CYU: Who are you?', lines: [
        { who: 'CYU', text: 'Ship intelligence, contract 7-C. I keep one of us alive, and it is not me. My name is CYU. Yes, I chose it. No, you may not shorten it.' },
        { who: 'CYU', text: 'Nobody else was awake to object.' },
      ] },
    ],
    world,
    theme: {
      block: '#2a1a42', inner: '#1d1230', top: '#5d3a86', speck: '#3f2660',
      plat: '#3f2660', platTop: '#8657b8', spike: '#8657b8',
      crumble: '#3f2660', crack: '#5d3a86',
    },
    spawn: { x: 3 * TS + 16, y: 15 * TS },
    hearts: 3,
    bg: (ctx, st, cam) => drawShipBg(ctx, st, cam),
    drawBelow: (ctx, st, cam) => drawShipProps(ctx, st, cam),
    onOverlay: (ctx, st) => {
      if (!st.alarm) return;
      const a = 0.10 + Math.sin(st.t * 6) * 0.05;
      ctx.fillStyle = `rgba(255,113,150,${a})`;
      ctx.fillRect(0, 0, 960, 540);
    },
    onUpdate: (st, dt, once) => {
      if (!st.introDone && !Dialogue.active && st.t > 0.7) {
        st.introDone = true;
        g.dialogue([
          { who: 'YOU', text: 'Mmh... cold. Cold and bright. Why is everything purple?' },
          { who: 'CYU', text: 'Because you are awake, and the planet outside is doing its best to kill us. Good morning. Or evening. The sky does not change much here.' },
          { who: 'YOU', text: 'The ship. What did you do to the ship?' },
          { who: 'CYU', text: 'Brakes are a work in progress. Stand up, walk right, and check the cryo pod. Then come talk to me - properly.' },
        ]);
      }
      if (st.alarm && st.alarmT > 0) {
        st.alarmT -= dt;
        if (st.alarmT <= 0) { st.alarmT = 0; }
      }
      if (st.coreDone && !st.doorOpen) {
        st.doorOpen = true;
        st.world.clear(44, 11, 1, 4);
        st.objective = 'Reach the blast door at the far end';
        st.flash('BLAST DOOR UNSEALED');
      }
    },
  });

  // ---------------- interactables ----------------
  let podTouched = false;
  s.interactables.push({
    x: 7 * TS + 16, y: 14 * TS, r: 80, label: 'E - CHECK CRYO POD',
    use: (st) => {
      if (podTouched) { g.dialogue([{ who: 'CYU', text: 'Your pod is dead. No heat, no frost, no hum. We are not going back to sleep, captain.' }]); return; }
      podTouched = true;
      g.dialogue([
        { who: 'YOU', text: 'The glass is cracked. There is ice on the inside of it. How long was I in there?' },
        { who: 'CYU', text: 'Longer than the warranty. I kept the lights on. Most of them.' },
      ]);
    },
  });

  const cyuTalks = [
    { who: 'CYU', text: 'Ask me things later. Right now my processors are running on a damaged reactor and your questions are expensive.' },
    { who: 'CYU', text: 'Fun fact: Exxon has three moons, all of them purple, none of them friendly. Also I named them. Nobody stopped me.' },
    { who: 'CYU', text: 'If you find glowing ferns out there, stand in them. The watchers hate the light. And the watchers are why I want the door open.' },
  ];
  let cyuTalkIdx = 0;
  s.interactables.push({
    x: 12 * TS + 16, y: 14 * TS, r: 72, label: 'E - TALK TO CYU',
    use: (st) => {
      g.dialogue([cyuTalks[cyuTalkIdx % cyuTalks.length]]);
      cyuTalkIdx++;
    },
  });

  s.interactables.push({
    x: 23 * TS + 16, y: 14 * TS, r: 80, label: 'E - REBOOT THE CORE',
    use: (st) => {
      if (st.coreDone) { g.dialogue([{ who: 'CYU', text: 'The core is purring. Well. Growling. It is going to hold.' }]); return; }
      g.dialogue([
        { who: 'YOU', text: 'Core panel. This thing looks like it was chewed by something.' },
        { who: 'CYU', text: 'Reboot it. I will hold the surge. You will hear a lot of noise. Try not to stand in the sparks.' },
        { who: 'YOU', text: 'Doing it now.' },
        { who: 'CYU', text: '...There. Core is back. That alarm is not us, by the way. That alarm is the local wildlife taking an interest in the hull.' },
      ], () => {
        st.coreDone = true;
        st.alarm = true;
        st.flash('CORE ONLINE - GET TO THE DOOR');
        Sfx.good();
      });
    },
  });

  s.interactables.push({
    x: 43 * TS + 16, y: 13 * TS, r: 64, label: 'E - BLAST DOOR',
    use: (st) => {
      if (!st.coreDone) {
        g.dialogue([{ who: 'CYU', text: 'Sealed. The core is dead, so the door is a wall. Reboot the core first - console two rooms back.' }]);
        return;
      }
      st.flash('LEAVING THE EXON-1');
      st.done = true;
      g.save.addXP(20);
      Sfx.good();
      g.complete('prologue');
    },
  });

  return s;
}

// ---------------- ship background / props ----------------
function drawShipBg(ctx, s, cam) {
  ctx.fillStyle = '#120b22';
  ctx.fillRect(0, 0, 960, 540);
  // hull ribs
  for (let i = 0; i < 14; i++) {
    const x = i * 160 - (cam.x * 0.5) % 160;
    ctx.fillStyle = 'rgba(93,58,134,0.10)';
    ctx.fillRect(x, 0, 8, 540);
    ctx.fillStyle = 'rgba(63,38,96,0.18)';
    ctx.fillRect(x + 8, 0, 2, 540);
  }
  // conduit strips
  ctx.fillStyle = 'rgba(134,87,184,0.12)';
  ctx.fillRect(0, 96, 960, 5);
  ctx.fillRect(0, 420, 960, 5);
  // stars seen through hull breach at top
  for (let i = 0; i < 40; i++) {
    const x = (i * 197 - cam.x * 0.2) % 1000, y = (i * 83) % 70;
    ctx.fillStyle = i % 3 === 0 ? PAL.peach : PAL.laver;
    ctx.globalAlpha = 0.4 + (i % 4) * 0.12;
    ctx.fillRect(x < 0 ? x + 1000 : x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
  // hanging cables
  ctx.strokeStyle = 'rgba(134,87,184,0.35)';
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const x = i * 190 - cam.x + 60;
    ctx.moveTo(x, 64);
    ctx.quadraticCurveTo(x + 16, 100, x + 6, 128);
  }
  ctx.stroke();
}

function drawShipProps(ctx, s, cam) {
  const t = s.t;
  // portholes with Exxon outside
  drawPorthole(ctx, 4.5 * TS - cam.x, 6 * TS - cam.y, 64, t);
  drawPorthole(ctx, 28 * TS - cam.x, 5 * TS - cam.y, 56, t + 2);

  // cryo pod
  const px = 7 * TS + 16 - cam.x, py = 14 * TS - cam.y;
  ctx.fillStyle = PAL.bg2;
  ctx.fillRect(px - 26, py - 74, 52, 74);
  ctx.fillStyle = PAL.bg1;
  ctx.fillRect(px - 20, py - 68, 40, 62);
  ctx.fillStyle = 'rgba(255,211,165,0.16)';
  ctx.beginPath(); ctx.roundRect(px - 18, py - 66, 36, 58, 10); ctx.fill();
  ctx.strokeStyle = PAL.laver;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px - 18, py - 66, 36, 58, 10); ctx.stroke();
  ctx.lineWidth = 1;
  // frost
  ctx.fillStyle = 'rgba(180,144,214,0.5)';
  for (let i = 0; i < 5; i++) ctx.fillRect(px - 14 + i * 7, py - 60 + (i % 3) * 4, 3, 3);

  // Cyu terminal: hologram
  const tx = 12 * TS + 16 - cam.x, ty = 14 * TS - cam.y;
  ctx.fillStyle = PAL.bg2;
  ctx.fillRect(tx - 16, ty - 34, 32, 34);
  ctx.fillStyle = PAL.bg0;
  ctx.fillRect(tx - 12, ty - 30, 24, 20);
  ctx.fillStyle = PAL.hot;
  ctx.globalAlpha = 0.7 + Math.sin(t * 4) * 0.2;
  ctx.beginPath(); ctx.arc(tx, ty - 42, 11, 0, 7); ctx.fill();
  ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.arc(tx, ty - 42, 18, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  // eyes
  ctx.fillStyle = PAL.bg0;
  ctx.beginPath(); ctx.arc(tx - 3.5, ty - 43, 1.8, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(tx + 3.5, ty - 43, 1.8, 0, 7); ctx.fill();

  // core console
  const cx = 23 * TS + 16 - cam.x, cy = 14 * TS - cam.y;
  ctx.fillStyle = PAL.bg2;
  ctx.fillRect(cx - 20, cy - 40, 40, 40);
  ctx.fillStyle = s.coreDone ? '#3f2660' : PAL.ink;
  ctx.fillRect(cx - 15, cy - 35, 30, 22);
  const bl = s.coreDone ? 0.8 : (Math.sin(t * 8) > 0 ? 0.9 : 0.2);
  ctx.fillStyle = s.coreDone ? PAL.peach : PAL.rose;
  ctx.globalAlpha = bl;
  ctx.fillRect(cx - 10, cy - 31, 20, 4);
  ctx.globalAlpha = 1;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = s.coreDone ? PAL.laver : PAL.purple;
    ctx.fillRect(cx - 12 + i * 10, cy - 22, 6, 4);
  }
  // sparks when not rebooted
  if (!s.coreDone) {
    ctx.fillStyle = PAL.hot;
    for (let i = 0; i < 2; i++) {
      const a = t * 9 + i * 2;
      ctx.globalAlpha = 0.4 + Math.sin(a) * 0.4;
      ctx.fillRect(cx + Math.cos(a) * 22, cy - 34 + Math.sin(a * 1.4) * 10, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  // blast door: frame, hazard panel, wheel; open when the core is back
  const dx = 44 * TS - cam.x, dy = 11 * TS - cam.y, dh = 4 * TS;
  ctx.fillStyle = PAL.bg2;
  ctx.fillRect(dx - 13, dy - 14, 58, 14);          // lintel
  ctx.fillRect(dx - 13, dy - 14, 11, dh + 14);     // left jamb
  ctx.fillRect(dx + 34, dy - 14, 11, dh + 14);     // right jamb
  ctx.fillStyle = PAL.bg3;
  ctx.fillRect(dx - 2, dy - 14, 36, 6);
  if (!s.coreDone) {
    ctx.fillStyle = PAL.bg1;
    ctx.fillRect(dx, dy, 32, dh);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? PAL.hot : PAL.bg2;
      ctx.fillRect(dx, dy + 4 + i * 21, 32, 9);
    }
    ctx.strokeStyle = PAL.cream;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(dx + 16, dy + dh / 2, 11, 0, 7); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = PAL.rose;
    ctx.fillRect(dx + 14, dy + dh / 2 - 2, 4, 4);
  } else {
    ctx.fillStyle = 'rgba(255,211,165,0.18)';
    ctx.fillRect(dx - 4, dy, 40, dh);
    ctx.fillStyle = PAL.peach;
    ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.15;
    ctx.fillRect(dx + 15, dy, 3, dh);
    ctx.globalAlpha = 1;
    ctx.font = f(8, 'bold');
    ctx.textAlign = 'center';
    ctx.fillStyle = PAL.peach;
    ctx.fillText('OUT', dx + 16, dy - 2);
    ctx.textAlign = 'left';
  }
}

function drawPorthole(ctx, x, y, r, t) {
  // glass
  ctx.fillStyle = '#0b0618';
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  // planet Exxon
  ctx.fillStyle = PAL.pink;
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(x + 10, y + 14, r * 0.62, 0, 7); ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = PAL.rose;
  ctx.beginPath(); ctx.arc(x - 6, y - 10, r * 0.3, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
  // stars
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = PAL.cream;
    ctx.globalAlpha = 0.5 + Math.sin(t * 2 + i) * 0.2;
    ctx.fillRect(x - r + 8 + (i * 23) % (r * 2 - 16), y - r + 10 + (i * 17) % (r * 1.2), 2, 2);
  }
  ctx.globalAlpha = 1;
  // frame
  ctx.strokeStyle = PAL.purple;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  ctx.strokeStyle = PAL.bg3;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r - 5, 0, 7); ctx.stroke();
  ctx.lineWidth = 1;
}
