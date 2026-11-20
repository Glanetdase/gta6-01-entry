// Solmar Bay — sound, all synthesized with Web Audio: engine hum,
// sirens, dialogue blips, a bassline that keeps the radio alive.
// Nothing is loaded from a file; everything is an oscillator, so the
// game stays silent until the first user gesture creates the context.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineNodes = null;
    this.sirenNodes = null;
    this.musicStep = 0;
    this.musicTimer = 0;
    this.musicOn = false;
  }

  // Create the context on a user gesture. Safe to call repeatedly.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.value = m ? 0 : 0.5;
    }
  }

  // A short tone: the building block for blips, shots and pickups.
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      gain.gain.setValueAtTime(vol || 0.12, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      // Audio is best-effort: a failed note never breaks the game.
    }
  }

  // The little chirp when a line of dialogue appears.
  blip() {
    this.tone(740, 0.07, 'square', 0.06, 990);
  }

  // A cash-register style two-note chime for pickups and rewards.
  chime() {
    this.tone(660, 0.09, 'sine', 0.14);
    setTimeout(() => this.tone(990, 0.14, 'sine', 0.14), 90);
  }

  // A gunshot crack.
  shot() {
    this.tone(190, 0.09, 'sawtooth', 0.16, 55);
  }

  // A dull thud for a collision.
  thud() {
    this.tone(95, 0.12, 'sine', 0.2, 45);
  }

  // The engine hum: a sawtooth whose pitch follows the car's speed.
  // Call every frame with on=false to stop it.
  engine(on, speed01) {
    if (!this.ctx || this.muted) {
      this.stopEngine();
      return;
    }
    if (!on) {
      this.stopEngine();
      return;
    }
    try {
      if (!this.engineNodes) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.value = 62;
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        gain.gain.value = 0.0;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.master);
        osc.start();
        this.engineNodes = { osc, gain };
      }
      const target = 0.05 + speed01 * 0.075;
      this.engineNodes.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
      this.engineNodes.osc.frequency.setTargetAtTime(58 + speed01 * 130, this.ctx.currentTime, 0.08);
    } catch {
      this.stopEngine();
    }
  }

  stopEngine() {
    if (!this.engineNodes) return;
    try {
      this.engineNodes.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      const nodes = this.engineNodes;
      this.engineNodes = null;
      setTimeout(() => {
        try { nodes.osc.stop(); } catch { /* already stopped */ }
      }, 400);
    } catch {
      this.engineNodes = null;
    }
  }

  // The two-tone police siren. Call every frame with near=false to stop.
  siren(near) {
    if (!this.ctx || this.muted) {
      this.stopSiren();
      return;
    }
    if (!near) {
      this.stopSiren();
      return;
    }
    try {
      if (!this.sirenNodes) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 720;
        gain.gain.value = 0.045;
        osc.connect(gain);
        gain.connect(this.master);
        osc.start();
        this.sirenNodes = { osc, gain, phase: 0 };
      }
      const nodes = this.sirenNodes;
      nodes.phase += 0.06;
      nodes.osc.frequency.setTargetAtTime(nodes.phase % 2 < 1 ? 720 : 980, this.ctx.currentTime, 0.05);
    } catch {
      this.stopSiren();
    }
  }

  stopSiren() {
    if (!this.sirenNodes) return;
    try {
      const nodes = this.sirenNodes;
      this.sirenNodes = null;
      nodes.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      setTimeout(() => {
        try { nodes.osc.stop(); } catch { /* already stopped */ }
      }, 300);
    } catch {
      this.sirenNodes = null;
    }
  }

  // Start the little bassline loop. The main loop calls musicTick(dt)
  // to step it; the pattern is a I–vi–IV–V walk in A minor.
  startMusic() {
    this.musicOn = true;
  }

  musicTick(dt) {
    if (!this.ctx || this.muted || !this.musicOn) return;
    this.musicTimer += dt;
    const stepDur = 0.24;
    while (this.musicTimer >= stepDur) {
      this.musicTimer -= stepDur;
      const roots = [55, 43.65, 65.41, 49];
      const bar = Math.floor(this.musicStep / 8) % 4;
      const stepInBar = this.musicStep % 8;
      const root = roots[bar];
      if (stepInBar % 2 === 0) {
        this.tone(root, 0.22, 'triangle', 0.09);
      }
      if (stepInBar === 4) {
        this.tone(root * 2, 0.2, 'sine', 0.06);
      }
      if (stepInBar === 7) {
        this.tone(root * 3, 0.16, 'sine', 0.04);
      }
      this.musicStep += 1;
    }
  }

  // The low descending sting for wasted / busted.
  wasted() {
    this.tone(220, 0.5, 'sawtooth', 0.14, 55);
    setTimeout(() => this.tone(165, 0.7, 'sawtooth', 0.12, 40), 220);
  }
}
