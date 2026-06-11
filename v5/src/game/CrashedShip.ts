import * as THREE from 'three';
import { BASE_X, BASE_Z, COLORS, SHIP_MAX_HP, SHIP_RADIUS } from './constants';
import { loadModel } from './models';

interface EmberParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  smoke: boolean;
}

const FIRE_POOL = 70;

/**
 * The crew's HQ in the corner of the block — the thing you are keeping
 * standing. A stucco crib with lit windows, a rooftop tag and burn
 * barrels out front: it runs its own fire/smoke particle emitters and
 * flickering lights. The fires spread as the place gets shot up.
 * (Class name kept from the sci-fi versions so the rest of the game
 * doesn't need to know the theme changed.)
 */
export class CrashedShip {
  // The HQ sits in the south-east corner of the map, not the centre.
  readonly position = new THREE.Vector3(BASE_X, 0, BASE_Z);
  readonly radius = SHIP_RADIUS;
  readonly maxHp = SHIP_MAX_HP;
  hp = SHIP_MAX_HP;

  private group = new THREE.Group();
  private hullMat: THREE.MeshStandardMaterial;
  private windowMat: THREE.MeshStandardMaterial;
  private fireLight: THREE.PointLight;
  private glowLight: THREE.PointLight;
  private particles: EmberParticle[] = [];
  private emitTimer = 0;
  private flashTimer = 0;
  private flicker = 0;
  private beaconTip!: THREE.Mesh;
  private modelLoaded = false;

  // Fire emitter points in local HQ space (filled in by buildCrib).
  private emitters: THREE.Vector3[] = [];

