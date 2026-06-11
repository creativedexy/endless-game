import * as THREE from 'three';
import { COLORS, STRUCTURE_DEFS, type StructureKind } from './constants';
import type { Structure } from './Structure';

/**
 * A fixed hex pad where one structure can be placed. The ring glows
 * brighter when the player is close, and softly when anything is
 * affordable, so buildable spots read at a glance.
 *
 * Node pads (`fixedKind` set) only accept their own building: ore
 * deposits take a Mine, village plots take a Village. They get their
 * own ring colour and decoration so the world tells you what goes where.
 */
export class BuildPad {
  readonly position: THREE.Vector3;
  structure: Structure | null = null;

  private ring: THREE.Mesh;
  private ringMat: THREE.MeshBasicMaterial;
  private progressRing: THREE.Mesh;
  private progressMat: THREE.MeshBasicMaterial;
  private progressShown = 0;
  private pulse = Math.random() * 10;
  private near = false;
  private affordable = false;
  private denyPulse = 0;
  private decor: THREE.Group | null = null;
  private readonly ringColor: number;

  constructor(
    scene: THREE.Scene,
    x: number,
    z: number,
    readonly fixedKind: StructureKind,
    readonly spotAngle = 0,
  ) {
    this.position = new THREE.Vector3(x, 0, z);
    // Each socket type has its own ring colour, so the fort layout reads
    // at a glance with no build UI at all.
    const ringColors: Record<StructureKind, number> = {
      turret: COLORS.padRing,
      barrier: COLORS.shipGlow,
      extractor: COLORS.energy,
      forge: COLORS.salvage,
      beacon: COLORS.beacon,
      factory: COLORS.factory,
      mine: COLORS.salvage,
      village: COLORS.beacon,
    };
    this.ringColor = ringColors[fixedKind];

    const slab = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.4, 0.18, 6),
      new THREE.MeshStandardMaterial({
        color: fixedKind === 'mine' ? 0x4a3c2e : COLORS.pad,
        flatShading: true,
        roughness: 0.8,
      }),
    );
    slab.position.set(x, 0.09, z);
    slab.receiveShadow = true;
    scene.add(slab);

    // Ore deposits show raw glowing crystals until mined.
    if (fixedKind === 'mine') {
      this.decor = new THREE.Group();
      this.decor.position.set(x, 0, z);
      const oreMat = new THREE.MeshStandardMaterial({
        color: COLORS.salvage,
        emissive: COLORS.salvage,
        emissiveIntensity: 0.7,
        flatShading: true,
      });
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        const ore = new THREE.Mesh(new THREE.OctahedronGeometry(0.28 + i * 0.08), oreMat);
        ore.position.set(Math.cos(a) * 0.5, 0.35 + i * 0.05, Math.sin(a) * 0.5);
        ore.rotation.set(i, i * 2, 0);
        this.decor.add(ore);
      }
      scene.add(this.decor);
    }

    this.ringMat = new THREE.MeshBasicMaterial({
      color: this.ringColor,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.3, 6), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.set(x, 0.2, z);
    scene.add(this.ring);

    // Dwell progress: an arc that sweeps around the pad while the player
    // stands on it. Geometry is rebuilt only when the fraction changes.
    this.progressMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.progressRing = new THREE.Mesh(new THREE.BufferGeometry(), this.progressMat);
    this.progressRing.rotation.x = -Math.PI / 2;
    this.progressRing.position.set(x, 0.24, z);
    this.progressRing.visible = false;
    scene.add(this.progressRing);
  }

  /** Show the dwell arc (0..1). Pass 0 to hide. */
  setProgress(fraction: number, color: number) {
    if (fraction <= 0) {
      if (this.progressRing.visible) this.progressRing.visible = false;
      this.progressShown = 0;
      return;
    }
    this.progressMat.color.setHex(color);
    this.progressRing.visible = true;
    if (Math.abs(fraction - this.progressShown) < 0.02) return;
    this.progressShown = fraction;
    this.progressRing.geometry.dispose();
    this.progressRing.geometry = new THREE.RingGeometry(
      1.45,
      1.7,
      32,
      1,
      Math.PI / 2,
      -fraction * Math.PI * 2,
    );
  }

  /** Brief red flare when the player dwells but can't afford the action. */
  pulseDenied() {
    this.denyPulse = 0.5;
  }

  get isEmpty() {
    return this.structure === null || this.structure.destroyed;
  }

  /** The one thing this socket builds. */
  get def() {
    return STRUCTURE_DEFS[this.fixedKind];
  }

  setState(near: boolean, affordable: boolean) {
    this.near = near;
    this.affordable = affordable;
  }

  update(dt: number) {
    this.pulse += dt * 3;
    this.ring.rotation.z += dt * 0.4;
    if (this.decor) {
      this.decor.visible = this.isEmpty;
      if (this.decor.visible) this.decor.rotation.y = Math.sin(this.pulse * 0.3) * 0.05;
    }
    if (this.denyPulse > 0) {
      this.denyPulse -= dt;
      this.ringMat.color.setHex(0xff5346);
      this.ringMat.opacity = 0.5 + Math.sin(this.denyPulse * 25) * 0.3;
      return;
    }
    if (!this.isEmpty) {
      this.ringMat.color.setHex(this.ringColor);
      this.ringMat.opacity = 0.08;
      return;
    }
    if (this.near) {
      this.ringMat.color.setHex(this.affordable ? this.ringColor : 0xff7a5e);
      this.ringMat.opacity = 0.65 + Math.sin(this.pulse * 2) * 0.2;
    } else if (this.affordable) {
      this.ringMat.color.setHex(this.ringColor);
      this.ringMat.opacity = 0.3 + Math.sin(this.pulse) * 0.12;
    } else {
      this.ringMat.color.setHex(this.ringColor);
      this.ringMat.opacity = 0.12;
    }
  }
}
