// Synthesized sound for Solmar Bay: no audio assets, everything is made
// with the Web Audio API — engine hum, sirens, gunshots, pickups, jingles
// and a small bass-led radio loop. The context is created lazily on the
// first user gesture, so the page never needs an autoplay grant.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.engineNodes = null;
    this.sirenNodes = null;
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

  // One oscillator piped through a gain envelope into the destination.
  tone(freq, dur, type = 'sine', vol = 0.15, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo !== null) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // A burst of filtered noise (gunshots, thuds, punches).
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

  blip(freq = 880, dur = 0.09, type = 'sine', vol = 0.15) {
    this.tone(freq, dur, type, vol, freq * 1.5);
  }

  gunshot() {
    this.noise(0.16, 0.35, 900);
    this.tone(160, 0.1, 'square', 0.12);
  }

  punch() {
    this.noise(0.08, 0.2, 500);
  }

  pickup() {
    this.tone(660, 0.08);
    setTimeout(() => this.tone(990, 0.12), 70);
  }

  cash() {
    this.tone(880, 0.08);
    setTimeout(() => this.tone(1174, 0.08), 80);
    setTimeout(() => this.tone(1568, 0.16), 160);
  }

  denied() {
    this.tone(220, 0.18, 'sawtooth', 0.12);
  }

  missionDone() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'triangle', 0.18), i * 110));
  }

  wasted() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'sawtooth', 0.12), i * 180));
  }

  // Engine hum follows speed: two detuned oscillators through a lowpass.
  engine(on, speedRatio) {
    if (!this.ctx) return;
    if (!on) {
      if (this.engineNodes) {
        try { this.engineNodes.o1.stop(); this.engineNodes.o2.stop(); } catch { /* already stopped */ }
        this.engineNodes = null;
      }
      return;
    }
    if (!this.engineNodes) {
      const o1 = this.ctx.createOscillator();
      const o2 = this.ctx.createOscillator();
      const f = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
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
      this.engineNodes = { o1, o2, g };
    }
    const base = 55 + speedRatio * 130;
    this.engineNodes.o1.frequency.value = base;
    this.engineNodes.o2.frequency.value = base * 1.5;
    this.engineNodes.g.gain.value = 0.03 + speedRatio * 0.05;
  }

  // Two-tone police siren while any police car is near.
  siren(on) {
    if (!this.ctx) return;
    if (!on) {
      if (this.sirenNodes) {
        try { this.sirenNodes.o.stop(); } catch { /* already stopped */ }
        this.sirenNodes = null;
      }
      return;
    }
    if (!this.sirenNodes) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle';
      g.gain.value = 0.045;
      o.connect(g).connect(this.ctx.destination);
      o.start();
      this.sirenNodes = { o, g, t: 0 };
    }
    this.sirenNodes.t += 0.016;
    this.sirenNodes.o.frequency.value = Math.sin(this.sirenNodes.t * 4.4) > 0 ? 780 : 980;
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
