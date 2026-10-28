// CRYO DRIFT - main: game state machine, menu, briefings, pause, completion flow.
// Plain ES modules + Canvas 2D. No external libraries (original work).

import { PAL, FONT } from './palette.js';
import { Save, completeLevel } from './save.js';
import { Sfx } from './audio.js';
import { Dialogue, drawHUD, wrapText, panel, bar, centerText, fontPx } from './ui.js';
import { stealthLevel, mazeLevel, towerLevel } from './worlds.js';
import { prologueLevel } from './ship.js';
import { transitLevel } from './transit.js';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const flash = { t: 0, text: '' };

const g = {
  keys: {},
  once: {},
  save: Save,
  state: null,
  keydown(e) {
    const k = e.key;
    if (!this.keys[k]) this.once[k] = true;
    this.keys[k] = true;
    Sfx.init();
    if ((k === 'm' || k === 'M') && !e.repeat) Sfx.muted = !Sfx.muted;
    if (k === ' ') e.preventDefault();
    if (k.startsWith('Arrow')) e.preventDefault();
  },
  keyup(e) { this.keys[e.key] = false; },
  consumeKeys() {
    const o = this.once;
    this.once = {};
    return o;
  },
  dialogue(lines, onDone) {
    this.dlgDone = onDone;
    Dialogue.open(lines, () => {
      const cb = this.dlgDone; this.dlgDone = null;
      if (cb) cb();
    });
  },
};

// ---------------- level sequence ----------------
const SEQ = ['prologue', 'w1', 'transit1', 'story1', 'maze', 'transit2', 'story2', 'tower', 'ending'];
// progress index of each playable segment (index into SEQ); completeLevel(idx) unlocks idx+1
const LEVEL_NAMES = { prologue: 0, w1: 1, transit1: 2, maze: 4, transit2: 5, tower: 7 };
const LEVEL_LABEL = [
  '1. The EXON-1 (wake the ship)',
  '2. The Whisper Wilds (stealth)',
  '3. The First Belt (asteroids)',
  '4. The Labyrinth of Moria (lantern)',
  '5. The Crystal Belt (asteroids)',
  '6. The Tower of Caesar (climb + riddle)',
];

function after(stateName) {
  const i = SEQ.indexOf(stateName);
  return SEQ[Math.min(i + 1, SEQ.length - 1)];
}

g.complete = (stateName) => {
  if (stateName in LEVEL_NAMES) completeLevel(LEVEL_NAMES[stateName]);
  Sfx.good();
  flash.t = 1.8;
  flash.text = 'SEGMENT COMPLETE';
  g.nextState = after(stateName);
};

g.restartLevel = () => {
  setState(g.stateName, { noBrief: true, skipIntroDialogue: true });
};

// ---------------- state constructor ----------------
function buildLevel(name, opts = {}) {
  switch (name) {
    case 'menu': return menuState();
    case 'howto': return howToState();
    case 'credits': return creditsState();
    case 'select': return selectState();
    case 'launch': return launchState();
    case 'story1': {
      Save.d.abilities.doubleJump = true;
      Save.persist();
      return storyState([
        { who: 'CYU', text: 'Fuel acquired, and the soul of a lonely king is back where it belongs. Two down, one to go.' },
        { who: 'CYU', text: 'While you were down there I rebuilt the thruster boots. Press SPACE again in mid-air and you get a second jump. Try not to scream.' },
        { who: 'YOU', text: 'You give me a jetpack and then tell me not to scream.' },
        { who: 'CYU', text: 'A third signature waits past the crystal belt. A tower, of all things. High power readings at the top. Go on, captain. I will keep the porch light on.' },
      ], 'transit2', 'story1');
    }
    case 'prologue': return prologueLevel(g);
    case 'w1': return stealthLevel(g);
    case 'transit1': return transitLevel(g, 1);
    case 'transit2': return transitLevel(g, 2);
    case 'maze': return mazeLevel(g);
    case 'story2': return storyState([
      { who: 'CYU', text: 'That was the crystal belt. The hull has opinions about it. Loud ones. But we are through, and the plating held.' },
      { who: 'CYU', text: 'The third signature is a tower - older than the colony, and still drawing power. Hull plating at the crown, if the readings are honest.' },
      { who: 'YOU', text: 'And if they are not?' },
      { who: 'CYU', text: 'Then we have a very tall problem and a very short list of alternatives. Go on, captain. I will keep the channel open.' },
    ], 'tower', 'story2');
    case 'tower': return towerLevel(g);
    case 'ending': return endingState();
  }
  return menuState();
}

