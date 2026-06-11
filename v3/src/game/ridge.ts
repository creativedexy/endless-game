import * as THREE from 'three';
import { GAP_ANGLES, GAP_HALF_WIDTH, RIDGE_BAND, RIDGE_RADIUS } from './constants';

/**
 * The defensive ridge: an impassable ring of crags at RIDGE_RADIUS with a
 * few gaps. Everything (player, enemies) must funnel through the gaps,
 * which is where the fights happen.
 */

/** Smallest signed angle difference a-b in [-PI, PI]. */
function angleDiff(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** Is this world angle inside one of the ridge gaps? */
export function inGap(angle: number): boolean {
  return GAP_ANGLES.some((g) => Math.abs(angleDiff(angle, g)) < GAP_HALF_WIDTH);
}

/** Centre point (at ridge radius) of the gap nearest to `from`. */
export function nearestGapPoint(from: THREE.Vector3): THREE.Vector3 {
  const a = Math.atan2(from.z, from.x);
  let best = GAP_ANGLES[0];
  let bestD = Infinity;
  for (const g of GAP_ANGLES) {
    const d = Math.abs(angleDiff(a, g));
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  return new THREE.Vector3(Math.cos(best) * RIDGE_RADIUS, 0, Math.sin(best) * RIDGE_RADIUS);
}

/**
 * Keep a position out of the solid part of the ridge band by pushing it
 * radially back to whichever side it came from. Mutates `pos`.
 */
export function clampToRidge(pos: THREE.Vector3) {
  const r = Math.hypot(pos.x, pos.z);
  if (r < RIDGE_RADIUS - RIDGE_BAND || r > RIDGE_RADIUS + RIDGE_BAND) return;
  if (inGap(Math.atan2(pos.z, pos.x))) return;
  const mid = RIDGE_RADIUS;
  const newR = r < mid ? RIDGE_RADIUS - RIDGE_BAND : RIDGE_RADIUS + RIDGE_BAND;
  const scale = newR / (r || 0.0001);
  pos.x *= scale;
  pos.z *= scale;
}
