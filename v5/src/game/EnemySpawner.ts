import {
  MAP_MAX_X,
  MAP_MAX_Z,
  MAP_MIN_X,
  MAP_MIN_Z,
  MAX_ENEMIES,
  THREAT_INTERVAL,
  THREAT_LULL,
  type EnemyKind,
} from './constants';
import type { EnemyStats } from './Enemy';
import type { GameManager } from './GameManager';

const BASE_STATS: Record<EnemyKind, { hp: number; speed: number; damage: number }> = {
  crawler: { hp: 22, speed: 2.2, damage: 8 },
  skitterer: { hp: 10, speed: 4.4, damage: 5 },
  brute: { hp: 90, speed: 1.5, damage: 22 },
  spitter: { hp: 18, speed: 1.9, damage: 9 },
};

/**
 * Spawns aliens forever from the map edge, ramping up pressure over time.
 * V5 pacing: threat rises slower, each rise grants a short spawn lull (a
 * breather to build in), early threat levels attack one front at a time,
 * skitterers join at threat 3 and brutes at threat 5.
 */
export class EnemySpawner {
  private spawnTimer = 2.5; // small grace period at the start
  private lastThreat = 1;
  private surgePending = false;

  elapsed = 0;

  get threatLevel(): number {
    return 1 + Math.floor(this.elapsed / THREAT_INTERVAL);
  }

  reset() {
    this.elapsed = 0;
    this.spawnTimer = 2.5;
    this.lastThreat = 1;
    this.surgePending = false;
  }

  private get spawnInterval(): number {
    // 2.6s between spawns at threat 1, shrinking ~7% per level, floor 0.5s.
    return Math.max(0.5, 2.6 * Math.pow(0.93, this.threatLevel - 1));
  }

  private pickKind(): EnemyKind {
    const t = this.threatLevel;
    let roll = Math.random();
    if (t >= 5) {
      const p = Math.min(0.2, 0.05 + t * 0.015);
      if (roll < p) return 'brute';
      roll -= p;
    }
    if (t >= 4 && roll < 0.18) return 'spitter';
    if (t >= 3 && roll < 0.45) return 'skitterer';
    return 'crawler';
  }

  private makeStats(kind: EnemyKind): EnemyStats {
    const t = this.threatLevel - 1;
    const base = BASE_STATS[kind];
    return {
      kind,
      hp: Math.round(base.hp * (1 + t * 0.16)),
      speed: Math.min(base.speed * 1.7, base.speed * (1 + t * 0.03)),
      damage: Math.round(base.damage * (1 + t * 0.05)),
    };
  }

  update(dt: number, game: GameManager) {
    this.elapsed += dt;

    // Each threat rise grants a lull — the swarm regroups, you build.
    // Every third level the regrouping ends in a surge: one big pack.
    if (this.threatLevel !== this.lastThreat) {
      this.lastThreat = this.threatLevel;
      this.spawnTimer = Math.max(this.spawnTimer, THREAT_LULL);
      if (this.threatLevel % 3 === 0) {
        this.surgePending = true;
        game.onSurge();
      } else {
        game.onSwarmLull();
      }
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = this.spawnInterval;

    if (game.enemies.length >= MAX_ENEMIES) return;

    // Higher threat occasionally sends small packs from one direction;
    // a pending surge arrives as one big one.
    let packSize =
      1 +
      (Math.random() < Math.min(0.5, this.threatLevel * 0.06) ? 1 : 0) +
      (this.threatLevel >= 6 && Math.random() < 0.3 ? 1 : 0);
    if (this.surgePending) {
      this.surgePending = false;
      packSize = Math.min(9, 5 + Math.floor(this.threatLevel / 2));
    }

    // Until threat 4, waves alternate fronts (west edge feeds the west
    // gap, north edge the north gap) so the early game is one fight at a
    // time. After that, anywhere.
    let fromWest: boolean;
    if (this.threatLevel < 4) {
      fromWest = this.threatLevel % 2 === 0;
    } else {
      fromWest = Math.random() < 0.5;
    }

    let px: number;
    let pz: number;
    if (fromWest) {
      px = MAP_MIN_X - 2;
      pz = MAP_MIN_Z + Math.random() * (MAP_MAX_Z - MAP_MIN_Z);
    } else {
      px = MAP_MIN_X + Math.random() * (MAP_MAX_X - MAP_MIN_X);
      pz = MAP_MIN_Z - 2;
    }

    for (let i = 0; i < packSize; i++) {
      const x = px + (Math.random() - 0.5) * 3;
      const z = pz + (Math.random() - 0.5) * 3;
      game.spawnEnemy(x, z, this.makeStats(this.pickKind()));
    }
  }
}
