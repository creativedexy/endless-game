// Shared input state, fed by both keyboard/mouse and touch controls.
// `firePressed` / `dashPressed` / `restartPressed` are edge-triggered and
// consumed once per frame by the GameManager.

export interface InputState {
  moveX: number; // -1..1, right positive
  moveY: number; // -1..1, up (away from camera) positive
  fireHeld: boolean;
  firePressed: boolean;
  dashPressed: boolean;
  restartPressed: boolean;
}

export function createInputState(): InputState {
  return {
    moveX: 0,
    moveY: 0,
    fireHeld: false,
    firePressed: false,
    dashPressed: false,
    restartPressed: false,
  };
}

/** WASD / arrows + Space or mouse to shoot + Shift dash + R restart. */
export class KeyboardControls {
  private keys = new Set<string>();
  private mouseHeld = false;

  constructor(private input: InputState) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseHeld = false;
    });

    // Mouse fire on desktop — ignore touch pointers (handled by MobileControls)
    // and clicks on UI buttons.
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if ((e.target as HTMLElement).closest('button, .glass-btn, #build-menu')) return;
      this.mouseHeld = true;
      this.input.firePressed = true;
    });
    window.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse') this.mouseHeld = false;
    });
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) {
      if (e.code === 'Space') e.preventDefault();
      return;
    }
    this.keys.add(e.code);
    if (e.code === 'Space') {
      this.input.firePressed = true;
      e.preventDefault();
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.input.dashPressed = true;
    }
    if (e.code === 'KeyR') {
      this.input.restartPressed = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  /** Merge keyboard movement into the shared state. Called every frame. */
  update() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (x !== 0 || y !== 0) {
      const len = Math.hypot(x, y);
      this.input.moveX = x / len;
      this.input.moveY = y / len;
    } else if (!this.touchActive) {
      this.input.moveX = 0;
      this.input.moveY = 0;
    }
    this.input.fireHeld = this.keys.has('Space') || this.mouseHeld || this.touchFireHeld;
  }

  // Set by MobileControls so keyboard doesn't zero out touch input.
  touchActive = false;
  touchFireHeld = false;
}
