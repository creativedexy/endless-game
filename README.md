# endless-game

Top down sci-fi builder non stop game 🤟🏻

## Mars Colony: Saber Siege

A single-file, hyper-casual 3D **arena-survivor / base-builder** built with [Three.js](https://threejs.org/) (loaded via CDN). No build step — just open `index.html` in a modern browser.

**Play it live:** https://creativedexy.github.io/endless-game/mars-colony/

### How to play

- **Move** with `WASD` or the arrow keys (touch joystick on mobile). Movement is the only input.
- Your **lightsaber swings automatically** — a whirling energy blade that sweeps around you, shredding anything it touches.
- **Carve** through the dense crystal field; each cleared cluster drops shards that vacuum onto a stack on your back.
- **Deposit** by standing on the glowing core; your stack drains in and builds the outpost.
- **Survive** the sand-beetle swarm — the saber kills them, but contact drains your **energy**. Hit zero and you respawn at the core with a shockwave.

### The loop

Carve crystals → haul shards → deposit at the core → the outpost builds itself → the swarm intensifies → repeat. It never stops.

### Base building (fast)

The outpost evolves quickly as you bank shards:

| Level | Cost | What appears |
|-------|------|--------------|
| 1 | — | Bare core |
| 2 | 8 shards | Perimeter **walls** rise, floor plating |
| 3 | 20 shards | Auto-firing **turrets** mount the walls |
| 4 | 40 shards | Worker **drones** deploy and orbit |
| 5 | 70 shards | **Fortress** — dome fully scaled, glowing |

### Features

- **Swinging lightsaber** — a rotating additive-glow blade with a motion-trail arc, tip light, per-target hit cooldown, and knockback. Cheap angle+distance sweep hit-detection.
- **Dense destructible resources** — ~70 crystal clusters with HP and damage bars, kept topped up around the base.
- **Swarming enemies** — sand beetles with billboarded green health bars that chase you; spawn rate and HP ramp with your base level for rising intensity.
- **Auto-turret defense** and orbiting worker drones once the base is built up.
- **Energy/shield** with regen and an endless respawn shockwave (no hard game-over).
- Combo counter, hit sparks, death bursts, camera shake, dune terrain, and a starfield backdrop.

### Run it

```bash
# any static server works, e.g.
python3 -m http.server 8000
# then open http://localhost:8000
```
