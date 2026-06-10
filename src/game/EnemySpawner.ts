import { MAX_ENEMIES, SPAWN_RADIUS, THREAT_INTERVAL } from './constants';
import type { EnemyStats } from './Enemy';
import type { GameManager } from './GameManager';

/**
 * Spawns enemies forever from the map edge, ramping up pressure over time.
 * Threat level rises every THREAT_INTERVAL seconds and drives enemy stats,
 * spawn rate, and group size.
 */
export class EnemySpawner {
  private spawnTimer = 2.5; // small grace period at the start

  get threatLevel(): number {
    return 1 + Math.floor(this.elapsed / THREAT_INTERVAL);
  }

  elapsed = 0;

  reset() {
    this.elapsed = 0;
    this.spawnTimer = 2.5;
  }

  private get spawnInterval(): number {
    // 2.6s between spawns at threat 1, shrinking ~7% per level, floor 0.55s.
    return Math.max(0.55, 2.6 * Math.pow(0.93, this.threatLevel - 1));
  }

  private makeStats(): EnemyStats {
    const t = this.threatLevel - 1;
    return {
      hp: Math.round(16 * (1 + t * 0.18)),
      speed: Math.min(4.2, 2.3 + t * 0.08),
      damage: Math.round(6 * (1 + t * 0.06)),
    };
  }

  update(dt: number, game: GameManager) {
    this.elapsed += dt;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = this.spawnInterval;

    if (game.enemies.length >= MAX_ENEMIES) return;

    // Higher threat occasionally sends small packs from one direction.
    const packSize = 1 + (Math.random() < Math.min(0.5, this.threatLevel * 0.05) ? 1 : 0)
      + (this.threatLevel >= 6 && Math.random() < 0.3 ? 1 : 0);
    const baseAngle = Math.random() * Math.PI * 2;

    for (let i = 0; i < packSize; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * 0.5;
      const x = Math.cos(angle) * SPAWN_RADIUS;
      const z = Math.sin(angle) * SPAWN_RADIUS;
      game.spawnEnemy(x, z, this.makeStats());
    }
  }
}
