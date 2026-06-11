import {
  MAX_ENEMIES,
  SPAWN_RADIUS,
  THREAT_INTERVAL,
  type EnemyKind,
} from './constants';
import type { EnemyStats } from './Enemy';
import type { GameManager } from './GameManager';

const BASE_STATS: Record<EnemyKind, { hp: number; speed: number; damage: number }> = {
  crawler: { hp: 22, speed: 2.2, damage: 8 },
  skitterer: { hp: 10, speed: 4.4, damage: 5 },
  brute: { hp: 90, speed: 1.5, damage: 22 },
};

/**
 * Spawns aliens forever from the map edge, ramping up pressure over time.
 * Threat level rises every THREAT_INTERVAL seconds and drives the enemy
 * mix, stats, spawn rate, and pack size. Skitterers join at threat 2,
 * brutes at threat 4.
 */
export class EnemySpawner {
  private spawnTimer = 3.0; // small grace period at the start

  elapsed = 0;

  get threatLevel(): number {
    return 1 + Math.floor(this.elapsed / THREAT_INTERVAL);
  }

  reset() {
    this.elapsed = 0;
    this.spawnTimer = 3.0;
  }

  private get spawnInterval(): number {
    // 2.5s between spawns at threat 1, shrinking ~7% per level, floor 0.5s.
    return Math.max(0.5, 2.5 * Math.pow(0.93, this.threatLevel - 1));
  }

  private pickKind(): EnemyKind {
    const t = this.threatLevel;
    const roll = Math.random();
    if (t >= 4 && roll < Math.min(0.22, 0.08 + t * 0.018)) return 'brute';
    if (t >= 2 && roll < 0.45) return 'skitterer';
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
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = this.spawnInterval;

    if (game.enemies.length >= MAX_ENEMIES) return;

    // Higher threat occasionally sends small packs from one direction.
    const packSize =
      1 +
      (Math.random() < Math.min(0.5, this.threatLevel * 0.06) ? 1 : 0) +
      (this.threatLevel >= 6 && Math.random() < 0.3 ? 1 : 0);
    const baseAngle = Math.random() * Math.PI * 2;

    for (let i = 0; i < packSize; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * 0.5;
      const x = Math.cos(angle) * SPAWN_RADIUS;
      const z = Math.sin(angle) * SPAWN_RADIUS;
      game.spawnEnemy(x, z, this.makeStats(this.pickKind()));
    }
  }
}
