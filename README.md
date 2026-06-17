# endless-game

Top down sci-fi builder non stop game 🤟🏻

## Mars Colony: Base Defense

A single-file 3D **base-defense hauler** built with [Three.js](https://threejs.org/) (loaded via CDN). No build step — open `index.html` in a modern browser.

**Play it live:** https://creativedexy.github.io/endless-game/mars-colony/

### How to play

- **Move** with `WASD` / arrows (touch joystick on mobile). Your **lightsaber swings automatically**.
- You start hemmed in by **dense crystal forests**. Carve a path out — band-0 crystals are weak, outer rings are tougher and need saber upgrades to break.
- Cleared crystals drop shards that **vacuum onto a chunky tall stack on your back**.
- **Stand on a buy pad** inside the base — your stack drains into it; when the price is met it unlocks (saber upgrade, hire worker, expand base).
- **Sand-beetles target your walls and core**, not you. Hold them off with your saber + hired guards + turrets.
- If your **core HP hits 0** → game over. Restart and try a different upgrade path.

### The core loop

Carve crystals → haul shards → step on a pad → upgrade saber / hire workers / expand → break harder crystals → defend your walls → repeat.

### Walk-on buy pads

Seven pads ring the inside of your base:

| Pad | Effect |
|-----|--------|
| **Saber Reach** | Blade physically grows longer (tier I–III) |
| **Saber Power** | Per-hit damage I–III — needed to break outer crystal rings |
| **Saber Spin** | Sweep speed I–III — more hits per second |
| **Hire Gatherer** | Worker NPCs that auto-chop band-0 crystals and dump shards into the cheapest active pad (idle income) |
| **Hire Guard** | Patrols the perimeter, sabers nearby beetles |
| **Hire Builder** | Repairs damaged wall segments |
| **Expand Base** | Pushes the walls outward, more base HP |

Reach all three saber stats to **Tier III** and a **second mirrored blade** ignites for full 360° coverage.

### Crystals & ring gating

| Ring | Color | HP | Saber tier needed |
|------|-------|----|--|
| 0 | cyan | 3 | I (start) |
| 1 | purple | 6 | II |
| 2 | pink | 14 | III |
| 3 | orange | 28 | IV (mirrored) |

Tier 0 saber visually flashes outer crystals but bounces off — clearing more of the map is gated by **saber power upgrades**.

### Features

- **Swinging lightsaber** that grows visibly with upgrades (reach scales the cylinder mesh, spin/arc rebuilds the trail sector; mirrored second pivot at max tier).
- **Chunky vertical carry stack** with velocity wobble (back by popular demand).
- **Walk-on priced pads** with floating canvas-texture price labels and progress rings.
- **Workers with FSM**: gatherers carry their own mini-stacks, guards swing small sabers, builders repair walls.
- **Damageable walls + core HP**; beetles target nearest live segment, route through breaches, attack the core if a gap opens.
- **Wave system** that ramps spawn rate and enemy HP over time.
- **Real game over** with restart, plus dune terrain, fog, starfield, and chase camera.

### Run it

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
