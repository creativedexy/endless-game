import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Low-poly model pipeline. Drop .glb files into `v3/src/models/` and they
 * are bundled by Vite and picked up here automatically — no code changes,
 * no 404s when a model is missing (we glob at build time and fall back to
 * the procedural placeholder geometry).
 *
 * Expected files (see v3/src/models/README.md): crashed_ship.glb,
 * drone_archer.glb, factory.glb, decor_pack.glb
 */
const MODEL_URLS = import.meta.glob('../models/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Group | null>>();

export function modelAvailable(name: string): boolean {
  return Object.keys(MODEL_URLS).some((p) => p.endsWith(`/${name}.glb`));
}

/** Load a bundled model by name ("crashed_ship"), or null if not present. */
export function loadModel(name: string): Promise<THREE.Group | null> {
  const entry = Object.entries(MODEL_URLS).find(([p]) => p.endsWith(`/${name}.glb`));
  if (!entry) return Promise.resolve(null);
  let p = cache.get(name);
  if (!p) {
    p = loader
      .loadAsync(entry[1])
      .then((gltf) => {
        gltf.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        return gltf.scene;
      })
      .catch((err) => {
        console.warn(`Failed to load model "${name}":`, err);
        return null;
      });
    cache.set(name, p);
  }
  // Each caller gets their own clone so models can be reused.
  return p.then((g) => (g ? (g.clone(true) as THREE.Group) : null));
}
