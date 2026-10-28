// Headless smoke test: builds every segment, drives it, and checks the
// platformer wiring (spawn, pickups, levers, riddle, doors, completion).
import { Save } from '../js/save.js';

const completed = [];
let dlgCb = null;
let dlgLines = null;

const g = {
  keys: {},
  once: {},
  save: Save,
  complete: (n) => completed.push(n),
  restartLevel: () => { throw new Error('restartLevel called in smoke'); },
  dialogue: (lines, cb) => { dlgLines = lines; dlgCb = cb; },
  consumeKeys() { const o = g.once; g.once = {}; return o; },
};

Save.load();
Save.wipe();
Save.d.abilities.doubleJump = true;

const { prologueLevel } = await import('../js/ship.js');
const { stealthLevel, mazeLevel, towerLevel } = await import('../js/worlds.js');
const { transitLevel } = await import('../js/transit.js');

const fails = [];
function check(cond, msg) { if (!cond) fails.push(msg); }
function step(s, n) { for (let i = 0; i < n; i++) s.update(1 / 60); }
function run(name, s, secs) {
  try {
    step(s, Math.round(secs * 60));
    console.log(`ok   ${name}: ran ${secs}s`);
  } catch (e) {
    fails.push(`${name} crashed: ${e.message}`);
    console.log(`FAIL ${name}: ${e.message}`);
  }
  return s;
}
function grounded(s) {
  const p = s.p, tx = Math.floor(p.x / 32), ty = Math.floor(p.y / 32);
  const t = s.world.get(tx, ty);
  return t === 1 || t === 2 || t === 4;
}
function press(s, key = 'e') { g.once = {}; g.once[key] = true; step(s, 1); }
function useAt(s, it) {
  s.p.x = it.x;
  s.p.y = it.y;
  s.p.vx = 0; s.p.vy = 0;
  dlgCb = null; dlgLines = null;
  press(s);
  return dlgCb;
}
function bounds(s) {
  for (const it of s.items) {
    if (it.x < 0 || it.x > s.world.w * 32 || it.y < 0 || it.y > s.world.h * 32) {
      fails.push(`${s.title}: item ${it.kind} out of bounds at ${Math.round(it.x)},${Math.round(it.y)}`);
    }
  }
}

// ---------------------------------------------------------------- prologue
const pro = run('prologue', prologueLevel(g), 1.5);
check(pro.hud === true, 'prologue: no HUD flag');
check(pro.p.onGround && grounded(pro), 'prologue: spawn is not on the deck');
check(pro.items.length === 0, 'prologue: unexpected items');
const core = pro.interactables.find((i) => /CORE/.test(i.label));
check(!!core, 'prologue: no core console');
if (core) {
  const cb = useAt(pro, core);
  check(!!dlgLines, 'prologue: core gave no dialogue');
  if (cb) cb();
  step(pro, 3);
  check(pro.coreDone === true, 'prologue: core did not reboot');
  check(pro.world.get(44, 14) === 0, 'prologue: blast door stayed shut');
}
const door = pro.interactables.find((i) => /BLAST/.test(i.label));
check(!!door, 'prologue: no blast door interactable');
if (door) {
  useAt(pro, door);
  check(completed.includes('prologue'), 'prologue: door did not complete the segment');
}

// ---------------------------------------------------------------- world 1
const w1 = run('w1', stealthLevel(g), 2);
check(w1.p.onGround && grounded(w1), 'w1: spawn is not on the ground');
check(w1.items.filter((i) => i.kind === 'cell').length === 3, 'w1: expected 3 cells');
check(w1.items.filter((i) => i.kind === 'shard').length === 4, 'w1: expected 4 shards');
bounds(w1);
for (const c of w1.items.filter((i) => i.kind === 'cell')) {
  w1.p.x = c.x; w1.p.y = c.y + 15; w1.p.vx = 0; w1.p.vy = 0;
  step(w1, 1);
}
check(w1.cells === 3, 'w1: cells not collected (' + w1.cells + ')');
check(w1.goal.active === true, 'w1: exit did not activate with 3 cells');
dlgCb = null;
w1.p.x = w1.goal.x; w1.p.y = w1.goal.y;
step(w1, 1);
if (dlgCb) dlgCb();
check(completed.includes('w1'), 'w1: exit did not complete the segment');

