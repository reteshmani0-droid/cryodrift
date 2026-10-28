# CRYO DRIFT

*a deep-space puzzle-platformer — a TSA Video Game Design competition entry*

You wake on the wrecked **EXON-1**, 142 million lightyears from Earth. Your AI companion
**Cyu** has a plan: three worlds, three kinds of salvage, and not a single weapon anywhere.
Walk, jump, climb, hide, and solve — then fly home.

**Theme:** deep space · **Progression:** puzzles and platforming, not combat · **Rating target:** E for Everyone

## Play

Open **https://reteshmani0-droid.github.io/cryodrift/** — runs in any browser, no install,
no plugins, nothing to download.

## The run

| # | Segment | Mechanic |
|---|---|---|
| 0 | **Prologue — The Wake** (aboard the EXON-1) | Learn to walk and jump. Inspect your cryo pod, talk to Cyu, reboot the engine core to unseal the blast door. |
| 1 | **The Whisper Wilds** (stealth platformer) | Climb three cell towers past Watchers with vision cones. Hide in glowing ferns, sprint on stamina, collect 3 energy cells, reach the exit pad. |
| — | **The First Belt** | Drift the ship through an asteroid field — dodge only, no shooting. |
| 2 | **The Labyrinth of Moria** (lantern platformer) | Your lantern burns real oil as a timer and as the size of your light. Climb the stair of ledges for Moria's soul, find the fuel, and carry both back to the portal. Shadows hunt warmth. |
| — | **The Crystal Belt** | Faster asteroid run. |
| 3 | **The Tower of Caesar** (vertical platformer) | Climb six floors of a 30 × 102 tower. Each floor is a hazard room with a seal lever at the far right; climb the zigzag shaft between floors. Four seals open Caesar's gate, his statue asks one riddle, and the beacon at the crown is the last hull plate. |

**Ending:** the ship flies — and Cyu's last log leaves you with a question about what your
survival cost. You choose the captain's answer.

Every briefing also has a **talk menu**: four Cyu topics you can ask about before you begin
(plus "Begin segment"), so the story and the rules are always one key away.

RPG elements: XP from every objective, levels that raise hearts, stamina and lantern oil,
data shards to collect, checkpoints, and hearts instead of lives. **No combat of any kind.**

## Controls

- **Run** — WASD / Arrows
- **Jump** — Space, W or Up (hold for height; jump again in mid-air for the thruster boots, unlocked after World 1)
- **Sprint** — hold Shift (World 1, uses stamina)
- **Interact / read / pull / confirm** — E, Space or Enter
- **Talk menu** — W/S to choose a topic, Space to confirm
- **Pause** — Esc (R restarts segment, Q saves + quits)
- **Sound** — M toggles mute

Jumping clears two tiles; sprinting or the thruster boots clear more. Ledges with a bright
top edge are one-way: jump up through them, land on top.

Progress saves automatically in your browser (localStorage): Continue and World Select unlock
as you finish segments. Judges' route: all three worlds are reachable from **Worlds / Levels**;
a straight run comfortably exceeds three minutes.

## Tech

- Pure **HTML5 Canvas + vanilla ES-module JavaScript** — no engine, no libraries, no build step.
- Every sprite is code-drawn, every sound is WebAudio-synthesized.
- Color palette: the team's "gloomy purple cosmos" token set (see `js/palette.js`).
- Source map:
  - `js/platform.js` — tile grid, player physics (coyote time, jump buffer, variable jump, double jump), movers, camera
  - `js/render.js` — tiles, astronaut, pickups, checkpoints, prompts
  - `js/scene.js` — shared level shell: physics wiring, hearts, hazards, pickups, checkpoints, goal
  - `js/ship.js` — the EXON-1 prologue
  - `js/worlds.js` — the three platformer worlds and their art
  - `js/transit.js` — the two asteroid belts
  - `js/main.js` — state machine, menus, briefings, endings
  - `js/save.js` — save data, levels, abilities · `js/ui.js` — dialogue and HUD · `js/audio.js` — synth
- Headless logic smoke test: `node test/smoke.mjs` (boots every segment, teleports to each objective, presses interact, checks completion).

## Team Cryo Drift

- Main coding — Avaneesh · feature coding — Retesh
- World/UI design — Angad · art & style — Niko
- Documentation — Nihaan · Documentation — Arjun

*(TSA anonymity note: no team identifiers appear inside the game itself; names live here in the
repository, which is the team's own workspace.)*

## License

MIT — all original work by Team Cryo Drift.
