import * as THREE from 'three';
import { ARENA_RADIUS, COLORS } from './constants';

const SNOWFLAKES = 450;
const SNOW_HEIGHT = 16;
const SNOW_AREA = 30;

/**
 * The frozen world: snowfield ground, the scorched crash trench, scattered
 * rocks, glowing ice formations, wreck debris, an icy ridge marking the
 * arena edge, and gently falling snow.
 */
export class Environment {
  private snow: THREE.Points;
  private snowPositions: Float32Array;

  constructor(scene: THREE.Scene) {
    // Snowfield ground with a darker outer skirt fading into the fog.
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(ARENA_RADIUS + 14, 48),
      new THREE.MeshStandardMaterial({ color: COLORS.snow, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const skirt = new THREE.Mesh(
      new THREE.RingGeometry(ARENA_RADIUS - 0.4, ARENA_RADIUS + 14, 48),
      new THREE.MeshStandardMaterial({ color: COLORS.snowDeep, roughness: 1 }),
    );
    skirt.rotation.x = -Math.PI / 2;
    skirt.position.y = 0.01;
    skirt.receiveShadow = true;
    scene.add(skirt);

    // Scorched crash trench gouged behind the ship.
    const trench = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 3.2),
      new THREE.MeshStandardMaterial({
        color: COLORS.scorch,
        roughness: 1,
        transparent: true,
        opacity: 0.75,
      }),
    );
    trench.rotation.x = -Math.PI / 2;
    trench.rotation.z = 0.35;
    trench.position.set(5.5, 0.02, 2.5);
    scene.add(trench);

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0xcdd9e8,
      flatShading: true,
      roughness: 0.9,
    });
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0x3a4254,
      flatShading: true,
      roughness: 0.8,
    });
    const iceMat = new THREE.MeshStandardMaterial({
      color: COLORS.ice,
      emissive: COLORS.ice,
      emissiveIntensity: 0.45,
      flatShading: true,
    });

    const rand = mulberry32(987613);

    // Snowy boulders scattered around (kept away from the ship and pads).
    for (let i = 0; i < 24; i++) {
      const angle = rand() * Math.PI * 2;
      const r = 9 + rand() * (ARENA_RADIUS - 10);
      const s = 0.4 + rand() * 0.9;
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), rockMat);
      rock.position.set(Math.cos(angle) * r, s * 0.4, Math.sin(angle) * r);
      rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      rock.castShadow = true;
      scene.add(rock);
    }

    // Glowing alien ice spires.
    for (let i = 0; i < 9; i++) {
      const angle = rand() * Math.PI * 2;
      const r = 10 + rand() * (ARENA_RADIUS - 11);
      const h = 0.8 + rand() * 1.6;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.3 + rand() * 0.25, h, 5), iceMat);
      spire.position.set(Math.cos(angle) * r, h / 2 - 0.1, Math.sin(angle) * r);
      spire.rotation.z = (rand() - 0.5) * 0.3;
      scene.add(spire);
    }

    // Torn hull plates along the crash trench.
    for (let i = 0; i < 8; i++) {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.6 + rand() * 1.1, 0.15, 0.5 + rand() * 0.8),
        debrisMat,
      );
      const t = rand();
      plate.position.set(4 + t * 9 + (rand() - 0.5) * 3, 0.1, 2 + t * 3 + (rand() - 0.5) * 3);
      plate.rotation.set((rand() - 0.5) * 0.6, rand() * 3, (rand() - 0.5) * 0.6);
      plate.castShadow = true;
      scene.add(plate);
    }

    // Icy ridge ring marking the playable boundary.
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2 + rand() * 0.15;
      const r = ARENA_RADIUS + 1.5 + rand() * 2;
      const s = 1.1 + rand() * 1.6;
      const ridge = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), rockMat);
      ridge.position.set(Math.cos(angle) * r, s * 0.35, Math.sin(angle) * r);
      ridge.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      scene.add(ridge);
    }

    // Falling snow.
    this.snowPositions = new Float32Array(SNOWFLAKES * 3);
    for (let i = 0; i < SNOWFLAKES; i++) {
      this.snowPositions[i * 3] = (rand() - 0.5) * SNOW_AREA * 2;
      this.snowPositions[i * 3 + 1] = rand() * SNOW_HEIGHT;
      this.snowPositions[i * 3 + 2] = (rand() - 0.5) * SNOW_AREA * 2;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));
    this.snow = new THREE.Points(
      snowGeo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.14,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    );
    scene.add(this.snow);
  }

  /** Drift the snowfall down (and slightly sideways), centred on the camera focus. */
  update(dt: number, focus: THREE.Vector3) {
    const pos = this.snowPositions;
    for (let i = 0; i < SNOWFLAKES; i++) {
      let y = pos[i * 3 + 1] - dt * (2.0 + (i % 5) * 0.35);
      pos[i * 3] += dt * 0.5;
      if (y < 0) {
        y = SNOW_HEIGHT;
        pos[i * 3] = focus.x + (Math.random() - 0.5) * SNOW_AREA * 2;
        pos[i * 3 + 2] = focus.z + (Math.random() - 0.5) * SNOW_AREA * 2;
      }
      pos[i * 3 + 1] = y;
    }
    (this.snow.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}

/** Tiny seeded PRNG so the decor layout is stable between sessions. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
