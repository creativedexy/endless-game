import * as THREE from 'three';
import { BuildPad } from './BuildPad';
import { CameraController } from './CameraController';
import { ColonyCore } from './ColonyCore';
import { Effects } from './Effects';
import { Enemy, type EnemyStats } from './Enemy';
import { EnemySpawner } from './EnemySpawner';
import { MobileControls } from './MobileControls';
import { PlayerController } from './PlayerController';
import { Projectile } from './Projectile';
import { ResourceCrystal } from './ResourceCrystal';
import { Sound } from './Sound';
import { Turret } from './Turret';
import { UIManager } from './UIManager';
import { KeyboardControls, createInputState } from './input';
import {
  ARENA_RADIUS,
  COLORS,
  CORE_INTERACT_RANGE,
  CORE_REPAIR_AMOUNT,
  CORE_REPAIR_COST,
  CRYSTAL_SPAWN_INTERVAL,
  CRYSTAL_VALUE,
  INTERACT_RANGE,
  KILL_REWARD,
  MAX_CRYSTALS,
  PLAYER_ATTACK_COOLDOWN,
  PLAYER_ATTACK_DAMAGE,
  PLAYER_ATTACK_RANGE,
  START_ENERGY,
  TURRET_BUILD_COST,
  TURRET_REPAIR_AMOUNT,
  TURRET_REPAIR_COST,
  TURRET_UPGRADE_COST,
} from './constants';

type ContextAction =
  | { kind: 'build'; pad: BuildPad; cost: number }
  | { kind: 'upgrade'; turret: Turret; cost: number }
  | { kind: 'repair-turret'; turret: Turret; cost: number }
  | { kind: 'repair-core'; cost: number }
  | { kind: 'attack' };

const PROJECTILE_POOL_SIZE = 40;

export class GameManager {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private clock = new THREE.Clock();

  private cameraCtrl = new CameraController();
  private input = createInputState();
  private keyboard = new KeyboardControls(this.input);
  private mobile: MobileControls;
  private sound = new Sound();
  private effects: Effects;
  private ui: UIManager;

  private player: PlayerController;
  readonly core: ColonyCore;
  readonly pads: BuildPad[] = [];
  readonly turrets: Turret[] = [];
  readonly enemies: Enemy[] = [];
  private crystals: ResourceCrystal[] = [];
  private projectiles: Projectile[] = [];
  private spawner = new EnemySpawner();

