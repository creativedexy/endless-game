import * as THREE from 'three';
import { BEACON_STATS, COLORS } from './constants';
import type { GameManager } from './GameManager';
import { Structure } from './Structure';

/**
 * Repair beacon: slowly knits nearby structures (and the ship, if in
 * range) back together. Shows its healing radius as a soft pulsing ring.
 */
export class RepairBeacon extends Structure {
  private orb: THREE.Mesh;
  private ring: THREE.Mesh;
  private pulse = 0;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    super(scene, position, 'beacon', BEACON_STATS[0].maxHp, 0.8);

    const mastMat = new THREE.MeshStandardMaterial({ color: 0x5a6a85, flatShading: true });
    this.tintMaterials.push(mastMat);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 0.4, 6), mastMat);
    base.position.y = 0.2;
    base.castShadow = true;
    this.group.add(base);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.4, 6), mastMat);
    mast.position.y = 1.0;
    this.group.add(mast);

    this.orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 8, 6),
      new THREE.MeshStandardMaterial({
        color: COLORS.beacon,
        emissive: COLORS.beacon,
        emissiveIntensity: 0.9,
        flatShading: true,
      }),
    );
    this.orb.position.y = 1.85;
    this.group.add(this.orb);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(BEACON_STATS[0].radius - 0.15, BEACON_STATS[0].radius, 40),
      new THREE.MeshBasicMaterial({
        color: COLORS.beacon,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.04;
    this.group.add(this.ring);

    this.group.scale.setScalar(0.01);
  }

  get stats() {
    return BEACON_STATS[this.level - 1];
  }

  protected maxHpForLevel(level: number) {
    return BEACON_STATS[level - 1].maxHp;
  }

  protected onUpgrade() {
    this.ring.geometry.dispose();
    this.ring.geometry = new THREE.RingGeometry(
      this.stats.radius - 0.15,
      this.stats.radius,
      40,
    );
  }

  protected markerHeight() {
    return 2.5;
  }

  protected onUpdate(dt: number, game: GameManager) {
    if (this.group.scale.x < 1) {
      this.group.scale.setScalar(Math.min(1, this.group.scale.x + dt * 4));
    }

    this.pulse += dt * 2.4;
    const ringMat = this.ring.material as THREE.MeshBasicMaterial;
    ringMat.opacity = 0.16 + Math.abs(Math.sin(this.pulse)) * 0.14;
    this.orb.scale.setScalar(1 + Math.sin(this.pulse) * 0.1);

    // Heal nearby structures and the ship.
    const heal = this.stats.healPerSecond * dt;
    for (const s of game.structures) {
      if (s === this || s.destroyed || !s.isDamaged) continue;
      if (this.position.distanceTo(s.position) <= this.stats.radius) s.repair(heal);
    }
    if (
      game.ship.isDamaged &&
      this.position.distanceTo(game.ship.position) <= this.stats.radius + game.ship.radius
    ) {
      game.ship.repair(heal);
    }
  }
}
