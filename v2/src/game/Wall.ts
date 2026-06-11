import * as THREE from 'three';
import { COLORS, WALL_STATS } from './constants';
import type { GameManager } from './GameManager';
import { Structure } from './Structure';

/**
 * Barrier node: a chunky hex block with lots of health. It does nothing
 * but stand in the way — enemies that bump into it stop and chew on it,
 * which is exactly the point.
 */
export class Wall extends Structure {
  private block: THREE.Mesh;
  private trim: THREE.Mesh;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    super(scene, position, 'wall', WALL_STATS[0].maxHp, 1.1);

    const mat = new THREE.MeshStandardMaterial({
      color: COLORS.wall,
      flatShading: true,
      roughness: 0.7,
    });
    this.tintMaterials.push(mat);
    this.block = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 1.2, 6), mat);
    this.block.position.y = 0.6;
    this.block.castShadow = true;
    this.group.add(this.block);

    this.trim = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.06, 6, 6),
      new THREE.MeshStandardMaterial({
        color: COLORS.shipGlow,
        emissive: COLORS.shipGlow,
        emissiveIntensity: 0.7,
      }),
    );
    this.trim.rotation.x = Math.PI / 2;
    this.trim.position.y = 1.1;
    this.group.add(this.trim);

    this.group.scale.setScalar(0.01);
  }

  protected maxHpForLevel(level: number) {
    return WALL_STATS[level - 1].maxHp;
  }

  protected onUpgrade() {
    // Taller and beefier each level.
    const h = 1.2 + (this.level - 1) * 0.45;
    this.block.scale.y = h / 1.2;
    this.block.position.y = h / 2;
    this.trim.position.y = h - 0.1;
  }

  protected markerHeight() {
    return 2.2 + (this.level - 1) * 0.45;
  }

  protected onUpdate(dt: number, _game: GameManager) {
    if (this.group.scale.x < 1) {
      this.group.scale.setScalar(Math.min(1, this.group.scale.x + dt * 4));
    }
  }
}
