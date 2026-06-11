import * as THREE from 'three';
import { SURVIVOR_SPEED, VILLAGE_COLLECT_RADIUS } from './constants';
import type { GameManager } from './GameManager';
import type { Pickup } from './Pickup';

/**
 * A villager from a Village node. Trots around the base picking up
 * nearby resource drops so the player can stay at the front. Not
 * targetable by enemies — they're flavour and economy, not units.
 */
export class Survivor {
  readonly group = new THREE.Group();
  readonly position: THREE.Vector3;
  dead = false; // set when the home village is destroyed

  private target: Pickup | null = null;
  private wanderPoint: THREE.Vector3;
  private wanderTimer = 0;
  private runPhase = Math.random() * 10;

  constructor(
    scene: THREE.Scene,
    readonly home: THREE.Vector3,
  ) {
    this.position = home
      .clone()
      .add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2));
    this.wanderPoint = this.position.clone();

    // A tiny colonist: capsule + warm hood so they read as "people".
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.3, 2, 6),
      new THREE.MeshStandardMaterial({ color: 0xd9a066, flatShading: true }),
    );
    body.position.y = 0.45;
    body.castShadow = true;
    this.group.add(body);
    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 6, 5),
      new THREE.MeshStandardMaterial({ color: 0xff8d5e, flatShading: true }),
    );
    hood.position.y = 0.78;
    this.group.add(hood);

    this.group.position.copy(this.position);
    scene.add(this.group);
  }

  update(dt: number, game: GameManager) {
    if (this.dead) return;

    // Find work: the nearest uncollected pickup within range of home.
    if (!this.target || this.target.collected) {
      this.target = null;
      let bestD = VILLAGE_COLLECT_RADIUS;
      for (const pk of game.pickups) {
        if (pk.collected) continue;
        const d = pk.position.distanceTo(this.home);
        if (d > VILLAGE_COLLECT_RADIUS) continue;
        const dToMe = pk.position.distanceTo(this.position);
        if (dToMe < bestD) {
          bestD = dToMe;
          this.target = pk;
        }
      }
    }

    let goal: THREE.Vector3;
    if (this.target) {
      goal = this.target.position;
    } else {
      // Idle wander near home.
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0 || this.wanderPoint.distanceTo(this.position) < 0.4) {
        this.wanderTimer = 2 + Math.random() * 3;
        const a = Math.random() * Math.PI * 2;
        this.wanderPoint = this.home
          .clone()
          .add(new THREE.Vector3(Math.cos(a) * 3.5, 0, Math.sin(a) * 3.5));
      }
      goal = this.wanderPoint;
    }

    const to = goal.clone().sub(this.position).setY(0);
    const dist = to.length();
    if (dist > 0.05) {
      to.normalize();
      const speed = this.target ? SURVIVOR_SPEED : SURVIVOR_SPEED * 0.45;
      this.position.addScaledVector(to, Math.min(dist, speed * dt));
      this.group.rotation.y = Math.atan2(to.x, to.z);
    }

    if (this.target && this.position.distanceTo(this.target.position) < 0.8) {
      game.survivorCollect(this.target);
      this.target = null;
    }

    // Busy little jog.
    this.runPhase += dt * (this.target ? 14 : 6);
    this.group.position.set(
      this.position.x,
      Math.abs(Math.sin(this.runPhase)) * 0.06,
      this.position.z,
    );
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
  }
}
