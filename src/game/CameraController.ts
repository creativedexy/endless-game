import * as THREE from 'three';

const OFFSET = new THREE.Vector3(0, 17, 12.5);
const FOLLOW_SPEED = 5;
const LOOK_AHEAD = 0.45; // seconds of player velocity to lead the camera

/** Isometric-style chase camera that smoothly follows the player. */
export class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  private focus = new THREE.Vector3();

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      48,
      window.innerWidth / window.innerHeight,
      0.5,
      200,
    );
    this.camera.position.copy(OFFSET);
    this.camera.lookAt(0, 0, 0);
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
    this.camera.lookAt(this.focus.x, 0, this.focus.z);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
