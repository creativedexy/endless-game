import * as THREE from 'three';
import { COLORS } from './constants';

/** A collectible energy crystal. Touch it to gain energy. */
export class ResourceCrystal {
  readonly mesh: THREE.Mesh;
  readonly position: THREE.Vector3;
  collected = false;
  private time = Math.random() * 10;

  constructor(scene: THREE.Scene, x: number, z: number) {
    this.position = new THREE.Vector3(x, 0, z);
    this.mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42),
      new THREE.MeshStandardMaterial({
        color: COLORS.crystal,
        emissive: COLORS.crystal,
        emissiveIntensity: 0.7,
        flatShading: true,
      }),
    );
    this.mesh.position.set(x, 0.6, z);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
  }

  update(dt: number) {
    this.time += dt;
    this.mesh.rotation.y += dt * 2.2;
    this.mesh.position.y = 0.6 + Math.sin(this.time * 3) * 0.14;
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
