import * as THREE from 'three';
import { BuildPad } from './BuildPad';
import { CameraController } from './CameraController';
import { CrashedShip } from './CrashedShip';
import { Effects } from './Effects';
import { Enemy, type EnemyStats } from './Enemy';
import { EnemySpawner } from './EnemySpawner';
import { Environment } from './Environment';
import { Extractor } from './Extractor';
import { MobileControls } from './MobileControls';
import { Pickup, type PickupType } from './Pickup';
import { PlayerController } from './PlayerController';
import { Projectile } from './Projectile';
import { RepairBeacon } from './RepairBeacon';
import { Sound } from './Sound';
import { Structure } from './Structure';
import { Turret } from './Turret';
import { UIManager, type MenuOption } from './UIManager';
import { Wall } from './Wall';
import {
  ARENA_RADIUS,
  COLORS,
  DROP_CHANCE,
  DROP_VALUE,
  ENERGY_PICKUP_VALUE,
  GUN_DAMAGE,
  GUN_FIRE_INTERVAL,
  GUN_RANGE,
  INTERACT_RANGE,
  MAX_PICKUPS,
  PICKUP_COLLECT_RANGE,
  PICKUP_MAGNET_RANGE,
  PICKUP_SPAWN_INTERVAL,
  PROJECTILE_SPEED,
  SALVAGE_PICKUP_VALUE,
  SHIP_INTERACT_RANGE,
  SHIP_REPAIR_AMOUNT,
  SHIP_REPAIR_COST,
  START_ENERGY,
  START_SALVAGE,
  STRUCTURE_DEFS,
  STRUCTURE_REPAIR_AMOUNT,
  STRUCTURE_REPAIR_COST,
  type ResourceCost,
  type StructureKind,
} from './constants';
import { KeyboardControls, createInputState } from './input';

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
  private pickups: Pickup[] = [];
  private projectiles: Projectile[] = [];

  // Systems
  private player: PlayerController;
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
    this.player = new PlayerController(this.scene);
    this.effects = new Effects(this.scene, this.cameraCtl.camera);
    this.ui = new UIManager(() => this.restart());

    this.keyboard = new KeyboardControls(this.input);
    this.mobile = new MobileControls(this.input, this.keyboard);

    // Build pads: an inner ring close to the wreck, plus a few outposts.
    const innerAngles = [80, 140, 200, 260, 320];
    for (const deg of innerAngles) {
      const a = (deg * Math.PI) / 180;
      this.pads.push(new BuildPad(this.scene, Math.cos(a) * 7.5, Math.sin(a) * 7.5));
    }
    for (const deg of [30, 160, 280]) {
      const a = (deg * Math.PI) / 180;
      this.pads.push(new BuildPad(this.scene, Math.cos(a) * 12.5, Math.sin(a) * 12.5));
    }

    for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
      this.projectiles.push(new Projectile(this.scene));
    }

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
    this.input.menuKey = 0;
  }

  private updatePlaying(dt: number) {
    if (!this.introHidden && (this.input.fireHeld || Math.abs(this.input.moveX) + Math.abs(this.input.moveY) > 0.1)) {
      this.introHidden = true;
      this.ui.hideIntro();
    }

    if (this.input.dashPressed && this.player.tryDash()) this.sound.dash();
    this.player.update(dt, this.input);

    this.updateGun(dt);

    this.spawner.update(dt, this);
    for (const e of this.enemies) e.update(dt, this);
    this.separateEnemies();

    for (const s of this.structures) s.update(dt, this);

    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateMenuAndPads();

    if (this.input.menuKey > 0) this.ui.selectMenuOption(this.input.menuKey - 1);

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
    if (!this.input.fireHeld || this.gunTimer > 0) return;
    this.gunTimer = GUN_FIRE_INTERVAL;

    // Auto-aim: nearest living enemy in range, otherwise shoot straight ahead.
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
    if (!fromPlayer) this.sound.turretShoot();
  }

  private updateProjectiles(dt: number) {
    const flat = new THREE.Vector3();
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.update(dt);
      if (!p.active) continue;

      // Out of bounds?
      if (Math.hypot(p.mesh.position.x, p.mesh.position.z) > ARENA_RADIUS + 8) {
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
          p.deactivate();
          break;
        }
      }
    }
  }

  private onEnemyKilled(e: Enemy) {
    this.kills++;
    this.sound.enemyDie();
    this.effects.burst(e.position.clone().setY(0.6), 0x9b4df0, 12, 7);

    // Aliens sometimes drop a resource chunk.
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
      const mult = enemy.kind === 'brute' && target.kind === 'wall' ? 1.6 : 1;
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

  private updatePickups(dt: number) {
    this.pickupTimer -= dt;
    if (this.pickupTimer <= 0) {
      this.pickupTimer = PICKUP_SPAWN_INTERVAL;
      const ambient = this.pickups.length;
      if (ambient < MAX_PICKUPS) this.spawnAmbientPickup();
    }

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
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
      const angle = Math.random() * Math.PI * 2;
      const r = 5.5 + Math.random() * (ARENA_RADIUS - 7.5);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      if (Math.hypot(x, z) < this.ship.radius + 2) continue;
      if (this.pads.some((p) => Math.hypot(p.position.x - x, p.position.z - z) < 2.2)) continue;
      const type: PickupType = Math.random() < 0.6 ? 'energy' : 'salvage';
      const value = type === 'energy' ? ENERGY_PICKUP_VALUE : SALVAGE_PICKUP_VALUE;
      this.pickups.push(new Pickup(this.scene, x, z, type, value));
      return;
    }
  }

  // ---------------------------------------------------------------- building

  private buildOn(pad: BuildPad, kind: StructureKind) {
    const def = STRUCTURE_DEFS[kind];
    if (!pad.isEmpty || !this.canAfford(def.buildCost)) {
      this.sound.denied();
      return;
    }
    this.spend(def.buildCost);

    let s: Structure;
    switch (kind) {
      case 'turret':
        s = new Turret(this.scene, pad.position);
        break;
      case 'wall':
        s = new Wall(this.scene, pad.position);
        break;
      case 'extractor':
        s = new Extractor(this.scene, pad.position);
        break;
      case 'beacon':
        s = new RepairBeacon(this.scene, pad.position);
        break;
    }
    pad.structure = s;
    this.structures.push(s);
    this.sound.build();
    this.effects.burst(pad.position.clone().setY(0.6), COLORS.padRing, 12, 6);
    this.ui.flashMessage(`${def.name} online`);
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

  /** Decide what the in-world menu shows based on where the player stands. */
  private updateMenuAndPads() {
    // Highlight pads: near + affordability glow.
    const anyAffordable = Object.values(STRUCTURE_DEFS).some((d) =>
      this.canAfford(d.buildCost),
    );

    let nearestPad: BuildPad | null = null;
    let nearestDist = INTERACT_RANGE;
    for (const pad of this.pads) {
      const d = pad.position.distanceTo(this.player.position);
      pad.setState(d < INTERACT_RANGE, anyAffordable);
      if (d < nearestDist) {
        nearestDist = d;
        nearestPad = pad;
      }
    }

    if (nearestPad) {
      const pad = nearestPad; // const binding so closures keep the narrowed type
      const padIndex = this.pads.indexOf(pad);
      if (pad.isEmpty) {
        const defs = Object.values(STRUCTURE_DEFS);
        const affordBits = defs.map((d) => (this.canAfford(d.buildCost) ? 1 : 0)).join('');
        const options: MenuOption[] = defs.map((d) => ({
          icon: d.icon,
          label: d.name,
          cost: d.buildCost,
          enabled: this.canAfford(d.buildCost),
          onSelect: () => this.buildOn(pad, d.kind),
        }));
        this.ui.showMenu(`build:${padIndex}:${affordBits}`, 'Build structure', options);
      } else {
        const s = pad.structure!;
        const options: MenuOption[] = [];
        const upCost = s.nextUpgradeCost;
        if (upCost) {
          options.push({
            icon: '▲',
            label: `Upgrade to Lv ${s.level + 1}`,
            cost: upCost,
            enabled: this.canAfford(upCost),
            onSelect: () => this.upgradeStructure(s),
          });
        }
        if (s.isDamaged) {
          options.push({
            icon: '🔧',
            label: 'Repair',
            cost: { energy: 0, salvage: STRUCTURE_REPAIR_COST },
            enabled: this.salvage >= STRUCTURE_REPAIR_COST,
            onSelect: () => this.repairStructure(s),
          });
        }
        if (options.length > 0) {
          const key = `struct:${padIndex}:${s.level}:${s.isDamaged ? 'd' : 'ok'}:${options
            .map((o) => (o.enabled ? 1 : 0))
            .join('')}`;
          this.ui.showMenu(key, `${s.def.name} · Lv ${s.level}`, options);
        } else {
          this.ui.hideMenu();
        }
      }
      return;
    }

    // Near the wreck and it needs patching?
    if (
      this.ship.isDamaged &&
      this.player.position.distanceTo(this.ship.position) < SHIP_INTERACT_RANGE
    ) {
      const enabled = this.salvage >= SHIP_REPAIR_COST;
      this.ui.showMenu(`ship:${enabled ? 1 : 0}`, 'The Aurora', [
        {
          icon: '🔧',
          label: 'Repair hull',
          cost: { energy: 0, salvage: SHIP_REPAIR_COST },
          enabled,
          onSelect: () => this.repairShip(),
        },
      ]);
      return;
    }

    this.ui.hideMenu();
  }

  // ---------------------------------------------------------------- enemies

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
    this.ui.hideMenu();
    this.ui.showGameOver(this.spawner.elapsed, this.kills, this.spawner.threatLevel);
  }

  private restart() {
    for (const e of this.enemies) e.dispose(this.scene);
    this.enemies.length = 0;
    for (const pk of this.pickups) pk.dispose(this.scene);
    this.pickups.length = 0;
    for (const s of this.structures) s.dispose(this.scene);
    this.structures.length = 0;
    for (const pad of this.pads) pad.structure = null;
    for (const p of this.projectiles) p.deactivate();

    this.ship.reset();
    this.player.reset();
    this.spawner.reset();
    this.effects.clear();

    this.energy = START_ENERGY;
    this.salvage = START_SALVAGE;
    this.kills = 0;
    this.gunTimer = 0;
    this.pickupTimer = PICKUP_SPAWN_INTERVAL;

    this.ui.hideGameOver();
    this.ui.invalidateMenu();
    this.cameraCtl.snapTo(this.player.position);
    this.state = 'playing';
  }
}
