import * as THREE from 'three';
import { Archer } from './Archer';
import { BuildPad } from './BuildPad';
import { CameraController } from './CameraController';
import { CrashedShip } from './CrashedShip';
import { Effects } from './Effects';
import { Enemy, type EnemyStats } from './Enemy';
import { EnemySpawner } from './EnemySpawner';
import { Environment } from './Environment';
import { Extractor } from './Extractor';
import { Factory } from './Factory';
import { Forge } from './Forge';
import { MobileControls } from './MobileControls';
import { Pickup, type PickupType } from './Pickup';
import { PlayerController } from './PlayerController';
import { Projectile } from './Projectile';
import { RepairBeacon } from './RepairBeacon';
import { Sound } from './Sound';
import { Structure } from './Structure';
import { Turret } from './Turret';
import { UIManager } from './UIManager';
import { Mine } from './Mine';
import { Survivor } from './Survivor';
import { Village } from './Village';
import {
  BUILD_DWELL,
  COLORS,
  DASH_DAMAGE,
  DASH_HIT_RADIUS,
  GUN_SPLASH_FACTOR,
  GUN_SPLASH_RADIUS,
  DROP_CHANCE,
  DROP_VALUE,
  ENERGY_PICKUP_VALUE,
  GUN_DAMAGE,
  INITIAL_PICKUPS,
  KILL_REWARD,
  GUN_FIRE_INTERVAL,
  GUN_RANGE,
  INTERACT_RANGE,
  MAX_PICKUPS,
  PICKUP_COLLECT_RANGE,
  PICKUP_MAGNET_RANGE,
  PICKUP_SPAWN_INTERVAL,
  PROJECTILE_SPEED,
  REPAIR_DWELL,
  SALVAGE_PICKUP_VALUE,
  SHIP_INTERACT_RANGE,
  SHIP_REPAIR_AMOUNT,
  SHIP_REPAIR_COST,
  START_ENERGY,
  START_SALVAGE,
  STRUCTURE_DEFS,
  STRUCTURE_REPAIR_AMOUNT,
  STRUCTURE_REPAIR_COST,
  UPGRADE_DWELL,
  type ResourceCost,
  type StructureKind,
} from './constants';
import {
  BASE_X,
  BASE_Z,
  DEPOSITS,
  GAP_ANGLES,
  MAP_MAX_X,
  MAP_MAX_Z,
  MAP_MIN_X,
  MAP_MIN_Z,
  HULL_REGEN,
  HULL_REGEN_SAFE_RADIUS,
  PAD_LAYOUT,
  SPIT_FLIGHT_TIME,
  RIDGE_BAND,
  RIDGE_RADIUS,
} from './constants';
import { Barrier } from './Barrier';
import { KeyboardControls, createInputState } from './input';
import { clampToRidge, distFromBase } from './ridge';

const PROJECTILE_POOL_SIZE = 50;

type GameState = 'playing' | 'gameover';

/**
 * Owns the scene, the loop and the rules: resources, building, combat,
 * pickups, spawning, the build menu context, and game over / restart.
 */
export class GameManager {
  // Three.js core
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cameraCtl = new CameraController();
  private clock = new THREE.Clock();

  // World + entities
  private environment: Environment;
  readonly ship: CrashedShip;
  readonly pads: BuildPad[] = [];
  readonly structures: Structure[] = [];
  readonly enemies: Enemy[] = [];
  readonly archers: Archer[] = [];
  readonly survivors: Survivor[] = [];
  readonly pickups: Pickup[] = [];
  private projectiles: Projectile[] = [];

  // Systems
  readonly player: PlayerController;
  private spawner = new EnemySpawner();
  private effects: Effects;
  private sound = new Sound();
  private ui: UIManager;
  private input = createInputState();
  private keyboard: KeyboardControls;
  private mobile: MobileControls;

  // Run state
  private state: GameState = 'playing';
  energy = START_ENERGY;
  salvage = START_SALVAGE;
  private kills = 0;
  private gunTimer = 0;
  private pickupTimer = PICKUP_SPAWN_INTERVAL;
  private introHidden = false;

