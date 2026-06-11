import * as THREE from 'three';
import { COLORS, PROJECTILE_SPEED, TURRET_STATS } from './constants';
import type { GameManager } from './GameManager';
import { Structure } from './Structure';

/** Automatic blaster tower: tracks the nearest alien in range and fires. */
export class Turret extends Structure {
  private head: THREE.Group;
  private muzzle: THREE.Mesh;
  private headMat: THREE.MeshStandardMaterial;
  private fireTimer = 0;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    super(scene, position, 'turret', TURRET_STATS[0].maxHp, 0.9);

    const baseMat = new THREE.MeshStandardMaterial({
      color: COLORS.turretBase,
      flatShading: true,
    });
    this.tintMaterials.push(baseMat);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.9, 8), baseMat);
    base.position.y = 0.45;
    base.castShadow = true;
    this.group.add(base);

    this.headMat = new THREE.MeshStandardMaterial({
      color: COLORS.turretHead,
      flatShading: true,
    });
    this.tintMaterials.push(this.headMat);
    this.head = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), this.headMat);
    this.head.add(dome);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.8, 6),
      new THREE.MeshStandardMaterial({ color: 0x44506b, flatShading: true }),
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.5;
    this.head.add(barrel);
    this.muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: COLORS.projectile }),
    );
    this.muzzle.position.z = 0.95;
    this.head.add(this.muzzle);
    this.head.position.y = 1.15;
    this.group.add(this.head);

    // Spawn pop.
    this.group.scale.setScalar(0.01);
  }

  get stats() {
    return TURRET_STATS[this.level - 1];
  }

  // V5: turrets are hardened emplacements — aliens ignore them entirely.
  get invincible() {
    return true;
  }

  protected maxHpForLevel(level: number) {
    return TURRET_STATS[level - 1].maxHp;
  }

  protected onUpgrade() {
    // Level 3 turrets get a distinctive violet head.
    if (this.level >= 3) this.headMat.color.setHex(0xa46bff);
  }

  protected markerHeight() {
    return 2.0;
  }

  protected onUpdate(dt: number, game: GameManager) {
    // Grow-in animation + size per level.
    const targetScale = 1 + (this.level - 1) * 0.18;
    if (this.group.scale.x < targetScale) {
      this.group.scale.setScalar(
        Math.min(targetScale, this.group.scale.x + dt * 4 * targetScale),
      );
    }

    this.fireTimer -= dt;
    const stats = this.stats;

    // Track the nearest living enemy in range.
    let best: { dist: number; enemy: (typeof game.enemies)[number] } | null = null;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const d = this.position.distanceTo(e.position);
      if (d <= stats.range && (!best || d < best.dist)) best = { dist: d, enemy: e };
    }
    if (!best) return;

    const dx = best.enemy.position.x - this.position.x;
    const dz = best.enemy.position.z - this.position.z;
    this.head.rotation.y = Math.atan2(dx, dz);

    if (this.fireTimer <= 0) {
      this.fireTimer = 1 / stats.fireRate;
      const from = this.muzzle.getWorldPosition(new THREE.Vector3());
      const dir = best.enemy.position.clone().setY(from.y).sub(from);
      game.fireProjectile(from, dir, PROJECTILE_SPEED, stats.damage, COLORS.projectile, best.enemy, false);
    }
  }
}
