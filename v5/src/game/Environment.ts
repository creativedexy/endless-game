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

const MOTES = 260;
const MOTE_HEIGHT = 14;
const MOTE_AREA = 30;

/**
 * The block at dusk: a big rectangular slab of asphalt hemmed in by
 * buildings. The HQ corner (south-east) is backed by tall apartment
 * blocks; the defence arc is a graffiti'd wall with two alley gaps that
 * roads feed into; the open end of the map is bungalows, palms and junk.
 */
export class Environment {
  private motes: THREE.Points;
  private motePositions: Float32Array;

  constructor(scene: THREE.Scene) {
    const cx = (MAP_MIN_X + MAP_MAX_X) / 2;
    const cz = (MAP_MIN_Z + MAP_MAX_Z) / 2;
    const width = MAP_MAX_X - MAP_MIN_X;
    const depth = MAP_MAX_Z - MAP_MIN_Z;

    // Asphalt ground, oversized so the building rows never show bare edges.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(width + 40, depth + 40),
      new THREE.MeshStandardMaterial({ color: COLORS.snow, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, 0, cz);
    ground.receiveShadow = true;
    scene.add(ground);

    const rand = mulberry32(987613);

    // Worn grass lots and pale concrete patches break up the asphalt.
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4a5a3c, roughness: 1 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x5a585e, roughness: 1 });
    for (let i = 0; i < 14; i++) {
      const x = MAP_MIN_X + 3 + rand() * (width - 6);
      const z = MAP_MIN_Z + 3 + rand() * (depth - 6);
      const patch = new THREE.Mesh(
        new THREE.CircleGeometry(1.6 + rand() * 2.6, 7),
        rand() < 0.55 ? grassMat : concreteMat,
      );
      patch.rotation.x = -Math.PI / 2;
      patch.rotation.z = rand() * 3;
      patch.position.set(x, 0.01, z);
      patch.receiveShadow = true;
      scene.add(patch);
    }