// ---------------------------------------------------------------- world 2
const mz = run('maze', mazeLevel(g), 2);
check(mz.p.onGround && grounded(mz), 'maze: spawn is not on the ground');
check(mz.items.filter((i) => i.kind === 'shard').length === 4, 'maze: expected 4 shards');
bounds(mz);
const soul = mz.items.find((i) => i.kind === 'soul');
const fuel = mz.items.find((i) => i.kind === 'fuel');
check(!!soul && !!fuel, 'maze: soul or fuel missing');
for (const it of [soul, fuel]) {
  if (!it) continue;
  mz.p.x = it.x; mz.p.y = it.y + 15; mz.p.vx = 0; mz.p.vy = 0;
  step(mz, 2);
  mz.oil = mz.oilMax;
}
check(mz.hasSoul === true, 'maze: soul not collected');
check(mz.hasFuel === true, 'maze: fuel not collected');
check(mz.goal.active === true, 'maze: portal did not open');
dlgCb = null;
mz.p.x = mz.goal.x; mz.p.y = mz.goal.y;
step(mz, 1);
if (dlgCb) dlgCb();
check(completed.includes('maze'), 'maze: portal did not complete the segment');

// ---------------------------------------------------------------- world 3
const tw = run('tower', towerLevel(g), 2);
check(tw.p.onGround && grounded(tw), 'tower: spawn is not on the foundation');
check(tw.items.filter((i) => i.kind === 'shard').length === 5, 'tower: expected 5 shards');
check(tw.checkpoints.length >= 5, 'tower: too few checkpoints');
bounds(tw);

// running + jumping
const sx = tw.p.x;
g.keys = { ArrowRight: true };
step(tw, 120);
g.keys = {};
check(tw.p.x > sx + 120, 'tower: the player did not run right');
const sy = tw.p.y;
g.keys = { ' ': true };
step(tw, 8);
g.keys = {};
check(tw.p.y < sy - 20, 'tower: jump did not lift the player');
step(tw, 40);

// four seals in order
const seals = tw.interactables.filter((i) => /SEAL/.test(i.label));
check(seals.length === 4, 'tower: expected 4 seal levers');
for (const lv of seals) {
  const cb = useAt(tw, lv);
  check(!!dlgLines, 'tower: lever ' + lv.label + ' gave no dialogue');
  if (cb) cb();
}
check(tw.seals === 4, 'tower: seals not all set (' + tw.seals + ')');

// the statue's riddle
const statue = tw.interactables.find((i) => /STATUE/.test(i.label));
check(!!statue, 'tower: no statue interactable');
if (statue) {
  const cb = useAt(tw, statue);
  check(!!dlgLines, 'tower: statue gave no dialogue');
  tw.answer = 'tower_ok';
  if (cb) cb();
  check(tw.gateOpen === true, 'tower: gate did not open on the correct riddle answer');
  check(tw.world.get(17, 15) === 0, 'tower: gate tiles still solid');
  check(tw.goal.active === true, 'tower: beacon did not activate');
  dlgCb = null;
  tw.p.x = tw.goal.x; tw.p.y = tw.goal.y;
  step(tw, 1);
  if (dlgCb) dlgCb();
  check(completed.includes('tower'), 'tower: beacon did not complete the segment');
}

// ---------------------------------------------------------------- transits
for (const which of [1, 2]) {
  const tr = run('transit' + which, transitLevel(g, which), 2);
  check(tr.hud === true, 'transit: no HUD flag');
  check(tr.hearts === tr.maxHearts && tr.hearts > 0, 'transit: bad hearts');
  tr.t = 39 + which * 10;
  step(tr, 20);
  check(completed.includes('transit' + which), 'transit' + which + ': did not complete');
}

// ---------------------------------------------------------------- report
if (fails.length) {
  console.log('\nSMOKE FAIL');
  for (const f of fails) console.log(' - ' + f);
  process.exit(1);
}
console.log('\ncompleted: ' + completed.join(', '));
console.log('SMOKE PASS');
