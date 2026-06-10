import * as THREE from 'three';
import { COLORS } from './constants';
import type { GameManager } from './GameManager';
import type { Turret } from './Turret';

export interface EnemyStats {
  hp: number;
  speed: number;
  damage: number;
}

const ATTACK_INTERVAL = 0.9;
const RETARGET_INTERVAL = 1.0;

/**
 * A small alien creature that walks toward the nearest colony structure
 * (core or turret) and gnaws on it.
 */
export class Enemy {
  readonly mesh: THREE.Mesh;
  readonly position: THREE.Vector3;
  hp: number;
  maxHp: number;
  dead = false;

  private stats: EnemyStats;
  private material: THREE.MeshStandardMaterial;
  private attackTimer = Math.random() * 0.4;
  private retargetTimer = 0;
  private flashTimer = 0;
  private spawnPop = 0.3;
  private wobble = Math.random() * 10;
  private targetPos = new THREE.Vector3();
  private targetTurret: Turret | null = null;
  private targetRadius = 1.8;

  constructor(scene: THREE.Scene, x: number, z: number, stats: EnemyStats) {
    this.stats = stats;
    this.hp = this.maxHp = stats.hp;
    this.position = new THREE.Vector3(x, 0, z);

    this.material = new THREE.MeshStandardMaterial({
      color: COLORS.enemy,
      flatShading: true,
      roughness: 0.5,
    });
    this.mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), this.material);
    this.mesh.position.set(x, 0.5, z);
    this.mesh.castShadow = true;
    this.mesh.scale.setScalar(0.01);
    scene.add(this.mesh);
  }

  takeDamage(amount: number, knockback?: THREE.Vector3) {
    if (this.dead) return;
    this.hp -= amount;
    this.flashTimer = 0.08;
    if (knockback) this.position.add(knockback);
    if (this.hp <= 0) this.dead = true;
  }

  private retarget(game: GameManager) {
    // Nearest alive structure: the core or any turret.
    let bestDist = this.position.distanceTo(game.core.position);
    this.targetTurret = null;
    this.targetPos.copy(game.core.position);
    this.targetRadius = game.core.radius;

    for (const t of game.turrets) {
      if (t.destroyed) continue;
      const d = this.position.distanceTo(t.position);
      if (d < bestDist) {
        bestDist = d;
        this.targetTurret = t;
        this.targetPos.copy(t.position);
        this.targetRadius = 0.9;
      }
    }
  }

  update(dt: number, game: GameManager) {
    if (this.dead) return;

    this.retargetTimer -= dt;
    if (this.retargetTimer <= 0) {
      this.retargetTimer = RETARGET_INTERVAL;
      this.retarget(game);
    }

    // If our turret target died between retargets, fall back to the core.
    if (this.targetTurret && this.targetTurret.destroyed) {
      this.retarget(game);
    }

    const toTarget = this.targetPos.clone().sub(this.position).setY(0);
    const dist = toTarget.length();
    const reach = this.targetRadius + 0.65;

    if (dist > reach) {
      toTarget.normalize();
      this.position.addScaledVector(toTarget, this.stats.speed * dt);
      this.mesh.rotation.y = Math.atan2(toTarget.x, toTarget.z);
    } else {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.attackTimer = ATTACK_INTERVAL;
        game.enemyAttack(this);
      }
    }

    // Wobbly hop so movement reads as alive.
    this.wobble += dt * 10;
    this.mesh.position.set(
      this.position.x,
      0.5 + Math.abs(Math.sin(this.wobble)) * 0.18,
      this.position.z,
    );

    if (this.spawnPop > 0) {
      this.spawnPop -= dt;
      this.mesh.scale.setScalar(1 - Math.max(0, this.spawnPop) / 0.3 * 0.99);
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.material.color.setHex(COLORS.enemyHit);
      this.material.emissive.setHex(0xffffff);
      this.material.emissiveIntensity = 0.9;
    } else {
      this.material.color.setHex(COLORS.enemy);
      this.material.emissive.setHex(0x000000);
      this.material.emissiveIntensity = 0;
    }
  }

  /** The turret this enemy is attacking, or null when it targets the core. */
  get currentTargetTurret(): Turret | null {
    return this.targetTurret;
  }

  get attackDamage() {
    return this.stats.damage;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.material.dispose();
  }
}
