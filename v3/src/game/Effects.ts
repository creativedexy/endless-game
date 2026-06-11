import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

interface FloatText {
  el: HTMLDivElement;
  worldPos: THREE.Vector3;
  life: number;
}

const PARTICLE_POOL_SIZE = 180;

/**
 * Lightweight juice: pooled burst particles and DOM-based floating
 * combat/resource numbers projected from world space.
 */
export class Effects {
  private particles: Particle[] = [];
  private floats: FloatText[] = [];
  private projected = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
  ) {
    const geo = new THREE.TetrahedronGeometry(0.16);
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0,
        active: false,
      });
    }
  }

  /** Spawn a burst of flying shards at a world position. */
  burst(position: THREE.Vector3, color: number, count = 10, speed = 6) {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.mesh.visible = true;
      p.mesh.position.copy(position);
      p.mesh.scale.setScalar(0.7 + Math.random() * 0.8);
      (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      const angle = Math.random() * Math.PI * 2;
      const up = 2 + Math.random() * 4;
      p.velocity.set(
        Math.cos(angle) * speed * (0.4 + Math.random() * 0.6),
        up,
        Math.sin(angle) * speed * (0.4 + Math.random() * 0.6),
      );
      p.maxLife = p.life = 0.45 + Math.random() * 0.3;
      if (++spawned >= count) break;
    }
  }

  /** Floating text (e.g. "+10") that drifts up and fades. */
  floatText(worldPos: THREE.Vector3, text: string, color = '#5cffd9') {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    el.style.color = color;
    document.body.appendChild(el);
    this.floats.push({ el, worldPos: worldPos.clone(), life: 1.0 });
  }

  update(dt: number) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.velocity.y -= 18 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      if (p.mesh.position.y < 0.05) {
        p.mesh.position.y = 0.05;
        p.velocity.y *= -0.4;
      }
      p.mesh.rotation.x += dt * 8;
      p.mesh.rotation.y += dt * 6;
      const s = (p.life / p.maxLife) * 0.9;
      p.mesh.scale.setScalar(Math.max(0.05, s));
    }

    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= dt;
      if (f.life <= 0) {
        f.el.remove();
        this.floats.splice(i, 1);
        continue;
      }
      f.worldPos.y += dt * 1.6;
      this.projected.copy(f.worldPos).project(this.camera);
      const x = (this.projected.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-this.projected.y * 0.5 + 0.5) * window.innerHeight;
      f.el.style.left = `${x}px`;
      f.el.style.top = `${y}px`;
      f.el.style.opacity = String(Math.min(1, f.life * 2));
    }
  }

  clear() {
    for (const p of this.particles) {
      p.active = false;
      p.mesh.visible = false;
    }
    for (const f of this.floats) f.el.remove();
    this.floats.length = 0;
  }
}
