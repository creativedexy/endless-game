# Endless Game — two tiny 3D defence games

Top down sci-fi builder non stop game 🤟🏻

Two small 3D browser games built with **Vite + Three.js + TypeScript**:

- **V1 · Outpost Zero** (landscape) — defend a colony core: collect energy,
  build/upgrade turrets, repair, melee aliens.
- **V2 · Aurora Down** (portrait) — your ship crashed on a frozen world and
  is on fire. Run around the wreck with a blaster: collect **energy** and
  **salvage**, build turrets / barriers / power relays / repair beacons on
  pads, repair the hull, and survive three kinds of alien forever.

No external assets — everything is low-poly placeholder geometry and
procedurally generated WebAudio sound.

## ▶ Play online (no install needed)

Both games auto-deploy to GitHub Pages on every push:

- **V1 (landscape):** https://creativedexy.github.io/endless-game/
- **V2 (portrait):** https://creativedexy.github.io/endless-game/v2/
- **V3 (portrait, chokepoint map):** https://creativedexy.github.io/endless-game/v3/
- **V4 (portrait, frontier map + mines & villages):** https://creativedexy.github.io/endless-game/v4/
- **V5 (portrait, sealed fortress — no build menus at all):** https://creativedexy.github.io/endless-game/v5/

Open the link on your phone and play. V2 is designed for portrait, V1 for
landscape. Tip: use "Add to Home Screen" in Safari's share menu for a
fullscreen experience without the address bar.

Deployment is handled by `.github/workflows/deploy.yml` — GitHub Actions
builds the project in the cloud and publishes `dist/` to Pages, so you never
need to run npm yourself.

## Running the game locally (optional)

```bash
npm install
npm run dev
```

Vite prints two URLs:

- `http://localhost:5173/` — open this on your computer.
- `http://<your-LAN-IP>:5173/` — open this on your **phone** (same Wi-Fi
  network as your computer). The `dev` script already passes `--host` so the
  server is reachable from other devices.

### Playing on your phone

1. Make sure your phone and computer are on the same Wi-Fi network.
2. Run `npm run dev` and note the `Network:` URL Vite prints.
3. Open that URL in your phone's browser.
4. Rotate to **landscape** — the game is designed landscape mobile-first.
5. Tip: use "Add to Home Screen" for a fullscreen, address-bar-free experience.

### Production build

```bash
npm run build    # type-checks then outputs static files to dist/
npm run preview  # serve the built files locally (also with --host)
```

The `dist/` folder is fully static (relative paths), so you can drop it on any
static host: GitHub Pages, Netlify, Cloudflare Pages, itch.io, etc.

### Smoke test (optional)

With the preview server running (`npm run build && npm run preview`):

```bash
npx playwright install chromium   # one-time browser download
npm run test:smoke                # loads the game headless, simulates input,
                                  # fails on console errors, saves screenshots
```

## How to play — V5 · Aurora Down: Sealed Fortress (portrait)

V4's map, redesigned around one idea: **the map is the build menu**. The
blueprint bar is gone — every glowing socket is typed and builds exactly one
thing when you stand on it (ring colours tell you what).

- **Shield fences** span the two ridge gaps: aliens must chew through them,
  you and your drones walk straight through. Their floating health bars are
  readable from across the map. Both gaps start with a free Lv1 fence (and
  one turret) already standing.
- **Turrets are invincible** — aliens ignore them. All the pressure lands on
  the fences and the hull; energy grows your guns, salvage maintains your
  walls.
- **Economy lives at home**: both ore deposits are tucked safely behind the
  defence line, next to the village plots and support buildings.
- **Gentler ramp**: slower threat levels, a "swarm regroups" build lull after
  each rise, one front at a time early on, +3 energy per kill, and the hull
  slowly self-repairs when no aliens are near it.

## How to play — V4 · Aurora Down: Frontier (portrait)

The biggest map: your wreck sits in the **corner of a frozen valley**,
backed by cliffs, with a crag defence line and two glowing gaps guarding the
open quadrant. New in V4:

- **⛏ Ore deposits** out in the wilds are the only places a **Mine** can be
  built — it pays both resources every tick, but you have to defend it out
  there. Mine sites glow amber.
- **🏘 Village plots** (green) inside the base house villagers who run
  around auto-collecting nearby drops while you fight at the front.
- **Threat arrows** at the screen edge point at gaps under attack (and turn
  red when something is chewing the ship itself).
- **Sprint**: keep running for a moment and you speed up — the frontier is
  big. Node pads build their own building regardless of the armed blueprint;
  ordinary pads still use the selector.

## How to play — V3 · Aurora Down: Hold the Gaps (portrait)

Same loop as V2, new battlefield: the wreck sits inside an **impassable ring
of crags** with three **glowing gaps**. Alien waves pour through the gaps, so
walls and turrets placed on the pads flanking each gap form a real line of
defence — while you sprint between fronts (and out through the gaps for
pickups). V3 also has a **3D-model pipeline**: drop low-poly `.glb` files
into `v3/src/models/` (see the README there) and the game swaps them in for
the procedural placeholder shapes automatically.

## How to play — V2 · Aurora Down (portrait)

Keep the **crashed ship** alive. Aliens spawn endlessly from the edges of the
snowfield and chew on the hull and your structures. If hull integrity hits
zero, the game ends. The threat level climbs forever.

- Run over **◆ energy crystals** and **▣ salvage scrap** to collect them.
  Slain aliens sometimes drop resources too.
