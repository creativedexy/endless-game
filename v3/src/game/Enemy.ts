import * as THREE from 'three';
import { COLORS, RIDGE_RADIUS, type EnemyKind } from './constants';
import type { GameManager } from './GameManager';
import { inGap, nearestGapPoint } from './ridge';
import type { Structure } from './Structure';

export interface EnemyStats {
  kind: EnemyKind;
  hp: number;
  speed: number;
  damage: number;
}

const ATTACK_INTERVAL = 0.9;
const RETARGET_INTERVAL = 1.0;

const KIND_VISUALS: Record<
  EnemyKind,
  { color: number; size: number; radius: number; hop: number }
> = {
  crawler: { color: COLORS.enemyCrawler, size: 0.5, radius: 0.5, hop: 0.18 },
  skitterer: { color: COLORS.enemySkitterer, size: 0.36, radius: 0.38, hop: 0.3 },
  brute: { color: COLORS.enemyBrute, size: 0.95, radius: 0.85, hop: 0.08 },
};

/**
 * Alien lifeforms drawn to the heat of the wreck.
 * - crawlers head straight for the ship
 * - skitterers harass the nearest structure
 * - brutes lumber at the ship and hit walls/hull extra hard
 * Any enemy that bumps into a structure on the way stops to chew on it.
 */
export class Enemy {
  readonly mesh: THREE.Mesh;
  readonly position: THREE.Vector3;
  readonly radius: number;
  readonly colorHex: number;
  hp: number;
  maxHp: number;
  dead = false;

  private material: THREE.MeshStandardMaterial;
  private attackTimer = Math.random() * 0.4;
  private retargetTimer = 0;
  private flashTimer = 0;
  private spawnPop = 0.3;
  private wobble = Math.random() * 10;
  private hopHeight: number;
  private targetPos = new THREE.Vector3();
  private targetStructure: Structure | null = null;
  private bumpedStructure: Structure | null = null;
  private targetRadius = 1.8;

  constructor(
    scene: THREE.Scene,
    x: number,
    z: number,
    readonly stats: EnemyStats,
  ) {
    this.hp = this.maxHp = stats.hp;
    this.position = new THREE.Vector3(x, 0, z);

    const vis = KIND_VISUALS[stats.kind];
    this.radius = vis.radius;
    this.colorHex = vis.color;
    this.hopHeight = vis.hop;
    // Faint self-glow so aliens read clearly against the pale snow.
    this.material = new THREE.MeshStandardMaterial({
      color: vis.color,
      emissive: vis.color,
      emissiveIntensity: 0.25,
      flatShading: true,
      roughness: 0.5,
    });
    const geo =
      stats.kind === 'brute'
        ? new THREE.DodecahedronGeometry(vis.size, 0)
        : stats.kind === 'skitterer'
          ? new THREE.TetrahedronGeometry(vis.size * 1.4, 0)
          : new THREE.IcosahedronGeometry(vis.size, 0);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.set(x, vis.size, z);
    this.mesh.castShadow = true;
    this.mesh.scale.setScalar(0.01);
    scene.add(this.mesh);
  }

  get kind() {
    return this.stats.kind;
  }

  takeDamage(amount: number, knockback?: THREE.Vector3) {
    if (this.dead) return;
    this.hp -= amount;
    this.flashTimer = 0.08;
    if (knockback) this.position.add(knockback);
    if (this.hp <= 0) this.dead = true;
  }

  private retarget(game: GameManager) {
    this.targetStructure = null;

    if (this.stats.kind === 'skitterer') {
      // Skitterers harass the nearest structure; fall back to the ship.
      let bestDist = Infinity;
      for (const s of game.structures) {
        if (s.destroyed) continue;
        const d = this.position.distanceTo(s.position);
        if (d < bestDist) {
          bestDist = d;
          this.targetStructure = s;
        }
      }
    }

    if (this.targetStructure) {
      this.targetPos.copy(this.targetStructure.position);
      this.targetRadius = this.targetStructure.radius;
    } else {
      this.targetPos.copy(game.ship.position);
      this.targetRadius = game.ship.radius;
    }
  }

  update(dt: number, game: GameManager) {
    if (this.dead) return;

    this.retargetTimer -= dt;
    if (this.retargetTimer <= 0) {
      this.retargetTimer = RETARGET_INTERVAL;
      if (!this.bumpedStructure) this.retarget(game);
    }

    // If something stood in the way earlier, keep attacking it.
    if (this.bumpedStructure) {
      if (this.bumpedStructure.destroyed) {
        this.bumpedStructure = null;
        this.retarget(game);
      } else {
        this.targetStructure = this.bumpedStructure;
        this.targetPos.copy(this.bumpedStructure.position);
        this.targetRadius = this.bumpedStructure.radius;
      }
    } else if (this.targetStructure?.destroyed) {
      this.retarget(game);
    }

    // Ridge navigation: anything outside the ridge whose target is inside
    // walks to the nearest gap first instead of face-planting into crags.
    let moveTarget = this.targetPos;
    let atTarget = true;
    const myR = Math.hypot(this.position.x, this.position.z);
    if (myR > RIDGE_RADIUS + 0.4) {
      const targetR = Math.hypot(this.targetPos.x, this.targetPos.z);
      const myAngle = Math.atan2(this.position.z, this.position.x);
      if (targetR < RIDGE_RADIUS - 0.4 && !inGap(myAngle)) {
        moveTarget = nearestGapPoint(this.position);
        atTarget = false;
      }
    }

    const toTarget = moveTarget.clone().sub(this.position).setY(0);
    const dist = toTarget.length();
    const reach = this.targetRadius + this.radius + 0.25;

    if (dist > reach || !atTarget) {
      toTarget.normalize();
      this.position.addScaledVector(toTarget, this.stats.speed * dt);
      this.mesh.rotation.y = Math.atan2(toTarget.x, toTarget.z);

      // Bump into any structure en route -> start chewing on it.
      if (!this.bumpedStructure) {
        for (const s of game.structures) {
          if (s.destroyed || s === this.targetStructure) continue;
          const d = this.position.distanceTo(s.position);
          if (d < s.radius + this.radius + 0.15) {
            this.bumpedStructure = s;
            break;
          }
        }
      }
    } else {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.attackTimer = ATTACK_INTERVAL;
        game.enemyAttack(this);
      }
    }

    // Wobbly hop so movement reads as alive; skitterers scuttle fast.
    this.wobble += dt * (this.stats.kind === 'skitterer' ? 16 : 10);
    const vis = KIND_VISUALS[this.stats.kind];
    this.mesh.position.set(
      this.position.x,
      vis.size + Math.abs(Math.sin(this.wobble)) * this.hopHeight,
      this.position.z,
    );

    if (this.spawnPop > 0) {
      this.spawnPop -= dt;
      this.mesh.scale.setScalar(1 - (Math.max(0, this.spawnPop) / 0.3) * 0.99);
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.material.color.setHex(COLORS.enemyHit);
      this.material.emissive.setHex(0xffffff);
      this.material.emissiveIntensity = 0.9;
    } else {
      this.material.color.setHex(vis.color);
      this.material.emissive.setHex(vis.color);
      this.material.emissiveIntensity = 0.25;
    }
  }

  /** The structure this enemy is attacking, or null when it targets the ship. */
  get currentStructureTarget(): Structure | null {
    return this.bumpedStructure ?? this.targetStructure;
  }

  get attackDamage() {
    return this.stats.damage;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.material.dispose();
  }
}
