import * as THREE from 'three';
import { Survivor } from './Survivor';
import { SURVIVOR_RESPAWN_TIME, VILLAGE_STATS } from './constants';
import type { GameManager } from './GameManager';
import { Structure } from './Structure';

/**
 * A village node inside the base. Houses survivors who run around
 * collecting nearby resource drops automatically — your base starts to
 * feel alive, and you can stay out at the front line.
 */
export class Village extends Structure {
  readonly survivors: Survivor[] = [];
  private respawnTimer = 1.0; // first villager moves in quickly
  private lanternMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    super(scene, position, 'village', VILLAGE_STATS[0].maxHp, 1.1);

    const hutMat = new THREE.MeshStandardMaterial({
      color: 0x7a6450,
      flatShading: true,
      roughness: 0.85,
    });
    this.tintMaterials.push(hutMat);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xb8c9de,
      flatShading: true,
      roughness: 0.9,
    });

    // A pair of snow-roofed huts.
    for (const [dx, dz, s] of [
      [-0.45, 0.2, 1.0],
      [0.55, -0.3, 0.75],
    ] as const) {
      const hut = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, 0.7 * s, 0.9 * s), hutMat);
      hut.position.set(dx, 0.35 * s, dz);
      hut.castShadow = true;
      this.group.add(hut);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.75 * s, 0.6 * s, 4), roofMat);
      roof.position.set(dx, 0.95 * s, dz);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      this.group.add(roof);
    }

    // A warm lantern between the huts.
    this.lanternMat = new THREE.MeshStandardMaterial({
      color: 0xffd9a8,
      emissive: 0xffb45e,
      emissiveIntensity: 1.0,
    });
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), this.lanternMat);
    lantern.position.set(0.05, 0.9, 0.45);
    this.group.add(lantern);

    this.group.scale.setScalar(0.01);
  }

  get stats() {
    return VILLAGE_STATS[this.level - 1];
  }

  protected maxHpForLevel(level: number) {
    return VILLAGE_STATS[level - 1].maxHp;
  }

  protected markerHeight() {
    return 2.0;
  }

  protected onUpdate(dt: number, game: GameManager) {
    if (this.group.scale.x < 1) {
      this.group.scale.setScalar(Math.min(1, this.group.scale.x + dt * 4));
    }

    this.lanternMat.emissiveIntensity = 0.85 + Math.sin(performance.now() / 300) * 0.2;

    for (let i = this.survivors.length - 1; i >= 0; i--) {
      if (this.survivors[i].dead) this.survivors.splice(i, 1);
    }

    if (this.survivors.length >= this.stats.survivors) {
      this.respawnTimer = SURVIVOR_RESPAWN_TIME;
      return;
    }
    this.respawnTimer -= dt;
    if (this.respawnTimer <= 0) {
      this.respawnTimer = SURVIVOR_RESPAWN_TIME;
      this.survivors.push(game.spawnSurvivor(this.position));
    }
  }
}