  // Hover-to-act dwell state. (No blueprint selection in V5 — every pad
  // is typed, so the map itself is the build menu.)
  private dwellKey = '';
  private dwellTimer = 0;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.fog, 26, 62);

    // Cold light: icy hemisphere + a pale blue "moon" key light.
    const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x44506b, 0.75);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xcfe2ff, 1.15);
    sun.position.set(14, 22, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.camera.far = 70;
    this.scene.add(sun);

    this.environment = new Environment(this.scene);
    this.ship = new CrashedShip(this.scene);
    void this.ship.tryLoadModel(); // swaps in crashed_ship.glb when present
    this.player = new PlayerController(this.scene);
    this.effects = new Effects(this.scene, this.cameraCtl.camera);
    this.ui = new UIManager(() => this.restart());

    this.keyboard = new KeyboardControls(this.input);
    this.mobile = new MobileControls(this.input, this.keyboard);

    // Typed build sockets from the shared layout (kept clear of the
    // player spawn so nothing auto-builds at second 0), then raise the
    // prebuilt parts of the fort for free.
    for (const spot of PAD_LAYOUT) {
      this.pads.push(new BuildPad(this.scene, spot.x, spot.z, spot.kind, spot.angle ?? 0));
    }
    this.raisePrebuilt();

    for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
      this.projectiles.push(new Projectile(this.scene));
    }

    // Scatter pickups from second one so the opening is grab-grab-grab.
    for (let i = 0; i < INITIAL_PICKUPS; i++) this.spawnAmbientPickup();

    this.cameraCtl.snapTo(this.player.position);
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.cameraCtl.onResize();
    });
  }

  start() {
    this.renderer.setAnimationLoop(() => this.tick());
  }

  // ---------------------------------------------------------------- loop

  private tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.keyboard.update();

    if (this.input.restartPressed && this.state === 'gameover') this.restart();

    if (this.state === 'playing') {
      this.updatePlaying(dt);
    }

    // These keep moving even on the game-over screen.
    this.ship.update(dt);
    this.environment.update(dt, this.player.position);
    this.effects.update(dt);
    this.cameraCtl.update(dt, this.player.position, this.player.velocity);
    for (const pad of this.pads) pad.update(dt);

    this.ui.setShipHp(this.ship.hp, this.ship.maxHp);
    this.ui.setEnergy(this.energy);
    this.ui.setSalvage(this.salvage);
    this.ui.setThreat(this.spawner.threatLevel);
    this.mobile.setDashCooldown(this.player.dashCooldownFraction);

    this.renderer.render(this.scene, this.cameraCtl.camera);

    // Edge-triggered inputs are consumed exactly once per frame.
    this.input.firePressed = false;
    this.input.dashPressed = false;
    this.input.restartPressed = false;
  }

  private updatePlaying(dt: number) {
    if (!this.introHidden && (this.input.fireHeld || Math.abs(this.input.moveX) + Math.abs(this.input.moveY) > 0.1)) {
      this.introHidden = true;
      this.ui.hideIntro();
    }

    if (this.input.dashPressed && this.player.tryDash()) {
      this.sound.dash();
      for (const e of this.enemies) e.dashHit = false;
    }
    this.player.update(dt, this.input);
    clampToRidge(this.player.position);

    // Dashing through aliens knocks them around and hurts them.
    if (this.player.isDashing) {
      for (const e of this.enemies) {
        if (e.dead || e.dashHit) continue;
        if (
          e.position.distanceTo(this.player.position) <
          DASH_HIT_RADIUS + e.radius
        ) {
          e.dashHit = true;
          const knock = e.position
            .clone()
            .sub(this.player.position)
            .setY(0)
            .normalize()
            .multiplyScalar(0.8);
          e.takeDamage(DASH_DAMAGE, knock);
          this.effects.burst(e.position.clone().setY(0.7), 0x9dfff0, 5, 5);
        }
      }
    }

    this.updateGun(dt);

    this.spawner.update(dt, this);
    for (const e of this.enemies) e.update(dt, this);
    this.separateEnemies();
    for (const e of this.enemies) clampToRidge(e.position);

    for (const s of this.structures) s.update(dt, this);

    this.updateProjectiles(dt);
    this.updateSpitBlobs(dt);
    this.updatePickups(dt);
    this.updateBuildContext(dt);

    // The hull slowly knits itself together while no aliens are near it,
    // so one bad breach isn't a slow death sentence.
    if (this.ship.isDamaged && !this.ship.isDestroyed) {
      let safe = true;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (
          Math.hypot(
            e.position.x - this.ship.position.x,
            e.position.z - this.ship.position.z,
          ) < HULL_REGEN_SAFE_RADIUS
        ) {
          safe = false;
          break;
        }
      }
      if (safe) this.ship.repair(HULL_REGEN * dt);
    }

    // Archer drones fly in formation and fight alongside the player.
    let slot = 0;
    for (const a of this.archers) if (!a.dead) a.update(dt, this, slot++);
    for (let i = this.archers.length - 1; i >= 0; i--) {
      const a = this.archers[i];
      if (!a.dead) continue;
      this.effects.burst(a.position.clone().setY(1.2), COLORS.archer, 10, 6);
      this.sound.structureDestroyed();
      a.dispose(this.scene);
      this.archers.splice(i, 1);
    }

    // Villagers trot around collecting drops near the base.
    for (const sv of this.survivors) sv.update(dt, this);
    for (let i = this.survivors.length - 1; i >= 0; i--) {
      if (!this.survivors[i].dead) continue;
      this.survivors[i].dispose(this.scene);
      this.survivors.splice(i, 1);
    }

    this.updateThreatArrows();

    // Bury the dead.
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.dead) continue;
      this.onEnemyKilled(e);
      e.dispose(this.scene);
      this.enemies.splice(i, 1);
    }

    if (this.ship.isDestroyed) this.gameOver();
  }

  // ---------------------------------------------------------------- combat

  private updateGun(dt: number) {
    this.gunTimer -= dt;
    if (this.gunTimer > 0) return;

    // Auto-aim at the nearest living enemy in range.
    let best: Enemy | null = null;
    let bestDist = GUN_RANGE;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = this.player.position.distanceTo(e.position);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }

    // The blaster fires by itself whenever something is in range — the
    // player just moves. Holding fire (desktop) also shoots straight ahead.
    if (!best && !this.input.fireHeld) return;
    this.gunTimer = GUN_FIRE_INTERVAL;

    const from = this.player.muzzleWorldPos;
    const dir = best
      ? best.position.clone().setY(from.y).sub(from)
      : this.player.facing.clone();
    if (dir.lengthSq() < 0.001) dir.set(0, 0, 1);

    this.fireProjectile(from, dir, PROJECTILE_SPEED, GUN_DAMAGE, COLORS.playerProjectile, best, true);
    this.player.shoot(dir);
    this.sound.playerShoot();
  }

  /** Fire a bolt from the pool. Used by both the player and turrets. */
  fireProjectile(
    from: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number,
    color: number,
    homingTarget: Enemy | null,
    fromPlayer: boolean,
  ) {
    const p = this.projectiles.find((pr) => !pr.active);
    if (!p) return;
    p.fire(from, direction, speed, damage, color, homingTarget);
    p.fromPlayer = fromPlayer;
    if (!fromPlayer) this.sound.turretShoot();
  }

  private updateProjectiles(dt: number) {
    const flat = new THREE.Vector3();
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.update(dt);
      if (!p.active) continue;

      // Out of bounds?
      if (
        p.mesh.position.x < MAP_MIN_X - 8 ||
        p.mesh.position.x > MAP_MAX_X + 8 ||
        p.mesh.position.z < MAP_MIN_Z - 8 ||
        p.mesh.position.z > MAP_MAX_Z + 8
      ) {
        p.deactivate();
        continue;
      }

      for (const e of this.enemies) {
        if (e.dead) continue;
        flat.copy(e.position).setY(p.mesh.position.y);
        const r = e.radius + 0.25;
        if (p.mesh.position.distanceToSquared(flat) < r * r) {
          const knock = p.velocity.clone().setY(0).normalize().multiplyScalar(0.12);
          e.takeDamage(p.damage, knock);
          this.effects.burst(e.position.clone().setY(0.7), 0xbfe9ff, 4, 4);
          this.sound.hit();
          // Player bolts splash into the horde around the impact.
          if (p.fromPlayer) {
            for (const other of this.enemies) {
              if (other === e || other.dead) continue;
              if (
                other.position.distanceTo(e.position) <
                GUN_SPLASH_RADIUS + other.radius
              ) {
                other.takeDamage(p.damage * GUN_SPLASH_FACTOR);
              }
            }
          }
          p.deactivate();
          break;
        }
      }
    }
  }

  private onEnemyKilled(e: Enemy) {
    this.kills++;
    this.sound.enemyDie();
    this.effects.burst(e.position.clone().setY(0.6), e.colorHex, 12, 7);

    // Every kill pays a little energy, so fighting always funds building.
    this.energy += KILL_REWARD;
    this.effects.floatText(e.position.clone().setY(1), `+${KILL_REWARD} ◆`, '#35f0d0');

    // Aliens often drop a bigger resource chunk on top.
    if (Math.random() < DROP_CHANCE) {
      const type: PickupType = Math.random() < 0.5 ? 'energy' : 'salvage';
      this.pickups.push(new Pickup(this.scene, e.position.x, e.position.z, type, DROP_VALUE));
    }
  }

  /** Called by an enemy when its attack timer fires while in reach. */
  enemyAttack(enemy: Enemy) {
    const target = enemy.currentStructureTarget;
    const bruteBonus = enemy.kind === 'brute' ? 1.6 : 1;

    if (target && !target.destroyed) {
      const mult = enemy.kind === 'brute' && target.kind === 'barrier' ? 1.6 : 1;
      target.takeDamage(enemy.attackDamage * mult);
      this.effects.burst(target.position.clone().setY(1), 0xffaa66, 3, 3);
      if (target.destroyed) this.onStructureDestroyed(target);
      return;
    }

    this.ship.takeDamage(enemy.attackDamage * bruteBonus);
    this.cameraCtl.shake(0.35);
    this.sound.shipHit();
    this.effects.burst(enemy.position.clone().setY(1.2), COLORS.fire, 5, 5);
  }

  private onStructureDestroyed(s: Structure) {
    this.sound.structureDestroyed();
    this.effects.burst(s.position.clone().setY(0.8), 0xffffff, 16, 8);
    this.ui.flashMessage(`${s.def.name} destroyed!`);
    // A razed village scatters its people.
    if (s instanceof Village) {
      for (const sv of s.survivors) sv.dead = true;
    }
    const pad = this.pads.find((p) => p.structure === s);
    if (pad) pad.structure = null;
    const i = this.structures.indexOf(s);
    if (i >= 0) this.structures.splice(i, 1);
    s.dispose(this.scene);
  }

  // ---------------------------------------------------------------- economy

  canAfford(cost: ResourceCost) {
    return this.energy >= cost.energy && this.salvage >= cost.salvage;
  }

  private spend(cost: ResourceCost) {
    this.energy -= cost.energy;
    this.salvage -= cost.salvage;
  }

  /** Reward from a Power Relay tick — credited with a floating "+n". */
  extractorTick(extractor: Extractor, amount: number) {
    this.energy += amount;
    this.effects.floatText(extractor.position.clone().setY(2.4), `+${amount} ◆`, '#35f0d0');
  }

  /** Reward from a Salvage Forge tick. */
  forgeTick(forge: Forge, amount: number) {
    this.salvage += amount;
    this.effects.floatText(forge.position.clone().setY(2.2), `+${amount} ▣`, '#ffa94d');
  }

  /** Reward from a Mine tick — both resources at once. */
  mineTick(mine: Mine, energy: number, salvage: number) {
    this.energy += energy;
    this.salvage += salvage;
    this.effects.floatText(
      mine.position.clone().setY(2.6),
      `+${energy} ◆ +${salvage} ▣`,
      '#ffd9a8',
    );
  }

  /** Called by a Drone Factory when it finishes assembling an archer. */
  spawnArcher(at: THREE.Vector3): Archer {
    const archer = new Archer(this.scene, at);
    this.archers.push(archer);
    this.sound.build();
    this.effects.burst(at.clone().setY(1.2), COLORS.archer, 8, 5);
    this.ui.flashMessage('Archer drone online');
    return archer;
  }

  /** Called by a Village when a new villager moves in. */
  spawnSurvivor(home: THREE.Vector3): Survivor {
    const sv = new Survivor(this.scene, home);
    this.survivors.push(sv);
    this.effects.floatText(home.clone().setY(1.6), 'A villager moved in!', '#ffd9a8');
    return sv;
  }

  /** A villager grabbed a pickup for you. */
  survivorCollect(pk: Pickup) {
    if (pk.collected) return;
    pk.collected = true;
    if (pk.type === 'energy') {
      this.energy += pk.value;
      this.effects.floatText(pk.position.clone().setY(1), `+${pk.value} ◆`, '#35f0d0');
    } else {
      this.salvage += pk.value;
      this.effects.floatText(pk.position.clone().setY(1), `+${pk.value} ▣`, '#ffa94d');
    }
  }

  private updatePickups(dt: number) {
    this.pickupTimer -= dt;
    if (this.pickupTimer <= 0) {
      this.pickupTimer = PICKUP_SPAWN_INTERVAL;
      const ambient = this.pickups.length;
      if (ambient < MAX_PICKUPS) this.spawnAmbientPickup();
    }

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      if (pk.collected) {
        // A villager got to it first.
        pk.dispose(this.scene);
        this.pickups.splice(i, 1);
        continue;
      }
      pk.update(dt, this.player.position, PICKUP_MAGNET_RANGE);
      if (pk.position.distanceTo(this.player.position) < PICKUP_COLLECT_RANGE) {
        if (pk.type === 'energy') {
          this.energy += pk.value;
          this.sound.collectEnergy();
          this.effects.floatText(pk.position.clone().setY(1), `+${pk.value} ◆`, '#35f0d0');
          this.effects.burst(pk.position.clone().setY(0.6), COLORS.energy, 5, 4);
        } else {
          this.salvage += pk.value;
          this.sound.collectSalvage();
          this.effects.floatText(pk.position.clone().setY(1), `+${pk.value} ▣`, '#ffa94d');
          this.effects.burst(pk.position.clone().setY(0.6), COLORS.salvage, 5, 4);
        }
        pk.dispose(this.scene);
        this.pickups.splice(i, 1);
      }
    }
  }

  private spawnAmbientPickup() {
    for (let attempt = 0; attempt < 12; attempt++) {
      let x: number;
      let z: number;
      if (Math.random() < 0.45 && DEPOSITS.length > 0) {
        // Richer pickings out by the ore deposits — a reason to roam.
        const d = DEPOSITS[Math.floor(Math.random() * DEPOSITS.length)];
        x = d.x + (Math.random() - 0.5) * 14;
        z = d.z + (Math.random() - 0.5) * 14;
      } else {
        x = MAP_MIN_X + 2 + Math.random() * (MAP_MAX_X - MAP_MIN_X - 4);
        z = MAP_MIN_Z + 2 + Math.random() * (MAP_MAX_Z - MAP_MIN_Z - 4);
      }
      if (x < MAP_MIN_X + 1.5 || x > MAP_MAX_X - 1.5) continue;
      if (z < MAP_MIN_Z + 1.5 || z > MAP_MAX_Z - 1.5) continue;
      if (Math.hypot(x - this.ship.position.x, z - this.ship.position.z) < this.ship.radius + 2)
        continue;
      // Not inside the solid ridge band where nobody can reach it.
      if (Math.abs(distFromBase(x, z) - RIDGE_RADIUS) < RIDGE_BAND + 0.6) continue;
      if (this.pads.some((p) => Math.hypot(p.position.x - x, p.position.z - z) < 2.2)) continue;
      const type: PickupType = Math.random() < 0.6 ? 'energy' : 'salvage';
      const value = type === 'energy' ? ENERGY_PICKUP_VALUE : SALVAGE_PICKUP_VALUE;
      this.pickups.push(new Pickup(this.scene, x, z, type, value));
      return;
    }
  }

  // ---------------------------------------------------------------- building

  /** The starting fort: prebuilt sockets from the layout go up for free. */
  private raisePrebuilt() {
    for (let i = 0; i < PAD_LAYOUT.length; i++) {
      if (PAD_LAYOUT[i].prebuilt) this.buildOn(this.pads[i], PAD_LAYOUT[i].kind, true);
    }
  }

  private buildOn(pad: BuildPad, kind: StructureKind, free = false) {
    const def = STRUCTURE_DEFS[kind];
    if (!pad.isEmpty || (!free && !this.canAfford(def.buildCost))) {
      this.sound.denied();
      return;
    }
    if (!free) this.spend(def.buildCost);

    let s: Structure;
    switch (kind) {
      case 'turret':
        s = new Turret(this.scene, pad.position);
        break;
      case 'barrier':
        s = new Barrier(this.scene, pad.position, pad.spotAngle);
        break;
      case 'extractor':
        s = new Extractor(this.scene, pad.position);
        break;
      case 'forge':
        s = new Forge(this.scene, pad.position);
        break;
      case 'beacon':
        s = new RepairBeacon(this.scene, pad.position);
        break;
      case 'factory':
        s = new Factory(this.scene, pad.position);
        break;
      case 'mine':
        s = new Mine(this.scene, pad.position);
        break;
      case 'village':
        s = new Village(this.scene, pad.position);
        break;
    }
    pad.structure = s;
    this.structures.push(s);
    if (!free) {
      this.sound.build();
      this.effects.burst(pad.position.clone().setY(0.6), COLORS.padRing, 12, 6);
      this.ui.flashMessage(`${def.name} online`);
    }
  }

  private upgradeStructure(s: Structure) {
    const cost = s.nextUpgradeCost;
    if (!cost || !this.canAfford(cost)) {
      this.sound.denied();
      return;
    }
    this.spend(cost);
    s.upgrade();
    this.sound.upgrade();
    this.effects.burst(s.position.clone().setY(1.2), 0xffe066, 14, 7);
    this.effects.floatText(s.position.clone().setY(2.2), `Lv ${s.level}!`, '#ffe066');
  }

  private repairStructure(s: Structure) {
    if (this.salvage < STRUCTURE_REPAIR_COST) {
      this.sound.denied();
      return;
    }
    this.salvage -= STRUCTURE_REPAIR_COST;
    s.repair(STRUCTURE_REPAIR_AMOUNT);
    this.sound.repair();
    this.effects.floatText(s.position.clone().setY(2), `+${STRUCTURE_REPAIR_AMOUNT} ⛨`, '#7dff9a');
  }

  private repairShip() {
    if (this.salvage < SHIP_REPAIR_COST || !this.ship.isDamaged) {
      this.sound.denied();
      return;
    }
    this.salvage -= SHIP_REPAIR_COST;
    this.ship.repair(SHIP_REPAIR_AMOUNT);
    this.sound.repair();
    this.effects.floatText(
      this.player.position.clone().setY(2),
      `+${SHIP_REPAIR_AMOUNT} ⛨`,
      '#7dff9a',
    );
  }

  /** The spawner calls this whenever the threat rises and grants a lull. */
  onSwarmLull() {
    this.ui.flashMessage('⚠ The swarm regroups — build!');
  }

  /** Every third threat level the lull ends in one big push. */
  onSurge() {
    this.sound.surge();
    this.ui.flashMessage('☣ SURGE INCOMING');
  }

  // ------------------------------------------------------------- acid globs

  /** Pooled spitter projectiles: a lobbed glob that lands after a moment. */
  private spitBlobs: Array<{
    mesh: THREE.Mesh;
    from: THREE.Vector3;
    to: THREE.Vector3;
    target: Structure | null; // null = the ship
    damage: number;
    t: number; // 0..1 flight progress, <0 = idle
  }> = [];

  /** Called by a spitter when its attack timer fires at range. */
  enemySpit(enemy: Enemy) {
    let blob = this.spitBlobs.find((b) => b.t < 0);
    if (!blob) {
      if (this.spitBlobs.length >= 14) return;
      blob = {
        mesh: new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 6, 6),
          new THREE.MeshBasicMaterial({ color: COLORS.enemySpitter }),
        ),
        from: new THREE.Vector3(),
        to: new THREE.Vector3(),
        target: null,
        damage: 0,
        t: -1,
      };
      blob.mesh.visible = false;
      this.scene.add(blob.mesh);
      this.spitBlobs.push(blob);
    }

    const target = enemy.currentStructureTarget;
    blob.target = target && !target.destroyed ? target : null;
    blob.from.copy(enemy.position).setY(0.9);
    blob.to.copy(blob.target ? blob.target.position : this.ship.position).setY(1.0);
    blob.damage = enemy.attackDamage;
    blob.t = 0;
    blob.mesh.visible = true;
    this.sound.spit();
  }

  private updateSpitBlobs(dt: number) {
    for (const b of this.spitBlobs) {
      if (b.t < 0) continue;
      b.t += dt / SPIT_FLIGHT_TIME;
      if (b.t >= 1) {
        b.t = -1;
        b.mesh.visible = false;
        this.effects.burst(b.to.clone(), COLORS.enemySpitter, 6, 4);
        if (b.target) {
          if (!b.target.destroyed) {
            b.target.takeDamage(b.damage);
            if (b.target.destroyed) this.onStructureDestroyed(b.target);
          }
        } else {
          this.ship.takeDamage(b.damage);
          this.cameraCtl.shake(0.2);
          this.sound.hit();
        }
        continue;
      }
      b.mesh.position.lerpVectors(b.from, b.to, b.t);
      b.mesh.position.y += Math.sin(b.t * Math.PI) * 2.4;
    }
  }

  /**
   * Hover-to-act: standing on a spot fills a progress ring, then the
   * action fires automatically — build the selected blueprint on an empty
   * pad, repair a damaged structure, upgrade a healthy one, or patch the
   * hull next to the ship. Walking away cancels.
   */
  private updateBuildContext(dt: number) {
    let nearestPad: BuildPad | null = null;
    let nearestDist = INTERACT_RANGE;
    for (const pad of this.pads) {
      const d = pad.position.distanceTo(this.player.position);
      pad.setState(d < INTERACT_RANGE, this.canAfford(pad.def.buildCost));
      if (d < nearestDist) {
        nearestDist = d;
        nearestPad = pad;
      }
    }

    let key = '';
    let need = 0;
    let color = 0x52f5ff;
    let hint: string | null = null;
    let perform: (() => void) | null = null;
    const pad = nearestPad;

    if (pad) {
      const padIndex = this.pads.indexOf(pad);
      if (pad.isEmpty) {
        // Every socket builds exactly one thing.
        const def = pad.def;
        if (this.canAfford(def.buildCost)) {
          key = `build:${padIndex}:${def.kind}`;
          need = BUILD_DWELL;
          hint = `Building ${def.name}…`;
          perform = () => this.buildOn(pad, def.kind);
        } else {
          key = `deny-build:${padIndex}:${def.kind}`;
          hint = `Need ${costText(def.buildCost)} for ${def.name}`;
        }
      } else {
        const s = pad.structure!;
        if (s.isDamaged) {
          if (this.salvage >= STRUCTURE_REPAIR_COST) {
            key = `repair:${padIndex}`;
            need = REPAIR_DWELL;
            color = 0x7dff9a;
            hint = `Repairing ${s.def.name}…`;
            perform = () => this.repairStructure(s);
          } else {
            key = `deny-repair:${padIndex}`;
            hint = `Need ▣${STRUCTURE_REPAIR_COST} to repair`;
          }
        } else if (s.canUpgrade) {
          const cost = s.nextUpgradeCost!;
          if (this.canAfford(cost)) {
            key = `upgrade:${padIndex}:${s.level}`;
            need = UPGRADE_DWELL;
            color = 0xffe066;
            hint = `Upgrading ${s.def.name} to Lv ${s.level + 1}…`;
            perform = () => this.upgradeStructure(s);
          } else {
            key = `deny-upgrade:${padIndex}:${s.level}`;
            hint = `Need ${costText(cost)} to upgrade ${s.def.name}`;
          }
        } else {
          key = `max:${padIndex}`;
          hint = `${s.def.name} · max level`;
        }
      }
    } else if (
      this.ship.isDamaged &&
      this.player.position.distanceTo(this.ship.position) < SHIP_INTERACT_RANGE
    ) {
      if (this.salvage >= SHIP_REPAIR_COST) {
        key = 'ship-repair';
        need = REPAIR_DWELL;
        color = 0x7dff9a;
        hint = 'Repairing hull…';
        perform = () => this.repairShip();
      } else {
        key = 'deny-ship';
        hint = `Need ▣${SHIP_REPAIR_COST} to repair hull`;
      }
    }

    if (key !== this.dwellKey) {
      this.dwellKey = key;
      this.dwellTimer = 0;
      if (key.startsWith('deny') && pad) pad.pulseDenied();
    }

    if (perform && need > 0) {
      this.dwellTimer += dt;
      pad?.setProgress(Math.min(1, this.dwellTimer / need), color);
      if (this.dwellTimer >= need) {
        this.dwellTimer = 0;
        this.dwellKey = ''; // re-evaluate next frame (repairs repeat, builds change context)
        pad?.setProgress(0, color);
        perform();
      }
    } else {
      pad?.setProgress(0, color);
    }

    for (const p of this.pads) {
      if (p !== pad) p.setProgress(0, 0xffffff);
    }

    this.ui.setContextHint(hint);
  }

  // ---------------------------------------------------------------- enemies

  /**
   * Edge-of-screen arrows for fights you can't see: one per ridge gap
   * under pressure, plus a red one when the ship itself is being chewed.
   */
  private projVec = new THREE.Vector3();

  private updateThreatArrows() {
    const items: { x: number; z: number; color: string; count: number }[] = [];

    for (const g of GAP_ANGLES) {
      const gx = BASE_X + Math.cos(g) * RIDGE_RADIUS;
      const gz = BASE_Z + Math.sin(g) * RIDGE_RADIUS;
      let count = 0;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.position.x - gx, e.position.z - gz) < 11) count++;
      }
      if (count > 0) items.push({ x: gx, z: gz, color: '#ffb45e', count });
    }

    let shipAttackers = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(
        e.position.x - this.ship.position.x,
        e.position.z - this.ship.position.z,
      );
      if (d < this.ship.radius + 2.6) shipAttackers++;
    }
    if (shipAttackers > 0) {
      items.push({
        x: this.ship.position.x,
        z: this.ship.position.z,
        color: '#ff4a3a',
        count: shipAttackers,
      });
    }

    const out: Array<{ sx: number; sy: number; deg: number; count: number; color: string }> =
      [];
    for (const item of items) {
      this.projVec.set(item.x, 0.5, item.z).project(this.cameraCtl.camera);
      let nx = this.projVec.x;
      let ny = this.projVec.y;
      const behind = this.projVec.z >= 1;
      if (behind) {
        nx = -nx;
        ny = -ny;
      }
      if (!behind && Math.abs(nx) < 0.92 && Math.abs(ny) < 0.92) continue; // visible
      // Clamp onto a border ring, pointing outward.
      const k = 0.86 / Math.max(Math.abs(nx), Math.abs(ny), 0.0001);
      nx *= Math.min(1, k);
      ny *= Math.min(1, k);
      const sx = (nx * 0.5 + 0.5) * window.innerWidth;
      const sy = (-ny * 0.5 + 0.5) * window.innerHeight;
      const deg =
        (Math.atan2(sy - window.innerHeight / 2, sx - window.innerWidth / 2) * 180) / Math.PI;
      out.push({ sx, sy, deg, count: item.count, color: item.color });
    }
    this.ui.setThreatArrows(out);
  }

  spawnEnemy(x: number, z: number, stats: EnemyStats) {
    this.enemies.push(new Enemy(this.scene, x, z, stats));
  }

  /** Pairwise push-apart so enemies don't stack into one blob. */
  private separateEnemies() {
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.dead) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (b.dead) continue;
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const minDist = a.radius + b.radius + 0.05;
        const distSq = dx * dx + dz * dz;
        if (distSq > minDist * minDist || distSq < 0.0001) continue;
        const dist = Math.sqrt(distSq);
        const push = (minDist - dist) * 0.5;
        const nx = (dx / dist) * push;
        const nz = (dz / dist) * push;
        a.position.x -= nx;
        a.position.z -= nz;
        b.position.x += nx;
        b.position.z += nz;
      }
    }
  }

  // ---------------------------------------------------------------- lifecycle

  private gameOver() {
    if (this.state === 'gameover') return;
    this.state = 'gameover';
    this.sound.gameOver();
    this.cameraCtl.shake(1);
    for (let i = 0; i < 4; i++) {
      this.effects.burst(
        this.ship.position
          .clone()
          .add(new THREE.Vector3((Math.random() - 0.5) * 4, 1.5, (Math.random() - 0.5) * 4)),
        i % 2 ? COLORS.fire : COLORS.ember,
        14,
        9,
      );
    }
    this.ui.setContextHint(null);
    this.ui.setThreatArrows([]);
    // Track the best survival time across runs.
    const survived = Math.floor(this.spawner.elapsed);
    let best = 0;
    try {
      best = Number(localStorage.getItem('aurora-v5-best') ?? 0);
    } catch {
      /* private browsing */
    }
    const isRecord = survived > best;
    if (isRecord) {
      try {
        localStorage.setItem('aurora-v5-best', String(survived));
      } catch {
        /* private browsing */
      }
    }
    this.ui.showGameOver(
      this.spawner.elapsed,
      this.kills,
      this.spawner.threatLevel,
      isRecord ? null : best,
      isRecord,
    );
  }

  private restart() {
    for (const e of this.enemies) e.dispose(this.scene);
    this.enemies.length = 0;
    for (const a of this.archers) a.dispose(this.scene);
    this.archers.length = 0;
    for (const sv of this.survivors) sv.dispose(this.scene);
    this.survivors.length = 0;
    for (const pk of this.pickups) pk.dispose(this.scene);
    this.pickups.length = 0;
    for (const s of this.structures) s.dispose(this.scene);
    this.structures.length = 0;
    for (const pad of this.pads) {
      pad.structure = null;
      pad.setProgress(0, 0xffffff);
    }
    for (const p of this.projectiles) p.deactivate();
    for (const b of this.spitBlobs) {
      b.t = -1;
      b.mesh.visible = false;
    }

    this.ship.reset();
    this.player.reset();
    this.spawner.reset();
    this.effects.clear();

    this.energy = START_ENERGY;
    this.salvage = START_SALVAGE;
    this.kills = 0;
    this.gunTimer = 0;
    this.pickupTimer = PICKUP_SPAWN_INTERVAL;
    this.raisePrebuilt();
    for (let i = 0; i < INITIAL_PICKUPS; i++) this.spawnAmbientPickup();

    this.ui.hideGameOver();
    this.ui.setContextHint(null);
    this.dwellKey = '';
    this.dwellTimer = 0;
    this.cameraCtl.snapTo(this.player.position);
    this.state = 'playing';
  }
}

function costText(cost: ResourceCost): string {
  const parts: string[] = [];
  if (cost.energy > 0) parts.push(`◆${cost.energy}`);
  if (cost.salvage > 0) parts.push(`▣${cost.salvage}`);
  return parts.join(' ');
}
