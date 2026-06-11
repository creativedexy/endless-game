// Shared tuning values for Aurora Down. Tweak these to rebalance the game.

// V4 "Frontier": a big rectangular map. The base sits in the south-east
// corner against two cliff walls; the open quadrant faces north-west.
export const MAP_MIN_X = -26;
export const MAP_MAX_X = 18;
export const MAP_MIN_Z = -34;
export const MAP_MAX_Z = 18;

export const BASE_X = 12;
export const BASE_Z = 12;

// The defensive ridge: an impassable arc of crags (centred on the base)
// spanning the open quadrant, with two gaps that funnel everything.
export const RIDGE_RADIUS = 16;
export const RIDGE_BAND = 1.4; // half-thickness of the solid band
export const ARC_START = (160 * Math.PI) / 180; // arc spans the open quadrant
export const ARC_END = (290 * Math.PI) / 180;
export const GAP_ANGLES = [200, 250].map((d) => (d * Math.PI) / 180);
export const GAP_HALF_WIDTH = 0.28; // radians (~16°) half-width of each gap

// Ore deposits — V5 keeps them tucked safely behind the defence line,
// along the cliffs beside the wreck.
export const DEPOSITS: Array<{ x: number; z: number }> = [
  { x: 16, z: 0 },
  { x: 0, z: 16 },
];

export const SPRINT_DELAY = 1.5; // run this long, then speed ramps up
export const SPRINT_MULT = 1.25;

export const SHIP_MAX_HP = 500;
export const SHIP_RADIUS = 3.4; // attack / collision radius of the wreck
export const SHIP_INTERACT_RANGE = SHIP_RADIUS + 2.6;
export const SHIP_REPAIR_COST = 20; // salvage
export const SHIP_REPAIR_AMOUNT = 60;

export const START_ENERGY = 50;
export const START_SALVAGE = 30;

export const ENERGY_PICKUP_VALUE = 10;
export const SALVAGE_PICKUP_VALUE = 8;
export const DROP_VALUE = 5; // resources dropped by slain aliens
export const DROP_CHANCE = 0.35;
export const KILL_REWARD = 2; // guaranteed energy per kill — fighting funds building
export const MAX_PICKUPS = 10;
export const INITIAL_PICKUPS = 6; // scattered at game start so second 1 is active
export const PICKUP_SPAWN_INTERVAL = 2.6;
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
export const DASH_COOLDOWN = 1.0;

export const THREAT_INTERVAL = 35; // seconds per threat level
export const THREAT_LULL = 6; // spawn pause after each threat rise — breathe, build
export const MAX_ENEMIES = 55;

export const HULL_REGEN = 1.0; // hp/s the ship self-repairs when no aliens are near
export const HULL_REGEN_SAFE_RADIUS = 11;

export interface ResourceCost {
  energy: number;
  salvage: number;
}

export type StructureKind =
  | 'turret'
  | 'barrier'
  | 'extractor'
  | 'forge'
  | 'beacon'
  | 'factory'
  | 'mine'
  | 'village';

export interface PadSpot {
  x: number;
  z: number;
  kind: StructureKind;
  /** Built for free at game start, so the fort begins half-standing. */
  prebuilt?: boolean;
  /** Yaw for oriented structures (barriers span their gap). */
  angle?: number;
}

/**
 * Every build spot on the map — V5 has no blueprint selector, so the map
 * itself is the build menu: each spot is typed and builds exactly one
 * thing. The GameManager spawns pads from this and the Environment keeps
 * rocks and spires clear of them.
 *
 * Per gap: two turret sockets flanking inside, one forward socket
 * outside, and a single prebuilt barrier slot spanning the gap.
 * By the base: economy plots, village plots, and the ore deposits.
 */
export const PAD_LAYOUT: PadSpot[] = (() => {
  const pads: PadSpot[] = [];
  for (let gi = 0; gi < GAP_ANGLES.length; gi++) {
    const gap = GAP_ANGLES[gi];
    for (const side of [-1, 1]) {
      const a = gap + side * 0.2;
      pads.push({
        x: BASE_X + Math.cos(a) * 12.5,
        z: BASE_Z + Math.sin(a) * 12.5,
        kind: 'turret',
        prebuilt: gi === 0 && side === -1, // one gun is already up at the west gap
      });
    }
    pads.push({
      x: BASE_X + Math.cos(gap) * (RIDGE_RADIUS + 3.2),
      z: BASE_Z + Math.sin(gap) * (RIDGE_RADIUS + 3.2),
      kind: 'turret',
    });
    pads.push({
      x: BASE_X + Math.cos(gap) * RIDGE_RADIUS,
      z: BASE_Z + Math.sin(gap) * RIDGE_RADIUS,
      kind: 'barrier',
      angle: gap,
      prebuilt: true, // one fence per gap, already standing
    });
  }
  // Economy and support plots in the base ring.
  const ring: Array<[number, StructureKind]> = [
    [175, 'extractor'],
    [225, 'beacon'],
    [275, 'forge'],
  ];
  for (const [deg, kind] of ring) {
    const a = (deg * Math.PI) / 180;
    pads.push({ x: BASE_X + Math.cos(a) * 7, z: BASE_Z + Math.sin(a) * 7, kind });
  }
  pads.push({ x: BASE_X - 9.5, z: BASE_Z + 0.5, kind: 'factory' });
  pads.push({ x: BASE_X + 3.5, z: BASE_Z - 6.5, kind: 'village' });
  pads.push({ x: BASE_X - 6.5, z: BASE_Z + 3.5, kind: 'village' });
  for (const d of DEPOSITS) pads.push({ x: d.x, z: d.z, kind: 'mine' });
  return pads;
})();

