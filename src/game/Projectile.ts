import * as THREE from 'three';
import { COLORS } from './constants';
import type { Enemy } from './Enemy';

const SPEED = 22;
const HIT_RADIUS = 0.55;
const MAX_LIFE = 2;

/** A glowing homing bolt fired by turrets. Pooled by the GameManager. */
export class Projectile {
  readonly mesh: THREE.Mesh;
  private velocity = new THREE.Vector3();
  private target: Enemy | null = null;
  damage = 0;
  active = false;
  private life = 0;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 6),
      new THREE.MeshBasicMaterial({ color: COLORS.projectile }),
    );
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  fire(from: THREE.Vector3, target: Enemy, damage: number) {
    this.active = true;
    this.mesh.visible = true;
    this.mesh.position.copy(from);
    this.target = target;
    this.damage = damage;
    this.life = MAX_LIFE;
    this.velocity
      .copy(target.position)
      .setY(0.8)
      .sub(from)
      .normalize()
      .multiplyScalar(SPEED);
  }

  /** Returns the enemy hit this frame, if any. */
  update(dt: number): Enemy | null {
    if (!this.active) return null;
    this.life -= dt;
    if (this.life <= 0) {
      this.deactivate();
      return null;
    }

    // Light homing while the target is alive; otherwise fly straight.
    if (this.target && !this.target.dead) {
      const desired = this.target.position
        .clone()
        .setY(0.8)
        .sub(this.mesh.position)
        .normalize()
        .multiplyScalar(SPEED);
      this.velocity.lerp(desired, Math.min(1, dt * 10));
    }

    this.mesh.position.addScaledVector(this.velocity, dt);

    if (this.target && !this.target.dead) {
      const d = this.mesh.position.distanceTo(
        this.target.position.clone().setY(this.mesh.position.y),
      );
      if (d < HIT_RADIUS) {
        const hit = this.target;
        this.deactivate();
        return hit;
      }
    }
    return null;
  }

  deactivate() {
    this.active = false;
    this.mesh.visible = false;
    this.target = null;
  }
}
