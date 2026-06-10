// Shared tuning values. Tweak these to rebalance the game.

export const ARENA_RADIUS = 25; // playable area radius
export const SPAWN_RADIUS = ARENA_RADIUS + 4; // enemies appear just outside view

export const CORE_MAX_HP = 400;
export const CORE_RADIUS = 1.8;

export const START_ENERGY = 60;
export const CRYSTAL_VALUE = 10;
export const KILL_REWARD = 4;
export const MAX_CRYSTALS = 12;
export const CRYSTAL_SPAWN_INTERVAL = 2.4;

export const TURRET_BUILD_COST = 50;
export const TURRET_UPGRADE_COST = [80, 140]; // level 1 -> 2, level 2 -> 3
export const TURRET_MAX_LEVEL = 3;
export const TURRET_REPAIR_COST = 15;
export const TURRET_REPAIR_AMOUNT = 40;
export const CORE_REPAIR_COST = 20;
export const CORE_REPAIR_AMOUNT = 50;

export const INTERACT_RANGE = 2.6; // distance to a pad/turret to interact
export const CORE_INTERACT_RANGE = CORE_RADIUS + 2.2;

export const PLAYER_ATTACK_RANGE = 2.6;
export const PLAYER_ATTACK_DAMAGE = 14;
export const PLAYER_ATTACK_COOLDOWN = 0.3;
export const PLAYER_MAX_SPEED = 8.5;
export const PLAYER_ACCEL = 42;
export const PLAYER_FRICTION = 14;
export const DASH_SPEED = 24;
export const DASH_DURATION = 0.16;
export const DASH_COOLDOWN = 1.4;

export const THREAT_INTERVAL = 25; // seconds per threat level
export const MAX_ENEMIES = 60;

// Per-level turret stats (index = level - 1).
export const TURRET_STATS = [
  { range: 7.5, damage: 8, fireRate: 1.3, maxHp: 60 },
  { range: 9.0, damage: 13, fireRate: 1.9, maxHp: 95 },
  { range: 10.5, damage: 20, fireRate: 2.6, maxHp: 140 },
];

export const COLORS = {
  ground: 0xe0a35c,
  groundEdge: 0x8a5a3a,
  sky: 0x1a1033,
  fog: 0x2a1a4d,
  core: 0x2bd9ff,
  coreDamaged: 0xff7a3a,
  pad: 0x3a3357,
  padRing: 0x5cffd9,
  crystal: 0x3ff7d0,
  enemy: 0xc04df0,
  enemyHit: 0xffffff,
  turretBase: 0x9aa7c7,
  turretHead: 0x4d8df0,
  projectile: 0x7dffea,
  player: 0xffc857,
  playerVisor: 0x2bd9ff,
};