- You carry a **blaster** that **fires by itself** at the nearest alien in
  range — just keep moving. (Desktop: Space/click also force-fires ahead.)
- Building is **hover-to-build**: pick a blueprint from the glass selector at
  the top, then just **stand on a pad** — a progress ring fills and the
  structure builds itself. Six blueprints:
  - **⌖ Blaster Turret** (energy) — automatic defence tower
  - **⬡ Barrier Node** (salvage) — chunky wall that blocks and soaks damage
  - **⚡ Power Relay** (mixed) — trickles energy into your reserves
  - **⚒ Salvage Forge** (mixed) — trickles salvage into your reserves
  - **✚ Repair Beacon** (mixed) — slowly heals nearby structures and the hull
  - **⚙ Drone Factory** (mixed) — builds **archer drones** that fly in
    formation behind you and shoot at whatever you're fighting (more drones
    per level; lost drones are rebuilt)
- Standing on an existing structure auto-**repairs** it if damaged, otherwise
  auto-**upgrades** it (2 levels, slightly longer dwell so it's deliberate).
- Stand near the ship to auto-**repair the hull** with salvage.
- **Dash** to escape danger or reposition.

Enemy types: purple **crawlers** head for the ship, pink **skitterers** are
fast and harass your structures, red **brutes** are slow tanks that hit walls
and the hull extra hard (they join as threat rises).

| | Desktop | Mobile (touch) |
|---|---|---|
| Move | `WASD` / arrows | left-thumb glass joystick |
| Shoot | automatic (`Space`/click to force) | automatic |
| Dash | `Shift` | large DASH button |
| Select blueprint | keys `1`-`6` | tap the glass selector bar |
| Build / upgrade / repair | stand on the spot (hover-to-act) | same |
| Restart (after game over) | `R` | Restart button |

## How to play — V1 · Outpost Zero (landscape)

Defend the **colony core** in the middle of the map. Aliens spawn endlessly
from the edges and chew on the core and your turrets. If the core's health
hits zero, the colony is lost. There's no level end — survive as long as you
can while the **threat level** keeps climbing.

- Run over **◆ energy crystals** to collect energy. They keep respawning
  around the map, so keep moving.
- Killing aliens also drips a little energy.
- Stand on a **build pad** and press the action button to **build a turret**
  (50 ◆). Turrets shoot nearby aliens automatically.
- Press action again near a healthy turret to **upgrade** it (Lv2: 80 ◆,
  Lv3: 140 ◆) — more damage, range, and fire rate.
- Press action near a **damaged turret or core** to **repair** it.
- If nothing buildable is nearby, the action button **swings your tool** and
  damages any aliens around you.
- The prompt above the buttons always tells you what the action button will do.

### Controls

| | Desktop | Mobile (touch) |
|---|---|---|
| Move | `WASD` / arrow keys | left-thumb virtual joystick |
| Action (build / upgrade / repair / attack) | `Space` | large right button |
| Dash | `Shift` | smaller right button |
| Restart (after game over) | `R` | Restart button |

## Project structure

Two self-contained games share one Vite project (`vite.config.ts` builds both
pages): V1 lives in `src/`, V2 in `v2/src/`.

```
v2/
  index.html               V2 entry page (served at /v2/)
  src/
    main.ts, style.css     entry + frosted-glass HUD styling
    game/
      GameManager.ts       owns the scene, loop, rules, and all entities
      constants.ts         all balance/tuning numbers in one place
      CrashedShip.ts       the burning wreck: health, fire/smoke emitters
      Structure.ts         base class for buildables (health, levels, repair)
      Turret.ts / Wall.ts / Extractor.ts / Forge.ts / RepairBeacon.ts / Factory.ts
      Archer.ts             companion drones built by the Drone Factory
      Enemy.ts             crawler / skitterer / brute AI
      EnemySpawner.ts      endless spawning + threat ramp + enemy mix
      Pickup.ts            energy crystals + salvage scrap (with magnet)
      Environment.ts       snowfield, crash trench, rocks, falling snow
      PlayerController.ts  movement, dash, blaster animation
      CameraController.ts  portrait follow camera + screen shake
      MobileControls.ts    glass joystick + FIRE/DASH buttons
      UIManager.ts         glass HUD, build menu, game-over screen
      Projectile.ts / Effects.ts / Sound.ts / input.ts
src/
  main.ts                  entry point
  style.css                HUD + touch-controls styling
  game/
    GameManager.ts         owns the scene, loop, rules, and all entities
    constants.ts           all balance/tuning numbers in one place
    PlayerController.ts    movement, dash, swing animation
    CameraController.ts    smooth isometric follow camera
    MobileControls.ts      virtual joystick + action/dash buttons
    input.ts               shared input state + keyboard bindings
    ColonyCore.ts          the structure you protect
    BuildPad.ts            fixed build spots with highlight/range preview
    Turret.ts              buildable, upgradable, auto-firing tower
    Projectile.ts          pooled homing bolts
    Enemy.ts               alien AI: walk to nearest structure, attack it
    EnemySpawner.ts        endless spawning + difficulty ramp
    ResourceCrystal.ts     collectible energy pickups
    UIManager.ts           DOM HUD, prompts, game-over screen
    Effects.ts             particle bursts + floating damage/energy text
    Sound.ts               procedural WebAudio sound effects
```

## Tuning

Almost every gameplay number (costs, turret stats, enemy scaling, spawn rates,
player speed) lives in `src/game/constants.ts` and `EnemySpawner.ts` — tweak
and hot-reload.
