import * as THREE from 'three';
import { COLORS, MINE_STATS } from './constants';
import type { GameManager } from './GameManager';
import { Structure } from './Structure';

/**
 * A mine built on an ore deposit out in the wilds. Pays out both energy
 * and salvage every tick — the richest economy building, in the most
 * dangerous real estate.
 */
export class Mine extends Structure {
  private drill: THREE.Mesh;
  private tickTimer: number;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    super(scene, position, 'mine', MINE_STATS[0].maxHp, 1.0);
    this.tickTimer = MINE_STATS[0].tickInterval;

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x6b5a48,
      flatShading: true,
      roughness: 0.8,
    });
    this.tintMaterials.push(frameMat);

    // A-frame derrick over the deposit.
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.0, 0.16), frameMat);
      leg.position.set(side * 0.65, 1.0, 0);
      leg.rotation.z = side * -0.32;
      leg.castShadow = true;
      this.group.add(leg);
    }
    const cross = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.14, 0.14), frameMat);
    cross.position.y = 1.9;
    this.group.add(cross);

    // Spinning drill bit sunk into the ore.
    this.drill = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 1.2, 6),
      new THREE.MeshStandardMaterial({
        color: 0x9aa7c7,
        emissive: COLORS.salvage,
        emissiveIntensity: 0.4,
        flatShading: true,
      }),
    );
    this.drill.rotation.x = Math.PI;
    this.drill.position.y = 1.1;
    this.group.add(this.drill);

    const hopper = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), frameMat);
    hopper.position.set(0.9, 0.25, 0.5);
    hopper.castShadow = true;
    this.group.add(hopper);

    this.group.scale.setScalar(0.01);
  }

  get stats() {
    return MINE_STATS[this.level - 1];
  }

  protected maxHpForLevel(level: number) {
    return MINE_STATS[level - 1].maxHp;
  }

  protected markerHeight() {
    return 2.6;
  }

  protected onUpdate(dt: number, game: GameManager) {
    const targetScale = 1 + (this.level - 1) * 0.15;
    if (this.group.scale.x < targetScale) {
      this.group.scale.setScalar(
        Math.min(targetScale, this.group.scale.x + dt * 4 * targetScale),
      );
    }

    this.drill.rotation.y += dt * (4 + this.level * 2);
    this.drill.position.y = 1.1 + Math.sin(performance.now() / 180) * 0.06;

    this.tickTimer -= dt;
    if (this.tickTimer <= 0) {
      this.tickTimer = this.stats.tickInterval;
      game.mineTick(this, this.stats.energyPerTick, this.stats.salvagePerTick);
    }
  }
}