  private energy = START_ENERGY;
  private kills = 0;
  private isGameOver = false;
  private attackTimer = 0;
  private actionRepeatTimer = 0;
  private crystalTimer = 1.5;
  private introDismissed = false;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.fog, 42, 95);

    this.setupLights();
    this.setupGround();

    this.core = new ColonyCore(this.scene);
    this.player = new PlayerController(this.scene);
    this.effects = new Effects(this.scene, this.cameraCtrl.camera);
    this.ui = new UIManager(() => this.restart());
    this.mobile = new MobileControls(this.input, this.keyboard);

    this.createBuildPads();
    for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
      this.projectiles.push(new Projectile(this.scene));
    }
    this.spawnInitialCrystals();

    this.cameraCtrl.snapTo(this.player.position);
    window.addEventListener('resize', () => this.onResize());
  }

  // ---------- Scene setup ----------

  private setupLights() {
    this.scene.add(new THREE.HemisphereLight(0xb9a0ff, 0xe0a35c, 0.85));

    const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);
    sun.position.set(18, 32, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -34;
    sun.shadow.camera.right = 34;
    sun.shadow.camera.top = 34;
    sun.shadow.camera.bottom = -34;
    sun.shadow.camera.far = 80;
    this.scene.add(sun);
  }

  private setupGround() {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(ARENA_RADIUS + 16, 48),
      new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Arena boundary marker.
    const boundary = new THREE.Mesh(
      new THREE.RingGeometry(ARENA_RADIUS, ARENA_RADIUS + 0.35, 64),
      new THREE.MeshBasicMaterial({
        color: COLORS.groundEdge,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      }),
    );
    boundary.rotation.x = -Math.PI / 2;
    boundary.position.y = 0.02;
    this.scene.add(boundary);

    // Scattered low-poly rocks and alien spires for visual interest.
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x9a7da8,
      flatShading: true,
      roughness: 0.9,
    });
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x4ccfae,
      flatShading: true,
      roughness: 0.7,
    });
    for (let i = 0; i < 38; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * (ARENA_RADIUS + 9 - 6);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      // Keep the inner build area clear.
      if (radius < 16 && Math.random() < 0.7) continue;
      const isSpire = Math.random() < 0.35;
      const mesh = isSpire
        ? new THREE.Mesh(new THREE.ConeGeometry(0.3 + Math.random() * 0.3, 1.2 + Math.random() * 1.6, 5), spireMat)
        : new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.7, 0), rockMat);
      mesh.position.set(x, isSpire ? 0.7 : 0.3, z);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.castShadow = true;
      this.scene.add(mesh);
    }
  }

  private createBuildPads() {
    // 8 pads on an inner ring + 4 on an outer ring = 12.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      this.pads.push(new BuildPad(this.scene, Math.cos(a) * 7.5, Math.sin(a) * 7.5));
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      this.pads.push(new BuildPad(this.scene, Math.cos(a) * 13.5, Math.sin(a) * 13.5));
    }
  }

  private spawnInitialCrystals() {
    for (let i = 0; i < 6; i++) this.spawnCrystal();
  }

  private spawnCrystal() {
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * (ARENA_RADIUS - 7);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const tooClose = this.pads.some((p) => p.position.distanceToSquared(new THREE.Vector3(x, 0, z)) < 4);
      if (tooClose) continue;
      this.crystals.push(new ResourceCrystal(this.scene, x, z));
      return;
    }
  }

  // ---------- Public hooks used by entities ----------

  spawnEnemy(x: number, z: number, stats: EnemyStats) {
    this.enemies.push(new Enemy(this.scene, x, z, stats));
  }

  fireProjectile(from: THREE.Vector3, target: Enemy, damage: number) {
    const p = this.projectiles.find((proj) => !proj.active);
    if (!p) return;
    p.fire(from, target, damage);
    this.sound.shoot();
  }

  /** Called by an enemy when its attack timer fires while in reach. */
  enemyAttack(enemy: Enemy) {
    const turret = enemy.currentTargetTurret;
    if (!turret) {
      this.core.takeDamage(enemy.attackDamage);
      this.sound.coreHit();
      this.effects.burst(this.core.position.clone().setY(1.5), 0xff6a4d, 5, 4);
      if (this.core.isDestroyed && !this.isGameOver) this.triggerGameOver();
      return;
    }
    if (turret.destroyed) return;
    turret.takeDamage(enemy.attackDamage);
    this.sound.hit();
    if (turret.destroyed) {
      this.effects.burst(turret.position.clone().setY(1), 0xff8a5c, 16, 7);
      this.effects.floatText(turret.position.clone().setY(2), 'Turret lost!', '#ff8a8a');
      turret.pad.turret = null;
      turret.dispose(this.scene);
      const idx = this.turrets.indexOf(turret);
      if (idx >= 0) this.turrets.splice(idx, 1);
    }
  }

  // ---------- Context-sensitive action ----------

  private getContextAction(): ContextAction {
    // Nearest pad the player can reach wins.
    let nearestPad: BuildPad | null = null;
    let nearestDist = INTERACT_RANGE;
    for (const pad of this.pads) {
      const d = pad.position.distanceTo(this.player.position);
      if (d < nearestDist) {
        nearestDist = d;
        nearestPad = pad;
      }
    }

    if (nearestPad) {
      if (nearestPad.isEmpty) {
        return { kind: 'build', pad: nearestPad, cost: TURRET_BUILD_COST };
      }
      const turret = nearestPad.turret!;
      // Badly damaged -> repair first; otherwise upgrade; otherwise top-up repair.
      if (turret.hp < turret.stats.maxHp * 0.65) {
        return { kind: 'repair-turret', turret, cost: TURRET_REPAIR_COST };
      }
      if (turret.canUpgrade) {
        return { kind: 'upgrade', turret, cost: TURRET_UPGRADE_COST[turret.level - 1] };
      }
      if (turret.isDamaged) {
        return { kind: 'repair-turret', turret, cost: TURRET_REPAIR_COST };
      }
    }

    if (
      this.core.isDamaged &&
      this.player.position.distanceTo(this.core.position) < CORE_INTERACT_RANGE
    ) {
      return { kind: 'repair-core', cost: CORE_REPAIR_COST };
    }

    return { kind: 'attack' };
  }

  private performAction(action: ContextAction) {
    switch (action.kind) {
      case 'build':
        if (this.energy < action.cost) return this.deny(action.cost);
        this.energy -= action.cost;
        action.pad.turret = new Turret(this.scene, action.pad);
        this.turrets.push(action.pad.turret);
        this.sound.build();
        this.effects.burst(action.pad.position.clone().setY(0.8), 0x5cffd9, 14, 5);
        this.effects.floatText(action.pad.position.clone().setY(2.2), 'Turret online!', '#5cffd9');
        break;

      case 'upgrade':
        if (this.energy < action.cost) return this.deny(action.cost);
        this.energy -= action.cost;
        action.turret.upgrade();
        this.sound.upgrade();
        this.effects.burst(action.turret.position.clone().setY(1.2), 0x9a5cff, 14, 6);
        this.effects.floatText(
          action.turret.position.clone().setY(2.6),
          `Level ${action.turret.level}!`,
          '#c9a0ff',
        );
        break;

      case 'repair-turret':
        if (this.energy < action.cost) return this.deny(action.cost);
        this.energy -= action.cost;
        action.turret.repair(TURRET_REPAIR_AMOUNT);
        this.sound.repair();
        this.effects.burst(action.turret.position.clone().setY(1), 0x5cffd9, 8, 4);
        this.effects.floatText(action.turret.position.clone().setY(2.2), `+${TURRET_REPAIR_AMOUNT}`, '#7dffb0');
        break;

      case 'repair-core':
        if (this.energy < action.cost) return this.deny(action.cost);
        this.energy -= action.cost;
        this.core.repair(CORE_REPAIR_AMOUNT);
        this.sound.repair();
        this.effects.burst(this.core.position.clone().setY(2), 0x5cffd9, 10, 5);
        this.effects.floatText(this.core.position.clone().setY(3.4), `+${CORE_REPAIR_AMOUNT}`, '#7dffb0');
        break;

      case 'attack':
        this.playerAttack();
        break;
    }
  }

  private deny(cost: number) {
    this.sound.denied();
    this.ui.flashMessage(`Need ${cost} ◆ energy`);
    // Still swing if something is close enough to hit — stay aggressive.
    if (this.enemies.some((e) => !e.dead && e.position.distanceTo(this.player.position) < PLAYER_ATTACK_RANGE)) {
      this.playerAttack();
    }
  }

  private playerAttack() {
    if (this.attackTimer > 0) return;
    this.attackTimer = PLAYER_ATTACK_COOLDOWN;
    this.player.swing();
    this.sound.playerSwing();
    let hits = 0;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const d = enemy.position.distanceTo(this.player.position);
      if (d < PLAYER_ATTACK_RANGE) {
        const knockback = enemy.position
          .clone()
          .sub(this.player.position)
          .setY(0)
          .normalize()
          .multiplyScalar(0.55);
        enemy.takeDamage(PLAYER_ATTACK_DAMAGE, knockback);
        this.effects.burst(enemy.position.clone().setY(0.6), 0xd98aff, 4, 4);
        hits++;
      }
    }
    if (hits > 0) this.sound.hit();
  }

  private onEnemyKilled(enemy: Enemy) {
    this.kills++;
    this.energy += KILL_REWARD;
    this.sound.enemyDie();
    this.effects.burst(enemy.position.clone().setY(0.6), COLORS.enemy, 12, 6);
    this.effects.floatText(enemy.position.clone().setY(1.4), `+${KILL_REWARD}`, '#5cffd9');
  }

  private triggerGameOver() {
    this.isGameOver = true;
    this.sound.gameOver();
    this.effects.burst(this.core.position.clone().setY(2), 0xff5454, 40, 10);
    this.ui.showGameOver(this.spawner.elapsed, this.kills, this.spawner.threatLevel);
  }

  restart() {
    for (const e of this.enemies) e.dispose(this.scene);
    this.enemies.length = 0;
    for (const c of this.crystals) c.dispose(this.scene);
    this.crystals.length = 0;
    for (const p of this.projectiles) p.deactivate();
    for (const t of this.turrets) {
      t.pad.turret = null;
      t.dispose(this.scene);
    }
    this.turrets.length = 0;
    this.effects.clear();

    this.core.reset();
    this.player.reset();
    this.spawner.reset();
    this.energy = START_ENERGY;
    this.kills = 0;
    this.attackTimer = 0;
    this.actionRepeatTimer = 0;
    this.crystalTimer = 1.5;
    this.isGameOver = false;
    this.ui.hideGameOver();
    this.cameraCtrl.snapTo(this.player.position);
    this.spawnInitialCrystals();
  }

  // ---------- Main loop ----------

  start() {
    this.renderer.setAnimationLoop(() => this.tick());
  }

  private tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.input.restartPressed) {
      this.input.restartPressed = false;
      this.restart();
    }

    if (!this.isGameOver) {
      this.updateGameplay(dt);
    }

    this.core.update(dt);
    this.effects.update(dt);
    this.cameraCtrl.update(dt, this.player.position, this.player.velocity);
    this.renderer.render(this.scene, this.cameraCtrl.camera);

    // Consume edge-triggered inputs at the end of the frame.
    this.input.actionPressed = false;
    this.input.dashPressed = false;
  }

  private updateGameplay(dt: number) {
    this.keyboard.update();

    if (!this.introDismissed && (this.input.moveX !== 0 || this.input.moveY !== 0)) {
      this.introDismissed = true;
      this.ui.hideIntro();
    }

    // --- Player ---
    if (this.input.dashPressed && this.player.tryDash()) {
      this.sound.dash();
    }
    this.player.update(dt, this.input);
    this.attackTimer -= dt;

    // Action: trigger on press, repeat while held.
    const context = this.getContextAction();
    this.actionRepeatTimer -= dt;
    if (this.input.actionPressed || (this.input.actionHeld && this.actionRepeatTimer <= 0)) {
      this.actionRepeatTimer = 0.28;
      this.performAction(context);
    }

    // --- World entities ---
    this.spawner.update(dt, this);

    for (const pad of this.pads) pad.update(dt);
    for (const turret of this.turrets) turret.update(dt, this.enemies, this);

    for (const enemy of this.enemies) enemy.update(dt, this);
    this.separateEnemies();
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.dead) {
        this.onEnemyKilled(enemy);
        enemy.dispose(this.scene);
        this.enemies.splice(i, 1);
      }
    }

    for (const projectile of this.projectiles) {
      const hit = projectile.update(dt);
      if (hit) {
        hit.takeDamage(projectile.damage);
        this.effects.burst(hit.position.clone().setY(0.7), COLORS.projectile, 4, 3);
      }
    }

    // --- Crystals ---
    this.crystalTimer -= dt;
    if (this.crystalTimer <= 0) {
      this.crystalTimer = CRYSTAL_SPAWN_INTERVAL;
      if (this.crystals.length < MAX_CRYSTALS) this.spawnCrystal();
    }
    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const crystal = this.crystals[i];
      crystal.update(dt);
      if (crystal.position.distanceTo(this.player.position) < 1.25) {
        this.energy += CRYSTAL_VALUE;
        this.sound.collect();
        this.effects.burst(crystal.position.clone().setY(0.6), COLORS.crystal, 8, 5);
        this.effects.floatText(crystal.position.clone().setY(1.3), `+${CRYSTAL_VALUE}`, '#5cffd9');
        crystal.dispose(this.scene);
        this.crystals.splice(i, 1);
      }
    }

    // --- HUD ---
    this.updateHighlightsAndPrompt(context);
    this.ui.setCoreHp(this.core.hp, this.core.maxHp);
    this.ui.setEnergy(this.energy);
    this.ui.setThreat(this.spawner.threatLevel);
    this.mobile.setDashCooldown(this.player.dashCooldownFraction);
  }

  /** Cheap pairwise push-apart so enemies don't stack into one blob. */
  private separateEnemies() {
    const minDist = 0.85;
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i];
        const b = this.enemies[j];
        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const distSq = dx * dx + dz * dz;
        if (distSq > minDist * minDist || distSq < 1e-6) continue;
        const dist = Math.sqrt(distSq);
        const push = ((minDist - dist) / dist) * 0.5;
        a.position.x -= dx * push;
        a.position.z -= dz * push;
        b.position.x += dx * push;
        b.position.z += dz * push;
      }
    }
  }

  private updateHighlightsAndPrompt(context: ContextAction) {
    for (const pad of this.pads) {
      pad.setHighlight(false);
      pad.turret?.setRangeVisible(false);
    }

    switch (context.kind) {
      case 'build':
        context.pad.setHighlight(true, this.energy >= context.cost);
        this.ui.setPrompt(`Build turret — ${context.cost} ◆`, this.energy >= context.cost);
        this.mobile.setActionLabel('Build');
        break;
      case 'upgrade':
        context.turret.pad.setHighlight(true, this.energy >= context.cost);
        context.turret.setRangeVisible(true);
        this.ui.setPrompt(
          `Upgrade to Lv${context.turret.level + 1} — ${context.cost} ◆`,
          this.energy >= context.cost,
        );
        this.mobile.setActionLabel('Up');
        break;
      case 'repair-turret':
        context.turret.pad.setHighlight(true, this.energy >= context.cost);
        context.turret.setRangeVisible(true);
        this.ui.setPrompt(`Repair turret — ${context.cost} ◆`, this.energy >= context.cost);
        this.mobile.setActionLabel('Fix');
        break;
      case 'repair-core':
        this.ui.setPrompt(`Repair core — ${context.cost} ◆`, this.energy >= context.cost);
        this.mobile.setActionLabel('Fix');
        break;
      case 'attack':
        this.ui.setPrompt(null);
        this.mobile.setActionLabel('Hit');
        break;
    }
  }

  private onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.cameraCtrl.onResize();
  }
}
