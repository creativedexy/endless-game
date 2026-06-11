import * as THREE from 'three';
import { COLORS } from './constants';
import type { Structure } from './Structure';

/**
 * A fixed hex pad where one structure can be placed. The ring glows
 * brighter when the player is close, and softly when anything is
 * affordable, so buildable spots read at a glance.
 */
export class BuildPad {
  readonly position: THREE.Vector3;
  structure: Structure | null = null;

  private ring: THREE.Mesh;
  private ringMat: THREE.MeshBasicMaterial;
  private progressRing: THREE.Mesh;
  private progressMat: THREE.MeshBasicMaterial;
  private progressShown = 0;
  private pulse = Math.random() * 10;
  private near = false;
  private affordable = false;
  private denyPulse = 0;

  constructor(scene: THREE.Scene, x: number, z: number) {
    this.position = new THREE.Vector3(x, 0, z);

    const slab = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.4, 0.18, 6),
      new THREE.MeshStandardMaterial({ color: COLORS.pad, flatShading: true, roughness: 0.8 }),
    );
    slab.position.set(x, 0.09, z);
    slab.receiveShadow = true;
    scene.add(slab);

    this.ringMat = new THREE.MeshBasicMaterial({
      color: COLORS.padRing,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.3, 6), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.set(x, 0.2, z);
    scene.add(this.ring);

    // Dwell progress: an arc that sweeps around the pad while the player
    // stands on it. Geometry is rebuilt only when the fraction changes.
    this.progressMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.progressRing = new THREE.Mesh(new THREE.BufferGeometry(), this.progressMat);
    this.progressRing.rotation.x = -Math.PI / 2;
    this.progressRing.position.set(x, 0.24, z);
    this.progressRing.visible = false;
    scene.add(this.progressRing);
  }

  /** Show the dwell arc (0..1). Pass 0 to hide. */
  setProgress(fraction: number, color: number) {
    if (fraction <= 0) {
      if (this.progressRing.visible) this.progressRing.visible = false;
      this.progressShown = 0;
      return;
    }
    this.progressMat.color.setHex(color);
    this.progressRing.visible = true;
    if (Math.abs(fraction - this.progressShown) < 0.02) return;
    this.progressShown = fraction;
    this.progressRing.geometry.dispose();
    this.progressRing.geometry = new THREE.RingGeometry(
      1.45,
      1.7,
      32,
      1,
      Math.PI / 2,
      -fraction * Math.PI * 2,
    );
  }

  /** Brief red flare when the player dwells but can't afford the action. */
  pulseDenied() {
    this.denyPulse = 0.5;
  }

  get isEmpty() {
    return this.structure === null || this.structure.destroyed;
  }

  setState(near: boolean, affordable: boolean) {
    this.near = near;
    this.affordable = affordable;
  }

  update(dt: number) {
    this.pulse += dt * 3;
    this.ring.rotation.z += dt * 0.4;
    if (this.denyPulse > 0) {
      this.denyPulse -= dt;
      this.ringMat.color.setHex(0xff5346);
      this.ringMat.opacity = 0.5 + Math.sin(this.denyPulse * 25) * 0.3;
      return;
    }
    if (!this.isEmpty) {
      this.ringMat.color.setHex(COLORS.padRing);
      this.ringMat.opacity = 0.08;
      return;
    }
    if (this.near) {
      this.ringMat.color.setHex(this.affordable ? COLORS.padRing : 0xff7a5e);
      this.ringMat.opacity = 0.65 + Math.sin(this.pulse * 2) * 0.2;
    } else if (this.affordable) {
      this.ringMat.color.setHex(COLORS.padRing);
      this.ringMat.opacity = 0.3 + Math.sin(this.pulse) * 0.12;
    } else {
      this.ringMat.color.setHex(COLORS.padRing);
      this.ringMat.opacity = 0.12;
    }
  }
}
