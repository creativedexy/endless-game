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
      this.master.gain.value = 0.32;
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

  playerShoot() {
    this.tone(960, 0.07, 'square', 0.18, 320);
  }

  turretShoot() {
    this.tone(700, 0.07, 'square', 0.14, 380);
  }

  hit() {
    this.tone(200, 0.06, 'square', 0.28, 120);
  }

  enemyDie() {
    this.tone(520, 0.18, 'sawtooth', 0.32, 80);
  }

  collectEnergy() {
    this.tone(660, 0.07, 'sine', 0.4, 990);
    this.tone(990, 0.12, 'sine', 0.25, 1320);
  }

  collectSalvage() {
    this.tone(330, 0.07, 'triangle', 0.45, 220);
    this.tone(440, 0.1, 'triangle', 0.3, 330);
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

  shipHit() {
    this.tone(110, 0.25, 'sawtooth', 0.5, 55);
    this.tone(60, 0.3, 'triangle', 0.4, 40);
  }

  structureDestroyed() {
    this.tone(260, 0.3, 'sawtooth', 0.4, 60);
  }

  denied() {
    this.tone(180, 0.12, 'square', 0.3, 140);
  }

  gameOver() {
    this.tone(440, 0.5, 'sawtooth', 0.4, 80);
    this.tone(220, 0.8, 'triangle', 0.4, 40);
  }
}
