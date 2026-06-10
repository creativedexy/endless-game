import * as THREE from 'three';
import {
  ARENA_RADIUS,
  COLORS,
  DASH_COOLDOWN,
  DASH_DURATION,
  DASH_SPEED,
  PLAYER_ACCEL,
  PLAYER_FRICTION,
  PLAYER_MAX_SPEED,
} from './constants';
import type { InputState } from './input';

/**
 * The little engineer the player controls. Smooth accelerated movement,
 * a dash with cooldown, and a swing animation for melee attacks.
 */
export class PlayerController {
  readonly group = new THREE.Group();
  readonly position = new THREE.Vector3(3.5, 0, 3.5);
  readonly velocity = new THREE.Vector3();
  facing = new THREE.Vector3(0, 0, 1);

  private dashTimer = 0;
  private dashCooldownTimer = 0;
  private swingTimer = 0;
  private runPhase = 0;

  private toolArm: THREE.Group;
  private swingArc: THREE.Mesh;
  private bodyMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.bodyMat = new THREE.MeshStandardMaterial({
      color: COLORS.player,
      flatShading: true,
      roughness: 0.55,
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.5, 2, 8), this.bodyMat);
    body.position.y = 0.78;
    body.castShadow = true;
    this.group.add(body);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.16, 0.18),
      new THREE.MeshStandardMaterial({
        color: COLORS.playerVisor,
        emissive: COLORS.playerVisor,
        emissiveIntensity: 0.8,
      }),
    );
    visor.position.set(0, 1.12, 0.28);
    this.group.add(visor);

    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.42, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x7c6448, flatShading: true }),
    );
    pack.position.set(0, 0.85, -0.32);
    this.group.add(pack);

    // Tool arm with a glowing wrench-ish tip, swung on attack.
    this.toolArm = new THREE.Group();
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x8d99c4, flatShading: true }),
    );
    arm.position.z = 0.35;
    this.toolArm.add(arm);
    const tip = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x5cffd9 }),
    );
    tip.position.z = 0.68;
    this.toolArm.add(tip);
    this.toolArm.position.set(0.4, 0.85, 0.1);
    this.group.add(this.toolArm);

    // A translucent arc flashes in front of the player when attacking.
    this.swingArc = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 2.4, 16, 1, -Math.PI / 3, (Math.PI * 2) / 3),
      new THREE.MeshBasicMaterial({
        color: 0x9dfff0,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.swingArc.rotation.x = -Math.PI / 2;
    this.swingArc.position.y = 0.35;
    this.group.add(this.swingArc);

    this.group.position.copy(this.position);
    scene.add(this.group);
  }

  get dashReady() {
    return this.dashCooldownTimer <= 0;
  }

  get dashCooldownFraction() {
    return Math.max(0, this.dashCooldownTimer) / DASH_COOLDOWN;
  }

  get isDashing() {
    return this.dashTimer > 0;
  }

  /** Returns true if the dash actually triggered (for SFX). */
  tryDash(): boolean {
    if (!this.dashReady) return false;
    this.dashTimer = DASH_DURATION;
    this.dashCooldownTimer = DASH_COOLDOWN;
    return true;
  }

  /** Play the melee swing animation. */
  swing() {
    this.swingTimer = 0.18;
  }

  reset() {
    this.position.set(3.5, 0, 3.5);
    this.velocity.set(0, 0, 0);
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.swingTimer = 0;
  }

  update(dt: number, input: InputState) {
    this.dashCooldownTimer -= dt;

    // Screen-relative input: up on the stick is "away from the camera" (-Z).
    const wish = new THREE.Vector3(input.moveX, 0, -input.moveY);
    if (wish.lengthSq() > 1) wish.normalize();

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      const dir = wish.lengthSq() > 0.01 ? wish.clone().normalize() : this.facing.clone();
      this.velocity.copy(dir.multiplyScalar(DASH_SPEED));
    } else if (wish.lengthSq() > 0.001) {
      this.velocity.addScaledVector(wish, PLAYER_ACCEL * dt);
      const speedCap = PLAYER_MAX_SPEED * Math.min(1, wish.length() * 1.4);
      if (this.velocity.length() > speedCap) this.velocity.setLength(speedCap);
    } else {
      // Friction when no input.
      const decel = Math.min(1, PLAYER_FRICTION * dt);
      this.velocity.multiplyScalar(1 - decel);
    }

    this.position.addScaledVector(this.velocity, dt);

    // Keep the player inside the arena.
    const radial = Math.hypot(this.position.x, this.position.z);
    if (radial > ARENA_RADIUS) {
      this.position.multiplyScalar(ARENA_RADIUS / radial);
    }

    if (this.velocity.lengthSq() > 0.04) {
      this.facing.copy(this.velocity).setY(0).normalize();
      const targetYaw = Math.atan2(this.facing.x, this.facing.z);
      // Shortest-arc rotation toward movement direction.
      let delta = targetYaw - this.group.rotation.y;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      this.group.rotation.y += delta * Math.min(1, dt * 14);
    }

    // Running bob.
    const speed = this.velocity.length();
    this.runPhase += dt * speed * 1.6;
    this.group.position.set(
      this.position.x,
      Math.abs(Math.sin(this.runPhase)) * 0.07 * Math.min(1, speed / 4),
      this.position.z,
    );

    // Swing animation: arm sweeps and the arc flashes.
    const arcMat = this.swingArc.material as THREE.MeshBasicMaterial;
    if (this.swingTimer > 0) {
      this.swingTimer -= dt;
      const t = 1 - this.swingTimer / 0.18;
      this.toolArm.rotation.y = -1.4 + t * 2.6;
      arcMat.opacity = 0.45 * Math.sin(t * Math.PI);
    } else {
      this.toolArm.rotation.y *= 1 - Math.min(1, dt * 12);
      arcMat.opacity = 0;
    }

    // Dash trail tint on the body.
    this.bodyMat.emissive.setHex(this.isDashing ? 0x55ddff : 0x000000);
    this.bodyMat.emissiveIntensity = this.isDashing ? 0.7 : 0;
  }
}
