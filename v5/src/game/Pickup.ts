import * as THREE from 'three';
import { COLORS } from './constants';

export type PickupType = 'energy' | 'salvage';

/**
 * A collectible resource: a glowing energy crystal or a chunk of salvage.
 * Bobs in place and drifts toward the player when they come close.
 */
export class Pickup {
  readonly mesh: THREE.Object3D;
  readonly position: THREE.Vector3;
  collected = false;

  private bobPhase = Math.random() * 10;

  constructor(
    scene: THREE.Scene,
    x: number,
    z: number,
    readonly type: PickupType,
    readonly value: number,
  ) {
    this.position = new THREE.Vector3(x, 0, z);

    if (type === 'energy') {
      this.mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.36),
        new THREE.MeshStandardMaterial({
          color: COLORS.energy,
          emissive: COLORS.energy,
          emissiveIntensity: 0.85,
          flatShading: true,
        }),
      );
    } else {
      // A small cluster of scrap plates.
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({
        color: COLORS.salvage,
        emissive: COLORS.salvage,
        emissiveIntensity: 0.35,
        flatShading: true,
        roughness: 0.6,
      });
      for (let i = 0; i < 3; i++) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.24), mat);
        plate.position.set((i - 1) * 0.14, i * 0.1, (Math.random() - 0.5) * 0.15);
        plate.rotation.y = Math.random() * 1.2;
        group.add(plate);
      }
      this.mesh = group;
    }

    this.mesh.position.set(x, 0.55, z);
    scene.add(this.mesh);
  }

  update(dt: number, playerPos: THREE.Vector3, magnetRange: number) {
    // Magnet toward a nearby player so collection feels generous.
    const toPlayer = playerPos.clone().sub(this.position).setY(0);
    const dist = toPlayer.length();
    if (dist < magnetRange && dist > 0.01) {
      const pull = (1 - dist / magnetRange) * 9;
      this.position.addScaledVector(toPlayer.normalize(), pull * dt);
    }

    this.bobPhase += dt * 3;
    this.mesh.position.set(
      this.position.x,
      0.55 + Math.sin(this.bobPhase) * 0.12,
      this.position.z,
    );
    this.mesh.rotation.y += dt * 1.8;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
  }
}