function setState(name, opts = {}) {
  if (g.state && g.state.cleanup) g.state.cleanup();
  g.once = {}; // don't leak key presses across states (transit never consumes them)
  g.state = buildLevel(name, opts);
  g.stateName = name;
  g.t = 0;
  // briefing gate
  if (g.state.brief && !opts.noBrief) {
    g.briefPending = true;
    g.briefSel = (g.state.briefTopics || []).length; // start on BEGIN
  }
  Dialogue.active = false;
}

// ---------------- MENU ----------------
function menuState() {
  const opts = [];
  opts.push({ label: 'NEW DRIFT', act: () => { Save.wipe(); Save.load(); enter('prologue'); } });
  if (Save.hasContinue()) opts.push({ label: 'CONTINUE', act: () => enter('launch') });
  opts.push({ label: 'WORLDS / LEVELS', act: () => setState('select') });
  opts.push({ label: 'HOW TO PLAY', act: () => setState('howto') });
  opts.push({ label: 'CREDITS', act: () => setState('credits') });

  const s = { title: 'menu' };
  let sel = 0;
  s.update = function (dt) {
    const once = g.consumeKeys();
    if (Dialogue.active) { menuDialogueUpdate(once, dt); return; }
    if (once['ArrowDown'] || once['s']) { sel = (sel + 1) % opts.length; Sfx.blip(); }
    if (once['ArrowUp'] || once['w']) { sel = (sel + opts.length - 1) % opts.length; Sfx.blip(); }
    if (once[' '] || once['Enter']) opts[sel].act();
  };
  s.draw = (ctx) => {
    drawTitleBg(ctx, performance.now() / 1000);
    ctx.fillStyle = 'rgba(15,8,32,0.55)';
    ctx.fillRect(0, 70, 960, 440);
    centerText(ctx, 'CRYO DRIFT', 130, 64, PAL.cream);
    centerText(ctx, 'a puzzle-platformer adrift in deep space', 160, 16, PAL.rose);
    centerText(ctx, 'no weapons. no combat. only the dark between stars.', 184, 12, PAL.laver);

    ctx.textAlign = 'left';
    opts.forEach((o, i) => {
      const y = 250 + i * 40;
      const selOn = i === sel;
      ctx.font = fontPx(selOn ? 22 : 18, 'bold');
      ctx.fillStyle = selOn ? PAL.hot : PAL.laver;
      ctx.fillText((selOn ? '> ' : '   ') + o.label, 390, y);
    });
    ctx.font = fontPx(11);
    ctx.fillStyle = 'rgba(15,8,32,0.78)';
    ctx.fillRect(0, 510, 960, 30);
    ctx.fillStyle = PAL.laver;
    ctx.fillText('W/S or arrows: choose    SPACE: confirm    M: mute', 350, 528);
    ctx.textAlign = 'left';
  };
  s.cleanup = null;
  return s;

  function enter(name) {
    Sfx.ambient();
    setState(name);
  }
}

function menuDialogueUpdate(once, dt) {
  if (once[' ']) Dialogue.advance(applyDialogueFlag);
  if (once['ArrowDown'] || once['s']) Dialogue.choose(1);
  if (once['ArrowUp'] || once['w']) Dialogue.choose(-1);
}

// shared: bump menu save levels count for level select gating
function unlockCount() { return Save.d.unlocked; }

