import * as THREE from 'three';
import type { Archer } from './Archer';
import { ARCHER_REBUILD_TIME, COLORS, FACTORY_STATS, MAX_ARCHERS } from './constants';
import type { GameManager } from './GameManager';
import { Structure } from './Structure';

/**
 * Drone factory: builds and maintains archer drones that follow the
 * player. Each level supports more drones; lost drones are rebuilt after
 * a delay. A global squad cap keeps the screen readable.
 */
export class Factory extends Structure {
  /** Drones this factory is responsible for. */
  readonly archers: Archer[] = [];
  private rebuildTimer = 1.2; // first drone comes online quickly
  private rotor: THREE.Mesh;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    super(scene, position, 'factory', FACTORY_STATS[0].maxHp, 1.0);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x7a7466,
      flatShading: true,
      roughness: 0.75,
    });
    this.tintMaterials.push(bodyMat);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.1, 0.9, 6), bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    this.group.add(body);

    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), bodyMat);
    tower.position.y = 1.2;
    tower.rotation.y = Math.PI / 6;
    this.group.add(tower);

    // Warning-yellow assembly rotor on top.
    this.rotor = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.08, 0.18),
      new THREE.MeshStandardMaterial({
        color: COLORS.factory,
        emissive: COLORS.factory,
        emissiveIntensity: 0.6,
        flatShading: true,
      }),
    );
    this.rotor.position.y = 1.7;
    this.group.add(this.rotor);

    this.group.scale.setScalar(0.01);
  }

  get stats() {
    return FACTORY_STATS[this.level - 1];
  }

  protected maxHpForLevel(level: number) {
    return FACTORY_STATS[level - 1].maxHp;
  }

  protected markerHeight() {
    return 2.3;
  }

  protected onUpdate(dt: number, game: GameManager) {
    const targetScale = 1 + (this.level - 1) * 0.15;
    if (this.group.scale.x < targetScale) {
      this.group.scale.setScalar(
        Math.min(targetScale, this.group.scale.x + dt * 4 * targetScale),
      );
    }

    this.rotor.rotation.y += dt * 2.5;

    // Drop dead drones from our roster, then rebuild toward the cap.
    for (let i = this.archers.length - 1; i >= 0; i--) {
      if (this.archers[i].dead) this.archers.splice(i, 1);
    }

    const wantMore =
      this.archers.length < this.stats.maxArchers && game.archers.length < MAX_ARCHERS;
    if (!wantMore) {
      this.rebuildTimer = ARCHER_REBUILD_TIME;
      return;
    }
    this.rebuildTimer -= dt;
    if (this.rebuildTimer <= 0) {
      this.rebuildTimer = ARCHER_REBUILD_TIME;
      const archer = game.spawnArcher(this.position);
      this.archers.push(archer);
    }
  }
}
