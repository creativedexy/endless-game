import * as THREE from 'three';
import { COLORS, EXTRACTOR_STATS } from './constants';
import type { GameManager } from './GameManager';
import { Structure } from './Structure';

/**
 * Power relay: a humming pylon that trickles energy into your reserves
 * every few seconds. An economy decision — it pays for itself if you can
 * keep it alive.
 */
export class Extractor extends Structure {
  private crystal: THREE.Mesh;
  private tickTimer: number;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    super(scene, position, 'extractor', EXTRACTOR_STATS[0].maxHp, 0.8);
    this.tickTimer = EXTRACTOR_STATS[0].tickInterval;

    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x5a6a85,
      flatShading: true,
    });
    this.tintMaterials.push(baseMat);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.5, 6), baseMat);
    base.position.y = 0.25;
    base.castShadow = true;
    this.group.add(base);

    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.3, 6), baseMat);
    pylon.position.y = 1.0;
    this.group.add(pylon);

    this.crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.4),
      new THREE.MeshStandardMaterial({
        color: COLORS.extractor,
        emissive: COLORS.extractor,
        emissiveIntensity: 0.9,
        flatShading: true,
      }),
    );
    this.crystal.position.y = 1.9;
    this.group.add(this.crystal);

    this.group.scale.setScalar(0.01);
  }

  get stats() {
    return EXTRACTOR_STATS[this.level - 1];
  }

  protected maxHpForLevel(level: number) {
    return EXTRACTOR_STATS[level - 1].maxHp;
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

    this.crystal.rotation.y += dt * (1 + this.level * 0.6);

    this.tickTimer -= dt;
    if (this.tickTimer <= 0) {
      this.tickTimer = this.stats.tickInterval;
      game.extractorTick(this, this.stats.energyPerTick);
    }
  }
}
