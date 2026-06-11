import type { ResourceCost, StructureDef } from './constants';

/**
 * DOM-based HUD in the frosted-glass style: ship health, energy, salvage,
 * threat, the always-visible blueprint selector (hover-to-build), a
 * context hint line, flash messages, intro and game-over screens.
 */
export class UIManager {
  private shipBarFill: HTMLDivElement;
  private energyEl: HTMLSpanElement;
  private salvageEl: HTMLSpanElement;
  private threatEl: HTMLSpanElement;
  private selectorEl: HTMLDivElement;
  private blueprintBtns: HTMLButtonElement[] = [];
  private hintEl: HTMLDivElement;
  private flashEl: HTMLDivElement;
  private introEl: HTMLDivElement;
  private gameoverEl: HTMLDivElement;
  private gameoverStats: HTMLDivElement;
  private flashTimeout = 0;
  private hintShown = '';

  constructor(
    blueprints: StructureDef[],
    onSelectBlueprint: (index: number) => void,
    onRestart: () => void,
  ) {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML = `
      <div class="glass" id="ship-bar-wrap">
        <div id="ship-bar-label">⛨ Hull Integrity</div>
        <div id="ship-bar"><div id="ship-bar-fill"></div></div>
      </div>
      <div id="hud-row">
        <div class="glass hud-chip" id="energy-display">◆ <span id="energy-value">0</span></div>
        <div class="glass hud-chip" id="salvage-display">▣ <span id="salvage-value">0</span></div>
        <div class="glass hud-chip" id="threat-display">⚠ <span id="threat-value">1</span></div>
      </div>
    `;
    document.body.appendChild(hud);

    // Blueprint selector: stand on a pad and the selected one gets built.
    this.selectorEl = document.createElement('div');
    this.selectorEl.id = 'blueprint-bar';
    this.selectorEl.className = 'glass';
    blueprints.forEach((def, i) => {
      const btn = document.createElement('button');
      btn.className = 'bp-btn';
      btn.innerHTML = `
        <span class="bp-icon">${def.icon}</span>
        <span class="bp-cost">${costLabel(def.buildCost)}</span>
        <span class="bp-key">${i + 1}</span>
      `;
      btn.title = def.name;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelectBlueprint(i);
      });
      this.selectorEl.appendChild(btn);
      this.blueprintBtns.push(btn);
    });
    document.body.appendChild(this.selectorEl);

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
      <h1>Aurora Down</h1>
      Your ship went down in the corner of a frozen valley. Hold the
      <b>glowing gaps</b> in the crag line — and venture out for
      <b style="color:#ffba6b">⛏ ore deposits</b> (mines) while villagers
      gather drops back home. Your blaster <b>fires by itself</b> — just keep
      moving.<br/>
      Grab <b style="color:#35f0d0">◆ energy</b> and
      <b style="color:#ffa94d">▣ salvage</b>. Pick a blueprint below, then just
      <b>stand on a pad</b> to build it — hold the line at the gaps. Stand on
      your buildings to upgrade them, or near anything damaged to repair it.<br/>
      <small>Desktop: WASD move · Shift dash · 1-6 blueprint · R restart</small>
    `;
    document.body.appendChild(this.introEl);

    this.gameoverEl = document.createElement('div');
    this.gameoverEl.id = 'gameover';
    this.gameoverEl.innerHTML = `
      <div class="glass" id="gameover-card">
        <h1>The Aurora Is Lost</h1>
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

  private arrowEls: HTMLDivElement[] = [];

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

  /** Highlight the selected blueprint and dim the unaffordable ones. */
  setBlueprintState(selected: number, affordable: boolean[]) {
    this.blueprintBtns.forEach((btn, i) => {
      btn.classList.toggle('selected', i === selected);
      btn.classList.toggle('dim', !affordable[i]);
    });
  }

  /** One-line status above the selector ("Building Blaster Turret…"). */
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

function costLabel(cost: ResourceCost): string {
  const parts: string[] = [];
  if (cost.energy > 0) parts.push(`<i class="cost-energy">◆${cost.energy}</i>`);
  if (cost.salvage > 0) parts.push(`<i class="cost-salvage">▣${cost.salvage}</i>`);
  return parts.join('');
}
