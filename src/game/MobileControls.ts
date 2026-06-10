import type { InputState } from './input';
import type { KeyboardControls } from './input';

/**
 * Touch UI: a dynamic left-thumb joystick plus action/dash buttons on the
 * right. Only shown on touch devices (body gets a `touch` class).
 */
export class MobileControls {
  private joyPointerId: number | null = null;
  private joyOrigin = { x: 0, y: 0 };
  private readonly joyRadius = 55;

  private stickBase: HTMLDivElement;
  private stickKnob: HTMLDivElement;
  private dashCooldownEl: HTMLDivElement;

  readonly isTouchDevice: boolean;

  constructor(
    private input: InputState,
    private keyboard: KeyboardControls,
  ) {
    this.isTouchDevice =
      'ontouchstart' in window || window.matchMedia('(pointer: coarse)').matches;

    const root = document.createElement('div');
    root.id = 'touch-controls';
    root.innerHTML = `
      <div id="joystick-zone">
        <div class="stick-base"></div>
        <div class="stick-knob"></div>
      </div>
      <div class="touch-btn" id="btn-dash"><span>Dash</span><div class="cooldown" style="transform: scaleY(0)"></div></div>
      <div class="touch-btn" id="btn-action"><span id="btn-action-label">Act</span></div>
      <div id="rotate-hint">Rotate your phone to landscape for the best view 🔄</div>
    `;
    document.body.appendChild(root);

    this.stickBase = root.querySelector('.stick-base')!;
    this.stickKnob = root.querySelector('.stick-knob')!;
    this.dashCooldownEl = root.querySelector('#btn-dash .cooldown')!;

    if (this.isTouchDevice) document.body.classList.add('touch');

    this.bindJoystick(root.querySelector('#joystick-zone')!);
    this.bindActionButton(root.querySelector('#btn-action')!);
    this.bindDashButton(root.querySelector('#btn-dash')!);
  }

  private bindJoystick(zone: HTMLElement) {
    zone.addEventListener('pointerdown', (e) => {
      if (this.joyPointerId !== null) return;
      this.joyPointerId = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      this.joyOrigin = { x: e.clientX, y: e.clientY };
      this.showStick(e.clientX, e.clientY, e.clientX, e.clientY);
      this.keyboard.touchActive = true;
      e.preventDefault();
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joyPointerId) return;
      let dx = e.clientX - this.joyOrigin.x;
      let dy = e.clientY - this.joyOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > this.joyRadius) {
        dx = (dx / len) * this.joyRadius;
        dy = (dy / len) * this.joyRadius;
      }
      this.input.moveX = dx / this.joyRadius;
      this.input.moveY = -dy / this.joyRadius; // screen Y down -> world forward up
      this.showStick(
        this.joyOrigin.x,
        this.joyOrigin.y,
        this.joyOrigin.x + dx,
        this.joyOrigin.y + dy,
      );
      e.preventDefault();
    });
    const release = (e: PointerEvent) => {
      if (e.pointerId !== this.joyPointerId) return;
      this.joyPointerId = null;
      this.input.moveX = 0;
      this.input.moveY = 0;
      this.keyboard.touchActive = false;
      this.stickBase.style.display = 'none';
      this.stickKnob.style.display = 'none';
    };
    zone.addEventListener('pointerup', release);
    zone.addEventListener('pointercancel', release);
  }

  private bindActionButton(btn: HTMLElement) {
    btn.addEventListener('pointerdown', (e) => {
      this.input.actionPressed = true;
      this.keyboard.touchActionHeld = true;
      btn.classList.add('pressed');
      e.preventDefault();
    });
    const release = () => {
      this.keyboard.touchActionHeld = false;
      btn.classList.remove('pressed');
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
  }

  private bindDashButton(btn: HTMLElement) {
    btn.addEventListener('pointerdown', (e) => {
      this.input.dashPressed = true;
      btn.classList.add('pressed');
      e.preventDefault();
    });
    const release = () => btn.classList.remove('pressed');
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
  }

  private showStick(bx: number, by: number, kx: number, ky: number) {
    this.stickBase.style.display = 'block';
    this.stickKnob.style.display = 'block';
    this.stickBase.style.left = `${bx}px`;
    this.stickBase.style.top = `${by}px`;
    this.stickKnob.style.left = `${kx}px`;
    this.stickKnob.style.top = `${ky}px`;
  }

  /** Show dash cooldown as a dark wipe over the dash button (0..1 remaining). */
  setDashCooldown(fraction: number) {
    this.dashCooldownEl.style.transform = `scaleY(${Math.max(0, Math.min(1, fraction))})`;
  }

  /** Update the action button label to match the contextual action. */
  setActionLabel(label: string) {
    const el = document.getElementById('btn-action-label');
    if (el && el.textContent !== label) el.textContent = label;
  }
}
