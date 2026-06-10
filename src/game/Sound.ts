/**
 * Tiny procedural sound effects with WebAudio — no audio assets needed.
 * The AudioContext is created lazily on the first user gesture.
 */
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  constructor() {
    const unlock = () => {
      if (this.ctx) return;
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    volume = 1,
    slideTo?: number,
  ) {
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + duration);
    }
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  shoot() {
    this.tone(880, 0.08, 'square', 0.25, 440);
  }

  playerSwing() {
    this.tone(300, 0.09, 'sawtooth', 0.3, 90);
  }

  hit() {
    this.tone(200, 0.06, 'square', 0.3, 120);
  }

  enemyDie() {
    this.tone(520, 0.18, 'sawtooth', 0.35, 80);
  }

  collect() {
    this.tone(660, 0.07, 'sine', 0.4, 990);
    this.tone(990, 0.12, 'sine', 0.25, 1320);
  }

  build() {
    this.tone(330, 0.1, 'square', 0.35, 440);
    this.tone(440, 0.16, 'square', 0.3, 660);
  }

  upgrade() {
    this.tone(440, 0.09, 'square', 0.35, 660);
    this.tone(660, 0.12, 'square', 0.3, 880);
    this.tone(880, 0.16, 'square', 0.25, 1100);
  }

  repair() {
    this.tone(500, 0.08, 'triangle', 0.4, 700);
  }

  dash() {
    this.tone(160, 0.14, 'sawtooth', 0.3, 600);
  }

  coreHit() {
    this.tone(110, 0.25, 'sawtooth', 0.5, 55);
  }

  denied() {
    this.tone(180, 0.12, 'square', 0.3, 140);
  }

  gameOver() {
    this.tone(440, 0.5, 'sawtooth', 0.4, 80);
    this.tone(220, 0.8, 'triangle', 0.4, 40);
  }
}