export interface StructureDef {
  kind: StructureKind;
  name: string;
  icon: string;
  buildCost: ResourceCost;
  upgradeCost: ResourceCost[]; // cost of level n -> n+1 at index n-1
}

export const STRUCTURE_DEFS: Record<StructureKind, StructureDef> = {
  turret: {
    kind: 'turret',
    name: 'Blaster Turret',
    icon: '⌖',
    buildCost: { energy: 45, salvage: 0 },
    upgradeCost: [
      { energy: 55, salvage: 0 },
      { energy: 95, salvage: 0 },
      { energy: 170, salvage: 0 },
    ],
  },
  barrier: {
    kind: 'barrier',
    name: 'Shield Fence',
    icon: '⬡',
    buildCost: { energy: 0, salvage: 20 },
    upgradeCost: [
      { energy: 0, salvage: 30 },
      { energy: 0, salvage: 50 },
      { energy: 0, salvage: 85 },
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
      { energy: 110, salvage: 40 },
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
      { energy: 95, salvage: 65 },
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
      { energy: 95, salvage: 55 },
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
      { energy: 140, salvage: 95 },
    ],
  },
  mine: {
    kind: 'mine',
    name: 'Mine',
    icon: '⛏',
    buildCost: { energy: 35, salvage: 35 },
    upgradeCost: [
      { energy: 50, salvage: 40 },
      { energy: 80, salvage: 60 },
      { energy: 120, salvage: 95 },
    ],
  },
  village: {
    kind: 'village',
    name: 'Village',
    icon: '🏘',
    buildCost: { energy: 20, salvage: 35 },
    upgradeCost: [
      { energy: 30, salvage: 35 },
      { energy: 50, salvage: 55 },
      { energy: 80, salvage: 85 },
    ],
  },
};

export const MAX_LEVEL = 4;

// Per-level structure stats (index = level - 1).
export const TURRET_STATS = [
  { range: 8.0, damage: 8, fireRate: 1.4, maxHp: 70 },
  { range: 9.5, damage: 13, fireRate: 2.0, maxHp: 105 },
  { range: 11.0, damage: 20, fireRate: 2.7, maxHp: 150 },
  { range: 12.5, damage: 30, fireRate: 3.4, maxHp: 150 },
];

// Shield fences span their whole gap: aliens must chew through, but the
// player (and drones) pass freely.
export const BARRIER_STATS = [
  { maxHp: 250 },
  { maxHp: 450 },
  { maxHp: 700 },
  { maxHp: 1050 },
];
export const BARRIER_RADIUS = 4.6; // bump/attack radius covering the gap width

export const EXTRACTOR_STATS = [
  { maxHp: 80, energyPerTick: 4, tickInterval: 4 },
  { maxHp: 110, energyPerTick: 7, tickInterval: 4 },
  { maxHp: 150, energyPerTick: 11, tickInterval: 4 },
  { maxHp: 200, energyPerTick: 16, tickInterval: 4 },
];

export const BEACON_STATS = [
  { maxHp: 90, healPerSecond: 3, radius: 6 },
  { maxHp: 120, healPerSecond: 5, radius: 7 },
  { maxHp: 160, healPerSecond: 8, radius: 8 },
  { maxHp: 210, healPerSecond: 12, radius: 9 },
];

export const FORGE_STATS = [
  { maxHp: 85, salvagePerTick: 3, tickInterval: 5 },
  { maxHp: 115, salvagePerTick: 5, tickInterval: 5 },
  { maxHp: 155, salvagePerTick: 8, tickInterval: 5 },
  { maxHp: 205, salvagePerTick: 12, tickInterval: 5 },
];

export const FACTORY_STATS = [
  { maxHp: 110, maxArchers: 1 },
  { maxHp: 150, maxArchers: 2 },
  { maxHp: 200, maxArchers: 3 },
  { maxHp: 260, maxArchers: 4 },
];
export const ARCHER_REBUILD_TIME = 8; // seconds to replace a lost drone
export const MAX_ARCHERS = 5; // global cap across all factories

// Mines pay out both resources every tick — rich, but they sit out in
// the wilds where the aliens are.
export const MINE_STATS = [
  { maxHp: 120, energyPerTick: 2, salvagePerTick: 2, tickInterval: 5 },
  { maxHp: 165, energyPerTick: 4, salvagePerTick: 4, tickInterval: 5 },
  { maxHp: 220, energyPerTick: 6, salvagePerTick: 6, tickInterval: 5 },
  { maxHp: 290, energyPerTick: 9, salvagePerTick: 9, tickInterval: 5 },
];

export const VILLAGE_STATS = [
  { maxHp: 100, survivors: 1 },
  { maxHp: 140, survivors: 2 },
  { maxHp: 190, survivors: 3 },
  { maxHp: 250, survivors: 4 },
];
export const SURVIVOR_SPEED = 4.4;
export const SURVIVOR_RESPAWN_TIME = 10;
export const VILLAGE_COLLECT_RADIUS = 13; // survivors fetch pickups this far from home

export const ARCHER_STATS = {
  hp: 40,
  range: 8.5,
  damage: 5,
  fireInterval: 0.5,
  speed: 10.5,
  projectileSpeed: 20,
};

export type EnemyKind = 'crawler' | 'skitterer' | 'brute' | 'spitter';

export const SPIT_RANGE = 7; // spitters shell structures from out here
export const SPIT_FLIGHT_TIME = 0.7; // seconds an acid glob is airborne

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
  enemySpitter: 0xa4e84d,
  enemyHit: 0xffffff,
  player: 0xffc857,
  playerVisor: 0x37e6ff,
};
