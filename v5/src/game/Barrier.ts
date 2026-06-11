import * as THREE from 'three';
import { BARRIER_RADIUS, BARRIER_STATS, COLORS } from './constants';
import type { GameManager } from './GameManager';
import { Structure } from './Structure';

const FENCE_HALF_WIDTH = 4.4;

/**
 * A shield fence spanning a ridge gap: emitter posts with a humming
 * energy field between them. Aliens can't pass and must chew through it
 * — the player and drones walk straight through. The big floating bar
 * shows its health from across the map.
 */
export class Barrier extends Structure {
  private field: THREE.Mesh;
  private fieldMat: THREE.MeshBasicMaterial;
  private barFill: THREE.Mesh;
  private barGroup: THREE.Group;
  private hum = Math.random() * 10;

  constructor(scene: THREE.Scene, position: THREE.Vector3, facingAngle: number) {
    super(scene, position, 'barrier', BARRIER_STATS[0].maxHp, BARRIER_RADIUS);

    // Local X runs along the fence; rotate so it lies tangent to the gap.
    this.group.rotation.y = -facingAngle - Math.PI / 2;

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x5a6a85,
      flatShading: true,
    });
    this.tintMaterials.push(postMat);
    for (const fx of [-FENCE_HALF_WIDTH, 0, FENCE_HALF_WIDTH]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.9, 6), postMat);
      post.position.set(fx, 0.95, 0);
      post.castShadow = true;
      this.group.add(post);
      const tip = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.2),
        new THREE.MeshBasicMaterial({ color: COLORS.shipGlow }),
      );
      tip.position.set(fx, 2.0, 0);
      this.group.add(tip);
    }

    // The energy field itself.
    this.fieldMat = new THREE.MeshBasicMaterial({
      color: COLORS.shipGlow,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.field = new THREE.Mesh(
      new THREE.PlaneGeometry(FENCE_HALF_WIDTH * 2, 1.7),
      this.fieldMat,
    );
    this.field.position.y = 1.0;
    this.group.add(this.field);

    // Floating health bar, readable from across the map (flat, top-down).
    this.barGroup = new THREE.Group();
    const barBg = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 0.42),
      new THREE.MeshBasicMaterial({ color: 0x0a1020, transparent: true, opacity: 0.6 }),
    );
    this.barGroup.add(barBg);
    this.barFill = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 0.26),
      new THREE.MeshBasicMaterial({ color: 0x5cffd9 }),
    );
    this.barFill.position.z = 0.01;
    this.barGroup.add(this.barFill);
    this.barGroup.rotation.x = -Math.PI / 2;
    this.barGroup.position.y = 3.0;
    this.barGroup.visible = false;
    this.group.add(this.barGroup);

    this.group.scale.setScalar(0.01);
  }

  protected maxHpForLevel(level: number) {
    return BARRIER_STATS[level - 1].maxHp;
  }

  protected markerHeight() {
    return 2.4;
  }

  protected onUpdate(dt: number, _game: GameManager) {
    if (this.group.scale.x < 1) {
      this.group.scale.setScalar(Math.min(1, this.group.scale.x + dt * 4));
    }

    // Field hums and dims as it weakens.
    this.hum += dt * 6;
    const frac = this.hp / this.maxHp;
    this.fieldMat.opacity = (0.18 + frac * 0.18) * (1 + Math.sin(this.hum) * 0.15);
    this.fieldMat.color.setHex(frac > 0.5 ? COLORS.shipGlow : frac > 0.25 ? 0xffc14d : 0xff5346);

    // Health bar only when damaged.
    this.barGroup.visible = this.isDamaged;
    if (this.barGroup.visible) {
      this.barFill.scale.x = Math.max(0.02, frac);
      this.barFill.position.x = -2.2 * (1 - frac);
      (this.barFill.material as THREE.MeshBasicMaterial).color.setHex(
        frac > 0.5 ? 0x5cffd9 : frac > 0.25 ? 0xffc14d : 0xff5346,
      );
    }
  }
}
