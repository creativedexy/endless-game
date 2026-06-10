import * as THREE from 'three';
import { COLORS, TURRET_STATS } from './constants';
import type { Turret } from './Turret';

/** A fixed spot where the player can construct a turret. */
export class BuildPad {
  readonly group = new THREE.Group();
  readonly position: THREE.Vector3;
  turret: Turret | null = null;

  private ring: THREE.Mesh;
  private ringMat: THREE.MeshBasicMaterial;
  private rangePreview: THREE.Mesh;
  private time = Math.random() * 10;

  constructor(scene: THREE.Scene, x: number, z: number) {
    this.position = new THREE.Vector3(x, 0, z);

    const slab = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.3, 0.18, 6),
      new THREE.MeshStandardMaterial({ color: COLORS.pad, flatShading: true, roughness: 0.8 }),
    );
    slab.position.y = 0.09;
    slab.receiveShadow = true;
    this.group.add(slab);

    this.ringMat = new THREE.MeshBasicMaterial({
      color: COLORS.padRing,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.15, 24), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.2;
    this.group.add(this.ring);

    // Shows the level-1 turret range while standing on an empty pad.
    const r = TURRET_STATS[0].range;
    this.rangePreview = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.12, r, 48),
      new THREE.MeshBasicMaterial({
        color: COLORS.padRing,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      }),
    );
    this.rangePreview.rotation.x = -Math.PI / 2;
    this.rangePreview.position.y = 0.06;
    this.rangePreview.visible = false;
    this.group.add(this.rangePreview);

    this.group.position.copy(this.position);
    scene.add(this.group);
  }

  get isEmpty() {
    return this.turret === null;
  }

  /** Highlight when the player is close enough to interact. */
  setHighlight(active: boolean, affordable = true) {
    this.ringMat.color.setHex(active ? (affordable ? 0x6dffd6 : 0xff8a6d) : COLORS.padRing);
    this.ringMat.opacity = active ? 0.95 : 0.5;
    this.rangePreview.visible = active && this.isEmpty;
  }

  update(dt: number) {
    this.time += dt;
    if (this.isEmpty) {
      this.ring.position.y = 0.2 + Math.sin(this.time * 2.4) * 0.05;
    }
  }
}
