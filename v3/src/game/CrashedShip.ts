import * as THREE from 'three';
import { COLORS, SHIP_MAX_HP, SHIP_RADIUS } from './constants';
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
 * The wrecked ship at the centre of the map — the thing you are keeping
 * alive. Half-buried, tilted, and burning: it runs its own fire/smoke
 * particle emitters and flickering lights. The fire grows as hull
 * integrity drops.
 */
export class CrashedShip {
  readonly position = new THREE.Vector3(0, 0, 0);
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

  // Fire emitter points in local ship space (filled in by buildWreck).
  private emitters: THREE.Vector3[] = [];

  constructor(scene: THREE.Scene) {
    this.hullMat = new THREE.MeshStandardMaterial({
      color: COLORS.shipHull,
      flatShading: true,
      roughness: 0.6,
      metalness: 0.05,
    });
    this.windowMat = new THREE.MeshStandardMaterial({
      color: COLORS.shipGlow,
      emissive: COLORS.shipGlow,
      emissiveIntensity: 1.0,
    });

    this.buildWreck();
    scene.add(this.group);

    this.fireLight = new THREE.PointLight(COLORS.fire, 30, 16);
    this.fireLight.position.set(1.2, 2.2, -0.5);
    this.group.add(this.fireLight);

    this.glowLight = new THREE.PointLight(COLORS.shipGlow, 14, 12);
    this.glowLight.position.set(-2.2, 1.2, 1.5);
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

  private buildWreck() {
    // Main fuselage: a tilted, half-buried cylinder.
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.9, 6.5, 10), this.hullMat);
    hull.rotation.z = Math.PI / 2 - 0.12;
    hull.rotation.y = 0.35;
    hull.position.set(0, 1.0, 0);
    hull.castShadow = true;
    hull.receiveShadow = true;
    this.group.add(hull);

    // Nose cone, dug into the snow.
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.45, 2.4, 10), this.hullMat);
    nose.rotation.z = -Math.PI / 2 - 0.25;
    nose.rotation.y = 0.35;
    nose.position.set(-3.6, 0.55, -1.3);
    nose.castShadow = true;
    this.group.add(nose);

    // Engine block with a glowing (dying) thruster ring.
    const darkMat = new THREE.MeshStandardMaterial({
      color: COLORS.shipDark,
      flatShading: true,
      roughness: 0.8,
    });
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.35, 1.4, 8), darkMat);
    engine.rotation.z = Math.PI / 2 - 0.12;
    engine.rotation.y = 0.35;
    engine.position.set(3.2, 1.45, 1.15);
    engine.castShadow = true;
    this.group.add(engine);
    const thruster = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.16, 6, 12),
      this.windowMat,
    );
    thruster.rotation.y = Math.PI / 2 - 0.35;
    thruster.position.set(4.0, 1.55, 1.45);
    this.group.add(thruster);

    // One intact wing and one snapped stub.
    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 1.6), this.hullMat);
    wing.position.set(0.6, 1.5, 2.4);
    wing.rotation.y = -0.4;
    wing.rotation.x = 0.18;
    wing.castShadow = true;
    this.group.add(wing);
    const stub = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 1.3), this.hullMat);
    stub.position.set(-0.4, 1.7, -2.2);
    stub.rotation.y = 0.7;
    stub.rotation.z = 0.35;
    this.group.add(stub);

    // Tail fin.
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.6, 1.2), this.hullMat);
    fin.position.set(2.2, 2.5, 0.7);
    fin.rotation.z = -0.25;
    fin.castShadow = true;
    this.group.add(fin);

    // Glowing windows along the hull.
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.06), this.windowMat);
      w.position.set(-1.6 + i * 1.0, 1.55 + i * 0.1, 1.45 - i * 0.35);
      w.rotation.y = 0.35;
      this.group.add(w);
    }

    // Cracked cockpit canopy over the buried nose.
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0x1d2c44,
        emissive: COLORS.shipGlow,
        emissiveIntensity: 0.3,
        flatShading: true,
      }),
    );
    canopy.position.set(-2.5, 1.15, -1.0);
    canopy.rotation.z = 0.5;
    this.group.add(canopy);

    // Bent comms mast with a blinking warning tip.
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.0, 5), this.hullMat);
    mast.position.set(1.4, 3.0, -0.4);
    mast.rotation.z = 0.45;
    mast.rotation.x = -0.2;
    this.group.add(mast);
    this.beaconTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: COLORS.fire }),
    );
    this.beaconTip.position.set(2.0, 3.85, -0.6);
    this.group.add(this.beaconTip);

    // Torn structural ribs poking out of the hull breach.
    for (let i = 0; i < 3; i++) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.7 + i * 0.15, 0.16),
        new THREE.MeshStandardMaterial({ color: COLORS.shipDark, flatShading: true }),
      );
      rib.position.set(0.7 + i * 0.5, 2.15, -0.55 + (i % 2) * 0.3);
      rib.rotation.z = -0.5 + i * 0.4;
      rib.rotation.x = 0.3;
      this.group.add(rib);
    }

    // Where the fires burn (local space): hull breach + engine + wing root.
    this.emitters.push(
      new THREE.Vector3(1.2, 2.0, -0.6),
      new THREE.Vector3(3.4, 2.2, 1.2),
      new THREE.Vector3(-1.8, 1.6, 0.8),
    );
  }

  /**
   * Swap the procedural placeholder wreck for the bundled crashed_ship.glb
   * if one has been dropped into v3/src/models/. Keeps the fire, smoke and
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
      if (node) fires.push(node.getWorldPosition(new THREE.Vector3()));
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
    // Hit flash and a cold→hot hull tint as damage accumulates.
    this.flashTimer -= dt;
    if (this.flashTimer > 0) {
      this.hullMat.emissive.setHex(0xffffff);
      this.hullMat.emissiveIntensity = 0.6;
    } else {
      this.hullMat.emissive.setHex(0xff3a14);
      this.hullMat.emissiveIntensity = (1 - this.healthFraction) * 0.25;
    }

    // Flickering firelight; burns brighter as the ship deteriorates.
    this.flicker += dt * 22;
    const burn = 0.65 + (1 - this.healthFraction) * 0.8;
    this.fireLight.intensity = (24 + Math.sin(this.flicker) * 7 + Math.random() * 6) * burn;
    this.glowLight.intensity = 10 + Math.sin(this.flicker * 0.21) * 3;

    // Slow distress blink on the comms mast (placeholder wreck only).
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
      p.mesh.position.copy(origin);
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
