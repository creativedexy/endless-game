import * as THREE from 'three';
import {
  ARC_END,
  ARC_START,
  BASE_X,
  BASE_Z,
  GAP_ANGLES,
  GAP_HALF_WIDTH,
  RIDGE_BAND,
  RIDGE_RADIUS,
} from './constants';

/**
 * The defensive arc: an impassable curve of crags centred on the base,
 * spanning the open quadrant of the corner map, with two gaps.
 * Everything funnels through the gaps; the cliffs cover the rest.
 */

/** Smallest signed angle difference a-b in [-PI, PI]. */
function angleDiff(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** Angle of a world position as seen from the base, in [0, 2PI). */
export function angleFromBase(x: number, z: number): number {
  let a = Math.atan2(z - BASE_Z, x - BASE_X);
  if (a < 0) a += Math.PI * 2;
  return a;
}

/** Distance of a world position from the base. */
export function distFromBase(x: number, z: number): number {
  return Math.hypot(x - BASE_X, z - BASE_Z);
}

/** Is this base-relative angle within the crag arc at all? */
export function inArc(angle: number): boolean {
  return angle >= ARC_START && angle <= ARC_END;
}

/** Is this base-relative angle inside one of the gaps? */
export function inGap(angle: number): boolean {
  return GAP_ANGLES.some((g) => Math.abs(angleDiff(angle, g)) < GAP_HALF_WIDTH);
}

/** World-space centre point (at ridge radius) of the gap nearest to `from`. */
export function nearestGapPoint(from: THREE.Vector3): THREE.Vector3 {
  const a = angleFromBase(from.x, from.z);
  let best = GAP_ANGLES[0];
  let bestD = Infinity;
  for (const g of GAP_ANGLES) {
    const d = Math.abs(angleDiff(a, g));
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  return new THREE.Vector3(
    BASE_X + Math.cos(best) * RIDGE_RADIUS,
    0,
    BASE_Z + Math.sin(best) * RIDGE_RADIUS,
  );
}

/**
 * Keep a position out of the solid part of the arc band by pushing it
 * radially (relative to the base) back to whichever side it came from.
 * Mutates `pos`.
 */
export function clampToRidge(pos: THREE.Vector3) {
  const r = distFromBase(pos.x, pos.z);
  if (r < RIDGE_RADIUS - RIDGE_BAND || r > RIDGE_RADIUS + RIDGE_BAND) return;
  const a = angleFromBase(pos.x, pos.z);
  if (!inArc(a) || inGap(a)) return;
  const newR = r < RIDGE_RADIUS ? RIDGE_RADIUS - RIDGE_BAND : RIDGE_RADIUS + RIDGE_BAND;
  pos.x = BASE_X + Math.cos(a) * newR;
  pos.z = BASE_Z + Math.sin(a) * newR;
}
