import * as THREE from 'three';
import {
  ARC_END,
  ARC_START,
  BASE_X,
  BASE_Z,
  COLORS,
  GAP_ANGLES,
  GAP_HALF_WIDTH,
  MAP_MAX_X,
  MAP_MAX_Z,
  MAP_MIN_X,
  MAP_MIN_Z,
  PAD_LAYOUT,
  RIDGE_RADIUS,
} from './constants';
import { inGap } from './ridge';

const SNOWFLAKES = 450;
const SNOW_HEIGHT = 16;
const SNOW_AREA = 30;

/**
 * The frozen frontier: a big rectangular snowfield walled in by cliffs.
 * The base corner (south-east) is hugged by tall cliff walls; the
 * defence arc with its two glowing gaps crosses the open quadrant; the
 * wilds beyond hold rocks, ice spires and the ore deposits.
 */
export class Environment {
  private snow: THREE.Points;
  private snowPositions: Float32Array;

  constructor(scene: THREE.Scene) {
    const cx = (MAP_MIN_X + MAP_MAX_X) / 2;
    const cz = (MAP_MIN_Z + MAP_MAX_Z) / 2;
    const width = MAP_MAX_X - MAP_MIN_X;
    const depth = MAP_MAX_Z - MAP_MIN_Z;

    // Snowfield ground, oversized so the cliffs never show bare edges.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(width + 40, depth + 40),
      new THREE.MeshStandardMaterial({ color: COLORS.snow, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, 0, cz);
    ground.receiveShadow = true;
    scene.add(ground);

    // Scorched crash trench gouged toward the corner where the ship lies.
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
    trench.rotation.z = -0.7; // pointing in from the open north-west
    trench.position.set(BASE_X - 5, 0.02, BASE_Z - 4);
    scene.add(trench);

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0xcdd9e8,
      flatShading: true,
      roughness: 0.9,
    });
    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0xb4c4d8,
      flatShading: true,
      roughness: 0.95,
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

