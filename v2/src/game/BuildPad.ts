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
  private pulse = Math.random() * 10;
  private near = false;
  private affordable = false;

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
    if (!this.isEmpty) {
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
