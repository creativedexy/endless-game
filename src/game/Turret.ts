import * as THREE from 'three';
import { COLORS, TURRET_MAX_LEVEL, TURRET_STATS } from './constants';
import type { BuildPad } from './BuildPad';
import type { Enemy } from './Enemy';
import type { GameManager } from './GameManager';

/** Auto-firing defence tower built on a BuildPad. Levels 1–3. */
export class Turret {
  readonly group = new THREE.Group();
  readonly position: THREE.Vector3;
  level = 1;
  hp: number;
  destroyed = false;

  private head: THREE.Group;
  private barrel: THREE.Mesh;
  private bodyMat: THREE.MeshStandardMaterial;
  private headMat: THREE.MeshStandardMaterial;
  private levelPips: THREE.Mesh[] = [];
  private rangeRing: THREE.Mesh;
  private rangeRingMat: THREE.MeshBasicMaterial;
  private fireTimer = 0;
  private flashTimer = 0;
  private buildPop = 0.0;

  constructor(
    scene: THREE.Scene,
    readonly pad: BuildPad,
  ) {
    this.position = pad.position.clone();
    this.hp = this.stats.maxHp;

    this.bodyMat = new THREE.MeshStandardMaterial({
      color: COLORS.turretBase,
      flatShading: true,
      roughness: 0.6,
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 1.0, 8), this.bodyMat);
    base.position.y = 0.6;
    base.castShadow = true;
    this.group.add(base);

    this.head = new THREE.Group();
    this.head.position.y = 1.35;
    this.headMat = new THREE.MeshStandardMaterial({
      color: COLORS.turretHead,
      flatShading: true,
      roughness: 0.4,
    });
    const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.75), this.headMat);
    headBox.castShadow = true;
    this.head.add(headBox);

    this.barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 0.8, 6),
      new THREE.MeshStandardMaterial({ color: 0x33415e, flatShading: true }),
    );
    this.barrel.rotation.x = Math.PI / 2;
    this.barrel.position.set(0, 0.05, 0.55);
    this.head.add(this.barrel);
    this.group.add(this.head);

    // Small glowing pips show the current level.
    const pipGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    for (let i = 0; i < TURRET_MAX_LEVEL; i++) {
      const pip = new THREE.Mesh(
        pipGeo,
        new THREE.MeshBasicMaterial({ color: COLORS.padRing }),
      );
      pip.position.set(-0.32 + i * 0.32, 1.05, 0.45);
      pip.visible = i === 0;
      this.levelPips.push(pip);
      this.group.add(pip);
    }

    this.rangeRingMat = new THREE.MeshBasicMaterial({
      color: COLORS.turretHead,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    this.rangeRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.02, 48), this.rangeRingMat);
    this.rangeRing.rotation.x = -Math.PI / 2;
    this.rangeRing.position.y = 0.07;
    this.rangeRing.visible = false;
    this.updateRangeRing();

    this.group.add(this.rangeRing);
    this.group.position.copy(this.position);
    this.buildPop = 0.35;
    this.group.scale.setScalar(0.01);
    scene.add(this.group);
  }

  get stats() {
    return TURRET_STATS[this.level - 1];
  }

  get isDamaged() {
    return this.hp < this.stats.maxHp;
  }

  get canUpgrade() {
    return this.level < TURRET_MAX_LEVEL;
  }

  upgrade() {
    if (!this.canUpgrade) return;
    this.level++;
    // Keep the same missing-HP fraction so upgrading also feels like a heal.
    this.hp = Math.min(this.stats.maxHp, this.hp + (this.stats.maxHp - TURRET_STATS[this.level - 2].maxHp));
    this.levelPips.forEach((pip, i) => (pip.visible = i < this.level));
    const scale = 1 + (this.level - 1) * 0.18;
    this.group.scale.setScalar(scale * 0.85);
    this.buildPop = 0.3;
    this.headMat.color.setHex(this.level === 3 ? 0x9a5cff : COLORS.turretHead);
    this.updateRangeRing();
  }

  private updateRangeRing() {
    // The ring is a child of the (scaled) group, so divide by the final scale.
    const finalScale = 1 + (this.level - 1) * 0.18;
    const r = this.stats.range / finalScale;
    this.rangeRing.geometry.dispose();
    this.rangeRing.geometry = new THREE.RingGeometry(r - 0.12, r, 48);
  }

  takeDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
    this.flashTimer = 0.1;
    if (this.hp <= 0) this.destroyed = true;
  }

  repair(amount: number) {
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
  }

  setRangeVisible(visible: boolean) {
    this.rangeRing.visible = visible;
  }

  update(dt: number, enemies: Enemy[], game: GameManager) {
    // Build/upgrade pop animation.
    if (this.buildPop > 0) {
      this.buildPop -= dt;
      const target = 1 + (this.level - 1) * 0.18;
      const t = 1 - Math.max(0, this.buildPop) / 0.35;
      this.group.scale.setScalar(target * (0.3 + 0.7 * t * t) * (1 + Math.sin(t * Math.PI) * 0.12));
      if (this.buildPop <= 0) this.group.scale.setScalar(target);
    }

    // Hit flash + damage tint.
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.bodyMat.emissive.setHex(0xff4444);
      this.bodyMat.emissiveIntensity = 0.8;
    } else {
      this.bodyMat.emissiveIntensity = 0;
      const frac = this.hp / this.stats.maxHp;
      this.bodyMat.color.setHex(COLORS.turretBase).lerp(new THREE.Color(0x5e3434), 1 - frac);
    }

    // Acquire the nearest enemy in range and fire.
    this.fireTimer -= dt;
    let target: Enemy | null = null;
    let best = this.stats.range;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = e.position.distanceTo(this.position);
      if (d < best) {
        best = d;
        target = e;
      }
    }

    if (target) {
      const dx = target.position.x - this.position.x;
      const dz = target.position.z - this.position.z;
      this.head.rotation.y = Math.atan2(dx, dz);
      if (this.fireTimer <= 0) {
        this.fireTimer = 1 / this.stats.fireRate;
        const muzzle = new THREE.Vector3(0, 0.05, 0.95)
          .applyEuler(this.head.rotation)
          .multiply(this.group.scale)
          .add(this.position)
          .setY(1.35 * this.group.scale.y);
        game.fireProjectile(muzzle, target, this.stats.damage);
      }
    }
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
  }
}
