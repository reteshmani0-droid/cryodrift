// CRYO DRIFT - tiny original synth sounds (WebAudio, no external assets).

let ac = null;
let master = null;
let drone = null;

export const Sfx = {
  started: false,
  muted: false,

  init() {
    if (this.started) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0.35;
      master.connect(ac.destination);
      this.started = true;
    } catch (e) {}
  },

  tone(freq, dur, type = 'sine', vol = 0.5, slide = 0) {
    if (!this.started || this.muted) return;
    try {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.value = freq;
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ac.currentTime + dur);
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.connect(g); g.connect(master);
      o.start();
      o.stop(ac.currentTime + dur + 0.02);
    } catch (e) {}
  },

  blip()      { this.tone(520, 0.08, 'square', 0.18); },
  pick()      { this.tone(720, 0.12, 'triangle', 0.3); this.tone(1080, 0.18, 'sine', 0.2); },
  good()      { this.tone(440, 0.15, 'triangle', 0.3); this.tone(660, 0.2, 'triangle', 0.25); this.tone(880, 0.3, 'sine', 0.2); },
  bad()       { this.tone(220, 0.3, 'sawtooth', 0.2, -80); },
  hurt()      { this.tone(160, 0.25, 'square', 0.25, -60); },
  rustle()    { this.tone(180 + Math.random() * 60, 0.2, 'sawtooth', 0.08); },
  lever()     { this.tone(300, 0.12, 'square', 0.2); this.tone(150, 0.2, 'triangle', 0.2); },
  ambient() {
    // low gloomy pad, very quiet
    if (!this.started || drone) return;
    try {
      drone = ac.createGain();
      drone.gain.value = 0.045;
      drone.connect(master);
      const o1 = ac.createOscillator(); o1.type = 'sine'; o1.frequency.value = 55;
      const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = 55.7;
      const g1 = ac.createGain(); g1.gain.value = 0.7;
      o1.connect(g1); g1.connect(drone);
      o2.connect(g1);
      o1.start(); o2.start();
    } catch (e) {}
  },
};
