# CRYO DRIFT — build notes

## How to test it

Run a local server and open `http://127.0.0.1:4173/` (`python -m http.server 4173`).
`node test/smoke.mjs` boots every segment headless and completes each objective.

**URL debug:** `?lvl=N` jumps straight to a segment — 0 prologue, 1 w1, 2 transit1,
3 maze, 4 transit2, 5 tower (also grants the double jump). `window.__cryo = { g, setState,
Dialogue, loop, frame }` is exposed: `setState('tower')` jumps anywhere, `g.state.p` is the
player, `g.briefPending` is the briefing menu.

**Controls:** Arrows/WASD run · Space/W/Up jump (hold = higher, second press = thruster boots)
· Shift sprint (w1 only) · E interact · W/S + Space in briefings and dialogue choices · Esc
pause (R restart, Q quit) · M mute.

## Scene names (in order)

`menu` · `howto` · `credits` · `select` · `launch` · `prologue` · `w1` · `transit1` ·
`story1` · `maze` · `transit2` · `story2` · `tower` · `ending`.

## Where things are (tile 32 px, so x = tile*32)

- **Prologue** (48×18): spawn (112, 480) · cryo pod 240 · Cyu 400 · engine core 752 ·
  sealed blast door column 44 (x 1408). Reboot the core to clear the door.
- **World 1** (120×26): spawn (80, 640) · three cell routes across the map · exit pad x 3712.
  Ferns hide you; Watchers' cones must not touch you.
- **Transit 1/2** (asteroids): the ship is the cursor; dodge rocks until the timer ends.
- **World 2** (100×34): spawn/portal (192, 896) · plateau top y 896 · cave floor y 1024 ·
  fuel at x 352 under the plateau · soul shelf at (1888, 224) up the stair of ledges.
- **Tower** (30×102): spawn (496, 3136) · room floors at rows 98/82/66/50/34/18 (y 3136 …
  576) · seal levers at x 800 on floors 82/66/50/34 · shaft ledges alternate x 160–480 and
  512–832 · Caesar's statue (256, 576) · gate column 17, rows 12–17 · beacon (768, 576).
  HUD panel lives in the outer-wall strip x 846–940.

## Map of the source

| File | What it holds |
|---|---|
| `js/main.js` | State machine, menu/how-to/credits/select/launch, story beats, briefing + talk menu, pause, loop, `?lvl` debug, `window.__cryo` |
| `js/platform.js` | `WorldGrid` (0 empty, 1 solid, 2 one-way, 3 spike, 4 crumble), player body, physics, coyote/buffer/variable jump/double jump, movers, camera |
| `js/render.js` | Tile painter, astronaut, pickups, checkpoints, goal, prompts, floating messages |
| `js/scene.js` | `makePlatformLevel`: shared update/draw, hearts + damage, pickups, checkpoints, interactables, hazards, goal |
| `js/ship.js` | Prologue level: hull, pod, Cyu, core, blast door, intro dialogue |
| `js/worlds.js` | World 1, World 2, World 3 layout, watchers, shadows, tower levers/statue/HUD |
| `js/transit.js` | Asteroid belts, ship, rocks, briefing topics |
| `js/ui.js` | `Dialogue` (lines, choices, callback), HUD (hearts, shards, level, mute) |
| `js/save.js` | localStorage schema (`cryodrift-save-v1`), XP/levels, hearts, stamina, oil, abilities, unlocked |
| `js/audio.js` | WebAudio synth: `blip`, `pick`, `good`, `bad`, ambience |
| `js/palette.js` | Team palette tokens and font stack |
| `test/smoke.mjs` | Headless boot of every segment + objective completion |

## Simplified / missing

- Art is code-drawn (no sprite sheets); the astronaut is a helmet, body, legs and a pink pack.
- One music loop, synthesized; no per-level themes. No voice, only blips.
- The two asteroid transits are dodge-only filler between worlds (pure keyboard, no shooting).
- The tower is exactly one screen wide (960 px), so the camera only scrolls vertically there.
- No gamepad or touch controls; keyboard only, as the rules allow.
- The ending is text + choice; no cutscene animation beyond the ship flying.
- TSA deliverables still to make outside this repo: demo video (<5 min) and portfolio PDF.