    // Cliff walls around the whole map. The two edges hugging the base
    // (east and south) are tall and chunky; the far edges read as the
    // wild frontier boundary.
    const edge = (
      from: THREE.Vector3,
      to: THREE.Vector3,
      step: number,
      sMin: number,
      sMax: number,
    ) => {
      const dir = to.clone().sub(from);
      const len = dir.length();
      dir.normalize();
      for (let d = 0; d <= len; d += step * (0.8 + rand() * 0.5)) {
        const s = sMin + rand() * (sMax - sMin);
        const crag = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), cliffMat);
        const jitter = (rand() - 0.5) * 1.6;
        crag.position
          .copy(from)
          .addScaledVector(dir, d)
          .add(new THREE.Vector3(-dir.z * jitter, 0, dir.x * jitter));
        crag.position.y = s * 0.4;
        crag.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        crag.castShadow = s < 3; // the huge ones just block light weirdly
        scene.add(crag);
      }
    };
    const m = 1.5; // crags sit just outside the playable bounds
    edge(
      new THREE.Vector3(MAP_MIN_X - m, 0, MAP_MIN_Z - m),
      new THREE.Vector3(MAP_MAX_X + m, 0, MAP_MIN_Z - m),
      3.4,
      1.4,
      2.6,
    ); // north frontier
    edge(
      new THREE.Vector3(MAP_MIN_X - m, 0, MAP_MIN_Z - m),
      new THREE.Vector3(MAP_MIN_X - m, 0, MAP_MAX_Z + m),
      3.4,
      1.4,
      2.6,
    ); // west frontier
    edge(
      new THREE.Vector3(MAP_MAX_X + m, 0, MAP_MIN_Z - m),
      new THREE.Vector3(MAP_MAX_X + m, 0, MAP_MAX_Z + m),
      3.0,
      2.2,
      3.8,
    ); // east cliff (base side)
    edge(
      new THREE.Vector3(MAP_MIN_X - m, 0, MAP_MAX_Z + m),
      new THREE.Vector3(MAP_MAX_X + m, 0, MAP_MAX_Z + m),
      3.0,
      2.2,
      3.8,
    ); // south cliff (base side)

    // The defence arc: a ragged double curve of crags with two gaps.
    const arcSteps = 40;
    for (let i = 0; i <= arcSteps; i++) {
      const angle =
        ARC_START + (i / arcSteps) * (ARC_END - ARC_START) + (rand() - 0.5) * 0.02;
      if (inGap(angle)) continue;
      for (const row of [-0.6, 0.6]) {
        if (row > 0 && rand() < 0.3) continue; // raggedness
        const r = RIDGE_RADIUS + row + (rand() - 0.5) * 0.5;
        const s = 1.0 + rand() * 1.1;
        const crag = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), rockMat);
        crag.position.set(
          BASE_X + Math.cos(angle) * r,
          s * 0.45,
          BASE_Z + Math.sin(angle) * r,
        );
        crag.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        crag.castShadow = true;
        scene.add(crag);
      }
    }

    // Glowing spires flank each gap so the funnels read at a glance.
    for (const g of GAP_ANGLES) {
      for (const side of [-1, 1]) {
        const a = g + side * (GAP_HALF_WIDTH + 0.06);
        const h = 2.8;
        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.5, h, 5), iceMat);
        spire.position.set(
          BASE_X + Math.cos(a) * RIDGE_RADIUS,
          h / 2 - 0.2,
          BASE_Z + Math.sin(a) * RIDGE_RADIUS,
        );
        scene.add(spire);
      }
    }

    // Boulders and ice spires scattered through the wilds.
    for (let i = 0; i < 40; i++) {
      const x = MAP_MIN_X + 2 + rand() * (width - 4);
      const z = MAP_MIN_Z + 2 + rand() * (depth - 4);
      if (Math.hypot(x - BASE_X, z - BASE_Z) < RIDGE_RADIUS + 2.5) continue; // keep the base tidy
      if (PAD_LAYOUT.some((p) => Math.hypot(p.x - x, p.z - z) < 2.8)) continue; // never on a pad
      if (rand() < 0.75) {
        const s = 0.4 + rand() * 0.9;
        const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), rockMat);
        rock.position.set(x, s * 0.4, z);
        rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        rock.castShadow = true;
        scene.add(rock);
      } else {
        const h = 0.8 + rand() * 1.6;
        const spire = new THREE.Mesh(
          new THREE.ConeGeometry(0.3 + rand() * 0.25, h, 5),
          iceMat,
        );
        spire.position.set(x, h / 2 - 0.1, z);
        spire.rotation.z = (rand() - 0.5) * 0.3;
        scene.add(spire);
      }
    }

    // Crash debris: spilled cargo crates and torn hull plates near the wreck.
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x8a6a3c,
      flatShading: true,
      roughness: 0.85,
    });
    const crateGlow = new THREE.MeshStandardMaterial({
      color: 0xffa94d,
      emissive: 0xffa94d,
      emissiveIntensity: 0.5,
      flatShading: true,
    });
    for (let i = 0; i < 3; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), crateMat);
      crate.position.set(BASE_X - 7 - i * 1.4 + rand(), 0.3, BASE_Z - 5 - i * 1.1 + rand());
      crate.rotation.y = rand() * 1.5;
      crate.rotation.z = (rand() - 0.5) * 0.4;
      crate.castShadow = true;
      scene.add(crate);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.1, 0.74), crateGlow);
      stripe.position.copy(crate.position);
      stripe.rotation.copy(crate.rotation);
      scene.add(stripe);
    }
    for (let i = 0; i < 7; i++) {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.6 + rand() * 1.1, 0.15, 0.5 + rand() * 0.8),
        debrisMat,
      );
      const t = rand();
      plate.position.set(
        BASE_X - 3 - t * 8 + (rand() - 0.5) * 3,
        0.1,
        BASE_Z - 2 - t * 6 + (rand() - 0.5) * 3,
      );
      plate.rotation.set((rand() - 0.5) * 0.6, rand() * 3, (rand() - 0.5) * 0.6);
      plate.castShadow = true;
      scene.add(plate);
    }

    // A half-buried escape pod out in the snow.
    const pod = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.55, 1.0, 2, 8),
      new THREE.MeshStandardMaterial({ color: 0x6a7a8e, flatShading: true }),
    );
    pod.position.set(BASE_X - 14, 0.35, BASE_Z - 9);
    pod.rotation.z = Math.PI / 2.3;
    pod.rotation.y = 0.8;
    pod.castShadow = true;
    scene.add(pod);

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
