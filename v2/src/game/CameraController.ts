import * as THREE from 'three';

const OFFSET = new THREE.Vector3(0, 21, 10.5);
const FOLLOW_SPEED = 5;
const LOOK_AHEAD = 0.5; // seconds of player velocity to lead the camera

/**
 * Top-down chase camera tuned for portrait phones: the vertical field of
 * view runs along the long axis of the screen, so the player sees plenty
 * of ground ahead. Supports decaying screen shake for ship impacts.
 */
export class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  private focus = new THREE.Vector3();
  private shakeAmp = 0;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      56,
      window.innerWidth / window.innerHeight,
      0.5,
      220,
    );
    this.applyFov();
    this.camera.position.copy(OFFSET);
    this.camera.lookAt(0, 0, 0);
  }

  /** Kick the camera; intensity ~0.2 (small hit) to ~0.8 (big impact). */
  shake(intensity: number) {
    this.shakeAmp = Math.min(1, this.shakeAmp + intensity);
  }

  snapTo(target: THREE.Vector3) {
    this.focus.copy(target);
    this.camera.position.copy(target).add(OFFSET);
    this.camera.lookAt(this.focus);
  }

  update(dt: number, target: THREE.Vector3, velocity: THREE.Vector3) {
    const desired = target.clone().addScaledVector(velocity, LOOK_AHEAD);
    this.focus.lerp(desired, Math.min(1, dt * FOLLOW_SPEED));
    this.camera.position.copy(this.focus).add(OFFSET);

    if (this.shakeAmp > 0.001) {
      this.shakeAmp *= Math.max(0, 1 - dt * 6);
      const a = this.shakeAmp * 0.45;
      this.camera.position.x += (Math.random() - 0.5) * a;
      this.camera.position.y += (Math.random() - 0.5) * a * 0.5;
      this.camera.position.z += (Math.random() - 0.5) * a;
    } else {
      this.shakeAmp = 0;
    }

    this.camera.lookAt(this.focus.x, 0, this.focus.z);
  }

  private applyFov() {
    const aspect = window.innerWidth / window.innerHeight;
    // Landscape (desktop testing) needs a narrower FOV or the arena looks tiny.
    this.camera.fov = aspect > 1 ? 46 : 56;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  onResize() {
    this.applyFov();
  }
}
