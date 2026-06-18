# endless-game

Top down sci-fi builder non stop game 🤟🏻

## Mars Colony: War Front

A single-file 3D **base-builder war game** built with [Three.js](https://threejs.org/) (loaded via CDN). No build step — open `index.html` in a modern browser.

**Play it live:** https://creativedexy.github.io/endless-game/mars-colony/

You're the **commander** of a frontier outpost. You don't win by fighting — you win by **building**. Raise an army from barracks, fund it with supply depots, and hold a single front line against waves that advance from the north. Step in personally with your saber only when the wall buckles.

### How to play

- **Move** your commander with `WASD` / arrows (touch joystick on mobile).
- **Stand on a build pad** to fund it from your **supply bank**. Supply accrues passively (depots speed it up); you can also saber the scattered **resource crystals** for a burst.
- **Barracks** deploy soldiers automatically. They march north and hold the **front line** — a single wall of posts — engaging the incoming assault.
- **Turrets**, **med tents**, and **fortify** upgrades back the line up. **Armory** upgrades make every soldier hit harder and live longer.
- Enemies attack your wall; when a post falls they pour through the **breach** toward your **HQ core**. If the core's HP hits 0 → game over.
- Your **saber swings automatically** — use it as an emergency hero to plug a breach. It has a fixed size; there are no saber upgrades.

### The core loop

Build barracks → soldiers deploy → fund depots for faster supply → reinforce the line (turrets / med tents / fortify) → survive escalating waves → repeat.

### Build pads (walk-on, funded from supply)

Eight build plots ring the south lot beside your HQ. Each rebuilds at the next tier when completed.

| Pad | Effect |
|-----|--------|
| **Barracks** | Deploys a garrison that spawns soldiers on a timer (the heart of your army) |
| **Supply Depot** | +2.5 supply/sec passive income |
| **Turret** | Auto-cannon stationed on the front line |
| **Med Tent** | Heal aura that mends nearby soldiers |
| **Armory** | +50% soldier damage & HP per tier |
| **Fortify Line** | +wall HP and a full repair of the front line |
| **HQ Repair** | +70 core HP and +30 max HP |

### Soldiers & the front line

- **Soldiers** spawn from barracks (capped), march to the nearest enemy, and fire from range. With no enemies near, they form up along the hold line.
- The **front line** is one readable wall of posts spanning the north edge of your base — no rings, no bastions, no inner court. Damage a post and it tints red; destroy it and enemies stream through the gap.
- **Enemies** advance from the north: **grunts** (default), faster fragile **runners** (wave 2+), and slow heavy **tanks** with spiked shells (wave 4+). They fight soldiers in the way, batter the wall, then make for the core.

### Waves

A countdown HUD shows the next wave's ETA (it flashes red in the final seconds). Each wave ramps spawn rate, enemy HP, and enemy variety; higher waves drop focused packs from the same bearing.

### Features

- **Build-focused economy** — passive supply income from depots plus optional resource-crystal bursts you can saber for a push.
- **Friendly army** — barracks deploy soldiers that march, hold, fire, take casualties, and heal at med tents.
- **Single front line** — one damageable wall of posts; breaches open real holes enemies exploit.
- **Auto-firing turrets** on the line, scanning for the nearest enemy and tracing it down.
- **Directional waves** — three enemy types advancing from the north with an INCOMING countdown.
- **Emergency-hero saber** — fixed-size auto-swinging blade for plugging breaches and clearing resource crystals.
- **Real game over** with restart, plus dune terrain, fog, starfield, procedural audio, pooled particles, and a chase camera.

### Run it

```bash
python3 -m http.server 8000
# open http://localhost:8000
```
