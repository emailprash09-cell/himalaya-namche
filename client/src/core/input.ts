// Keyboard and mouse. Bots in ?test mode write the same state through `override`.
import type { MoveIntent } from '../sim/locomotion';

export class Input {
  readonly intent: MoveIntent = { forward: false, back: false, left: false, right: false, sprint: false };
  jumpQueued = false;
  toggleCameraQueued = false;
  toggleStatsQueued = false;
  lookDX = 0;
  lookDY = 0;
  /** Set by the test hook: keyboard is ignored while true. */
  override = false;
  private readonly canvas: HTMLElement;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => this.key(e, true));
    window.addEventListener('keyup', (e) => this.key(e, false));
    window.addEventListener('blur', () => this.releaseAll());
    canvas.addEventListener('click', () => {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
    });
    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.canvas) {
        this.lookDX += e.movementX;
        this.lookDY += e.movementY;
      }
    });
  }

  get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  private releaseAll(): void {
    this.intent.forward = this.intent.back = this.intent.left = this.intent.right = this.intent.sprint = false;
  }

  private key(e: KeyboardEvent, down: boolean): void {
    if (e.code === 'F3') {
      if (down) this.toggleStatsQueued = true;
      e.preventDefault();
      return;
    }
    if (this.override) return;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': this.intent.forward = down; break;
      case 'KeyS': case 'ArrowDown': this.intent.back = down; break;
      case 'KeyA': case 'ArrowLeft': this.intent.left = down; break;
      case 'KeyD': case 'ArrowRight': this.intent.right = down; break;
      case 'ShiftLeft': case 'ShiftRight': this.intent.sprint = down; break;
      case 'Space': if (down && !e.repeat) this.jumpQueued = true; e.preventDefault(); break;
      case 'KeyV': if (down && !e.repeat) this.toggleCameraQueued = true; break;
      default: return;
    }
  }

  consumeLook(): { dx: number; dy: number } {
    const r = { dx: this.lookDX, dy: this.lookDY };
    this.lookDX = 0; this.lookDY = 0;
    return r;
  }
}
