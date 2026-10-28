# CRYO DRIFT

*a deep-space puzzle-RPG — a TSA Video Game Design competition entry*

You crash-landed on the wilds of planet **Exxon**, 142 million lightyears from Earth. Your ship
is broken, your cryopod is foggy, and your AI companion **Cyu** has a plan — three worlds,
three kinds of salvage, and not a single weapon anywhere.

**Theme:** deep space · **Progression:** puzzles, not combat · **Rating target:** E for Everyone

## Play

Open **https://reteshmani0-droid.github.io/cryodrift/** — runs in any browser, no install,
no plugins, nothing to download.

## Worlds

| # | Segment | Fear it plays with | Mechanic |
|---|---|---|---|
| 1 | **The Whisper Wilds** (stealth) | fear of predators | Sneak past Watchers with vision cones; hide in glowing ferns; sprint on stamina; grab 3 energy cells. |
| — | **The First Belt** | — | Drift the ship through an asteroid field (dodge only — no shooting). |
| 2 | **The Labyrinth of Moria** (dark maze) | fear of the unknown | A darkness-lit maze. Your lantern burns real oil as the timer; find Moria's soul + the fuel before the light dies. Shadows roam. |
| — | **The Crystal Belt** | — | Faster asteroid run. |
| 3 | **The Tower of Caesar** | pride / puzzles | Lever-sequence hall, counterweight (crate-push) room, and Caesar's riddle. He's friendly. He has *hidden stairs*. |

**Ending:** the ship flies — and Cyu's last log leaves you with a question about what your
survival cost. You choose the captain's answer.

RPG elements: XP from every objective, character levels that raise stamina, lantern oil,
sprint speed and hearts. **No combat of any kind.**

## Controls

- **Move** — WASD / Arrows
- **Sprint** — hold Shift (World 1)
- **Interact / confirm** — Space or Enter
- **Restart crate room** — R
- **Pause** — Esc (R restarts segment, Q saves + quits)
- **Sound** — M toggles mute

Progress saves automatically in your browser (localStorage): Continue + World Select unlock
as you finish segments. Judges' route: Worlds 1 → 2 → 3 are all reachable from **Worlds/Legends
select**; total playtime comfortably exceeds three minutes.

## Tech

- Pure **HTML5 Canvas + vanilla ES-module JavaScript** — no engine, no libraries, no build step.
- ~2.6k lines of original code; every sprite is code-drawn, every sound is WebAudio-synthesized.
- Color palette: the team's chosen "gloomy purple cosmos" token set (see `js/palette.js`).
- Headless logic smoke test: `npm test` equivalent → `node test/smoke.mjs` (map reachability + level boot).

## Team Cryo Drift

- Main coding — Avaneesh · feature coding — Retesh
- World/UI design — Angad · art & style — Niko
- Documentation — Nihaan · Documentation — Arjun

*(TSA anonymity note: no team identifiers appear inside the game itself; names live here in the
repository, which is the team's own workspace.)*

## License

MIT — all original work by Team Cryo Drift.
