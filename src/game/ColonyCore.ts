import * as THREE from 'three';
import { COLORS, CORE_MAX_HP, CORE_RADIUS } from './constants';

/** The central structure the player must protect. */
export class ColonyCore {
  readonly group = new THREE.Group();
  readonly position = new THREE.Vector3(0, 0, 0);
  readonly radius = CORE_RADIUS;
  readonly maxHp = CORE_MAX_HP;
  hp = CORE_MAX_HP;

  private crystal: THREE.Mesh;
  private crystalMat: THREE.MeshStandardMaterial;
  private flashTimer = 0;
  private time = 0;

  constructor(scene: THREE.Scene) {
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x6e7aa8,
      flatShading: true,
      roughness: 0.7,
    });
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(CORE_RADIUS, CORE_RADIUS + 0.4, 0.7, 8),
      baseMat,
    );
    base.position.y = 0.35;
    base.castShadow = true;
    base.receiveShadow = true;
    this.group.add(base);

    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x8d99c4,
      flatShading: true,
      roughness: 0.6,
    });
    for (let i = 0; i < 4; i++) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.8, 0.35), pillarMat);
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      pillar.position.set(Math.cos(a) * (CORE_RADIUS - 0.35), 1.4, Math.sin(a) * (CORE_RADIUS - 0.35));
      pillar.castShadow = true;
      this.group.add(pillar);
    }

    this.crystalMat = new THREE.MeshStandardMaterial({
      color: COLORS.core,
      emissive: COLORS.core,
      emissiveIntensity: 0.9,
      flatShading: true,
    });
    this.crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.95), this.crystalMat);
    this.crystal.position.y = 2.1;
    this.crystal.castShadow = true;
    this.group.add(this.crystal);

    const light = new THREE.PointLight(COLORS.core, 30, 14);
    light.position.y = 2.4;
    this.group.add(light);

    scene.add(this.group);
  }

  takeDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
    this.flashTimer = 0.12;
  }

  repair(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  get isDamaged() {
    return this.hp < this.maxHp;
  }

  get isDestroyed() {
    return this.hp <= 0;
  }

  reset() {
    this.hp = this.maxHp;
    this.flashTimer = 0;
  }

  update(dt: number) {
    this.time += dt;
    this.crystal.rotation.y += dt * 1.2;
    this.crystal.position.y = 2.1 + Math.sin(this.time * 2) * 0.12;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.crystalMat.emissive.setHex(0xffffff);
    } else {
      // Crystal colour shifts toward orange as the core takes damage.
      const healthFrac = this.hp / this.maxHp;
      const color = new THREE.Color(COLORS.coreDamaged).lerp(
        new THREE.Color(COLORS.core),
        healthFrac,
      );
      this.crystalMat.color.copy(color);
      this.crystalMat.emissive.copy(color);
      this.crystalMat.emissiveIntensity = 0.6 + Math.sin(this.time * 3) * 0.2 + healthFrac * 0.3;
    }
  }
}
