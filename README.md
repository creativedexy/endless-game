# Outpost Zero — Endless Colony Defence

Top down sci-fi builder non stop game 🤟🏻

A tiny 3D sci-fi colony defence game that runs in the browser, built with
**Vite + Three.js + TypeScript**. You play a small engineer sprinting around an
alien outpost: collect energy crystals, build and upgrade turrets on build
pads, repair the colony core, and smack aliens with your tool — forever, with
the pressure slowly ramping up.

No external assets — everything is low-poly placeholder geometry and
procedurally generated WebAudio sound.

## Running the game

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

## How to play

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

```
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
