// Shared tuning values for Aurora Down. Tweak these to rebalance the game.

export const ARENA_RADIUS = 24; // playable area radius
export const SPAWN_RADIUS = ARENA_RADIUS + 4; // enemies appear just outside view

export const SHIP_MAX_HP = 500;
export const SHIP_RADIUS = 3.4; // attack / collision radius of the wreck
export const SHIP_INTERACT_RANGE = SHIP_RADIUS + 2.6;
export const SHIP_REPAIR_COST = 15; // salvage
export const SHIP_REPAIR_AMOUNT = 60;

export const START_ENERGY = 60;
export const START_SALVAGE = 40;

export const ENERGY_PICKUP_VALUE = 10;
export const SALVAGE_PICKUP_VALUE = 8;
export const DROP_VALUE = 6; // resources dropped by slain aliens
export const DROP_CHANCE = 0.45;
export const KILL_REWARD = 2; // guaranteed energy per kill — fighting funds building
export const MAX_PICKUPS = 14;
export const INITIAL_PICKUPS = 8; // scattered at game start so second 1 is active
export const PICKUP_SPAWN_INTERVAL = 2.0;
export const PICKUP_MAGNET_RANGE = 2.4; // pickups drift toward the player
export const PICKUP_COLLECT_RANGE = 1.1;

export const INTERACT_RANGE = 2.4; // distance to a build pad to interact

// Hover-to-act: standing on a spot fills a progress ring, then acts.
export const BUILD_DWELL = 0.55; // seconds standing on an empty pad to build
export const UPGRADE_DWELL = 0.9; // longer, so upgrades never happen by accident
export const REPAIR_DWELL = 0.5; // one repair "cycle" while standing nearby

export const STRUCTURE_REPAIR_COST = 10; // salvage per repair cycle
export const STRUCTURE_REPAIR_AMOUNT = 60;

export const GUN_RANGE = 10; // auto-aim acquisition range
export const GUN_DAMAGE = 9;
export const GUN_FIRE_INTERVAL = 0.22;
export const PROJECTILE_SPEED = 26;

export const PLAYER_MAX_SPEED = 9.2;
export const PLAYER_ACCEL = 48;
export const PLAYER_FRICTION = 14;
export const DASH_SPEED = 26;
export const DASH_DURATION = 0.16;
export const DASH_COOLDOWN = 1.1;

export const THREAT_INTERVAL = 25; // seconds per threat level
export const MAX_ENEMIES = 55;

export interface ResourceCost {
  energy: number;
  salvage: number;
}

export type StructureKind =
  | 'turret'
  | 'wall'
  | 'extractor'
  | 'forge'
  | 'beacon'
  | 'factory';

export interface StructureDef {
  kind: StructureKind;
  name: string;
  icon: string;
  buildCost: ResourceCost;
  upgradeCost: [ResourceCost, ResourceCost]; // level 1 -> 2, level 2 -> 3
}

export const STRUCTURE_DEFS: Record<StructureKind, StructureDef> = {
  turret: {
    kind: 'turret',
    name: 'Blaster Turret',
    icon: '⌖',
    buildCost: { energy: 45, salvage: 0 },
    upgradeCost: [
      { energy: 70, salvage: 0 },
      { energy: 120, salvage: 0 },
    ],
  },
  wall: {
    kind: 'wall',
    name: 'Barrier Node',
    icon: '⬡',
    buildCost: { energy: 0, salvage: 30 },
    upgradeCost: [
      { energy: 0, salvage: 25 },
      { energy: 0, salvage: 45 },
    ],
  },
  extractor: {
    kind: 'extractor',
    name: 'Power Relay',
    icon: '⚡',
    buildCost: { energy: 30, salvage: 15 },
    upgradeCost: [
      { energy: 40, salvage: 15 },
      { energy: 70, salvage: 25 },
    ],
  },
  forge: {
    kind: 'forge',
    name: 'Salvage Forge',
    icon: '⚒',
    buildCost: { energy: 25, salvage: 20 },
    upgradeCost: [
      { energy: 35, salvage: 25 },
      { energy: 60, salvage: 40 },
    ],
  },
  beacon: {
    kind: 'beacon',
    name: 'Repair Beacon',
    icon: '✚',
    buildCost: { energy: 25, salvage: 25 },
    upgradeCost: [
      { energy: 35, salvage: 20 },
      { energy: 60, salvage: 35 },
    ],
  },
  factory: {
    kind: 'factory',
    name: 'Drone Factory',
    icon: '⚙',
    buildCost: { energy: 50, salvage: 40 },
    upgradeCost: [
      { energy: 60, salvage: 40 },
      { energy: 90, salvage: 60 },
    ],
  },
};

