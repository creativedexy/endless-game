import * as THREE from 'three';
import {
  MAX_LEVEL,
  STRUCTURE_DEFS,
  type ResourceCost,
  type StructureDef,
  type StructureKind,
} from './constants';
import type { GameManager } from './GameManager';

/**
 * Base class for everything buildable on a pad: turrets, walls,
 * extractors, repair beacons. Handles health, levels, the hit flash and
 * the pulsing "needs repair" marker. Subclasses build their own meshes
 * into `group` and override `onUpdate` / `onUpgrade`.
 */
export abstract class Structure {
  readonly group = new THREE.Group();
  readonly position: THREE.Vector3;
  readonly def: StructureDef;
  level = 1;
  hp: number;
  maxHp: number;
  destroyed = false;

  protected flashTimer = 0;
  protected tintMaterials: THREE.MeshStandardMaterial[] = [];
  private repairMarker: THREE.Mesh;
  private markerPhase = Math.random() * 10;

  constructor(
    scene: THREE.Scene,
    position: THREE.Vector3,
    readonly kind: StructureKind,
    maxHp: number,
    readonly radius: number,
  ) {
    this.def = STRUCTURE_DEFS[kind];
    this.position = position.clone();
    this.hp = this.maxHp = maxHp;

    this.repairMarker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22),
      new THREE.MeshBasicMaterial({ color: 0xff5346, transparent: true, opacity: 0.9 }),
    );
    this.repairMarker.visible = false;
    this.group.add(this.repairMarker);

    this.group.position.copy(this.position);
    scene.add(this.group);
  }

  /** Height at which the repair marker hovers; subclasses override. */
  protected markerHeight() {
    return 2.2;
  }

  get isDamaged() {
    return this.hp < this.maxHp;
  }

  /** Invincible structures are ignored by aliens and never take damage. */
  get invincible() {
    return false;
  }

  get canUpgrade() {
    return this.level < MAX_LEVEL;
  }

  get nextUpgradeCost(): ResourceCost | null {
    return this.canUpgrade ? this.def.upgradeCost[this.level - 1] : null;
  }

  takeDamage(amount: number) {
    if (this.destroyed || this.invincible) return;
    this.hp -= amount;
    this.flashTimer = 0.08;
    if (this.hp <= 0) {
      this.hp = 0;
      this.destroyed = true;
    }
  }

  repair(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  upgrade() {
    if (!this.canUpgrade) return;
    this.level += 1;
    const prevMax = this.maxHp;
    this.maxHp = this.maxHpForLevel(this.level);
    this.hp = Math.min(this.maxHp, this.hp + (this.maxHp - prevMax));
    this.onUpgrade();
  }

  protected abstract maxHpForLevel(level: number): number;
  protected onUpgrade(): void {}

  update(dt: number, game: GameManager) {
    // Hit flash + a persistent reddish tint as health drops.
    this.flashTimer -= dt;
    const healthFrac = this.hp / this.maxHp;
    for (const m of this.tintMaterials) {
      if (this.flashTimer > 0) {
        m.emissive.setHex(0xffffff);
        m.emissiveIntensity = 0.8;
      } else {
        m.emissive.setHex(0xff3020);
        m.emissiveIntensity = (1 - healthFrac) * 0.35;
      }
    }

    // Pulsing repair marker when meaningfully damaged.
    const needsRepair = healthFrac < 0.65;
    this.repairMarker.visible = needsRepair;
    if (needsRepair) {
      this.markerPhase += dt * 5;
      this.repairMarker.position.y = this.markerHeight() + Math.sin(this.markerPhase) * 0.12;
      this.repairMarker.rotation.y += dt * 3;
    }

    this.onUpdate(dt, game);
  }

  protected abstract onUpdate(dt: number, game: GameManager): void;

  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
  }
}