  constructor(scene: THREE.Scene) {
    this.hullMat = new THREE.MeshStandardMaterial({
      color: COLORS.shipHull,
      flatShading: true,
      roughness: 0.85,
      metalness: 0.0,
    });
    this.windowMat = new THREE.MeshStandardMaterial({
      color: COLORS.shipGlow,
      emissive: COLORS.shipGlow,
      emissiveIntensity: 1.0,
    });

    this.buildCrib();
    this.group.position.copy(this.position);
    scene.add(this.group);

    this.fireLight = new THREE.PointLight(COLORS.fire, 30, 16);
    this.fireLight.position.set(2.6, 1.4, -1.8);
    this.group.add(this.fireLight);

    this.glowLight = new THREE.PointLight(COLORS.shipGlow, 14, 12);
    this.glowLight.position.set(-2.2, 1.6, 1.5);
    this.group.add(this.glowLight);

    // Shared pools for fire and smoke particles.
    const fireGeo = new THREE.TetrahedronGeometry(0.24);
    const smokeGeo = new THREE.IcosahedronGeometry(0.22, 0);
    for (let i = 0; i < FIRE_POOL; i++) {
      const smoke = i % 3 === 2; // every third particle is smoke
      const mesh = new THREE.Mesh(
        smoke ? smokeGeo : fireGeo,
        new THREE.MeshBasicMaterial({
          color: smoke ? COLORS.smoke : COLORS.fire,
          transparent: true,
          opacity: smoke ? 0.4 : 0.95,
          depthWrite: false,
        }),
      );
      mesh.visible = false;
      scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        smoke,
      });
    }
  }

  private buildCrib() {
    const trimMat = new THREE.MeshStandardMaterial({
      color: COLORS.shipDark,
      flatShading: true,
      roughness: 0.8,
    });

    // Main house: a two-storey stucco box.
    const house = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.0, 3.6), this.hullMat);
    house.position.set(0.4, 1.5, 0.4);
    house.rotation.y = -0.18;
    house.castShadow = true;
    house.receiveShadow = true;
    this.group.add(house);

    // Flat roof with a parapet lip.
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.25, 3.9), trimMat);
    roof.position.set(0.4, 3.1, 0.4);
    roof.rotation.y = -0.18;
    this.group.add(roof);

    // Single-storey garage wing.
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 2.6), this.hullMat);
    wing.position.set(-2.6, 0.9, -0.6);
    wing.rotation.y = -0.18;
    wing.castShadow = true;
    this.group.add(wing);
    const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.2, 2.9), trimMat);
    wingRoof.position.set(-2.6, 1.88, -0.6);
    wingRoof.rotation.y = -0.18;
    this.group.add(wingRoof);

    // Porch: slab, two posts and an awning over the front door.
    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 1.4), trimMat);
    slab.position.set(0.0, 0.09, -1.9);
    this.group.add(slab);
    for (const px of [-0.85, 0.85]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.7, 6), trimMat);
      post.position.set(px, 0.95, -2.4);
      this.group.add(post);
    }
    const awning = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 1.5), trimMat);
    awning.position.set(0.0, 1.85, -1.95);
    awning.rotation.x = 0.08;
    this.group.add(awning);

    // Front door, warm light leaking around it.
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.4, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0x33231c,
        emissive: COLORS.shipGlow,
        emissiveIntensity: 0.15,
        flatShading: true,
      }),
    );
    door.position.set(0.0, 0.8, -1.45);
    door.rotation.y = -0.18;
    this.group.add(door);

    // Lit windows on both floors.
    for (const [wx, wy, wz, ry] of [
      [-1.3, 1.1, -1.32, -0.18],
      [1.4, 1.1, -1.2, -0.18],
      [-0.9, 2.4, -1.36, -0.18],
      [1.1, 2.4, -1.22, -0.18],
      [2.75, 1.2, 0.0, Math.PI / 2 - 0.18],
    ] as const) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.06), this.windowMat);
      w.position.set(wx, wy, wz);
      w.rotation.y = ry;
      this.group.add(w);
    }

    // Crew tag sprayed across the upper wall.
    const tag = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xff4dc4, transparent: true, opacity: 0.9 }),
    );
    tag.position.set(0.2, 2.35, -1.43);
    tag.rotation.y = -0.18;
    this.group.add(tag);

    // Rooftop antenna with a blinking tip.
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.8, 5), trimMat);
    mast.position.set(1.6, 4.0, 1.2);
    mast.rotation.z = 0.08;
    this.group.add(mast);
    this.beaconTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: COLORS.fire }),
    );
    this.beaconTip.position.set(1.74, 4.95, 1.2);
    this.group.add(this.beaconTip);

    // Burn barrels out front — the fires that flare up as the HQ takes hits.
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x2e2a28,
      flatShading: true,
      roughness: 0.9,
    });
    const emberMat = new THREE.MeshStandardMaterial({
      color: COLORS.fire,
      emissive: COLORS.fire,
      emissiveIntensity: 1.0,
    });
    for (const [bx, bz] of [
      [2.6, -1.8],
      [-1.6, 2.6],
    ] as const) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.8, 8), barrelMat);
      barrel.position.set(bx, 0.4, bz);
      barrel.castShadow = true;
      this.group.add(barrel);
      const embers = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 8), emberMat);
      embers.position.set(bx, 0.78, bz);
      this.group.add(embers);
    }

    // Where the fires burn (local space): the barrels, then the roof
    // joins in once the place is really getting wrecked.
    this.emitters.push(
      new THREE.Vector3(2.6, 0.9, -1.8),
      new THREE.Vector3(-1.6, 0.9, 2.6),
      new THREE.Vector3(0.4, 3.3, 0.4),
    );
  }

  /**
   * Swap the procedural placeholder crib for a bundled crashed_ship.glb
   * if one has been dropped into src/models/. Keeps the fire, smoke and
   * lights; reads `fire_01..03` empties for emitter positions when present.
   */
  async tryLoadModel() {
    const model = await loadModel('crashed_ship');
    if (!model) return;
    for (const child of this.group.children) {
      if ((child as THREE.Mesh).isMesh) child.visible = false;
    }
    this.group.add(model);
    const fires: THREE.Vector3[] = [];
    for (const name of ['fire_01', 'fire_02', 'fire_03']) {
      const node = model.getObjectByName(name);
      if (node) fires.push(node.getWorldPosition(new THREE.Vector3()).sub(this.position));
    }
    if (fires.length > 0) this.emitters = fires;
    this.modelLoaded = true;
  }

  get isDamaged() {
    return this.hp < this.maxHp;
  }

  get isDestroyed() {
    return this.hp <= 0;
  }

  get healthFraction() {
    return Math.max(0, this.hp / this.maxHp);
  }

  takeDamage(amount: number) {
    if (this.isDestroyed) return;
    this.hp = Math.max(0, this.hp - amount);
    this.flashTimer = 0.1;
  }

  repair(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  reset() {
    this.hp = this.maxHp;
    this.flashTimer = 0;
    for (const p of this.particles) {
      p.life = 0;
      p.mesh.visible = false;
    }
  }

  update(dt: number) {
    // Hit flash and a smoke-stained tint as damage accumulates.
    this.flashTimer -= dt;
    if (this.flashTimer > 0) {
      this.hullMat.emissive.setHex(0xffffff);
      this.hullMat.emissiveIntensity = 0.6;
    } else {
      this.hullMat.emissive.setHex(0xff3a14);
      this.hullMat.emissiveIntensity = (1 - this.healthFraction) * 0.25;
    }

    // Flickering firelight; burns brighter as the HQ deteriorates.
    this.flicker += dt * 22;
    const burn = 0.65 + (1 - this.healthFraction) * 0.8;
    this.fireLight.intensity = (24 + Math.sin(this.flicker) * 7 + Math.random() * 6) * burn;
    this.glowLight.intensity = 10 + Math.sin(this.flicker * 0.21) * 3;

    // Slow blink on the rooftop antenna (placeholder crib only).
    this.beaconTip.visible = !this.modelLoaded && Math.sin(this.flicker * 0.14) > -0.1;

    // Emit fire and smoke. More emitters join as health drops.
    const activeEmitters = this.healthFraction > 0.7 ? 1 : this.healthFraction > 0.4 ? 2 : 3;
    this.emitTimer -= dt;
    if (this.emitTimer <= 0) {
      this.emitTimer = 0.05 / burn;
      const origin = this.emitters[Math.floor(Math.random() * activeEmitters)];
      this.spawnParticle(origin);
    }

    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      const t = p.life / p.maxLife;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.x += (Math.random() - 0.5) * dt * 3;
      p.velocity.z += (Math.random() - 0.5) * dt * 3;
      if (p.smoke) {
        p.mesh.scale.setScalar(1.4 - t * 0.9);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.35 * t;
      } else {
        p.mesh.scale.setScalar(0.4 + t * 1.1);
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.min(1, t * 1.6);
        // Fire cools from yellow to deep orange as it rises.
        mat.color.setHex(t > 0.6 ? COLORS.ember : COLORS.fire);
      }
    }
  }

  private spawnParticle(origin: THREE.Vector3) {
    for (const p of this.particles) {
      if (p.life > 0) continue;
      p.life = p.maxLife = p.smoke ? 1.6 + Math.random() * 0.8 : 0.6 + Math.random() * 0.5;
      p.mesh.visible = true;
      // Emitters are in local HQ space; particles live in the scene.
      p.mesh.position.copy(origin).add(this.position);
      p.mesh.position.x += (Math.random() - 0.5) * 0.7;
      p.mesh.position.z += (Math.random() - 0.5) * 0.7;
      p.velocity.set(
        (Math.random() - 0.5) * 0.8,
        p.smoke ? 2.2 + Math.random() : 2.8 + Math.random() * 1.6,
        (Math.random() - 0.5) * 0.8,
      );
      return;
    }
  }
}
