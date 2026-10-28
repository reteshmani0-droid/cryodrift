// CRYO DRIFT - save data (RPG stats, unlocks, progress) in localStorage.

const KEY = 'cryodrift-save-v1';

export const Save = {
  d: null,

  fresh() {
    return {
      unlocked: 1,        // highest level index (1-based) the player can jump to
      xp: 0,
      deaths: 0,
      time: 0,            // seconds played in levels
      choices: {},        // branching dialogue results
      seen: {},           // one-time dialogue flags
      cryo: true,
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      this.d = raw ? Object.assign(this.fresh(), JSON.parse(raw)) : this.fresh();
    } catch (e) {
      this.d = this.fresh();
    }
    return this.d;
  },

  persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch (e) {}
  },

  wipe() {
    this.d = this.fresh();
    this.persist();
  },

  hasContinue() {
    return this.d && (this.d.unlocked > 1 || this.d.xp > 0);
  },

  addXP(n) {
    this.d.xp += n;
    this.persist();
  },

  // ---- RPG stats derived from XP (leveling: every 60 xp = 1 level) ----
  level()      { return 1 + Math.floor(this.d.xp / 60); },
  levelFloor() { return (this.level() - 1) * 60; },
  levelSpan()  { return this.d.xp - this.levelFloor(); },
  staminaMax() { return Math.round(100 * (1 + 0.15 * (this.level() - 1))); },
  sprintMult() { return 1 + 0.06 * (this.level() - 1); },
  oilMax()     { return Math.round(80 * (1 + 0.12 * (this.level() - 1))); },
  hearts()     { return 3 + (this.level() >= 4 ? 1 : 0) + (this.level() >= 7 ? 1 : 0); },
};

export function completeLevel(idx) {
  const d = Save.d;
  if (idx >= d.unlocked) d.unlocked = Math.min(idx + 1, 8); // 8 = ending reached
  Save.persist();
}
