import * as THREE from 'three';
import { ARCHER_STATS, COLORS } from './constants';
import type { Enemy } from './Enemy';
import type { GameManager } from './GameManager';

const MELEE_SWIPE_DPS = 10; // enemies opportunistically claw drones in reach

/**
 * An archer drone built by a Drone Factory. Hovers behind the player in a
 * loose formation, auto-fires at the nearest alien in range, and can be
 * clawed down by enemies it strays too close to — its factory will
 * rebuild it after a delay.
 */
export class Archer {
  readonly group = new THREE.Group();
  readonly position: THREE.Vector3;
  hp = ARCHER_STATS.hp;
  dead = false;

  private bodyMat: THREE.MeshStandardMaterial;
  private eye: THREE.Mesh;
  private fireTimer = Math.random() * ARCHER_STATS.fireInterval;
  private flashTimer = 0;
  private bobPhase = Math.random() * 10;
  private spawnPop = 0.3;

  constructor(scene: THREE.Scene, spawnAt: THREE.Vector3) {
    this.position = spawnAt.clone();

    this.bodyMat = new THREE.MeshStandardMaterial({
      color: COLORS.archer,
      flatShading: true,
      roughness: 0.5,
    });
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), this.bodyMat);
    body.castShadow = true;
    this.group.add(body);

    // Stubby wings so it reads as a drone, not a pickup.
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x5a6a85, flatShading: true });
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.16), wingMat);
      wing.position.set(side * 0.32, 0.05, 0);
      this.group.add(wing);
    }

    this.eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 6),
      new THREE.MeshBasicMaterial({ color: COLORS.shipGlow }),
    );
    this.eye.position.set(0, 0.02, 0.26);
    this.group.add(this.eye);

    this.group.position.copy(this.position).setY(1.2);
    this.group.scale.setScalar(0.01);
    scene.add(this.group);
  }

  takeDamage(amount: number) {
    if (this.dead) return;
    this.hp -= amount;
    this.flashTimer = 0.08;
    if (this.hp <= 0) this.dead = true;
  }

  /** `slot` is this drone's index in the squad, used for formation offsets. */
  update(dt: number, game: GameManager, slot: number) {
    if (this.dead) return;

    // Formation target: behind the player, fanned left/right per slot.
    const back = game.player.facing.clone().multiplyScalar(-1);
    const side = new THREE.Vector3(-back.z, 0, back.x);
    const row = Math.floor(slot / 2);
    const lateral = (slot % 2 === 0 ? -1 : 1) * (1.0 + row * 0.5);
    const target = game.player.position
      .clone()
      .addScaledVector(back, 1.6 + row * 0.9)
      .addScaledVector(side, lateral);

    // Chase the slot smoothly; drones fly a bit faster than the player runs.
    const toTarget = target.sub(this.position).setY(0);
    const dist = toTarget.length();
    if (dist > 0.05) {
      const step = Math.min(dist, ARCHER_STATS.speed * dt * Math.min(1, dist / 1.5 + 0.3));
      this.position.addScaledVector(toTarget.normalize(), step);
    }

    // Shoot the nearest alien in range.
    this.fireTimer -= dt;
    let best: Enemy | null = null;
    let bestDist = ARCHER_STATS.range;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const d = this.position.distanceTo(e.position);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }

    if (best) {
      this.group.rotation.y = Math.atan2(
        best.position.x - this.position.x,
        best.position.z - this.position.z,
      );
      if (this.fireTimer <= 0) {
        this.fireTimer = ARCHER_STATS.fireInterval;
        const from = this.position.clone().setY(1.2);
        const dir = best.position.clone().setY(1.2).sub(from);
        game.fireProjectile(
          from,
          dir,
          ARCHER_STATS.projectileSpeed,
          ARCHER_STATS.damage,
          COLORS.archer,
          best,
          true, // silent like the player's gun — turret pews would get noisy
        );
      }
      // Enemies in claw reach swipe back.
      if (bestDist < best.radius + 0.7) {
        this.takeDamage(MELEE_SWIPE_DPS * dt);
      }
    } else if (this.position.distanceToSquared(game.player.position) > 0.5) {
      this.group.rotation.y = Math.atan2(
        game.player.position.x - this.position.x,
        game.player.position.z - this.position.z,
      );
    }

    // Hover bob + spawn pop + hit flash.
    this.bobPhase += dt * 4;
    this.group.position.set(
      this.position.x,
      1.2 + Math.sin(this.bobPhase) * 0.1,
      this.position.z,
    );
    if (this.spawnPop > 0) {
      this.spawnPop -= dt;
      this.group.scale.setScalar(1 - (Math.max(0, this.spawnPop) / 0.3) * 0.99);
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.bodyMat.emissive.setHex(0xffffff);
      this.bodyMat.emissiveIntensity = 0.9;
    } else {
      this.bodyMat.emissive.setHex(0x000000);
      this.bodyMat.emissiveIntensity = 0;
    }
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    this.bodyMat.dispose();
  }
}
