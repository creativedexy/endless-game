import * as THREE from 'three';
import type { Enemy } from './Enemy';

const MAX_LIFE = 1.6;

/**
 * A glowing bolt fired by the player or a turret. Pooled by the
 * GameManager, which also performs the collision checks against enemies.
 */
export class Projectile {
  readonly mesh: THREE.Mesh;
  readonly velocity = new THREE.Vector3();
  damage = 0;
  active = false;
  fromPlayer = false; // player bolts splash into the horde
  private homingTarget: Enemy | null = null;
  private speed = 0;
  private life = 0;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  fire(
    from: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number,
    color: number,
    homingTarget: Enemy | null = null,
  ) {
    this.active = true;
    this.mesh.visible = true;
    this.mesh.position.copy(from);
    (this.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    this.damage = damage;
    this.speed = speed;
    this.life = MAX_LIFE;
    this.homingTarget = homingTarget;
    this.velocity.copy(direction).setY(0).normalize().multiplyScalar(speed);
  }

  update(dt: number) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.deactivate();
      return;
    }

    // Light homing while the target is alive; otherwise fly straight.
    if (this.homingTarget && !this.homingTarget.dead) {
      const desired = this.homingTarget.position
        .clone()
        .setY(this.mesh.position.y)
        .sub(this.mesh.position)
        .normalize()
        .multiplyScalar(this.speed);
      this.velocity.lerp(desired, Math.min(1, dt * 10));
    } else {
      this.homingTarget = null;
    }

    this.mesh.position.addScaledVector(this.velocity, dt);
  }

  deactivate() {
    this.active = false;
    this.mesh.visible = false;
    this.homingTarget = null;
  }
}
