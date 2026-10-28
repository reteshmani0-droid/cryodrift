// CRYO DRIFT - shared platformer scene: physics wiring, checkpoints, pickups,
// interactables, hazards, camera and render order. Worlds supply layout + hooks.

import { PAL } from './palette.js';
import { Sfx } from './audio.js';
import { Dialogue } from './ui.js';
import { TS, makePlayer, updatePhysics, updateMovers, updateCamera } from './platform.js';
import {
  drawTiles, drawMover, drawSpring, drawCheckpoint, drawGoal,
  drawItem, drawPlayer, drawPrompt, drawMsg,
} from './render.js';

export function makePlatformLevel(g, o) {
  const s = {
    title: o.title,
    objective: o.objective,
    hud: true,
    brief: o.brief || [],
    briefTopics: o.briefTopics || [],
    world: o.world,
    p: makePlayer(o.spawn.x, o.spawn.y),
    spawnPt: { x: o.spawn.x, y: o.spawn.y },
    movers: o.movers || [],
    springs: o.springs || [],
    items: o.items || [],
    checkpoints: o.checkpoints || [],
    interactables: o.interactables || [],
    goal: o.goal || null,
    hearts: o.hearts || 3,
    maxHearts: o.hearts || 3,
    shards: 0,
    cells: 0,
    oil: o.oil || 0,
    oilMax: o.oil || 0,
    st: o.stamina || 0,
    stMax: o.stamina || 0,
    t: 0, inv: 0, shake: 0,
    msg: '', msgT: 0, prompt: '',
    cam: { x: 0, y: 0 },
    crumble: new Map(),
    done: false,
  };

  s.flash = (txt, dur = 1.8) => { s.msg = txt; s.msgT = dur; };

  s.damage = (n = 1, respawn = true) => {
    if (s.inv > 0 || s.done) return false;
    s.hearts -= n; s.inv = 1.3; s.shake = 0.35;
    Sfx.hurt();
    g.save.d.deaths++; g.save.persist();
    if (s.hearts <= 0) {
      s.hearts = s.maxHearts;
      s.respawn();
      s.flash('The drift resets...');
    } else if (respawn) {
      s.respawn();
    }
    return true;
  };

  s.respawn = () => {
    s.p.x = s.spawnPt.x; s.p.y = s.spawnPt.y;
    s.p.vx = 0; s.p.vy = 0; s.p.doubleUsed = false;
    s.cam.x = Math.max(0, Math.min(s.p.x - 480, Math.max(0, o.world.w * TS - 960)));
    s.cam.y = Math.max(0, Math.min(s.p.y - 340, Math.max(0, o.world.h * TS - 540)));
    if (o.onRespawn) o.onRespawn(s);
  };

  s.crumbleTouch = (tx, ty) => {
    const k = tx + ',' + ty;
    if (!s.crumble.has(k)) s.crumble.set(k, { t: 0.45, back: 0 });
  };

  s.update = (dt) => {
    if (Dialogue.active) return;
    s.t += dt;
    g.save.d.time += dt;
    if (s.msgT > 0) s.msgT -= dt;
    if (s.inv > 0) s.inv -= dt;
    if (s.shake > 0) s.shake -= dt;

    const once = g.consumeKeys();

    // crumbling platforms: shake, fall, return
    for (const [k, st] of s.crumble) {
      if (!st.fallen) {
        st.t -= dt;
        if (st.t <= 0) {
          const [tx, ty] = k.split(',').map(Number);
          s.world.set(tx, ty, 0);
          st.fallen = true; st.back = 3.2;
        }
      } else {
        st.back -= dt;
        if (st.back <= 0) {
          const [tx, ty] = k.split(',').map(Number);
          s.world.set(tx, ty, 4);
          s.crumble.delete(k);
        }
      }
    }

    updateMovers(s.movers, s.t);
    if (s.p.onMover) { // ride
      s.p.x += s.p.onMover.mx;
      s.p.y = s.p.onMover.y;
    }

    const sprintHeld = (g.keys['Shift'] || g.keys['shift']);
    const sprint = o.sprint && sprintHeld && s.st > 1 && Math.abs(s.p.vx) > 40;
    if (o.sprint) {
      if (sprint) s.st = Math.max(0, s.st - 30 * dt);
      else s.st = Math.min(s.stMax, s.st + 20 * dt);
    }

    const ev = updatePhysics(s.world, s.p, g.keys, dt, {
      doubleJump: !!(g.save.d.abilities && g.save.d.abilities.doubleJump),
      speedMul: sprint ? 1.45 * g.save.sprintMult() : 1,
      movers: s.movers,
      onCrumble: s.crumbleTouch,
      onJump: (kind) => { kind === 'double' ? Sfx.pick() : Sfx.blip(); },
    });

    // springs
    for (const sp of s.springs) {
      if (Math.abs(s.p.x - sp.x) < 22 && s.p.y >= sp.y - 24 && s.p.y <= sp.y + 12 && s.p.vy >= 0) {
        s.p.vy = -sp.power; s.p.onGround = false; s.p.doubleUsed = false; Sfx.blip();
      }
    }

    // pickups
    for (const it of s.items) {
      if (it.got) continue;
      if (Math.abs(s.p.x - it.x) < 26 && Math.abs((s.p.y - 15) - it.y) < 34) {
        it.got = true;
        pick(g, s, it);
      }
    }

    // checkpoints
    for (const c of s.checkpoints) {
      if (!c.on && Math.abs(s.p.x - c.x) < 30 && Math.abs(s.p.y - c.y) < 56) {
        c.on = true;
        s.spawnPt = { x: c.x, y: c.y };
        s.flash('CHECKPOINT');
        Sfx.good();
      }
    }

    // interactables
    s.prompt = '';
    let best = null, bestD = 1e9;
    for (const it of s.interactables) {
      if (it.enabled === false) continue;
      const d = Math.hypot(s.p.x - it.x, (s.p.y - 15) - it.y);
      if (d < (it.r || 52) && d < bestD) { best = it; bestD = d; }
    }
    if (best) {
      s.prompt = best.label || 'E - use';
      if (once['e'] || once['E'] || once['Enter']) {
        s.prompt = '';
        best.use(s);
      }
    }

    // goal
    if (s.goal && s.goal.active &&
        Math.abs(s.p.x - s.goal.x) < 30 && Math.abs(s.p.y - s.goal.y) < 46) {
      if (o.onGoal) o.onGoal(s);
    }

    // hazards
    if (ev.fell) { s.damage(1); }
    else if (ev.spike) { s.damage(1, false); s.p.vy = -430; s.p.vx = -s.p.face * 230; }

    if (o.onUpdate) o.onUpdate(s, dt, once);

    updateCamera(s.cam, s.p, s.world.w, s.world.h, dt);
  };

  s.draw = (ctx) => {
    o.bg(ctx, s, s.cam);
    ctx.save();
    if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7);

    drawTiles(ctx, s.world, s.cam, o.theme);
    o.drawBelow && o.drawBelow(ctx, s, s.cam);

    for (const sp of s.springs) drawSpring(ctx, sp, s.cam);
    for (const c of s.checkpoints) drawCheckpoint(ctx, c, s.cam, s.t);
    for (const m of s.movers) drawMover(ctx, m, s.cam, o.theme);
    for (const it of s.items) drawItem(ctx, it, s.cam, s.t);
    if (s.goal) drawGoal(ctx, s.goal, s.cam, s.t);

    o.drawMid && o.drawMid(ctx, s, s.cam);
    drawPlayer(ctx, s.p, s.cam, s.t, s.inv);
    o.drawAbove && o.drawAbove(ctx, s, s.cam);

    drawPrompt(ctx, s.prompt, s.p, s.cam);
    ctx.restore();

    o.onOverlay && !g.briefPending && o.onOverlay(ctx, s, s.cam);
    drawMsg(ctx, s.msg, s.msgT);
  };

  return s;
}

function pick(g, s, it) {
  switch (it.kind) {
    case 'shard':
      g.save.d.shards = (g.save.d.shards || 0) + 1;
      g.save.addXP(10);
      s.shards++;
      s.flash('DATA SHARD ' + g.save.d.shards);
      Sfx.pick();
      break;
    case 'cell':
      s.cells++;
      g.save.addXP(20);
      s.flash('ENERGY CELL ' + s.cells + '/3');
      Sfx.pick();
      break;
    case 'oil':
      s.oil = Math.min(s.oilMax, s.oil + (it.power || 22));
      s.flash('LANTERN FED');
      Sfx.pick();
      break;
    default:
      g.save.addXP(15);
      Sfx.pick();
      if (it.effect) it.effect(g, s, it);
  }
}