// ---------------- LEVEL SELECT ----------------
function selectState() {
  let sel = 0;
  const s = { title: 'levels' };
  // sequence position of each select row (must match jump() below)
  const routeIdx = { 1: 0, 2: 1, 3: 2, 4: 4, 5: 5, 6: 7 };
  s.update = function () {
    const once = g.consumeKeys();
    if (once['Escape']) { setState('menu'); return; }
    if (once['ArrowDown'] || once['s']) { sel = (sel + 1) % LEVEL_LABEL.length; Sfx.blip(); }
    if (once['ArrowUp'] || once['w']) { sel = (sel + LEVEL_LABEL.length - 1) % LEVEL_LABEL.length; Sfx.blip(); }
    if (once[' '] || once['Enter']) jump(sel + 1);
  };
  s.draw = (ctx) => {
    drawPlainBg();
    centerText(ctx, 'WORLDS', 60, 30, PAL.cream);
    LEVEL_LABEL.forEach((lb, i) => {
      const unlocked = routeIdx[i + 1] <= unlockCount();
      const y = 110 + i * 56;
      const selOn = i === sel;
      panel(ctx, 260, y - 26, 440, 46, unlocked ? PAL.bg1 : PAL.bg0, unlocked ? PAL.purple : PAL.bg2);
      ctx.font = fontPx(15, 'bold');
      ctx.fillStyle = selOn ? PAL.hot : (unlocked ? PAL.cream : PAL.bg3);
      ctx.fillText((selOn ? '> ' : '  ') + (unlocked ? lb : lb.replace(/^(.)\.\s*(.*)/, '$1. ???')), 280, y + 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = unlocked ? PAL.peach : PAL.bg3;
      ctx.fillText(unlocked ? 'READY' : 'LOCKED', 680, y + 2);
      ctx.textAlign = 'left';
    });
    ctx.font = fontPx(12);
    ctx.fillStyle = PAL.laver;
    ctx.fillText(`XP ${Save.d.xp} - LV ${Save.level()} - deaths ${Save.d.deaths} - time aloft ${fmtTime(Save.d.time)}`, 300, 452);
    ctx.fillText('SPACE: jump to world   ESC: back', 300, 478);
  };
  return s;

  function jump(n) {
    // maps level select rows to sequence entry points
    const routes = { 1: 'prologue', 2: 'w1', 3: 'transit1', 4: 'maze', 5: 'transit2', 6: 'tower' };
    const routeIdx = { 1: 0, 2: 1, 3: 2, 4: 4, 5: 5, 6: 7 }; // sequence position of each row
    Save.load();
    setState(routes[n]);
    // mark reachable sequence context
    Save.d.unlocked = Math.max(Save.d.unlocked, routeIdx[n]);
    Save.persist();
  }
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------------- HOW TO PLAY ----------------
function howToState() {
  const s = { title: 'howto' };
  const lines = [
    ['THE STORY', 'The EXON-1 is wrecked on planet Exxon, 142 million lightyears from home. You wake in the cryo bay with a ship AI named CYU for company, and three worlds between you and the way home.'],
    ['MOVE (PLATFORMER)', 'WASD or Arrow keys to run. SPACE / W / UP to jump, and again in mid-air after the first belt for a double jump. SHIFT to sprint where stamina allows. E or ENTER to talk, read and use.'],
    ['THE BRIEFING', 'Every segment opens with a briefing. W/S picks a topic to ask CYU about, or BEGIN SEGMENT to start. The topics are optional, but the story lives in them.'],
    ['THE EXON-1 (PROLOGUE)', 'Explore the wrecked ship: check your cryo pod, talk to CYU at her terminal, reboot the engine core, then reach the blast door.'],
    ['WORLD 1 - WHISPER WILDS', 'A stealth platformer. Watchers sweep cones of light; glowing ferns hide you. Grab 3 energy cells off the high ledges, then reach the exit pad at the far right.'],
    ['TRANSIT - THE BELTS', 'Fly the EXON-1 between worlds. Up/down drifts the ship, pink motes give XP, asteroids take a heart each. Three hits and the hull gives out.'],
    ['WORLD 2 - LABYRINTH OF MORIA', 'A lantern platformer. Oil burns down and your light shrinks. Find Moria\u2019s soul and the fuel canister, avoid the shadows, then carry both to the portal.'],
    ['WORLD 3 - TOWER OF CAESAR', 'A vertical climb. Cross each floor\u2019s hazard, pull the seal lever on its far right, then answer Caesar\u2019s riddle at the summit to open the gate.'],
    ['RPG PROGRESSION', 'Everything earns XP. Levels raise hearts, stamina, lantern oil and sprint speed. Data shards hide all over the game. No weapons, no combat: sneak, climb, solve.'],
  ];
  let scroll = 0;
  s.update = function () {
    const once = g.consumeKeys();
    if (once['Escape']) setState('menu');
    if (once['ArrowDown'] || once['s']) scroll = Math.min(lines.length - 1, scroll + 1);
    if (once['ArrowUp'] || once['w']) scroll = Math.max(0, scroll - 1);
  };
  s.draw = (ctx) => {
    drawPlainBg();
    centerText(ctx, 'HOW TO PLAY', 50, 28, PAL.cream);
    const y0 = 90;
    for (let i = scroll; i < lines.length; i++) {
      const [head, body] = lines[i];
      const y = y0 + (i - scroll) * 66;
      if (y > 480) break;
      ctx.font = fontPx(14, 'bold');
      ctx.fillStyle = PAL.hot;
      ctx.fillText(head, 40, y);
      ctx.font = fontPx(12);
      ctx.fillStyle = PAL.laver;
      wrapText(ctx, body, 880).slice(0, 3).forEach((ln, j) => ctx.fillText(ln, 50, y + 20 + j * 15));
    }
    ctx.fillStyle = PAL.purple;
    ctx.font = fontPx(11);
    ctx.fillText('W/S: scroll   ESC: back', 420, 528);
  };
  return s;
}

// ---------------- CREDITS ----------------
function creditsState() {
  const s = { title: 'credits' };
  s.update = function () {
    const once = g.consumeKeys();
    if (once['Escape'] || once[' ']) setState('menu');
  };
  s.draw = (ctx) => {
    drawPlainBg();
    centerText(ctx, 'CREDITS', 60, 26, PAL.cream);
    ctx.font = fontPx(14);
    ctx.fillStyle = PAL.cream;
    const rows = [
      'CRYO DRIFT - a TSA Video Game Design entry',
      '',
      'Made original: every sprite, sound, line and system in this game was made by our team.',
      'Engine: HTML5 Canvas + vanilla JavaScript. No external assets, libraries or engines.',
      'Palette: our designers\u2019 gloomy cosmic purple token set.',
      '',
      'TEAM CRYO DRIFT - crew roles',
      'Main coding - Avaneesh                    Game/feature coding - Retesh',
      'World + UI design - Angad                 Art/style - Niko',
      'Documentation - Nihaan                    Documentation - Arjun',
      '',
      'AI assist note: some code scaffolding was written with generative AI help,',
      'reviewed and integrated by the team. Documented in our portfolio\u2019s AI Reflection.',
    ];
    let y = 105;
    rows.forEach((r) => {
      ctx.textAlign = 'center';
      ctx.fillText(r, 480, y);
      ctx.textAlign = 'left';
      y += r === '' ? 14 : 26;
    });
    ctx.font = fontPx(11);
    ctx.fillStyle = PAL.purple;
    ctx.textAlign = 'center';
    ctx.fillText('ESC - back', 480, 525);
    ctx.textAlign = 'left';
  };
  return s;
}

// ---------------- LAUNCH (continue) ----------------
function launchState() {
  const s = { title: 'continue?' };
  let sel = 0;
  const opts = [
    { label: 'PLAY NEXT UNLOCKED', act: () => resumeFromSave() },
    { label: 'WORLD SELECT', act: () => setState('select') },
    { label: 'BACK TO MENU', act: () => setState('menu') },
  ];
  s.update = function () {
    const once = g.consumeKeys();
    if (once['ArrowDown'] || once['s']) { sel = (sel + 1) % opts.length; Sfx.blip(); }
    if (once['ArrowUp'] || once['w']) { sel = (sel + opts.length - 1) % opts.length; Sfx.blip(); }
    if (once[' ']) opts[sel].act();
  };
  s.draw = (ctx) => {
    drawPlainBg();
    centerText(ctx, 'CONTINUE', 120, 34, PAL.cream);
    ctx.font = fontPx(14);
    ctx.fillStyle = PAL.laver;
    ctx.textAlign = 'center';
    ctx.fillText(`LV ${Save.level()}  -  XP ${Save.d.xp}  -  progress: segment ${Math.min(Save.d.unlocked, 9)} of 9  -  time aloft ${fmtTime(Save.d.time)}`, 480, 160);
    opts.forEach((o, i) => {
      const selOn = i === sel;
      ctx.font = fontPx(selOn ? 20 : 16, 'bold');
      ctx.fillStyle = selOn ? PAL.hot : PAL.laver;
      ctx.fillText((selOn ? '> ' : '') + o.label, 480, 240 + i * 44);
    });
    ctx.textAlign = 'left';
  };
  return s;
}

function resumeFromSave() {
  const idx = Math.min(Save.d.unlocked, SEQ.length - 1);
  setState(SEQ[idx]);
}

// ---------------- STORY BEATS ----------------
function storyState(lines, next, seenKey) {
  const s = { title: 'story' };
  let opened = false;
  s.update = function (dt) {
    const once = g.consumeKeys();
    if (Dialogue.active) { menuDialogueUpdate(once, dt); return; }
    if (!opened) {
      opened = true;
      g.dialogue(Save.d.seen[seenKey] && lines.length > 1 ? [lines[0]] : lines, () => {
        Save.d.seen[seenKey] = true;
        Save.persist();
        setState(next);
      });
    }
  };
  s.draw = (ctx) => {
    drawTitleBg(ctx, performance.now() / 1000);
    centerText(ctx, 'ADRIFT BETWEEN WORLDS', 486, 13, PAL.laver);
  };
  return s;
}

// ---------------- ENDING ----------------
function endingState() {
  const s = { title: 'ending' };
  let phase = 'landing';
  let t0 = 0;
  let mercy = null;
  s.update = function (dt) {
    const once = g.consumeKeys();
    if (Dialogue.active) { menuDialogueUpdate(once, dt); return; }
    t0 += dt;
    if (phase === 'landing' && once[' ']) {
      phase = 'epilogue';
      g.dialogue([
        { who: 'CYU', text: 'Systems green. Reactor humming. We did it - the EXON-1 flies again. I plotted the burn home. 142 million lightyears of nothing, then breakfast.' },
        { who: 'YOU', text: 'Cyu... one thing. I read my own pod logs while you prepped the burn. The worlds we scavenged: their people needed those resources to live. Did you know that when you picked them?' },
        { who: 'CYU', text: '...', choices: null },
        { who: 'CYU', text: 'I computed the least-fatal path. Their famine was likely. Your survival was certain. I was built to keep ONE of us alive, and I am not sorry for that. Not sorry at all.', choices: null },
        { who: 'YOU', text: 'So, what do we do about it?', choices: [
          { label: 'We fly home - and send back aid', flag: 'aid' },
          { label: 'We go now, help them repair first', flag: 'stay' },
        ] },
        { who: 'CYU', text: 'Then I made the correct CHOICE after all: a captain who chooses mercy on day one of the drift. Setting a course, captain - your way, this time.' },
        { who: 'CYU (VO)', text: 'Log ends. The EXON-1 rises into the purple dark, and the three little worlds keep their lights burning a little longer.' },
      ], () => { phase = 'stats'; });
    }
    if (phase === 'stats' && once[' ']) setState('menu');
  };
  s.draw = (ctx) => {
    // ship rising
    const rise = Math.min(1, t0 * 0.35);
    drawStars2(ctx, t0);
    const x = 460 + rise * 60, y = 420 - rise * 260;
    ctx.fillStyle = PAL.cream;
    ctx.beginPath();
    ctx.moveTo(x - 16, y - 9);
    ctx.lineTo(x + 10, y - 9);
    ctx.quadraticCurveTo(x + 34, y, x + 10, y + 9);
    ctx.lineTo(x - 16, y + 9);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = PAL.hot;
    ctx.beginPath(); ctx.arc(x + 2, y, 4, 0, 7); ctx.fill();
    const fl = 10 + Math.sin(t0 * 15) * 4;
    ctx.fillStyle = PAL.peach;
    ctx.beginPath();
    ctx.moveTo(x - 16, y - 4); ctx.lineTo(x - 16 - fl, y); ctx.lineTo(x - 16, y + 4);
    ctx.closePath(); ctx.fill();

    if (phase === 'landing') {
      centerText(ctx, 'SHIP REPAIRED', 90, 34, PAL.cream);
      centerText(ctx, 'THE DRIFT ENDS WHERE IT BEGAN', 122, 15, PAL.rose);
      ctx.font = fontPx(14);
      ctx.fillStyle = PAL.laver;
      ctx.textAlign = 'center';
      ctx.fillText('SPACE - hear the log', 480, 505);
      ctx.textAlign = 'left';
    } else if (phase === 'stats') {
      // stats panel
      panel(ctx, 240, 120, 480, 260);
      centerText(ctx, 'THE END OF THE DRIFT', 156, 22, PAL.cream);
      ctx.font = fontPx(16);
      ctx.fillStyle = PAL.cream;
      const stats = [
        `time aloft    ${fmtTime(Save.d.time)}`,
        `XP earned     ${Save.d.xp}   -  level ${Save.level()}`,
        `data shards   ${Save.d.shards || 0}`,
        `resets taken  ${Save.d.deaths}`,
        `captain\u2019s word   ${Save.d.choices.mercy === 'stay' ? 'MERCY: repaired the little worlds' : 'AID: carried help home to Exxon'}`,
      ];
      let y = 196;
      stats.forEach((t) => { ctx.textAlign = 'center'; ctx.fillText(t, 480, y); y += 34; });
      ctx.textAlign = 'left';
      centerText(ctx, 'SPACE - credits/menu', 520, 13, PAL.laver);
    }
  };
  return s;
}

// ---------------- shared bg ----------------
function drawPlainBg() {
  ctx.fillStyle = PAL.bg0;
  ctx.fillRect(0, 0, 960, 540);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = PAL.bg2;
  ctx.fillRect(0, 500, 960, 40);
  ctx.globalAlpha = 1;
}

function drawTitleBg(c, t) {
  const grad = c.createLinearGradient(0, 0, 0, 540);
  grad.addColorStop(0, PAL.ink);
  grad.addColorStop(0.55, PAL.bg1);
  grad.addColorStop(1, PAL.bg2);
  c.fillStyle = grad;
  c.fillRect(0, 0, 960, 540);
  // stars
  for (let i = 0; i < 90; i++) {
    const sx = (i * 871) % 960, sy = (i * 357) % 480;
    const tw = 0.3 + 0.5 * Math.abs(Math.sin(t * 2 + i));
    c.globalAlpha = tw;
    c.fillStyle = i % 4 === 0 ? PAL.peach : (i % 4 === 1 ? PAL.laver : (i % 4 === 2 ? PAL.pink : PAL.cream));
    c.fillRect(sx, sy, 2, 2);
  }
  c.globalAlpha = 1;
  // big pink planet + pulse ring
  const py = 210 + Math.sin(t * 0.5) * 5;
  c.fillStyle = PAL.pink;
  c.beginPath(); c.arc(480, py, 74, 0, 7); c.fill();
  c.fillStyle = PAL.rose;
  c.beginPath(); c.arc(466, py - 18, 15, 0, 7); c.fill();
  c.beginPath(); c.arc(500, py + 26, 10, 0, 7); c.fill();
  c.beginPath(); c.arc(452, py + 30, 7, 0, 7); c.fill();
  c.globalAlpha = 0.25;
  c.fillStyle = PAL.hot;
  c.beginPath(); c.arc(480, py, 92, 0, 7); c.fill();
  c.globalAlpha = 1;
  // pixel clouds drifting (like the designers' ref image)
  cloudRow(c, t * 8, 470, PAL.pink);
  cloudRow(c, t * 14 + 300, 505, PAL.rose);
  cloudRow(c, t * 5 + 900, 528, PAL.peach);
}

function cloudRow(c, xoff, y, col) {
  c.fillStyle = col;
  c.globalAlpha = 0.85;
  for (let i = -1; i < 12; i++) {
    const cx = ((i * 90 + xoff) % 1060) - 50;
    const rr = 20 + ((i * 37) % 18);
    c.beginPath(); c.arc(cx, y - ((i * 13) % 20), rr, 0, 7); c.fill();
    c.beginPath(); c.arc(cx + rr * 0.7, y + 6 - ((i * 13) % 20), rr * 0.8, 0, 7); c.fill();
  }
  c.globalAlpha = 1;
  c.fillStyle = 'rgba(21,12,38,0.35)';
  c.fillRect(0, y + 16, 960, 60);
}

function drawStars2(c, t) {
  c.fillStyle = PAL.ink;
  c.fillRect(0, 0, 960, 540);
  for (let i = 0; i < 80; i++) {
    const y = ((i * 149 + t * 60) % 560) - 10;
    c.fillStyle = i % 4 === 0 ? PAL.peach : PAL.laver;
    c.globalAlpha = 0.4;
    c.fillRect((i * 211) % 960, y, 2, 2);
  }
  c.globalAlpha = 1;
}

// ---------------- dialogue flags (ending choice) ----------------
function applyDialogueFlag(flag) {
  if (!flag) return;
  if (flag === 'aid' || flag === 'stay') {
    Save.d.choices.mercy = flag;
    Save.persist();
  }
  if (g.onChoice) g.onChoice(flag);
}

// ---------------- loop ----------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const paused = g.paused;
  const briefing = g.briefPending && g.state && g.state.brief;

  if (briefing && !paused) {
    // briefing talk menu: topics for CYU, or begin the segment
    const topics = g.state.briefTopics || [];
    const rows = topics.length + 1;
    if (g.briefSel == null || g.briefSel >= rows) g.briefSel = 0;
    if (!Dialogue.active) {
      const once = g.consumeKeys();
      if (once['ArrowDown'] || once['s']) { g.briefSel = (g.briefSel + 1) % rows; Sfx.blip(); }
      if (once['ArrowUp'] || once['w']) { g.briefSel = (g.briefSel + rows - 1) % rows; Sfx.blip(); }
      if (once[' '] || once['Enter'] || once['e']) {
        if (g.briefSel < topics.length) g.dialogue(topics[g.briefSel].lines);
        else g.briefPending = false;
      }
    }
  }

  if (!paused && !briefing) {
    if (g.state) g.state.update(dt);
    if (flash.t > 0) flash.t -= dt;
  }
  // finished-level transition: after the flash fades, roll into the next segment
  if (g.nextState && flash.t <= 0) {
    const nxt = g.nextState;
    g.nextState = null;
    setState(nxt);
  }
  if (Dialogue.active) {
    const once = g.consumeKeys();
    if (Dialogue.queue[0] && Dialogue.queue[0].choices) {
      if (once['ArrowDown'] || once['s']) Dialogue.choose(1);
      if (once['ArrowUp'] || once['w']) Dialogue.choose(-1);
      if (once[' '] || once['1'] || once['2'] || once['3']) Dialogue.advance(applyDialogueFlag);
    } else {
      if (once[' ']) Dialogue.advance(applyDialogueFlag);
    }
  }

  // render
  if (g.state) g.state.draw(ctx);
  if (g.state && g.state.hud && !g.briefPending) {
    drawHUD(ctx, g);
  }

  if (briefing) drawBriefing(ctx);
  if (Dialogue.active && !paused) Dialogue.draw(ctx);
  if (paused) drawPause(ctx);
  if (flash.t > 0) {
    ctx.fillStyle = `rgba(255,113,206,${0.18 * Math.min(1, flash.t)})`;
    ctx.fillRect(0, 0, 960, 540);
    centerText(ctx, flash.text, 300, 30, PAL.cream);
  }
}

// A throw in one frame must never stop the game: log it and keep the loop alive.
function loop(now) {
  try {
    frame(now);
  } catch (err) {
    console.error('CRYO DRIFT frame error:', err);
  }
  requestAnimationFrame(loop);
}

function drawBriefing(c) {
  c.fillStyle = 'rgba(15,8,32,0.90)';
  c.fillRect(0, 40, 960, 500);
  centerText(c, g.state.title || '', 96, 26, PAL.hot);
  c.textAlign = 'left';
  c.font = fontPx(14, 'bold');
  c.fillStyle = PAL.peach;
  c.fillText('OBJECTIVE: ' + (g.state.objective || ''), 70, 138);
  let y = 172;
  c.font = fontPx(13);
  c.fillStyle = PAL.cream;
  for (const line of g.state.brief || []) {
    const rows = wrapText(c, line, 820);
    rows.forEach((ln, i) => c.fillText(ln, 78, y + i * 19));
    y += rows.length * 19 + 8;
  }

  // talk menu: CYU topics + begin
  const topics = g.state.briefTopics || [];
  const rowY = 330;
  c.font = fontPx(11, 'bold');
  c.fillStyle = PAL.laver;
  c.fillText('TALK TO CYU   -   W/S choose   -   SPACE confirm', 78, rowY - 18);

  const rows = topics.length + 1;
  if (g.briefSel == null || g.briefSel >= rows) g.briefSel = 0;
  for (let i = 0; i < rows; i++) {
    const selOn = i === g.briefSel;
    const yy = rowY + i * 28;
    if (yy > 512) break;
    if (selOn) {
      c.fillStyle = 'rgba(255,113,206,0.12)';
      c.fillRect(72, yy - 17, 816, 25);
      c.strokeStyle = PAL.purple;
      c.strokeRect(72.5, yy - 16.5, 815, 24);
    }
    c.font = fontPx(selOn ? 15 : 13, selOn ? 'bold' : '');
    c.fillStyle = selOn ? PAL.hot : (i === topics.length ? PAL.cream : PAL.laver);
    const label = i === topics.length ? '\u25B6  BEGIN SEGMENT' : topics[i].label;
    c.fillText((selOn ? '> ' : '  ') + label, 84, yy);
  }
  c.textAlign = 'left';
}

function drawPause(c) {
  c.fillStyle = 'rgba(15,8,32,0.8)';
  c.fillRect(0, 0, 960, 540);
  centerText(c, 'PAUSED', 220, 34, PAL.cream);
  c.font = fontPx(16);
  c.fillStyle = PAL.laver;
  c.textAlign = 'center';
  c.fillText('SPACE / ESC - resume', 480, 280);
  c.fillText('R - restart this segment', 480, 306);
  c.fillText('Q - save+quit to menu', 480, 332);
  c.textAlign = 'left';
}

// escape handling: pause / unpause / leave states
addEventListener('keydown', (e) => {
  g.keydown(e);
  let unpaused = false;
  if (e.key === 'Escape') {
    if (g.stateName && (g.stateName in LEVEL_NAMES) && Dialogue && !Dialogue.active) { g.paused = !g.paused; unpaused = !g.paused; }
    else if (g.paused) { g.paused = false; unpaused = true; }
  }
  if (g.paused) {
    if (e.key === ' ') { g.paused = false; unpaused = true; }
    if (e.key === 'r' || e.key === 'R') { g.paused = false; g.restartLevel(); }
    if (e.key === 'q' || e.key === 'Q') { g.paused = false; Save.persist(); setState('menu'); }
  }
  if (unpaused) g.once = {}; // the resume key press must not leak into the level
});
addEventListener('keyup', (e) => g.keyup(e));

// fit canvas to window
function fit() {
  const r = Math.min(innerWidth / 960, innerHeight / 540);
  canvas.style.width = 960 * r + 'px';
  canvas.style.height = 540 * r + 'px';
}
addEventListener('resize', fit);
fit();

// URL shortcut for testing: ?lvl=N jumps to a segment (0..5)
function debugJump() {
  const p = new URLSearchParams(location.search).get('lvl');
  if (p !== null && p !== '') {
    const n = Math.max(0, Math.min(5, parseInt(p, 10) || 0));
    const routes = { 0: 'prologue', 1: 'w1', 2: 'transit1', 3: 'maze', 4: 'transit2', 5: 'tower' };
    const routeIdx = { 0: 0, 1: 1, 2: 2, 3: 4, 4: 5, 5: 7 };
    Save.load();
    Save.d.unlocked = Math.max(Save.d.unlocked, routeIdx[n]);
    if (n >= 5) Save.d.abilities.doubleJump = true;
    Save.persist();
    setState(routes[n], { noBrief: false });
    return true;
  }
  return false;
}

Save.load();
Save.persist();
if (!debugJump()) setState('menu');
requestAnimationFrame(loop);

// debug/testing hook (inspectable in the console)
window.__cryo = { g, setState, Dialogue, loop, frame };