export const MAX_LEVEL = 3;

// Per-level structure stats (index = level - 1).
export const TURRET_STATS = [
  { range: 8.0, damage: 8, fireRate: 1.4, maxHp: 70 },
  { range: 9.5, damage: 13, fireRate: 2.0, maxHp: 105 },
  { range: 11.0, damage: 20, fireRate: 2.7, maxHp: 150 },
];

export const WALL_STATS = [{ maxHp: 160 }, { maxHp: 280 }, { maxHp: 420 }];

export const EXTRACTOR_STATS = [
  { maxHp: 80, energyPerTick: 4, tickInterval: 4 },
  { maxHp: 110, energyPerTick: 7, tickInterval: 4 },
  { maxHp: 150, energyPerTick: 11, tickInterval: 4 },
];

export const BEACON_STATS = [
  { maxHp: 90, healPerSecond: 3, radius: 6 },
  { maxHp: 120, healPerSecond: 5, radius: 7 },
  { maxHp: 160, healPerSecond: 8, radius: 8 },
];

export const FORGE_STATS = [
  { maxHp: 85, salvagePerTick: 3, tickInterval: 5 },
  { maxHp: 115, salvagePerTick: 5, tickInterval: 5 },
  { maxHp: 155, salvagePerTick: 8, tickInterval: 5 },
];

export const FACTORY_STATS = [
  { maxHp: 110, maxArchers: 1 },
  { maxHp: 150, maxArchers: 2 },
  { maxHp: 200, maxArchers: 3 },
];
export const ARCHER_REBUILD_TIME = 8; // seconds to replace a lost drone
export const MAX_ARCHERS = 4; // global cap across all factories

export const ARCHER_STATS = {
  hp: 40,
  range: 8.5,
  damage: 5,
  fireInterval: 0.5,
  speed: 10.5,
  projectileSpeed: 20,
};

export type EnemyKind = 'crawler' | 'skitterer' | 'brute';

export const COLORS = {
  sky: 0x101a2e,
  fog: 0x2a3f5e,
  snow: 0xdfe9f5,
  snowDeep: 0xb8c9de,
  ice: 0x9fe8ff,
  energy: 0x35f0d0,
  salvage: 0xffa94d,
  fire: 0xff7a26,
  ember: 0xffc14d,
  smoke: 0x3c4150,
  scorch: 0x1b1f29,
  shipHull: 0x8d99ad,
  shipDark: 0x4a5263,
  shipGlow: 0x37e6ff,
  pad: 0x2e3a52,
  padRing: 0x52f5ff,
  turretBase: 0xa3b3cc,
  turretHead: 0x4d9df0,
  wall: 0x7e8aa3,
  extractor: 0x35f0d0,
  forge: 0xffa94d,
  beacon: 0x7dff9a,
  factory: 0xffd166,
  archer: 0x8fd3ff,
  projectile: 0x8cf6ff,
  playerProjectile: 0x5cffd9,
  enemyCrawler: 0x9b4df0,
  enemySkitterer: 0xf04dc4,
  enemyBrute: 0xd6453a,
  enemyHit: 0xffffff,
  player: 0xffc857,
  playerVisor: 0x37e6ff,
};
