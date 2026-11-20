// Synthesized sound for Solmar Bay: no audio assets, everything is made with
// the Web Audio API — engine hum, sirens, gunshots, pickups, jingles and a
// small bass-led radio loop. Created lazily on the first user gesture.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.musicStep = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx && this.ctx.destination) {
      this.ctx.destination.gain.value = m ? 0 : 1;
    }
  }

  blip(freq = 880, dur = 0.09, type = 'sine', vol = 0.15) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur = 0.18, vol = 0.3, cutoff = 1200) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.ctx.destination);
    src.start(t);
  }

  gunshot() { this.noise(0.16, 0.35, 900); this.blip(160, 0.1, 'square', 0.12); }
  punch() { this.noise(0.08, 0.2, 500); }
  pickup() { this.blip(660, 0.08); setTimeout(() => this.blip(990, 0.12), 70); }
  cash() { this.blip(880, 0.08); setTimeout(() => this.blip(1174, 0.08), 80); setTimeout(() => this.blip(1568, 0.16), 160); }
  denied() { this.blip(220, 0.18, 'sawtooth', 0.12); }
  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'triangle', 0.18), i * 110));
  }
  wasted() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'sawtooth', 0.12), i * 180));
  }

  // Engine hum follows speed: two detuned saws through a lowpass.
  engine(on, speedRatio) {
    if (!this.ctx) return;
    if (!on) {
      if (this.engineOsc) { try { this.engineOsc.stop(); } catch {} this.engineOsc = null; }
      return;
    }
    if (!this.engineOsc) {
      const o1 = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      o1.type = 'sawtooth';
      o2.type = 'square';
      f.type = 'lowpass';
      f.frequency.value = 900;
      g.gain.value = 0.05;
      o1.connect(f);
      o2.connect(f);
      f.connect(g).connect(this.ctx.destination);
      o1.start();
      o2.start();
      this.engineOsc = { o1, o2, g };
    }
    const base = 55 + speedRatio * 130;
    this.engineOsc.o1.frequency.value = base;
    this.engineOsc.o2.frequency.value = base * 1.5;
    this.engineOsc.g.gain.value = 0.03 + speedRatio * 0.05;
  }

  // Two-tone police siren while any police car is near.
  siren(on) {
    if (!this.ctx) return;
    if (!on) {
      if (this.sirenOsc) { try { this.sirenOsc.stop(); } catch {} this.sirenOsc = null; }
      return;
    }
    if (!this.sirenOsc) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      g.gain.value = 0.045;
      o.connect(g).connect(this.ctx.destination);
      o.start();
      this.sirenOsc = { o, g, t: 0 };
    }
    this.sirenOsc.t += 0.016;
    this.sirenOsc.o.frequency.value = Math.sin(this.sirenOsc.t * 4.4) > 0 ? 780 : 980;
  }

  // A quiet 8-step bass loop (Am – F – C – G) with a soft lead pluck.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const bass = [110, 87.31, 130.81, 98];
    const lead = [220, 261.63, 329.63, 392, 440, 392, 329.63, 261.63];
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const bar = Math.floor(this.musicStep / 8) % 4;
      const step = this.musicStep % 8;
      if (step % 2 === 0) this.note(bass[bar] / 2, 0.22, 'triangle', 0.11);
      if (step === 0 || step === 3 || step === 6) this.note(lead[(bar * 3 + step) % 8], 0.14, 'sine', 0.05);
      this.musicStep++;
    }, 230);
  }

  note(freq, dur, type, vol) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}
