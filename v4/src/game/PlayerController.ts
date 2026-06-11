import * as THREE from 'three';
import {
  COLORS,
  DASH_COOLDOWN,
  DASH_DURATION,
  DASH_SPEED,
  MAP_MAX_X,
  MAP_MAX_Z,
  MAP_MIN_X,
  MAP_MIN_Z,
  PLAYER_ACCEL,
  PLAYER_FRICTION,
  PLAYER_MAX_SPEED,
  SPRINT_DELAY,
  SPRINT_MULT,
} from './constants';
import type { InputState } from './input';

/**
 * The survivor the player controls. Smooth accelerated movement, a dash
 * with cooldown, and a blaster with recoil + muzzle flash animation.
 */
export class PlayerController {
  readonly group = new THREE.Group();
  readonly position = new THREE.Vector3(4, 0, 6);
  readonly velocity = new THREE.Vector3();
  facing = new THREE.Vector3(0, 0, 1);

  private dashTimer = 0;
  private dashCooldownTimer = 0;
  private recoilTimer = 0;
  private aimTimer = 0;
  private aimDir = new THREE.Vector3(0, 0, 1);
  private runPhase = 0;

  private gun: THREE.Group;
  private muzzleFlash: THREE.Mesh;
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
      new THREE.MeshStandardMaterial({ color: 0x5a6a85, flatShading: true }),
    );
    pack.position.set(0, 0.85, -0.32);
    this.group.add(pack);

    // Blaster held at the right hip, kicked back on each shot.
    this.gun = new THREE.Group();
    const barrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.13, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x8d99c4, flatShading: true }),
    );
    barrel.position.z = 0.3;
    this.gun.add(barrel);
    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.22, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x3c465c, flatShading: true }),
    );
    grip.position.set(0, -0.16, 0.06);
    this.gun.add(grip);
    this.muzzleFlash = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16),
      new THREE.MeshBasicMaterial({
        color: COLORS.playerProjectile,
        transparent: true,
        opacity: 0,
      }),
    );
    this.muzzleFlash.position.z = 0.68;
    this.gun.add(this.muzzleFlash);
    this.gun.position.set(0.38, 0.82, 0.18);
    this.group.add(this.gun);

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

  /** World position of the gun muzzle, for spawning projectiles. */
  get muzzleWorldPos(): THREE.Vector3 {
    return this.muzzleFlash.getWorldPosition(new THREE.Vector3());
  }

  /** Returns true if the dash actually triggered (for SFX). */
  tryDash(): boolean {
    if (!this.dashReady) return false;
    this.dashTimer = DASH_DURATION;
    this.dashCooldownTimer = DASH_COOLDOWN;
    return true;
  }

  /** Play the shoot animation and briefly face the aim direction. */
  shoot(aimDir: THREE.Vector3) {
    this.recoilTimer = 0.12;
    this.aimTimer = 0.22;
    this.aimDir.copy(aimDir).setY(0).normalize();
  }

  reset() {
    this.position.set(4, 0, 6);
    this.velocity.set(0, 0, 0);
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.recoilTimer = 0;
    this.aimTimer = 0;
    this.sprintTime = 0;
  }

  private sprintTime = 0;

  update(dt: number, input: InputState) {
    this.dashCooldownTimer -= dt;

    // Screen-relative input: up on the stick is "away from the camera" (-Z).
    const wish = new THREE.Vector3(input.moveX, 0, -input.moveY);
    if (wish.lengthSq() > 1) wish.normalize();

    // Sprint ramp: keep running and you speed up — the map is big now.
    if (wish.lengthSq() > 0.1) this.sprintTime += dt;
    else this.sprintTime = 0;
    const sprint =
      1 + (SPRINT_MULT - 1) * Math.min(1, Math.max(0, (this.sprintTime - SPRINT_DELAY) / 0.8));

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      const dir = wish.lengthSq() > 0.01 ? wish.clone().normalize() : this.facing.clone();
      this.velocity.copy(dir.multiplyScalar(DASH_SPEED));
    } else if (wish.lengthSq() > 0.001) {
      this.velocity.addScaledVector(wish, PLAYER_ACCEL * dt);
      const speedCap = PLAYER_MAX_SPEED * sprint * Math.min(1, wish.length() * 1.4);
      if (this.velocity.length() > speedCap) this.velocity.setLength(speedCap);
    } else {
      // Friction when no input.
      const decel = Math.min(1, PLAYER_FRICTION * dt);
      this.velocity.multiplyScalar(1 - decel);
    }

    this.position.addScaledVector(this.velocity, dt);

    // Keep the player inside the map rectangle.
    this.position.x = Math.max(MAP_MIN_X, Math.min(MAP_MAX_X, this.position.x));
    this.position.z = Math.max(MAP_MIN_Z, Math.min(MAP_MAX_Z, this.position.z));

    // Face the aim direction while shooting, otherwise the movement direction.
    this.aimTimer -= dt;
    let faceDir: THREE.Vector3 | null = null;
    if (this.aimTimer > 0) {
      faceDir = this.aimDir;
    } else if (this.velocity.lengthSq() > 0.04) {
      this.facing.copy(this.velocity).setY(0).normalize();
      faceDir = this.facing;
    }
    if (faceDir) {
      const targetYaw = Math.atan2(faceDir.x, faceDir.z);
      // Shortest-arc rotation toward the target direction.
      let delta = targetYaw - this.group.rotation.y;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      this.group.rotation.y += delta * Math.min(1, dt * 16);
    }

    // Running bob.
    const speed = this.velocity.length();
    this.runPhase += dt * speed * 1.6;
    this.group.position.set(
      this.position.x,
      Math.abs(Math.sin(this.runPhase)) * 0.07 * Math.min(1, speed / 4),
      this.position.z,
    );

    // Recoil + muzzle flash.
    const flashMat = this.muzzleFlash.material as THREE.MeshBasicMaterial;
    if (this.recoilTimer > 0) {
      this.recoilTimer -= dt;
      const t = this.recoilTimer / 0.12;
      this.gun.position.z = 0.18 - t * 0.12;
      flashMat.opacity = t;
      this.muzzleFlash.scale.setScalar(0.8 + t * 0.8);
      this.muzzleFlash.rotation.z += dt * 30;
    } else {
      this.gun.position.z = 0.18;
      flashMat.opacity = 0;
    }

    // Dash trail tint on the body.
    this.bodyMat.emissive.setHex(this.isDashing ? 0x55ddff : 0x000000);
    this.bodyMat.emissiveIntensity = this.isDashing ? 0.7 : 0;
  }
}
