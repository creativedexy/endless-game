/** DOM-based HUD: core health, energy, threat, context prompt, game over. */
export class UIManager {
  private coreBarFill: HTMLDivElement;
  private energyEl: HTMLSpanElement;
  private threatEl: HTMLSpanElement;
  private promptEl: HTMLDivElement;
  private flashEl: HTMLDivElement;
  private introEl: HTMLDivElement;
  private gameoverEl: HTMLDivElement;
  private gameoverStats: HTMLDivElement;
  private flashTimeout = 0;

  constructor(onRestart: () => void) {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML = `
      <div class="hud-panel" id="core-bar-wrap">
        <div style="flex:1">
          <div id="core-bar-label">Colony Core</div>
          <div id="core-bar"><div id="core-bar-fill"></div></div>
        </div>
      </div>
      <div class="hud-panel" id="energy-display">◆ <span id="energy-value">0</span></div>
      <div class="hud-panel" id="threat-display">⚠ Threat <span id="threat-value">1</span></div>
    `;
    document.body.appendChild(hud);

    this.promptEl = document.createElement('div');
    this.promptEl.id = 'prompt';
    this.promptEl.className = 'hidden';
    document.body.appendChild(this.promptEl);

    this.flashEl = document.createElement('div');
    this.flashEl.id = 'flash';
    document.body.appendChild(this.flashEl);

    this.introEl = document.createElement('div');
    this.introEl.id = 'intro';
    this.introEl.innerHTML = `
      <h1>Outpost Zero</h1>
      Defend the colony core from endless alien waves.<br/>
      <b>Move</b> to grab ◆ energy crystals — <b>Action</b> builds, upgrades,
      repairs or attacks, depending on what's nearby.<br/>
      <small>Desktop: WASD move · Space action · Shift dash · R restart</small>
    `;
    document.body.appendChild(this.introEl);

    this.gameoverEl = document.createElement('div');
    this.gameoverEl.id = 'gameover';
    this.gameoverEl.innerHTML = `
      <h1>Colony Lost</h1>
      <div class="stats"></div>
      <button id="restart-btn">Restart</button>
    `;
    document.body.appendChild(this.gameoverEl);
    this.gameoverStats = this.gameoverEl.querySelector('.stats')!;
    this.gameoverEl
      .querySelector('#restart-btn')!
      .addEventListener('click', () => onRestart());

    this.coreBarFill = document.getElementById('core-bar-fill') as HTMLDivElement;
    this.energyEl = document.getElementById('energy-value') as HTMLSpanElement;
    this.threatEl = document.getElementById('threat-value') as HTMLSpanElement;

    // Fade the intro card after a while (or on first meaningful input).
    window.setTimeout(() => this.hideIntro(), 9000);
  }

  hideIntro() {
    this.introEl.classList.add('hidden');
  }

  setCoreHp(hp: number, maxHp: number) {
    const frac = Math.max(0, hp / maxHp);
    this.coreBarFill.style.width = `${frac * 100}%`;
    this.coreBarFill.classList.toggle('danger', frac < 0.35);
  }

  setEnergy(energy: number) {
    const text = String(Math.floor(energy));
    if (this.energyEl.textContent !== text) this.energyEl.textContent = text;
  }

  setThreat(level: number) {
    const text = String(level);
    if (this.threatEl.textContent !== text) this.threatEl.textContent = text;
  }

  /** Contextual hint for what the action button will do right now. */
  setPrompt(text: string | null, affordable = true) {
    if (!text) {
      this.promptEl.classList.add('hidden');
      return;
    }
    this.promptEl.classList.remove('hidden');
    this.promptEl.classList.toggle('unaffordable', !affordable);
    if (this.promptEl.textContent !== text) this.promptEl.textContent = text;
  }

  flashMessage(text: string) {
    this.flashEl.textContent = text;
    this.flashEl.classList.add('show');
    window.clearTimeout(this.flashTimeout);
    this.flashTimeout = window.setTimeout(
      () => this.flashEl.classList.remove('show'),
      1300,
    );
  }

  showGameOver(survivedSeconds: number, kills: number, threat: number) {
    const mins = Math.floor(survivedSeconds / 60);
    const secs = Math.floor(survivedSeconds % 60);
    this.gameoverStats.innerHTML = `
      Survived <b>${mins}:${String(secs).padStart(2, '0')}</b><br/>
      Aliens destroyed: <b>${kills}</b> · Peak threat: <b>${threat}</b>
    `;
    this.gameoverEl.classList.add('show');
  }

  hideGameOver() {
    this.gameoverEl.classList.remove('show');
  }
}
