/**
 * DOM-based HUD in the frosted-glass style: HQ health, cash, parts,
 * threat, the context hint line, edge-of-screen threat arrows, flash
 * messages, intro and game-over screens. V5 has no build UI at all —
 * every build spot on the map is typed, so the world is the menu.
 */
export class UIManager {
  private shipBarFill: HTMLDivElement;
  private energyEl: HTMLSpanElement;
  private salvageEl: HTMLSpanElement;
  private threatEl: HTMLSpanElement;
  private hintEl: HTMLDivElement;
  private flashEl: HTMLDivElement;
  private introEl: HTMLDivElement;
  private gameoverEl: HTMLDivElement;
  private gameoverStats: HTMLDivElement;
  private flashTimeout = 0;
  private hintShown = '';
  private arrowEls: HTMLDivElement[] = [];

  constructor(onRestart: () => void) {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML = `
      <div class="glass" id="ship-bar-wrap">
        <div id="ship-bar-label">🏠 HQ Integrity</div>
        <div id="ship-bar"><div id="ship-bar-fill"></div></div>
      </div>
      <div id="hud-row">
        <div class="glass hud-chip" id="energy-display">$ <span id="energy-value">0</span></div>
        <div class="glass hud-chip" id="salvage-display">🔩 <span id="salvage-value">0</span></div>
        <div class="glass hud-chip" id="threat-display">🚨 <span id="threat-value">1</span></div>
      </div>
    `;
    document.body.appendChild(hud);

    this.hintEl = document.createElement('div');
    this.hintEl.id = 'context-hint';
    this.hintEl.className = 'glass hidden';
    document.body.appendChild(this.hintEl);

    this.flashEl = document.createElement('div');
    this.flashEl.id = 'flash';
    document.body.appendChild(this.flashEl);

    this.introEl = document.createElement('div');
    this.introEl.id = 'intro';
    this.introEl.className = 'glass';
    this.introEl.innerHTML = `
      <h1>Hold the Block</h1>
      Rivals are coming for the crib. Every glowing spot builds one thing:
      <b>stand on it</b> and it happens. <b style="color:#ffd166">🚧
      Barricades</b> block the alleys (rivals smash through, you slip past),
      shooter posts grow your firepower, and <b style="color:#ffba6b">🏪
      corner store</b> and <b style="color:#7dff9a">🏘 crew crib</b> plots by
      the HQ run your money. Your piece <b>fires by itself</b> — just keep
      moving.<br/>
      <small>Desktop: WASD move · Shift dash · R restart</small>
    `;
    document.body.appendChild(this.introEl);

    this.gameoverEl = document.createElement('div');
    this.gameoverEl.id = 'gameover';
    this.gameoverEl.innerHTML = `
      <div class="glass" id="gameover-card">
        <h1>The Block Is Lost</h1>
        <div class="stats"></div>
        <button id="restart-btn" class="glass-btn">Restart</button>
      </div>
    `;
    document.body.appendChild(this.gameoverEl);
    this.gameoverStats = this.gameoverEl.querySelector('.stats')!;
    this.gameoverEl
      .querySelector('#restart-btn')!
      .addEventListener('click', () => onRestart());

    this.shipBarFill = document.getElementById('ship-bar-fill') as HTMLDivElement;
    this.energyEl = document.getElementById('energy-value') as HTMLSpanElement;
    this.salvageEl = document.getElementById('salvage-value') as HTMLSpanElement;
    this.threatEl = document.getElementById('threat-value') as HTMLSpanElement;

    // Edge-of-screen threat arrows (pooled, repositioned every frame).
    for (let i = 0; i < 4; i++) {
      const el = document.createElement('div');
      el.className = 'threat-arrow';
      el.innerHTML = `<span class="ta-tri">➤</span><span class="ta-count"></span>`;
      el.style.display = 'none';
      document.body.appendChild(el);
      this.arrowEls.push(el);
    }

    // Fade the intro card after a while.
    window.setTimeout(() => this.hideIntro(), 10000);
  }

  hideIntro() {
    this.introEl.classList.add('hidden');
  }

  setShipHp(hp: number, maxHp: number) {
    const frac = Math.max(0, hp / maxHp);
    this.shipBarFill.style.width = `${frac * 100}%`;
    this.shipBarFill.classList.toggle('danger', frac < 0.35);
  }

  setEnergy(value: number) {
    const text = String(Math.floor(value));
    if (this.energyEl.textContent !== text) this.energyEl.textContent = text;
  }

  setSalvage(value: number) {
    const text = String(Math.floor(value));
    if (this.salvageEl.textContent !== text) this.salvageEl.textContent = text;
  }

  setThreat(level: number) {
    const text = String(level);
    if (this.threatEl.textContent !== text) this.threatEl.textContent = text;
  }

  /** One-line status for the current hover action. */
  setContextHint(text: string | null) {
    const next = text ?? '';
    if (next === this.hintShown) return;
    this.hintShown = next;
    if (!text) {
      this.hintEl.classList.add('hidden');
      return;
    }
    this.hintEl.textContent = text;
    this.hintEl.classList.remove('hidden');
  }

  /** Position the off-screen threat arrows; pass [] to hide them all. */
  setThreatArrows(
    items: Array<{ sx: number; sy: number; deg: number; count: number; color: string }>,
  ) {
    for (let i = 0; i < this.arrowEls.length; i++) {
      const el = this.arrowEls[i];
      const item = items[i];
      if (!item) {
        if (el.style.display !== 'none') el.style.display = 'none';
        continue;
      }
      el.style.display = 'flex';
      el.style.left = `${item.sx}px`;
      el.style.top = `${item.sy}px`;
      el.style.color = item.color;
      (el.firstElementChild as HTMLElement).style.transform = `rotate(${item.deg}deg)`;
      const countEl = el.lastElementChild as HTMLElement;
      const text = item.count > 1 ? String(item.count) : '';
      if (countEl.textContent !== text) countEl.textContent = text;
    }
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

  showGameOver(
    survivedSeconds: number,
    kills: number,
    threat: number,
    best: number | null,
    isRecord: boolean,
  ) {
    const fmt = (s: number) =>
      `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const recordLine = isRecord
      ? `<span style="color:#ffe066">★ New record!</span>`
      : best && best > 0
        ? `Best: <b>${fmt(best)}</b>`
        : '';
    this.gameoverStats.innerHTML = `
      Survived <b>${fmt(survivedSeconds)}</b> ${recordLine}<br/>
      Rivals dropped: <b>${kills}</b> · Peak heat: <b>${threat}</b>
    `;
    this.gameoverEl.classList.add('show');
  }

  hideGameOver() {
    this.gameoverEl.classList.remove('show');
  }
}
