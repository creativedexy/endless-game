import * as THREE from 'three';
import { COLORS, FORGE_STATS } from './constants';
import type { GameManager } from './GameManager';
import { Structure } from './Structure';

/**
 * Salvage forge: the scrap-economy twin of the Power Relay. Chews through
 * wreck debris and trickles salvage into your reserves.
 */
export class Forge extends Structure {
  private wheel: THREE.Mesh;
  private tickTimer: number;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    super(scene, position, 'forge', FORGE_STATS[0].maxHp, 0.85);
    this.tickTimer = FORGE_STATS[0].tickInterval;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x6b5a48,
      flatShading: true,
      roughness: 0.8,
    });
    this.tintMaterials.push(bodyMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.1), bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    this.group.add(body);

    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.8, 6), bodyMat);
    chimney.position.set(-0.3, 1.2, -0.3);
    this.group.add(chimney);

    // A glowing grinder wheel on top that spins faster per level.
    this.wheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.12, 6, 10),
      new THREE.MeshStandardMaterial({
        color: COLORS.forge,
        emissive: COLORS.forge,
        emissiveIntensity: 0.7,
        flatShading: true,
      }),
    );
    this.wheel.position.set(0.15, 1.05, 0.1);
    this.wheel.rotation.x = Math.PI / 2.4;
    this.group.add(this.wheel);

    this.group.scale.setScalar(0.01);
  }

  get stats() {
    return FORGE_STATS[this.level - 1];
  }

  protected maxHpForLevel(level: number) {
    return FORGE_STATS[level - 1].maxHp;
  }

  protected markerHeight() {
    return 2.0;
  }

  protected onUpdate(dt: number, game: GameManager) {
    const targetScale = 1 + (this.level - 1) * 0.15;
    if (this.group.scale.x < targetScale) {
      this.group.scale.setScalar(
        Math.min(targetScale, this.group.scale.x + dt * 4 * targetScale),
      );
    }

    this.wheel.rotation.z += dt * (2 + this.level);

    this.tickTimer -= dt;
    if (this.tickTimer <= 0) {
      this.tickTimer = this.stats.tickInterval;
      game.forgeTick(this, this.stats.salvagePerTick);
    }
  }
}