    // Oil-stained driveway in front of the HQ (where the crash trench was).
    const driveway = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 3.2),
      new THREE.MeshStandardMaterial({
        color: COLORS.scorch,
        roughness: 1,
        transparent: true,
        opacity: 0.75,
      }),
    );
    driveway.rotation.x = -Math.PI / 2;
    driveway.rotation.z = -0.7;
    driveway.position.set(BASE_X - 5, 0.02, BASE_Z - 4);
    scene.add(driveway);

    // Two streets feed the map edges into the alley gaps — the lanes the
    // rivals roll in on. Dark tarmac with dashed yellow centre lines.
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x323036, roughness: 1 });
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xc9b04d });
    const road = (x1: number, z1: number, x2: number, z2: number) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const ang = Math.atan2(z2 - z1, x2 - x1);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(len, 3.6), roadMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = -ang;
      mesh.position.set((x1 + x2) / 2, 0.015, (z1 + z2) / 2);
      mesh.receiveShadow = true;
      scene.add(mesh);
      for (let d = 1.2; d < len - 1; d += 2.4) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.16), dashMat);
        dash.rotation.x = -Math.PI / 2;
        dash.rotation.z = -ang;
        dash.position.set(
          x1 + Math.cos(ang) * d,
          0.025,
          z1 + Math.sin(ang) * d,
        );
        scene.add(dash);
      }
    };
    for (const g of GAP_ANGLES) {
      const gx = BASE_X + Math.cos(g) * RIDGE_RADIUS;
      const gz = BASE_Z + Math.sin(g) * RIDGE_RADIUS;
      // Extend the street from the gap mouth out toward the nearest edge.
      const ex = Math.abs(Math.cos(g)) > Math.abs(Math.sin(g));
      if (ex) road(MAP_MIN_X - 4, gz, gx, gz);
      else road(gx, MAP_MIN_Z - 4, gx, gz);
    }

    // Building rows around the whole map. The two edges hugging the HQ
    // (east and south) are tall apartment blocks; the far edges read as
    // low bungalows and strip-mall backs.
    const facadePalette = [0x8a7a6e, 0x7a6a72, 0x6e7a72, 0x9a8878, 0x5e6670];
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xffd9a0,
      emissive: 0xffd9a0,
      emissiveIntensity: 0.7,
    });
    const edge = (
      from: THREE.Vector3,
      to: THREE.Vector3,
      hMin: number,
      hMax: number,
    ) => {
      const dir = to.clone().sub(from);
      const len = dir.length();
      dir.normalize();
      for (let d = 0; d <= len; ) {
        const w = 2.6 + rand() * 2.2; // frontage along the edge
        const h = hMin + rand() * (hMax - hMin);
        const depth = 2.4 + rand() * 1.6;
        const mat = new THREE.MeshStandardMaterial({
          color: facadePalette[Math.floor(rand() * facadePalette.length)],
          flatShading: true,
          roughness: 0.95,
        });
        const bld = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), mat);
        const out = new THREE.Vector3(-dir.z, 0, dir.x); // push outward a bit
        bld.position
          .copy(from)
          .addScaledVector(dir, d + w / 2)
          .addScaledVector(out, depth * 0.25 + rand() * 0.8);
        bld.position.y = h / 2;
        bld.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI / 2;
        bld.castShadow = h < 6; // the huge ones just block light weirdly
        bld.receiveShadow = true;
        scene.add(bld);
        // A couple of lit window strips on the facade facing the block.
        const floors = Math.max(1, Math.floor(h / 2.2));
        for (let f = 0; f < Math.min(3, floors); f++) {
          if (rand() < 0.35) continue; // dark floors
          const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.3, 0.08), windowMat);
          strip.position.copy(bld.position);
          strip.position.y = 1.3 + f * 2.2;
          strip.position.addScaledVector(out, -(depth / 2 + 0.06));
          strip.rotation.y = bld.rotation.y;
          scene.add(strip);
        }
        d += w + 0.5 + rand() * 1.2;
      }
    };
    const m = 2.2; // buildings sit just outside the playable bounds
    edge(
      new THREE.Vector3(MAP_MAX_X + m, 0, MAP_MIN_Z - m),
      new THREE.Vector3(MAP_MIN_X - m, 0, MAP_MIN_Z - m),
      2.4,
      4.2,
    ); // north: bungalows
    edge(
      new THREE.Vector3(MAP_MIN_X - m, 0, MAP_MIN_Z - m),
      new THREE.Vector3(MAP_MIN_X - m, 0, MAP_MAX_Z + m),
      2.4,
      4.2,
    ); // west: bungalows
    edge(
      new THREE.Vector3(MAP_MAX_X + m, 0, MAP_MAX_Z + m),
      new THREE.Vector3(MAP_MAX_X + m, 0, MAP_MIN_Z - m),
      5.0,
      8.5,
    ); // east: apartment blocks behind the HQ
    edge(
      new THREE.Vector3(MAP_MIN_X - m, 0, MAP_MAX_Z + m),
      new THREE.Vector3(MAP_MAX_X + m, 0, MAP_MAX_Z + m),
      5.0,
      8.5,
    ); // south: apartment blocks behind the HQ

    // The defence arc: a graffiti'd concrete wall with two alley gaps.
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x7a7370,
      flatShading: true,
      roughness: 0.95,
    });
    const tagColors = [0xff4dc4, 0x4dd2ff, 0xffe04d, 0x7dff6a];
    const segLen = 2.1;
    const arcLen = RIDGE_RADIUS * (ARC_END - ARC_START);
    const segs = Math.ceil(arcLen / (segLen + 0.25));
    for (let i = 0; i <= segs; i++) {
      const angle = ARC_START + (i / segs) * (ARC_END - ARC_START);
      if (inGap(angle)) continue;
      const h = 1.2 + rand() * 0.5;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(segLen, h, 0.5), wallMat);
      seg.position.set(
        BASE_X + Math.cos(angle) * RIDGE_RADIUS,
        h / 2,
        BASE_Z + Math.sin(angle) * RIDGE_RADIUS,
      );
      seg.rotation.y = -angle + Math.PI / 2; // tangent to the arc
      seg.castShadow = true;
      scene.add(seg);
      // Spray tags on the outward face of some segments.
      if (rand() < 0.45) {
        const tag = new THREE.Mesh(
          new THREE.PlaneGeometry(1.1 + rand() * 0.7, 0.45),
          new THREE.MeshBasicMaterial({
            color: tagColors[Math.floor(rand() * tagColors.length)],
            transparent: true,
            opacity: 0.85,
          }),
        );
        tag.position.copy(seg.position);
        tag.position.x -= Math.cos(angle) * 0.28;
        tag.position.z -= Math.sin(angle) * 0.28;
        tag.position.y = h * 0.5;
        tag.rotation.y = seg.rotation.y + Math.PI;
        scene.add(tag);
      }
    }

    // Streetlights flank each alley gap so the funnels read at a glance.
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, flatShading: true });
    const lampMat = new THREE.MeshStandardMaterial({
      color: COLORS.ice,
      emissive: COLORS.ice,
      emissiveIntensity: 1.2,
    });
    for (const g of GAP_ANGLES) {
      for (const side of [-1, 1]) {
        const a = g + side * (GAP_HALF_WIDTH + 0.06);
        const px = BASE_X + Math.cos(a) * RIDGE_RADIUS;
        const pz = BASE_Z + Math.sin(a) * RIDGE_RADIUS;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.6, 6), poleMat);
        pole.position.set(px, 1.8, pz);
        scene.add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), lampMat);
        lamp.position.set(px, 3.6, pz);
        scene.add(lamp);
      }
    }

    // Palms, dumpsters, tires and trash scattered through the open blocks.
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6e5a40, flatShading: true });
    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x3f6a38,
      flatShading: true,
      roughness: 0.9,
    });
    const dumpsterMat = new THREE.MeshStandardMaterial({
      color: 0x3a5a4a,
      flatShading: true,
      roughness: 0.8,
    });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.9 });
    const trashMat = new THREE.MeshStandardMaterial({
      color: 0x46464e,
      flatShading: true,
      roughness: 0.9,
    });
    for (let i = 0; i < 38; i++) {
      const x = MAP_MIN_X + 2 + rand() * (width - 4);
      const z = MAP_MIN_Z + 2 + rand() * (depth - 4);
      if (Math.hypot(x - BASE_X, z - BASE_Z) < RIDGE_RADIUS + 2.5) continue; // keep the base tidy
      if (PAD_LAYOUT.some((p) => Math.hypot(p.x - x, p.z - z) < 2.8)) continue; // never on a pad
      const roll = rand();
      if (roll < 0.45) {
        // Palm tree: a leaning trunk with a mop of drooping fronds.
        const h = 2.4 + rand() * 1.4;
        const lean = (rand() - 0.5) * 0.25;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, h, 6), trunkMat);
        trunk.position.set(x, h / 2, z);
        trunk.rotation.z = lean;
        trunk.castShadow = true;
        scene.add(trunk);
        const topX = x - Math.sin(lean) * h;
        for (let f = 0; f < 6; f++) {
          const frond = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.06, 0.3), frondMat);
          const fa = (f / 6) * Math.PI * 2 + rand();
          frond.position.set(
            topX + Math.cos(fa) * 0.55,
            h + 0.08,
            z + Math.sin(fa) * 0.55,
          );
          frond.rotation.y = -fa;
          frond.rotation.z = 0.35 + rand() * 0.2; // droop
          scene.add(frond);
        }
      } else if (roll < 0.62) {
        const bin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 0.9), dumpsterMat);
        bin.position.set(x, 0.48, z);
        bin.rotation.y = rand() * 3;
        bin.castShadow = true;
        scene.add(bin);
        const lid = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.1, 0.95), trashMat);
        lid.position.set(x, 1.0, z);
        lid.rotation.y = bin.rotation.y;
        lid.rotation.x = -0.15;
        scene.add(lid);
      } else if (roll < 0.8) {
        // A short stack of worn tires.
        const n = 1 + Math.floor(rand() * 3);
        for (let t = 0; t < n; t++) {
          const tire = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.13, 6, 10), tireMat);
          tire.rotation.x = Math.PI / 2;
          tire.position.set(x + (rand() - 0.5) * 0.15, 0.14 + t * 0.27, z);
          scene.add(tire);
        }
      } else {
        const bag = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + rand() * 0.25, 0), trashMat);
        bag.position.set(x, 0.22, z);
        bag.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        scene.add(bag);
      }
    }

    // Junked cars: a few rusting along the wall line and out in the lots.
    const junkSpots = [
      { x: BASE_X + Math.cos(3.4) * (RIDGE_RADIUS - 2), z: BASE_Z + Math.sin(3.4) * (RIDGE_RADIUS - 2), burnt: false },
      { x: BASE_X + Math.cos(4.6) * (RIDGE_RADIUS + 2.5), z: BASE_Z + Math.sin(4.6) * (RIDGE_RADIUS + 2.5), burnt: true },
      { x: MAP_MIN_X + 6, z: MAP_MIN_Z + 8, burnt: false },
      { x: MAP_MIN_X + 14, z: MAP_MAX_Z - 6, burnt: true },
      { x: MAP_MAX_X - 6, z: MAP_MIN_Z + 14, burnt: false },
    ];
    const carColors = [0x7a4a52, 0x4a5a7a, 0x6a6a5a];
    for (const spot of junkSpots) {
      if (PAD_LAYOUT.some((p) => Math.hypot(p.x - spot.x, p.z - spot.z) < 3.2)) continue;
      makeCar(
        scene,
        spot.x,
        spot.z,
        rand() * Math.PI * 2,
        spot.burnt ? 0x2c2c30 : carColors[Math.floor(rand() * carColors.length)],
      );
    }

    // The crew's lowrider parked proudly on the HQ driveway.
    makeCar(scene, BASE_X - 8.5, BASE_Z - 6.5, -0.7, 0x8a3df0, true);

    // Hot dusk haze: golden motes drifting up through the streetlight glow.
    this.motePositions = new Float32Array(MOTES * 3);
    for (let i = 0; i < MOTES; i++) {
      this.motePositions[i * 3] = (rand() - 0.5) * MOTE_AREA * 2;
      this.motePositions[i * 3 + 1] = rand() * MOTE_HEIGHT;
      this.motePositions[i * 3 + 2] = (rand() - 0.5) * MOTE_AREA * 2;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(this.motePositions, 3));
    this.motes = new THREE.Points(
      moteGeo,
      new THREE.PointsMaterial({
        color: 0xffc9a0,
        size: 0.1,
        transparent: true,
        opacity: 0.4,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    );
    scene.add(this.motes);
  }

  /** Drift the haze motes slowly upward, centred on the camera focus. */
  update(dt: number, focus: THREE.Vector3) {
    const pos = this.motePositions;
    for (let i = 0; i < MOTES; i++) {
      let y = pos[i * 3 + 1] + dt * (0.5 + (i % 5) * 0.12);
      pos[i * 3] += dt * 0.35;
      if (y > MOTE_HEIGHT) {
        y = 0;
        pos[i * 3] = focus.x + (Math.random() - 0.5) * MOTE_AREA * 2;
        pos[i * 3 + 2] = focus.z + (Math.random() - 0.5) * MOTE_AREA * 2;
      }
      pos[i * 3 + 1] = y;
    }
    (this.motes.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}

/** A chunky low-poly car; `shiny` makes it the crew's lowrider. */
function makeCar(
  scene: THREE.Scene,
  x: number,
  z: number,
  yaw: number,
  color: number,
  shiny = false,
) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    roughness: shiny ? 0.35 : 0.85,
    metalness: shiny ? 0.4 : 0.05,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 1.1), bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 1.0), bodyMat);
  cabin.position.set(-0.15, 0.95, 0);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.9 });
  for (const [wx, wz] of [
    [-0.8, 0.55],
    [0.8, 0.55],
    [-0.8, -0.55],
    [0.8, -0.55],
  ]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.2, 8), wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.26, wz);
    group.add(wheel);
    if (shiny) {
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.22, 8),
        new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.8, roughness: 0.3 }),
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.set(wx, 0.26, wz);
      group.add(rim);
    }
  }
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  scene.add(group);
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
